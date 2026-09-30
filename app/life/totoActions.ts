'use server'

import { DEFAULT_TOPIC } from '@/lib/game/topics'
import { deal, grade, type TriviaQuestion, type TriviaWindow, type Verdict } from '@/lib/game/trivia'
import type { MechanicWindow } from '@/lib/mechanics/types'
import { TOTO_LENGTH } from '@/lib/life/toto'

/**
 * הטוטו של פוגי — the same bank, the same authority, five questions.
 *
 * Maor's line was "בפועל — קופץ שאלון טרוויה שקיים לנו גם ככה באתר", and the point of
 * that sentence is that the questions must be the REAL ones. So this deals from the
 * site's own bank with the site's own rules: the answers never travel to the client, and
 * grading happens here against the seed. A Toto slip a child could read the results off
 * is not a Toto slip.
 *
 * Five, not twelve. A round inside a Saturday afternoon has to fit inside an afternoon.
 */
export async function dealToto(seed: number, window?: MechanicWindow | null): Promise<TriviaQuestion[]> {
  const cut = triviaWindow(window)
  const out: TriviaQuestion[] = []
  for (let index = 0; index < TOTO_LENGTH; index += 1) {
    const question = deal(seed, index, DEFAULT_TOPIC, 0, cut)
    if (question) out.push(question)
  }
  return out
}

export async function gradeToto(
  seed: number,
  index: number,
  answer: string | string[],
  window?: MechanicWindow | null,
): Promise<Verdict | null> {
  return grade(seed, index, answer, DEFAULT_TOPIC, 0, triviaWindow(window))
}

/**
 * From 1990 the slip is cut to the life's year (`lib/mechanics/types.ts`): nothing he could
 * not have known, and at twelve nothing harder than a twelve-year-old is asked. Before it —
 * the 1984–86 slip — there is no window and the deal is the one Maor tested.
 */
function triviaWindow(window?: MechanicWindow | null): TriviaWindow | undefined {
  if (!window || !Number.isFinite(window.before)) return undefined
  const maxDifficulty = window.level === 'child' ? 2 : window.level === 'teen' ? 3 : undefined
  return { before: Math.round(window.before), ...(maxDifficulty !== undefined ? { maxDifficulty } : {}) }
}
