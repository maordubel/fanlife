import { ALL_CHARACTERS } from './characters'
import type { CharacterId } from './types'

/**
 * `PARTNER` — התג שהתסריט עצמו משתמש בו, ומי שעומד מאחוריו.
 *
 * ענף חיי הבית כותב את הדובר כ-`PARTNER` ואומר במפורש: *"בן/בת הזוג הפעילים
 * מחליפים את תג הדובר PARTNER"*. שלוש דמויות יכולות למלא אותו (מלאני, דור, תמר),
 * ושכפול כל שיחה שלוש פעמים היה שלוש הזדמנויות שאחת מהן תיסחף מהשתיים האחרות
 * (כלל 59). לכן התוכן כותב `PARTNER` פעם אחת, והרדיוסר מחליף.
 *
 * **השם הוא `PARTNER` ולא `@partner`, וזו החלטה ולא טעם.** הטיוטה הראשונה המציאה
 * `@partner` על משקל `@crowd`, ו-`tests/life-cast` נפל עליה מיד — כי `RUNTIME_ROLES`
 * ב-`characters.ts` כבר רושם את `PARTNER` מ-20.9.2026, בשם שהתסריט כותב. שני שמות
 * לאותו תפקיד הם בדיוק מה שכלל 59 קיים נגדו; הרישום הקיים ניצח.
 *
 * זו אותה בנייה של `@crowd` (כלל 58), עם הבדל אחד: `@crowd` נשלף מהזרע, וזה נקרא
 * **מהבחירה של השחקן** — `life:partner`, דגל ערך ששורד מעבר פרק כי הוא `life:`.
 *
 * **ומה שקורה כשאין בן/בת זוג: שום דבר.** הפונקציה מחזירה `null`, כלומר שורת
 * נרטיב בלי דובר — ולא שם גנרי ולא פלייט של מישהו אחר. סצנה שצריכה בן זוג כדי
 * להיאמר היא סצנה שסוגרת את עצמה מאחורי `when`, ולא כזו שממציאה אדם.
 */
export const PARTNER_TAG = 'PARTNER'

/** הדגל שנושא את הבחירה — `life:` כדי שישרוד מעבר פרק (`personFlags`) */
export const PARTNER_FLAG = 'life:partner'

export function partnerId(flags: Readonly<Record<string, boolean | string | number>>): CharacterId | null {
  const value = flags[PARTNER_FLAG]
  return typeof value === 'string' && value.length > 0 ? value : null
}

export function partnerNameHe(flags: Readonly<Record<string, boolean | string | number>>): string | null {
  const id = partnerId(flags)
  if (!id) return null
  return ALL_CHARACTERS.find((person) => person.id === id)?.displayNameHe ?? null
}

/** The one call the runtime makes: every other `who` passes through unchanged. */
export function resolveSpeaker(
  who: string | null | undefined,
  flags: Readonly<Record<string, boolean | string | number>>,
): string | null {
  if (who !== PARTNER_TAG) return who ?? null
  return partnerNameHe(flags)
}
