import { at } from '../clock'
import type { LifeState } from '../types'

import type { Beat } from './beats'
import type { EndingCard } from './chapter1986'
import type { Conversation } from './script'
import { PAGE_SUBJECT } from './chapter1999basket'
import { RHYTHM_SUBJECT } from './chapter1996army'

/** הבד — נעשה בלילה אחד, ונפרש ביציע ארבעה ימים אחר כך. אותו נושא לשתי הראיות. */
const BANNER_SUBJECT = 'הבד שהכנו בלילה'

/**
 * B11 · "ארבעה ימים" · 13–17.5.2000 — the two-part final exam, and the walk after it.
 *
 * Part I (`2000-title`): a Saturday at a small ground in the Hatikva quarter, where a draw
 * is enough. Who stands beside him; whether Kobi is there and an embrace is earned;
 * whether he looks for football friends, basketball friends or both; how 1998 changed
 * his ability to believe the news. No credits: the cup final is four days away.
 *
 * Part II (`2000-double`): four days of consequence as a compact schedule — two things
 * out of seven, and the exhaustion of the championship in the passenger seat — then the
 * national stadium again, penalties again, and a walk home that is one of seven outcome
 * families computed from the whole decade. Every one of them includes the Double. What
 * changes is who is beside him and what it means.
 *
 * **No score, scorer or opponent in a line.** The archive holds both days.
 */

export const PORTRAIT_2000: Record<string, string> = {
  'פוגי': 'faceHero80',
  'קובי': 'faceKobi',
  'רחל': 'faceRachel90',
  'אופיר': 'faceOfir',
  'עמית': 'faceAmit',
  'אפי': 'faceEfi',
  'לירון': 'faceLiron',
  'מישל': 'faceMichel',
  'אסף': 'faceAsaf',
  'שחור': 'faceShachor',
  'סוקו': 'faceSoko',
  'לימור': 'faceLimor',
  'הבוס': 'faceBoss',
  'אוהד': 'faceSupporter',
  'סדרן': 'faceUsher',
  // שני הקבועים של אלנבי — שני השחקנים האלה מתויגים `era: '*'` ב-`scenes.ts`, כלומר הם
  // עומדים שם בכל פרק, ולכן כל מפה צריכה את הפלייטים שלהם.
  'המוכר': 'faceVendor',
  'הגבר': 'faceSupporterB',
}

// ------------------------------------------------------------------ Part I ------

export function objectiveTitle(state: LifeState, sceneId: string): string | null {
  if (state.chapterDone) return null
  if (state.flags['t:over']) return null
  // (V3) after the whistle the day is a question, and the answer is somewhere in the crowd
  if (state.flags['t:matched'] && !state.flags['t:confirmed']) return 'השריקה אצלכם. עכשיו הידיעה מהמשחק המקביל — רדיו, טלפון. לא שמועה.'
  if (state.flags['t:route']) return sceneId === 'hatikva' ? null : 'שכונת התקווה. שלוש.'
  return 'האליפות יכולה להיסגר היום. איך מגיעים — ועם מי.'
}

export const ENDINGS_TITLE: Record<string, EndingCard> = {
  inside: {
    id: 'inside',
    titleHe: 'אלופים. אין קרדיטים.',
    bodyHe:
      'השריקה אצלכם לא הספיקה; רק כשהגיעה הידיעה מהמשחק המקביל ידעתם. ואז אתם אלופים. לא האמנת עד שאבא — או מי שהיה לידך — הסתכל עליך ואמר את המילה. שתיים ותשעים למדו אותך לא להאמין למספרים לפני השריקה. השריקה באה. האמנת. ועוד ארבעה ימים גמר גביע — אז אף אחד לא הולך לישון.',
    memoryHe: 'כרטיס ממגרש שכונתי, מודפס עקום. שמרת אותו ישר.',
    memoryItem: 'ticket-stub',
    presence: 'inside',
  },
  working: {
    id: 'working',
    titleHe: 'אלופים, ולא היית שם',
    bodyHe:
      'אלופים — ואת זה שמעת מרדיו של מישהו אחר. של לקוח מעל הדלפק, או של הסלון בשלוש אחר הצהריים. כשהשריקה באה לא היה לידך אף אחד שחיכה לזה כמוך, וצעקת בכל זאת, ומישהו ענה. עוד ארבעה ימים גמר גביע — ואת יום רביעי כבר סידרת.',
    memoryHe: 'דף עם שעה אחת מסומנת בעט. השעה שבה זה נגמר.',
    memoryItem: 'folded-paper',
    presence: 'working',
  },
}

export const BEATS_TITLE: Beat[] = [
  {
    id: 't-open',
    at: 'home',
    trigger: 'enter',
    when: { none: [{ flag: 't:opened' }] },
    delayMs: 700,
    do: [
      { a: 'flag', flag: 't:opened' },
      { a: 'events', events: [{ t: 'money.changed', agorot: 8000, why: 'משכורת' }] },
      { a: 'lines', lines: [{ who: null, text: 'שבת, אמצע מאי. עשרים ושתיים. האליפות יכולה להיסגר היום במגרש קטן בשכונת התקווה — אבל המשחק שלכם הוא לא כל החשבון.' }, { who: null, text: 'שתיים ותשעים לימדו אותך לא לחגוג מספר לפני שאתה יודע מה קרה גם במקום האחר. אתה רק לא מצליח לאכול.' }] },
    ],
  },
  {
    id: 't-work-debt',
    at: 'home',
    trigger: 'enter',
    when: { flag: 't:opened', armyAbove: { key: 'leaveDebt', min: 3 }, none: [{ flag: 't:route' }, { flag: 't:debt' }] },
    delayMs: 1500,
    do: [{ a: 'flag', flag: 't:debt' }, { a: 'talk', conversation: 't-boss' }],
  },
  {
    id: 't-kickoff-away',
    trigger: 'clock',
    when: { afterMinute: at(15, 0), none: [{ flag: 't:route' }, { flag: 't:over' }] },
    do: [{ a: 'flag', flag: 't:route' }, { a: 'talk', conversation: 't-radio' }],
  },
  {
    id: 't-ground',
    at: 'hatikva',
    trigger: 'enter',
    // `t:matched` first: the match is played once — the question after it is asked in the room
    when: { flag: 't:route', none: [{ flag: 't:over' }, { flag: 't:matched' }] },
    delayMs: 1000,
    do: [
      { a: 'flag', flag: 't:matched' },
      { a: 'card', titleHe: 'שכונת התקווה', subHe: 'המחזור שמכריע', ms: 2600, art: 'plate-2000-title' },
      { a: 'match', script: 'title-00' },
    ],
  },
  /**
   * הארכיון נפתח — the title, on film, once (§23.6; owner 25.9.2026: "מאשר את כולם.").
   *
   * Fires on the first tick after `t-champions` closes: the parallel result is confirmed
   * (`t:confirmed`, raised in `t-confirm` before the hug) and the credits are not yet
   * up. No `at`: a player who closed the hug and walked still gets the film where he
   * stands. `t:film` is the beat's own guard — the registry flag is raised by the film
   * on every outcome, but the sim never raises it. A film that cannot play falls
   * through to `t-credits` with nothing lost.
   */
  {
    id: 't-film',
    trigger: 'clock',
    when: { flag: 't:confirmed', none: [{ flag: 't:film' }, { flag: 't:over' }] },
    do: [{ a: 'flag', flag: 't:film' }, { a: 'cutscene', id: '2000-title' }],
  },
  /**
   * "אין קרדיטים" — the chapter's last line, and its ending, written in the closing
   * conversation itself (delta 90-C): a player who shut the box before its `then`
   * finds the beat armed again, because `t:over` is still down.
   */
  {
    id: 't-credits',
    trigger: 'clock',
    when: { all: [{ flag: 't:confirmed' }, { flag: 't:film' }], none: [{ flag: 't:over' }] },
    do: [{ a: 'talk', conversation: 't-close' }],
  },
]

