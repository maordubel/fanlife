import {describe, expect, it} from 'vitest'
import {composeDubid, composeFixtures, composeOffsides, composeResults, dayKey, type LiveData} from '@/lib/marketing/live'
// @ts-expect-error — plain ESM module, no types
import {drawKit} from '../../scripts/marketing/kit/visual.mjs'

const now = new Date('2026-10-31T08:00:00Z') // Saturday 10:00 in Israel
const data = (o: Partial<LiveData> = {}): LiveData => ({dubid: [], offsides: [], posted: [], ...o})
const NAMES = {celtic: 'Celtic', olympiacos: 'Olympiacos'}
const fx = (id: string, clubId: string, kickoff: string, home: string, away: string) =>
  ({clubId, kickoff, dateOnly: false, home, away, clubSide: 'home' as const, opponent: away, competition: 'Scottish Premiership', round: null, venue: null, status: 'scheduled' as const, providerEventId: id})

describe('live slots (owner, 27.10.2026): real data or quiet', () => {
  it('days are Israel days', () => {
    expect(dayKey('2026-10-31T22:30:00Z')).toBe('2026-11-01')
    expect(dayKey('2026-10-31T21:30:00Z')).toBe('2026-10-31')
  })
  it('next up: only FAN LIFE clubs, today and tomorrow, each match once', async () => {
    const list = [fx('a', 'celtic', '2026-10-31T15:00:00Z', 'Celtic', 'Rangers'), fx('b', 'olympiacos', '2026-11-01T17:00:00Z', 'Olympiacos', 'AEK Athens'),
      fx('c', 'celtic', '2026-11-04T19:00:00Z', 'Celtic', 'Hibernian'), fx('d', 'paok', '2026-10-31T16:00:00Z', 'PAOK', 'Aris')]
    const out = composeFixtures(list, ['celtic', 'olympiacos'], data(), now, NAMES)
    if ('skip' in out) throw Error(out.skip)
    expect(out.refs).toEqual(['fx:a', 'fx:b'])
    expect(out.msg).toContain('Today 17:00 (Israel time) · Celtic v Rangers')
    expect(out.msg).toContain('Tomorrow 19:00 (Israel time) · Olympiacos v AEK Athens')
    expect(composeFixtures(list, ['celtic', 'olympiacos'], data({posted: ['fx:a', 'fx:b']}), now, NAMES)).toHaveProperty('skip')
    expect((await drawKit(out.kit)).subarray(1, 4).toString()).toBe('PNG')
  }, 60_000)
  it('results: finished within 36 hours, never twice', () => {
    const r = {clubId: 'celtic', kickoff: '2026-10-30T19:45:00Z', home: 'Celtic', away: 'Rangers', homeScore: 2, awayScore: 1, clubSide: 'home' as const, opponent: 'Rangers', competition: 'Scottish Premiership', providerEventId: 'x'}
    const out = composeResults([r, {...r, providerEventId: 'old', kickoff: '2026-10-20T19:45:00Z'}], ['celtic'], data(), now, NAMES)
    if ('skip' in out) throw Error(out.skip)
    expect(out.refs).toEqual(['res:x'])
    expect(out.msg).toContain('Full time: Celtic win it.')
    expect(composeResults([r], ['celtic'], data({posted: ['res:x']}), now, NAMES)).toHaveProperty('skip')
  })
  it('DUBID: an open round is announced once, in DUBID’s branding', () => {
    const round = {id: 'g1', round: 9, league: 'Israeli Premier League', code: 'IL_PREMIER', lock_at: '2026-10-31T13:00:00Z', first_kickoff_at: null}
    const out = composeDubid(data({dubid: [round, {...round, id: 'g2', league: 'Greek Super League', lock_at: '2026-10-31T17:00:00Z'}]}), now)
    if ('skip' in out) throw Error(out.skip)
    expect(out.kit.t).toBe('L-DUBID-ROUND')
    expect(out.msg).toContain('📌 Post · <b>DUBID</b>')
    expect(out.msg).not.toContain('FAN LIFE page')
    expect(out.msg).toContain('Round 9 is open')
    expect(composeDubid(data({dubid: [round], posted: ['gw:g1']}), now)).toHaveProperty('skip')
  })
  it('OFFSIDES: today’s matches with their arenas; quiet on an empty day; never a betting word', () => {
    const m = (id: string, h: number, arenas: number) => ({id, home: `Home ${id}`, away: `Away ${id}`, league: 'La Liga', kickoff: `2026-10-31T${h}:00:00Z`, tier: 1, arenas})
    const out = composeOffsides(data({offsides: [m('a', 12, 2), m('b', 14, 0), m('c', 23, 1)]}), now)
    if ('skip' in out) throw Error(out.skip)
    expect(out.refs).toEqual(['os:a', 'os:b'])
    expect(out.msg).toContain('2 arenas open today')
    expect(out.msg).not.toMatch(/\bodds\b|\bbet\b|\bwager/i)
    expect(composeOffsides(data(), now)).toHaveProperty('skip')
  })
})

