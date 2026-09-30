import type { LifeState } from '../types'

import type { Beat } from './beats'
import type { EndingCard } from './chapter1986'
import type { Conversation, Say } from './script'
import type { Condition } from '../world/types'
import { PORTRAIT_LATE } from './chapter2023late'

/**
 * F00–F04 · "היום אתה אחריי" · 2025–2026 — **סוף הציר הראשי**, בשני פרקים.
 *
 * **`2026-plan`** (F00–F01) — תקציב שנסגר לפני שמבטיחים, ותוכנית שמראים.
 * **`2026-finale`** (F02–F04) — הנסיעה, האולם, ועם מי חוזרים.
 *
 * **הערב עצמו הוא שורת ארכיון, והיא נקראה היום.** 7.5.2026, בוטבגרד: הפועל תל אביב
 * 81, ריאל מדריד 87, המשחק הרביעי ברבע הגמר של היורוליג. שני מקורות בלתי-תלויים
 * מסכימים על היום, על התוצאה ועל האולם, והשני מהם נוקב גם בסדרה (כלל 77). התסריט
 * מסמן את הרשומה `immutable`, ובצדק: **התוצאה אינה תנאי לסיום האישי, ואין סצנת
 * אליפות חלופית.**
 *
 * **הילד מופיע רק אם הוא קיים — ועכשיו יש דרך שהוא יהיה.**
 *
 * ארבע הבחירות שבהן הילד מצטרף (`F00.3`, `F01.2`, `F02.2`, `F04.2`) והסיום השלישי
 * `generations` הוסרו כאן פעם אחת, כי `life:deadends` מצא ששום דבר במשחק לא מרים
 * את `life:child`. ענף חיי הבית (`2013-household`) נבנה בדיוק בשביל זה, והדגל
 * מורם בו במקום אחד בלבד — מעבר הזמן אחרי שהכוונה נאמרה על ידי שניהם. אז הבחירות
 * חזרו.
 *
 * הן `hidden` ולא מושבתות-עם-הערה, וזה ההפך המדויק מהכלל הרגיל (כלל 42: דלת סגורה
 * שרואים אותה היא מידע): כאן הודעה מושבתת הייתה **מספרת לשחקן על ילד שאין לו**.
 *
 * **הדרך, חדר אחרי חדר (21.9.2026).** עד שהציורים הגיעו לא היה נמל באירופה, לא
 * דרך לבוטבגרד ולא אולם, והנסיעה הייתה כרטיס וזמן על הרציף. עכשיו יש: הרציף (Q10),
 * האוטובוס לשדה התעופה, נמל ההגעה (F02 — *"נמל הגעה באירופה והדרך לבוטבגרד"*), מחוץ
 * לאולם (F03), המושבים (F03, *"ובמושבים"*), ושוב בחוץ (F04). כל שיחה נפתחת בחדר שהתסריט
 * כותב לה, וקובי עומד בכל אחד מהם (`world/rooms2000.ts`). התוצאה של הערב היא שורת
 * הארכיון (`{anchor}`), ולא שורה שנכתבה כאן.
 */

/**
 * מי נוסע — **הדגל שעובר לפרק הבא** (21.9.2026). `f:party` הוא דגל יום, ו-`year.entered`
 * של `2026-finale` מוחק אותו, כך שהפרק של הנסיעה לא ידע מי נסע: "לתת לילד להוביל קטע
 * קצר" (F02.2) ו"שלושה דורות" (F04.2) נפתחו לכל מי **שיש לו** ילד, גם אם הילד נשאר
 * בבית ותוכננה נסיעה לשניים. התסריט כותב `flag.finale_party == three` — וזה מה שנבדק עכשיו.
 */
export const PARTY = 'life:finale:party'
const party = (value: string) => ({ flagIs: { flag: PARTY, value } }) as const
const abroad = { flag: 'life:abroad' } as const

export const PORTRAIT_FINALE: Record<string, string> = {
  ...PORTRAIT_LATE,
}

/** שלושת המחירים שהתסריט נוקב בהם — מחיר הוא עובדה על העולם, לא שכר (כלל 78) */
const SHARE_AGOROT = 120_000
const TWO_AGOROT = 360_000
const THREE_AGOROT = 480_000
/** (90-E) מה שהדרך האיטית עולה — מונית שמחכה וחדר ליד האולם; ומונית במקום אוטובוס עומד */
const REST_AGOROT = 45_000
const TAXI_AGOROT = 25_000
const EARLY_ROOM_AGOROT = 20_000

/**
 * ============================================= התוכנית — בונים, ואז מראים (90-E) ====
 *
 * `NARRATIVE-QUEST-DESIGN-PASS-v2` §7 Stage E: *"budget → party → tickets / rendezvous →
 * route that accounts for Kobi's pace → contingency → show Dad only after the plan exists →
 * trip (Pugi leads) → arena → return"*. עד היום הסוף היה שתי שיחות שמרימות `f:money`
 * ו-`f:plan`. עכשיו:
 *
 * 1. **תקציב** (`f-money`, בקיוסק) — כסף אמיתי מהארנק. זו ההתחייבות, והיא נשארה כמו שנכתבה.
 * 2. **הקצב** — אבא הולך הביתה לפניך. ברחוב אפשר לראות איך (`f-pace-seen`).
 * 3. **כרטיסים, מי נוסע, דרך** — בקופת הכרטיסים באלנבי: הקופה (`f-tickets`), הטלפון לילד
 *    (`f-child`, רק למי שיש), והקיר עם שלוש הדרכים (`f-route`) — מהירה, איטית ועולה כסף,
 *    ארוכה ויושבים. הבחירה נכתבת בחיים (`life:finale:route`).
 * 4. **תקלה אחת** (`f-snag`) — משהו בתוכנית זז: נקודת מפגש (מי שבא משם), ישיבה בבוקר
 *    (שותף), יציע העיתונאים (עיתונאי), האוטובוס של האוהדים (מוביל יציע) — או, לכל השאר,
 *    הדרך עצמה. מסתגלים (`life:finale:snag`).
 * 5. **להראות לאבא** (`f-plan`) — רק כשיש תוכנית (`f:sheet`), והוא מגיב **למה שכתוב בה**.
 * 6. **הנסיעה** (`ride:terminal-26`, `adultQuestsB.ts`) — פוגי מוביל: הלוח, התיק של אבא,
 *    הספסל, הדלת. כל עצירה קוראת את התוכנית, והספסל הוא המבחן שלה.
 * 7. **האולם** — שורת הארכיון, קבועה. **8. החזרה** (`f-back`) — קובי מגיב לאיך שזה נוהל.
 *
 * 1983: קובי החזיק את הכרטיסים, ידע את הדרך, נשא את הילד. 2026: הדף בכיס של פוגי, הדרך
 * בראש שלו, התיק של אבא ביד שלו — וההתאמה לקצב של קובי היא המכניקה, לא משפט.
 */
export const ROUTE = 'life:finale:route'
export const SNAG = 'life:finale:snag'
export const PACE = 'life:finale:pace'
export const CARRIED = 'life:finale:carried'
/** מה נקנה בקופה — עובר לפרק של הנסיעה, כי שם קובי שואל אם הכרטיסים אצלך (`f-road`) */
export const TICKETS = 'life:finale:tickets'
const route = (value: string) => ({ flagIs: { flag: ROUTE, value } }) as const
const snag = (value: string) => ({ flagIs: { flag: SNAG, value } }) as const

// ------------------------------------------------------------------- Part I ------

export function objectivePlan(state: LifeState, sceneId: string): string | null {
  if (state.chapterDone) return null
  if (!state.flags['f:money']) return sceneId === 'kiosk' ? null : 'בקיוסק. יש תוכנית, ועכשיו שואלים מי משלם.'
  const preparing = state.flags['f:funding'] === 'preparation'
  if (!preparing && !state.flags['f:sheet']) {
    const todo: string[] = []
    if (!state.flags['f:tickets']) todo.push('כרטיסים')
    if (state.flags['life:child'] && !state.flags['f:asked'] && !state.flags['f:tickets'] && state.flags['f:funding'] === 'self_three') todo.push('לשאול את הילד')
    if (!state.flags[ROUTE]) todo.push('דרך בקצב של אבא')
    if (todo.length) return `קופת הכרטיסים באלנבי: ${todo.join(', ')}. ורק אז להראות לאבא.`
    return 'רגע לפני שמראים — משהו בתוכנית עוד יכול לזוז.'
  }
  if (!state.flags['f:plan']) return sceneId === 'home' ? null : 'אבא ביקש לראות את התוכנית.'
  return null
}

