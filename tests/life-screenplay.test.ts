import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import places from '@/lib/life/content/screenplay/places.json'
import report from '@/lib/life/content/screenplay/report.json'
import scenes from '@/lib/life/content/screenplay/scenes.json'
import { ACHIEVEMENTS } from '@/lib/life/achievements'
import {
  ACHIEVEMENT_OF,
  AUDIENCE_OF,
  CHARACTER_OF,
  NEEDS_A_HOME,
  PRESENCE_INHERIT,
  PRESENCE_OF,
  ROLE_NOT_PERSON,
  SKILL_OF,
} from '@/lib/life/content/screenplay/mapping'
import { REPUTATION_AUDIENCES } from '@/lib/life/types'

/**
 * תסריט ההמשך — והמספר שמוכיח שהפרסר קרא ולא פירש.
 *
 * מאור מסר את 2000–2026 ב-20.9.2026, והמסמך **סופר את עצמו** במשפט הפתיחה שלו: *"114
 * סצנות, 345 בחירות ו־1,357 שורות דיאלוג"*. הפרסר סופר לגמרי לבד, מתוך הכותרות
 * והציטוטים, בלי לראות את המשפט הזה — ושתי הספירות מסכימות.
 *
 * זו אותה צורת ראיה שכלל 77 בנוי עליה: *"בדיקה שווה משהו רק כל עוד היא בלתי-תלויה במה
 * שהיא בודקת"*. שתי אמירות בלתי-תלויות של אותו מקור שמסכימות שוות יותר מכל אחת מהן,
 * והיום שבו הן ייפרדו הוא היום שבו הפרסר התחיל לאבד שורות בשקט.
 */
const SOURCE = readFileSync('docs/life/SCREENPLAY-2000-2026.md', 'utf8')

describe('תסריט 2000–2026 — מה שנקרא', () => {
  it('counts exactly what the source says it holds', () => {
    // the source's own sentence, read back out of it rather than typed here (rule 45)
    const claim = /(\d+) סצנות, (\d+) בחירות ו־([\d,]+) שורות דיאלוג/.exec(SOURCE)
    expect(claim, 'the source no longer states its own totals').toBeTruthy()
    expect(report.scenes).toBe(Number(claim![1]))
    expect(report.choices).toBe(Number(claim![2]))
    expect(report.dialogueLines).toBe(Number(claim![3]!.replace(/,/g, '')))
  })

  it('leaves no choice pointing at a scene that is not in the file', () => {
    expect(report.danglingContinuations).toEqual([])
  })

  it('places every scene in a chapter the source itself declares', () => {
    expect(scenes.some((scene) => scene.chapter === 'UNMAPPED')).toBe(false)
    // the map in the source lists twenty-one, main axis and life windows together
    expect(report.chapters.length).toBe(21)
  })

  /**
   * ומה שלא נקרא — מדווח, ולא מנוחש (כלל 11).
   *
   * שלושים ושתיים סצנות כותבות `זמן: לפי תחנת החיים והגיל` במקום שנה, כי הן חלונות חיים
   * ולא תחנות בציר. `year` שלהן הוא `null` ו-`yearRaw` מחזיק את מה שהמקור באמת כתב.
   * לנחש שנה לכל אחת מהן היה מייצר שלושים ושתיים עובדות שנראות בטוחות.
   */
  it('refuses to invent a year for a scene that states a life stage instead', () => {
    const staged = scenes.filter((scene) => scene.year === null)
    expect(staged.length).toBeGreaterThan(0)
    for (const scene of staged) {
      expect(scene.yearRaw, `${scene.id} lost the words the source used`).toBeTruthy()
      expect(report.rejected.some((row) => row.where === scene.id)).toBe(true)
    }
    for (const scene of scenes) {
      if (scene.year === null) continue
      expect(scene.year, `${scene.id} is dated before the continuation begins`).toBeGreaterThanOrEqual(2000)
      expect(scene.year, `${scene.id} is dated after the ending`).toBeLessThanOrEqual(2026)
    }
  })

  it('keeps every effect segment with the words the source used', () => {
    for (const scene of scenes) {
      for (const choice of scene.choices) {
        for (const effect of choice.effects) {
          expect(effect.key.length, `${choice.id} has a nameless effect`).toBeGreaterThan(0)
          expect(typeof effect.raw).toBe('string')
        }
      }
    }
  })

  /**
   * הפרסר קורא ואינו מכריע — ולכן הוא אינו מייצר אפקט של המנוע.
   *
   * מיזוג הקריאה עם התרגום הוא איך שפרסר מתחיל להחליט דברים בשקט (כלל 36). הבדיקה
   * שומרת על הגבול: `scenes.json` מחזיק את המילים של המקור, ואת שם המקטע כפי שנכתב.
   */
  it('produces no engine effect of its own', () => {
    const text = JSON.stringify(scenes)
    expect(text.includes('"e":"skill"')).toBe(false)
    expect(text.includes('"e":"proof"')).toBe(false)
    expect(text.includes('"t":"flag.raised"')).toBe(false)
  })
})

