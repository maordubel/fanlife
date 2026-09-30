import type { LifeState } from '../types'
import { missed } from '../missReason'
import { PARTNER_TAG } from '../partner'

import type { Beat } from './beats'
import type { EndingCard } from './chapter1986'
import type { Conversation, Say } from './script'
import type { Condition } from '../world/types'
import { PORTRAIT_FAMILY } from './chapter2011family'

/**
 * L07–L09 · "אמרת שתחזור" · 2021 — הפרק השלישי של חיי הבית.
 *
 * **שני חיים עוברים בפרק הזה, ושניהם נגמרים בו** (כלל 75).
 * · **עם ילד** — המשחק הראשון שלו (`L07`), ההבטחה (`L08`), והאירוע שלו (`L09`).
 * · **בלי ילד** — ההבטחה בלבד. היא הסצנה היחידה שהתסריט כותב לכל חיים, ולכן היא
 *   גם זו שמחזיקה את הפרק לבד.
 *
 * **`L08` היא התשלום של הבטחה שנשארה פתוחה.** `L04.3` ("ערב קבוע, בלי לבדוק את
 * היומן") מרים `promise:householdEvening` ואיש לא סגר אותו — חוט פתוח, בדיוק מה
 * ש-`NEEDS_A_HOME` מתאר (*"יש `promise:` כדגל, אין מבנה עם מועד"*). התסריט קובע לו
 * מועד: `due: "L08"`. אז כאן הוא נסגר, בשלוש הצורות שהתסריט כותב — תיקון מוצע,
 * תיקון שבוצע, או "אני עדיין לא מסוגל". ומי שלא הבטיח שומע את הגרסה שבה אין הפרה:
 * *"זוכר ששאלתי מה שלומך?"*, עם קרן.
 *
 * **ו-`TARGET` נפתר לשני אנשים בלבד, וזה נאמר.** התסריט מונה שלושה יעדים — בן/בת
 * זוג, קרן או ילד. אף סצנה במשחק עוד לא נותנת **לילד** הבטחה שאפשר להפר, ולכן
 * היעד הזה אינו כאן; ענף שנפתח על הבטחה שלא ניתנה היה מדבר על משהו שלא קרה.
 *
 * **הילד אינו שורה במרשם.** הוא `RUNTIME_ROLES['הילד']` — תפקיד — והתסריט אומר
 * שהשם והתאריך נקבעים בסיכום חיים מפורש שעוד לא נבנה. לכן אין כאן `rel` על הילד:
 * יחסים עם אדם שאין לו מזהה הם מספר שאין לו בעלים. מה שנשאר הוא מה שהוא עשה,
 * כדגל, ומה שזה עשה לפוגי.
 */

export const PORTRAIT_PROMISES: Record<string, string> = {
  ...PORTRAIT_FAMILY,
  /** הילד — תפקיד בלי פיגורה משלו; ניצב כללי עד שהציור שלו ינחת (כלל 67) */
  'הילד': 'faceYoung',
}

export function objectivePromises(state: LifeState, sceneId: string): string | null {
  if (state.chapterDone) return null
  const child = Boolean(state.flags['life:child'])
  if (child && !state.flags['pr:first']) return sceneId === 'home' ? null : 'בבית. הוא שואל אם חייבים להישאר עד הסוף.'
  if (!state.flags['pr:promise']) return sceneId === 'home' ? null : 'בבית, ליד המקרר. מישהו מחכה לשמוע מה נעשה בפעם הבאה.'
  if (child && !state.flags['pr:scarf']) {
    const ask = state.flags['pr:ask']
    if (!ask) return sceneId === 'pitch' ? null : 'במגרש. בשבת הוא משחק, והוא ביקש שתבוא.'
    if (ask === 'checking') {
      if (!state.flags['pr:saw:his']) return 'הדף של המשחק שלו — על המקרר בבית, ליד היומן.'
      if (!state.flags['pr:saw:ours']) return 'לוח המשחקים — בקיוסק, ליד הדלפק.'
      return sceneId === 'pitch' ? 'בדקת את שתי השעות. עכשיו — לו.' : 'בדקת את שתי השעות. חזרה אליו, למגרש.'
    }
    if (!state.flags['pr:sat']) return 'שבת. חצר בית הספר, בחמש — הוא יחפש אותך ליד הגדר.'
    if (state.flags['pr:sat'] === 'run') return 'בלומפילד. השריקה ב-19:30 — אם לא עוצרים בדרך.'
  }
  return null
}

