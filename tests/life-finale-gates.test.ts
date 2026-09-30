import { describe, expect, it } from 'vitest'

import { DIALOGUE } from '@/lib/life/content/dialogue'
import { PARTY } from '@/lib/life/content/chapter2026finale'
import { emptyState } from '@/lib/life/events'
import { meets } from '@/lib/life/world/types'
import type { LifeState } from '@/lib/life/types'

/**
 * הסיום, לפי התנאים שהתסריט כתב לו — 21.9.2026.
 *
 * F01.3, F02.3 ו-F04.3 כתובים *"residence.abroad"* (ו-F04.3 גם *"armchair_active"*), ו-F02.2 /
 * F04.2 כתובים *"finale_party == three"*. עד היום שלושת הראשונים נפתחו לכל חיים — "להיפגש
 * באירופה, משני מקומות" לאיש שגר שלושה רחובות מאבא שלו — והשניים האחרונים נקראו מ"יש
 * ילד" ולא מ"הילד נסע", כי מי שנסע נמחק במעבר לפרק.
 */
const IDENTITY = { name: 'פוגי', sex: 'boy', birthYear: 1978 } as const
const life = (flags: Record<string, boolean | string>): LifeState => {
  const base = emptyState(IDENTITY, 1986)
  return { ...base, flags: { ...base.flags, ...flags } as LifeState['flags'] }
}
const choice = (conversation: string, id: string) => {
  for (const branch of DIALOGUE[conversation]?.branches ?? []) {
    const found = branch.choices?.find((c) => c.id === id)
    if (found) return found
  }
  throw new Error(`${conversation}.${id} not found`)
}

describe('F01–F04 — who can say which sentence', () => {
  it('offers "meet in Europe, from two places" only to a life that lives in the other place', () => {
    const reunion = choice('f-plan', 'reunion')
    expect(reunion.hidden).toBe(true)
    expect(meets(life({ 'f:ready': true }), reunion.when)).toBe(false)
    // X05 (`2025-abroad`) is where the invitation is said; without it, nobody said it
    expect(meets(life({ 'f:ready': true, 'life:abroad': true }), reunion.when)).toBe(false)
    // (90-E) and the plan must say so: two tickets on two names and a meeting point (`f-tickets`)
    expect(meets(life({ 'f:ready': true, 'life:abroad': true, 'life:finale:reunionOffered': true }), reunion.when)).toBe(false)
    expect(meets(life({ 'f:ready': true, 'life:abroad': true, 'life:finale:reunionOffered': true, 'f:tickets': 'reunion' }), reunion.when)).toBe(true)
  })

  it('waits for Kobi at the agreed spot only when coming from abroad', () => {
    const wait = choice('f-road', 'wait')
    expect(meets(life({}), wait.when)).toBe(false)
    expect(meets(life({ 'life:abroad': true }), wait.when)).toBe(true)
  })

  it('lets the child lead and choose the way back only if the child came', () => {
    for (const [conversation, id] of [['f-road', 'child'], ['f-back', 'three']] as const) {
      const c = choice(conversation, id)
      expect(meets(life({ 'life:child': true, [PARTY]: 'two' }), c.when), `${id} with the child at home`).toBe(false)
      expect(meets(life({ 'life:child': true, [PARTY]: 'three' }), c.when), `${id} with the child there`).toBe(true)
    }
  })

  it('"tomorrow I go back to my life" belongs to a life that is elsewhere — abroad, or in the armchair', () => {
    const mine = choice('f-back', 'mine')
    expect(meets(life({}), mine.when)).toBe(false)
    expect(meets(life({ 'life:abroad': true }), mine.when)).toBe(true)
    expect(meets(life({ 'life:armchair': true }), mine.when)).toBe(true)
  })

  it('carries who travels into the finale on a flag the chapter change does not erase', () => {
    for (const id of ['share', 'two', 'three', 'reunion', 'saving', 'later']) {
      let set = false
      let party = false
      for (const branch of DIALOGUE['f-plan']?.branches ?? []) {
        const c = branch.choices?.find((row) => row.id === id)
        if (!c) continue
        set = c.then.some((e) => e.e === 'flagValue' && e.flag === 'f:party')
        party = c.then.some((e) => e.e === 'flagValue' && e.flag === PARTY)
      }
      expect(party, `${id} sets f:party but not ${PARTY}`).toBe(set)
    }
    expect(PARTY.startsWith('life:')).toBe(true)
  })
})
