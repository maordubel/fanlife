import { at } from '../clock'
import type { LifeState } from '../types'

import type { Beat } from './beats'
import type { EndingCard } from './chapter1986'
import type { ChoiceDef, Conversation } from './script'
import { CRATES_1997 } from './storyChores'

/**
 * B7 · "גם האולם יכול לרדת" · 1996/97 – 1997/98 — the hall goes down while the ground
 * nearly does, and the next season's way back up heals nothing.
 *
 * Two nights at Ussishkin a year apart. The first is the relegation night: Shachor and
 * Limor need hands more than they need a crowd, Freddy connects the money without a
 * lecture, and a soldier on leave has to choose between the hall and a football call
 * from his father the same evening. The second is the night they come back up — "עלינו"
 * is not "הבראנו", and everybody in the corner knows it.
 */

export const H1 = 'life:hall:d1'
export const H2 = 'life:hall:d2'

export const PORTRAIT_HALL: Record<string, string> = {
  'פוגי': 'faceHero80',
  'קובי': 'faceKobi',
  'שחור': 'faceShachor',
  'לימור': 'faceLimor',
  'פרדי': 'faceFreddy',
  'אפי': 'faceEfi',
  'סוקו': 'faceSoko',
  'סדרן': 'faceUsher',
  'אוהד': 'faceSupporter',
  // שני הקבועים של אלנבי — שני השחקנים האלה מתויגים `era: '*'` ב-`scenes.ts`, כלומר הם
  // עומדים שם בכל פרק, ולכן כל מפה צריכה את הפלייטים שלהם.
  'המוכר': 'faceVendor',
  'הגבר': 'faceSupporterB',
}

export function objectiveHall(state: LifeState): string | null {
  if (state.chapterDone) return null
  if (state.flags[H2]) return state.flags['h2:done'] ? null : 'שנה אחרי. אותו אולם. עולים.'
  if (state.flags['h1:football'] && !state.flags['h1:chain-complete']) return 'שער 7. אבא מחכה בבלומפילד.'
  if (state.flags['h1:decided']) return null
  return '27 במרץ. עדיין אפשר להישאר בחיים. שחור צריך ידיים; אבא מחכה במקום אחר.'
}

export const ENDINGS_HALL: Record<string, EndingCard> = {
  hall: {
    id: 'hall',
    titleHe: 'עלינו. לא הבראנו.',
    bodyHe:
      'היית באולם בלילה שירדו — הראשון בתולדות הקבוצה — ובאולם בלילה שעלו חזרה. בשני הלילות סחבת משהו. בשני מישהו אמר "עלינו" ואף אחד לא ענה, כי כולם ידעו מה זה שווה. הגג עוד עומד. על מה הוא עומד — זו השאלה שהתחילה בך הערב.',
    memoryHe: 'כרטיס מהלילה של הירידה, ומאחוריו, בעט, כמה עלו שני הארגזים. לימור כתבה.',
    memoryItem: 'hall-ticket',
    presence: 'inside',
  },
  football: {
    id: 'football',
    titleHe: 'בבלומפילד, כשהאולם ירד',
    bodyHe:
      'בחרת באבא ובכדורגל בערב שהאולם ירד בפעם הראשונה בתולדותיו. שמעת את זה במחצית, מטרנזיסטור של מישהו מאחור. שחור לא הזכיר את זה אף פעם. זה היה יותר גרוע מאשר אם היה מזכיר. שנה אחרי היית שם כשעלו, וזה תיקן חצי.',
    memoryHe: 'כרטיס לבלומפילד מאותו ערב. מישהו כתב עליו בעט שעה, ומחק.',
    memoryItem: 'ticket-stub',
    presence: 'heard-from-friend',
  },
}

const DAY = (flag: string, year: number, weekday: number, minute: number, dateHe?: string) =>
  [{ t: 'day.entered', dayId: flag, year, weekday, minute, ...(dateHe ? { dateHe } : {}) } as const, { t: 'flag.raised', flag } as const]

