/**
 * ניקוד — "זמן משוקלל" (spec §6.2). Pure; the server calls it, the tests call it, and the
 * database computes the very same number for a duel (`worker_blind_cow_weighted`).
 *
 *   weightedTimeMs = rawElapsedMs + (hintsUsed − 1) · EXTRA_HINT_PENALTY_MS
 *                                 + wrongGuesses · WRONG_GUESS_PENALTY_MS
 *
 * The lowest weighted time wins. The penalties live in a VERSIONED config, never in a
 * component: a duel stores the version it was created under and is scored by it even if
 * the numbers are recalibrated after analytics (§6.2 "Configuration", §10).
 */

export type ScoringConfig = {
  version: number
  extraHintPenaltyMs: number
  wrongGuessPenaltyMs: number
  /** a duel run closes itself as TIMEOUT after this long (§6.3); solo has no hard clock */
  duelMaxMs: number
}

export const SCORING: Record<number, ScoringConfig> = {
  1: { version: 1, extraHintPenaltyMs: 15_000, wrongGuessPenaltyMs: 5_000, duelMaxMs: 120_000 },
}

export const SCORING_VERSION = 1

export function scoringConfig(version: number = SCORING_VERSION): ScoringConfig {
  return SCORING[version] ?? (SCORING[SCORING_VERSION] as ScoringConfig)
}

export function weightedTimeMs(
  run: { rawElapsedMs: number; hintsUsed: number; wrongGuesses: number },
  version: number = SCORING_VERSION,
): number {
  const cfg = scoringConfig(version)
  const hints = Math.max(1, Math.trunc(run.hintsUsed))
  return (
    Math.max(0, Math.round(run.rawElapsedMs)) +
    (hints - 1) * cfg.extraHintPenaltyMs +
    Math.max(0, Math.trunc(run.wrongGuesses)) * cfg.wrongGuessPenaltyMs
  )
}

/** Seconds with one decimal, the way the result screen prints them: 48400 → "48.4". */
export function secondsLabel(ms: number): string {
  return (Math.round(ms / 100) / 10).toFixed(1)
}

export type DuelSide = {
  status: 'solved' | 'gave_up' | 'timeout' | 'playing'
  weightedTimeMs: number | null
}

/**
 * Who won (§6.3): a solver beats a non-solver; two solvers are split by weighted time; two
 * non-solvers is NO WINNER — a winning score is never invented. An exact tie is a tie.
 */
export function duelWinner(a: DuelSide, b: DuelSide): 1 | 2 | 'tie' | 'none' {
  const aSolved = a.status === 'solved' && a.weightedTimeMs !== null
  const bSolved = b.status === 'solved' && b.weightedTimeMs !== null
  if (aSolved && !bSolved) return 1
  if (bSolved && !aSolved) return 2
  if (!aSolved && !bSolved) return 'none'
  if ((a.weightedTimeMs as number) === (b.weightedTimeMs as number)) return 'tie'
  return (a.weightedTimeMs as number) < (b.weightedTimeMs as number) ? 1 : 2
}
