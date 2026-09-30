/**
 * רטט — עזר אחד לכל השערים (21.9.2026).
 *
 * חמישה קבצים בשערים 4–5 כתבו את אותה שורה (`navigator.vibrate?.(8)` בתוך try), וכל
 * שער משודרג היה מוסיף עוד אחת. כאן היא נכתבת פעם אחת, עם שלושה חוזים:
 *   · שקט בשרת ובדפדפן בלי תמיכה — לעולם לא זורק;
 *   · שקט כשהמשתמש ביקש פחות תנועה (`prefers-reduced-motion`), כי רטט הוא תנועה;
 *   · שלושה עוצמות בשם, לא מספרים מפוזרים — `tap` לבחירה, `lock` לנעילה/הצלחה,
 *     `miss` לטעות. אף שער לא ממציא דפוס משלו.
 */
export type Haptic = 'tap' | 'lock' | 'miss'

const PATTERN: Record<Haptic, number | number[]> = {
  tap: 8,
  lock: [12, 40, 18],
  miss: [30, 30, 30],
}

export function haptic(kind: Haptic = 'tap'): void {
  try {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    navigator.vibrate?.(PATTERN[kind])
  } catch {
    // a browser that refuses is a browser that does not buzz — never an error on screen
  }
}
