import { describe, expect, it } from 'vitest'

import { CHAPTERS } from '@/lib/life/content/chapters'
import { emptyState } from '@/lib/life/events'
import { HINT_CHAPTERS, hintFor } from '@/lib/life/help'

/**
 * "?" — וכל פרק עונה בשם עצמו (21.9.2026).
 *
 * `hintFor` נפל ל-`HINTS['1986']` על כל פרק שאין לו שורה. שבעה פרקים של שלב ג׳ נכתבו
 * בלי שורה, ולכן בן 29 שעומד ליד אוסישקין ביום ההריסה ונוגע ב-"?" קרא *"שבת. יש היום
 * משחק. תדבר עם אבא"*. אף בדיקה לא שאלה את זה, כי הפונקציה החזירה משפט תקין — פשוט
 * של יום אחר. זו התקלה שאף בדיקה לא תופסת עד ששואלים אותה בשמה.
 */
describe('"?" — כל פרק עונה בשם עצמו', () => {
  it('has a help line of its own for every playable chapter', () => {
    const missing = CHAPTERS.filter((chapter) => chapter.playable && !HINT_CHAPTERS.includes(chapter.id)).map((c) => c.id)
    // שלב א׳ חוץ מ-1986 משתמש בשורות הכלליות, וזה קיים מלפני היום — לכן הבדיקה על B ו-C
    expect(missing.filter((id) => !/^a\d/.test(id))).toEqual([])
  })

  it('never answers a chapter with another day’s instruction', () => {
    const state = { ...emptyState({ birthYear: 1978, nameHe: 'פוגי' } as never, 2007), chapter: '2099-nowhere' }
    const line = hintFor(state as never, 'nowhere')
    expect(line).not.toContain('שבת')
    expect(line).not.toContain('אבא')
    expect(line.trim().length).toBeGreaterThan(10)
  })

  it('tells the demolition day something that belongs to it', () => {
    const state = { ...emptyState({ birthYear: 1978, nameHe: 'פוגי' } as never, 2007), chapter: '2007-registered' }
    const line = hintFor(state as never, 'ussishkin-outside')
    expect(line).toContain('אפי')
    expect(line).not.toContain('משחק')
  })
})

/**
 * ...ואותה שאלה על הג׳ובים: **ג׳וב של ילד לא נמשך לחיים של מבוגר**.
 *
 * `gigs.ts` החזיק העתק ידני של רשימת הפרקים שנגמר ב-2000, ולכן אף ג׳וב לא דלף לשלב ג׳
 * — במקרה. הסדר נגזר עכשיו מהמרשם, והסוף נאמר בשם (`CHILDHOOD_GIGS_END`). הבדיקה
 * הזאת היא מה שמונע מהגזירה להפוך את "בטוח במקרה" ל"דולף בשקט".
 */
import { GIGS, gigChapters } from '@/lib/life/gigs'

describe('ג׳ובי הילדות נגמרים איפה שנאמר', () => {
  it('offers no childhood gig in any chapter after 2000', () => {
    const leaks: string[] = []
    for (const gig of GIGS) {
      for (const chapter of gigChapters(gig)) if (Number(chapter.slice(0, 4)) >= 2001) leaks.push(`${gig.id}@${chapter}`)
    }
    expect(leaks).toEqual([])
  })
})
