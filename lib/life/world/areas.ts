import type { LifeState, LocationId } from '../types'

/**
 * מה שפוגי יודע על העיר — שכבת עלה אחת, כי גם המנוע וגם הדלתות צריכות אותה.
 *
 * הטבלאות האלה נולדו בתוך `world/reach.ts` ב-7.9.2026, ושם הן היו נכונות ובלתי שמישות:
 * `reach.ts` מייבא את `scenes.ts`, ולכן אף אחד מהקבצים שבאמת צריכים את המושג הזה — הרדיוסר
 * הטהור ב-`events.ts`, ומנגנון התנאים ב-`world/types.ts` — לא היה יכול לגעת בו בלי לגרור
 * את כל העולם המצויר אחריו. אז המושג יושב כאן, בקובץ שמייבא `../types` ותו לא, ו-`reach.ts`
 * מייצא אותו הלאה כדי ששום ייבוא קיים לא יישבר.
 *
 * ── מה שנשבר בלי זה ──────────────────────────────────────────────────────────────
 *
 * מאור, 17.9.2026: *"אני עכשיו במשימה של 11 במרץ 1991 ואני אמור ללכת לאוסישקין ואין בכלל
 * דלת לאוסישקין."* הוא צדק, והדלת לא הייתה הבאג. הדלת מאלנבי לאוסישקין ביקשה
 * `life:knows:hall`; את הדגל הזה מרימים רק ב-`a3-hall`; ו-`a3-hall` בכלל לא קורה למי שלא
 * התיידד עם אפי ב-`a2-alley`. כלומר חצי ממי שמתחיל חיים הגיע ל-1991 — פרק שכל תוכנו הוא
 * ערב אחד באוסישקין — בלי שהמקום קיים על המפה שלו. ואותו דבר ב-1993.
 *
 * שני התיקונים הם שני משפטים על העולם ולא שני טלאים על שני פרקים:
 *
 *   1. **מי שהיה שם פעם אחת יודע את הדרך.** `learnedOnArrival` היה כתוב ולא נקרא; עכשיו
 *      הרדיוסר קורא לו בכל `moved`. פרק שמתחיל באוסישקין (1993-galil, 1997-basket,
 *      1999-basket) מלמד את הדרך בעצם זה שהוא מתחיל שם.
 *   2. **מי שמזמין אותך הוא מי שלוקח אותך.** אופיר זרק את הפתק "היום אוסישקין?" על השולחן
 *      בבוקר; הוא גם זה שיודע ללכת לשם. `TEACHES` אומר את זה, ו-`{ area }` בתנאי הדלת
 *      אומר "הוא יודע, או שמישהו לוקח אותו עכשיו" — במקום שכל דלת תמנה בעצמה רשימת דגלים.
 */

// ------------------------------------------------------------------ ידיעת הדרך ---

export const ROUTE_PREFIX = 'route:'

/**
 * הדגל שכבר קיים מנצח — כלל 59, במקרה קטן ומאלף.
 *
 * כשנכתב `reach.ts` הונח שיידרש דגל חדש, `route:ussishkin`. probe מצא שהמשחק כבר מחזיק
 * אחד: הדלת מאלנבי דורשת `life:knows:hall` מאז שהפרק נכתב. המושג היה שם; מה שחסר היה מי
 * שיודע לקרוא לו בשם. שני שמות לאותו מושג זה בדיוק מה שהכלל אוסר.
 */
export const AREA_KNOWLEDGE: Record<string, string> = {
  ussishkin: 'life:knows:hall',
}

/** הדגל הקנוני שאומר שפוגי יודע להגיע לאזור */
export const routeFlag = (area: string) => AREA_KNOWLEDGE[area] ?? `${ROUTE_PREFIX}${area}`
export const knowsRoute = (state: LifeState, area: string) => Boolean(state.flags[routeFlag(area)])

