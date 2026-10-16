import {describe, expect, it} from 'vitest'
import {finalStatusOf, parseFinals} from '@/lib/fixtures/provider'
import {checkFinal, observe, emptyWatch, toFinalResult, afterBootstrap, STABLE_MS} from '@/lib/final-whistle/verify'
import {scoreFingerprint, jobId} from '@/lib/final-whistle/fingerprint'
import {competitionKind, outcomeOf, emotionLine} from '@/lib/final-whistle/presentation'
import {eligibleClubIds} from '@/lib/final-whistle/eligibility'

const ev = (o: Record<string, string> = {}) => ({idEvent: '1', strSport: 'Soccer', strHomeTeam: 'Hapoel Tel Aviv', strAwayTeam: 'Maccabi X', idHomeTeam: 'T1', idAwayTeam: 'T2', dateEvent: '2026-10-17', strTime: '16:00:00', strLeague: 'Israeli Premier League', strStatus: 'Match Finished', intHomeScore: '2', intAwayScore: '1', ...o})
const NOW = new Date('2026-10-17T18:10:00Z')
const final = (o: Record<string, string> = {}) => toFinalResult('hapoel-tel-aviv', 'T1', parseFinals({events: [ev(o)]})[0]!, NOW)!

describe('what counts as a final', () => {
  it('accepts only the provider’s own ending words', () => {
    expect(parseFinals({events: [ev()]})).toHaveLength(1)
    for (const s of ['Not Started', '1H', 'HT', '2H', 'Postponed', 'Cancelled', 'Abandoned', 'Awarded', 'Walkover', 'Void', '', 'Brand New Status'])
      expect(parseFinals({events: [ev({strStatus: s})]}), s).toHaveLength(0)
    expect(finalStatusOf('AET')).toBe('AET'); expect(finalStatusOf('Match Finished')).toBe('FT'); expect(finalStatusOf('PEN')).toBe('PEN')
  })
  it('drops missing, negative, fractional or oversized scores — 0 is a score, null is not', () => {
    for (const s of ['', '-1', '2.5', 'x', '123']) expect(parseFinals({events: [ev({intHomeScore: s})]}), s).toHaveLength(0)
    expect(parseFinals({events: [ev({intHomeScore: '0', intAwayScore: '0'})]})[0]).toMatchObject({homeScore: 0, awayScore: 0})
    expect(parseFinals({events: [{...ev(), intAwayScore: null}]})).toHaveLength(0)
  })
  it('never derives a 90-minute score from an extra-time one, and never invents kicks', () => {
    const f = final({strStatus: 'AET'})
    expect(f.regulationScore).toBeNull(); expect(f.afterExtraTimeScore).toEqual({home: 2, away: 1}); expect(f.penalties).toBeNull()
    expect(final().regulationScore).toEqual({home: 2, away: 1})
  })
  it('a shoot-out without kicks waits for a person; with them it passes', () => {
    const pen = final({strStatus: 'PEN', intHomeScore: '1', intAwayScore: '1'})
    expect(checkFinal(pen, NOW)).toMatchObject({ok: false, review: true})
    expect(checkFinal({...pen, penalties: {home: 4, away: 3}}, NOW)).toEqual({ok: true})
    expect(checkFinal({...pen, penalties: {home: 3, away: 3}}, NOW)).toMatchObject({ok: false, review: true})
  })
  it('refuses a kick-off in the future', () => {
    expect(checkFinal(final({dateEvent: '2026-10-18'}), NOW)).toMatchObject({ok: false})
  })
})

