import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { CHARACTERS, isActiveIn } from '../lib/life/characters'
import { CONVERSATIONS_BATYA } from '../lib/life/content/batya'
import { DIALOGUE } from '../lib/life/content/dialogue'
import { CAST_2000, FACES_2000 } from '../lib/life/world/castFigures'

/**
 * בתיה (27.9.2026) — מאור: *"יש צילום שלה בתיקייה, ובמשחק היא עומדת על גוף תחליפי. לחתוך
 * אותה מהצילום? כן. … היא לוקחת ל'סוקו' ול'מישל' את התפקיד, בתיה אמורה להיות החברה המבוגרת
 * מהשכונה, חברה כייפית אוהדת הפועל."*
 */
const manifest = JSON.parse(readFileSync(join(process.cwd(), 'public/life/art/manifest.json'), 'utf8')) as {
  figures: Record<string, { source?: string }>
  portraits: Record<string, { source?: string }>
}

describe('בתיה — הגוף שלה, הפנים שלה', () => {
  it('עומדת על הצילום שלה ולא על תחליף, והפנים בתיבה נחתכו מהגוף הזה', () => {
    expect(CAST_2000['בתיה']).toEqual({ figure: 'batya' })
    expect(FACES_2000['בתיה']).toBe('faceBatya')
    expect(manifest.figures['batya']?.source).toContain('בתיה.jpg')
    expect(manifest.portraits['faceBatya']?.source).toBe('cut from batya')
    expect(CHARACTERS['batya']?.portraitSet).toBe('faceBatya')
  })

  it('רק מ-2000 — אין גוף של אישה בת שישים בשנות ה-80 וה-90', () => {
    expect(isActiveIn('batya', '1986')).toBe(false)
    expect(isActiveIn('batya', '1996-army')).toBe(false)
    expect(isActiveIn('batya', '2006-home')).toBe(true)
    expect(isActiveIn('batya', '2026-plan')).toBe(true)
  })
})

describe('בתיה — התפקיד שלה, לא של סוקו ולא של מישל', () => {
  it('"תצלם גם את הכניסה" הוא של סוקו (2006, H02.2)', () => {
    const home = readFileSync(join(process.cwd(), 'lib/life/content/chapter2006home.ts'), 'utf8')
    expect(home).toContain('סוקו: "תצלם גם את הכניסה')
    expect(home).not.toContain('בתיה: "תצלם')
    expect(isActiveIn('soko', '2006-home')).toBe(true)
  })

  it('המרשם שלה אומר שכונה ואוכל, לא ארכיון ולא הסעות', () => {
    const tags = CHARACTERS['batya']?.tags ?? []
    for (const other of ['memory', 'archive', 'records', 'transport', 'network']) expect(tags).not.toContain(other)
    expect(tags).toContain('neighbourhood')
  })

  it('הרגעים שלה רשומים, ואף אחד מהם לא מתעד, לא מסיע ולא מוסר מידע', () => {
    for (const conversation of CONVERSATIONS_BATYA) expect(DIALOGUE[conversation.id]).toBeDefined()
    const words = JSON.stringify(CONVERSATIONS_BATYA)
    for (const job of ['ארכיון', 'לתעד', 'תצלם', 'מיניבוס', 'הסעה', 'רשימה']) expect(words, job).not.toContain(job)
  })
})
