import type { LifeState } from '../types'

import type { Beat } from './beats'
import type { EndingCard } from './chapter1986'
import type { Conversation } from './script'
import { PORTRAIT_NEWHALL } from './chapter2015newhall'

/**
 * P01–P07 · "מה נשאר אחרי המספרים" · 2016–2018, בשני פרקים.
 *
 * **`2016-crisis`** — דצמבר 2016 עד ינואר 2017: מה בעצם קרה, הקופה של קבוצת החברים,
 * שלוש מסירות, ותשע נקודות. **`2017-after`** — מה שקורה אחרי: עמית והקופה, אבא
 * והשאלה מה הפועל תהיה בחיים שלך עכשיו, וההזמנה שלא דורשת הודעה לעיתונות.
 *
 * **שתי שורות ארכיון חדשות, שתיהן נקראו ממקורות בני הזמן:**
 * · 12.12.2016 — צו הקפאת הליכים לחברה שהפעילה את המועדון, וחוב כולל של כמאה מיליון.
 * · 10.1.2017 — הפחתת תשע נקודות בהודעה רשמית של ההתאחדות, ובתום העונה ירידה.
 *   **מוצלב:** הדיווח בן הזמן נוקב בתשע, וטבלת הסיום של RSSSF נושאת באותה שורה גם
 *   את ההערה על ההפחתה וגם את הסימון Relegated (כלל 77).
 *
 * **ומה שהתסריט אוסר, ונשמר מילה במילה:** *"לא ממציאים נושה אמיתי, שכר שלא שולם
 * לאדם מסוים או אשמה של אדם ציבורי"*, ו*"פרדי מדבר כחבר בדיוני, לא בשם בית משפט"*.
 * אין כאן שם של אדם — לא בארכיון, לא בדיאלוג, ולא בקלף.
 *
 * **"עומס" הוא קריאה שלי, ונאמר בקול.** התסריט כותב `עומס: -8`, וטבלת המיפוי מחזיקה
 * אותו ב-`NEEDS_A_HOME` במפורש: *"קרוב ל-wellbeing, ולא זהה לאף ציר קיים"*. בתוכן
 * הזה הוא נכתב כ-`stress`, וזו הכרעת תוכן ולא תרגום — ביום שבו יהיה לעומס ציר משלו,
 * שלוש השורות האלה הן מה שיזוז.
 *
 * **והקופה המשותפת אינה ארנק שני.** גם היא ב-`NEEDS_A_HOME` (*"אין ארנק שני"*), ולכן
 * מה שנלקח ממנה נרשם כ**דגל** ומה שמוחזר יוצא מהכיס האמיתי. לבנות כאן ארנק שני היה
 * אומר לבנות מערכת שלמה בתוך סצנה אחת.
 */


/**
 * מה נעשה בקופה ב-P02 — **דגל חיים, כי P05 קוראת אותו בפרק אחר** (21.9.2026).
 *
 * עד היום זה היה `p:tillKind`, דגל יום: הוא נכתב ב-`2016-crisis` ונמחק ב-`year.entered`
 * שלפני `2017-after`, ולכן הענף של עמית על הכסף שנלקח — P05.1 ו-P05.2, כל הסצנה שהתסריט
 * בנה על *"אם P02 נעשה בלי אישור"* — לא נפתח מעולם, והכסף מהקופה לא הוחזר באף חיים.
 * `life:worldlines` מצא את זה כ-`STALE_READ`.
 */
export const TILL = 'life:till'

export const PORTRAIT_COLLAPSE: Record<string, string> = {
  ...PORTRAIT_NEWHALL,
}

/** מה שחוזר לקופה, אם הוחלט להחזיר — הסכום של התסריט */
const REPAY_AGOROT = 5_000

// ------------------------------------------------------------------- Part I ------

/**
 * ============================================ הרשימה של מתוקי — עושים, לא אומרים ====
 *
 * (LIFE 90-E, 25.9.2026 — `NARRATIVE-QUEST-DESIGN-PASS-v2` §7 Stage D, §13 "2016 delivery".)
 *
 * עד היום P01 ו-P03 היו שתי שאלות: *"(לבדוק מה ידוע ומה לא)"* הרים `knowledge +3` ברגע
 * הלחיצה, ו-*"(שלוש מסירות — ולוודא שהגיעו.)"* העביר שעה, הוריד אנרגיה והעניק ראיה על
 * שלוש מסירות שאף אחת מהן לא נעשתה. זה בדיוק האנטי-דפוס §11.4: המשפט טוען שהעבודה נעשתה.
 *
 * **עכשיו הם פעלים בעולם, בשני חלקים:**
 *
 * 1. **אימות (P01).** בקיוסק שלושה קולות: הדף של פרדי (`{anchor}` — שורת הארכיון), החדשות
 *    בטלוויזיה של הקיוסק, וההודעה בטלפון של אופיר. שניים אומרים אותו דבר; השלישי שמועה.
 *    ואז — לעמית — **מה פוגי מוכן לחזור עליו**. `knowledge` רק למי שבדק את שני המקורות
 *    ואמר רק את מה שבהם. מי שהתקשר לאבא או סגר חדשות להערב — לא עובר את זה, ובצדק.
 * 2. **מסירות (P03).** מתוקי נותן רשימה של שלוש חבילות עם שמות. מתחייבים לאחת, לשלוש, או
 *    לא. מי שהתחייב **הולך**: הדלת הירוקה ברחוב (שלמה), הספסל במגרש (בני), הדלת ליד בית
 *    הקפה באלנבי (אורנה). **הסיבוך:** שלמה לא בבית — השכנה אומרת שהוא אצל הבת, מעל בית
 *    הקפה באלנבי. משאירים אצלה, לוקחים אליו, או מחזירים. **החזרה:** מתוקי שואל, ומה
 *    שהוא עונה עליו הוא הספירה ביומן (`p:n1`–`p:n3`) — לא מה שפוגי אומר. חצי עבודה היא
 *    ביוגרפיה לגיטימית; ראיה רק על מה שנמסר ביד.
 *
 * **שמות בדיוניים, בלי סכומים ובלי נושים** — הכלל של הראש נשמר: שלמה, בני ואורנה הם
 * אנשים ברשימה של קבוצת חברים, לא נושים, לא עובדי מועדון ולא אנשים ציבוריים. מה שבחבילה
 * לא נאמר; השם עליה כן.
 *
 * **הספירה.** לשיחת מסירה יש שלושה ענפים — "זו הראשונה", "השנייה", "השלישית" — והיא מרימה
 * את הדגל הבא בתור. זה היומן שמוכיח: `p:n<k>` מורם רק בידי מסירה ביד.
 */

/** the three names on Matuki's list, where each of them is, and who is there */
export const DROPS = {
  a: { room: 'street', whoHe: 'שלמה', placeHe: 'הדלת הירוקה ברחוב, קומה שנייה' },
  b: { room: 'pitch', whoHe: 'בני', placeHe: 'הספסל של בני במגרש' },
  c: { room: 'allenby', whoHe: 'אורנה', placeHe: 'הדלת ליד בית הקפה באלנבי' },
} as const
export type DropId = keyof typeof DROPS

