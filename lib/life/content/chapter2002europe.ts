import type { LifeState } from '../types'

import type { Beat } from './beats'
import type { EndingCard } from './chapter1986'
import type { Conversation } from './script'
import { PORTRAIT_BRIDGE } from './chapter2000bridge'

/**
 * E01–E05 · "העולם שמע עלינו" · 2001–2002 — המסע, והפרק הראשון שנתלה על **הפסד**.
 *
 * כל פרק קודם במשחק נתלה על תואר, גמר או ערב שהוא שיא. זה נתלה על 21.3.2002 בסן
 * סירו, כי זה מה שהתסריט כותב: *"בסוף צריך למצוא את האוטובוס."* המטרה של E05 היא
 * *"לבחור מה עושים עם אכזבה אחרי מסע גדול"*, וזה נושא שלם שהמשחק עוד לא נגע בו.
 *
 * **חמש הסצנות, והחדר של כל אחת:**
 *
 * · **E01 · "הם באמת באים לפה"** (2001) — `home`. התסריט כותב *"סביב בלומפילד / סלון"*,
 *   והסלון הוא הצד שאפשר לשחק היום: `bloomfield-outside` מצויר ב-1986 וכל שבר בו נמדד
 *   על הציור ההוא. ציור של 2000 שיוחלף בלי מדידה מחדש מזיז כל דלת בחדר (כלל 52), ולכן
 *   ההגעה למגרש היא **כרטיס וזמן** ולא חדר — עד שיגיע `bloomOldGates` עם מדידה.
 * · **E02 · "שלושה אורחים וספה אחת"** (2002) — `allenby`. הפינה **כבר מחליפה ציור לפי
 *   עשור** (`allenby2000`), ולכן היא החדר היחיד בפרק שנראה כמו 2002 ולא כמו 1986.
 * · **E03 · "דרכון בפעם הראשונה"** (2002) — `kitchen`, שולחן המטבח, ככתוב.
 * · **E04 · "משחק בית, אי אחר"** (2002) — `home`. לתסריט עצמו יש כאן חלופה מפורשת:
 *   *"ענף venue זמין רק עם נסיעה מוסדרת; אחרת הסצנה בסלון."* מי שהזמין רואה את ניקוסיה
 *   ככרטיס; מי שלא — יושב בסלון. זו אינה פשרה על רקע חסר, זו ההוראה.
 * · **E05 · "בסוף צריך למצוא את האוטובוס"** (2002) — `home`.
 *
 * **והמספרים באים מהארכיון, לא מכאן.** אף שורת דיאלוג בקובץ הזה אינה נוקבת בתוצאה,
 * ביריבה או בכובש. `2002-milan` הוא שורה בביטחון 2 עם מקור (ESPN, 20,000 צופים,
 * 7,000 שנסעו), והכרטיס ההיסטורי קורא אותה ברגע שהוא צריך מספר. הארכיון מחזיק את כל
 * המסע — צ׳לסי 2:0 בבלומפילד, מילאן 1:0 בניקוסיה — ולכן הפרק הזה נבנה בלי להמציא דבר.
 */

export const PORTRAIT_EUROPE: Record<string, string> = {
  ...PORTRAIT_BRIDGE,
  'רומא': 'faceSupporter',
  'מתוקי': 'faceSupporterB',
}

/**
 * מחיר הנסיעה — **1,800 ₪**, המספר של התסריט, ובכוונה **לא** נגזר מטבלה.
 *
 * זה ההפך מהמשמרת של B02 (ראה `chapter2000bridge.ts`), וההבדל אינו שרירותי: **שכר**
 * הוא נגזרת של `WAGE` כי הוא מוכפל בכל ג׳וב במשחק ומספר מוקלד נפרד ממנו (כלל 78);
 * **מחיר** הוא עובדה על העולם, וטיסה לאירופה ב-2002 באמת עלתה בסדר הגודל הזה.
 *
 * `npm run life:budget` הוא מי שבודק שזה בר-השגה בכלל — סף מעל התקרה הוא תוכן מת
 * (כלל 66), ואם הוא יצעק, המספר הזה הוא מה שישתנה.
 */