/**
 * ============================================ השבת שלו — שתי שעות, וגוף אחד (90-E) ====
 *
 * `NARRATIVE-QUEST-DESIGN-PASS-v2` §7 Stage D: *"use feature quests only where obligations
 * collide … parenting logistics changing an away day"*. זה המקום היחיד בין 2011 ל-2015+2021
 * שבו שתי התחייבויות נופלות על אותה שעה, ולכן זה המקום היחיד ששוחק. עד היום L09 הייתה
 * שאלה אחת: *"(לבחור באירוע שלו, ולסדר את השאר.)"* העבירה 90 דקות והעניקה `child_event`
 * — המשפט טען שהשבת קרתה (§11.4). עכשיו:
 *
 * 1. **הבקשה** (`pr-scarf`, במגרש) — לבוא, **לבדוק קודם**, או לומר בכנות שלא.
 * 2. **הבדיקה** — הדף שלו על המקרר (17:00–18:15, חצר בית הספר) והלוח בקיוסק (19:30,
 *    בלומפילד). רק מי שקרא את שניהם יודע ש**אפשר את שניהם** — וזו החלוקה (`pr-answer`).
 * 3. **השבת** (`pr-saturday`, בחצר של בית הספר — אותה חצר של 1991) — פוגי הולך לשם בעצמו.
 *    מי שבחר בשבת שלו: הטלפון רוטט עם שריקת הפתיחה. מי שחילק: **הסיבוך** — תיקו ב-18:15,
 *    פנדלים. להישאר (ובלומפילד תחכה), או ללכת כמו שסוכם, ולהגיע לשריקה (`pr-whistle`).
 * 4. **ומי שלא הגיע** — השבת עוברת בלעדיו, והדף על המקרר אומר את זה (`pr-nosat`). אין
 *    Game Over; יש ביוגרפיה, וסיום משלה (`waited`).
 *
 * `child_event` נכתב רק בחצר, למי שעמד ליד הגדר. `life:saturday` נשאר לחיים — 2026 זוכר.
 */
export const SATURDAY = 'life:saturday'
const ask = (value: string): Condition => ({ flagIs: { flag: 'pr:ask', value } })
const sat = (value: string): Condition => ({ flagIs: { flag: 'pr:sat', value } })
const COMMITTED: Condition = { any: [ask('go'), ask('split')] }
const CHECKED: Condition = { all: [ask('checking'), { flag: 'pr:saw:his' }, { flag: 'pr:saw:ours' }] }

