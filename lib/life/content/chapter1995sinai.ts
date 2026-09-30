import { at } from '../clock'
import type { LifeState } from '../types'

import type { Beat } from './beats'
import type { EndingCard } from './chapter1986'
import type { ChoiceDef, Conversation } from './script'

/**
 * B5 · "המספר שבע על הקיר" · 1994–1995 — the childhood hero becomes the decade's most
 * personal argument. Two evenings, a year apart: the night of a cup final lost to the
 * neighbours (June 1994), when a boy defends the man on his wall and it is reasonable to;
 * and a night in August 1995, after a European trip nobody talks about, when the facts
 * pile up on the kiosk counter and defending starts to cost him people.
 *
 * The arc is defence → doubt; the rupture belongs to the winter of 1996 (B6). Nothing here
 * says a score or a name of an opponent. Sinai is a name — the man on the poster — and
 * the rule of this chapter is that the love for the player is never made foolish.
 */

export const S1 = 'life:sinai:d1'
export const S2 = 'life:sinai:d2'
export const S3 = 'life:sinai:d3'

/** the three voices of the 1995 kiosk, and the pin (Director V3 §12) */
export const S2_PAPER = 's2:v:paper'
export const S2_FREDDY = 's2:v:freddy'
export const S2_FAN = 's2:v:fan'
export const S2_POSTER = 's2:poster'

export const PORTRAIT_SINAI: Record<string, string> = {
  'פוגי': 'faceHero80',
  'קובי': 'faceKobi',
  'רחל': 'faceRachel90',
  'אופיר': 'faceOfir',
  'עמית': 'faceAmit',
  'רפי מהקיוסק': 'faceOldMan',
  'בארי': 'faceBarry',
  'פרדי': 'faceFreddy',
  'אוהד צעיר': 'faceYoung',
  'אוהד ותיק': 'faceSupporterB',
  'אוהד': 'faceSupporter',
  'סדרן': 'faceUsher',
  // שני הקבועים של אלנבי — שני השחקנים האלה מתויגים `era: '*'` ב-`scenes.ts`, כלומר הם
  // עומדים שם בכל פרק, ולכן כל מפה צריכה את הפלייטים שלהם.
  'המוכר': 'faceVendor',
  'הגבר': 'faceSupporterB',
}

export function objectiveSinai(state: LifeState): string | null {
  if (state.chapterDone) return null
  if (state.flags[S3]) {
    if (state.flags['s3:wall']) return null
    if (state.flags['s3:g:left']) return 'הביתה. הקיר.'
    return 'שער 7. הבד, האיש בחולצה הישנה, והסדרן.'
  }
  if (state.flags['s2:done']) return 'החדר. הקיר. הנעץ.'
  if (state.flags[S2]) return 'הקיוסק. העיתון של עמית, פרדי, והבחור בדלת.'
  if (state.flags['s1:argued']) return 'הביתה. הפוסטר על הקיר.'
  if (state.flags['s1:heard']) return 'הקיוסק. כולם מדברים.'
  return 'ערב גמר. הרדיו על הדלפק של רפי.'
}

export const ENDINGS_SINAI: Record<string, EndingCard> = {
  defending: {
    id: 'defending',
    titleHe: 'המספר שבע נשאר על הקיר',
    bodyHe:
      'שנה, שני ערבים, ואותו מסמר. הגנת עליו כשזה היה קל, והגנת עליו כשזה כבר עלה לך באופיר. אבא הבין. אופיר לא. בלילה, לפני שכיבית את האור, חשבת על הכדור הקטן שהוא נתן בדקה שמונים ושש — ועל זה שהוא בכלל לא הבקיע אותו.',
    memoryHe: 'הפוסטר. אותו מסמר, אותו קיר, ופינה אחת שכבר לא מתיישרת.',
    memoryItem: 'clipping',
    presence: 'radio',
  },
  doubting: {
    id: 'doubting',
    titleHe: 'הפוסטר מקופל',
    bodyHe:
      'לא זרקת. קיפלת. שמת במגירה עם הדברים שלא זורקים. יש הבדל בין להפסיק להאמין למישהו ובין להפסיק לאהוב אותו, ובגיל שבע־עשרה מצאת אותו לבד, בלילה, עם נעץ בין האצבעות.',
    memoryHe: 'הפוסטר, מקופל לארבע, במגירה. הקפל עובר לו בדיוק על הפנים.',
    memoryItem: 'clipping',
    presence: 'radio',
  },
  torn: {
    id: 'torn',
    titleHe: 'הקיר ריק',
    bodyHe:
      'הורדת. מהר, כדי שלא תספיק לחשוב. על הקיר נשאר ריבוע בהיר בצורת פוסטר. אמא ראתה אותו למחרת ולא שאלה עליו — שאלה אם אכלת. הריבוע נשאר שם שנים.',
    memoryHe: 'ריבוע בהיר על קיר. אין חפץ. יש צורה.',
    memoryItem: 'folded-paper',
    presence: 'radio',
  },
}

const DAY = (flag: string, year: number, weekday: number, minute: number, dateHe?: string) =>
  [{ t: 'day.entered', dayId: flag, year, weekday, minute, ...(dateHe ? { dateHe } : {}) } as const, { t: 'flag.raised', flag } as const]

