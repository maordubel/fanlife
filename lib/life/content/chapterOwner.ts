import { CONFLICT_CHOICES, conflictFlag } from '../routes'
import type { LifeState } from '../types'

import type { Beat } from './beats'
import type { EndingCard } from './chapter1986'
import type { Branch, ChoiceDef, Conversation, Effect, Say } from './script'
import type { Condition } from '../world/types'
import { PORTRAIT_CAREER } from './chapterCareer'

/**
 * חלון OWNER — O01–O05 · "ענף בעלות בדיוני", קיץ 2025.
 *
 * **איך הוא נפתח:** `own:route:OWNER:practice` — מי שכבר שותף בעסק (הדרגה השנייה של מסלול
 * היוזם). O01 היא שאלה, לא פרס: *"לבדוק כשירות לעסקת שליטה בלי לקנות תואר במילה"*.
 *
 * **הפיצול מוצהר ומבוקש.** התסריט: *"הכניסה למסלול העסקה דורשת אישור מפורש של ענף
 * היסטוריה חלופית ... הכדורגל שאחריו בדיוני"*. לכן O01.1 כותבת `life:owner:fork` רק אחרי
 * שהשחקן אמר במפורש שזה ענף בדיוני, ושתי התשובות האחרות נשארות בהיסטוריה המתועדת. *"נשמרת
 * שמירה היסטורית לפני הפיצול"* — ההתחלה של הפרק הזה היא הנקודה הזאת: הפרק מתחיל לפני
 * O01, ומי שמתחיל אותו מחדש חוזר להיסטוריה.
 *
 * **השערים של התסריט, בשפה של המנוע — ובלי להמציא כלכלה.** התסריט מונה *"P=100, R=40
 * יחידות עסקיות בדיוניות; F חייב להיות לפחות 140"*, ו*"אמון 75"* עם מיכל ואדם. למנוע אין
 * יחידות עסקיות, ולהמציא אותן כאן היה לבנות מערכת שנייה של כסף לצד הארנק (כלל 59). מה
 * שיש לו הוא דרגת השיא של אותו מסלול, `OWNER:apex` — *"שלושה שותפים: trust>=65"*, *"ללא
 * חוב שהגיע זמנו"*, עסקים 75 וארגון 55 (`routes.ts`) — כלומר בדיוק צוות שמסכים וכיסוי
 * שאינו סופר פעמיים את אותו כסף. **O02.1 ו-O03.1 פתוחות רק למי שבשיא**, ואפורות לכל השאר
 * עם המשפט שאומר מה חסר. כל האחרות פתוחות, ורובן עוצרות את העסקה בכבוד — וזו כוונת
 * התסריט: *"זו החלטה עסקית. לא בושה."*
 *
 * **O04 — הערב שהובטח.** `PARTNER_OR_KEREN` בתסריט: בן/בת הזוג אם יש (`life:partner`,
 * `partner.ts`), ואחרת קרן. שני ענפים, אותן בחירות.
 */

export const PORTRAIT_OWNER: Record<string, string> = {
  ...PORTRAIT_CAREER,
  'פרדי': 'faceFreddy',
}

const APEX = { flag: 'own:route:OWNER:apex' } as const
/** the conflict, already settled by the route's own scene — `conflictFlag` in `routes.ts` */
const SETTLED = CONFLICT_CHOICES.map((choice) => ({ flag: conflictFlag(choice) }))
const APEX_NOTE_TEAM = 'צוות כזה נבנה בשותפות — מי שכבר שותף בעלות (השיא של המסלול) מכיר מי יסכים.'
const APEX_NOTE_MONEY = 'כיסוי מלא בלי חוב שהגיע זמנו — זה השער של שותף בעלות, והוא עוד לא שם.'

/**
 * ================================ המשולש שאי אפשר למקסם — pass D, 28.9.2026 ====
 *
 * `IMPLEMENTATION-PASS-PROGRAMMER` §60: *"money / sporting need / trust; cannot max all"* —
 * ו-*"3–4 approaches, only 1–2 can be completed before the pressure closes"*. עד היום הפרק היה
 * ארבע שיחות ברצף, וכל אחת שאלה "כן/לא". עכשיו, אחרי הפיצול, **במשרד עומדות ארבע גישות
 * בבת אחת**, כל אחת במקום אחר בחדר, וכל אחת עולה זמן אחר:
 *
 * - **הכסף** (הלוח של מיכל, 35 דק׳) — מימון מחויב לשיא המסלול, או הלוואת גישור לכל השאר
 *   (`life:owner:bridge` — והיא נגבית ביום שני).
 * - **שותף מבחוץ** (פרדי, 15 דק׳) — פותר את פינת הכסף מהר, ועולה בשליטה.
 * - **המגרש** (המנהל המקצועי בווידאו, 30 דק׳) — שני שחקנים לפני שהחלון נסגר.
 * - **האנשים** (יבגני ליד החלון, 40 דק׳) — ספרים פתוחים, או כיסא לאוהדים.
 *
 * המוכר רוצה תשובה **עד שמונה**. ברגע ששתי פינות סגורות — או כשהשעון מגיע — עמית מתקשר
 * (`o-verdict`), והתשובה נבנית ממה שנעשה, לא ממה שנאמר. כסף בלי אמון עובר את המוכר ונופל
 * על מיכל ואדם (`o-team`: *"money does not solve trust"*); אמון בלי כסף משאיר את יבגני ליד
 * השולחן ואת העסקה בחוץ. אין שילוב שמנצח בכל שלוש.
 *
 * `life:owner:triangle` הוא הזיכרון, והוא נקרא בסוף החיים (`2026-finale`, ההליכה האחרונה).
 */
export const TRIANGLE = 'life:owner:triangle'
export const DEADLINE = 20 * 60
const MIN_MONEY = 35
const MIN_PARTNER = 15
const MIN_SQUAD = 30
const MIN_FANS = 40
const tri = (corner: 'money' | 'squad' | 'fans' | 'partner'): Condition => ({ flag: `o:tri:${corner}` })
/** the money corner is closed by either the board or the partner */
const MONEY_CORNER: Condition = { any: [tri('money'), tri('partner')] }
const TWO_CORNERS: Condition = { any: [{ all: [MONEY_CORNER, tri('squad')] }, { all: [MONEY_CORNER, tri('fans')] }, { all: [tri('squad'), tri('fans')] }] }

