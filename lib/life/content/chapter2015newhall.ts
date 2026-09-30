import type { LifeState } from '../types'

import type { Beat } from './beats'
import type { EndingCard } from './chapter1986'
import type { ChoiceDef, Conversation } from './script'
import { PORTRAIT_GROWTH } from './chapter2012growth'

/**
 * N05–N06 · "בית עם כתובת אחרת" · 2015–2016, פרק אחד.
 *
 * שתי סצנות, שני מקומות שאינם קיימים, **ועוגן אחד** — וזה לא קיצור אלא מה שהתסריט
 * עצמו מורה.
 *
 * **N06 אסור לו עוגן.** הוראת ההפקה כתובה במפורש: *"V4-BLOOMFIELD ו-V4-COVID הם
 * מזהי הקשר תקופתי לפעולה בדיונית, לא טענת אימות חדשה. **אין לחבר אותם לארכיון
 * כמשחק מתועד**."* ולכן הסצנה היא ערב שיוצאים אליו, בלי תאריך ובלי תוצאה. מה שהיא
 * כן מקפידה עליו — *"אין להציג את בלומפילד כמארח בזמן שיפוץ"* — מתקיים מעצמו:
 * כל 63 משחקי הבית של 2015/16–2017/18 ב-`matches.json` נושאים `venueSlug: null`,
 * כלומר המקור לא נוקב באצטדיון ולכן גם המשחק לא.
 *
 * **והאולם החדש הוא עובדה בארכיון, לא משחק.** `ussishkin.json` מחזיק את `drivein`
 * מ-ynet: אולם ביתי חדש במתחם הדרייב-אין בתחילת 2015, 3,400 מקומות מול 2,000
 * באוסישקין, אחרי שבע שנים בלי בית (`homeless`). לכן `2015-drivein` הוא **עוגן
 * סיכום** ולא משחק — אותה צורה בדיוק שנבחרה לעליית 2009, ומאותה סיבה: מה שאין לו
 * תאריך נשאר בלי תאריך (כלל 80).
 *
 * **שני החדרים.** אין דרייב-אין ואין מגרש חלופי, ו-`life:places` מדפיס את שניהם
 * כ-`needs-painting`. הצורה הכנה לזה היא זו של טדי ב-2010: המקום הוא כרטיס וזמן,
 * והחדר הוא המקום שממנו יוצאים אליו — הרחוב לפני, והסלון של אבא אחרי.
 */

export const PORTRAIT_NEWHALL: Record<string, string> = {
  ...PORTRAIT_GROWTH,
}

export function objectiveNewHall(state: LifeState, sceneId: string): string | null {
  if (state.chapterDone) return null
  if (!state.flags['nr:hall']) return sceneId === 'drive-in' ? null : 'הדרייב אין. אפי רוצה להראות משהו, ומתוקי בא.'
  // (pass D) before the doors: four things in an empty hall, and time for two
  if (state.flags['nr:prep'] && !state.flags['nr:crowd']) return 'עד שש וחצי. הבד, הנייר, הדלתות, השורה — שניים מהם.'
  if (state.flags['nr:crowd'] && !state.flags['nr:first']) return null
  // (90-E) "הפעם אני בדקתי" — the checking is a sign at the drive-in, before the question at home
  if (!state.flags['nr:route'] && sceneId === 'drive-in' && !state.flags['nr:checked']) return 'לפני שהולכים — השלט בתחנה ליד החניה. אבא ישאל מאיפה יוצאים.'
  if (!state.flags['nr:route']) return sceneId === 'home' ? null : 'אצל אבא. הוא שואל מאיפה יוצאים.'
  return null
}

