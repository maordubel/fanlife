import type { LifeState } from '../types'

import { missed } from '../missReason'
import type { Beat } from './beats'
import type { EndingCard } from './chapter1986'
import type { Conversation } from './script'
import { PORTRAIT_COLLAPSE } from './chapter2016collapse'

/**
 * חלונות חיים — ARMCHAIR (A01–A03) ו-DISTANCE (K01–K03).
 *
 * **חלון הוא פרק שקיים רק בחיים שהרוויחו אותו.** זה `when` של `ChapterDef` — אותו
 * מנגנון שפותח את `a3-hall` רק למי שעמד עם אפי ב-A2. שני החלונות כאן נפתחים מאותו
 * רגע: `P06` ב-`2017-after`, כשקובי שואל *"מה אתה רוצה לעשות עכשיו?"*.
 * · `life:armchair` — "אוהד מזדמן, ולפעמים לראות איתך" → `2019-armchair`.
 * · `life:distance` — "אני לוקח הפסקה" → `2017-distance`.
 * שתי הבחירות בלעדיות זו לזו, ולכן חיים עוברים לכל היותר באחד מהם. מי שבחר
 * "להמשיך להגיע" לא נכנס לאף אחד — וזה לא עונש, זה חיים אחרים.
 *
 * **ושתי סצנות שהתמזגו, ונקובות בשמן.**
 * · `A04` ("משחק אחד בשבילנו") היא גרסת הכורסה של ההזמנה לסיום. `Z07` נושא את
 *   אותו רגע בכל חיים, ולכן A04 אינה פרק כאן — היא **ענף של `z-up`** (`chapter2023late.ts`)
 *   שנפתח ב-`life:armchair`: אותה שיחה, במילים שנכתבו לחיי הכורסה. שכפול היה שם את
 *   השאלה פעמיים לאותו אדם; השמטה (כמו שהיה עד 21.9.2026) שמה לו את המילים של אחר.
 * · `K01` נשארה, אבל כ**המשך**: `P06.3` כבר אמר לקובי שאתה לוקח הפסקה. K01 היא
 *   אופיר ששומע את זה אחריו — *"אתה אומר שאתה לא בא שבת, או שאתה לא בא יותר?"* —
 *   וזה בדיוק המשפט שחבר אומר כשאבא כבר יודע.
 *
 * **החלונות אינם מענישים.** *"אף אפשרות אינה מחייבת עניין גבוה בכדורגל"* (A01),
 * ו*"סירוב נשמר ולא מציק שוב בפרק"* (K03). אין כאן בחירה שמחזירה את השחקן ליציע
 * בכוח, ואין בחירה שעולה לו אמון על כך שלא חזר.
 */

export const PORTRAIT_WINDOWS: Record<string, string> = {
  ...PORTRAIT_COLLAPSE,
  /** אילן השכן — `faceOldMan` הוא ה-`portraitSet` שלו במרשם, כלומר הפנים שלו עצמו */
  'אילן': 'faceOldMan',
  /**
   * בתיה — הפנים שלה, מהגוף שלה (27.9.2026): `faceBatya` נחתך מ-`batya`, שנחתך מהצילום
   * שמאור אישר. עד היום היא הייתה ב-`NO_PLATE_YET` בכוונה — עדיף בלי פנים מאשר עם פנים
   * של מישהי אחרת (כלל 67); עכשיו יש לה משלה.
   */
  'בתיה': 'faceBatya',
}

// ------------------------------------------------------------------ DISTANCE -----

export function objectiveDistance(state: LifeState, sceneId: string): string | null {
  if (state.chapterDone) return null
  if (!state.flags['k:told']) return sceneId === 'kiosk' ? null : 'אופיר בקיוסק. הוא שמע מאבא.'
  if (!state.flags['k:life']) return sceneId === 'promenade' ? null : 'קרן בטיילת, מול הים — דרך הקשת באלנבי.'
  if (!state.flags['k:back']) return sceneId === 'bus-station' ? null : 'בתחנה. אופיר חשב שלא תבוא.'
  return null
}

