/**
 * `StoryDirector` — השכבה שעונה על שאלה אחת, ולא מחליפה אף מערכת קיימת.
 *
 *   > מה הסיפור מבקש מהשחקן לחוות עכשיו?
 *
 * זאת שאלה שאף אחד לא ענה עליה עד היום, וזאת הסיבה שאפשר היה לשחק את המשחק רק אם כבר קראת
 * את התסריט. `flow.ts` יודע מתי היום מחכה לשעון. `reach.ts` יודע אם אפשר להגיע. `milestones`
 * יודע מה כבר קרה. `lastResort` יודע לזהות יום שנעצר. אף אחד מהם לא יודע **מי מוביל את
 * הרגע ומה השחקן אמור להרגיש שהוא עושה**.
 *
 * הבמאי הזה מתאם ולא מחליף: הוא קורא את הכוונות (`intents.ts`), שואל את `meets` על
 * ההשלמה הסמנטית, ומחזיר מצב אחד — מה עכשיו, מי שולט, איזו דרגת הדרכה מגיעה, ומה הקרס הבא.
 * הוא פונקציה טהורה מעל המצב, ולכן אפשר להריץ עליו פרק שלם בלי קנבס.
 *
 * ── שתי החלטות שכדאי להסביר ──────────────────────────────────────────────────────
 *
 * **ההדרכה מסלימה לפי חוסר התקדמות, ולא לפי טיימר.** דקות שקטות הן העדות היחידה שיש
 * למשחק לכך שהשחקן לא מבין; שעון קיר מודד משהו אחר לגמרי. `quietFor` הוא בדיוק הדבר
 * ש-`WorldScene` כבר סופר, אז אין כאן מונה שני.
 *
 * **תקרת הדרכה לכל כוונה.** רגע היסטורי מקבל תקרה 1 — דחיפה חברתית ולא יותר. לשים חץ על
 * מסך באמצע 2.5.1998 זה להרוס בדיוק את מה שהיום ההוא הוא. התקרה היא נתון על הכוונה, ולא
 * החלטה של רכיב תצוגה, כי אחרת מישהו יעקוף אותה.
 */
import type { LifeState } from '../types'
import { meets } from '../world/types'
import { intentsFor } from './intents'
import { guidedFor } from './guided-memories'
import type { GuidanceLevel, StoryHook, StoryIntent, StoryInput, StoryState } from './types'

/** מה שהמשחק אומר בשורה "עכשיו" כשמישהו מוביל — ולא מטרה מיותרת */
export const withLeadHe = (nameHe: string) => `עם ${nameHe} · בדרך`

/**
 * הכוונה הפעילה — הראשונה שהתנאי שלה מתקיים וההשלמה שלה עוד לא.
 *
 * הסדר ברשימה הוא הסדר בסיפור, ולכן הראשונה שמתאימה היא הנכונה. כוונה שהושלמה יוצאת מהדרך
 * מעצמה בלי שאף אחד צריך לכבות אותה, כי `completion` היא תנאי על המצב ולא דגל שמישהו מרים.
 */
export function currentIntent(state: LifeState, chapter: string): StoryIntent | null {
  for (const intent of intentsFor(chapter)) {
    if (intent.when && !meets(state, intent.when)) continue
    if (meets(state, intent.completion)) continue
    return intent
  }
  return null
}

/** הכוונה שרק עכשיו הושלמה, אם יש — זה מה שמפעיל "נרשם בזיכרון" */
export function justCompleted(before: LifeState, after: LifeState, chapter: string): StoryIntent | null {
  for (const intent of intentsFor(chapter)) {
    if (!intent.memory) continue
    if (meets(before, intent.completion)) continue
    if (meets(after, intent.completion)) return intent
  }
  return null
}

/**
 * דרגת ההדרכה — 0 היא העולם עצמו, ורק חוסר התקדמות מטפס ממנה.
 *
 * `stepMinutes` הוא כמה דקות שקט קונות דרגה אחת, והתקרה חוסמת. אף פעם לא מתחילים מדרגה 2:
 * ההנחה היא שהשחקן מבין, עד שהוא מוכיח אחרת.
 */
export function guidanceLevel(intent: StoryIntent | null, quietFor: number): GuidanceLevel {
  if (!intent?.guidance) return 0
  const { stepMinutes, ceiling } = intent.guidance
  const step = Math.max(1, stepMinutes)
  const level = Math.floor(quietFor / step)
  return Math.min(level, ceiling) as GuidanceLevel
}

/**
 * מה שמוצג ב"עכשיו".
 *
 * כשמישהו מוביל — **אין מטרה**. "OBJECTIVE: FOLLOW EFI" הוא שורה שאין לשחקן מה לעשות איתה,
 * כי הוא כבר הולך. במקומה סטטוס: «עם אפי · בדרך». התנועה עצמה היא הסיפור.
 */
export function nowLine(intent: StoryIntent | null, control: StoryState['control'], leadHe: string | null): string | null {
  if (control === 'GUIDED_FOLLOW' || control === 'GUIDED_GROUP') return leadHe ? withLeadHe(leadHe) : null
  if (control === 'CINEMATIC') return null
  return intent?.titleHe ?? null
}

/**
 * המצב, בקריאה אחת — זה מה שה-HUD, השומר והבדיקות קוראים.
 */
export function direct(input: StoryInput): StoryState {
  const { state, chapter, quietFor, busy } = input
  const guided = input.guidedId ? guidedFor(input.guidedId) : null
  const intent = currentIntent(state, chapter)

  const control: StoryState['control'] = guided
    ? 'GUIDED_FOLLOW'
    : busy
      ? 'CINEMATIC'
      : (intent?.control?.mode ?? 'FREE')

  const leadHe = guided?.leaderHe ?? (control === 'GUIDED_FOLLOW' ? (intent?.primaryLead?.nameHe ?? null) : null)

  // ההדרכה נעצרת ברגע שמישהו מוביל: אין מה להדריך כשהרגליים הולכות לבד
  const guidance = guided || busy ? 0 : guidanceLevel(intent, quietFor)

  const hook: StoryHook | null = intent && meets(state, intent.completion) ? (intent.hook ?? null) : null

  return {
    intent,
    control,
    leadHe,
    guidance,
    hook,
    nowHe: nowLine(intent, control, leadHe),
    alsoHe: alsoLines(state, chapter),
  }
}

/**
 * «אפשר גם» — התוכן האופציונלי, בשקט, מתחת. לעולם לא רשימת מטלות.
 *
 * המסמך אוסר על צ'קליסט גדול במהלך משחק רגיל, ובצדק: ברגע שיש רשימה, יש השלמה, וברגע שיש
 * השלמה — יש כישלון. חיים אינם רשימה שממלאים.
 */
export function alsoLines(state: LifeState, chapter: string): string[] {
  return intentsFor(chapter)
    .filter((intent) => intent.priority === 'optional')
    .filter((intent) => (!intent.when || meets(state, intent.when)) && !meets(state, intent.completion))
    .map((intent) => intent.titleHe)
    .slice(0, 3)
}
