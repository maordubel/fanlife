import {finalStatusOf, type ProviderFinal} from '@/lib/fixtures/provider'
import type {FinalResult} from '@/lib/fixtures/types'
import {scoreFingerprint} from './fingerprint'
import {competitionKind, outcomeOf} from './presentation'
import {startOfPreviousAthensDay} from './athens'
import type {Watch} from './types'

/** Two looks at the same final, at least this far apart, with the same fingerprint (spec §5.5). */
export const STABLE_MS = 5 * 60_000
const isScore = (n: unknown) => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 99

/** One club's view of a provider final. The score keeps its single meaning; nothing about 90 minutes is derived. */
export function toFinalResult(clubId: string, teamId: string, p: ProviderFinal, now: Date): FinalResult | null {
  if (p.homeId !== teamId && p.awayId !== teamId) return null
  const clubSide = p.homeId === teamId ? 'home' : 'away'
  const main = {home: p.homeScore, away: p.awayScore}
  return {
    clubId, kickoff: p.kickoff, home: p.home, away: p.away, homeScore: p.homeScore, awayScore: p.awayScore, clubSide,
    opponent: clubSide === 'home' ? p.away : p.home, competition: p.competition, providerEventId: p.id,
    dateOnly: p.dateOnly, finalStatus: p.finalStatus,
    regulationScore: p.finalStatus === 'FT' ? main : null,
    afterExtraTimeScore: p.finalStatus === 'AET' ? main : null,
    penalties: null,
    competitionKind: competitionKind(p.competition),
    evidence: {source: 'thesportsdb', providerEventId: p.id, rawStatus: p.rawStatus, status: p.finalStatus, observedAt: now.toISOString(), providerUpdatedAt: p.updatedAt},
  }
}

export type Check = {ok: true} | {ok: false; reason: string; review: boolean}
/**
 * The gate (spec §5). `review` = a person must look (e.g. a shoot-out with no kicks); otherwise it simply is not final
 * yet. Stability across two looks is judged separately, by `observe`.
 */
export function checkFinal(f: FinalResult, now: Date): Check {
  if (!f.providerEventId || !f.home.trim() || !f.away.trim()) return {ok: false, reason: 'event or teams not identified', review: false}
  if (!finalStatusOf(f.evidence.rawStatus) || finalStatusOf(f.evidence.rawStatus) !== f.finalStatus) return {ok: false, reason: `status "${f.evidence.rawStatus}" is not an allowed final`, review: false}
  if (!isScore(f.homeScore) || !isScore(f.awayScore)) return {ok: false, reason: 'score is not a whole number', review: true}
  if (!f.dateOnly && Date.parse(f.kickoff) > now.getTime()) return {ok: false, reason: 'kick-off is in the future', review: false}
  if (f.finalStatus === 'PEN') {
    if (!f.penalties || !isScore(f.penalties.home) || !isScore(f.penalties.away)) return {ok: false, reason: 'shoot-out score missing', review: true}
    if (f.penalties.home === f.penalties.away) return {ok: false, reason: 'shoot-out score is level', review: true}
    if (f.homeScore !== f.awayScore) return {ok: false, reason: 'a shoot-out follows a level score', review: true}
  }
  if (outcomeOf(f) === null) return {ok: false, reason: 'outcome cannot be decided from the record', review: true}
  return {ok: true}
}

/** Events before bootstrap are history and are never sent — unless they were already being watched before it. */
export function afterBootstrap(kickoff: string, bootstrapAt: string | null, watchedBefore: boolean): boolean {
  // the floor is the start of the Athens day BEFORE switching on: enabling today still brings yesterday's results
  return !bootstrapAt || watchedBefore || Date.parse(kickoff) >= startOfPreviousAthensDay(bootstrapAt)
}

/**
 * Folds one look into the watch. Pure: the clock and the result are arguments, so it is tested without a network.
 * - no final (null) → nothing changes (waiting)
 * - a failed check → waits, or asks for review; observations are dropped (a bad look is not a stable one)
 * - a different fingerprint → the confirmation starts over
 * - the same fingerprint seen at least STABLE_MS apart → ready
 */
export function observe(w: Watch, f: FinalResult | null, now: Date): Watch {
  if (!f) return w
  const base = {...w, lastResult: f}
  const chk = checkFinal(f, now)
  if (!chk.ok) return {...base, state: chk.review ? 'needs_review' : 'waiting', observations: [], note: chk.reason}
  const fp = scoreFingerprint(f), at = now.toISOString()
  const last = w.observations[w.observations.length - 1]
  const run = last && last.fingerprint === fp ? [...w.observations, {at, fingerprint: fp}] : [{at, fingerprint: fp}]
  const firstFinalSeenAt = w.firstFinalSeenAt ?? at
  const spread = Date.parse(run[run.length - 1]!.at) - Date.parse(run[0]!.at)
  if (w.confirmedFingerprint === fp) return {...base, observations: run, firstFinalSeenAt, state: w.state === 'done' ? 'done' : 'ready', note: null}
  if (run.length >= 2 && spread >= STABLE_MS) return {...base, observations: run, firstFinalSeenAt, confirmedFingerprint: fp, state: 'ready', note: w.confirmedFingerprint ? 'corrected result confirmed' : null}
  return {...base, observations: run, firstFinalSeenAt, state: 'confirming', note: last && last.fingerprint !== fp ? 'result changed between looks; confirming again' : null}
}

export const emptyWatch = (clubId: string, providerEventId: string, kickoff: string, dateOnly: boolean, providerTeamId: string | null): Watch => ({
  providerEventId, clubId, providerTeamId, kickoff, dateOnly, firstFinalSeenAt: null, observations: [], lastResult: null,
  confirmedFingerprint: null, state: 'waiting', note: null,
})
