import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import type { MatchMasterFile } from '@/lib/archive/match-master-types'
import { haversineKm, roundKm } from '@/lib/away-days/distance'
import { applyFilters, journeyData, legTo, NO_FILTERS, visitsAt } from '@/lib/away-days/journey'
import type { AwayDaysMaster, MatchVenueRow, VenueRecord } from '@/lib/away-days/types'
import { AWAY_DAYS_OUT, INTERNATIONAL, buildAwayDaysMaster, serialiseAwayDays } from '@/scripts/away-days/build-master'
import { validateAwayDays } from '@/scripts/away-days/validate-master'

/**
 * AWAY DAYS (spec part B, §34). The public journey holds only VERIFIED visits: a ground
 * outside Israel with coordinates, a match the master holds without a claim, and a venue
 * source that agrees with the master about the date, the side and the score.
 */

const ROOT = join(__dirname, '..')
const read = (file: string) => JSON.parse(readFileSync(join(ROOT, file), 'utf8'))
const committed = read(AWAY_DAYS_OUT) as AwayDaysMaster
const matchMaster = read('content/generated/match-master.json') as MatchMasterFile
const registry = (read('content/manual/venue-registry.json') as { records: VenueRecord[] }).records
const rows = (read('content/manual/match-venues.json') as { records: MatchVenueRow[] }).records
const venue = (id: string) => committed.venues.find((v) => v.id === id)
const visitOf = (matchId: string) => committed.visits.find((v) => v.matchId === matchId)
const dateOf = (iso: string) => committed.visits.filter((v) => v.playedOn === iso)

describe('away days — the generated master', () => {
  it('rebuilds byte for byte and validates (npm run away-days:build / :validate)', () => {
    const { out, problems } = buildAwayDaysMaster(ROOT)
    expect(problems).toEqual([])
    expect(serialiseAwayDays(out) === readFileSync(join(ROOT, AWAY_DAYS_OUT), 'utf8'), 'stale — run npm run away-days:build').toBe(true)
    expect(validateAwayDays(ROOT)).toEqual([])
  })

  it('is deterministic — two builds are the same bytes', () => {
    expect(serialiseAwayDays(buildAwayDaysMaster(ROOT).out)).toBe(serialiseAwayDays(buildAwayDaysMaster(ROOT).out))
  })

  it('gives every official international match of the master a venue row — none forgotten', () => {
    const international = matchMaster.matches.filter((m) => m.sport === 'football' && INTERNATIONAL.has(m.competition))
    const listed = new Set(rows.map((r) => r.matchId))
    expect(international.length).toBeGreaterThan(130)
    for (const m of international) expect(listed.has(m.matchId), m.matchId).toBe(true)
  })

  it('every public visit has a venueId, and every public venue has lat/lng and a country', () => {
    expect(committed.visits.length).toBeGreaterThan(40)
    for (const v of committed.visits) {
      const ground = venue(v.venueId)
      expect(ground, v.id).toBeDefined()
      expect(Number.isFinite(ground!.latitude) && Number.isFinite(ground!.longitude)).toBe(true)
      expect(ground!.countryCode).toMatch(/^[A-Z]{2}$/)
      expect(ground!.sourceRefs.length).toBeGreaterThan(0)
    }
  })

  it('never puts a match played in Israel on the journey', () => {
    for (const v of committed.visits) expect(venue(v.venueId)?.countryCode, v.id).not.toBe('IL')
  })

  it('resolves every matchId to the match master', () => {
    const ids = new Set(matchMaster.matches.map((m) => m.matchId))
    for (const v of committed.visits) expect(ids.has(v.matchId), v.matchId).toBe(true)
    for (const r of committed.researchQueue) expect(ids.has(r.matchId), r.matchId).toBe(true)
  })

  it('merges aliases: no alias names two venue ids, and ids are unique', () => {
    expect(new Set(registry.map((v) => v.id)).size).toBe(registry.length)
    const owner = new Map<string, string>()
    for (const v of registry) {
      for (const name of [v.canonicalNameHe, v.canonicalNameLatin, ...v.aliases, ...v.historicalNames.map((h) => h.name)]) {
        if (!name) continue
        const prior = owner.get(name.toLowerCase())
        expect(prior === undefined || prior === v.id, `${name}: ${prior} and ${v.id}`).toBe(true)
        owner.set(name.toLowerCase(), v.id)
      }
    }
  })

  it('sorts the visits chronologically, deterministically', () => {
    const keys = committed.visits.map((v) => `${v.playedOn}|${v.matchId}`)
    expect(keys).toEqual([...keys].sort())
  })

  it('never makes public an unresolved opponent, a disputed field or a critical conflict', () => {
    const byId = new Map(matchMaster.matches.map((m) => [m.matchId, m]))
    for (const v of committed.visits) {
      const m = byId.get(v.matchId)!
      expect(m.opponent, v.id).not.toBeNull()
      // a disagreement about scorers hides the scorers, not the match
      expect(m.claims.filter((c) => !c.field.startsWith('scorers')), v.id).toEqual([])
      expect(m.conflictRefs, v.id).toEqual([])
      expect(m.playedOn.precision, v.id).toBe('day')
      expect(m.result, v.id).not.toBeNull()
      expect(m.confidence).toBeGreaterThanOrEqual(2)
    }
    for (const item of committed.researchQueue) {
      expect(item.reasons.length, item.matchId).toBeGreaterThan(0)
      expect(visitOf(item.matchId), item.matchId).toBeUndefined()
    }
  })

  it('shows scorers only when every Hapoel goal is a resolved entry', () => {
    const byId = new Map(matchMaster.matches.map((m) => [m.matchId, m]))
    for (const v of committed.visits) {
      if (!v.scorers) continue
      expect(v.scorers.length, v.id).toBe(v.scoreFor)
      for (const s of byId.get(v.matchId)!.scorers) expect(s.ownGoal || s.playerId !== null, v.id).toBe(true)
    }
  })
})