/** מה נמסר ביד — הספירה שמתוקי קורא, ולא מה שפוגי מספר */
export const HANDED = (n: 1 | 2 | 3) => `p:n${n}`
/** לחיים: כמה נמסרו ביד, ולכמה התחייב — `2018-return` זוכר (callback, Stage D) */
export const CRISIS_HANDED = 'life:crisis:handed'
export const CRISIS_COMMIT = 'life:crisis:commit'
export const CRISIS_REPEAT = 'life:crisis:repeat'

function dropsLeft(state: LifeState): string[] {
  const left: string[] = []
  for (const id of ['a', 'b', 'c'] as const) {
    if (!state.flags[`p:carry:${id}`] || state.flags[`p:hand:${id}`]) continue
    if (id === 'a' && state.flags['p:a-moved']) left.push('שלמה — אצל הבת, מעל בית הקפה באלנבי')
    else left.push(`${DROPS[id].whoHe} — ${DROPS[id].placeHe}`)
  }
  return left
}

export function objectiveCrisis(state: LifeState, sceneId: string): string | null {
  if (state.chapterDone) return null
  if (!state.flags['p:news']) return sceneId === 'kiosk' ? null : 'בקיוסק. כולם מדברים, ואף אחד לא יודע.'
  if (state.flags['p:info'] === 'checking') {
    const seen = ['p:src:doc', 'p:src:news'].filter((flag) => state.flags[flag]).length
    if (seen < 2) return 'שני מקורות בקיוסק: הדף של פרדי, והחדשות בטלוויזיה. והטלפון של אופיר — שמועה.'
    return 'בדקת. עכשיו לעמית: מה אתה מעביר הלאה, ומה לא.'
  }
  if (!state.flags['p:till']) return sceneId === 'pitch' ? null : 'במגרש. הקופה של הקבוצה שלנו.'
  if (!state.flags['p:deliver'] && !state.flags['p:commit']) return sceneId === 'community-room' ? null : 'חדר הקהילה. מתוקי עם רשימה — שמות, לא סכומים.'
  if (!state.flags['p:deliver']) {
    const left = dropsLeft(state)
    return left.length ? `החבילות: ${left.join(' · ')}. ואז חזרה למתוקי.` : 'חזרה לחדר הקהילה. מתוקי מחכה לרשימה.'
  }
  if (!state.flags['p:table']) return 'הטבלה. עוד מעט מעדכנים אותה.'
  return null
}

export const ENDINGS_CRISIS: Record<string, EndingCard> = {
  checked: {
    id: 'checked',
    titleHe: 'זה ידוע. זה עוד לא',
    bodyHe:
      'עברת על מה שהיה ידוע והפרדת אותו ממה שלא, ולא העברת הלאה את החלק השני. זה לא עצר כלום ולא היה אמור — זה רק אומר שמי שקרא ממך קרא משהו נכון.',
    memoryHe: 'שני קווים, אחד מהם מסומן.',
    memoryItem: 'clipping',
    presence: 'late',
  },
  kept: {
    id: 'kept',
    titleHe: 'תשאירו את הדף',
    bodyHe:
      'שמרת את הטבלה ליד התמונה מהערב ההוא. פרדי אמר שאחת לא מבטלת את השנייה, ועמית אמר שצריך לזכור גם מאיפה ממשיכים — והשארת את הדף.',
    memoryHe: 'דף טבלה, מקופל פעם אחת.',
    memoryItem: 'folded-paper',
    presence: 'late',
  },
  quiet: {
    id: 'quiet',
    titleHe: 'בלי רדיו בדרך',
    bodyHe:
      'יצאת עם אופיר מההמולה. הוא אמר שהוא לא רוצה לשמוע עוד שמועה אחת ואמרת שבוא, בלי רדיו בדרך — והלכתם, ובאמת לא היה רדיו.',
    memoryHe: 'שתי כוסות, על דלפק סגור.',
    memoryItem: 'folded-paper',
    presence: 'late',
  },
}

