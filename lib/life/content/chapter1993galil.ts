import { at } from '../clock'
import type { LifeState } from '../types'

import type { Beat } from './beats'
import type { EndingCard } from './chapter1986'
import type { Conversation } from './script'

/**
 * נושא אחד לשני הצדדים של אותה הבטחה.
 *
 * מי שאמר "מה שלא יהיה" ובא — `promise_kept`. מי שאמר ולא בא — `breach_discovered`.
 * שתיהן נושאות את המחרוזת הזאת בדיוק, כי ההישגים מצליבים **נושא** ולא מפתח: התיקון
 * ב-1999 חייב למצוא את ההפרה של 1993, ומחרוזת שנכתבה פעמיים היא מחרוזת שתיפרד.
 */
export const GALIL_PROMISE = 'ההבטחה לאפי על המשחק בצפון'

/**
 * ההפרש ששחור השלים, כמספר.
 *
 * *"הילד של הבד נוסע. את ההפרש אני משלים."* — שלושים שקל, ואותם שלושים נפרעים ב-1999.
 */
const SHACHOR_AGOROT = 3000

/**
 * B4 · "הבית נשבר" · 9–19.5.1993 — the championship that was supposed to follow the cup.
 *
 * One escalating arc over four evenings, not four matches: the first game in their own
 * hall, which they lose and cannot believe; the second, away, heard through a radio in
 * a kitchen; the third, home, won big — and a boy who promises too much about the
 * fourth; the fourth, far north, where getting there IS the game. The aftermath is in
 * the corner outside Ussishkin, where Shachor stacks chairs and Efi does not speak.
 *
 * The series is first-to-three, not four games — the archive's four rows end on one
 * marked המכריע, and no line here counts a game that was never played. The two archive
 * details the lines do borrow are the hall itself (`ussishkin.json`: two thousand seats,
 * a low tin roof, the buffet's seeds and sausages, "כבר בכניסה קבוצות היו עם מינוס
 * עשר") and the last championship, 1968/69 — twenty-four years before this one, which
 * is Soko's line and nobody else's.
 *
 * Days inside a chapter are `day.entered` events dispatched by beats. A day clears the
 * afternoon's flags, so every day marker is a `life:` flag and every beat says which day
 * it belongs to. **No line here states a score, a margin or an opponent's name.**
 */

export const D1 = 'life:galil:d1'
export const D2 = 'life:galil:d2'
export const D3 = 'life:galil:d3'
export const D4 = 'life:galil:d4'
/**
 * `went:galil-*` — the three flags this chapter has to carry past midnight, and the
 * reason they are spelled with the chapter's name in them.
 *
 * The Galil day ends and `DAY(D5, …)` opens the morning after, where `after-close`
 * decides which of four endings the chapter printed. `personFlags()` in `events.ts`
 * empties the save at every day change except for a named set of prefixes — so the
 * original `g4:bus` / `g4:radio` / `arrived:late` were gone before the scene that reads
 * them ever ran, and this chapter produced `heard` on 200 runs out of 200 with three
 * endings written and unreachable. Found by simulation on 15.9.2026, not by reading.
 *
 * The first fix was to rename them all to `went:`, globally, and it was WRONG in a way
 * worth recording: `went:` also survives `year.entered`, so a late arrival in 1993 stayed
 * lit through 1996, 1998 and 2000. It faked every `late` ending in `1999-cup` (44 of 44
 * came from the stale flag, not from a choice in 1999) and it permanently blocked this
 * chapter's own `inside`, which tests `none: ['went:late']`. A flag that outlives its
 * question stops being a memory and becomes a lie.
 *
 * So the survival is scoped to the thing it is about. The three chapters that also used
 * `arrived:late` — `1993-cup`, `1999-cup`, `2000-double` — contain no `DAY()` at all, so
 * they never needed it to survive anything and kept the day-scoped name.
 */
export const D5 = 'life:galil:after'

export const PORTRAIT_GALIL: Record<string, string> = {
  'מישל': 'faceMichel',
  'אסף': 'faceAsaf',
  'פוגי': 'faceHero80',
  'קובי': 'faceKobi',
  'רחל': 'faceRachel90',
  'אפי': 'faceEfi',
  'לימור': 'faceLimor',
  'אופיר': 'faceOfir',
  'עמית': 'faceAmit',
  'שחור': 'faceShachor',
  'סוקו': 'faceSoko',
  'אוהד': 'faceSupporter',
  'אוהד ותיק': 'faceOldMan',
  'סדרן': 'faceUsher',
  // שני הקבועים של אלנבי — שני השחקנים האלה מתויגים `era: '*'` ב-`scenes.ts`, כלומר הם
  // עומדים שם בכל פרק, ולכן כל מפה צריכה את הפלייטים שלהם.
  'המוכר': 'faceVendor',
  'הגבר': 'faceSupporterB',
}

export function objectiveGalil(state: LifeState, sceneId: string): string | null {
  if (state.chapterDone) return null
  if (state.flags[D5]) return state.flags['after:done'] ? null : 'הפינה של אוסישקין. אחרי.'
  if (state.flags[D4]) {
    if (state.flags['g4:decided']) return null
    return 'המשחק הרביעי. בצפון. איך מגיעים?'
  }
  if (state.flags[D3]) return sceneId === 'ussishkin-hall' ? null : 'המשחק השלישי. הביתה, לאולם.'
  if (state.flags[D2]) return 'משחק חוץ. הרדיו במטבח.'
  return sceneId === 'ussishkin-hall' ? null : 'המשחק הראשון. בבית.'
}

