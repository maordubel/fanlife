import { at } from '../clock'
import type { LifeState } from '../types'

import type { Beat } from './beats'
import type { Conversation } from './script'

/**
 * שני חוטים שעוברים דרך העשור — 7.9.2026, משני רעיונות של מאור.
 *
 * שניהם עונים על אותו תנאי שהרשימה שלו קובעת: הם בנויים על מערכות שכבר קיימות, הם לא
 * ממציאים שום עובדה, והם מוסיפים **החלטה** ולא תצוגה.
 *
 * ── 1 · מה קרה למחרת ────────────────────────────────────────────────────────────
 *
 * *"היום היחיד שהמשחק לא נותן. אחרי 24.5.1986 — בית ספר, כולם מדברים, והילד שהיה שם הוא
 * היחיד שלא צריך לספר."*
 *
 * 24.5.1986 היה **שבת** (חשבון, לא הנחה), אז "למחרת" הוא **יום ראשון, 25.5.1986** — יום
 * לימודים. הילד בן השמונה חוזר לכיתה אחרי הערב הכי גדול בחייו, וכולם כבר מספרים אותו. חלקם
 * לא היו שם. אחד מהם מספר אותו לא נכון, בביטחון.
 *
 * ההחלטה איננה "לספר או לא". היא **מה עושים עם מישהו שמספר את מה שראית, לא נכון, ומקבל את
 * תשומת הלב שלא הגיעה לו** — וזה בדיוק ההבדל בין ילד שהיה שם לילד שרוצה שידעו שהיה שם.
 * ארבע דרכים, וכל אחת מהן היא אדם אחר בגיל עשרים.
 *
 * ── 2 · הצעיף שעובר ─────────────────────────────────────────────────────────────
 *
 * *"אבא נותן, אתה נותן הלאה. שלושה רגעים לאורך העשור. מי שנותן אותו ב-2000 מקבל סיום אחר."*
 *
 * הצעיף כבר קיים כחפץ (`scarf`), אז אין כאן מערכת חדשה — יש שרשרת. אבא נותן ב-1986; אתה
 * יכול להחזיק אותו עשור, או לתת אותו הלאה באחד משני רגעים שבהם מישהו צריך אותו יותר ממך.
 * מי שמגיע לדאבל של 2000 והצעיף כבר לא אצלו רואה סיום אחר — לא טוב יותר, אחר. מי שנתן,
 * ומי שהחזיק, לא זוכרים את אותו עשור.
 *
 * הכל דגלים תחת `scarf:`, כלומר הם שורדים החלפת שנה כמו `own:shirt:` — כי זה בדיוק אותו
 * סוג של דבר: חפץ שנשמר לחיים.
 */

// ------------------------------------------------------------------- הצעיף ---

export const SCARF_PREFIX = 'scarf:'
/** אבא נתן אותו — 1986, בסוף הערב */
export const SCARF_GIVEN = 'scarf:given'
/**
 * למי הוא עבר, אם עבר.
 *
 * דגל לכל מקבל ולא דגל אחד עם ערך, כי אפקט `flag` בשיחה מרים דגל ולא כותב ערך — וזה נכון:
 * דגל בוליאני אפשר לשאול עליו ב-`when` של כל ביט, ומחרוזת אי אפשר.
 */
export const SCARF_PASSED = 'scarf:passed:'
export const scarfPassedFlag = (who: string) => `${SCARF_PASSED}${who}`

export const passedScarfTo = (state: LifeState): string | null => {
  const key = Object.keys(state.flags).find((flag) => flag.startsWith(SCARF_PASSED) && state.flags[flag])
  return key ? key.slice(SCARF_PASSED.length) : null
}

export const holdsScarf = (state: LifeState): boolean =>
  Boolean(state.flags[SCARF_GIVEN]) && passedScarfTo(state) === null

