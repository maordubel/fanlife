import type { LifeEvent } from '../events'
import { missFlag } from '../missReason'
import type { LifeState } from '../types'

import type { Beat } from './beats'
import type { EndingCard } from './chapter1986'
import type { ChoiceDef, Conversation, Say } from './script'
import type { Condition } from '../world/types'
import { PORTRAIT_FOUNDING } from './chapter2007founding'

/**
 * D01–D09 · "עד שהטלפון נופל" · 2010 — הדאבל השני, ושני פרקים מאותה סיבה שהראשון היה.
 *
 * `2000-title` ו-`2000-double` הם דאבל אחד בשני ימים, כי אליפות וגביע הם שני ימים שונים
 * בחיים גם כשהם בשבוע אחד. התסריט כותב את 2010 כפרק אחד בן תשע סצנות, והמנוע מפצל אותו
 * לשניים באותו קו: **`2010-cup`** — החורף, החשבון בקיוסק, הדרבי שנגמר באפס, והגמר — ו-
 * **`2010-teddy`**, ארבעה ימים אחר כך.
 *
 * **שלוש השורות בארכיון, שלושתן בביטחון 2 מוויקיפועל:** 8.5.2010, הדרבי, 0:0; 11.5.2010,
 * גמר הגביע מול בני יהודה, 3:1; 15.5.2010, בטדי, 1:2. אף שורת דיאלוג כאן לא נוקבת
 * בתוצאה — הכרטיס ההיסטורי קורא אותה.
 *
 * **והמשחק המקביל אינו בארכיון, ולכן אינו נאמר.** האליפות הוכרעה ביום האחרון כשמשחק
 * אחר רץ במקביל, ו-`D06` בנוי על *"עדכון מקביל מאומת"*. `matches.json` מחזיק רק את
 * המשחקים של הפועל, כלומר התוצאה המקבילה אינה שורה — ולפי כלל 60 §2 אירוע שאף מקור
 * פומבי כאן לא נושא רשאי להריץ את היום, **ואסור לו לשים מספר בפה של אף אחד**. העדכון
 * הוא עדכון; מה שהוא אומר נשאר בחוץ.
 *
 * **הבטחה שחוצה סצנות.** `D05` מסכם תוכנית חזרה מטדי, ו-`D08` בודק אם היא קוימה. זו
 * הצורה שהמנוע כבר מכיר (`promise_kept`, `promise_renegotiated`, עם `subjectHe` משותף),
 * וזה גם מה ש-`ACH_NEW_PLAN` סופר: שינוי מראש **שאחריו קיום**, על אותו נושא.
 *
 * **החדרים.** `D01` הוא *"מגרש החברים"* ויושב על `pitch` של 1986 עד ש-`pitchSmall` ינחת
 * (`life:places` מדפיס את זה בשמו). **מ-27.9.2026 טדי הוא חדר** (`world/city2027/europe2010.ts`,
 * ציור קונספט של יציע אורחים): מי שנוסע עומד בו — המעקה, הבד, השריקה והכאוס — ויוצא ממנו
 * ברגליים. מי שבסלון או מרחוק רואה אותו כמו קודם, ככרטיס ותג מקום.
 */

/**
 * ============================================ דלתא 90 — תוכנית לפני הערב הכי גדול ====
 *
 * `NARRATIVE-QUEST-DESIGN-PASS-v2` §7 (2010, HIGH-PRIORITY EXPAND): *"I made a plan before
 * the biggest night, the night exploded, and then I had to live with what I promised."*
 * עד היום התוכנית הייתה משפט אחד (*"לסגור רשימה: מי עולה, מי חוזר, ואיך"*) שגבה כרטיס,
 * נתן ארגון ואמון והרים הבטחה — כלומר השחקן **אמר** שהלוגיסטיקה נעשתה. עכשיו:
 *
 * `מי בא (אולי) → המקום האחרון ברכב: אופיר (איסוף מהמשרד בשלוש וחצי) או מתוקי (להוריד
 *  בצד השני בחזרה) → הכסף ביד של אולי (כרטיס ודלק) → עמית: "איך חוזרים?" — להבטיח, או
 *  להגיד את האמת → [איסוף] → המשחק, בלי שום ממשק → השריקה → הכאוס (סוללה אחת, הכיכר,
 *  מתוקי נבלע) → לקיים / לשנות מראש, ובקול / לשכוח → התגובה ברכב → המטבח בבוקר`
 *
 * שלושת הצעדים הראשונים הם דברים שעומדים ברחוב (`world/scenes.ts`, `d10-roster` /
 * `d10-pay` / `d10-promise`), כל אחד נדלק כשהקודם נעשה; המשחק עצמו נשאר כרטיס וזמן, כמו
 * שהיה, והשאלה היחידה אחרי השריקה היא ההבטחה. **התגמול ניתן בתגובה** (`d10-car`), כשעמית
 * רואה אותך מגיע — לא בבחירה. והתוצאה נשארת בחיים (`life:teddy2010`), כדי שפרק מאוחר יזכור.
 *
 * ובחלק הראשון: הבד של אופיר נצבע בידיים ליד הקיוסק (`chore:story:banner-10`), והראיה
 * `group_delivered` נרשמת כשהבד **עולה ביציע** (`d10-banner`), לא כשאמרת שתעזור.
 */

export const PORTRAIT_2010: Record<string, string> = {
  ...PORTRAIT_FOUNDING,
}

/** הנושא של ההבטחה — אותו משפט בדיוק בשני הצדדים, כי זה מה שהמנוע מצליב (כלל 59) */
const RETURN_PROMISE = 'החזרה מטדי'

/** מה שנשאר מהלילה הזה בחיים — `kept` / `renegotiated` / `broken` / `unpromised` / `home` */
export const TEDDY_2010 = 'life:teddy2010'

/** כרטיס לטדי ב-2010 — 120 ₪ (התסריט; פי שניים מ-`TICKET['00s']`, כי זה משחק אליפות באחרון) + 20 דלק לאולי */
const TICKET_TEDDY = 12000
const FUEL_SHARE = 2000
/** מונית חזרה מטדי — 80 ₪, כפי שהתסריט כתב. גם זה מחיר ולא שכר. */
const TAXI_TEDDY = 8000

const VENUE: Condition = { flagIs: { flag: 'd10:mode', value: 'venue' } }

// ------------------------------------------------------------------- Part I ------

export function objectiveCup10(state: LifeState, sceneId: string): string | null {
  if (state.chapterDone) return null
  if (!state.flags['d10:photo']) return sceneId === 'pitch' ? null : 'המגרש של החבר׳ה. תמונה, לפני שהכול משתנה.'
  if (!state.flags['d10:math']) return sceneId === 'kiosk' ? null : 'בקיוסק עמית כבר מחשב.'
  if (!state.flags['d10:derby']) return 'אחרי הדרבי. אפס אפס, והכול רועש.'
  if (!state.flags['d10:week']) return 'שלישי: משמרת, יום הולדת, וגמר. משהו זז.'
  if (!state.flags['d10:cup']) return 'גמר הגביע. הוא לא חימום.'
  if (!state.flags['d10:hooked']) return 'הטלפון. אולי, על שבת.'
  return null
}

