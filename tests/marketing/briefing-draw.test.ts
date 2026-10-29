import {describe, expect, it} from 'vitest'
import {composeBriefing} from '../../lib/marketing/live'
// @ts-expect-error — plain ESM module, no types
import {visualsFor} from '../../scripts/marketing/kit/visual.mjs'

// The morning briefing's album draws (owner, 29.10.2026: "with the relevant graphics").
describe('morning briefing pictures', () => {
  it('draws one picture per non-empty part', async () => {
    const now = new Date('2026-10-29T05:30:00Z')
    const out = composeBriefing(
      [{clubId: 'celtic', kickoff: '2026-10-29T19:45:00Z', dateOnly: false, home: 'Celtic', away: 'Rangers', clubSide: 'home', opponent: 'Rangers', competition: 'Premiership', round: null, venue: null, status: 'scheduled', providerEventId: 'e1'}] as never,
      [{clubId: 'olympiacos', kickoff: '2026-10-28T18:00:00Z', home: 'Olympiacos', away: 'AEK Athens', homeScore: 2, awayScore: 1, clubSide: 'home', opponent: 'AEK Athens', competition: 'Super League', providerEventId: 'r1'}] as never,
      ['celtic', 'olympiacos'],
      {dubid: [{id: 'g1', round: 9, league: 'Israeli Premier League', code: 'il', lock_at: '2026-10-31T12:00:00Z', first_kickoff_at: null}],
        offsides: [{id: 'm1', home: 'Arsenal', away: 'Chelsea', league: 'Premier League', kickoff: '2026-10-29T19:00:00Z', tier: 1, arenas: 3}], posted: []}, now, {})
    if ('skip' in out) throw Error('skipped')
    const pngs: Buffer[] = await visualsFor(out.msg, out.kit)
    expect(pngs).toHaveLength(4)
    for (const p of pngs) expect(p.subarray(1, 4).toString()).toBe('PNG')
  }, 60_000)
})