export const CONVERSATIONS_TITLE: Conversation[] = [
  {
    id: 't-boss',
    nameHe: 'הבוס',
    // "(בטלפון.)" — השורה עצמה אומרת את זה
    remote: { 'הבוס': 'phone' },
    branches: [
      {
        lines: [
          { who: 'הבוס', text: '(בטלפון.) שבת. אני יודע שזה שבת. ואני יודע מה יש היום. ואני יודע גם כמה פעמים לא הגעת השנה. משמרת. שלוש עד עשר. אין דיון.' },
          { who: null, text: 'החוב הישן — כל חופשה שסחטת, כל פעם שמישהו כיסה עליך — הבשיל היום.' },
        ],
        choices: [
          { id: 'go', text: '"אני בא."', then: [{ e: 'flag', flag: 't:route' }, { e: 'flag', flag: 't:working' }, { e: 'personality', key: 'reliability', delta: 4 }, { e: 'wellbeing', key: 'regret', delta: 8 }, { e: 'presence', mode: 'working' }, { e: 'goto', node: 't-shift' }] },
          { id: 'no', text: '"לא. לא היום."', then: [{ e: 'flag', flag: 'life:quit:2000' }, { e: 'personality', key: 'riskTolerance', delta: 4 }, { e: 'personality', key: 'reliability', delta: -4 }, { e: 'toast', text: 'הוא ניתק. לא ידעת אם יש לך עבודה ביום ראשון.', tone: 'red' }] },
        ],
      },
    ],
  },
  {
    id: 't-shift',
    nameHe: null,
    branches: [{ lines: [{ who: null, text: 'המשמרת. שלוש עד עשר. רדיו של לקוח על הדלפק, ומישהו שלא הכרת חיבק אותך מעליו כשהשריקה באה.' }, { who: null, text: 'אלופים. לא היית שם. עוד ארבעה ימים.' }], then: [{ e: 'flag', flag: 't:over' }, { e: 'ending', id: 'working' }] }],
  },
  {
    id: 't-radio',
    nameHe: null,
    branches: [{ lines: [{ who: null, text: 'שלוש. לא יצאת. איפשהו בשכונת התקווה זה מתחיל בלעדיך.' }, { who: null, text: 'התיקו הגיע ברדיו. אלופים. צעקת לבד בסלון. אמא נכנסה מהמטבח ושאלה "מה?" ואמרת "אלופים" ובכית.' }], then: [{ e: 'flag', flag: 't:over' }, { e: 'presence', mode: 'radio' }, { e: 'ending', id: 'working' }] }],
  },
  {
    id: 'kobi-title',
    nameHe: 'קובי',
    branches: [
      { when: { flag: 't:route' }, lines: [{ who: 'קובי', text: 'נתראה שם. או שלא. מגרש בגודל של חצר, וכל העיר בתוכו. אני אמצא אותך.' }] },
      {
        lines: [{ who: 'קובי', text: 'תיקו. רק תיקו. אני לא מאמין למילה הזאת מאז שתיים ותשעים. אתה בא איתי? מגרש קטן. הולכים ברגל חצי דרך.' }],
        choices: [
          { id: 'yes', text: '"בא."', then: [{ e: 'flag', flag: 't:route' }, { e: 'flag', flag: 't:with-kobi' }, { e: 'rel', who: 'kobi', axis: 'bond', delta: 4 }, { e: 'time', minutes: 60 }, { e: 'travel', to: 'hatikva', spawn: 'start' }] },
          { id: 'later', text: '"אני מגיע לבד."', then: [{ e: 'toast', text: '"לבד." הוא הסתכל עליך רגע ארוך.', tone: 'plain' }] },
        ],
      },
    ],
  },
  {
    id: 'michel-title',
    nameHe: 'מישל',
    branches: [
      { when: { flag: 't:route' }, lines: [{ who: 'מישל', text: 'יצאנו. נתראה.' }] },
      { when: { gateEver: 'gate5' }, lines: [{ who: 'מישל', text: 'מיניבוס. חינם היום. אסף אמר שאלופים לא משלמים.' }], choices: [{ id: 'go', text: '"בא."', then: [{ e: 'flag', flag: 't:route' }, { e: 'flag', flag: 't:with-gate5' }, { e: 'time', minutes: 50 }, { e: 'travel', to: 'hatikva', spawn: 'start' }] }, { id: 'no', text: '"לא הפעם."', then: [] }] },
      { lines: [{ who: 'מישל', text: 'מיניבוס של שער 5. מלא.' }] },
    ],
  },
  {
    id: 'efi-title',
    nameHe: 'אפי',
    branches: [
      { when: { relationship: { who: 'efi', axis: 'trust', min: 45 } }, lines: [{ who: 'אפי', text: 'אלופים היום? כדורגל, אבל אלופים. אני בא איתך. אל תגיד לשחור.' }], choices: [{ id: 'go', text: '"בוא."', then: [{ e: 'flag', flag: 't:route' }, { e: 'flag', flag: 't:with-efi' }, { e: 'rel', who: 'efi', axis: 'bond', delta: 6 }, { e: 'remember', who: 'efi', eventId: 'came-to-football-2000', significance: 'major' }, { e: 'time', minutes: 60 }, { e: 'travel', to: 'hatikva', spawn: 'start' }] }] },
      { lines: [{ who: 'אפי', text: 'אלופים היום, אה. יפה לכם.' }, { who: null, text: '"לכם."' }] },
    ],
  },
  {
    id: 't-match',
    nameHe: null,
    branches: [
      {
        lines: [{ who: null, text: 'השריקה אצלכם. היציע מסתכל הצידה, אל רדיו, טלפון, פנים של מישהו שיודע.' }],
        /**
         * האישור המקביל — Director V3 §12, 24.9.2026. "לחפש את הידיעה" used to be a button
         * that said the news had come. Now it is the search: the room holds three voices
         * (`scenes.ts`, hatikva `t-src-*`) — a man on a balcony who has been shouting
         * "נגמר" since the seventieth minute, a transistor that has to be listened to twice,
         * and a stranger with a phone to one ear. The rumour counts for nothing; the radio
         * and the phone together close the count (`t-confirm`). Waiting is still an answer.
         */
        choices: [
          { id: 'listen', text: 'לחפש את הידיעה, לא את החגיגה.', then: [{ e: 'flag', flag: 't:listening' }, { e: 'toast', text: 'רדיו, טלפון, פנים של מישהו שיודע. לא מי שצועק הכי חזק.', tone: 'plain' }] },
          { id: 'wait', text: 'לחכות. 1998 לימדה אותך מה שווה שמועה.', then: [{ e: 'goto', node: 't-confirm' }] },
        ],
      },
    ],
  },
  {
    id: 't-src-rumour',
    nameHe: null,
    branches: [
      { when: { flag: 't:confirmed' }, lines: [{ who: null, text: 'הוא עדיין צועק. עכשיו הוא צודק.' }] },
      /**
       * 1998's lists, two years later (implementation pass 27.9.2026): the man on the balcony
       * is the terrace at Bloomfield all over again, and where the boy put the accusations on
       * Soko's step is how he hears a man shouting a result now.
       */
      {
        when: { flagIs: { flag: 'life:laces:lists', value: 'certain' } },
        lines: [
          { who: null, text: 'מישהו על מרפסת, בגופייה, צועק "נגמר! אלופים!" עם ידיים באוויר.' },
          { who: null, text: 'לפני שנתיים, על מדרגה ליד סוקו, היית כותב את זה בטור של מה שיודעים. הגוף שלך עוד רוצה. הפעם אתה מחכה.' },
        ],
        then: [{ e: 'flag', flag: 't:src:rumour' }, { e: 'personality', key: 'impulsiveness', delta: -2 }],
      },
      {
        when: { any: [{ flagIs: { flag: 'life:laces:lists', value: 'strict' } }, { flagIs: { flag: 'life:1990:notebook', value: 'clean' } }] },
        lines: [
          { who: null, text: 'מישהו על מרפסת, בגופייה, צועק "נגמר! אלופים!" עם ידיים באוויר.' },
          { who: null, text: 'אתה יודע באיזה טור זה נכתב. אתה יודע את זה מגיל שתים־עשרה. עוד מקור אחד.' },
        ],
        then: [{ e: 'flag', flag: 't:src:rumour' }],
      },
      {
        lines: [
          { who: null, text: 'מישהו על מרפסת, בגופייה, צועק "נגמר! אלופים!" עם ידיים באוויר.' },
          { who: null, text: 'הוא צעק את אותו דבר גם בדקה השבעים, כשזה עוד לא היה נכון. שמועה היא לא ידיעה — את זה 1998 לימדה אותך.' },
        ],
        then: [{ e: 'flag', flag: 't:src:rumour' }, { e: 'personality', key: 'impulsiveness', delta: -1 }],
      },
    ],
  },
  {
    id: 't-src-radio',
    nameHe: null,
    branches: [
      { when: { flag: 't:confirmed' }, lines: [{ who: null, text: 'הטרנזיסטור כבר מנגן שיר. השדר נגמר.' }] },
      {
        when: { all: [{ flag: 't:src:radio-half' }, { flag: 't:src:phone' }] },
        lines: [{ who: null, text: 'הצמדת את האוזן שוב. הפעם השדר ברור: המשחק המקביל נגמר. שני מקורות, אותה תוצאה.' }],
        then: [{ e: 'flag', flag: 't:src:radio' }, { e: 'goto', node: 't-confirm' }],
      },
      {
        when: { flag: 't:src:radio-half' },
        lines: [{ who: null, text: 'הצמדת את האוזן שוב. הפעם השדר ברור: המשחק המקביל נגמר. עכשיו רק צריך לשמוע את זה ממישהו שלא מחזיק את אותו רדיו.' }],
        then: [{ e: 'flag', flag: 't:src:radio' }],
      },
      {
        lines: [{ who: null, text: 'טרנזיסטור ביד של זקן ליד הגדר. השדר מהמשחק המקביל נקטע באמצע משפט, ורעש. הוא מכה בו בכף היד.' }],
        then: [{ e: 'flag', flag: 't:src:radio-half' }, { e: 'toast', text: 'עוד רגע. לנסות שוב.', tone: 'plain' }],
      },
    ],
  },
  {
    id: 't-src-phone',
    nameHe: null,
    branches: [
      { when: { flag: 't:confirmed' }, lines: [{ who: null, text: 'הוא כבר לא בטלפון. הוא מחבק מישהו שהוא לא מכיר.' }] },
      {
        when: { flag: 't:src:radio' },
        lines: [{ who: null, text: 'מישהו עם פלאפון, אצבע על האוזן השנייה: "נגמר שם. נגמר." אותו דבר שאמר הרדיו.' }],
        then: [{ e: 'flag', flag: 't:src:phone' }, { e: 'goto', node: 't-confirm' }],
      },
      {
        lines: [{ who: null, text: 'מישהו עם פלאפון, אצבע על האוזן השנייה, צועק לתוכו "נו? נו?" ואז: "נגמר שם." הוא לא יודע שאתה מקשיב.' }],
        then: [{ e: 'flag', flag: 't:src:phone' }, { e: 'toast', text: 'מקור אחד. עוד אחד — וזה כבר לא שמועה.', tone: 'plain' }],
      },
    ],
  },
  {
    id: 't-confirm',
    nameHe: null,
    branches: [
      { when: { flag: 't:with-kobi' }, lines: [{ who: null, text: 'הידיעה מגיעה מהמשחק המקביל. עכשיו החשבון סגור.' }, { who: 'פוגי', text: 'בטוח?' }, { who: 'קובי', text: 'בטוח.' }], then: [{ e: 'flag', flag: 't:confirmed' }, { e: 'goto', node: 't-champions' }] },
      { lines: [{ who: null, text: 'הידיעה מגיעה מהמשחק המקביל. לא שמועה, לא מישהו שחשב ששמע. עכשיו החשבון סגור.' }], then: [{ e: 'flag', flag: 't:confirmed' }, { e: 'goto', node: 't-champions' }] },
    ],
  },
  /**
   * (25.9.2026) The hug is the payoff, and the conversation ENDS on it: the archive film
   * (`t-film`, registry `2000-title`, owner-locked — "מאשר את כולם.") opens on the next
   * tick, and only then "אין קרדיטים" (`t-credits` → `t-close`). Until this pass the four
   * branches chained straight into `t-close`; a dialogue cannot open a film, so the seam
   * had to be a beat, and it sits AFTER the hug and never before it (MASTER §55).
   */
  {
    id: 't-champions',
    nameHe: null,
    branches: [
      { when: { flag: 't:with-kobi' }, lines: [{ who: 'קובי', text: 'אלופים. שתים־עשרה שנה.' }, { who: null, text: 'הוא אמר את זה אליך. לא למגרש. אליך. ואז חיבק, וזה היה הרבה יותר ממה שהיה בשמונים ושש, כי עכשיו היית בגובה שלו.' }], then: [{ e: 'sfx', key: 'crowd-goal', level: 0.8 }, { e: 'rel', who: 'kobi', axis: 'bond', delta: 8 }, { e: 'remember', who: 'kobi', eventId: 'champions-hug-2000', significance: 'major' }, { e: 'flag', flag: 'life:title:kobi' }] },
      { when: { flag: 't:with-efi' }, lines: [{ who: 'אפי', text: 'אז ככה זה אצלכם.' }, { who: 'פוגי', text: 'ככה.' }, { who: 'אפי', text: 'טוב. יפה.' }, { who: null, text: 'הוא חיבק אותך כמו אחרי הגביע ההוא. שבע שנים. אתה קפצת עליו הפעם.' }], then: [{ e: 'rel', who: 'efi', axis: 'sharedHistory', delta: 8 }, { e: 'flag', flag: 'life:title:efi' }, { e: 'goto', node: 't-call' }] },
      { when: { flag: 't:with-gate5' }, lines: [{ who: null, text: 'הבד עלה. אסף לא חייך — אסף אף פעם לא מחייך — אבל הוא הניח יד על הראש שלך רגע.' }], then: [{ e: 'rel', who: 'asaf', axis: 'bond', delta: 6 }, { e: 'flag', flag: 'life:title:gate5' }, { e: 'goto', node: 't-call' }] },
      { lines: [{ who: null, text: 'לבד באמצע כולם. אלופים. חיפשת פנים מוכרות ולא מצאת, ואז מצאת אחת, ואז זה לא היה משנה.' }], then: [{ e: 'wellbeing', key: 'loneliness', delta: 3 }, { e: 'goto', node: 't-call' }] },
    ],
  },
  /**
   * B11a S3 (implementation pass 27.9.2026) — *"who gets first hug/call — act, not dialogue
   * list."* The hug is whoever came with him; the CALL is the one thing he does with his own
   * hands in the minute after, and only a man who is not standing next to his father has
   * one to make. The stranger's phone from the fence is still warm. Ten years ago a boy put
   * an asimon into a pillar under the stand at Bloomfield (`life:1990:called`), and his
   * mother remembers who told her first.
   */
  {
    id: 't-call',
    nameHe: null,
    branches: [
      {
        lines: [{ who: null, text: 'האיש עם הפלאפון עוד ליד הגדר. הוא מושיט אותו לכל מי שעובר, כמו שמושיטים סיגריה.' }],
        choices: [
          { id: 'call', text: 'לקחת את הפלאפון. להתקשר הביתה.', then: [{ e: 'goto', node: 't-call-home' }] },
          { id: 'stay', text: 'לא. להישאר כאן, בתוך זה.', then: [{ e: 'flagValue', flag: 'life:title:call', value: 'stayed' }, { e: 'redheart', key: 'terraceCulture', delta: 2 }] },
        ],
      },
    ],
  },
  {
    id: 't-call-home',
    nameHe: 'רחל',
    remote: { 'רחל': 'phone', 'קובי': 'phone' },
    branches: [
      {
        when: { flagIs: { flag: 'life:1990:called', value: 'first' } },
        lines: [
          { who: 'רחל', text: 'הלו? — אני יודעת. אבא כבר קופץ פה על הספה.' },
          { who: 'רחל', text: 'בתשעים אתה היית הראשון. מהטלפון שמתחת ליציע. היום הרדיו ניצח אותך.' },
          { who: null, text: 'היא צוחקת. ברקע קובי צועק משהו שאי אפשר להבין, ואת זה כן אפשר להבין.' },
        ],
        then: [{ e: 'flagValue', flag: 'life:title:call', value: 'home' }, { e: 'rel', who: 'rachel', axis: 'bond', delta: 4 }, { e: 'rel', who: 'kobi', axis: 'bond', delta: 3 }, { e: 'remember', who: 'rachel', eventId: 'called-home-2000', significance: 'notable' }],
      },
      {
        lines: [
          { who: 'קובי', text: '(עונה לפני הצלצול השני.) נו?' },
          { who: 'פוגי', text: 'אלופים.' },
          { who: null, text: 'שקט. לא של קו שנפל — של אדם שמנסה לא לבכות בטלפון של זר.' },
          { who: 'קובי', text: 'תביא את עצמך הביתה. אני מחכה ער.' },
        ],
        then: [{ e: 'flagValue', flag: 'life:title:call', value: 'home' }, { e: 'rel', who: 'kobi', axis: 'bond', delta: 5 }, { e: 'remember', who: 'kobi', eventId: 'called-home-2000', significance: 'notable' }],
      },
    ],
  },
  {
    id: 't-close',
    nameHe: null,
    branches: [{ lines: [{ who: null, text: 'אין קרדיטים. עוד ארבעה ימים גמר גביע.' }], then: [{ e: 'flag', flag: 't:over' }, { e: 'ending', id: 'inside' }] }],
  },
]

