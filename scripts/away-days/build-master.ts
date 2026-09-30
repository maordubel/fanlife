/**
 * npm run away-days:build — the AWAY DAYS master (spec §17–§22, §33; 24.9.2026).
 *
 *   Match Master  ─┐
 *   venue registry ├─→  content/generated/away-days-master.json  →  /away-days
 *   match → venue ─┘
 *
 * **Selection is by the ground's physical country, never by HOME/AWAY** (spec §15, §22):
 * the "home" night against Milan in Nicosia and the three "home" nights in Miskolc are
 * away days; a match with no known ground is not placed anywhere. Every official
 * international match of the master has a row in `match-venues.json`, so nothing can be
 * forgotten quietly — the builder fails on a match that has no row.
 *
 * **Only VERIFIED is public** (§33). A visit is VERIFIED when the master has its date,
 * Hapoel's side, the opponent and the result without a claim or an open conflict, the
 * ground is a registry row with coordinates, and what the ground's source says about the
 * match (date, side, score) agrees with the master. Anything else is PARTIAL, CONFLICT or
 * BLOCKED in `researchQueue`, with every reason — it is never "completed from logic".
 *
 * Deterministic: no clock, no randomness; the fingerprints are the inputs' bytes, and
 * `tests/away-days.test.ts` fails when the committed file is stale.
 */

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import type { MatchMasterFile, MatchRecord } from '@/lib/archive/match-master-types'
import type {
  AccuracyStatus,
  AwayDaysMaster,
  AwayVenueStop,
  AwayVisit,
  DesignatedSide,
  MatchVenueRow,
  ResearchItem,
  ResearchReason,
  VenueRecord,
  VerifiedScorer,
} from '@/lib/away-days/types'

export const AWAY_DAYS_OUT = 'content/generated/away-days-master.json'
export const AWAY_DAYS_INPUTS = {
  matchMaster: 'content/generated/match-master.json',
  venues: 'content/manual/venue-registry.json',
  matchVenues: 'content/manual/match-venues.json',
  clubs: 'content/manual/clubs.json',
  competitions: 'content/manual/competitions.json',
  euroTies: 'content/manual/euro-ties.json',
} as const

/** The official international competitions of the first team (spec §14). Friendlies, the
 *  1970 NASL guest games and the Channel One Cup are not here, on purpose. */
export const INTERNATIONAL = new Set([
  'גביע-אלופות-אסיה',
  'גביע-אסיה',
  'גביע-האינטרטוטו',
  'גביע-אופא',
  'הליגה-האירופית',
  'ליגת-האלופות',
  'קונפרנס-ליג',
])

export const ORIGIN_VENUE = 'bloomfield'
const FLOOR = 2
const US = 'הפועל-תל-אביב'

const sha = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex')
const byCodePoint = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

