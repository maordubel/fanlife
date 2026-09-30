import { describe, expect, it } from 'vitest'

import { BEATS_LACES } from '@/lib/life/content/chapter1998laces'
import { BEATS_DOUBLE } from '@/lib/life/content/chapter2000double'
import { SCARF_GIVEN } from '@/lib/life/content/threads'
import { apply, emptyState } from '@/lib/life/events'
import type { LifeState } from '@/lib/life/types'
import { meets } from '@/lib/life/world/types'

/**
 * הצעיף שעובר — שלושה רגעים לאורך עשור (מאור, 7.9.2026), **ושניים מהם לא ירו מעולם**.
 *
 * `scarf:given` נכתב ב-1986 ונמחק ב-`year.entered` הראשון, כי `scarf:` לא הייתה ברשימת
 * הקידומות של `personFlags` — אף שהקובץ של החוט כתב שהיא שם. ובתוך 1998 הביט חיכה לרווח
 * בין שני דגלים שנכתבים באותה שרשרת שיחה. `life:worldlines` מצא את הראשון כ-`STALE_READ`;
 * השני נמצא כשהראשון תוקן והרגע עדיין לא יכול היה להגיע.
 */

const IDENTITY = { name: 'פוגי', sex: 'boy', birthYear: 1978 } as const
const beat = (list: readonly { id: string; when?: unknown }[], id: string) => {
  const found = list.find((entry) => entry.id === id)
  if (!found) throw new Error(id)
  return found as { when?: Parameters<typeof meets>[1] }
}
const withFlags = (year: number, flags: string[]): LifeState => {
  let state: LifeState = emptyState(IDENTITY, 1986)
  state = apply(state, { t: 'flag.raised', flag: SCARF_GIVEN })
  state = apply(state, { t: 'year.entered', year, weekday: 6, minute: 20 * 60 })
  for (const flag of flags) state = apply(state, { t: 'flag.raised', flag })
  return state
}

describe('THE WORKER LIFE — the scarf reaches 1998 and 2000', () => {
  it('the scarf Kobi gave in 1986 is still his in 1998', () => {
    expect(withFlags(1998, []).flags[SCARF_GIVEN]).toBe(true)
  })

  it('1998: after the ten minutes, Ofir on the stairs — and the class waits for it', () => {
    const after = withFlags(1998, ['l1:after', 'l1:cut'])
    expect(meets(after, beat(BEATS_LACES, 'l1-scarf').when)).toBe(true)
    expect(meets(after, beat(BEATS_LACES, 'l1-to-class').when)).toBe(false)
    const asked = withFlags(1998, ['l1:after', 'l1:cut', 'scarf:asked:98'])
    expect(meets(asked, beat(BEATS_LACES, 'l1-scarf').when)).toBe(false)
    expect(meets(asked, beat(BEATS_LACES, 'l1-to-class').when)).toBe(true)
  })

  it('1998: whoever heard it on the radio did not see Ofir — straight to class', () => {
    const radio = withFlags(1998, ['l1:after', 'l1:cut', 'went:laces-radio'])
    expect(meets(radio, beat(BEATS_LACES, 'l1-scarf').when)).toBe(false)
    expect(meets(radio, beat(BEATS_LACES, 'l1-to-class').when)).toBe(true)
  })

  it('2000: after the whistle, before the walk home — the kid', () => {
    expect(meets(withFlags(2000, ['d:over']), beat(BEATS_DOUBLE, 'd-scarf').when)).toBe(true)
    expect(meets(withFlags(2000, ['d:over', 'd:walked']), beat(BEATS_DOUBLE, 'd-scarf').when)).toBe(false)
    const order = BEATS_DOUBLE.map((entry) => entry.id)
    expect(order.indexOf('d-scarf')).toBeLessThan(order.indexOf('d-after'))
  })
})