// ------------------------------------------------------------------ Part II -----

export type OutcomeFamily = 'inherited-chosen' | 'gate5-builder' | 'gate7-keeper' | 'two-halls' | 'always-travelling' | 'heard-elsewhere' | 'alone-in-crowd'

/**
 * משפחות הסיום — the walk home is one of seven, read off the whole decade.
 * Not good/bad. Each includes the Double; each says who was beside him.
 */
export function outcomeFamily(state: LifeState): OutcomeFamily {
  const kobi = state.relationships['kobi']?.bond ?? 50
  const asaf = state.relationships['asaf']?.bond ?? 0
  const shachor = state.relationships['shachor']?.bond ?? 0
  const missed = state.missedAnchors.length
  const attended = state.attendedAnchors.length
  const gate = state.gate.identity
  const seed = state.institution.supporterOwnershipSeed
  const travel = state.redHeart.travelDrive
  const lonely = state.wellbeing.loneliness
  if (missed >= attended + 2) return 'heard-elsewhere'
  if (lonely >= 45 && kobi < 45 && asaf < 20) return 'alone-in-crowd'
  if (seed >= 25 && shachor >= 12 && state.redHeart.basketballLove >= 25) return 'two-halls'
  if (gate === 'gate5' && asaf >= 8) return kobi >= 55 ? 'inherited-chosen' : 'gate5-builder'
  if (travel >= 22) return 'always-travelling'
  if (gate === 'gate7' || gate === 'between') return kobi >= 55 && asaf >= 6 ? 'inherited-chosen' : 'gate7-keeper'
  /**
   * מי שלא עמד באף שער — the outcome that was being silently overwritten.
   *
   * In the winter of 1996 a player can walk away from both gates (`gate: 'outside'`,
   * reason `'conflict'`). Until 6.9.2026 this function never tested for it, so four years
   * later the game handed that person the "inherited and chose" walk — the one ending that
   * is specifically about standing between two people who both wanted you. The brief is
   * explicit that `outside` is not a neutral win (§7 B6); it is also not a defeat. It is a
   * man in a crowd who belongs to no part of it, which is `alone-in-crowd` unless somebody
   * has since found him.
   */
  if (gate === 'outside') return kobi >= 55 || asaf >= 8 || shachor >= 10 ? 'gate7-keeper' : 'alone-in-crowd'
  return 'inherited-chosen'
}

