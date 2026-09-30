import type { LifeState } from '../types'

import type { Beat } from './beats'
import type { EndingCard } from './chapter1986'
import type { ChoiceDef, Conversation, Effect } from './script'
import { PORTRAIT_WINDOWS } from './chapterWindows'

/**
 * חלון ABROAD — X01–X05, ו-Q05. **שתיים קורות בתל אביב, שלוש בדירה שם** (21.9.2026).
 *
 * **איך הוא נפתח:** `life:distance` — מי שלקח ב-2017 הפסקה (`P06.3`, `2017-distance`) ולא
 * חזר ממנה ב-`K03`. *"אני צריך עשור אחר"* הוא המשפט של K01; X01 היא השאלה מה נכנס
 * למזוודה כשהעשור האחר הוא מקום אחר. זו ההכרעה שהוצעה למאור כ-A: לפי מה שהחיים כבר בחרו.
 * *"לבחור מעבר בתוכנית מוסכמת, לא לקבל מדינה כבונוס"* — ולכן X01 היא שיחה עם קובי ורחל,
 * ואחת משלוש התשובות היא להישאר.
 *
 * **ולמה שלוש מהן חיכו.** X02 (*"דירה בחו״ל"*), X03 (*"מקום העבודה / מפגש חברים בחו״ל"*)
 * ו-X05 (*"הדירה בחו״ל, לקראת 2026"*) קורות **שם**, ועד 21.9.2026 לא היה למשחק חדר אחד
 * שאינו תל אביב: להעמיד אותן באלנבי היה לשקר על איפה הוא גר. `flatAway` הגיע, והן בחדר
 * `flat-abroad` — שני פרקים:
 *
 *   · **`2023-abroad`** (X02, X03, ו-Q05 למי שהוא גם עיתונאי וגם בינלאומי) — ערב הדרבי של
 *     סדרת הגמר, 11.6.2023, בדירה שם. קובי מתקשר (*"אצלכם כבר התחיל?"*), אלכס בא, ולמי שזה
 *     שייך — רומא עם חבר. לפני השיחה עם קובי **רואים אם יש הבטחה** (התסריט: *"לפני הבחירה
 *     רואים אם יש הבטחה קיימת"*): הודעה ממנו על השולחן, והתשובה שלך היא ההבטחה או לא.
 *   · **`2025-abroad`** (X05) — *"הפעם אני מחכה לך"*: ההזמנה להיפגש באירופה, שהיא מה
 *     ש-`F01` פותח כ-`reunion` — רק למי שבאמת גר במקום השני (`life:abroad`).
 *
 * ובתל אביב, כמו קודם: הבית של קובי ורחל בערב שלפני (X01), והקיוסק ביומיים של ביקור (X04).
 */

export const PORTRAIT_ABROAD: Record<string, string> = {
  ...PORTRAIT_WINDOWS,
}

export const ABROAD = 'life:abroad'

// =================================================================== X01 · 2021 ====

export function objectiveSuitcase(state: LifeState, sceneId: string): string | null {
  if (state.chapterDone) return null
  if (!state.flags['x:suitcase']) return sceneId === 'home' ? null : 'אצל אבא ואמא. מה נכנס למזוודה.'
  if (state.flags['x:move'] && !state.flags['x:sea']) return sceneId === 'promenade' ? null : 'ערב אחרון. הים — דרך הקשת באלנבי.'
  return null
}

/** מה מהעיר נכנס למזוודה — `2023-visit` שואל עליו (`x-sunset`) */
export const ABROAD_CARRY = 'life:abroad:carry'

export const ENDINGS_SUITCASE: Record<string, EndingCard> = {
  move: {
    id: 'move',
    titleHe: 'נשאר עם כתובת',
    bodyHe:
      'לקחת מזכרת שכבר הייתה לך וסגרת תוכנית מעבר. רחל שאלה מה עם מה שלא לקחת, ואמרת שזה נשאר עם כתובת ולא נזרק — וקובי ראה מה נכנס לפינה האחרונה של המזוודה, ולא שאל עוד.',
    memoryHe: 'הפינה האחרונה של המזוודה.',
    memoryItem: 'scarf',
  },
  prepare: {
    id: 'prepare',
    titleHe: 'גם כשאסע לא נפרדים ככה',
    bodyHe:
      'ביקשת עוד תקופת הכנה, כדי לחסוך ולא לנסוע בחוב. קובי אמר שאז עוד לא נפרדים, ואמרת שגם כשתיסע לא תיפרדו ככה.',
    memoryHe: 'דף חיסכון, עם תאריך בעיפרון.',
    memoryItem: 'folded-paper',
  },
  stay: {
    id: 'stay',
    titleHe: 'כרגע',
    bodyHe:
      'החלטת להישאר. רחל שאלה אם זו ההחלטה שלך, ואמרת שכן — כרגע. והיא אמרה שזה מספיק, ובאמת היה.',
    memoryHe: 'מזוודה ריקה, בחזרה על הארון.',
    memoryItem: 'folded-paper',
  },
}

/**
 * **הערב האחרון על הים (27.9.2026).** מי שסוגר תוכנית מעבר (X01.1) לא נפרד בסלון: הוא יוצא
 * לערב אחרון בטיילת, בשקיעה, וקרן שם — מי שהלכה איתו שם ב-2017 (`life:distance:sea`) אומרת
 * את זה. הבחירה היא מה מהעיר נכנס למזוודה (`life:abroad:carry`), ו-`2023-visit` שואל עליו
 * כשהוא חוזר ליומיים. מי שלא יוצא לא נתקע: בחצות המזוודה נסגרת בלי כלום מהים (`x-sea-late`).
 */
