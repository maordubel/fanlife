import type { QTopic, QType } from './questions/types'

/**
 * דוח המשחק — the pure half of gate 2's reactions and Match Report.
 *
 * Client-safe (no archive, no answers): it reads what the run already knows — right or
 * wrong, how hard, how fast, the streak — and names message KEYS, never Hebrew
 * (rule 10). Deterministic on purpose: the prototype drew its reaction lines with
 * `Math.random`, which makes the same run read differently twice and cannot be tested.
 */

export type AnswerLog = {
  id: string
  type: QType
  topic: QTopic
  difficulty: number
  correct: boolean
  hinted: boolean
  /** seconds used, 0 in practice */
  elapsed: number
  timeout: boolean
}

/** the reaction to one answer — a message key; its `.sub` key is the second line */
export function reactionFor(entry: AnswerLog, streak: number, index: number): { key: string | null } {
  // index stays in the signature: the plain lines are walked by it in the voice pool
  void index
  if (!entry.correct) {
    if (entry.timeout) return { key: 'trivia.react.timeout' }
    // the plain miss speaks in the Red Voice (`lib/voice`, gate 2 `wrong` pool)
    return { key: null }
  }
  if (entry.difficulty >= 5) return { key: 'trivia.react.deep' }
  if (!entry.hinted && entry.elapsed > 0 && entry.elapsed <= 3) return { key: 'trivia.react.fast' }
  if (streak >= 5) return { key: 'trivia.react.fire' }
  if (streak >= 3) return { key: 'trivia.react.onit' }
  // the plain hit speaks in the Red Voice (gate 2 `correct` pool): "כן." · "זה נשאר." · …
  return { key: null }
}

/** the streak callout — only at the numbers a terrace would shout */
export function streakCall(streak: number): string | null {
  if (streak === 2) return 'trivia.streak.2'
  if (streak === 3) return 'trivia.streak.3'
  if (streak === 4) return 'trivia.streak.4'
  if (streak >= 5) return 'trivia.streak.many'
  return null
}

/**
 * חום היציע — THIS run's heat, 0..100. It rises on a right answer (more for a harder
 * one) and drops on a miss. It is labelled as the run's own heat on screen and never
 * as a count of real people: there is no crowd behind it, only your answers.
 */
export function heatAfter(heat: number, entry: Pick<AnswerLog, 'correct' | 'difficulty'>): number {
  return entry.correct ? Math.min(100, heat + 10 + entry.difficulty * 2) : Math.max(0, heat - 14)
}

export const HEAT_START = 10

export type Tier = 'perfect' | 'great' | 'good' | 'wild' | 'rough' | 'out'

export function tierFor(correct: number, asked: number, lives: number): Tier {
  const share = asked > 0 ? correct / asked : 0
  if (lives <= 0) return 'out'
  if (share === 1) return 'perfect'
  if (share >= 0.83) return 'great'
  if (share >= 0.66) return 'good'
  if (share >= 0.42) return 'wild'
  return 'rough'
}

export type Report = {
  byType: Array<{ type: QType; right: number; asked: number }>
  bestStreak: number
  hardest: number | null
  strongest: QTopic | null
}

export function reportOf(log: readonly AnswerLog[]): Report {
  const byType = new Map<QType, { right: number; asked: number }>()
  const byTopic = new Map<QTopic, { right: number; asked: number }>()
  let streak = 0
  let bestStreak = 0
  let hardest: number | null = null
  for (const entry of log) {
    const type = byType.get(entry.type) ?? { right: 0, asked: 0 }
    byType.set(entry.type, { right: type.right + (entry.correct ? 1 : 0), asked: type.asked + 1 })
    const topic = byTopic.get(entry.topic) ?? { right: 0, asked: 0 }
    byTopic.set(entry.topic, { right: topic.right + (entry.correct ? 1 : 0), asked: topic.asked + 1 })
    streak = entry.correct ? streak + 1 : 0
    bestStreak = Math.max(bestStreak, streak)
    if (entry.correct) hardest = Math.max(hardest ?? 0, entry.difficulty)
  }
  const strongest =
    [...byTopic.entries()]
      .filter(([, value]) => value.right > 0)
      .sort(([, a], [, b]) => b.right / b.asked - a.right / a.asked || b.asked - a.asked)[0]?.[0] ?? null
  return {
    byType: [...byType.entries()].map(([type, value]) => ({ type, ...value })),
    bestStreak,
    hardest,
    strongest,
  }
}

export type NextChallenge = 'revenge' | 'hard' | 'surprise' | 'mix'

/** two suggestions — revenge when something is waiting, harder when this went well */
export function nextChallenges(input: {
  pending: number
  share: number
  mode: 'mix' | 'surprise' | 'revenge'
  hard: boolean
}): NextChallenge[] {
  const out: NextChallenge[] = []
  if (input.pending > 0 && input.mode !== 'revenge') out.push('revenge')
  if (input.share >= 0.75 && !input.hard) out.push('hard')
  if (input.mode !== 'surprise') out.push('surprise')
  if (input.mode !== 'mix' || input.hard) out.push('mix')
  return out.slice(0, 2)
}

/** "5 נקמות + 7 קשות" — the honest label when fewer than twelve are waiting */
export function revengeSplit(pending: number, length = 12): { revenge: number; filler: number } {
  const revenge = Math.min(pending, length)
  return { revenge, filler: length - revenge }
}
