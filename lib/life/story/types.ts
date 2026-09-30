/**
 * הבמאי של הסיפור — השכבה שחסרה, ולמה היא סמנטית ולא עוד שכבת UI.
 *
 * מאור, 7.9.2026: *"אני יודע מה לעשות רק כי אני כבר מכיר את התסריט."* זאת האבחנה הכי חשובה
 * שנאמרה על המשחק הזה, כי היא לא על באג — היא על משהו שאין. יש זרימה, יש נגישות, יש ביטים,
 * יש אבני דרך, ואף אחד מהם לא עונה על השאלה **מה הסיפור מבקש מהשחקן לחוות עכשיו**.
 *
 * ── חופש מבוים ────────────────────────────────────────────────────────────────────
 *
 * הכלל הקנוני, במילים שלו: *כשדמות מובילה את פוגי בסיפור — שתוביל אותו באמת. כשלפוגי יש
 * בחירה אמיתית — השליטה חוזרת לשחקן.*
 *
 * קובי אומר "יאללה, עכשיו הולכים ברגל הביתה". התשובה הנכונה היא לא
 * `OBJECTIVE: GO HOME` ומפה. התשובה הנכונה היא **שקובי מתחיל ללכת**. וכשקובי אוסר על פוגי
 * ללכת למשחק — שם השליטה חוזרת, כי שם היא באמת שווה משהו.
 *
 * ── למה כוונה ולא מטרה ───────────────────────────────────────────────────────────
 *
 * `INSPECT_RADIO` היא מטרה ברמת כפתור, והיא שברירית: היא נכשלת ברגע שהשחקן הבין את אותו
 * דבר בדרך אחרת. `UNDERSTAND_PARALLEL_MATCH_STATE` היא כוונה, ואפשר לספק אותה מהרדיו של
 * אבא, מהרדיו של ההוא, משמועה של ילד או משאלה לעמית. **הסיפור מתעניין במה שפוגי הבין, לא
 * באיזה הוטספוט הוא לחץ** — וזה בדיוק אותו לקח שאבני הדרך לימדו אותנו כשהפרקט חסם פרק שלם.
 *
 * הקובץ הזה הוא טיפוסים בלבד. הבמאי עצמו (`director.ts`) הוא פונקציה טהורה מעל המצב, ולכן
 * `tests/life-story.test.ts` מריץ סצנות שלמות בלי דפדפן.
 */
import type { LifeState, LocationId } from '../types'
import type { Condition } from '../world/types'

// ------------------------------------------------------------------ מי שולט ---

/**
 * מצבי שליטה — ומי הבעלים של התנועה ברגע נתון.
 *
 * זה לא עניין טכני. ילד בן שש לא שולט בחיים שלו, וזה אמור להיות מורגש באצבע: בשלב א׳
 * מבוגרים מובילים אותו הרבה, בשלב ב׳ הוא הולך לבד, ובסוף — הוא זה שאומר "בוא איתי". קשת
 * הדמות הזאת נכתבת במכניקה ולא רק בדיאלוג.
 */
export type ControlMode =
  /** השחקן הוא הבעלים של התנועה — חקירה, סידורים, בחירת מסלול */
  | 'FREE'
  /** דמות אחת מובילה, ופוגי הולך אחריה מעצמו */
  | 'GUIDED_FOLLOW'
  /** קהל זז, ופוגי בתוכו — הליכה לבלומפילד, יציאה מהיציע, מעבר בין שערים */
  | 'GUIDED_GROUP'
  /** שליטה מלאה של הבמאי — תשלום היסטורי, קפיצת זמן, ארכיון. נדיר בכוונה. */
  | 'CINEMATIC'
  /** התנועה עוצרת כי מתקבלת החלטה אמיתית. "זה הרגע שלך." */
  | 'CHOICE'
  /** המערכת זיהתה מצב בלתי אפשרי ומתקנת אותו. השחקן לא אמור לדעת שזה קרה. */
  | 'RECOVERY'

// ------------------------------------------------------------------ כוונה ---

export type StoryIntentKind =
  | 'travel'
  | 'discover'
  | 'meet'
  | 'learn'
  | 'choose'
  | 'obtain'
  | 'help'
  | 'survive'
  | 'experience'
  | 'return'

export type StoryPriority = 'main' | 'contextual' | 'optional'

/** מי מוביל את הרגע, כשמישהו מוביל */
export type StoryLead = { whoId: string; nameHe: string; atHe?: string }

/**
 * הקרס לרגע הבא — הכלל שאין עליו ויכוח: **כל ביט ראשי חייב לייצר את הבא אחריו.**
 *
 * ביט שנגמר ב"משימה הושלמה" ובשקט הוא ביט שנכשל בבדיקה, כי השאלה היחידה שחשובה היא מה
 * השחקן ירצה לעשות חמש שניות אחרי שזה נגמר. אם התשובה היא "להסתובב עד שיבין" — הביט לא
 * מוכן.
 */
export type StoryHook =
  | { kind: 'npc-call'; npcId: string; lineHe: string }
  | { kind: 'npc-leads'; npcId: string; guidedId: string }
  | { kind: 'sound'; soundId: string; fromHe: string }
  | { kind: 'world-event'; eventId: string; lineHe: string }
  | { kind: 'destination'; to: LocationId; labelHe: string }
  | { kind: 'choice'; choiceId: string; lineHe: string }
  | { kind: 'transition'; transitionId: string }