/**
 * הרגעים — שלושה, כפי שמאור ביקש, וכל אחד מהם רגע שבו מישהו אחר צריך אותו יותר.
 * הרשימה היא נתון כדי שהבדיקה תוכל לספור אותם ולוודא שהשלישי באמת משנה סיום.
 */
export const SCARF_MOMENTS = [
  { id: 'given', chapter: '1986', whoHe: 'קובי', noteHe: 'אבא הוריד אותו מהצוואר שלו ושם עליך. לא אמר כלום.' },
  { id: 'ofir', chapter: '1998-laces', whoHe: 'אופיר', noteHe: 'הוא ישב על המדרגות ולא זז. לא היה לו כלום ביד.' },
  { id: 'kid', chapter: '2000-double', whoHe: 'ילד', noteHe: 'ילד שלא היה בשנות התשעים בכלל. הוא רק יודע שזה נגמר טוב.' },
] as const

export const CONVERSATIONS_SCARF: Conversation[] = [
  {
    id: 'scarf-kobi-86',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'בדרך החוצה, בשער, הוא עצר. הוריד את הצעיף מהצוואר שלו — הפסים שכבר לא ממש פסים — ושם אותו עליך.' },
          { who: 'קובי', text: 'תשמור.' },
          { who: null, text: 'זה כל מה שהוא אמר. זה היה ארוך מדי בשבילך ונגרר על הרצפה.' },
        ],
        then: [
          { e: 'flag', flag: SCARF_GIVEN },
          { e: 'give', item: 'scarf' },
          { e: 'rel', who: 'kobi', axis: 'bond', delta: 6 },
          { e: 'redheart', key: 'familyTradition', delta: 8 },
          { e: 'remember', who: 'kobi', eventId: 'gave-me-the-scarf-1986', significance: 'major' },
        ],
      },
    ],
  },
  {
    id: 'scarf-ofir-98',
    nameHe: null,
    branches: [
      {
        when: { flag: SCARF_GIVEN, none: [{ flag: scarfPassedFlag('ofir') }, { flag: scarfPassedFlag('kid') }] },
        lines: [
          { who: null, text: 'אופיר על המדרגות, לא זז. הצעיף של אבא בכיס שלך מאז שהיית בן שמונה. הוא לא ביקש כלום.' },
        ],
        choices: [
          {
            id: 'give',
            text: 'לתת לו אותו.',
            then: [
              { e: 'flag', flag: scarfPassedFlag('ofir') },
              { e: 'take', item: 'scarf' },
              { e: 'rel', who: 'ofir', axis: 'bond', delta: 8 },
              { e: 'remember', who: 'ofir', eventId: 'gave-me-his-fathers-scarf', significance: 'major' },
              { e: 'toast', text: 'הוא לא אמר תודה. הוא החזיק אותו בשתי ידיים כל הדרך הביתה.', tone: 'plain' },
            ],
          },
          {
            id: 'keep',
            text: 'להשאיר אותו בכיס.',
            then: [
              { e: 'flag', flag: 'scarf:kept:98' },
              { e: 'personality', key: 'stubbornness', delta: 1 },
              { e: 'toast', text: 'זה של אבא. חשבת את זה ולא אמרת אותו.', tone: 'plain' },
            ],
          },
        ],
      },
      { lines: [{ who: null, text: 'הצעיף כבר לא אצלך.' }] },
    ],
  },
  {
    id: 'scarf-kid-2000',
    nameHe: null,
    branches: [
      {
        when: { flag: SCARF_GIVEN, none: [{ flag: scarfPassedFlag('ofir') }, { flag: scarfPassedFlag('kid') }] },
        lines: [
          { who: null, text: 'ילד. שבע, אולי שמונה. הוא לא היה בשנות התשעים בכלל — הוא רק יודע שזה נגמר טוב, וזה כל מה שהוא ידע אי פעם.' },
          { who: null, text: 'הוא מסתכל על הצעיף שלך כמו שאתה הסתכלת פעם על משהו.' },
        ],
        choices: [
          {
            id: 'give',
            text: 'להוריד אותו ולשים עליו.',
            then: [
              { e: 'flag', flag: scarfPassedFlag('kid') },
              { e: 'take', item: 'scarf' },
              { e: 'redheart', key: 'community', delta: 8 },
              { e: 'redheart', key: 'familyTradition', delta: 6 },
              { e: 'toast', text: 'הוא לא אמר כלום. גם אתה לא אמרת כלום. ככה זה עובר.', tone: 'red' },
            ],
          },
          {
            id: 'keep',
            text: 'לא. זה של אבא.',
            then: [
              { e: 'flag', flag: 'scarf:kept:2000' },
              { e: 'redheart', key: 'familyTradition', delta: 4 },
              { e: 'wellbeing', key: 'loneliness', delta: 2 },
              { e: 'toast', text: 'החזקת אותו חזק. אף אחד לא שפט אותך. אתה שפטת.', tone: 'plain' },
            ],
          },
        ],
      },
      {
        lines: [
          { who: null, text: 'ילד מסתכל עליך ומחפש משהו לאחוז בו. אין לך כלום — נתת את זה מזמן, למישהו שהיה צריך.' },
          { who: null, text: 'הוא הולך לחפש אצל מישהו אחר. וזה בסדר. ככה זה עובר.' },
        ],
        then: [{ e: 'redheart', key: 'community', delta: 4 }],
      },
    ],
  },
]

