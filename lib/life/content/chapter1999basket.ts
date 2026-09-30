import { at } from '../clock'
import type { LifeState } from '../types'

import type { Beat } from './beats'
import type { EndingCard } from './chapter1986'
import type { ChoiceDef, Conversation } from './script'
import type { Condition } from '../world/types'
import { QUEUE_1999 } from './storyChores'

/**
 * הדף על הלילה שירדנו — נושא אחד שעובר שלושה מעשים ושני פרקים.
 *
 * כתיבה (`journalism_proof` + `written_account`) באולם, פרסום (`publication_proof`)
 * בחלון של רפי באותו לילה, ותיקון (`public_correction`) ארבעה ימים לפני גמר הגביע של
 * 2000. שלושתם נושאים את המחרוזת הזאת, כי ההישגים מצליבים נושא ולא מפתח — ומי שכתב
 * ולא פרסם, או פרסם ולא תיקן, מחזיק בדיוק את מה שהוא עשה.
 */
export const PAGE_SUBJECT = 'הדף על הלילה שירדנו'

/**
 * B9 · "זה לא נגמר כשעולים" · 1998/99 — the second relegation, and the seed.
 *
 * One long evening at Ussishkin and the kiosk after it: the hall goes down again, a
 * year after coming back; Shachor and Limor turn grief into a list; Freddy talks about
 * structures without a lecture; Soko keeps the record; and a young man writes the first
 * list of his own — people, resources, principles — which is the prehistory of something
 * this stage does not found. At the kiosk, the Gate 5 people: organisation is work before
 * it is iconography. Eisenberg is an "enemy" only in the mouths of supporters.
 */

export const PORTRAIT_SEED: Record<string, string> = {
  'פוגי': 'faceHero80',
  'שחור': 'faceShachor',
  'לימור': 'faceLimor',
  'פרדי': 'faceFreddy',
  'סוקו': 'faceSoko',
  'אסף': 'faceAsaf',
  'מלמד': 'faceMelamed',
  'מישל': 'faceMichel',
  'דודו': 'faceDudu',
  'עומר': 'faceHermesh',
  'רפי מהקיוסק': 'faceOldMan',
  'אוהד': 'faceSupporter',
  'סדרן': 'faceUsher',
  // שני הקבועים של אלנבי — שני השחקנים האלה מתויגים `era: '*'` ב-`scenes.ts`, כלומר הם
  // עומדים שם בכל פרק, ולכן כל מפה צריכה את הפלייטים שלהם.
  'המוכר': 'faceVendor',
  'הגבר': 'faceSupporterB',
}

export function objectiveSeed(state: LifeState, sceneId: string): string | null {
  if (state.chapterDone) return null
  if (state.flags['seed:list']) return null
  if (state.flags['seed:hall']) return sceneId === 'kiosk' ? null : 'הקיוסק. שער 5 מחכה.'
  return '29 במרץ. לצפון. צריך את המשחק שלכם וגם חדשות מהרצליה.'
}