export const BEATS_HALL: Beat[] = [
  {
    id: 'h1-open',
    at: 'ussishkin-outside',
    trigger: 'enter',
    when: { none: [{ flag: H2 }, { flag: H1 }] },
    delayMs: 700,
    do: [
      { a: 'flag', flag: H1 },
      { a: 'events', events: [{ t: 'money.changed', agorot: 3000, why: 'חופשה' }] },
      { a: 'lines', lines: [{ who: null, text: 'אביב. חופשה של ארבעים ושמונה שעות. הגעת ישר מהתחנה, עם התיק, לפינה של אוסישקין.' }, { who: null, text: '27 במרץ 1997. עוד לא ערב הירידה. זה ערב שבו עדיין אפשר להשאיר את הסיפור פתוח. ובאותו זמן אבא מחכה לך במקום אחר.' }] },
      { a: 'talk', conversation: 'h1-corner' },
    ],
  },
  /** back from the crates: the corner asks its question again, now that he has carried */
  {
    id: 'h1-after-crates',
    at: 'ussishkin-outside',
    trigger: 'enter',
    when: { flag: CRATES_1997, none: [{ flag: 'h1:decided' }, { flag: 'h1:asked-after' }] },
    delayMs: 500,
    do: [{ a: 'flag', flag: 'h1:asked-after' }, { a: 'talk', conversation: 'h1-corner' }],
  },
  {
    id: 'h1-hall',
    at: 'ussishkin-hall',
    trigger: 'enter',
    when: { flag: H1, none: [{ flag: 'h1:decided' }] },
    delayMs: 900,
    do: [
      { a: 'flag', flag: 'h1:decided' },
      { a: 'flag', flag: 'h1:hall' },
      { a: 'card', titleHe: '27.3.1997', subHe: 'אוסישקין · נשארים בחיים', ms: 2400 },
      { a: 'talk', conversation: 'h1-chain' },
    ],
  },
  /**
   * (V3 recovery) the parallel result is asked until it is answered: `h1-hall` raises
   * `h1:decided` before it opens `h1-chain`, so a box walked out of used to leave the night
   * with no way to `h1:chain-complete`. This beat stays armed while the hall night is open.
   */
  {
    id: 'h1-chain-again',
    trigger: 'clock',
    when: { flag: 'h1:hall', none: [{ flag: 'h1:chain-complete' }, { flag: H2 }] },
    delayMs: 600,
    do: [{ a: 'talk', conversation: 'h1-chain' }],
  },
  {
    /**
     * (Director V3 §12, 25.9.2026) choosing your father is a walk to him: the night at gate
     * seven opens when the soldier arrives at Bloomfield, not on the next tick wherever he
     * stands. The clock beat below is the same night for a boy who never gets there.
     */
    id: 'h1-football-gate',
    at: 'bloomfield-outside',
    trigger: 'enter',
    when: { flag: 'h1:football', none: [{ flag: H2 }, { flag: 'h1:chain-complete' }, { flag: 'h1:gate-said' }] },
    delayMs: 600,
    do: [
      { a: 'card', titleHe: '27.3.1997', subHe: 'אתה במקום אחר', ms: 2400 },
      { a: 'talk', conversation: 'h1-bloomfield' },
    ],
  },
  {
    id: 'h1-football',
    trigger: 'clock',
    /**
     * `h1:chain-complete` (25.9.2026): the beat is armed again while its `when` holds (rule
     * 42), which is its recovery — a box walked out of comes back — and it held after the
     * chain closed too, so Gate 7 replayed on every tick until the year turned. Nobody had
     * walked this road: the confused player's "last answer" used to loop on Freddy first.
     */
    when: { flag: 'h1:football', afterMinute: at(21, 30), none: [{ flag: H2 }, { flag: 'h1:chain-complete' }, { flag: 'h1:gate-said' }] },
    do: [
      { a: 'card', titleHe: '27.3.1997', subHe: 'אתה במקום אחר', ms: 2400 },
      { a: 'talk', conversation: 'h1-bloomfield' },
    ],
  },
  /**
   * the night at gate seven answered, the week goes on without him: a cut to 30 March and
   * the result from Herzliya, asked until it is answered (the same recovery as the hall's)
   */
  {
    id: 'h1-chain-football',
    trigger: 'clock',
    when: { flag: 'h1:gate-said', none: [{ flag: 'h1:chain-complete' }, { flag: H2 }] },
    delayMs: 600,
    do: [
      { a: 'card', titleHe: '30.3.1997', subHe: 'אילת, ואז הרצליה', ms: 2200 },
      { a: 'talk', conversation: 'h1-chain' },
    ],
  },
  {
    id: 'h1-chain-to-h2',
    trigger: 'clock',
    when: { flag: 'h1:chain-complete', none: [{ flag: H2 }] },
    delayMs: 700,
    do: [
      { a: 'events', events: DAY(H2, 1998, 2, at(19, 30), 'אביב 1998') },
      { a: 'card', titleHe: 'שנה אחרי', subHe: 'אוסישקין', ms: 2200 },
      { a: 'travel', to: 'ussishkin-outside', spawn: 'start' },
    ],
  },
  {
    id: 'h2-open',
    at: 'ussishkin-outside',
    trigger: 'enter',
    when: { flag: H2, none: [{ flag: 'h2:done' }] },
    delayMs: 800,
    do: [{ a: 'talk', conversation: 'h2-corner' }],
  },
]

