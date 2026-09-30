import type { ChallengeResult } from './contract'

/**
 * SCORE — one comparable figure per result, when the gate HAS one. Client-safe.
 *
 * Gates 1 and 9 are creations: an eleven and a five are opinions, and a number on them
 * would be the app ranking somebody's opinion (§1.2). They answer null here, and the
 * comparison speaks of agreement instead. Everywhere else the figure is what the gate
 * itself counts, in its own direction — for gate 10 and gate 6 fewer is the better
 * memory, and the comparison says so rather than flipping a sign.
 */
export type Figure = {
  value: number
  /** the most there was — 12 questions, 11 slots — or null when there is no ceiling */
  of: number | null
  /** fewer is the stronger memory (hints, moves, steps) */
  fewerIsBetter: boolean
}

const count = (marks: readonly boolean[]) => marks.filter(Boolean).length

export function figureOf(result: ChallengeResult): Figure | null {
  switch (result.gate) {
    case 1:
    case 9:
      return null
    case 2:
      return { value: count(result.marks), of: result.marks.length, fewerIsBetter: false }
    case 3:
      return { value: count(result.found), of: result.found.length, fewerIsBetter: false }
    case 6:
      return { value: result.moves, of: null, fewerIsBetter: true }
    case 8: {
      const avg = result.accuracy.reduce((sum, a) => sum + a, 0) / Math.max(1, result.accuracy.length)
      return { value: Math.round(avg), of: 100, fewerIsBetter: false }
    }
    case 10:
      return { value: result.hints, of: 10, fewerIsBetter: true }
    case 13:
      return result.variant === 'order'
        ? { value: count(result.marks), of: result.marks.length, fewerIsBetter: false }
        : { value: result.steps.reduce((sum, s) => sum + s, 0), of: null, fewerIsBetter: true }
  }
}

/** "9/12", "72%", "3" — how a figure prints. Digits only; the words are the card's. */
export function figureText(result: ChallengeResult): string | null {
  const figure = figureOf(result)
  if (!figure) return null
  if (result.gate === 8) return `${figure.value}%`
  return figure.of !== null && !figure.fewerIsBetter ? `${figure.value}/${figure.of}` : String(figure.value)
}
