import {beforeEach, describe, expect, it, vi} from 'vitest'

const mem = new Map<string, unknown>()
vi.mock('server-only', () => ({}))
vi.mock('@/lib/matchday/store', () => ({
  readDoc: async (n: string, f: unknown) => ({value: mem.has(n) ? structuredClone(mem.get(n)) : f, etag: null}),
  updateDoc: async (n: string, f: unknown, fn: (c: unknown) => unknown) => { const v = fn(mem.has(n) ? structuredClone(mem.get(n)) : f); mem.set(n, structuredClone(v)); return v },
  listDocs: async (p: string) => [...mem.entries()].filter(([k]) => k.startsWith(p)).map(([, v]) => structuredClone(v)),
  storeAvailable: () => true,
}))
vi.mock('@/lib/master/store', () => ({readState: async () => ({clubs: [{id: 'celtic'}, {id: 'olympiacos'}, {id: 'aek-athens'}]})}))
vi.mock('@/lib/final-whistle/service', () => ({teamIdFor: async (id: string) => ({celtic: 'T1', olympiacos: 'T2', 'aek-athens': 'T3'} as Record<string, string>)[id] ?? null}))

import {checkpoint, claim, complete, fail, markSending, ownerAction, prepare, setConfig, status, uncertain} from '@/lib/matchday/service'

const NOW = new Date('2026-10-24T01:00:00Z') // 04:00 Athens, before the 05:00 send time
const SEND = new Date('2026-10-24T02:00:30Z')
const ev = (id: string, home: string, away: string, hid: string, aid: string, time = '14:00:00') => ({idEvent: id, strHomeTeam: home, strAwayTeam: away, idHomeTeam: hid, idAwayTeam: aid, dateEvent: '2026-10-24', strTime: time, strStatus: 'Not Started', strLeague: 'L', strSport: 'Soccer'})
const later = (hid: string) => ({idEvent: `x${hid}`, strHomeTeam: 'Z FC', strAwayTeam: 'Y FC', idHomeTeam: hid, idAwayTeam: 'Q', dateEvent: '2026-11-02', strTime: '14:00:00', strStatus: 'Not Started', strLeague: 'L', strSport: 'Soccer'})
const provider = (fail_ = false) => async (url: string) => {
  if (fail_) throw new Error('provider answered 500')
  const id = /id=(\w+)/.exec(url)![1]!
  if (url.includes('eventslast')) return {results: null}
  return {events: [id === 'T1' ? ev('1', 'Celtic', 'Tre Penne', 'T1', 'R') : id === 'T2' ? ev('2', 'Olympiacos', 'AEK Athens', 'T2', 'T3') : ev('2', 'Olympiacos', 'AEK Athens', 'T2', 'T3'), later(id)]}
}
const deps = (get = provider(), now = NOW) => ({get, now, key: '123', pause: async () => {}})
const jobsOf = () => [...mem.entries()].filter(([k]) => k.startsWith('jobs/')).map(([, v]) => v as {id: string; state: string; mode: string; dryRun: boolean; delivered: Record<string, number>; notBefore: string})

beforeEach(() => mem.clear())