export const BEATS_SINAI: Beat[] = [
  {
    id: 's1-open',
    at: 'kiosk',
    trigger: 'enter',
    // `S1` in its own guard: without the box at the end of it, this beat's `when` still held
    // after it ran, and the kiosk said its opening again every time he walked back in
    when: { none: [{ flag: S1 }, { flag: S2 }, { flag: 's1:heard' }] },
    delayMs: 700,
    do: [
      { a: 'flag', flag: S1 },
      { a: 'lines', lines: [{ who: null, text: 'ערב של יוני. גמר גביע נגד השכנים, באצטדיון הגדול בצד השני של העיר. כרטיס עולה כסף, כסף אין, ולרפי יש רדיו על הדלפק.' }, { who: null, text: 'שש־עשרה. מעל המיטה שלך תלוי מגיל שמונה פוסטר של מספר שבע. הוא כבר לא משחק. עכשיו הוא זה שמחליף.' }] },
      { a: 'sound', kind: 'radio', on: true },
      /**
       * (Director V3 §12, 25.9.2026) the radio is not opened AT him any more: it is on the
       * counter between the fridge and the till (`radio-sinai`), and the evening is heard
       * by leaning in to it. The box it opens is the chapter's own `s1-radio`, word for word.
       */
      { a: 'toast', text: 'הרדיו של רפי על הדלפק. אופיר כבר על הארגז.', tone: 'plain' },
    ],
  },
  /** the final is over and so is the radio */
  {
    id: 's1-radio-off',
    trigger: 'clock',
    when: { flag: 's1:heard', none: [{ flag: S2 }, { flag: 's1:radio-off' }] },
    do: [{ a: 'flag', flag: 's1:radio-off' }, { a: 'sound', kind: 'radio', on: false }],
  },
  /**
   * The walk home is his (V3 §12): after the argument the poster is reached by going to the
   * room it hangs in. This used to cut him there on the next tick; now it only does so at
   * the end of the night, for a boy who stayed at the kiosk until Rafi turned the sign off.
   */
  {
    id: 's1-to-home',
    trigger: 'clock',
    when: { flag: 's1:argued', afterMinute: at(22, 30), none: [{ flag: S2 }] },
    do: [{ a: 'card', titleHe: 'בלילה', subHe: 'החדר', ms: 2000 }, { a: 'travel', to: 'bedroom', spawn: 'start' }],
  },
  {
    id: 's1-poster',
    at: 'bedroom',
    trigger: 'enter',
    when: { flag: 's1:argued', none: [{ flag: S2 }] },
    delayMs: 800,
    do: [
      { a: 'talk', conversation: 'poster-1994' },
      { a: 'events', events: DAY(S2, 1995, 2, at(19, 0), 'סתיו 1995') },
      { a: 'card', titleHe: '1995', subHe: 'אוגוסט. שנה אחרי.', ms: 2600, art: 'plate-1995-sinai' },
      { a: 'travel', to: 'kiosk', spawn: 'start' },
    ],
  },
  {
    id: 's2-open',
    at: 'kiosk',
    trigger: 'enter',
    when: { flag: S2, none: [{ flag: 's2:done' }, { flag: 's2:seen' }] },
    delayMs: 700,
    do: [
      { a: 'flag', flag: 's2:seen' },
      { a: 'lines', lines: [{ who: null, text: 'שנה אחרי. שבע־עשרה. עונה שלמה של "עוד לא" ו"בשבוע הבא", ואז שני משחקים באירופה, שבועיים ביניהם, וחזרה הביתה.' }, { who: null, text: 'הקיוסק נהיה בית משפט. רפי מוכר גרעינים, ובין קפה לקפה פוסק.' }] },
      /**
       * (Director V3 §12, 25.9.2026) "לאסוף קולות סותרים בעולם". The court does not sit
       * AT him: its three voices stand in the kiosk — Amit's newspaper folded on the counter
       * (`paper-sinai`), Freddy by the fridge, the young man in the door — and he goes to
       * them. When two of the three have said their piece the court sits (`s2-court-now`).
       */
      { a: 'toast', text: 'שלושה קולות בקיוסק: העיתון של עמית, פרדי, והבחור בדלת.', tone: 'plain' },
    ],
  },
  {
    id: 's2-court-now',
    at: 'kiosk',
    trigger: 'clock',
    when: {
      flag: S2,
      any: [
        { all: [{ flag: S2_PAPER }, { flag: S2_FREDDY }] },
        { all: [{ flag: S2_PAPER }, { flag: S2_FAN }] },
        { all: [{ flag: S2_FREDDY }, { flag: S2_FAN }] },
      ],
      none: [{ flag: 's2:done' }],
    },
    delayMs: 900,
    do: [{ a: 'talk', conversation: 's2-court' }],
  },
  /** and a boy who hears one voice and stands there anyway — the court sits at nine */
  {
    id: 's2-court-late',
    at: 'kiosk',
    trigger: 'clock',
    when: { flag: S2, afterMinute: at(21, 0), none: [{ flag: 's2:done' }] },
    do: [{ a: 'talk', conversation: 's2-court' }],
  },
  /** the night with the pin: at the end of it, the room — for a boy who never walked home */
  {
    id: 's2-home-late',
    trigger: 'clock',
    when: { flag: 's2:done', afterMinute: at(23, 30), none: [{ flag: S2_POSTER }] },
    do: [{ a: 'card', titleHe: 'בלילה', subHe: 'החדר', ms: 2000 }, { a: 'travel', to: 'bedroom', spawn: 'start' }],
  },
  {
    /**
     * ----------------------------------------------- S3 · הקרע ---
     *
     * היום השלישי — the break, in the chapter it belongs to.
     *
     * Stage B §7 B5 asks for three slices — defence, doubt, rupture — across 1993–1996, and
     * the third one was living inside the ARMY chapter as one choice in a kiosk
     * conversation about a sale. So the arc the brief calls "the decade's most personal
     * conflict" had its ending filed under somebody else's crisis, and a player who defended
     * him for two evenings never got a third to stop.
     *
     * The break is not an event and there is nothing to attend. It is a bad season, a wall
     * with a poster on it or a square where one used to be, and a sentence a seventeen-year-
     * old finally says out loud in his own room. Nobody else is present, which is the
     * point: §7 B5 says the rupture is "gradual and remembered", and remembered means it
     * happened where nobody could see it.
     */
    id: 's3-open',
    at: 'bedroom',
    // (V3 §12) after the pin, in the same room — the wall is decided with the hand first
    trigger: 'clock',
    when: { flag: S2, all: [{ flag: 's2:done' }, { flag: S2_POSTER }], none: [{ flag: S3 }] },
    delayMs: 800,
    /**
     * (implementation pass 27.9.2026, B5 S2–S3) the spring of 1996 does not begin in the
     * bedroom any more. It begins at gate seven on a Saturday, where the argument of the
     * kiosk has become a banner on the concrete, a man in an old number-seven shirt, and a
     * steward looking at his watch — *"action, not opinion poll"*. The wall is where it ends.
     */
    do: [
      { a: 'events', events: DAY(S3, 1996, 6, at(16, 20), 'אביב 1996') },
      { a: 'card', titleHe: 'אביב 1996', subHe: 'שער 7 · עוד עונה', ms: 2600 },
      { a: 'travel', to: 'bloomfield-outside', spawn: 'fromRoute' },
    ],
  },
  {
    id: 's3-gate',
    at: 'bloomfield-outside',
    trigger: 'enter',
    when: { flag: S3, none: [{ flag: 's3:g:seen' }, { flag: 's3:g:left' }] },
    delayMs: 700,
    do: [
      { a: 'flag', flag: 's3:g:seen' },
      {
        a: 'lines',
        lines: [
          { who: null, text: 'שבת. שער 7, ארבע וחצי. מתחת לעמודים פורשים בד לבן על הבטון, והבחור מהדלת של הקיוסק מחזיק מכחול.' },
          { who: null, text: 'ליד הדלת האדומה, איש מבוגר בכובע קסקט. מתחת לסוודר — חולצה אדומה ישנה, והשבע מציץ מהגב. שניים צעירים ממנו אומרים לו משהו, ומחכים לראות מה הוא יעשה.' },
        ],
      },
      { a: 'toast', text: 'הבד על הבטון. האיש בחולצה הישנה. והסדרן, שמסתכל בשעון.', tone: 'plain' },
    ],
  },
  /** S3 — the world proves the conflict: gate seven is pulled shut, whatever he did */
  {
    id: 's3-shut',
    at: 'bloomfield-outside',
    trigger: 'clock',
    when: { flag: S3, any: [{ flag: 's3:g:done' }, { afterMinute: at(17, 10) }], none: [{ flag: 's3:g:left' }] },
    delayMs: 900,
    do: [{ a: 'talk', conversation: 's3-shut-96' }],
  },
  /** a boy who walked away from the gate before it shut still ends the day in his room */
  {
    id: 's3-home-late',
    trigger: 'clock',
    when: { flag: S3, afterMinute: at(19, 30), none: [{ flag: 's3:wall' }] },
    do: [{ a: 'flag', flag: 's3:g:left' }, { a: 'card', titleHe: 'בערב', subHe: 'החדר', ms: 2000 }, { a: 'travel', to: 'bedroom', spawn: 'start' }],
  },
  /** home, the same evening: the wall hears about the gate first (S4) */
  {
    id: 's3-home',
    at: 'bedroom',
    trigger: 'enter',
    when: { flag: S3, none: [{ flag: 's3:wall' }] },
    delayMs: 800,
    do: [{ a: 'flag', flag: 's3:wall' }, { a: 'talk', conversation: 's3-wall-96' }],
  },

]