// ------------------------------------------------ יום ראשון, 25.5.1986 ---

export const MORNING_86 = 'life:1986:morning'
export const MORNING_86_DONE = 'm86:done'

/**
 * הבוקר שאחרי — ביט אחד, בשעה שבה יום הלימודים מתחיל.
 *
 * הוא נתלה על `found:kobi`, כלומר על כך שהערב באמת קרה לו, ולא על סיום הפרק: ילד שלא נכנס
 * ולא מצא את אבא שלו אין לו מה לספר למחרת, וזאת בדיוק הנקודה.
 */
export const BEATS_1986: Beat[] = [
  /**
   * הרגע הראשון של הצעיף — בשער, אחרי שמצא את אבא שלו. לפני הבוקר שאחרי, כי הצעיף הוא
   * הדבר שהוא לוקח הביתה מהערב ההוא.
   */
  {
    id: 'm86-scarf',
    trigger: 'clock',
    when: { flag: 'found:kobi', afterMinute: at(21, 40), none: [{ flag: SCARF_GIVEN }] },
    do: [{ a: 'talk', conversation: 'scarf-kobi-86' }],
  },
  {
    id: 'm86-class',
    trigger: 'clock',
    when: { flag: 'found:kobi', afterMinute: at(22, 30), none: [{ flag: MORNING_86 }] },
    do: [
      { a: 'flag', flag: MORNING_86 },
      { a: 'card', titleHe: 'יום ראשון', subHe: '25 במאי 1986', ms: 2600 },
      { a: 'talk', conversation: 'm86-yard' },
    ],
  },
]