const TRIP_AGOROT = 180_000

export function objectiveEurope(state: LifeState, sceneId: string): string | null {
  if (state.chapterDone) return null
  if (!state.flags['e:chelsea']) return 'צ׳לסי מגיעים. איפה אתה בערב הזה.'
  if (!state.flags['e:beds']) return sceneId === 'allenby' ? null : 'רומא מחפש איפה להשכיב שלושה.'
  if (!state.flags['e:trip']) return sceneId === 'kitchen' ? null : 'רבע גמר. שולחן המטבח.'
  if (!state.flags['e:milan']) return 'משחק הבית. הבית קצת התרחק.'
  if (!state.flags['e:after']) return 'זה נגמר. מה עושים עכשיו.'
  return null
}

/**
 * שלושה סיומים, והם על **האכזבה**, לא על המסע.
 *
 * מאור כתב פרק שנגמר בהדחה, ולכן אף סיום כאן אינו "ניצחת בכל זאת". השלושה הם שלוש
 * דרכים אמיתיות לצאת מערב כזה: עם אנשים, לבד, או עם דף. אין ביניהם טוב יותר (§26).
 */
export const ENDINGS_EUROPE: Record<string, EndingCard> = {
  together: {
    id: 'together',
    titleHe: 'ספרת גם את עצמך?',
    bodyHe:
      'נגמר. ובכל זאת עמדת ליד היציאה וספרת ראשים עד שכולם היו שם, כי מישהו צריך לספור. באוטובוס חזרה אף אחד לא דיבר על המשחק, ודיברו על הכול חוץ ממנו — וזה בדיוק אותו דבר.',
    memoryHe: 'הרשימה עם הראשים, על צד של כרטיס.',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
  missing: {
    id: 'missing',
    titleHe: 'בטיסה של הבוקר',
    bodyHe:
      'נגמר, וגם הספירה לא נגמרה עד הסוף. חלק עלו איתך לאוטובוס, וחלק הגיעו בטיסה של הבוקר, בלי כסף ועם סיפור. אף אחד לא נשאר שם — אבל לא בזכות הרשימה שלך, וידעת את זה.',
    memoryHe: 'הרשימה עם הראשים, ושני שמות בלי וי.',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
  alone: {
    id: 'alone',
    titleHe: 'עשר דקות',
    bodyHe:
      'ביקשת עשר דקות ליד היציאה שסיכמתם, ועמית לא אמר מילה על סטטיסטיקה. עמדת שם והסתכלת על אנשים יוצאים, והבנת שאתה לא עצוב על התוצאה — אתה עצוב שזה נגמר.',
    memoryHe: 'שקט, מהסוג שבוחרים בו.',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
  written: {
    id: 'written',
    titleHe: 'גם ההפסד נכנס',
    bodyHe:
      'ישבת וכתבת את המסע כולו, מהערב שבו צ׳לסי הגיעו ועד היציאה מהאצטדיון, בלי לדלג על החלק שכואב. סוקו שאל אם גם ההפסד נכנס, ואמרת שהוא כבר בפנים. זה הדף הראשון שכתבת כדי שמישהו אחר יקרא אותו.',
    memoryHe: 'דף עם כל המסע, ובסוף שורה שלא מחקת.',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
}

export const BEATS_EUROPE: Beat[] = [
  /**
   * הביט שהיה כאן נמחק ב-21.9.2026, וכדאי לדעת למה.
   *
   * הוא שילם 700 ₪ נוספים למי שלקח את המשמרת אצל רפי, כדי שהכרטיס לאירופה יהיה בר-השגה.
   * זה עבד ולא היה נכון: `lib/life/income.ts` עושה את זה עכשיו **כקצב ולא כמתנה** —
   * מי שעבודה היא חלק מהחיים שלו שומר יותר בכל חודש שעובר, בכל פרק, ולא בונוס חד-פעמי
   * בחדר אחד. אותה השלכה, מנגנון שאפשר להאמין לו.
   */
  {
    id: 'e-chelsea',
    at: 'home',
    trigger: 'enter',
    when: { none: [{ flag: 'e:chelsea' }] },
    delayMs: 700,
    do: [{ a: 'talk', conversation: 'e-chelsea' }],
  },
  {
    id: 'e-beds',
    at: 'allenby',
    trigger: 'enter',
    when: { all: [{ flag: 'e:chelsea' }], none: [{ flag: 'e:beds' }] },
    delayMs: 600,
    do: [{ a: 'talk', conversation: 'e-beds' }],
  },
  {
    id: 'e-trip',
    at: 'kitchen',
    trigger: 'enter',
    when: { all: [{ flag: 'e:beds' }], none: [{ flag: 'e:trip' }] },
    delayMs: 600,
    do: [{ a: 'talk', conversation: 'e-trip' }],
  },
  /**
   * משחק הבית — `clock` ולא `enter`, כי הסצנה הקודמת מסתיימת באותו חדר.
   *
   * זה השיעור של `b-close` בפרק הקודם: ביט שתלוי בדלת לא יורה כשאין דלת לעבור בה,
   * וחצי מהשחקנים היו נתקעים בסלון עם משימה שאין לה פותח (כלל 67).
   */
  {
    id: 'e-milan',
    trigger: 'clock',
    when: { all: [{ flag: 'e:trip' }], none: [{ flag: 'e:milan' }] },
    delayMs: 1200,
    // (27.9.2026) הכרטיס נושא את הגרפיקה שמאור אישר למגרש חוץ באירופה — תמונה, לא חדר.
    // ניקוסיה אינה מצוירת, והחדר שפוגי עומד בו הוא לא היא: כרטיס אומר לאן קפצנו, ותג
    // המקום בתיבה (`Conversation.where`) מחזיק את זה לאורך השיחה
    do: [{ a: 'card', titleHe: 'ניקוסיה', subHe: 'משחק בית, אי אחר', ms: 2400, art: 'plate-2002-nicosia' }, { a: 'talk', conversation: 'e-milan' }],
  },
  /**
   * E05 — *"בסוף צריך למצוא את האוטובוס"*. אחרי המשחק במילאן, בטרמינל שהאוטובוס עומד
   * מחוץ לדלתות שלו (`portEurope`, 21.9.2026). שני ביטים, כי `travel` מסיים את הביט שלו.
   */
  {
    id: 'e-fly',
    trigger: 'clock',
    when: { all: [{ flag: 'e:milan' }], none: [{ flag: 'e:flown' }] },
    delayMs: 1400,
    do: [{ a: 'flag', flag: 'e:flown' }, { a: 'card', titleHe: 'מילאן', subHe: 'אחרי המשחק השני', ms: 2400 }, { a: 'travel', to: 'port-europe', spawn: 'start' }],
  },
  {
    id: 'e-after',
    at: 'port-europe',
    // (דלתא 90) שעון, לא דלת: מי שסגר את התיבה בטעות בטרמינל שומע אותה שוב כל עוד הוא
    // עומד שם — הדלתות מכאן מובילות הביתה, ומשם אין דרך חזרה לסוף של הפרק
    trigger: 'clock',
    when: { all: [{ flag: 'e:flown' }], none: [{ flag: 'e:after' }, { flag: 'e:counted' }] },
    delayMs: 700,
    do: [{ a: 'talk', conversation: 'e-after' }],
  },
  /**
   * (דלתא 90) הספירה עצמה — מי שבחר לספור ראשים עומד ליד הדלתות וסופר (`heads-02`),
   * ורק מה שנספר באמת הוא מה שהסוף אומר. נקודת המפגש מניקוסיה (`e:meetpoint`) היא מה
   * שנותן לו זמן: בלעדיה הם יוצאים מכל הדלתות (`heads-02-lost`).
   */
  {
    id: 'e-heads',
    at: 'port-europe',
    trigger: 'clock',
    when: { all: [{ flag: 'e:counted' }], none: [{ flag: 'e:after' }] },
    delayMs: 600,
    do: [{ a: 'talk', conversation: 'e-heads' }],
  },
]

export const CONVERSATIONS_EUROPE: Conversation[] = [
  {
    id: 'e-chelsea',
    nameHe: 'אופיר',
    branches: [
      {
        lines: [
          { who: 'אופיר', text: 'אתה קולט? צ׳לסי.' },
          { who: 'עמית', text: 'אני קולט. אמרת את זה שבע פעמים.' },
          { who: 'פוגי', text: 'תחכה שיראה את החולצות.' },
          { who: 'אופיר', text: 'הבאתי עט.' },
          { who: 'עמית', text: 'לשדרן?' },
        ],
        choices: [
          {
            id: 'ground',
            text: '"אנחנו הולכים. שנינו."',
            then: [
              { e: 'flag', flag: 'e:chelsea' },
              { e: 'flagValue', flag: 'e:europe2001', value: 'there' },
              { e: 'time', minutes: 120 },
              { e: 'energy', delta: -15 },
              { e: 'rel', who: 'ofir', axis: 'bond', delta: 3 },
              { e: 'attend' },
              { e: 'toast', text: 'אופיר: "אם אנחנו עוברים, אני לא עובד מחר."', tone: 'plain' },
            ],
          },
          {
            id: 'tv',
            text: '"אני נשאר. אבא קבע מקום."',
            then: [
              { e: 'flag', flag: 'e:chelsea' },
              { e: 'flagValue', flag: 'e:europe2001', value: 'tv' },
              { e: 'time', minutes: 90 },
              { e: 'energy', delta: -5 },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 3 },
              { e: 'presence', mode: 'television' },
              { e: 'toast', text: 'קובי: "תזיז את הראש, אתה לא בן חמש."', tone: 'plain' },
            ],
          },
          {
            id: 'skip',
            text: '"יש לי ערב אחר."',
            then: [
              { e: 'flag', flag: 'e:chelsea' },
              { e: 'flagValue', flag: 'e:europe2001', value: 'missed' },
              { e: 'presence', mode: 'late' },
              { e: 'toast', text: 'עמית: "אני אכתוב לך מה נגמר. בלי אמרתי־לך."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'e-beds',
    nameHe: 'רומא',
    branches: [
      {
        lines: [
          { who: 'רומא', text: 'סגרנו שיש איפה לישון.' },
          { who: 'מתוקי', text: 'כתוב פה "יהיה בסדר".' },
          { who: 'פוגי', text: 'זה לא כתובת?' },
          { who: 'מתוקי', text: 'לא בדקתי במפה.' },
          { who: 'רומא', text: 'בסדר, את זה אני לוקח עליי. מי יכול לעזור?' },
        ],
        choices: [
          {
            id: 'one',
            text: '"אחד. אצלי. לא שלושה."',
            then: [
              { e: 'flag', flag: 'e:beds' },
              { e: 'time', minutes: 60 },
              { e: 'energy', delta: -5 },
              // `mediation` בתסריט → `communication` במנוע (`SKILL_OF` ב-screenplay/mapping.ts)
              { e: 'skill', skill: 'communication', delta: 3, why: 'לתווך על מיטה אחת' },
              { e: 'rel', who: 'roma', axis: 'trust', delta: 3 },
              { e: 'toast', text: 'רומא: "אחד, לא שלושה. הבנתי."', tone: 'plain' },
            ],
          },
          {
            id: 'split',
            text: '"אני מחלק אותם בין שלושה בתים."',
            then: [
              { e: 'flag', flag: 'e:beds' },
              { e: 'time', minutes: 45 },
              { e: 'energy', delta: -5 },
              { e: 'skill', skill: 'organization', delta: 3, why: 'שלוש מיטות בשלושה בתים' },
              { e: 'rel', who: 'metuki', axis: 'bond', delta: 3 },
              /**
               * ראיה — `group_delivered` ולא שם חדש.
               *
               * התסריט קורא לזה בשם משלו, והמנוע כבר מחזיק ראיה שמשמעותה *"קבוצה
               * הגיעה למקום שסידרת לה"*. להמציא `kind` שלישי כאן היה מפצל את אותו
               * מושג לשתי מחרוזות, וזה בדיוק הפגם של כלל 59.
               */
              { e: 'proof', kind: 'group_delivered', proofId: 'group_delivered:{chapter}:beds', subjectHe: 'שלוש מיטות למי שבא מרחוק', audience: 'gate5', delta: 3 },
              { e: 'toast', text: 'מתוקי: "הוא אמר כן?" — "כן אחד שלם." — רומא: "נדיר. תשמור אותו."', tone: 'plain' },
            ],
          },
          {
            id: 'decline',
            text: '"אני לא יכול הפעם."',
            then: [
              { e: 'flag', flag: 'e:beds' },
              { e: 'flagValue', flag: 'e:hosting', value: 'declined' },
              { e: 'toast', text: 'רומא: "טוב שאמרת לפני שהגיעו למפתן."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'e-trip',
    nameHe: 'רחל',
    branches: [
      {
        lines: [
          { who: 'פוגי', text: 'אנחנו ברבע גמר.' },
          { who: 'רחל', text: 'שמעתי.' },
          { who: 'פוגי', text: 'בחוץ לארץ.' },
          { who: 'רחל', text: 'גם את זה שמעתי. שמעתי גם שאתה חייב לרפי משמרת.' },
          { who: 'קובי', text: 'תן לילד לדבר.' },
          { who: 'רחל', text: 'הוא בן עשרים וארבע. שידבר עם רפי.' },
        ],
        choices: [
          {
            id: 'book',
            text: '"אני נוסע. סגרתי."',
            // הכסף נבדק לפני שהוא נגבה — בחירה שמורידה ארנק לשלילי היא באג, לא דרמה
            when: { minAgorot: TRIP_AGOROT },
            noteHe: 'אין לך את הכסף לנסיעה.',
            then: [
              { e: 'flag', flag: 'e:trip' },
              { e: 'flagValue', flag: 'e:travel', value: 'booked' },
              { e: 'time', minutes: 60 },
              { e: 'energy', delta: -5 },
              { e: 'money', agorot: -TRIP_AGOROT, why: 'כרטיס לאירופה' },
              { e: 'proof', kind: 'travel_proof', proofId: 'travel_proof:{chapter}:booked', subjectHe: 'הנסיעה הראשונה שסגרת לבד', audience: 'gate7', delta: 4 },
              { e: 'toast', text: 'רחל: "עכשיו זו תוכנית. גם לחלום צריך לדעת מתי חוזרים."', tone: 'plain' },
            ],
          },
          {
            id: 'home',
            text: '"אני רואה פה. עם אבא."',
            then: [
              { e: 'flag', flag: 'e:trip' },
              { e: 'flagValue', flag: 'e:travel', value: 'home' },
              { e: 'time', minutes: 30 },
              { e: 'energy', delta: -5 },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 3 },
              { e: 'toast', text: 'קובי: "אני מביא גרעינים." — "לא את השקית שפתוחה מפסח."', tone: 'plain' },
            ],
          },
          {
            id: 'keep',
            text: '"אני שומר את הכסף למשהו אחר."',
            then: [
              { e: 'flag', flag: 'e:trip' },
              { e: 'flagValue', flag: 'e:travel', value: 'business' },
              { e: 'personality', key: 'responsibility', delta: 3 },
              /**
               * `business.capital_preserved` בתסריט → `business_proof` במנוע.
               *
               * זו ההכרעה הלא-מובנת-מאליה מבין השלוש בפרק: **לא לקנות** הוא ראיה עסקית,
               * והקהל שרואה אותה הוא `work` ולא היציע. מי שחולק — משנה שורה, וזו בדיוק
               * הסיבה שהיא כתובה ולא נגזרת ממחרוזת.
               */
              { e: 'proof', kind: 'business_proof', proofId: 'business_proof:{chapter}:kept', subjectHe: 'הכסף שלא הלך על הכרטיס', audience: 'work', delta: 3 },
              { e: 'toast', text: 'עמית: "אז לפחות אל תעמיד פנים שלא רצית לנסוע."', tone: 'red' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'e-milan',
    nameHe: 'עמית',
    where: 'ניקוסיה',
    branches: [
      /**
       * **שני המקומות, ובכל אחד שתי הבחירות של E04.** התסריט: *"ענף venue זמין רק עם
       * נסיעה מוסדרת; אחרת הסצנה בסלון"* — המקום נגזר מההזמנה, והבחירה (*"לקבוע נקודת
       * מפגש"* / *"לשמור רגע אחד בשביל קובי"*, שתיהן `נוכחות inherit`) היא מה שעושים בו.
       * עד 21.9.2026 המקום **היה** הבחירה: ניקוסיה נתנה ארגון והסלון נתן את קובי, כלומר
       * מי שטס לא יכול היה להתקשר לאבא שלו.
       */
      {
        when: { flagIs: { flag: 'e:travel', value: 'booked' } },
        lines: [
          { who: null, text: 'ניקוסיה. אצטדיון שאתה לא מכיר, שלט שאתה לא יודע לקרוא, ומאחורי השער — כולם.' },
          { who: 'עמית', text: 'משחק בית.' },
          { who: 'פוגי', text: 'הבית קצת התרחק.' },
        ],
        choices: [
          {
            id: 'meet',
            text: '(לקבוע נקודת מפגש — ולראות עם החברים.)',
            then: [
              { e: 'flag', flag: 'e:milan' },
              { e: 'flagValue', flag: 'e:milanWhere', value: 'venue' },
              { e: 'time', minutes: 90 },
              { e: 'energy', delta: -8 },
              { e: 'flag', flag: 'e:meetpoint' },
              { e: 'presence', mode: 'inside' },
              { e: 'attend' },
              { e: 'toast', text: 'אופיר: "עכשיו אפשר לצרוח?" — "עכשיו תזכור לאן לחזור."', tone: 'plain' },
            ],
          },
          {
            id: 'kobi',
            text: '(לשמור רגע אחד בשביל קובי.)',
            then: [
              { e: 'flag', flag: 'e:milan' },
              { e: 'flagValue', flag: 'e:milanWhere', value: 'venue' },
              { e: 'flagValue', flag: 'e:call', value: 'kobi' },
              { e: 'time', minutes: 90 },
              { e: 'energy', delta: -8 },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 3 },
              { e: 'presence', mode: 'inside' },
              { e: 'attend' },
              { e: 'toast', text: 'קובי: "אני שומע אותך פחות מהקהל." — "גם אני." — "אז תישאר שם רגע."', tone: 'plain' },
            ],
          },
        ],
      },
      /** ומי שלא — הסלון, וזו גם הוראה של התסריט וגם החלופה שלו */
      {
        lines: [
          { who: 'עמית', text: 'משחק בית.' },
          { who: 'פוגי', text: 'הבית קצת התרחק.' },
          { who: 'רומא', text: 'גם מרחוק אפשר לראות יחד.' },
          { who: 'אופיר', text: 'בתנאי שעמית לא מקדים את השידור עם הטלפון.' },
        ],
        choices: [
          {
            id: 'meet',
            text: '(לקבוע נקודת מפגש — ולראות עם החברים.)',
            then: [
              { e: 'flag', flag: 'e:milan' },
              { e: 'flagValue', flag: 'e:milanWhere', value: 'home' },
              { e: 'time', minutes: 90 },
              { e: 'energy', delta: -5 },
              { e: 'flag', flag: 'e:meetpoint' },
              { e: 'presence', mode: 'television' },
              { e: 'toast', text: 'אופיר: "עכשיו אפשר לצרוח?" — "עכשיו תזכור לאן לחזור."', tone: 'plain' },
            ],
          },
          {
            id: 'kobi',
            text: '(לשמור רגע אחד בשביל קובי.)',
            then: [
              { e: 'flag', flag: 'e:milan' },
              { e: 'flagValue', flag: 'e:milanWhere', value: 'home' },
              { e: 'flagValue', flag: 'e:call', value: 'kobi' },
              { e: 'time', minutes: 90 },
              { e: 'energy', delta: -5 },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 3 },
              { e: 'presence', mode: 'television' },
              { e: 'toast', text: 'קובי: "אני שומע אותך פחות מהקהל." — "גם אני." — "אז תישאר שם רגע."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    /** אחרי הספירה — מה שנספר באמת. "ספרת גם את עצמך?" נשאל רק למי שספר עד הסוף */
    id: 'e-heads',
    nameHe: 'רומא',
    branches: [
      {
        when: { flag: 'e:heads-all' },
        lines: [
          { who: null, text: 'שישה ראשים, ואתה השביעי. הדלתות של האוטובוס נסגרו על כולם.' },
          { who: 'רומא', text: 'ספרת גם את עצמך?' },
        ],
        then: [
          { e: 'flag', flag: 'e:after' },
          { e: 'proof', kind: 'travel_proof', proofId: 'travel_proof:{chapter}:together', subjectHe: 'כולם חזרו יחד', audience: 'gate7', delta: 4 },
          { e: 'ending', id: 'together' },
        ],
      },
      {
        lines: [
          { who: null, text: 'חסרים. מישהו ראה אותם ליד הדיוטי, מישהו אחר אומר שהם כבר באוטובוס השני.' },
          { who: 'רומא', text: 'הם יגיעו. תמיד מגיעים — בטיסה של הבוקר, בלי כסף ועם סיפור.' },
        ],
        then: [{ e: 'flag', flag: 'e:after' }, { e: 'ending', id: 'missing' }],
      },
    ],
  },
  {
    id: 'e-after',
    nameHe: 'רומא',
    branches: [
      {
        lines: [
          { who: 'אופיר', text: 'כל הדרך הזאת בשביל להפסיד.' },
          { who: 'רומא', text: 'כל הדרך הזאת הייתה לפני שהפסדנו.' },
          { who: 'פוגי', text: 'עמית איפה?' },
          { who: 'עמית', text: 'פה. אתם פשוט מסתכלים רק על הרצפה.' },
        ],
        choices: [
          /**
           * (דלתא 90) לספור ראשים הוא עבודה בידיים ליד הדלתות, לא משפט — שני העותקים הם
           * אותה בחירה עם מחיר אחר: מי שקבע נקודת מפגש בניקוסיה מקבל ארבעים שניות, ומי
           * שלא — עשרים ושש. התוצאה (והראיה) נאמרת אחרי הספירה, ב-`e-heads`.
           */
          {
            id: 'count',
            text: '(לספור ראשים עד שכולם פה.)',
            when: { flag: 'e:meetpoint' },
            hidden: true,
            then: [{ e: 'minigame', id: 'chore:story:heads-02' }],
          },
          {
            id: 'count-lost',
            text: '(לספור ראשים עד שכולם פה.)',
            when: { notFlag: 'e:meetpoint' },
            hidden: true,
            then: [{ e: 'minigame', id: 'chore:story:heads-02-lost' }],
          },
          {
            id: 'alone',
            text: '"תנו לי עשר דקות."',
            then: [
              { e: 'flag', flag: 'e:after' },
              { e: 'time', minutes: 10 },
              { e: 'wellbeing', key: 'regret', delta: 5 },
              { e: 'toast', text: 'עמית: "עשר דקות, ליד היציאה שסיכמנו." — "תודה שלא אמרת כלום על סטטיסטיקה."', tone: 'plain' },
              { e: 'ending', id: 'alone' },
            ],
          },
          {
            id: 'write',
            text: '(לרשום את המסע, כולל את הסוף.)',
            then: [
              { e: 'flag', flag: 'e:after' },
              { e: 'flag', flag: 'own:diary:europe2002' },
              { e: 'skill', skill: 'knowledge', delta: 3, why: 'לכתוב מסע' },
              { e: 'proof', kind: 'written_account', proofId: 'written_account:{chapter}:diary', subjectHe: 'המסע לאירופה, מההתחלה עד היציאה', audience: 'public', delta: 3 },
              { e: 'ending', id: 'written' },
            ],
          },
        ],
      },
    ],
  },
]
