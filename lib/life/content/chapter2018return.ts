import type { LifeState } from '../types'

import type { Beat } from './beats'
import type { EndingCard } from './chapter1986'
import type { Branch, Conversation, Say } from './script'
import type { Condition } from '../world/types'
import { PORTRAIT_COLLAPSE } from './chapter2016collapse'

/**
 * R01–R05 · "חוזרים אחרת" · 2018–2022, בשני פרקים.
 *
 * **`2018-return`** — העלייה חזרה, ובלומפילד שקוראים אותו מחדש. **`2021-losses`** —
 * ערב ביתי בתקופת ההגבלות, גמר גביע שנגמר רע, וגמר כדורסל שכואב לאנשים אחרים.
 *
 * **שלוש שורות ארכיון, ושתיים מהן נקראו היום:**
 * · 2017/18 — ראש הליגה הלאומית בשלב הסדיר ובפלייאוף, ועלייה לליגת העל (RSSSF).
 *   **לרגע הזה אין תאריך בארכיון**, ולכן `happenedOn` הוא `null` והוא נשאר כזה.
 * · 2.6.2021 — גמר הגביע, 1:2 למכבי, שורה שהייתה בארכיון מלפני התסריט.
 * · 17.2.2022 — גמר גביע הכדורסל, 82:87 לבני הרצליה. הדיווח שהתסריט מפנה אליו נוקב
 *   בתוצאה, בתחרות ובאולם, ו**התאריך בו יושב בכיתוב התמונה בלבד** — ולכן הוצלב מול
 *   כתבה שנושאת את אותו תאריך בכתובת שלה ואת אותה תוצאה (כלל 77).
 *
 * **ושני מזהים שאסור להם עוגן.** `V4-BLOOMFIELD` (`R02`) ו-`V4-COVID` (`R03`) הם
 * *"מזהי הקשר תקופתי לפעולה בדיונית, לא טענת אימות חדשה"*, ולכן `R03` היא ערב ביתי
 * בדיוני לגמרי — **אין בו יום משחק, אין בו קהל במגרש סגור, ואין בו תאריך.**
 *
 * **ו-`R02` נבדק בקוד ולא בזיכרון.** הוראת הסצנה: *"בדוק שילוט דרך הקוד, לא לפי
 * זיכרון מפת 1986"*. הסצנה עומדת **מחוץ** לאצטדיון, ומה שהיא עושה שם הוא בדיוק מה
 * שהתסריט מבקש: שני אנשים שמחפשים את הדרך, ואף אחד מהם לא בטוח.
 *
 * **תיקון, 21.9.2026 — שתי טעויות בפסקה שהייתה כאן.** היא אמרה ש-`bloomNewPlaza` *"אינו
 * במאגר"*, והוא במאגר מאז מסירת `BLOOMFIELD-2000-2019-PLUS` — מאור אמר את זה במפורש,
 * ובכל זאת הפרק עמד על ציור 1986. והיא לא שמה לב לשנה: `R02` כתובה *"בלומפילד
 * המחודש, 2019"*, והפרק כולו רץ ב-2018 — שנה שבה בלומפילד היה אתר בנייה (נסגר ב-2016,
 * נפתח בסוף אוגוסט 2019; המקורות בלוח של בלומפילד ב-`world/scenes.ts`). עכשיו:
 * · `R01` בקיוסק, 2018, והדלת לאצטדיון נעולה ואומרת למה;
 * · אחריה קפיצה אחת (`day.entered`) אל **סתיו 2019**, ו-`R02` על הרחבה של הבניין החדש.
 *   **לא ערב הפתיחה ולא משחק מסוים** — התסריט קובע ש-`V4-BLOOMFIELD` *"אין לחבר
 *   לארכיון כמשחק מתועד"*, ולכן אין כאן תאריך, יריבה או תוצאה, רק העונה שבה הבניין
 *   כבר עמד.
 */

export const PORTRAIT_RETURN: Record<string, string> = {
  ...PORTRAIT_COLLAPSE,
}

