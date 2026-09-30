import type { LifeState } from '../types'

import type { Beat } from './beats'
import type { EndingCard } from './chapter1986'
import type { Conversation } from './script'
import { PORTRAIT_EUROPE } from './chapter2002europe'

/**
 * H01–H04 · "ריח של בית" · 2004–2006 — וזה הפרק שבו הייסוד מתחיל, בלי שאיש אומר את המילה.
 *
 * התסריט בונה כאן קשת: **H01 נותן לבית הישן רגע שמחה לפני קשת האובדן** (זו הלשון של
 * מאור), **H02 מודד מה נשאר כשהבית כבר אינו מקום המשחק הרגיל**, ו-`founding.outreach_seed`
 * — הרשימה של מי שהיה ונעלם — נכתב שם, שנה לפני 2007. H03 הוא עבודה אמיתית אצל לירון,
 * ו-H04 מכיר את **אולי**, הנהג של 2010, *"לפני הנסיעה של 2010"*.
 *
 * **העוגן הוא 8.3.2004, והוא לא היה בארכיון.** `H01` כותב 96:71 ו"עשרים וחמש הפרש",
 * והארכיון החזיק שש שורות כדורסל מ-1991–1993 בלבד. כלל 49 אומר מה עושים: מוסיפים את
 * השורה, לא מקלידים את התוצאה בתסריט. היא נקראה מדוח המשחק של **מכבי תל אביב עצמה**.
 *
 * **החדרים, וההחלפה האחת שהיא פשרה מוצהרת:**
 * · H01 → `ussishkin-hall` (הפרקט, `ussMain`) — בדיוק החדר שהסצנה כתובה בו.
 * · H02 → `ussishkin-outside` — *"מחוץ לאוסישקין"*, ככתוב.
 * · H03 → `workshop` — **הסדנה של לירון** (`workshopFix`, 21.9.2026), מאחורי חלון
 *   הסלולר באלנבי. עד שהציור נחת היא ישבה במשרד הכרטיסים, כפשרה כתובה; היום היא יושבת
 *   במקום שהתסריט כתב, ועל השולחן שם מונח טרנזיסטור פתוח — *"פעם היית בא עם רדיו"*.
 * · H04 → `bus-station` — *"נקודת מפגש לנסיעה"*, וזה מה שהציור מראה.
 */

export const PORTRAIT_HOME: Record<string, string> = {
  ...PORTRAIT_EUROPE,
  'אולי': 'faceSupporter',
  'שלומי': 'faceSupporterB',
  'אזולאי': 'faceSupporterB',
}

/**
 * יום אצל לירון — שמונה שעות אצל **בעל מקצוע**, ולכן `skilled`.
 *
 * יוצא כ-200 ₪; התסריט כתב 220. ההפרש הוא הכיול של `WAGE` מול מה שמאור זכר, ושניהם
 * באותה מציאות — ולכן המספר **נגזר** ולא מוקלד: ביום שהכיול ישתנה, הוא יזוז איתו.
 * (דלתא 90) משולם בסוף היום (`h-work-done`), לפי מה שיצא מהחלון (`orders-06`).
 */
import { shiftAgorot } from '../income'
const LIRON_DAY = shiftAgorot(2006, 8, true)

export function objectiveHome(state: LifeState, sceneId: string): string | null {
  if (state.chapterDone) return null
  if (!state.flags['h:derby']) return sceneId === 'ussishkin-hall' ? null : 'אפי גורר אותך לאולם. יש דרבי.'
  if (!state.flags['h:door']) return sceneId === 'ussishkin-outside' ? null : 'אוסישקין. מבחוץ, הפעם.'
  if (!state.flags['h:work']) return sceneId === 'workshop' ? null : 'לירון קרא לך. הסדנה באלנבי, מאחורי חלון הסלולר.'
  if (!state.flags['h:oli']) return sceneId === 'bus-station' ? null : 'יש נסיעה. מישהו נוהג.'
  return null
}

