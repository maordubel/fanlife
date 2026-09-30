/**
 * מנוע הריצה — the loop every gate plays on.
 *
 * Maor's note was blunt and correct: the games were "placing things in a boring way",
 * not games. A form asks you a question, waits, and asks another. A GAME has a clock, a
 * cost for being wrong, a reward for being right twice in a row, a difficulty that
 * climbs, and — the part that matters most on a phone — it never asks you to press
 * "next". You answer, the screen reacts, and the next thing is already there.
 *
 * So this is the loop, and it is deliberately the SAME loop behind every gate:
 *
 *   · **שלבים** — a run is three stages. Each stage is harder than the one before, and
 *     between them a full-bleed card names the new rule. Escalation you can see beats
 *     escalation you only feel.
 *   · **פנסים** — three lives. Being wrong costs one; at zero the run is over even if
 *     questions remain. Without a cost, a wrong answer is free, and a free wrong answer
 *     is why the old rounds felt weightless.
 *   · **רצף** — a combo multiplier that climbs 1× 2× 3× 4× and resets to 1 on a miss.
 *     The multiplier is what makes the fourth right answer feel different from the
 *     first, which is the whole of arcade scoring.
 *   · **שעון** — a per-question clock. Answering fast is worth more; letting it run out
 *     is a miss, so the player is never allowed to stall. The clock is what turns
 *     thinking into playing.
 *
 * All of it is pure and synchronous so a tap resolves in the same frame. Grading still
 * happens on the server — this module never sees a correct answer, only whether one
 * was.
 */

export const LIVES = 3
export const STAGES = 3
export const STAGE_LENGTH = 4
export const RUN_LENGTH = STAGES * STAGE_LENGTH
export const MAX_MULTIPLIER = 4
/** seconds on the clock, per stage. It tightens as the stages climb. */
export const STAGE_SECONDS = [20, 15, 11] as const

export type Session = {
  index: number
  lives: number
  score: number
  combo: number
  bestCombo: number
  correct: number
  /** every answer so far, newest last — drives the run strip in the HUD */
  history: boolean[]
  over: boolean
}

export const NEW_SESSION: Session = {
  index: 0,
  lives: LIVES,
  score: 0,
  combo: 0,
  bestCombo: 0,
  correct: 0,
  history: [],
  over: false,
}

/** Which stage a question index belongs to, 0-based. */
export function stageOf(index: number): number {
  return Math.min(STAGES - 1, Math.floor(index / STAGE_LENGTH))
}

/** True at the first question of a stage after the first — where the card shows. */
export function isStageBreak(index: number): boolean {
  return index > 0 && index % STAGE_LENGTH === 0 && index < RUN_LENGTH
}

export function secondsFor(index: number): number {
  return STAGE_SECONDS[stageOf(index)] ?? 12
}

/** The live multiplier: 1× until two in a row, then up to 4× (or the stage's own cap). */
export function multiplierFor(combo: number, cap: number = MAX_MULTIPLIER): number {
  return Math.min(cap, MAX_MULTIPLIER, Math.max(1, combo))
}

/**
 * Quick Pick's per-stage caps — ×2 in the warm-up, ×3 in the middle, ×4 at the end — so
 * a hot start cannot run away with the score before the questions get hard. Optional:
 * the gates that do not pass a cap keep the flat ×4.
 */
export const STAGE_CAPS = [2, 3, 4] as const

export function stageCap(index: number): number {
  return STAGE_CAPS[stageOf(index)] ?? MAX_MULTIPLIER
}

/** what a paid hint costs, off the points of the answer it helped (brief §13) */
export const HINT_COST = 40

/**
 * What one answer is worth.
 *
 * Base 100, times the question's own difficulty, times the combo, plus a speed bonus
 * worth up to another 100. The speed term is linear in the time LEFT rather than a
 * threshold, so hesitating costs a little instead of costing nothing until it suddenly
 * costs everything.
 */
export function pointsFor(
  difficulty: number,
  combo: number,
  secondsLeft: number,
  total: number,
  cap: number = MAX_MULTIPLIER,
) {
  const speed = total > 0 ? Math.max(0, Math.min(1, secondsLeft / total)) : 0
  return Math.round((100 * difficulty + 100 * speed) * multiplierFor(combo, cap))
}

/**
 * What one outcome is worth, the one place it is computed — the run's announcement, its
 * burst and `advance` all read it, so the three can never disagree.
 *
 * A HINTED right answer gains no combo (the streak holds, it does not climb) and costs
 * `HINT_COST` off its points, never below zero. A miss is a miss either way.
 */
export function outcomeOf(
  session: Pick<Session, 'combo'>,
  outcome: { correct: boolean; difficulty: number; secondsLeft: number; total: number; hinted?: boolean; cap?: number },
): { gained: number; combo: number } {
  if (!outcome.correct) return { gained: 0, combo: 0 }
  const combo = outcome.hinted ? session.combo : session.combo + 1
  const points = pointsFor(outcome.difficulty, Math.max(1, combo), outcome.secondsLeft, outcome.total, outcome.cap)
  return { gained: outcome.hinted ? Math.max(0, points - HINT_COST) : points, combo }
}

/** Advance the run by one answer. `secondsLeft` of 0 means the clock ran out. */
export function advance(
  session: Session,
  outcome: { correct: boolean; difficulty: number; secondsLeft: number; total: number; hinted?: boolean; cap?: number },
): Session {
  const { gained, combo } = outcomeOf(session, outcome)
  const lives = outcome.correct ? session.lives : session.lives - 1
  const index = session.index + 1
  return {
    index,
    lives,
    score: session.score + gained,
    combo,
    bestCombo: Math.max(session.bestCombo, combo),
    correct: session.correct + (outcome.correct ? 1 : 0),
    history: [...session.history, outcome.correct],
    over: lives <= 0 || index >= RUN_LENGTH,
  }
}

/** Why the run ended — the result screen says different things for each. */
export function endReason(session: Session): 'survived' | 'out' {
  return session.lives <= 0 ? 'out' : 'survived'
}

export const RANKS = [
  { min: 4200, key: 'run.rank.capo' },
  { min: 3000, key: 'run.rank.north' },
  { min: 1800, key: 'run.rank.regular' },
  { min: 800, key: 'run.rank.gate' },
  { min: 0, key: 'run.rank.new' },
] as const

export function rankFor(score: number): string {
  return RANKS.find((rank) => score >= rank.min)?.key ?? 'run.rank.new'
}

/** The whole run in a URL parameter, so a result is a link and a link is a challenge. */
export function encodeSession(session: Session, seed: number): string {
  return [seed, session.score, session.correct, session.bestCombo, session.lives].join('.')
}

export function decodeSession(
  code: string,
): { seed: number; score: number; correct: number; bestCombo: number; lives: number } | null {
  const parts = code.split('.').map(Number)
  if (parts.length !== 5 || parts.some((value) => !Number.isFinite(value))) return null
  const [seed, score, correct, bestCombo, lives] = parts as [
    number,
    number,
    number,
    number,
    number,
  ]
  return { seed, score, correct, bestCombo, lives }
}