/** the three answers to the court — the same words whichever way the court came to sit */
const S2_COURT: ChoiceDef[] = [
  /**
   * (implementation pass 27.9.2026, B5 S2) before answering, the claims are sorted by hand —
   * the table, the lawyer's theory, the stranger's anger, his father's minute — into what is
   * a fact, what is a claim and what is a feeling (`board:court-1995`). The court sits again
   * afterwards with one more answer on it for a boy who kept the three apart.
   */
  { id: 'sort', text: 'רגע. לסדר לעצמי מה מזה עובדה.', when: { notFlag: 's2:sorted' }, noteHe: 'כבר סידרת.', then: [{ e: 'minigame', id: 'board:court-1995' }] },
  {
    id: 'both',
    text: '"את השחקן אני אוהב. על המינוי — אולי פרדי צודק."',
    when: { flagIs: { flag: 'life:sinai:ledger', value: 'clean' } },
    hidden: true,
    then: [{ e: 'sinai', stance: 'doubting' }, { e: 'rel', who: 'freddy', axis: 'trust', delta: 5 }, { e: 'rel', who: 'ofir', axis: 'familiarity', delta: 2 }, { e: 'institution', key: 'legalUnderstanding', delta: 3 }, { e: 'goto', node: 's2-verdict' }],
  },
  { id: 'cut', text: 'לקטוע את פרדי: "מה השורה התחתונה?"', then: [{ e: 'institution', key: 'legalUnderstanding', delta: 3 }, { e: 'rel', who: 'freddy', axis: 'familiarity', delta: 4 }, { e: 'goto', node: 's2-verdict' }] },
  { id: 'listen', text: 'לתת לו לסיים.', then: [{ e: 'institution', key: 'legalUnderstanding', delta: 6 }, { e: 'personality', key: 'curiosity', delta: 2 }, { e: 'time', minutes: 20 }, { e: 'goto', node: 's2-verdict' }] },
  { id: 'defend', text: '"תנו לו עוד עונה. מגיע לו."', then: [{ e: 'sinai', stance: 'defending' }, { e: 'rel', who: 'ofir', axis: 'tension', delta: 5 }, { e: 'rel', who: 'amit', axis: 'tension', delta: 3 }, { e: 'wellbeing', key: 'loneliness', delta: 6 }, { e: 'redheart', key: 'loyaltyReturn', delta: 4 }, { e: 'goto', node: 's2-verdict' }] },
]

