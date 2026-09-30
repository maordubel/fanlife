import { TIP_OFF } from './chapter1991'
import type { FollowUp } from './followUps'

/**
 * 11.3.1991 — the vertical slice (§20.7): Ofir → homework → Rachel.
 *
 * What each person can know on that Monday:
 *   - the whole class heard "עמוד ארבעים ואחת" — homework is public;
 *   - how the homework went, and what Rachel said, happened in the flat: Ofir does not know
 *     it until the boy tells him (`toldBy: 'player'`), and then he knows it for the evening
 *     (`knows: fu:<that follow-up>`);
 *   - a note under a cup is known to nobody.
 *
 * Ofir never says "your mother said no". He asks "נו, שאלת?", and when the boy answers, he
 * reacts to the answer.
 */

const SCHOOL = ['1991'] as const
const OFIR = ['ofir-afternoon-1991', 'ofir-yard']
const FRIENDS_YARD = ['keren-yard', 'keren-class']

export const FOLLOW_UPS_1991: FollowUp[] = [
  // ---------------------------------------------------------------- the break ----
  {
    id: '91-ofir-school',
    chapter: SCHOOL,
    on: OFIR,
    cls: 'HANDOFF',
    step: 'school',
    lines: [
      { who: 'אופיר', text: 'מה אתה עוד פה? תחזיק מעמד עד הצלצול.' },
      { who: 'אופיר', text: 'אחר כך הביתה, שיעורים, ולשאול. בערב נדבר.' },
    ],
  },
  /** the wrong friend first: Amit knows exactly who to send him to */
  {
    id: '91-amit-way',
    chapter: SCHOOL,
    on: ['amit-yard'],
    cls: 'HANDOFF',
    when: { none: [{ area: 'ussishkin' }, { flag: 'guided:ofir' }] },
    lines: [
      { who: 'עמית', text: 'אתה לא יודע איך מגיעים, נכון? רואים עליך.' },
      { who: 'עמית', text: 'תשאל את אופיר. הוא הולך לשם כמו שאתה הולך למכולת.' },
    ],
  },
  {
    id: '91-amit-early',
    chapter: SCHOOL,
    on: ['amit-yard'],
    cls: 'CLOSED',
    lines: [{ who: 'עמית', text: 'לפני שפותחים. אמרתי לך. אחרי זה אני לא אחראי.' }],
  },
  {
    id: '91-keren-ask',
    chapter: SCHOOL,
    on: FRIENDS_YARD,
    cls: 'CHECK-IN',
    step: ['hw', 'permission'],
    lines: [{ who: 'קרן', text: 'שאלת כבר את אמא שלך, או שאתה רק מדבר על זה?' }],
  },
  {
    id: '91-keren-school',
    chapter: SCHOOL,
    on: FRIENDS_YARD,
    cls: 'HANDOFF',
    step: 'school',
    lines: [{ who: 'קרן', text: 'הצלצול עוד מעט. אם יש לך משהו לסגור עם אופיר — עכשיו, לא בשיעור.' }],
  },

  // ---------------------------------------------------------- the afternoon ----
  {
    id: '91-ofir-hw',
    chapter: SCHOOL,
    on: OFIR,
    cls: 'HANDOFF',
    step: 'hw',
    lines: [
      { who: 'אופיר', text: 'יאללה, לך הביתה. קודם שיעורים, אחר כך אמא. אחר כך נדבר.' },
    ],
  },
  {
    id: '91-ofir-hw-again',
    chapter: SCHOOL,
    on: OFIR,
    cls: 'RECOVERY',
    step: 'hw',
    lines: [
      { who: 'אופיר', text: 'אתה עוד מסתובב פה? הבית שלך שם. המחברת על השולחן שלך.' },
      { who: 'אופיר', text: 'עמוד ארבעים ואחת. לא יברח לך, אבל גם לא יעשה את עצמו.' },
    ],
  },
  /** he does not know how the homework went, or whether she was asked — so he asks */
  {
    id: '91-ofir-asked',
    chapter: SCHOOL,
    on: OFIR,
    cls: 'CHECK-IN',
    step: 'permission',
    when: { none: [{ flag: 'fu:91-ofir-told-no' }] },
    lines: [
      { who: 'אופיר', text: 'נו? שיעורים עשית? שאלת אותה?' },
      { who: 'אופיר', text: 'לך תשאל. אני לא זז מפה.' },
    ],
  },
  {
    id: '91-ofir-asked-again',
    chapter: SCHOOL,
    on: OFIR,
    cls: 'RECOVERY',
    step: 'permission',
    when: { none: [{ flag: 'fu:91-ofir-told-no' }] },
    lines: [
      { who: 'אופיר', text: 'פוגי. אמא שלך בבית, ואתה פה. שאלת אותה או לא?' },
      { who: 'אופיר', text: 'לך תשאל, ותחזור להגיד לי מה היא אמרה.' },
    ],
  },
  /** the boy answers the question himself — only then does Ofir know */
  {
    id: '91-ofir-told-no',
    chapter: SCHOOL,
    on: OFIR,
    cls: 'REACTION',
    step: 'permission',
    when: { flag: 'permission:no' },
    toldBy: 'player',
    lines: [
      { who: 'פוגי', text: 'היא אמרה לא.' },
      { who: 'אופיר', text: 'לא לא, או לא של עכשיו?' },
      { who: null, text: 'אתה לא עונה. הוא מבין.' },
      { who: 'אופיר', text: 'אז או שאתה אומר לה את האמת, או שאתה בא בלי לשאול. ואז זה עליך, לא עליי.' },
    ],
  },
  {
    id: '91-ofir-after-no',
    chapter: SCHOOL,
    on: OFIR,
    cls: 'CHECK-IN',
    step: 'permission',
    knows: { flag: 'fu:91-ofir-told-no' },
    lines: [{ who: 'אופיר', text: 'החלטת? אני לא מחכה לך ברחוב כמו אידיוט.' }],
  },
  {
    id: '91-ofir-told-yes',
    chapter: SCHOOL,
    on: OFIR,
    cls: 'REACTION',
    step: 'hall',
    when: { flag: 'permission:yes' },
    toldBy: 'player',
    lines: [
      { who: 'פוגי', text: 'היא אמרה כן. עד תשע וחצי.' },
      { who: 'אופיר', text: 'תשע וחצי? אז אתה מפספס את הסוף.' },
      { who: 'אופיר', text: 'לא משנה. יאללה, אוסישקין. לפני שעמית נותן את המקום שלך למישהו.' },
    ],
  },
  {
    id: '91-ofir-told-note',
    chapter: SCHOOL,
    on: OFIR,
    cls: 'REACTION',
    step: 'hall',
    when: { flag: 'sneak:ready' },
    toldBy: 'player',
    lines: [
      { who: 'פוגי', text: 'השארתי לה פתק.' },
      { who: 'אופיר', text: 'אתה משוגע.' },
      { who: null, text: 'הוא אומר את זה כמו מחמאה.' },
      { who: 'אופיר', text: 'אז אל תעמוד פה. מזרחה, לאוסישקין, לפני שהיא חוזרת הביתה.' },
    ],
  },
  {
    id: '91-ofir-hall',
    chapter: SCHOOL,
    on: OFIR,
    cls: 'HANDOFF',
    step: 'hall',
    // only once the boy told him how it went — until then the first repeat is the telling
    knows: { any: [{ flag: 'fu:91-ofir-told-yes' }, { flag: 'fu:91-ofir-told-note' }] },
    lines: [{ who: 'אופיר', text: 'מה אתה עוד פה? אוסישקין. הדלת לא תחכה.' }],
  },

  // ------------------------------------------------------------- the flat ----
  /** she said it once at the door; the second time she says where the notebook is */
  {
    id: '91-rachel-hw',
    chapter: SCHOOL,
    on: ['rachel-1991'],
    cls: 'HANDOFF',
    step: 'hw',
    lines: [{ who: 'רחל', text: 'שיעורים. המחברת על השולחן בחדר שלך. אחר כך נדבר על ערבים.' }],
  },
  {
    id: '91-rachel-no',
    chapter: SCHOOL,
    on: ['rachel-1991'],
    cls: 'CLOSED',
    when: { flag: 'permission:no' },
    lines: [{ who: 'רחל', text: 'אמרתי לא. אתה רוצה לשמוע את זה עוד פעם, באותו טון?' }],
  },
  {
    id: '91-rachel-go',
    chapter: SCHOOL,
    on: ['rachel-1991'],
    cls: 'HANDOFF',
    step: 'hall',
    when: { flag: 'permission:yes' },
    lines: [{ who: 'רחל', text: 'תשע וחצי. ואתה עוד עומד לי במטבח?' }],
  },
  /** Kobi heard the "no" from the living room; he already said how to fix it, and says it once more */
  {
    id: '91-kobi-nudge',
    chapter: SCHOOL,
    on: ['kobi-1991'],
    cls: 'HANDOFF',
    step: 'permission',
    when: { flag: 'kobi:nudged' },
    lines: [{ who: 'קובי', text: 'אמרתי לך. תלך אליה, ותגיד את זה בלי לשקר. אני לא מפריע.' }],
  },

  // ---------------------------------------------------------------- the clock ----
  {
    id: '91-ofir-seven',
    chapter: SCHOOL,
    on: OFIR,
    cls: 'DEADLINE',
    step: ['hw', 'permission'],
    when: { all: [{ afterMinute: 18 * 60 + 30 }, { beforeMinute: TIP_OFF - 30 }] },
    lines: [
      { who: 'אופיר', text: 'עוד מעט שבע וחצי. אני יוצא בשבע וחצי, איתך או בלעדייך.' },
      { who: 'אופיר', text: 'אם אתה בא — תסגור את זה עם אמא שלך עכשיו.' },
    ],
  },
  {
    id: '91-ofir-late',
    chapter: SCHOOL,
    on: OFIR,
    cls: 'DEADLINE',
    step: ['hw', 'permission'],
    when: { afterMinute: TIP_OFF - 30 },
    lines: [
      { who: 'אופיר', text: 'אני הולך. כבר מאוחר.' },
      { who: null, text: 'הוא הולך אחורה, עם הפנים אליך, כמו שהוא עושה מאז כיתה ב׳.' },
      { who: 'אופיר', text: 'אם היא אומרת כן — אתה יודע איפה אני.' },
    ],
  },
]