export const BEATS_SUITCASE: Beat[] = [
  { id: 'x-suitcase', at: 'home', trigger: 'enter', when: { none: [{ flag: 'x:suitcase' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'x-suitcase' }] },
  { id: 'x-sea', at: 'promenade', trigger: 'enter', when: { all: [{ flag: 'x:move' }], none: [{ flag: 'x:sea' }] }, delayMs: 900, do: [{ a: 'talk', conversation: 'x-sea' }] },
  {
    id: 'x-sea-late',
    trigger: 'clock',
    when: { all: [{ flag: 'x:move' }, { afterMinute: 23 * 60 + 45 }], none: [{ flag: 'x:sea' }] },
    delayMs: 600,
    waitingHe: 'ערב אחרון. הים עוד שם.',
    do: [
      { a: 'flag', flag: 'x:sea' },
      { a: 'events', events: [{ t: 'flag.set', flag: ABROAD_CARRY, value: 'none' }] },
      { a: 'toast', text: 'המזוודה נסגרה בחצות. מהים לא נכנס כלום — הוא נשאר פה, עם כתובת.' },
      { a: 'ending', id: 'move' },
    ],
  },
]

// =================================================================== X04 · 2023 ====

export function objectiveVisit(state: LifeState, sceneId: string): string | null {
  if (state.chapterDone) return null
  if (!state.flags['x:visit']) return sceneId === 'kiosk' ? null : 'יומיים בארץ. בקיוסק כבר מחכים.'
  if (state.flags['x:evening']) return null
  const visit = state.flags['life:abroad:visit']
  if (visit === 'family') return sceneId === 'promenade' ? null : 'בערב, אבא מחכה על הטיילת.'
  if (visit === 'friends') return sceneId === 'jaffa-alley' ? null : 'בערב, יפו — בית הקפה בסמטה.'
  return null
}

export const ENDINGS_VISIT: Record<string, EndingCard> = {
  family: {
    id: 'family',
    titleHe: 'בלי להבטיח משחק לפני הטיסה',
    bodyHe:
      'בחרת ערב משפחה והודעת לחברים מראש. אופיר הציע קפה מחר אם מתאים, ואמרת כן — בלי להבטיח משחק לפני הטיסה. יומיים הם יומיים, והפעם הם הספיקו.',
    memoryHe: 'כרטיס טיסה, עם קפה על השוליים.',
    memoryItem: 'ticket-stub',
  },
  friends: {
    id: 'friends',
    titleHe: 'מחר אני אצלכם',
    bodyHe:
      'בחרת ערב חברים ותיאמת עם המשפחה. רחל שאלה על ארוחת בוקר מחר, ואמרת שמחר אתה אצלם — והיא אמרה שתיהנה הערב, והתכוונה.',
    memoryHe: 'שולחן בקיוסק, ארבעה כיסאות.',
    memoryItem: 'folded-paper',
  },
  overbooked: {
    id: 'overbooked',
    titleHe: 'זאת בדיוק הבעיה',
    bodyHe:
      'הבטחת שני ערבים חופפים. קרן אמרה שרשמת את אותה שעה פעמיים, ואמרת שתספיק — והיא אמרה שזאת בדיוק הבעיה. היא צדקה, ואחד מהם חיכה.',
    memoryHe: 'יומן עם אותה שעה, פעמיים.',
    memoryItem: 'folded-paper',
  },
}

/**
 * **הערב עצמו (27.9.2026).** X04 היה בחירה ואז כרטיס סיום: *"בחרת ערב משפחה"* — בלי שהערב
 * קרה. עכשיו הוא קורה, בעיר: ערב משפחה הוא קובי על הטיילת בשקיעה (והוא שואל על מה שנכנס
 * למזוודה ב-2021), וערב חברים הוא יפו — אופיר ועמית בבית הקפה בסמטה. שני הערבים מתחילים
 * בערב (השעון קופץ לשם בכניסה, `eveningAt`), ושני ערבים חופפים נשארים מה שהיו: כרטיס אחד.
 * מי שלא הולך לא נתקע — בעשר וחצי הערב נגמר בלעדיו, אותו סוף (`x-evening-late`).
 */
const eveningAt = (minute: number) => (state: LifeState) =>
  state.minute < minute ? [{ t: 'clock.advanced' as const, minutes: minute - state.minute }] : []

export const BEATS_VISIT: Beat[] = [
  { id: 'x-visit', at: 'kiosk', trigger: 'enter', when: { none: [{ flag: 'x:visit' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'x-visit' }] },
  {
    id: 'x-sunset',
    at: 'promenade',
    trigger: 'enter',
    when: { all: [{ flagIs: { flag: 'life:abroad:visit', value: 'family' } }], none: [{ flag: 'x:evening' }] },
    delayMs: 900,
    do: [{ a: 'derive', events: eveningAt(18 * 60 + 50) }, { a: 'talk', conversation: 'x-sunset' }],
  },
  {
    id: 'x-jaffa',
    at: 'jaffa-alley',
    trigger: 'enter',
    when: { all: [{ flagIs: { flag: 'life:abroad:visit', value: 'friends' } }], none: [{ flag: 'x:evening' }] },
    delayMs: 900,
    do: [{ a: 'derive', events: eveningAt(20 * 60) }, { a: 'talk', conversation: 'x-jaffa' }],
  },
  {
    id: 'x-evening-late-family',
    trigger: 'clock',
    when: { all: [{ flagIs: { flag: 'life:abroad:visit', value: 'family' } }, { afterMinute: 22 * 60 + 30 }], none: [{ flag: 'x:evening' }] },
    delayMs: 600,
    waitingHe: 'אבא על הטיילת.',
    do: [{ a: 'flag', flag: 'x:evening' }, { a: 'toast', text: 'קובי חיכה על הטיילת עד שהחשיך, ואז הלך הביתה ברגל. מחר ארוחת בוקר.' }, { a: 'ending', id: 'family' }],
  },
  {
    id: 'x-evening-late-friends',
    trigger: 'clock',
    when: { all: [{ flagIs: { flag: 'life:abroad:visit', value: 'friends' } }, { afterMinute: 22 * 60 + 30 }], none: [{ flag: 'x:evening' }] },
    delayMs: 600,
    waitingHe: 'אופיר ועמית ביפו.',
    do: [{ a: 'flag', flag: 'x:evening' }, { a: 'toast', text: 'אופיר שלח תמונה של שני כיסאות ריקים בסמטה. "שמרנו לך."' }, { a: 'ending', id: 'friends' }],
  },
]

// ========================================================== X02–X03, Q05 · 2023 ====

/** קובי ביקש, והתשובה שלך היא ההבטחה — הדגל ש-X02.1 ו-X02.3 קוראים (`promise.kobi_call_pending`) */
export const KOBI_CALL = 'promise:kobiCall'
const FOUNDING_JOURNALIST = { flag: 'own:route:JOURNALIST:entry' } as const
const INTERNATIONAL = { flag: 'life:international' } as const

export function objectiveAbroad(state: LifeState, sceneId: string): string | null {
  if (state.chapterDone) return null
  if (sceneId !== 'flat-abroad') return 'הדירה שם. הערב הזה בבית.'
  if (!state.flags['x:phone']) return 'הטלפון על השולחן. הודעה מאבא.'
  if (!state.flags['x:call']) return 'אצלם כבר התחיל.'
  if (!state.flags['x:alex']) return 'מישהו דופק בדלת.'
  return null
}

export const ENDINGS_ABROAD: Record<string, EndingCard> = {
  host: {
    id: 'host',
    titleHe: 'הפעם אני יודע להגיד מה',
    bodyHe:
      'אירחת ערב קטן, והזמנת רק את מי שיכולת לארח. אלכס שאל אם להביא משהו ואמרת כן — והפעם ידעת להגיד מה. זו הייתה התמונה הראשונה בדירה הזאת שמישהו אחר צילם.',
    memoryHe: 'תמונה ראשונה בדירה שם, ארבעה ספלים על השולחן.',
    memoryItem: 'folded-paper',
  },
  work: {
    id: 'work',
    titleHe: 'ניהלתי את החלק הזה',
    bodyHe:
      'השלמת פרויקט בעבודה והצגת אותו לצוות. אלכס ביקש שתגיד מה עשית בלי "רק עזרתי", ואמרת שניהלת את החלק הזה — וזה היה נכון, ובשפה שעוד לא שלך.',
    memoryHe: 'תג עובד, עם שם שכתבו קצת לא נכון.',
    memoryItem: 'folded-paper',
  },
  mine: {
    id: 'mine',
    titleHe: 'גם זה נקרא לגור פה',
    bodyHe:
      'בחרת משהו שהוא רק שלך, בלי עבודה נוספת. אלכס אמר שגם זה נקרא לגור פה, ואמרת שאתה עוד מתרגל — והוא אמר שכולם, רק שאתה אומר את זה בקול.',
    memoryHe: 'מפתח שני, על אותו צרור.',
    memoryItem: 'house-key',
  },
}

export const BEATS_ABROAD: Beat[] = [
  /** קודם ההודעה — כך ש-X02 יודע אם יש הבטחה, והשחקן יודע שהוא יודע */
  { id: 'x-phone', at: 'flat-abroad', trigger: 'enter', when: { none: [{ flag: 'x:phone' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'x-phone' }] },
  { id: 'x-call', at: 'flat-abroad', trigger: 'clock', when: { all: [{ flag: 'x:phone' }], none: [{ flag: 'x:call' }] }, delayMs: 1600, do: [{ a: 'talk', conversation: 'x-call' }] },
  /** X03 — אלכס נכנס מהדלת (`world/rooms2000.ts` מעמיד אותו שם מרגע `x:call`) */
  { id: 'x-alex', at: 'flat-abroad', trigger: 'clock', when: { all: [{ flag: 'x:call' }], none: [{ flag: 'x:alex' }] }, delayMs: 1400, do: [{ a: 'talk', conversation: 'x-alex' }] },
  /** Q05 — רק לחיים שהם גם עיתונאי וגם בינלאומי: רומא מביא חבר, והחבר הוא לא כתבה */
  {
    id: 'q-soup',
    at: 'flat-abroad',
    trigger: 'clock',
    when: { all: [{ flag: 'x:alex' }, FOUNDING_JOURNALIST, INTERNATIONAL], none: [{ flag: 'q:soup' }] },
    delayMs: 1400,
    do: [{ a: 'talk', conversation: 'q-soup' }],
  },
  {
    id: 'x-close',
    trigger: 'clock',
    when: { all: [{ flag: 'x:alex' }], none: [{ flag: 'x:done' }], any: [{ flag: 'q:soup' }, { notFlag: 'own:route:JOURNALIST:entry' }, { notFlag: 'life:international' }] },
    delayMs: 1200,
    do: [{ a: 'flag', flag: 'x:done' }, { a: 'talk', conversation: 'x-close' }],
  },
]

// ================================================================== X05 · 2025 ====

export function objectiveReunion(state: LifeState, sceneId: string): string | null {
  if (state.chapterDone) return null
  // (pass D) a date before a promise; and after the promise, the thing from the suitcase
  if (state.flags['x:invited'] && !state.flags['x:packed']) return null
  if (state.flags['x:later'] && !state.flags['x:leave']) return 'המחשב על השולחן. לבקש חופש במאי.'
  if (state.flags['x:reunion']) return null
  return sceneId === 'flat-abroad' ? 'הפעם אתה מתקשר אליו.' : 'הדירה שם.'
}

export const ENDINGS_REUNION: Record<string, EndingCard> = {
  invite: {
    id: 'invite',
    titleHe: 'הפעם לא תצטרך לחפש ביציע',
    bodyHe:
      'הזמנת אותו להיפגש באירופה, משני מקומות. הוא שאל אם אתה מחכה לו, ואמרת שבנקודה שתסכמו — והפעם הוא לא יצטרך לחפש אותך ביציע, כמו שאתה חיפשת אותו פעם.',
    memoryHe: 'צילום מסך של שיחת וידאו, שני חלונות.',
    memoryItem: 'folded-paper',
  },
  repair: {
    id: 'repair',
    titleHe: 'בגלל זה התקשרתי עכשיו',
    bodyHe:
      'קודם השיחה שלא עשיתם, ורק אחר כך הכרטיס. הוא אמר שכרטיס לא פותר אותה, ואמרת שאתה יודע — ובגלל זה התקשרת עכשיו ולא אחרי שקנית.',
    memoryHe: 'פתק עם שעה, ובלי מחיר.',
    memoryItem: 'folded-paper',
  },
}

/**
 * (pass D, §61) **הפעם אני מחכה לך — ומה זה עולה.** השיחה עם קובי נפתחת כמו שנכתבה, אבל
 * ההזמנה עצמה (`invite`) אפורה עד שיש תאריך: המחשב על השולחן, והבוס שם — שבוע בסוף הרבעון,
 * שלושה ימים, או חופש בלי תשלום. מי שאומר "אחזור אליך עם תאריכים" (`later`) הולך לבקש, וקובי
 * מתקשר שוב. אחרי ההזמנה, מה שנכנס לפינה של המזוודה ב-2021 יוצא מהארון (`x-pack`): לארוז
 * עכשיו, או להשאיר על הספה עד מאי — ורק אז הכרטיס.
 */
export const LEAVE = 'life:finale:leave'
const UNPAID_AGOROT = 60_000
export const BEATS_REUNION: Beat[] = [
  { id: 'x-reunion', at: 'flat-abroad', trigger: 'enter', when: { none: [{ flag: 'x:reunion' }, { flag: 'x:later' }] }, delayMs: 900, do: [{ a: 'talk', conversation: 'x-reunion' }] },
  { id: 'x-reunion-again', at: 'flat-abroad', trigger: 'clock', when: { all: [{ flag: 'x:later' }, { flag: 'x:leave' }], none: [{ flag: 'x:reunion' }] }, delayMs: 1600, do: [{ a: 'talk', conversation: 'x-reunion' }] },
  { id: 'x-pack', at: 'flat-abroad', trigger: 'clock', when: { all: [{ flag: 'x:invited' }], none: [{ flag: 'x:packed' }] }, delayMs: 1400, do: [{ a: 'talk', conversation: 'x-pack' }] },
]

// ==================================================================== the words ====

/** (pass D) packing for May — now, or set aside on the sofa until then; the ticket closes the evening either way */
const PACK_CHOICES = (item: string): ChoiceDef[] => [
  {
    id: 'pack',
    text: '(לארוז אותו עכשיו. חודשים לפני.)',
    then: [
      { e: 'flag', flag: 'x:packed' },
      { e: 'flagValue', flag: 'life:finale:packed', value: item },
      { e: 'toast', text: 'המזוודה עומדת פתוחה בפינה, עם דבר אחד בתוכה. אלכס שואל אם אתה עובר דירה. "רק ליומיים."', tone: 'plain' },
      { e: 'ending', id: 'invite' },
    ],
  },
  {
    id: 'aside',
    text: '(להשאיר אותו בחוץ, שיראו אותו כל ערב, עד מאי.)',
    then: [
      { e: 'flag', flag: 'x:packed' },
      { e: 'flagValue', flag: 'life:finale:packed', value: `${item}:aside` },
      { e: 'toast', text: 'הוא נשאר איפה שרואים אותו. כל ערב, עד מאי, מישהו בבית הזה שואל "עוד כמה?".', tone: 'plain' },
      { e: 'ending', id: 'invite' },
    ],
  },
]

export const CONVERSATIONS_ABROAD: Conversation[] = [
  {
    id: 'x-suitcase',
    nameHe: 'קובי',
    branches: [
      {
        lines: [
          { who: 'קובי', text: 'את הצעיף אתה לוקח?' },
          { who: 'פוגי', text: 'אבא, אוגוסט.' },
          { who: 'קובי', text: 'לא שאלתי על מזג האוויר.' },
          { who: 'רחל', text: 'שאלת כבר אם הוא לקח מטען?' },
          { who: 'קובי', text: 'בשביל זה את פה.' },
        ],
        choices: [
          {
            id: 'move',
            text: '(לקחת מזכרת שכבר יש — ולסגור תוכנית מעבר.)',
            then: [
              { e: 'flag', flag: 'x:suitcase' },
              { e: 'flag', flag: 'x:move' },
              { e: 'flag', flag: ABROAD },
              { e: 'flagValue', flag: 'life:abroad:plan', value: 'planning' },
              { e: 'wellbeing', key: 'stress', delta: 10 },
              { e: 'proof', kind: 'residence_plan', proofId: 'residence_plan:{chapter}:move', subjectHe: 'המעבר', noteHe: 'תוכנית מוסכמת עם עיר, מועד ותקציב — לא מדינה כבונוס.' },
              { e: 'toast', text: 'רחל: "ומה שלא לקחת?" — "נשאר עם כתובת. לא נזרק." — ואתה יוצא לים, לערב אחרון.', tone: 'plain' },
              // (pass D, §50 S2) the red box flies in the hand bag; the suitcase has one corner left
              { e: 'goto', node: 'x-corner' },
            ],
          },
          {
            id: 'prepare',
            text: '(לבקש עוד תקופת הכנה — ולחסוך.)',
            then: [
              { e: 'flag', flag: 'x:suitcase' },
              { e: 'flagValue', flag: 'life:abroad:plan', value: 'preparation' },
              { e: 'proof', kind: 'prepared_instead_of_debt', proofId: 'prepared_instead_of_debt:{chapter}:move', subjectHe: 'המעבר שנדחה', noteHe: 'חסך קודם, במקום לנסוע בחוב.' },
              { e: 'toast', text: 'קובי: "אז עוד לא נפרדים." — "גם כשאסע לא נפרדים ככה."', tone: 'plain' },
              { e: 'ending', id: 'prepare' },
            ],
          },
          {
            id: 'stay',
            text: '(להחליט, כרגע, להישאר.)',
            then: [
              { e: 'flag', flag: 'x:suitcase' },
              { e: 'flagValue', flag: 'life:abroad:plan', value: 'not_now' },
              { e: 'toast', text: 'רחל: "זו ההחלטה שלך?" — "כן. כרגע." — "אז זה מספיק."', tone: 'plain' },
              { e: 'ending', id: 'stay' },
            ],
          },
        ],
      },
    ],
  },
  {
    /**
     * (pass D, §50 S1–S2) **הפינה האחרונה במזוודה.** הקופסה האדומה טסה בתיק היד (`redbox-abroad`);
     * במזוודה נשארה פינה אחת, ושלושה דברים מתחרים עליה — הצעיף שקובי שאל עליו, החולצה הראשונה
     * (רק למי שיש), או כלום, והכול נשאר אצל אבא עם כתובת. מה שנכנס יוצא שוב ב-2025 (`x-pack`).
     */
    id: 'x-corner',
    nameHe: 'רחל',
    branches: [
      {
        lines: [
          { who: null, text: 'המזוודה על המיטה, פתוחה. הקופסה האדומה כבר בתיק היד — מזוודה אפשר לאבד. נשארה פינה אחת.' },
          { who: 'רחל', text: 'אחד. לא שלושה. אני מכירה אותך.' },
        ],
        choices: [
          {
            id: 'scarf',
            text: '(הצעיף. כן, באוגוסט.)',
            then: [
              { e: 'flagValue', flag: 'life:abroad:corner', value: 'scarf' },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 2 },
              { e: 'toast', text: 'קובי, מהסלון: "אמרתי לך." — "לא אמרת כלום, שאלת." — "זה אותו דבר אצלנו."', tone: 'plain' },
            ],
          },
          {
            id: 'shirt',
            text: '(החולצה הראשונה. מקופלת פעמיים, הסמל למעלה.)',
            when: { any: [{ flag: 'life:first-shirt:gift' }, { flag: 'own:shirt85' }] },
            hidden: true,
            then: [
              { e: 'flagValue', flag: 'life:abroad:corner', value: 'shirt' },
              { e: 'toast', text: 'רחל: "היא כבר לא עולה עליך." — "היא לא בשביל ללבוש."', tone: 'plain' },
            ],
          },
          {
            id: 'none',
            text: '(כלום. הכול נשאר פה, עם כתובת — ויש סיבה לחזור.)',
            then: [
              { e: 'flagValue', flag: 'life:abroad:corner', value: 'none' },
              { e: 'rel', who: 'rachel', axis: 'bond', delta: 2 },
              { e: 'toast', text: 'רחל: "אז אני שומרת." — "את תמיד שומרת." — "מישהו צריך."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'x-visit',
    nameHe: 'עמית',
    branches: [
      {
        lines: [
          { who: 'עמית', text: 'שלחת ״מי באזור״ לשבע קבוצות.' },
          { who: 'פוגי', text: 'אני פה רק יומיים.' },
          { who: 'אופיר', text: 'אז למה חילקת הבטחות לשבוע?' },
          { who: 'פוגי', text: 'אני מנסה להספיק.' },
          { who: 'קרן', text: 'תנסה להיות איפה שאתה נמצא.' },
        ],
        choices: [
          {
            id: 'family',
            text: '(לבחור ערב משפחה — ולהודיע לחברים מראש.)',
            then: [
              { e: 'flag', flag: 'x:visit' },
              { e: 'flagValue', flag: 'life:abroad:visit', value: 'family' },
              { e: 'time', minutes: 90 },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 3 },
              { e: 'toast', text: 'אופיר: "אז ניפגש לקפה מחר, אם מתאים." — "כן. בלי להבטיח משחק לפני הטיסה." הערב — אבא, על הטיילת.', tone: 'plain' },
            ],
          },
          {
            id: 'friends',
            text: '(לבחור ערב חברים — ולתאם עם המשפחה.)',
            then: [
              { e: 'flag', flag: 'x:visit' },
              { e: 'flagValue', flag: 'life:abroad:visit', value: 'friends' },
              { e: 'time', minutes: 90 },
              { e: 'rel', who: 'ofir', axis: 'bond', delta: 3 },
              { e: 'toast', text: 'רחל: "מחר ארוחת בוקר?" — "מחר אני אצלכם." — "אז תהנה הערב." הערב — יפו, הסמטה.', tone: 'plain' },
            ],
          },
          {
            id: 'both',
            text: '(להבטיח שני ערבים חופפים.)',
            then: [
              { e: 'flag', flag: 'x:visit' },
              { e: 'flagValue', flag: 'life:abroad:visit', value: 'overbooked' },
              { e: 'wellbeing', key: 'stress', delta: 10 },
              { e: 'rel', who: 'keren', axis: 'trust', delta: -2 },
              { e: 'toast', text: 'קרן: "רשמת את אותה שעה פעמיים." — "אני אספיק." — "זאת בדיוק הבעיה."', tone: 'red' },
              { e: 'ending', id: 'overbooked' },
            ],
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------- X01 · הערב האחרון ----
  {
    /**
     * קרן על הטיילת, בשקיעה. מי שהלך איתה שם ב-2017 (`life:distance:sea`) שומע את זה ממנה;
     * השאלה היא מה מהעיר נכנס למזוודה — ו-`2023-visit` (`x-sunset`) ישאל עליו.
     */
    id: 'x-sea',
    nameHe: 'קרן',
    branches: [
      {
        when: { flag: 'life:distance:sea' },
        lines: [
          { who: 'קרן', text: 'אותה טיילת כמו אז. רק שהפעם אתה זה שנוסע.' },
          { who: 'פוגי', text: 'אז אמרתי לך "לא הייתי". עכשיו אני אומר "אני לא אהיה".' },
          { who: 'קרן', text: 'אז תיקח משהו מפה. לא בשביל להתגעגע — בשביל לדעת מאיפה.' },
        ],
        choices: seaChoices(),
      },
      {
        lines: [
          { who: 'קרן', text: 'באתי להגיד שלום. בלי נאומים.' },
          { who: 'פוגי', text: 'תודה על הבלי נאומים.' },
          { who: 'קרן', text: 'אז תיקח משהו מפה. לא בשביל להתגעגע — בשביל לדעת מאיפה.' },
        ],
        choices: seaChoices(),
      },
    ],
  },

  // ------------------------------------------------------- X04 · הערב עצמו ----
  {
    /** ערב המשפחה — קובי על הטיילת, בשקיעה, שואל על מה שנכנס למזוודה ב-2021 */
    id: 'x-sunset',
    nameHe: 'קובי',
    branches: [
      {
        when: { flagIs: { flag: ABROAD_CARRY, value: 'photo' } },
        lines: [
          { who: 'קובי', text: 'אמא אמרה ערב משפחה. אז הבאתי את המשפחה לים.' },
          { who: 'קובי', text: 'התמונה של השלט — עוד יש לך אותה?' },
          { who: 'פוגי', text: 'כרקע בטלפון. כל בוקר, "תמיד על הים", במקום שאין בו ים.' },
        ],
        choices: sunsetChoices(),
      },
      {
        when: { flagIs: { flag: ABROAD_CARRY, value: 'sand' } },
        lines: [
          { who: 'קובי', text: 'אמא אמרה ערב משפחה. אז הבאתי את המשפחה לים.' },
          { who: 'קובי', text: 'והצנצנת עם החול?' },
          { who: 'פוגי', text: 'על אדן החלון. שם אין חול, אז היא נראית כמו משהו.' },
        ],
        choices: sunsetChoices(),
      },
      {
        lines: [
          { who: 'קובי', text: 'אמא אמרה ערב משפחה. אז הבאתי את המשפחה לים.' },
          { who: 'קובי', text: 'לא לקחת כלום מפה, כשנסעת.' },
          { who: 'פוגי', text: 'לקחתי. רק לא בכיס.' },
        ],
        choices: sunsetChoices(),
      },
    ],
  },
  {
    /** ערב החברים — יפו, בית הקפה בסמטה, אופיר ועמית */
    id: 'x-jaffa',
    nameHe: 'אופיר',
    branches: [
      {
        lines: [
          { who: 'אופיר', text: 'בחרת יפו. אז אתה משלם.' },
          { who: 'עמית', text: 'הוא גר בחו״ל. הוא משלם בכל מקרה.' },
          { who: 'אופיר', text: 'יש לנו ערב אחד. אז מה, אתה מספר או שואל?' },
        ],
        choices: [
          {
            id: 'ask',
            text: '(לשאול מה קרה אצלם — ולא לספר על שם.)',
            then: [
              { e: 'flag', flag: 'x:evening' },
              { e: 'time', minutes: 90 },
              { e: 'rel', who: 'ofir', axis: 'bond', delta: 2 },
              { e: 'remember', who: 'ofir', eventId: 'x04-jaffa-listened', significance: 'notable' },
              { e: 'toast', text: 'אופיר מדבר שעה על היציע ועל העבודה, ועמית מתקן כל מספר שהוא אומר. אתה לא מספר כלום, וזה הערב הכי טוב שהיה לך השנה.', tone: 'plain' },
              { e: 'ending', id: 'friends' },
            ],
          },
          {
            id: 'tell',
            text: '(לספר על שם — הדירה, העבודה, אלכס.)',
            then: [
              { e: 'flag', flag: 'x:evening' },
              { e: 'time', minutes: 90 },
              { e: 'rel', who: 'amit', axis: 'bond', delta: 2 },
              { e: 'remember', who: 'amit', eventId: 'x04-jaffa-told', significance: 'notable' },
              { e: 'toast', text: 'עמית שואל על כל פרט, אופיר שואל רק אם יש שם קבוצה. "יש." — "אז אתה בסדר."', tone: 'plain' },
              { e: 'ending', id: 'friends' },
            ],
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ X02 · 2023 ----
  {
    id: 'x-phone',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'הטלפון על השולחן הנמוך. הודעה מאבא: "השבת יש דרבי. מדברים בשמונה, שלך?"' },
          { who: null, text: 'שמונה אצלו היא שעה אחרת אצלך. גם זה עוד לא נכנס לך לגוף.' },
        ],
        choices: [
          {
            id: 'yes',
            text: '(לכתוב לו: "כן. בשמונה שלך.")',
            then: [
              { e: 'flag', flag: 'x:phone' },
              { e: 'flag', flag: KOBI_CALL },
              { e: 'toast', text: 'אבא: "סגור." — ואחרי דקה, בהודעה נפרדת: "טוב."', tone: 'plain' },
            ],
          },
          {
            id: 'maybe',
            text: '(לכתוב: "נראה איך יהיה פה בערב.")',
            then: [
              { e: 'flag', flag: 'x:phone' },
              { e: 'toast', text: 'אבא: "בסדר. תגיד."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'x-call',
    nameHe: 'קובי',
    // שיחת וידאו מתל אביב — הוא לא בחדר, והתיבה אומרת את זה (`Conversation.remote`)
    remote: { 'קובי': 'video' },
    branches: [
      {
        lines: [
          { who: 'קובי', text: 'אצלכם כבר התחיל?' },
          { who: 'פוגי', text: 'פה עוד עובדים.' },
          { who: 'קובי', text: 'התכוונתי למשחק.' },
          { who: 'פוגי', text: 'אני יודע. אני מנסה להסביר למה אני בחולצה הזאת.' },
          { who: 'קובי', text: 'לפחות היא מגוהצת.' },
        ],
        choices: [
          {
            // X02.1
            id: 'keep',
            text: '(לקיים את השיחה שהבטחתי.)',
            when: { flag: KOBI_CALL },
            hidden: true,
            then: [
              { e: 'flag', flag: 'x:call' },
              { e: 'flagValue', flag: 'life:abroad:call', value: 'kept' },
              { e: 'time', minutes: 30 },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 2 },
              { e: 'rel', who: 'kobi', axis: 'trust', delta: 5 },
              { e: 'proof', kind: 'promise_kept', proofId: 'promise_kept:{chapter}:kobi', subjectHe: 'השיחה עם אבא', noteHe: 'הבטיח שמונה, ובשמונה ענה.' },
              { e: 'toast', text: 'קובי: "לא צריך לראות את כל המשחק." — "הבטחתי לדבר איתך. לזה אני פה."', tone: 'plain' },
            ],
          },
          {
            // X02.2
            id: 'move',
            text: '(לבקש להזיז את השיחה — בהסכמה.)',
            then: [
              { e: 'flag', flag: 'x:call' },
              { e: 'flagValue', flag: 'life:abroad:call', value: 'renegotiated' },
              { e: 'toast', text: 'קובי: "מחר אני פנוי." — "אז מחר. היום אני נפגש עם אנשים פה."', tone: 'plain' },
            ],
          },
          {
            // X02.3
            id: 'go',
            text: '(לא להודיע, וללכת.)',
            when: { flag: KOBI_CALL },
            hidden: true,
            then: [
              { e: 'flag', flag: 'x:call' },
              { e: 'flagValue', flag: 'life:abroad:call', value: 'broken' },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: -4 },
              { e: 'rel', who: 'kobi', axis: 'trust', delta: -8 },
              { e: 'toast', text: 'קובי, אחר כך: "חיכיתי. הייתי יכול לקבוע משהו אחר." — "הייתי צריך להודיע."', tone: 'red' },
            ],
          },
          {
            // X02.4 — *"אם לא הבטחתי שיחה, לבחור במפגש המקומי"*
            id: 'local',
            text: '(לא הבטחתי שיחה. לבחור במפגש שפה.)',
            when: { notFlag: KOBI_CALL },
            hidden: true,
            then: [
              { e: 'flag', flag: 'x:call' },
              { e: 'flagValue', flag: 'life:abroad:call', value: 'local_life' },
              { e: 'toast', text: 'קובי: "תיהנה. תספר מי פגשת." — "מחר, עם קפה."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ X03 · 2023 ----
  {
    id: 'x-alex',
    nameHe: 'אלכס',
    branches: [
      {
        lines: [
          { who: 'אלכס', text: 'אתה תמיד אומר ״אצלנו״.' },
          { who: 'פוגי', text: 'הרגל.' },
          { who: 'אלכס', text: 'גם פה יש לך מפתח.' },
          { who: 'פוגי', text: 'נכון.' },
          { who: 'אלכס', text: 'אז בשישי אצלך?' },
        ],
        choices: [
          {
            // X03.1
            id: 'host',
            text: '(לארח ערב קטן — ולהזמין רק את מי שאוכל לארח.)',
            when: { minAgorot: 6000 },
            noteHe: 'גם ערב קטן עולה משהו, ואין בארנק.',
            then: [
              { e: 'flag', flag: 'x:alex' },
              { e: 'flagValue', flag: 'life:abroad:belonging', value: 'hosted' },
              { e: 'money', agorot: -6000, why: 'ערב קטן בדירה שם' },
              { e: 'time', minutes: 60 },
              { e: 'energy', delta: -5 },
              { e: 'rel', who: 'alex', axis: 'bond', delta: 3 },
              { e: 'proof', kind: 'local_delivery', proofId: 'local_delivery:{chapter}:host', subjectHe: 'הערב הראשון בדירה', noteHe: 'אירח רק כמה שיכול לארח.' },
              { e: 'toast', text: 'אלכס: "להביא משהו?" — "כן. הפעם אני יודע להגיד מה."', tone: 'plain' },
            ],
          },
          {
            // X03.2
            id: 'work',
            text: '(להשלים פרויקט בעבודה — ולהציג אותו לצוות.)',
            then: [
              { e: 'flag', flag: 'x:alex' },
              { e: 'flagValue', flag: 'life:abroad:belonging', value: 'work' },
              { e: 'time', minutes: 60 },
              { e: 'energy', delta: -10 },
              { e: 'skill', skill: 'business', delta: 3, why: 'פרויקט שהוצג, לא "רק עזרתי"' },
              { e: 'proof', kind: 'local_delivery', proofId: 'local_delivery:{chapter}:work', subjectHe: 'הפרויקט שהוצג לצוות', noteHe: 'אמר מה עשה, בלי "רק עזרתי".' },
              { e: 'toast', text: 'אלכס: "עכשיו תגיד מה עשית. בלי ״רק עזרתי״." — "ניהלתי את החלק הזה."', tone: 'plain' },
            ],
          },
          {
            // X03.3
            id: 'mine',
            text: '(לבחור משהו שהוא רק שלי — בלי עבודה נוספת.)',
            then: [
              { e: 'flag', flag: 'x:alex' },
              { e: 'flagValue', flag: 'life:abroad:belonging', value: 'chosen_activity' },
              { e: 'time', minutes: 45 },
              { e: 'energy', delta: -5 },
              { e: 'proof', kind: 'personal_project', proofId: 'personal_project:{chapter}:abroad', subjectHe: 'משהו שהוא רק שלו, שם', noteHe: 'לא עבודה ולא אירוח — רק לגור.' },
              { e: 'toast', text: 'אלכס: "גם זה נקרא לגור פה." — "אני עוד מתרגל."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ Q05 · 2023 ----
  {
    id: 'q-soup',
    nameHe: 'רומא',
    branches: [
      {
        lines: [
          { who: 'רומא', text: 'הוא בא כחבר שלי, לא ככתבה שלך.' },
          { who: 'פוגי', text: 'ואם אשאל?' },
          { who: 'רומא', text: 'אז הוא יכול להגיד לא.' },
          { who: 'פוגי', text: 'ואתה?' },
          { who: 'רומא', text: 'אני יכול להגיד לך שהמרק נשרף.' },
        ],
        choices: [
          {
            // Q05.1
            id: 'host',
            text: '(לארח — בלי להפוך את השיחה לכתבה.)',
            then: [
              { e: 'flag', flag: 'q:soup' },
              { e: 'time', minutes: 60 },
              { e: 'energy', delta: -5 },
              { e: 'rel', who: 'roma', axis: 'bond', delta: 2 },
              { e: 'rel', who: 'roma', axis: 'trust', delta: 3 },
              { e: 'proof', kind: 'private_hospitality', proofId: 'private_hospitality:{chapter}:roma', subjectHe: 'האורח של רומא', noteHe: 'אירח, ולא שאל שאלה אחת לכתבה.' },
              { e: 'toast', text: 'רומא: "טוב. עכשיו אפשר לדבר בלי כותרת." — "את המרק בכל זאת הייתי מתקן."', tone: 'plain' },
            ],
          },
          {
            // Q05.2 — *"schedule.later_window_available"*: מחר פנוי תמיד, כי הערב הוא הערב
            id: 'later',
            text: '(לקבוע שיחה נפרדת, בהסכמה — ולבדוק מקור נוסף.)',
            then: [
              { e: 'flag', flag: 'q:soup' },
              { e: 'flagValue', flag: 'life:journalism:separateInterview', value: 'requested' },
              { e: 'toast', text: 'רומא: "מחר. היום הוא אורח." — "מחר אשאל אותו, לא אותך."', tone: 'plain' },
            ],
          },
          {
            // Q05.3 — *"delegation.named_person_consents"*: רומא עצמו מסכים, בשורה שלו
            id: 'hand',
            text: '(הערב שייך לבית — לקשר אותו למארח אחר, בהסכמה.)',
            then: [
              { e: 'flag', flag: 'q:soup' },
              { e: 'time', minutes: 15 },
              { e: 'proof', kind: 'consenting_handover', proofId: 'consenting_handover:{chapter}:roma', subjectHe: 'המארח האחר', noteHe: 'רומא סגר איתו בעצמו.' },
              { e: 'toast', text: 'רומא: "סגרתי איתו. לך הביתה." — "אני כבר בבית. זו בדיוק הבעיה."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'x-close',
    nameHe: null,
    branches: [
      { when: { flagIs: { flag: 'life:abroad:belonging', value: 'hosted' } }, lines: [{ who: null, text: 'ארבעה ספלים בכיור. בפעם הראשונה, מישהו אחר שטף.' }], then: [{ e: 'ending', id: 'host' }] },
      { when: { flagIs: { flag: 'life:abroad:belonging', value: 'work' } }, lines: [{ who: null, text: 'המצגת עוד פתוחה על המחשב. השם שלך בשקף הראשון, מאוית קצת לא נכון.' }], then: [{ e: 'ending', id: 'work' }] },
      { lines: [{ who: null, text: 'הערב נגמר בשקט. בעיר הזאת, זה כבר לא מרגיש כמו לבד.' }], then: [{ e: 'ending', id: 'mine' }] },
    ],
  },

  // ------------------------------------------------------------ X05 · 2025 ----
  {
    id: 'x-leave',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'המחשב על השולחן הנמוך. מייל אחד פתוח, לבוס: "שבוע במאי?" — והסמן מהבהב אחרי סימן השאלה.' },
          { who: null, text: 'מאי הוא סוף הרבעון. כולם יודעים. גם אתה.' },
        ],
        choices: [
          {
            id: 'week',
            text: '(לבקש שבוע. לשלם על זה בעבודה.)',
            then: [
              { e: 'flag', flag: 'x:leave' },
              { e: 'flagValue', flag: LEAVE, value: 'week' },
              { e: 'repLoss', audience: 'work', delta: -3, why: 'שבוע חופש בסוף הרבעון' },
              { e: 'toast', text: 'תשובה אחרי עשר דקות: "שבוע. ואתה סוגר את הדוח לפני." — עכשיו יש תאריך, ויש לילות.', tone: 'plain' },
            ],
          },
          {
            id: 'three',
            text: '(שלושה ימים: טיסה, משחק, טיסה.)',
            then: [
              { e: 'flag', flag: 'x:leave' },
              { e: 'flagValue', flag: LEAVE, value: 'three' },
              { e: 'toast', text: '"שלושה ימים אין בעיה." — שלושה ימים, ואבא בקצב שלו. זה יהיה צפוף.', tone: 'plain' },
            ],
          },
          {
            id: 'unpaid',
            text: '(חופש בלי תשלום. הכסף — ולא הרבעון.)',
            when: { minAgorot: UNPAID_AGOROT },
            noteHe: 'אין בחשבון מה ששבוע בלי משכורת עולה.',
            then: [
              { e: 'flag', flag: 'x:leave' },
              { e: 'flagValue', flag: LEAVE, value: 'unpaid' },
              { e: 'money', agorot: -UNPAID_AGOROT, why: 'שבוע בלי משכורת' },
              { e: 'toast', text: 'אישרו מיד. חופש בלי תשלום תמיד מאשרים מיד.', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    /** (pass D, §61 S3) what went into the suitcase's last corner in 2021 comes out for May */
    id: 'x-pack',
    nameHe: null,
    branches: [
      {
        when: { flagIs: { flag: 'life:abroad:corner', value: 'shirt' } },
        lines: [{ who: null, text: 'בארון, מתחת לסוודרים: החולצה הראשונה, מקופלת פעמיים כמו שרחל קיפלה אותה. ארבע שנים היא לא יצאה משם.' }],
        choices: PACK_CHOICES('shirt'),
      },
      {
        when: { flagIs: { flag: 'life:abroad:corner', value: 'scarf' } },
        lines: [{ who: null, text: 'הצעיף, על גב הספה, איפה שהוא תמיד. מאי — וכבר לא צריך להסביר לאבא למה באוגוסט.' }],
        choices: PACK_CHOICES('scarf'),
      },
      {
        lines: [{ who: null, text: 'במזוודה הריקה, בכיס הפנימי: פתק בכתב של רחל. "מה שלא לקחת — אצלנו. עם כתובת."' }],
        choices: PACK_CHOICES('note'),
      },
    ],
  },
  {
    id: 'x-reunion',
    nameHe: 'קובי',
    remote: { 'קובי': 'video' },
    branches: [
      {
        lines: [
          { who: 'פוגי', text: 'אבא, בוא ניפגש למשחק.' },
          { who: 'קובי', text: 'אתה מגיע לארץ?' },
          { who: 'פוגי', text: 'הפעם אתה ואני נפגשים באירופה.' },
          { who: 'קובי', text: 'לזכר הימים?' },
          { who: 'פוגי', text: 'וגם בשביל יום חדש אחד.' },
        ],
        choices: [
          {
            // X05.1
            id: 'invite',
            text: '(להזמין אותו — ולתכנן יחד.)',
            // (pass D) a promise with a date: the leave is asked for first
            when: { flag: 'x:leave' },
            noteHe: 'עוד אין תאריך. המחשב על השולחן — קודם לבקש חופש במאי.',
            then: [
              { e: 'flag', flag: 'x:reunion' },
              { e: 'flag', flag: 'x:invited' },
              { e: 'flag', flag: 'life:finale:reunionOffered' },
              { e: 'proof', kind: 'finale_invited', proofId: 'finale_invited:{chapter}:kobi', subjectHe: 'ההזמנה לאירופה', noteHe: 'הזמין, ואמר איפה יחכה.' },
              { e: 'toast', text: 'קובי: "אתה מחכה לי?" — "בנקודה שנסכם. הפעם לא תצטרך לחפש ביציע."', tone: 'plain' },
            ],
          },
          {
            id: 'later',
            text: '(להגיד לו שאחזור אליו עם תאריכים.)',
            when: { notFlag: 'x:leave' },
            hidden: true,
            then: [
              { e: 'flag', flag: 'x:later' },
              { e: 'toast', text: 'קובי: "תאריכים. אתה נשמע כמו עמית." — "אני נשמע כמו מי שלא רוצה להבטיח סתם."', tone: 'plain' },
            ],
          },
          {
            // X05.2
            id: 'repair',
            text: '(קודם שיחת תיקון — ורק אחר כך כרטיס.)',
            then: [
              { e: 'flag', flag: 'x:reunion' },
              { e: 'flag', flag: 'life:finale:reunionOffered' },
              { e: 'flag', flag: 'life:finale:repair' },
              { e: 'rel', who: 'kobi', axis: 'trust', delta: 3 },
              { e: 'toast', text: 'קובי: "כרטיס לא פותר את השיחה שלא עשינו." — "אני יודע. בגלל זה התקשרתי עכשיו."', tone: 'plain' },
              { e: 'ending', id: 'repair' },
            ],
          },
        ],
      },
    ],
  },
]

/**
 * X01 · מה מהעיר נכנס למזוודה — שלוש תשובות, וכל אחת נשמרת (`life:abroad:carry`) כדי שקובי
 * ישאל עליה בשקיעה של 2023. אף אחת לא "נכונה": צילום, חופן חול, או כלום — כולן סוגרות את
 * אותה תוכנית (`move`).
 */
function seaChoices(): ChoiceDef[] {
  const close = (value: string, toast: string): Effect[] => [
    { e: 'flag', flag: 'x:sea' },
    { e: 'flagValue', flag: ABROAD_CARRY, value },
    { e: 'time', minutes: 30 },
    { e: 'remember', who: 'keren', eventId: 'x01-last-evening', significance: 'notable' },
    { e: 'toast', text: toast, tone: 'plain' },
    { e: 'ending', id: 'move' },
  ]
  return [
    {
      id: 'photo',
      text: '(לצלם את השלט — "תמיד על הים" — ולשמור בטלפון.)',
      then: close('photo', 'קרן: "עמוד מולו. לא את השלט לבד." — היא מצלמת. השלט, ואתה לידו, ואור כתום.'),
    },
    {
      id: 'sand',
      text: '(למלא צנצנת קטנה בחול מהחוף.)',
      then: close('sand', 'קרן מחזיקה את הצנצנת בזמן שאתה ממלא. "זה לא יעבור בבידוק." — "אז אני אסביר."'),
    },
    {
      id: 'nothing',
      text: '(לא לקחת כלום. הים נשאר פה, עם כתובת.)',
      then: close('none', 'קרן: "זה גם תשובה." — "זאת התשובה שאני יכול לסחוב."'),
    },
  ]
}

/** X04 · ערב המשפחה — ללכת איתו עד יפו בקצב שלו, או לשבת ולשמוע אותו */
function sunsetChoices(): ChoiceDef[] {
  return [
    {
      id: 'walk',
      text: '(ללכת איתו לאורך הים, עד יפו — לאט, בקצב שלו.)',
      then: [
        { e: 'flag', flag: 'x:evening' },
        { e: 'time', minutes: 60 },
        { e: 'rel', who: 'kobi', axis: 'bond', delta: 3 },
        { e: 'remember', who: 'kobi', eventId: 'x04-sunset-walk', significance: 'major' },
        { e: 'toast', text: 'קובי עוצר כל כמה מטרים "לראות את הים", ושניכם יודעים שזה בשביל הברכיים. אתם מגיעים למגדל השעון בחושך.', tone: 'plain' },
        { e: 'ending', id: 'family' },
      ],
    },
    {
      id: 'sit',
      text: '(לשבת על הספסל — ולתת לו לספר על העונה.)',
      then: [
        { e: 'flag', flag: 'x:evening' },
        { e: 'time', minutes: 60 },
        { e: 'rel', who: 'kobi', axis: 'trust', delta: 3 },
        { e: 'remember', who: 'kobi', eventId: 'x04-sunset-bench', significance: 'notable' },
        { e: 'toast', text: 'הוא מספר על כל משחק כאילו לא ראית אותו, ואתה לא מתקן אותו אף פעם אחת.', tone: 'plain' },
        { e: 'ending', id: 'family' },
      ],
    },
  ]
}