export function objectiveOwner(state: LifeState, sceneId: string): string | null {
  const f = state.flags
  if (state.chapterDone) return null
  if (!f['o:fork']) return sceneId === 'office' ? null : 'במשרד. עמית ופרדי, וסכום שהוא לא תוצאה.'
  if (!f['o:verdict']) {
    if (sceneId !== 'office') return 'במשרד. עד שמונה.'
    if (!f['o:brief']) return null
    const done = ['money', 'partner', 'squad', 'fans'].filter((c) => f[`o:tri:${c}`]).length
    return done === 0 ? 'עד שמונה. הכסף, המגרש, האנשים — זמן לשניים.' : 'עוד פינה אחת. מה נשאר בחוץ?'
  }
  if (f['o:dealGo'] && !f['o:team']) return sceneId === 'office' ? null : 'מיכל ואדם במשרד. מי יעבוד איתך.'
  if (!f['o:sign']) return sceneId === 'home' ? null : 'בבית. הערב שהובטח, והעסקה.'
  const unsettled = f['own:route:JOURNALIST:entry'] && !f['o:conflict'] && !SETTLED.some((row) => f[row.flag])
  if (f['o:signGo'] && unsettled) return sceneId === 'newsroom' ? null : 'במערכת. שני, ומי כותב על הבעלים.'
  if (!f['o:monday']) return sceneId === 'ticket-office' ? null : 'יום שני. הקופה, והשירות לאוהדים.'
  return null
}

export const ENDINGS_OWNER: Record<string, EndingCard> = {
  influence: {
    id: 'influence',
    titleHe: 'בלי לקרוא לעצמי בעלים',
    bodyHe:
      'נשארת בהיסטוריה המתועדת ובחרת השפעה בלי שליטה. פרדי אמר שתבדקו תפקיד שמתאים לזה, ואמרת שאתה לא צריך לקרוא לעצמך בעלים כדי לעשות משהו.',
    memoryHe: 'דף אחד, בלי חתימה.',
    memoryItem: 'folded-paper',
  },
  declined: {
    id: 'declined',
    titleHe: 'לא היום',
    bodyHe:
      'ויתרת על העסקה והמשכת בחיים שבנית. עמית שאל אם אתה בטוח, ואמרת שאתה בטוח שאתה לא רוצה לחתום היום — וזה היה מספיק ביטחון.',
    memoryHe: 'הצעה, מקופלת לשניים.',
    memoryItem: 'folded-paper',
  },
  pilot: {
    id: 'pilot',
    titleHe: 'בלי לדרוש שתאמיני מראש',
    bodyHe:
      'התחלתם מפרויקט ניסיון לפני עסקה. מיכל אמרה שתבצעו משהו קטן יחד ותראו איך אתה עובד, ואמרת שבלי לדרוש שתאמין מראש. העסקה חיכתה; האמון התחיל.',
    memoryHe: 'חוזה קטן, לעבודה אחת.',
    memoryItem: 'folded-paper',
  },
  deferred: {
    id: 'deferred',
    titleHe: 'עדיף לדעת עכשיו',
    bodyHe:
      'הבנת שאין צוות זמין ועצרת את העסקה הזאת. אדם אמר שעדיף שתדע את זה עכשיו, והוא צדק.',
    memoryHe: 'רשימת תפקידים, ריקה.',
    memoryItem: 'folded-paper',
  },
  partner: {
    id: 'partner',
    titleHe: 'שותף. בלי לנפח',
    bodyHe:
      'הכנסתם שותף, והסכמת שאולי לא תהיה בעל שליטה. עמית אמר שתכתבו את התואר האמיתי, ואמרת: שותף. בלי לנפח.',
    memoryHe: 'כרטיס ביקור, עם התואר הנכון.',
    memoryItem: 'folded-paper',
  },
  withdrawn: {
    id: 'withdrawn',
    titleHe: 'לא בכל מחיר',
    bodyHe:
      'נסוגת כי העתודה לא הספיקה. מיכל אמרה שזו החלטה עסקית ולא בושה, ואמרת שזה כואב מספיק גם בלי לקרוא לזה בושה.',
    memoryHe: 'גיליון מספרים, עם עמודה אחת קצרה מדי.',
    memoryItem: 'folded-paper',
  },
  missed: {
    id: 'missed',
    titleHe: 'הפעם אני מוותר',
    bodyHe:
      'ויתרת על חלון העסקה הזה. עמית אמר שלא יוכלו להבטיח שאותה הצעה תחזור, ואמרת שאתה מבין — ושהפעם אתה מוותר.',
    memoryHe: 'לוח זמנים, עם שבוע מחוק.',
    memoryItem: 'folded-paper',
  },
  /** (pass D) the fans' corner, without the money one: the deal fell, the table did not */
  trust_first: {
    id: 'trust_first',
    titleHe: 'יבגני נשאר ליד השולחן',
    bodyHe:
      'לא היה כסף לעתודה, והמוכר לא חיכה. אבל יבגני ישב איתך שעה על הספרים, ובסוף אמר שבפעם הבאה שתבוא עם עסקה — הוא יבוא איתך. זה לא בעלות. זה מה שבא לפניה.',
    memoryHe: 'דף מספרים, עם הערה בכתב יד של מישהו אחר.',
    memoryItem: 'folded-paper',
  },
  service: {
    id: 'service',
    titleHe: 'לא רק מספר אנשים שענו להם',
    bodyHe:
      'השקעתם שתים-עשרה בשירות ושמונה בפיתוח. אדם אמר שיקצרו את ההמתנה וימדדו תלונות שנפתרו, ואמרת: לא רק מספר אנשים שענו להם. ביום שני פתחתם.',
    memoryHe: 'המפתח של הקופה.',
    memoryItem: 'folded-paper',
  },
  balanced: {
    id: 'balanced',
    titleHe: 'נסביר מה עוד לא נעשה',
    bodyHe:
      'שמונה בשירות, שש בפיתוח, ושש נשמרו לעתודה. מיכל אמרה פחות הבטחות היום ויותר גמישות אחר כך, ואמרת שתסבירו מה עוד לא נעשה.',
    memoryHe: 'תקציב, עם שורה שנשארה ריקה בכוונה.',
    memoryItem: 'folded-paper',
  },
  delegated: {
    id: 'delegated',
    titleHe: 'לא נעלם מאחורי המינוי',
    bodyHe:
      'מינית הנהלה לביצוע ופיקחת על שלושה יעדים. אדם אמר שהם מבצעים ואתה עדיין אחראי לבדוק, ואמרת שאתה לא נעלם מאחורי המינוי.',
    memoryHe: 'שלושה יעדים, עם תאריך בדיקה.',
    memoryItem: 'folded-paper',
  },
}