/** ללכת לאבא — the same answer before the crates and after them */
const FOOTBALL_1997: ChoiceDef['then'] = [{ e: 'flag', flag: 'h1:decided' }, { e: 'flag', flag: 'h1:football' }, { e: 'flag', flag: 'life:hall:football-night' }, { e: 'rel', who: 'shachor', axis: 'trust', delta: -5 }, { e: 'remember', who: 'shachor', eventId: 'left-relegation-night-1997', significance: 'major' }, { e: 'rel', who: 'kobi', axis: 'bond', delta: 4 }, { e: 'institution', key: 'ussishkinWound', delta: 4 }]

export const CONVERSATIONS_HALL: Conversation[] = [
  {
    id: 'h1-corner',
    nameHe: null,
    branches: [
      /** after the crates — the choice is the same, and now he has worked for one side of it */
      {
        when: { flag: CRATES_1997 },
        lines: [
          { who: 'שחור', text: 'עוד אחד. (הוא לא אומר תודה. הוא מחזיק את הדלת פתוחה.)' },
          { who: 'לימור', text: 'שמונה. אבא שלך בשער 7, והוא מחכה.' },
        ],
        choices: [
          { id: 'inside', text: 'להישאר. פנימה, לאולם.', then: [{ e: 'redheart', key: 'basketballLove', delta: 2 }, { e: 'travel', to: 'ussishkin-hall', spawn: 'fromOut' }] },
          { id: 'football', text: 'להניח את הידיים. ללכת לאבא.', then: FOOTBALL_1997 },
        ],
      },
      {
        lines: [
          { who: null, text: 'שחור ליד שני ארגזים. לימור עם פנקס. פרדי בחליפה, מדבר עם מישהו בטלפון נייד בגודל של לבנה.' },
          { who: 'שחור', text: 'אתה. יופי. שני ארגזים צריכים להיכנס לפני הקהל, ואין לי גב. אני לא מבקש פעמיים.' },
          { who: 'לימור', text: 'ואבא שלך התקשר לקיוסק של רפי. רפי אמר לשחור, שחור אמר לי. הוא בשער 7 בשמונה, והוא מחכה.' },
          { who: null, text: 'שמונה. בשני המקומות.' },
        ],
        choices: [
          /**
           * (Director V3 §10, 24.9.2026) "לסחוב את הארגזים" is carried now, not chosen: the
           * answer commits (`h1:crates`, Kobi waiting at eight, Shachor remembering), and
           * the two crates are `ChoreScene` — one at a time, to the hall door, and it can be
           * put down halfway (`content/storyChores.ts`). The hall-or-father choice comes
           * AFTER the work, in `h1-corner`'s first branch, so it costs what it should.
           */
          { id: 'crates', text: 'לסחוב את הארגזים.', then: [{ e: 'flag', flag: 'h1:crates' }, { e: 'remember', who: 'shachor', eventId: 'crates-relegation-1997', significance: 'major' }, { e: 'rel', who: 'kobi', axis: 'tension', delta: 4 }, { e: 'minigame', id: 'chore:story:crates-97' }] },
          { id: 'football', text: 'להתנצל. ללכת לאבא.', then: FOOTBALL_1997 },
          // asked once: the corner does not offer the same question twice (V3 §13 A — a player
          // who kept asking it looped the corner box without ever doing anything)
          { id: 'freddy', text: 'לשאול את פרדי מה קורה עם הכסף.', when: { notFlag: 'h1:asked-freddy' }, hidden: true, then: [{ e: 'flag', flag: 'h1:asked-freddy' }, { e: 'goto', node: 'h1-freddy' }] },
        ],
      },
    ],
  },
  {
    /** (V3 §12) the same "להישאר", taken by the door rather than the corner's box */
    id: 'h1-stay',
    nameHe: null,
    branches: [
      {
        lines: [{ who: null, text: 'הדלת של האולם כבדה, והידיים עוד זוכרות את הארגז. שמונה, בשני המקומות. אתה נכנס.' }],
        then: [{ e: 'redheart', key: 'basketballLove', delta: 2 }, { e: 'travel', to: 'ussishkin-hall', spawn: 'fromOut' }],
      },
    ],
  },
  {
    id: 'h1-freddy',
    nameHe: 'פרדי',
    branches: [
      {
        lines: [
          { who: 'פרדי', text: 'מה קורה עם הכסף. (מקפל את הטלפון.) אין. זה מה שקורה. הכדורגל עבר לידיים שיש להן אינטרס לשמור עליו. לאולם אין ידיים כאלה.' },
          { who: 'פרדי', text: 'ומי שרוצה שיהיו — יצטרך להיות הידיים. לא הערב. אבל שיתחיל לחשוב מי זה "מישהו".' },
        ],
        then: [{ e: 'institution', key: 'supporterOwnershipSeed', delta: 8 }, { e: 'institution', key: 'basketballOwnershipTrust', delta: -8 }, { e: 'goto', node: 'h1-corner' }],
      },
    ],
  },
  // (23.9.2026) `h1-inside`/`h1-efi`/`h1-out` removed: the overlay moved this night from
  // inside the hall to `h1-chain` (outside, via the parallel Herzliya result), and nothing
  // pointed at this trio any more once its `match`/`hall-97` step stopped being played
  // (life-orphans, life-match).
  {
    id: 'h1-chain',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'הערב באוסישקין השאיר את הקבוצה בחיים. לא יותר.' },
          { who: null, text: '30 במרץ. אילת. הפסד בחוץ, והשליטה כבר לא בידיים שלכם.' },
          { who: null, text: 'המחזור האחרון מגיע, והפועל בכלל לא משחקת. קבוצה אחת נעלמה מהליגה, והחיים שלכם תלויים עכשיו במשחק של מישהו אחר.' },
          { who: null, text: 'הידיעה מהרצליה מגיעה בלי כדור ביד ובלי פרקט מתחת לרגליים. הפעם זה סופי: הירידה הראשונה.' },
        ],
        /**
         * B7 S2 (implementation pass 27.9.2026) — *"לעזור לפרק / להישאר / להתווכח / לצאת"*,
         * and the bible's founder seed: *"מי שנשאר אחרי הפסד מקבל יותר community proof ממי
         * שמגיע רק לחגיגות."* Staying and carrying after the loss are proofs now, with the
         * night as their subject; arguing is heat, and it is remembered too. `life:hall:1997`
         * says which, and 1999 — the second relegation — reads it at the same corner.
         */
        choices: [
          { id: 'carry', text: 'לעזור לשחור לפרק ולסגור את הערב.', then: [{ e: 'rel', who: 'shachor', axis: 'bond', delta: 4 }, { e: 'institution', key: 'supporterOwnershipSeed', delta: 5 }, { e: 'institution', key: 'ussishkinWound', delta: 8 }, { e: 'energy', delta: -8 }, { e: 'flagValue', flag: 'life:hall:1997', value: 'carried' }, { e: 'proof', kind: 'community_help', proofId: 'community_help:{chapter}:relegation', subjectHe: 'הלילה שהאולם ירד', noteHe: 'פירק עם שחור את מה שנשאר, אחרי שכולם הלכו.' }, { e: 'goto', node: 'h1-after-chain' }] },
          { id: 'stay', text: 'להישאר. לשבת על המדרגה עד שמכבים.', then: [{ e: 'redheart', key: 'basketballLove', delta: 3 }, { e: 'wellbeing', key: 'loneliness', delta: 3 }, { e: 'institution', key: 'ussishkinWound', delta: 8 }, { e: 'flagValue', flag: 'life:hall:1997', value: 'stayed' }, { e: 'proof', kind: 'community_help', proofId: 'community_help:{chapter}:relegation', subjectHe: 'הלילה שהאולם ירד', noteHe: 'נשאר עד שכיבו את האור. מישהו צריך לראות איך זה נראה ריק.' }, { e: 'goto', node: 'h1-after-chain' }] },
          { id: 'argue', text: 'להתווכח. "מי שמכר את האולם הזה—"', then: [{ e: 'institution', key: 'protestEscalation', delta: 6 }, { e: 'institution', key: 'basketballOwnershipTrust', delta: -6 }, { e: 'rel', who: 'freddy', axis: 'tension', delta: 3 }, { e: 'personality', key: 'impulsiveness', delta: 2 }, { e: 'flagValue', flag: 'life:hall:1997', value: 'argued' }, { e: 'toast', text: 'פרדי הקשיב עד הסוף. "צודק. ומחר בבוקר, מה אתה עושה עם זה?" לא היה לך מה לענות.', tone: 'plain' }, { e: 'goto', node: 'h1-after-chain' }] },
          { id: 'write', text: 'לבקש מלימור לרשום את התאריך.', then: [{ e: 'rel', who: 'crowd-limor', axis: 'sharedHistory', delta: 4 }, { e: 'institution', key: 'ussishkinWound', delta: 8 }, { e: 'redheart', key: 'historyMemory', delta: 4 }, { e: 'flagValue', flag: 'life:hall:1997', value: 'wrote' }, { e: 'goto', node: 'h1-after-chain' }] },
          { id: 'home', text: 'לצאת. ללכת לאבא. אין מה לפתור עכשיו.', then: [{ e: 'rel', who: 'kobi', axis: 'bond', delta: 3 }, { e: 'wellbeing', key: 'regret', delta: 3 }, { e: 'institution', key: 'ussishkinWound', delta: 7 }, { e: 'flagValue', flag: 'life:hall:1997', value: 'left' }, { e: 'goto', node: 'h1-after-chain' }] },
        ],
      },
    ],
  },
  /**
   * B7 S3 — outside, a few people left. The corner is where Efi is, if he came tonight: walk
   * home with him or alone. Nobody else is asked; a boy who heard it at gate seven walks
   * home with his father, and that is already written (`h1-bloomfield`).
   */
  {
    id: 'h1-after-chain',
    nameHe: null,
    branches: [
      {
        when: { flag: 'h1:efi-met', none: [{ flag: 'h1:football' }, { flag: 'h1:walked' }, { flagIs: { flag: 'life:hall:1997', value: 'left' } }] },
        lines: [
          { who: null, text: 'בחוץ נשארו ארבעה אנשים ופח אשפה מלא כוסות. אפי עומד מתחת לפנס עם הידיים בכיסים.' },
          { who: 'אפי', text: 'אני הולך דרך אלנבי. אתה?' },
        ],
        choices: [
          { id: 'efi', text: '"דרך אלנבי."', then: [{ e: 'flag', flag: 'h1:walked' }, { e: 'flagValue', flag: 'life:hall:walked', value: 'efi' }, { e: 'rel', who: 'efi', axis: 'sharedHistory', delta: 5 }, { e: 'rel', who: 'efi', axis: 'trust', delta: 2 }, { e: 'toast', text: 'עשרים דקות, ואף אחד מכם לא אמר את המילה "ירדנו". בפינה של בוגרשוב הוא אמר "נחזור". לא שאל.', tone: 'plain' }, { e: 'goto', node: 'h1-after-chain' }] },
          { id: 'alone', text: '"אני לבד הערב."', then: [{ e: 'flag', flag: 'h1:walked' }, { e: 'flagValue', flag: 'life:hall:walked', value: 'alone' }, { e: 'wellbeing', key: 'loneliness', delta: 3 }, { e: 'rel', who: 'efi', axis: 'distance', delta: 1 }, { e: 'toast', text: 'הוא הנהן, כאילו גם הוא רצה את זה. הלכתם לשני כיוונים, ושניכם הסתכלתם אחורה פעם אחת.', tone: 'plain' }, { e: 'goto', node: 'h1-after-chain' }] },
        ],
      },
      { lines: [{ who: null, text: 'שנה עוברת. העלייה חזרה לא מוחקת את הדרך שבה ירדתם.' }], then: [{ e: 'flag', flag: 'h1:chain-complete' }] },
    ],
  },
  /**
   * אפי, 1997 — B7 S1: *"למצוא מקום / אפי — dynamic presence"*. He is at the corner on the
   * relegation night and his first sentence is what he remembers of the north: a boy who
   * sat beside him the whole way home in May 1993 finds a place already kept.
   */
  {
    id: 'efi-hall-97',
    nameHe: 'אפי',
    branches: [
      {
        when: { flag: 'h1:efi-met' },
        lines: [{ who: 'אפי', text: 'המקום ליד המעקה. אל תאחר אליו.' }],
      },
      {
        when: { flagIs: { flag: 'life:galil:seat', value: 'efi' } },
        lines: [
          { who: 'אפי', text: 'שמרתי לך מקום בפנים. ליד המעקה. כמו שישבת לידי באוטובוס מהצפון.' },
          { who: null, text: 'הוא לא שואל איפה היית חצי שנה. הוא רואה את התיק של הצבא ומבין לבד.' },
        ],
        then: [{ e: 'flag', flag: 'h1:efi-met' }, { e: 'rel', who: 'efi', axis: 'bond', delta: 3 }, { e: 'flag', flag: 'h1:kept-spot' }],
      },
      {
        when: { relationship: { who: 'efi', axis: 'distance', min: 8 } },
        lines: [
          { who: 'אפי', text: 'חייל. יופי. באת לאולם או שבאת לראות איך הוא נופל?' },
          { who: null, text: 'הוא לא מחכה לתשובה. הוא נכנס בלי להחזיק לך את הדלת.' },
        ],
        then: [{ e: 'flag', flag: 'h1:efi-met' }],
      },
      {
        lines: [
          { who: 'אפי', text: 'באת. אני לא אשאל איך השגת חופשה. אל תספר לי.' },
          { who: 'אפי', text: 'היום זה או שנשארים, או שזה מתחיל להיגמר. תעמוד לידי.' },
        ],
        then: [{ e: 'flag', flag: 'h1:efi-met' }, { e: 'rel', who: 'efi', axis: 'familiarity', delta: 2 }],
      },
    ],
  },
  {
    id: 'h1-bloomfield',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'שער 7. אבא, ו"טוב שבאת" בשתי מילים. המשחק היה משחק של הישרדות — לא שלהם, שלכם. כל כדור היה שאלה.' },
          { who: null, text: 'מישהו עם טרנזיסטור מאחור מעביר את הידיעה מאוסישקין: עוד נשארו בחיים. אבא שמע. הסתכל עליך. לא אמר כלום.' },
          { who: 'קובי', text: 'רצית להיות שם?' },
        ],
        choices: [
          // (V3 §12) the three days to Herzliya are a cut, not the next line: `h1-chain-football`
          { id: 'yes', text: '"כן."', then: [{ e: 'rel', who: 'kobi', axis: 'trust', delta: 3 }, { e: 'wellbeing', key: 'regret', delta: 3 }, { e: 'presence', mode: 'heard-from-friend' }, { e: 'flag', flag: 'h1:gate-said' }] },
          { id: 'here', text: '"הייתי צריך להיות פה."', then: [{ e: 'rel', who: 'kobi', axis: 'bond', delta: 3 }, { e: 'redheart', key: 'familyTradition', delta: 3 }, { e: 'presence', mode: 'heard-from-friend' }, { e: 'flag', flag: 'h1:gate-said' }] },
        ],
      },
    ],
  },
  {
    id: 'h2-corner',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'שנה. אותה פינה, אותו ריח, ארגזים אחרים. הערב, אם זה נגמר טוב, חוזרים לליגה שירדו ממנה.' },
          { who: 'שחור', text: 'עולים. אל תגיד לי "הבראנו". עולים.' },
          { who: 'לימור', text: 'שלושה עשר אנשים עבדו השנה בשביל הערב הזה. אני יודעת כי רשמתי.' },
        ],
        /**
         * שבע שנים אחורה — the brief (§16) asks that the decade be one life and not ten
         * episodes, and the promotion of 1990 is the obvious debt: a twelve-year-old
         * learned that word standing outside a gate that opened late. `went:withKobi`
         * survives the chapter cut since 6.9.2026, which is what makes this line possible
         * at all.
         */
        choices: [
          { id: 'hope', text: '"אולי הפעם זה באמת מתחיל."', then: [{ e: 'wellbeing', key: 'happiness', delta: 4 }, { e: 'institution', key: 'basketballOwnershipTrust', delta: 4 }, { e: 'goto', node: 'h2-inside' }] },
          { id: 'doubt', text: '"עלינו. זה הכל."', then: [{ e: 'rel', who: 'shachor', axis: 'trust', delta: 3 }, { e: 'personality', key: 'curiosity', delta: 1 }, { e: 'goto', node: 'h2-inside' }] },
          { id: 'tired', text: 'לשתוק. עייף.', then: [{ e: 'wellbeing', key: 'exhaustion', delta: 5 }, { e: 'goto', node: 'h2-inside' }] },
          {
            id: 'ninety',
            text: '"בפעם הראשונה ששמעתי \'עולים\' הייתי בן שתים־עשרה."',
            when: { flag: 'went:withKobi' },
            // hidden, not greyed: a line about your own twelfth birthday is not a door you
            // can see and cannot open — to a player who went with his friends in 1990 it is
            // simply not a thing he would say
            hidden: true,
            then: [
              { e: 'redheart', key: 'historyMemory', delta: 4 },
              { e: 'rel', who: 'shachor', axis: 'sharedHistory', delta: 3 },
              { e: 'toast', text: 'שחור הניח ארגז ולא הרים אותו. "ואיפה היית עומד אז?" "בחוץ. השער נפתח מאוחר."', tone: 'plain' },
              { e: 'goto', node: 'h2-inside' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'h2-inside',
    nameHe: null,
    branches: [
      {
        when: { flag: 'life:hall:football-night' },
        lines: [{ who: null, text: 'האולם מלא. עלו. שרו. שחור עמד לידך שנה שלמה אחרי, ולא הזכיר את הערב ההוא אף במילה. זה היה יותר גרוע מאשר אם היה מזכיר.' }, { who: null, text: '"עלינו," מישהו אמר. אף אחד לא ענה.' }],
        then: [{ e: 'flag', flag: 'h2:done' }, { e: 'institution', key: 'supporterOwnershipSeed', delta: 4 }, { e: 'ending', id: 'football' }],
      },
      {
        lines: [{ who: null, text: 'האולם מלא. עלו. שרו. ובסוף, במקום לחגוג, אנשים התחילו לקפל כיסאות ולסחוב ארגזים, כי מחר יש עוד שנה.' }, { who: null, text: '"עלינו," מישהו אמר. אף אחד לא ענה.' }],
        then: [{ e: 'flag', flag: 'h2:done' }, { e: 'institution', key: 'supporterOwnershipSeed', delta: 6 }, { e: 'redheart', key: 'basketballLove', delta: 3 }, { e: 'ending', id: 'hall' }],
      },
    ],
  },
]