describe('stability: two looks, five minutes apart, same fingerprint', () => {
  const w0 = emptyWatch('hapoel-tel-aviv', '1', '2026-10-17T16:00:00.000Z', false, 'T1')
  const at = (m: number) => new Date(NOW.getTime() + m * 60_000)
  it('one look is confirming, not ready', () => { expect(observe(w0, final(), NOW).state).toBe('confirming') })
  it('a second look inside five minutes is still confirming', () => { expect(observe(observe(w0, final(), NOW), final(), at(4)).state).toBe('confirming') })
  it('a second identical look five minutes later is ready', () => {
    const w = observe(observe(w0, final(), NOW), final(), at(STABLE_MS / 60_000))
    expect(w.state).toBe('ready'); expect(w.confirmedFingerprint).toBe(scoreFingerprint(final()))
  })
  it('a contradiction restarts the confirmation', () => {
    const w = observe(observe(w0, final(), NOW), final({intHomeScore: '3'}), at(6))
    expect(w.state).toBe('confirming'); expect(w.observations).toHaveLength(1)
  })
  it('no final yet changes nothing; a failed check clears the looks', () => {
    expect(observe(w0, null, NOW)).toBe(w0)
    expect(observe(observe(w0, final(), NOW), final({strStatus: 'PEN', intHomeScore: '1', intAwayScore: '1'}), at(6))).toMatchObject({state: 'needs_review', observations: []})
  })
  it('a later different result after ready is a correction candidate, never an overwrite', () => {
    const ready = observe(observe(w0, final(), NOW), final(), at(6))
    const next = observe(ready, final({intHomeScore: '3'}), at(30))
    expect(next.state).toBe('confirming'); expect(next.confirmedFingerprint).toBe(ready.confirmedFingerprint)
  })
})

describe('identity, outcome and the club’s own view', () => {
  it('fingerprint ignores when it was seen and the competition label, not the score', () => {
    const a = final(), b = {...a, evidence: {...a.evidence, observedAt: 'later'}, competition: 'Renamed'}
    expect(scoreFingerprint(a)).toBe(scoreFingerprint(b)); expect(scoreFingerprint(a)).not.toBe(scoreFingerprint(final({intAwayScore: '2'})))
  })
  it('a job id is one key per destination, event, club and result', () => {
    const fp = scoreFingerprint(final())
    expect(jobId('d', '1', 'a', fp)).toBe(jobId('d', '1', 'a', fp)); expect(jobId('d', '1', 'a', fp)).not.toBe(jobId('d', '1', 'b', fp))
  })
  it('outcome is from the club’s side, not from "home"', () => {
    const away = toFinalResult('hapoel-tel-aviv', 'T2', parseFinals({events: [ev()]})[0]!, NOW)!
    expect(outcomeOf(final())).toBe('win'); expect(outcomeOf(away)).toBe('loss')
  })
  it('classifies competitions conservatively', () => {
    expect(competitionKind('Israeli Premier League')).toBe('league'); expect(competitionKind('UEFA Europa League')).toBe('cup')
    expect(competitionKind('State Cup')).toBe('cup'); expect(competitionKind('Club Friendlies')).toBe('friendly'); expect(competitionKind('Some Series')).toBe('unknown'); expect(competitionKind(null)).toBe('unknown')
    expect(emotionLine('win', 'unknown', 'FT')).toBe('THIS ONE IS OURS.')
  })
  it('history before bootstrap is not sent, unless it was already watched', () => {
    expect(afterBootstrap('2026-10-01T00:00:00Z', '2026-10-10T00:00:00Z', false)).toBe(false)
    expect(afterBootstrap('2026-10-01T00:00:00Z', '2026-10-10T00:00:00Z', true)).toBe(true)
    expect(afterBootstrap('2026-10-11T00:00:00Z', '2026-10-10T00:00:00Z', false)).toBe(true)
  })
  it('only a published, chosen and provider-known club is eligible', () => {
    const clubs = [{id: 'hapoel-tel-aviv', status: 'live'}, {id: 'panathinaikos', status: 'paused'}, {id: 'olympiacos', status: 'research'}, {id: 'nowhere', status: 'live'}] as never
    expect(eligibleClubIds({clubs}, {clubIds: ['hapoel-tel-aviv', 'panathinaikos', 'olympiacos', 'nowhere']})).toEqual(['hapoel-tel-aviv'])
  })
})