describe('plan v4 message (owner, 29.10.2026): a real copy-paste', async () => {
  const {message} = await import('../../lib/marketing/live')
  it('prints the hook once, the caption in a copy box, the tags inside it, no Visual line', () => {
    const m = message({app: 'fanlife', sendAt: new Date('2026-10-29T16:00:00Z'), label: 'Results', hook: 'Full time: Celtic win it.', body: 'Celtic 2-0 Rangers', visual: 'x', tags: '#FANLIFE #Celtic', comment: '✅ answer'})
    expect(m.match(/Full time: Celtic win it\./g)).toHaveLength(1)
    expect(m).toMatch(/<pre>Full time: Celtic win it\.\n\nCeltic 2-0 Rangers\n\n👉 https:\/\/fanlife\.dubelteam\.com\n\n#FANLIFE #Celtic<\/pre>/)
    expect(m).toContain('<pre>✅ answer</pre>')
    expect(m).not.toMatch(/Visual:|HOOK/)
    expect(m).toContain('📌 Post · <b>FAN LIFE</b>')
  })
  it('never breaks the HTML with a long caption: the box always closes', () => {
    const m = message({app: 'dubid', sendAt: new Date(), label: 'x', hook: 'h', body: 'a & <b> '.repeat(900), visual: 'x'})
    // Telegram's 4096 limit counts the text after the HTML is parsed
    expect(m.replace(/<[^>]+>/g, '').replace(/&(amp|lt|gt);/g, '_').length).toBeLessThan(4096)
    expect(m.match(/<pre>/g)).toHaveLength(1)
    expect(m.trim().endsWith('</pre>')).toBe(true)
    expect(m).not.toContain('<b> ')
  })
})

describe('the morning briefing (owner, 29.10.2026): operations, not marketing', async () => {
  const {composeBriefing} = await import('../../lib/marketing/live')
  const now = new Date('2026-10-29T05:30:00Z') // 07:30 Israel
  const data = {dubid: [{id: 'g1', round: 9, league: 'Israeli Premier League', code: 'il', lock_at: '2026-10-31T12:00:00Z', first_kickoff_at: null}],
    offsides: [{id: 'm1', home: 'Arsenal', away: 'Chelsea', league: 'Premier League', kickoff: '2026-10-29T19:00:00Z', tier: 1, arenas: 3},
      {id: 'm2', home: 'Roma', away: 'Lazio', league: 'Serie A', kickoff: '2026-10-29T17:00:00Z', tier: 1, arenas: 0}], posted: ['os:m1']}
  const fixtures = [{clubId: 'celtic', kickoff: '2026-10-29T19:45:00Z', dateOnly: false, home: 'Celtic', away: 'Rangers', clubSide: 'home', opponent: 'Rangers', competition: 'Premiership', round: null, venue: null, status: 'scheduled', providerEventId: 'e1'}]
  const results = [{clubId: 'olympiacos', kickoff: '2026-10-28T18:00:00Z', home: 'Olympiacos', away: 'AEK Athens', homeScore: 2, awayScore: 1, clubSide: 'home', opponent: 'AEK Athens', competition: 'Super League', providerEventId: 'r1'}]
  it('reports arenas, today’s matches, results and DUBID — even what a post already announced — with no picture', () => {
    const out = composeBriefing(fixtures as never, results as never, ['celtic', 'olympiacos'], data, now, {})
    if ('skip' in out) throw Error('skipped')
    expect(out.kit.t).toBe('none')
    expect(out.msg).toContain('Morning briefing')
    expect(out.msg).toContain('21:00 Arsenal v Chelsea · Premier League · 3 arenas')
    expect(out.msg).toContain('21:45 Celtic v Rangers')
    expect(out.msg).toContain('19:00 Roma v Lazio')
    expect(out.msg).toContain('Olympiacos 2-1 AEK Athens')
    expect(out.msg).toContain('Round 9')
    expect(out.msg).not.toContain('<pre>')
  })
  it('says plainly when a part is empty, and never skips', () => {
    const out = composeBriefing([], [], ['celtic'], {dubid: [], offsides: [], posted: []}, now, {})
    if ('skip' in out) throw Error('skipped')
    expect(out.msg).toContain('No active arena today.')
    expect(out.msg).toContain('No FAN LIFE club plays today.')
  })
})
