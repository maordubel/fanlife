import {describe, expect, it} from 'vitest'
import {belongsToDay, dayBounds, dayKeyOf, isDayKey, pagesFor} from '@/lib/matchday/day'
import {buildSnapshot, classify, judgeClubDay} from '@/lib/matchday/collect'
import {alertText, documentNameFor, headerCaption, instagramCaption, textPackage} from '@/lib/matchday/caption'
import {parseEvents} from '@/lib/fixtures/provider'

const ev = (id: string, home: string, away: string, date: string, time: string | null, status = 'Not Started', hid = 'H', aid = 'A') =>
  ({idEvent: id, strHomeTeam: home, strAwayTeam: away, idHomeTeam: hid, idAwayTeam: aid, dateEvent: date, strTime: time ?? '', strStatus: status, strLeague: 'Test League', strSport: 'Soccer'})
const NOW = new Date('2026-10-24T02:00:00Z')

describe('the Athens day', () => {
  it('00:30 Athens still belongs to that Athens day, not the UTC one', () => {
    expect(dayKeyOf('2026-10-23T21:30:00Z')).toBe('2026-10-24')
    expect(dayKeyOf('2026-10-23T20:59:00Z')).toBe('2026-10-23')
  })
  it('the day is 23 or 25 hours long when the clocks change', () => {
    const h = (d: string) => { const b = dayBounds(d); return (b.end - b.start) / 3600_000 }
    expect(h('2026-03-29')).toBe(23)
    expect(h('2026-10-25')).toBe(25)
    expect(h('2026-10-24')).toBe(24)
  })
  it('05:00 delivery is 05:00 Athens in summer and winter', () => {
    expect(new Date(dayBounds('2026-10-24').sendAt).toISOString()).toBe('2026-10-24T02:00:00.000Z')
    expect(new Date(dayBounds('2026-10-26').sendAt).toISOString()).toBe('2026-10-26T03:00:00.000Z')
  })
  it('a date-only match is judged by its written date, a timed one by Athens time', () => {
    expect(belongsToDay({kickoff: '2026-10-24T00:00:00.000Z', dateOnly: true}, '2026-10-24')).toBe(true)
    expect(belongsToDay({kickoff: '2026-10-23T21:30:00.000Z', dateOnly: false}, '2026-10-24')).toBe(true)
    expect(belongsToDay({kickoff: '2026-10-24T21:00:00.000Z', dateOnly: false}, '2026-10-24')).toBe(false)
  })
  it('validates a day key', () => { expect(isDayKey('2026-02-30')).toBe(false); expect(isDayKey('2026-10-24')).toBe(true) })
  it('pages: 0/1/4/5/9 matches', () => { expect([0, 1, 4, 5, 9].map(pagesFor)).toEqual([1, 1, 1, 2, 3]) })
})

describe('classification never invents a result', () => {
  it('maps the provider words and leaves cancelled games out', () => {
    expect(classify('Not Started', '2026-10-24T15:00:00Z', false, NOW)).toBe('scheduled')
    expect(classify('Match Postponed', '2026-10-24T15:00:00Z', false, NOW)).toBe('postponed')
    expect(classify('Match Cancelled', '2026-10-24T15:00:00Z', false, NOW)).toBe('excluded')
    expect(classify('Match Finished', '2026-10-24T15:00:00Z', false, NOW)).toBe('finished')
  })
  it('an unknown word is never read as finished', () => {
    expect(classify('???', '2026-10-24T01:00:00Z', false, NOW)).toBe('live')
    expect(classify('???', '2026-10-24T15:00:00Z', false, NOW)).toBe('scheduled')
  })
})

describe('coverage is proven, not assumed', () => {
  const next = parseEvents({events: [ev('1', 'Celtic', 'Rangers', '2026-10-24', '14:00:00', 'Not Started', 'T1', 'T2'), ev('2', 'Celtic', 'Hearts', '2026-11-01', '14:00:00', 'Not Started', 'T1', 'T3')]})
  it('a club with a match today is complete', () => {
    const c = judgeClubDay({clubId: 'celtic', teamId: 'T1', day: '2026-10-24', next, last: [], fetchedAt: NOW.toISOString()})
    expect(c.coverage).toBe('complete'); expect(c.events).toHaveLength(1)
  })
  it('no match today is "complete" only when a later match proves the list reaches past the day', () => {
    const c = judgeClubDay({clubId: 'celtic', teamId: 'T1', day: '2026-10-25', next, last: [], fetchedAt: NOW.toISOString()})
    expect(c.coverage).toBe('complete'); expect(c.events).toHaveLength(0)
  })
  it('an empty provider answer is unconfirmed, never "no games"', () => {
    const c = judgeClubDay({clubId: 'celtic', teamId: 'T1', day: '2026-10-24', next: [], last: [], fetchedAt: NOW.toISOString()})
    expect(c.coverage).toBe('unconfirmed')
  })
})

