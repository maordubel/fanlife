import type { LifeState } from '../types'
import { PARTNER_TAG } from '../partner'

import type { Beat, BeatAction } from './beats'
import type { EndingCard } from './chapter1986'
import type { ChoiceDef, Conversation, Effect } from './script'
import type { Condition } from '../world/types'
import type { LifeEvent } from '../events'
import { PORTRAIT_GROWTH } from './chapter2012growth'

/**
 * L01–L06 · "חיי בית — בחירה, זוגיות והורות" · בשני פרקים.
 *
 * **`2011-people`** (L01–L03) — שלושה מפגשים, ואף אחד מהם אינו סף משיכה.
 * **`2013-household`** (L04–L06) — היומן שעל המקרר, השיחה על הורות, והערב הראשון.
 *
 * **הכלל של הענף, ומה שהוא אוסר.** *"כניסה לקשר מחייבת שלושה מפגשים שונים והסכמה
 * הדדית, לא סף משיכה"*, ו*"אין קשר רומנטי אוטומטי; היכרות יכולה להישאר חברות"*.
 * לכן שלוש הסצנות תמיד קורות, כל אחת יכולה להיגמר בחברות, ובן/בת הזוג נקבע
 * **בסוף** מתוך מי שהיה הדדי — לא לפי מספר.
 *
 * **ו-`L01.3` קיימת בכוונה.** התסריט כותב בחירה שבה פוגי לוחץ על תמונה אחרי
 * שסירבה, והיא נענית ב*"אמרתי לא. זה מספיק."* — עם מחיר ביחסים. משחק שאין בו את
 * הבחירה הזאת הוא משחק שמונע ממך לטעות, ושמירה עליה היא מה שנותן משמעות לשתיים
 * האחרות. היא אינה נסתרת ואינה מוצגת כהישג.
 *
 * **`PARTNER` הוא תפקיד, לא דמות.** התסריט כותב אותו כך ואומר שהדמות הפעילה
 * מחליפה אותו. `lib/life/partner.ts` הוא מי שמחליף, פעם אחת, ברדיוסר —
 * במקום שלוש העתקות של כל שיחה שאחת מהן תיסחף (כלל 59).
 *
 * **ואין כאן סימולציית פוריות.** *"רצון אינו יוצר לידה בלחיצה. מעבר זמן מוסכם
 * מתאר הגעה להורות בלי סימולציית פוריות או הבטחת תוצאה רפואית."* לכן `L05` קובעת
 * **כוונה** בלבד, ו-`L06` היא מעבר זמן שקורה רק כששני התנאים מתקיימים — כוונה,
 * ובן/בת זוג. `life:child` מורם שם, ובשום מקום אחר.
 */

export const PORTRAIT_FAMILY: Record<string, string> = {
  ...PORTRAIT_GROWTH,
  /** שלוש הדמויות של הענף — אין להן פיגורה, וניצב כללי הוא הצורה הכנה (כלל 67) */
  'מלאני': 'faceWoman',
  'דור': 'faceYoung',
  'תמר': 'faceLimor',
}

// ------------------------------------------------------------------- Part I ------

export function objectivePeople(state: LifeState, sceneId: string): string | null {
  if (state.chapterDone) return null
  const f = state.flags
  if (!f['l:melanie']) return sceneId === 'allenby' ? null : 'פינת אלנבי. מישהי מחכה, והטלפון בכיס.'
  if (f['l:melanieKind'] === 'task' && !f['l:mutual:melanie'] && !f['l:dor']) return 'המחזיר של מלאני. מול השמש, לפני שהאור הולך.'
  if (!f['l:dor']) return sceneId === 'street' ? null : 'ברחוב. דור מארגנת משהו, ולא ביקשה עזרה.'
  if ((f['l:dorKind'] === 'task' || f['l:dorKind'] === 'asked') && !f['l:posters'] && !f['l:tamar']) return 'הפוסטרים של דור, על הקיר. היא לא תחכה.'
  if (!f['l:tamar']) return sceneId === 'kiosk' ? null : 'בקיוסק. תמר שאלה שאלה, ולא על הפועל.'
  return null
}