export const ENDINGS_CUP10: Record<string, EndingCard> = {
  there: {
    id: 'there',
    titleHe: 'גביע הוא לא חימום',
    bodyHe:
      'היית שם, עם אבא, ומה שקרה באותו ערב קרה באותו ערב — לא כהקדמה לשבת. קובי שאל אם גם לזה יהיה מקום בקופסה, ואמרת שכן, לא על חשבון שבת.',
    memoryHe: 'כרטיס לגמר, בלי קמט.',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
  screen: {
    id: 'screen',
    titleHe: 'מי קופץ ראשון',
    bodyHe:
      'ראיתם מול המסך, ואופיר קפץ ראשון והפיל את השולחן, כמו שאמרת שהוא יעשה. גביע בסלון הוא עדיין גביע, והשולחן שנשבר הוא הוכחה.',
    memoryHe: 'רגל שולחן, מודבקת.',
    memoryItem: 'folded-paper',
    presence: 'television',
  },
  late: {
    id: 'late',
    titleHe: 'עכשיו אפשר לצעוק',
    bodyHe:
      'לא ראית. עמית לא התקשר באמצע, כמו שביקשת, ורק כשהכול נגמר שמעת. צעקת לבד, מאוחר, וזה לא היה פחות.',
    memoryHe: 'הודעה אחת, שנשלחה בזמן הנכון.',
    memoryItem: 'folded-paper',
    presence: 'late',
  },
}

export const BEATS_CUP10: Beat[] = [
  { id: 'd10-photo', at: 'pitch', trigger: 'enter', when: { none: [{ flag: 'd10:photo' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'd10-photo' }] },
  { id: 'd10-math', at: 'kiosk', trigger: 'enter', when: { all: [{ flag: 'd10:photo' }], none: [{ flag: 'd10:math' }] }, delayMs: 600, do: [{ a: 'talk', conversation: 'd10-math' }] },
  /**
   * הבד עולה ביציע — רק אם נצבע עד הסוף (`d10:banner-full`), ולפני שהדרבי נסגר. הוא
   * ראשון ברשימה כדי שלא יורעב ע"י הדרבי, ושומר על עצמו בדגל שלו (כלל 42).
   */
  { id: 'd10-banner', trigger: 'clock', when: { all: [{ flag: 'd10:banner-full' }], none: [{ flag: 'd10:bannerUp' }, { flag: 'd10:derby' }] }, delayMs: 900, do: [{ a: 'talk', conversation: 'd10-banner' }] },
  /** הדרבי והגמר הם רגעים, לא חדרים — שניהם על השעון (כלל 67); כרטיס הוא חתך של יום */
  { id: 'd10-derby', trigger: 'clock', when: { all: [{ flag: 'd10:math' }], none: [{ flag: 'd10:derby' }, { all: [{ flag: 'd10:banner-full' }], none: [{ flag: 'd10:bannerUp' }] }] }, delayMs: 1200, do: [{ a: 'card', titleHe: 'הדרבי', subHe: '8.5.2010', ms: 2000 }, { a: 'talk', conversation: 'd10-derby' }] },
  /**
   * D03→D04 (pass C, 28.9.2026) — **הלוח של השבוע.** שלישי, 11 במאי: משמרת ערב, יום ההולדת של
   * קרן, והגמר. אחד מהם זז, ובקול: להחליף משמרת (ולהיות חייב שבת בבוקר — שבת של טדי), להזיז
   * את קרן לראשון, או להשאיר הכול ולשמוע את הגמר בהודעה. `life:cup2010:owed` נקרא בטדי.
   */
  { id: 'd10-week', trigger: 'clock', when: { all: [{ flag: 'd10:derby' }], none: [{ flag: 'd10:week' }] }, delayMs: 1200, do: [{ a: 'talk', conversation: 'd10-week' }] },
  { id: 'd10-cup', trigger: 'clock', when: { all: [{ flag: 'd10:week' }], none: [{ flag: 'd10:cup' }] }, delayMs: 1400, do: [{ a: 'card', titleHe: 'גמר הגביע', subHe: '11.5.2010', ms: 2000 }, { a: 'talk', conversation: 'd10-cup' }] },
  /** D04→D05 — ארבעה ימים לפני טדי, אולי כבר מתקשר; התשובה (עכשיו, או אחר כך) נקראת ברחוב של שבת */
  { id: 'd10-hook', trigger: 'clock', when: { all: [{ flag: 'd10:cup' }], none: [{ flag: 'd10:hooked' }] }, delayMs: 1600, do: [{ a: 'talk', conversation: 'd10-hook' }] },
]

/** who the swap of the week was paid by — `shift` (a Saturday morning owed), `keren` (Sunday), `none` */
export const CUP2010_OWED = 'life:cup2010:owed'
/** how he answered Oli four days before Teddy — `now` or `later` */
export const TEDDY_ASKED = 'life:teddy2010:asked'

// ------------------------------------------------------------------ Part II ------

export function objectiveTeddy(state: LifeState, sceneId: string): string | null {
  if (state.chapterDone) return null
  if (!state.flags['d10:plan']) {
    if (state.flags['d10:mode'] !== 'venue') return sceneId === 'street' ? null : 'אולי ליד הרכב. מי בא איתו?'
    if (!state.flags['d10:seated']) return 'הרשימה של אולי, על הגג של הרכב. מקום אחד נשאר.'
    if (!state.flags['d10:paid']) return 'אולי מחכה לכסף — כרטיס ודלק.'
    return 'עמית רוצה לדעת איך חוזרים.'
  }
  // (27.9.2026) whoever took the seat stands in the away end — Teddy is a room now
  if (state.flags['d10:mode'] === 'venue' && state.flags['d10:road'] && !state.flags['d10:back']) {
    if (sceneId !== 'teddy') return 'טדי. יציע האורחים.'
    if (!state.flags['d10:title'] && !state.flags['d10:spot']) return 'מקום ליד המעקה. החבר׳ה כבר שם.'
    if (!state.flags['d10:title']) return 'שני מגרשים, לב אחד.'
    if (!state.flags['d10:call']) return 'השריקה. למי אתה מתקשר.'
    return 'מי נשאר מאחור.'
  }
  if (state.flags['d10:mode'] === 'venue' && state.flags['d10:back'] && !state.flags['d10:carDone']) return sceneId === 'teddy' ? 'היציאה משמאל. הרכב של אולי.' : null
  if (!state.flags['d10:title']) return 'שבת. שני מגרשים, לב אחד.'
  if (!state.flags['d10:call']) return 'אחרי השריקה. למי אתה מתקשר.'
  if (!state.flags['d10:back']) return 'מי נשאר מאחור.'
  if (!state.flags['d10:morning']) return sceneId === 'kitchen' ? null : 'בבוקר. מחר עדיין יש כביסה.'
  return null
}

export const ENDINGS_TEDDY: Record<string, EndingCard> = {
  kept: {
    id: 'kept',
    titleHe: 'החלטתי להפתיע',
    bodyHe:
      'דאבל, ובלילה הכי מפתה לשכוח — לא שכחת. עמית חיכה ליד הרכב ואתה הגעת לפני שהוא התחיל לרדוף אחריך. הוא אמר שחשב שיצטרך, ואמרת שגם אתה חשבת.',
    memoryHe: 'הרשימה של אולי, עם וי ליד כל שם.',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
  renegotiated: {
    id: 'renegotiated',
    titleHe: 'סיכום, לא "יהיה בסדר"',
    bodyHe:
      'דאבל, ושינית את התוכנית — אבל לפני, ובקול. אולי לקח את עמית, ואתה חזרת אחרת, ושניהם ידעו איך. זה פחות מרגש מלנסוע יחד, וזה בדיוק העניין.',
    memoryHe: 'קבלה של מונית, מקופלת לשניים.',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
  broken: {
    id: 'broken',
    titleHe: 'זה לא אומר שזה היה בסדר',
    bodyHe:
      'דאבל. ועמית הסתדר בסוף לבד, ואמר את זה בלי לכעוס, מה שהיה גרוע יותר. בבוקר, במטבח, זה עוד ישב שם. יש לילות שהם הכי טובים שהיו לך ובכל זאת חייבים משהו למישהו.',
    memoryHe: 'הודעה שלא ענית עליה בזמן.',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
  unpromised: {
    id: 'unpromised',
    titleHe: 'לא הבטחת, ואמרת',
    bodyHe:
      'דאבל. לא הבטחת לעמית חזרה, ואמרת את זה לפני — אז הוא סגר עם אולי ולא חיכה לך. לא הייתה אכזבה, כי לא היה על מה. זה פחות מחייב, וזה גם פחות.',
    memoryHe: 'כרטיס לטדי, בלי קמט.',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
  home: {
    id: 'home',
    titleHe: 'לסדר את השולחן',
    bodyHe:
      'דאבל, מהסלון, עם אבא. לא היה צריך לאסוף אף אחד מאף חניה. עזרת לסדר את השולחן ואחר כך ישבתם עוד שעה בלי להדליק שום דבר.',
    memoryHe: 'השלט, שאף אחד לא נגע בו כל הערב.',
    memoryItem: 'folded-paper',
    presence: 'television',
  },
}

/**
 * §6 — *"A2 promise to bring bread before five → young adult promises a pickup after Teddy"*.
 * The bread of 1984 is in the ledger as proofs (`promise_renegotiated` when he named the hour,
 * `promise_kept` when the loaf was on the counter in time — `chapterStageA.ts`), and they cross
 * every chapter. The day flag this raises is only what `d10-promise` remembers of it, in
 * Pugi's own head: nobody in the street knows about a loaf of bread from 1984.
 */
function breadMemory(state: LifeState): LifeEvent[] {
  const bread = (kind: string) => state.proofs.some((row) => row.proofId.startsWith(`${kind}:`) && row.proofId.endsWith(':bread'))
  if (bread('promise_kept')) return [{ t: 'flag.raised', flag: 'd10:bread-kept' }]
  if (bread('promise_renegotiated')) return [{ t: 'flag.raised', flag: 'd10:bread-late' }]
  return []
}

export const BEATS_TEDDY: Beat[] = [
  /**
   * pass C (28.9.2026) — **השבת שהוחלפה ביום שלישי.** מי שהחליף את המשמרת של הגמר (`d10-week`)
   * עבד הבוקר משש, ומגיע לרחוב של טדי עייף. לא עונש — חשבון.
   */
  {
    id: 'd10-owed',
    at: 'street',
    trigger: 'enter',
    when: { all: [{ flagIs: { flag: CUP2010_OWED, value: 'shift' } }], none: [{ flag: 'd10:owedPaid' }] },
    delayMs: 300,
    do: [
      { a: 'flag', flag: 'd10:owedPaid' },
      { a: 'card', titleHe: 'שש בבוקר', subHe: 'המשמרת שהחלפת בשביל הגמר', ms: 2200 },
      { a: 'events', events: [{ t: 'energy.changed', delta: -15 }] },
      { a: 'toast', text: 'שבע שעות על הרגליים, ועוד טדי. אולי: "שתית קפה?" — "שלושה."', tone: 'plain' },
    ],
  },
  /** המחויבות — מצב, ועוד לא תוכנית. היא שומרת על עצמה בשני הדגלים, ולכן חוזרת עד שנענתה */
  {
    id: 'd10-plan',
    at: 'street',
    trigger: 'enter',
    when: { none: [{ flag: 'd10:plan' }, { flag: 'd10:mode' }] },
    delayMs: 700,
    // (delta 93) Oli comes off the car to him — the seat is offered, not found
    do: [{ a: 'derive', events: breadMemory }, { a: 'actorCue', actorId: '2010-teddy-oli', cue: 'approach', target: 'player' }, { a: 'talk', conversation: 'd10-plan' }],
  },
  /**
   * (delta 93, brief §23) למה לא טדי — once the plan is home or on the phone, the reason is
   * recorded: a boy whose pocket could not cover the ticket and the petrol missed it for
   * MONEY; everyone else chose. Read off the state at that moment, never guessed later.
   */
  {
    id: 'd10-miss',
    trigger: 'clock',
    when: { all: [{ flag: 'd10:plan' }], any: [{ flagIs: { flag: 'd10:mode', value: 'home' } }, { flagIs: { flag: 'd10:mode', value: 'remote' } }], none: [{ flag: missFlag('2010-teddy') }] },
    do: [{ a: 'derive', events: (state) => [{ t: 'flag.set', flag: missFlag('2010-teddy'), value: state.flags['d10:gaveSeat'] ? 'choice' : state.agorot < TICKET_TEDDY + FUEL_SHARE ? 'money' : 'choice' }] }],
  },
  /** האיסוף מהמשרד — נסיעה שגרתית, דחוסה לכרטיס ושלוש שורות (§7: "compress routine travel") */
  {
    id: 'd10-pickup',
    trigger: 'clock',
    when: { all: [{ flag: 'd10:plan' }, { flag: 'd10:needsPickup' }, VENUE], none: [{ flag: 'd10:pickedUp' }] },
    delayMs: 1200,
    do: [{ a: 'flag', flag: 'd10:pickedUp' }, { a: 'card', titleHe: 'המשרד של אופיר', subHe: '15:40', ms: 2200 }, { a: 'talk', conversation: 'd10-pickup' }],
  },
  /**
   * (27.9.2026) D06 — **טדי הוא חדר.** מי שלקח את המקום ברכב של אולי נוסע אליו באמת
   * (`city2027/europe2010.ts`): כרטיס של דרך, ואז יציע האורחים עצמו — מקום ליד המעקה, הבד
   * של מישהו אחר, השריקה, והכאוס שבולע את מתוקי — ורק אז הדלת משמאל, לחניה. מי שראה
   * מהסלון או מרחוק ממשיך בדיוק כמו קודם: כרטיס, ותג מקום בתיבה.
   */
  {
    id: 'd10-road',
    trigger: 'clock',
    when: { all: [{ flag: 'd10:plan' }, VENUE, { any: [{ notFlag: 'd10:needsPickup' }, { flag: 'd10:pickedUp' }] }], none: [{ flag: 'd10:road' }] },
    delayMs: 1200,
    do: [{ a: 'flag', flag: 'd10:road' }, { a: 'card', titleHe: 'שבת', subHe: 'טדי', ms: 2400 }, { a: 'travel', to: 'teddy', spawn: 'start' }],
  },
  { id: 'd10-away', at: 'teddy', trigger: 'enter', when: { all: [{ flag: 'd10:road' }], none: [{ flag: 'd10:away' }] }, delayMs: 800, do: [{ a: 'crowd', state: 'LOW_MURMUR' }, { a: 'talk', conversation: 'd10-away' }] },
  /** מקום ליד המעקה נלקח — ועכשיו העדכונים מתחילים להגיע */
  { id: 'd10-title-away', at: 'teddy', trigger: 'clock', when: { all: [{ flag: 'd10:away' }, { flag: 'd10:spot' }], none: [{ flag: 'd10:title' }] }, delayMs: 1200, do: [{ a: 'crowd', state: 'BUILDING_TENSION' }, { a: 'talk', conversation: 'd10-title-away' }] },
  /** מי שעומד ולא בוחר מקום — עמית בא אליו עם הטלפון (fail-forward: אין מקום, יש עדכון) */
  {
    id: 'd10-nudge',
    at: 'teddy',
    trigger: 'clock',
    when: { all: [{ flag: 'd10:away' }], none: [{ flag: 'd10:spot' }, { flag: 'd10:title' }] },
    delayMs: 18000,
    do: [{ a: 'actorCue', actorId: '2010-teddy-amit', cue: 'approach', target: 'player' }, { a: 'flag', flag: 'd10:spot' }, { a: 'crowd', state: 'BUILDING_TENSION' }, { a: 'talk', conversation: 'd10-title-away' }],
  },
  {
    id: 'd10-call-away',
    at: 'teddy',
    trigger: 'clock',
    when: { all: [{ flag: 'd10:title' }, VENUE], none: [{ flag: 'd10:call' }] },
    delayMs: 1400,
    do: [{ a: 'sound', kind: 'whistle', blasts: 3 }, { a: 'crowd', state: 'FINAL_WHISTLE' }, { a: 'card', titleHe: 'השריקה', subHe: 'אלופים', ms: 1800 }, { a: 'sound', kind: 'roar', big: 2 }, { a: 'talk', conversation: 'd10-call-away' }],
  },
  { id: 'd10-title', trigger: 'clock', when: { all: [{ flag: 'd10:plan' }], none: [{ flag: 'd10:title' }, VENUE] }, delayMs: 1400, do: [{ a: 'card', titleHe: 'שבת', subHe: 'טדי', ms: 2400 }, { a: 'talk', conversation: 'd10-title' }] },
  { id: 'd10-call', trigger: 'clock', when: { all: [{ flag: 'd10:title' }], none: [{ flag: 'd10:call' }, VENUE] }, delayMs: 1200, do: [{ a: 'card', titleHe: 'השריקה', subHe: 'אלופים', ms: 1800 }, { a: 'talk', conversation: 'd10-call' }] },
  /** הסיבוך — הלילה מתפוצץ, ביציע עצמו. רק למי שנסע; מי שבסלון לא צריך לאסוף אף אחד מאף חניה */
  { id: 'd10-chaos', at: 'teddy', trigger: 'clock', when: { all: [{ flag: 'd10:call' }, VENUE], none: [{ flag: 'd10:chaos' }] }, delayMs: 900, do: [{ a: 'flag', flag: 'd10:chaos' }, { a: 'talk', conversation: 'd10-chaos' }] },
  { id: 'd10-back-away', at: 'teddy', trigger: 'clock', when: { all: [{ flag: 'd10:chaos' }, VENUE], none: [{ flag: 'd10:back' }] }, delayMs: 1200, do: [{ a: 'talk', conversation: 'd10-back' }] },
  {
    id: 'd10-back',
    trigger: 'clock',
    when: { all: [{ flag: 'd10:call' }], none: [{ flag: 'd10:back' }, VENUE] },
    delayMs: 1200,
    do: [{ a: 'talk', conversation: 'd10-back' }],
  },
  /**
   * ברכב — העולם מגיב למה שנעשה עם ההבטחה, והראיה נרשמת כאן (§13). (27.9.2026) הוא יוצא
   * מהיציע בדלת משמאל, והנסיעה היא חתך: כרטיס של איילון, והשיחה מתויגת "בדרך הביתה" —
   * הרחוב שלו הוא המקום שבו הוא נוחת, לא המקום שבו היא נאמרת.
   */
  { id: 'd10-car', at: 'street', trigger: 'clock', when: { all: [{ flag: 'd10:back' }, VENUE], none: [{ flag: 'd10:carDone' }] }, delayMs: 900, do: [{ a: 'card', titleHe: 'איילון', subHe: 'אחרי חצות', ms: 2000 }, { a: 'talk', conversation: 'd10-car' }] },
  {
    id: 'd10-morning',
    at: 'kitchen',
    trigger: 'enter',
    when: { all: [{ flag: 'd10:back' }, { any: [{ flag: 'd10:carDone' }, { none: [VENUE] }] }], none: [{ flag: 'd10:morning' }] },
    delayMs: 700,
    do: [{ a: 'talk', conversation: 'd10-morning' }],
  },
]

// -------------------------------------------------------------- conversations ------

const TITLE_CHOICES: ChoiceDef[] = [
  {
    id: 'ours',
    text: '(להסתכל על המשחק שלנו. רק עליו.)',
    then: [
      { e: 'flag', flag: 'd10:title' },
      { e: 'rel', who: 'amit', axis: 'bond', delta: 2 },
      { e: 'toast', text: 'עמית: "כשיהיה משהו ודאי אני אגיד." — "הפעם אני מאמין לזה."', tone: 'plain' },
    ],
  },
  {
    id: 'verify',
    text: '"רגע. זאת הודעה ישנה."',
    then: [
      { e: 'flag', flag: 'd10:title' },
      { e: 'skill', skill: 'knowledge', delta: 3, why: 'עדכון ישן הוא לא עדכון' },
      { e: 'toast', text: 'אופיר: "אז אל תרים אותי בשביל הודעה ישנה."', tone: 'plain' },
    ],
  },
  {
    id: 'beside',
    text: '(להישאר ליד אבא.)',
    then: [
      { e: 'flag', flag: 'd10:title' },
      { e: 'rel', who: 'kobi', axis: 'bond', delta: 3 },
      { e: 'toast', text: 'קובי: "אל תעזוב רגע." — "אני פה."', tone: 'plain' },
    ],
  },
]

const TITLE_LINES = [
  { who: null, text: 'שבת. שני מגרשים, ואחד מהם הוא שלך.' },
  { who: 'עמית', text: 'יש עדכון.' },
  { who: 'אופיר', text: 'אל תגיד לפני שבדקת.' },
  { who: 'פוגי', text: 'זה אתה אומר?' },
  { who: 'אופיר', text: 'למדתי. כואב, אבל למדתי.' },
  { who: 'קובי', text: 'תראו את המשחק שלכם רגע.' },
]

const PROMISE_LINES = [
  { who: 'עמית', text: 'אני צריך לדעת איך חוזרים. בשש בבוקר אני בעבודה.' },
  { who: 'פוגי', text: 'אחרי האליפות?' },
  { who: 'עמית', text: 'במיוחד אחרי.' },
]

const PROMISE_CHOICES: ChoiceDef[] = [
  {
    id: 'promise',
    text: '"מהשריקה — ישר לרכב. אני מביא אותך הביתה."',
    then: [
      { e: 'flag', flag: 'd10:plan' },
      { e: 'flag', flag: 'promise:return2010' },
      { e: 'toast', text: 'עמית: "רשמתי." — "אתה לא רושם." — "הפעם כן."', tone: 'plain' },
    ],
  },
  {
    id: 'honest',
    text: '"אני לא מבטיח מה שאני לא יודע. תסגור חזרה עם אולי, לא איתי."',
    then: [
      { e: 'flag', flag: 'd10:plan' },
      { e: 'flag', flag: 'd10:unpromised' },
      { e: 'personality', key: 'honesty', delta: 2 },
      { e: 'toast', text: 'עמית: "לפחות אמרת לפני. זה כבר משהו."', tone: 'plain' },
    ],
  },
]

/** D06 בטדי — אותן מילים, אבל אבא בהודעה ולא לידך (התסריט: "ללא התחזות לנוכחות") */
const TITLE_AWAY_LINES = [
  { who: 'עמית', text: 'יש עדכון.' },
  { who: 'אופיר', text: 'אל תגיד לפני שבדקת.' },
  { who: 'פוגי', text: 'זה אתה אומר?' },
  { who: 'אופיר', text: 'למדתי. כואב, אבל למדתי.' },
  { who: 'קובי', text: 'תראו את המשחק שלכם רגע.' },
]

const TITLE_AWAY_CHOICES: ChoiceDef[] = [
  TITLE_CHOICES[0]!,
  TITLE_CHOICES[1]!,
  {
    id: 'beside',
    text: '(לענות לאבא: "אני פה.")',
    then: [
      { e: 'flag', flag: 'd10:title' },
      { e: 'rel', who: 'kobi', axis: 'bond', delta: 3 },
      { e: 'toast', text: 'קובי: "אל תעזוב רגע." — "אני פה."', tone: 'plain' },
    ],
  },
]

/** D05 — the street by Oli's car: the screenplay's opening, and its three answers */
const D10_PLAN_LINES: Say[] = [
  { who: 'אולי', text: 'מי בא איתנו?' },
  { who: 'פוגי', text: 'כולם בסדר.' },
  { who: 'אולי', text: 'לא שאלתי מה שלומם.' },
  { who: 'עמית', text: 'אני צריך לדעת איך חוזרים.' },
  { who: 'אופיר', text: 'אחרי האליפות.' },
  { who: 'אולי', text: 'יופי. זה לא כתוב בלוח האוטובוסים.' },
]
const D10_PLAN_CHOICES: ChoiceDef[] = [
          {
            /**
             * (דלתא 90) ההתחייבות, ולא התוכנית. הרשימה, הכסף והחזרה נעשים ברחוב, אחד
             * אחרי השני. הכסף נבדק כבר כאן — מגבלה צריכה להיות מובנת לפני שהיא עולה (§15).
             */
            id: 'venue',
            text: '(לסגור רשימה: מי עולה, מי חוזר, ואיך.)',
            when: { minAgorot: TICKET_TEDDY + FUEL_SHARE },
            noteHe: 'אין לך כסף לכרטיס ודלק.',
            then: [
              { e: 'flagValue', flag: 'd10:mode', value: 'venue' },
              { e: 'toast', text: 'אולי: "אם מישהו נשאר, הוא אומר. אף אחד לא מנחש."', tone: 'plain' },
            ],
          },
          {
            id: 'kobi',
            text: '"אני רואה עם אבא. בסלון."',
            then: [
              { e: 'flag', flag: 'd10:plan' },
              { e: 'flagValue', flag: 'd10:mode', value: 'home' },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 2 },
              { e: 'toast', text: 'קובי: "תשב כבר. אתה מסתיר עוד לפני שהתחיל."', tone: 'plain' },
            ],
          },
          {
            id: 'remote',
            text: '"תעדכן אותי. הכול, בלי \'תקשיב\'."',
            then: [
              { e: 'flag', flag: 'd10:plan' },
              { e: 'flagValue', flag: 'd10:mode', value: 'remote' },
              { e: 'toast', text: 'עמית: "תוצאה בלבד או הכול?" — "הכול."', tone: 'plain' },
            ],
          },
        ]

export const CONVERSATIONS_2010: Conversation[] = [
  {
    id: 'd10-photo',
    nameHe: 'אפי',
    branches: [
      {
        lines: [
          { who: 'אפי', text: 'תעמדו כמו בפעם הקודמת.' },
          { who: 'אופיר', text: 'בפעם הקודמת הייתי יותר רזה.' },
          { who: 'עמית', text: 'גם התמונה.' },
          { who: 'מתוקי', text: 'מי מצלם?' },
          { who: 'פוגי', text: 'הפעם אתה בפנים. נמצא על מה להניח את המצלמה.' },
        ],
        choices: [
          {
            id: 'metuki',
            text: '(להכניס את מתוקי לתמונה.)',
            then: [
              { e: 'flag', flag: 'd10:photo' },
              { e: 'flag', flag: 'own:photo:group2010' },
              { e: 'rel', who: 'metuki', axis: 'bond', delta: 3 },
              { e: 'toast', text: 'מתוקי: "להביא משהו?" — "נעליים." — "אני אשאל שוב כדי להיות בטוח."', tone: 'plain' },
            ],
          },
          {
            id: 'wait',
            text: '"מחכים שכולם יאשרו. נעשה את זה שבוע הבא."',
            then: [
              { e: 'flag', flag: 'd10:photo' },
              { e: 'skill', skill: 'organization', delta: 2, why: 'מי אישר ומי לא' },
              { e: 'toast', text: 'עמית: "אז באמת מחכים לאישור?" — "למדתי משהו מהקלסר."', tone: 'plain' },
            ],
          },
          {
            id: 'who-came',
            text: '(לצלם את מי שבא. בלי להוסיף, בלי להוריד.)',
            then: [
              { e: 'flag', flag: 'd10:photo' },
              { e: 'flag', flag: 'own:photo:group2010' },
              { e: 'personality', key: 'honesty', delta: 2 },
              { e: 'toast', text: 'אפי: "לא נוסיף אחר כך אנשים שלא באו." — "גם לא נוריד."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'd10-math',
    nameHe: 'עמית',
    branches: [
      {
        lines: [
          { who: 'עמית', text: 'מתמטית יש כאן—' },
          { who: 'אופיר', text: 'לא.' },
          { who: 'עמית', text: 'עוד לא אמרתי כלום.' },
          { who: 'קובי', text: 'בגלל זה עצרו אותך בזמן.' },
          { who: 'פוגי', text: 'רגע, תן לראות.' },
        ],
        choices: [
          {
            id: 'check',
            text: '(לבדוק שתי עובדות. רק שתיים.)',
            then: [
              { e: 'flag', flag: 'd10:math' },
              { e: 'time', minutes: 15 },
              // `documentation` בתסריט → `knowledge` במנוע
              { e: 'skill', skill: 'knowledge', delta: 2, why: 'תנאי, לא תחזית' },
              { e: 'toast', text: 'עמית: "זה תנאי, לא תחזית." — "תכתוב את זה גדול. בשבילנו."', tone: 'plain' },
            ],
          },
          {
            id: 'leave-it',
            text: '"תשאיר לו את החישוב. אני מסתכל על המשחק הבא."',
            then: [
              { e: 'flag', flag: 'd10:math' },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 2 },
              { e: 'toast', text: 'קובי: "החלטה בריאה." — "ממך?"', tone: 'plain' },
            ],
          },
          {
            /**
             * (דלתא 90) הבד נצבע בידיים, על המדרכה ליד הקיוסק (`chore:story:banner-10`), וזה
             * מה שמרים את `d10:math`. הראיה — `terrace.delivery2010` בתסריט →
             * `group_delivered` במנוע — נרשמת רק כשהבד עולה ביציע (`d10-banner`).
             */
            id: 'banner',
            text: '(לעזור לאופיר עם הבד.)',
            then: [{ e: 'minigame', id: 'chore:story:banner-10' }],
          },
        ],
      },
    ],
  },
  {
    /** הבד עולה — ומה שנצבע ליד הקיוסק הוא מה ששער 5 רואה */
    id: 'd10-banner',
    nameHe: 'אופיר',
    where: 'בלומפילד, שער 5',
    branches: [
      {
        lines: [
          { who: null, text: 'בשער 5 הבד עלה, והאותיות שצבעת על המדרכה החזיקו גם מרחוק.' },
          { who: 'אופיר', text: 'רואה? לזה אין נוסחה.' },
        ],
        then: [
          { e: 'flag', flag: 'd10:bannerUp' },
          { e: 'proof', kind: 'group_delivered', proofId: 'group_delivered:{chapter}:banner', subjectHe: 'הבד של 2010', audience: 'gate5', delta: 3 },
        ],
      },
    ],
  },
  {
    id: 'd10-derby',
    nameHe: 'אופיר',
    branches: [
      {
        lines: [
          { who: null, text: 'הדרבי נגמר. אפס אפס.' },
          { who: 'אופיר', text: 'זהו.' },
          { who: 'עמית', text: 'זה לא זהו.' },
          { who: 'אופיר', text: 'תן לי להגיד זהו חמש דקות.' },
          { who: 'פוגי', text: 'חמש. אחר כך נוסעים הביתה.' },
          { who: 'קרן', text: 'מי מכם זוכר שמחר צריך לקום?' },
        ],
        choices: [
          {
            id: 'walk',
            text: '(ללכת ליד אופיר. בלי לעודד.)',
            then: [
              { e: 'flag', flag: 'd10:derby' },
              { e: 'time', minutes: 20 },
              { e: 'rel', who: 'ofir', axis: 'bond', delta: 3 },
              { e: 'toast', text: 'אופיר: "אל תעודד אותי." — "לא תכננתי. אני רק הולך לידך."', tone: 'plain' },
            ],
          },
          {
            id: 'home',
            text: '"אני הולך. מחר צריך לקום."',
            then: [
              { e: 'flag', flag: 'd10:derby' },
              { e: 'wellbeing', key: 'exhaustion', delta: -5 },
              { e: 'toast', text: 'קרן: "אז תגיד שאתה הולך. אל תמציא כאב ראש."', tone: 'plain' },
            ],
          },
          {
            id: 'check',
            text: '(לבדוק מה באמת נשאר. בלי סימני קריאה.)',
            then: [
              { e: 'flag', flag: 'd10:derby' },
              { e: 'skill', skill: 'knowledge', delta: 2, why: 'מה נשאר, בלי לנחש' },
              { e: 'toast', text: 'עמית: "בלי סימני קריאה?" — "היום נגמרו."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'd10-cup',
    nameHe: 'אפי',
    branches: [
      {
        lines: [
          { who: 'אפי', text: 'אתם מדברים רק על שבת.' },
          { who: 'פוגי', text: 'ומה אתה מציע?' },
          { who: 'אפי', text: 'שיש היום גביע.' },
          { who: 'קובי', text: 'פעם היינו מחכים שנים בשביל להגיד את המשפט הזה.' },
          { who: 'עמית', text: 'יש לי נתונים—' },
        ],
        choices: [
          {
            id: 'go',
            text: '(ללכת לגמר, עם אבא.)',
            when: { notFlag: 'd10:cupSkip' },
            noteHe: 'השארת את הערב לקרן ולמשמרת. אמרת את זה בקול.',
            then: [
              { e: 'flag', flag: 'd10:cup' },
              { e: 'time', minutes: 90 },
              { e: 'energy', delta: -8 },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 3 },
              { e: 'presence', mode: 'inside' },
              { e: 'attend' },
              { e: 'flagValue', flag: 'd10:cupKind', value: 'there' },
            ],
          },
          {
            id: 'tv',
            text: '(לראות מהסלון, עם אופיר.)',
            when: { notFlag: 'd10:cupSkip' },
            noteHe: 'השארת את הערב לקרן ולמשמרת. אמרת את זה בקול.',
            then: [
              { e: 'flag', flag: 'd10:cup' },
              { e: 'time', minutes: 90 },
              { e: 'energy', delta: -5 },
              { e: 'rel', who: 'ofir', axis: 'bond', delta: 3 },
              { e: 'presence', mode: 'television' },
              { e: 'toast', text: 'אופיר: "מי קופץ ראשון מפיל את השולחן." — "תזיז אותו עכשיו."', tone: 'plain' },
              { e: 'flagValue', flag: 'd10:cupKind', value: 'screen' },
            ],
          },
          {
            id: 'later',
            text: '"תגיד לי כשזה נגמר. לא באמצע."',
            then: [
              { e: 'flag', flag: 'd10:cup' },
              { e: 'presence', mode: 'late' },
              { e: 'flagValue', flag: 'd10:cupKind', value: 'late' },
            ],
          },
        ],
      },
    ],
  },
  /** D03→D04 (pass C) — the week on the phone: one thing moves, and somebody pays for it */
  {
    id: 'd10-week',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'היומן בטלפון, שלישי, 11 במאי: "משמרת ערב — 17:00". "קרן — יום הולדת, 20:00". ובאמצע, בלי שעה: "גמר".' },
          { who: null, text: 'שלושה דברים בערב אחד. אחד מהם זז, ומישהו משלם על זה.' },
        ],
        choices: [
          {
            id: 'shift',
            text: '(להחליף את המשמרת — ולהיות חייב שבת בבוקר.)',
            then: [
              { e: 'flag', flag: 'd10:week' },
              { e: 'flagValue', flag: CUP2010_OWED, value: 'shift' },
              { e: 'toast', text: 'המחליף: "שבת, שש בבוקר. אתה לא שוכח." — "שבת. שש." (השבת של טדי.)', tone: 'red' },
            ],
          },
          {
            id: 'keren',
            text: '(להתקשר לקרן — להזיז לראשון, עכשיו ולא בשמונה.)',
            then: [
              { e: 'flag', flag: 'd10:week' },
              { e: 'flagValue', flag: CUP2010_OWED, value: 'keren' },
              { e: 'rel', who: 'keren', axis: 'trust', delta: 1 },
              { e: 'rel', who: 'keren', axis: 'tension', delta: 2 },
              { e: 'toast', text: 'קרן: "ראשון. ואתה מביא עוגה, לא תירוץ." — "עוגה."', tone: 'plain' },
            ],
          },
          {
            id: 'none',
            text: '(לא להזיז כלום. הגמר — בהודעה.)',
            then: [
              { e: 'flag', flag: 'd10:week' },
              { e: 'flag', flag: 'd10:cupSkip' },
              { e: 'flagValue', flag: CUP2010_OWED, value: 'none' },
              { e: 'rel', who: 'keren', axis: 'bond', delta: 2 },
              { e: 'toast', text: 'אופיר: "גמר בהודעה?" — "יש לי משמרת ויום הולדת. בסדר הזה."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  /** D04 → D05 (pass C) — four days before Teddy, Oli on the phone: answer now, or later */
  {
    id: 'd10-hook',
    nameHe: 'אולי',
    remote: { 'אולי': 'phone' },
    branches: (['there', 'screen', 'late'] as const).map((kind) => ({
      // the last kind is the fallback: a life that reached Teddy without a cup night still gets the call
      when: kind === 'late' ? undefined : { flagIs: { flag: 'd10:cupKind', value: kind } },
      lines: [
        { who: 'אולי', text: kind === 'there' ? 'ראיתי אותך ביציע עם אבא שלך. עכשיו שבת: טדי. יש לי רכב וארבעה מקומות.' : 'עכשיו שבת: טדי. יש לי רכב וארבעה מקומות.' },
        { who: 'פוגי', text: 'עוד לא ירדתי מהגביע.' },
        { who: 'אולי', text: 'אז תרד. אני סוגר רשימה.' },
      ],
      choices: [
        {
          id: 'now',
          text: '"אני בפנים. תרשום אותי."',
          then: [{ e: 'flag', flag: 'd10:hooked' }, { e: 'flagValue', flag: TEDDY_ASKED, value: 'now' }, { e: 'ending', id: kind }],
        },
        {
          id: 'later',
          text: '"אני אחזור אליך. לא כשאני עוד בגביע."',
          then: [{ e: 'flag', flag: 'd10:hooked' }, { e: 'flagValue', flag: TEDDY_ASKED, value: 'later' }, { e: 'ending', id: kind }],
        },
      ],
    })),
  },
  {
    id: 'd10-plan',
    nameHe: 'אולי',
    // pass C (28.9.2026) — what he answered four days ago on the phone (`d10-hook`) opens the street
    branches: [
      {
        when: { flagIs: { flag: TEDDY_ASKED, value: 'now' } },
        lines: [{ who: 'אולי', text: 'אמרת "תרשום אותי" לפני ארבעה ימים. רשמתי. עכשיו השאר.' }, ...D10_PLAN_LINES],
        choices: D10_PLAN_CHOICES,
      },
      {
        when: { flagIs: { flag: TEDDY_ASKED, value: 'later' } },
        lines: [{ who: 'אולי', text: 'אמרת שתחזור אליי. לא חזרת, אז אני בא אליך.' }, ...D10_PLAN_LINES],
        choices: D10_PLAN_CHOICES,
      },
      {
        lines: D10_PLAN_LINES,
        choices: D10_PLAN_CHOICES,
      },
    ],
  },
  {
    /** המקום האחרון ברכב — שתי אפשרויות, ולכל אחת מחיר שכתוב לידה לפני שבוחרים */
    id: 'd10-roster',
    nameHe: 'אולי',
    branches: [
      {
        lines: [
          { who: 'אולי', text: 'ארבעה מקומות. אני נוהג, אתה לידי, עמית מאחורה — הוא צריך לדעת איך חוזרים.' },
          { who: 'אולי', text: 'נשאר מקום אחד. אני לא מחליט בשבילך.' },
        ],
        choices: [
          {
            id: 'ofir',
            text: '(אופיר. יוצא מהעבודה בשלוש וחצי — לאסוף אותו מהמשרד בדרך.)',
            then: [
              { e: 'flagValue', flag: 'd10:seat', value: 'ofir' },
              { e: 'flag', flag: 'd10:seated' },
              { e: 'flag', flag: 'd10:needsPickup' },
              { e: 'toast', text: 'אופיר: "שלוש וחצי. אני יוצא עם העניבה ביד." — מתוקי ייסע באוטובוס.', tone: 'plain' },
            ],
          },
          {
            id: 'metuki',
            text: '(מתוקי. גר בצד השני של העיר — להוריד אותו בדרך חזרה.)',
            then: [
              { e: 'flagValue', flag: 'd10:seat', value: 'metuki' },
              { e: 'flag', flag: 'd10:seated' },
              { e: 'toast', text: 'מתוקי: "להוריד אותי זה עשרים דקות. אני אזכיר לך." — אופיר ייסע באוטובוס.', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    /** הכסף עובר ביד — או שהמקום עובר למישהו אחר, ואומרים את זה עכשיו */
    id: 'd10-pay',
    nameHe: 'אולי',
    branches: [
      {
        lines: [{ who: 'אולי', text: 'כרטיס מאה עשרים. דלק עשרים לראש. חניה — מה שיוצא.' }],
        choices: [
          {
            id: 'pay',
            text: '(לתת לו מאה ארבעים.)',
            when: { minAgorot: TICKET_TEDDY + FUEL_SHARE },
            noteHe: 'אין לך מאה ארבעים.',
            then: [
              { e: 'money', agorot: -TICKET_TEDDY, why: 'כרטיס לטדי' },
              { e: 'money', agorot: -FUEL_SHARE, why: 'דלק לאולי' },
              { e: 'flag', flag: 'd10:paid' },
              { e: 'toast', text: 'אולי: "סיכמנו." — הוא מקפל את השטרות לתוך הרשימה.', tone: 'plain' },
            ],
          },
          {
            id: 'home',
            text: '(להשאיר את המקום. לראות עם אבא.)',
            then: [
              { e: 'flag', flag: 'd10:plan' },
              { e: 'flagValue', flag: 'd10:mode', value: 'home' },
              { e: 'flag', flag: 'd10:gaveSeat' },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 2 },
              { e: 'toast', text: 'אולי: "אז המקום למי שנשאר ברשימה. טוב שאמרת עכשיו."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    /**
     * ההבטחה — הבגרות של A2 (*"לחם לפני חמש"*): הפעם מישהו צריך לקום בשש לעבודה, והוא
     * שואל עכשיו, לפני, כי אחרי אליפות אף אחד לא שואל. אפשר גם לא להבטיח, ולהגיד את זה.
     */
    id: 'd10-promise',
    nameHe: 'עמית',
    branches: [
      {
        when: { flag: 'd10:bread-kept' },
        lines: [...PROMISE_LINES, { who: null, text: 'פעם, בסמטה, אמרת "לפני חמש" — והלחם היה על השיש. זה היה מזמן. זה אותו משפט.' }],
        choices: PROMISE_CHOICES,
      },
      {
        when: { flag: 'd10:bread-late' },
        lines: [...PROMISE_LINES, { who: null, text: 'פעם, בסמטה, אמרת "לפני חמש", וחמש עברה בלי לחם על השיש. אמא לא כעסה. היא רשמה.' }],
        choices: PROMISE_CHOICES,
      },
      { lines: PROMISE_LINES, choices: PROMISE_CHOICES },
    ],
  },
  {
    id: 'd10-pickup',
    nameHe: 'אופיר',
    where: 'המשרד של אופיר',
    branches: [
      {
        lines: [
          { who: null, text: 'שלוש וארבעים. אופיר יוצא מהבניין עם העניבה ביד ורץ לרכב.' },
          { who: 'אופיר', text: 'הבוס שאל אם זה דחוף. אמרתי שזאת אליפות.' },
          { who: 'אולי', text: 'עכשיו תתפללו לאיילון.' },
        ],
        then: [{ e: 'time', minutes: 25 }],
      },
    ],
  },
  {
    id: 'd10-title',
    nameHe: 'עמית',
    where: 'טדי',
    branches: [
      {
        when: { flagIs: { flag: 'd10:seat', value: 'ofir' } },
        lines: [{ who: null, text: 'הגעתם עם השריקה הראשונה. אופיר עוד מחזיק את העניבה.' }, ...TITLE_LINES],
        choices: TITLE_CHOICES,
      },
      { lines: TITLE_LINES, choices: TITLE_CHOICES },
    ],
  },
  {
    id: 'd10-call',
    nameHe: 'אופיר',
    where: 'טדי',
    branches: [
      {
        lines: [
          { who: null, text: 'השריקה. אלופים.' },
          { who: 'פוגי', text: 'אני לא יודע למי להתקשר.' },
          { who: 'אופיר', text: 'למי שאתה רוצה.' },
          { who: 'פוגי', text: 'כולם מתקשרים.' },
          { who: 'אופיר', text: 'אז פעם אחת לא עמית יחליט לפי טבלה.' },
        ],
        choices: [
          {
            id: 'kobi',
            text: '(להתקשר לאבא.)',
            then: [
              { e: 'flag', flag: 'd10:call' },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 3 },
              { e: 'remember', who: 'kobi', eventId: 'first-call-2010', significance: 'major' },
              { e: 'toast', text: '"אבא?" — "ראיתי." — "אני לא יודע מה להגיד." — "אז אל תגיד. תשאיר רגע."', tone: 'plain' },
            ],
          },
          {
            id: 'efi',
            text: '(להתקשר לאפי.)',
            then: [
              { e: 'flag', flag: 'd10:call' },
              { e: 'rel', who: 'efi', axis: 'bond', delta: 3 },
              { e: 'remember', who: 'efi', eventId: 'first-call-2010', significance: 'major' },
              { e: 'toast', text: 'אפי: "אני שומע אתכם עד לפה." — "רציתי שתהיה רגע בפנים."', tone: 'plain' },
            ],
          },
          {
            id: 'here',
            text: '(להכניס את הטלפון לכיס.)',
            then: [
              { e: 'flag', flag: 'd10:call' },
              { e: 'rel', who: 'ofir', axis: 'bond', delta: 3 },
              { e: 'toast', text: 'אופיר: "תכניס את הטלפון לכיס." — "הוא נפל כבר פעמיים."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    /** הלילה מתפוצץ — ומה שנבחר ברחוב (מי ברכב) הוא מה שמסתבך עכשיו */
    id: 'd10-chaos',
    nameHe: null,
    branches: [
      {
        when: { flagIs: { flag: 'd10:seat', value: 'ofir' } },
        lines: [
          { who: null, text: 'המגרש מתמלא באנשים. מישהו שר לך בפרצוף, והטלפון מראה פס אחד של סוללה.' },
          { who: 'אופיר', text: 'אף אחד לא נוסע עכשיו. כולם בכיכר.' },
        ],
      },
      {
        when: { flagIs: { flag: 'd10:seat', value: 'metuki' } },
        lines: [
          { who: null, text: 'המגרש מתמלא באנשים. מישהו שר לך בפרצוף, והטלפון מראה פס אחד של סוללה.' },
          { who: null, text: 'מתוקי היה לידך לפני דקה. עכשיו יש שם עשרים אנשים שאתה לא מכיר.' },
        ],
      },
      { lines: [{ who: null, text: 'המגרש מתמלא באנשים. מישהו שר לך בפרצוף, והטלפון מראה פס אחד של סוללה.' }] },
    ],
  },
  /**
   * מי נשאר מאחור — **ההבטחה של `d10-promise` נבדקת כאן**, ורק למי שהבטיח.
   *
   * מי שראה מהסלון או מרחוק לא הבטיח שום חזרה, ולכן הענף שלו הוא ערב מקומי ולא
   * בדיקה — "לא צריך לאסוף אותנו מאף חניה". מבחן על הבטחה שלא ניתנה הוא עונש על
   * משהו שלא קרה. (דלתא 90) ומי שנסע ואמר מראש שהוא לא מבטיח — גם הוא לא נבחן.
   */
  {
    id: 'd10-back',
    nameHe: 'אולי',
    // (27.9.2026) נאמרת ביציע עצמו, או בסלון; עמית כבר ליד הרכב, והוא בטלפון
    remote: { 'עמית': 'phone' },
    branches: [
      {
        when: { flag: 'promise:return2010' },
        lines: [
          { who: 'אולי', text: 'עמית איפה?' },
          { who: 'אופיר', text: 'עם כולם.' },
          { who: 'אולי', text: 'שוב המילה הזאת.' },
          { who: 'פוגי', text: 'רגע. אני מתקשר.' },
          { who: 'עמית', text: 'אני ליד הרכב. אתם ליד "כולם".' },
        ],
        choices: [
          {
            id: 'keep',
            text: '(ללכת לרכב. עכשיו.)',
            then: [
              { e: 'flag', flag: 'd10:back' },
              { e: 'flagValue', flag: 'd10:return', value: 'kept' },
              { e: 'time', minutes: 30 },
              { e: 'energy', delta: -10 },
            ],
          },
          {
            id: 'change',
            text: '"אולי, קח את עמית. אני חוזר אחרת, ויש לי סיכום."',
            when: { minAgorot: TAXI_TEDDY },
            noteHe: 'אין לך כסף למונית.',
            then: [
              { e: 'flag', flag: 'd10:back' },
              { e: 'flagValue', flag: 'd10:return', value: 'renegotiated' },
              { e: 'time', minutes: 30 },
              { e: 'money', agorot: -TAXI_TEDDY, why: 'מונית מטדי' },
            ],
          },
          {
            id: 'forget',
            text: '(להישאר עם כולם.)',
            then: [
              { e: 'flag', flag: 'd10:back' },
              { e: 'flagValue', flag: 'd10:return', value: 'broken' },
              { e: 'rel', who: 'amit', axis: 'bond', delta: -4 },
              { e: 'rel', who: 'amit', axis: 'trust', delta: -8 },
              { e: 'wellbeing', key: 'regret', delta: 6 },
              { e: 'toast', text: 'עמית: "בסוף הסתדרתי. זה לא אומר שזה היה בסדר."', tone: 'red' },
            ],
          },
        ],
      },
      {
        when: { flag: 'd10:unpromised' },
        lines: [
          { who: 'אולי', text: 'עמית איפה?' },
          { who: 'אופיר', text: 'עם כולם.' },
          { who: 'עמית', text: 'אני ליד הרכב. לא הבטחת — אז לא חיכיתי.' },
        ],
        then: [{ e: 'flag', flag: 'd10:back' }, { e: 'flagValue', flag: 'd10:return', value: 'unpromised' }],
      },
      {
        lines: [
          { who: 'קובי', text: 'לא צריך לאסוף אותנו מאף חניה.' },
          { who: 'פוגי', text: 'רק לעזור לסדר את השולחן.' },
        ],
        then: [{ e: 'flag', flag: 'd10:back' }, { e: 'flagValue', flag: 'd10:return', value: 'home' }, { e: 'flagValue', flag: TEDDY_2010, value: 'home' }],
      },
    ],
  },
  {
    /**
     * ברכב — מה שנעשה עם ההבטחה, כפי שעמית רואה אותו. הראיה של ההבטחה נרשמת **כאן**,
     * כשהוא רואה אותך מגיע (או את המונית שסיכמת), ולא ברגע שבחרת ללכת.
     *
     * **אותו `proofId` בשני הענפים שקיימו, ובכוונה.** זו אותה הבטחה שקוימה, לא שנייה.
     * `tests/life-ledger` סופר ראיות לפי מזהה ודורש שלכל מזהה יהיה נושא משלו — *"להבטיח
     * את אותו דבר ארבע פעמים זו הבטחה אחת"* — ושני מזהים על "החזרה מטדי" היו הופכים
     * לילה אחד לשתי הבטחות בפנקס של `ACH_RELIABLE`.
     */
    id: 'd10-car',
    nameHe: 'עמית',
    where: 'בדרך הביתה',
    branches: [
      {
        when: { all: [{ flagIs: { flag: 'd10:return', value: 'kept' } }, { flagIs: { flag: 'd10:seat', value: 'metuki' } }] },
        lines: [
          { who: 'עמית', text: 'חשבתי שאצטרך לרדוף אחריך.' },
          { who: 'פוגי', text: 'גם אני. החלטתי להפתיע.' },
          { who: null, text: 'את מתוקי מצאתם ליד השער, עם צעיף של מישהו אחר. הורדתם אותו בצד השני של העיר, ועמית נרדם במושב האחורי.' },
        ],
        then: [
          { e: 'flag', flag: 'd10:carDone' },
          { e: 'flagValue', flag: TEDDY_2010, value: 'kept' },
          { e: 'remember', who: 'amit', eventId: 'teddy2010-kept', significance: 'major' },
          { e: 'time', minutes: 20 },
          { e: 'rel', who: 'amit', axis: 'trust', delta: 5 },
          { e: 'rel', who: 'metuki', axis: 'bond', delta: 2 },
          { e: 'proof', kind: 'promise_kept', proofId: 'promise_kept:{chapter}:return', subjectHe: RETURN_PROMISE, noteHe: 'הגיע לרכב לפני שמישהו התחיל לחפש.' },
        ],
      },
      {
        when: { flagIs: { flag: 'd10:return', value: 'kept' } },
        lines: [
          { who: 'עמית', text: 'חשבתי שאצטרך לרדוף אחריך.' },
          { who: 'פוגי', text: 'גם אני. החלטתי להפתיע.' },
          { who: null, text: 'אופיר נשאר בכיכר. "תגיד לעמית שהוא מפסיד." עמית אמר שהוא לא.' },
        ],
        then: [
          { e: 'flag', flag: 'd10:carDone' },
          { e: 'flagValue', flag: TEDDY_2010, value: 'kept' },
          { e: 'remember', who: 'amit', eventId: 'teddy2010-kept', significance: 'major' },
          { e: 'rel', who: 'amit', axis: 'trust', delta: 5 },
          { e: 'proof', kind: 'promise_kept', proofId: 'promise_kept:{chapter}:return', subjectHe: RETURN_PROMISE, noteHe: 'הגיע לרכב לפני שמישהו התחיל לחפש.' },
        ],
      },
      {
        when: { flagIs: { flag: 'd10:return', value: 'renegotiated' } },
        lines: [
          { who: 'אולי', text: 'אני לוקח את עמית. אתה מאשר שאתה חוזר אחרת?' },
          { who: 'פוגי', text: 'כן, יש לי סיכום. לא "יהיה בסדר".' },
          { who: null, text: 'עמית הרים יד מהחלון האחורי. במונית ספרת את העודף פעמיים.' },
        ],
        then: [
          { e: 'flag', flag: 'd10:carDone' },
          { e: 'flagValue', flag: TEDDY_2010, value: 'renegotiated' },
          { e: 'remember', who: 'amit', eventId: 'teddy2010-renegotiated', significance: 'minor' },
          { e: 'rel', who: 'amit', axis: 'trust', delta: 2 },
          { e: 'proof', kind: 'promise_renegotiated', proofId: 'promise_renegotiated:{chapter}:return', subjectHe: RETURN_PROMISE, noteHe: 'שינה את התוכנית לפני, ובקול.' },
          { e: 'proof', kind: 'promise_kept', proofId: 'promise_kept:{chapter}:return', subjectHe: RETURN_PROMISE, noteHe: 'שינה את הדרך מראש, והגיע בה.' },
        ],
      },
      {
        when: { flagIs: { flag: 'd10:return', value: 'broken' } },
        lines: [
          { who: null, text: 'כשהגעת לחניה, הרכב של אולי כבר לא היה שם.' },
          { who: null, text: 'בטלפון, על הפס האחרון: "הסתדרתי."' },
        ],
        then: [{ e: 'flag', flag: 'd10:carDone' }, { e: 'flagValue', flag: TEDDY_2010, value: 'broken' }, { e: 'remember', who: 'amit', eventId: 'teddy2010-broken', significance: 'major' }],
      },
      {
        lines: [{ who: null, text: 'הרכב של אולי יצא בלעדיך, כמו שסיכמתם. חזרת באוטובוס של שתיים, עם כל העיר.' }],
        then: [{ e: 'flag', flag: 'd10:carDone' }, { e: 'flagValue', flag: TEDDY_2010, value: 'unpromised' }],
      },
    ],
  },
  // ------------------------------------------------ טדי, מבפנים (27.9.2026) ------
  {
    /** ההגעה — אולי נשאר למטה, והחבר׳ה עולים לבטון */
    id: 'd10-away',
    nameHe: 'עמית',
    branches: [
      {
        lines: [
          { who: null, text: 'טדי. יציע האורחים, והבטון עוד חם מהשמש. אולי נשאר למטה לחפש חניה.' },
          { who: 'אופיר', text: 'תראה אותם. כולם באו.' },
          { who: 'עמית', text: 'יש פה פס אחד של קליטה. אני מחזיק את הטלפון גבוה.' },
          { who: 'פוגי', text: 'רק אל תגיד לי כלום לפני שבדקת.' },
        ],
        then: [{ e: 'flag', flag: 'd10:away' }],
      },
    ],
  },
  {
    /** איפה עומדים — לראות, או לשמוע. שני מקומות, ומה שכל אחד עולה */
    id: 'd10-spot',
    nameHe: null,
    branches: [
      {
        lines: [{ who: null, text: 'המעקה מלא עד הכתפיים. יש מקום אחד בשורה הראשונה, ומקום מאחור, ליד עמית, איפה שיש קליטה.' }],
        choices: [
          {
            id: 'rail',
            text: '(לשורה הראשונה. לראות, לא לשמוע.)',
            then: [
              { e: 'flag', flag: 'd10:spot' },
              { e: 'flagValue', flag: 'd10:spotAt', value: 'rail' },
              { e: 'redheart', key: 'terraceCulture', delta: 2 },
              { e: 'toast', text: 'אתה רואה כל דשא. את מה שקורה במגרש השני תשמע אחרון.', tone: 'plain' },
            ],
          },
          {
            id: 'phone',
            text: '(מאחור, ליד עמית והטלפון.)',
            then: [
              { e: 'flag', flag: 'd10:spot' },
              { e: 'flagValue', flag: 'd10:spotAt', value: 'phone' },
              { e: 'rel', who: 'amit', axis: 'bond', delta: 1 },
              { e: 'toast', text: 'עמית מרים את הטלפון מעל הראשים. חצי מהדשא מוסתר לך.', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    /** הבד של מישהו אחר, על המעקה — לקשור לידו משהו שלך, לחזק אותו, או להשאיר */
    id: 'd10-cloth',
    nameHe: null,
    branches: [
      {
        lines: [{ who: null, text: 'על המעקה תלוי בד אדום-לבן של מישהו אחר, קשור בחוט אחד. הרוח מהמגרש כבר מושכת אותו.' }],
        choices: [
          {
            id: 'scarf',
            text: '(לקשור לידו את הצעיף שלך.)',
            then: [
              { e: 'flag', flag: 'd10:cloth' },
              { e: 'flagValue', flag: 'd10:clothKind', value: 'scarf' },
              { e: 'redheart', key: 'terraceCulture', delta: 2 },
              { e: 'toast', text: 'הצעיף על המעקה. מאחוריך מישהו מרים אגודל.', tone: 'plain' },
            ],
          },
          {
            id: 'knot',
            text: '(לחזק את הקשר שלו. זה לא שלך, אבל זה שלנו.)',
            then: [
              { e: 'flag', flag: 'd10:cloth' },
              { e: 'flagValue', flag: 'd10:clothKind', value: 'knot' },
              { e: 'personality', key: 'responsibility', delta: 2 },
              { e: 'toast', text: 'קשר כפול. הבד מפסיק לרעוד.', tone: 'plain' },
            ],
          },
          {
            id: 'leave',
            text: '(להשאיר. מי שתלה — יקשור.)',
            then: [{ e: 'flag', flag: 'd10:cloth' }, { e: 'flagValue', flag: 'd10:clothKind', value: 'left' }],
          },
        ],
      },
    ],
  },
  {
    /** מה שנשאר על המעקה — לפני השריקה, ואחריה */
    id: 'd10-scarf',
    nameHe: null,
    branches: [
      { when: { flag: 'd10:call' }, lines: [{ who: null, text: 'מישהו שאתה לא מכיר שר עם הצעיף שלך ביד. זה בסדר. הוא יחזיר אותו למעקה.' }] },
      { lines: [{ who: null, text: 'הצעיף שלך, בין הבד של מישהו אחר לדשא.' }] },
    ],
  },
  {
    /** D06 ביציע עצמו — אבא בטלפון, והחבר׳ה לידך. אותן שלוש הבחירות, בלי תג מקום */
    id: 'd10-title-away',
    nameHe: 'עמית',
    remote: { 'קובי': 'phone' },
    branches: [
      {
        when: { flagIs: { flag: 'd10:spotAt', value: 'rail' } },
        lines: [{ who: null, text: 'מהשורה הראשונה הכול קרוב — הדשא, הקווים, הגב של השוער. הטלפון של עמית רחוק שלוש שורות.' }, ...TITLE_AWAY_LINES],
        choices: TITLE_AWAY_CHOICES,
      },
      { lines: [{ who: null, text: 'הטלפון של עמית מעל הראשים, והמסך שלו נדלק ונכבה.' }, ...TITLE_AWAY_LINES], choices: TITLE_AWAY_CHOICES },
    ],
  },
  {
    /** D07 ביציע — השריקה כבר נשמעה; למי מתקשרים, או את מי מחבקים */
    id: 'd10-call-away',
    nameHe: 'אופיר',
    branches: [
      {
        lines: [
          { who: null, text: 'השריקה. אלופים. היציע קופץ, והמעקה רועד תחת הידיים.' },
          { who: 'פוגי', text: 'אני לא יודע למי להתקשר.' },
          { who: 'אופיר', text: 'למי שאתה רוצה.' },
          { who: 'פוגי', text: 'כולם מתקשרים.' },
          { who: 'אופיר', text: 'אז פעם אחת לא עמית יחליט לפי טבלה.' },
        ],
        choices: [
          {
            id: 'kobi',
            text: '(להתקשר לאבא. להרים את הטלפון אל היציע, שישמע.)',
            then: [
              { e: 'flag', flag: 'd10:call' },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 3 },
              { e: 'remember', who: 'kobi', eventId: 'first-call-2010', significance: 'major' },
              { e: 'toast', text: '"אבא?" — "אני שומע אתכם מפה." — "אני לא יודע מה להגיד." — "אז אל תגיד. תחזיק את הטלפון עוד רגע."', tone: 'plain' },
            ],
          },
          {
            id: 'efi',
            text: '(להתקשר לאפי.)',
            then: [
              { e: 'flag', flag: 'd10:call' },
              { e: 'rel', who: 'efi', axis: 'bond', delta: 3 },
              { e: 'remember', who: 'efi', eventId: 'first-call-2010', significance: 'major' },
              { e: 'toast', text: 'אפי: "אני שומע אתכם עד לפה." — "רציתי שתהיה רגע בפנים."', tone: 'plain' },
            ],
          },
          {
            id: 'here',
            text: '(להכניס את הטלפון לכיס ולחבק את אופיר.)',
            then: [
              { e: 'flag', flag: 'd10:call' },
              { e: 'rel', who: 'ofir', axis: 'bond', delta: 3 },
              { e: 'toast', text: 'אופיר: "תכניס את הטלפון לכיס." — "הוא נפל כבר פעמיים."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'd10-morning',
    nameHe: 'רחל',
    branches: [
      {
        lines: [
          { who: 'רחל', text: 'אכלת משהו?' },
          { who: 'פוגי', text: 'אמא, לקחנו דאבל.' },
          { who: 'רחל', text: 'שמעתי. שאלתי אם אכלת.' },
          { who: 'פוגי', text: 'לא יודע.' },
          { who: 'רחל', text: 'אז תתחיל מזה. את הטבלה נסדר אחר כך.' },
        ],
        choices: [
          {
            id: 'sit',
            text: '(לשבת איתה ולספר.)',
            then: [
              { e: 'flag', flag: 'd10:morning' },
              { e: 'time', minutes: 15 },
              { e: 'rel', who: 'rachel', axis: 'bond', delta: 3 },
              { e: 'toast', text: 'רחל: "עכשיו, מה אתה זוכר?" — "את מי שהיה איתי."', tone: 'plain' },
            ],
          },
          /**
           * **רחל אינה נותנת מחילה במקום עמית** — זו השורה של התסריט, והיא הסיבה שהבחירה
           * הזאת פונה אל עמית ולא אליה. היא מופיעה רק למי שהשאיר אותו מאחור: הודאה על
           * משהו שלא קרה היא דרמה בלי סיבה.
           */
          {
            id: 'amit',
            text: '(להתקשר לעמית ולהגיד מה קרה.)',
            when: { flagIs: { flag: 'd10:return', value: 'broken' } },
            hidden: true,
            then: [
              { e: 'flag', flag: 'd10:morning' },
              { e: 'rel', who: 'amit', axis: 'bond', delta: 1 },
              { e: 'personality', key: 'honesty', delta: 3 },
              { e: 'toast', text: 'עמית: "קודם תגיד מה קרה." — "אמרתי שאדאג לחזרה ולא דאגתי."', tone: 'plain' },
            ],
          },
          {
            id: 'sleep',
            text: '(ללכת לישון עוד קצת.)',
            then: [
              { e: 'flag', flag: 'd10:morning' },
              { e: 'energy', delta: 25 },
              { e: 'wellbeing', key: 'exhaustion', delta: -10 },
              { e: 'toast', text: 'רחל: "לך. הסיפור לא בורח." — "הפעם אני יודע."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'd10-close',
    nameHe: null,
    branches: [
      { when: { flagIs: { flag: 'd10:return', value: 'kept' } }, lines: [{ who: null, text: 'הרשימה של אולי נשארה ברכב. וי ליד כל שם.' }], then: [{ e: 'flag', flag: 'd10:done' }, { e: 'ending', id: 'kept' }] },
      { when: { flagIs: { flag: 'd10:return', value: 'renegotiated' } }, lines: [{ who: null, text: 'המונית עצרה ליד הבית, בדיוק כמו שאמרת לאולי.' }], then: [{ e: 'flag', flag: 'd10:done' }, { e: 'ending', id: 'renegotiated' }] },
      { when: { flagIs: { flag: 'd10:return', value: 'broken' } }, lines: [{ who: null, text: 'במטבח זה עוד ישב שם.' }], then: [{ e: 'flag', flag: 'd10:done' }, { e: 'ending', id: 'broken' }] },
      { when: { flagIs: { flag: 'd10:return', value: 'unpromised' } }, lines: [{ who: null, text: 'הכרטיס נשאר בכיס של המעיל, מקופל פעם אחת.' }], then: [{ e: 'flag', flag: 'd10:done' }, { e: 'ending', id: 'unpromised' }] },
      { lines: [{ who: null, text: 'השלט נשאר על השולחן כל הערב.' }], then: [{ e: 'flag', flag: 'd10:done' }, { e: 'ending', id: 'home' }] },
    ],
  },
]

/** הסגירה של החלק השני — על השעון, אחרי הבוקר (כלל 67); `d10:done` מורם בשיחה, כך שהיא חוזרת אם נסגרה */
BEATS_TEDDY.push({
  id: 'd10-close',
  trigger: 'clock',
  when: { all: [{ flag: 'd10:morning' }], none: [{ flag: 'd10:done' }] },
  delayMs: 1000,
  do: [{ a: 'talk', conversation: 'd10-close' }],
})