export function buildAwayDaysMaster(root = process.cwd()): { out: AwayDaysMaster; problems: string[] } {
  const raw = (file: string) => readFileSync(join(root, file), 'utf8')
  const read = (file: string) => JSON.parse(raw(file))
  const problems: string[] = []

  const master = read(AWAY_DAYS_INPUTS.matchMaster) as MatchMasterFile
  const venuesDoc = read(AWAY_DAYS_INPUTS.venues) as { records?: VenueRecord[] }
  const rows = (read(AWAY_DAYS_INPUTS.matchVenues) as { records: MatchVenueRow[] }).records
  const clubs = read(AWAY_DAYS_INPUTS.clubs).records as { slug: string; nameHe: string; nameEn?: string; sport?: string }[]
  const competitions = read(AWAY_DAYS_INPUTS.competitions).records as { slug: string; nameHe: string }[]
  const ties = read(AWAY_DAYS_INPUTS.euroTies).records as { slug: string; opponentLatin?: string | null }[]

  const registry = venuesDoc.records ?? []
  const venueById = new Map<string, VenueRecord>()
  for (const venue of registry) {
    if (venueById.has(venue.id)) problems.push(`duplicate venue id ${venue.id}`)
    venueById.set(venue.id, venue)
  }
  // An alias belongs to one ground — two rows answering to one name is a split stadium.
  const aliasOwner = new Map<string, string>()
  for (const venue of registry) {
    for (const name of [venue.canonicalNameHe, venue.canonicalNameLatin, ...venue.aliases, ...venue.historicalNames.map((h) => h.name)]) {
      if (!name) continue
      const key = name.toLowerCase()
      const owner = aliasOwner.get(key)
      if (owner && owner !== venue.id) problems.push(`alias "${name}" names both ${owner} and ${venue.id}`)
      aliasOwner.set(key, venue.id)
    }
    if (!/^[A-Z]{2}$/.test(venue.countryCode)) problems.push(`venue ${venue.id} has no ISO country code`)
    if (!Number.isFinite(venue.latitude) || !Number.isFinite(venue.longitude)) problems.push(`venue ${venue.id} has no coordinates`)
    if (Math.abs(venue.latitude) > 90 || Math.abs(venue.longitude) > 180) problems.push(`venue ${venue.id} coordinates out of range`)
    if (venue.sourceRefs.length === 0) problems.push(`venue ${venue.id} has no source`)
  }
  if (!venueById.has(ORIGIN_VENUE)) problems.push(`the origin venue ${ORIGIN_VENUE} is not in the registry`)

  const clubHe = new Map<string, string>()
  const clubEn = new Map<string, string>()
  for (const club of clubs) {
    if (club.sport && club.sport !== 'football') continue
    if (!clubHe.has(club.slug)) clubHe.set(club.slug, club.nameHe)
    if (club.nameEn && !clubEn.has(club.slug)) clubEn.set(club.slug, club.nameEn)
  }
  const competitionHe = new Map(competitions.map((c) => [c.slug, c.nameHe]))
  const tieLatin = new Map(ties.map((t) => [t.slug, t.opponentLatin ?? null]))

  const matchById = new Map(master.matches.map((m) => [m.matchId, m]))
  const international = master.matches.filter((m) => m.sport === 'football' && INTERNATIONAL.has(m.competition))
  const rowById = new Map<string, MatchVenueRow>()
  for (const row of rows) {
    if (rowById.has(row.matchId)) problems.push(`match-venues.json lists ${row.matchId} twice`)
    rowById.set(row.matchId, row)
    const match = matchById.get(row.matchId)
    if (!match) problems.push(`match-venues.json names ${row.matchId}, which the match master does not hold`)
    else if (!INTERNATIONAL.has(match.competition)) problems.push(`match-venues.json names ${row.matchId}, which is not an international match`)
    if (row.venueId && !venueById.has(row.venueId)) problems.push(`${row.matchId} → unknown venue ${row.venueId}`)
    const venue = row.venueId ? venueById.get(row.venueId) : undefined
    if (venue && row.countryCode && venue.countryCode !== row.countryCode) {
      problems.push(`${row.matchId}: row says ${row.countryCode}, venue ${venue.id} is in ${venue.countryCode}`)
    }
  }
  for (const match of international) {
    if (!rowById.has(match.matchId)) problems.push(`international match ${match.matchId} (${match.playedOn.value}) has no match-venues.json row`)
  }

  const opponentLatinOf = (match: MatchRecord): string | null => {
    for (const alias of match.aliases) {
      const m = alias.match(/^euro:(.+):\d{4}-\d{2}-\d{2}$/)
      const latin = m ? tieLatin.get(m[1] as string) : null
      if (latin && !latin.includes(' · ')) return latin // a group row lists three clubs — not this leg's
    }
    return match.opponent ? (clubEn.get(match.opponent) ?? null) : null
  }
  const sideOf = (match: MatchRecord): DesignatedSide =>
    match.hapoelSide === null ? null : match.neutralGround ? 'NEUTRAL' : match.hapoelSide === 'home' ? 'HOME' : 'AWAY'

  const verifiedScorers = (match: MatchRecord): VerifiedScorer[] | null => {
    const goals = match.result?.hapoel ?? null
    if (goals === null || goals === 0 || match.scorersDisputed) return null
    if (match.scorers.length !== goals) return null
    if (!match.scorers.every((s) => s.confidence >= FLOOR && (s.ownGoal || s.playerId !== null) && s.nameHe)) return null
    // two readings of the minutes (31′ or 32′): the scorers stand, the minutes are not printed
    const minutesDisputed = match.claims.some((c) => c.field === 'scorers.minute')
    return match.scorers.map((s) => ({
      nameHe: s.nameHe as string,
      minute: minutesDisputed || s.minute === null ? null : s.minute + (s.stoppage ?? 0),
      penalty: s.penalty,
      ownGoal: s.ownGoal,
    }))
  }

  const visits: AwayVisit[] = []
  const researchQueue: ResearchItem[] = []
  let inIsrael = 0
  let candidates = 0

  const ordered = [...rows].sort((a, b) => {
    const da = matchById.get(a.matchId)?.playedOn.value ?? a.check?.playedOn ?? ''
    const db = matchById.get(b.matchId)?.playedOn.value ?? b.check?.playedOn ?? ''
    return byCodePoint(da, db) || byCodePoint(a.matchId, b.matchId)
  })

  for (const row of ordered) {
    const match = matchById.get(row.matchId)
    if (!match) continue
    const venue = row.venueId ? (venueById.get(row.venueId) ?? null) : null
    const country = venue?.countryCode ?? row.countryCode
    if (country === 'IL') {
      inIsrael += 1
      continue
    }
    candidates += 1

    const reasons: ResearchReason[] = []
    const why = (code: ResearchReason['code'], detail: string) => reasons.push({ code, detail })
    const claimed = (field: string) => match.claims.find((c) => c.field === field)
    const date = match.playedOn.value

    if (row.status === 'walkover') why('not-played', row.reason ?? 'walkover')
    if (row.status === 'domestic-opponent') why('likely-domestic', row.reason ?? '')
    else if (country === null) why('physical-venue-unknown', row.reason ?? 'no source names the ground or its country')
    if (!venue && row.status === 'venue-conflict') why('venue-conflict', row.reason ?? '')
    else if (!venue && row.status === 'no-coordinates') why('no-coordinates', row.reason ?? '')
    else if (!venue && country !== null && row.status !== 'walkover') why('venue-missing', row.reason ?? 'the ground is not named')

    if (match.playedOn.precision === 'disputed') {
      const values = claimed('playedOn')?.values.map((v) => v.value ?? '—').join(' / ') ?? ''
      why('date-disputed', `the master holds two readings of the date: ${values}`)
    } else if (!date) why('date-unknown', 'the master has no date')
    if (match.hapoelSide === null) why('home-disputed', 'the readings disagree on who was at home')
    if (!match.opponent) why('opponent-unresolved', 'no opponent in the master')
    if (!match.result) {
      if (claimed('result')) {
        const values = claimed('result')?.values.map((v) => (v.value ? JSON.stringify(v.value) : 'לא שוחק / אין תוצאה')).join(' / ')
        why('result-disputed', `two readings of the result: ${values}`)
      } else why('score-unknown', 'no result in the master')
    }
    for (const ref of match.conflictRefs) why('open-conflict', ref)
    if (match.notPlayed && row.status !== 'walkover') why('not-played', match.notPlayed.reason)
    for (const c of match.claims) {
      if (c.field === 'venue') why('venue-conflict', `the readings name different grounds: ${c.values.map((v) => v.value ?? '—').join(' / ')}`)
      if (c.field === 'opponent') why('venue-conflict', `the readings name different opponents: ${c.values.map((v) => v.value ?? '—').join(' / ')}`)
    }
    if (match.confidence < FLOOR) why('low-confidence', `master confidence ${match.confidence}`)
    if (venue && venue.confidence < FLOOR) why('low-confidence', `venue ${venue.id} confidence ${venue.confidence}`)

    // what the ground's own source says about the match
    if (row.check && venue) {
      if (row.check.playedOn && date && row.check.playedOn !== date) {
        why('check-date', `venue source dates it ${row.check.playedOn}; the master says ${date}`)
      }
      const side = match.hapoelSide === 'home' ? 'HOME' : match.hapoelSide === 'away' ? 'AWAY' : null
      if (row.check.side && side && row.check.side !== side) {
        why('check-side', `venue source has Hapoel ${row.check.side}; the master says ${side}`)
      }
      if (match.result && (row.check.for !== match.result.hapoel || row.check.against !== match.result.opponent)) {
        why('check-score', `venue source says ${row.check.for}:${row.check.against} for Hapoel; the master says ${match.result.hapoel}:${match.result.opponent}`)
      }
    }
    // the master's own venue string must name the same ground (or none)
    if (venue && match.venue && match.venue !== venue.legacySlug) {
      why('master-venue', `the match master's venue is "${match.venue}", the venue sources say ${venue.canonicalNameLatin ?? venue.id}`)
    }

    const opponentHe = match.opponent ? (clubHe.get(match.opponent) ?? match.opponent.replace(/-/g, ' ')) : null
    const compHe = competitionHe.get(match.competition) ?? match.competition.replace(/-/g, ' ')
    const refs = [...new Set([...match.sourceIds.map((id) => `match-master:${id}`), ...row.sourceRefs, ...(venue?.sourceRefs.slice(0, 1) ?? [])])]

    if (reasons.length === 0 && venue && date && match.result && opponentHe) {
      const r = match.result
      visits.push({
        id: `visit:${match.matchId}`,
        matchId: match.matchId,
        playedOn: date,
        venueId: venue.id,
        designatedSide: sideOf(match),
        physicallyAbroad: true,
        competitionHe: compHe,
        stageHe: match.stage,
        opponentHe,
        opponentLatin: opponentLatinOf(match),
        scoreFor: r.hapoel,
        scoreAgainst: r.opponent,
        result: r.hapoel > r.opponent ? 'W' : r.hapoel < r.opponent ? 'L' : 'D',
        scorers: verifiedScorers(match),
        sourceRefs: refs,
      })
      continue
    }

    const critical = reasons.some((r) =>
      ['venue-conflict', 'date-disputed', 'home-disputed', 'result-disputed', 'open-conflict', 'check-date', 'check-side', 'check-score', 'master-venue'].includes(r.code),
    )
    const blocked = reasons.some((r) =>
      ['not-played', 'physical-venue-unknown', 'likely-domestic', 'venue-missing', 'no-coordinates', 'date-unknown', 'opponent-unresolved', 'score-unknown'].includes(r.code),
    )
    const status: Exclude<AccuracyStatus, 'VERIFIED'> = critical ? 'CONFLICT' : blocked ? 'BLOCKED' : 'PARTIAL'
    const missing: string[] = []
    if (!date) missing.push('playedOn')
    if (!match.opponent) missing.push('opponent')
    if (!venue) missing.push('venueId')
    if (!country) missing.push('countryCode')
    if (!venue) missing.push('latitude', 'longitude')
    if (!match.result) missing.push('score')
    researchQueue.push({
      matchId: match.matchId,
      playedOn: date ?? row.check?.playedOn ?? null,
      status,
      competitionHe: compHe,
      stageHe: match.stage,
      opponentHe,
      score: match.result ? { for: match.result.hapoel, against: match.result.opponent } : null,
      designatedSide: sideOf(match),
      venueId: venue?.id ?? null,
      countryCode: country,
      candidates: row.candidates ?? [],
      missing,
      reasons,
      sourceRefs: refs,
    })
  }

  // markers — one per ground, however many names it answered to
  const stopsById = new Map<string, AwayVenueStop>()
  for (const visit of visits) {
    const stop = stopsById.get(visit.venueId) ?? { venueId: visit.venueId, matchIds: [], visitIds: [], firstVisit: visit.playedOn, lastVisit: visit.playedOn, visitCount: 0 }
    stop.matchIds.push(visit.matchId)
    stop.visitIds.push(visit.id)
    stop.lastVisit = visit.playedOn
    stop.visitCount += 1
    stopsById.set(visit.venueId, stop)
  }
  const stops = [...stopsById.values()].sort((a, b) => byCodePoint(a.firstVisit, b.firstVisit) || byCodePoint(a.venueId, b.venueId))
  const used = new Set([ORIGIN_VENUE, ...stops.map((s) => s.venueId)])
  const venues = registry.filter((v) => used.has(v.id)).sort((a, b) => byCodePoint(a.id, b.id))

  const byStatus = { PARTIAL: 0, CONFLICT: 0, BLOCKED: 0 }
  for (const item of researchQueue) byStatus[item.status] += 1

  const out: AwayDaysMaster = {
    schemaVersion: 1,
    generatedFrom: {
      matchMasterFingerprint: sha(raw(AWAY_DAYS_INPUTS.matchMaster)),
      venuesFingerprint: sha(raw(AWAY_DAYS_INPUTS.venues)),
      matchVenuesFingerprint: sha(raw(AWAY_DAYS_INPUTS.matchVenues)),
    },
    origin: { venueId: ORIGIN_VENUE },
    counts: {
      candidates,
      visits: visits.length,
      stops: stops.length,
      countries: new Set(stops.map((s) => venueById.get(s.venueId)?.countryCode)).size,
      inIsrael,
      researchQueue: researchQueue.length,
      byStatus,
    },
    venues,
    visits,
    stops,
    researchQueue,
  }
  if (!visits.every((v) => v.physicallyAbroad && venueById.get(v.venueId)?.countryCode !== 'IL')) problems.push('a public visit is in Israel')
  if (!international.some((m) => m.clubs.includes(US))) problems.push('the master holds no international Hapoel match')
  return { out, problems }
}