export function objectiveDouble(state: LifeState, sceneId: string): string | null {
  if (state.chapterDone) return null
  if (state.flags['d:over']) return null
  if (state.flags['d:final']) return sceneId === 'ramat-gan' ? null : 'רמת גן. הגמר.'
  return state.flags['d:pick1'] ? 'עוד אחר הצהריים אחד לפני הגמר. לך למקום שחשוב לך.' : 'יום ראשון אחרי האליפות. הגוף, הבית, העבודה, היציע או האולם — לא הכול.'
}

export const ENDINGS_DOUBLE: Record<string, EndingCard> = {
  /**
   * הצעיף שעובר — הסיום היחיד כאן שלא נקבע לפי מי אתה, אלא לפי מה שעשית עם דבר אחד.
   *
   * אבא נתן לך אותו בשער בלומפילד ב-1986 ואמר מילה אחת. ארבע־עשרה שנה אחר כך, ילד שלא היה
   * בשנות התשעים בכלל הסתכל עליו, ואתה הורדת אותו. זה לא סיום טוב יותר מהאחרים. הוא אחר,
   * וזה מה שמאור ביקש: מי שנותן אותו ב-2000 מקבל סיום אחר.
   */
  'passed-on': {
    id: 'passed-on',
    titleHe: 'ככה זה עובר',
    bodyHe:
      'דאבל. ובדרך החוצה, ילד בן שבע שלא היה פה בשנות התשעים בכלל הסתכל על הצעיף שלך כמו שאתה הסתכלת פעם על משהו. הורדת אותו ושמת עליו, בלי לומר כלום — כמו שעשו לך, באותו שער, ארבע־עשרה שנה קודם. הוא נגרר לו על הרצפה. הצוואר שלך היה קר כל הדרך הביתה, ולא היה אכפת לך.',
    memoryHe: 'כלום. שם ריק על המדף, ואתה יודע בדיוק מה היה שם.',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
  'inherited-chosen': {
    id: 'inherited-chosen',
    titleHe: 'ירשת. ובחרת.',
    bodyHe:
      'דאבל. הלכת הביתה עם אבא בצד אחד ועם האנשים שבחרת בצד השני, ובאמצע — אתה, שהצליח להחזיק את שניהם בלי להפיל. זה לא היה נוח. זה לא יהיה נוח. אבל זה שלך: הבית שירשת, והבית שבנית, באותו רחוב.',
    memoryHe: 'שני כרטיסים: של האליפות ושל הגביע. באותו כיס.',
    memoryItem: 'ticket-stub',
    presence: 'inside',
  },
  'gate5-builder': {
    id: 'gate5-builder',
    titleHe: 'בנית משהו',
    bodyHe:
      'דאבל. הלכת הביתה עם הבד על הכתף, עם אנשים שלפני ארבע שנים לא הכרת ושהיום מכירים אותך בשם. עייף עד העצם. ובבית — אבא, שראה את זה מהצד השני של האצטדיון, ושתיקה שעוד לא נסגרה. שני הדברים אמיתיים. גם זה בנית.',
    memoryHe: 'חתיכה מהבד. אסף חתך לכולם.',
    memoryItem: 'scarf',
    presence: 'inside',
  },
  'gate7-keeper': {
    id: 'gate7-keeper',
    titleHe: 'שומר השער',
    bodyHe:
      'דאבל. שער 7, אבא, השירים האיטיים, האנשים שיודעים אותם עשרים שנה. הלכת הביתה עם מה שקיבלת, שלם. ומהצד השני של היציע, כל הדרך, שמעת תוף שלא היית איתו. יום אחד תדע אם זה חסר לך.',
    memoryHe: 'צעיף ישן. של אבא. הוא נתן לך אותו בדרך הביתה בלי להגיד למה.',
    memoryItem: 'scarf',
    presence: 'inside',
  },
  'two-halls': {
    id: 'two-halls',
    titleHe: 'שני בתים, חיים אחד',
    bodyHe:
      'דאבל. חגגת — ובאמצע החגיגה חשבת על אולם קטן על הירקון שירד פעמיים ועל דף משבצות במגירה. שחור לא היה בגמר. הלכת אליו אחרי, עם הגביע בראש ועם האולם בלב. "מזל טוב," הוא אמר. "עכשיו תחזור לעבודה."',
    memoryHe: 'כרטיס הגמר, ובתוכו, מקופל, הדף עם שלוש הכותרות.',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
  'always-travelling': {
    id: 'always-travelling',
    titleHe: 'תמיד בדרך',
    bodyHe:
      'דאבל. הגעת לגמר כמו שהגעת לכל מקום בעשור הזה: באוטו של מישהו, במיניבוס, בטרמפ, ברגל. אנשים זוכרים אותך גם מהפעמים שהצלת מישהו וגם מהפעמים שלא הגעת. הלכת הביתה לבד ברגל, כי זה מה שאתה עושה, ובדרך שרת.',
    memoryHe: 'ערימת כרטיסי אוטובוס, מגומיים. עשור.',
    memoryItem: 'ticket-stub',
    presence: 'inside',
  },
  'heard-elsewhere': {
    id: 'heard-elsewhere',
    titleHe: 'שמעת ממקום אחר',
    bodyHe:
      'דאבל. ולא היית — לא בזה, ולא ברוב הגדולים של העשור. בסיס, משמרת, הבטחה, כסף. אבל היית מישהו שאפשר לסמוך עליו, ומישהו התקשר להגיד לך את זה בשתיים בלילה, בוכה. זה אדם אחר ממי שהיה שם. גם הוא בנה משהו.',
    memoryHe: 'פתק ליד הטלפון: "התקשרו. אלופים. גביע. אמרו שאתה בסדר."',
    memoryItem: 'folded-paper',
    presence: 'radio',
  },
  'alone-in-crowd': {
    id: 'alone-in-crowd',
    titleHe: 'לבד בתוך הקהל',
    bodyHe:
      'דאבל. היית שם, כמו תמיד. הכי אדום באצטדיון. ובדרך הביתה לא היה למי לצלצל. אבא רחוק, החברים בצד אחר, האולם — עזבת. השמחה הייתה אמיתית. גם הבדידות. זה מה שהעשור עשה ממך, ועוד יש עשור.',
    memoryHe: 'כרטיס הגמר. אף שם עליו.',
    memoryItem: 'ticket-stub',
    presence: 'inside',
  },
}

/** an afternoon was spent (V3 §12); arriving at the national stadium, and through its gates */
export const D_DID = 'd:did'
export const D_ARRIVED = 'd:arrived'
export const D_IN = 'd:in'

export const BEATS_DOUBLE: Beat[] = [
  /**
   * הרגע השלישי של הצעיף — לפני שהערב נסגר, בזמן שעוד אפשר לתת.
   *
   * **`d:over`, ולא `d:stadium`** (21.9.2026): `d:stadium` לא נכתב בשום מקום, לא בתוכן
   * ולא במנוע, כך שהרגע הזה לא יכול היה לירות גם אחרי שהקידומת `scarf:` תוקנה. אחרי
   * השריקה, ברמת גן, לפני ההליכה הביתה — ו-`d-after` בא אחריו כי הוא מופיע אחריו ברשימה
   * והביטים רצים אחד-אחד.
   */
  /**
   * הארכיון נפתח — the shoot-out, on film, once (§23.6; owner 25.9.2026: "מאשר את כולם.").
   *
   * `d:over` is raised by "זה נגמר. דאבל." (`d-pens`, the last talk of `double-00`), so the
   * film is the first thing the terrace does after the payoff and before the scarf and the
   * walk home — it is listed first and the runner takes the first due beat. The full
   * summary (`2000-double`) stays a film the match report offers; this is the only one
   * that opens by itself in the chapter. `d:film` guards the beat (the sim never raises
   * the registry flag); a film that cannot play hands straight on to `d-after`.
   */
  {
    id: 'd-film',
    trigger: 'clock',
    when: { flag: 'd:over', none: [{ flag: 'd:film' }, { flag: 'd:walked' }] },
    do: [{ a: 'flag', flag: 'd:film' }, { a: 'cutscene', id: '2000-penalties' }],
  },
  {
    id: 'd-scarf',
    trigger: 'clock',
    when: { all: [{ flag: 'd:over' }, { flag: 'scarf:given' }], none: [{ flag: 'scarf:asked:2000' }, { flag: 'd:walked' }] },
    do: [{ a: 'flag', flag: 'scarf:asked:2000' }, { a: 'talk', conversation: 'scarf-kid-2000' }],
  },
  // the walk home: the family is read off the decade, once, and the conversation follows
  {
    id: 'd-after',
    trigger: 'clock',
    when: { flag: 'd:over', none: [{ flag: 'd:walked' }] },
    do: [
      { a: 'flag', flag: 'd:walked' },
      { a: 'derive', events: (state) => [{ t: 'flag.raised', flag: `life:family:${outcomeFamily(state)}` }] },
      { a: 'talk', conversation: 'd-walk' },
    ],
  },
  {
    id: 'd-open',
    at: 'home',
    trigger: 'enter',
    when: { none: [{ flag: 'd:opened' }] },
    delayMs: 700,
    do: [
      { a: 'flag', flag: 'd:opened' },
      // By May 2000 Pogi has known the way to Ussishkin for fourteen years; the afternoon
      // beat there (d-uss-afternoon) must never hang on a flag an earlier chapter only
      // MAY have raised (life:worldlines, delta 87). Knowledge, not a key.
      { a: 'flag', flag: 'life:knows:hall' },
      { a: 'events', events: [{ t: 'money.changed', agorot: 6000, why: 'מה שנשאר' }, { t: 'energy.changed', delta: -35 }] },
      { a: 'flag', flag: 'd:afternoon1' }, { a: 'lines', lines: [{ who: null, text: 'יום ראשון. ארבעה ימים לגמר. אין רשימת משימות — יש עיר, גוף, משפחה ואנשים שמחכים. לך לאן שאתה בוחר.' }] },
    ],
  },
  /**
   * (Director V3 §12, 25.9.2026) "שני אחר־צהריים משחקיים וגמר — לא 'בחר 2 מתוך 7'".
   *
   * The four rooms used to open a menu at the door the moment he walked in. They are four
   * places to DO something now, and what is done there is done with the hands: the sofa
   * with his parents and the bed (sit), the red box on the shelf (take), a double shift at
   * Rafi's counter (`chore:story:shift-00`, serving), the ticket and the minibus seat at the
   * same counter (buy), the banner on the floor by Bloomfield (`chore:story:banner-00`, the
   * brush), Shachor's crates at Ussishkin (`chore:story:uss-00`). Each raises `d:did`, and
   * the week answers it: the first is Sunday, a cut to Tuesday, the second is the eve of
   * the final (`d-next-1`, `d-next-2` → `d-next-afternoon`, the chapter's own words).
   */
  {
    id: 'd-next-1',
    trigger: 'clock',
    when: { flag: D_DID, none: [{ flag: 'd:pick1' }, { flag: 'd:final' }] },
    delayMs: 700,
    do: [{ a: 'card', titleHe: 'יום שלישי', subHe: 'אחר הצהריים השני', ms: 2200 }, { a: 'talk', conversation: 'd-next-afternoon' }],
  },
  {
    id: 'd-next-2',
    trigger: 'clock',
    when: { flag: D_DID, all: [{ flag: 'd:pick1' }], none: [{ flag: 'd:final' }] },
    delayMs: 700,
    do: [{ a: 'talk', conversation: 'd-next-afternoon' }],
  },
  /** four days pass whether or not he spends them: at nine the Wednesday comes anyway */
  {
    id: 'd-idle',
    trigger: 'clock',
    when: { flag: 'd:opened', afterMinute: at(21, 0), none: [{ flag: 'd:final' }, { flag: D_DID }] },
    do: [
      { a: 'events', events: [{ t: 'flag.raised', flag: 'd:final' }] },
      { a: 'card', titleHe: 'יום רביעי', subHe: 'הימים עברו בלי לשאול אותך', ms: 2400 },
      { a: 'talk', conversation: 'd-go' },
    ],
  },
  {
    /** arriving is the forecourt: the gates are pushed through (`rg-gate-00`), then the match */
    id: 'd-stadium',
    at: 'ramat-gan',
    trigger: 'enter',
    when: { flag: 'd:final', none: [{ flag: 'd:over' }, { flag: D_ARRIVED }] },
    delayMs: 1000,
    do: [
      { a: 'flag', flag: D_ARRIVED },
      { a: 'card', titleHe: 'אצטדיון רמת גן', subHe: 'גמר גביע המדינה · הדאבל', ms: 2600, art: 'plate-2000-double' },
      { a: 'toast', text: 'השערים. אותו אצטדיון, שנה אחרי. אותו דחף בגב.', tone: 'plain' },
    ],
  },
  {
    id: 'd-kickoff',
    at: 'ramat-gan',
    trigger: 'clock',
    // armed again if the final was walked out of before its end (as the arrival beat was)
    when: { flag: D_IN, none: [{ flag: 'd:over' }] },
    delayMs: 800,
    do: [{ a: 'match', script: 'double-00' }],
  },
  {
    id: 'd-swept-in',
    at: 'ramat-gan',
    trigger: 'clock',
    when: { flag: D_ARRIVED, afterMinute: at(19, 45), none: [{ flag: D_IN }, { flag: 'd:over' }] },
    do: [{ a: 'flag', flag: D_IN }, { a: 'toast', text: 'הקהל נושא אותך פנימה. אין מי שיעצור ילד בן עשרים ושתיים שרץ לגמר.', tone: 'plain' }],
  },
]

export const CONVERSATIONS_DOUBLE: Conversation[] = [
  /** the gates of Ramat Gan, a year after the first final (V3 §12 "crowd entry") */
  {
    id: 'rg-gate-00',
    nameHe: null,
    branches: [
      {
        when: { flag: 'd:ticket' },
        lines: [{ who: null, text: 'הכרטיס ביד, בכיס, ביד. הכרטיסן קורע אותו ומחזיר לך חצי, ואתה שם אותו בכיס של החולצה, ליד הלב, כמו מישהו שכבר עשה את זה.' }],
        then: [{ e: 'flag', flag: D_IN }],
      },
      {
        lines: [{ who: null, text: 'בלי כרטיס מסודר. מישל בשער הצדדי מנופף, מישהו מושך אותך בשרוול, ואתה עובר בין שני גבים בלי לשאול איך.' }],
        then: [{ e: 'flag', flag: D_IN }, { e: 'redheart', key: 'community', delta: 2 }],
      },
    ],
  },
  {
    id: 'd-home-afternoon', nameHe: null, branches: [
      { when: { flag: 'd:pick1:family' }, lines: [{ who: null, text: 'כבר ישבת איתם.' }] },
      { lines: [{ who: null, text: 'בבית השקט נשמע פתאום חזק יותר מהאליפות.' }], choices: [
        { id: 'family', text: 'לשבת עם אבא ואמא בלי לדבר על הגמר.', then: [{ e: 'rel', who: 'kobi', axis: 'bond', delta: 6 }, { e: 'rel', who: 'rachel', axis: 'bond', delta: 6 }, { e: 'energy', delta: 10 }, { e: 'flag', flag: 'd:pick1:family' }, { e: 'flag', flag: D_DID }] },
        { id: 'later', text: 'לא עכשיו.', then: [] },
      ] },
    ],
  },
  {
    id: 'd-bed-afternoon', nameHe: null, branches: [
      { when: { flag: 'd:pick1:sleep' }, lines: [{ who: null, text: 'כבר ישנת.' }] },
      { lines: [{ who: null, text: 'המיטה. ארבעה ימים לגמר, ובגוף עוד כל האליפות.' }], choices: [
        { id: 'sleep', text: 'לישון באמת.', then: [{ e: 'energy', delta: 40 }, { e: 'flag', flag: 'd:pick1:sleep' }, { e: 'flag', flag: D_DID }] },
        { id: 'later', text: 'לא עכשיו.', then: [] },
      ] },
    ],
  },
  {
    id: 'd-box-afternoon', nameHe: null, branches: [
      { when: { flag: 'd:pick1:box' }, lines: [{ who: null, text: 'כבר פתחת אותה היום.' }] },
      { lines: [{ who: null, text: 'הקופסה האדומה על המדף. המכסה לא נסגר עד הסוף כבר כמה שנים.' }], choices: [
        { id: 'box', text: 'לעלות לחדר ולפתוח את הקופסה האדומה.', then: [{ e: 'redheart', key: 'historyMemory', delta: 6 }, { e: 'flag', flag: 'd:pick1:box' }, { e: 'box' }, { e: 'goto', node: 'd-box' }] },
        { id: 'later', text: 'לא עכשיו.', then: [] },
      ] },
    ],
  },
  {
    id: 'd-kiosk-afternoon', nameHe: null, branches: [
      { lines: [{ who: null, text: 'אצל רפי יש עבודה, ויש בחלון דף ישן שאתה מכיר טוב מדי.' }], choices: [
        // (V3 §12) the double shift is served, customer by customer (`chore:story:shift-00`)
        { id: 'work', text: 'לקחת משמרת. הגמר עולה כסף.', when: { none: [{ flag: 'd:pick1:work' }] }, noteHe: 'כבר עשית את המשמרת.', then: [{ e: 'minigame', id: 'chore:story:shift-00' }] },
        { id: 'page', text: 'לחזור לדף ולתקן את מה שאתה יודע שלא נכון.', when: { all: [{ flag: 'life:page:pinned' }], none: [{ flag: 'd:pick1:page' }] }, hidden: true, then: [{ e: 'flag', flag: 'd:pick1:page' }, { e: 'goto', node: 'd-page' }] },
        { id: 'later', text: 'לא עכשיו.', then: [] },
      ] },
    ],
  },
  {
    /**
     * the ticket and the minibus seat, bought at the counter (`d-ticket` hotspot, verb buy).
     * (23.9.2026) restored from the pre-overlay unit: `d-go` still reads `d:ticket`.
     */
    id: 'd-ticket-afternoon', nameHe: null, branches: [
      { when: { flag: 'd:pick1:ticket' }, lines: [{ who: null, text: 'הכרטיס כבר בכיס.' }] },
      { lines: [{ who: null, text: 'על הדלפק, ליד הקופה: פנקס ההסעות של מישל וחבילת כרטיסים לגמר בגומייה.' }], choices: [
        { id: 'ticket', text: 'לסדר כרטיס וההסעה — שישים שקל. ברור.', when: { minAgorot: 6000 }, noteHe: 'אין שישים.', then: [{ e: 'money', agorot: -6000, why: 'כרטיס לגמר' }, { e: 'give', item: 'ticket-stub' }, { e: 'flag', flag: 'd:ticket' }, { e: 'flag', flag: 'd:pick1:ticket' }, { e: 'flag', flag: D_DID }] },
        { id: 'later', text: 'לא עכשיו.', then: [] },
      ] },
    ],
  },
  {
    id: 'd-gate5-afternoon', nameHe: null, branches: [
      // (V3 §12) on the knees with the brush: the banner is painted by walking it (`chore:story:banner-00`)
      { when: { gateEver: 'gate5' }, lines: [{ who: null, text: 'ליד בלומפילד כבר פרוש בד על הרצפה. אף אחד לא קורא לזה משימה.' }], choices: [{ id: 'banner', text: 'לרדת על הברכיים ולעבוד איתם.', when: { none: [{ flag: 'd:pick1:gate5' }] }, noteHe: 'כבר עבדת איתם היום.', then: [{ e: 'rel', who: 'asaf', axis: 'bond', delta: 6 }, { e: 'redheart', key: 'terraceCulture', delta: 5 }, { e: 'flag', flag: 'life:banner:2000' }, { e: 'proof', kind: 'creation_proof', proofId: 'creation_proof:{chapter}:banner', subjectHe: BANNER_SUBJECT, noteHe: 'לילה שלם על הרצפה של מחסן, עם צבע שמתייבש לאט.' }, { e: 'skill', skill: 'creativity', delta: 3, why: 'הכין בד' }, { e: 'minigame', id: 'chore:story:banner-00' }] }, { id: 'later', text: 'לא עכשיו.', then: [] }] },
      { lines: [{ who: null, text: 'אתה מכיר את המקום. לא את העבודה הזאת. היום אין לך סיבה להישאר.' }] },
    ],
  },
  {
    id: 'd-uss-afternoon', nameHe: null, branches: [
      // (V3 §12) the side he is told to lift is lifted, crate by crate (`chore:story:uss-00`)
      { lines: [{ who: 'שחור', text: 'אליפות יפה. עכשיו תרים את הצד הזה.' }], choices: [{ id: 'help', text: 'להרים. ברור.', when: { none: [{ flag: 'd:pick1:uss' }] }, noteHe: 'כבר הרמת היום.', then: [{ e: 'rel', who: 'shachor', axis: 'bond', delta: 6 }, { e: 'institution', key: 'supporterOwnershipSeed', delta: 6 }, { e: 'minigame', id: 'chore:story:uss-00' }] }, { id: 'later', text: 'לא עכשיו.', then: [] }] },
    ],
  },
  {
    id: 'd-page',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'הדף הישן עדיין שם. הפעם אתה לא רק זוכר מה כאב בו — אתה יודע מה צריך לתקן.' },
          { who: null, text: 'אתה מוסיף הערה קטנה בשוליים ומשאיר את המקור ליד. לא מנצח ויכוח; משאיר עקבה אמינה יותר.' },
        ],
        then: [
          { e: 'redheart', key: 'historyMemory', delta: 5 },
          { e: 'personality', key: 'honesty', delta: 2 },
          { e: 'flag', flag: 'd:pick1:page' },
          { e: 'flag', flag: D_DID },
        ],
      },
    ],
  },
  {
    id: 'd-next-afternoon', nameHe: null, branches: [
      { when: { flag: 'd:pick1' }, lines: [{ who: null, text: 'זה הדבר השני. מחר הגמר.' }], then: [{ e: 'flagValue', flag: D_DID, value: false }, { e: 'flag', flag: 'd:final' }, { e: 'goto', node: 'd-go' }] },
      { lines: [{ who: null, text: 'יום שלישי. נשאר עוד אחר הצהריים אחד לפני הגמר.' }], then: [{ e: 'flagValue', flag: D_DID, value: false }, { e: 'flag', flag: 'd:pick1' }] },
    ],
  },
  {
    /**
     * הקופסה האדומה, בגיל עשרים ושתיים — the choice that spent an evening and said nothing.
     *
     * "לפתוח את הקופסה האדומה. לעבור על הכל." is one of the seven things four days have
     * room for, it costs the player one of his two picks, and until now it printed not a
     * single line about what is in there. The oldest thing in this life is a scrap of red
     * cloth a five-year-old took off the concrete under a terrace (`own:red-scrap`, the
     * `a1-red` node) — read exactly once, in a bedroom in 1984, and never again.
     *
     * It does nothing here either. No effect, no reward, no route: the choice's own
     * effects stay on the choice, this node only speaks. The scrap is simply still there,
     * and the two lines it gets are the two lines it got at six, word for word, because
     * that is what the object is — a thing he cannot place and has never thrown away.
     *
     * `own:` is why it can be read at all: `personFlags()` erases a flag at every chapter
     * cut unless it carries one of the surviving prefixes, and this one has crossed
     * fifteen of them to get here. A save that never picked it up gets the plain branch
     * and hears nothing about cloth.
     */
    id: 'd-box',
    nameHe: null,
    branches: [
      {
        when: { flag: 'own:red-scrap' },
        lines: [
          { who: null, text: 'הכל על השולחן. ספחים, פתקים, גזירים. לא הרבה נייר, בשביל כל זה.' },
          { who: null, text: 'ומתחת לכולם פיסת בד אדומה, קטנה משהייתה. אתה לא זוכר מאיפה. אתה זוכר שהיה רועש, ושהיית גבוה.' },
        ],
        // (V3 §12) one of the two afternoons, like the others — it used to skip to the final
        then: [{ e: 'flag', flag: D_DID }],
      },
      {
        lines: [{ who: null, text: 'הכל על השולחן. ספחים, פתקים, גזירים. לא הרבה נייר, בשביל כל זה.' }],
        then: [{ e: 'flag', flag: D_DID }],
      },
    ],
  },
  {
    id: 'd-go',
    nameHe: null,
    branches: [
      /**
       * ההיפוך, בשורה אחת — the fact `lib/life/tickets.ts` exists for, read rather than
       * asserted.
       *
       * 1983: somebody got the tickets and carried a five-year-old in. The prologue wrote
       * `own:tickets-1983` as a VALUE precisely so that a later chapter could ask WHO held
       * them instead of being told. This is the first afternoon in the whole life where
       * the answer changes hands: he is twenty-two, he took the double shift, he paid the
       * sixty and he booked the seat on the minibus himself. Everything else about this
       * chapter is somebody else arranging his transport — the branch below still is.
       *
       * Both conditions matter. `d:ticket` is what he did; `own:tickets-1983` is what he
       * is answering. A save with no prologue on file answers `null`, falls through to the
       * plain ticket branch and says nothing at all, which is the rule this project
       * applies to its own saves as much as to the archive: absence of evidence is not
       * evidence of absence.
       */
      {
        when: { all: [{ flag: 'd:ticket' }, { flagIs: { flag: 'own:tickets-1983', value: 'kobi' } }] },
        lines: [
          { who: null, text: 'יום רביעי. הכרטיס בכיס. ההסעה בשש. רמת גן.' },
          { who: null, text: 'בפעם הראשונה היו שניים, והם היו בכיס שלו. את זה סידרת לבד.' },
        ],
        then: [{ e: 'time', minutes: 120 }, { e: 'travel', to: 'ramat-gan', spawn: 'start' }],
      },
      { when: { flag: 'd:ticket' }, lines: [{ who: null, text: 'יום רביעי. הכרטיס בכיס. ההסעה בשש. רמת גן.' }], then: [{ e: 'time', minutes: 120 }, { e: 'travel', to: 'ramat-gan', spawn: 'start' }] },
      { lines: [{ who: null, text: 'יום רביעי. אין כרטיס מסודר. יש דרך — אם מישהו ידאג לך. מישל אמר שיש. אבא אמר שיש. מישהו ידאג.' }], then: [{ e: 'flag', flag: 'arrived:late' }, { e: 'time', minutes: 150 }, { e: 'travel', to: 'ramat-gan', spawn: 'start' }] },
    ],
  },
  {
    /**
     * מה שהיציע עושה עם מה שעשית — והוא לא מבקש רשות.
     *
     * זו הראיה השנייה של "שרים את זה", והיא נרשמת **רק כאן**: יצירה היא דבר שאדם עושה,
     * שימוש של קהל הוא דבר שקורה לו. הבד נפרש בידיים של אנשים שלא הכינו אותו, והקצב
     * חוזר מהצד השני של הקערה בלי שאיש אמר מאיפה הוא בא — *"אתה שומע את זה מאחורה"*,
     * בדיוק כפי שהפרס רשום.
     *
     * שתי הראיות בלתי-תלויות: מי שהכין בד שומע אותו, מי שנתן קצב שומע אותו, ומי שעשה
     * את שניהם שומע את שניהם. מי שלא עשה כלום עובר דרך הסצנה הזאת בלי שורה אחת, כי אין
     * לו מה לשמוע.
     */
    id: 'd-stand',
    nameHe: null,
    branches: [
      {
        when: { all: [{ flag: 'life:banner:2000' }, { flag: 'life:melamed:rhythm' }] },
        lines: [
          { who: null, text: 'הבד נפתח שתי שורות מתחתיך, בידיים של ארבעה אנשים שלא היו במחסן. הצבע עוד מריח.' },
          { who: null, text: 'ואז, מהצד השני של הקערה, שלוש-הפסקה-שתיים. לא מלמד — אלף איש. אף אחד מהם לא יודע ממי זה בא.' },
        ],
        then: [
          { e: 'proof', kind: 'crowd_use_proof', proofId: 'crowd_use_proof:{chapter}:banner', subjectHe: BANNER_SUBJECT, noteHe: 'ארבעה אנשים שלא היו במחסן פרשו אותו.' },
          { e: 'proof', kind: 'crowd_use_proof', proofId: 'crowd_use_proof:{chapter}:rhythm', subjectHe: RHYTHM_SUBJECT, noteHe: 'אלף איש, מהצד השני, בלי לדעת ממי זה בא.' },
          { e: 'redheart', key: 'terraceCulture', delta: 6 },
          { e: 'wellbeing', key: 'belonging', delta: 6 },
        ],
      },
      {
        when: { flag: 'life:banner:2000' },
        lines: [{ who: null, text: 'הבד נפתח שתי שורות מתחתיך, בידיים של ארבעה אנשים שלא היו במחסן. הצבע עוד מריח, ואף אחד לא מסתכל עליך.' }],
        then: [
          { e: 'proof', kind: 'crowd_use_proof', proofId: 'crowd_use_proof:{chapter}:banner', subjectHe: BANNER_SUBJECT, noteHe: 'ארבעה אנשים שלא היו במחסן פרשו אותו.' },
          { e: 'redheart', key: 'terraceCulture', delta: 4 },
          { e: 'wellbeing', key: 'belonging', delta: 4 },
        ],
      },
      {
        when: { flag: 'life:melamed:rhythm' },
        lines: [{ who: null, text: 'מהצד השני של הקערה עולה קצב: שלוש, הפסקה, שתיים. לא מלמד — אלף איש. אף אחד מהם לא יודע ממי זה בא.' }],
        then: [
          { e: 'proof', kind: 'crowd_use_proof', proofId: 'crowd_use_proof:{chapter}:rhythm', subjectHe: RHYTHM_SUBJECT, noteHe: 'אלף איש, מהצד השני, בלי לדעת ממי זה בא.' },
          { e: 'redheart', key: 'terraceCulture', delta: 4 },
          { e: 'wellbeing', key: 'belonging', delta: 4 },
        ],
      },
      { lines: [] },
    ],
  },
  {
    id: 'd-match',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'השופט מסתכל בשעון. כל הקערה מקללת את הידיעה.' },
        ],
        choices: [
          { id: 'breathe', text: 'לנשום. להסתכל. הפעם עד הסוף.', then: [{ e: 'personality', key: 'courage', delta: 3 }, { e: 'goto', node: 'd-pens' }] },
          { id: 'hold', text: 'להחזיק במי שלידך.', then: [{ e: 'redheart', key: 'community', delta: 3 }, { e: 'goto', node: 'd-pens' }] },
          { id: 'trap', text: '"זו מלכודת. תמיד מלכודת." (לא להאמין.)', when: { lacesIs: 'witness' }, hidden: true, then: [{ e: 'wellbeing', key: 'stress', delta: 5 }, { e: 'goto', node: 'd-pens' }] },
          { id: 'trap2', text: '"זו מלכודת. תמיד מלכודת." (לא להאמין.)', when: { none: [{ lacesIs: 'witness' }] }, hidden: true, then: [{ e: 'wellbeing', key: 'stress', delta: 5 }, { e: 'goto', node: 'd-pens' }] },
        ],
      },
    ],
  },
  {
    id: 'd-pens',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'פנדלים. שוב, ובאותה קערה. היציע קורא את השם עוד לפני שהוא מגיע לקו — שביט — כמו קוראים למישהו שכבר עשה את זה, כי כבר עשה.' },
          { who: null, text: 'בעיטה. עוד בעיטה. ואז שביט — והיציע לא צועק, הוא נושף. עוד אחת. הם מפספסים לבד. ואז—' },
          { who: null, text: 'זה נגמר. דאבל.' },
        ],
        then: [{ e: 'sfx', key: 'crowd-goal', level: 1 }, { e: 'sfx', key: 'crowd-claps', level: 0.6, delayMs: 2600 }, { e: 'wellbeing', key: 'happiness', delta: 20 }, { e: 'redheart', key: 'footballLove', delta: 8 }, { e: 'redheart', key: 'loyaltyReturn', delta: 5 }, { e: 'flag', flag: 'd:over' }],
      },
    ],
  },
  {
    id: 'd-walk',
    nameHe: null,
    branches: [
      /**
       * האוטובוס שלא עלית עליו — 1996, on the last walk of the decade.
       *
       * §16 asks that the decade be one life and §19 asks that a confirmed personal
       * memory land somewhere real. This is where the bus lands: not as a callback the
       * game congratulates itself for, but as the thing a person actually thinks about
       * walking out of a stadium at twenty-two — that he was late twice for something,
       * and that both times he would do it again.
       */
      {
        when: { flag: 'life:bus:refused' },
        lines: [
          { who: null, text: 'בחוץ. לא על מסך תוצאות — בחוץ, ברחוב שמוביל מהאצטדיון, בתוך המון שהולך לכל הכיוונים בבת אחת.' },
          { who: null, text: 'עברת ליד אוטובוס עם צבעים שאתה מכיר, והמחשבה הראשונה הייתה תחנה מרכזית, ארבע לפנות בוקר, ואיזה טמבל היית.' },
          { who: null, text: 'והשנייה הייתה שהיית עושה את זה שוב.' },
          { who: null, text: 'מי לידך.' },
        ],
        then: [{ e: 'presence', mode: 'inside' }, { e: 'redheart', key: 'loyaltyReturn', delta: 3 }, { e: 'goto', node: 'd-family' }],
      },
      {
        lines: [
          { who: null, text: 'בחוץ. לא על מסך תוצאות — בחוץ, ברחוב שמוביל מהאצטדיון, בתוך המון שהולך לכל הכיוונים בבת אחת.' },
          { who: null, text: 'מי לידך.' },
        ],
        then: [{ e: 'presence', mode: 'inside' }, { e: 'goto', node: 'd-family' }],
      },
    ],
  },
  {
    id: 'd-family',
    nameHe: null,
    branches: [
      { when: { flag: 'scarf:passed:kid' }, lines: [{ who: null, text: 'הצוואר שלך ריק. איפשהו מקדימה, ילד גורר על הרצפה משהו שהיה של אבא שלך.' }], then: [{ e: 'ending', id: 'passed-on' }] },
      { when: { flag: 'life:family:inherited-chosen' }, lines: [{ who: null, text: 'אבא מצד אחד. אסף מהצד השני. אתה באמצע, מחזיק את שניהם.' }], then: [{ e: 'ending', id: 'inherited-chosen' }] },
      { when: { flag: 'life:family:gate5-builder' }, lines: [{ who: null, text: 'הבד על הכתף. אנשים שמכירים אותך בשם. ובבית — אבא, ושתיקה.' }], then: [{ e: 'ending', id: 'gate5-builder' }] },
      { when: { flag: 'life:family:gate7-keeper' }, lines: [{ who: null, text: 'אבא. השירים האיטיים. ומהצד השני — תוף.' }], then: [{ e: 'ending', id: 'gate7-keeper' }] },
      { when: { flag: 'life:family:two-halls' }, lines: [{ who: null, text: 'הגביע בראש, האולם בלב. שחור לא היה פה. הולכים אליו.' }], then: [{ e: 'ending', id: 'two-halls' }] },
      { when: { flag: 'life:family:always-travelling' }, lines: [{ who: null, text: 'ברגל. כמו תמיד. שרים.' }], then: [{ e: 'ending', id: 'always-travelling' }] },
      { when: { flag: 'life:family:heard-elsewhere' }, lines: [{ who: null, text: 'הטלפון בשתיים בלילה. בוכים. "אתה בסדר."' }], then: [{ e: 'ending', id: 'heard-elsewhere' }] },
      { lines: [{ who: null, text: 'הכי אדום באצטדיון. ואין למי לצלצל.' }], then: [{ e: 'ending', id: 'alone-in-crowd' }] },
    ],
  },
  /**
   * קובי, ארבעה ימים אחרי האליפות — the last time in this decade the father is a person
   * in a kitchen and not a hand on a shoulder in a crowd. He does not talk about the
   * final. He talks about 1990, which is how he talks about everything.
   */
  {
    id: 'kobi-double',
    nameHe: 'קובי',
    branches: [
      { when: { flag: 'd:over' }, lines: [{ who: 'קובי', text: '…' }, { who: null, text: 'הוא לא מדבר. הוא מחזיק את הצלחת ולא שוטף אותה.' }] },
      {
        when: { flag: 'd:final' },
        lines: [{ who: 'קובי', text: 'יום רביעי. אתה יודע איפה אתה יושב?' }, { who: 'קובי', text: 'לא משנה איפה. תהיה שם. זה כל מה שביקשתי ממך אי פעם.' }],
        then: [{ e: 'rel', who: 'kobi', axis: 'familiarity', delta: 1 }],
      },
      {
        when: { relationship: { who: 'kobi', axis: 'bond', min: 60 } },
        lines: [
          { who: 'קובי', text: 'אלופים. אמרתי את זה בקול היום בעבודה, סתם, לראות איך זה נשמע.' },
          { who: 'קובי', text: 'תשעים לא נגמר ככה. תשעים נגמר עם אנשים שמחפשים אחד את השני בין שערים. תבטיח לי שביום רביעי אנחנו לא מחפשים.' },
        ],
        choices: [
          { id: 'promise', text: '"מבטיח. אני איתך."', then: [{ e: 'rel', who: 'kobi', axis: 'bond', delta: 6 }, { e: 'remember', who: 'kobi', eventId: 'promised-together-2000', significance: 'major' }, { e: 'redheart', key: 'loyaltyReturn', delta: 3 }, { e: 'toast', text: 'הוא הנהן. פעם אחת. אצלו זה חיבוק.', tone: 'plain' }] },
          { id: 'gate5', text: '"אני עם שער 5. אבל אני אמצא אותך אחרי."', then: [{ e: 'rel', who: 'kobi', axis: 'distance', delta: 2 }, { e: 'rel', who: 'asaf', axis: 'bond', delta: 2 }, { e: 'toast', text: '"אחרי." הוא חזר על המילה כאילו היא חדשה.', tone: 'plain' }] },
          { id: 'joke', text: '"אבא, זה 2000. יש פלאפונים."', then: [{ e: 'rel', who: 'kobi', axis: 'familiarity', delta: 2 }, { e: 'wellbeing', key: 'happiness', delta: 2 }, { e: 'toast', text: '"בתשעים גם היו טלפונים. לא היה את מי לתפוס." הוא כמעט חייך.', tone: 'plain' }] },
        ],
      },
      {
        lines: [
          { who: 'קובי', text: 'אלופים. שמעת? לא ממני. מהרדיו, מהשכנים, מהעיתון. ממני לא שמעת, כי לא היית פה.' },
          { who: 'קובי', text: 'יום רביעי יש עוד אחד. תעשה מה שאתה רוצה עם זה.' },
        ],
        choices: [
          { id: 'come', text: '"בוא נלך ביחד. פעם אחת."', then: [{ e: 'rel', who: 'kobi', axis: 'bond', delta: 5 }, { e: 'rel', who: 'kobi', axis: 'distance', delta: -3 }, { e: 'remember', who: 'kobi', eventId: 'asked-together-2000', significance: 'major' }, { e: 'toast', text: 'הוא שתק הרבה זמן. ואז: "בשש. לא בשש וחמישה."', tone: 'plain' }] },
          { id: 'shrug', text: '"נראה."', then: [{ e: 'rel', who: 'kobi', axis: 'distance', delta: 2 }, { e: 'wellbeing', key: 'loneliness', delta: 2 }] },
        ],
      },
    ],
  },
]