export const BEATS_CRISIS: Beat[] = [
  { id: 'p-news', at: 'kiosk', trigger: 'enter', when: { none: [{ flag: 'p:news' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'p-news' }] },
  // מי שיצא לבדוק לא ממשיך למגרש לפני שאמר לעמית מה הוא מעביר (הדגל `p:info` מתחלף ב-`p-repeat`)
  { id: 'p-till', at: 'pitch', trigger: 'enter', when: { all: [{ flag: 'p:news' }], none: [{ flag: 'p:till' }, { flagIs: { flag: 'p:info', value: 'checking' } }] }, delayMs: 650, do: [{ a: 'talk', conversation: 'p-till' }] },
  // P03 *"מפגש קהילתי"* — חדר הקהילה (`communityRoom`, 21.9.2026). שומר על עצמו ב-`p:commit`:
  // מי שהתחייב ויצא עם החבילות לא נשאל שוב בכניסה (V3 כלל 3)
  { id: 'p-deliver', at: 'community-room', trigger: 'enter', when: { all: [{ flag: 'p:till' }], none: [{ flag: 'p:deliver' }, { flag: 'p:commit' }] }, delayMs: 650, do: [{ a: 'talk', conversation: 'p-deliver' }] },
  /**
   * החזרה — מי שכל החבילות שלו כבר לא בידיים (נמסרו, הושארו, או הוחזרו) ונכנס לחדר, מתוקי
   * שואל בעצמו. מי שחוזר באמצע לוחץ עליו (`p-report` בחדר).
   */
  {
    id: 'p-back',
    at: 'community-room',
    trigger: 'enter',
    when: {
      all: [{ flag: 'p:commit' }],
      none: [
        { flag: 'p:deliver' },
        { all: [{ flag: 'p:carry:a' }, { notFlag: 'p:hand:a' }] },
        { all: [{ flag: 'p:carry:b' }, { notFlag: 'p:hand:b' }] },
        { all: [{ flag: 'p:carry:c' }, { notFlag: 'p:hand:c' }] },
      ],
    },
    delayMs: 650,
    do: [{ a: 'talk', conversation: 'p-report' }],
  },
  /** ומי שלא חזר עד תשע — מתוקי מתקשר. אין ערב שנתקע עם חבילה ביד */
  {
    id: 'p-late',
    trigger: 'clock',
    when: { all: [{ flag: 'p:commit' }, { afterMinute: 21 * 60 }], none: [{ flag: 'p:deliver' }] },
    delayMs: 1200,
    do: [{ a: 'talk', conversation: 'p-report-phone' }],
  },
  /** הטבלה היא רגע ולא חדר — היא מתעדכנת פעם אחת, והשחקן אינו מפחית ואינו מציל נקודות */
  { id: 'p-table', trigger: 'clock', when: { all: [{ flag: 'p:deliver' }], none: [{ flag: 'p:table' }] }, delayMs: 1400, do: [{ a: 'talk', conversation: 'p-table' }] },
]

// ------------------------------------------------------------------ Part II ------

export function objectiveAfter(state: LifeState, sceneId: string): string | null {
  if (state.chapterDone) return null
  if (!state.flags['p:amit']) return sceneId === 'kiosk' ? null : 'עמית מחכה בקיוסק. לא בשביל חדשות.'
  if (!state.flags['p:choice'] && !state.flags['p:asked']) return sceneId === 'home' ? null : 'אבא שואל שאלה אחת, והפעם היא אליך.'
  // (pass D) the answer is in the room: the renewal form, the chair beside him, the phone on the sofa
  if (!state.flags['p:choice']) return sceneId === 'home' ? 'הטופס על השולחן, הכיסא ליד אבא, הטלפון על הספה.' : 'אצל אבא. התשובה בחדר.'
  if (!state.flags['p:invite']) return 'אפי שאל אם אתה בא בשישי.'
  return null
}

export const ENDINGS_AFTER: Record<string, EndingCard> = {
  central: {
    id: 'central',
    titleHe: 'ולא ניקח את כל השבת על עצמנו',
    bodyHe:
      'ממשיך להגיע — ועם אחריות בגודל שאתה יכול לשאת. קובי אמר שנבדוק מתי המשחק הבא, ואמרת שלא ניקח את כל השבת, והוא לא התווכח. זה מה שהוא רצה לשמוע.',
    memoryHe: 'לוח משחקים, עם שניים מסומנים.',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
  peripheral: {
    id: 'peripheral',
    titleHe: 'אני שואל אם אתה בא לאכול',
    bodyHe:
      'לפעמים. שאלת אם הוא כועס והוא שאל אם אתה בא לאכול, וזו הייתה התשובה המלאה. הכורסה היא גם מקום.',
    memoryHe: 'כיסא, שנשאר במקום שלו.',
    memoryItem: 'folded-paper',
    presence: 'television',
  },
  distance: {
    id: 'distance',
    titleHe: 'עליך אני יכול להתקשר?',
    bodyHe:
      'לקחת הפסקה. הוא שאל מה להעביר לך בינתיים ואמרת רק אם קורה משהו שהוא רוצה לדבר עליו — ואז הוא שאל אם עליך הוא יכול להתקשר, ואמרת כן.',
    memoryHe: 'מספר טלפון, שלא השתנה.',
    memoryItem: 'folded-paper',
    presence: 'late',
  },
}

export const BEATS_AFTER: Beat[] = [
  { id: 'p-amit', at: 'kiosk', trigger: 'enter', when: { none: [{ flag: 'p:amit' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'p-amit' }] },
  { id: 'p-choice', at: 'home', trigger: 'enter', when: { all: [{ flag: 'p:amit' }], none: [{ flag: 'p:choice' }, { flag: 'p:asked' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'p-choice' }] },
  { id: 'p-invite', trigger: 'clock', when: { all: [{ flag: 'p:choice' }], none: [{ flag: 'p:invite' }] }, delayMs: 1500, do: [{ a: 'talk', conversation: 'p-invite' }] },
]

// ------------------------------------------------ the quest words (90-E) ------

const SRC_SEEN = { all: [{ flag: 'p:src:doc' }, { flag: 'p:src:news' }] }

/** מסירה ביד — שלושה ענפים, והענף הוא הספירה: הראשונה, השנייה, השלישית */
function handoff(id: string, drop: DropId, lines: Conversation['branches'][number]['lines'], nameHe: string): Conversation {
  const hand = (next: 1 | 2 | 3, toast: string) => ({
    lines,
    then: [
      { e: 'flagValue', flag: `p:hand:${drop}`, value: 'hand' },
      { e: 'flag', flag: HANDED(next) },
      { e: 'time', minutes: 6 },
      { e: 'energy', delta: -3 },
      { e: 'toast', text: toast, tone: 'plain' },
    ] as Conversation['branches'][number]['then'],
  })
  return {
    id,
    nameHe,
    branches: [
      { when: { flag: `p:hand:${drop}` }, lines: [{ who: null, text: 'השם הזה כבר מסומן ברשימה.' }] },
      { when: { flag: HANDED(2) }, ...hand(3, `${nameHe}. שלוש ביד — הרשימה ריקה.`) },
      { when: { flag: HANDED(1) }, ...hand(2, `${nameHe}. שתיים ביד.`) },
      hand(1, `${nameHe}. אחת ביד.`),
    ],
  }
}

type Branches = Conversation['branches']
type Choice = NonNullable<Branches[number]['choices']>[number]

/**
 * החזרה למתוקי — **מה שהוא עונה עליו הוא היומן** (`p:n1`–`p:n3`, `p:hand:*`). אותם ענפים
 * בחדר ובטלפון; בטלפון שורת פתיחה אחת לפני.
 */
function reportBranches(phone: boolean): Branches {
  const open = phone ? [{ who: null, text: 'הטלפון. מתוקי.' } as const] : []
  const close = (handed: number) => [
    { e: 'flag', flag: 'p:deliver' },
    { e: 'flagValue', flag: CRISIS_HANDED, value: handed },
  ] as const
  const neighbor = { flagIs: { flag: 'p:hand:a', value: 'neighbor' } }
  const neighborLine = { who: 'מתוקי', text: 'ושלמה — אצל השכנה זה לא ביד. אבל זה גם לא כלום.' } as const
  const honest = (handed: number, toast: string): Choice => ({
    id: 'exact',
    text: '(לסמן בדיוק מה הגיע ביד, ומה לא.)',
    then: [
      ...close(handed),
      { e: 'personality', key: 'honesty', delta: 2 },
      { e: 'rel', who: 'metuki', axis: 'trust', delta: 3 },
      ...(handed > 0
        ? ([{ e: 'proof', kind: 'crisis_delivery', proofId: 'crisis_delivery:{chapter}:partial', subjectHe: 'המסירות', noteHe: 'מה שנמסר — ביד; ומה שלא — נאמר בדיוק איפה הוא.' }] as const)
        : []),
      { e: 'toast', text: toast, tone: 'plain' },
    ],
  })
  const claim = (handed: number): Choice => ({
    id: 'all',
    text: '(להגיד שהכול הגיע.)',
    then: [
      ...close(handed),
      { e: 'flagValue', flag: 'p:claimed', value: 'all' },
      { e: 'personality', key: 'honesty', delta: -3 },
      { e: 'rel', who: 'metuki', axis: 'trust', delta: -6 },
      { e: 'toast', text: 'מתוקי: "מישהו מהרשימה התקשר לפני רבע שעה. הוא עוד מחכה." — "..." — "אז נסמן את האמת. אני אסמן."', tone: 'red' },
    ],
  })
  const partial = (n: 1 | 2, withNeighbor: boolean): Branches[number] => ({
    when: { all: [{ flagIs: { flag: 'p:commit', value: 3 } }, { flag: HANDED(n) }, { notFlag: HANDED((n + 1) as 2 | 3) }, ...(withNeighbor ? [neighbor] : [])] },
    lines: [
      ...open,
      { who: 'מתוקי', text: 'נו?' },
      { who: 'פוגי', text: n === 2 ? 'שתיים ביד.' : 'אחת ביד.' },
      ...(withNeighbor ? [neighborLine] : []),
      { who: 'מתוקי', text: 'מה עם השאר?' },
    ],
    choices: [
      honest(n, n === 2 ? 'מתוקי: "שתיים ביד, ואת השלישית אני יודע איפה לחפש. זה לא פחות — זה מדויק."' : 'מתוקי: "אחת ביד, ואני יודע איפה השתיים. מחר מישהו ממשיך מאיפה שעצרת."'),
      claim(n),
    ],
  })
  const none = (withNeighbor: boolean): Branches[number] => ({
    when: { all: [{ notFlag: HANDED(1) }, ...(withNeighbor ? [neighbor] : [])] },
    lines: [
      ...open,
      { who: 'מתוקי', text: 'נו?' },
      { who: 'פוגי', text: 'אף אחת לא הגיעה ביד.' },
      ...(withNeighbor ? [neighborLine] : []),
    ],
    choices: [honest(0, 'מתוקי: "אז הן חוזרות לפה, ומחר מישהו אחר. תודה שאמרת ולא שתקת."')],
  })
  return [
    {
      when: { all: [{ flagIs: { flag: 'p:commit', value: 3 } }, { flag: HANDED(3) }] },
      lines: [...open, { who: 'מתוקי', text: 'נו?' }, { who: 'פוגי', text: 'שלוש. ביד.' }, { who: 'מתוקי', text: 'גם שלמה?' }, { who: 'פוגי', text: 'גם שלמה. רק לא בכתובת שכתבת.' }],
      then: [
        ...close(3),
        { e: 'energy', delta: -4 },
        { e: 'skill', skill: 'organization', delta: 3, why: 'שלוש, ואישור על כל אחת' },
        { e: 'rel', who: 'metuki', axis: 'bond', delta: 2 },
        { e: 'rel', who: 'metuki', axis: 'trust', delta: 3 },
        { e: 'proof', kind: 'crisis_delivery', proofId: 'crisis_delivery:{chapter}:three', subjectHe: 'שלוש המסירות', audience: 'gate5', delta: 4, noteHe: 'שלוש יצאו, שלוש הגיעו, ויש אישור על כל אחת.' },
        { e: 'heard', proofId: 'crisis_delivery:{chapter}:three' },
        { e: 'toast', text: 'מתוקי: "קיבלתי אישורים." — "עכשיו אתה הולך הביתה?" — "אם אתה עושה את הרביעית מחר."', tone: 'plain' },
      ],
    },
    {
      when: { all: [{ flagIs: { flag: 'p:commit', value: 1 } }, { flag: HANDED(1) }] },
      lines: [...open, { who: 'מתוקי', text: 'נו?' }, { who: 'פוגי', text: 'אחת. ביד.' }],
      then: [
        ...close(1),
        { e: 'rel', who: 'metuki', axis: 'bond', delta: 2 },
        { e: 'rel', who: 'metuki', axis: 'trust', delta: 3 },
        { e: 'proof', kind: 'crisis_delivery', proofId: 'crisis_delivery:{chapter}:one', subjectHe: 'המסירה האחת', noteHe: 'הבטיח אחת, וקיים אותה.' },
        { e: 'toast', text: 'מתוקי: "אחת באמת יותר משלוש בערך." — "אתה צריך להדפיס את זה על חולצה."', tone: 'plain' },
      ],
    },
    partial(2, true),
    partial(2, false),
    partial(1, true),
    partial(1, false),
    none(true),
    none(false),
  ] as Branches
}

export const CONVERSATIONS_CRISIS_QUEST: Conversation[] = [
  // ---- P01 · שלושה קולות בקיוסק, ואחד מהם שמועה ----
  {
    id: 'p-src-doc',
    nameHe: 'פרדי',
    branches: [
      { when: { flag: 'p:src:doc' }, lines: [{ who: 'פרדי', text: 'זה אותו דף. הוא לא השתנה מאז שקראת.' }] },
      {
        lines: [
          { who: null, text: 'דף מודפס, מקופל לארבע, עם חותמת בפינה.' },
          { who: null, text: '{anchor}.' },
          { who: 'פרדי', text: 'זה מה שיש ביד. לא יותר ולא פחות.' },
          { who: 'פוגי', text: 'כתוב פה ״אין קבוצה״?' },
          { who: 'פרדי', text: 'כתוב פה שיש הליך. את השאר אנשים כותבים לבד.' },
        ],
        then: [{ e: 'flag', flag: 'p:src:doc' }, { e: 'time', minutes: 4 }],
      },
    ],
  },
  {
    id: 'p-src-news',
    nameHe: null,
    branches: [
      { when: { flag: 'p:src:news' }, lines: [{ who: null, text: 'אותה כתובית רצה, בפעם הרביעית. היא לא אומרת יותר ממה שאמרה.' }] },
      {
        lines: [
          { who: null, text: 'הטלוויזיה מעל הדלפק, בלי קול. כתובית רצה מתחת לקריין: צו הקפאת הליכים לחברה שמפעילה את הקבוצה.' },
          { who: null, text: 'ובשורה השנייה, קטנה יותר: הקבוצה ממשיכה לשחק בזמן ההליך.' },
        ],
        then: [{ e: 'flag', flag: 'p:src:news' }, { e: 'time', minutes: 3 }],
      },
    ],
  },
  {
    id: 'p-src-rumour',
    nameHe: 'אופיר',
    branches: [
      { when: { flag: 'p:src:rumour' }, lines: [{ who: 'אופיר', text: 'עכשיו כבר שש פעמים. אותה הודעה.' }] },
      {
        lines: [
          { who: null, text: 'הודעה שהועברה ארבע פעמים: ״סוגרים את הקבוצה. אין משחק בשבת.״ בלי שם, בלי מקור.' },
          { who: 'אופיר', text: 'זה מהקבוצה של העבודה.' },
          { who: 'פוגי', text: 'ומי כתב?' },
          { who: 'אופיר', text: 'מישהו ששמע.' },
        ],
        then: [{ e: 'flag', flag: 'p:src:rumour' }, { e: 'time', minutes: 2 }],
      },
    ],
  },
  {
    id: 'p-repeat',
    nameHe: 'עמית',
    branches: [
      {
        lines: [
          { who: 'עמית', text: 'אז מה אני כותב לחבר׳ה? הם מחכים לך, לא לי.' },
        ],
        choices: [
          {
            id: 'fact',
            text: '(רק מה שבדף ובחדשות: צו הקפאת הליכים, והקבוצה ממשיכה לשחק. לא ״אין קבוצה״.)',
            when: SRC_SEEN,
            noteHe: 'עוד לא ראית את שני המקורות — הדף של פרדי, והחדשות בטלוויזיה.',
            then: [
              { e: 'flagValue', flag: 'p:info', value: 'verified' },
              { e: 'flagValue', flag: CRISIS_REPEAT, value: 'verified' },
              { e: 'skill', skill: 'knowledge', delta: 3, why: 'הפריד ידוע מלא-ידוע' },
              { e: 'toast', text: 'פרדי: "זה ידוע. זה עוד לא." — "אז את השני אני לא מציג כעובדה."', tone: 'plain' },
            ],
          },
          {
            /**
             * §8 — עיתונאי ומה שמותר לפרסם: אותה בדיקה, והיא יוצאת בשם, עם המקור. רק למי שעל
             * המסלול, ורק אחרי שני המקורות.
             */
            id: 'column',
            text: '(לכתוב את זה בטור — רק מה שבשני המקורות, ועם המקור.)',
            when: { all: [SRC_SEEN, { route: { id: 'JOURNALIST' } }] },
            hidden: true,
            then: [
              { e: 'flagValue', flag: 'p:info', value: 'verified' },
              { e: 'flagValue', flag: CRISIS_REPEAT, value: 'published' },
              { e: 'skill', skill: 'knowledge', delta: 3, why: 'הפריד ידוע מלא-ידוע' },
              { e: 'proof', kind: 'journalism_proof', proofId: 'journalism_proof:{chapter}:freeze', subjectHe: 'צו ההקפאה', audience: 'public', delta: 3, noteHe: 'פרסם רק את מה שבמסמך ובחדשות, עם המקור — ולא את ההודעה שהסתובבה.' },
              { e: 'heard', proofId: 'journalism_proof:{chapter}:freeze' },
              { e: 'toast', text: 'פרדי: "זה ידוע. זה עוד לא." — "ואת השני אני לא כותב."', tone: 'plain' },
            ],
          },
          {
            id: 'rumour',
            text: '(להעביר את מה שכולם אומרים. ״אין קבוצה.״)',
            then: [
              { e: 'flagValue', flag: 'p:info', value: 'rumour' },
              { e: 'flagValue', flag: CRISIS_REPEAT, value: 'rumour' },
              { e: 'toast', text: 'עמית: "שלחתי." — ואחרי דקה, בטלפון של אופיר: "אז יש משחק בשבת או לא?"', tone: 'red' },
            ],
          },
          {
            id: 'silent',
            text: '(לא להעביר כלום הערב. מי שרוצה — ישאל אותי מחר.)',
            then: [
              { e: 'flagValue', flag: 'p:info', value: 'silent' },
              { e: 'flagValue', flag: CRISIS_REPEAT, value: 'silent' },
              { e: 'toast', text: 'עמית: "גם זו הודעה." — "רק שקטה יותר."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },

  // ---- P03 · הרשימה: שלושה מקומות, וכתובת אחת שמשתנה ----
  {
    id: 'p-drop-a',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'דפקת פעמיים על הדלת הירוקה. אין תשובה.' },
          { who: null, text: 'השכנה מהדלת ממול פותחת על השרשרת: ״שלמה? אצל הבת שלו. מעל בית הקפה באלנבי. חוזר בשבוע הבא.״' },
          { who: 'פוגי', text: 'ואם אשאיר אצלך?' },
          { who: null, text: '״אני אתן לו. אם אזכור.״' },
        ],
        choices: [
          {
            id: 'neighbor',
            text: '(להשאיר אצל השכנה. היא תמסור.)',
            then: [
              { e: 'flagValue', flag: 'p:hand:a', value: 'neighbor' },
              { e: 'time', minutes: 3 },
              { e: 'toast', text: 'החבילה אצל השכנה. השם עליה — והיא סגרה את הדלת.', tone: 'plain' },
            ],
          },
          {
            id: 'carry',
            text: '(לקחת את זה אליו — לאלנבי, מעל בית הקפה.)',
            then: [
              { e: 'flag', flag: 'p:a-moved' },
              { e: 'toast', text: 'השם לא השתנה. הכתובת כן. אלנבי, מעל בית הקפה.', tone: 'plain' },
            ],
          },
          {
            id: 'back',
            text: '(להחזיר את החבילה למתוקי. שיחליט הוא.)',
            then: [
              { e: 'flagValue', flag: 'p:hand:a', value: 'back' },
              { e: 'toast', text: 'החבילה חוזרת איתך. מתוקי ידע מה לעשות איתה.', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  handoff('p-drop-a2', 'a', [
    { who: null, text: 'קומה ראשונה מעל בית הקפה. הבת פותחת, ושלמה מאחוריה, בנעלי בית.' },
    { who: null, text: 'הוא מסתכל על השם, בכתב של מתוקי, ואז עליך: ״באת עד לפה?״' },
    { who: 'פוגי', text: 'הכתובת השתנתה. השם לא.' },
  ], 'שלמה'),
  handoff('p-drop-b', 'b', [
    { who: null, text: 'בני על הספסל, עם שקית כדורים של הקטנים.' },
    { who: null, text: 'הוא קורא את השם על החבילה בקול, כאילו צריך לוודא שזה הוא.' },
    { who: 'פוגי', text: 'זה אתה.' },
    { who: null, text: '״אז תגיד למתוקי שהגיע. ביד.״' },
  ], 'בני'),
  handoff('p-drop-c', 'c', [
    { who: null, text: 'אורנה פותחת לפני שדפקת — ראתה אותך מהחלון.' },
    { who: null, text: '״מתוקי אמר שמישהו יבוא. לא אמר שזה אתה.״' },
    { who: 'פוגי', text: 'גם לי הוא לא אמר, עד לפני שעה.' },
  ], 'אורנה'),
  { id: 'p-report', nameHe: 'מתוקי', branches: reportBranches(false) },
  { id: 'p-report-phone', nameHe: 'מתוקי', remote: { 'מתוקי': 'phone' }, branches: reportBranches(true) },
]

// ---------------------------------------------------------------- the words ------

export const CONVERSATIONS_COLLAPSE: Conversation[] = [
  ...CONVERSATIONS_CRISIS_QUEST,
  {
    id: 'p-news',
    nameHe: 'פרדי',
    branches: [
      {
        lines: [
          { who: 'אופיר', text: 'אומרים שאין קבוצה.' },
          { who: 'עמית', text: 'מי אומרים?' },
          { who: 'אופיר', text: 'כולם.' },
          { who: 'פרדי', text: 'אז נתחיל מאדם אחד וממסמך אחד.' },
          { who: 'פוגי', text: 'ואני רוצה לדעת למי מתקשרים כשאין אוויר.' },
        ],
        choices: [
          {
            /**
             * **הבחירה היא ההתחייבות, לא הבדיקה** (90-E). הבדיקה נעשית בחדר — הדף, הטלוויזיה,
             * הטלפון — וה-`knowledge` יוצא רק ב-`p-repeat`, למי שבאמת ראה את שני המקורות.
             */
            id: 'verify',
            text: '(לבדוק מה ידוע ומה לא — לפני שאני מעביר.)',
            then: [
              { e: 'flag', flag: 'p:news' },
              { e: 'flagValue', flag: 'p:info', value: 'checking' },
              { e: 'toast', text: 'פרדי: "אז נתחיל מאדם אחד וממסמך אחד." — הדף אצלו, והחדשות בטלוויזיה.', tone: 'plain' },
            ],
          },
          {
            id: 'kobi',
            text: '(להתקשר לאבא לפני שנכנסים לפרטים.)',
            then: [
              { e: 'flag', flag: 'p:news' },
              { e: 'flagValue', flag: 'p:info', value: 'family_first' },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 3 },
              { e: 'toast', text: 'קובי: "אני פה." — "אתה כבר שמעת?" — "כן. תישאר רגע על הקו."', tone: 'plain' },
            ],
          },
          {
            id: 'pause',
            text: '"סוגר חדשות להערב. נחזור מחר."',
            then: [
              { e: 'flag', flag: 'p:news' },
              { e: 'flagValue', flag: 'p:info', value: 'pause' },
              // "עומס" של התסריט — נכתב כאן כ-`stress`, וזו קריאה ולא תרגום (ראה הראש)
              { e: 'wellbeing', key: 'stress', delta: -8 },
              { e: 'toast', text: 'עמית: "אשלח לך רק משהו שהתברר." — "תודה. אני לא יכול לבלוע הכול עכשיו."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'p-till',
    nameHe: 'עמית',
    branches: [
      {
        lines: [
          { who: 'אופיר', text: 'יש לנו כסף מהקבוצה.' },
          { who: 'עמית', text: 'מהקבוצה שלנו. לרישום, לציוד.' },
          { who: 'פוגי', text: 'אני יודע.' },
          { who: 'עמית', text: 'אני אומר בקול כי כשכואב כולם פתאום אומרים ״זה אותו דבר״.' },
          { who: 'מתוקי', text: 'וזה לא אותו דבר.' },
        ],
        choices: [
          {
            id: 'ask',
            text: '(לבקש הסכמה לשינוי ייעוד — ולחכות לתשובה.)',
            then: [
              { e: 'flag', flag: 'p:till' },
              { e: 'flagValue', flag: TILL, value: 'asked' },
              { e: 'time', minutes: 30 },
              { e: 'rel', who: 'amit', axis: 'trust', delta: 4 },
              // `enterprise` בתסריט → `business` במנוע (`mapping.ts`)
              { e: 'skill', skill: 'business', delta: 3, why: 'ייעוד של קופה משותפת' },
              { e: 'toast', text: 'עמית: "אני מסכים רק אחרי שנדע מה נשאר לרישום." — "אז נחשב קודם."', tone: 'plain' },
            ],
          },
          {
            id: 'leave',
            text: '"הכסף הזה לא בשביל זה. נשאיר אותו — ואני עוזר אחרת."',
            then: [
              { e: 'flag', flag: 'p:till' },
              { e: 'flagValue', flag: TILL, value: 'left' },
              { e: 'personality', key: 'honesty', delta: 3 },
              { e: 'proof', kind: 'respected_ringfence', proofId: 'respected_ringfence:{chapter}:till', subjectHe: 'הקופה של הקבוצה', noteHe: 'השאיר את הקופה לייעוד שלה, ועזר בדרך שאינה כסף.' },
              { e: 'toast', text: 'מתוקי: "אני צריך מישהו איתי מחר, לא עוד כסף." — "בזה אני יכול לעזור."', tone: 'plain' },
            ],
          },
          {
            /**
             * **הפרה אמיתית, בלי מסך אזהרה.** התסריט מתיר אותה במפורש (`P05` בנויה על
             * "אם P02 נעשה בלי אישור"), וזה ההבדל בין משחק שיש בו טעות לבין משחק שמונע
             * אותה. אין כאן ארנק שני (ראה הראש) — מה שנלקח הוא **דגל**, ומה שמוחזר
             * יוצא מהכיס.
             */
            id: 'take',
            text: '(לקחת מהקופה עכשיו. נסדר את זה אחר כך.)',
            then: [
              { e: 'flag', flag: 'p:till' },
              { e: 'flagValue', flag: TILL, value: 'took' },
              { e: 'money', agorot: REPAY_AGOROT, why: 'מהקופה של הקבוצה' },
              { e: 'rel', who: 'amit', axis: 'bond', delta: -3 },
              { e: 'rel', who: 'amit', axis: 'trust', delta: -10 },
              { e: 'wellbeing', key: 'regret', delta: 5 },
              { e: 'toast', text: 'עמית: "אתה לא יכול לקרוא לזה תרומה אם זה גם הכסף שלי." — "אני אחזיר." — "קודם תבין מה עשית."', tone: 'red' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'p-deliver',
    nameHe: 'מתוקי',
    branches: [
      {
        lines: [
          { who: 'מתוקי', text: 'יש פה שמות, לא רק סכומים.' },
          { who: 'פוגי', text: 'מה צריך ממני?' },
          { who: 'מתוקי', text: 'היום? שלוש מסירות.' },
          { who: 'פוגי', text: 'וזה יעזור?' },
          { who: 'מתוקי', text: 'לשלושה אנשים, כן.' },
        ],
        choices: [
          {
            /**
             * **התחייבות, לא דיווח** (90-E, §13 "2016 delivery"). עד היום הבחירה הזאת העבירה
             * שעה והעניקה ראיה על שלוש מסירות שלא נעשו. עכשיו היא נותנת שלוש חבילות ביד,
             * ושלושה מקומות בעולם נדלקים. מה שנמסר ייספר ב-`p-report`.
             */
            id: 'three',
            text: '(שלוש מסירות — ולוודא שהגיעו.)',
            then: [
              { e: 'flag', flag: 'p:commit' },
              { e: 'flagValue', flag: 'p:commit', value: 3 },
              { e: 'flagValue', flag: CRISIS_COMMIT, value: 3 },
              { e: 'flag', flag: 'p:carry:a' },
              { e: 'flag', flag: 'p:carry:b' },
              { e: 'flag', flag: 'p:carry:c' },
              { e: 'toast', text: 'מתוקי: "שלמה ברחוב, בני במגרש, אורנה באלנבי. שם על כל חבילה." — "ואישור על כל אחת."', tone: 'plain' },
            ],
          },
          {
            id: 'one',
            text: '"אחת. את זה אני יכול לקיים."',
            then: [
              { e: 'flag', flag: 'p:commit' },
              { e: 'flagValue', flag: 'p:commit', value: 1 },
              { e: 'flagValue', flag: CRISIS_COMMIT, value: 1 },
              { e: 'flag', flag: 'p:carry:a' },
              { e: 'toast', text: 'מתוקי: "אז שלמה. הדלת הירוקה ברחוב, קומה שנייה." — "אחת."', tone: 'plain' },
            ],
          },
          {
            id: 'decline',
            text: '"היום אני לא יכול. תשאיר למי שזמין."',
            then: [
              { e: 'flag', flag: 'p:deliver' },
              { e: 'flagValue', flag: 'p:delivery', value: 'declined' },
              { e: 'flagValue', flag: CRISIS_COMMIT, value: 0 },
              { e: 'personality', key: 'honesty', delta: 2 },
              { e: 'toast', text: 'מתוקי: "בסדר. רק תסמן שלא אספור אותך." — "מסומן."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'p-table',
    nameHe: 'פרדי',
    branches: [
      {
        lines: [
          { who: null, text: 'הטבלה התעדכנה. פעם אחת, ובלי שאף אחד כאן נגע בה.' },
          { who: 'פוגי', text: 'אז הכול נמחק?' },
          { who: 'פרדי', text: 'בטבלה ירדו נקודות.' },
          { who: 'פוגי', text: 'אני לא מדבר רק על הטבלה.' },
          { who: 'פרדי', text: 'גם אני לא.' },
          { who: 'עמית', text: 'תשאירו את הדף. צריך לזכור גם מאיפה ממשיכים.' },
        ],
        choices: [
          {
            id: 'compute',
            text: '(לבדוק מה זה משנה בטבלה. רק את זה.)',
            then: [
              { e: 'flag', flag: 'p:table' },
              { e: 'skill', skill: 'knowledge', delta: 2, why: 'את זה אפשר לחשב' },
              { e: 'flagValue', flag: 'p:nine', value: 'understood' },
              { e: 'toast', text: 'עמית: "את זה אפשר לחשב." — "ואת השאר?" — "את השאר נדבר."', tone: 'plain' },
              { e: 'ending', id: 'checked' },
            ],
          },
          {
            id: 'keep',
            text: '(לשמור את הדף. ליד התמונה ההיא.)',
            then: [
              { e: 'flag', flag: 'p:table' },
              { e: 'flagValue', flag: 'p:nine', value: 'remembered' },
              { e: 'memory', item: 'clipping', id: 'p-table-2017' },
              { e: 'toast', text: 'פוגי: "שתיהן שלנו." — "כן. אחת לא מבטלת את השנייה."', tone: 'plain' },
              { e: 'ending', id: 'kept' },
            ],
          },
          {
            id: 'out',
            text: '(לצאת עם אופיר מההמולה.)',
            then: [
              { e: 'flag', flag: 'p:table' },
              { e: 'time', minutes: 20 },
              { e: 'rel', who: 'ofir', axis: 'bond', delta: 3 },
              { e: 'wellbeing', key: 'stress', delta: -5 },
              { e: 'toast', text: 'אופיר: "אני לא רוצה לשמוע עוד שמועה אחת." — "אז בוא. בלי רדיו בדרך."', tone: 'plain' },
              { e: 'ending', id: 'quiet' },
            ],
          },
        ],
      },
    ],
  },

  // ----------------------------------------------------------------- P05–P07 ------
  {
    id: 'p-amit',
    nameHe: 'עמית',
    branches: [
      /** מי שלקח בלי לשאול — השיחה היא על זה, ואין כאן החזר בלחיצה כשאין כסף */
      {
        when: { flagIs: { flag: TILL, value: 'took' } },
        lines: [
          { who: 'עמית', text: 'התמונה מ־2010 עוד אצלי.' },
          { who: 'פוגי', text: 'גם אצלי.' },
          { who: 'עמית', text: 'בתמונה כולם מסתדרים.' },
          { who: 'פוגי', text: 'בחיים זה דורש קצת יותר מקום.' },
          { who: 'עמית', text: 'וקצת פחות ״סמוך עליי״.' },
        ],
        choices: [
          {
            id: 'repay',
            text: '(להחזיר עכשיו את מה שלקחתי.)',
            when: { minAgorot: REPAY_AGOROT },
            noteHe: 'אין בכיס מה להחזיר היום. תוכנית מוסכמת היא התשובה השנייה.',
            then: [
              { e: 'flag', flag: 'p:amit' },
              { e: 'money', agorot: -REPAY_AGOROT, why: 'חזרה לקופה של הקבוצה' },
              { e: 'flagValue', flag: TILL, value: 'repaid' },
              { e: 'rel', who: 'amit', axis: 'bond', delta: 2 },
              { e: 'rel', who: 'amit', axis: 'trust', delta: 4 },
              /**
               * **לא `public_correction`, וזה לא ניואנס.** ספר הראיות מחזיק את התיקון
               * הפומבי כחלק ממשפחת העיתונות — `tests/life-ledger` דורש שכל תיקון ישב
               * על נושא ש**נכתב** קודם, ובצדק: תיקון הוא מה שעושים לדף שפורסם. כסף
               * שהוחזר הוא דבר אחר לגמרי, ולכן יש לו שם משלו.
               */
              { e: 'proof', kind: 'restitution', proofId: 'restitution:{chapter}:till', subjectHe: 'הכסף של הקבוצה', noteHe: 'הודה במה שקרה והחזיר את הסכום המלא.' },
              { e: 'toast', text: 'עמית: "הכסף חזר. עכשיו נבנה את השאר." — "אני לא מבקש שתשכח."', tone: 'plain' },
            ],
          },
          {
            id: 'plan',
            text: '"שתי עבודות מוגדרות, והסכום חוזר לקופה."',
            then: [
              { e: 'flag', flag: 'p:amit' },
              { e: 'flag', flag: 'promise:repayShared' },
              { e: 'flagValue', flag: 'p:repayment', value: 'two_deliveries' },
              { e: 'rel', who: 'amit', axis: 'trust', delta: 2 },
              { e: 'toast', text: 'עמית: "אני מסכים לתוכנית הזאת. לא לצ׳ק פתוח." — "שתי עבודות, והסכום חוזר."', tone: 'plain' },
            ],
          },
          {
            id: 'notyet',
            text: '"אני עוד לא מוכן לשיחה הזאת."',
            then: [
              { e: 'flag', flag: 'p:amit' },
              { e: 'flagValue', flag: 'p:sharedFinance', value: 'paused' },
              { e: 'rel', who: 'amit', axis: 'trust', delta: -2 },
              { e: 'toast', text: 'עמית: "אז לא ננהל כרגע כסף יחד." — "הבנתי."', tone: 'red' },
            ],
          },
        ],
      },
      /** ומי שלא לקח — אותה שיחה, בלי הפרה להמציא לה */
      {
        lines: [
          { who: 'עמית', text: 'התמונה מ־2010 עוד אצלי.' },
          { who: 'פוגי', text: 'גם אצלי.' },
          { who: 'עמית', text: 'בתמונה כולם מסתדרים.' },
          { who: 'פוגי', text: 'בחיים זה דורש קצת יותר מקום.' },
          { who: 'עמית', text: 'רוצה לעבור על הקופה? לא כי משהו קרה.' },
        ],
        choices: [
          {
            id: 'review',
            text: '(לעבור על הקופה והייעוד שלה, יחד.)',
            then: [
              { e: 'flag', flag: 'p:amit' },
              { e: 'time', minutes: 20 },
              // `enterprise` בתסריט → `business` במנוע (טבלת המיפוי)
              { e: 'skill', skill: 'business', delta: 3, why: 'עבר על הקופה לפני שמשהו קרה' },
              { e: 'proof', kind: 'finance_reviewed', proofId: 'finance_reviewed:{chapter}:till', subjectHe: 'הקופה של הקבוצה', noteHe: 'נבדקה כשלא היה לזה שום לחץ.' },
              { e: 'toast', text: 'עמית: "הכול תואם." — "זה המשפט הכי מרגיע שאמרת השנה."', tone: 'plain' },
            ],
          },
          {
            id: 'sit',
            text: '(לא היום. פשוט לשבת.)',
            then: [
              { e: 'flag', flag: 'p:amit' },
              { e: 'time', minutes: 20 },
              { e: 'rel', who: 'amit', axis: 'bond', delta: 3 },
              { e: 'wellbeing', key: 'stress', delta: -5 },
              { e: 'toast', text: 'עמית: "טוב. אז נשב." — "גם זה סדר יום."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'p-choice',
    nameHe: 'קובי',
    branches: [
      {
        lines: [
          { who: 'קובי', text: 'מה אתה רוצה לעשות עכשיו?' },
          { who: 'פוגי', text: 'לא יודע.' },
          { who: 'קובי', text: 'מותר.' },
          { who: 'פוגי', text: 'אתה כבר עברת את זה.' },
          { who: 'קובי', text: 'כן. אבל היום אני שואל אותך.' },
        ],
        // (pass D, §44 S3 — "live route shift, not a route menu") the answer is a thing in the room
        then: [{ e: 'flag', flag: 'p:asked' }],
      },
    ],
  },
  {
    id: 'p-do-central',
    nameHe: null,
    branches: [
      {
        lines: [{ who: null, text: 'על השולחן, מתחת לעיתון: טופס חידוש המנוי. העט של אבא לידו, כאילו במקרה.' }],
        choices: [
          {
            id: 'central',
            text: '(להמשיך להגיע — באחריות שאני יכול לשאת.)',
            then: [
              { e: 'flag', flag: 'p:choice' },
              { e: 'flagValue', flag: 'life:football', value: 'central' },
              { e: 'proof', kind: 'continuity', proofId: 'continuity:{chapter}:terrace', subjectHe: 'להמשיך להגיע', audience: 'gate5', delta: 3, noteHe: 'לא הבטיח את כל השבת, והגיע.' },
              { e: 'heard', proofId: 'continuity:{chapter}:terrace' },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 2 },
              { e: 'toast', text: 'קובי: "אז נבדוק מתי המשחק הבא." — "ולא ניקח את כל השבת על עצמנו."', tone: 'plain' },
            ],
          },
          { id: 'not-yet', text: '(עוד לא.)', then: [] },
        ],
      },
    ],
  },
  {
    id: 'p-do-peripheral',
    nameHe: null,
    branches: [
      {
        lines: [{ who: null, text: 'הכיסא הקטן ליד הכורסה שלו. מול הטלוויזיה, איפה שישבת כשהיית בן עשר.' }],
        choices: [
          {
            id: 'peripheral',
            text: '"אוהד מזדמן. ולפעמים לראות איתך."',
            then: [
              { e: 'flag', flag: 'p:choice' },
              { e: 'flagValue', flag: 'life:football', value: 'peripheral' },
              { e: 'flag', flag: 'life:armchair' },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 3 },
              { e: 'toast', text: 'קובי: "אז לפעמים." — "אתה לא כועס?" — "אני שואל אם אתה בא לאכול."', tone: 'plain' },
            ],
          },
          { id: 'not-yet', text: '(עוד לא.)', then: [] },
        ],
      },
    ],
  },
  {
    id: 'p-do-distance',
    nameHe: null,
    branches: [
      {
        lines: [{ who: null, text: 'הטלפון על הספה. הקבוצה של שער 5: מאתיים הודעות מאז הבוקר, ואף אחת מהן לא שואלת מה שלומך.' }],
        choices: [
          {
            id: 'distance',
            text: '"אני לוקח הפסקה. אחר כך אחליט אם חוזר."',
            then: [
              { e: 'flag', flag: 'p:choice' },
              { e: 'flagValue', flag: 'life:football', value: 'peripheral' },
              { e: 'flag', flag: 'life:distance' },
              { e: 'wellbeing', key: 'stress', delta: -8 },
              { e: 'toast', text: 'קובי: "מה להעביר לך בינתיים?" — "רק אם קורה משהו שאתה רוצה לדבר עליו." — "עליך אני יכול להתקשר?"', tone: 'plain' },
            ],
          },
          { id: 'not-yet', text: '(עוד לא.)', then: [] },
        ],
      },
    ],
  },
  {
    id: 'p-invite',
    nameHe: 'אפי',
    // "רציתי לשאול אם אתה בא" — הזמנה, לא מפגש
    remote: { 'אפי': 'phone' },
    branches: [
      {
        lines: [
          { who: 'אפי', text: 'בשישי אנחנו נפגשים.' },
          { who: 'פוגי', text: 'למשחק?' },
          { who: 'אפי', text: 'גם. רציתי לשאול אם אתה בא.' },
          { who: 'פוגי', text: 'לא יודע אם חזרתי.' },
          { who: 'אפי', text: 'לא ביקשתי הודעה לעיתונות.' },
        ],
        choices: [
          {
            id: 'practice',
            text: '(לבוא לאימון אחד. בלי הבטחה להמשך.)',
            then: [
              { e: 'flag', flag: 'p:invite' },
              { e: 'flagValue', flag: 'life:returnInvite', value: 'practice' },
              { e: 'rel', who: 'efi', axis: 'bond', delta: 2 },
              { e: 'toast', text: 'אפי: "תביא נעליים." — "רק שלא תרשום אותי לעשור." — "כבר לא עובד עם חוזים כאלה."', tone: 'plain' },
              { e: 'ending', id: 'central' },
            ],
          },
          {
            id: 'meal',
            text: '(לבוא רק לשבת איתם אחרי.)',
            then: [
              { e: 'flag', flag: 'p:invite' },
              { e: 'flagValue', flag: 'life:returnInvite', value: 'meal' },
              { e: 'rel', who: 'ofir', axis: 'bond', delta: 2 },
              { e: 'toast', text: 'אופיר: "אז נשמור לך כיסא." — "זה תפקיד שאני בכושר בשבילו."', tone: 'plain' },
              { e: 'ending', id: 'peripheral' },
            ],
          },
          {
            id: 'call',
            text: '"לא הפעם. תתקשר גם בלי טורניר."',
            then: [
              { e: 'flag', flag: 'p:invite' },
              { e: 'flagValue', flag: 'life:returnInvite', value: 'call_only' },
              { e: 'toast', text: 'אפי: "מחר?" — "מחר טוב."', tone: 'plain' },
              { e: 'ending', id: 'distance' },
            ],
          },
        ],
      },
    ],
  },
]