/** One list element per line — readable diffs (the match master's own format). */
export function serialiseAwayDays(out: AwayDaysMaster): string {
  const lines: string[] = ['{']
  const entries = Object.entries(out)
  entries.forEach(([key, value], index) => {
    const comma = index < entries.length - 1 ? ',' : ''
    if (Array.isArray(value) && value.length > 0) {
      lines.push(`${JSON.stringify(key)}:[`)
      value.forEach((item, i) => lines.push(`${JSON.stringify(item)}${i < value.length - 1 ? ',' : ''}`))
      lines.push(`]${comma}`)
    } else lines.push(`${JSON.stringify(key)}:${JSON.stringify(value)}${comma}`)
  })
  lines.push('}')
  return `${lines.join('\n')}\n`
}

function main(): void {
  const { out, problems } = buildAwayDaysMaster(process.cwd())
  if (problems.length > 0) {
    for (const problem of problems) console.error(`PROBLEM: ${problem}`)
    process.exitCode = 1
    return
  }
  writeFileSync(join(process.cwd(), AWAY_DAYS_OUT), serialiseAwayDays(out), 'utf8')
  console.log(JSON.stringify(out.counts))
}

if (process.argv[1] && /build-master\.ts$/.test(process.argv[1]) && process.argv[1].includes('away-days')) main()