export const BEATS_OWNER: Beat[] = [
  // O01 — המשרד (`officeOwner`, 21.9.2026)
  { id: 'o-fork', at: 'office', trigger: 'enter', when: { none: [{ flag: 'o:fork' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'o-fork' }] },
  /** (pass D) S1 — the constraints, all in the room at once: the seller's hour, the board, the phone in his pocket */
  { id: 'o-brief', at: 'office', trigger: 'clock', when: { all: [{ flag: 'o:forkGo' }], none: [{ flag: 'o:brief' }] }, delayMs: 900, do: [{ a: 'talk', conversation: 'o-brief' }] },
  /**
   * (pass D) S2 → S3 — the seller's call. Two corners closed, or eight o'clock, whichever
   * first; the office door is shut until it comes (`office` in `rooms2000.ts`).
   */
  {
    id: 'o-verdict',
    at: 'office',
    trigger: 'clock',
    when: { all: [{ flag: 'o:brief' }], none: [{ flag: 'o:verdict' }], any: [TWO_CORNERS, { afterMinute: DEADLINE }] },
    delayMs: 1100,
    do: [{ a: 'talk', conversation: 'o-verdict' }],
  },
  /** S3 — the human meeting, only for a deal still alive after the seller */
  { id: 'o-team', at: 'office', trigger: 'clock', when: { all: [{ flag: 'o:dealGo' }], none: [{ flag: 'o:team' }] }, delayMs: 1300, do: [{ a: 'talk', conversation: 'o-team' }] },
  { id: 'o-sign', at: 'home', trigger: 'enter', when: { all: [{ flag: 'o:moneyGo' }], none: [{ flag: 'o:sign' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'o-sign' }] },
  /**
   * `Q06` (COMBINATIONS) — *"מי כותב על הבעלים"*. רק למי שהיה פעם עיתונאי
   * (`JOURNALIST:entry` — "ever", כמו `conflictOfInterest`) ועוד לא הכריע את ניגוד העניינים.
   * התסריט סוגר דלת אחת במפורש: *"אין אפשרות להיות גם בעל שליטה וגם כתב עצמאי המסקר את
   * אותו מועדון"* — ולכן שלוש הבחירות כאן הן שתיים מתוך `CONFLICT_CHOICES`, ו-
   * `disclose_and_pay` לא מוצע. זו אותה הכרעה של `route-conflict-of-interest`, בפי שני.
   */
  {
    id: 'o-conflict',
    // Q06 *"מערכת / שיחה עם שני"* — במערכת שמעל בית הקפה, לא בבית
    at: 'newsroom',
    trigger: 'enter',
    when: { all: [{ flag: 'o:signGo' }, { flag: 'own:route:JOURNALIST:entry' }], none: [{ flag: 'o:conflict' }, ...SETTLED] },
    delayMs: 1200,
    do: [{ a: 'talk', conversation: 'o-conflict' }],
  },
  {
    id: 'o-monday',
    at: 'ticket-office',
    trigger: 'enter',
    when: { all: [{ flag: 'o:signGo' }], none: [{ flag: 'o:monday' }], any: [{ flag: 'o:conflict' }, { notFlag: 'own:route:JOURNALIST:entry' }, ...SETTLED] },
    delayMs: 700,
    do: [{ a: 'talk', conversation: 'o-monday' }],
  },
]

const SIGN_CHOICES = (who: 'PARTNER' | 'קרן') => [
  {
    id: 'delegate',
    text: '(להאציל את החלק המוסכם — ולשמור את הערב.)',
    then: [
      { e: 'flag' as const, flag: 'o:sign' },
      { e: 'flag' as const, flag: 'o:signGo' },
      { e: 'flagValue' as const, flag: 'life:owner:role', value: 'controlling_owner' },
      { e: 'proof' as const, kind: 'business_proof', proofId: 'business_proof:{chapter}:transaction', subjectHe: 'העסקה', audience: 'work' as const, delta: 4, noteHe: 'כל השערים, הסכמת מוכר, לוח זמנים ומימון — ולא שמועה שהומרה להסכם.' },
      { e: 'toast' as const, text: 'אדם: "אני מטפל בחלק שלי. החתימה שלך נשארת במועד שקבענו." — "תודה. זה בדיוק ההסכם."', tone: 'plain' as const },
    ],
  },
  {
    id: 'reschedule',
    text: '(לתאם שינוי בערב בהסכמה — ולבצע את העסקה.)',
    then: [
      { e: 'flag' as const, flag: 'o:sign' },
      { e: 'flag' as const, flag: 'o:signGo' },
      { e: 'flagValue' as const, flag: 'life:owner:role', value: 'controlling_owner' },
      { e: 'proof' as const, kind: 'business_proof', proofId: 'business_proof:{chapter}:transaction', subjectHe: 'העסקה', audience: 'work' as const, delta: 4, noteHe: 'בוצעה אחרי שהערב הוזז בהסכמה, לא בניחוש.' },
      { e: 'toast' as const, text: `${who === 'PARTNER' ? '' : 'קרן: '}"אפשר להזיז למחר. אני מסכימה, לא ניחשתי בשבילך." — "תודה. מחר רשום."`, tone: 'plain' as const },
    ],
  },
  {
    id: 'pass',
    text: '(לוותר על חלון העסקה הזה.)',
    then: [
      { e: 'flag' as const, flag: 'o:sign' },
      { e: 'flagValue' as const, flag: 'life:owner:offer', value: 'missed_by_choice' },
      { e: 'toast' as const, text: 'עמית: "לא נוכל להבטיח שאותה הצעה תחזור." — "אני מבין. הפעם אני מוותר."', tone: 'plain' as const },
      { e: 'ending' as const, id: 'missed' },
    ],
  },
]

/**
 * (pass D) **the seller's call** — what the hour produced, read corner by corner. First match
 * wins, so the order is the order of the questions: did somebody else's money close it; did
 * money close it at all; and if not, what did the hour buy instead.
 */
const triangle = (value: string): Effect => ({ e: 'flagValue', flag: TRIANGLE, value })
const verdictGo = (value: string, toast: string): ChoiceDef => ({
  id: 'go',
  text: '(לאשר למוכר — ולקרוא למיכל ולאדם.)',
  then: [
    { e: 'flag', flag: 'o:verdict' },
    { e: 'flag', flag: 'o:money' },
    { e: 'flag', flag: 'o:dealGo' },
    triangle(value),
    { e: 'toast', text: toast, tone: 'plain' },
  ],
})
const WITHDRAW: ChoiceDef = {
  id: 'withdraw',
  text: '(לסגת — העתודה לא מספיקה.)',
  then: [
    { e: 'flag', flag: 'o:verdict' },
    { e: 'flag', flag: 'o:money' },
    { e: 'flagValue', flag: 'life:owner:offer', value: 'withdrawn' },
    { e: 'proof', kind: 'not_at_any_price', proofId: 'not_at_any_price:{chapter}:owner', subjectHe: 'העסקה שלא בכל מחיר', noteHe: 'נסוג כשהעתודה לא הספיקה.' },
    { e: 'toast', text: 'מיכל: "זו החלטה עסקית. לא בושה." — "כואב מספיק גם בלי לקרוא לזה בושה."', tone: 'plain' },
    { e: 'ending', id: 'withdrawn' },
  ],
}
const PARTNER_CHOICES = (value: string): ChoiceDef[] => [
  {
    id: 'partner',
    text: '(לחתום עם השותף. שותף, בלי לנפח.)',
    then: [
      { e: 'flag', flag: 'o:verdict' },
      { e: 'flag', flag: 'o:money' },
      { e: 'flagValue', flag: 'life:owner:role', value: 'minority_partner' },
      triangle(value),
      { e: 'ending', id: 'partner' },
    ],
  },
  { ...WITHDRAW, then: [...WITHDRAW.then.slice(0, -1), triangle(value), { e: 'ending', id: 'withdrawn' }] },
]
const VERDICT: Branch[] = [
  {
    when: { all: [tri('partner'), tri('fans')] },
    lines: [
      { who: null, text: 'הטלפון של עמית. הוא מניח אותו על השולחן, על רמקול.' },
      { who: 'עמית', text: 'המוכר מסכים. עם השותף של פרדי, הכסף סגור.' },
      { who: 'יבגני', text: 'ומי השותף?' },
      { who: 'פרדי', text: 'מישהו שלא צריך להכיר.' },
      { who: 'יבגני', text: 'פתחת לי ספרים שעה, ואת השם הזה אני לא מקבל?' },
    ],
    choices: PARTNER_CHOICES('partner_trust'),
  },
  {
    when: { all: [tri('partner'), tri('squad')] },
    lines: [
      { who: null, text: 'הטלפון של עמית. הוא מניח אותו על השולחן, על רמקול.' },
      { who: 'עמית', text: 'המוכר מסכים. עם השותף של פרדי, הכסף סגור, ושני השחקנים איתו.' },
      { who: 'פרדי', text: 'השותף כבר שאל למה שניים ולא אחד.' },
      { who: 'פוגי', text: 'עוד לא חתמנו.' },
      { who: 'פרדי', text: 'זה מה שאמרתי. הוא כבר שואל.' },
    ],
    choices: PARTNER_CHOICES('partner_squad'),
  },
  {
    when: tri('partner'),
    lines: [
      { who: null, text: 'הטלפון של עמית. הוא מניח אותו על השולחן, על רמקול.' },
      { who: 'עמית', text: 'המוכר מסכים. עם השותף, הכסף סגור. חוץ מזה — לא עשינו כלום.' },
      { who: 'מיכל', text: 'אז קנית חצי מועדון עם שעה וחצי של שקט.' },
    ],
    choices: PARTNER_CHOICES('partner'),
  },
  {
    when: { all: [tri('money'), tri('squad')] },
    lines: [
      { who: null, text: 'הטלפון של עמית. הוא מניח אותו על השולחן, על רמקול.' },
      { who: 'עמית', text: 'המוכר מסכים. יש עתודה, ויש שני שחקנים.' },
      { who: null, text: 'ביבגני אף אחד לא נגע. הוא עדיין ליד החלון, עם הטלפון שלו, והוא קורא משהו.' },
      { who: 'יבגני', text: 'קראתי בחדשות על שני שחקנים. מעניין. גם אני שומע את זה פעם ראשונה.' },
    ],
    choices: [verdictGo('money_squad', 'עמית: "סגרתי." — יבגני יוצא בלי להגיד שלום. הדלת נסגרת לאט.'), WITHDRAW],
  },
  {
    when: { all: [tri('money'), tri('fans')] },
    lines: [
      { who: null, text: 'הטלפון של עמית. הוא מניח אותו על השולחן, על רמקול.' },
      { who: 'עמית', text: 'המוכר מסכים. יש עתודה.' },
      { who: 'המנהל המקצועי', text: 'ואני? שלחתי רשימה לפני שעה וחצי.' },
      { who: 'פוגי', text: 'העונה הזאת נעבוד עם מה שיש.' },
      { who: 'המנהל המקצועי', text: 'אז אל תגיד לי אחר כך שהבטחת משהו.' },
    ],
    choices: [verdictGo('money_trust', 'עמית: "סגרתי." — יבגני, מהחלון: "אז עכשיו אנחנו בודקים אותך."'), WITHDRAW],
  },
  {
    when: tri('money'),
    lines: [
      { who: null, text: 'שמונה. הטלפון של עמית.' },
      { who: 'עמית', text: 'המוכר מסכים. יש כסף. עוד לא סגרת שום דבר אחר.' },
      { who: 'מיכל', text: 'כסף בלי תוכנית. זה מתחיל להיות מוכר.' },
    ],
    choices: [verdictGo('money_only', 'עמית: "סגרתי. עכשיו תמצא לזה משמעות."'), WITHDRAW],
  },
  {
    when: { all: [tri('squad'), tri('fans')] },
    lines: [
      { who: null, text: 'הטלפון של עמית. הוא לא מניח אותו על השולחן.' },
      { who: 'עמית', text: 'המוכר שאל על העתודה. אמרתי לו את האמת.' },
      { who: 'המנהל המקצועי', text: 'הבטחת לי שני שחקנים בכסף שאין?' },
      { who: 'יבגני', text: 'לפחות הוא הראה לנו איפה אין.' },
    ],
    choices: [
      {
        id: 'table',
        text: '(להשאיר את העסקה בחוץ — ואת יבגני ליד השולחן.)',
        then: [
          { e: 'flag', flag: 'o:verdict' },
          { e: 'flag', flag: 'o:money' },
          triangle('squad_trust'),
          { e: 'flagValue', flag: 'life:owner:offer', value: 'fell_trust_kept' },
          { e: 'rel', who: 'yevgeny', axis: 'bond', delta: 2 },
          { e: 'ending', id: 'trust_first' },
        ],
      },
    ],
  },
  {
    when: tri('fans'),
    lines: [
      { who: null, text: 'שמונה. הטלפון של עמית.' },
      { who: 'עמית', text: 'המוכר לא מחכה. אין עתודה, אין עסקה.' },
      { who: 'יבגני', text: 'אז ישבנו שעה בשביל כלום?' },
      { who: 'פוגי', text: 'ישבנו שעה. זה לא כלום.' },
    ],
    choices: [
      {
        id: 'table',
        text: '(להשאיר את העסקה בחוץ — ואת יבגני ליד השולחן.)',
        then: [
          { e: 'flag', flag: 'o:verdict' },
          { e: 'flag', flag: 'o:money' },
          triangle('trust_only'),
          { e: 'flagValue', flag: 'life:owner:offer', value: 'fell_trust_kept' },
          { e: 'ending', id: 'trust_first' },
        ],
      },
    ],
  },
  {
    when: tri('squad'),
    lines: [
      { who: null, text: 'שמונה. הטלפון של עמית.' },
      { who: 'עמית', text: 'המוכר לא מחכה. אין עתודה, אין עסקה.' },
      { who: 'המנהל המקצועי', text: 'והחוזים ששלחתי?' },
      { who: 'פוגי', text: 'נשארים אצלך. אני מצטער.' },
    ],
    choices: [{ ...WITHDRAW, then: [...WITHDRAW.then.slice(0, -1), triangle('squad_only'), { e: 'ending', id: 'withdrawn' }] }],
  },
  {
    lines: [
      { who: null, text: 'שמונה. הטלפון של עמית.' },
      { who: 'עמית', text: 'המוכר שאל מה החלטנו.' },
      { who: 'פוגי', text: 'שום דבר עוד.' },
      { who: 'עמית', text: 'אז זה מה שאמרתי לו.' },
    ],
    choices: [
      {
        id: 'pass',
        text: '(לוותר על חלון העסקה הזה.)',
        then: [
          { e: 'flag', flag: 'o:verdict' },
          { e: 'flag', flag: 'o:money' },
          triangle('none'),
          { e: 'flagValue', flag: 'life:owner:offer', value: 'missed_by_choice' },
          { e: 'toast', text: 'עמית: "לא נוכל להבטיח שאותה הצעה תחזור." — "אני מבין. הפעם אני מוותר."', tone: 'plain' },
          { e: 'ending', id: 'missed' },
        ],
      },
    ],
  },
]

/** S3 — Michal and Adam answer what the hour did before they answer him */
const TEAM_OPENERS: ReadonlyArray<readonly [Condition | null, Say[]]> = [
  [{ flagIs: { flag: TRIANGLE, value: 'money_squad' } }, [
    { who: 'אדם', text: 'קנית עונה. עכשיו תקנה אמון — ואת זה לא מוכרים בטלפון.' },
  ]],
  [{ flagIs: { flag: TRIANGLE, value: 'money_trust' } }, [
    { who: 'מיכל', text: 'יבגני יצא מפה עם דף של מספרים. זה לא קורה אצלנו הרבה.' },
  ]],
  [null, [
    { who: 'מיכל', text: 'יש כסף. אין תוכנית. בוא נתחיל מאיתנו.' },
  ]],
]


/** Monday, in the words of whoever the seller's hour left out */
const MONDAY_OPENERS: ReadonlyArray<readonly [Condition | null, Say[]]> = [
  [{ flag: 'life:owner:bridge' }, [
    { who: 'מיכל', text: 'לפני הכול: הגשר. הבנק התקשר הבוקר, ולא כדי לברך.' },
  ]],
  [{ flagIs: { flag: TRIANGLE, value: 'money_squad' } }, [
    { who: 'אדם', text: 'המנהל המקצועי קיבל את שלו. בשער 5 תלו בבוקר דף: "ומה איתנו?"' },
  ]],
  [{ flagIs: { flag: 'o:tri:fans', value: 'seat' } }, [
    { who: 'אדם', text: 'יבגני כבר ביקש את הכיסא שלו לישיבה של יום רביעי. בכתב.' },
  ]],
  [null, []],
]

export const CONVERSATIONS_OWNER: Conversation[] = [
  {
    id: 'o-fork',
    nameHe: 'פרדי',
    branches: [
      {
        lines: [
          { who: 'עמית', text: 'הפעם זה באמת סכום, לא תוצאה.' },
          { who: 'פוגי', text: 'אני רואה.' },
          { who: 'פרדי', text: 'ואתה רואה מה לא מופיע בשורה הראשונה?' },
          { who: 'פוגי', text: 'ההפעלה שאחרי.' },
          { who: 'פרדי', text: 'יופי. עכשיו אפשר להתחיל.' },
          { who: null, text: 'מכאן והלאה זה ענף בדיוני: עסקת שליטה בהפועל בכדורגל שלא קרתה. ההיסטוריה המתועדת נשארת בנקודה שבה הפרק התחיל.' },
        ],
        choices: [
          {
            id: 'fork',
            text: '(לאשר את הענף הבדיוני — ולבדוק את התנאים.)',
            then: [
              { e: 'flag', flag: 'o:fork' },
              { e: 'flag', flag: 'o:forkGo' },
              { e: 'flag', flag: 'life:owner:fork' },
              { e: 'proof', kind: 'fork_acknowledged', proofId: 'fork_acknowledged:{chapter}:owner', subjectHe: 'הענף הבדיוני', noteHe: 'אישר במפורש שמה שאחרי הוא בדיון.' },
              { e: 'toast', text: 'עמית: "בודקים לפני שמתחייבים." — "הפעם אני רוצה לדעת גם מה יקרה בבוקר שאחרי."', tone: 'plain' },
            ],
          },
          {
            id: 'influence',
            text: '(להישאר בהיסטוריה המתועדת — ולבחור השפעה בלי שליטה.)',
            then: [
              { e: 'flag', flag: 'o:fork' },
              { e: 'flagValue', flag: 'life:owner:interest', value: 'influence' },
              { e: 'toast', text: 'פרדי: "אז נבדוק תפקיד שמתאים לזה." — "אני לא צריך לקרוא לעצמי בעלים כדי לעשות משהו."', tone: 'plain' },
              { e: 'ending', id: 'influence' },
            ],
          },
          {
            id: 'decline',
            text: '(לוותר על העסקה — ולהמשיך בחיים שבניתי.)',
            then: [
              { e: 'flag', flag: 'o:fork' },
              { e: 'flagValue', flag: 'life:owner:interest', value: 'declined' },
              { e: 'toast', text: 'עמית: "אתה בטוח?" — "אני בטוח שאני לא רוצה לחתום היום."', tone: 'plain' },
              { e: 'ending', id: 'declined' },
            ],
          },
        ],
      },
    ],
  },
  // ------------------------------------------------ S1 — the constraints (pass D) ------
  {
    id: 'o-brief',
    nameHe: 'עמית',
    remote: { PARTNER: 'phone', 'קרן': 'phone' },
    branches: [
      {
        when: { flag: 'life:partner' },
        lines: [
          { who: 'עמית', text: 'המוכר רוצה תשובה עד שמונה. לא שמונה וחמש.' },
          { who: 'מיכל', text: 'שלושה דברים על השולחן, וזמן לשניים: הכסף, המגרש, והאנשים.' },
          { who: 'פרדי', text: 'ויש דרך רביעית. היא מהירה, והיא לא בחינם.' },
          { who: null, text: 'הטלפון רוטט בכיס.' },
          { who: 'PARTNER', text: 'שמונה וחצי. אתה זוכר?' },
        ],
        then: [{ e: 'flag', flag: 'o:brief' }, { e: 'time', minutes: 5 }],
      },
      {
        lines: [
          { who: 'עמית', text: 'המוכר רוצה תשובה עד שמונה. לא שמונה וחמש.' },
          { who: 'מיכל', text: 'שלושה דברים על השולחן, וזמן לשניים: הכסף, המגרש, והאנשים.' },
          { who: 'פרדי', text: 'ויש דרך רביעית. היא מהירה, והיא לא בחינם.' },
          { who: null, text: 'הטלפון רוטט בכיס.' },
          { who: 'קרן', text: 'שמונה וחצי אצלי. אתה זוכר, או שאני מבשלת לעצמי?' },
        ],
        then: [{ e: 'flag', flag: 'o:brief' }, { e: 'time', minutes: 5 }],
      },
    ],
  },
  // ----------------------------------------- S2 — four approaches, two corners (pass D) ------
  {
    id: 'o-tri-money',
    nameHe: 'מיכל',
    branches: [
      {
        lines: [
          { who: 'עמית', text: 'מאה זה המחיר.' },
          { who: 'פוגי', text: 'ויש מאה.' },
          { who: 'מיכל', text: 'ואז ביום שני מה משלמים?' },
          { who: 'פוגי', text: 'עוד ארבעים עתודה.' },
          { who: 'מיכל', text: 'עכשיו זאת אותה שיחה.' },
        ],
        choices: [
          {
            id: 'covered',
            text: '(להתקדם עם מימון מחויב — וכיסוי מלא.)',
            when: { all: [APEX, { beforeMinute: DEADLINE - MIN_MONEY }] },
            noteHe: APEX_NOTE_MONEY,
            then: [
              { e: 'flagValue', flag: 'o:tri:money', value: 'covered' },
              { e: 'time', minutes: MIN_MONEY },
              { e: 'rel', who: 'michal', axis: 'trust', delta: 2 },
              { e: 'proof', kind: 'business_proof', proofId: 'business_proof:{chapter}:coverage', subjectHe: 'הכיסוי לעסקה', audience: 'work', delta: 3, noteHe: 'מחיר ועתודה, וקופת החברים והחיסכון של הבית לא נספרו.' },
              { e: 'toast', text: 'מיכל: "הכסף הזה זמין, והעתודה נשארת להפעלה." — "לא חגיגה לפני שהמספרים נסגרים."', tone: 'plain' },
            ],
          },
          {
            id: 'bridge',
            text: '(הלוואת גישור — העתודה על חשבון השנה הבאה.)',
            when: { beforeMinute: DEADLINE - MIN_MONEY },
            noteHe: 'חצי שעה ועוד עם הבנק, ואין חצי שעה ועוד עד שמונה.',
            then: [
              { e: 'flagValue', flag: 'o:tri:money', value: 'bridge' },
              { e: 'flagValue', flag: 'life:owner:bridge', value: true },
              { e: 'time', minutes: MIN_MONEY },
              { e: 'rel', who: 'michal', axis: 'trust', delta: -2 },
              { e: 'toast', text: 'מיכל: "גשר זה כסף שמישהו אחר יחזיר ביום שני. אתה." — "אני יודע מי."', tone: 'red' },
            ],
          },
          { id: 'later', text: '(עוד לא. קודם להסתכל על השאר.)', then: [] },
        ],
      },
    ],
  },
  {
    id: 'o-tri-partner',
    nameHe: 'פרדי',
    branches: [
      {
        lines: [
          { who: 'פרדי', text: 'יש לי מישהו. כסף מחר בבוקר, בלי בנק ובלי גשר.' },
          { who: 'פוגי', text: 'ומה הוא רוצה?' },
          { who: 'פרדי', text: 'חצי. ושתשאל אותו לפני שאתה מחליט משהו שעולה כסף.' },
          { who: 'פוגי', text: 'כלומר תמיד.' },
          { who: 'פרדי', text: 'כלומר תמיד.' },
        ],
        choices: [
          {
            id: 'partner',
            text: '(להכניס שותף — ולהסכים שאולי לא אהיה בעל שליטה.)',
            when: { beforeMinute: DEADLINE - MIN_PARTNER },
            noteHe: 'רבע שעה בטלפון, ואין רבע שעה עד שמונה.',
            then: [
              { e: 'flagValue', flag: 'o:tri:partner', value: 'outside' },
              { e: 'time', minutes: MIN_PARTNER },
              { e: 'rel', who: 'freddy', axis: 'trust', delta: 2 },
              { e: 'toast', text: 'עמית: "אז נכתוב את התואר האמיתי." — "שותף. בלי לנפח."', tone: 'plain' },
            ],
          },
          { id: 'later', text: '(לא עכשיו. אולי בכלל לא.)', then: [] },
        ],
      },
    ],
  },
  {
    id: 'o-tri-squad',
    nameHe: 'המנהל המקצועי',
    remote: { 'המנהל המקצועי': 'video' },
    branches: [
      {
        lines: [
          { who: null, text: 'על המחשב, בווידאו: המנהל המקצועי, עם דף של שמות שרובם מחוקים.' },
          { who: 'המנהל המקצועי', text: 'שני שחקנים לפני שהחלון נסגר. בלי זה אני מתחיל עונה עם תשעה בריאים.' },
          { who: 'פוגי', text: 'ואם זה אחד?' },
          { who: 'המנהל המקצועי', text: 'אז אני מתחיל עם עשרה ומתפלל. אני לא מבקש יותר ממה שצריך.' },
        ],
        choices: [
          {
            id: 'two',
            text: '(להתחייב לשני השחקנים — מתוך העתודה.)',
            when: { beforeMinute: DEADLINE - MIN_SQUAD },
            noteHe: 'חצי שעה של חוזים, ואין חצי שעה עד שמונה.',
            then: [
              { e: 'flagValue', flag: 'o:tri:squad', value: 'two' },
              { e: 'time', minutes: MIN_SQUAD },
              { e: 'toast', text: 'המנהל המקצועי: "סוף סוף מישהו שקורא עד הסוף." — מיכל, מהצד: "והעתודה קראה את זה?"', tone: 'plain' },
            ],
          },
          { id: 'later', text: '(לבקש ממנו לחכות. אולי אחרי שמונה.)', then: [] },
        ],
      },
    ],
  },
  {
    id: 'o-tri-fans',
    nameHe: 'יבגני',
    branches: [
      {
        lines: [
          { who: null, text: 'יבגני ליד החלון. הוא בא בלי שהזמינו אותו, ואף אחד לא ביקש ממנו ללכת.' },
          { who: 'יבגני', text: 'אתם באים עם מספרים. אנחנו באים עם שאלה אחת.' },
          { who: 'פוגי', text: 'תשאל.' },
          { who: 'יבגני', text: 'מי מחליט כמה עולה שער 5. ואם זה אתה — למה שנאמין לך.' },
        ],
        choices: [
          {
            id: 'books',
            text: '(לפתוח לו את הספרים. את כל העמודות.)',
            when: { beforeMinute: DEADLINE - MIN_FANS },
            noteHe: 'ארבעים דקות על הספרים, ואין ארבעים עד שמונה.',
            then: [
              { e: 'flag', flag: 'o:tri:fans' },
              { e: 'flagValue', flag: 'o:tri:fans', value: 'books' },
              { e: 'time', minutes: MIN_FANS },
              { e: 'rel', who: 'yevgeny', axis: 'trust', delta: 4 },
              { e: 'rel', who: 'michal', axis: 'bond', delta: -1 },
              { e: 'toast', text: 'יבגני, בעמוד האחרון: "העמודה הזאת, של העתודה — היא אמיתית?" — "היא הסיבה שאני פה."', tone: 'plain' },
            ],
          },
          {
            id: 'seat',
            text: '(להבטיח כיסא לאוהדים — עם קול, לא רק עם כיסא.)',
            when: { beforeMinute: DEADLINE - MIN_FANS },
            noteHe: 'ארבעים דקות של ניסוח, ואין ארבעים עד שמונה.',
            then: [
              { e: 'flag', flag: 'o:tri:fans' },
              { e: 'flagValue', flag: 'o:tri:fans', value: 'seat' },
              { e: 'flagValue', flag: 'life:owner:fanseat', value: true },
              { e: 'time', minutes: MIN_FANS },
              { e: 'rel', who: 'yevgeny', axis: 'trust', delta: 3 },
              { e: 'rel', who: 'yevgeny', axis: 'bond', delta: 2 },
              { e: 'toast', text: 'יבגני: "כיסא עם קול. תכתוב את זה, כי אני כבר שמעתי כיסאות בלי."', tone: 'plain' },
            ],
          },
          { id: 'later', text: '(לבקש ממנו לחכות.)', then: [{ e: 'toast', text: 'יבגני: "חיכיתי עשרים שנה. אני לא הולך לשום מקום."', tone: 'plain' }] },
        ],
      },
    ],
  },
  // --------------------------------------------- the seller's call (pass D) ------
  {
    id: 'o-verdict',
    nameHe: 'עמית',
    // the coach is still on the laptop screen from the squad corner
    remote: { 'המנהל המקצועי': 'video' },
    branches: VERDICT,
  },
  // --------------------------------------------------- S3 — the human meeting ------
  {
    id: 'o-team',
    nameHe: 'מיכל',
    branches: TEAM_OPENERS.map(([when, extra]): Branch => ({
      ...(when ? { when } : {}),
      lines: [
        ...extra,
        { who: 'מיכל', text: 'אתה רוצה אותי בצוות או רק את השם שלי במצגת?' },
        { who: 'פוגי', text: 'בצוות.' },
        { who: 'אדם', text: 'אז מי מחליט כשאתה לא בארץ?' },
        { who: 'פוגי', text: 'צריך לכתוב את זה.' },
        { who: 'מיכל', text: 'לפני שאני אומרת כן.' },
      ],
      choices: [
        {
          id: 'agree',
          text: '(להגדיר סמכויות — ולסכם עבודה עם מי שמוכן.)',
          // *"money does not solve trust"* — the years of the route, or the hour at the window tonight
          when: { any: [APEX, tri('fans')] },
          noteHe: APEX_NOTE_TEAM,
          then: [
            { e: 'flag', flag: 'o:team' },
            { e: 'flag', flag: 'o:teamGo' },
            { e: 'flag', flag: 'o:moneyGo' },
            { e: 'rel', who: 'michal', axis: 'trust', delta: 3 },
            { e: 'rel', who: 'adam', axis: 'trust', delta: 3 },
            { e: 'proof', kind: 'operations_agreed', proofId: 'operations_agreed:{chapter}:owner', subjectHe: 'הצוות של העסקה', noteHe: 'סמכויות כתובות — כולל מי מחליט כשהוא לא בארץ.' },
            { e: 'toast', text: 'אדם: "עכשיו אני יודע למה הסכמתי." — "וגם למה לא."', tone: 'plain' },
          ],
        },
        {
          id: 'pilot',
          text: '(להתחיל מפרויקט ניסיון — לפני עסקה.)',
          then: [
            { e: 'flag', flag: 'o:team' },
            { e: 'flagValue', flag: 'life:owner:team', value: 'apprenticeship' },
            { e: 'rel', who: 'michal', axis: 'bond', delta: 2 },
            { e: 'toast', text: 'מיכל: "נבצע משהו קטן יחד ונראה איך אתה עובד." — "בלי לדרוש שתאמיני מראש."', tone: 'plain' },
            { e: 'ending', id: 'pilot' },
          ],
        },
        {
          id: 'stop',
          text: '(להבין שאין צוות זמין — ולעצור את העסקה הזאת.)',
          then: [
            { e: 'flag', flag: 'o:team' },
            { e: 'flagValue', flag: 'life:owner:team', value: 'not_ready' },
            { e: 'toast', text: 'אדם: "עדיף שתדע את זה עכשיו." — "נכון."', tone: 'plain' },
            { e: 'ending', id: 'deferred' },
          ],
        },
      ],
    })),
  },
  {
    id: 'o-sign',
    nameHe: 'עמית',
    // הערב של PARTNER בבית; עמית על הקו, על העסקה
    remote: { 'עמית': 'phone' },
    /**
     * (pass D) S4 — *"personal cost arrives"*: the evening was at half past eight, and the
     * seller's hour decided when he came through the door. Late is its own opening line; the
     * question after it is the same question.
     */
    branches: (['PARTNER', 'קרן'] as const).flatMap((who): Branch[] =>
      [true, false].map((late): Branch => ({
        when: { all: [who === 'PARTNER' ? { flag: 'life:partner' } : { notFlag: 'life:partner' }, ...(late ? [{ afterMinute: DEADLINE + 40 }] : [])] },
        lines: [
          ...(late
            ? [
                { who: null, text: 'תשע ורבע. הצלחות כבר בכיור, ואחת נשארה על השולחן, מכוסה.' },
                { who, text: 'שמונה וחצי. אמרתי לך שמונה וחצי.' },
              ]
            : []),
          { who, text: 'אמרת שהערב הזה שלנו.' },
          { who: 'פוגי', text: 'ואני צריך לסגור את העסקה.' },
          { who, text: 'אתה צריך, או שאף אחד אחר לא קיבל ממך רשות?' },
          { who: 'פוגי', text: 'זאת שאלה טובה.' },
          { who: 'עמית', text: 'בשביל זה בנינו צוות.' },
        ],
        choices: SIGN_CHOICES(who),
      })),
    ),
  },
  {
    id: 'o-conflict',
    nameHe: 'שני',
    branches: [
      {
        lines: [
          { who: 'שני', text: 'אתה לא יכול לפרסם ״למקורב להנהלה נודע״ כשהמקורב זה אתה.' },
          { who: 'פוגי', text: 'לא כתבתי את זה.' },
          { who: 'שני', text: 'אני מונעת לך את הפסקה הבאה.' },
          { who: 'פוגי', text: 'ומה כן אפשר?' },
          { who: 'שני', text: 'קודם להגיד לקורא מאיפה אתה מדבר.' },
        ],
        choices: [
          {
            id: 'other',
            text: '(להמשיך לכתוב בנושאים אחרים — עם גילוי נאות.)',
            then: [
              { e: 'flag', flag: 'o:conflict' },
              { e: 'conflict', choice: 'personal_column' },
              { e: 'flagValue', flag: 'life:desk:scope', value: 'other_subjects_disclosed' },
              { e: 'toast', text: 'שני: "והקבוצה שלך?" — "מישהו אחר יסקר. בלי שאני מאשר לו טיוטות."', tone: 'plain' },
            ],
          },
          {
            id: 'comms',
            text: '(להפסיק כתיבה עצמאית — ולעבור לדוברות מסומנת.)',
            then: [
              { e: 'flag', flag: 'o:conflict' },
              { e: 'conflict', choice: 'stop_covering' },
              { e: 'flagValue', flag: 'life:desk:scope', value: 'club_communications' },
              { e: 'toast', text: 'שני: "אז זו הודעה מטעם המועדון." — "נכתוב את זה למעלה, לא באותיות הקטנות."', tone: 'plain' },
            ],
          },
          {
            id: 'pause',
            text: '(להשהות פרסום — ולשמור את הארכיון האישי.)',
            then: [
              { e: 'flag', flag: 'o:conflict' },
              { e: 'conflict', choice: 'stop_covering' },
              { e: 'flagValue', flag: 'life:desk:scope', value: 'paused' },
              { e: 'toast', text: 'שני: "כל מה שכתבת לא נעלם." — "רק הכיסא במערכת." — "אותו כבר לקחו. הוא היחיד שלא חרק."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'o-monday',
    nameHe: 'אדם',
    /** (pass D) Monday remembers the seller's hour: the bridge is due, and the corner left out asks first */
    branches: MONDAY_OPENERS.map(([when, extra]): Branch => ({
      ...(when ? { when } : {}),
        lines: [
          ...extra,
          { who: 'אדם', text: 'שירות לאוהדים, תפעול או פיתוח?' },
          { who: 'פוגי', text: 'הכול.' },
          { who: 'מיכל', text: 'יש עשרים אחרי ההתחייבויות.' },
          { who: 'פוגי', text: 'תמיד עמית צדק עם המספרים?' },
          { who: 'אדם', text: 'אל תגיד לו. אי אפשר יהיה לחיות איתו.' },
        ],
        choices: [
          {
            id: 'service',
            text: '(שתים-עשרה לשירות, שמונה לפיתוח.)',
            then: [
              { e: 'flag', flag: 'o:monday' },
              { e: 'flagValue', flag: 'life:owner:plan', value: 'service' },
              { e: 'proof', kind: 'business_proof', proofId: 'business_proof:{chapter}:plan', subjectHe: 'התוכנית הראשונה', audience: 'work', delta: 2, noteHe: 'עשרים להתחייבויות, ועוד עשרים לפי בחירה — ובסבב הבא בודקים תוצר.' },
              { e: 'toast', text: 'אדם: "נקצר את ההמתנה ונמדוד תלונות שנפתרו." — "לא רק מספר אנשים שענו להם."', tone: 'plain' },
              { e: 'ending', id: 'service' },
            ],
          },
          {
            id: 'balanced',
            text: '(שמונה לשירות, שש לפיתוח — ושש לעתודה.)',
            when: { notFlag: 'life:owner:bridge' },
            noteHe: 'את העתודה לקח הגשר. אין שש לשמור — יש שש להחזיר.',
            then: [
              { e: 'flag', flag: 'o:monday' },
              { e: 'flagValue', flag: 'life:owner:plan', value: 'balanced' },
              { e: 'proof', kind: 'business_proof', proofId: 'business_proof:{chapter}:plan', subjectHe: 'התוכנית הראשונה', audience: 'work', delta: 2, noteHe: 'שש נשמרו לעתודה, והוסבר מה עוד לא נעשה.' },
              { e: 'toast', text: 'מיכל: "פחות הבטחות היום, יותר גמישות אחר כך." — "ונסביר מה עדיין לא נעשה."', tone: 'plain' },
              { e: 'ending', id: 'balanced' },
            ],
          },
          {
            id: 'delegated',
            text: '(למנות הנהלה לביצוע — ולפקח על שלושה יעדים.)',
            then: [
              { e: 'flag', flag: 'o:monday' },
              { e: 'flagValue', flag: 'life:owner:plan', value: 'delegated' },
              { e: 'proof', kind: 'business_proof', proofId: 'business_proof:{chapter}:plan', subjectHe: 'התוכנית הראשונה', audience: 'work', delta: 2, noteHe: 'הנהלה מבצעת, והבעלים בודק שלושה יעדים.' },
              { e: 'toast', text: 'אדם: "אנחנו מבצעים. אתה עדיין אחראי לבדוק." — "אני לא נעלם מאחורי המינוי."', tone: 'plain' },
              { e: 'ending', id: 'delegated' },
            ],
          },
        ],
    })),
  },
]