export const ENDINGS_DISTANCE: Record<string, EndingCard> = {
  returned: {
    id: 'returned',
    titleHe: 'את זה היית צריך להגיד לי בגיל שמונה',
    bodyHe:
      'חזרת כאוהד, ולמדת את המקום מחדש. אופיר אמר שלא צריך להספיק הכול היום, ואמרת שאת זה הוא היה צריך להגיד לך בגיל שמונה — ושניכם צחקתם, כי זה נכון.',
    memoryHe: 'כרטיס, אחרי שנים בלי.',
    memoryItem: 'ticket-stub',
    presence: 'inside',
  },
  visit: {
    id: 'visit',
    titleHe: 'ערב אחד',
    bodyHe:
      'באת לערב אחד בלי לסיים את הריחוק. אופיר לא עשה מזה טקס, ואמרת שטוב לך שהוא לא עושה — וזה היה כל הערב, והוא הספיק.',
    memoryHe: 'מקום ליד אופיר, לערב אחד.',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
  away: {
    id: 'away',
    titleHe: 'היית איפשהו',
    bodyHe:
      'לא חזרת, והסירוב נשמר ולא מציק שוב. קרן אמרה שכשאתה מספר על השנים האלה אתה אומר "לא הייתי", ושהיית איפשהו — אז התחלת משם.',
    memoryHe: 'דבר אחד שעשית בשנים האלה.',
    memoryItem: 'folded-paper',
    presence: 'late',
  },
}

export const BEATS_DISTANCE: Beat[] = [
  { id: 'k-told', at: 'kiosk', trigger: 'enter', when: { none: [{ flag: 'k:told' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'k-told' }] },
  /**
   * **K02 על הטיילת (27.9.2026).** *"היית איפשהו"* נאמר עד היום בסלון. בשנים שלא היה ביציע
   * הוא היה — בין השאר — פה: הטיילת היא המקום שתל אביבי הולך אליו כשאין משחק, והיא עכשיו
   * המקום שבו קרן שואלת. המילים לא זזו; מה שנוסף הוא שהוא הלך לשם ברגליים, והיא הולכת למים
   * אחרי שענה (`k-keren-walks`). `life:distance:sea` שורד את הפרק ו-`2021-suitcase` קורא אותו.
   */
  { id: 'k-life', at: 'promenade', trigger: 'enter', when: { all: [{ flag: 'k:told' }], none: [{ flag: 'k:life' }] }, delayMs: 900, do: [{ a: 'talk', conversation: 'k-life' }] },
  {
    id: 'k-keren-walks',
    at: 'promenade',
    trigger: 'clock',
    when: { all: [{ flag: 'k:life' }], none: [{ flag: 'k:keren-gone' }] },
    delayMs: 1200,
    do: [
      { a: 'actorCue', actorId: '2017-distance-keren', cue: 'leave', to: 'right', durationMs: 2600 },
      { a: 'flag', flag: 'k:keren-gone' },
    ],
  },
  /**
   * בתחנה ולא בבלומפילד (21.9.2026). ב-2017 בלומפילד היה אתר בנייה ומשחקי הבית שוחקו
   * בעיר אחרת, כך שמי שחוזר חוזר לאוטובוס — וזה גם מה ש-K03 אומרת: *"אין לך מקום שמור,
   * יש לך חברים"*. עד היום הסצנה עמדה מול שער 7 של 1986, סגור מאחורי גדר שלא צוירה.
   */
  { id: 'k-back', at: 'bus-station', trigger: 'enter', when: { all: [{ flag: 'k:life' }], none: [{ flag: 'k:back' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'k-back' }] },
]

// ------------------------------------------------------------------ ARMCHAIR -----

export function objectiveArmchair(state: LifeState, sceneId: string): string | null {
  if (state.chapterDone) return null
  if (!state.flags['a:remote']) return sceneId === 'home' ? null : 'אצל אבא. השלט אצלו, והספל עם הסדק שלך.'
  if (!state.flags['a:photo']) return sceneId === 'kitchen' ? null : 'עמית שלח תמונה. אתה לא בה.'
  if (!state.flags['a:saturday']) return sceneId === 'street' ? null : 'שבת. אילן ובתיה ברחוב, והסולם כבר בחוץ.'
  return null
}

export const ENDINGS_ARMCHAIR: Record<string, EndingCard> = {
  fixed: {
    id: 'fixed',
    titleHe: 'יחסית לקיר',
    bodyHe:
      'השבת שלך הייתה סולם, קיר ותיק ושני שכנים שמכירים אותך מגיל חמש. אילן שאל אם זה ישר ואמרת יחסית לקיר, ובתיה אמרה לכבד אותו — ולא החמצת כלום.',
    memoryHe: 'בורג אחד שנשאר מיותר.',
    memoryItem: 'folded-paper',
    presence: 'late',
  },
  cooked: {
    id: 'cooked',
    titleHe: 'היום אין לי מחצית',
    bodyHe:
      'בישלת עם בתיה. היא אמרה שאתה חותך כאילו אתה ממהר למחצית, ואמרת שהיום אין לך מחצית — והיא לימדה אותך בצל, כמו שצריך, לאט.',
    memoryHe: 'מתכון בכתב יד, בלי כמויות.',
    memoryItem: 'folded-paper',
    presence: 'late',
  },
  recorded: {
    id: 'recorded',
    titleHe: 'בשביל זה באתי',
    bodyHe:
      'עבדת עם יונתן על הקלטה. הוא שאל אם אתה מוכן לשמוע גם משהו שהוא עשה, ואמרת שבשביל זה באת — וזה היה נכון, גם אם בהתחלה לא ידעת.',
    memoryHe: 'קובץ שמע, ארבע דקות.',
    memoryItem: 'folded-paper',
    presence: 'late',
  },
}

export const BEATS_ARMCHAIR: Beat[] = [
  { id: 'a-remote', at: 'home', trigger: 'enter', when: { none: [{ flag: 'a:remote' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'a-remote' }] },
  /**
   * (pass D, §47 S2) the match from home is interrupted — Rachel, the laundry, the rain — and
   * what he does with the next ten minutes is the benefit-cost of the armchair
   */
  { id: 'a-interrupt', at: 'home', trigger: 'clock', when: { all: [{ flagIs: { flag: 'a:how', value: 'watch' } }], none: [{ flag: 'a:interrupt' }] }, delayMs: 2200, do: [{ a: 'talk', conversation: 'a-interrupt' }] },
  { id: 'a-photo', at: 'kitchen', trigger: 'enter', when: { all: [{ flag: 'a:remote' }], none: [{ flag: 'a:photo' }], any: [{ flag: 'a:interrupt' }, { none: [{ flagIs: { flag: 'a:how', value: 'watch' } }] }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'a-photo' }] },
  { id: 'a-saturday', at: 'street', trigger: 'enter', when: { all: [{ flag: 'a:photo' }], none: [{ flag: 'a:saturday' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'a-saturday' }] },
  // the shelf, as the level read it
  { id: 'a-fixed', at: 'street', trigger: 'enter', when: { all: [{ flag: 'a:shelf' }], none: [{ flag: 'a:fixed' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'a-fixed' }] },
]

// ---------------------------------------------------------------- the words ------

export const CONVERSATIONS_WINDOWS: Conversation[] = [
  {
    id: 'k-told',
    nameHe: 'אופיר',
    branches: [
      {
        lines: [
          { who: 'אופיר', text: 'אתה אומר שאתה לא בא שבת, או שאתה לא בא יותר?' },
          { who: 'פוגי', text: 'אני אומר שאני צריך משהו אחר לתקופה.' },
          { who: 'אופיר', text: 'ומה איתנו?' },
          { who: 'פוגי', text: 'בגלל זה אני מדבר איתך עכשיו.' },
        ],
        choices: [
          {
            id: 'friends',
            text: '(להתרחק מהכדורגל — ולהישאר בקשר עם החברים.)',
            then: [
              { e: 'flag', flag: 'k:told' },
              { e: 'flagValue', flag: 'life:football', value: 'peripheral' },
              { e: 'flag', flag: 'life:distanceKeepsFriends' },
              { e: 'rel', who: 'ofir', axis: 'trust', delta: 3 },
              { e: 'toast', text: 'אופיר: "אז תתקשר גם כשאין משחק." — "גם אתה."', tone: 'plain' },
            ],
          },
          {
            id: 'both',
            text: '(להתרחק משני הענפים. חיים אחרים, לתקופה.)',
            then: [
              { e: 'flag', flag: 'k:told' },
              { e: 'flagValue', flag: 'life:football', value: 'peripheral' },
              { e: 'flagValue', flag: 'life:basketball', value: 'peripheral' },
              { e: 'rel', who: 'efi', axis: 'trust', delta: 2 },
              { e: 'toast', text: 'אפי: "אני רוצה להבין מה להשאיר לך פתוח." — "את השיחה. לא את המקום באוטובוס."', tone: 'plain' },
            ],
          },
          {
            id: 'slower',
            text: '"לא עשור. רק להוריד קצב."',
            then: [
              { e: 'flag', flag: 'k:told' },
              { e: 'flagValue', flag: 'life:football', value: 'balanced' },
              { e: 'toast', text: 'אופיר: "אז אתה לא צריך להמציא לזה שם." — "רציתי רק שתדע."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'k-life',
    nameHe: 'קרן',
    branches: [
      {
        lines: [
          { who: 'קרן', text: 'אמרו לי שבשבתות אתה פה. מול הים, ולא ביציע.' },
          { who: 'קרן', text: 'כשאתה מספר על השנים האלה, אתה אומר ״לא הייתי״.' },
          { who: 'פוגי', text: 'כי לא הייתי שם.' },
          { who: 'קרן', text: 'היית איפשהו.' },
          { who: 'פוגי', text: 'נכון.' },
          { who: 'קרן', text: 'אז תתחיל משם.' },
        ],
        choices: [
          {
            id: 'work',
            text: '(פרויקט עבודה אחד, מתועד, עד הסוף.)',
            then: [
              { e: 'flag', flag: 'k:life' },
              { e: 'flagValue', flag: 'life:distance:sea', value: 'work' },
              { e: 'remember', who: 'keren', eventId: 'k02-promenade', significance: 'notable' },
              { e: 'time', minutes: 60 },
              // `enterprise` בתסריט → `business` במנוע
              { e: 'skill', skill: 'business', delta: 3, why: 'אין שער בדקה תשעים, יש סוף' },
              { e: 'proof', kind: 'distance_life', proofId: 'distance_life:{chapter}:work', subjectHe: 'הפרויקט של השנים האלה', noteHe: 'נגמר, ונרשם, בלי שמישהו ביציע ראה.' },
              { e: 'toast', text: 'קרן: "את זה עשית אתה." — "כן. אפילו אין שער בדקה תשעים."', tone: 'plain' },
            ],
          },
          {
            id: 'people',
            text: '(מסורת עם אנשים מחוץ לכדורגל.)',
            then: [
              { e: 'flag', flag: 'k:life' },
              { e: 'flagValue', flag: 'life:distance:sea', value: 'people' },
              { e: 'remember', who: 'keren', eventId: 'k02-promenade', significance: 'notable' },
              { e: 'time', minutes: 45 },
              { e: 'rel', who: 'keren', axis: 'bond', delta: 3 },
              { e: 'proof', kind: 'distance_life', proofId: 'distance_life:{chapter}:people', subjectHe: 'היום הקבוע בחודש', noteHe: 'שאל מה מתאים לכולם, לפני שקבע.' },
              { e: 'toast', text: 'קרן: "אותו יום כל חודש?" — "אם מתאים לכולם. אני כבר יודע לשאול."', tone: 'plain' },
            ],
          },
          {
            id: 'make',
            text: '(לסיים משהו יצירתי — ולהראות למי שבחרתי.)',
            then: [
              { e: 'flag', flag: 'k:life' },
              { e: 'flagValue', flag: 'life:distance:sea', value: 'make' },
              { e: 'remember', who: 'keren', eventId: 'k02-promenade', significance: 'notable' },
              { e: 'time', minutes: 60 },
              { e: 'skill', skill: 'creativity', delta: 3, why: 'נגמר, ולא נשאר במגירה' },
              { e: 'rel', who: 'yonatan', axis: 'bond', delta: 3 },
              { e: 'proof', kind: 'creation_proof', proofId: 'creation_proof:{chapter}:distance', subjectHe: 'מה שנעשה בשנים שלא היית ביציע', noteHe: 'הוצג למי שבחר, וקודם הקשיבו לו.' },
              { e: 'toast', text: 'יונתן: "רוצה ביקורת או רוצה שאקשיב?" — "קודם תקשיב."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'k-back',
    nameHe: 'אופיר',
    branches: [
      {
        lines: [
          { who: 'אופיר', text: 'חשבתי שלא תבוא.' },
          { who: 'פוגי', text: 'גם אני.' },
          { who: 'אופיר', text: 'בלומפילד סגור לשיפוץ. משחקי הבית בעיר אחרת, ונוסעים ביחד.' },
          { who: 'אופיר', text: 'רוצה שאספר מה השתנה?' },
          { who: 'פוגי', text: 'קודם תגיד איפה עומדים.' },
          { who: 'אופיר', text: 'בזה דווקא כולם עדיין מתווכחים.' },
        ],
        choices: [
          {
            id: 'return',
            text: '(לחזור כאוהד — וללמוד מחדש את המקום.)',
            then: [
              { e: 'flag', flag: 'k:back' },
              { e: 'flagValue', flag: 'life:football', value: 'balanced' },
              { e: 'flagValue', flag: 'life:distance', value: false },
              // `route.return_chosen` בתסריט — מה ש-Q04 קורא (`chapterCombos.ts`)
              { e: 'flag', flag: 'life:returned' },
              { e: 'proof', kind: 'return_chosen', proofId: 'return_chosen:{chapter}:terrace', subjectHe: 'החזרה', audience: 'gate5', delta: 2, noteHe: 'בחירה מפורשת, ולא שובל של הרגל.' },
              { e: 'heard', proofId: 'return_chosen:{chapter}:terrace' },
              { e: 'presence', mode: 'inside' },
              { e: 'attend' },
              { e: 'ending', id: 'returned' },
            ],
          },
          {
            id: 'once',
            text: '(ערב אחד. בלי לסיים את הריחוק.)',
            then: [
              { e: 'flag', flag: 'k:back' },
              { e: 'rel', who: 'ofir', axis: 'bond', delta: 3 },
              { e: 'presence', mode: 'inside' },
              { e: 'attend' },
              { e: 'toast', text: 'אופיר: "אז ערב אחד." — "טוב לי שאתה לא עושה מזה טקס."', tone: 'plain' },
              { e: 'ending', id: 'visit' },
            ],
          },
          {
            /** *"סירוב נשמר ולא מציק שוב בפרק"* — אין כאן מחיר, רק החלטה */
            id: 'no',
            text: '"לא עכשיו. אבל טוב שקראת לי."',
            then: [
              { e: 'flag', flag: 'k:back' },
              { e: 'rel', who: 'ofir', axis: 'bond', delta: 1 },
              missed('2017-return', 'distance'),
              { e: 'toast', text: 'אופיר: "אז קפה בשבוע הבא?" — "קפה כן."', tone: 'plain' },
              { e: 'ending', id: 'away' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'a-interrupt',
    nameHe: 'רחל',
    branches: [
      {
        lines: [
          { who: null, text: 'באמצע המחצית השנייה רחל עומדת בפתח, עם סל ריק.' },
          { who: 'רחל', text: 'הכביסה על הגג, ויורד גשם בעוד עשר דקות. אני לא מבקשת מאבא שלך.' },
          { who: 'קובי', text: 'היא לא מבקשת ממני כבר ארבעים שנה.' },
        ],
        choices: [
          {
            id: 'help',
            text: '(לעלות איתה לגג. עשר דקות בלי המשחק.)',
            then: [
              { e: 'flag', flag: 'a:interrupt' },
              { e: 'flagValue', flag: 'life:armchair:ten', value: 'roof' },
              { e: 'time', minutes: 15 },
              { e: 'rel', who: 'rachel', axis: 'bond', delta: 3 },
              { e: 'toast', text: 'על הגג, הטיפות הראשונות. מלמטה שומעים את קובי צועק על השופט — אז כנראה עוד לא נגמר.', tone: 'plain' },
            ],
          },
          {
            id: 'stay',
            text: '(להישאר מול המסך. "עוד רגע, אמא.")',
            then: [
              { e: 'flag', flag: 'a:interrupt' },
              { e: 'flagValue', flag: 'life:armchair:ten', value: 'screen' },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 1 },
              { e: 'rel', who: 'rachel', axis: 'bond', delta: -2 },
              { e: 'toast', text: 'רחל עלתה לבד. הכביסה ירדה רטובה, והיא לא אמרה כלום — שזה אצלה משפט שלם.', tone: 'red' },
            ],
          },
          {
            id: 'both',
            text: '(להוריד את הכביסה עם הטלפון ביד, והמשחק עליו.)',
            then: [
              { e: 'flag', flag: 'a:interrupt' },
              { e: 'flagValue', flag: 'life:armchair:ten', value: 'both' },
              { e: 'time', minutes: 15 },
              { e: 'wellbeing', key: 'stress', delta: 3 },
              { e: 'toast', text: 'חצי כביסה, חצי משחק, ושום דבר מהם לא עד הסוף. רחל: "גם זה משהו." — קובי: "גם זה משהו."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'a-fixed',
    nameHe: 'אילן',
    branches: [
      {
        when: { flagIs: { flag: 'a:shelf', value: 'straight' } },
        lines: [
          { who: 'אילן', text: 'ישר?' },
          { who: 'פוגי', text: 'יחסית לקיר.' },
          { who: 'בתיה', text: 'הקיר ותיק. תכבדו.' },
        ],
        then: [
          { e: 'flag', flag: 'a:fixed' },
          { e: 'proof', kind: 'home_project', proofId: 'home_project:{chapter}:wall', subjectHe: 'הקיר של אילן', noteHe: 'ישר, יחסית לקיר.' },
          { e: 'toast', text: 'אילן: "ישר?" — "יחסית לקיר." — בתיה: "הקיר ותיק. תכבדו."', tone: 'plain' },
          { e: 'ending', id: 'fixed' },
        ],
      },
      {
        lines: [
          { who: 'אילן', text: 'הוא עומד.' },
          { who: 'פוגי', text: 'קצת עקום.' },
          { who: 'בתיה', text: 'גם אתם. ועדיין עומדים.' },
        ],
        then: [{ e: 'flag', flag: 'a:fixed' }, { e: 'ending', id: 'fixed' }],
      },
    ],
  },
  {
    id: 'a-remote',
    nameHe: 'קובי',
    branches: [
      {
        lines: [
          { who: 'קובי', text: 'זה השלישי העונה שאתה קורא לו אבוטבול.' },
          { who: 'פוגי', text: 'אני שומר על מסורת.' },
          { who: 'קובי', text: 'אז לפחות תזכור איזה ספל שלך.' },
          { who: 'פוגי', text: 'זה עם הסדק?' },
          { who: 'קובי', text: 'אתה עדיין בכושר.' },
        ],
        choices: [
          {
            id: 'watch',
            text: '(לראות קצת, ולדבר איתו.)',
            then: [
              { e: 'flag', flag: 'a:remote' },
              { e: 'flagValue', flag: 'a:how', value: 'watch' },
              { e: 'time', minutes: 45 },
              { e: 'energy', delta: -5 },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 3 },
              { e: 'memory', item: 'folded-paper', id: 'a-mug' },
              { e: 'toast', text: 'קובי: "מה בעבודה?" — "באמצע התקפה?" — "אמרת שאתה לא מכיר את ההרכב."', tone: 'plain' },
            ],
          },
          {
            id: 'eat',
            text: '(לכבות, ולצאת לאכול.)',
            then: [
              { e: 'flag', flag: 'a:remote' },
              { e: 'time', minutes: 45 },
              { e: 'energy', delta: -5 },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 3 },
              { e: 'toast', text: 'קובי: "אני רוצה לראות עד המחצית." — "סגור. אחר כך אתה בוחר מקום."', tone: 'plain' },
            ],
          },
          {
            id: 'tomorrow',
            text: '"לא היום. מחר, בלי משחק."',
            then: [
              { e: 'flag', flag: 'a:remote' },
              { e: 'toast', text: 'קובי: "מחר לקפה?" — "מחר."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'a-photo',
    nameHe: 'עמית',
    // "שלחתי כי חשבתי שתרצה לראות" — תמונה בהודעה
    remote: { 'עמית': 'phone' },
    branches: [
      {
        lines: [
          { who: 'עמית', text: 'מצאתי את התמונה.' },
          { who: 'פוגי', text: 'אני לא שם.' },
          { who: 'עמית', text: 'נכון. שלחתי כי חשבתי שתרצה לראות.' },
          { who: 'פוגי', text: 'תודה.' },
          { who: 'עמית', text: 'לא צריך להסביר לי איפה היית.' },
        ],
        choices: [
          {
            /** *"לא ממציאים זיכרון אישי מפצה"* — התמונה נשמרת כמה שהיא: משהו שקיבלת */
            id: 'keep',
            text: '(לשמור אותה כתמונה שקיבלתי. לא כהוכחה שהייתי.)',
            then: [
              { e: 'flag', flag: 'a:photo' },
              { e: 'memory', item: 'folded-paper', id: 'a-received-photo' },
              { e: 'toast', text: 'פוגי: "מי צילם?" — עמית: "שני. תשמור גם את השם שלה."', tone: 'plain' },
            ],
          },
          {
            id: 'tell',
            text: '(לספר לו מה אני עשיתי באותו יום.)',
            then: [
              { e: 'flag', flag: 'a:photo' },
              { e: 'rel', who: 'amit', axis: 'bond', delta: 3 },
              { e: 'toast', text: 'עמית: "את זה לא ידעתי." — "לא שאלת." — "אז עכשיו אני שואל."', tone: 'plain' },
            ],
          },
          {
            id: 'close',
            text: '(להודות, ולסגור את האלבום.)',
            then: [
              { e: 'flag', flag: 'a:photo' },
              { e: 'toast', text: 'עמית: "נדבר בהמשך?" — "כן, בלי קשר לתמונה."', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'a-saturday',
    nameHe: 'אילן',
    branches: [
      {
        lines: [
          { who: 'אילן', text: 'אז היום אין משחק?' },
          { who: 'פוגי', text: 'יש. אני פה.' },
          { who: 'אילן', text: 'לא שאלתי אם ביטלו בשבילך.' },
          { who: 'בתיה', text: 'תן לו להחזיק את הסולם, אחר כך תחקור אותו.' },
        ],
        choices: [
          {
            id: 'fix',
            text: '(לעזור לאילן בתיקון פשוט.)',
            // (pass D, §47 S3) the Saturday is done with the hands — `shelf-19` (`choresPassD.ts`),
            // and `a-fixed` answers what the level says
            then: [
              { e: 'flag', flag: 'a:saturday' },
              { e: 'rel', who: 'neighbour', axis: 'bond', delta: 2 },
              { e: 'minigame', id: 'chore:story:shelf-19' },
            ],
          },
          {
            id: 'cook',
            text: '(לבשל עם בתיה, ולשבת לאכול.)',
            then: [
              { e: 'flag', flag: 'a:saturday' },
              { e: 'time', minutes: 60 },
              { e: 'energy', delta: -5 },
              { e: 'rel', who: 'batya', axis: 'bond', delta: 3 },
              { e: 'toast', text: 'בתיה: "אתה חותך כאילו ממהר למחצית." — "היום אין לי מחצית." — "אז תלמד בצל."', tone: 'plain' },
              { e: 'ending', id: 'cooked' },
            ],
          },
          {
            id: 'record',
            text: '(להיפגש עם יונתן, ולעבוד על הקלטה.)',
            then: [
              { e: 'flag', flag: 'a:saturday' },
              { e: 'time', minutes: 60 },
              { e: 'energy', delta: -5 },
              { e: 'rel', who: 'yonatan', axis: 'bond', delta: 3 },
              { e: 'skill', skill: 'creativity', delta: 2, why: 'הקשיב לפני שהגיב' },
              { e: 'toast', text: 'יונתן: "אתה מוכן לשמוע גם משהו שאני עשיתי?" — "בשביל זה באתי."', tone: 'plain' },
              { e: 'ending', id: 'recorded' },
            ],
          },
        ],
      },
    ],
  },
]