export const CONVERSATIONS_MORNING_86: Conversation[] = [
  {
    id: 'm86-yard',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'בבוקר כולם מדברים על זה. גם מי שלא היה. במיוחד מי שלא היה.' },
          { who: 'ילד', text: 'אח שלי אמר שהם קנו את המשחק! שהכל היה מסודר מראש!' },
          { who: null, text: 'הוא לא היה שם. אתה היית. אתה היחיד בכיתה שלא צריך לספר כלום — ובדיוק בגלל זה אף אחד לא שואל אותך.' },
        ],
        choices: [
          {
            id: 'tell',
            text: 'לספר. בדיוק איך זה היה.',
            then: [
              { e: 'personality', key: 'curiosity', delta: 2 },
              { e: 'redheart', key: 'historyMemory', delta: 6 },
              { e: 'flag', flag: 'm86:told' },
              { e: 'goto', node: 'm86-after' },
            ],
          },
          {
            id: 'correct',
            text: '"זה לא נכון. הייתי שם."',
            then: [
              { e: 'personality', key: 'stubbornness', delta: 3 },
              { e: 'redheart', key: 'historyMemory', delta: 4 },
              { e: 'flag', flag: 'm86:corrected' },
              { e: 'goto', node: 'm86-after' },
            ],
          },
          {
            id: 'silent',
            text: 'לשתוק. לתת לו לספר.',
            then: [
              { e: 'personality', key: 'independence', delta: 2 },
              { e: 'wellbeing', key: 'loneliness', delta: 3 },
              { e: 'flag', flag: 'm86:silent' },
              { e: 'goto', node: 'm86-after' },
            ],
          },
          {
            id: 'boast',
            text: '"הייתי שם. אתם לא."',
            then: [
              { e: 'personality', key: 'impulsiveness', delta: 3 },
              { e: 'rel', who: 'ofir', axis: 'tension', delta: 3 },
              { e: 'flag', flag: 'm86:boasted' },
              { e: 'goto', node: 'm86-after' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'm86-after',
    nameHe: null,
    branches: [
      {
        when: { flag: 'm86:told' },
        lines: [
          { who: null, text: 'סיפרת לאט, בלי לצעוק, ובאמצע שמת לב שכולם שקטים. גם המורה. גם הילד שהמציא.' },
          { who: null, text: 'לא ידעת עוד שזה מה שתעשה עם החיים שלך — לספר את מה שראית למי שלא היה. ידעת שזה הרגיש נכון.' },
        ],
        then: [{ e: 'flag', flag: MORNING_86_DONE }, { e: 'redheart', key: 'historyMemory', delta: 4 }],
      },
      {
        when: { flag: 'm86:corrected' },
        lines: [
          { who: null, text: 'אמרת משפט אחד ושתקת. הוא צחק. שניים לידו לא צחקו.' },
          { who: null, text: 'בהפסקה אחד מהם ניגש ושאל "באמת היית?". אמרת כן. הוא ישב לידך.' },
        ],
        then: [{ e: 'flag', flag: MORNING_86_DONE }, { e: 'rel', who: 'amit', axis: 'familiarity', delta: 3 }],
      },
      {
        when: { flag: 'm86:silent' },
        lines: [
          { who: null, text: 'נתת לו לספר. הוא סיפר את זה לא נכון, בביטחון, וכולם האמינו.' },
          { who: null, text: 'ישבת עם זה כל היום. זאת הייתה הפעם הראשונה שהבנת שמה שקרה ומה שמספרים שקרה זה לא אותו דבר — ושמישהו צריך לשמור על ההבדל.' },
        ],
        then: [{ e: 'flag', flag: MORNING_86_DONE }, { e: 'redheart', key: 'historyMemory', delta: 7 }],
      },
      {
        lines: [
          { who: null, text: 'אמרת את זה חזק מדי. הם צחקו, ולא על הבדיחה של השני — עליך.' },
          { who: null, text: 'בערב סיפרת לאבא. הוא אמר "אז מה אם הם לא היו". לא הבנת את זה עוד הרבה שנים.' },
        ],
        then: [{ e: 'flag', flag: MORNING_86_DONE }, { e: 'rel', who: 'kobi', axis: 'trust', delta: 2 }],
      },
    ],
  },
]

/** מה שיצא מהבוקר ההוא, במשפט — לקופסה האדומה ולסוף העשור */
export function morningAfterHe(state: LifeState): string | null {
  if (!state.flags[MORNING_86_DONE]) return null
  if (state.flags['m86:told']) return 'סיפרת את זה לכיתה, לאט, וכולם שתקו.'
  if (state.flags['m86:corrected']) return 'אמרת משפט אחד נגד סיפור שלא היה, ומישהו ישב לידך.'
  if (state.flags['m86:silent']) return 'שתקת, והוא סיפר את זה לא נכון. זכרת את זה שנים.'
  return 'אמרת שהיית שם. חזק מדי.'
}