describe('Today’s Football service', () => {
  it('does nothing while switched off, except a dry run', async () => {
    expect((await prepare({deps: deps()})).enabled).toBe(false)
    expect(jobsOf()).toHaveLength(0)
    const d = await prepare({deps: deps(), dryRun: true})
    expect(d.job?.id).toBe('2026-10-24-dry')
  })

  it('makes one job per day, held until 05:00 Athens, and a second look does not duplicate it', async () => {
    await setConfig({enabled: true, dryRun: false, allowMissingCrests: true})
    const a = await prepare({deps: deps()})
    expect(a.progress?.done).toBe(true); expect(a.job?.mode).toBe('images')
    await prepare({deps: deps(provider(), new Date(NOW.getTime() + 40 * 60_000))})
    expect(jobsOf()).toHaveLength(1)
    expect(await claim('r1', NOW)).toBeNull() // not yet 05:00
    const got = await claim('r1', SEND)
    expect(got?.job.snapshot.fixtures).toHaveLength(2) // Celtic–Tre Penne and the shared Olympiacos–AEK match, once
    expect(got?.job.state).toBe('rendering')
    expect(await claim('r2', SEND)).toBeNull() // leased
  })

  it('withholds graphics and says why when a crest is missing, unless allowed', async () => {
    await setConfig({enabled: true, dryRun: false})
    const a = await prepare({deps: deps()})
    expect(a.job?.mode).toBe('text') // Tre Penne: no own crest and none in the library
    const got = await claim('r1', SEND)
    expect(got?.texts.text).toContain('TEXT ONLY')
  })

  it('an unreadable provider never becomes a no-games day', async () => {
    await setConfig({enabled: true, dryRun: false})
    const a = await prepare({deps: deps(provider(true))})
    expect(a.job?.mode).toBe('blocked'); expect(a.job?.state).toBe('needs_review')
    expect(await claim('r1', SEND)).toBeNull()
    const st = await status()
    expect(st.jobs[0]!.coverage).toBe('unavailable'); expect(st.jobs[0]!.fixtures).toBe(0)
  })

  it('resumes: a tight budget looks at some clubs now and the rest on the next call', async () => {
    await setConfig({enabled: true, dryRun: false, allowMissingCrests: true})
    let t = 0
    const first = await prepare({deps: {...deps(), budgetMs: 1, clock: () => (t += 5)}})
    expect(first.progress?.looked).toBe(1); expect(first.progress?.done).toBe(false); expect(first.job).toBeUndefined()
    let last = first
    for (let i = 0; i < 6 && !last.progress?.done; i++) last = await prepare({deps: {...deps(), budgetMs: 1, clock: () => (t += 5)}})
    expect(last.progress?.done).toBe(true)
  })

  it('checkpoints every delivered part, never resends one, and completes once', async () => {
    await setConfig({enabled: true, dryRun: false, allowMissingCrests: true})
    await prepare({deps: deps()})
    const {job} = (await claim('r1', SEND))!
    expect((await markSending(job.id, 'r1', SEND)).ok).toBe(true)
    await checkpoint(job.id, 'r1', 'header', 11, SEND)
    await checkpoint(job.id, 'r1', 'story-01', 12, SEND)
    expect((await checkpoint(job.id, 'other', 'post-01', 13, SEND)).ok).toBe(false) // another runner cannot write
    const sent = await complete(job.id, 'r1', SEND)
    expect(sent.ok && sent.job.state).toBe('sent'); expect(jobsOf()[0]!.delivered).toEqual({header: 11, 'story-01': 12})
    expect(await claim('r3', SEND)).toBeNull()
  })

  it('a lost answer after sending began is "unknown" and is never claimed again by itself', async () => {
    await setConfig({enabled: true, dryRun: false, allowMissingCrests: true})
    await prepare({deps: deps()})
    const {job} = (await claim('r1', SEND))!
    await markSending(job.id, 'r1', SEND)
    const r = await fail(job.id, 'r1', {error: 'timeout', retryable: true}, SEND)
    expect(r.ok && r.job.state).toBe('delivery_unknown')
    expect(await claim('r2', new Date(SEND.getTime() + 3600_000))).toBeNull()
    const again = await ownerAction(job.id, 'retry', SEND)
    expect(again.ok && again.job.state).toBe('ready')
  })

  it('a crashed sender is turned into "unknown" once its lease runs out', async () => {
    await setConfig({enabled: true, dryRun: false, allowMissingCrests: true})
    await prepare({deps: deps()})
    const {job} = (await claim('r1', SEND))!
    await markSending(job.id, 'r1', SEND)
    expect(await claim('r2', new Date(SEND.getTime() + 11 * 60_000))).toBeNull()
    expect(jobsOf()[0]!.state).toBe('delivery_unknown')
    expect((await uncertain(job.id, 'r1', {error: 'x'}, SEND)).ok).toBe(true)
  })

  it('a definite rejection before anything left is retried later', async () => {
    await setConfig({enabled: true, dryRun: false, allowMissingCrests: true})
    await prepare({deps: deps()})
    const {job} = (await claim('r1', SEND))!
    const r = await fail(job.id, 'r1', {error: 'runner error', retryable: true, retryAfterSec: 60}, SEND)
    expect(r.ok && r.job.state).toBe('retryable_failed')
    expect(await claim('r2', SEND)).toBeNull()
    expect((await claim('r2', new Date(SEND.getTime() + 61_000)))?.job.attempts).toBe(2)
  })

  it('an updated schedule is only offered for a really sent package, and comes back as revision 2', async () => {
    await setConfig({enabled: true, dryRun: false, allowMissingCrests: true})
    await prepare({deps: deps()})
    const {job} = (await claim('r1', SEND))!
    expect((await ownerAction(job.id, 'revise', SEND)).ok).toBe(false)
    await markSending(job.id, 'r1', SEND); await complete(job.id, 'r1', SEND)
    const rev = await ownerAction(job.id, 'revise', SEND)
    expect(rev.ok && rev.job.kind).toBe('UPDATED'); expect(rev.ok && rev.job.revision).toBe(2)
  })

  it('a dry run is checked and finished, never sent', async () => {
    await setConfig({enabled: false, dryRun: true})
    const d = await prepare({deps: deps(), dryRun: true})
    const got = await claim('r1', NOW)
    expect(got?.job.id).toBe(d.job?.id); expect(got?.job.dryRun).toBe(true)
    const done = await complete(got!.job.id, 'r1', NOW)
    expect(done.ok && done.job.note).toMatch(/nothing was sent/)
  })

  it('refuses a club the provider cannot identify', async () => {
    await expect(setConfig({clubIds: ['nowhere-fc']})).rejects.toThrow(/cannot identify/)
    await expect(setConfig({sendHour: 40})).rejects.toThrow(/0–12/)
  })
})
