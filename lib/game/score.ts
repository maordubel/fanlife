/**
 * The scoring model.
 *
 * Maor's note was that the game is exhausted after one round. A round with no stakes
 * has nothing to come back for: ten questions, ten right or wrong, a number. So three
 * things change.
 *
 * 1. Questions carry a DIFFICULTY, 1 to 5, and a round ramps: it opens on facts a
 *    casual fan knows and closes on the ones only the archive knows. A round has a
 *    shape instead of being ten interchangeable prompts.
 * 2. A run of correct answers pays MORE. The streak is the reason to keep going after
 *    a question you were unsure of, and the reason a bad answer stings.
 * 3. The score is measured in LAMPS, not points — the tower is already the product's
 *    unit of measurement, and a result you can picture beats a number you cannot.
 *
 * Pure arithmetic, no archive import: usable on the server for grading and on the
 * client for the running total, with no risk of the two disagreeing.
 */

export type Difficulty = 1 | 2 | 3 | 4 | 5

/** A correct answer at difficulty d lights d lamps, before the streak. */
export const LAMPS_PER_DIFFICULTY = 1

/** The streak multiplier caps, so a long round cannot run away with the score. */
export const MAX_STREAK_BONUS = 5

/**
 * Lamps for one answer. A wrong answer scores nothing and breaks the run — it never
 * goes negative, because a punishment on top of losing the streak just makes a bad
 * round feel unrecoverable.
 */
export function lampsFor(difficulty: Difficulty, streakBefore: number): number {
  const bonus = Math.min(streakBefore, MAX_STREAK_BONUS)
  return difficulty * LAMPS_PER_DIFFICULTY + bonus
}

/** The most a round of these difficulties could possibly be worth. */
export function perfectScore(difficulties: readonly Difficulty[]): number {
  let total = 0
  difficulties.forEach((difficulty, index) => {
    total += lampsFor(difficulty, index)
  })
  return total
}

export type RunState = {
  lamps: number
  streak: number
  bestStreak: number
  correct: number
  answered: number
}

export const EMPTY_RUN: RunState = {
  lamps: 0,
  streak: 0,
  bestStreak: 0,
  correct: 0,
  answered: 0,
}

export function applyAnswer(
  run: RunState,
  correct: boolean,
  difficulty: Difficulty,
): RunState {
  if (!correct) {
    return { ...run, streak: 0, answered: run.answered + 1 }
  }
  const gained = lampsFor(difficulty, run.streak)
  const streak = run.streak + 1
  return {
    lamps: run.lamps + gained,
    streak,
    bestStreak: Math.max(run.bestStreak, streak),
    correct: run.correct + 1,
    answered: run.answered + 1,
  }
}

/**
 * The rank shown at the end. Ranks are ROLES from the archive's own world — the person
 * who keeps the file, the one who paints the wall — rather than bronze/silver/gold,
 * which belongs to a different product.
 */
export type Rank = {
  key: string
  /** the share of the perfect score this rank needs */
  from: number
}

export const RANKS: readonly Rank[] = [
  { key: 'rank.archivist', from: 0.92 },
  { key: 'rank.keeper', from: 0.75 },
  { key: 'rank.regular', from: 0.55 },
  { key: 'rank.gate', from: 0.3 },
  { key: 'rank.newcomer', from: 0 },
]

export function rankFor(lamps: number, perfect: number): Rank {
  const share = perfect > 0 ? lamps / perfect : 0
  return (
    RANKS.find((rank) => share >= rank.from) ?? (RANKS[RANKS.length - 1] as Rank)
  )
}

/** Encode a run into a URL so a result is a link, not a screenshot of a number. */
export function encodeRun(run: RunState, perfect: number, seed: number): string {
  return [seed, run.lamps, perfect, run.correct, run.answered, run.bestStreak].join('-')
}

export function decodeRun(
  code: string,
): { seed: number; run: RunState; perfect: number } | null {
  const parts = code.split('-').map(Number)
  if (parts.length !== 6 || parts.some((value) => !Number.isFinite(value) || value < 0)) {
    return null
  }
  const [seed = 0, lamps = 0, perfect = 0, correct = 0, answered = 0, bestStreak = 0] = parts
  return {
    seed,
    perfect,
    run: { lamps, streak: 0, bestStreak, correct, answered },
  }
}