/** הדגל הזה הוא ידע־דרך של אזור כלשהו? */
export const areaOfKnowledgeFlag = (flag: string): string | null => {
  const named = Object.entries(AREA_KNOWLEDGE).find(([, value]) => value === flag)
  if (named) return named[0] as string
  return flag.startsWith(ROUTE_PREFIX) ? flag.slice(ROUTE_PREFIX.length) : null
}

// --------------------------------------------------------------------- מדריכים ---

export const GUIDED_PREFIX = 'guided:'
/** מישהו לוקח אותו עכשיו — בזמן הזה מותר לו לעבור גם במה שהוא לא יודע */
export const guidedFlag = (who: string) => `${GUIDED_PREFIX}${who}`
export const guidedBy = (state: LifeState): string | null => {
  const key = Object.keys(state.flags).find((flag) => flag.startsWith(GUIDED_PREFIX) && state.flags[flag])
  return key ? key.slice(GUIDED_PREFIX.length) : null
}

/**
 * איזה אזור כל חדר שייך לו, מבחינת ידע.
 *
 * רק חדרים שילד לא אמור לדעת להגיע אליהם לבד מופיעים כאן. הרחוב, המטבח והמגרש של השכונה
 * אינם אזורים — הם הבית. אוסישקין הוא בדרום תל אביב, ובלומפילד ביפו, ואת שניהם לומדים
 * מאיזשהו מבוגר.
 */
export const AREA_OF: Partial<Record<LocationId, string>> = {
  'ussishkin-outside': 'ussishkin',
  'ussishkin-hall': 'ussishkin',
  'ussishkin-end': 'ussishkin',
}

/**
 * מי יכול ללמד איזה אזור.
 *
 * אפי הוא זה שלקח אותו בפעם הראשונה ב-1984, ולכן הוא היה כאן לבד. אופיר נוסף ב-17.9.2026
 * מסיבה שהייתה כתובה בתסריט מהיום שהוא נכתב ולא הייתה כתובה בקוד: **הפתק**. בבוקר של
 * 11.3.1991 נוחת על השולחן נייר מקופל לארבע ועליו "היום אוסישקין?" — ואת זה כתב אופיר.
 * ילד ששואל אותך אם אתה בא הערב יודע לאן הולכים. זה לא פתיחה של חצי עיר בגלל משפט של
 * דמות; זאת הדמות שכבר אמרה את המשפט.
 */
export const TEACHES: Record<string, string> = {
  efi: 'ussishkin',
  ofir: 'ussishkin',
}

/** מי, מבין אלה שיכולים ללמד, לוקח אותו לאזור הזה ברגע הזה */
export function guideTo(state: LifeState, area: string): string | null {
  for (const [who, taught] of Object.entries(TEACHES)) {
    if (taught === area && state.flags[guidedFlag(who)]) return who
  }
  return null
}

/**
 * האם הוא יכול להיכנס לאזור ברגע הזה — יודע את הדרך, או שמישהו לוקח אותו.
 *
 * זה המשפט היחיד שדלת צריכה להגיד על אזור, ולכן `{ area }` בתנאי קורא לפה. הגרסה שקדמה
 * לזה הייתה `when: { flag: 'life:knows:hall' }` על הדלת עצמה, וזה לא היה מדויק בשני
 * כיוונים: זה סגר את הדלת בפני מי שמישהו לוקח אותו, וזה חייב כל דלת עתידית למנות בעצמה
 * את רשימת המדריכים.
 */
export function canEnterArea(state: LifeState, area: string): boolean {
  return knowsRoute(state, area) || guideTo(state, area) !== null
}

/**
 * מה שנלמד בסוף הדרך — הצד השני של הנסיעה המודרכת.
 *
 * אחרי שאפי לקח אותו פעם אחת, פוגי יודע את הדרך. הרדיוסר קורא לזה ב-`moved`, ולכן זה נכון
 * גם בפרק שפשוט **מתחיל** באוסישקין: להתעורר במקום זה הדרך הכי ישירה ללמוד שהוא קיים.
 */
export function learnedOnArrival(where: LocationId): string | null {
  const area = AREA_OF[where]
  return area ? routeFlag(area) : null
}