export const ENDINGS_SEED: Record<string, EndingCard> = {
  list: {
    id: 'list',
    titleHe: 'הרשימה הראשונה',
    bodyHe:
      'ירדו שוב, והדרך חזרה מהצפון הייתה ארוכה. במקום לשבור משהו כתבת דף. שמות. מה יש. מה חסר. מה לא מוכנים לוותר עליו. לא ידעת בשביל מה. סוקו אמר "תשמור". שמרת. הדף הזה ישן במגירה שנים לפני שמישהו קורא אותו בקול.',
    memoryHe: 'דף משבצות, שלוש כותרות, כתב יד רועד בשורה הראשונה ויציב בשלישית.',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
  anger: {
    id: 'anger',
    titleHe: 'רק כעס',
    bodyHe:
      'ירדו שוב, ובדרך חזרה מהצפון כעסת. על הבעלים, על השופטים, על מי שלא בא. כעס זה אמיתי וזה גם קל. סוקו הציע דף. לא לקחת. שנים אחר כך תחפש את הדף הזה ולא תמצא, כי לא כתבת אותו.',
    memoryHe: 'כרטיס מהערב. קרוע לשניים בכוונה.',
    memoryItem: 'hall-ticket',
    presence: 'inside',
  },
}

export const BEATS_SEED: Beat[] = [
  {
    id: 'seed-open',
    at: 'ussishkin-outside',
    trigger: 'enter',
    when: { none: [{ flag: 'seed:opened' }] },
    delayMs: 700,
    do: [
      { a: 'flag', flag: 'seed:opened' },
      { a: 'events', events: [{ t: 'money.changed', agorot: 5000, why: 'משכורת ראשונה' }] },
      { a: 'lines', lines: [{ who: null, text: 'עשרים ואחת. אחרי הצבא: עבודה מהבוקר, אולם בערב. חמישים שקל שנשארו ממשכורת ראשונה, אחרי מה שהשארת לאמא על השולחן.' }, { who: null, text: '29 במרץ 1999. הפינה של אוסישקין היא רק נקודת היציאה. המשחק בצפון, וגם משחק אחר קובע אם נשארים.' }] },
      { a: 'talk', conversation: 'seed-corner' },
    ],
  },
  {
    id: 'seed-hall',
    at: 'bus-station',
    trigger: 'enter',
    when: { flag: 'seed:opened', none: [{ flag: 'seed:hall' }] },
    delayMs: 900,
    do: [
      { a: 'card', titleHe: '29.3.1999', subHe: 'גליל עליון · בחוץ', ms: 2200 },
      { a: 'talk', conversation: 'seed-away' },
    ],
  },
  {
    id: 'seed-kiosk',
    at: 'kiosk',
    trigger: 'enter',
    when: { flag: 'seed:hall', none: [{ flag: 'seed:list' }] },
    delayMs: 800,
    do: [{ a: 'talk', conversation: 'seed-gate5' }],
  },
]

/**
 * החמישה סביב הארגז — each one brings one line to the page, in his own voice, and the
 * page closes on any three. They are the five who already speak in `seed-gate5`; the line
 * each gives is the thing he said there, written down.
 */
type Voice = { who: 'asaf' | 'melamed' | 'michel' | 'dudu' | 'omer'; nameHe: string; before: string; line: string; heading: string }
const SEED_VOICES: readonly Voice[] = [
  { who: 'asaf', nameHe: 'אסף', before: 'שב. כולם פה. תקשיב קודם.', line: 'תכתוב "אנשים" ראשון. לא כסף, לא בעלים. אנשים שבאים גם כשיורדים.', heading: 'אנשים' },
  { who: 'michel', nameHe: 'מישל', before: 'המפתחות האלה? של מיניבוס. אחר כך אסביר.', line: 'מיניבוס לכל משחק חוץ. תכתוב את זה תחת "מה יש". זה לא כסף, זה אנשים שמכירים אנשים.', heading: 'מיניבוס' },
  { who: 'dudu', nameHe: 'דודו', before: 'אני? אני הרעש. תשאל את אסף מה צריך.', line: 'רעש! תכתוב "רעש". (הוא צוחק, ואז לא.) ברצינות. אולם שקט זה אולם שמוכרים.', heading: 'רעש' },
  { who: 'omer', nameHe: 'עומר', before: '(מרים את התקליט.) אחר כך. עכשיו אסף מדבר.', line: 'מוזיקה. אם כבר עושים משהו, שיהיה עם מוזיקה טובה. תכתוב את זה למטה, איפה שלא מוותרים.', heading: 'מוזיקה' },
  { who: 'melamed', nameHe: 'מלמד', before: '(שלוש מכות, הפסקה, שתיים.) אחר כך. עכשיו מקשיבים.', line: 'תכתוב את הקצב. לא במילים — תצייר שלוש קווים, רווח, ושניים. מי שיקרא יבין.', heading: 'הקצב' },
]
/** the three of the five the relationship registry already knows (`characters.ts`) */
const KNOWN_VOICES: ReadonlySet<string> = new Set(['asaf', 'melamed', 'michel'])
const voiceFlag = (who: string) => `seed:line:${who}`
const voiceId = (who: string) => `seed-voice-${who}`

/** any three of the five lines, spelled as the condition vocabulary can read it */
const SEED_THREE_LINES: Condition = (() => {
  const flags = SEED_VOICES.map((voice) => voiceFlag(voice.who))
  const any: Condition[] = []
  for (let a = 0; a < flags.length; a += 1)
    for (let b = a + 1; b < flags.length; b += 1)
      for (let c = b + 1; c < flags.length; c += 1) any.push({ all: [{ flag: flags[a]! }, { flag: flags[b]! }, { flag: flags[c]! }] })
  return { any }
})()

/** what closing the page does — the effects the old one-button "list" carried */
const SEED_LIST_CLOSED: ChoiceDef['then'] = [{ e: 'flag', flag: 'seed:list' }, { e: 'flag', flag: 'life:seed:list' }, { e: 'institution', key: 'supporterOwnershipSeed', delta: 14 }, { e: 'redheart', key: 'community', delta: 6 }, { e: 'rel', who: 'asaf', axis: 'trust', delta: 5 }, { e: 'rel', who: 'freddy', axis: 'trust', delta: 4 }, { e: 'personality', key: 'responsibility', delta: 3 }, { e: 'goto', node: 'seed-close' }]

function voiceConversation(voice: Voice): Conversation {
  return {
    id: voiceId(voice.who),
    nameHe: voice.nameHe,
    branches: [
      { when: { flag: 'seed:list' }, lines: [{ who: voice.nameHe, text: 'תשמור את הדף. אל תקפל אותו יותר מדי.' }] },
      {
        when: { all: [{ flag: 'seed:page' }, { notFlag: voiceFlag(voice.who) }] },
        lines: [{ who: voice.nameHe, text: voice.line }],
        then: [{ e: 'flag', flag: voiceFlag(voice.who) }, ...(KNOWN_VOICES.has(voice.who) ? [{ e: 'rel' as const, who: voice.who, axis: 'familiarity' as const, delta: 2 }] : []), { e: 'toast', text: `על הדף: ${voice.heading}.`, tone: 'plain' }],
      },
      { when: { flag: 'seed:page' }, lines: [{ who: voice.nameHe, text: 'כבר כתבת אותי. תשאל את האחרים — ואז תסגור את הדף על הארגז.' }] },
      { lines: [{ who: voice.nameHe, text: voice.before }], then: [{ e: 'goto', node: 'seed-gate5' }] },
    ],
  }
}

/** the corner's answers — the same whatever the corner remembers of 1997 */
const SEED_CORNER_CHOICES: ChoiceDef[] = [
          /**
           * (Director V3 §12, 24.9.2026) the queue is WORKED, not agreed to: `ChoreScene`
           * serve — people arrive at the window, wait a little, and go; reach each one and
           * press. What it changes is scaled by how many got a ticket
           * (`content/storyChores.ts`, `queue-99`). The answer itself commits the evening.
           */
          { id: 'work', text: 'לעשות את התור.', when: { notFlag: QUEUE_1999 }, hidden: true, then: [{ e: 'flag', flag: 'seed:worked' }, { e: 'minigame', id: 'chore:story:queue-99' }] },
          { id: 'owner', text: '"הוא באמת הורג את המועדון."', then: [{ e: 'institution', key: 'basketballOwnershipTrust', delta: -10 }, { e: 'institution', key: 'protestEscalation', delta: 4 }, { e: 'rel', who: 'shachor', axis: 'tension', delta: 3 }, { e: 'toast', text: '"אחרי," שחור חזר. לא הסתכל עליך.', tone: 'plain' }] },
          /**
           * שני חובות שהמשחק לקח ולא נתן להחזיר, עד עכשיו.
           *
           * `owe:shachor` נרשם כששחור השלים את ההפרש לאוטובוס לצפון, ו-`owe:group` נרשם
           * כשמטבעות עברו מעל הראשים כדי שתעלה לאוטובוס להיכל. שניהם שורדים החלפת שנה
           * בכוונה (`personFlags`), ו-`hasOverdueDebt` ב-`routes.ts` קורא כל `owe:` כחוב
           * פתוח — כלומר טובה שקיבלת בגיל חמש־עשרה נעלה את שיא מסלול הבעלים לתמיד.
           * **חוב שאי-אפשר לפרוע הוא לא חוב, הוא עונש**, וזו בדיוק התוכנית המתה של כלל 66.
           *
           * הם נפרעים כאן ולא קודם משתי סיבות שהן אותה סיבה: זה הפרק הראשון שבו הכסף
           * בכיס הוא שכר שלו ("חמישים שקל שנשארו ממשכורת ראשונה"), ושני הנושים עומדים
           * באותה פינה — שחור עם הארגזים, לימור עם הפנקס שספרה בו אז. **מי שנתן הוא מי
           * שמקבל**, ולכן אין כאן מסך "סגירת חשבונות": יש אדם אחד ותור אחד.
           */
          { id: 'debt-shachor', text: '"שחור. ההפרש מהצפון."', when: { flag: 'owe:shachor' }, noteHe: 'אתה לא חייב לשחור הפרש.', then: [{ e: 'goto', node: 'seed-owed-shachor' }] },
          { id: 'debt-group', text: 'להחזיר לתור את מה שהתור שם עליך פעם.', when: { flag: 'owe:group' }, noteHe: 'התור מעולם לא שם עליך כלום.', then: [{ e: 'goto', node: 'seed-owed-queue' }] },
        ]

export const CONVERSATIONS_SEED: Conversation[] = [
  {
    id: 'seed-corner',
    nameHe: null,
    branches: [
      /**
       * (implementation pass 27.9.2026) the corner remembers 1997 — the bible's founder seed,
       * *"מי שנשאר אחרי הפסד"*: Limor and Shachor saw who stayed when the hall went down the
       * first time, and they say so before they hand out the work. The work is the same.
       */
      {
        when: { any: [{ flagIs: { flag: 'life:hall:1997', value: 'stayed' } }, { flagIs: { flag: 'life:hall:1997', value: 'carried' } }] },
        lines: [
          { who: 'לימור', text: 'אתה. אתה נשארת בפעם הקודמת, כשכיבו. אז אתה יודע איך זה נראה אחרי.' },
          { who: 'לימור', text: 'תור. קופה. סדרן שלא שילמו לו. אני עושה את הסדרן הערב. אתה עושה את התור.' },
          { who: 'שחור', text: 'ומי שמדבר על הבעלים — שידבר אחרי. הערב עובדים.' },
        ],
        choices: SEED_CORNER_CHOICES,
      },
      {
        when: { flagIs: { flag: 'life:hall:1997', value: 'argued' } },
        lines: [
          { who: 'לימור', text: 'תור. קופה. סדרן שלא שילמו לו. אני עושה את הסדרן הערב. אתה עושה את התור.' },
          { who: 'שחור', text: 'ואתה — הערב בלי נאומים. נאמת מספיק בפעם הקודמת, ואף כיסא לא זז מזה.' },
          { who: 'אוהד', text: 'הבעלים הזה הורג את המועדון!' },
          { who: 'שחור', text: 'אחרי.' },
        ],
        choices: SEED_CORNER_CHOICES,
      },
      {
        lines: [
          { who: 'לימור', text: 'תור. קופה. סדרן שלא שילמו לו. אני עושה את הסדרן הערב. אתה עושה את התור.' },
          { who: 'שחור', text: 'ומי שמדבר על הבעלים — שידבר אחרי. הערב עובדים.' },
          { who: 'אוהד', text: 'הבעלים הזה הורג את המועדון!' },
          { who: 'שחור', text: 'אחרי.' },
        ],
        choices: SEED_CORNER_CHOICES,
      },
    ],
  },
  {
    id: 'seed-owed-shachor',
    nameHe: 'שחור',
    branches: [
      {
        when: { minAgorot: 3000 },
        lines: [
          { who: null, text: 'הוצאת מהכיס את מה שנשאר מהמשכורת והחזקת מולו. הוא הסתכל על היד, לא על הכסף.' },
          { who: 'שחור', text: 'לא ספרתי אז. לא אספור עכשיו. תן מה שאתה רוצה לתת ותפסיק לחשוב על זה.' },
        ],
        then: [
          { e: 'money', agorot: -3000, why: 'ההפרש לשחור' },
          { e: 'flagValue', flag: 'owe:shachor', value: false },
          /**
           * הדגל אומר שזה נסגר; שתי השורות האלה אומרות **כמה** ו**מתי**.
           *
           * `debt` יורד באותו סכום שהוא עלה ב-1993, ו-`debt_settled` היא הראיה שההישג
           * "לא נשאר חייב" מבקש: שני פרעונות, בשני מועדים, וארנק שלא נושא חוב פתוח.
           */
          { e: 'debt', agorot: -3000, why: 'ההפרש לשחור, נסגר' },
          { e: 'proof', kind: 'debt_settled', proofId: 'debt_settled:{chapter}:shachor', subjectHe: 'ההפרש לאוטובוס לצפון', noteHe: 'שש שנים אחרי. הוא לא ספר.' },
          { e: 'rel', who: 'shachor', axis: 'trust', delta: 5 },
          { e: 'rel', who: 'shachor', axis: 'sharedHistory', delta: 4 },
          { e: 'personality', key: 'reliability', delta: 3 },
          { e: 'time', minutes: 10 },
          { e: 'toast', text: 'הוא קיפל את השטרות פעם אחת והכניס לכיס. לא אמר תודה. אצלו זה בסדר.', tone: 'plain' },
        ],
      },
      {
        lines: [
          { who: null, text: 'ספרת בכיס בלי להוציא את היד, והגעת לאותו מספר פעמיים.' },
          { who: 'שחור', text: 'מה? אמרת משהו?' },
          { who: null, text: 'לא. עוד לא.' },
        ],
      },
    ],
  },
  {
    id: 'seed-owed-queue',
    nameHe: null,
    branches: [
      {
        when: { minAgorot: 2000 },
        lines: [
          { who: null, text: 'ילד בתור, לבד, סופר בכיס פעמיים ומגיע לאותו מספר. לימור כבר ראתה אותו וכבר החליטה לא לראות.' },
          { who: null, text: '"כמה חסר לו?" — את המשפט הזה אמרו פעם מעל הראש שלך, בדלת של אוטובוס, ולא ראית מי אמר אותו.' },
          { who: 'לימור', text: 'עשרים. (היא לא שאלה למה. היא רשמה, כמו שרשמה אז.)' },
        ],
        then: [
          { e: 'money', agorot: -2000, why: 'מי שחסר לו בתור' },
          { e: 'flagValue', flag: 'owe:group', value: false },
          { e: 'debt', agorot: -2000, why: 'מה שהתור השלים עליך, הלאה' },
          { e: 'proof', kind: 'debt_settled', proofId: 'debt_settled:{chapter}:queue', subjectHe: 'המטבעות שעברו מעל הראש שלך', noteHe: 'לא לאותו אדם. לאותו מקום בתור.' },
          { e: 'redheart', key: 'community', delta: 5 },
          { e: 'wellbeing', key: 'belonging', delta: 3 },
          { e: 'rel', who: 'crowd-limor', axis: 'trust', delta: 4 },
          { e: 'time', minutes: 10 },
          { e: 'toast', text: 'הוא נכנס לפניך ולא הסתכל אחורה. ככה זה עובד.', tone: 'plain' },
        ],
      },
      { lines: [{ who: null, text: 'ילד בתור סופר בכיס. אתה סופר בכיס שלך, ואין לך הערב מה לשים על הדלפק בשבילו.' }] },
    ],
  },
  {
    id: 'seed-inside',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'האולם. גג הפח, הפרקט ששוקע באמצע, ריח גרעינים ונקניקיות מהמזנון. פחות אנשים מבפעם הקודמת ויותר שקט — של מי שיודע איך זה נגמר ובא בכל זאת.' },
          { who: null, text: 'זה נגמר כמו שידעו. הצפירה לא הפתיעה אף אחד. זה מה שהיה נורא.' },
          { who: 'סוקו', text: 'פעם שנייה בשלוש שנים. אני רושם את התאריך ליד הקודם. הם ייראו כמו זוג.' },
        ],
        choices: [
          { id: 'why', text: '"למה אתה עוד רושם?"', then: [{ e: 'rel', who: 'soko', axis: 'bond', delta: 3 }, { e: 'redheart', key: 'historyMemory', delta: 3 }, { e: 'toast', text: '"כי יום אחד מישהו ישאל מה היה. ואני לא רוצה שהתשובה תהיה \'לא זוכר\'."', tone: 'plain' }] },
          /**
           * *"תן, אני אכתוב את הערב."* — והפעם זה גם נרשם.
           *
           * הבחירה הזאת קיימת מאז שהפרק נכתב, והיא הייתה מחווה: אמון, זיכרון, ודגל.
           * מה שנוסף הוא הפנקס — **שתי** ראיות על אותו דף, כי דף כזה הוא שני דברים
           * בבת אחת: תיעוד (`journalism_proof`) וטקסט שמישהו יקרא (`written_account`).
           * ההפרדה הזאת היא מה שמאפשר גם לתקן אותו אחר כך, בלי למחוק אותו.
           */
          { id: 'help', text: '"תן, אני אכתוב את הערב."', then: [{ e: 'rel', who: 'soko', axis: 'trust', delta: 5 }, { e: 'remember', who: 'soko', eventId: 'wrote-the-night-1999', significance: 'notable' }, { e: 'redheart', key: 'historyMemory', delta: 5 }, { e: 'flag', flag: 'seed:wrote' }, { e: 'flag', flag: 'life:page:1999' }, { e: 'proof', kind: 'journalism_proof', proofId: 'journalism_proof:{chapter}:page', subjectHe: PAGE_SUBJECT, noteHe: 'מה שהיה באולם, בשעה שהיה, בכתב יד של מישהו שהיה שם.' }, { e: 'proof', kind: 'written_account', proofId: 'written_account:{chapter}:page', subjectHe: PAGE_SUBJECT, noteHe: 'שני עמודים במחברת של סוקו. הוא לא תיקן לך מילה.' }, { e: 'skill', skill: 'communication', delta: 3, why: 'כתב את הערב' }] },
        ],
      },
    ],
  },
  {
    id: 'seed-away',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'האוטובוס עולה צפונה. אף אחד לא שר הרבה. לפני המשחק כבר ברור ששני לוחות תוצאות חשובים הערב, לא אחד.' },
          { who: null, text: 'מקנטס לא משחק. כסף שלא שולם הפך מחדר הנהלה לחור בסגל.' },
          { who: null, text: 'כשהערב נגמר אין חישוב להציל: גם המשחק שלכם וגם התלות בהרצליה נסגרו נגדכם. יורדים שוב.' },
          { who: 'שחור', text: 'כשחוזרים לתל אביב לא הולכים הביתה. לרפי.' },
        ],
        choices: [
          { id: 'sit', text: 'לשבת ליד שחור בדרך חזרה.', then: [{ e: 'rel', who: 'shachor', axis: 'sharedHistory', delta: 5 }, { e: 'presence', mode: 'inside' }, { e: 'flag', flag: 'seed:hall' }, { e: 'travel', to: 'kiosk', spawn: 'start' }] },
          { id: 'write', text: 'לרשום בדרך מה קרה, לפני שהכעס מסדר את הזיכרון.', then: [{ e: 'redheart', key: 'historyMemory', delta: 5 }, { e: 'personality', key: 'honesty', delta: 2 }, { e: 'presence', mode: 'inside' }, { e: 'flag', flag: 'seed:hall' }, { e: 'travel', to: 'kiosk', spawn: 'start' }] },
        ],
      },
    ],
  },
  {
    id: 'seed-gate5',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'הקיוסק בלילה. רפי השאיר את התריס חצי מורם ואת האור דולק. אסף על ארגז הפוך, מלמד עם הדרבוקה בין הברכיים, מישל מסובב מפתחות של מיניבוס, דודו מדבר חזק מכולם, עומר עם תקליט מתחת לבית השחי. השנה הם התחילו לקרוא לעצמם "היצורים".' },
          { who: 'אסף', text: 'הכדורגל בסדר, יש לו מי שידאג. האולם ירד פעמיים בשלוש שנים. אז לא "מי אשם". אלא: אם היינו צריכים לעשות את זה לבד — מה היינו צריכים?' },
          { who: 'פרדי', text: 'מבנה. לא כעס. אנשים, תפקידים, כסף שיודעים מאיפה הוא בא. זה משעמם. הדברים שמחזיקים תמיד משעממים.' },
          { who: 'מישל', text: 'מיניבוס. אני יכול להשיג מיניבוס לכל משחק חוץ. זה לא כסף, זה אנשים שמכירים אנשים.' },
          { who: 'דודו', text: 'ואני מביא רעש! (כולם צוחקים.) מה? רעש זה חשוב!' },
          { who: 'עומר', text: '(מרים את התקליט.) ומוזיקה. אם כבר עושים משהו, שיהיה עם מוזיקה טובה.' },
          { who: 'מלמד', text: '(דרבוקה, שלוש מכות, הפסקה, שתיים.) זוכר? מ-96. אתה בחרת את הקצב הזה.' },
        ],
        choices: [
          /**
           * (Director V3 §12) the list is ASSEMBLED, not chosen: the page is taken here, and
           * then written one line at a time by walking to the people around the crate —
           * each of them brings one thing (`seed-voice-*`). Three lines, and the page on the
           * crate can be closed (`seed-page`). The anger stays one sentence, because anger is.
           */
          { id: 'list', text: 'לקחת דף. "אז נכתוב: אנשים. מה יש. מה לא מוותרים עליו."', when: { notFlag: 'seed:page' }, hidden: true, then: [{ e: 'flag', flag: 'seed:page' }, { e: 'toast', text: 'הדף ביד. עכשיו לשאול כל אחד מה הוא מביא — ולכתוב.', tone: 'plain' }] },
          { id: 'anger', text: '"מה שצריך זה שהבעלים ילך."', then: [{ e: 'flag', flag: 'seed:list' }, { e: 'institution', key: 'protestEscalation', delta: 6 }, { e: 'institution', key: 'supporterOwnershipSeed', delta: 2 }, { e: 'rel', who: 'freddy', axis: 'tension', delta: 4 }, { e: 'goto', node: 'seed-close' }] },
          /**
           * `owe:stand` — הכסף שנאסף בשתי דקות למונית, כדי שתגיע. אותם אנשים, אותו ארגז
           * הפוך, ואף אחד מהם לא ביקש אותו בחזרה. זו הסיבה שהחזרה כאן היא בחירה ולא
           * תנאי: חוב של יציע נפרע כי מי שחייב רוצה, ולא כי המערכת סוגרת חשבון.
           */
          { id: 'debt-taxi', text: 'לשים על הארגז את מה שעלתה המונית ההיא.', when: { flag: 'owe:stand' }, noteHe: 'אף אחד לא אסף עליך כסף למונית.', then: [{ e: 'goto', node: 'seed-owed-taxi' }] },
          /**
           * ומה שהופך כתיבה לפרסום: מישהו אחר קורא אותה, במקום שהוא לא שלך.
           *
           * החלון של רפי הוא הלוח היחיד שיש לרחוב הזה. סוקו מעתיק, רפי מדביק, וזה כבר לא
           * מחברת — זה דף שאנשים עוצרים מולו. `publication_proof` נרשם כאן ולא באולם,
           * כי בין השניים עומד ההבדל שההישג "המילים שלי בחוץ" קיים בשבילו.
           */
          { id: 'pin', text: 'לתת לסוקו להעתיק את הדף, ולתלות אותו בחלון של רפי.', when: { flag: 'seed:wrote' }, hidden: true, then: [{ e: 'flag', flag: 'life:page:pinned' }, { e: 'time', minutes: 20 }, { e: 'proof', kind: 'publication_proof', proofId: 'publication_proof:{chapter}:page', subjectHe: PAGE_SUBJECT, audience: 'public', delta: 3, noteHe: 'סוקו העתיק בכתב ידו, רפי הדביק מבפנים בסלוטייפ. בגובה העיניים.' }, { e: 'heard', proofId: 'publication_proof:{chapter}:page' }, { e: 'rel', who: 'soko', axis: 'bond', delta: 4 }, { e: 'toast', text: 'שני אנשים עצרו מול החלון לפני שהלכת הביתה. אחד מהם קרא את זה עד הסוף.', tone: 'plain' }] },
          { id: 'rhythm', text: 'לענות למלמד. אותו קצב.', when: { flag: 'life:melamed:rhythm' }, noteHe: 'לא למדת את הקצב שלו ב־96. אין לך מה לענות.', then: [{ e: 'sfx', key: 'darbuka-three-two', level: 0.8 }, { e: 'sfx', key: 'crowd-claps', level: 0.5, delayMs: 1700 }, { e: 'rel', who: 'melamed', axis: 'bond', delta: 6 }, { e: 'remember', who: 'melamed', eventId: 'rhythm-returned-1999', significance: 'major' }, { e: 'redheart', key: 'terraceCulture', delta: 5 }, { e: 'toast', text: 'שלוש, הפסקה, שתיים. כל הקיוסק הצטרף. ככה מתחיל שיר.', tone: 'plain' }] },
        ],
      },
    ],
  },
  ...SEED_VOICES.map(voiceConversation),
  {
    id: 'seed-page',
    nameHe: null,
    branches: [
      { when: { flag: 'seed:list' }, lines: [{ who: null, text: 'הארגז ההפוך. הדף כבר בכיס שלך.' }] },
      {
        when: { all: [{ flag: 'seed:page' }, SEED_THREE_LINES] },
        lines: [
          { who: null, text: 'הנחת את הדף על הארגז ועברת על מה שכתבת. שלוש כותרות: אנשים. מה יש. מה לא מוותרים עליו.' },
          { who: null, text: 'השורה הראשונה בכתב יד רועד. השלישית כבר יציבה.' },
        ],
        then: SEED_LIST_CLOSED,
      },
      {
        when: { flag: 'seed:page' },
        lines: [{ who: null, text: 'על הדף שורה או שתיים. עוד לא דף. מסביב לארגז יש עוד אנשים שלא שאלת.' }],
      },
      {
        lines: [{ who: null, text: 'דף משבצות ריק על הארגז, ועט שסוקו השאיר. אף אחד לא כתב עליו עדיין.' }],
        then: [{ e: 'flag', flag: 'seed:page' }, { e: 'toast', text: 'הדף ביד. עכשיו לשאול כל אחד מה הוא מביא — ולכתוב.', tone: 'plain' }],
      },
    ],
  },
  {
    id: 'seed-owed-taxi',
    nameHe: null,
    branches: [
      {
        when: { minAgorot: 3000 },
        lines: [
          { who: null, text: 'הארגז ההפוך שאסף יושב עליו. שמת עליו שטרות ולא הסברת על מה.' },
          { who: 'אסף', text: 'מה זה?' },
          { who: null, text: '"המונית. מישהו הוציא עשרים, מישהו אחר עשר, ואחד נתן חמישה ואמר שזה מה שיש."' },
          { who: 'אסף', text: '(לוקח. לא סופר.) זה לא היה חוב. אבל אם אתה מחזיר — סימן שהבנת איך זה עובד.' },
        ],
        then: [
          { e: 'money', agorot: -3000, why: 'המונית של שער 5' },
          { e: 'flagValue', flag: 'owe:stand', value: false },
          { e: 'debt', agorot: -3000, why: 'המונית של שער 5, נסגרה' },
          { e: 'proof', kind: 'debt_settled', proofId: 'debt_settled:{chapter}:taxi', subjectHe: 'המונית ששער 5 שילם עליה', noteHe: 'אסף לקח ולא ספר.' },
          { e: 'rel', who: 'asaf', axis: 'trust', delta: 5 },
          { e: 'redheart', key: 'terraceCulture', delta: 4 },
          { e: 'institution', key: 'supporterOwnershipSeed', delta: 3 },
          { e: 'time', minutes: 10 },
        ],
      },
      { lines: [{ who: null, text: 'הארגז ההפוך, ואין לך הערב מה לשים עליו.' }] },
    ],
  },
  {
    id: 'seed-close',
    nameHe: null,
    branches: [
      { when: { flag: 'life:seed:list' }, lines: [{ who: null, text: 'שלוש כותרות על דף משבצות. סוקו אמר "תשמור". שמרת.' }], then: [{ e: 'presence', mode: 'inside' }, { e: 'ending', id: 'list' }] },
      { lines: [{ who: null, text: 'סוקו הציע דף. לא לקחת. הלכת הביתה עם הכעס, שהיה חם ונוח כמו מעיל.' }], then: [{ e: 'presence', mode: 'inside' }, { e: 'ending', id: 'anger' }] },
    ],
  },
]