export const ENDINGS_PLAN: Record<string, EndingCard> = {
  two: {
    id: 'two',
    titleHe: 'שנוכל ללכת בקצב שלנו',
    bodyHe:
      'נסיעה של שניים, בתקציב שסגרתם. הוא אמר שלא צריך הכי יקר ואמרת שצריך שנוכל ללכת בקצב שלנו, והוא אמר "את זה דווקא תכתוב" — וכתבת.',
    memoryHe: 'דף תוכנית, עם שורה על קצב.',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
  reunion: {
    id: 'reunion',
    titleHe: 'בנקודה שנקבע',
    bodyHe:
      'אתם באים משני מקומות ונפגשים שם. הוא שאל איפה אתה מחכה לו ואמרת בנקודה שנקבע, עם תמונה שלה — כי שם של רחוב הוא ישכח, וזה הוא שאמר.',
    memoryHe: 'תמונה של פינה, בלי אנשים.',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
  saving: {
    id: 'saving',
    titleHe: 'בוחרים להן ימים',
    bodyHe:
      'לא אישרת נסיעה לפני שהיה ממה. עמית פרס את זה לשש מסירות עבודה ואמר שבוחרים להן ימים ולא מגרילים כסף, ואמרת שבסוף בודקים שהכול באמת פנוי.',
    memoryHe: 'שש שורות, אחת מסומנת.',
    memoryItem: 'folded-paper',
    presence: 'late',
  },
}

export const BEATS_PLAN: Beat[] = [
  { id: 'f-money', at: 'kiosk', trigger: 'enter', when: { none: [{ flag: 'f:money' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'f-money' }] },
  /**
   * התקלה — אחרי שיש כרטיסים ודרך, משהו אחד זז. שומר על עצמו ב-`f:snag` (V3 כלל 3); מי
   * שסגר את הטלפון באמצע שומע אותו שוב בדקה הבאה.
   */
  {
    id: 'f-snag',
    trigger: 'clock',
    when: { all: [{ flag: 'f:tickets' }, { flag: ROUTE }], none: [{ flag: 'f:snag' }, { flagIs: { flag: 'f:tickets', value: 'none' } }] },
    delayMs: 1500,
    do: [{ a: 'talk', conversation: 'f-snag' }],
  },
  /** מראים לאבא **רק אחרי שיש תוכנית** — או, למי שעוד חוסך, כדי להגיד את זה בקול */
  {
    id: 'f-plan',
    at: 'home',
    trigger: 'enter',
    when: { all: [{ flag: 'f:money' }], any: [{ flag: 'f:sheet' }, { flagIs: { flag: 'f:funding', value: 'preparation' } }], none: [{ flag: 'f:plan' }] },
    delayMs: 700,
    do: [{ a: 'talk', conversation: 'f-plan' }],
  },
]

// ------------------------------------------------------------------ Part II ------

export function objectiveFinale(state: LifeState, sceneId: string): string | null {
  if (state.chapterDone) return null
  if (!state.flags['f:road']) return sceneId === 'port-europe' ? null : sceneId === 'bus-station' ? 'האוטובוס לשדה התעופה.' : 'הרציף. היום יוצאים.'
  if (!state.flags['f:seats']) return sceneId === 'arena-out' ? null : 'האוטובוס לבוטבגרד. מחוץ לאולם — היום אתה אחריי.'
  if (!state.flags['f:inside']) return sceneId === 'arena-seats' ? null : 'פנימה, למושבים.'
  if (!state.flags['f:back']) return sceneId === 'arena-out' ? null : 'ואחר כך — בחוץ. עם מי חוזרים.'
  return null
}

export const ENDINGS_FINALE: Record<string, EndingCard> = {
  together: {
    id: 'together',
    titleHe: 'היום רציתי להיות לידך מהצד הזה',
    bodyHe:
      'ארבעים שנה אחרי שהוא לקח אותך לראשון, לקחת אותו. הוא שאל "והיום?" ואמרת שהיום רצית להיות לידו מהצד הזה — והוא לא ענה, וזאת הייתה התשובה.',
    memoryHe: 'שני כרטיסים, באותו כיס.',
    memoryItem: 'ticket-stub',
    presence: 'inside',
  },
  generations: {
    id: 'generations',
    titleHe: 'אתה שומע איך הוא אומר ״בואו״',
    bodyHe:
      'שלושה דורות, והדרך חזרה נבחרה בידי הצעיר שבהם. קובי שאל אם אתה שומע איך הוא אומר "בואו", ואמרת כן — ולא היה צריך להוסיף.',
    memoryHe: 'שלוש כוסות, אחת קטנה.',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
  mine: {
    id: 'mine',
    titleHe: 'מחר אני חוזר לחיים שלי',
    bodyHe:
      'נהנית, ולא הבטחת להיות מי שהיית. הוא שאל אם נהנית ואמרת מאוד, ושמחר אתה חוזר לחיים שלך — והוא אמר טוב, תתקשר גם משם.',
    memoryHe: 'כרטיס טיסה, עם שעה מוקדמת.',
    memoryItem: 'ticket-stub',
    presence: 'inside',
  },
}

/**
 * (pass D) איך הערב נסגר — התשובה של F04 (`together` / `generations` / `mine`), שנשמרת עד
 * שההליכה נגמרת ורק אז הופכת לכרטיס. **המילה האחרונה של קובי ושל פוגי**, לא של הטבלה:
 * 1983 הפוך — הוא שואל לאן, ואתה אומר "אחריי".
 */
export const CLOSE = 'life:finale:close'
const LAST_WORDS: ReadonlyArray<readonly [string, Say[]]> = [
  ['together', [
    { who: null, text: 'הרחוב נגמר בצומת. אור אחד בבוטבגרד עוד דולק, והוא של מסעדה.' },
    { who: 'קובי', text: 'לאן עכשיו?' },
    { who: 'פוגי', text: 'אחריי, אבא.' },
    { who: null, text: 'הוא לוקח את המרפק שלך. לא את היד — את המרפק. כמו שאתה לקחת את שלו, פעם, בשער 7.' },
    { who: 'קובי', text: 'אחריך.' },
  ]],
  ['generations', [
    { who: null, text: 'הרחוב נגמר בצומת. הילד כבר שם, מחכה, ומסמן עם כל היד.' },
    { who: 'הילד', text: 'בואו!' },
    { who: 'קובי', text: 'שמעת איך הוא אומר את זה?' },
    { who: 'פוגי', text: 'שמעתי. ככה אמרת לי, כשהייתי על הכתפיים.' },
    { who: 'קובי', text: 'אז קדימה. היום כולנו אחריו.' },
  ]],
  ['mine', [
    { who: null, text: 'הרחוב נגמר בצומת. מחר בבוקר יש טיסה, לכל אחד מכם למקום אחר.' },
    { who: 'קובי', text: 'ומחר אתה שם.' },
    { who: 'פוגי', text: 'מחר שם. הערב — אחריי.' },
    { who: 'קובי', text: 'אחריך. ותתקשר גם משם.' },
  ]],
]

export const BEATS_FINALE: Beat[] = [
  /**
   * `Q10` — *"חלון לפני F02"*: איך קובי יציג אותו שם. רק למי שנוסע איתו (`PARTY` שאינו
   * `saving`) — ולכן F02 מחכה לה כשהיא עוד לא נאמרה, ולא מחכה לה כשאין לה מקום.
   */
  { id: 'f-name', at: 'bus-station', trigger: 'enter', when: { any: [party('two'), party('three'), party('reunion')], none: [{ flag: 'f:name' }] }, delayMs: 800, do: [{ a: 'talk', conversation: 'f-name' }] },
  /**
   * F02 — נמל ההגעה. הרציף נשאר של Q10; *"יש לי את הכרטיסים"* נאמר אחרי הטיסה, מול
   * דלתות הזכוכית שהאוטובוס לבוטבגרד עומד מאחוריהן. הכרטיס של הרגע אומר איפה ומתי.
   */
  {
    id: 'f-road',
    at: 'port-europe',
    trigger: 'enter',
    when: { none: [{ flag: 'f:road' }], any: [{ flag: 'f:name' }, party('saving'), { notFlag: PARTY }] },
    delayMs: 300,
    do: [{ a: 'card', titleHe: 'אירופה', subHe: 'נמל ההגעה · 7 במאי 2026', ms: 2600 }, { a: 'talk', conversation: 'f-road' }],
  },
  /** F03 — *"מחוץ לאולם"*: הוא נכנס רק אחרי שאמרת לאן הולכים */
  { id: 'f-seats', at: 'arena-out', trigger: 'enter', when: { all: [{ flag: 'f:road' }], none: [{ flag: 'f:seats' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'f-seats' }] },
  /**
   * *"ובמושבים"* — המשחק עצמו. שורה אחת, והיא שורת הארכיון (`{anchor}` — העוגן של
   * `2026-botevgrad`), לא תיאור שנכתב כאן: *"מציגים רק פתיחה, מקטע ותוצאה"*, ואין סצנת
   * אליפות חלופית. הקהל נשמע, קובי יושב לידך, ואז יוצאים.
   */
  {
    id: 'f-inside',
    at: 'arena-seats',
    trigger: 'enter',
    when: { all: [{ flag: 'f:seats' }], none: [{ flag: 'f:inside' }] },
    delayMs: 600,
    do: [
      { a: 'flag', flag: 'f:inside' },
      { a: 'crowd', state: 'BUILDING_TENSION' },
      { a: 'lines', lines: [{ who: null, text: '{anchor}.' }, { who: null, text: 'קובי לידך. הפעם אתה זה שידע איפה המושבים.' }] },
      { a: 'crowd', state: 'AFTERMATH' },
    ],
  },
  /**
   * (delta 92, upgrade plan §10) the smallest callback to 25.7.2007: one question from the
   * father beside him, and no exposition. Only for a life that stood at the fence.
   */
  {
    id: 'f-uss',
    at: 'arena-seats',
    trigger: 'clock',
    when: { all: [{ flag: 'f:inside' }, { flag: 'life:uss:there' }], none: [{ flag: 'f:uss' }, { flag: 'f:back' }] },
    delayMs: 1400,
    do: [{ a: 'flag', flag: 'f:uss' }, { a: 'lines', lines: [{ who: 'קובי', text: 'גם באוסישקין היה רועש ככה?' }, { who: 'פוגי', text: 'יותר. הגג היה נמוך.' }] }],
  },
  /** F04 — *"מחוץ לאולם, אחרי המשחק"* */
  { id: 'f-back', at: 'arena-out', trigger: 'enter', when: { all: [{ flag: 'f:seats' }, { flag: 'f:inside' }], none: [{ flag: 'f:back' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'f-back' }] },
  /**
   * (pass D) §63 S5 — the walk. `f-back` starts it; a life reloaded in the middle of it finds
   * him outside the hall again with the street still ahead, and the walk offered once more.
   */
  { id: 'f-walk-again', at: 'arena-out', trigger: 'clock', when: { all: [{ flag: 'f:back' }], none: [{ flag: 'f:walked' }] }, delayMs: 1600, do: [{ a: 'talk', conversation: 'f-walk-go' }] },
  ...LAST_WORDS.map(([close, lines]): Beat => ({
    id: `f-last-${close}`,
    at: 'arena-out',
    trigger: 'enter',
    when: { all: [{ flag: 'f:walked' }, { flagIs: { flag: CLOSE, value: close } }], none: [{ flag: 'f:last' }] },
    delayMs: 900,
    do: [{ a: 'flag', flag: 'f:last' }, { a: 'crowd', state: 'AFTERMATH' }, { a: 'lines', lines }, { a: 'ending', id: close }],
  })),
]

/** מה קובי אומר על הדף — הראשון שמתאים מנצח; האחרון הוא מי שעוד לא בנה תוכנית */
const PLAN_REACTIONS: ReadonlyArray<readonly [Condition | null, Say[]]> = [
  [{ all: [route('fast'), { any: [snag('hurry'), snag('fans_bus')] }] }, [
    { who: 'קובי', text: 'שש בבוקר ואוטובוס עומד? אני בן שבעים ושתיים, לא שבע.' },
    { who: 'פוגי', text: 'נחזיק מעמד.' },
    { who: 'קובי', text: 'אתה תחזיק. אני אשב על התיק.' },
  ]],
  [route('fast'), [
    { who: 'קובי', text: 'שש בבוקר. ומשם?' },
    { who: 'פוגי', text: 'משם זה כבר כתוב. לא רצים.' },
  ]],
  [route('rest'), [
    { who: 'קובי', text: 'חדר ליד האולם. אתה יודע שאני נרדם בשמונה.' },
    { who: 'פוגי', text: 'בגלל זה שעתיים לפני.' },
  ]],
  [route('train'), [
    { who: 'קובי', text: 'רכבת. כל הדרך יושבים?' },
    { who: 'פוגי', text: 'כל הדרך.' },
    { who: 'קובי', text: 'אז אני מביא ספר.' },
  ]],
  [null, []],
]

// ---------------------------------------------------- the plan words (90-E) ------

/** מה הילד זוכר מהשבת שלו ב-2021 (`chapter2021promises.ts`, `SATURDAY`) — הראשון שמתאים מנצח */
const CHILD_SATURDAY: ReadonlyArray<readonly [Condition | null, Say[]]> = [
  [{ flagIs: { flag: 'life:saturday', value: 'stayed' } }, [{ who: 'הילד', text: 'כמו בפנדלים ההם? שנשארת?' }, { who: 'פוגי', text: 'כמו בפנדלים ההם.' }]],
  [{ flagIs: { flag: 'life:saturday', value: 'missed' } }, [{ who: 'הילד', text: 'והפעם אתה בא בטוח?' }, { who: 'פוגי', text: 'הפעם זה כתוב, עם שעות.' }]],
  [{ any: [{ flagIs: { flag: 'life:saturday', value: 'there' } }, { flagIs: { flag: 'life:saturday', value: 'half' } }] }, [{ who: 'הילד', text: 'אתה זוכר שעמדת ליד הגדר?' }, { who: 'פוגי', text: 'אני זוכר שמצאת אותי.' }]],
  [null, []],
]

type Branch = Conversation['branches'][number]
type Choice = NonNullable<Branch['choices']>[number]
const sheet = (value: string, extra: Choice['then'] = []): Choice['then'] => [
  { e: 'flag', flag: 'f:snag' },
  { e: 'flagValue', flag: SNAG, value },
  { e: 'flag', flag: 'f:sheet' },
  ...extra,
]

/** שלוש הדרכים — אותן שלוש לכל מי שעומד מול הקיר; מי שראה את אבא ברחוב רואה גם את העמוד */
const ROUTE_CHOICES: Choice[] = [
  {
    id: 'fast',
    text: '(הטיסה של שש, והאוטובוס של האוהדים מהשדה. הכי מהר — ועומדים שעתיים.)',
    then: [{ e: 'flagValue', flag: ROUTE, value: 'fast' }, { e: 'toast', text: 'הכי מהר. על הדף זה נראה פשוט.', tone: 'plain' }],
  },
  {
    id: 'rest',
    text: '(טיסה ישירה בצהריים, מונית שמחכה, ושעתיים בחדר ליד האולם לפני.)',
    when: { minAgorot: REST_AGOROT },
    noteHe: 'למונית ולחדר אין בארנק. נשארות שתי הדרכים האחרות.',
    then: [
      { e: 'flagValue', flag: ROUTE, value: 'rest' },
      { e: 'money', agorot: -REST_AGOROT, why: 'מונית וחדר ליד האולם' },
      { e: 'toast', text: 'שעתיים לפני, בחדר עם כיסא. את זה הוא לא יבקש — אז כתבת.', tone: 'plain' },
    ],
  },
  {
    id: 'train',
    text: '(הרכבת מסופיה. זול, ארוך — ויושבים כל הדרך.)',
    then: [{ e: 'flagValue', flag: ROUTE, value: 'train' }, { e: 'toast', text: 'ארוך, ויושבים. הוא יתלונן על האורך, לא על הברכיים.', tone: 'plain' }],
  },
]

export const CONVERSATIONS_PLAN_QUEST: Conversation[] = [
  {
    id: 'f-pace-seen',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'אבא הולך הביתה לפניך. לא מהר. ליד העמוד השני הוא עוצר, מניח יד, וממשיך.' },
          { who: null, text: 'הוא לא הסתכל אחורה לראות אם ראית. אבל ראית.' },
        ],
        then: [{ e: 'flag', flag: 'f:saw:pace' }],
      },
    ],
  },
  {
    id: 'f-tickets',
    nameHe: null,
    branches: [
      {
        when: { flagIs: { flag: 'f:funding', value: 'preparation' } },
        lines: [{ who: null, text: 'הקצאת אוהדי חוץ, בוטבגרד, 7 במאי. ״שריון רק עם תשלום.״ היא כבר מסתכלת על הבא בתור.' }],
        then: [{ e: 'flag', flag: 'f:tickets' },{ e: 'flagValue', flag: 'f:tickets', value: 'none' }],
      },
      {
        lines: [
          { who: null, text: 'הקצאת אוהדי חוץ, בוטבגרד, 7 במאי. ״כמה?״' },
        ],
        choices: [
          {
            id: 'two',
            text: '(שני כרטיסים — לאבא ולי.)',
            then: [
              { e: 'flag', flag: 'f:tickets' },
              { e: 'flagValue', flag: 'f:tickets', value: 'two' },
              { e: 'flagValue', flag: TICKETS, value: 'two' },
              { e: 'memory', item: 'ticket-stub', id: 'f-2026-tickets' },
              { e: 'toast', text: 'שני כרטיסים, בשני שמות. בכיס שלך, לא בשלו.', tone: 'plain' },
            ],
          },
          {
            id: 'three',
            text: '(שלושה. הוא ביקש לבוא.)',
            when: { all: [{ flagIs: { flag: 'f:asked', value: 'yes' } }, { flagIs: { flag: 'f:funding', value: 'self_three' } }] },
            hidden: true,
            then: [
              { e: 'flag', flag: 'f:tickets' },
              { e: 'flagValue', flag: 'f:tickets', value: 'three' },
              { e: 'flagValue', flag: TICKETS, value: 'three' },
              { e: 'memory', item: 'ticket-stub', id: 'f-2026-tickets' },
              { e: 'toast', text: 'שלושה כרטיסים. אחד מהם על שם שעוד לא היה באולם בחוץ לארץ.', tone: 'plain' },
            ],
          },
          {
            id: 'reunion',
            text: '(שניים, על שני שמות — ונקודת מפגש שם.)',
            when: { all: [{ flag: 'life:abroad' }, { flag: 'life:finale:reunionOffered' }] },
            hidden: true,
            then: [
              { e: 'flag', flag: 'f:tickets' },
              { e: 'flagValue', flag: 'f:tickets', value: 'reunion' },
              { e: 'flagValue', flag: TICKETS, value: 'reunion' },
              { e: 'memory', item: 'ticket-stub', id: 'f-2026-tickets' },
              { e: 'toast', text: 'שני כרטיסים. אחד נשלח אליו, אחד נשאר אצלך — ומקום אחד שבו הם נפגשים.', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'f-child',
    nameHe: 'הילד',
    remote: { 'הילד': 'phone' },
    /** (90-E) הוא זוכר את השבת שלו מ-2021 (`life:saturday`) — שורה אחת, לפני התשובה */
    branches: CHILD_SATURDAY.flatMap(([when, memory]): Branch[] => [
      {
        when: { all: [{ flagIs: { flag: 'f:funding', value: 'self_three' } }, ...(when ? [when] : [])] },
        lines: [
          { who: 'פוגי', text: 'בוטבגרד. במאי. עם סבא.' },
          { who: 'הילד', text: 'סבא בא?' },
          { who: 'פוגי', text: 'זה כל העניין.' },
          ...memory,
          { who: 'הילד', text: 'אני רוצה לבוא. אפשר גם משהו שהוא לא משחק?' },
        ],
        then: [{ e: 'flagValue', flag: 'f:asked', value: 'yes' }],
      },
      {
        ...(when ? { when } : {}),
        lines: [
          { who: 'פוגי', text: 'בוטבגרד. במאי. עם סבא.' },
          ...memory,
          { who: 'הילד', text: 'סבא ואתה. אני בפעם הבאה — רק תביא לי צעיף.' },
        ],
        then: [{ e: 'flagValue', flag: 'f:asked', value: 'next' }],
      },
    ]),
  },
  {
    id: 'f-route',
    nameHe: null,
    branches: [
      {
        when: { flag: 'f:saw:pace' },
        lines: [
          { who: null, text: 'שלוש דרכים לבוטבגרד, על דף שמישהו תלה בנעץ.' },
          { who: null, text: 'והעמוד השני ברחוב. היד שהוא הניח עליו.' },
        ],
        choices: ROUTE_CHOICES,
      },
      {
        lines: [{ who: null, text: 'שלוש דרכים לבוטבגרד, על דף שמישהו תלה בנעץ.' }],
        choices: ROUTE_CHOICES,
      },
    ],
  },
  {
    /**
     * **תקלה אחת** — ומי שהחיים שלו מושכים לכיוון אחר שומע אותה בקול שלהם (§8, "צירופים
     * יוצרים קונפליקטים, לא תגים"): מי שגר שם — נקודת המפגש; שותף — ישיבה בבוקר; עיתונאי —
     * יציע העיתונאים; מוביל יציע — האוטובוס של האוהדים. לכל השאר — הדרך עצמה.
     */
    id: 'f-snag',
    nameHe: 'עמית',
    remote: { 'עמית': 'phone', 'קובי': 'phone' },
    branches: [
      {
        when: { flagIs: { flag: 'f:tickets', value: 'reunion' } },
        lines: [
          { who: 'קובי', text: 'הטיסה שלי נוחתת בטרמינל השני. לא בראשון.' },
          { who: 'פוגי', text: 'אז הנקודה זזה.' },
          { who: 'קובי', text: 'תגיד לי איפה. ואל תגיד לי שם של רחוב.' },
        ],
        choices: [
          { id: 'photo', text: '(לצלם את הנקודה החדשה — ולשלוח לו תמונה.)', then: sheet('photo', [{ e: 'rel', who: 'kobi', axis: 'trust', delta: 2 }, { e: 'toast', text: 'קובי: "תמונה. טוב. את זה אני לא אשכח."', tone: 'plain' }]) },
          { id: 'street', text: '(לכתוב לו את שם הרחוב, ואת מספר השער.)', then: sheet('street', [{ e: 'toast', text: 'קובי: "שם של רחוב אני אשכח." — "אז גם מספר." — "את המספר אני אשכח ראשון."', tone: 'plain' }]) },
        ],
      },
      {
        when: { route: { id: 'OWNER', minStage: 'practice' } },
        lines: [
          { who: 'עמית', text: 'יש ישיבה בשבע בבוקר. ביום של המשחק. בווידאו.' },
          { who: 'פוגי', text: 'בשבע אני בשדה.' },
          { who: 'עמית', text: 'אז תגיד לי מה אתה רוצה שיקרה בה בלעדיך.' },
        ],
        choices: [
          { id: 'delegate', text: '(לתת את הישיבה לעמית. הוא יודע את המספרים.)', then: sheet('delegated', [{ e: 'rel', who: 'amit', axis: 'trust', delta: 3 }, { e: 'toast', text: 'עמית: "אני אחליט, ואתה תשמע אחרי." — "זה מה שביקשתי."', tone: 'plain' }]) },
          { id: 'meeting', text: '(להיכנס לישיבה מהשדה, בטלפון. חצי שעה.)', then: sheet('meeting', [{ e: 'toast', text: 'עמית: "חצי שעה. אבא שלך יחכה?" — "הוא יחכה."', tone: 'plain' }]) },
        ],
      },
      {
        when: { route: { id: 'JOURNALIST' } },
        lines: [
          { who: 'עמית', text: 'העורך שלך חיפש אותך. הוא רוצה אותך ביציע העיתונאים.' },
          { who: 'פוגי', text: 'אני טס עם אבא.' },
          { who: 'עמית', text: 'אני רק מעביר.' },
        ],
        choices: [
          { id: 'dad', text: '(לא. הערב אני יושב ליד אבא.)', then: sheet('declined_press', [{ e: 'rel', who: 'kobi', axis: 'bond', delta: 2 }, { e: 'toast', text: 'לעורך: "את הערב הזה אני לא כותב." — "אז תכתוב את הבא."', tone: 'plain' }]) },
          { id: 'press', text: '(ביציע העיתונאים — ובהפסקה אצל אבא.)', then: sheet('press', [{ e: 'toast', text: 'עמית: "ואבא יודע?" — "עוד לא."', tone: 'plain' }]) },
        ],
      },
      {
        when: { route: { id: 'ULTRAS', minStage: 'practice' } },
        lines: [
          { who: 'עמית', text: 'האוטובוס של האוהדים מהשדה — שלך. חמישים איש, והם שואלים מתי.' },
          { who: 'פוגי', text: 'אני עם אבא.' },
          { who: 'עמית', text: 'אז מי מחזיק אותם?' },
        ],
        choices: [
          { id: 'ofir', text: '(לתת את האוטובוס לאופיר. הוא ידע מה לעשות.)', then: sheet('handed', [{ e: 'rel', who: 'ofir', axis: 'trust', delta: 3 }, { e: 'toast', text: 'אופיר: "חמישים איש? אני כבר מתחרט." — "אתה תהיה מצוין."', tone: 'plain' }]) },
          { id: 'both', text: '(לקחת את אבא איתם באוטובוס.)', then: sheet('fans_bus', [{ e: 'toast', text: 'עמית: "חמישים איש, שעתיים, ואבא שלך." — "הוא היה בשער 7. הוא יסתדר."', tone: 'plain' }]) },
        ],
      },
      {
        when: route('fast'),
        lines: [
          { who: 'עמית', text: 'האוטובוס של האוהדים יוצא ארבעים דקות אחרי הנחיתה. והשער שלכם בקצה של הטרמינל.' },
          { who: 'פוגי', text: 'ארבעים דקות זה הרבה.' },
          { who: 'עמית', text: 'לך כן.' },
        ],
        choices: [
          {
            id: 'taxi',
            text: '(להזמין מונית מראש. לא לרוץ.)',
            when: { minAgorot: TAXI_AGOROT },
            noteHe: 'אין בארנק למונית. נשאר האוטובוס — ולבקש, או להספיק.',
            then: sheet('taxi', [{ e: 'money', agorot: -TAXI_AGOROT, why: 'מונית מהשדה' }, { e: 'toast', text: 'מונית, עם שלט. בלי אוטובוס עומד.', tone: 'plain' }]),
          },
          { id: 'wait', text: '(לבקש מהם לחכות עשר דקות.)', then: sheet('asked_wait', [{ e: 'toast', text: 'עמית: "עשר דקות. לא אחת־עשרה." — "עשר."', tone: 'plain' }]) },
          { id: 'hurry', text: '(להספיק. נלך מהר.)', then: sheet('hurry', [{ e: 'toast', text: 'עמית: "אתה או הוא?" — "שנינו." — "נראה."', tone: 'red' }]) },
        ],
      },
      {
        when: route('rest'),
        lines: [
          { who: 'עמית', text: 'המלון דחה את החדר לארבע. לפני זה אין.' },
          { who: 'פוגי', text: 'והמשחק בשמונה.' },
        ],
        choices: [
          { id: 'cafe', text: '(בית קפה ליד האולם, עם כיסאות. שם מחכים.)', then: sheet('cafe', [{ e: 'toast', text: 'כיסא, קפה, ושעתיים. זה לא חדר — זה מספיק.', tone: 'plain' }]) },
          {
            id: 'early',
            text: '(לשלם על כניסה מוקדמת.)',
            when: { minAgorot: EARLY_ROOM_AGOROT },
            noteHe: 'אין בארנק לכניסה מוקדמת. בית הקפה עדיין שם.',
            then: sheet('early_room', [{ e: 'money', agorot: -EARLY_ROOM_AGOROT, why: 'כניסה מוקדמת לחדר' }, { e: 'toast', text: 'החדר מאחת. הוא יישן שעה, ויכחיש.', tone: 'plain' }]),
          },
        ],
      },
      {
        lines: [
          { who: 'עמית', text: 'הרכבת מסופיה: שתים־עשרה דקות להחלפה. ומדרגות.' },
          { who: 'פוגי', text: 'כמה מדרגות?' },
          { who: 'עמית', text: 'מספיק.' },
        ],
        choices: [
          { id: 'assist', text: '(לבקש עזרה בתחנה, מראש.)', then: sheet('assist', [{ e: 'toast', text: 'מישהו עם עגלה יחכה ברציף. הוא יכעס, ואז יתיישב.', tone: 'plain' }]) },
          { id: 'earlier', text: '(רכבת אחת קודם. מחכים שם, לא רצים.)', then: sheet('earlier', [{ e: 'toast', text: 'רכבת אחת קודם. שעה על ספסל ברציף — ובלי מדרגות בריצה.', tone: 'plain' }]) },
        ],
      },
    ],
  },
]

// ---------------------------------------------------- the trip words (90-E) ------

/** מי שהדרך שלו דוחקת בקובי: אוטובוס עומד שצריך להספיק, חמישים איש, או ישיבה בשדה */
const TIGHT: Condition = { any: [{ all: [route('fast'), { any: [snag('hurry'), snag('asked_wait')] }] }, snag('fans_bus'), snag('meeting')] }

export const CONVERSATIONS_TRIP_QUEST: Conversation[] = [
  {
    id: 'f-leg-board',
    nameHe: null,
    branches: [
      { when: snag('photo'), lines: [{ who: null, text: 'לוח ההגעות: הטיסה שלו נחתה, טרמינל שני.' }, { who: null, text: 'בטלפון, התמונה ששלחת — והוא שלח אותה בחזרה: ״אני פה.״ הוא עומד בדיוק בה.' }] },
      { when: snag('street'), lines: [{ who: null, text: 'לוח ההגעות: הטיסה שלו נחתה, טרמינל שני.' }, { who: null, text: 'בטלפון: ״איזה רחוב אמרת?״ — שלחת לו תמונה עכשיו. הוא מחכה באמצע, מסתובב.' }] },
      { when: snag('taxi'), lines: [{ who: null, text: 'לוח היציאות. האוטובוס של האוהדים — שער B, בקצה.' }, { who: null, text: 'והמונית שהזמנת — יציאה 3. חמש דקות מכאן, בלי לרוץ.' }] },
      { when: route('fast'), lines: [{ who: null, text: 'לוח היציאות. האוטובוס של האוהדים — שער B, בקצה. ארבעים דקות.' }, { who: null, text: 'על הדף זה היה קרוב. מכאן רואים כמה רחוק הקצה.' }] },
      { when: route('rest'), lines: [{ who: null, text: 'לוח היציאות, ומתחתיו נהג עם שלט. על השלט השם של אבא, בכתב של מישהו אחר.' }] },
      { when: route('train'), lines: [{ who: null, text: 'לוח היציאות: השאטל לרכבת — שתים־עשרה דקות. יש זמן.' }] },
      { lines: [{ who: null, text: 'לוח היציאות. בוטבגרד — אוטובוס, רציף ארבע.' }] },
    ],
  },
  {
    id: 'f-leg-bag',
    nameHe: 'קובי',
    branches: [
      {
        lines: [
          { who: null, text: 'שני תיקים על הרצפה. שלו כבד יותר, כמו תמיד.' },
          { who: 'קובי', text: 'אני יכול לסחוב.' },
        ],
        choices: [
          {
            id: 'take',
            text: '(לקחת את התיק שלו. בלי לשאול.)',
            then: [{ e: 'flagValue', flag: CARRIED, value: 'took' }, { e: 'energy', delta: -4 }, { e: 'toast', text: 'קובי: "טוב. אבל את הכרטיסים אני מחזיק." — "יש לך עותק."', tone: 'plain' }],
          },
          {
            id: 'let',
            text: '(לתת לו לסחוב. לקחת רק כשהוא עוצר.)',
            then: [{ e: 'flagValue', flag: CARRIED, value: 'let' }, { e: 'toast', text: 'קובי: "אני אגיד לך מתי." — "תגיד."', tone: 'plain' }],
          },
        ],
      },
    ],
  },
  {
    /**
     * **הספסל** — הסיבוך של היום עצמו (§5.5, *"Kobi is tired earlier than expected"*). מי
     * שתכנן דרך שדוחקת (`TIGHT`) משלם עליו בזמן; מי שתכנן בקצב שלו — עוצר בחינם.
     */
    id: 'f-leg-pace',
    nameHe: 'קובי',
    branches: [
      {
        when: TIGHT,
        lines: [
          { who: null, text: 'באמצע האולם הארוך אבא מאט. לא עוצר — מאט. והשעון על הלוח לא.' },
          { who: 'קובי', text: 'אתה ממהר?' },
        ],
        choices: [
          {
            id: 'stop',
            text: '(לעצור עכשיו, על הספסל — לפני שהוא מבקש.)',
            then: [
              { e: 'flagValue', flag: PACE, value: 'stopped' },
              { e: 'flag', flag: 'life:finale:late' },
              { e: 'time', minutes: 25 },
              { e: 'toast', text: 'האוטובוס יצא בלעדיכם. יש עוד אחד, בשעה אחרי. אבא שתה מים ולא אמר כלום.', tone: 'plain' },
            ],
          },
          {
            id: 'arm',
            text: '(לתת לו את המרפק, ולהמשיך בקצב שלו.)',
            then: [
              { e: 'flagValue', flag: PACE, value: 'arm' },
              { e: 'time', minutes: 10 },
              { e: 'toast', text: 'הוא לא לקח את היד. הוא לקח את המרפק — כמו שהחזקת אותו פעם, בשער 7.', tone: 'plain' },
            ],
          },
          {
            id: 'push',
            text: '(להמשיך — עוד עשר דקות ויש כיסא באוטובוס.)',
            then: [
              { e: 'flagValue', flag: PACE, value: 'pushed' },
              { e: 'energy', delta: -6 },
              { e: 'toast', text: 'קובי: "עשר הדקות שלך הן עשרים שלי." — הוא הגיע. בשקט.', tone: 'red' },
            ],
          },
        ],
      },
      {
        lines: [
          { who: null, text: 'באמצע האולם הארוך אבא מאט. לא עוצר — מאט.' },
          { who: 'קובי', text: 'אתה ממהר?' },
          { who: 'פוגי', text: 'לא היום. זה כתוב.' },
        ],
        choices: [
          {
            id: 'stop',
            text: '(לעצור על הספסל. יש זמן — בשביל זה תכננת.)',
            then: [{ e: 'flagValue', flag: PACE, value: 'stopped' }, { e: 'time', minutes: 15 }, { e: 'toast', text: 'רבע שעה על ספסל, ושום דבר לא יוצא בלעדיכם.', tone: 'plain' }],
          },
          {
            id: 'arm',
            text: '(לתת לו את המרפק, ולהמשיך בקצב שלו.)',
            then: [{ e: 'flagValue', flag: PACE, value: 'arm' }, { e: 'time', minutes: 10 }, { e: 'toast', text: 'הוא לא לקח את היד. הוא לקח את המרפק — כמו שהחזקת אותו פעם, בשער 7.', tone: 'plain' }],
          },
        ],
      },
    ],
  },
  {
    id: 'f-leg-door',
    nameHe: null,
    branches: [
      { when: { flag: 'life:finale:late' }, lines: [{ who: null, text: 'האוטובוס הבא. חצי ריק, וכיסא ליד החלון בשבילו.' }, { who: null, text: 'את הדרך מכאן אתה יודע. הוא יודע שאתה יודע.' }] },
      { when: route('rest'), lines: [{ who: null, text: 'המונית. הנהג שואל לאן, ואבא מסתכל עליך — לא עליו.' }, { who: null, text: 'את הדרך מכאן אתה יודע. הוא יודע שאתה יודע.' }] },
      { when: route('train'), lines: [{ who: null, text: 'השאטל לרכבת. שני מקומות ישיבה, ואחד מהם ליד החלון.' }, { who: null, text: 'את הדרך מכאן אתה יודע. הוא יודע שאתה יודע.' }] },
      { lines: [{ who: null, text: 'הדלתות נפתחות, והדרך לבוטבגרד מתחילה ברחבת חניה.' }, { who: null, text: 'את הדרך מכאן אתה יודע. הוא יודע שאתה יודע.' }] },
    ],
  },
]

/**
 * `f-back` — **קובי מגיב לאיך שזה נוהל** (§7, *"Dad/child react to how Pugi handled the
 * journey"*). שורות התסריט נשמרות; לפניהן שתיים-שלוש על מה שהיומן מוכיח: הספסל, המרפק,
 * עשר הדקות. והילד, כשהוא שם.
 */
const BACK_REACTIONS: ReadonlyArray<readonly [Condition | null, Say[]]> = [
  [{ flagIs: { flag: PACE, value: 'stopped' } }, [
    { who: 'קובי', text: 'עצרת לפני שביקשתי.' },
    { who: 'פוגי', text: 'ראיתי אותך מאט.' },
    { who: 'קובי', text: 'ככה עשיתי לך פעם. בשער 7. חשבתי שלא שמת לב.' },
  ]],
  [{ flagIs: { flag: PACE, value: 'arm' } }, [
    { who: 'קובי', text: 'המרפק. מאיפה זה?' },
    { who: 'פוגי', text: 'ממך.' },
  ]],
  [{ flagIs: { flag: PACE, value: 'pushed' } }, [
    { who: 'קובי', text: 'עשר הדקות שלך היו עשרים שלי.' },
    { who: 'פוגי', text: 'הבנתי. בחזרה — הספסל שלך.' },
  ]],
  [null, []],
]

// ---------------------------------------------------------------- the words ------

/** F02 — שלוש הדרכים לצאת מנמל ההגעה; אותן בחירות בשני הענפים של `f-road` */
const ROAD_CHOICES: Choice[] = [
  {
    id: 'together',
    text: '(ללכת יחד — ולתת לו לבחור איפה עוצרים.)',
    then: [
      { e: 'flag', flag: 'f:road' },
      // (90-E) the terminal, and Pugi leads: `ride:terminal-26` (`adultQuestsB.ts`)
      { e: 'minigame', id: 'ride:terminal-26' },
      { e: 'time', minutes: 20 },
      { e: 'rel', who: 'kobi', axis: 'bond', delta: 3 },
      { e: 'flagValue', flag: 'f:pace', value: 'together' },
      { e: 'toast', text: 'קובי: "פה נשב רגע." — "יש עוד זמן." — "אז עוד יותר טוב."', tone: 'plain' },
    ],
  },
  {
    id: 'child',
    text: '(לתת לו להוביל קטע קצר, בהסכמה.)',
    when: party('three'),
    hidden: true,
    then: [
      { e: 'flag', flag: 'f:road' },
      // (90-E) the terminal, and Pugi leads: `ride:terminal-26` (`adultQuestsB.ts`)
      { e: 'minigame', id: 'ride:terminal-26' },
      { e: 'flagValue', flag: 'f:pace', value: 'third_generation' },
      { e: 'toast', text: 'הילד: "אתם באים?" — קובי: "עכשיו אתה מבין אותי?" — "קצת יותר מדי."', tone: 'plain' },
    ],
  },
  {
    id: 'wait',
    text: '(לחכות לו במקום שסיכמנו.)',
    // F02.3 — *"במפגש מחו״ל, לחכות לקובי במקום שסיכמנו"*: rest of the lives left together
    when: abroad,
    hidden: true,
    then: [
      { e: 'flag', flag: 'f:road' },
      // (90-E) the terminal, and Pugi leads: `ride:terminal-26` (`adultQuestsB.ts`)
      { e: 'minigame', id: 'ride:terminal-26' },
      { e: 'rel', who: 'kobi', axis: 'bond', delta: 3 },
      { e: 'flagValue', flag: 'f:pace', value: 'reunion' },
      { e: 'toast', text: 'קובי: "חשבתי שתעמוד עם שלט." — "אתה מזהה אותי גם בלי?" — "לצערך."', tone: 'plain' },
    ],
  },
]

/**
 * ============================================= ההליכה האחרונה (pass D, §63 S5) ====
 *
 * ארבע עצירות, וכל אחת נפתחת לחיים שהיו לו — ולחיים שלא, שורה משלהם ולא שתיקה. הסדר
 * של הענפים הוא סדר העדיפות: מה שהוא הכי הרבה שלו מנצח.
 */
const OUTFIT = 'own:outfit:2026-finale'
const wore = (shirt: string): Condition => ({ flagIs: { flag: OUTFIT, value: shirt } })
const routeAt = (id: string, stage: 'entry' | 'practice' | 'apex'): Condition => ({ flag: `own:route:${id}:${stage}` })
const TEDDY = 'life:teddy2010'

export const CONVERSATIONS_WALK: Conversation[] = [
  {
    id: 'f-walk-go',
    nameHe: null,
    branches: [
      {
        lines: [{ who: null, text: 'הוא עומד מחוץ לאולם ומחכה שתזוז ראשון. היום זה ככה.' }],
        then: [{ e: 'minigame', id: 'ride:walk-26' }],
      },
    ],
  },
  {
    /** הכתפיים — 1.6.1983, הפוך. `life:a1:grip` (`gestures.ts`) הוא מה שהיד של הילד עשתה אז */
    id: 'f-walk-step',
    nameHe: 'קובי',
    branches: [
      {
        when: { flagIs: { flag: 'life:a1:grip', value: 'caught' } },
        lines: [
          { who: null, text: 'במדרגה האחרונה הוא מאט, והיד שלו מחפשת משהו להישען עליו. היא מוצאת את הכתף שלך.' },
          { who: 'קובי', text: 'פעם ישבת עליהן.' },
          { who: 'פוגי', text: 'ונאחזתי לך בשיער.' },
          { who: 'קובי', text: 'כמעט נפלת. תפסתי אותך בזמן.' },
          { who: 'פוגי', text: 'היום אני תופס.' },
        ],
      },
      {
        when: { flagIs: { flag: 'life:a1:grip', value: 'held' } },
        lines: [
          { who: null, text: 'במדרגה האחרונה הוא מאט, והיד שלו מחפשת משהו להישען עליו. היא מוצאת את הכתף שלך.' },
          { who: 'קובי', text: 'פעם ישבת עליהן. החזקת חזק, ולא זזת כל המשחק.' },
          { who: 'פוגי', text: 'למדתי ממך איך מחזיקים.' },
        ],
      },
      {
        lines: [
          { who: null, text: 'במדרגה האחרונה הוא מאט, והיד שלו מחפשת משהו להישען עליו. היא מוצאת את הכתף שלך.' },
          { who: 'קובי', text: 'פעם ישבת עליהן.' },
          { who: 'פוגי', text: 'אני לא זוכר.' },
          { who: 'קובי', text: 'אני זוכר מספיק בשביל שנינו.' },
        ],
      },
    ],
  },
  {
    /** החולצה — מה שנלבש בטקס הבוקר (`own:outfit:2026-finale`), והחולצה הראשונה שמאחוריה */
    id: 'f-walk-shirt',
    nameHe: 'קובי',
    branches: [
      {
        when: { all: [wore('visa86'), { flag: 'life:first-shirt:gift' }] },
        lines: [
          { who: null, text: 'המעיל נפתח ברוח, ומתחתיו אדום של פעם — עם הפס הכהה על החזה.' },
          { who: 'קובי', text: 'ארבעים שנה, והצווארון עוד מחזיק.' },
          { who: 'פוגי', text: 'ספרתי שלושים שקל על הדלפק, ואתה שילמת.' },
          { who: 'קובי', text: 'ועוד פעם הייתי משלם.' },
        ],
      },
      {
        when: wore('tveria85'),
        lines: [
          { who: null, text: 'המעיל נפתח ברוח, ומתחתיו החולצה מהקיוסק של רפי.' },
          { who: 'קובי', text: 'את זאת קנית לבד. מהפחית.' },
          { who: 'פוגי', text: 'שבועיים של בקבוקים.' },
          { who: 'קובי', text: 'אני זוכר את הצלצול של המטבעות. כל הבית שמע.' },
        ],
      },
      {
        when: { all: [{ flag: OUTFIT }, { none: [wore('plain')] }] },
        lines: [
          { who: null, text: 'המעיל נפתח ברוח, ומתחתיו אדום.' },
          { who: 'קובי', text: 'מאיזו שנה זאת?' },
          { who: 'פוגי', text: 'משנה טובה.' },
          { who: 'קובי', text: 'על חולצה אין שנים רעות. יש רק כביסות.' },
        ],
      },
      {
        // (pass D) the scarf that took the suitcase's last corner in 2021, packed for May in 2025
        when: { any: [{ flagIs: { flag: 'life:finale:packed', value: 'scarf' } }, { flagIs: { flag: 'life:finale:packed', value: 'scarf:aside' } }] },
        lines: [
          { who: null, text: 'בלי חולצה של הקבוצה. אבל הצעיף — זה שנכנס לפינה האחרונה של המזוודה — סביב הצוואר, במאי.' },
          { who: 'קובי', text: 'לקחת אותו לשם, והבאת אותו לפה.' },
          { who: 'פוגי', text: 'הוא יודע את הדרך יותר טוב ממני.' },
        ],
      },
      {
        lines: [
          { who: null, text: 'המעיל סגור עד למעלה. מתחתיו סוודר, בלי שום צבע של קבוצה.' },
          { who: 'קובי', text: 'באת בלי חולצה?' },
          { who: 'פוגי', text: 'באתי איתך. זה מספיק צבע.' },
        ],
      },
    ],
  },
  {
    /** הטלפון — הילד (לידו, או בבית), ההבטחה של 2013, או מי שמחכה לו בחיים האחרים */
    id: 'f-walk-phone',
    nameHe: 'קובי',
    remote: { 'הילד': 'phone', PARTNER: 'phone', 'עמית': 'phone', 'אלכס': 'phone' },
    branches: [
      {
        when: party('three'),
        lines: [
          { who: null, text: 'הילד הולך שלושה צעדים לפניכם, ומסתובב לבדוק שאתם באים. הטלפון בכיס שלך שקט — כל מי שצריך נמצא פה.' },
          { who: 'קובי', text: 'הוא מסתובב בדיוק כמו שאתה הסתובבת.' },
          { who: 'פוגי', text: 'ואתה תמיד היית שם.' },
          { who: 'קובי', text: 'לא תמיד. אבל הוא לא צריך לדעת את זה הערב.' },
        ],
      },
      {
        when: { all: [{ flag: 'life:child' }, { flagIs: { flag: 'life:saturday', value: 'missed' } }] },
        lines: [
          { who: null, text: 'הטלפון רוטט. הודעה מהבית.' },
          { who: 'הילד', text: 'ניצחנו?' },
          { who: 'פוגי', text: 'הפסדנו. אבל סבא הלך כל הדרך. ובשבת שלך אני בא בזמן — כתבתי את זה.' },
          { who: 'קובי', text: 'כתבת. זה כבר יותר ממה שאני עשיתי.' },
        ],
      },
      {
        when: { flag: 'life:child' },
        lines: [
          { who: null, text: 'הטלפון רוטט. הודעה מהבית.' },
          { who: 'הילד', text: 'ניצחנו?' },
          { who: 'פוגי', text: 'הפסדנו. אבל סבא הלך כל הדרך.' },
          { who: 'קובי', text: 'תכתוב לו שסבא הלך לאט בכוונה. שיהיה לו מה לחקות.' },
        ],
      },
      {
        when: { all: [{ flag: 'life:partner' }, { flag: 'promise:householdEvening' }] },
        lines: [
          { who: null, text: 'הטלפון רוטט.' },
          { who: 'PARTNER', text: 'איך הוא?' },
          { who: 'פוגי', text: 'הולך לאט, מדבר מהר. ואת הערב שלנו לא שכחתי — ביום ראשון, כמו שכתוב על המקרר.' },
          { who: 'קובי', text: 'על המקרר. אצלנו זה היה על הלוח במטבח, ורחל מחקה מה שלא קרה.' },
        ],
      },
      {
        when: { flag: 'life:partner' },
        lines: [
          { who: null, text: 'הטלפון רוטט.' },
          { who: 'PARTNER', text: 'איך הוא?' },
          { who: 'פוגי', text: 'הולך לאט, מדבר מהר.' },
          { who: 'קובי', text: 'תגיד לה שאני שומע.' },
        ],
      },
      {
        when: { flag: 'life:abroad' },
        lines: [
          { who: null, text: 'הטלפון רוטט. הודעה מהמקום השני.' },
          { who: 'אלכס', text: 'המפתח אצל השכנה. אל תמהר.' },
          { who: 'קובי', text: 'יש לך שם מישהו שמחכה.' },
          { who: 'פוגי', text: 'ויש לי פה מישהו שהלכתי אחריו ארבעים שנה.' },
        ],
      },
      {
        when: { flagIs: { flag: TEDDY, value: 'broken' } },
        lines: [
          { who: null, text: 'הטלפון רוטט.' },
          { who: 'עמית', text: 'חזרתם ביחד?' },
          { who: 'פוגי', text: 'ביחד. את זה למדתי בטדי, בדרך הקשה.' },
          { who: 'קובי', text: 'הדרך הקשה היא היחידה שנשארת.' },
        ],
      },
      {
        lines: [
          { who: null, text: 'הטלפון שקט. אף אחד לא צריך לדעת איפה אתה עכשיו, חוץ ממנו.' },
          { who: 'קובי', text: 'אין לך למי לספר?' },
          { who: 'פוגי', text: 'אני מספר לך.' },
        ],
      },
    ],
  },
  {
    /** the street — the last stop, and the one that says the walk happened (the ride's own flag too) */
    id: 'f-walk-road',
    nameHe: null,
    branches: [
      {
        lines: [{ who: null, text: 'הרחוב מתרוקן לאט. הוא הולך בקצב שלו, ואתה לא צריך לחשוב על זה יותר — הרגליים כבר יודעות.' }],
        then: [{ e: 'flag', flag: 'f:walked' }],
      },
    ],
  },
  {
    /** השלט — מה שהוא עושה היום (המסלול), ומה שנהרס ב-2007 */
    id: 'f-walk-sign',
    nameHe: 'קובי',
    branches: [
      {
        when: { all: [{ flagIs: { flag: 'life:owner:role', value: 'controlling_owner' } }, { flagIs: { flag: 'life:owner:triangle', value: 'money_squad' } }] },
        lines: [
          { who: 'קובי', text: 'ובעל הבית של הקבוצה הולך איתי ברגל.' },
          { who: 'פוגי', text: 'בעל הבית של שורה בגיליון.' },
          { who: 'קובי', text: 'והאוהדים עוד כועסים על הקיץ ההוא?' },
          { who: 'פוגי', text: 'יבגני מתקשר כל שבוע. זה סימן שעוד לא ויתר עליי.' },
        ],
      },
      {
        when: { flagIs: { flag: 'life:owner:role', value: 'controlling_owner' } },
        lines: [
          { who: 'קובי', text: 'ובעל הבית של הקבוצה הולך איתי ברגל.' },
          { who: 'פוגי', text: 'בעל הבית של שורה בגיליון.' },
          { who: 'קובי', text: 'אז תגיד לשורה שהיום אתה בחופש.' },
        ],
      },
      {
        when: routeAt('JOURNALIST', 'apex'),
        lines: [
          { who: 'קובי', text: 'תכתוב על זה?' },
          { who: 'פוגי', text: 'לא על המשחק. עליך.' },
          { who: 'קובי', text: 'אז תכתוב שהלכתי לאט בכוונה.' },
        ],
      },
      {
        when: routeAt('ULTRAS', 'practice'),
        lines: [
          { who: 'קובי', text: 'ומי מוביל את השירים בבית, כשאתה פה?' },
          { who: 'פוגי', text: 'מישהו שלימדתי. הוא יותר טוב ממני.' },
          { who: 'קובי', text: 'זה הדבר הכי טוב שאפשר להגיד על מישהו.' },
        ],
      },
      {
        when: routeAt('USSISHKIN_FOUNDER', 'entry'),
        lines: [
          { who: null, text: 'מעל הכניסה, אותיות שאתה לא יודע לקרוא. אתה קורא אותן בכל זאת: אולם.' },
          { who: 'קובי', text: 'אצלנו היה כתוב אוסישקין, בצבע שהתקלף.' },
          { who: 'פוגי', text: 'ואחרי שנפל, בנינו אחד משלנו.' },
          { who: 'קובי', text: 'אתם בניתם. אני רק באתי כל שבת.' },
        ],
      },
      {
        when: { flagIs: { flag: 'life:uss:lossKind', value: 'father' } },
        lines: [
          { who: null, text: 'מעל הכניסה, אותיות שאתה לא יודע לקרוא. אתה קורא אותן בכל זאת: אולם.' },
          { who: 'קובי', text: 'אתה זוכר שדיברנו בטלפון כשאוסישקין נפל?' },
          { who: 'פוגי', text: 'לא נתת לי לנתק.' },
          { who: 'קובי', text: 'לא רציתי שתעמוד שם לבד. גם היום לא.' },
        ],
      },
      {
        lines: [
          { who: null, text: 'מעל הכניסה, אותיות שאתה לא יודע לקרוא. אתה קורא אותן בכל זאת: אולם.' },
          { who: 'קובי', text: 'ומחר עבודה?' },
          { who: 'פוגי', text: 'מחר. היום — זה.' },
        ],
      },
    ],
  },
]

export const CONVERSATIONS_FINALE: Conversation[] = [
  ...CONVERSATIONS_PLAN_QUEST,
  ...CONVERSATIONS_TRIP_QUEST,
  ...CONVERSATIONS_WALK,
  {
    id: 'f-name',
    nameHe: 'קובי',
    branches: [
      {
        lines: [
          { who: 'קובי', text: 'איך אני מציג אותך שם?' },
          { who: 'פוגי', text: 'תלוי את מי שואלים.' },
          { who: 'קובי', text: 'אני שואל אותך.' },
          { who: 'פוגי', text: 'הבן שלך זה בסדר.' },
          { who: 'קובי', text: 'יופי. את זה אני זוכר בלי שתשלח לי רשימה.' },
        ],
        choices: [
          {
            id: 'now',
            text: '(לספר לו באיזה תפקיד אני פעיל עכשיו.)',
            then: [
              { e: 'flag', flag: 'f:name' },
              { e: 'flagValue', flag: 'life:finale:introduction', value: 'current_roles' },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 3 },
              { e: 'toast', text: 'קובי: "אז כשצריכים אותך, יודעים איפה למצוא." — "היום אתה יודע."', tone: 'plain' },
            ],
          },
          {
            id: 'former',
            text: '(לספר על משהו שעזבתי — בלי למחוק אותו.)',
            then: [
              { e: 'flag', flag: 'f:name' },
              { e: 'flagValue', flag: 'life:finale:introduction', value: 'former_roles' },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 3 },
              { e: 'toast', text: 'קובי: "ואתה מתגעגע?" — "לפעמים. אבל אני לא רוצה לחזור לכל דבר." — "גם זו תשובה."', tone: 'plain' },
            ],
          },
          {
            id: 'family',
            text: '(להשאיר את התארים בבית — ולבדוק שיש לשנינו כרטיסים.)',
            then: [
              { e: 'flag', flag: 'f:name' },
              { e: 'flagValue', flag: 'life:finale:introduction', value: 'family' },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 3 },
              { e: 'toast', text: 'קובי: "שלי אצלך?" — "כן." — "מוזר." — "תתרגל קצת."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'f-money',
    nameHe: 'עמית',
    branches: [
      {
        lines: [
          { who: 'עמית', text: 'יש תוכנית. עכשיו מה ממומן?' },
          { who: 'פוגי', text: 'חשבתי שאספיק לחסוך.' },
          { who: 'קובי', text: 'אפשר גם להתחלק. לא ביקשתי שתוכיח שאתה בנק.' },
          { who: 'פוגי', text: 'רציתי לקחת אותך.' },
          { who: 'קובי', text: 'אז תיקח אחריות. זה יותר מכרטיס.' },
        ],
        choices: [
          {
            id: 'share',
            text: '(לשלם את חלקי בנסיעה צנועה ומוסכמת.)',
            when: { minAgorot: SHARE_AGOROT },
            noteHe: 'גם חלק אחד עולה כסף. התוכנית הרביעית היא איך משיגים אותו.',
            then: [
              { e: 'flag', flag: 'f:money' },
              { e: 'money', agorot: -SHARE_AGOROT, why: 'החלק שלי בנסיעה' },
              { e: 'flag', flag: 'f:ready' },
              { e: 'flagValue', flag: 'f:funding', value: 'shared_confirmed' },
              { e: 'rel', who: 'kobi', axis: 'trust', delta: 3 },
              { e: 'toast', text: 'קובי: "החלק שלי סגור. שלך?" — "עכשיו סגור."', tone: 'plain' },
            ],
          },
          {
            id: 'two',
            text: '(לממן את הנסיעה לשנינו, מכסף פנוי.)',
            when: { minAgorot: TWO_AGOROT },
            noteHe: 'אין בארנק מה שנסיעה לשניים עולה, ואין מה לנופף בחשבונית שאין.',
            then: [
              { e: 'flag', flag: 'f:money' },
              { e: 'money', agorot: -TWO_AGOROT, why: 'נסיעה לשניים' },
              { e: 'flag', flag: 'f:ready' },
              { e: 'flagValue', flag: 'f:funding', value: 'self_two' },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 3 },
              { e: 'toast', text: 'קובי: "תודה. עכשיו בלי לנופף בחשבונית." — "היא הולכת לעמית."', tone: 'plain' },
            ],
          },
          {
            id: 'three',
            text: '(לממן שלושה. הוא ביקש להצטרף.)',
            when: { all: [{ flag: 'life:child' }, { minAgorot: THREE_AGOROT }] },
            hidden: true,
            then: [
              { e: 'flag', flag: 'f:money' },
              { e: 'money', agorot: -THREE_AGOROT, why: 'נסיעה לשלושה' },
              { e: 'flag', flag: 'f:ready' },
              { e: 'flagValue', flag: 'f:funding', value: 'self_three' },
              { e: 'toast', text: 'הילד: "שמרת גם זמן לטיול?" — "הוא בתוך התוכנית."', tone: 'plain' },
            ],
          },
          {
            id: 'prepare',
            text: '(קודם תוכנית חיסכון ועבודה. אחר כך מאשרים.)',
            then: [
              { e: 'flag', flag: 'f:money' },
              { e: 'flagValue', flag: 'f:funding', value: 'preparation' },
              // (90-E) the plan of six shifts is Amit's sentence, not work done tonight — no skill for it
              { e: 'time', minutes: 10 },
              { e: 'toast', text: 'עמית: "בוחרים להן ימים, לא מגרילים כסף." — "ובסוף בודקים שהכול באמת פנוי."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'f-plan',
    nameHe: 'קובי',
    /**
     * (90-E) קובי מגיב **למה שכתוב בדף** — הדרך והתקלה נקראות מהחיים (`ROUTE`, `SNAG`).
     * השורות של התסריט נשמרות מילה במילה; אחריהן שורה או שתיים על הדרך שנבחרה.
     */
    branches: PLAN_REACTIONS.map(([when, extra]): Branch => ({
      ...(when ? { when } : {}),
      lines: [
        { who: 'קובי', text: 'כמה כרטיסים?' },
        { who: 'פוגי', text: 'לנו. ואם מצטרף עוד מישהו, רק אחרי ששאלנו אותו.' },
        { who: 'קובי', text: 'טוב. לא מחליטים בשביל אנשים.' },
        { who: 'פוגי', text: 'למדתי.' },
        { who: 'קובי', text: 'אז עכשיו תראה לי את התוכנית.' },
        ...extra,
      ],
      choices: [
        {
          id: 'two',
          text: '(נסיעה של אבא ושלי.)',
          // (90-E) the plan exists: tickets on the counter, not a promise
          when: { all: [{ flag: 'f:ready' }, { flag: 'f:sheet' }] },
          noteHe: 'התקציב לא נסגר, ותוכנית בלי כיסוי היא הבטחה.',
          then: [
            { e: 'flag', flag: 'f:plan' },
            { e: 'flagValue', flag: 'f:party', value: 'two' },
            { e: 'flagValue', flag: PARTY, value: 'two' },
            { e: 'proof', kind: 'plan_confirmed', proofId: 'plan_confirmed:{chapter}:trip', subjectHe: 'הנסיעה עם אבא', noteHe: 'תוכנית כתובה, אחרי שהתקציב נסגר ולא לפני.' },
            { e: 'rel', who: 'kobi', axis: 'bond', delta: 3 },
            { e: 'toast', text: 'קובי: "לא צריך הכי יקר." — "צריך שנוכל ללכת בקצב שלנו." — "את זה דווקא תכתוב."', tone: 'plain' },
            { e: 'ending', id: 'two' },
          ],
        },
        {
          id: 'three',
          text: '(לשאול את הילד — ולקבל את הבחירה שלו.)',
          when: { all: [{ flag: 'life:child' }, { flag: 'f:ready' }, { flagIs: { flag: 'f:tickets', value: 'three' } }] },
          hidden: true,
          then: [
            { e: 'flag', flag: 'f:plan' },
            { e: 'flagValue', flag: 'f:party', value: 'three' },
            { e: 'flagValue', flag: PARTY, value: 'three' },
            { e: 'proof', kind: 'plan_confirmed', proofId: 'plan_confirmed:{chapter}:trip', subjectHe: 'הנסיעה עם אבא', noteHe: 'נשאל לפני שנרשם, ובחר בעצמו.' },
            { e: 'toast', text: 'הילד: "אני רוצה לבוא. אפשר גם משהו שהוא לא משחק?" — "ברור." — קובי: "אני בעד אוכל."', tone: 'plain' },
            { e: 'ending', id: 'two' },
          ],
        },
        {
          id: 'reunion',
          text: '(להיפגש באירופה, משני מקומות.)',
          /**
           * *"משני מקומות"* — ורק מי שגר במקום השני (`life:abroad`, X01) יכול לבוא מהמקום
           * השני. עד 21.9.2026 המשפט הוצע לכל חיים, כולל מי שגר שלושה רחובות מקובי;
           * התסריט קושר אותו ל-X05 (*"מציע F01 עם reunion"*). לא אפור אלא **חסר**, כי
           * בחיים שלא עברו זה לא משפט שאפשר להגיד (`ChoiceDef.hidden`).
           */
          // X05 הציע את זה (`2025-abroad`); בלי ההזמנה, זה לא משפט שנאמר
          when: { all: [{ flag: 'f:ready' }, { flag: 'life:abroad' }, { flag: 'life:finale:reunionOffered' }, { flagIs: { flag: 'f:tickets', value: 'reunion' } }] },
          hidden: true,
          then: [
            { e: 'flag', flag: 'f:plan' },
            { e: 'flagValue', flag: 'f:party', value: 'reunion' },
            { e: 'flagValue', flag: PARTY, value: 'reunion' },
            { e: 'proof', kind: 'plan_confirmed', proofId: 'plan_confirmed:{chapter}:trip', subjectHe: 'הנסיעה עם אבא', noteHe: 'נקודת מפגש עם תמונה, כי שם של רחוב הוא ישכח.' },
            { e: 'rel', who: 'kobi', axis: 'bond', delta: 2 },
            { e: 'toast', text: 'קובי: "איפה אתה מחכה לי?" — "בנקודה שנקבע, עם תמונה שלה." — "טוב. שם של רחוב אני אשכח."', tone: 'plain' },
            { e: 'ending', id: 'reunion' },
          ],
        },
        {
          id: 'later',
          text: '"עוד לא. אני לא מבטיח לפני שסוגרים."',
          then: [
            { e: 'flag', flag: 'f:plan' },
            { e: 'flagValue', flag: 'f:party', value: 'saving' },
            { e: 'flagValue', flag: PARTY, value: 'saving' },
            { e: 'personality', key: 'honesty', delta: 3 },
            { e: 'toast', text: 'קובי: "זה בסדר." — "אני יודע. בגללך."', tone: 'plain' },
            { e: 'ending', id: 'saving' },
          ],
        },
      ],
    })),
  },
  // ----------------------------------------------------------------- F02–F04 ------
  {
    id: 'f-road',
    nameHe: 'קובי',
    /**
     * (90-E) **1983 ↔ 2026, במכניקה.** מי שקנה את הכרטיסים בקופה (`f-tickets`) מחזיק אותם בכיס —
     * וקובי שואל עליהם, כמו שפוגי שאל אותו ב-1983. מי שנוסע משני מקומות (הכרטיס נשלח אליו)
     * או בלי כרטיסים שנקנו כאן — שומע את השורות של התסריט, מילה במילה.
     */
    branches: [
      {
        when: { any: [{ flagIs: { flag: TICKETS, value: 'two' } }, { flagIs: { flag: TICKETS, value: 'three' } }] },
        lines: [
          { who: null, text: 'נמל ההגעה. שני תיקים, ושעה מוקדמת.' },
          { who: 'קובי', text: 'הכרטיסים אצלך?' },
          { who: 'פוגי', text: 'בכיס הפנימי. כמו שאתה החזקת אותם, אז.' },
          { who: 'קובי', text: 'אז גם סחבתי אותך.' },
          { who: 'פוגי', text: 'אז היום אני סוחב את התיק.' },
          { who: 'קובי', text: 'טוב. תשובה מעצבנת אבל טובה.' },
        ],
        choices: ROAD_CHOICES,
      },
      {
        lines: [
          { who: null, text: 'נמל ההגעה. שני תיקים, ושעה מוקדמת.' },
          { who: 'קובי', text: 'יש לי את הכרטיסים.' },
          { who: 'פוגי', text: 'גם לי יש עותק.' },
          { who: 'קובי', text: 'אתה לא סומך עליי?' },
          { who: 'פוגי', text: 'למדתי ממך.' },
          { who: 'קובי', text: 'טוב. תשובה מעצבנת אבל טובה.' },
        ],
        choices: ROAD_CHOICES,
      },
    ],
  },
  {
    id: 'f-seats',
    nameHe: 'קובי',
    branches: [
      {
        lines: [
          { who: null, text: 'מחוץ לאולם. אנשים בשתי שפות, ואף אחת מהן לא שלכם.' },
          { who: 'קובי', text: 'אז איפה הולכים?' },
          { who: 'פוגי', text: 'היום אתה אחריי.' },
          { who: 'קובי', text: 'ארבעים שנה חיכית להגיד את זה.' },
          { who: 'פוגי', text: 'קצת יותר.' },
          { who: 'קובי', text: 'אל תתחיל להיות עמית.' },
        ],
        choices: [
          {
            /**
             * `inventory.has_selected_legacy_object` (F03.1) — **ואין כאן `when`, בכוונה.**
             * הקופסה האדומה מתמלאת ב-`{ e: 'keep' }` בסוף 1986, ו-24.5.1986 הוא יום חובה
             * (כלל 58) שהמועמד האחרון שלו תמיד זכאי — כלומר אין חיים שמגיעים ל-2026 עם
             * קופסה ריקה. תנאי שתמיד מתקיים הוא רעש; אם יום חובה ייפתח אי-פעם, זה המקום.
             */
            id: 'object',
            text: '(לתת לו את המזכרת שבחרתי מהקופסה.)',
            then: [
              { e: 'flag', flag: 'f:seats' },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 3 },
              { e: 'memory', item: 'folded-paper', id: 'f-2026-object' },
              { e: 'flagValue', flag: 'f:gesture', value: 'old_object' },
              { e: 'presence', mode: 'inside' },
              { e: 'attend' },
              { e: 'toast', text: 'קובי: "אתה זוכר את זה?" — "בגלל זה הבאתי." — "אז תשאיר אצלך. יש לך עוד למי לספר."', tone: 'plain' },
            ],
          },
          {
            id: 'photo',
            text: '(לצלם את מי שהגיע איתי.)',
            then: [
              { e: 'flag', flag: 'f:seats' },
              { e: 'flag', flag: 'own:photo:finale2026' },
              { e: 'flagValue', flag: 'f:gesture', value: 'photo' },
              { e: 'presence', mode: 'inside' },
              { e: 'attend' },
              { e: 'toast', text: 'קובי: "רגע, עוד לא הסתכלתי." — "דווקא ככה." — "אתה וכל התמונות שלך."', tone: 'plain' },
            ],
          },
          {
            id: 'present',
            text: '(להניח את הטלפון. פשוט להיות איתו.)',
            then: [
              { e: 'flag', flag: 'f:seats' },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 3 },
              { e: 'memory', item: 'folded-paper', id: 'f-2026-present' },
              { e: 'flagValue', flag: 'f:gesture', value: 'present' },
              { e: 'presence', mode: 'inside' },
              { e: 'attend' },
              { e: 'toast', text: 'קובי: "אתה בסדר?" — "כן. רציתי להיות פה איתך." — "אז תהיה."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'f-back',
    nameHe: 'קובי',
    branches: BACK_REACTIONS.flatMap(([when, extra]): Branch[] => [
      // והילד, כשהוא שם — שורה אחת, והיא שלו
      {
        when: { all: [...(when ? [when] : []), party('three')] },
        lines: [
          { who: null, text: 'מחוץ לאולם, אחרי. הרחוב מתרוקן לאט.' },
          // (תנ"ך מהדורה 2, §7 #30) — הערב נגמר בהארכה, והסוף יודע את זה בלי לומר מספר
          { who: 'קובי', text: 'הארכה.' },
          { who: 'פוגי', text: 'הארכה.' },
          { who: 'קובי', text: 'פעם חיכינו עד הדקה השמונים ושש. היום חיכינו עד אחרי הארבעים.' },
          ...extra,
          { who: 'הילד', text: 'סבא הלך לאט, ואבא הלך לאט בשבילו.' },
          { who: 'קובי', text: 'נו, מה אתה אומר?' },
          { who: 'פוגי', text: 'על המשחק?' },
          { who: 'קובי', text: 'על הכול.' },
          { who: 'פוגי', text: 'אני עוד חושב.' },
          { who: 'קובי', text: 'אז בוא נאכל בינתיים.' },
        ],
        choices: [
          {
            id: 'father',
            text: '"פעם אתה הובלת אותי. היום רציתי להיות לידך מהצד הזה."',
            then: [
              { e: 'flag', flag: 'f:back' },
              { e: 'flagValue', flag: 'life:ending', value: 'father_and_child' },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 4 },
              { e: 'remember', who: 'kobi', eventId: 'finale-2026', significance: 'major' },
              // (pass D) the walk before the card — `ridesPassD.ts`, and the last word in `f-last`
              { e: 'flagValue', flag: CLOSE, value: 'together' },
              { e: 'minigame', id: 'ride:walk-26' },
            ],
          },
          {
            id: 'three',
            text: '(לתת לו לבחור את הדרך חזרה.)',
            when: party('three'),
            hidden: true,
            then: [
              { e: 'flag', flag: 'f:back' },
              { e: 'flagValue', flag: 'life:ending', value: 'three_generations' },
              { e: 'remember', who: 'kobi', eventId: 'finale-2026', significance: 'major' },
              // (pass D) the walk before the card — `ridesPassD.ts`, and the last word in `f-last`
              { e: 'flagValue', flag: CLOSE, value: 'generations' },
              { e: 'minigame', id: 'ride:walk-26' },
            ],
          },
          {
            id: 'mine',
            text: '"נהנית מאוד. ומחר אני חוזר לחיים שלי."',
            // F04.3 — *"residence.abroad or flag.armchair_active"*: the life that is elsewhere
            when: { any: [abroad, { flag: 'life:armchair' }] },
            hidden: true,
            then: [
              { e: 'flag', flag: 'f:back' },
              { e: 'flagValue', flag: 'life:ending', value: 'reunion_in_europe' },
              { e: 'rel', who: 'kobi', axis: 'trust', delta: 3 },
              { e: 'remember', who: 'kobi', eventId: 'finale-2026', significance: 'major' },
              // (pass D) the walk before the card — `ridesPassD.ts`, and the last word in `f-last`
              { e: 'flagValue', flag: CLOSE, value: 'mine' },
              { e: 'minigame', id: 'ride:walk-26' },
            ],
          },
        ],
      },
      {
        ...(when ? { when } : {}),
        lines: [
          { who: null, text: 'מחוץ לאולם, אחרי. הרחוב מתרוקן לאט.' },
          // (תנ"ך מהדורה 2, §7 #30) — הערב נגמר בהארכה, והסוף יודע את זה בלי לומר מספר
          { who: 'קובי', text: 'הארכה.' },
          { who: 'פוגי', text: 'הארכה.' },
          { who: 'קובי', text: 'פעם חיכינו עד הדקה השמונים ושש. היום חיכינו עד אחרי הארבעים.' },
          ...extra,
          { who: 'קובי', text: 'נו, מה אתה אומר?' },
          { who: 'פוגי', text: 'על המשחק?' },
          { who: 'קובי', text: 'על הכול.' },
          { who: 'פוגי', text: 'אני עוד חושב.' },
          { who: 'קובי', text: 'אז בוא נאכל בינתיים.' },
        ],
        choices: [
          {
            id: 'father',
            text: '"פעם אתה הובלת אותי. היום רציתי להיות לידך מהצד הזה."',
            then: [
              { e: 'flag', flag: 'f:back' },
              { e: 'flagValue', flag: 'life:ending', value: 'father_and_child' },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 4 },
              { e: 'remember', who: 'kobi', eventId: 'finale-2026', significance: 'major' },
              // (pass D) the walk before the card — `ridesPassD.ts`, and the last word in `f-last`
              { e: 'flagValue', flag: CLOSE, value: 'together' },
              { e: 'minigame', id: 'ride:walk-26' },
            ],
          },
          {
            id: 'three',
            text: '(לתת לו לבחור את הדרך חזרה.)',
            when: party('three'),
            hidden: true,
            then: [
              { e: 'flag', flag: 'f:back' },
              { e: 'flagValue', flag: 'life:ending', value: 'three_generations' },
              { e: 'remember', who: 'kobi', eventId: 'finale-2026', significance: 'major' },
              // (pass D) the walk before the card — `ridesPassD.ts`, and the last word in `f-last`
              { e: 'flagValue', flag: CLOSE, value: 'generations' },
              { e: 'minigame', id: 'ride:walk-26' },
            ],
          },
          {
            id: 'mine',
            text: '"נהנית מאוד. ומחר אני חוזר לחיים שלי."',
            // F04.3 — *"residence.abroad or flag.armchair_active"*: the life that is elsewhere
            when: { any: [abroad, { flag: 'life:armchair' }] },
            hidden: true,
            then: [
              { e: 'flag', flag: 'f:back' },
              { e: 'flagValue', flag: 'life:ending', value: 'reunion_in_europe' },
              { e: 'rel', who: 'kobi', axis: 'trust', delta: 3 },
              { e: 'remember', who: 'kobi', eventId: 'finale-2026', significance: 'major' },
              // (pass D) the walk before the card — `ridesPassD.ts`, and the last word in `f-last`
              { e: 'flagValue', flag: CLOSE, value: 'mine' },
              { e: 'minigame', id: 'ride:walk-26' },
            ],
          },
        ],
      },
    ]),
  },
]
