import { CHAPTERS } from '../content/chapters'

/**
 * ------------------------------------------------------------ איפה פוגי גר ----
 *
 * לוח שנה אחד לשאלה שהמנוע שאל עד היום בשלושים מקומות בלי לשאול אותה: **איזה בית**.
 *
 * `home` הוא מזהה חדר שנשמר ביומן (כלל 35), ולכן הוא לא יכול להתפצל לשני מזהים בלי
 * לשבור שמירות. מה שמתפצל הוא **הציור**: עד 2012 פוגי גר אצל ההורים — הסלון של 1986,
 * הכורסה של קובי, רחל שאומרת "תיכנס כבר" ב-B00 — ומ-`2013-household` (L04, *"בית משותף /
 * בית עצמאי"*) יש לו בית משלו, `homeAdult`. התסריט עצמו מסמן את היוצאים מהכלל: A01 כתובה
 * *"סלון קובי"*, X01 *"אצל אבא ואמא"*, ו-F00 *"אבא ביקש לראות את התוכנית"* — אז בפרקים
 * האלה `home` הוא שוב הבית של ההורים, והכותרת אומרת את זה (`titleByEra`).
 *
 * כל שאר העולם קורא מכאן — הצביעה מחדש של `home`, איפה הקופסה האדומה עומדת, איזה חדר
 * ילדות עוד קיים — כדי שהתשובה תיכתב פעם אחת (כלל 59).
 */

/**
 * השנה של פרק — מהרישום, ולא מהמזהה. `a2-alley` הוא 1984, ו-`Number('a2-a')` הוא NaN,
 * וכל השוואה עם NaN היא `false`: בדיקה כמו `year < 2000` הייתה עונה "לא" על ימי שלב א׳
 * ומדליקה בהם את החיים הבוגרים. מזהה שאינו ברישום (`prologue`) נופל לארבע הספרות שלו.
 */
const YEAR_OF = new Map(CHAPTERS.map((c) => [c.id, c.year]))
export const yearOfChapter = (chapter: string): number => YEAR_OF.get(chapter) ?? (Number(chapter.slice(0, 4)) || 0)

/** the chapters whose `home` is Kobi and Rachel's again, although Pogi has his own */
export const PARENTS_AFTER_2013: readonly string[] = [
  // N05–N06 — קובי שואל "מאיפה יוצאים?" לאולם החדש, בסלון שלו
  '2015-newhall',
  // P05–P07 — "מה אתה רוצה לעשות עכשיו?" אחרי הירידה, אצלו
  '2017-after',
  // A01 — "סלון קובי", בלשון התסריט
  '2019-armchair',
  // X01 — "אצל אבא ואמא. מה נכנס למזוודה."
  '2021-suitcase',
  // X04 — יומיים בארץ: מי שגר בחו״ל ישן אצל ההורים
  '2023-visit',
  // F00–F01 — "אבא ביקש לראות את התוכנית"
  '2026-plan',
]

/** 2000–2012: a grown man in his childhood flat — the 1986 living room, his 2000 bedroom */
export function livesWithParents(chapter: string): boolean {
  const year = yearOfChapter(chapter)
  return year >= 2000 && year <= 2012
}

/** 2013 on, and not one of the evenings at Kobi and Rachel's — `homeAdult` */
export function ownHome(chapter: string): boolean {
  return yearOfChapter(chapter) >= 2013 && !PARENTS_AFTER_2013.includes(chapter)
}

/** every chapter id that answers `yes` — for `era:` lists, which are data, not functions */
export function chaptersWhere(test: (chapter: string) => boolean): string[] {
  return CHAPTERS.map((c) => c.id).filter(test)
}

/** every chapter of the adult life, 2000 on */
export const ADULT_LIFE: readonly string[] = chaptersWhere((id) => yearOfChapter(id) >= 2000)
