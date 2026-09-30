import { describe, expect, it } from 'vitest'

import { tailOffset } from '@/components/life/DialogueBox'

/**
 * הזנב מצביע על מי שמדבר — and the one place this can go silently wrong is the axis.
 *
 * `anchor` is camera space: a fraction of the picture that grows the way the camera's x
 * grows. The balloon lives in an RTL flow and is placed with `inset-inline-start`, which
 * counts from the opposite edge. So every value passes through one flip, and a flip that
 * is missing looks completely plausible on screen — the tail simply points at the wrong
 * person, and with two speakers it points at the OTHER one, which reads as a bug in the
 * dialogue rather than a bug in a coordinate.
 *
 * Nothing else in the component knows a physical direction exists, so this is the whole
 * surface.
 */
const pct = (value: string) => Number(value.replace('%', ''))

describe('זנב הבלון', () => {
  it('מתהפך בין RTL ל-LTR ולא שוכח את אחד מהם', () => {
    // the same speaker, the same balloon, the two flows: the offsets must add up to 100%
    for (const anchor of [0.15, 0.3, 0.5, 0.7, 0.85]) {
      for (const atEnd of [true, false]) {
        const rtl = pct(tailOffset(anchor, atEnd, true))
        const ltr = pct(tailOffset(anchor, atEnd, false))
        expect(rtl + ltr).toBeCloseTo(100, 1)
      }
    }
  })

  it('זנב שנוסע עם הדובר, ובאותו כיוון', () => {
    // in LTR a speaker further along the picture puts the tail further along the sheet
    const left = pct(tailOffset(0.25, true, false))
    const middle = pct(tailOffset(0.5, true, false))
    const right = pct(tailOffset(0.75, true, false))
    expect(left).toBeLessThan(middle)
    expect(middle).toBeLessThan(right)
  })

  it('נשאר על הגיליון — לא בפינה של ה-✕ ולא על הלשונית האדומה', () => {
    for (const anchor of [-0.5, 0, 0.02, 0.98, 1, 1.5]) {
      for (const atEnd of [true, false]) {
        for (const rtl of [true, false]) {
          const value = pct(tailOffset(anchor, atEnd, rtl))
          expect(value).toBeGreaterThanOrEqual(10)
          expect(value).toBeLessThanOrEqual(90)
        }
      }
    }
  })

  it('הבלון של כל צד נמדד מהשפה שלו עצמו', () => {
    // the balloon is 92% of the glass pushed against its speaker's side, so the same
    // anchor sits at a different place on the sheet depending on which side the balloon
    // is on. Reading both from the same edge is the other easy way to get this wrong.
    expect(pct(tailOffset(0.5, true, false))).not.toBeCloseTo(pct(tailOffset(0.5, false, false)), 1)
  })
})