export const CONVERSATIONS_SINAI: Conversation[] = [
  { id: 'rafi-sinai', nameHe: 'רפי מהקיוסק', branches: [
    { when: { flag: S2 }, lines: [{ who: 'רפי מהקיוסק', text: 'שוב בית משפט אצלי. אם עומדים פה שעה — קונים משהו.' }] },
    { when: { flag: 's1:heard' }, lines: [{ who: 'רפי מהקיוסק', text: 'מה שנאמר פה — נאמר פה. אני לא מספר לאבא שלך.' }] },
    { lines: [{ who: 'רפי מהקיוסק', text: 'הרדיו על הדלפק, כמו תמיד. בשבע מתחילים. תזיז את המרפק, יש פה אנשים שקונים.' }] },
  ] },
  { id: 'ofir-sinai', nameHe: 'אופיר', branches: [
    { when: { sinaiIs: 'defending', flag: S2 }, lines: [{ who: 'אופיר', text: 'אתה עדיין שם. בסדר. רק תדע שאתה שם לבד.' }] },
    { when: { flag: S2 }, lines: [{ who: 'אופיר', text: 'טוב שהתעוררת. לא כיף, אבל טוב.' }] },
    { lines: [{ who: 'אופיר', text: 'גרעינים? קח, קח. הערב יהיה ארוך.' }] },
  ] },
  { id: 'amit-sinai', nameHe: 'עמית', branches: [{ lines: [{ who: 'עמית', text: 'אני לא אומר כלום. העיתון אומר. תקרא לבד, זה יותר משכנע.' }] }] },
  {
    id: 'freddy-sinai',
    nameHe: 'פרדי',
    branches: [
      // 1995, before the court sits: his voice is the one that asks a different question
      {
        when: { flag: S2, none: [{ flag: 's2:done' }, { flag: S2_FREDDY }] },
        lines: [
          { who: 'פרדי', text: 'עובדות זה יפה. תשאלו שאלה אחרת: מי נתן לו את התפקיד, ומי משאיר אותו בו. המאמן הוא לא הבעיה. המאמן הוא הכיסוי.' },
          { who: null, text: 'פרדי. עורך דין. חליפה מקומטת, תיק על הרצפה, ומשפטים שיש להם סעיפי משנה.' },
        ],
        then: [{ e: 'flag', flag: S2_FREDDY }, { e: 'institution', key: 'legalUnderstanding', delta: 2 }],
      },
      { lines: [{ who: 'פרדי', text: '"מי אשם" זו שאלה של קיוסק. "מי מחליט" זו שאלה של עורך דין. תזכור את ההבדל, הוא יעבוד בשבילך עוד עשרים שנה.' }], then: [{ e: 'institution', key: 'legalUnderstanding', delta: 2 }] },
    ],
  },
  {
    /** the newspaper Amit folded on the counter — picked up and read, not explained */
    id: 's2-paper',
    nameHe: null,
    branches: [
      { when: { flag: S2_PAPER }, lines: [{ who: null, text: 'הטבלה לא השתנתה מאז שקראת אותה.' }] },
      {
        lines: [
          { who: 'עמית', text: 'אני לא מתווכח איתך. אני שם עובדות על הדלפק. עונה שלמה. תסתכל בעצמך.' },
          { who: null, text: 'עמית פותח עיתון על הדלפק, בעמוד שכבר היה מקופל שם. הטבלה לא צריכה הסבר.' },
        ],
        then: [{ e: 'flag', flag: S2_PAPER }, { e: 'redheart', key: 'historyMemory', delta: 1 }],
      },
    ],
  },
  {
    /** the young man in the door, the same one as a year ago */
    id: 's2-fan',
    nameHe: 'אוהד צעיר',
    branches: [
      { when: { flag: S2_FAN }, lines: [{ who: 'אוהד צעיר', text: 'כיסוי־שמיסוי. שיילך.' }] },
      {
        lines: [
          { who: null, text: 'אותו בחור מהדלת, שנה אחרי. אותה שקית גרעינים.' },
          { who: 'אוהד צעיר', text: 'כיסוי־שמיסוי. שיילך.' },
        ],
        then: [{ e: 'flag', flag: S2_FAN }, { e: 'rel', who: 'ofir', axis: 'familiarity', delta: 1 }],
      },
    ],
  },
  { id: 'poster-look', nameHe: null, branches: [
    { when: { flag: 'life:poster:gone' }, lines: [{ who: null, text: 'ריבוע בהיר על הקיר.' }] },
    { when: { flag: 'life:poster:drawer' }, lines: [{ who: null, text: 'הקיר. הפוסטר במגירה. אתה יודע בדיוק איפה.' }] },
    { lines: [{ who: null, text: 'מספר שבע. צעיר, עם כדור, מחייך. תלוי שם מגיל שמונה.' }] },
  ] },
  {
    id: 's1-radio',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'הרדיו על הדלפק, בין המקרר לקופה. רפי מגביר, מנמיך, מגביר. אופיר על הארגז עם גרעינים, ובחור שלא ראית פה קודם עומד בדלת ומקלל בשקט.' },
          { who: null, text: 'זה נגמר כמו שזה נגמר. השדר אמר את זה בנימוס. הבחור בדלת לא.' },
          { who: 'אוהד צעיר', text: 'שבע. מספר שבע שלכם. כששיחק הוא היה שחקן. מאמן הוא לא. שיילך הביתה.' },
          { who: null, text: 'אופיר הנהן. רפי הוריד את הרדיו ולא אמר כלום. ואז כולם הסתכלו עליך, כי בשכונה הזאת כולם יודעים מה תלוי לך מעל המיטה.' },
        ],
        choices: [
          {
            id: 'defend',
            text: '"אתה לא היית שם כשהוא נתן את הכדור ההוא."',
            then: [{ e: 'flag', flag: 's1:argued' }, { e: 'flag', flag: 's1:heard' }, { e: 'sinai', stance: 'defending' }, { e: 'rel', who: 'ofir', axis: 'tension', delta: 4 }, { e: 'redheart', key: 'loyaltyReturn', delta: 4 }, { e: 'personality', key: 'courage', delta: 2 }, { e: 'goto', node: 's1-after' }],
          },
          {
            id: 'quiet',
            text: 'לשתוק. לא הערב.',
            then: [{ e: 'flag', flag: 's1:argued' }, { e: 'flag', flag: 's1:heard' }, { e: 'personality', key: 'reliability', delta: 1 }, { e: 'wellbeing', key: 'stress', delta: 3 }, { e: 'goto', node: 's1-after' }],
          },
          {
            id: 'agree',
            text: '"אולי הוא צודק."',
            then: [{ e: 'flag', flag: 's1:argued' }, { e: 'flag', flag: 's1:heard' }, { e: 'sinai', stance: 'doubting' }, { e: 'rel', who: 'ofir', axis: 'bond', delta: 2 }, { e: 'wellbeing', key: 'regret', delta: 3 }, { e: 'goto', node: 's1-after' }],
          },
        ],
      },
    ],
  },
  {
    id: 's1-after',
    nameHe: null,
    branches: [
      {
        when: { sinaiIs: 'defending' },
        lines: [
          { who: null, text: 'הבחור בדלת צחק. אופיר לא. רפי שם לפניך קפה שלא ביקשת, ולא רשם אותו על הפתק.' },
          { who: 'רפי מהקיוסק', text: 'אבא שלך היה אומר אותו דבר. בדיוק אותו דבר. עם אותו פרצוף.' },
          { who: null, text: 'זו הייתה מחמאה. זו גם הייתה אזהרה.' },
        ],
        then: [{ e: 'rel', who: 'kobi', axis: 'sharedHistory', delta: 3 }],
      },
      {
        lines: [
          { who: null, text: 'הבחור בדלת יצא. אופיר קם אחריו. רפי כיבה את הרדיו ואמר "ערב טוב" בקול של סוף משמרת.' },
          { who: null, text: 'הלכת הביתה עם משפט שלא אמרת. הוא כבד יותר ממשפט שאומרים.' },
        ],
      },
    ],
  },
  {
    id: 'poster-1994',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'החדר. הפוסטר מעל המיטה, מגיל שמונה, בחולצה שכבר לא מייצרים. הנייר התכהה בפינות ואחד הנעצים נשען.' },
          { who: null, text: 'מהסלון: אבא ואמא, בקול נמוך. שמעת את השם שלו פעם אחת.' },
        ],
        choices: [
          { id: 'look', text: 'להסתכל עליו רגע ולכבות את האור.', then: [{ e: 'redheart', key: 'historyMemory', delta: 2 }, { e: 'toast', text: 'כיבית את האור והוא המשיך לחייך. זה מה שפוסטרים עושים.', tone: 'plain' }] },
          { id: 'kobi', text: 'לצאת לסלון. לשאול את אבא מה הוא חושב.', then: [{ e: 'goto', node: 'kobi-sinai-1994' }] },
        ],
      },
    ],
  },
  {
    id: 'kobi-sinai-1994',
    nameHe: 'קובי',
    branches: [
      {
        lines: [
          { who: 'קובי', text: 'מה אני חושב.' },
          { who: 'קובי', text: 'ראיתי אותו משחק כשעוד סחבתי אותך על הכתפיים. ובדקה שמונים ושש, כשכבר עמדת לידי, ראיתי אותו נותן את הכדור במקום לקחת אותו.' },
          { who: 'קובי', text: 'והערב הוא היה מאמן גרוע. שני הדברים, באותו ראש. תתרגל, זה החיים.' },
        ],
        then: [{ e: 'rel', who: 'kobi', axis: 'bond', delta: 4 }, { e: 'remember', who: 'kobi', eventId: 'two-things-one-head-1994', significance: 'notable' }, { e: 'redheart', key: 'familyTradition', delta: 2 }],
      },
    ],
  },
  {
    id: 's2-court',
    nameHe: null,
    branches: [
      /** all three voices already heard in the room: the court only has to sit */
      {
        when: { all: [{ flag: S2_PAPER }, { flag: S2_FREDDY }, { flag: S2_FAN }] },
        lines: [{ who: null, text: 'העיתון של עמית, פרדי ליד המקרר, הבחור בדלת. שלושתם הסתכלו עליך באותו רגע, כאילו אתה השופט.' }],
        choices: S2_COURT,
      },
      {
        lines: [
          { who: 'עמית', text: 'אני לא מתווכח איתך. אני שם עובדות על הדלפק. עונה שלמה. תסתכל בעצמך.' },
          { who: null, text: 'עמית פותח עיתון על הדלפק, בעמוד שכבר היה מקופל שם. הטבלה לא צריכה הסבר.' },
          { who: 'פרדי', text: 'עובדות זה יפה. תשאלו שאלה אחרת: מי נתן לו את התפקיד, ומי משאיר אותו בו. המאמן הוא לא הבעיה. המאמן הוא הכיסוי.' },
          { who: null, text: 'פרדי. עורך דין. חליפה מקומטת, תיק על הרצפה, ומשפטים שיש להם סעיפי משנה.' },
          { who: 'אוהד צעיר', text: 'כיסוי־שמיסוי. שיילך.' },
        ],
        choices: S2_COURT,
      },
    ],
  },
  {
    id: 's2-verdict',
    nameHe: null,
    branches: [
      {
        when: { sinaiIs: 'defending' },
        lines: [
          { who: null, text: 'השורה התחתונה של פרדי הייתה שלוש מילים: "זה לא עליו." אחר כך הקיוסק התפזר. אופיר יצא בלי להגיד לילה טוב, ועמית אחריו.' },
          { who: null, text: 'רפי ניגב את הדלפק. "אתה יודע שאתה לבד בזה." אמרת שכן. הוא הנהן. "גם אבא שלך היה."' },
        ],
        then: [{ e: 'flag', flag: 's2:done' }, { e: 'toast', text: 'בלילה, בחדר, יחכה לך הפוסטר.', tone: 'plain' }],
      },
      {
        lines: [
          { who: null, text: 'השורה התחתונה של פרדי הייתה שלוש מילים: "זה לא עליו." ואתה שמעת את עצמך אומר, בפעם הראשונה, בקול שקט מאוד: אולי.' },
          { who: null, text: 'זה לא הרגיש כמו בגידה. זה הרגיש כמו לגדול, ולא אהבת את זה.' },
        ],
        then: [{ e: 'sinai', stance: 'doubting' }, { e: 'flag', flag: 's2:done' }, { e: 'wellbeing', key: 'regret', delta: 4 }, { e: 'toast', text: 'בלילה, בחדר, יחכה לך הפוסטר.', tone: 'plain' }],
      },
    ],
  },
  {
    id: 's2-poster',
    nameHe: null,
    branches: [
      {
        lines: [{ who: null, text: 'בלילה, בחדר. אתה עומד מול הקיר עם נעץ בין האצבעות ולא זוכר מתי שלפת אותו.' }],
        choices: [
          /**
           * The poster night stopped being the end of the chapter on 6.9.2026. It decides
           * what is on the wall; the third day (S3) decides what he believes, which is the
           * rupture Stage B §7 B5 asks for and which was living in the army chapter.
           */
          { id: 'keep', text: 'משאיר. על הקיר.', then: [{ e: 'flag', flag: 'life:poster:wall' }, { e: 'redheart', key: 'loyaltyReturn', delta: 3 }, { e: 'flag', flag: 's2:done' }, { e: 'flag', flag: S2_POSTER }] },
          { id: 'fold', text: 'מקפל. למגירה.', then: [{ e: 'flag', flag: 'life:poster:drawer' }, { e: 'redheart', key: 'historyMemory', delta: 3 }, { e: 'flag', flag: 's2:done' }, { e: 'flag', flag: S2_POSTER }] },
          { id: 'tear', text: 'מוריד.', then: [{ e: 'flag', flag: 'life:poster:gone' }, { e: 'personality', key: 'impulsiveness', delta: 3 }, { e: 'wellbeing', key: 'regret', delta: 5 }, { e: 'flag', flag: 's2:done' }, { e: 'flag', flag: S2_POSTER }] },
        ],
      },
    ],
  },
  /**
   * ============================================= שער 7, אביב 1996 (B5 S2–S4, 27.9.2026) ===
   * Three things to do with the hands, and none of them is a sentence about him. What the
   * boy did is `life:sinai:gate` (painted / defended / watched), and it outlives the year.
   */
  {
    id: 's3-banner-96',
    nameHe: 'אוהד צעיר',
    branches: [
      { when: { flag: 's3:g:done' }, lines: [{ who: 'אוהד צעיר', text: 'עוד מעט תולים. תראה מהצד השני.' }] },
      {
        lines: [
          { who: 'אוהד צעיר', text: 'אתה. מהקיוסק. שלוש מילים — "המאמן, הביתה." לא על השחקן. על המאמן.' },
          { who: null, text: 'הוא מושיט לך מכחול, ולא מסתכל אם לקחת. יש לו עוד שלושה.' },
        ],
        choices: [
          { id: 'paint', text: 'לקחת את המכחול. לרדת על הברכיים.', then: [{ e: 'minigame', id: 'chore:story:banner-96' }] },
          { id: 'no', text: '"לא את זה. לא אני."', then: [{ e: 'personality', key: 'stubbornness', delta: 1 }, { e: 'toast', text: '"בסדר. תסתכל איך אחרים עושים את זה."', tone: 'plain' }] },
        ],
      },
    ],
  },
  {
    id: 's3-seven-96',
    nameHe: 'אוהד ותיק',
    branches: [
      { when: { flagIs: { flag: 'life:sinai:gate', value: 'defended' } }, lines: [{ who: 'אוהד ותיק', text: 'תודה, ילד. לך תשב. אני בסדר.' }] },
      {
        lines: [
          { who: null, text: '"תוריד את החולצה, זקן. הוא הורס לנו את העונה." — "שבע של מי, של המאמן?"' },
          { who: null, text: 'האיש לא עונה להם. הוא מושך את הסוודר למטה, מעל החולצה, כמו שמכסים משהו שמגיע לו כבוד.' },
        ],
        choices: [
          {
            id: 'stand',
            text: 'לעמוד לידו. בלי להגיד כלום.',
            then: [
              { e: 'flag', flag: 's3:g:done' },
              { e: 'flagValue', flag: 'life:sinai:gate', value: 'defended' },
              { e: 'personality', key: 'empathy', delta: 3 },
              { e: 'personality', key: 'courage', delta: 2 },
              { e: 'redheart', key: 'loyaltyReturn', delta: 2 },
              { e: 'time', minutes: 8 },
              { e: 'goto', node: 's3-seven-stood' },
            ],
          },
          { id: 'away', text: 'לא להתערב.', then: [] },
        ],
      },
    ],
  },
  {
    id: 's3-seven-stood',
    nameHe: 'אוהד ותיק',
    branches: [
      {
        lines: [
          { who: null, text: 'עמדת לידו. השניים הסתכלו עליך, ועל החולצה שלו, ועל החולצה שלך, והלכו לעזור עם הבד.' },
          { who: 'אוהד ותיק', text: 'בשמונים ושש הוא נתן את הכדור במקום לקחת. אני הייתי שם.' },
          { who: 'פוגי', text: 'גם אני.' },
          { who: null, text: 'הוא מסתכל עליך כאילו אתה צעיר מדי בשביל זה. ואז מבין את החשבון, ומחייך.' },
        ],
      },
    ],
  },
  {
    id: 's3-watch-96',
    nameHe: null,
    branches: [
      { when: { flag: 's3:g:done' }, lines: [{ who: null, text: 'השער. הבד. האנשים. אתה כבר יודע איך זה נראה.' }] },
      {
        lines: [
          { who: null, text: 'אתה נשען על הגדר ולא זז. בד, מכחולים, שני צעירים שמחפשים במי להתחכך, איש בחולצה ישנה שלא נותן להם.' },
          { who: null, text: 'והסדרן, שמסתכל בשעון ואז על הבד ואז שוב בשעון. אתה רושם את כל זה בראש.' },
        ],
        then: [{ e: 'flag', flag: 's3:g:done' }, { e: 'flagValue', flag: 'life:sinai:gate', value: 'watched' }, { e: 'redheart', key: 'historyMemory', delta: 3 }, { e: 'personality', key: 'curiosity', delta: 2 }, { e: 'time', minutes: 10 }],
      },
    ],
  },
  {
    id: 's3-shut-96',
    nameHe: 'סדרן',
    branches: [
      {
        lines: [
          { who: null, text: 'הבד עולה על הגדר. שתי דקות, והסדרן כבר מושך את השער.' },
          { who: 'סדרן', text: 'שער 7 סגור! מי שבפנים — בפנים. מי שרוצה — מסביב, דרך חמש.' },
          { who: null, text: 'מבפנים שרים את השם שלו, ומחוץ לגדר צועקים עליו. אותו שם.' },
        ],
        choices: [
          { id: 'around', text: 'מסביב. דרך שער 5.', then: [{ e: 'flag', flag: 's3:g:left' }, { e: 'flag', flag: 's3:g:around' }, { e: 'time', minutes: 25 }, { e: 'goto', node: 's3-around-96' }] },
          { id: 'home', text: 'הביתה. היום לא.', then: [{ e: 'flag', flag: 's3:g:left' }, { e: 'flag', flag: 's3:g:home' }, { e: 'wellbeing', key: 'regret', delta: 2 }, { e: 'time', minutes: 40 }, { e: 'travel', to: 'bedroom', spawn: 'start' }] },
        ],
      },
    ],
  },
  {
    id: 's3-around-96',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'מסביב, דרך שער 5. צעירים, תוף, ואף אחד לא מכיר אותך. נכנסת כשכבר התחיל.' },
          { who: null, text: 'ראית אותו מלמעלה, על הקו, מאמן, עם הידיים בכיסים. מהיציע הזה הוא נראה קטן. לא ידעת אם זה בגלל המרחק.' },
        ],
        then: [{ e: 'redheart', key: 'terraceCulture', delta: 2 }, { e: 'time', minutes: 120 }, { e: 'travel', to: 'bedroom', spawn: 'start' }],
      },
    ],
  },
  /** S4 — the wall hears about the gate before the rupture is said (and never tells him what to think) */
  {
    id: 's3-wall-96',
    nameHe: null,
    branches: [
      {
        when: { flagIs: { flag: 'life:sinai:gate', value: 'painted' } },
        lines: [{ who: null, text: 'הצבע האדום עוד על הציפורניים. עשר אותיות נגד המאמן, ומעל המיטה — השחקן. אותו אדם.' }],
        then: [{ e: 'goto', node: 's3-room' }],
      },
      {
        when: { flagIs: { flag: 'life:sinai:gate', value: 'defended' } },
        lines: [{ who: null, text: 'עמדת היום ליד מישהו בחולצה עם שבע על הגב. עכשיו אתה עומד מול הקיר, ושם תלוי אותו מספר.' }],
        then: [{ e: 'goto', node: 's3-room' }],
      },
      {
        when: { flagIs: { flag: 'life:sinai:gate', value: 'watched' } },
        lines: [{ who: null, text: 'ראית היום איך בד נעשה, איך שער נסגר, איך אותו שם נשמע משני צדדים של גדר. הקיר שקט.' }],
        then: [{ e: 'goto', node: 's3-room' }],
      },
      { lines: [{ who: null, text: 'הביתה, לפני שהשער נסגר. הקיר מחכה, כמו תמיד.' }], then: [{ e: 'goto', node: 's3-room' }] },
    ],
  },
  {
    id: 's3-room',
    nameHe: null,
    branches: [
      {
        when: { flag: 'life:poster:gone' },
        lines: [
          { who: null, text: 'עוד עונה. הריבוע הבהיר על הקיר עדיין שם, ואתה עדיין יודע בדיוק מה היה בו.' },
          { who: null, text: 'ברדיו מהמטבח מישהו אמר את השם שלו, ולא בטוב.' },
        ],
        choices: [
          {
            id: 'broken',
            text: '"הוא לימד אותי מה זו החולצה. הוא כבר לא התשובה."',
            then: [
              { e: 'sinai', stance: 'broken' },
              { e: 'flag', flag: 'life:sinai:broken' },
              { e: 'wellbeing', key: 'regret', delta: 4 },
              { e: 'redheart', key: 'historyMemory', delta: 4 },
              { e: 'ending', id: 'torn' },
            ],
          },
          {
            id: 'memory',
            text: '"את השחקן אני עדיין אוהב. על המאמן — בעוד עשר שנים."',
            then: [
              { e: 'sinai', stance: 'reconciled-memory' },
              { e: 'flag', flag: 'life:sinai:reconciled' },
              { e: 'personality', key: 'empathy', delta: 3 },
              { e: 'redheart', key: 'loyaltyReturn', delta: 3 },
              { e: 'ending', id: 'doubting' },
            ],
          },
        ],
      },
      {
        when: { sinaiIs: 'defending' },
        lines: [
          { who: null, text: 'עוד עונה, וגרועה מהקודמת. הפוסטר עדיין על הקיר, ואתה כבר לא מסתכל עליו כשאתה נכנס.' },
          { who: null, text: 'זה לא קרה בערב אחד. זה קרה כמו שדברים כאלה קורים — קצת בכל פעם, עד שיום אחד אתה שומע את עצמך.' },
        ],
        choices: [
          {
            id: 'hold',
            text: 'הוא נשאר. גם עכשיו.',
            then: [
              { e: 'redheart', key: 'loyaltyReturn', delta: 5 },
              { e: 'wellbeing', key: 'loneliness', delta: 4 },
              { e: 'remember', who: 'kobi', eventId: 'never-took-it-down', significance: 'major' },
              { e: 'ending', id: 'defending' },
            ],
          },
          {
            id: 'broken',
            text: '"הוא לימד אותי מה זו החולצה. הוא כבר לא התשובה."',
            then: [
              { e: 'sinai', stance: 'broken' },
              { e: 'flag', flag: 'life:sinai:broken' },
              { e: 'wellbeing', key: 'regret', delta: 5 },
              { e: 'redheart', key: 'historyMemory', delta: 4 },
              { e: 'ending', id: 'torn' },
            ],
          },
          {
            id: 'memory',
            text: '"את השחקן אני עדיין אוהב. על המאמן — בעוד עשר שנים."',
            then: [
              { e: 'sinai', stance: 'reconciled-memory' },
              { e: 'flag', flag: 'life:sinai:reconciled' },
              { e: 'personality', key: 'empathy', delta: 3 },
              { e: 'redheart', key: 'loyaltyReturn', delta: 4 },
              { e: 'ending', id: 'doubting' },
            ],
          },
        ],
      },
      {
        lines: [
          { who: null, text: 'עוד עונה. הפוסטר במגירה, ואתה לא הוצאת אותו אף פעם, וגם לא זרקת.' },
          { who: null, text: 'ברדיו מהמטבח מישהו אמר את השם שלו. חיכית לראות מה אתה מרגיש, וזה לקח יותר זמן מפעם.' },
        ],
        choices: [
          {
            id: 'memory',
            text: '"את השחקן אני עדיין אוהב. על המאמן — בעוד עשר שנים."',
            then: [
              { e: 'sinai', stance: 'reconciled-memory' },
              { e: 'flag', flag: 'life:sinai:reconciled' },
              { e: 'personality', key: 'empathy', delta: 3 },
              { e: 'redheart', key: 'loyaltyReturn', delta: 3 },
              { e: 'ending', id: 'doubting' },
            ],
          },
          {
            id: 'broken',
            text: '"הוא כבר לא התשובה."',
            then: [
              { e: 'sinai', stance: 'broken' },
              { e: 'flag', flag: 'life:sinai:broken' },
              { e: 'wellbeing', key: 'regret', delta: 3 },
              { e: 'redheart', key: 'historyMemory', delta: 4 },
              { e: 'ending', id: 'torn' },
            ],
          },
        ],
      },
    ],
  },
]