export const ENDINGS_PEOPLE: Record<string, EndingCard> = {
  chose: {
    id: 'chose',
    titleHe: 'שלושה ערבים, ואחד מהם המשיך',
    bodyHe:
      'שלושה אנשים, שלושה ערבים, ואחד מהם לא נגמר בסוף הערב. אף אחד לא נבחר לפי מספר ואף אחד לא היה פרס — היה מישהו שרצית לראות שוב, וגם הוא רצה.',
    memoryHe: 'הודעה קצרה, שנשלחה אחרי.',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
  friends: {
    id: 'friends',
    titleHe: 'זה מותר, אתה יודע',
    bodyHe:
      'שלושה ערבים, ושלושתם נשארו חברות. אין פה החמצה: אחת אמרה שזה מותר, ואמרת שטוב שהבהרנו לפני שעמית פותח טבלה — והיא צחקה, ואתם עדיין מדברים.',
    memoryHe: 'שלושה מספרים, שכולם עונים.',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
  alone: {
    id: 'alone',
    titleHe: 'אמרתי לא. זה מספיק',
    bodyHe:
      'אחד משלושת הערבים נגמר בשורה שלא ביקשת לשמוע, והיא הייתה צודקת. אמרת "הבנתי", ולא הוספת. זה לא הופך אותך לאדם רע, וגם לא נמחק.',
    memoryHe: 'שיחה שלא נמשכה.',
    memoryItem: 'folded-paper',
    presence: 'late',
  },
}

export const BEATS_PEOPLE: Beat[] = [
  { id: 'l-melanie', at: 'allenby', trigger: 'enter', when: { none: [{ flag: 'l:melanie' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'l-melanie' }] },
  { id: 'l-dor', at: 'street', trigger: 'enter', when: { all: [{ flag: 'l:melanie' }], none: [{ flag: 'l:dor' }] }, delayMs: 650, do: [{ a: 'talk', conversation: 'l-dor' }] },
  { id: 'l-tamar', at: 'kiosk', trigger: 'enter', when: { all: [{ flag: 'l:dor' }], none: [{ flag: 'l:tamar' }] }, delayMs: 650, do: [{ a: 'talk', conversation: 'l-tamar' }] },
  /**
   * the invitations — and `l:done` is written by the conversation, not by the beat before it
   * (90-C): the first version raised it here, so a player who closed the box by mistake never
   * saw an ending at all (pass C, 28.9.2026, found by the confused player).
   */
  { id: 'l-close', trigger: 'clock', when: { all: [{ flag: 'l:tamar' }], none: [{ flag: 'l:done' }] }, delayMs: 1300, do: [{ a: 'talk', conversation: 'l-close' }] },
]

// ------------------------------------------------------------------ Part II ------

export function objectiveHousehold(state: LifeState, sceneId: string): string | null {
  if (state.chapterDone) return null
  if (!state.flags['hh:diary']) return sceneId === 'home' ? null : 'בבית. היומן על המקרר, ויש בו הכול חוץ מכם.'
  if (!state.flags['hh:parent']) return sceneId === 'home' ? null : 'שיחה אחת, ולא "מתישהו".'
  return null
}

export const ENDINGS_HOUSEHOLD: Record<string, EndingCard> = {
  shared: {
    id: 'shared',
    titleHe: 'עם הבטחה שנדבר לפני',
    bodyHe:
      'ערב משותף, וזמן לכל אחד בנפרד. לא הבטחת שלא יהיה שינוי — הבטחת שנדבר לפני, וזה מה שהתבקש מלכתחילה.',
    memoryHe: 'יומן, עם שתי כתבי יד.',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
  separate: {
    id: 'separate',
    titleHe: 'טוב שאמרת',
    bodyHe:
      'אמרת בכנות שאתה לא רוצה בית משותף עכשיו. זה כאב לשמוע, ונאמר — ולא בנית משהו שאתה לא מוכן אליו כדי לא לאכזב.',
    memoryHe: 'שני מפתחות, שנשארו נפרדים.',
    memoryItem: 'house-key',
    presence: 'inside',
  },
  parent: {
    id: 'parent',
    titleHe: 'אז נצטרך לבחור באמת',
    bodyHe:
      'אמרת שאתה רוצה להיות הורה, בקול, ביחד. נשאלת מה יקרה כשזה לא יסתדר עם שבת, ואמרת שאז נצטרך לבחור באמת — וזו הייתה התשובה הנכונה היחידה.',
    memoryHe: 'דף עם שתי רשימות, אחת ריקה.',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
}

// ======================================================= השבוע — pass D (§41, 28.9.2026) ====
/**
 * **היומן שעל המקרר, כמשחק.** `IMPLEMENTATION-PASS-PROGRAMMER` §41: *"5 evenings, 7 demands;
 * drag commitments · only 1–2 approaches can be completed before the pressure closes ·
 * consequences occur, not summarized · calendar now marked/crossed"*.
 *
 * מי שבוחר לבנות יומן (`calendar`), להבטיח בלי לבדוק (`promise`), או — בבית העצמאי — לכתוב
 * בו גם משהו שאינו משחק (`own`), יושב מול השבוע: חמישה ערבים, שבעה דברים, ולכל דבר הערבים
 * שבהם הוא קיים (הליגה של אופיר רק בשני וברביעי, המעבר של מתוקי בשלישי וברביעי, הפגישה בשער
 * 5 רק ברביעי, אבא ואמא רק בחמישי). **רביעי הוא הצוואר**, ושני דברים תמיד נשארים בחוץ.
 *
 * ואז השבוע **קורה** — ערב אחרי ערב, כרטיס לכל אחד (`hh-live-*`) — ומה שנשאר בחוץ עונה
 * בקולו (`hh-miss-*`): אופיר שיחק עם תשעה, הספה של מתוקי נשארה בקומה השלישית. ביום חמישי
 * בלילה היומן על המקרר מסומן ומחוק (`hh-fridge`), ורק אז נשאלת השאלה על הורות.
 *
 * מי שהבטיח "ערב קבוע" בלי לבדוק גילה שהערב הוא רביעי — הצוואר — והשבוע יודע אם שמר
 * עליו (`life:household:week`, נקרא ב-2021).
 */
type Day = 'sun' | 'mon' | 'tue' | 'wed' | 'thu'
type Demand = 'us' | 'work' | 'ofir' | 'metuki' | 'terrace' | 'parents' | 'alone'
const DAYS: ReadonlyArray<{ id: Day; he: string; demands: readonly Demand[] }> = [
  { id: 'sun', he: 'ראשון', demands: ['us', 'work', 'alone'] },
  { id: 'mon', he: 'שני', demands: ['us', 'ofir', 'work'] },
  { id: 'tue', he: 'שלישי', demands: ['us', 'metuki', 'work'] },
  { id: 'wed', he: 'רביעי', demands: ['us', 'ofir', 'terrace', 'metuki'] },
  { id: 'thu', he: 'חמישי', demands: ['us', 'parents', 'alone'] },
]
/** the conversation ids of the week, spelled in full (rule 71 — a generated id is named once) */
export const WEEK_NODES = {
  pair: { sun: 'hh-week-pair-sun', mon: 'hh-week-pair-mon', tue: 'hh-week-pair-tue', wed: 'hh-week-pair-wed', thu: 'hh-week-pair-thu' },
  solo: { sun: 'hh-week-solo-sun', mon: 'hh-week-solo-mon', tue: 'hh-week-solo-tue', wed: 'hh-week-solo-wed', thu: 'hh-week-solo-thu' },
} as const
type Mode = keyof typeof WEEK_NODES
const DEMAND_TEXT: Record<Demand, Record<Mode, string>> = {
  us: { pair: '(ערב שלנו. בלי טלפון על השולחן.)', solo: '(קרן. היא אורזת, ואמרת שתבוא.)' },
  work: { pair: '(משמרת ערב — הדדליין ביום שלישי.)', solo: '(משמרת ערב — הדדליין ביום שלישי.)' },
  ofir: { pair: '(ליגת הקיץ של אופיר — חסר להם חמישי.)', solo: '(ליגת הקיץ של אופיר — חסר להם חמישי.)' },
  metuki: { pair: '(מתוקי עובר דירה. ארגזים, שלוש קומות.)', solo: '(מתוקי עובר דירה. ארגזים, שלוש קומות.)' },
  terrace: { pair: '(הפגישה בשער 5 — מחלקים תפקידים לעונה.)', solo: '(הפגישה בשער 5 — מחלקים תפקידים לעונה.)' },
  parents: { pair: '(ארוחת ערב אצל קובי ורחל.)', solo: '(ארוחת ערב אצל קובי ורחל.)' },
  alone: { pair: '(ערב לבד. ספה, ושום דבר.)', solo: '(ערב לבד. ספה, ושום דבר.)' },
}
const WEEK = 'life:household:week'
const next = (mode: Mode, day: Day): string | null => {
  const i = DAYS.findIndex((d) => d.id === day)
  const following = DAYS[i + 1]
  return following ? WEEK_NODES[mode][following.id] : null
}
function weekChoices(mode: Mode, day: Day, demands: readonly Demand[]): ChoiceDef[] {
  return demands.map((demand) => {
    const then: Effect[] = [
      { e: 'flag', flag: `hh:wk:${demand}` },
      { e: 'flagValue', flag: `hh:wk:${day}`, value: demand },
    ]
    const after = next(mode, day)
    if (after) then.push({ e: 'goto', node: after })
    else then.push({ e: 'flag', flag: 'hh:planned' }, { e: 'toast', text: 'היומן נסגר. חמישה ערבים, ושני דברים שלא נכנסו.', tone: 'plain' })
    return { id: demand, text: DEMAND_TEXT[demand][mode], when: { notFlag: `hh:wk:${demand}` }, hidden: true, then }
  })
}
const DAY_LINE: Record<Day, string> = {
  sun: 'יום ראשון. שלוש שורות ביומן, וערב אחד.',
  mon: 'יום שני. אופיר כתב בקבוצה שבשני משחקים — ומי שלא בא, שיגיד.',
  tue: 'יום שלישי. הדדליין של העבודה, ומתוקי שואל מי יכול לסחוב.',
  wed: 'יום רביעי. כולם רוצים את רביעי.',
  thu: 'יום חמישי. רחל כבר קנתה דג.',
}
function weekNode(mode: Mode, day: (typeof DAYS)[number]): Conversation {
  return {
    id: WEEK_NODES[mode][day.id],
    nameHe: null,
    branches: [
      ...(mode === 'pair' && day.id === 'wed'
        ? [
            {
              when: { flag: 'promise:householdEvening' },
              lines: [
                { who: null, text: 'יום רביעי. כולם רוצים את רביעי.' },
                { who: null, text: 'ובשורה של רביעי, בכתב שלך: "ערב קבוע." הבטחת בלי לבדוק, והערב הקבוע נפל על היום הכי מלא בשבוע.' },
              ],
              choices: weekChoices(mode, day.id, day.demands),
            },
          ]
        : []),
      { lines: [{ who: null, text: DAY_LINE[day.id] }], choices: weekChoices(mode, day.id, day.demands) },
    ],
  }
}
export const CONVERSATIONS_WEEK: Conversation[] = (['pair', 'solo'] as const).flatMap((mode) => DAYS.map((day) => weekNode(mode, day)))

/**
 * a box closed in the middle of the week is not a week lost: the diary on the fridge opens it
 * again at the first evening still empty (`hh-week-again`, and the fridge itself — `questsPassD.ts`)
 */
export const CONVERSATION_WEEK_RESUME: Conversation = {
  id: 'hh-week-resume',
  nameHe: null,
  branches: (['pair', 'solo'] as const).flatMap((mode) =>
    DAYS.map((day) => ({
      when: {
        all: [mode === 'pair' ? { flag: 'life:partner' } : { notFlag: 'life:partner' }],
        none: [{ flag: `hh:wk:${day.id}` }],
      },
      lines: [{ who: null, text: 'היומן על המקרר. השבוע עוד חצי ריק, והעט עוד תלוי בחוט.' }],
      then: [{ e: 'goto' as const, node: WEEK_NODES[mode][day.id] }],
    })),
  ),
}

/** one evening, lived — the card the week shows for what was written in it */
const SNAP: Record<Demand, { pair: string; solo: string }> = {
  us: { pair: 'ערב שלכם. הטלפון נשאר במגירה, ורק פעם אחת רצית לבדוק.', solo: 'קרן, עשרים ארגזים, ופיצה על הרצפה. היא לא אמרה תודה — היא אמרה "תבוא לבקר".' },
  work: { pair: 'משמרת ערב. הגשת בזמן, ואף אחד לא אמר כלום — שזה אצלם מחמאה.', solo: 'משמרת ערב. הגשת בזמן, ואף אחד לא אמר כלום — שזה אצלם מחמאה.' },
  ofir: { pair: 'ליגת הקיץ. נכנסת כחמישי, בעטת פעמיים, ואופיר צעק עליך כאילו אתם בני שש־עשרה.', solo: 'ליגת הקיץ. נכנסת כחמישי, בעטת פעמיים, ואופיר צעק עליך כאילו אתם בני שש־עשרה.' },
  metuki: { pair: 'שלוש קומות עם ספה. מתוקי קילל כל מדרגה בשמה.', solo: 'שלוש קומות עם ספה. מתוקי קילל כל מדרגה בשמה.' },
  terrace: { pair: 'שער 5, מתחת ליציע. חילקו תפקידים, ולקחת את מה שאף אחד לא רצה.', solo: 'שער 5, מתחת ליציע. חילקו תפקידים, ולקחת את מה שאף אחד לא רצה.' },
  parents: { pair: 'אצל קובי ורחל. דג, ושאלה אחת על נכדים שאף אחד לא ענה עליה.', solo: 'אצל קובי ורחל. דג, ושאלה אחת על נכדים שאף אחד לא ענה עליה.' },
  alone: { pair: 'ערב לבד. ספה, שום דבר, ובעשר כבר ישנת.', solo: 'ערב לבד. ספה, שום דבר, ובעשר כבר ישנת.' },
}
const DAY_TITLE: Record<Day, string> = { sun: 'יום ראשון', mon: 'יום שני', tue: 'יום שלישי', wed: 'יום רביעי', thu: 'יום חמישי' }

const lived = (day: Day): Condition => ({ flag: `hh:live:${day}` })
const PAIR: Condition = { flag: 'life:partner' }
/** what was left out answers in its own voice — and costs what it costs */
const MISS: ReadonlyArray<{ demand: Demand; say: string; events: LifeEvent[] }> = [
  { demand: 'ofir', say: 'אופיר, בהודעה: "שיחקנו עם תשעה. הפסדנו בכבוד. תבוא לפעם הבאה, או תגיד שלא."', events: [{ t: 'relationship.changed', who: 'ofir', axis: 'bond', delta: -3 }] },
  { demand: 'metuki', say: 'מתוקי: "הספה נשארה בקומה השלישית. גם אני, קצת."', events: [{ t: 'relationship.changed', who: 'metuki', axis: 'trust', delta: -3 }] },
  { demand: 'terrace', say: 'בשער 5 חילקו את התפקידים בלעדיך. קיבלת את מה שנשאר: לסחוב את הדגלים.', events: [{ t: 'relationship.changed', who: 'yevgeny', axis: 'bond', delta: -2 }] },
  { demand: 'parents', say: 'רחל, בטלפון: "קובי שם צלחת בשבילך. אחר כך הוריד."', events: [{ t: 'relationship.changed', who: 'rachel', axis: 'bond', delta: -3 }, { t: 'relationship.changed', who: 'kobi', axis: 'bond', delta: -2 }] },
  { demand: 'work', say: 'המנהלת: "אז ביום רביעי בבוקר, לפני כולם." — ורביעי בבוקר, לפני כולם.', events: [{ t: 'wellbeing.changed', key: 'stress', delta: 8 }] },
  { demand: 'alone', say: 'חמישה ערבים ואף אחד לא שלך. ביום שישי קמת עייף, בלי לדעת ממה.', events: [{ t: 'energy.changed', delta: -10 }] },
]

const WEEK_OPEN: Condition = { all: [{ flag: 'hh:planned' }] }
export const BEATS_WEEK: Beat[] = [
  { id: 'hh-week-again', at: 'home', trigger: 'clock', when: { all: [{ flag: 'hh:week' }], none: [{ flag: 'hh:planned' }] }, delayMs: 2600, do: [{ a: 'talk', conversation: 'hh-week-resume' }] },
  { id: 'hh-live-card', at: 'home', trigger: 'clock', when: { all: [WEEK_OPEN], none: [{ flag: 'hh:live:start' }] }, delayMs: 700, do: [{ a: 'flag', flag: 'hh:live:start' }, { a: 'card', titleHe: 'השבוע', subHe: 'חמישה ערבים, כמו שכתבת אותם', ms: 1800 }] },
  // one card per evening, in order — each waits for the one before it
  ...DAYS.flatMap((day, i): Beat[] =>
    day.demands.flatMap((demand): Beat[] =>
      (['pair', 'solo'] as const).map((mode): Beat => ({
        id: `hh-live-${day.id}-${demand}-${mode}`,
        at: 'home',
        trigger: 'clock',
        when: {
          all: [
            { flag: i === 0 ? 'hh:live:start' : `hh:live:${DAYS[i - 1]!.id}` },
            { flagIs: { flag: `hh:wk:${day.id}`, value: demand } },
            mode === 'pair' ? PAIR : { notFlag: 'life:partner' },
          ],
          none: [lived(day.id)],
        },
        delayMs: 250,
        do: [{ a: 'flag', flag: `hh:live:${day.id}` }, { a: 'card', titleHe: DAY_TITLE[day.id], subHe: SNAP[demand][mode], ms: 2300 }],
      })),
    ),
  ),
  // what was left out, after Thursday
  ...MISS.map(({ demand, say, events }): Beat => ({
    id: `hh-miss-${demand}`,
    at: 'home',
    trigger: 'clock',
    when: { all: [lived('thu')], none: [{ flag: `hh:wk:${demand}` }, { flag: `hh:missed:${demand}` }] },
    delayMs: 500,
    do: [{ a: 'flag', flag: `hh:missed:${demand}` }, { a: 'events', events }, { a: 'toast', text: say, tone: 'red' }] as BeatAction[],
  })),
  // Thursday night, the fridge: the week written down, crossed out where it did not happen
  {
    id: 'hh-fridge',
    at: 'home',
    trigger: 'clock',
    when: { all: [lived('thu')], none: [{ flag: 'hh:lived' }] },
    delayMs: 1400,
    do: [
      {
        a: 'derive',
        events: (state) => {
          const f = state.flags
          const promised = Boolean(f['promise:householdEvening'])
          const value = !f['hh:wk:us'] ? 'no-us' : promised ? (f['hh:wk:wed'] === 'us' ? 'kept' : 'broken') : 'us'
          return [{ t: 'flag.set', flag: WEEK, value }]
        },
      },
      { a: 'talk', conversation: 'hh-fridge' },
      { a: 'flag', flag: 'hh:lived' },
    ],
  },
]

export const CONVERSATION_FRIDGE: Conversation = {
  id: 'hh-fridge',
  nameHe: null,
  branches: [
    {
      when: { all: [PAIR, { flagIs: { flag: WEEK, value: 'broken' } }] },
      lines: [
        { who: null, text: 'חמישי בלילה. היומן על המקרר: ארבעה ערבים עם וי, ורביעי מחוק בשני קווים. "ערב קבוע", ומעליו, בכתב אחר: "היה".' },
        { who: PARTNER_TAG, text: 'לא כעסתי על רביעי. כעסתי שגיליתי אותו מהמקרר.' },
      ],
    },
    {
      when: { all: [PAIR, { flagIs: { flag: WEEK, value: 'kept' } }] },
      lines: [
        { who: null, text: 'חמישי בלילה. היומן על המקרר: חמישה ערבים עם וי, ורביעי מוקף בעיגול — בכתב שלך ובכתב שלה.' },
        { who: PARTNER_TAG, text: 'שמרת את רביעי. עם כל מה שנפל עליו.' },
      ],
    },
    {
      when: { all: [PAIR, { flagIs: { flag: WEEK, value: 'no-us' } }] },
      lines: [
        { who: null, text: 'חמישי בלילה. היומן על המקרר מלא. חמישה ערבים, חמישה ויים, ואף אחד מהם לא שלכם.' },
        { who: PARTNER_TAG, text: 'עשית הכול. חוץ ממה שביקשתי.' },
      ],
    },
    {
      when: PAIR,
      lines: [{ who: null, text: 'חמישי בלילה. היומן על המקרר: חמישה ערבים עם וי, ושתי שורות מחוקות — בכתב שלך, לא שלה.' }],
    },
    {
      when: { flagIs: { flag: WEEK, value: 'no-us' } },
      lines: [
        { who: null, text: 'חמישי בלילה. היומן על המקרר מלא, וקרן עברה דירה בלי שעזרת לסחוב.' },
        { who: 'קרן', text: 'בסדר גמור. רק תדע שספרתי ארגזים.' },
      ],
    },
    { lines: [{ who: null, text: 'חמישי בלילה. היומן על המקרר: חמישה ערבים עם וי, ושתי שורות מחוקות.' }] },
  ],
}

export const BEATS_HOUSEHOLD: Beat[] = [
  { id: 'hh-diary', at: 'home', trigger: 'enter', when: { none: [{ flag: 'hh:diary' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'hh-diary' }] },
  // באותו חדר כמו היומן (`homeAdult`: המטבח הוא הפינה של הסלון) — ולכן שעון ולא דלת: אין דלת לעבור בה
  // (pass D) after the week, if there was one — the question comes on Thursday night, by the fridge
  { id: 'hh-parent', at: 'home', trigger: 'clock', when: { all: [{ flag: 'hh:diary' }], none: [{ flag: 'hh:parent' }], any: [{ notFlag: 'hh:week' }, { flag: 'hh:lived' }] }, delayMs: 1400, do: [{ a: 'talk', conversation: 'hh-parent' }] },
  ...BEATS_WEEK,
  /**
   * **מעבר הזמן, ורק כששני התנאים מתקיימים.** כוונה להורות **ובן/בת זוג** —
   * ולא "רצה, ולכן קרה". הוא רץ אחרי `hh:parent`, והוא המקום היחיד במשחק
   * ש-`life:child` מורם בו.
   */
  { id: 'hh-first', trigger: 'clock', when: { all: [{ flag: 'hh:parent' }, { flagIs: { flag: 'hh:intent', value: 'yes' } }, { flag: 'life:partner' }], none: [{ flag: 'hh:first' }] }, delayMs: 1600, do: [{ a: 'talk', conversation: 'hh-first' }] },
]


// ---------------------------------------------------------------- the words ------

export const CONVERSATIONS_FAMILY: Conversation[] = [
  ...CONVERSATIONS_WEEK,
  CONVERSATION_WEEK_RESUME,
  CONVERSATION_FRIDGE,
  {
    id: 'l-melanie',
    nameHe: 'מלאני',
    branches: [
      {
        lines: [
          { who: 'מלאני', text: 'אתה מדבר איתי או עם המצלמה?' },
          { who: 'פוגי', text: 'איתך.' },
          { who: 'מלאני', text: 'אז למה אתה בודק איך יצא?' },
          { who: 'פוגי', text: 'הרגל.' },
          { who: 'מלאני', text: 'אפשר להכיר גם בלי להעלות הוכחה.' },
        ],
        choices: [
          {
            id: 'listen',
            text: '(להניח את הטלפון. לשאול מה היא רוצה לעשות.)',
            // pass C (L01 S1): what she wants to do is a task — the reflector against the
            // sun, before the light goes — and the evening is decided by doing it, not by the answer
            then: [
              { e: 'flag', flag: 'l:melanie' },
              { e: 'flagValue', flag: 'l:melanieKind', value: 'task' },
              { e: 'rel', who: 'melanie', axis: 'bond', delta: 2 },
              { e: 'toast', text: 'מלאני: "קודם תחזיק לי את המחזיר מול השמש. אחר כך קפה במקום שאפשר לשמוע בו." — "דרישה מוגזמת, אבל אנסה."', tone: 'plain' },
            ],
          },
          {
            id: 'friend',
            text: '(להציע חברות. בלי ציפייה לרומן.)',
            then: [
              { e: 'flag', flag: 'l:melanie' },
              { e: 'rel', who: 'melanie', axis: 'bond', delta: 3 },
              { e: 'flagValue', flag: 'l:melanieKind', value: 'friend' },
              { e: 'toast', text: 'מלאני: "זה מותר, אתה יודע." — "טוב שהבהרנו לפני שעמית פותח טבלה."', tone: 'plain' },
            ],
          },
          {
            /**
             * **הטעות נשמרת, ויש לה מחיר.** התסריט כותב אותה, והיא נענית במילים
             * שלה עצמה. משחק שמסיר את הבחירה הזאת הוא משחק שמונע ממך לטעות, ואז
             * שתי האחרות לא אומרות כלום.
             */
            id: 'push',
            text: '(ללחוץ על התמונה. היא כבר אמרה לא.)',
            then: [
              { e: 'flag', flag: 'l:melanie' },
              { e: 'rel', who: 'melanie', axis: 'bond', delta: -2 },
              { e: 'rel', who: 'melanie', axis: 'trust', delta: -4 },
              { e: 'flag', flag: 'l:crossed' },
              { e: 'wellbeing', key: 'regret', delta: 6 },
              { e: 'toast', text: 'מלאני: "אמרתי לא. זה מספיק." — "הבנתי."', tone: 'red' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'l-dor',
    nameHe: 'דור',
    branches: [
      {
        lines: [
          { who: 'דור', text: 'מי אמר שאני באה איתך?' },
          { who: 'פוגי', text: 'חשבתי שאנחנו באותו ראש.' },
          { who: 'דור', text: 'אנחנו באותה קבוצה. זה לא אותו דבר.' },
          { who: 'פוגי', text: 'אז בואי נתחיל מחדש.' },
          { who: 'דור', text: 'רעיון טוב.' },
        ],
        choices: [
          {
            id: 'join',
            text: '(לשאול מה התוכנית שלה — ולהצטרף אם מתאים.)',
            // pass C (L01 S2): her plan is the posters for Friday's evening on the wall, and she
            // leads it — joining is taking the tape, not saying yes
            then: [
              { e: 'flag', flag: 'l:dor' },
              { e: 'flagValue', flag: 'l:dorKind', value: 'task' },
              { e: 'rel', who: 'dor', axis: 'bond', delta: 2 },
              { e: 'toast', text: 'דור: "אני מארגנת, אתה עוזר. מתאים?" — "מתאים. בלי לגנוב את ההגה."', tone: 'plain' },
            ],
          },
          {
            id: 'other',
            text: '(להציע ערב אחר. בלי כדורגל.)',
            // …and she has her own goal tonight: she says no to the evening, and yes to the tape
            then: [
              { e: 'flag', flag: 'l:dor' },
              { e: 'flagValue', flag: 'l:dorKind', value: 'asked' },
              { e: 'rel', who: 'dor', axis: 'bond', delta: 1 },
              { e: 'toast', text: 'דור: "אתה יודע לעשות את זה?" — "עוד לא ניסינו." — "אז נבדוק. אבל לא הערב — הערב יש לי קיר."', tone: 'plain' },
            ],
          },
          {
            id: 'friend',
            text: '(להישאר חברים, ולסכם שלא תכננו יחד.)',
            then: [
              { e: 'flag', flag: 'l:dor' },
              { e: 'rel', who: 'dor', axis: 'bond', delta: 2 },
              { e: 'flagValue', flag: 'l:dorKind', value: 'friend' },
              { e: 'toast', text: 'דור: "מעולה. עכשיו אין מה לנחש." — "פחות מצחיק, יותר נוח."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'l-tamar',
    nameHe: 'תמר',
    branches: [
      {
        lines: [
          { who: 'תמר', text: 'שאלתי מה אתה אוהב לעשות.' },
          { who: 'פוגי', text: 'אמרתי.' },
          { who: 'תמר', text: 'אמרת לאיזו קבוצה אתה הולך.' },
          { who: 'פוגי', text: 'זה תופס די הרבה זמן.' },
          { who: 'תמר', text: 'אז מעניין אותי מה אתה עושה בשאר.' },
        ],
        choices: [
          {
            id: 'personal',
            text: '(לספר על משהו אישי, שלא קשור לספורט.)',
            then: [
              { e: 'flag', flag: 'l:tamar' },
              { e: 'time', minutes: 45 },
              { e: 'rel', who: 'tamar', axis: 'bond', delta: 3 },
              { e: 'flag', flag: 'l:mutual:tamar' },
              { e: 'toast', text: 'תמר: "עכשיו יש לי עוד שאלה." — "זה סימן טוב?" — "בדרך כלל."', tone: 'plain' },
            ],
          },
          {
            id: 'searching',
            text: '"אני עוד מחפש את זה."',
            then: [
              { e: 'flag', flag: 'l:tamar' },
              { e: 'rel', who: 'tamar', axis: 'bond', delta: 3 },
              { e: 'flag', flag: 'l:mutual:tamar' },
              { e: 'personality', key: 'honesty', delta: 3 },
              { e: 'toast', text: 'תמר: "גם זו תשובה." — "חשבתי שצריך להגיע מוכן." — "זה לא מבחן קבלה."', tone: 'plain' },
            ],
          },
          {
            id: 'friend',
            text: '(להישאר בקשר. כחברים.)',
            then: [
              { e: 'flag', flag: 'l:tamar' },
              { e: 'rel', who: 'tamar', axis: 'bond', delta: 2 },
              { e: 'flagValue', flag: 'l:tamarKind', value: 'friend' },
              { e: 'toast', text: 'תמר: "בשמחה. בלי שיעורי בית." — "עכשיו אני רגוע."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  /** L01 S1 (pass C) — Melanie's reflector, against the sun, before the light goes */
  {
    id: 'l-reflector',
    nameHe: 'מלאני',
    branches: [
      {
        lines: [
          { who: null, text: 'מחזיר כסוף, גדול ממה שנראה, והרוח מושכת אותו לצד השני.' },
          { who: 'מלאני', text: 'שמאלה. לא, השמאל שלי. עכשיו אל תזוז.' },
          { who: 'מלאני', text: 'יצא. ולא בגלל המצלמה.' },
        ],
        then: [
          { e: 'flag', flag: 'l:reflector' },
          { e: 'flag', flag: 'l:mutual:melanie' },
          { e: 'time', minutes: 25 },
          { e: 'energy', delta: -4 },
          { e: 'rel', who: 'melanie', axis: 'trust', delta: 3 },
          { e: 'toast', text: 'מלאני הראתה לך את התמונה. אתה לא בה, והיא טובה.', tone: 'plain' },
        ],
      },
    ],
  },
  /** L01 S2 (pass C) — Dor's posters on the wall: her plan, her order, his hands */
  {
    id: 'l-posters',
    nameHe: 'דור',
    branches: [
      {
        lines: [
          { who: 'דור', text: 'ישר. לא ישר שלך — ישר של קיר.' },
          { who: null, text: 'שישה פוסטרים. את החמישי שלך היא הזיזה שני סנטימטר, בלי להגיד.' },
        ],
        then: [
          { e: 'flag', flag: 'l:posters' },
          { e: 'flag', flag: 'l:mutual:dor' },
          { e: 'time', minutes: 30 },
          { e: 'energy', delta: -5 },
          { e: 'rel', who: 'dor', axis: 'trust', delta: 3 },
          { e: 'toast', text: 'דור: "לא גנבת את ההגה." — "רק את הנייר דבק."', tone: 'plain' },
        ],
      },
    ],
  },
  {
    /**
     * **ההסכמה ההדדית, ורק אחרי שלושת המפגשים.** אין כאן "בחר אחת משלוש" — ההזמנה מגיעה
     * **מהן**, רק ממי שהערב איתה היה הדדי (מעשה, לא תשובה), ופוגי עונה לה: כן, או לא הערב.
     * (מעבר ג׳, 28.9.2026: `l:done` נכתב כאן, בכל ענף — לא בביט שלפני.)
     */
    id: 'l-close',
    nameHe: null,
    branches: [
      {
        when: { any: [{ flag: 'l:mutual:melanie' }, { flag: 'l:mutual:dor' }, { flag: 'l:mutual:tamar' }] },
        lines: [
          { who: null, text: 'שלושה ערבים. הטלפון רוטט — מישהי כתבה ראשונה.' },
        ],
        choices: [
          {
            id: 'melanie',
            text: '(מלאני: "מחר יש אור טוב בשש. באים?" — לענות כן.)',
            when: { flag: 'l:mutual:melanie' },
            hidden: true,
            then: [{ e: 'flag', flag: 'l:done' }, { e: 'flagValue', flag: 'life:partner', value: 'melanie' }, { e: 'ending', id: 'chose' }],
          },
          {
            id: 'dor',
            text: '(דור: "נשארו לי שני קירות ביפו. אתה בא עם הנייר דבק?" — לענות כן.)',
            when: { flag: 'l:mutual:dor' },
            hidden: true,
            then: [{ e: 'flag', flag: 'l:done' }, { e: 'flagValue', flag: 'life:partner', value: 'dor' }, { e: 'ending', id: 'chose' }],
          },
          {
            id: 'tamar',
            text: '(תמר: "יש לי עוד שאלה. בערב?" — לענות כן.)',
            when: { flag: 'l:mutual:tamar' },
            hidden: true,
            then: [{ e: 'flag', flag: 'l:done' }, { e: 'flagValue', flag: 'life:partner', value: 'tamar' }, { e: 'ending', id: 'chose' }],
          },
          {
            id: 'none',
            text: '(לענות "לא הערב" — ולהתכוון לזה.)',
            then: [{ e: 'flag', flag: 'l:done' }, { e: 'ending', id: 'friends' }],
          },
        ],
      },
      { when: { flag: 'l:crossed' }, lines: [{ who: null, text: 'ההודעה נשארה לא נשלחת. זה היה הדבר הנכון.' }], then: [{ e: 'flag', flag: 'l:done' }, { e: 'ending', id: 'alone' }] },
      { lines: [{ who: null, text: 'שלושה מספרים חדשים בטלפון, וכולם עונים.' }], then: [{ e: 'flag', flag: 'l:done' }, { e: 'ending', id: 'friends' }] },
    ],
  },

  // ----------------------------------------------------------------- L04–L06 ------
  {
    id: 'hh-diary',
    nameHe: null,
    branches: [
      {
        when: { flag: 'life:partner' },
        lines: [
          { who: PARTNER_TAG, text: 'יש ביומן שלך הכול חוץ מאיתנו.' },
          { who: 'פוגי', text: 'חשבתי שברור שאנחנו נפגשים.' },
          { who: PARTNER_TAG, text: 'גם לי. ואז גיליתי שקבעת נסיעה באותו ערב.' },
          { who: 'פוגי', text: 'צריך לדבר על זה.' },
          { who: PARTNER_TAG, text: 'זה מה שאני עושה.' },
        ],
        choices: [
          {
            id: 'calendar',
            text: '(ערב משותף — ולכל אחד זמן משלו.)',
            then: [
              // (pass D) the week itself, on the fridge — five evenings, seven things
              { e: 'flag', flag: 'hh:week' },
              { e: 'goto', node: WEEK_NODES.pair.sun },
              { e: 'flag', flag: 'hh:diary' },
              { e: 'time', minutes: 25 },
              { e: 'flagValue', flag: 'hh:home', value: 'shared_calendar' },
              { e: 'proof', kind: 'family_agreement', proofId: 'family_agreement:{chapter}:calendar', subjectHe: 'הערב שלנו', noteHe: 'לא הבטיח שלא ישתנה; הבטיח שידברו לפני.' },
              { e: 'toast', text: '"בלי הבטחה שבחיים לא יהיה שינוי." — "עם הבטחה שנדבר לפני."', tone: 'plain' },
            ],
          },
          {
            id: 'separate',
            text: '"אני לא רוצה בית משותף עכשיו." (בכנות.)',
            then: [
              { e: 'flag', flag: 'hh:diary' },
              { e: 'flagValue', flag: 'hh:home', value: 'separate' },
              { e: 'personality', key: 'honesty', delta: 4 },
              { e: 'toast', text: '"זה כואב לשמוע, אבל טוב שאמרת." — "לא רציתי לבנות משהו שאני לא מוכן אליו."', tone: 'plain' },
            ],
          },
          {
            id: 'promise',
            text: '"ערב קבוע. אני מבטיח." (בלי לבדוק את היומן.)',
            then: [
              // (pass D) the week itself, on the fridge — five evenings, seven things
              { e: 'flag', flag: 'hh:week' },
              { e: 'goto', node: WEEK_NODES.pair.sun },
              { e: 'flag', flag: 'hh:diary' },
              { e: 'flag', flag: 'promise:householdEvening' },
              { e: 'flagValue', flag: 'hh:home', value: 'promise_needs_capacity' },
              { e: 'toast', text: '"אז תכתוב אותו." — "כתבתי."', tone: 'plain' },
            ],
          },
        ],
      },
      /**
       * **בית עצמאי, וקרן חברה לשיחה — לא בת זוג אוטומטית.** זו שורה מפורשת
       * בתסריט, והיא מה שמאפשר לפרק להיגמר גם בלי שנבחר אף אחד (כלל 75) בלי
       * להמציא קשר שלא נוצר.
       */
      {
        lines: [
          { who: 'קרן', text: 'יש לך יומן על המקרר ואין בו אף אחד.' },
          { who: 'פוגי', text: 'יש בו אותי.' },
          { who: 'קרן', text: 'זה מה שאמרתי.' },
          { who: 'פוגי', text: 'זה לא נשמע כמו מחמאה.' },
          { who: 'קרן', text: 'זו שאלה. הן נשמעות ככה.' },
        ],
        choices: [
          {
            id: 'own',
            text: '(לכתוב ביומן גם דברים שהם לא משחקים.)',
            then: [
              // (pass D) the week itself, on the fridge — five evenings, seven things
              { e: 'flag', flag: 'hh:week' },
              { e: 'goto', node: WEEK_NODES.solo.sun },
              { e: 'flag', flag: 'hh:diary' },
              { e: 'time', minutes: 25 },
              { e: 'flagValue', flag: 'hh:home', value: 'own_place' },
              { e: 'rel', who: 'keren', axis: 'bond', delta: 2 },
              { e: 'toast', text: 'קרן: "שתי שורות זה התחלה." — "שלוש, אם סופרים כביסה."', tone: 'plain' },
            ],
          },
          {
            id: 'as-is',
            text: '"ככה טוב לי עכשיו."',
            then: [
              { e: 'flag', flag: 'hh:diary' },
              { e: 'flagValue', flag: 'hh:home', value: 'own_place' },
              { e: 'personality', key: 'honesty', delta: 2 },
              { e: 'toast', text: 'קרן: "בסדר גמור." — "חיכיתי שתתווכחי." — "לא על זה."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'hh-parent',
    nameHe: null,
    branches: [
      {
        when: { flag: 'life:partner' },
        lines: [
          { who: PARTNER_TAG, text: 'כשאתה אומר מתישהו, אתה מתכוון למשהו?' },
          { who: 'פוגי', text: 'אני מתכוון שאני חושב על זה.' },
          { who: PARTNER_TAG, text: 'אז תחשוב איתי בקול.' },
          { who: 'פוגי', text: 'אני מפחד שאהיה אבא שלי.' },
          { who: PARTNER_TAG, text: 'איזה חלק ממנו?' },
        ],
        choices: [
          {
            id: 'yes',
            text: '"אני רוצה להיות הורה. בואו נבנה תוכנית יחד."',
            then: [
              { e: 'flag', flag: 'hh:parent' },
              { e: 'flagValue', flag: 'hh:intent', value: 'yes' },
              { e: 'proof', kind: 'parenthood_consent', proofId: 'parenthood_consent:{chapter}:both', subjectHe: 'ההחלטה להיות הורים', noteHe: 'נאמר בקול, על ידי שניהם, ולא "מתישהו".' },
              // **בלי סיום כאן.** הסיום של המסלול הזה הוא `hh-first` — מעבר הזמן —
              // וסיום שנפלט עכשיו היה סוגר את הפרק לפני שהערב הראשון מגיע.
              { e: 'toast', text: '"וגם כשזה לא מסתדר עם שבת?" — "אז נצטרך לבחור באמת."', tone: 'plain' },
            ],
          },
          {
            id: 'no',
            text: '"אני לא רוצה ילדים."',
            then: [
              { e: 'flag', flag: 'hh:parent' },
              { e: 'flagValue', flag: 'hh:intent', value: 'no' },
              { e: 'personality', key: 'honesty', delta: 4 },
              { e: 'toast', text: '"אני צריכה לחשוב מה זה אומר בשבילי." — "אני מבין. לא אעמיד פנים כדי להשאיר אותך."', tone: 'plain' },
              { e: 'ending', id: 'shared' },
            ],
          },
          {
            id: 'undecided',
            text: '"אני עדיין לא יודע. נקבע שיחה נוספת, בלי הבטחה."',
            then: [
              { e: 'flag', flag: 'hh:parent' },
              { e: 'flagValue', flag: 'hh:intent', value: 'undecided' },
              { e: 'toast', text: '"בסדר, אבל לא נעמיד פנים שהחלטנו." — "מסכים."', tone: 'plain' },
              { e: 'ending', id: 'shared' },
            ],
          },
        ],
      },
      {
        lines: [
          { who: null, text: 'הדירה שקטה. השאלה עולה לבד, בלי שאף אחד שואל.' },
          { who: 'פוגי', text: 'מתישהו.' },
          { who: null, text: 'אף אחד לא ענה, כי אין פה מי שיענה. זה גם סוג של תשובה.' },
        ],
        choices: [
          {
            id: 'later',
            text: '(להשאיר את השאלה פתוחה. בלי להחליט לבד על חיים של שניים.)',
            then: [
              { e: 'flag', flag: 'hh:parent' },
              { e: 'flagValue', flag: 'hh:intent', value: 'undecided' },
              { e: 'ending', id: 'separate' },
            ],
          },
          {
            id: 'content',
            text: '"ככה טוב לי. וזה לא סיפור עצוב."',
            then: [
              { e: 'flag', flag: 'hh:parent' },
              { e: 'flagValue', flag: 'hh:intent', value: 'no' },
              { e: 'wellbeing', key: 'regret', delta: -5 },
              { e: 'ending', id: 'separate' },
            ],
          },
        ],
      },
    ],
  },
  {
    /**
     * `L06` — מעבר הזמן המוסכם, ולא לידה בלחיצה. הוא רץ רק אחרי שהכוונה נאמרה
     * בקול על ידי שניהם, והוא **המקום היחיד** ש-`life:child` מורם בו.
     */
    id: 'hh-first',
    nameHe: 'קובי',
    branches: [
      {
        lines: [
          { who: null, text: 'עבר זמן. לא הרבה, ולא מעט — בדיוק כמה שהתסריט של החיים לוקח.' },
          { who: 'קובי', text: 'הוא קטן.' },
          { who: 'פוגי', text: 'גם אני הייתי.' },
          { who: 'קובי', text: 'אתה עשית יותר רעש.' },
          { who: 'רחל', text: 'הוא זוכר רק כשהיה כדורגל.' },
          { who: 'פוגי', text: 'אני פה, כן?' },
        ],
        choices: [
          {
            id: 'evening',
            text: '(לקחת את הערב — ולתת למי שאיתך לנוח.)',
            then: [
              { e: 'flag', flag: 'hh:first' },
              { e: 'flag', flag: 'life:child' },
              { e: 'time', minutes: 60 },
              { e: 'energy', delta: -15 },
              { e: 'proof', kind: 'first_evening', proofId: 'first_evening:{chapter}:child', subjectHe: 'הערב הראשון', noteHe: 'לקח את הערב כולו, ולא ביקש שיגידו לו תודה.' },
              { e: 'toast', text: '"אם אתה צריך עזרה, תקרא." — "גם אני יכול ללמוד."', tone: 'plain' },
              { e: 'ending', id: 'parent' },
            ],
          },
          /**
           * **L06.2 ו-L06.3 — עד 21.9.2026 הן לא היו כאן.** במקומן עמדה בחירה אחת שהומצאה
           * מתוך שורת הפעולות (*"הכנת תיק ותיאום יציאה"*), כלומר שתי בחירות שנכתבו הוחלפו
           * בפעולה שלא נכתבה כבחירה. `life:screenplay-coverage` מצא את זה.
           *
           * *"לבקש עזרה מקובי ורחל אם הם מסכימים"* — ההסכמה **היא השורה של רחל**: *"הערב
           * כן. זה לא אומר שכל שבת."* היא אומרת כן לערב אחד, בקול, ולכן אין כאן סף.
           */
          {
            id: 'grandparents',
            text: '(לבקש עזרה מקובי ורחל — אם הם מסכימים.)',
            then: [
              { e: 'flag', flag: 'hh:first' },
              { e: 'flag', flag: 'life:child' },
              { e: 'time', minutes: 30 },
              { e: 'flagValue', flag: 'life:family:help', value: 'one_evening' },
              { e: 'proof', kind: 'asked_not_assumed', proofId: 'asked_not_assumed:{chapter}:grandparents', subjectHe: 'עזרה מקובי ורחל', noteHe: 'שאל, ולא הניח שזה מובן מאליו.' },
              { e: 'rel', who: 'rachel', axis: 'trust', delta: 2 },
              { e: 'toast', text: 'רחל: "הערב כן. זה לא אומר שכל שבת." — "הבנתי." — קובי: "תכתוב גם את זה ביומן."', tone: 'plain' },
              { e: 'ending', id: 'parent' },
            ],
          },
          {
            id: 'home',
            text: '(לבטל יציאה בזמן — ולהסביר לחברים.)',
            then: [
              { e: 'flag', flag: 'hh:first' },
              { e: 'flag', flag: 'life:child' },
              { e: 'flagValue', flag: 'life:family:firstEvening', value: 'home' },
              // אותו `proofId` כמו `evening`: שתי הבחירות הן `family.care1` בתסריט — ערב אחד, לא שניים.
              { e: 'proof', kind: 'first_evening', proofId: 'first_evening:{chapter}:child', subjectHe: 'הערב הראשון', noteHe: 'ביטל בזמן, ואמר לחברים למה.' },
              { e: 'toast', text: 'אופיר: "תשמור על עצמך. אנחנו נסתדר." — "תשלח תמונה." — "רק של התוצאה?"', tone: 'plain' },
              { e: 'ending', id: 'parent' },
            ],
          },
        ],
      },
    ],
  },
]