// ------------------------------------------------------------------- Part I ------

export function objectiveReturn(state: LifeState, sceneId: string): string | null {
  if (state.chapterDone) return null
  if (!state.flags['r:back']) return sceneId === 'kiosk' ? null : 'בקיוסק. אופיר כבר אמר "חזרנו".'
  if (!state.flags['r:reopen']) return 'עונה עוברת.'
  if (!state.flags['r:signs'] && state.flags['r:find'] === 'reading') return 'השלט החדש, ליד הכניסה. לקרוא לפני שאבא פונה.'
  if (!state.flags['r:signs']) return sceneId === 'bloomfield-outside' ? null : 'בלומפילד. אותו שם, מקום אחר.'
  return null
}

export const ENDINGS_RETURN: Record<string, EndingCard> = {
  found: {
    id: 'found',
    titleHe: 'רציתי לבדוק שאתה יודע',
    bodyHe:
      'מצאתם את הדרך יחד, ונתת לו להוביל חלק. הוא אמר שפנה כי רצה לבדוק שאתה יודע, ולא הכחיש שהוא מאלתר — "משפחתי", הוא אמר, וזה כיסה את שניכם.',
    memoryHe: 'שלט כיוון, מצולם מלמטה.',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
  other: {
    id: 'other',
    titleHe: 'מה את זוכרת',
    bodyHe:
      'באת עם מי שזוכרת דבר אחר. היא אמרה שאתה זוכר רק את המשחקים, ושאלת מה היא זוכרת, והיא אמרה שחיכיתם לכם פה יותר מדי — וזה גם בלומפילד.',
    memoryHe: 'כרטיס, ועליו שם של שער חדש.',
    memoryItem: 'ticket-stub',
    presence: 'inside',
  },
  told: {
    id: 'told',
    titleHe: 'עד הדקה העשירית',
    bodyHe:
      'נשארת, וביקשת ממנו לספר כשיחזור. הוא שאל אם תיתן לו לספר בלי להפריע ואמרת עד הדקה העשירית, והוא הגיע לשתים-עשרה לפני שעצרת אותו.',
    memoryHe: 'הטלפון, על הזרוע של הכורסה.',
    memoryItem: 'folded-paper',
    presence: 'late',
  },
}

export const BEATS_RETURN: Beat[] = [
  { id: 'r-back', at: 'kiosk', trigger: 'enter', when: { none: [{ flag: 'r:back' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'r-back' }] },
  /**
   * שנה ורבע בשורה אחת. `day.entered` מנקה את דגלי היום, ולכן `r:back` מורם שוב מיד אחריו
   * — אחרת המטרה, הרשימה והקיוסק היו חושבים ש-R01 עוד לא קרתה. `r:reopen` הוא גם מה
   * שפותח את הדלתות לאצטדיון (`BLOOMFIELD_REOPENED`).
   */
  {
    id: 'r-reopen',
    trigger: 'clock',
    // `Q04` stands here for the life it belongs to (ULTRAS + came back in K03), and only for it
    when: { all: [{ flag: 'r:back' }], none: [{ flag: 'r:reopen' }], any: [{ flag: 'q:drum' }, { notFlag: 'own:route:ULTRAS:entry' }, { notFlag: 'life:returned' }] },
    delayMs: 1600,
    do: [
      { a: 'card', titleHe: 'סתיו 2019', subHe: 'בלומפילד, אחרי שלוש שנים בשיפוץ', ms: 2600 },
      {
        a: 'events',
        events: [
          { t: 'day.entered', dayId: 'r:reopen', year: 2019, weekday: 6, minute: 17 * 60 + 30, dateHe: 'סתיו 2019' },
          { t: 'flag.raised', flag: 'r:reopen' },
          { t: 'flag.raised', flag: 'r:back' },
        ],
      },
      { a: 'lines', lines: [{ who: null, text: 'שלוש עונות של משחקי בית בעיר אחרת, ובסוף הקיץ בלומפילד נפתח מחדש. אבא אמר שהוא יודע את הדרך.' }] },
      { a: 'travel', to: 'bloomfield-outside', spawn: 'fromRoute' },
    ],
  },
  { id: 'r-signs', at: 'bloomfield-outside', trigger: 'enter', when: { all: [{ flag: 'r:reopen' }], none: [{ flag: 'r:signs' }, { flag: 'r:find' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'r-signs' }] },
]

// ------------------------------------------------------------------ Part II ------

export function objectiveLosses(state: LifeState, sceneId: string): string | null {
  if (state.chapterDone) return null
  if (!state.flags['r:indoors']) return sceneId === 'home' ? null : 'בבית. אבא על המסך, ושואל אם שומעים אותו.'
  if (!state.flags['r:cup']) return sceneId === 'kiosk' ? null : 'אחרי הגמר. אופיר לא רוצה לדבר.'
  if (!state.flags['r:young']) return 'ואחר כך יש ערב שכואב לאנשים אחרים.'
  return null
}

export const ENDINGS_LOSSES: Record<string, EndingCard> = {
  asked: {
    id: 'asked',
    titleHe: 'עכשיו זאת שאלה',
    bodyHe:
      'שאלת מה הם ראו, והקשבת. אפי אמר שהם לא חייבים לדעת מה היה פעם כדי שזה יכאב להם, ואתה כבר לא ניסית להסביר — שאלת, והם ענו, וזה הספיק.',
    memoryHe: 'שני כיסאות מחוץ לאולם.',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
  invited: {
    id: 'invited',
    titleHe: 'קצר',
    bodyHe:
      'סיפרת זיכרון — רק אחרי שביקשו, ורק קצר. אפי אמר "קצר" ושאלת אם הוא מודד, והוא אמר שהוא מכיר אותך. גם זה נכון.',
    memoryHe: 'דף עם תאריך אחד, ישן.',
    memoryItem: 'clipping',
    presence: 'inside',
  },
  elsewhere: {
    id: 'elsewhere',
    titleHe: 'הפעם נבחר חדש',
    bodyHe:
      'יצאתם לאכול, ודיברתם מחר. הוא שאל אם אותו מקום ואמרת שהפעם תבחרו חדש — והוא לא שאל למה, כי הוא ידע.',
    memoryHe: 'תפריט, של מקום שלא הייתם בו.',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
}

export const BEATS_LOSSES: Beat[] = [
  { id: 'r-indoors', at: 'home', trigger: 'enter', when: { none: [{ flag: 'r:indoors' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'r-indoors' }] },
  /** אחרי המיון — מה שנאסף לקופסה הוא מה שנאמר עליו (`archive-21`, `r:sorted`) */
  { id: 'r-sorted', at: 'home', trigger: 'enter', when: { all: [{ flag: 'r:sortdone' }], none: [{ flag: 'r:sortsaid' }] }, delayMs: 600, do: [{ a: 'talk', conversation: 'r-sorted' }] },
  /**
   * (pass D, §48 S2) the loss itself — on the kiosk's screen, a result that is fixed. No
   * trivia and no minute: what he can choose is how he stays in the room with it.
   */
  { id: 'r-final', at: 'kiosk', trigger: 'enter', when: { all: [{ flag: 'r:indoors' }], none: [{ flag: 'r:final' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'r-final' }] },
  { id: 'r-cup', at: 'kiosk', trigger: 'clock', when: { all: [{ flag: 'r:indoors' }, { flag: 'r:final' }], none: [{ flag: 'r:cup' }] }, delayMs: 1300, do: [{ a: 'talk', conversation: 'r-cup' }] },
  { id: 'r-young', trigger: 'clock', when: { all: [{ flag: 'r:cup' }], none: [{ flag: 'r:young' }] }, delayMs: 1500, do: [{ a: 'talk', conversation: 'r-young' }] },
]

/** מה אופיר זוכר מדצמבר 2016 — הראשון שמתאים מנצח (`chapter2016collapse.ts`, `CRISIS_*`) */
const R_BACK_CALLBACKS: ReadonlyArray<readonly [Condition | null, Say[]]> = [
  [{ flagIs: { flag: 'life:crisis:handed', value: 3 } }, [{ who: 'אופיר', text: 'ושלמה שאל עליך. זה עם החבילה, מלפני שנתיים. הוא אמר שבאת עד אלנבי.' }]],
  [{ flagIs: { flag: 'life:crisis:repeat', value: 'rumour' } }, [
    { who: 'אופיר', text: 'ואתה זוכר את ההודעה ההיא? ״אין קבוצה.״ העברת אותה גם אתה.' },
    { who: 'פוגי', text: 'העברתי.' },
  ]],
  [{ any: [{ flagIs: { flag: 'life:crisis:repeat', value: 'verified' } }, { flagIs: { flag: 'life:crisis:repeat', value: 'published' } }] }, [{ who: 'אופיר', text: 'ואתה היחיד שלא כתב אז ״אין קבוצה״. שמתי לב, גם אם לא אמרתי.' }]],
  [null, []],
]

// ---------------------------------------------------------------- the words ------

/** (pass D) what the end of the final looked like to Ofir — `life:cup2021:watched` */
const CUP_OPENERS: ReadonlyArray<readonly [Condition | null, Say[]]> = [
  [{ flagIs: { flag: 'life:cup2021:watched', value: 'whistle' } }, [{ who: 'אופיר', text: 'ראית עד השריקה. אני הפסקתי באמצע, ולא הלכתי.' }]],
  [{ flagIs: { flag: 'life:cup2021:watched', value: 'outside' } }, [{ who: 'אופיר', text: 'יצאת לפני הסוף. גם אני רציתי, רק לא היו לי רגליים.' }]],
  [{ flagIs: { flag: 'life:cup2021:watched', value: 'ofir' } }, [{ who: 'אופיר', text: 'הפסקת להסתכל על המסך באמצע. ראיתי.' }]],
  [null, []],
]

export const CONVERSATIONS_RETURN: Conversation[] = [
  {
    id: 'r-back',
    nameHe: 'אופיר',
    /**
     * **2016 זוכר** (90-E, Stage D — *"vignette + callback, make earlier decisions matter"*).
     * אותה שיחה ואותן בחירות; שורה אחת של אופיר, אחרי "חזרנו.", על מה שהיומן של 2016 מוכיח:
     * מי שמסר את שלוש החבילות ביד, ומה פוגי העביר הלאה בערב שבו אמרו "אין קבוצה".
     */
    branches: R_BACK_CALLBACKS.map(([when, callback]): Conversation['branches'][number] => ({
      ...(when ? { when } : {}),
        lines: [
          { who: 'אופיר', text: 'חזרנו.' },
          { who: 'פוגי', text: 'הקבוצה חזרה.' },
          { who: 'אופיר', text: 'אתה מתקן אותי כמו עמית.' },
          { who: 'פוגי', text: 'מישהו צריך כשהוא לא פה.' },
          { who: 'אופיר', text: 'הוא פה. הוא פשוט נהנה מזה.' },
          ...callback,
        ],
        choices: [
          {
            id: 'one',
            text: '(לסמן משחק אחד עם החברים. אחד.)',
            then: [
              { e: 'flag', flag: 'r:back' },
              { e: 'flagValue', flag: 'life:football', value: 'balanced' },
              { e: 'rel', who: 'ofir', axis: 'bond', delta: 3 },
              { e: 'toast', text: 'עמית: "מסמן אחד." — "לא מנוי אוטומטי." — "כתבתי בעיפרון."', tone: 'plain' },
            ],
          },
          {
            id: 'distant',
            text: '"אני שמח בשבילכם. זה לא אומר שהכול חוזר."',
            then: [
              { e: 'flag', flag: 'r:back' },
              { e: 'flagValue', flag: 'r:return2018', value: 'distant' },
              { e: 'personality', key: 'honesty', delta: 2 },
              { e: 'toast', text: 'אופיר: "אתה נשמע שמח." — "אני שמח. זה לא אומר שהכול חוזר."', tone: 'plain' },
            ],
          },
          {
            id: 'successor',
            text: '(לחזור לתפקיד — רק אחרי שנדבר עם מי שעושה אותו עכשיו.)',
            then: [
              { e: 'flag', flag: 'r:back' },
              { e: 'time', minutes: 25 },
              // `mediation` בתסריט → `communication` במנוע
              { e: 'skill', skill: 'communication', delta: 3, why: 'דיבר איתו ולא מעליו' },
              { e: 'proof', kind: 'respects_successor', proofId: 'respects_successor:{chapter}:role', subjectHe: 'התפקיד שמישהו אחר לקח', audience: 'gate5', delta: 3, noteHe: 'חזר אחרי שדיבר עם מי שמילא את מקומו, לא במקומו.' },
              { e: 'heard', proofId: 'respects_successor:{chapter}:role' },
              { e: 'toast', text: 'אסף: "יש מי שעושה את זה עכשיו." — "אז נדבר איתו, לא מעליו."', tone: 'plain' },
            ],
          },
        ],
      })),
  },
  {
    /**
     * (90-E) השלט החדש — **הדרך נקראת, לא נזכרת.** קובי רוצה לפנות לאן שפנו פעם; השלט אומר
     * אחרת. ראיית הניווט נכתבת רק למי שהלך לפי מה שקרא, ונתן לאבא את החלק שהוא עוד יודע.
     */
    id: 'r-find',
    nameHe: 'קובי',
    branches: [
      {
        lines: [
          { who: null, text: 'שלט כחול, חדש: ״יציע מזרחי — שערים 11–14״, וחץ ימינה. ומתחת, בקטן: ״הכניסה מהצד הצפוני סגורה במשחקים.״' },
          { who: 'קובי', text: 'ימינה? פעם היה שמאלה. ליד הדוכן של הגרעינים.' },
          { who: 'פוגי', text: 'פעם לא היה שער 11.' },
        ],
        choices: [
          {
            id: 'sign',
            text: '(לפי השלט עד השער — ומשם לתת לו להוביל, לאן שהוא זוכר.)',
            then: [
              { e: 'flag', flag: 'r:signs' },
              { e: 'flagValue', flag: 'r:find', value: 'sign' },
              { e: 'time', minutes: 20 },
              { e: 'energy', delta: -3 },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 3 },
              { e: 'proof', kind: 'navigation', proofId: 'navigation:{chapter}:bloomfield', subjectHe: 'הדרך במקום החדש', noteHe: 'נקראה מהשילוט, ולא מזיכרון של מפה אחרת.' },
              { e: 'presence', mode: 'inside' },
              { e: 'attend' },
              { e: 'toast', text: 'בשער הוא לקח את ההובלה, ישר לשורה שלכם, כאילו לא עברו שלוש שנים. קובי: "עכשיו אתה רואה?" — "כן. גם שאתה מאלתר." — "משפחתי."', tone: 'plain' },
              { e: 'ending', id: 'found' },
            ],
          },
          {
            id: 'habit',
            text: '(ללכת אחריו, שמאלה, כמו פעם.)',
            then: [
              { e: 'flag', flag: 'r:signs' },
              { e: 'flagValue', flag: 'r:find', value: 'habit' },
              { e: 'time', minutes: 35 },
              { e: 'energy', delta: -5 },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 2 },
              { e: 'presence', mode: 'inside' },
              { e: 'attend' },
              { e: 'toast', text: 'שמאלה הייתה גדר. חזרתם את כל הדרך, והוא אמר: "רציתי לבדוק שאתה יודע." — "משפחתי."', tone: 'plain' },
              { e: 'ending', id: 'found' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'r-signs',
    nameHe: 'קובי',
    branches: [
      {
        lines: [
          { who: 'קובי', text: 'פה היינו פונים.' },
          { who: 'פוגי', text: 'פעם.' },
          { who: 'קובי', text: 'אני יודע.' },
          { who: 'פוגי', text: 'אז למה פנית?' },
          { who: 'קובי', text: 'רציתי לבדוק שאתה יודע.' },
        ],
        choices: [
          {
            // (90-E) the way is found on the new sign itself (`r-find`), and the proof is written there
            id: 'together',
            text: '(למצוא דרך יחד — ולתת לו להוביל חלק.)',
            then: [
              { e: 'flagValue', flag: 'r:find', value: 'reading' },
              { e: 'toast', text: 'קובי: "אז תקרא אתה. אני אגיד לך אם זה נשמע נכון."', tone: 'plain' },
            ],
          },
          {
            id: 'keren',
            text: '(לבוא עם מי שזוכרת משהו אחר.)',
            then: [
              { e: 'flag', flag: 'r:signs' },
              { e: 'time', minutes: 30 },
              { e: 'rel', who: 'keren', axis: 'bond', delta: 3 },
              { e: 'memory', item: 'ticket-stub', id: 'r-bloomfield-2019' },
              { e: 'presence', mode: 'inside' },
              { e: 'attend' },
              { e: 'ending', id: 'other' },
            ],
          },
          {
            id: 'stay',
            text: '"תישאר אתה. תספר לי כשתחזור."',
            then: [
              { e: 'flag', flag: 'r:signs' },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 2 },
              { e: 'presence', mode: 'late' },
              { e: 'ending', id: 'told' },
            ],
          },
        ],
      },
    ],
  },

  // ----------------------------------------------------------------- R03–R05 ------
  {
    id: 'r-indoors',
    nameHe: 'קובי',
    // 2020, הגבלות: "המסך על השולחן", "אני רואה רק תקרה"
    remote: { 'קובי': 'video' },
    branches: [
      {
        lines: [
          { who: null, text: 'ערב. המסך על השולחן, והבית שקט יותר מהרגיל.' },
          { who: 'קובי', text: 'אתה שומע אותי?' },
          { who: 'פוגי', text: 'כן.' },
          { who: 'קובי', text: 'עכשיו?' },
          { who: 'פוגי', text: 'אבא, זה אותו עכשיו.' },
          { who: 'קובי', text: 'אתה אומר את זה, אבל אני רואה רק תקרה.' },
        ],
        choices: [
          {
            id: 'family',
            text: '(לסדר את השיחה — ולתת לו לבחור מה מספרים.)',
            then: [
              { e: 'flag', flag: 'r:indoors' },
              { e: 'time', minutes: 30 },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 3 },
              { e: 'wellbeing', key: 'loneliness', delta: -8 },
              { e: 'toast', text: 'קובי: "תראה את החוברת." — "זאת שלך." — "אני יודע. רציתי לראות ששמרת."', tone: 'plain' },
            ],
          },
          {
            // (90-E) the sorting is done with the hands (`chore:story:archive-21`); `r-sorted` answers the count
            id: 'archive',
            text: '(למיין את האוסף — ולכתוב מאיפה כל דבר.)',
            then: [
              { e: 'flag', flag: 'r:indoors' },
              { e: 'minigame', id: 'chore:story:archive-21' },
            ],
          },
          {
            id: 'personal',
            text: '(לסיים משהו שלי, מחוץ לכדורגל.)',
            then: [
              { e: 'flag', flag: 'r:indoors' },
              { e: 'time', minutes: 60 },
              { e: 'energy', delta: -10 },
              { e: 'skill', skill: 'creativity', delta: 3, why: 'לא תלוי בדקה תשעים' },
              { e: 'proof', kind: 'creation_proof', proofId: 'creation_proof:{chapter}:personal', subjectHe: 'הדבר שלא תלוי בדקה תשעים', noteHe: 'נגמר בערב אחד, ואף אחד לא ביקש אותו.' },
              { e: 'toast', text: 'קרן: "על מה עבדת?" — "משהו שלא תלוי בדקה תשעים." — "נשמע כמעט חשוד."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'r-sorted',
    nameHe: null,
    branches: [
      {
        when: { flag: 'r:sortall' },
        lines: [{ who: null, text: 'שש שורות מקור, בכתב יד, על פתק בתוך המכסה. מה זה, מאיפה, ומי נתן.' }],
        then: [
          { e: 'flag', flag: 'r:sortsaid' },
          { e: 'skill', skill: 'knowledge', delta: 3, why: 'מאיפה כל דבר, לא רק מה זה' },
          { e: 'proof', kind: 'provenance_review', proofId: 'provenance_review:{chapter}:box', subjectHe: 'הקופסה האדומה', noteHe: 'כל פריט קיבל שורת מקור, כדי שלא ישוכתב שוב.' },
          { e: 'toast', text: 'נועם: "תכתוב גם מאיפה כל דבר." — "כדי שלא נשכתב שוב?" — "בדיוק."', tone: 'plain' },
        ],
      },
      {
        lines: [{ who: null, text: 'חלק מהפריטים קיבלו שורת מקור. השאר מחכים בקופסה, בלי שם — עוד לא.' }],
        then: [{ e: 'flag', flag: 'r:sortsaid' }],
      },
    ],
  },
  {
    id: 'r-final',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'הקיוסק. המסך הקטן מעל המקרר, ושמונה אנשים שעומדים כאילו יש להם כרטיס.' },
          { who: null, text: '{anchor}.' },
          { who: null, text: 'אופיר לא מסתכל על המסך. הוא מסתכל על הבקבוק שלו.' },
        ],
        choices: [
          {
            id: 'stay',
            text: '(לראות עד השריקה. עד הסוף, גם כשכבר ברור.)',
            then: [{ e: 'flag', flag: 'r:final' }, { e: 'flagValue', flag: 'life:cup2021:watched', value: 'whistle' }, { e: 'time', minutes: 25 }, { e: 'wellbeing', key: 'stress', delta: 4 }, { e: 'toast', text: 'השריקה. אף אחד לא זז. מישהו מכבה את הקול ומשאיר את התמונה.', tone: 'plain' }],
          },
          {
            id: 'off',
            text: '(לצאת החוצה לפני הסוף. לשמוע אותו מהמדרכה.)',
            then: [{ e: 'flag', flag: 'r:final' }, { e: 'flagValue', flag: 'life:cup2021:watched', value: 'outside' }, { e: 'time', minutes: 15 }, { e: 'wellbeing', key: 'stress', delta: -3 }, { e: 'toast', text: 'מהמדרכה שומעים את הסוף בלי לראות: קריאה אחת, ואז שקט של קיוסק.', tone: 'plain' }],
          },
          {
            id: 'ofir',
            text: '(להסתכל על אופיר, לא על המסך.)',
            then: [{ e: 'flag', flag: 'r:final' }, { e: 'flagValue', flag: 'life:cup2021:watched', value: 'ofir' }, { e: 'time', minutes: 25 }, { e: 'rel', who: 'ofir', axis: 'trust', delta: 2 }, { e: 'toast', text: 'את הסוף ראית על הפנים שלו. זה היה מספיק ברור.', tone: 'plain' }],
          },
        ],
      },
    ],
  },
  {
    id: 'r-cup',
    nameHe: 'אופיר',
    /** (pass D) Ofir answers how the end was watched before anything is offered to him */
    branches: CUP_OPENERS.map(([when, extra]): Branch => ({
      ...(when ? { when } : {}),
        lines: [
          ...extra,
          { who: 'פוגי', text: 'אתה רוצה לדבר?' },
          { who: 'אופיר', text: 'לא עכשיו.' },
          { who: 'פוגי', text: 'אוכל?' },
          { who: 'אופיר', text: 'זה כן.' },
          { who: 'קובי', text: 'סוף סוף שאלה עם תשובה פשוטה.' },
        ],
        choices: [
          {
            id: 'sit',
            text: '(לשבת יחד. בלי "זה רק משחק".)',
            then: [
              { e: 'flag', flag: 'r:cup' },
              { e: 'time', minutes: 20 },
              { e: 'rel', who: 'ofir', axis: 'bond', delta: 3 },
              { e: 'toast', text: 'אופיר: "תודה שלא אמרת את המשפט הזה." — "חשבתי עליו. חסכתי לשנינו."', tone: 'plain' },
            ],
          },
          {
            id: 'ten',
            text: '"עשר דקות לעצמי, ואני בא."',
            then: [
              { e: 'flag', flag: 'r:cup' },
              { e: 'time', minutes: 10 },
              { e: 'wellbeing', key: 'stress', delta: -5 },
              { e: 'flagValue', flag: 'r:cup2021', value: 'regulated' },
              { e: 'toast', text: 'קובי: "אני מחכה ליד היציאה, לא רודף אחריך." — "עשר דקות ואני בא."', tone: 'plain' },
            ],
          },
          {
            id: 'shrink',
            text: '"נו באמת. זה לא סוף העולם."',
            then: [
              { e: 'flag', flag: 'r:cup' },
              { e: 'rel', who: 'ofir', axis: 'bond', delta: -1 },
              { e: 'flagValue', flag: 'r:cup2021', value: 'dismissed_feeling' },
              { e: 'wellbeing', key: 'regret', delta: 4 },
              { e: 'toast', text: 'אופיר: "אם בשבילך זה כלום, אל תחליט שגם בשבילי." — "צודק. לא ניסחתי טוב."', tone: 'red' },
            ],
          },
        ],
    })),
  },
  {
    id: 'r-young',
    nameHe: 'אפי',
    branches: [
      {
        lines: [
          { who: null, text: 'ערב אחר, וכואב לאנשים אחרים.' },
          { who: 'אפי', text: 'הם לא חייבים לדעת מה היה ב־93 כדי שזה יכאב להם.' },
          { who: 'פוגי', text: 'אני יודע.' },
          { who: 'אפי', text: 'אתה כבר פתחת את הפה.' },
          { who: 'פוגי', text: 'סגרתי.' },
          { who: 'אפי', text: 'יפה. התקדמות.' },
        ],
        choices: [
          {
            id: 'ask',
            text: '(לשאול מה הם ראו. ולהקשיב.)',
            then: [
              { e: 'flag', flag: 'r:young' },
              { e: 'time', minutes: 20 },
              { e: 'skill', skill: 'communication', delta: 2, why: 'שאל, ולא השווה' },
              { e: 'proof', kind: 'listened', proofId: 'listened:{chapter}:young', subjectHe: 'הערב שלהם', noteHe: 'לא סיפר על ערב אחר, וגם לא השווה בשקט.' },
              { e: 'toast', text: 'פוגי: "מה הכי נשאר לך מהערב?" — "עכשיו זאת שאלה."', tone: 'plain' },
              { e: 'ending', id: 'asked' },
            ],
          },
          {
            id: 'short',
            text: '(זיכרון קצר — רק אם ביקשו.)',
            then: [
              { e: 'flag', flag: 'r:young' },
              { e: 'flagValue', flag: 'r:basket2022', value: 'invited_memory' },
              { e: 'memory', item: 'clipping', id: 'r-basket-2022' },
              { e: 'toast', text: 'אפי: "קצר." — "אתה מודד?" — "מכיר אותך."', tone: 'plain' },
              { e: 'ending', id: 'invited' },
            ],
          },
          {
            id: 'eat',
            text: '(לצאת לאכול, ולדבר מחר.)',
            then: [
              { e: 'flag', flag: 'r:young' },
              { e: 'time', minutes: 20 },
              { e: 'rel', who: 'efi', axis: 'bond', delta: 3 },
              { e: 'toast', text: 'אפי: "אותו מקום?" — "הפעם נבחר חדש."', tone: 'plain' },
              { e: 'ending', id: 'elsewhere' },
            ],
          },
        ],
      },
    ],
  },
]