describe('away days — regression cases (§34, §38)', () => {
  it('2002 — a HOME match in Nicosia (GSP) is an away day', () => {
    const [milan] = dateOf('2002-03-14')
    expect(milan?.venueId).toBe('gsp-nicosia')
    expect(milan?.designatedSide).toBe('HOME')
    expect(venue('gsp-nicosia')?.countryCode).toBe('CY')
  })

  it('2014 — a HOME match in Larnaca is an away day', () => {
    const [astana] = dateOf('2014-07-24')
    expect(astana?.venueId).toBe('antonis-papadopoulos')
    expect(astana?.designatedSide).toBe('HOME')
  })

  it('2026 — Bergamo, designated AWAY', () => {
    const [atalanta] = dateOf('2026-08-20')
    expect(atalanta?.venueId).toBe('atleti-azzurri')
    expect(atalanta?.designatedSide).toBe('AWAY')
    expect(venue('atleti-azzurri')?.countryCode).toBe('IT')
  })

  it('2026 — Miskolc, designated HOME, three times at one marker', () => {
    const miskolc = committed.visits.filter((v) => v.venueId === 'dvtk')
    expect(miskolc.map((v) => v.playedOn)).toEqual(['2026-07-23', '2026-08-06', '2026-08-27'])
    expect(miskolc.every((v) => v.designatedSide === 'HOME')).toBe(true)
    const stop = committed.stops.find((s) => s.venueId === 'dvtk')
    expect(stop?.visitCount).toBe(3)
    expect(venue('dvtk')?.countryCode).toBe('HU')
  })

  it('a venue with several matches is one marker with several visits (Tehran 1970, Celtic Park)', () => {
    expect(committed.stops.find((s) => s.venueId === 'amjadieh')?.visitCount).toBe(4)
    expect(committed.stops.find((s) => s.venueId === 'celtic-park')?.visitCount).toBe(2)
    expect(new Set(committed.stops.map((s) => s.venueId)).size).toBe(committed.stops.length)
  })

  it('a historical alias lands on the same ground (Amjadieh = Shahid Shiroudi; Eneco Stadion = Het Kasteel)', () => {
    const amjadieh = registry.find((v) => v.id === 'amjadieh')!
    expect([...amjadieh.aliases, ...amjadieh.historicalNames.map((h) => h.name)]).toEqual(
      expect.arrayContaining(['Amjadieh Stadium', 'Shiroudi Stadium', 'Shahid Shiroudi Stadium']),
    )
    expect(registry.filter((v) => v.aliases.includes('Eneco Stadion')).map((v) => v.id)).toEqual(['het-kasteel'])
    expect(committed.visits.filter((v) => v.venueId === 'het-kasteel').map((v) => v.playedOn)).toEqual(['2003-08-14', '2003-10-15'])
  })

  it('Asia is in the canon: the 1967 final in Bangkok opens the journey, Tehran 1970 follows', () => {
    const first = committed.visits[0]!
    expect(first.playedOn).toBe('1967-12-19')
    expect(first.venueId).toBe('suphachalasai')
    expect(venue('suphachalasai')?.countryCode).toBe('TH')
    expect(dateOf('1970-04-10')[0]?.venueId).toBe('amjadieh')
  })

  it('a walkover is not a visit — the 1970 semi-final is in research, not on the map', () => {
    const semi = committed.researchQueue.find((r) => r.matchId === 'm_e6e65bf7eeff')
    expect(semi?.reasons.map((r) => r.code)).toContain('not-played')
    expect(visitOf('m_e6e65bf7eeff')).toBeUndefined()
  })

  it('a match with score and date but no ground goes to research, never to an invented point', () => {
    // Drammen 1998 was the example until delta 89 — UEFA's match record named Marienlyst, so it
    // is a visit now; an Intertoto away leg of 1981 is still a score and a date with no ground.
    const godset = visitOf('m_79b2d4bbb455')
    expect(godset?.venueId).toBe('marienlyst')
    expect(godset?.sourceRefs).toContain('https://match.uefa.com/v5/matches?matchId=55638')
    const vienna = committed.researchQueue.find((r) => r.matchId === 'm_03ea50267e68')
    expect(vienna?.venueId).toBeNull()
    expect(vienna?.reasons.map((r) => r.code)).toContain('physical-venue-unknown')
    for (const item of committed.researchQueue.filter((r) => r.venueId === null)) {
      expect(committed.visits.some((v) => v.matchId === item.matchId)).toBe(false)
    }
  })

  it('a decided disagreement goes public with the winner, and keeps the loser (Leeds in Florence, 2002)', () => {
    // CONFLICT until delta 89 (check-score + master-venue); decided for UEFA's record: 1:4 in Florence
    const leeds = visitOf('m_4100110bcfb1')
    expect(leeds?.venueId).toBe('artemio-franchi')
    expect([leeds?.scoreFor, leeds?.scoreAgainst]).toEqual([1, 4])
    const decided = matchMaster.matches.find((m) => m.matchId === 'm_4100110bcfb1')!.decided ?? []
    expect(decided.map((d) => d.field).sort()).toEqual(['result', 'venue'])
    for (const d of decided) expect(d.resolutionHe).toMatch(/^הוכרע/)
    expect(committed.researchQueue.filter((r) => r.status === 'CONFLICT')).toEqual([])
  })

  it('selects by physical country, never by AWAY: an AWAY row with no ground is not placed', () => {
    const intertotoAway = committed.researchQueue.filter((r) => r.competitionHe.includes('אינטרטוטו') && r.designatedSide === 'AWAY')
    expect(intertotoAway.length).toBeGreaterThan(0)
    for (const r of intertotoAway) expect(visitOf(r.matchId)).toBeUndefined()
  })
})

