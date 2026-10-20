import { MAX_TRIES, ROUND_POINTS } from './edition'

/** the day's one graded attempt: per round, the options tried; done when right or out of tries */
export type Ledger = { v: 1; club: string; date: string; edition: string; tries: [number[], number[], number[]]; points: [number | null, number | null, number | null] }

export const newLedger = (club: string, date: string, edition: string): Ledger => ({ v: 1, club, date, edition, tries: [[], [], []], points: [null, null, null] })

export type Step = { ok: true; ledger: Ledger; correct: boolean; done: boolean; points: number | null; answer: number | null } | { ok: false; error: 'BAD_ROUND' | 'BAD_OPTION' | 'ROUND_DONE' | 'ALREADY_TRIED' }

/** the next round still open, in order — rounds are played in sequence */
export const openRound = (l: Ledger): number | null => {
  const i = l.points.findIndex((p) => p === null)
  return i < 0 ? null : i
}
export const total = (l: Ledger): number => l.points.reduce<number>((s, p) => s + (p ?? 0), 0)
export const finished = (l: Ledger): boolean => openRound(l) === null

export function step(l: Ledger, round: number, option: number, answers: readonly [number, number, number], optionCount: number): Step {
  if (!Number.isInteger(round) || round < 0 || round > 2 || round !== openRound(l)) return { ok: false, error: l.points[round] !== null && round >= 0 && round <= 2 ? 'ROUND_DONE' : 'BAD_ROUND' }
  if (!Number.isInteger(option) || option < 0 || option >= optionCount) return { ok: false, error: 'BAD_OPTION' }
  if (l.tries[round]!.includes(option)) return { ok: false, error: 'ALREADY_TRIED' }
  const tries = l.tries.map((t) => [...t]) as Ledger['tries']
  tries[round]!.push(option)
  const correct = option === answers[round]
  const n = tries[round]!.length
  let points: number | null = null
  if (correct) points = ROUND_POINTS[n - 1] ?? 0
  else if (n >= MAX_TRIES) points = 0
  const next: Ledger = { ...l, tries, points: l.points.map((p, i) => (i === round ? points : p)) as Ledger['points'] }
  return { ok: true, ledger: next, correct, done: points !== null, points, answer: points !== null ? answers[round]! : null }
}