export const ENDINGS_PROMISES: Record<string, EndingCard> = {
  repaired: {
    id: 'repaired',
    titleHe: 'לא למה לא הודעת',
    bodyHe:
      'איחרת, ולא הודעת. לא ביקשת שיקראו לזה בסדר — הצעת תיקון שאפשר לבדוק, או ביצעת את זה שכבר סוכם. זה לא מוחק את הערב ההוא, וזה גם לא היה אמור.',
    memoryHe: 'יומן, עם שורה אחת שנכתבה פעמיים.',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
  kept: {
    id: 'kept',
    titleHe: 'עכשיו יש לי תשובה',
    bodyHe:
      'לא הייתה הבטחה שבורה לתקן. קרן שאלה אם אתה זוכר ששאלה מה שלומך, ואמרת שעכשיו יש לך תשובה — והפעם היא הייתה עליך, לא על המשחק.',
    memoryHe: 'שיחה שנמשכה יותר מתוצאה.',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
  his: {
    id: 'his',
    titleHe: 'רשמתי את השעה שלך',
    bodyHe:
      'הוא ביקש שתבוא לראות אותו, ואמר שהוא יודע מה יש בשבת. באת — או סידרת חלק שבאמת אפשר, או אמרת בכנות שלא — ובכל אחת מהן הוא שמע שהשעה שלו נרשמה.',
    memoryHe: 'דף משחק של ילדים, עם שם אחד מוקף.',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
  /** (90-E) אמר שיבוא, והשבת עברה בלעדיו — גם זו ביוגרפיה, והכרטיס לא מייפה אותה */
  waited: {
    id: 'waited',
    titleHe: 'חיכיתי ליד הגדר',
    bodyHe:
      'אמרת שתבוא, והשבת עברה בלעדיך. הוא לא צעק. הוא כתב את זה על הדף, בכתב שלו, ותלה ליד היומן — ויש הבטחות שמתקנים רק בשבת הבאה, ולא לפני.',
    memoryHe: 'דף משחק של ילדים, עם שורה אחת בכתב יד.',
    memoryItem: 'folded-paper',
    presence: 'late',
  },
}

export const BEATS_PROMISES: Beat[] = [
  { id: 'pr-first', at: 'home', trigger: 'enter', when: { all: [{ flag: 'life:child' }], none: [{ flag: 'pr:first' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'pr-first' }] },
  /**
   * ההבטחה — ראשונה למי שאין לו ילד, ושנייה למי שיש: הביט הזה מחכה לסצנת הילד רק
   * כשיש ילד לחכות לו.
   */
  // ליד המקרר של הבית שלו (`homeAdult`) — אותו חדר כמו הילד, ולכן שעון: הוא לא יוצא ונכנס כדי לשמוע
  /**
   * (pass D) the week of 2013, eight years on — the diary on the fridge (`life:household:week`,
   * `chapter2011family.ts`) is the evidence the promise is weighed against. One sentence, before it.
   */
  ...([
    ['kept', 'ב-2013 שמרת את רביעי, עם כל מה שנפל עליו. אני עוד זוכרת את העיגול על המקרר.'],
    ['broken', 'ב-2013 גיליתי את רביעי מהמקרר. שלא אגלה גם את זה ככה.'],
    ['no-us', 'פעם היה לך יומן מלא, בלי אף ערב שלנו. אני בודקת אם הוא עוד תלוי שם.'],
  ] as const).map(([value, text]): Beat => ({
    id: `pr-week-${value}`,
    at: 'home',
    trigger: 'clock',
    when: { all: [{ flag: 'life:partner' }, { flagIs: { flag: 'life:household:week', value } }], none: [{ flag: 'pr:promise' }, { flag: 'pr:weekSaid' }], any: [{ flag: 'pr:first' }, { notFlag: 'life:child' }] },
    delayMs: 900,
    do: [{ a: 'flag', flag: 'pr:weekSaid' }, { a: 'lines', lines: [{ who: PARTNER_TAG, text }] }],
  })),
  { id: 'pr-promise', at: 'home', trigger: 'clock', when: { none: [{ flag: 'pr:promise' }], any: [{ flag: 'pr:first' }, { notFlag: 'life:child' }] }, delayMs: 1200, do: [{ a: 'talk', conversation: 'pr-promise' }] },
  { id: 'pr-scarf', at: 'pitch', trigger: 'enter', when: { all: [{ flag: 'life:child' }, { flag: 'pr:promise' }], none: [{ flag: 'pr:scarf' }, { flag: 'pr:ask' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'pr-scarf' }] },
  /** (90-E) חזרה אליו עם שתי השעות — הוא שואל בעצמו; מי שהלך באמצע לוחץ עליו (`pr-answer` במגרש) */
  { id: 'pr-answer', at: 'pitch', trigger: 'enter', when: { all: [CHECKED], none: [{ flag: 'pr:scarf' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'pr-answer' }] },
  /** השבת — בחצר של בית הספר; מי שהתחייב הולך לשם, והיום קופץ לשבת בכרטיס */
  {
    id: 'pr-saturday',
    at: 'schoolyard',
    trigger: 'enter',
    when: { all: [COMMITTED], none: [{ flag: 'pr:sat' }, { flag: 'pr:scarf' }] },
    delayMs: 300,
    do: [{ a: 'card', titleHe: 'שבת', subHe: 'חצר בית הספר · ליגת ילדים', ms: 2200 }, { a: 'talk', conversation: 'pr-saturday' }],
  },
  /** מי שיצא מהחצר כמו שסוכם — בלומפילד, לשריקה */
  { id: 'pr-whistle', at: 'bloomfield-outside', trigger: 'enter', when: { all: [sat('run')], none: [{ flag: 'pr:scarf' }] }, delayMs: 500, do: [{ a: 'talk', conversation: 'pr-whistle' }] },
  /** ומי שלא הגיע — אין ערב שנתקע: בעשר וחצי הדף על המקרר אומר את זה */
  { id: 'pr-nosat', trigger: 'clock', when: { all: [COMMITTED, { afterMinute: 22 * 60 + 30 }], none: [{ flag: 'pr:sat' }, { flag: 'pr:scarf' }] }, delayMs: 1200, do: [{ a: 'talk', conversation: 'pr-nosat' }] },
  { id: 'pr-whistle-late', trigger: 'clock', when: { all: [sat('run'), { afterMinute: 23 * 60 }], none: [{ flag: 'pr:scarf' }] }, delayMs: 1200, do: [{ a: 'talk', conversation: 'pr-whistle-late' }] },
  /** הסגירה — אחרי ההבטחה למי שאין לו ילד, ואחרי האירוע שלו למי שיש */
  /**
   * (pass D, §49 S2b — *"equally dense promise to partner/family/work/person: show up /
   * renegotiate / break"*) the life without a child does not close on a sentence: the evening
   * that was kept or repaired happens, at sunset on the promenade, and the phone is in the pocket.
   */
  {
    id: 'pr-out',
    trigger: 'clock',
    when: { all: [{ flag: 'pr:evening' }, { notFlag: 'life:child' }], none: [{ flag: 'pr:out' }] },
    delayMs: 1400,
    do: [{ a: 'flag', flag: 'pr:out' }, { a: 'card', titleHe: 'הערב עצמו', subHe: 'הטיילת, בשקיעה', ms: 2200 }, { a: 'travel', to: 'promenade', spawn: 'start' }],
  },
  { id: 'pr-evening', at: 'promenade', trigger: 'enter', when: { all: [{ flag: 'pr:out' }], none: [{ flag: 'pr:evened' }] }, delayMs: 900, do: [{ a: 'talk', conversation: 'pr-evening' }] },
  { id: 'pr-close', trigger: 'clock', when: { all: [{ flag: 'pr:promise' }, { any: [{ notFlag: 'pr:evening' }, { flag: 'pr:evened' }, { flag: 'life:child' }] }], none: [{ flag: 'pr:done' }], any: [{ flag: 'pr:scarf' }, { notFlag: 'life:child' }] }, delayMs: 1200, do: [{ a: 'flag', flag: 'pr:done' }, { a: 'talk', conversation: 'pr-close' }] },
]

/** (pass D) the evening that was promised, and who it is with */
const EVENING_OPENERS: ReadonlyArray<readonly [Condition, Say[]]> = [
  [{ flag: 'life:partner' }, [
    { who: null, text: 'הטיילת, בשקיעה. שולחן אחד מול הים, ושני כיסאות שלא זזים.' },
    { who: PARTNER_TAG, text: 'אז הערב אתה פה.' },
    { who: 'פוגי', text: 'הערב אני פה.' },
    { who: null, text: 'בכיס, הטלפון. יש משחק הערב, ואתה יודע באיזו דקה בדיוק הוא מתחיל.' },
  ]],
  [{ notFlag: 'life:partner' }, [
    { who: null, text: 'הטיילת, בשקיעה. קרן כבר שם, עם שתי כוסות קפה ואחת מהן שלך.' },
    { who: 'קרן', text: 'עשר שנים ומשהו. בוא נראה אם אתה יודע לשבת.' },
    { who: null, text: 'בכיס, הטלפון. יש משחק הערב, ואתה יודע באיזו דקה בדיוק הוא מתחיל.' },
  ]],
]

export const CONVERSATIONS_PROMISES: Conversation[] = [
  {
    id: 'pr-first',
    nameHe: 'הילד',
    branches: [
      {
        lines: [
          { who: 'הילד', text: 'חייבים להישאר עד הסוף?' },
          { who: 'פוגי', text: 'לא.' },
          { who: 'הילד', text: 'גם אם יש גול?' },
          { who: 'פוגי', text: 'גם.' },
          { who: 'קובי', text: 'הוא לא מאמין לך. אני מבין אותו.' },
        ],
        choices: [
          {
            id: 'exit',
            text: '"אתה אומר לי מתי מספיק."',
            then: [
              { e: 'flag', flag: 'pr:first' },
              { e: 'flagValue', flag: 'pr:firstMatch', value: 'exit_agreed' },
              { e: 'time', minutes: 90 },
              { e: 'energy', delta: -8 },
              { e: 'memory', item: 'ticket-stub', id: 'pr-child-first-match' },
              { e: 'proof', kind: 'child_agency', proofId: 'child_agency:{chapter}:first', subjectHe: 'המשחק הראשון שלו', noteHe: 'היציאה סוכמה לפני הכניסה, והוא החליט מתי.' },
              { e: 'toast', text: 'הילד: "אז אני רוצה לנסות." — "אתה אומר לי מתי מספיק."', tone: 'plain' },
            ],
          },
          {
            id: 'home',
            text: '(לראות קודם בבית, ולהחליט יחד בהמשך.)',
            then: [
              { e: 'flag', flag: 'pr:first' },
              { e: 'flagValue', flag: 'pr:firstMatch', value: 'tv' },
              { e: 'time', minutes: 90 },
              { e: 'proof', kind: 'child_agency', proofId: 'child_agency:{chapter}:first', subjectHe: 'המשחק הראשון שלו', noteHe: 'לא התחיל ביציע; התחיל בשאלה.' },
              { e: 'toast', text: 'הילד: "פה אפשר לדבר?" — "אצלנו אפשר גם שם. בבית שומעים יותר טוב."', tone: 'plain' },
            ],
          },
          {
            id: 'must',
            text: '"צריך להישאר עד הסוף. ככה זה."',
            then: [
              { e: 'flag', flag: 'pr:first' },
              { e: 'flagValue', flag: 'pr:firstMatch', value: 'declined' },
              { e: 'flag', flag: 'pr:childPressured' },
              { e: 'wellbeing', key: 'regret', delta: 5 },
              { e: 'toast', text: 'הילד: "אז אני לא רוצה לבוא." — "טוב. לא נלך ככה."', tone: 'red' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'pr-promise',
    nameHe: null,
    branches: [
      /** ההבטחה של `L04.3` נשארה פתוחה, ויש מי שאליו היא ניתנה */
      {
        when: { all: [{ flag: 'promise:householdEvening' }, { flag: 'life:partner' }] },
        lines: [
          { who: PARTNER_TAG, text: 'אמרת שתחזור.' },
          { who: 'פוגי', text: 'המשחק התארך.' },
          { who: PARTNER_TAG, text: 'זה מסביר למה איחרת. לא למה לא הודעת.' },
          { who: 'פוגי', text: 'נכון.' },
          { who: PARTNER_TAG, text: 'אני רוצה לדעת מה נעשה בפעם הבאה.' },
        ],
        choices: [
          {
            id: 'offer',
            text: '(להודות — ולהציע תיקון שהצד השני מסכים לו.)',
            then: [
              { e: 'flag', flag: 'pr:promise' },
              { e: 'flagValue', flag: 'pr:kind', value: 'repaired' },
              { e: 'flagValue', flag: 'pr:repair', value: 'specific' },
              { e: 'personality', key: 'honesty', delta: 3 },
              { e: 'proof', kind: 'promise_renegotiated', proofId: 'promise_renegotiated:{chapter}:evening', subjectHe: 'הערב הקבוע', noteHe: 'הודה בהפרה, והציע תוכנית שאפשר לבדוק — לא "יהיה בסדר".' },
              { e: 'toast', text: '"את התוכנית הזאת אפשר לבדוק." — "אני לא מבקש שתקרא לזה בסדר."', tone: 'plain' },
            ],
          },
          {
            id: 'do',
            text: '(לבצע את התיקון שכבר סוכם. הפעם בזמן.)',
            then: [
              { e: 'flag', flag: 'pr:promise' },
              { e: 'flagValue', flag: 'pr:kind', value: 'repaired' },
              { e: 'time', minutes: 45 },
              // (pass D, §49 S2b) the evening itself — on the promenade, with the phone in the pocket
              { e: 'flag', flag: 'pr:evening' },
              { e: 'proof', kind: 'promise_kept', proofId: 'promise_kept:{chapter}:evening', subjectHe: 'הערב הקבוע', noteHe: 'הגיע בזמן, לפי מה שאמר.' },
              { e: 'toast', text: '"הפעם הגעת בזמן." — "הפעם תכננתי לפי מה שאמרתי."', tone: 'plain' },
            ],
          },
          {
            id: 'not-yet',
            text: '"אני עדיין לא מסוגל להתחייב."',
            then: [
              { e: 'flag', flag: 'pr:promise' },
              { e: 'flagValue', flag: 'pr:kind', value: 'repaired' },
              { e: 'flagValue', flag: 'pr:commitment', value: 'paused' },
              { e: 'wellbeing', key: 'regret', delta: 3 },
              { e: 'toast', text: '"אז לא נתכנן כרגע על בסיס ההבטחה הזאת." — "אני מבין."', tone: 'plain' },
            ],
          },
        ],
      },
      /** אין הפרה פתוחה — הגרסה שבה ההבטחה מתקיימת, עם קרן */
      {
        lines: [
          { who: 'קרן', text: 'זוכר ששאלתי מה שלומך?' },
          { who: 'פוגי', text: 'עכשיו יש לי תשובה.' },
          { who: 'קרן', text: 'לקח לך.' },
          { who: 'פוגי', text: 'עשר שנים ומשהו.' },
        ],
        choices: [
          {
            id: 'meet',
            text: '(לקיים את המפגש. בלי למהר.)',
            then: [
              { e: 'flag', flag: 'pr:promise' },
              { e: 'flagValue', flag: 'pr:kind', value: 'kept' },
              { e: 'time', minutes: 30 },
              // (pass D, §49 S2b) the evening itself — on the promenade, with the phone in the pocket
              { e: 'flag', flag: 'pr:evening' },
              { e: 'rel', who: 'keren', axis: 'bond', delta: 2 },
              { e: 'rel', who: 'keren', axis: 'trust', delta: 5 },
              { e: 'proof', kind: 'promise_kept', proofId: 'promise_kept:{chapter}:keren', subjectHe: 'המפגש עם קרן, עשר שנים אחרי', noteHe: 'לא הייתה הפרה לתקן; היה מפגש, והוא קרה.' },
              { e: 'toast', text: 'קרן: "זוכר ששאלתי מה שלומך?" — "עכשיו יש לי תשובה."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'pr-evening',
    nameHe: null,
    branches: EVENING_OPENERS.map(([when, lines]) => ({
      when,
      lines,
      choices: [
        {
          id: 'down',
          text: '(הטלפון הפוך על השולחן. כל הערב.)',
          then: [
            { e: 'flag', flag: 'pr:evened' },
            { e: 'flagValue', flag: 'life:promise2021', value: 'present' },
            { e: 'time', minutes: 90 },
            { e: 'wellbeing', key: 'loneliness', delta: -6 },
            { e: 'toast', text: 'בתשע ועשרים הטלפון רטט שלוש פעמים ברצף. לא הפכת אותו. בעשר כבר לא זכרת שהוא שם.', tone: 'plain' },
          ],
        },
        {
          id: 'peek',
          text: '(להציץ פעם אחת — ולהגיד בקול שהצצת.)',
          then: [
            { e: 'flag', flag: 'pr:evened' },
            { e: 'flagValue', flag: 'life:promise2021', value: 'peeked' },
            { e: 'time', minutes: 90 },
            { e: 'personality', key: 'honesty', delta: 2 },
            { e: 'toast', text: '"הצצתי." — "ראיתי." — "אחת." — "אחת זה בסדר. שתיים זה כבר ערב אחר."', tone: 'plain' },
          ],
        },
        {
          id: 'leave',
          text: '(לקום באמצע. יש משחק, ואפשר עוד להספיק את המחצית.)',
          then: [
            { e: 'flag', flag: 'pr:evened' },
            { e: 'flagValue', flag: 'life:promise2021', value: 'left' },
            { e: 'time', minutes: 40 },
            { e: 'wellbeing', key: 'regret', delta: 6 },
            { e: 'toast', text: 'הספקת את המחצית. את הערב — לא. בדרך הביתה ההודעה היחידה בטלפון הייתה ממנה: "הגעת?"', tone: 'red' },
          ],
        },
      ],
    })),
  },
  {
    id: 'pr-scarf',
    nameHe: 'הילד',
    branches: [
      {
        lines: [
          { who: 'הילד', text: 'אני רוצה שתבוא לראות אותי.' },
          { who: 'פוגי', text: 'מתי?' },
          { who: 'הילד', text: 'בשבת.' },
          { who: 'פוגי', text: 'בשבת יש—' },
          { who: 'הילד', text: 'אני יודע מה יש בשבת.' },
        ],
        choices: [
          {
            /**
             * (90-E) **התחייבות, לא דיווח.** השבת עצמה קורית בחצר של בית הספר (`pr-saturday`),
             * ו-`child_event` נכתב שם — למי שעמד ליד הגדר.
             */
            id: 'go',
            text: '(לבחור באירוע שלו. בלומפילד — בשבת אחרת.)',
            then: [
              { e: 'flagValue', flag: 'pr:ask', value: 'go' },
              { e: 'flagValue', flag: 'pr:interest', value: 'respected' },
              { e: 'toast', text: 'הילד: "אתה באמת בא?" — "כן. רשמתי את השעה שלך, לא רק את שלהם." — חמש, בחצר של בית הספר.', tone: 'plain' },
            ],
          },
          {
            id: 'check',
            text: '(לבדוק קודם את שתי השעות — ולחזור אליו עם תשובה.)',
            then: [
              { e: 'flagValue', flag: 'pr:ask', value: 'checking' },
              { e: 'toast', text: 'הילד: "אז תבדוק מהר." — הדף שלו על המקרר, והלוח בקיוסק.', tone: 'plain' },
            ],
          },
          {
            id: 'miss',
            text: '"הפעם לא אגיע." (ולשמוע את האכזבה.)',
            then: [
              { e: 'flag', flag: 'pr:scarf' },
              { e: 'flagValue', flag: 'pr:childEvent', value: 'missed' },
              { e: 'flagValue', flag: SATURDAY, value: 'told' },
              missed('2021-child-saturday', 'choice'),
              { e: 'wellbeing', key: 'regret', delta: 6 },
              { e: 'toast', text: 'הילד: "רציתי שתהיה." — "אני יודע. לא אגיד שזה לא חשוב."', tone: 'red' },
            ],
          },
        ],
      },
    ],
  },
  // ---- (90-E) הבדיקה: שני דפים, בשני חדרים ----
  {
    id: 'pr-his',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'על המקרר, מתחת ליומן: דף מודפס של ליגת הילדים, עם מגנט של פיצרייה.' },
          { who: null, text: 'שבת, 17:00, חצר בית הספר. ובעט, בכתב שלו: ״עד 18:15. אם אין הארכה.״' },
        ],
        then: [{ e: 'flag', flag: 'pr:saw:his' }, { e: 'time', minutes: 2 }],
      },
    ],
  },
  {
    id: 'pr-ours',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'לוח המשחקים ליד הדלפק, בטוש שכמעט נגמר: שבת — 19:30, בלומפילד. שערים ב-18:00.' },
          { who: null, text: 'מהחצר של בית הספר לבלומפילד: חצי שעה ברגל. אם לא עוצרים.' },
        ],
        then: [{ e: 'flag', flag: 'pr:saw:ours' }, { e: 'time', minutes: 3 }],
      },
    ],
  },
  {
    id: 'pr-answer',
    nameHe: 'הילד',
    branches: [
      {
        lines: [
          { who: 'הילד', text: 'נו?' },
          { who: 'פוגי', text: 'בדקתי. שלך בחמש, שלהם בשבע וחצי.' },
          { who: 'הילד', text: 'אז?' },
        ],
        choices: [
          {
            id: 'split',
            text: '(כל המשחק שלך — ואז ישר לבלומפילד. מגיע לשריקה.)',
            // the split is only a sentence someone can say after reading both sheets
            when: CHECKED,
            noteHe: 'עוד לא בדקת את שתי השעות — הדף שלו על המקרר, והלוח בקיוסק.',
            then: [
              { e: 'flagValue', flag: 'pr:ask', value: 'split' },
              { e: 'flagValue', flag: 'pr:interest', value: 'coordinated' },
              { e: 'toast', text: 'הילד: "אתה תהיה בחלק שלי?" — "בדקתי. כן. אחר כך אצא." — "אז בסדר." — "ואתה לא רץ." — "אני הולך מהר."', tone: 'plain' },
            ],
          },
          {
            id: 'go',
            text: '(כל השבת שלך. בלי לרוץ לשום מקום.)',
            then: [
              { e: 'flagValue', flag: 'pr:ask', value: 'go' },
              { e: 'flagValue', flag: 'pr:interest', value: 'respected' },
              { e: 'toast', text: 'הילד: "גם אחרי?" — "גם אחרי. פיצה."', tone: 'plain' },
            ],
          },
          {
            id: 'miss',
            text: '"הפעם לא אגיע." (ולשמוע את האכזבה.)',
            then: [
              { e: 'flag', flag: 'pr:scarf' },
              { e: 'flagValue', flag: 'pr:childEvent', value: 'missed' },
              { e: 'flagValue', flag: SATURDAY, value: 'told' },
              missed('2021-child-saturday', 'choice'),
              { e: 'wellbeing', key: 'regret', delta: 6 },
              { e: 'toast', text: 'הילד: "אז למה בדקת?" — "כדי לדעת. לא כדי לבוא." — "..."', tone: 'red' },
            ],
          },
        ],
      },
    ],
  },
  // ---- (90-E) השבת עצמה ----
  {
    id: 'pr-saturday',
    nameHe: 'הילד',
    branches: [
      {
        /** החלוקה, והסיבוך: תיקו ב-18:15, והתוכנית אמרה לצאת ב-18:15 */
        when: ask('split'),
        lines: [
          { who: null, text: 'ליגת ילדים, בחצר שבה פעם למדת לבעוט. הוא מחפש אותך ליד הגדר — ומוצא, ומפסיק לחפש.' },
          { who: null, text: '18:15. תיקו. השופט, אבא של מישהו, מסמן בידיים: פנדלים.' },
          { who: 'הילד', text: 'אתה הולך?' },
        ],
        choices: [
          {
            id: 'stay',
            text: '(להישאר לפנדלים שלו. בלומפילד תחכה.)',
            then: [
              { e: 'flag', flag: 'pr:scarf' },
              { e: 'flagValue', flag: 'pr:sat', value: 'stayed' },
              { e: 'flagValue', flag: SATURDAY, value: 'stayed' },
              { e: 'time', minutes: 40 },
              { e: 'energy', delta: -6 },
              { e: 'proof', kind: 'child_event', proofId: 'child_event:{chapter}:saturday', subjectHe: 'השבת שלו', noteHe: 'תכנן לצאת ב-18:15, ונשאר כשהמשחק שלו התארך.' },
              { e: 'toast', text: 'הוא בעט את הפנדל השלישי. לפני הריצה — הסתכל על הגדר.', tone: 'plain' },
            ],
          },
          {
            id: 'leave',
            text: '(ללכת, כמו שסיכמנו. הוא יודע.)',
            then: [
              { e: 'flagValue', flag: 'pr:sat', value: 'run' },
              { e: 'flagValue', flag: SATURDAY, value: 'half' },
              { e: 'time', minutes: 15 },
              { e: 'energy', delta: -4 },
              { e: 'proof', kind: 'child_event', proofId: 'child_event:{chapter}:saturday', subjectHe: 'השבת שלו', noteHe: 'בדק קודם, היה בכל החלק שלו, ויצא כמו שסיכמו.' },
              { e: 'toast', text: 'הילד: "לך. תאחר." — ומאחוריך, מהחצר: צעקה של פנדל. לא ראית של מי.', tone: 'plain' },
            ],
          },
        ],
      },
      {
        lines: [
          { who: null, text: 'ליגת ילדים, בחצר שבה פעם למדת לבעוט. הוא מחפש אותך ליד הגדר — ומוצא, ומפסיק לחפש.' },
          { who: null, text: 'בכיס, הטלפון רוטט. שריקת פתיחה, בבלומפילד, בלעדיך.' },
        ],
        choices: [
          {
            id: 'off',
            text: '(לכבות אותו.)',
            then: [
              { e: 'flag', flag: 'pr:scarf' },
              { e: 'flagValue', flag: 'pr:sat', value: 'there' },
              { e: 'flagValue', flag: SATURDAY, value: 'there' },
              { e: 'time', minutes: 75 },
              { e: 'energy', delta: -6 },
              { e: 'proof', kind: 'child_event', proofId: 'child_event:{chapter}:saturday', subjectHe: 'השבת שלו', noteHe: 'רשם את השעה שלו, לא רק את שלהם — ועמד ליד הגדר.' },
              { e: 'toast', text: 'הוא הבקיע פעם אחת, והסתכל על הגדר לפני שחגג.', tone: 'plain' },
            ],
          },
          {
            id: 'peek',
            text: '(להשאיר אותו בכיס. להציץ רק בהפסקה.)',
            then: [
              { e: 'flag', flag: 'pr:scarf' },
              { e: 'flagValue', flag: 'pr:sat', value: 'there' },
              { e: 'flagValue', flag: SATURDAY, value: 'there' },
              { e: 'time', minutes: 75 },
              { e: 'energy', delta: -6 },
              { e: 'proof', kind: 'child_event', proofId: 'child_event:{chapter}:saturday', subjectHe: 'השבת שלו', noteHe: 'רשם את השעה שלו, לא רק את שלהם — ועמד ליד הגדר.' },
              { e: 'toast', text: 'בהפסקה הוא רץ לגדר: "מה התוצאה?" — "אחת־אפס." — "לא שלהם. שלנו!"', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'pr-whistle',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'השער של בלומפילד, בנשימה אחת. השריקה עוד לא.' },
          { who: null, text: 'בטלפון, תמונה ממישהו מההורים: הוא, עם הכדור מתחת ליד, בלי שן קדמית, מחייך.' },
        ],
        then: [
          { e: 'flag', flag: 'pr:scarf' },
          { e: 'flagValue', flag: 'pr:sat', value: 'both' },
          { e: 'energy', delta: -4 },
          { e: 'toast', text: 'שני מקומות, שבת אחת. הרגליים יזכירו לך מחר.', tone: 'plain' },
        ],
      },
    ],
  },
  {
    id: 'pr-whistle-late',
    nameHe: null,
    branches: [
      {
        lines: [{ who: null, text: 'הערב נגמר בדרך. את השריקה האחרונה שמעת ברדיו של מונית שעברה.' }],
        then: [{ e: 'flag', flag: 'pr:scarf' }],
      },
    ],
  },
  {
    id: 'pr-nosat',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'השבת עברה. בערב, על המקרר, דף המשחק שלו — ולמטה, בעט, בכתב שלו:' },
          { who: null, text: '״חיכיתי ליד הגדר.״' },
        ],
        then: [
          { e: 'flag', flag: 'pr:scarf' },
          { e: 'flagValue', flag: 'pr:sat', value: 'none' },
          { e: 'flagValue', flag: SATURDAY, value: 'missed' },
          // he meant to be there and the day ran out before he was
          missed('2021-child-saturday', 'late'),
          { e: 'wellbeing', key: 'regret', delta: 8 },
        ],
      },
    ],
  },
  {
    id: 'pr-close',
    nameHe: null,
    branches: [
      { when: sat('none'), lines: [{ who: null, text: 'הדף נשאר על המקרר. אף אחד לא הוריד אותו.' }], then: [{ e: 'ending', id: 'waited' }] },
      { when: { flag: 'pr:scarf' }, lines: [{ who: null, text: 'דף המשחק של הילדים נשאר על המקרר, ליד היומן.' }], then: [{ e: 'ending', id: 'his' }] },
      { when: { flagIs: { flag: 'life:promise2021', value: 'left' } }, lines: [{ who: null, text: 'השורה ביומן נכתבה שוב, בעט — ומתחתיה, בעיפרון, סימן שאלה קטן.' }], then: [{ e: 'ending', id: 'repaired' }] },
      { when: { flagIs: { flag: 'pr:kind', value: 'repaired' } }, lines: [{ who: null, text: 'השורה ביומן נכתבה שוב, הפעם בעט.' }], then: [{ e: 'ending', id: 'repaired' }] },
      { lines: [{ who: null, text: 'השיחה נגמרה מאוחר, ואף אחד לא הסתכל בשעון.' }], then: [{ e: 'ending', id: 'kept' }] },
    ],
  },
]
