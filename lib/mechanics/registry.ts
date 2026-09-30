import type { GoalVerdict } from '@/lib/game/goal'
import type { KitVerdict } from '@/lib/game/kit-build-run'
import type { LineupVerdict } from '@/lib/game/lineup-sheet'
import type { MemoryVerdict } from '@/lib/game/memory-run'
import type { RoyalRumbleResult } from '@/lib/game/royal-rumble'

import type { ActivityMechanic, MechanicLevel } from './types'

/**
 * מה כל מכניקה היא — graded, or an opinion; and how its own verdict becomes a number 0..1.
 *
 * `graded: false` is rule 24 and rule 74 in one bit: a toy is not a quiz and an opinion is
 * not a ranking, so the life may pay for having ANSWERED an opinion and never for agreeing
 * with anybody. Every projection below reads the gate's OWN verdict — the life invents no
 * second grade. The imports are types only; nothing here reaches the archive.
 */
export type MechanicSpec = {
  graded: boolean
  /** brief §4.2's three families — which is why a board looks the way it does */
  family: 'challenge' | 'workspace' | 'explore'
}

export const MECHANICS: Record<ActivityMechanic, MechanicSpec> = {
  trivia: { graded: true, family: 'challenge' },
  lineupQuiz: { graded: true, family: 'challenge' },
  shirtDesigner: { graded: true, family: 'workspace' },
  memoryChallenge: { graded: true, family: 'challenge' },
  royalRumble: { graded: true, family: 'challenge' },
  goalReconstruction: { graded: true, family: 'challenge' },
  hateHistory: { graded: false, family: 'challenge' },
  poll: { graded: false, family: 'explore' },
  allTimeXI: { graded: false, family: 'workspace' },
  archive: { graded: false, family: 'explore' },
  myBag: { graded: false, family: 'explore' },
  supporterCraft: { graded: true, family: 'workspace' },
}

const unit = (value: number) => (Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0)

/** the slip: right answers over questions asked */
export function triviaScore(hits: number, asked: number): number {
  return asked > 0 ? unit(hits / asked) : 0
}

/**
 * חידון ההרכב, בשלושה גילים — projections of ONE verdict, graded by line on the server.
 *
 * A child is asked who played (a starter anywhere counts), a teenager gets half a point for
 * the right man in the wrong line, a man is graded exactly as the gate grades him.
 */
export function lineupScore(verdict: LineupVerdict, level: MechanicLevel): number {
  const total = verdict.total || 11
  if (level === 'child') return unit(verdict.starters / total)
  if (level === 'teen') return unit((verdict.exact + 0.5 * (verdict.starters - verdict.exact)) / total)
  return unit(verdict.exact / total)
}

/** the shirt: the gate's own points (fields + the perfect bonus, less the hints), over the most there is */
export function kitScore(verdict: KitVerdict): number {
  return unit(verdict.score / 115)
}

/** the four counters-not-praise verdicts of the memory wall */
export function memoryScore(verdict: MemoryVerdict): number {
  return { flawless: 1, sharp: 0.75, solid: 0.5, lit: 0.25 }[verdict]
}

/** the judge's own overall, 0–100 */
export function goalScore(verdict: GoalVerdict): number {
  return unit(verdict.metrics.overall / 100)
}

/**
 * The dare has a winner and a pot. `score` is how the friends will take it (a win, a draw, a
 * loss); `pay` is the share of the pot's range — a win by one is the floor, by three or more
 * the ceiling. A draw and a loss pay nothing, and cost nothing either: there is no stake.
 */
export function rumbleScore(result: RoyalRumbleResult): { score: number; won: boolean; pay: number } {
  const margin = result.scoreFor - result.scoreAgainst
  if (result.winner === 'us') return { score: 1, won: true, pay: unit((margin - 1) / 2) }
  if (result.winner === 'draw') return { score: 0.5, won: false, pay: 0 }
  return { score: 0.1, won: false, pay: 0 }
}

/** the black wall is an opinion: completion only, never agreement (rule 74) */
export function wallScore(duels: number, of: number): number {
  return of > 0 ? unit(duels / of) : 0
}
