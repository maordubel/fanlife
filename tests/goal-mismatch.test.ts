import { describe, expect, it } from 'vitest'

import type { TouchVerdict } from '@/lib/game/replay/judge'
import { goalTier, keyMismatch, mismatchLine } from '@/lib/game/replay/mismatch'
import { voice } from '@/lib/voice'

/**
 * Gate 8's result in words (ONE RED WORLD §17): "הרגע היה שם." and the key mismatch —
 * "המסירה השנייה ברחה קצת" — or, with nothing missed, "ככה זה קרה."
 */

function line(over: Partial<TouchVerdict>): TouchVerdict {
  return {
    kind: 'matched',
    userIndex: 0,
    truthIndex: 0,
    score: 90,
    grade: 'good',
    playerRight: true,
    actionRight: true,
    actionScore: 100,
    originScore: 90,
    targetScore: 90,
    routeScore: null,
    userActorHe: 'א',
    userAction: 'pass',
    truthActorHe: 'א',
    truthActorKind: 'player',
    truthAction: 'pass',
    positionHe: null,
    noteHe: null,
    ...over,
  }
}

describe('the key mismatch', () => {
  it('a clean move has none, and reads "ככה זה קרה."', () => {
    const touches = [line({}), line({ truthIndex: 1, userIndex: 1, truthAction: 'shot', userAction: 'shot' })]
    expect(keyMismatch({ touches })).toBeNull()
    expect(goalTier(90, null)).toBe('perfect')
    expect(voice({ gate: 8, moment: 'result', result: goalTier(90, null), seed: 1 }).title).toBe('ככה זה קרה.')
  })

  it('the second pass slipped a little → "המסירה השנייה ברחה קצת."', () => {
    const touches = [line({}), line({ truthIndex: 1, userIndex: 1, grade: 'near', score: 60 })]
    const miss = keyMismatch({ touches })
    expect(miss).toMatchObject({ kind: 'near', action: 'pass', place: 2 })
    expect(mismatchLine(miss)).toBe('המסירה השנייה ברחה קצת.')
    expect(goalTier(84, miss)).toBe('near')
    expect(voice({ gate: 8, moment: 'result', result: 'near', seed: 1 }).title).toBe('הרגע היה שם.')
  })

  it('gender agrees with the verb: a dribble is masculine', () => {
    const touches = [line({ truthIndex: 0, truthAction: 'dribble', userAction: 'dribble', grade: 'near', score: 55 })]
    expect(mismatchLine(keyMismatch({ touches }))).toBe('הכדרור הראשון ברח קצת.')
  })

  it('the worst line wins: a touch left out beats a near one; a wrong man is named from the record', () => {
    const touches = [
      line({ grade: 'near', score: 70 }),
      line({ kind: 'missing', userIndex: null, truthIndex: 2, truthAction: 'header', score: 0, grade: 'bad' }),
    ]
    expect(mismatchLine(keyMismatch({ touches }))).toBe('הנגיחה השלישית נשארה בחוץ.')
    const who = [line({ playerRight: false, truthActorHe: 'גילי לנדאו', truthAction: 'shot', grade: 'bad', score: 20 })]
    expect(mismatchLine(keyMismatch({ touches: who }))).toBe('הבעיטה הראשונה הייתה של גילי לנדאו.')
  })

  it('an unnamed actor is never guessed — the miss falls back to the place', () => {
    const touches = [line({ playerRight: false, truthActorHe: 'x', truthActorKind: 'unnamed', grade: 'bad', score: 20 })]
    expect(keyMismatch({ touches })?.kind).toBe('far')
  })
})
