import type { GateNo, Mood, ResultTier } from './types'

/**
 * ההקשר — which of the four sentences a gate speaks (§2.1), and how a score becomes a
 * tier the voice can answer. Pure, client-safe.
 *
 *   "זאת הפועל שלי"  identity — XI, the wardrobe, the ballot
 *   "אתה עוד זוכר?"  memory   — trivia, lineup, memory, goal, blind cow, timeline
 *   "מה אתה אומר?"   opinion  — the terrace vote, the hate wall
 *   story             the archive — found, not scored
 */
export type VoiceFamily = 'identity' | 'memory' | 'opinion' | 'story'

export const GATE_FAMILY: Readonly<Record<GateNo, VoiceFamily>> = {
  1: 'identity',
  2: 'memory',
  3: 'memory',
  4: 'memory',
  5: 'identity',
  6: 'memory',
  7: 'opinion',
  8: 'memory',
  9: 'identity',
  10: 'memory',
  11: 'opinion',
  12: 'story',
  13: 'memory',
}

/** The mood a gate carries when the caller names none — used to pick a song context. */
export const GATE_MOOD: Readonly<Record<GateNo, Mood>> = {
  1: 'identity',
  2: 'memory',
  3: 'memory',
  4: 'nostalgia',
  5: 'identity',
  6: 'memory',
  7: 'belonging',
  8: 'goal',
  9: 'identity',
  10: 'memory',
  11: 'pain',
  12: 'nostalgia',
  13: 'memory',
}

/**
 * **Only gate 11 may sound harsh** (§20): black, rough, angry — and still no "real fan",
 * no defamation, every charge from the record. `tests/voice.test.ts` holds every other
 * gate to the soft list and names gate 11's exemptions one key at a time.
 */
export const HARSH_GATES: readonly GateNo[] = [11]

/**
 * When a pool has no line for the tier asked, the next one down the list answers. A
 * missing `perfect` falls to `near` then `high`; a creation gate answers everything with
 * `done`. No tier ever falls UP — a low score never borrows a line written for a high one.
 */
export const TIER_FALLBACK: Readonly<Record<ResultTier, readonly ResultTier[]>> = {
  perfect: ['perfect', 'near', 'high', 'done'],
  near: ['near', 'high', 'done'],
  high: ['high', 'done'],
  mid: ['mid', 'done'],
  low: ['low', 'mid', 'done'],
  done: ['done', 'high', 'mid'],
}

/**
 * A share of a run (0..1) as a tier. `near` is "one detail short of everything" and so is
 * decided by the caller (it knows what one detail is); from a bare fraction the voice
 * says perfect, high, mid or low.
 */
export function tierFromShare(share: number): ResultTier {
  if (!Number.isFinite(share) || share <= 0) return 'low'
  if (share >= 1) return 'perfect'
  if (share >= 0.66) return 'high'
  if (share >= 0.42) return 'mid'
  return 'low'
}

/**
 * Gate 10: how many clues it took. One clue is perfect; up to three is high — "השם כבר
 * היה שם"; more is mid; a give-up or a timeout is low.
 */
export function tierFromClues(solved: boolean, hints: number): ResultTier {
  if (!solved) return 'low'
  if (hints <= 1) return 'perfect'
  if (hints <= 3) return 'high'
  return 'mid'
}
