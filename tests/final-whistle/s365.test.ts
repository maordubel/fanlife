import {describe, expect, it} from 'vitest'
import {FIXTURE_TEAMS} from '@/lib/fixtures/teams'
import {parseS365Finals, parseS365Team} from '@/lib/final-whistle/s365'

const team = FIXTURE_TEAMS.find(t => t.clubId === 'hapoel-tel-aviv')!
const game = (o: Record<string, unknown> = {}) => ({
  id: 4739318, sportId: 1, competitionDisplayName: 'Premier League', roundName: 'Round 6', startTime: '2026-10-10T19:15:00+03:00', statusGroup: 4, statusText: 'Ended',
  homeCompetitor: {id: 563, name: 'Kiryat Shmona', score: 1}, awayCompetitor: {id: 567, name: 'Hapoel Tel Aviv', score: 3}, ...o,
})

describe('365scores adapter', () => {
  it('finds the club only when exactly one football team has its name', () => {
    const c = (id: number, name: string, sportId = 1) => ({id, name, sportId})
    expect(parseS365Team({competitors: [c(567, 'Hapoel Tel Aviv'), c(654, 'Hapoel Tel Aviv', 2), c(8175, 'Hapoel Tel Aviv U19'), c(83067, 'Hapoel Tel Aviv (W)')]}, team)).toBe('567')
    expect(parseS365Team({competitors: [c(1, 'Hapoel Tel Aviv'), c(2, 'Hapoel Tel Aviv')]}, team)).toBeNull()
    expect(parseS365Team({competitors: [c(8175, 'Hapoel Tel Aviv U19')]}, team)).toBeNull()
    expect(parseS365Team(null, team)).toBeNull()
  })
  it('reads a finished game in the same shape as the first provider, with its own namespace', () => {
    const [f] = parseS365Finals({games: [game()]})
    expect(f).toMatchObject({id: 's365:4739318', home: 'Kiryat Shmona', away: 'Hapoel Tel Aviv', homeId: '563', awayId: '567', homeScore: 1, awayScore: 3, finalStatus: 'FT', source: '365scores', kickoff: '2026-10-10T16:15:00.000Z', dateOnly: false})
  })
  it('drops everything that is not a clean final: postponed, live, no score, penalties, other sports', () => {
    const bad = [game({statusText: 'Postponed', statusGroup: 4}), game({statusText: '78\'', statusGroup: 3}), game({statusText: 'Ended', homeCompetitor: {id: 563, name: 'A', score: -1}}),
      game({statusText: 'After Penalties'}), game({sportId: 2}), game({startTime: 'soon'}), game({id: 0})]
    expect(parseS365Finals({games: bad})).toEqual([])
    expect(parseS365Finals(undefined)).toEqual([])
  })
  it('after extra time is read as AET', () => {
    expect(parseS365Finals({games: [game({statusText: 'After Extra Time'})]})[0]!.finalStatus).toBe('AET')
  })
})