export const ENDINGS_GALIL: Record<string, EndingCard> = {
  inside: {
    id: 'inside',
    titleHe: 'הגביע היה אמיתי',
    bodyHe:
      'הייתם שם, בצפון, בסוף. ראית את זה נגמר מקרוב, וראית פנים של אנשים שלא הכרת ושאתה יכול לצייר בעל פה. בדרך חזרה האוטובוס היה שקט כמו כיתה בבחינה. מישל לא פתח את הפנקס. אפי ישן, או העמיד פנים.',
    memoryHe: 'פתק הנסיעה, מקופל ארבע. עליו, בכתב של מישל, שעת היציאה. שום דבר על שעת החזרה.',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
  late: {
    id: 'late',
    titleHe: 'הגעת. מאוחר.',
    bodyHe:
      'האוטובוס איחר, או הטרמפ, או אתה. הגעת לאולם בצפון כשהמשחק כבר ידע איך הוא נגמר. עמדת בכניסה ושמעת מבפנים את הדבר שלא רצית, ואז נכנסת בכל זאת — כי לנסוע עד לשם ולא להיכנס, זה לא.',
    memoryHe: 'חצי כרטיס נסיעה, מוחתם במקום שלא היית בו קודם ולא תדע להגיע אליו שוב.',
    memoryItem: 'ticket-stub',
    presence: 'late',
  },
  radio: {
    id: 'radio',
    titleHe: 'מהמטבח',
    bodyHe:
      'שמעת את זה ברדיו, במטבח, עם אמא שעשתה שהיא לא מקשיבה ואבא שעשה שהוא קורא. כשזה נגמר הרדיו המשיך לדבר על משהו אחר, ואתה ישבת מול הטרנזיסטור עד שהוא נגמר לבד. "היה משחק טוב," אמא אמרה. היא לא שמעה משחק.',
    memoryHe: 'הטרנזיסטור. אתה יודע איפה התחנה בלי להסתכל, לפי הסדק בחוגה.',
    memoryItem: 'transistor',
    presence: 'radio',
  },
  heard: {
    id: 'heard',
    titleHe: 'מפי אפי',
    bodyHe:
      'לא נסעת ולא שמעת. אפי סיפר לך למחרת, בחצר, בשלושה משפטים. בשלישי הקול שלו נשבר והוא הפסיק. לא שאלת עוד. את השאר ידעת מהפנים של כולם.',
    memoryHe: 'כלום. אבל שלושה משפטים של אפי, ואחד שהוא לא סיים.',
    memoryItem: 'folded-paper',
    presence: 'heard-from-friend',
  },
}

const DAY = (flag: string, year: number, weekday: number, minute: number, dateHe?: string) =>
  [{ t: 'day.entered', dayId: flag, year, weekday, minute, ...(dateHe ? { dateHe } : {}) } as const, { t: 'flag.raised', flag } as const]

export const BEATS_GALIL: Beat[] = [
  // ------------------------------------------------------------------ day 1 · game 1 ---
  {
    id: 'g1-open',
    at: 'ussishkin-outside',
    trigger: 'enter',
    // `D1` too: the corner is walked back into before the hall, and the opening was said
    // again every time (an `enter` beat whose `when` still holds is armed again)
    when: { none: [{ flag: D1 }, { flag: D2 }, { flag: D3 }, { flag: D4 }, { flag: D5 }] },
    delayMs: 700,
    do: [
      { a: 'flag', flag: D1 },
      {
        a: 'lines',
        lines: [
          { who: null, text: 'שלושה שבועות אחרי הגביע. אותה פינה, אותם אנשים, ואוויר אחר לגמרי: זה כבר לא חג, זו סדרה.' },
          { who: 'אפי', text: 'הראשון לשלושה ניצחונות לוקח הכול. ואנחנו בבית ראשונים. מה כבר יכול לקרות.' },
          { who: 'לימור', text: 'אל תגיד "מה כבר יכול לקרות". זה משפט שהמשחקים שומעים.' },
        ],
      },
    ],
  },
  {
    id: 'g1-hall',
    at: 'ussishkin-hall',
    trigger: 'enter',
    when: { flag: D1, none: [{ flag: D2 }] },
    delayMs: 900,
    do: [
      { a: 'card', titleHe: 'משחק 1', subHe: 'אוסישקין', ms: 2200 },
      { a: 'match', script: 'galil-93-g1' },
      { a: 'lines', lines: [{ who: null, text: 'הצפירה. האולם לא מבין. אנשים עומדים ולא יוצאים, כאילו אם לא יוצאים זה לא נגמר.' }, { who: 'אפי', text: 'זה רק אחד. עוד לא קרה כלום.' }, { who: null, text: 'הוא אמר את זה לעצמו. לא לך.' }] },
      { a: 'events', events: DAY(D2, 1993, 3, at(19, 30), '12 במאי 1993') },
      { a: 'card', titleHe: 'יום רביעי', subHe: 'משחק 2 · בחוץ', ms: 2400 },
      { a: 'travel', to: 'kitchen', spawn: 'start' },
    ],
  },
  // ------------------------------------------------------------------ day 2 · game 2 ---
  {
    /**
     * משחק 2 — the away night, and it stopped being a corridor.
     *
     * `g2-kitchen` fired on entering the kitchen and forced the radio, so one of the four
     * games in an escalating series was a cutscene. Stage B §7 B4 asks that attendance
     * compete with school, family and money, and that "hearing it on the way" be a real
     * state and not flavour. It is a decision now, taken in the street before the kitchen:
     * a coach is going north and there is a seat on it, there is homework that is due, and
     * there is a father at a kitchen table with a transistor. All three are real, and one
     * afternoon buys one of them.
     */
    id: 'g2-open',
    at: 'street',
    trigger: 'enter',
    when: { flag: D2, none: [{ flag: 'g2:chose' }, { flag: D3 }, { flag: 'g2:seen' }] },
    delayMs: 700,
    /**
     * (Director V3 §12, 25.9.2026) "travel logistics + scarce seats". The Wednesday is no
     * longer a box with three answers: the coach stands in the street with Michel beside it
     * and ONE seat (`g2-coach` → `g2-choose`), the transistor is on the kitchen table
     * (`radio-g2`), and a boy who does neither is the one drifting until it starts
     * (`g2-drift`). Where he goes is what he chose.
     */
    do: [
      { a: 'flag', flag: 'g2:seen' },
      { a: 'lines', lines: [{ who: null, text: 'יום רביעי. משחק שני, אצלם, בצפון. ברחוב עומדת הסעה קטנה ולידה מישל עם הפנקס.' }, { who: null, text: 'בתיק יש מחברת עם שיעורים למחר. בבית יש אבא עם טרנזיסטור.' }] },
    ],
  },
  {
    id: 'g2-drift',
    trigger: 'clock',
    when: { flag: D2, afterMinute: at(21, 0), none: [{ flag: 'g2:chose' }, { flag: D3 }] },
    do: [
      { a: 'events', events: [{ t: 'flag.raised', flag: 'g2:chose' }, { t: 'flag.raised', flag: 'g2:home' }, { t: 'flag.raised', flag: 'g2:drifted' }, { t: 'wellbeing.changed', key: 'loneliness', delta: 3 }] },
      { a: 'toast', text: 'הסתובבת שעה וחצי ובסוף חזרת הביתה בדיוק כשהתחיל.', tone: 'plain' },
      { a: 'travel', to: 'kitchen', spawn: 'start' },
    ],
  },
  {
    /** whichever way it went, the evening resolves and the next day starts */
    id: 'g2-kitchen',
    at: 'kitchen',
    // clock, not enter: the Wednesday starts in this kitchen, and the radio on the table is
    // what decides (`radio-g2`) — the room plays it once he has sat down to it
    trigger: 'clock',
    when: { all: [{ flag: D2 }, { flag: 'g2:home' }], none: [{ flag: D3 }] },
    delayMs: 700,
    do: [
      { a: 'sound', kind: 'radio', on: true },
      { a: 'talk', conversation: 'g2-radio' },
      { a: 'sound', kind: 'radio', on: false },
      { a: 'events', events: DAY(D3, 1993, 0, at(18, 0), '16 במאי 1993') },
      { a: 'card', titleHe: 'יום ראשון', subHe: 'משחק 3 · אוסישקין', ms: 2400 },
      { a: 'travel', to: 'ussishkin-outside', spawn: 'start' },
    ],
  },
  {
    /** the coach north: the result arrives on the road, through somebody else's radio */
    id: 'g2-coach',
    trigger: 'clock',
    when: { all: [{ flag: D2 }, { flag: 'g2:coach' }], none: [{ flag: D3 }] },
    delayMs: 900,
    do: [
      { a: 'talk', conversation: 'g2-road' },
      { a: 'events', events: DAY(D3, 1993, 0, at(18, 0), '16 במאי 1993') },
      { a: 'card', titleHe: 'יום ראשון', subHe: 'משחק 3 · אוסישקין', ms: 2400 },
      { a: 'travel', to: 'ussishkin-outside', spawn: 'start' },
    ],
  },
  {
    id: 'g3-hall',
    at: 'ussishkin-hall',
    trigger: 'enter',
    when: { flag: D3, none: [{ flag: D4 }] },
    delayMs: 900,
    do: [
      { a: 'card', titleHe: 'משחק 3', subHe: 'אוסישקין', ms: 2200 },
      { a: 'match', script: 'galil-93-g3' },
      { a: 'events', events: DAY(D4, 1993, 3, at(14, 0), '19 במאי 1993') },
      { a: 'card', titleHe: 'יום רביעי', subHe: 'משחק 4 · בצפון', ms: 2600 },
      { a: 'travel', to: 'street', spawn: 'start' },
    ],
  },
  // ------------------------------------------------------------------ day 4 · game 4 ---
  {
    id: 'g4-open',
    at: 'street',
    trigger: 'enter',
    /**
     * `g4:opened` — 7.9.2026, and a hole you could have printed money through.
     *
     * A beat re-arms when its own `when` is still true after it finishes, which is the rule
     * that stops a conversation the player walked out of from vanishing for good. This beat
     * did not change any of the three flags it is gated on, so it re-armed every single
     * time — and it hands over forty-five shekels. Walk out of the street and back in on the
     * fourth day of 1993 and you were paid again. And again.
     *
     * The fix is its own flag, and the general one is `tests/life-checkpoint.test.ts`, which
     * now refuses any beat that grants something permanent without gating on something it
     * raises itself.
     */
    when: { flag: D4, none: [{ flag: D5 }, { flag: 'g4:decided' }, { flag: 'g4:opened' }] },
    delayMs: 700,
    do: [
      { a: 'flag', flag: 'g4:opened' },
      { a: 'events', events: [{ t: 'money.changed', agorot: 4500, why: 'מה שיש בכיס באמצע שבוע' }] },
      { a: 'lines', lines: [{ who: null, text: 'המשחק המכריע. שלוש שעות נסיעה צפונה, ואף אחד לא מסדר לך אותן.' }, { who: null, text: 'יש אוטובוס מאורגן מהפינה בארבע, למי שנרשם. יש בן דוד של אופיר עם אוטו, אם יש כסף לדלק. ויש מטבח עם רדיו.' }] },
    ],
  },
  // four o'clock: the bus leaves; five: the car; eight: the radio
  {
    id: 'g4-bus-gone',
    trigger: 'clock',
    // `g4:bus-gone` in its own guard (25.9.2026): re-armed on every tick, this beat starved
    // the eight o'clock backstop after it — a boy who missed the bus and chose nothing was
    // never told the night was over, and never reached the corner the day after
    when: { flag: D4, afterMinute: at(16, 10), none: [{ flag: 'g4:decided' }, { flag: 'g4:bus-gone' }] },
    do: [{ a: 'toast', text: 'ארבע ועשרה. האוטובוס המאורגן יצא מלא. מי שלא היה עליו כבר לא יהיה.', tone: 'red' }, { a: 'flag', flag: 'g4:bus-gone' }],
  },
  {
    id: 'g4-radio-time',
    trigger: 'clock',
    when: { flag: D4, afterMinute: at(20, 0), none: [{ flag: 'g4:decided' }] },
    do: [{ a: 'flag', flag: 'g4:decided' }, { a: 'flag', flag: 'g4:heard' }, { a: 'lines', lines: [{ who: null, text: 'שמונה. לא נסעת, וגם לא הדלקת. איפשהו רחוק זה קורה עכשיו בלעדיך, ואת השאר תשמע מחר בחצר.' }] }, { a: 'events', events: DAY(D5, 1993, 4, at(18, 30), '20 במאי 1993') }, { a: 'card', titleHe: 'למחרת', subHe: 'הפינה', ms: 2400 }, { a: 'travel', to: 'ussishkin-outside', spawn: 'start' }],
  },
  // the night ends however it ended; the next evening is the corner
  {
    id: 'g4-to-after',
    trigger: 'clock',
    when: { flag: 'g4:cut', none: [{ flag: D5 }] },
    do: [{ a: 'events', events: DAY(D5, 1993, 4, at(18, 30), '20 במאי 1993') }, { a: 'card', titleHe: 'למחרת', subHe: 'הפינה', ms: 2400 }, { a: 'travel', to: 'ussishkin-outside', spawn: 'start' }],
  },
  // ------------------------------------------------------------------ the aftermath ---
  {
    id: 'after-open',
    at: 'ussishkin-outside',
    trigger: 'enter',
    when: { flag: D5, none: [{ flag: 'after:done' }, { flag: 'after:open' }] },
    delayMs: 800,
    do: [
      { a: 'talk', conversation: 'after-galil' },
    ],
  },
  /** and the corner does end: at nine, Efi comes over himself */
  {
    id: 'after-late',
    at: 'ussishkin-outside',
    trigger: 'clock',
    when: { flag: D5, afterMinute: at(21, 0), none: [{ flag: 'after:done' }] },
    do: [{ a: 'talk', conversation: 'after-efi' }],
  },
]

export const CONVERSATIONS_GALIL: Conversation[] = [
  {
    id: 'g2-choose',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: 'מישל', text: 'שלושים שקל, יוצאים בארבע, חוזרים אחרי חצות. יש מקום אחד.' },
        ],
        choices: [
          {
            id: 'coach',
            text: 'לעלות. שלושים שקל.',
            when: { minAgorot: 3000 },
            noteHe: 'אין שלושים.',
            then: [
              { e: 'money', agorot: -3000, why: 'הסעה לצפון' },
              { e: 'flag', flag: 'g2:chose' },
              { e: 'flag', flag: 'g2:coach' },
              { e: 'flag', flag: 'hw:missed' },
              { e: 'rel', who: 'crowd-limor', axis: 'bond', delta: 3 },
              { e: 'redheart', key: 'travelDrive', delta: 5 },
              { e: 'time', minutes: 120 },
            ],
          },
          { id: 'not', text: 'לא. המקום של מישהו אחר.', then: [] },
        ],
      },
    ],
  },
  {
    /** the transistor on the kitchen table, on the Wednesday — staying is sitting down to it */
    id: 'g2-radio-on',
    nameHe: null,
    branches: [
      {
        lines: [{ who: null, text: 'הטרנזיסטור על השולחן, האנטנה מכוונת צפונה. מהסלון, אבא: "עוד רבע שעה."' }],
        choices: [
          {
            id: 'home',
            text: 'להישאר. שיעורים, ואבא ליד הרדיו.',
            then: [
              { e: 'flag', flag: 'g2:chose' },
              { e: 'flag', flag: 'g2:home' },
              { e: 'rel', who: 'kobi', axis: 'sharedHistory', delta: 2 },
              { e: 'personality', key: 'responsibility', delta: 3 },
            ],
          },
          { id: 'later', text: 'עוד לא.', then: [] },
        ],
      },
    ],
  },
  {
    /**
     * לשמוע את זה בדרך — the state the brief asks for and the game did not have: the
     * result arriving on a road, out of somebody else's radio, before anybody involved
     * has stopped driving.
     */
    id: 'g2-road',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'ההסעה. שתים־עשרה מושבים, אחד־עשר אנשים, ונהג ששם תחנה שהוא אוהב ולא זזה משם.' },
          { who: null, text: 'בחצי הדרך מישהו מאחור הרים טרנזיסטור לאוזן ואמר "רגע". כל האוטובוס נהיה שקט בבת אחת, ואז הוא אמר את זה.' },
          { who: null, text: 'עוד שעה וחצי נסיעה, ואף אחד לא כיבה את המנוע ואף אחד לא דיבר.' },
        ],
        choices: [
          {
            id: 'sit',
            text: 'לשבת ולהסתכל בחלון.',
            then: [{ e: 'presence', mode: 'travelling' }, { e: 'wellbeing', key: 'regret', delta: 3 }, { e: 'redheart', key: 'travelDrive', delta: 3 }],
          },
          {
            id: 'ledger',
            text: 'לשאול את מישל מה כתוב בפנקס.',
            then: [
              { e: 'presence', mode: 'travelling' },
              { e: 'rel', who: 'crowd-limor', axis: 'trust', delta: 4 },
              { e: 'redheart', key: 'community', delta: 3 },
              { e: 'toast', text: '"מי נסע, מי איחר, כמה עלה." היא הראתה לך את העמוד ולא אמרה כלום על התוצאה.', tone: 'plain' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'efi-galil',
    nameHe: 'אפי',
    branches: [
      // (V3 §12) the day after, walking up to him IS the conversation the evening is about
      { when: { flag: D5 }, lines: [{ who: 'אפי', text: '…' }, { who: null, text: 'הוא לא מדבר. עוד לא. ואז הוא מסתכל עליך.' }], then: [{ e: 'goto', node: 'after-efi' }] },
      { when: { flag: D4 }, lines: [{ who: 'אפי', text: 'אני על האוטובוס בארבע. תהיה עליו.' }] },
      { when: { flag: D3 }, lines: [{ who: 'אפי', text: 'הערב. הבית. אין ברירה, וזה טוב שאין.' }] },
      { lines: [{ who: 'אפי', text: 'הראשון לשלושה ניצחונות. ואנחנו בבית ראשונים. מה כבר יכול לקרות.' }] },
    ],
  },
  // (25.9.2026) `shachor-galil` became `after-shachor-galil`: the same two lines, and the chairs
  // --------------------------------------------------------------------- game 1 ---
  {
    id: 'g1-inside',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'אלפיים מקומות, ובתוכם יותר. הגג הנמוך מחזיר עליך את כל הרעש, והמזנון מריח מגרעינים ומנקניקיות.' },
          { who: 'לימור', text: 'איפה עומדים? למעלה רואים הכל. למטה מרגישים הכל.' },
        ],
        choices: [
          { id: 'high', text: 'למעלה. לראות.', then: [{ e: 'flag', flag: 'g1:high' }, { e: 'personality', key: 'curiosity', delta: 1 }, { e: 'goto', node: 'g1-turn' }] },
          { id: 'low', text: 'למטה. להרגיש.', then: [{ e: 'flag', flag: 'g1:low' }, { e: 'redheart', key: 'terraceCulture', delta: 2 }, { e: 'goto', node: 'g1-turn' }] },
          { id: 'efi', text: 'איפה שאפי.', then: [{ e: 'rel', who: 'efi', axis: 'bond', delta: 2 }, { e: 'goto', node: 'g1-turn' }] },
        ],
      },
    ],
  },
  {
    id: 'g1-turn',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'האולם מנסה. שר חזק יותר, ואז עוד יותר חזק, ואז מגלה שיש רמת רעש שממנה זה כבר לא עוזר.' },
          { who: null, text: 'מאחוריך מישהו ותיק אומר לשכן שלו: "פה קבוצות נכנסות עם מינוס עשר." הוא אומר את זה בלשון עבר.' },
          { who: 'אפי', text: 'זה יתהפך. זה תמיד מתהפך אצלנו.' },
          { who: null, text: 'זה לא התהפך.' },
        ],
        then: [{ e: 'wellbeing', key: 'stress', delta: 6 }],
      },
    ],
  },
  // --------------------------------------------------------------------- game 2 ---
  {
    id: 'g2-radio',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'המטבח. הטרנזיסטור על השולחן, האנטנה מכוונת צפונה כאילו זה עוזר. אמא מקלפת משהו שלא צריך קילוף.' },
          { who: 'קובי', text: 'שמעתי שהפסדתם בבית.' },
          { who: 'פוגי', text: 'הפסדנו.' },
          { who: 'קובי', text: '"הפסדנו." טוב. אז זה כבר "אנחנו".' },
          { who: null, text: 'השדר צועק לפני שקורה משהו ומשתתק כשקורה. אתה לומד לשמוע את המשחק דרך השתיקות שלו.' },
        ],
        choices: [
          { id: 'stay', text: 'להישאר ליד הרדיו עד הסוף.', then: [{ e: 'flag', flag: 'g2:radio' }, { e: 'rel', who: 'kobi', axis: 'sharedHistory', delta: 3 }, { e: 'goto', node: 'g2-end' }] },
          { id: 'call', text: 'לרוץ לטלפון. אפי.', then: [{ e: 'flag', flag: 'g2:phone' }, { e: 'rel', who: 'efi', axis: 'bond', delta: 3 }, { e: 'goto', node: 'g2-end' }] },
          { id: 'off', text: 'לכבות. לא יכול.', then: [{ e: 'flag', flag: 'g2:off' }, { e: 'personality', key: 'impulsiveness', delta: 2 }, { e: 'wellbeing', key: 'stress', delta: 4 }, { e: 'goto', node: 'g2-end' }] },
        ],
      },
    ],
  },
  {
    id: 'g2-end',
    nameHe: null,
    branches: [
      {
        when: { flag: 'g2:off' },
        lines: [{ who: null, text: 'אמא הדליקה בחזרה אחרי עשר דקות. "אני רוצה לדעת," היא אמרה. לא ידעת שהיא רוצה.' }, { who: null, text: 'השתיקה של השדר בסוף אמרה הכל. שניים מאחור.' }],
        then: [{ e: 'wellbeing', key: 'stress', delta: 4 }],
      },
      {
        lines: [{ who: null, text: 'השתיקה של השדר בסוף אמרה הכל. שניים מאחור, ומשחק אחד בבית להציל את זה.' }, { who: 'קובי', text: 'ביום ראשון אתה הולך?' }, { who: 'פוגי', text: 'ביום ראשון אני הולך.' }, { who: 'קובי', text: 'יופי.' }],
        then: [{ e: 'wellbeing', key: 'stress', delta: 3 }],
      },
    ],
  },
  // --------------------------------------------------------------------- game 3 ---
  {
    id: 'g3-inside',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'הרבע האחרון כבר לא משחק. הוא מסיבה. הסדרן ויתר על כל מי שעומד על הכיסאות.' },
          { who: null, text: 'למעלה, מתחת לגג, האוויר נגמר. אף אחד לא יוצא לנשום.' },
          { who: null, text: 'הצפירה. שחור מרים את לימור באוויר. אפי בוכה וצוחק וטוען שלא.' },
          { who: 'אפי', text: 'יום רביעי בצפון. אנחנו באים, כולנו.' },
          { who: 'לימור', text: 'אפי. שלוש שעות נסיעה. תשעים שקל. אמצע שבוע.' },
        ],
        choices: [
          { id: 'promise', text: '"אני בא. מה שלא יהיה."', then: [{ e: 'flag', flag: 'life:promise:g4' }, { e: 'personality', key: 'impulsiveness', delta: 3 }, { e: 'rel', who: 'efi', axis: 'bond', delta: 4 }, { e: 'toast', text: 'מישל רשם משהו בפנקס. אולי את זה.', tone: 'plain' }] },
          { id: 'signup', text: '"תרשמי אותי לאוטובוס." (לימור)', then: [{ e: 'flag', flag: 'life:signed:bus' }, { e: 'personality', key: 'responsibility', delta: 2 }, { e: 'rel', who: 'crowd-limor', axis: 'trust', delta: 3 }, { e: 'toast', text: 'שם, שעה, "ארבע בפינה". רשום.', tone: 'plain' }] },
          { id: 'quiet', text: 'לשתוק. לחגוג את הערב הזה.', then: [{ e: 'personality', key: 'reliability', delta: 1 }, { e: 'wellbeing', key: 'happiness', delta: 6 }] },
        ],
      },
    ],
  },
  // --------------------------------------------------------------------- game 4 ---
  {
    /**
     * ההסעה היא של מישל.
     *
     * הצומת הזה — מי רשום, תשעים שקל בעלייה, מי סופר את הראשים, ומה קורה למי שלא
     * הספיק — היה כתוב על לימור. זו עבודתו של מישל בר־כליפא, שהיה האיש שאחראי בפועל
     * על הסעות האוהדים בשנות השמונים והתשעים (מאור הראל, ידע אישי, 15.9.2026).
     * לימור שומרת את מה שתמיד היה שלה: הכניסה מהצד, התור, ומי שמכיר את הסדרן.
     */
    id: 'g4-michel',
    nameHe: 'מישל',
    branches: [
      {
        when: { flag: 'g4:bus-gone' },
        lines: [{ who: 'מישל', text: 'יצא. בארבע ועשרה, כמו שאמרתי. יש רכבת? אין רכבת. יש טרמפ. יש רדיו.' }],
      },
      {
        when: { flag: 'life:signed:bus' },
        lines: [{ who: 'מישל', text: 'אתה רשום. תשעים שקל בעלייה. אני לא מלווה, אני רק סופר. יש לך?' }],
        choices: [
          { id: 'pay', text: 'לשלם. לעלות.', when: { minAgorot: 9000 }, noteHe: 'אין תשעים שקל.', then: [{ e: 'money', agorot: -9000, why: 'אוטובוס לצפון' }, { e: 'flag', flag: 'g4:decided' }, { e: 'flag', flag: 'went:galil-bus' }, { e: 'time', minutes: 200 }, { e: 'goto', node: 'g4-north' }] },
          { id: 'broke', text: 'אין לי.', then: [{ e: 'goto', node: 'g4-broke' }] },
        ],
      },
      {
        /**
         * מי שלא נרשם — and had one unusable choice until 5.9.2026.
         *
         * This branch offered exactly one thing to do, and it needed ninety shekels. A
         * player who had not signed up and did not have ninety was shown a menu with
         * nothing on it: the top-up (`g4-broke`) was only reachable THROUGH the
         * signed-up branch, so the one act of generosity in this chapter was locked
         * behind a form he had not filled in three days earlier. Asking is now a thing
         * you can do standing here.
         */
        lines: [{ who: 'מישל', text: 'לא נרשמת. יש מקום אחד אם מישהו לא יגיע. תשעים שקל. תחכה פה עד ארבע ותראה.' }],
        choices: [
          { id: 'wait', text: 'לחכות ולקוות.', when: { minAgorot: 9000 }, noteHe: 'אין תשעים שקל.', then: [{ e: 'money', agorot: -9000, why: 'אוטובוס לצפון' }, { e: 'flag', flag: 'g4:decided' }, { e: 'flag', flag: 'went:galil-bus' }, { e: 'flag', flag: 'went:galil-late' }, { e: 'time', minutes: 230 }, { e: 'goto', node: 'g4-north' }] },
          { id: 'ask', text: 'להגיד שאין לי, ולעמוד שם.', then: [{ e: 'goto', node: 'g4-broke' }] },
          { id: 'no', text: 'לא.', then: [] },
        ],
      },
    ],
  },
  {
    id: 'g4-broke',
    nameHe: null,
    branches: [
      {
        when: { relationship: { who: 'shachor', axis: 'bond', min: 5 } },
        lines: [{ who: null, text: 'שחור, מאחור, בלי להרים את הראש: "הילד של הבד נוסע. את ההפרש אני משלים." לימור לא התווכחה, רק רשמה.' }],
        then: [{ e: 'flag', flag: 'g4:decided' }, { e: 'flag', flag: 'went:galil-bus' }, { e: 'flag', flag: 'owe:shachor' }, { e: 'debt', agorot: SHACHOR_AGOROT, why: 'ההפרש ששחור השלים לאוטובוס' }, { e: 'redheart', key: 'community', delta: 4 }, { e: 'time', minutes: 200 }, { e: 'goto', node: 'g4-north' }],
      },
      {
        lines: [{ who: null, text: 'לימור הנהנה. "אז רדיו. אין בושה ברדיו." יש קצת.' }],
      },
    ],
  },
  {
    id: 'g4-ofir',
    nameHe: 'אופיר',
    branches: [
      {
        when: { flag: 'g4:decided' },
        lines: [{ who: 'אופיר', text: 'החלטת? יופי. אני לא אוהב אנשים שלא מחליטים.' }],
      },
      {
        lines: [
          { who: 'אופיר', text: 'לבן דוד שלי יש אוטו. הוא לא אוהד, הוא אוהב לנסוע. שלושים שקל דלק ואתה נוסע, ואנחנו יוצאים בחמש.' },
          { who: 'אופיר', text: 'ואם הוא מאחר, הוא מאחר. זה בן דוד, לא אוטובוס.' },
        ],
        choices: [
          { id: 'car', text: 'שלושים שקל. נוסעים.', when: { minAgorot: 3000 }, noteHe: 'אין שלושים.', then: [{ e: 'money', agorot: -3000, why: 'דלק לבן דוד' }, { e: 'flag', flag: 'g4:decided' }, { e: 'flag', flag: 'g4:car' }, { e: 'rel', who: 'ofir', axis: 'sharedHistory', delta: 4 }, { e: 'time', minutes: 240 }, { e: 'goto', node: 'g4-car' }] },
          { id: 'no', text: 'לא הפעם.', then: [] },
        ],
      },
    ],
  },
  {
    id: 'g4-car',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'בן הדוד איחר. עשרים דקות, ואז עוד עשר. אחר כך נסע כאילו הוא מנסה להחזיר אותן.' },
          { who: null, text: 'הצפון בחלון: ירוק, ואז יותר ירוק, ואז חושך. עמית מאחור עם הטרנזיסטור מדווח על משחק שעוד לא התחיל.' },
          { who: null, text: 'הגעתם כשכולם כבר בפנים. הסדרן הסתכל על שלושה ילדים מתל אביב ופתח את הדלת בלי לשאול.' },
        ],
        then: [{ e: 'flag', flag: 'went:galil-late' }, { e: 'redheart', key: 'travelDrive', delta: 4 }, { e: 'goto', node: 'g4-north' }],
      },
    ],
  },
  {
    id: 'g4-radio',
    nameHe: null,
    branches: [
      {
        when: { flag: 'g4:decided' },
        lines: [{ who: null, text: 'הטרנזיסטור. כבר החלטת מה אתה עושה הערב.' }],
      },
      {
        lines: [{ who: null, text: 'הטרנזיסטור על השולחן, האנטנה כבר מכופפת לצד הנכון. שמונה בערב, ואמא שתעשה שהיא לא מקשיבה.' }],
        choices: [
          { id: 'radio', text: 'להישאר. לשמוע.', then: [{ e: 'flag', flag: 'g4:decided' }, { e: 'flag', flag: 'went:galil-radio' }, { e: 'time', minutes: 60 }, { e: 'goto', node: 'g4-radio-night' }] },
          { id: 'not-yet', text: 'עוד לא.', then: [] },
        ],
      },
    ],
  },
  {
    id: 'g4-radio-night',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'השדר הרחוק, בקול של אדם בתוך ארון. אמא בפתח. אבא עם עיתון שהוא לא קורא.' },
          { who: null, text: 'זה קרוב. זה קרוב כל הזמן, וזה הדבר הכי גרוע שרדיו יודע לעשות.' },
          { who: null, text: 'ואז השתיקה. הארוכה. השדר נשם פעם אחת, ואמר את זה.' },
        ],
        then: [{ e: 'wellbeing', key: 'stress', delta: 6 }, { e: 'wellbeing', key: 'regret', delta: 4 }, { e: 'goto', node: 'g4-done' }],
      },
    ],
  },
  {
    id: 'g4-north',
    nameHe: null,
    branches: [
      {
        when: { flag: 'went:galil-late' },
        lines: [
          { who: null, text: 'פספסת את ההתחלה. מבפנים, דרך הדלת, שמעת אולם שלם של אנשים שלא אתה.' },
          { who: null, text: 'נכנסת בכל זאת. עמדת מאחור. ראית איך זה נגמר, ואיך אנשים בצבע שלך אוספים דגלים בשקט.' },
        ],
        then: [{ e: 'wellbeing', key: 'stress', delta: 5 }, { e: 'flag', flag: 'life:galil:there' }, { e: 'goto', node: 'g4-done' }],
      },
      {
        lines: [
          { who: null, text: 'אולם זר. תקרה נמוכה, ריח אחר, וקהל שיודע לצעוק את השם של המקום שלו בדיוק כמו שאתם צועקים את שלכם.' },
          { who: 'אפי', text: 'זה כמו בבית. רק הפוך.' },
          { who: null, text: 'זה היה קרוב. קרוב מדי. יש רגע לקראת הסוף שבו כולם עומדים ואף אחד לא נושם, ואתה יודע שאת הרגע הזה תזכור יותר מהתוצאה.' },
          { who: null, text: 'הצפירה. לא שלכם.' },
        ],
        then: [{ e: 'wellbeing', key: 'stress', delta: 5 }, { e: 'redheart', key: 'travelDrive', delta: 3 }, { e: 'flag', flag: 'life:galil:there' }, { e: 'goto', node: 'g4-empties' }],
      },
    ],
  },
  /**
   * ==================================== אחרי הצפירה, בצפון (B4 S1–S3, 27.9.2026) ===
   *
   * *"אפשר לזכות בגביע ועדיין להרגיש שהבית מתפרק."* The bus route used to go from the horn
   * straight to the next evening. Now the hall empties around them first, and three things
   * need somebody before Michel's bus leaves: Efi, who cannot get up; a ten-year-old from Tel
   * Aviv who came alone and cannot find the bus; the drum and the rolled banner, which will
   * not walk to the car park by themselves. **There is time for two.** The third is not a
   * failure — somebody else does it, not always well — and the ride home shows which.
   *
   * A conversation and not a room: there is no painting of a hall in the north, and a
   * borrowed Ussishkin would be a lie about where they were (rule 82). The people are the
   * scene; `g4:p:*` counts the hands.
   */
  {
    id: 'g4-empties',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'האולם מתרוקן מלמטה למעלה. הצד שלהם שר עוד שיר ויוצא. הצד שלכם לא זז.' },
          { who: null, text: 'מישהו מכבה חצי מהאורות. הרעש נגמר, ואז נגמר גם ההד שלו.' },
        ],
        choices: [
          { id: 'stay', text: 'להישאר עוד רגע במקום. לא לזוז.', then: [{ e: 'wellbeing', key: 'loneliness', delta: 2 }, { e: 'redheart', key: 'basketballLove', delta: 2 }, { e: 'time', minutes: 6 }, { e: 'goto', node: 'g4-three' }] },
          { id: 'move', text: 'לקום. יש מה לעשות.', then: [{ e: 'personality', key: 'responsibility', delta: 1 }, { e: 'goto', node: 'g4-three' }] },
        ],
      },
    ],
  },
  {
    id: 'g4-three',
    nameHe: null,
    branches: [
      {
        when: { all: [{ any: [{ flag: 'g4:p:efi' }, { flag: 'g4:p:kid' }] }, { any: [{ flag: 'g4:p:gear' }, { all: [{ flag: 'g4:p:efi' }, { flag: 'g4:p:kid' }] }] }] },
        lines: [{ who: null, text: 'צפירה מהחניה — לא של המשחק. מישל, עם היד על הצופר של האוטובוס.' }],
        then: [{ e: 'goto', node: 'g4-bus-home' }],
      },
      {
        lines: [
          { who: null, text: 'שלושה דברים, ומישל כבר צועק מהחניה "עשר דקות".' },
          { who: null, text: 'אפי על המדרגה, הצעיף בין הידיים, לא קם. ילד בן עשר עם כובע גדול מדי מסתובב בין השורות ושואל כל אחד "אתה עם האוטובוס?". והתוף של שחור, והבד המגולגל, באמצע המעבר.' },
        ],
        choices: [
          { id: 'efi', text: 'לשבת ליד אפי.', when: { notFlag: 'g4:p:efi' }, hidden: true, then: [{ e: 'flag', flag: 'g4:p:efi' }, { e: 'goto', node: 'g4-p-efi' }] },
          { id: 'kid', text: 'ללכת לילד עם הכובע.', when: { notFlag: 'g4:p:kid' }, hidden: true, then: [{ e: 'flag', flag: 'g4:p:kid' }, { e: 'goto', node: 'g4-p-kid' }] },
          { id: 'gear', text: 'להרים את התוף והבד.', when: { notFlag: 'g4:p:gear' }, hidden: true, then: [{ e: 'flag', flag: 'g4:p:gear' }, { e: 'goto', node: 'g4-p-gear' }] },
        ],
      },
    ],
  },
  {
    id: 'g4-p-efi',
    nameHe: 'אפי',
    branches: [
      {
        lines: [
          { who: null, text: 'ישבת לידו. לא אמרת כלום, כי אין מה להגיד, והוא לא אמר כלום, כי הוא לא יכול.' },
          { who: 'אפי', text: 'הגביע היה אמיתי, כן?' },
          { who: 'פוגי', text: 'אמיתי.' },
          { who: null, text: 'הוא קם. לא כי הרגיש יותר טוב. כי קמת איתו.' },
        ],
        then: [{ e: 'rel', who: 'efi', axis: 'bond', delta: 4 }, { e: 'rel', who: 'efi', axis: 'trust', delta: 3 }, { e: 'remember', who: 'efi', eventId: 'sat-with-me-north-1993', significance: 'major' }, { e: 'time', minutes: 5 }, { e: 'goto', node: 'g4-three' }],
      },
    ],
  },
  {
    id: 'g4-p-kid',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: '"אתה עם האוטובוס של מישל?" הוא לא בוכה. הוא מחזיק את זה מאחורי השיניים, כמו שלמדת להחזיק בגילו.' },
          { who: null, text: 'לקחת אותו ביד עד החניה. מישל הסתכל עליו, מצא את השם בפנקס, ושם עליו וי בעט.' },
          { who: 'מישל', text: 'ישבת בשורה שלוש בהלוך. אתה יושב בשורה שלוש בחזור.' },
        ],
        then: [{ e: 'rel', who: 'michel', axis: 'trust', delta: 4 }, { e: 'redheart', key: 'community', delta: 3 }, { e: 'personality', key: 'empathy', delta: 2 }, { e: 'time', minutes: 5 }, { e: 'goto', node: 'g4-three' }],
      },
    ],
  },
  {
    id: 'g4-p-gear',
    nameHe: 'שחור',
    branches: [
      {
        lines: [
          { who: 'שחור', text: 'לא מדברים. סוחבים.' },
          { who: null, text: 'התוף על הכתף, הבד מתחת לזרוע, והמדרגות של אולם זר שאתה לא יודע איפה הן נגמרות. שחור הולך לפניך ולא מסתכל אחורה, כי הוא יודע שאתה שם.' },
        ],
        then: [{ e: 'rel', who: 'shachor', axis: 'bond', delta: 4 }, { e: 'institution', key: 'supporterOwnershipSeed', delta: 3 }, { e: 'energy', delta: -10 }, { e: 'time', minutes: 7 }, { e: 'goto', node: 'g4-three' }],
      },
    ],
  },
  /**
   * האוטובוס חזרה — S3: "מה שלא פתרת נראה". What nobody did is on the bus with them, and
   * the seat is the last decision of the night: `life:galil:seat` is read in the corner the
   * next evening, and in 1997, when the hall goes down and Efi either kept a place or did not.
   */
  {
    id: 'g4-bus-home',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'האוטובוס חזרה. שקט כמו כיתה בבחינה.' },
        ],
        then: [{ e: 'goto', node: 'g4-unsolved' }],
      },
    ],
  },
  {
    id: 'g4-unsolved',
    nameHe: null,
    branches: [
      {
        when: { notFlag: 'g4:p:efi' },
        lines: [{ who: null, text: 'אפי עלה אחרון. סוקו הביא אותו בזרוע, כמו שמביאים מישהו מבית חולים. הוא ישב מקדימה, לבד, עם הראש על החלון.' }],
        then: [{ e: 'rel', who: 'efi', axis: 'distance', delta: 2 }, { e: 'goto', node: 'g4-seat' }],
      },
      {
        when: { notFlag: 'g4:p:kid' },
        lines: [{ who: null, text: 'הילד עם הכובע יושב ליד הנהג. מישהו מצא אותו, בסוף, אחרי שמישל ספר פעמיים וחסר אחד. העיניים שלו אדומות, והוא מעמיד פנים שזה מהאורות.' }],
        then: [{ e: 'goto', node: 'g4-seat' }],
      },
      {
        lines: [{ who: 'שחור', text: 'התוף נשאר שם. בחניה, או בתוך האולם. נקנה חדש.' }, { who: null, text: 'הוא אמר את זה כאילו זה לא משנה. זה היה התוף מהגביע.' }],
        then: [{ e: 'rel', who: 'shachor', axis: 'tension', delta: 2 }, { e: 'goto', node: 'g4-seat' }],
      },
    ],
  },
  {
    id: 'g4-seat',
    nameHe: null,
    branches: [
      // the seat he kept for Efi in April is kept for him in May — the NPC acts first
      {
        when: { flagIs: { flag: 'life:1993:seat', value: 'efi' }, flag: 'g4:p:efi' },
        lines: [{ who: 'אפי', text: 'שמרתי לך. כמו שאתה שמרת לי, בגביע.' }, { who: null, text: 'הוא שם את התיק שלו על הברכיים, ומפנה לך את החלון.' }],
        then: [{ e: 'flagValue', flag: 'life:galil:seat', value: 'efi' }, { e: 'rel', who: 'efi', axis: 'sharedHistory', delta: 5 }, { e: 'goto', node: 'g4-done' }],
      },
      {
        lines: [{ who: null, text: 'מקום אחד ליד כל אחד. שלוש שעות של כביש חשוך.' }],
        choices: [
          { id: 'efi', text: 'ליד אפי.', then: [{ e: 'flagValue', flag: 'life:galil:seat', value: 'efi' }, { e: 'rel', who: 'efi', axis: 'sharedHistory', delta: 4 }, { e: 'toast', text: 'הוא נרדם על הכתף שלך ליד חדרה, או העמיד פנים. לא זזת עד תל אביב.', tone: 'plain' }, { e: 'goto', node: 'g4-done' }] },
          { id: 'kid', text: 'ליד הילד עם הכובע.', then: [{ e: 'flagValue', flag: 'life:galil:seat', value: 'kid' }, { e: 'personality', key: 'empathy', delta: 2 }, { e: 'redheart', key: 'community', delta: 2 }, { e: 'toast', text: 'הוא שאל אותך אם זה תמיד ככה. אמרת שלא. שיקרת קצת, והוא ידע.', tone: 'plain' }, { e: 'goto', node: 'g4-done' }] },
          { id: 'shachor', text: 'מאחור, ליד שחור.', then: [{ e: 'flagValue', flag: 'life:galil:seat', value: 'shachor' }, { e: 'rel', who: 'shachor', axis: 'sharedHistory', delta: 4 }, { e: 'toast', text: 'שחור ספר מקלות של תוף על הברכיים, בשקט, כל הדרך. אחת־שתיים. אחת־שתיים.', tone: 'plain' }, { e: 'goto', node: 'g4-done' }] },
        ],
      },
    ],
  },
  {
    id: 'g4-done',
    nameHe: null,
    branches: [
      {
        lines: [{ who: null, text: 'הגביע היה אמיתי. וגם זה. אחד לא מוחק את השני, אבל הערב הם יושבים לך על החזה ביחד.' }],
        then: [{ e: 'goto', node: 'g4-cut' }],
      },
    ],
  },
  {
    id: 'g4-cut',
    nameHe: null,
    branches: [{ lines: [{ who: null, text: 'למחרת בערב, הפינה של אוסישקין.' }], then: [{ e: 'flag', flag: 'g4:cut' }] }],
  },
  // ------------------------------------------------------------------ aftermath ---
  {
    id: 'after-galil',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'הפינה. שחור סוחב כיסאות מהאולם לרחוב ובחזרה, בלי סיבה, כי הידיים צריכות משהו.' },
          { who: null, text: 'מישל עם הפנקס, משחזר: מי נסע, מי איחר, כמה עלה. כאילו אם הלוגיסטיקה תסתדר, גם התוצאה.' },
          { who: null, text: 'אפי עומד בצד. לא מדבר.' },
        ],
        /**
         * (Director V3 §12, 25.9.2026) the morning after is three people standing on a
         * corner, not three buttons: the chairs are carried with Shachor
         * (`after-shachor-galil` → `chore:story:chairs-93`), the notebook is sat over with
         * Michel (`michel-ledger`), and walking to Efi is what the evening comes down to
         * (`efi-galil` → `after-efi`).
         */
        then: [{ e: 'flag', flag: 'after:open' }],
      },
    ],
  },
  {
    id: 'after-shachor-galil',
    nameHe: 'שחור',
    branches: [
      { when: { relationshipMemory: { who: 'shachor', eventId: 'stacked-chairs-1993' } }, lines: [{ who: 'שחור', text: 'יש עוד כיסאות. תמיד יש עוד כיסאות.' }] },
      {
        lines: [{ who: 'שחור', text: 'לא מדברים. סוחבים.' }],
        choices: [
          { id: 'shachor', text: 'לעזור לשחור עם הכיסאות.', then: [{ e: 'rel', who: 'shachor', axis: 'bond', delta: 5 }, { e: 'remember', who: 'shachor', eventId: 'stacked-chairs-1993', significance: 'notable' }, { e: 'institution', key: 'ussishkinWound', delta: 3 }, { e: 'minigame', id: 'chore:story:chairs-93' }] },
          { id: 'no', text: 'לא עכשיו.', then: [] },
        ],
      },
    ],
  },
  {
    id: 'after-michel',
    nameHe: 'מישל',
    branches: [
      { when: { flag: 'after:michel' }, lines: [{ who: null, text: 'הפנקס סגור. מישל לא פותח אותו שוב.' }] },
      {
        lines: [{ who: null, text: 'מישל עם הפנקס, משחזר: מי נסע, מי איחר, כמה עלה. אתה יושב לידו על המדרגה, והוא מראה לך את השורה שלך בלי להגיד כלום.' }],
        then: [{ e: 'flag', flag: 'after:michel' }, { e: 'rel', who: 'michel', axis: 'bond', delta: 4 }, { e: 'personality', key: 'curiosity', delta: 1 }],
      },
    ],
  },
  {
    id: 'after-efi',
    nameHe: null,
    branches: [
      {
        when: { flag: 'life:promise:g4', none: [{ flag: 'life:galil:there' }] },
        lines: [{ who: 'אפי', text: '"מה שלא יהיה," אמרת. ולא היית.' }, { who: null, text: 'הוא לא צעק. זה היה יותר גרוע.' }],
        choices: [
          { id: 'sorry', text: 'לא הצלחתי. סליחה.', then: [{ e: 'rel', who: 'efi', axis: 'trust', delta: -4 }, { e: 'rel', who: 'efi', axis: 'bond', delta: 1 }, { e: 'proof', kind: 'breach_discovered', proofId: 'breach_discovered:{chapter}:galil', subjectHe: GALIL_PROMISE, noteHe: '"מה שלא יהיה," אמרת. ולא היית.' }, { e: 'remember', who: 'efi', eventId: 'broke-promise-1993', significance: 'major' }, { e: 'goto', node: 'after-soko' }] },
          { id: 'excuse', text: 'לא היה כסף. לא היה איך.', then: [{ e: 'rel', who: 'efi', axis: 'trust', delta: -6 }, { e: 'rel', who: 'efi', axis: 'distance', delta: 5 }, { e: 'proof', kind: 'breach_discovered', proofId: 'breach_discovered:{chapter}:galil', subjectHe: GALIL_PROMISE, noteHe: 'תירוץ, ושניכם ידעתם שהוא נכון ושהוא לא משנה כלום.' }, { e: 'remember', who: 'efi', eventId: 'broke-promise-1993', significance: 'major' }, { e: 'goto', node: 'after-soko' }] },
        ],
      },
      /**
       * מי שאמר "אני בא, מה שלא יהיה" — ובא.
       *
       * אותו ערב בדיוק, ושורה אחת נוספת: אפי מזכיר את המשפט. זה הצד שלא היה רשום בשום
       * מקום — ההפרה נרשמה כזיכרון של אדם (`broke-promise-1993`) והקיום לא נרשם בכלל,
       * ולכן `ACH_RELIABLE` ("ארבע הבטחות") לא יכול היה לספור אותו. עכשיו הוא ראיה בפנקס,
       * עם הנושא שהיא נאמרה עליו, בלי להוסיף אף מספר למה שהענף הזה כבר משלם.
       */
      {
        when: { all: [{ flag: 'life:promise:g4' }, { flag: 'life:galil:there' }] },
        lines: [{ who: 'אפי', text: 'היית שם.' }, { who: 'פוגי', text: 'הייתי שם.' }, { who: 'אפי', text: '"מה שלא יהיה," אמרת. אז זהו.' }, { who: null, text: 'זה כל מה שהוא היה מסוגל. זה היה הרבה.' }],
        then: [
          { e: 'rel', who: 'efi', axis: 'trust', delta: 8 },
          { e: 'rel', who: 'efi', axis: 'sharedHistory', delta: 6 },
          { e: 'proof', kind: 'promise_kept', proofId: 'promise_kept:{chapter}:galil', subjectHe: GALIL_PROMISE, noteHe: 'אמר "מה שלא יהיה", ועלה על האוטובוס.' },
          { e: 'goto', node: 'after-soko' },
        ],
      },
      {
        when: { flag: 'life:galil:there', flagIs: { flag: 'life:galil:seat', value: 'efi' } },
        lines: [{ who: 'אפי', text: 'ישבת לידי כל הדרך.' }, { who: 'פוגי', text: 'ישבתי.' }, { who: 'אפי', text: 'לא דיברנו.' }, { who: null, text: 'הוא לא אמר תודה. הוא אמר את זה כמו מי שרושם משהו בפנקס שאין לו.' }],
        then: [
          { e: 'rel', who: 'efi', axis: 'trust', delta: 8 },
          { e: 'rel', who: 'efi', axis: 'sharedHistory', delta: 6 },
          { e: 'goto', node: 'after-soko' },
        ],
      },
      {
        when: { flag: 'life:galil:there' },
        lines: [{ who: 'אפי', text: 'היית שם.' }, { who: 'פוגי', text: 'הייתי שם.' }, { who: 'אפי', text: 'טוב.' }, { who: null, text: 'זה כל מה שהוא היה מסוגל. זה היה הרבה.' }],
        /**
         * הצד השני של ההבטחה. Breaking it costs four trust, or six with an excuse —
         * both written, both reachable. Keeping it paid `sharedHistory` and NOTHING on
         * the axis the promise was made on, so Efi's trust was a currency the game
         * could only take. Three chapters later it is read at 45 and this line is the
         * only door to it: showing up is what trust means here, and it is the whole
         * difference between "אפי בא פחות" in 1997 and "אני בא איתך" in 2000.
         */
        then: [
          { e: 'rel', who: 'efi', axis: 'trust', delta: 8 },
          { e: 'rel', who: 'efi', axis: 'sharedHistory', delta: 6 },
          { e: 'goto', node: 'after-soko' },
        ],
      },
      {
        lines: [{ who: 'אפי', text: 'שמעת ברדיו?' }, { who: 'פוגי', text: 'שמעתי.' }, { who: 'אפי', text: 'אז אתה יודע.' }, { who: null, text: 'הוא לא הסתכל עליך כשאמר את זה.' }],
        then: [{ e: 'rel', who: 'efi', axis: 'distance', delta: 2 }, { e: 'goto', node: 'after-soko' }],
      },
    ],
  },
  {
    id: 'after-soko',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'בפינה, על מדרגה, בחור עם משקפיים ומחברת. כותב. בזמן שכולם מדברים, הוא כותב.' },
          { who: 'סוקו', text: 'אתה זוכר מי זרק אחרון במשחק הראשון? לא? אף אחד לא זוכר. עוד שנה כולם יגידו שזה היה מישהו אחר.' },
          { who: 'סוקו', text: 'עשרים וארבע שנה לא היינו אלופים, ומהערב זה עשרים וחמש. אז אני כותב, שיהיה מישהו שיודע מה באמת היה.' },
        ],
        choices: [
          { id: 'ask', text: 'מה כתבת עליי?', then: [{ e: 'rel', who: 'soko', axis: 'familiarity', delta: 5 }, { e: 'redheart', key: 'historyMemory', delta: 3 }, { e: 'toast', text: '"שהיית." הוא הראה לך את השורה. שורה אחת. מספיק.', tone: 'plain' }, { e: 'goto', node: 'after-close' }] },
          { id: 'why', text: 'למה זה משנה מה באמת היה?', then: [{ e: 'rel', who: 'soko', axis: 'bond', delta: 2 }, { e: 'personality', key: 'curiosity', delta: 2 }, { e: 'toast', text: '"כי ההפסד אמיתי. הגביע אמיתי. אם תשכח אחד, תשכח את שניהם."', tone: 'plain' }, { e: 'goto', node: 'after-close' }] },
        ],
      },
    ],
  },
  {
    id: 'after-close',
    nameHe: null,
    branches: [
      { when: { flag: 'went:galil-bus', none: [{ flag: 'went:galil-late' }] }, lines: [{ who: null, text: 'הלכת הביתה דרך הרחוב הרגיל. הוא נראה אותו דבר. זה מה שהיה מוזר.' }], then: [{ e: 'flag', flag: 'after:done' }, { e: 'ending', id: 'inside' }] },
      { when: { flag: 'went:galil-late' }, lines: [{ who: null, text: 'הלכת הביתה. הכרטיס הקרוע בכיס, עם חותמת של מקום שלא היית בו קודם.' }], then: [{ e: 'flag', flag: 'after:done' }, { e: 'ending', id: 'late' }] },
      { when: { flag: 'went:galil-radio' }, lines: [{ who: null, text: 'הלכת הביתה. הטרנזיסטור עוד על השולחן במטבח, כבוי.' }], then: [{ e: 'flag', flag: 'after:done' }, { e: 'ending', id: 'radio' }] },
      { lines: [{ who: null, text: 'הלכת הביתה. שלושה משפטים של אפי בראש, ואחד שהוא לא סיים.' }], then: [{ e: 'flag', flag: 'after:done' }, { e: 'ending', id: 'heard' }] },
    ],
  },
]