describe('away days — the red-fans reading (24.9.2026) folded into the canon', () => {
  const byId = new Map(matchMaster.matches.map((m) => [m.matchId, m]))

  it('marks the 1970 walkover not played, from both readings', () => {
    const semi = byId.get('m_e6e65bf7eeff')!
    expect(semi.notPlayed?.sourceIds.length).toBeGreaterThanOrEqual(2)
    expect(semi.result).toBeNull()
  })

  it('decides the 1967 final\'s scorers for RSSSF and keeps the red-fans reading in `decided`', () => {
    const final = byId.get('m_26a26d7e5164')!
    expect(final.claims.find((c) => c.field === 'scorers')).toBeUndefined()
    const decided = final.decided?.find((d) => d.field === 'scorers')
    expect(decided?.overruled.length).toBe(2)
    expect(decided?.overruled.some((v) => String(v.value).includes('בורסוק'))).toBe(true)
    expect(final.scorersDisputed).toBe(false)
    expect(final.scorers.filter((s) => s.ownGoal).length).toBe(1)
  })

  it('places a decided venue disagreement on the winner only (Razgrad, not DVTK, 30.7.2026)', () => {
    const match = byId.get('m_0c4347200189')!
    expect(match.claims.some((c) => c.field === 'venue')).toBe(false)
    expect(match.decided?.find((d) => d.field === 'venue')?.overruled.length).toBeGreaterThanOrEqual(2)
    expect(visitOf('m_0c4347200189')?.venueId).toBe('huvepharma')
  })

  it('prints no minute where the two readings disagree on it (Milan, 14.3.2002)', () => {
    expect(byId.get('m_b88bc98d09db')!.claims.some((c) => c.field === 'scorers.minute')).toBe(true)
    expect(visitOf('m_b88bc98d09db')?.scorers?.every((s) => s.minute === null)).toBe(true)
  })

  it('joins every red-fans row to a canonical match — no row left over', () => {
    expect(matchMaster.unresolved.filter((u) => u.kind === 'secondary-row')).toEqual([])
  })
})

