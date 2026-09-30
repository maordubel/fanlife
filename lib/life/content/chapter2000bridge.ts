import { shiftAgorot } from '../income'
import { workDoneFlag } from '../gigs'
import type { LifeState } from '../types'

import type { Beat } from './beats'
import type { EndingCard } from './chapter1986'
import type { Conversation } from './script'
import { PORTRAIT_2000 } from './chapter2000double'

/**
 * B00–B02 · "מה שאחרי" · 2000 — הפרק הראשון של תסריט ההמשך, והגשר שלא היה קיים.
 *
 * `2000-double` נגמר עם `next: null`. זה היה נכון כל עוד 2000 היה סוף מה שנבנה, והפך
 * לתקלה ברגע שמאור מסר תסריט שמתחיל **בדיוק** שם: חיים שנגמרים בגמר גביע הם חיים
 * שנגמרים, ושחקן שסיים את הדאבל נשאר עם כרטיס סיום ובלי מחר.
 *
 * שלוש הסצנות הן של התסריט, לא שלי, וכל אחת מהן נקראה ממנו:
 *
 * · **B00 · "לאן חוזרים אחרי הדאבל"** — *"לבחור עם מי לסיים את הלילה שכבר שוחק."*
 *   שלוש בחירות: קובי, רחל, או לישון. שום אחת מהן אינה הנכונה, והשלישית עולה
 *   **אנרגיה שלילית**, כלומר היא נותנת ולא לוקחת — זו היחידה בפרק שכך.
 * · **B01 · "שני מקומות על השולחן"** — הקופסה האדומה נפתחת, ופוגי בוחר **נושא**
 *   לתקופה: אנשים / עבודה / נסיעות. התסריט מדגיש: *"הבחירה אינה נועלת מסלול."*
 *   לכן היא `flagValue` ולא דגל מסלול, והיא לא נוגעת ב-`route:` בכלל.
 * · **B02 · "יש לך מחר עבודה"** — *"לבחור התחייבות ראשונה שאינה תלויה בתוצאה."*
 *
 * **והמספר היחיד בפרק שסירבתי להעתיק מהתסריט.** B02 כותב `הכנסה באגורות: 18000`
 * על משמרת של שישים דקות — 180 ₪ לשעה. `WAGE['00s']` הוא **18 ₪ לשעה**, ו-`gigPay`
 * גוזר ממנו כל שכר במשחק בדיוק כדי שלא יוקלד פעמיים (כלל 78: *"המספר לא ידע באיזה
 * עשור הוא"*). פי עשרה מכל שכר אחר בפרק הזה היה הופך את החולצה, הכרטיס והמנוי
 * למחיר של חצי משמרת. השכר כאן נגזר מהטבלה; ההפרש מדווח למאור ולא נבלע.
 *
 * **ורקעים.** שלושת החדרים קיימים — `home`, `bedroom`, `kiosk` — והציורים שלהם הם
 * של 1986. מאור אמר במפורש להשתמש בתחליפים עד שהרקעים של 2000 יגיעו, ולכן שום
 * `eraArt` חדש לא נכתב כאן: היום שבו `homeAdult` ו-`bedroom00` ינחתו הוא שורה אחת
 * ב-`scenes.ts`, ולא שינוי בפרק הזה (`life:places` כבר מדפיס את שתיהן בשמן).
 */

/** רפי מדבר בפרק הזה, וב-`characters.ts` הוא `shopkeeper` עם הכינוי `רפי` (21.9.2026) */
export const PORTRAIT_BRIDGE: Record<string, string> = {
  ...PORTRAIT_2000,
  'רפי': 'faceOldMan',
}

/**
 * משמרת בקיוסק — **עשר שעות**, ומכאן 180 ₪, שזה בדיוק מה שהתסריט כתב.
 *
 * הגרסה הראשונה כאן תמחרה שעה אחת (18 ₪) מפני ששישים דקות **בשעון המשחק** נראו כמו
 * שעה. הן יום עבודה: רפי פותח בשש, והמשמרת נגמרת כשהוא סוגר. המספר נגזר מ-`WAGE`
 * דרך `shiftAgorot`, ולכן הוא יודע באיזה עשור הוא נמצא (כלל 78).
 */
const SHIFT_AGOROT = shiftAgorot(2000, 10)

export function objectiveBridge(state: LifeState, sceneId: string): string | null {
  if (state.chapterDone) return null
  if (!state.flags['b:night']) return 'הלילה נגמר. עם מי אתה מסיים אותו.'
  if (!state.flags['b:box']) return sceneId === 'bedroom' ? null : 'החדר שלך. הקופסה על המדף.'
  if (!state.flags['b:commit']) return sceneId === 'kiosk' ? null : 'רפי פותח בשש. יש מחר.'
  return null
}

