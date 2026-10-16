import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {memoryStore, useDurableStore} from '@/lib/master/durable'

vi.mock('@/lib/master/store', () => ({readState: async () => ({clubs: [{id: 'hapoel-tel-aviv', status: 'live'}, {id: 'olympiacos', status: 'research'}]})}))
const {discover, setConfig, claim, getConfig, status} = await import('@/lib/final-whistle/service')
const {readDoc} = await import('@/lib/final-whistle/store')

afterEach(() => useDurableStore(null))
beforeEach(() => useDurableStore(memoryStore()))
const T0 = new Date('2026-10-17T18:00:00Z')
const at = (min: number) => new Date(T0.getTime() + min * 60_000)
const team = {teams: [{idTeam: '77', strTeam: 'Hapoel Tel Aviv', strSport: 'Soccer', strCountry: 'Israel', idLeague: '1'}]}
const ev = (o: Record<string, string> = {}) => ({idEvent: 'E1', strSport: 'Soccer', strHomeTeam: 'Hapoel Tel Aviv', strAwayTeam: 'Rival FC', idHomeTeam: '77', idAwayTeam: '88', dateEvent: '2026-10-17', strTime: '16:00:00', strLeague: 'Israeli Premier League', strStatus: 'Match Finished', intHomeScore: '2', intAwayScore: '1', ...o})
const provider = (events: unknown[]) => {
  const urls: string[] = []
  return {urls, get: async (url: string) => { urls.push(url); return url.includes('searchteams') ? team : {results: events} }}
}
const deps = (p: ReturnType<typeof provider>, now: Date) => ({get: p.get, now, key: 'k', pause: async () => {}})

describe('discover', () => {
  it('does nothing while switched off, and asks the provider nothing', async () => {
    const p = provider([ev()])
    expect(await discover(deps(p, T0))).toEqual({enabled: false}); expect(p.urls).toEqual([])
  })
  it('watches every club the provider knows, published or not — unless the owner narrows it', async () => {
    await setConfig({enabled: true, delivery: 'live'}, new Date('2026-10-17T10:00:00Z'))
    expect((await discover(deps(provider([ev()]), T0))).clubs).toBe(2)
    await setConfig({allClubs: false, clubIds: ['hapoel-tel-aviv']}, new Date('2026-10-17T10:00:00Z'))
    const p = provider([ev()])
    expect((await discover(deps(p, T0))).clubs).toBe(1)
    expect(p.urls.every(u => !/olympiacos/i.test(u))).toBe(true)
  })
  it('a final is confirmed only by two identical looks five minutes apart — then ONE job, once', async () => {
    await setConfig({enabled: true, delivery: 'live', allClubs: false, clubIds: ['hapoel-tel-aviv']}, new Date('2026-10-17T10:00:00Z'))
    const p = provider([ev()])
    expect((await discover(deps(p, T0))).created).toBe(0)
    expect((await discover(deps(p, at(2)))).created).toBe(0)
    expect((await discover(deps(p, at(6)))).created).toBe(1)
    expect((await discover(deps(p, at(21)))).created).toBe(0)
    const s = await status()
    expect(s.jobs).toHaveLength(1)
    expect(s.jobs[0]).toMatchObject({state: 'ready', kind: 'FINAL', dryRun: true})
  })
  it('history is never sent: a match that kicked off before switch-on is ignored', async () => {
    await setConfig({enabled: true, delivery: 'live', allClubs: false, clubIds: ['hapoel-tel-aviv']}, new Date('2026-10-19T10:00:00Z'))
    const p = provider([ev()])
    for (const m of [0, 6, 12]) await discover(deps(p, at(m)))
    expect((await status()).jobs).toHaveLength(0)
  })
  it("switching on brings yesterday's results (Athens day before), nothing older", async () => {
    await setConfig({enabled: true, delivery: 'live', allClubs: false, clubIds: ['hapoel-tel-aviv']}, new Date('2026-10-18T10:00:00Z'))
    const p = provider([ev(), ev({idEvent: 'E0', dateEvent: '2026-10-15'})])
    for (const m of [0, 6]) await discover(deps(p, at(m)))
    const jobs = (await status()).jobs
    expect(jobs).toHaveLength(1)
    expect(jobs[0]!.result.home).toBe('Hapoel Tel Aviv')
  })
  it('morning delivery holds a result until 06:00 Athens the next day, then releases it', async () => {
    await setConfig({enabled: true, allClubs: false, clubIds: ['hapoel-tel-aviv']}, new Date('2026-10-17T10:00:00Z'))
    const p = provider([ev()])
    await discover(deps(p, T0)); await discover(deps(p, at(6)))
    expect(await claim('A', at(7))).toBeNull()
    expect(await claim('A', new Date('2026-10-18T02:59:00Z'))).toBeNull() // 05:59 Athens (UTC+3)
    expect((await claim('A', new Date('2026-10-18T03:01:00Z')))?.job.kind).toBe('FINAL')
  })
  it('a result that changes between looks starts the confirmation again', async () => {
    await setConfig({enabled: true, delivery: 'live', allClubs: false, clubIds: ['hapoel-tel-aviv']}, new Date('2026-10-17T10:00:00Z'))
    await discover(deps(provider([ev()]), T0))
    await discover(deps(provider([ev({intAwayScore: '2'})]), at(6)))
    expect((await status()).jobs).toHaveLength(0)
  })
  it('a correction after a sent job is a NEW job marked CORRECTED; the first stays as history', async () => {
    await setConfig({enabled: true, delivery: 'live', allClubs: false, clubIds: ['hapoel-tel-aviv']}, new Date('2026-10-17T10:00:00Z'))
    const p = provider([ev()])
    await discover(deps(p, T0)); await discover(deps(p, at(6)))
    const first = (await claim('A', at(7)))!.job
    const {complete} = await import('@/lib/final-whistle/service')
    await complete(first.id, 'A', {}, at(8))
    const q = provider([ev({intHomeScore: '3'})])
    await discover(deps(q, at(20))); await discover(deps(q, at(26)))
    const s = await status()
    expect(s.jobs.map(j => [j.kind, j.state]).sort()).toEqual([['CORRECTED', 'ready'], ['FINAL', 'sent']])
  })
  it('an unknown or live status is not a final; a team the provider cannot identify is reported, not guessed', async () => {
    await setConfig({enabled: true, delivery: 'live', allClubs: false, clubIds: ['hapoel-tel-aviv']}, new Date('2026-10-17T10:00:00Z'))
    const p = provider([ev({strStatus: '2H'})])
    for (const m of [0, 6]) await discover(deps(p, at(m)))
    expect((await status()).jobs).toHaveLength(0)
    useDurableStore(memoryStore()); await setConfig({enabled: true, delivery: 'live', allClubs: false, clubIds: ['hapoel-tel-aviv']}, new Date('2026-10-17T10:00:00Z'))
    const r = await discover({get: async () => ({teams: []}), now: T0, key: 'k', pause: async () => {}})
    expect(r.errors?.[0]).toMatch(/not identified/)
    expect((await readDoc('teams.json', {})).value).toEqual({})
    expect((await getConfig()).enabled).toBe(true)
  })
})
