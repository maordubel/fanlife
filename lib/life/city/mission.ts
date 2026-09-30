import { DIALOGUE } from '../content/dialogue'
import type { Branch, Conversation } from '../content/script'
import { CITY_CAST } from '../generated/cityCast'

/**
 * משימה ברחוב — מה שהופך "יפה, אני הולך" ל"יש לי מה לעשות כאן".
 *
 * המבנה הוא ביטים, כמו בכל שאר המשחק: כל ביט הוא **אדם שעומד במקום מסוים** עם שיחה
 * מאחוריו, והוא נפתח רק כשהביט שלפניו נסגר. זה כל המנגנון, והוא מספיק — כי מה שהופך
 * הליכה למשימה הוא לא מכונת מצבים מסובכת אלא **שלושה דברים**: שיש למי לדבר, שמה שהוא
 * אומר תלוי במה שכבר קרה, ושיש בסוף מקום להגיע אליו.
 *
 * **מה כאן ומה לא.** השיחות עצמן אינן כאן — הן במאגר של המשחק, `DIALOGUE`, כמו כל שיחה
 * אחרת. גם השמות והגבהים אינם כאן: הגובה במטרים מגיע מ-`CITY_CAST`, שנכתב במדידה. מה
 * שכן כאן הוא רק **הסידור** — מי עומד איפה, מי פותח את מי, ומה נאמר על המסך כשמגיעים.
 * קובץ אחד לרעיון אחד.
 *
 * **למה לא ביטים של `beats.ts`.** אלה רצים בתוך `WorldScene` על מפת פייזר, עם חדרים
 * ודלתות. הרחוב הזה הוא תלת־ממד רציף בלי חדרים, ולכן "היכן אני" הוא מרחק במטרים ולא
 * מזהה חדר. אותם ביטים היו צריכים להמציא כאן חדרים כדי לעבוד. מה שכן משותף — השיחות,
 * ובהן כל המילים — משותף באמת.
 */

/** אדם שעומד ברחוב, וממתין */
export type MissionBeat = {
  id: string
  /** מפתח הדמות ב-`CITY_CAST` — ממנו מגיע גם הגובה במטרים */
  cast: string
  /** השם שמופיע על הכפתור */
  nameHe: string
  /** כמה מטרים לאורך הרחוב הוא עומד */
  at: number
  /** כמה מטרים הצידה ממרכז הכביש; שלילי = שמאלה */
  side: number
  /** לאיזה כיוון הוא פונה. `true` = התמונה מתהפכת */
  flip?: boolean
  /** מזהה השיחה ב-`DIALOGUE` */
  talk: string
  /** הביט שחייב להיסגר לפניו. בלעדיו הוא עומד שם, אבל אין לו מה לומר עדיין. */
  needs?: string
  /** מה נכתב על המסך כשהביט נפתח */
  openHe?: string
}

export type Mission = {
  id: string
  titleHe: string
  /** הרחוב שבו היא רצה, מ-`STREETS` */
  street: string
  /** מה שנאמר ברגע ההגעה, לפני שיש למי לדבר */
  openHe: string
  /** מה שנאמר כשהאחרון נסגר */
  doneHe: string
  beats: MissionBeat[]
}

/**
 * **שקית לסדרן** — ארבעים־וארבעה מטר, שלושה אנשים, וסיבה ללכת אותם.
 *
 * מוכר הגרעינים לא יכול לעזוב את העגלה. הסדרן בקצה עומד מששש בבוקר. ביניהם ארבעים מטר
 * של רחוב ריק, וילד בן שמונה שאין לו כרטיס — וזה בדיוק מה שהופך שליחות קטנה לדרך פנימה.
 *
 * ארבע התחנות אינן מספרים שנבחרו: הן המקומות שבהם החבילה של מאור באמת צילמה מישהו
 * שיכול לעמוד — ליד המעקות, באמצע הרחוב, על המעקה עם הרדיו, ובקצה מתחת ליציע.
 */