/**
 * שלושה סיומים, ואף אחד מהם אינו "טוב יותר".
 *
 * הם נקראים מ**מה שנבחר**, לא ממה שהושג: מי ליווה את הלילה (B00) ואיזה נושא נבחר
 * לתקופה (B01). זו אותה הכרעה של `buildFinale` — *"שלושה אחר צהריים שונים, שלושה
 * סיומים שונים, בלי טוב ביותר"* (כלל 49, §26 של הבריף).
 */
export const ENDINGS_BRIDGE: Record<string, EndingCard> = {
  people: {
    id: 'people',
    titleHe: 'אנשים',
    bodyHe:
      'הדאבל נגמר, והבוקר היה יום ראשון רגיל. מה שנשאר מהלילה הזה לא היה הגביע — זה היה מי ישב איתך במטבח אחרי, ומי ידע לשאול את השאלה הנכונה. שמת את הקופסה בחזרה על המדף בלי לסגור אותה עד הסוף.',
    memoryHe: 'הקופסה, פתוחה למחצה.',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
  work: {
    id: 'work',
    titleHe: 'יש מחר',
    bodyHe:
      'הדאבל נגמר, וב-5:40 בבוקר צלצל שעון. רפי פותח בשש, והארגזים לא יודעים שהיינו אלופים. יצאת מהבית עם הצעיף עוד בתיק, כי בשש בבוקר אין למי להראות אותו — וזו בדיוק הנקודה.',
    memoryHe: 'המשמרת הראשונה של העשור.',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
  roads: {
    id: 'roads',
    titleHe: 'דרכים',
    bodyHe:
      'הדאבל נגמר, ואתה כבר חישבת כמה עולה להגיע למקום שעוד לא ידעת את שמו. לא נסעת לשום מקום באותו שבוע. אבל בפעם הראשונה בחיים שלך, השאלה לא הייתה אם — היא הייתה מתי.',
    memoryHe: 'דף עם מספרים בצד.',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
}

export const BEATS_BRIDGE: Beat[] = [
  /** B00 — הסלון, בכניסה. רחל ראשונה, כי היא זו שפותחת את הסצנה בתסריט. */
  {
    id: 'b-home',
    at: 'home',
    trigger: 'enter',
    when: { none: [{ flag: 'b:night' }] },
    delayMs: 700,
    do: [{ a: 'talk', conversation: 'b-home' }],
  },
  /** B01 — החדר, אחרי שהלילה נסגר */
  {
    id: 'b-room',
    at: 'bedroom',
    trigger: 'enter',
    when: { all: [{ flag: 'b:night' }], none: [{ flag: 'b:box' }] },
    delayMs: 600,
    /**
     * *"פתח קופסה"* (B01) — **והיא נפתחת על המסך** (21.9.2026): הקופסה יורדת מהמדף,
     * המכסה נפתח, ומה שבה מונח שם; כשהיא נסגרת קובי כבר בדלת, שואל על מה שראית.
     */
    do: [{ a: 'talk', conversation: 'b-box-lid' }, { a: 'talk', conversation: 'b-box' }],
  },
  /** B02 — הקיוסק, אחרי הקופסה */
  {
    id: 'b-kiosk',
    at: 'kiosk',
    trigger: 'enter',
    when: { all: [{ flag: 'b:box' }], none: [{ flag: 'b:commit' }] },
    delayMs: 600,
    do: [{ a: 'talk', conversation: 'b-kiosk' }],
  },
  /**
   * ...והסיום נקרא מהבחירות, ברגע שההתחייבות נלקחה.
   *
   * `trigger: 'clock'` ולא `enter`, כי ההתחייבות יכולה להיסגר בקיוסק עצמו ואז אין
   * כניסה נוספת לשום מקום — סיום שתלוי בדלת הוא סיום שחצי מהשחקנים לא יראו
   * (כלל 67: סיום שמוגדר ב-`endings` חייב שמשהו יפלוט אותו).
   */
  {
    id: 'b-close',
    trigger: 'clock',
    // ...and after Amit's question too (`Q01`, `chapterCombos.ts`)
    when: { all: [{ flag: 'b:commit' }, { flag: 'q:role' }], none: [{ flag: 'b:done' }] },
    delayMs: 900,
    do: [
      { a: 'flag', flag: 'b:done' },
      { a: 'talk', conversation: 'b-close' },
    ],
  },
]

export const CONVERSATIONS_BRIDGE: Conversation[] = [
  {
    id: 'b-home',
    nameHe: 'רחל',
    branches: [
      {
        lines: [
          { who: 'רחל', text: 'אל תשאיר את הנעליים באמצע. גם אלופים נופלים.' },
          { who: 'פוגי', text: 'אבא כבר חזר?' },
          { who: 'רחל', text: 'הוא שאל בדיוק אותו דבר עליך.' },
          { who: 'פוגי', text: 'על הנעליים?' },
          { who: 'רחל', text: 'תיכנס כבר.' },
        ],
        choices: [
          {
            id: 'kobi',
            text: '"אני מחכה לאבא."',
            then: [
              { e: 'flag', flag: 'b:night' },
              { e: 'flagValue', flag: 'b:with', value: 'kobi' },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 3 },
              { e: 'time', minutes: 40 },
              { e: 'goto', node: 'b-kobi' },
            ],
          },
          {
            id: 'rachel',
            text: '"שבי רגע. אני מספר לך."',
            then: [
              { e: 'flag', flag: 'b:night' },
              { e: 'flagValue', flag: 'b:with', value: 'rachel' },
              { e: 'rel', who: 'rachel', axis: 'bond', delta: 3 },
              { e: 'time', minutes: 40 },
              { e: 'goto', node: 'b-rachel' },
            ],
          },
          {
            id: 'rest',
            text: '"אני הולך לישון."',
            then: [
              { e: 'flag', flag: 'b:night' },
              { e: 'flagValue', flag: 'b:with', value: 'rest' },
              // היחידה בפרק שמחזירה כוח במקום לקחת — התסריט כותב `אנרגיה: 15`
              { e: 'energy', delta: 15 },
              { e: 'toast', text: 'רחל: "בסדר. מחר עדיין יהיה דאבל."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'b-kobi',
    nameHe: 'קובי',
    branches: [
      {
        lines: [
          { who: 'קובי', text: 'נו, הצלחת להגיע הביתה לבד.' },
          { who: 'פוגי', text: 'מהשער אני יודע. את השאר אני מאלתר.' },
        ],
        then: [{ e: 'remember', who: 'kobi', eventId: 'bridge-night', significance: 'major' }],
      },
    ],
  },
  {
    id: 'b-rachel',
    nameHe: 'רחל',
    branches: [
      {
        lines: [
          { who: 'רחל', text: 'עכשיו בלי שדרן. אתה, איפה היית?' },
          { who: 'פוגי', text: 'זה סיפור קצת יותר ארוך.' },
        ],
        then: [{ e: 'remember', who: 'rachel', eventId: 'bridge-night', significance: 'major' }],
      },
    ],
  },
  {
    id: 'b-box-lid',
    nameHe: null,
    branches: [
      {
        lines: [{ who: null, text: 'הקופסה האדומה על המדף. הורדת אותה, והמכסה חרק כמו שהוא חורק מאז שהיית בן שמונה.' }],
        then: [{ e: 'flag', flag: 'open:redbox' }, { e: 'box' }],
      },
    ],
  },
  {
    id: 'b-box',
    nameHe: 'קובי',
    branches: [
      {
        lines: [
          { who: 'קובי', text: 'את זה שמרת?' },
          { who: 'פוגי', text: 'יש פה דברים יותר ישנים.' },
          { who: 'קובי', text: 'אני רואה. חלק אני קניתי.' },
          { who: 'פוגי', text: 'אז הקופסה חצי שלך?' },
          { who: 'קובי', text: 'לא. רק האבק.' },
        ],
        choices: [
          {
            id: 'family',
            text: '(להוציא את מה שקשור לאנשים.)',
            then: [
              { e: 'flag', flag: 'b:box' },
              { e: 'flagValue', flag: 'b:theme', value: 'people' },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 2 },
              { e: 'toast', text: 'קובי: "תיזהר מהקצה, הוא כבר קרוע."', tone: 'plain' },
            ],
          },
          {
            id: 'friends',
            text: '(להוציא את התמונה מהסמטה.)',
            then: [
              { e: 'flag', flag: 'b:box' },
              { e: 'flagValue', flag: 'b:theme', value: 'people' },
              { e: 'wellbeing', key: 'belonging', delta: 4 },
              { e: 'toast', text: 'פוגי: "רק שעכשיו הם משלמים על הנזק."', tone: 'plain' },
            ],
          },
          {
            id: 'private',
            text: '(לסגור אותה.)',
            then: [
              { e: 'flag', flag: 'b:box' },
              { e: 'flagValue', flag: 'b:theme', value: 'private' },
              { e: 'personality', key: 'independence', delta: 3 },
              { e: 'toast', text: 'קובי: "לא חייבים לפתוח הכול הלילה."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'b-kiosk',
    nameHe: 'רפי',
    branches: [
      {
        lines: [
          { who: 'רפי', text: 'גביע לא פורק ארגזים.' },
          { who: 'פוגי', text: 'ניסית?' },
          { who: 'רפי', text: 'עמית ניסה להסביר לי על מינוף.' },
          { who: 'עמית', text: 'אמרתי מנוף.' },
          { who: 'רפי', text: 'גם זה לא הגיע.' },
        ],
        choices: [
          /**
           * המשמרת — ומוגבלת ל**אחת לפרק** כמו כל עבודה בתשלום (מאור, 6.9.2026).
           * בלי `workDoneFlag` זה ברז שני באותו אחר־צהריים, וזה בדיוק הפגם ש-
           * `WORK_COMMITMENT` נשא בשקט עד 20.9.2026 (כלל 78).
           */
          {
            id: 'shift',
            text: '"תן לי משמרת."',
            when: { notFlag: workDoneFlag('2000-bridge') },
            // ...ואומרת למה, כשהיא נעולה. בחירה שנכבית בלי משפט היא באג בעיני השחקן.
            noteHe: 'כבר עבדת היום.',
            then: [
              { e: 'flag', flag: 'b:commit' },
              { e: 'flag', flag: workDoneFlag('2000-bridge') },
              { e: 'flagValue', flag: 'b:commitKind', value: 'work' },
              { e: 'time', minutes: 60 },
              { e: 'energy', delta: -10 },
              { e: 'money', agorot: SHIFT_AGOROT, why: 'משמרת אצל רפי' },
              { e: 'toast', text: 'רפי: "אתה מקבל על עבודה, לא על השירה."', tone: 'plain' },
            ],
          },
          {
            id: 'list',
            text: '"אני עוזר לעמית עם הרשימה."',
            then: [
              { e: 'flag', flag: 'b:commit' },
              { e: 'flagValue', flag: 'b:commitKind', value: 'roads' },
              // pass C: the list is written at the counter (`list-00`); the skill is what was written
              { e: 'minigame', id: 'chore:story:list-00' },
            ],
          },
          {
            id: 'evening',
            text: '"הערב אני פנוי. בואו."',
            then: [
              { e: 'flag', flag: 'b:commit' },
              { e: 'flagValue', flag: 'b:commitKind', value: 'people' },
              /**
               * חלון TOURNAMENT נפתח **מהחיים, לא מהזמנה** (מאור, 21.9.2026: *"לפי החיים
               * בלבד"*). מי שבחר ערב עם החבר׳ה על פני משמרת ורשימה, מוצא את עצמו בקיץ
               * בליגה של חמישה על חמישה — `2000-team` פשוט הפרק הבא. בלי טלפון ובלי כן/לא.
               */
              // `TEAM_FLAG` of `chapterTeam.ts`, spelled out: that file imports this one's
              // portraits through `chapter2002europe`, and an import back would be a cycle
              { e: 'flag', flag: 'life:team' },
              { e: 'time', minutes: 45 },
              { e: 'energy', delta: -5 },
              { e: 'rel', who: 'amit', axis: 'bond', delta: 3 },
              { e: 'wellbeing', key: 'loneliness', delta: -5 },
              { e: 'toast', text: 'רפי: "אז תשב מהצד של הלקוחות."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  /**
   * הסגירה — קוראת את שתי הבחירות ובוחרת סיום. אין כאן ציון ואין "הכי טוב":
   * `commitKind` הוא מה שהוא עשה, `b:theme` הוא מה שהוא הוציא מהקופסה, והסיום
   * הוא הצומת ביניהם.
   */
  {
    id: 'b-close',
    nameHe: null,
    branches: [
      {
        when: { flagIs: { flag: 'b:commitKind', value: 'work' } },
        lines: [{ who: null, text: 'יצאת מהקיוסק אחרי חשוך. השלט של רפי היה כבוי כבר, והרחוב היה שקט כמו שהוא תמיד שקט ביום ראשון.' }],
        then: [{ e: 'ending', id: 'work' }],
      },
      {
        when: { flagIs: { flag: 'b:commitKind', value: 'roads' } },
        lines: [{ who: null, text: 'הרשימה של עמית נגמרה בשמונה־עשר שמות ובשלושה מספרי טלפון שלא ענו. כתבת ליד כל אחד מי אישר.' }],
        then: [{ e: 'ending', id: 'roads' }],
      },
      {
        lines: [{ who: null, text: 'ישבתם מחוץ לקיוסק עד שרפי סגר, ואז עוד קצת, על המדרכה.' }],
        then: [{ e: 'ending', id: 'people' }],
      },
    ],
  },
]
