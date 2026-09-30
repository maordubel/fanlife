import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { CITY_LABELS } from '@/lib/life/map'

/**
 * המפה — a title is not allowed to come out backwards.
 *
 * Maor, 6.9.2026: "במפה עצמה, הכותרות הגדולות כמו 'יפו' רשומות הפוך, 'ופי'". The cause
 * was `letterSpacing` on right-to-left SVG text — a known WebKit fault where the tracking
 * is inserted before bidi resolution runs again, and a short RTL string comes out
 * mirrored whole. `CityMap.tsx` no longer tracks any label; this test keeps it that way,
 * because the bug does not show up in a snapshot, only on a phone, and only for the one
 * size of label that had tracking on it.
 */
describe('הכותרות על המפה — ואף אחת מהן לא הפוכה', () => {
  it('never puts letter-spacing on the map\'s right-to-left labels again', () => {
    const source = readFileSync(join(process.cwd(), 'components/life/CityMap.tsx'), 'utf8')
    expect(source).not.toMatch(/letterSpacing=\{[^}]*[1-9]/)
  })

  it('every town and neighbourhood label is real Hebrew text, not a placeholder', () => {
    for (const label of CITY_LABELS) {
      expect(label.labelHe.trim().length).toBeGreaterThan(0)
      expect(/[֐-׿]/.test(label.labelHe), label.labelHe).toBe(true)
    }
  })
})
