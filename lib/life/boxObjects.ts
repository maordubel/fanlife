import { ITEM_ART } from './content/chapter1986'
import { plateFor } from './plates'
import type { ItemId } from './types'

/**
 * מה נכנס לקופסה, ואיך הוא נראה — 21.9.2026.
 *
 * כל סוף של פרק כותב משפט על **חפץ**: *"תמונה, בלי גביע"*, *"כרטיס הגמר. בפינה, בעט, שם
 * של מישהו שלא בא"*, *"מפתח של ארגז, על שרוך"*, *"הודעה שלא נשלחה"*. והמשחק שמר את כולם
 * כ-`folded-paper` — 138 סופים, דף מקופל אחד. ה-`memoryItem` לא שוכתב בתוכן (הוא חלק
 * ממזהה שנשמר, ולכתוב אותו מחדש זה לשנות רשומה של מה שקרה); מה שנקבע כאן הוא **מה
 * מציירים** — מתוך המשפט שהשחקן קרא.
 *
 * זו טבלת מילים ולא ניחוש: כל שורה היא מילה שמופיעה במשפטי הסוף, וסדר השורות הוא סדר
 * העדיפות (*"כרטיס הגמר, ובתוכו, מקופל, הדף"* הוא כרטיס). `tests/life-box.test.ts` מדפיס
 * את הסיווג של כל סוף במשחק, ובודק בשמם את המקרים שנראו גבוליים.
 *
 * **"כלום" הוא סוג.** *"כלום. הכורסה של אבא, וריח של רדיו כבוי"*, *"שקט, מהסוג שבוחרים
 * בו"*, *"שיחה ארוכה שרובה שתיקה"* — הסופים האלה אומרים במפורש שאין חפץ, ולצייר להם דף
 * מקופל היה לשקר. בקופסה הם מקום ריק עם המשפט.
 */

export type BoxKind =
  | 'photo'
  | 'ticket'
  | 'card'
  | 'shirt'
  | 'scrap'
  | 'flag'
  | 'clipping'
  | 'newspaper'
  | 'page'
  | 'message'
  | 'key'
  | 'scarf'
  | 'recording'
  | 'radio'
  | 'coins'
  | 'nothing'
  | 'item'

/**
 * **המילה הראשונה במשפט קובעת** — כי המשפט פותח בחפץ: *"דף עם שני טורים של מספרים ...
 * הרדיו לא ידע לספור"* הוא דף, ו*"כרטיס הגמר, ובתוכו, מקופל, הדף"* הוא כרטיס. `nothing`
 * נבדק ראשון ורק בפתיחת המשפט: *"כלום."*, *"שקט, מהסוג שבוחרים בו"*, *"שיחה ארוכה"*.
 */
export const NOTHING_OPENING =
  /^(כלום|שקט|אין חפץ|שיחה|הליכה|שעה שלמה|מקום (ביציע|באולם|ליד)|כיסא|שני כיסאות|סיפור ארוך|שאלה אחת|שני ספלים|שתי כוסות|צלחת|רגל שולחן|השלט|שלט,|ריבוע בהיר|גביע פלסטיק|הקופסה,|המשמרת הראשונה|הרעש מבחוץ|לעמוד ליד|הסדרן|המעיל|הכדור על|דבר אחד|בורג|מזוודה|שולחן ב|תפקיד אחד|דרכון)/

/**
 * **חמישה סופים שהמילים לא מספיקות להם, בשמם.** כל אחד מהם הוא חפץ שיש לו ציור, אבל
 * המשפט שלו לא אומר את המילה: *"קרע של נייר אדום מהיציע"*, *"חולצה עם תפר קרוע"*,
 * *"חתיכה מהבד"*, ושני כרטיסי ביקור שאינם כרטיסים למשחק.
 */
export const KIND_OF_ENDING: Readonly<Record<string, BoxKind>> = {
  '1993-cup-inside': 'scrap',
  '1998-laces-avenger': 'shirt',
  '2000-double-gate5-builder': 'flag',
  '2025-interview-declined': 'card',
  '2025-owner-partner': 'card',
}

export const KIND_WORDS: ReadonlyArray<readonly [BoxKind, RegExp]> = [
  ['photo', /תמונה|צילום|מצלמה|מצולם/],
  ['shirt', /חולצה/],
  ['ticket', /כרטיס|ספח/],
  ['key', /מפתח/],
  ['scarf', /צעיף/],
  ['radio', /טרנזיסטור|רדיו/],
  ['recording', /הקלטה|קלטת|קובץ שמע/],
  ['message', /הודעה|מספר טלפון|שלושה מספרים|הטלפון,|הערה בטלפון/],
  ['clipping', /כתבה|גזיר|קטע עיתון|העמוד|פוסטר|כותרת|הפרסום|התיקון/],
  ['newspaper', /עיתון/],
  ['coins', /פחית|מטבע/],
  ['page', /דף|רשימה|פתק|טופס|קבלה|לוח|יומן|מפית|טיוטה|שורה|תיק מסירה/],
]