export const ENDINGS_NEWHALL: Record<string, EndingCard> = {
  led: {
    id: 'led',
    titleHe: 'תן לי פעם אחת',
    bodyHe:
      'בדקת מסלול, הכנת חלופה, והובלת. קובי אמר "לא רע" ואמרת לו לשמור את המחמאה לסוף, והוא אמר שבסוף הוא ישכח שהתכוון — וזה היה נכון, ולא היה חשוב.',
    memoryHe: 'דף עם שתי דרכים, השנייה מסומנת.',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
  sofa: {
    id: 'sofa',
    titleHe: 'אין פקקים בסלון',
    bodyHe:
      'ראיתם מהבית. הוא אמר שאין פקקים בסלון ואמרת שיש, בדרך למטבח, והוא צחק כמו שהוא צוחק — פעם אחת, בקול נמוך, ואז שקט.',
    memoryHe: 'שני ספלים, אחד מלא.',
    memoryItem: 'folded-paper',
    presence: 'television',
  },
  solo: {
    id: 'solo',
    titleHe: 'תספר איך היה להגיע',
    bodyHe:
      'הלכת לבד, ואמרת לו מראש. הוא ביקש שתספר איך היה להגיע; שאלת מה אם תאחר, והוא אמר שתספר יותר קצר. זה לא היה עלבון ושניכם ידעתם.',
    memoryHe: 'כרטיס נסיעה, מקופל לרוחב.',
    memoryItem: 'ticket-stub',
    presence: 'inside',
  },
}

/**
 * ============================================ לפני שהקהל נכנס — pass D (§42, 28.9.2026) ====
 *
 * *"Efi calls Pogi early; empty seats, row search · 2 of 4 things before crowd · banner /
 * confetti / families / not help · what you prepared appears"*. אחרי המשפט של אפי ("פה יהיה
 * לנו מקום") האולם ריק, והקהל בשש וחצי. ארבעה דברים עומדים באולם — הבד הישן על המעקה, נייר
 * אדום על המושבים, הדלתות למשפחות שבאות בפעם הראשונה, והשורה שלך (לשבת, ולא לעזור) — והזמן
 * לשניים. בשש וחצי (או כששניים נעשו) הדלתות נפתחות: הקהל נכנס **לאולם שהכנת**, והחדר נבנה
 * מחדש עם מה שעשית בו (`rooms2000.ts`, `nr:crowd`).
 */
const DOORS = 18 * 60 + 30
const PREP_MIN = 35
const SEAT_MIN = 20
const did = (what: string) => ({ flag: `nr:did:${what}` })
const TWO_DONE = {
  any: [
    ['banner', 'confetti'], ['banner', 'families'], ['banner', 'seat'],
    ['confetti', 'families'], ['confetti', 'seat'], ['families', 'seat'],
  ].map(([a, b]) => ({ all: [did(a!), did(b!)] })),
}
/** what the crowd walks into — one line for each thing that was done, and one for each that was not */
const CROWD_LINES: ReadonlyArray<readonly [string, string, string]> = [
  ['banner', 'מעל הכניסה, על המעקה: הבד הישן, זה שיצא מאוסישקין מקופל. הראשונים שנכנסים מרימים את הראש, ומישהו מוחא כפיים לבד.', 'המעקה מעל הכניסה ריק. מישהו שואל איפה הבד, ומישהו אחר עונה "בפעם הבאה".'],
  ['confetti', 'על המושבים, נייר אדום גזור. ילד אחד אוסף אותו לכיס במקום לזרוק.', 'המושבים כחולים ונקיים, כמו באולם של מישהו אחר.'],
  ['families', 'בדלתות, אבא עם שני ילדים שואל איפה עומדים. אתה מראה לו. הוא לא יודע שזה הערב הראשון גם שלך.', 'בדלתות, משפחה מסתובבת עם הכרטיסים ביד, ואף אחד לא מראה להם לאן.'],
  ['seat', 'ישבת בשורה שבע לפני כולם. עכשיו היא מלאה, והכיסא שלך חם כבר שעה.', ''],
]

export const BEATS_NEWHALL: Beat[] = [
  // N05 *"הדרייב אין, 2015"* — מ-21.9.2026 יש לו ציור, והפרק מתחיל בתוכו
  { id: 'nr-hall', at: 'drive-in', trigger: 'enter', when: { none: [{ flag: 'nr:hall' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'nr-hall' }] },
  // (pass D) S2 — Efi, before anyone comes: the hall is empty and the clock is not
  { id: 'nr-prep', at: 'drive-in', trigger: 'clock', when: { all: [{ flag: 'nr:hall' }], none: [{ flag: 'nr:prep' }] }, delayMs: 1100, do: [{ a: 'talk', conversation: 'nr-prep' }] },
  // S4 — the doors open on the hall he made: the room is rebuilt with what was done in it
  {
    id: 'nr-doors',
    // wherever he is at six thirty, Efi's phone brings him back: the doors open with him or without his hands
    trigger: 'clock',
    when: { all: [{ flag: 'nr:prep' }], none: [{ flag: 'nr:crowd' }], any: [TWO_DONE, { afterMinute: DOORS }] },
    delayMs: 900,
    do: [
      { a: 'flag', flag: 'nr:crowd' },
      { a: 'events', events: [{ t: 'flag.raised', flag: 'life:drivein:opened' }] },
      { a: 'card', titleHe: 'שש וחצי', subHe: 'הדלתות נפתחות', ms: 2000 },
      { a: 'travel', to: 'drive-in', spawn: 'start' },
    ],
  },
  ...CROWD_LINES.flatMap(([what, done, missing]): Beat[] => [
    {
      id: `nr-crowd-${what}`,
      at: 'drive-in',
      trigger: 'clock',
      when: { all: [{ flag: 'nr:crowd' }, did(what)], none: [{ flag: `nr:seen:${what}` }] },
      delayMs: 700,
      do: [{ a: 'flag', flag: `nr:seen:${what}` }, { a: 'crowd', state: 'BUILDING_TENSION' }, { a: 'lines', lines: [{ who: null, text: done }] }],
    },
    ...(missing
      ? [{
          id: `nr-crowd-no-${what}`,
          at: 'drive-in' as const,
          trigger: 'clock' as const,
          when: { all: [{ flag: 'nr:crowd' }], none: [did(what), { flag: `nr:seen:${what}` }] },
          delayMs: 700,
          do: [{ a: 'flag' as const, flag: `nr:seen:${what}` }, { a: 'lines' as const, lines: [{ who: null, text: missing }] }],
        }]
      : []),
  ]),
  // S5 — the first game, one card: the archive's line, and no lecture
  {
    id: 'nr-first',
    at: 'drive-in',
    trigger: 'clock',
    when: { all: [{ flag: 'nr:crowd' }, { flag: 'nr:seen:banner' }, { flag: 'nr:seen:confetti' }, { flag: 'nr:seen:families' }], none: [{ flag: 'nr:first' }] },
    delayMs: 1200,
    do: [
      { a: 'flag', flag: 'nr:first' },
      { a: 'crowd', state: 'AFTERMATH' },
      { a: 'lines', lines: [{ who: null, text: '{anchor}.' }, { who: 'אפי', text: 'נו. בית?' }, { who: 'פוגי', text: 'שואלים אותי את זה עוד עשר שנים.' }] },
    ],
  },
  { id: 'nr-route', at: 'home', trigger: 'enter', when: { all: [{ flag: 'nr:hall' }], none: [{ flag: 'nr:route' }], any: [{ flag: 'nr:first' }, { notFlag: 'nr:prep' }] }, delayMs: 700, do: [{ a: 'talk', conversation: 'nr-route' }] },
]

/** the three answers at the new hall — the same for a man who was at the fence and one who was not */
const NR_HALL_CHOICES: ChoiceDef[] = [
          {
            id: 'short',
            text: '(זיכרון אחד קצר — ואז שיבחר מקום בעצמו.)',
            then: [
              { e: 'flag', flag: 'nr:hall' },
              // (תנ"ך מהדורה 2, N05) — הערב הראשון; `2024-home` חוזר אליו ("שורה שבע")
              { e: 'flag', flag: 'life:drivein:first-night' },
              { e: 'time', minutes: 20 },
              { e: 'rel', who: 'metuki', axis: 'bond', delta: 3 },
              { e: 'memory', item: 'folded-paper', id: 'nr-new-hall' },
              { e: 'toast', text: 'מתוקי: "אז איפה עומדים היום?" — "בוא נמצא."', tone: 'plain' },
            ],
          },
          {
            id: 'gatekeep',
            text: '(להתעקש על איך היה פעם.)',
            then: [
              { e: 'flag', flag: 'nr:hall' },
              // (תנ"ך מהדורה 2, N05) — הערב הראשון; `2024-home` חוזר אליו ("שורה שבע")
              { e: 'flag', flag: 'life:drivein:first-night' },
              { e: 'flagValue', flag: 'nr:gatekeeping', value: true },
              { e: 'rel', who: 'metuki', axis: 'bond', delta: -1 },
              { e: 'toast', text: 'אפי: "אתה מראה לו אולם או בודק אם הוא ראוי לו?" — "נסחפתי קצת."', tone: 'red' },
            ],
          },
          {
            id: 'ritual',
            text: '(לשמור את ההשוואה לעצמי, ולקבוע טקס חדש.)',
            then: [
              { e: 'flag', flag: 'nr:hall' },
              // (תנ"ך מהדורה 2, N05) — הערב הראשון; `2024-home` חוזר אליו ("שורה שבע")
              { e: 'flag', flag: 'life:drivein:first-night' },
              { e: 'flagValue', flag: 'nr:ritual', value: true },
              { e: 'rel', who: 'efi', axis: 'bond', delta: 3 },
              { e: 'redheart', key: 'terraceCulture', delta: 3 },
              { e: 'toast', text: 'אפי: "לפני משחק נפגשים פה?" — "כן. נקבע משהו משלנו."', tone: 'plain' },
            ],
          },
        ]

export const CONVERSATIONS_NEWHALL: Conversation[] = [
  {
    id: 'nr-prep',
    nameHe: 'אפי',
    branches: [
      {
        lines: [
          { who: null, text: 'האולם ריק. שלושת אלפים ארבע מאות כיסאות כחולים, ואף אחד עוד לא ישב על אחד מהם.' },
          { who: 'אפי', text: 'הקהל בשש וחצי. יש לנו שעה וקצת, ויותר משני דברים לעשות.' },
          { who: 'מתוקי', text: 'הבד הישן בתיק שלי. והנייר האדום. ומישהו צריך לעמוד בדלת.' },
          { who: 'אפי', text: 'ומישהו צריך למצוא לעצמו שורה. גם זה עבודה.' },
        ],
        then: [{ e: 'flag', flag: 'nr:prep' }, { e: 'time', minutes: 5 }],
      },
    ],
  },
  {
    id: 'nr-do-banner',
    nameHe: 'מתוקי',
    branches: [
      {
        when: { flag: 'life:uss:there' },
        lines: [
          { who: null, text: 'מתוקי פותח את התיק. הבד הישן — אותו אחד שיצא מאוסישקין מקופל, בבוקר עם האבק.' },
          { who: 'מתוקי', text: 'אתה היית שם כשהוצאנו אותו. אתה תולה.' },
        ],
        choices: [
          { id: 'hang', text: '(לטפס למעקה, ולתלות אותו מעל הכניסה.)', when: { beforeMinute: DOORS - PREP_MIN + 5 }, noteHe: 'אין מספיק זמן עד שהדלתות נפתחות.', then: [{ e: 'flag', flag: 'nr:did:banner' }, { e: 'flagValue', flag: 'life:drivein:banner', value: true }, { e: 'time', minutes: PREP_MIN }, { e: 'energy', delta: -6 }, { e: 'toast', text: 'הבד למעלה. הקצה השמאלי קצת עקום, ומתוקי אומר שככה היה גם שם.', tone: 'plain' }] },
          { id: 'later', text: '(לא עכשיו.)', then: [] },
        ],
      },
      {
        lines: [
          { who: null, text: 'מתוקי פותח את התיק. בד ישן, אדום שדהה לורוד בקפלים.' },
          { who: 'מתוקי', text: 'המעקה מעל הכניסה. מי שנכנס — רואה.' },
        ],
        choices: [
          { id: 'hang', text: '(לטפס למעקה, ולתלות אותו מעל הכניסה.)', when: { beforeMinute: DOORS - PREP_MIN + 5 }, noteHe: 'אין מספיק זמן עד שהדלתות נפתחות.', then: [{ e: 'flag', flag: 'nr:did:banner' }, { e: 'flagValue', flag: 'life:drivein:banner', value: true }, { e: 'time', minutes: PREP_MIN }, { e: 'energy', delta: -6 }, { e: 'toast', text: 'הבד למעלה. הקצה השמאלי קצת עקום, ומתוקי אומר שככה זה צריך להיות.', tone: 'plain' }] },
          { id: 'later', text: '(לא עכשיו.)', then: [] },
        ],
      },
    ],
  },
  {
    id: 'nr-do-confetti',
    nameHe: null,
    branches: [
      {
        lines: [{ who: null, text: 'שקית של נייר אדום, ומספריים. שלושת אלפים ארבע מאות כיסאות, ואתה עם זוג ידיים.' }],
        choices: [
          { id: 'cut', text: '(לגזור, ולפזר על המושבים מימין.)', when: { beforeMinute: DOORS - PREP_MIN + 5 }, noteHe: 'אין מספיק זמן עד שהדלתות נפתחות.', then: [{ e: 'flag', flag: 'nr:did:confetti' }, { e: 'time', minutes: PREP_MIN }, { e: 'energy', delta: -4 }, { e: 'toast', text: 'שלוש שורות אדומות. הרביעית נגמרה באמצע, וזה נראה מכוון.', tone: 'plain' }] },
          { id: 'later', text: '(לא עכשיו.)', then: [] },
        ],
      },
    ],
  },
  {
    id: 'nr-do-families',
    nameHe: 'אפי',
    branches: [
      {
        lines: [
          { who: 'אפי', text: 'יבואו היום משפחות שלא היו אף פעם. מישהו צריך להגיד להן איפה עומדים ואיפה שרים.' },
          { who: 'פוגי', text: 'ואיפה שרים?' },
          { who: 'אפי', text: 'זה בדיוק מה שנגלה היום.' },
        ],
        choices: [
          { id: 'door', text: '(לעמוד בדלתות, ולחכות להן.)', when: { beforeMinute: DOORS - PREP_MIN + 5 }, noteHe: 'אין מספיק זמן עד שהדלתות נפתחות.', then: [{ e: 'flag', flag: 'nr:did:families' }, { e: 'time', minutes: PREP_MIN }, { e: 'rel', who: 'efi', axis: 'trust', delta: 2 }, { e: 'redheart', key: 'community', delta: 2 }, { e: 'toast', text: 'שעה בדלת. בסוף ידעת לענות על השאלה "איפה השירותים" בלי לחשוב.', tone: 'plain' }] },
          { id: 'later', text: '(לא עכשיו.)', then: [] },
        ],
      },
    ],
  },
  {
    id: 'nr-do-seat',
    nameHe: null,
    branches: [
      {
        lines: [{ who: null, text: 'השורות מימין עוד ריקות. אחת מהן תהיה שלך, אם תבחר אותה לפני שהאולם יבחר בשבילך.' }],
        choices: [
          { id: 'sit', text: '(למצוא שורה — ולשבת. לא לעזור.)', when: { beforeMinute: DOORS - SEAT_MIN + 5 }, noteHe: 'הדלתות כבר נפתחות.', then: [{ e: 'flag', flag: 'nr:did:seat' }, { e: 'flagValue', flag: 'life:drivein:row', value: 'seven' }, { e: 'time', minutes: SEAT_MIN }, { e: 'energy', delta: 6 }, { e: 'rel', who: 'efi', axis: 'bond', delta: -1 }, { e: 'toast', text: 'שורה שבע, כיסא אחד מהמעבר. אפי עבר לידך פעמיים עם ארגז, ולא אמר כלום. זה גם משהו.', tone: 'plain' }] },
          { id: 'later', text: '(לא עכשיו.)', then: [] },
        ],
      },
    ],
  },
  {
    id: 'nr-check',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'ליד החניה, שלט של תחנה: שני קווים, ואחד מהם עובר גם בשבת בערב.' },
          { who: null, text: 'ומתחת, בכתב יד: ״הכביש לחניה נסגר אחרי משחקים — לצאת מהשער האחורי.״ דרך, וחלופה.' },
        ],
        then: [{ e: 'flag', flag: 'nr:checked' }, { e: 'time', minutes: 5 }],
      },
    ],
  },
  {
    id: 'nr-hall',
    nameHe: 'אפי',
    branches: [
      {
        /**
         * (delta 92, upgrade plan §10) the payoff of 25.7.2007: a man who stood at the fence
         * that morning hears Efi stop for a breath before the sentence. The words are the
         * same — the pause is the demolition, remembered.
         */
        when: { flag: 'life:uss:there' },
        lines: [
          { who: null, text: 'העירייה חנכה את האולם בדצמבר, עם מזוזה ומספריים, בלי אף אחד מאיתנו. הערב פותחים אותו אנחנו.' },
          { who: null, text: 'אפי עוצר רגע ליד הקו. לא מסתכל עליך. כמו מי שמחכה שיגידו לו שמותר.' },
          { who: 'אפי', text: 'פה יהיה לנו מקום.' },
          { who: 'פוגי', text: 'זה לא אוסישקין.' },
          { who: 'אפי', text: 'לא אמרתי שזה אוסישקין.' },
          { who: 'מתוקי', text: 'מותר לי לאהוב את זה בלי לעבור מבחן?' },
          { who: 'פוגי', text: 'כן. מגיע לך.' },
        ],
        choices: NR_HALL_CHOICES,
      },
      {
        lines: [
          { who: null, text: 'העירייה חנכה את האולם בדצמבר, עם מזוזה ומספריים, בלי אף אחד מאיתנו. הערב פותחים אותו אנחנו.' },
          { who: 'אפי', text: 'פה יהיה לנו מקום.' },
          { who: 'פוגי', text: 'זה לא אוסישקין.' },
          { who: 'אפי', text: 'לא אמרתי שזה אוסישקין.' },
          { who: 'מתוקי', text: 'מותר לי לאהוב את זה בלי לעבור מבחן?' },
          { who: 'פוגי', text: 'כן. מגיע לך.' },
        ],
        choices: NR_HALL_CHOICES,
      },
    ],
  },
  {
    id: 'nr-route',
    nameHe: 'קובי',
    branches: [
      {
        lines: [
          { who: 'קובי', text: 'מאיפה יוצאים?' },
          { who: 'פוגי', text: 'הפעם אני בדקתי.' },
          { who: 'קובי', text: 'גם אני פעם בדקתי.' },
          { who: 'פוגי', text: 'אז תן לי פעם אחת.' },
          { who: 'קובי', text: 'אני נותן. אני רק שואל שוב.' },
        ],
        choices: [
          {
            /**
             * (90-E, Stage D — "classify hard") **המשפט "הפעם אני בדקתי" צריך בדיקה מאחוריו.**
             * השלט בתחנה שליד הדרייב-אין (`nr-check`) הוא הבדיקה: שני קווים, וחלופה כשהכביש
             * נסגר. בלעדיו הבחירה אפורה, ושתי האחרות פתוחות — שום חיים לא נתקעים.
             */
            id: 'lead',
            text: '(מסלול, חלופה — ואני מוביל.)',
            when: { flag: 'nr:checked' },
            noteHe: 'עוד לא בדקת. בדרייב-אין, השלט בתחנה שליד החניה — משם יוצאים ומשם חוזרים.',
            then: [
              { e: 'flagValue', flag: 'life:route2015', value: 'led' },
              { e: 'flag', flag: 'nr:route' },
              { e: 'time', minutes: 45 },
              { e: 'energy', delta: -5 },
              { e: 'skill', skill: 'organization', delta: 3, why: 'מסלול, וגם מה עושים אם הוא ייסגר' },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 2 },
              { e: 'rel', who: 'kobi', axis: 'trust', delta: 3 },
              { e: 'proof', kind: 'travel_preparation', proofId: 'travel_preparation:{chapter}:route', subjectHe: 'הדרך למגרש החלופי', noteHe: 'שתי דרכים, והשנייה נבדקה לפני שיצאו.' },
              { e: 'presence', mode: 'inside' },
              { e: 'attend' },
              { e: 'toast', text: 'קובי: "לא רע." — "תשמור את המחמאה לסוף." — "בסוף אני אשכח שהתכוונתי."', tone: 'plain' },
              { e: 'ending', id: 'led' },
            ],
          },
          {
            id: 'sofa',
            text: '(הפעם רואים איתו בבית.)',
            then: [
              { e: 'flag', flag: 'nr:route' },
              { e: 'time', minutes: 90 },
              { e: 'energy', delta: -5 },
              { e: 'rel', who: 'kobi', axis: 'bond', delta: 3 },
              { e: 'presence', mode: 'television' },
              { e: 'ending', id: 'sofa' },
            ],
          },
          {
            id: 'solo',
            text: '"אני מגיע לבד. אמרתי לך מראש."',
            then: [
              { e: 'flag', flag: 'nr:route' },
              { e: 'flagValue', flag: 'nr:temporaryHome', value: 'solo' },
              { e: 'personality', key: 'honesty', delta: 2 },
              { e: 'presence', mode: 'inside' },
              { e: 'attend' },
              { e: 'ending', id: 'solo' },
            ],
          },
        ],
      },
    ],
  },
]