export const MISSIONS: Record<string, Mission> = {
  bagForTheSteward: {
    id: 'bagForTheSteward',
    titleHe: 'שקית לסדרן',
    street: 'bloomfieldWalk',
    openHe: 'עוד שעתיים לשריקה, והרחוב ריק. עמוד התאורה בקצה, והשערים סגורים.',
    doneHe: 'הסדרן מזיז את הידית. הקרוסלה עושה את הקול הזה, וזהו — אתה בפנים.',
    beats: [
      {
        id: 'vendor',
        cast: 'bfVendor',
        nameHe: 'מוכר הגרעינים',
        at: 12,
        side: 2.6,
        talk: 'bf-vendor-seeds',
        openHe: 'עגלת הגרעינים כבר פתוחה. הוא לבד.',
      },
      {
        id: 'ofir',
        cast: 'ofir86',
        nameHe: 'אופיר',
        at: 24,
        side: -2.2,
        flip: true,
        talk: 'bf-ofir-street',
        needs: 'vendor',
        openHe: 'אופיר עומד באמצע הרחוב, ומסתכל למעלה.',
      },
      {
        id: 'barry',
        cast: 'barryRadio',
        nameHe: 'בארי',
        at: 32,
        side: 2.2,
        talk: 'bf-barry-radio',
        needs: 'vendor',
        openHe: 'מישהו נשען על המעקה עם רדיו צמוד לאוזן.',
      },
      {
        id: 'steward',
        cast: 'bfSteward',
        nameHe: 'הסדרן',
        at: 41,
        side: 2.4,
        talk: 'bf-steward-bag',
        needs: 'barry',
        openHe: 'הסדרן בקצה, ליד העמוד. משם הוא לא זז.',
      },
    ],
  },
}

/** כמה קרוב צריך לעמוד כדי שיהיה אפשר לדבר. שני מטר וחצי — טווח של קול, לא של מגע. */
export const REACH = 2.5

export type MissionState = {
  /** אילו ביטים נסגרו */
  done: Set<string>
  /** אילו ביטים כבר הוצגו על המסך, כדי שההודעה לא תחזור */
  seen: Set<string>
}

export function newMissionState(): MissionState {
  return { done: new Set(), seen: new Set() }
}

/** ביט שאפשר לדבר איתו עכשיו: נפתח, ועוד לא נסגר */
export function isOpen(beat: MissionBeat, state: MissionState): boolean {
  if (state.done.has(beat.id)) return false
  return !beat.needs || state.done.has(beat.needs)
}

/** מי הכי קרוב מבין הפתוחים, ובטווח דיבור. `null` אם אין אף אחד. */
export function nearest(
  mission: Mission,
  state: MissionState,
  x: number,
  along: number,
): MissionBeat | null {
  let best: MissionBeat | null = null
  let bestGap = REACH
  for (const beat of mission.beats) {
    if (!isOpen(beat, state)) continue
    const gap = Math.hypot(x - beat.side, along - beat.at)
    if (gap < bestGap) {
      bestGap = gap
      best = beat
    }
  }
  return best
}

/** האם המשימה נגמרה — כל הביטים נסגרו */
export function complete(mission: Mission, state: MissionState): boolean {
  return mission.beats.every((beat) => state.done.has(beat.id))
}

/**
 * הענף שיושמע. השיחות במאגר נבנות עם `when` שנשען על דגלי המשחק המלא; כאן, ברחוב
 * לבדו, אין מצב משחק — ולכן הענף נבחר לפי **מה שכבר נעשה במשימה**, שזה בדיוק המידע
 * שיש. השיחות של המסך הזה נכתבו לכך: הענף הראשון הוא "אחרי", האחרון הוא "לפני".
 */
export function branchFor(talk: string, state: MissionState): Branch | null {
  const conversation: Conversation | undefined = DIALOGUE[talk]
  if (!conversation) return null
  for (const branch of conversation.branches) {
    const flag = (branch.when as { flag?: string } | undefined)?.flag
    if (!flag) return branch
    if (state.done.has(flag.replace(/^city:/, ''))) return branch
  }
  return conversation.branches[conversation.branches.length - 1] ?? null
}

export function nameFor(talk: string): string | null {
  return DIALOGUE[talk]?.nameHe ?? null
}

/** גובה הדמות במטרים, מהמדידה. תמונה בלי שורה כזאת לא מועמדת ברחוב. */
export function metresOf(cast: string): number | null {
  return CITY_CAST[cast]?.metres ?? null
}