/**
 * הסלמת הדרכה — ארבע דרגות, והברירה היא תמיד הנמוכה ביותר שעובדת.
 *
 * דרגה 0 היא העולם עצמו: אפי מתחיל ללכת, אופיר מנופף, רעש עולה מכיוון מסוים. דרגה 4 היא
 * מסלול על המפה, והיא באה רק אחרי חוסר התקדמות ממושך או כשהשחקן ביקש. חץ ענק מעל כל דמות
 * הוא בדיוק מה שהמסמך אוסר, ולכן הדרגה היא נתון ולא החלטה של רכיב תצוגה.
 */
export type GuidanceLevel = 0 | 1 | 2 | 3 | 4

export type GuidancePolicy = {
  /** דקות משחק של חוסר התקדמות לפני כל עלייה בדרגה */
  stepMinutes: number
  /** הדרגה הגבוהה ביותר שהרגע הזה מרשה — רגע היסטורי לא מקבל חץ */
  ceiling: GuidanceLevel
}

export type ControlPolicy = {
  mode: ControlMode
  /** מותר לשחקן לקטוע? הליכה עם אבא כועס — פחות מותר */
  interruptible: boolean
}

/** מה נרשם בזיכרון בסוף הכוונה, כשיש מה לרשום */
export type MemoryBeat = {
  id: string
  titleHe: string
  importance: 'small' | 'personal' | 'historic'
  source: 'story' | 'relationship' | 'collection' | 'historic-event'
}

export type StoryIntent = {
  id: string
  chapter: string
  titleHe: string
  /** למה זה קורה — לא מוצג לשחקן, אלא מסביר לנו ולבדיקות */
  whyHe?: string
  kind: StoryIntentKind
  priority: StoryPriority
  /** מתי הכוונה הזאת בכלל רלוונטית */
  when?: Condition
  /** מה מוכיח שהיא נגמרה — סמנטית, לא לחיצה */
  completion: Condition
  primaryLead?: StoryLead
  guidance?: GuidancePolicy
  control?: ControlPolicy
  hook?: StoryHook
  memory?: MemoryBeat
}

// ------------------------------------------------------------ זיכרון מודרך ---

/**
 * נקודת דרך במסלול מחובר — ולמה המסלולים כתובים ולא מחושבים.
 *
 * המסמך אומר את זה ישר: אל תתלה הליכה סיפורית חשובה במערכת ניווט דינמית. הרחובות כאן
 * מצוירים ביד, והקצב הוא חלק מהסצנה. נקודת דרך יכולה לעצור, לומר שורה, להרחיב מצלמה או
 * להסתכל לכיוון — וזה מה שהופך הליכה לבימוי ולא להעברה.
 */
export type Waypoint = {
  at: LocationId
  /** מה קורה כשמגיעים לכאן */
  sayHe?: string
  /** מי אומר את זה */
  whoHe?: string
  /** עצירה קצרה, במילישניות */
  pauseMs?: number
  /** הרחבת מצלמה לרגע — ציון דרך */
  revealHe?: string
  /** קצב הליכה יחסי: 1 רגיל, פחות מזה איטי */
  pace?: number
}

export type GuidedRoute = { id: string; waypoints: Waypoint[] }

export type GuidedInterrupt = 'free' | 'ask-once' | 'locked'
export type GuidedSkip = 'always' | 'after-seen' | 'never'

export type GuidedMemory = {
  id: string
  chapter: string
  leaderId: string
  leaderHe: string
  routeId: string
  /** מתי הוא מתחיל */
  start: Condition
  /** מה הוא מלמד — אזורים שנפתחים בהגעה */
  teaches?: string[]
  interrupt: GuidedInterrupt
  skip: GuidedSkip
  /** איפה השליטה חוזרת, ובאיזה מצב */
  release: { at: LocationId; mode: ControlMode; sayHe?: string }
  memory?: MemoryBeat
}

// ------------------------------------------------------------ יומן הזיכרון ---

export type MemoryEntry = {
  id: string
  era: string
  dateHe?: string
  titleHe: string
  bodyHe?: string
  importance: MemoryBeat['importance']
  source: MemoryBeat['source']
  redBoxItemId?: string
  occurredAt: number
}

/** מה שהמשחק אומר לשחקן כשמשהו נרשם. לעולם לא "הישג". */
export const MEMORY_HEAD_HE = 'נרשם בזיכרון'
export const DAY_SAVED_HE = 'היום נשמר'

export type StoryState = {
  intent: StoryIntent | null
  control: ControlMode
  leadHe: string | null
  guidance: GuidanceLevel
  hook: StoryHook | null
  /** משפט אחד ל-HUD: "עכשיו" */
  nowHe: string | null
  /** מה עוד אפשר, בשקט, מתחת */
  alsoHe: string[]
}

export type StoryInput = {
  state: LifeState
  chapter: string
  /** דקות משחק שבהן שום דבר לא התקדם — מ-`WorldScene.quiet` */
  quietFor: number
  /** האם משהו רץ עכשיו: ביט, משחק, שיחה */
  busy: boolean
  /** נסיעה מודרכת פעילה, אם יש */
  guidedId?: string | null
}