describe('away days — the journey the page reads', () => {
  const data = journeyData(committed)

  it('starts at Bloomfield and measures the first leg with Haversine', () => {
    expect(data.origin.id).toBe('bloomfield')
    const leg = legTo(data, 0)!
    expect(leg.from.id).toBe('bloomfield')
    expect(leg.to.cityLatin).toBe('Bangkok')
    expect(leg.km).toBe(roundKm(haversineKm({ latitude: 32.05176, longitude: 34.76158 }, { latitude: 13.745556, longitude: 100.525556 })))
    expect(leg.km).toBeGreaterThan(6500)
    expect(leg.km).toBeLessThan(7500)
  })

  it('knows a leg to the same ground is zero kilometres', () => {
    const i = data.visits.findIndex((v) => v.playedOn === '1970-04-04')
    expect(legTo(data, i)?.sameGround).toBe(true)
    expect(legTo(data, i)?.km).toBe(0)
  })

  it('computes Haversine correctly on a known pair (London → Moscow ≈ 2,500 km)', () => {
    const km = haversineKm({ latitude: 51.5074, longitude: -0.1278 }, { latitude: 55.7558, longitude: 37.6173 })
    expect(km).toBeGreaterThan(2450)
    expect(km).toBeLessThan(2550)
  })

  it('filters by decade, country, competition and result', () => {
    expect(applyFilters(data, NO_FILTERS).length).toBe(data.visits.length)
    expect(applyFilters(data, { ...NO_FILTERS, decade: 1960 }).map((v) => v.playedOn)).toEqual(['1967-12-19'])
    expect(applyFilters(data, { ...NO_FILTERS, country: 'HU' }).length).toBe(3)
    expect(applyFilters(data, { ...NO_FILTERS, result: 'W' }).every((v) => v.scoreFor > v.scoreAgainst)).toBe(true)
    expect(visitsAt(data, 'amjadieh').length).toBe(4)
  })
})