/**
 * שלושה סיומים, והם על **מה שנשאר אחרי שהבית מפסיק להיות הבית**.
 *
 * זו הקשת שהתסריט מבקש, ולכן אין כאן סיום "ניצחת": הדרבי נגמר בשמחה בהתחלה, והפרק
 * נגמר שנתיים אחריו, ליד דלת נעולה. מה שמפריד בין השלושה הוא מה שפוגי עשה עם זה —
 * רשם אנשים, צילם, או פשוט הלך לצד אפי.
 */
export const ENDINGS_HOME: Record<string, EndingCard> = {
  list: {
    id: 'list',
    titleHe: 'גם להם חסר',
    bodyHe:
      'כתבת רשימה. לא רק את מי שבא תמיד — גם את אלה שנעלמו, כי אפי אמר שאולי גם להם חסר. לא ידעת אז מה הרשימה הזאת, ושנה אחר כך היא הייתה הדבר היחיד שהיה לכם.',
    memoryHe: 'דף עם שמות, וחצי מהם לא ענו.',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
  photo: {
    id: 'photo',
    titleHe: 'משם באנו',
    bodyHe:
      'צילמת את הכניסה, לא רק את המקום שצעקתם בו — כי סוקו אמר שמשם באנו. התמונה הזאת יצאה מטושטשת, והוא בכל זאת כתב עליה מאחור.',
    memoryHe: 'הכניסה, מטושטשת, ובכל זאת שמורה.',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
  walk: {
    id: 'walk',
    titleHe: 'הקול המקורי',
    bodyHe:
      'הלכתם, שניכם, בלי תוף ובלי רשימה. אפי אמר שמוזר לשמוע אותך בלי תוף, ואמרת שזה הקול המקורי. באותה שנה זה עוד נשמע כמו בדיחה.',
    memoryHe: 'הליכה, ושום דבר שנשאר ממנה חוץ ממנה.',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
}

export const BEATS_HOME: Beat[] = [
  /**
   * ...והביט הזה מרים גם את **הידיעה על המקום**, וזו לא נוחות.
   *
   * `life:knows:hall` הורם עד היום רק ב-`a3-hall`, שהוא פרק **מותנה**
   * (`when: ['life:a2:efi']`). כלומר חצי מהחיים הגיעו ל-2007 בלי לדעת איפה אוסישקין,
   * ו-`life:worldlines` דיווח בדיוק את זה: `GOAL_UNREACHABLE` על `2007-registered`
   * בתשעה קווי חיים מתוך עשרה (כלל 75).
   *
   * מי שעמד על הפרקט ב-2004 יודע איפה זה, והתחילית `life:` שורדת מעבר פרק בכוונה —
   * ולכן פעם אחת מספיקה. הדגל מורם **כאן**, בקובץ התוכן, ולא ב-`chapters.ts`:
   * `carryableBefore` סורק את קובץ הפרק, ודגל שנולד במרשם אינו נראה לו בכלל.
   */
  {
    id: 'h-derby',
    at: 'ussishkin-hall',
    trigger: 'enter',
    when: { none: [{ flag: 'h:derby' }] },
    delayMs: 800,
    do: [{ a: 'flag', flag: 'life:knows:hall' }, { a: 'talk', conversation: 'h-derby' }],
  },
  {
    id: 'h-door',
    at: 'ussishkin-outside',
    trigger: 'clock',
    when: { all: [{ flag: 'h:derby' }], none: [{ flag: 'h:door' }] },
    delayMs: 700,
    do: [{ a: 'talk', conversation: 'h-door' }],
  },
  {
    id: 'h-work',
    at: 'workshop',
    trigger: 'clock',
    when: { all: [{ flag: 'h:door' }], none: [{ flag: 'h:work' }] },
    delayMs: 600,
    do: [{ a: 'talk', conversation: 'h-liron' }],
  },
  {
    id: 'h-oli',
    at: 'bus-station',
    trigger: 'clock',
    when: { all: [{ flag: 'h:work' }], none: [{ flag: 'h:oli' }] },
    delayMs: 600,
    do: [{ a: 'talk', conversation: 'h-oli' }],
  },
  /**
   * (דלתא 90) התגובות לעבודה שנעשתה — בחדר שבו נעשתה, מיד כשחוזרים אליו. הן, ושלוש
   * הסצנות שבחוץ, הן ביטי שעון **של חדר** (`at` + `clock`) ולא ביטי דלת: מי שסגר תיבה
   * בטעות שומע אותה שוב כל עוד הוא עומד שם, בלי לצאת ולהיכנס (כלל 42).
   */
  {
    id: 'h-helped',
    at: 'ussishkin-hall',
    trigger: 'clock',
    when: { all: [{ flag: 'h:helped' }], none: [{ flag: 'h:helpedSaid' }] },
    delayMs: 600,
    do: [{ a: 'talk', conversation: 'h-helped' }],
  },
  {
    id: 'h-work-done',
    at: 'workshop',
    trigger: 'clock',
    when: { all: [{ flag: 'h:worked' }], none: [{ flag: 'h:workSaid' }] },
    delayMs: 600,
    do: [{ a: 'talk', conversation: 'h-work-done' }],
  },
  /** והסגירה על השעון, מאותה סיבה כמו בשני הפרקים הקודמים (כלל 67) */
  {
    id: 'h-close',
    trigger: 'clock',
    when: { all: [{ flag: 'h:oli' }], none: [{ flag: 'h:done' }] },
    delayMs: 1000,
    do: [{ a: 'flag', flag: 'h:done' }, { a: 'talk', conversation: 'h-close' }],
  },
]

/**
 * H01 S4 (pass C, 28.9.2026) — *"one confetti/paper remains in pocket · keep/drop · future
 * demolition callback."* A red scrap on the parquet after the derby, for whoever was in the
 * hall. Kept, it is `life:uss:confetti` — and on 25.7.2007, outside the fence, it is in his wallet.
 */
export const USS_CONFETTI = 'life:uss:confetti'

export const CONVERSATIONS_HOME: Conversation[] = [
  {
    id: 'h-confetti',
    nameHe: null,
    branches: [
      {
        lines: [{ who: null, text: 'פתק קונפטי אדום על הפרקט, דרוך. מישהו גזר אותו מעיתון של אתמול, ואפשר עוד לקרוא חצי מילה.' }],
        choices: [
          { id: 'keep', text: '(לקפל אותו לארנק.)', then: [{ e: 'flag', flag: 'h:confetti' }, { e: 'flag', flag: USS_CONFETTI }, { e: 'toast', text: 'בארנק, מאחורי התעודה. לא סיבה. סתם.', tone: 'plain' }] },
          { id: 'drop', text: '(להשאיר אותו על הפרקט. זה המקום שלו.)', then: [{ e: 'flag', flag: 'h:confetti' }, { e: 'toast', text: 'מחר בבוקר מישהו יטאטא אותו. ככה זה אמור להיות.', tone: 'plain' }] },
        ],
      },
    ],
  },
  {
    id: 'h-derby',
    nameHe: 'אפי',
    branches: [
      {
        lines: [
          { who: 'אפי', text: 'עכשיו אתה מבין למה אני גורר אותך לפה?' },
          { who: 'פוגי', text: 'חשבתי בגלל הריח.' },
          { who: 'אפי', text: 'גם. אי אפשר להסביר הכול בטלפון.' },
          { who: 'שחור', text: 'מי מסביר? תזוזו מהדלת.' },
        ],
        choices: [
          {
            /** (דלתא 90) הפירוק נעשה בידיים — הארגזים של שחור, עד הדלת (`fold-04`); שחור עונה אחרי (`h-helped`) */
            id: 'help',
            text: '(להישאר אחרי, לעזור בפירוק.)',
            then: [
              { e: 'flag', flag: 'h:derby' },
              { e: 'attend' },
              { e: 'minigame', id: 'chore:story:fold-04' },
            ],
          },
          {
            id: 'photo',
            text: '(לצלם את אפי בלי שהוא מסתכל.)',
            then: [
              { e: 'flag', flag: 'h:derby' },
              { e: 'flag', flag: 'own:photo:ussishkin2004' },
              { e: 'time', minutes: 10 },
              { e: 'skill', skill: 'knowledge', delta: 3, why: 'לתעד שמחה' },
              { e: 'attend' },
              { e: 'toast', text: 'אפי: "למה בלי שאני מסתכל?" — "כי ככה אתה נראה כשאתה באמת שמח."', tone: 'plain' },
            ],
          },
          {
            id: 'tv',
            text: '(לראות מהבית, ולהתקשר אחרי.)',
            then: [
              { e: 'flag', flag: 'h:derby' },
              { e: 'rel', who: 'efi', axis: 'bond', delta: 3 },
              { e: 'presence', mode: 'television' },
              { e: 'flag', flag: 'h:tv' },
              { e: 'toast', text: 'אפי: "שמעת את האולם?" — "גם כשהנמכתי."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'h-door',
    nameHe: 'אפי',
    branches: [
      {
        lines: [
          { who: 'אפי', text: 'אני עוד בא לפה לפני שאני נזכר.' },
          { who: 'פוגי', text: 'גם כשאין משחק?' },
          { who: 'אפי', text: 'במיוחד.' },
          { who: 'בתיה', text: 'אם אתם עומדים, תעמדו בצל. געגועים לא נותנים פטור משמש.' },
        ],
        choices: [
          {
            id: 'list',
            text: '(לכתוב רשימת אנשים למפגש.)',
            then: [
              { e: 'flag', flag: 'h:door' },
              { e: 'flagValue', flag: 'h:kept', value: 'list' },
              { e: 'time', minutes: 45 },
              { e: 'energy', delta: -5 },
              { e: 'skill', skill: 'organization', delta: 3, why: 'מי היה ומי נעלם' },
              /**
               * `founding.outreach_seed` בתסריט → `community_help` במנוע, **ולא**
               * `founding_proof`.
               *
               * ההפרש אינו סמנטיקה: `founding_proof` הוא מה ש-`USSISHKIN_FOUNDER.apex`
               * סופר, והאפקס דורש **שלוש ראיות בשלושה פרקים** בחלון 2007. ראיה מ-2006
               * שנספרת שם הייתה פותחת את הפסגה לפני שהעמותה קיימת — כלומר תואר מייסד
               * שנקנה במילה (כלל 71, בדיוק הפגם שכרטיס המסלול נבנה נגדו).
               * זו עזרה לקהילה, והיא **הזרע** של 2007 ולא ההוכחה שלו.
               */
              { e: 'proof', kind: 'community_help', proofId: 'community_help:{chapter}:outreach', subjectHe: 'הרשימה של מי שהיה ונעלם', audience: 'ussishkin', delta: 4 },
              { e: 'toast', text: 'אפי: "אל תכתוב רק את מי שבא תמיד. אולי גם להם חסר."', tone: 'plain' },
            ],
          },
          {
            id: 'photo',
            text: '(לצלם את הדלת ואת הכניסה.)',
            then: [
              { e: 'flag', flag: 'h:door' },
              { e: 'flagValue', flag: 'h:kept', value: 'photo' },
              { e: 'flag', flag: 'own:photo:ussishkinDoor' },
              { e: 'time', minutes: 30 },
              { e: 'skill', skill: 'knowledge', delta: 3, why: 'הכניסה, לא רק היציע' },
              /**
               * (27.9.2026) התסריט שם את המשפט הזה בפי בתיה, ומאור הכריע שזו עבודה של סוקו:
               * *"היא לוקחת ל'סוקו' ול'מישל' את התפקיד"*. לתעד, לשמור, לכתוב מאחור — זה סוקו
               * (הספר: "מוצא מסמכים ושומר חפצים"). המילים של התסריט נשארו מילה במילה.
               */
              { e: 'toast', text: 'סוקו: "תצלם גם את הכניסה, לא רק איפה שצעקתם." — "למה?" — "כי משם באנו."', tone: 'plain' },
            ],
          },
          {
            id: 'walk',
            text: '(פשוט ללכת איתו.)',
            then: [
              { e: 'flag', flag: 'h:door' },
              { e: 'flagValue', flag: 'h:kept', value: 'walk' },
              { e: 'time', minutes: 30 },
              { e: 'energy', delta: -5 },
              { e: 'rel', who: 'efi', axis: 'bond', delta: 3 },
              { e: 'toast', text: 'אפי: "מוזר לשמוע אותך בלי תוף." — "תתרגל. זה הקול המקורי."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'h-liron',
    nameHe: 'לירון',
    branches: [
      {
        lines: [
          { who: 'לירון', text: 'פעם היית בא עם רדיו. עכשיו כולם באים עם מספר טלפון.' },
          { who: 'פוגי', text: 'יותר קל?' },
          { who: 'לירון', text: 'הרדיו לפחות היה שותק כשהוצאתי סוללות.' },
          { who: 'ירון', text: 'אני שומע אותך.' },
          { who: 'לירון', text: 'הנה, דוגמה.' },
        ],
        choices: [
          {
            /**
             * (דלתא 90) יום עבודה אמיתי — מה שפוגי מתחיל להחזיק ביד בגיל עשרים ושמונה, ומה
             * שיש לו עכשיו להפסיד (§7, 2006). ההזמנות בחלון, אחת־אחת (`orders-06`): השכר
             * לפי מה שיצא, `enterprise` בתסריט → `business` במנוע, והראיה אחרי (`h-work-done`).
             */
            id: 'sort',
            text: '"אני ממיין לפי דחיפות. לא לפי מי שאני אוהב."',
            then: [{ e: 'minigame', id: 'chore:story:orders-06' }],
          },
          {
            /** החבילות מהדלת האחורית לשולחן (`boxes-06`) — בלי שכר, כמו שהיה */
            id: 'hands',
            text: '(לעזור לירון עם הידיים, בלי קשרים.)',
            then: [{ e: 'minigame', id: 'chore:story:boxes-06' }],
          },
          {
            id: 'no',
            text: '"היום לא. עדיף שתדע עכשיו."',
            then: [
              { e: 'flag', flag: 'h:work' },
              { e: 'personality', key: 'honesty', delta: 3 },
              { e: 'toast', text: 'לירון: "עדיף לא היום מכבר־מגיע עד מחר."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    /** שחור, אחרי הפירוק — הראיה רק למי שסחב את כל הצד הכבד */
    id: 'h-helped',
    nameHe: 'שחור',
    branches: [
      {
        when: { flag: 'h:helped-all' },
        lines: [
          { who: 'שחור', text: 'אותם ארגזים, אנשים אחרים.' },
          { who: 'פוגי', text: 'אני עדיין פה.' },
        ],
        then: [
          { e: 'flag', flag: 'h:helpedSaid' },
          { e: 'proof', kind: 'community_help', proofId: 'community_help:{chapter}:hall', subjectHe: 'הצד הכבד של הארגז', audience: 'ussishkin', delta: 3 },
        ],
      },
      { lines: [{ who: 'שחור', text: 'גם זה. את השאר אני סוחב מאז שנולדת.' }], then: [{ e: 'flag', flag: 'h:helpedSaid' }] },
    ],
  },
  {
    /** לירון וירון, בסוף היום — מה שיצא מהחלון, לא מה שנאמר עליו */
    id: 'h-work-done',
    nameHe: 'לירון',
    branches: [
      {
        when: { all: [{ flag: 'h:worked-sort' }, { flag: 'h:orders-all' }] },
        lines: [{ who: 'לירון', text: 'אל תופתע. ככה אמור להיראות יום רגיל.' }],
        then: [
          { e: 'flag', flag: 'h:workSaid' },
          { e: 'money', agorot: LIRON_DAY, why: 'יום אצל לירון' },
          { e: 'proof', kind: 'adult_shift', proofId: 'adult_shift:{chapter}:liron', subjectHe: 'הזמנות שיצאו בזמן', audience: 'work', delta: 3 },
        ],
      },
      {
        when: { all: [{ flag: 'h:worked-sort' }, { flag: 'h:orders-half' }] },
        lines: [{ who: 'לירון', text: 'לא הכול יצא, אבל מה שיצא — יצא נכון. ככה אמור להיראות יום רגיל.' }],
        then: [
          { e: 'flag', flag: 'h:workSaid' },
          { e: 'money', agorot: Math.round((LIRON_DAY * 3) / 400) * 100, why: 'יום אצל לירון' },
          { e: 'proof', kind: 'adult_shift', proofId: 'adult_shift:{chapter}:liron', subjectHe: 'הזמנות שיצאו בזמן', audience: 'work', delta: 3 },
        ],
      },
      {
        when: { all: [{ flag: 'h:worked-sort' }, { flag: 'h:orders-some' }] },
        lines: [{ who: 'לירון', text: 'חצי יום. גם חצי יום משלמים, אבל מחר מתחילים מוקדם.' }],
        then: [{ e: 'flag', flag: 'h:workSaid' }, { e: 'money', agorot: Math.round(LIRON_DAY / 200) * 100, why: 'חצי יום אצל לירון' }],
      },
      {
        when: { flag: 'h:worked-sort' },
        lines: [{ who: 'לירון', text: 'הטלפונים צלצלו ואתה עמדת. היום לא משלמים, ומחר — אם תרצה — מתחילים מההתחלה.' }],
        then: [{ e: 'flag', flag: 'h:workSaid' }],
      },
      {
        when: { flag: 'h:boxes-some' },
        lines: [
          { who: 'ירון', text: 'לא ביקשתי קשרים. ביקשתי זוג ידיים.' },
          { who: 'לירון', text: 'והוא קיבל.' },
        ],
        then: [{ e: 'flag', flag: 'h:workSaid' }],
      },
      {
        lines: [
          { who: 'ירון', text: 'ביקשתי זוג ידיים.' },
          { who: 'לירון', text: 'עזוב אותו. יש ימים שהידיים לא באות. מחר.' },
        ],
        then: [{ e: 'flag', flag: 'h:workSaid' }],
      },
    ],
  },
  {
    id: 'h-oli',
    nameHe: 'אולי',
    branches: [
      {
        lines: [
          { who: 'אולי', text: 'אני אולי.' },
          { who: 'פוגי', text: 'אולי מה?' },
          { who: 'אולי', text: 'הנה, עשית את זה. אפשר להתקדם.' },
          { who: 'אופיר', text: 'הוא נוהג.' },
          { who: 'אולי', text: 'רק אם אני יודע מי בא איתי.' },
        ],
        choices: [
          {
            id: 'roster',
            text: '(לעזור לו עם הרשימה.)',
            then: [
              { e: 'flag', flag: 'h:oli' },
              { e: 'time', minutes: 20 },
              { e: 'rel', who: 'uli', axis: 'trust', delta: 3 },
              { e: 'skill', skill: 'organization', delta: 2, why: 'מי באמת עולה לאוטובוס' },
              { e: 'proof', kind: 'route_plan', proofId: 'route_plan:{chapter}:oli', subjectHe: 'רשימת הנוסעים, עם שמות', audience: 'gate7', delta: 3 },
              { e: 'toast', text: 'אולי: "זה שאמר \'אני איתך\' לא נחשב שם."', tone: 'plain' },
            ],
          },
          {
            id: 'sit',
            text: '(לשבת עם החבורה.)',
            then: [
              { e: 'flag', flag: 'h:oli' },
              { e: 'rel', who: 'uli', axis: 'bond', delta: 3 },
              { e: 'wellbeing', key: 'belonging', delta: 4 },
              { e: 'toast', text: 'שלומי: "גם כשאתם מפסידים אתם עושים רעש כזה?" — "זאת התוכנית הבסיסית."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'h-close',
    nameHe: null,
    branches: [
      {
        when: { flagIs: { flag: 'h:kept', value: 'list' } },
        lines: [{ who: null, text: 'הרשימה נשארה בכיס ימין עד שהתרככה בקצוות. חצי מהשמות עליה לא ענו, וזה לא הפך אותה לפחות רשימה.' }],
        then: [{ e: 'ending', id: 'list' }],
      },
      {
        when: { flagIs: { flag: 'h:kept', value: 'photo' } },
        lines: [{ who: null, text: 'התמונה של הכניסה יצאה מטושטשת, ואף אחד לא ביקש אחרת.' }],
        then: [{ e: 'ending', id: 'photo' }],
      },
      {
        lines: [{ who: null, text: 'הלכתם עד הפינה ואז עוד אחת, ואז אפי אמר שהוא ממשיך לבד.' }],
        then: [{ e: 'ending', id: 'walk' }],
      },
    ],
  },
]
