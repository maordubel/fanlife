import { describe, expect, it } from 'vitest'

import { DIALOGUE } from '@/lib/life/content/dialogue'
import { CONVERSATIONS_HOME24 } from '@/lib/life/content/chapter2024home'

/**
 * אנשים אמיתיים לא מדברים במשחק (תנ"ך מהדורה 2, §29 — 27.9.2026).
 *
 * שמם יכול להופיע בכותרת, בכרטיס עובדה או בפי דמות בדיונית; מעשה ציבורי מתועד מותר.
 * **שורת דיאלוג בפיהם — לא**, גם לא בדיונית ומסומנת: ציטוט מומצא של אדם אמיתי הוא טענה
 * על אדם בשם (כלל 18), וסימון בהערות הפקה לא מגיע לשחקן ששומע אותו מדבר.
 *
 * הרשימה ידנית, בכוונה: בעלים, מנהלים ונבחרי ציבור שהסיפור של 2007–2026 עובר לידם. שחקני
 * הארכיון אינם כאן — כמה מהם דמויות שמאור אישר בשמן (כלל 67), וזו הכרעה שלו, לא של הבדיקה.
 */
const REAL_PUBLIC_FIGURES = ['ינאי', 'ספרא', 'זיידנברג', 'חולדאי', 'רמי כהן', 'מינצברג'] as const

describe('real people do not speak (bible §29)', () => {
  it('no conversation gives a line to an owner, an executive or an office-holder', () => {
    const offenders: string[] = []
    for (const conversation of Object.values(DIALOGUE)) {
      for (const branch of conversation.branches) {
        for (const line of branch.lines) {
          const who = line.who ?? ''
          if (REAL_PUBLIC_FIGURES.some((name) => who.includes(name))) offenders.push(`${conversation.id}: ${who}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('the 2024 ownership chapter speaks for the owners through a fictional role', () => {
    const speakers = new Set(CONVERSATIONS_HOME24.flatMap((c) => c.branches.flatMap((b) => b.lines.map((l) => l.who))))
    expect(speakers.has('נציג הבעלים')).toBe(true)
    // …and is never inside the room: the owners reach the fans on a screen
    const meeting = CONVERSATIONS_HOME24.find((c) => c.id === 'h24-meeting')
    expect(meeting?.remote?.['נציג הבעלים']).toBe('video')
  })

  it('prints no unverified detail the bible struck out (§26)', () => {
    const text = CONVERSATIONS_HOME24.flatMap((c) => c.branches.flatMap((b) => [...b.lines.map((l) => l.text), ...(b.choices ?? []).map((ch) => ch.text)])).join(' ')
    for (const struck of ['סושי', '91%', 'רוב גדול', '26 אלף', 'חרם רשמי']) expect(text, struck).not.toContain(struck)
  })
})