/**
 * איזה חפץ, מתוך המשפט — ואם המשפט לא אומר, מתוך `memoryItem`. `endingId` הוא רמז אחד
 * ויחיד: סוף שנקרא `photo` הוא תמונה גם כשהמשפט שלו (*"הכניסה, מטושטשת, ובכל זאת
 * שמורה"*) מתאר רק מה רואים בה.
 */
export function memoryKind(text: string | null, item: ItemId, endingId: string | null = null, memoryId: string | null = null): BoxKind {
  if (memoryId && KIND_OF_ENDING[memoryId]) return KIND_OF_ENDING[memoryId]
  if (endingId === 'photo') return 'photo'
  if (text) {
    const line = text.trim().replace(/^["״]/, '')
    if (NOTHING_OPENING.test(line)) return 'nothing'
    let best: { kind: BoxKind; at: number } | null = null
    for (const [kind, words] of KIND_WORDS) {
      const match = words.exec(line)
      if (match && (best === null || match.index < best.at)) best = { kind, at: match.index }
    }
    if (best) return best.kind
  }
  switch (item) {
    case 'ticket-stub':
    case 'hall-ticket':
      return 'ticket'
    case 'clipping':
    case 'promotion-table':
      return 'clipping'
    case 'newspaper':
      return 'newspaper'
    case 'scarf':
      return 'scarf'
    case 'transistor':
      return 'radio'
    case 'coin':
    case 'pocket-money':
      return 'coins'
    case 'folded-paper':
    case 'school-note':
    case 'score-paper':
      return 'page'
    default:
      return 'item'
  }
}

/**
 * הציור של כל סוג. `null` הוא סוג שמצויר ב-CSS (`BoxObject`): תמונה היא הלוח של אותו
 * יום בתוך מסגרת, כרטיס הוא ספח שלא נושא אף פרט שלא נכתב, הודעה היא בועה, מפתח הוא
 * מפתח, וכלום הוא מקום ריק.
 *
 * **הכרטיס של 1986 הוא היחיד שהוא הכרטיס עצמו** (`docTicket`, סריקה של כרטיס אמיתי —
 * משחק 15, שבעה שקלים, מספר 053). עד היום כל 29 הסופים עם `ticket-stub` הראו אותו — כלומר
 * כרטיס של 2010 נראה כמו כרטיס ילדים של 1986 עם הפרטים שלו מודפסים. הוא נשמר לסוף אחד:
 * זה שבו הוא באמת נכנס לקופסה.
 */
export const KIND_ART: Readonly<Record<BoxKind, string | null>> = {
  photo: null,
  ticket: null,
  card: null,
  shirt: 'shirtDiadoraRed',
  scrap: 'propWrapper',
  flag: 'propFlag',
  clipping: 'propClipping90',
  newspaper: 'propNewspaper',
  page: 'propNoteOpen',
  message: null,
  key: null,
  scarf: 'propScarfKnit',
  recording: 'propCassette',
  radio: 'propRadio',
  coins: 'coinPali',
  nothing: null,
  item: null,
}

/** מזהה הזיכרון של הכרטיס האמיתי — `1986-home` */
export const REAL_TICKET_MEMORY = '1986-home'

/**
 * פרקים שהערב שלהם היה באולם — הכרטיס שנשאר מהם הוא כרטיס לאולם (`propTicket91`, הכרטיס
 * של 1991 כפי שצויר), לא ספח של מגרש.
 */
export const HALL_CHAPTERS: ReadonlySet<string> = new Set(['1991', '1993-cup', '1993-galil', '1997-basket', '1999-basket', 'a3-hall'])

/** כרטיס לאולם — אלא אם המשפט אומר שזה כרטיס נסיעה, או כרטיס לבלומפילד מאותו ערב */
export function isHallTicket(item: ItemId, chapter: string | null, text: string | null): boolean {
  if (item === 'hall-ticket' || /אולם/.test(text ?? '')) return true
  if (/נסיעה|בלומפילד|אוטובוס|טיסה/.test(text ?? '')) return false
  return Boolean(chapter && HALL_CHAPTERS.has(chapter))
}

export function kindArt(kind: BoxKind, item: ItemId, memoryId: string, chapter: string | null = null, text: string | null = null): string | null {
  if (memoryId === REAL_TICKET_MEMORY) return 'docTicket'
  if (kind === 'item') return ITEM_ART[item] ?? null
  if (kind === 'ticket' && isHallTicket(item, chapter, text)) return 'propTicket91'
  // החולצה של שנות השמונים היא החולצה שנקנתה ב-a4 (`tveria85`); משנות התשעים — דיאדורה
  if (kind === 'shirt') return chapter && (/^a\d/.test(chapter) || chapter === '1986') ? 'shirtTveria85' : 'shirtDiadoraRed'
  return KIND_ART[kind]
}

/** הלוח שתמונה מאותו יום מראה — הלוח של הפרק */
export function photoPlate(chapter: string | null): string {
  return plateFor(chapter ?? '1986')
}