// ---------------------------------------------------------------------------------

/**
 * ...ומה מהמילים האלה כבר יש לו בית במנוע.
 *
 * `mapping.ts` הוא טבלאות ההכרעה, והבדיקה הזאת היא מה ששומר עליהן משתיקה: **כל מקטע
 * שהתסריט כותב חייב להיות או מתורגם או רשום בשמו כעבודה.** שורה שתתווסף לתסריט מחר עם
 * שם שאיש לא הכריע עליו מפילה כאן, במקום להיעלם בשקט בזמן שהדוח מדווח 92%.
 */
const SEGMENTS_WITH_A_HOME = new Set([
  'זיכרון',
  'מצב סיפורי',
  'קשרים',
  'עלויות',
  'הוכחת ביצוע',
  'מיומנויות',
  'פריט',
  'נוכחות',
  'אנרגיה',
  'אמון קהילה',
  // 21.9.2026 — `הישג` עבר מ"ממתין לעבודה" ל"יש לו בית": שש שורות ב-`achievements.ts`
  // ו-`ACHIEVEMENT_OF` שמחבר ביניהן. שבעה מקטעים ושישה הישגים, כי `keys_in_hand`
  // מופיע פעמיים באותה סצנה.
  'הישג',
])

describe('תסריט 2000–2026 — מה שיש לו בית', () => {
  it('leaves no segment that is neither translated nor written down as work', () => {
    const homeless: string[] = []
    for (const scene of scenes) {
      for (const choice of scene.choices) {
        for (const effect of choice.effects) {
          if (SEGMENTS_WITH_A_HOME.has(effect.key)) continue
          if (NEEDS_A_HOME[effect.key]) continue
          homeless.push(`${choice.id}:${effect.key}`)
        }
      }
    }
    expect(homeless).toEqual([])
  })

  /**
   * ...ו"בית" ל-`הישג` פירושו **שורה אמיתית ב-`achievements.ts`**, לא ערך בטבלה.
   *
   * הטבלה לבדה היא הבטחה; השורה היא מה שהמשחק סופר. בלי הבדיקה הזאת אפשר היה להצהיר
   * על מיפוי ל-`ACH_WHATEVER` שאינו קיים, והדוח היה מדפיס 100% (כלל 32, באותה צורה:
   * מפתח שמבקשים אותו חייב להתקיים).
   */
  it('maps every achievement the screenplay names to a row the engine really has', () => {
    const ids = new Set(ACHIEVEMENTS.map((row) => row.id))
    for (const [written, mappedTo] of Object.entries(ACHIEVEMENT_OF)) {
      expect(ids.has(mappedTo), `${written} → ${mappedTo}, which is not in ACHIEVEMENTS`).toBe(true)
    }
    const named = new Set<string>()
    for (const scene of scenes) {
      for (const choice of scene.choices) {
        for (const effect of choice.effects) if (effect.key === 'הישג') named.add(String(effect.value))
      }
    }
    expect([...named].filter((id) => !ACHIEVEMENT_OF[id]), 'a screenplay achievement with no decision').toEqual([])
    // שבעה מקטעים, שישה הישגים — `keys_in_hand` פעמיים ב-`O04`, והוא אחד
    expect(named.size).toBe(6)
  })

  it('names a skill the engine actually counts, for every skill the screenplay writes', () => {
    const engineSkills = new Set(['knowledge', 'communication', 'organization', 'business', 'creativity'])
    for (const [written, mappedTo] of Object.entries(SKILL_OF)) {
      expect(engineSkills.has(mappedTo), `${written} maps to a skill that does not exist`).toBe(true)
    }
    for (const scene of scenes) {
      for (const choice of scene.choices) {
        for (const effect of choice.effects) {
          if (effect.key !== 'מיומנויות' || !effect.value || typeof effect.value !== 'object') continue
          for (const name of Object.keys(effect.value)) {
            expect(SKILL_OF[name], `${choice.id} writes the skill ${name} and nothing decided what it is`).toBeTruthy()
          }
        }
      }
    }
  })

  it('maps every presence the screenplay writes, or marks it as inherited', () => {
    for (const scene of scenes) {
      for (const choice of scene.choices) {
        for (const effect of choice.effects) {
          if (effect.key !== 'נוכחות') continue
          const written = String(effect.value)
          expect(
            Boolean(PRESENCE_OF[written]) || written === PRESENCE_INHERIT,
            `${choice.id} writes the presence ${written} and nothing decided what it is`,
          ).toBe(true)
        }
      }
    }
  })

  /**
   * `oli` הוא `uli` — כי מאור אמר, ולא כי זה נראה דומה.
   *
   * הבדיקה הזאת שמרה על ה**שתיקה** עד 20.9.2026: כלל 64 §5 מדד גישור על שם ב-~50%
   * טעויות ומחק אותו, וההכרעה ששני איותים הם איש אחד היא של אדם. השאלה נשאלה, התשובה
   * הייתה "ULI", והבדיקה מחזיקה עכשיו את **ההכרעה** באותה חוזקה שהיא החזיקה את השתיקה.
   * מה שלא משתנה הוא מי מכריע: שם נוסף שייראה דומה יישאר בחוץ עד שיישאל.
   */
  it('maps oli to uli, because the owner said so', () => {
    expect(CHARACTER_OF['oli']).toBe('uli')
  })

  it('resolves a role at runtime instead of naming a person for it', () => {
    for (const role of ROLE_NOT_PERSON) expect(CHARACTER_OF[role], `${role} was given a person`).toBeUndefined()
  })

  /**
   * ו-`international` קיבל קהל משלו, ולא קיפול.
   *
   * מאור, 20.9.2026: *"קהלים בינלאומיים שמזוהים עם ארגון ANTIFA, כמו סט פאולי."*
   * הבדיקה מחזיקה את שתי הצלעות של ההכרעה: הוא **לא** `public` (זו טענה על מי שמע)
   * והוא **לא** `gate7` (שער 7 הוא האוהדים שלנו בחוץ; זה אוהדים של מישהו אחר שעומדים
   * אִתנו) — שתי הטעויות הקלות ביותר לעשות כאן בריפקטור.
   */
  it('gives the international terraces an audience of their own', () => {
    expect(AUDIENCE_OF['international']).toBe('international')
    expect(REPUTATION_AUDIENCES).toContain('international')
    expect(AUDIENCE_OF['international']).not.toBe('public')
    expect(AUDIENCE_OF['international']).not.toBe('gate7')
    expect(NEEDS_A_HOME['אמון קהילה']).toBeUndefined()
  })

  /**
   * ...ושם של מקום אינו שם של ציור, כי **ציור הוא עשור** (20.9.2026).
   *
   * מאור, במילה אחת: *"בלומפילד החדש למשל יש לך במאגר!"* — והוא הצביע על מחלקה שלמה.
   * ההתאמה האוטומטית עובדת על **מילה**, ולכן "בלומפילד" נופל על `bloomfield-outside`
   * שהוא הגישה של **1986**, ו"מגרש" נופל על חצר האבנים של ילד בן שמונה. שמונה-עשרה
   * סצנות בין 2000 ל-2026 ישבו כך על ציור מהעשור הלא נכון, וכולן נראו בריאות: החדר
   * קיים, הדלת עובדת, שום בדיקה לא אדומה.
   *
   * הבדיקה הזאת אינה קוראת לסקריפט ואינה חוזרת על הביטויים שלו — היא קוראת את
   * **התוצאה** מול **הסצנות**, ושואלת שאלה אחת: סצנה משנת 2000 ומעלה שהוצע לה אחד
   * מחמשת החדרים שהציור שלהם הוא שלב א׳, חייבת לשאת `repaint` שאומר באיזה ציור
   * להשתמש. שקט שם הוא בדיוק התקלה שאי-אפשר לראות (כלל 77 — בלתי-תלוי במה שהוא בודק).
   */
  it('never leaves a 2000s scene pointing at a Stage-A painting in silence', () => {
    const STAGE_A_ROOMS = new Set(['home', 'kitchen', 'bedroom', 'pitch', 'bloomfield-outside'])
    const yearOf = new Map<string, number | null>(
      (scenes as ReadonlyArray<{ id: string; year: number | null }>).map((scene) => [scene.id, scene.year]),
    )
    const rows = (places as { rows: ReadonlyArray<{ scene: string; suggest: string | null; repaint?: { backdrop: string } }> }).rows
    const silent = rows.filter((row) => {
      if (row.suggest === null || !STAGE_A_ROOMS.has(row.suggest)) return false
      const year = yearOf.get(row.scene) ?? null
      return (year === null || year >= 2000) && !row.repaint
    })
    // A01 נקובה **בשם**: `מקום: סלון קובי`. היא הסצנה היחידה מהעשורים האלה שהבית בה
    // הוא הבית של האב, ולכן היא נמנית כאן בשמה ולא מאחורי הכללה (כלל 78).
    expect(silent.map((row) => `${row.scene}→${row.suggest}`)).toEqual(['A01→home'])
    // ...ומי שכן נושא `repaint` נושא גם ציור בשם, לא דגל
    for (const row of rows) if (row.repaint) expect(row.repaint.backdrop.length).toBeGreaterThan(3)
  })
})
