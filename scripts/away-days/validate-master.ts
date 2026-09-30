/**
 * npm run away-days:validate — the publish guard, run against the COMMITTED file
 * (spec §22, §34). Exit 1 on any failure; prints one line per problem.
 *
 * The same checks run in `tests/away-days.test.ts`; this is the version a person runs
 * after editing `venues.json` or `match-venues.json`, before `away-days:build`.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { MatchMasterFile } from '@/lib/archive/match-master-types'
import type { AwayDaysMaster } from '@/lib/away-days/types'
import { AWAY_DAYS_OUT, buildAwayDaysMaster, serialiseAwayDays } from './build-master'

export function validateAwayDays(root = process.cwd()): string[] {
  const problems: string[] = []
  const text = readFileSync(join(root, AWAY_DAYS_OUT), 'utf8')
  const committed = JSON.parse(text) as AwayDaysMaster
  const master = JSON.parse(readFileSync(join(root, 'content/generated/match-master.json'), 'utf8')) as MatchMasterFile
  const matchIds = new Set(master.matches.map((m) => m.matchId))

  const built = buildAwayDaysMaster(root)
  problems.push(...built.problems)
  if (serialiseAwayDays(built.out) !== text) problems.push('stale — run npm run away-days:build')

  const venues = new Map(committed.venues.map((v) => [v.id, v]))
  if (venues.size !== committed.venues.length) problems.push('duplicate venue ids')
  let previous = ''
  for (const visit of committed.visits) {
    const venue = venues.get(visit.venueId)
    if (!venue) problems.push(`${visit.id}: venue ${visit.venueId} not in the file`)
    else {
      if (venue.countryCode === 'IL') problems.push(`${visit.id}: a public visit in Israel`)
      if (!Number.isFinite(venue.latitude) || !Number.isFinite(venue.longitude)) problems.push(`${visit.id}: no coordinates`)
    }
    if (!matchIds.has(visit.matchId)) problems.push(`${visit.id}: match ${visit.matchId} is not in the match master`)
    if (!visit.opponentHe) problems.push(`${visit.id}: no opponent`)
    const key = `${visit.playedOn}|${visit.matchId}`
    if (key <= previous) problems.push(`${visit.id}: visits out of order`)
    previous = key
  }
  const visitIds = new Set(committed.visits.map((v) => v.id))
  for (const stop of committed.stops) {
    for (const id of stop.visitIds) if (!visitIds.has(id)) problems.push(`stop ${stop.venueId}: unknown visit ${id}`)
    if (stop.visitCount !== stop.visitIds.length) problems.push(`stop ${stop.venueId}: count ≠ visits`)
  }
  for (const item of committed.researchQueue) {
    if (visitIds.has(`visit:${item.matchId}`)) problems.push(`${item.matchId} is both public and in research`)
    if (item.reasons.length === 0) problems.push(`${item.matchId} is in research without a reason`)
  }
  return problems
}

if (process.argv[1] && /validate-master\.ts$/.test(process.argv[1])) {
  const problems = validateAwayDays(process.cwd())
  for (const problem of problems) console.error(`FAIL: ${problem}`)
  if (problems.length === 0) console.log('away-days master: valid')
  process.exitCode = problems.length ? 1 : 0
}