describe('the snapshot', () => {
  const day = (clubId: string, teamId: string, events: ReturnType<typeof parseEvents>, coverage: 'complete' | 'unconfirmed' | 'error' = 'complete') =>
    ({clubId, providerTeamId: teamId, coverage, reason: null, fetchedAt: NOW.toISOString(), events: events.map(e => ({id: e.id, home: e.home, away: e.away, homeId: e.homeId, awayId: e.awayId, kickoff: e.kickoff, dateOnly: e.dateOnly, competition: e.competition, status: e.status}))})
  const derby = parseEvents({events: [ev('9', 'Celtic', 'Rangers', '2026-10-24', '14:00:00', 'Not Started', 'T1', 'T2')]})
  it('one match seen from two clubs is one fixture', () => {
    const s = buildSnapshot({day: '2026-10-24', now: NOW, clubs: [day('celtic', 'T1', derby), day('rangers-fc', 'T2', derby)], unmappedClubIds: []})
    expect(s.fixtures).toHaveLength(1); expect(s.fixtures[0]!.home.id).toBe('celtic'); expect(s.coverage).toBe('complete')
  })
  it('sorts by kick-off with time-to-be-confirmed last', () => {
    const evs = parseEvents({events: [ev('3', 'A FC', 'B FC', '2026-10-24', null), ev('2', 'C FC', 'D FC', '2026-10-24', '18:00:00'), ev('1', 'E FC', 'F FC', '2026-10-24', '12:00:00')]})
    const s = buildSnapshot({day: '2026-10-24', now: NOW, clubs: [day('celtic', 'T1', evs)], unmappedClubIds: []})
    expect(s.fixtures.map(f => f.id)).toEqual(['thesportsdb:1', 'thesportsdb:2', 'thesportsdb:3'])
    expect(s.fixtures[2]!.kickoff).toBeNull(); expect(s.fixtures[2]!.localDate).toBe('2026-10-24')
  })
  it('a failing or unmapped club makes the day partial; every club failing makes it unavailable', () => {
    const p = buildSnapshot({day: '2026-10-24', now: NOW, clubs: [day('celtic', 'T1', derby), day('olympiacos', 'T9', [], 'error')], unmappedClubIds: ['aek']})
    expect(p.coverage).toBe('partial'); expect(p.missingClubIds).toEqual(['aek', 'olympiacos'])
    const u = buildSnapshot({day: '2026-10-24', now: NOW, clubs: [day('celtic', 'T1', [], 'error')], unmappedClubIds: []})
    expect(u.coverage).toBe('unavailable'); expect(u.fixtures).toHaveLength(0)
  })
  it('cancelled matches are listed as excluded, not drawn', () => {
    const evs = parseEvents({events: [ev('5', 'A FC', 'B FC', '2026-10-24', '12:00:00', 'Match Cancelled')]})
    const s = buildSnapshot({day: '2026-10-24', now: NOW, clubs: [day('celtic', 'T1', evs)], unmappedClubIds: []})
    expect(s.fixtures).toHaveLength(0); expect(s.excluded).toHaveLength(1)
  })
  it('the hash changes when a kick-off changes and not when only the look time does', () => {
    const a = buildSnapshot({day: '2026-10-24', now: NOW, clubs: [day('celtic', 'T1', derby)], unmappedClubIds: []})
    const b = buildSnapshot({day: '2026-10-24', now: new Date(NOW.getTime() + 60_000), clubs: [{...day('celtic', 'T1', derby), fetchedAt: '2026-10-24T02:01:00.000Z'}], unmappedClubIds: []})
    const moved = parseEvents({events: [ev('9', 'Celtic', 'Rangers', '2026-10-24', '15:00:00', 'Not Started', 'T1', 'T2')]})
    const c = buildSnapshot({day: '2026-10-24', now: NOW, clubs: [day('celtic', 'T1', moved)], unmappedClubIds: []})
    expect(a.hash).toBe(b.hash); expect(a.hash).not.toBe(c.hash)
  })
})

describe('captions', () => {
  const s = buildSnapshot({day: '2026-10-24', now: NOW, clubs: [], unmappedClubIds: []})
  it('name the document by day, format and page', () => { expect(documentNameFor('2026-10-24', 'story', 0)).toBe('matchday-2026-10-24-story-01.png'); expect(documentNameFor('2026-10-24', 'post', 11)).toBe('matchday-2026-10-24-post-12.png') })
  it('never call an unconfirmed schedule "no games"', () => {
    expect(headerCaption({...s, coverage: 'partial'})).toContain('UNCONFIRMED')
    expect(instagramCaption({...s, coverage: 'partial'})).not.toMatch(/No games today/)
    expect(headerCaption({...s, coverage: 'complete'})).toContain('No games today.')
  })
  it('text and alert carry the reason', () => { expect(textPackage(s, 'why')).toContain('why'); expect(alertText(s, 'because')).toContain('because') })
})
