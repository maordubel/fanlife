import type { LifeState } from '../types'
import type { TimeGate } from '../world/flow'

import type { EndingCard } from './chapter1986'
import type { Say } from './script'

/**
 * 1991 — המערכה השנייה של שלב ב׳: ליל אוסישקין.
 *
 * The second movement of one childhood, and the first one Kobi is not the door to. Stage
 * B part one was a Saturday a father took his son to; this is a Monday that starts in a
 * classroom, and everything that makes the night possible — the note, the homework, the
 * permission, the time — is the boy's own problem (brief §27–§46).
 *
 * The rule of `chapter1990.ts` holds and holds harder: **no line in this file states a
 * score, a scorer, a quarter, a margin or a roster.** The derby of 11.3.1991 is a row in
 * the canonical archive; the director reads it off the anchor at the horn, and the one
 * place a margin is ever spoken — the friend's whisper in the last scene — is BUILT from
 * the anchor at runtime (`closing1991`), which is why that beat is a function and not a
 * constant. A number a child says in a corridor is still a fact about history.
 *
 * The other rule is the brief's: never `-5 TRUST`. Rachel does not warn the player about
 * a stat. She says a time, and the time arrives while the game is still alive.
 */

/** The clock this chapter runs on. A school day, an afternoon, and a night game. */
export const SCHOOL_STARTS = 8 * 60 + 10
export const BELL = 8 * 60 + 55
export const AFTERNOON = 15 * 60 + 30
export const TIP_OFF = 20 * 60
/** What Rachel says, when she says anything: be in by half past nine. */
export const CURFEW = 21 * 60 + 30

/**
 * הכיתה, בבוקר — the chapter's first beat, and the whole conflict in nine lines.
 *
 * The teacher is mid-sentence, the boy is somewhere else, and a folded piece of paper
 * lands on the desk. Nobody explains what Ussishkin is; a twelve-year-old does not need
 * it explained, and neither does the player who was there in 1990.
 */
export const CLASSROOM_1991: Say[] = [
  { who: null, text: 'בוקר. הכיתה חמה מדי, החלונות גבוהים מדי, והגיר על הלוח עושה את הרעש הזה.' },
  { who: 'המורה', text: 'אז מי יכול להגיד לי מה קורה כאן?' },
  { who: null, text: 'אתה לא שומע את סוף המשפט. אתה סופר כמה שעות נשארו.' },
  { who: null, text: 'משהו נוחת על השולחן שלך. נייר מקופל לארבע, עדיין חם מהיד של מישהו.' },
  { who: null, text: 'אתה פותח אותו מתחת לשולחן. שתי מילים וסימן שאלה.' },
  { who: null, text: 'היום אוסישקין?' },
]

/** What the note says under the question, in the handwriting of somebody in a hurry. */
export const NOTE_LINES_HE = ['כן', 'ברור', 'נראה לך שלא?']

/**
 * הבוקר שאחרי — §46, and the last thing that happens in Stage B.
 *
 * Built from the anchor, because the friend's whisper is a fact: the difference between
 * two numbers the archive holds. `marginHe` arrives as a word — "עשר" — from the derby
 * director, which read it off the same row that put the final on the board. If the
 * archive cannot answer, the whisper is about the night instead of about the margin, and
 * the beat still lands.
 */
export function closing1991(marginHe: string | null): Say[] {
  const whisper = marginHe ? `${marginHe} הפרש.` : 'ראית את הסוף?'
  return [
    { who: null, text: 'יום שלישי. אותה כיתה, אותו גיר, אותו חלון.' },
    { who: 'המורה', text: 'פתחו במחברות.' },
    { who: 'אופיר', text: whisper },
    { who: null, text: 'אתה מסתכל לצד. הוא לא מסתכל עליך. הוא מסתכל ישר קדימה, כאילו לא אמר כלום.' },
    { who: 'המורה', text: 'יש משהו שאתה רוצה לחלוק עם הכיתה?', closeUp: 'cuTeacherShare' },
    { who: 'פוגי', text: 'לא.' },
    { who: null, text: 'שקט.' },
    { who: 'אופיר', text: marginHe ?? 'היית שם.' },
    { who: null, text: 'אתה מנסה לא לחייך. לא מצליח.' },
  ]
}

/**
 * הערב שלא היית בו — §31. The route that must exist, and must not be a punishment.
 *
 * A history that happened without you is the thesis of this game said out loud. The
 * evening at home is written with the same care as the hall: the radio in the kitchen,
 * a door that opens at eleven, and a father who tells you about it the way people tell
 * you about a thing you missed.
 */
export const HOME_NIGHT_1991: Say[] = [
  { who: null, text: 'שמונה בערב. הבית שקט בצורה מסוימת שאתה מכיר: שקט של ערב שקורה בו משהו במקום אחר.' },
  { who: null, text: 'מהמטבח, רדיו. לא מוזיקה — קול של מישהו שמדבר מהר.' },
  { who: 'רחל', text: 'שיעורים גמורים?' },
  { who: 'פוגי', text: 'כן.' },
  { who: null, text: 'זה נכון, או שזה לא. בכל מקרה אתה יושב על הרצפה בסלון, קרוב לרדיו, ומקשיב לערב של מישהו אחר.' },
]

/**
 * מי מדבר ב-1991 — the plates.
 *
 * The boy is thirteen in a month and his plate is the same one 1990 drew; the teacher is
 * new; Keren and Amit have their own 1990 faces. Everybody in a hall who is "somebody in
 * the crowd" gets the supporter plate, because that is what they are.
 */
export const PORTRAIT_1991: Record<string, string> = {
  'מישל': 'faceMichel',
  'אסף': 'faceAsaf',
  'פוגי': 'faceHero80',
  'קובי': 'faceKobi',
  'רחל': 'faceRachel90',
  // Re-cut one whole column at a time in the 16.9.2026 delivery and verified by eye:
  // `faceTeacher` is 130×260 and holds one teacher. It was `-glasses` for the fortnight
  // the old cut drew two half-faces.
  'המורה': 'faceTeacher',
  'אופיר': 'faceOfir',
  'עמית': 'faceAmit',
  'קרן': 'faceKeren90',
  'רפי מהקיוסק': 'faceOldMan',
  'סדרן': 'faceUsher',
  'מוכר': 'faceVendor',
  'אוהד': 'faceSupporter',
  'אוהדת': 'faceWoman',
  'אוהד ותיק': 'faceOldMan',
  'ילד': 'faceKid',
  // 6.9.2026 — the three people the Ussishkin initiation is actually about. They were
  // written for 1993 and the boy met them there, two years after the night he was
  // supposedly initiated; they stand on the pavement outside the hall now (§7 B2).
  'אפי': 'faceEfi',
  'לימור': 'faceLimor',
  'שחור': 'faceShachor',
  // שני הקבועים של אלנבי — שני השחקנים האלה מתויגים `era: '*'` ב-`scenes.ts`, כלומר הם
  // עומדים שם בכל פרק, ולכן כל מפה צריכה את הפלייטים שלהם.
  'המוכר': 'faceVendor',
  'הגבר': 'faceSupporterB',
}

/**
 * המטרה — one line under the clock, following the chain of locks and nothing else.
 * It never says where to press. It says what this Monday is about right now.
 */
export const OBJECTIVES_1991 = {
  note: 'שיעור. ופתק על השולחן.',
  school: 'ההפסקה. מה עושים הערב.',
  homework: 'הביתה. שיעורים.',
  permission: 'לשאול. או לא לשאול.',
  onTheWay: 'לאוסישקין. ברגל.',
  hall: 'להיכנס. למצוא מקום.',
  spot: 'לשמור מקום לעמית.',
  tipoff: 'עוד מעט מתחילים.',
  curfew: 'רחל אמרה שעה. השעה הגיעה.',
  home: 'הביתה.',
  morning: 'בוקר. כיתה.',
} as const

/** Rachel's key in the door (`SCHEDULE_1991`, `rachel-1991` from three) */
export const RACHEL_HOME = 15 * 60
/** the evening the hall starts to fill: the usher at the door, Ofir leaving the street */
export const EVENING_1991 = 18 * 60 + 30

/**
 * כשרק הזמן עומד בין הילד לדבר הבא — 1991's time gates (design pass v2 §7 1991, §12 C).
 *
 * The derby night is directed by the scene class, so it has no beats a clock could be
 * waiting on — and until delta 90 that meant the flow card never came. A boy who finished
 * page forty-one at ten in the morning walked the flat for five real minutes until his
 * mother's schedule row began; a boy who got his "yes" at four stood in the street until
 * the doors. Each gate below is a moment where the NEXT meaningful thing is a person or a
 * door arriving, and nothing the player could do would bring it sooner. None of them is
 * offered while there is still something to decide: homework not yet settled, the note
 * on the kitchen table not yet written or refused, a spot Amit asked him to hold.
 *
 * (delta 90, free time §13) each gate also says WHERE: Rachel's key turns in the living
 * room, the evening starts in the street where Ofir waits, the radio is anywhere in the
 * flat, the tip-off is the step he is standing on.
 */
export function timeGate1991(state: LifeState): TimeGate | null {
  const f = (key: string) => Boolean(state.flags[key])
  if (state.chapterDone || f('derby:over') || f('tipoff:1991')) return null
  const settled = f('hw:done') || f('hw:half') || f('hw:faked')
  const decided = f('permission:yes') || f('permission:no') || f('sneak:ready') || f('night:home')
  // 1 · school is out, the page is done (or not yet set — she sets it), and only Rachel is left
  if (f('school:done') && !decided && !f('asked:mum') && state.minute < RACHEL_HOME && (settled || !f('hw:given'))) {
    return { beatId: 'era:1991:rachel', minute: RACHEL_HOME, waitingHe: 'אמא חוזרת מהעבודה בשלוש. עד אז הבית שקט.', at: 'home', freeTime: { person: true } }
  }
  // 2 · he may go (or has left a note): the next thing is the evening itself
  if ((f('permission:yes') || f('sneak:ready')) && !f('uss:arrived') && state.minute < EVENING_1991) {
    return { beatId: 'era:1991:evening', minute: EVENING_1991, waitingHe: 'עד הערב. בשבע ועשרה פותחים את הדלתות באוסישקין.', at: 'street', freeTime: { eventHe: 'אופיר יוצא מהרחוב' } }
  }
  // 3 · he chose to stay in: the night will come to the kitchen radio
  if (f('night:home') && state.minute < TIP_OFF) {
    return { beatId: 'era:1991:radio', minute: TIP_OFF, waitingHe: 'ערב בבית. בשמונה, ברדיו של המטבח, מתחילים.', at: ['home', 'kitchen', 'bedroom'] }
  }
  // 4 · inside, the step held (or lost): only the tip-off is left
  if (f('uss:arrived') && (f('spot:held') || f('spot:lost')) && state.minute < TIP_OFF) {
    return { beatId: 'era:1991:tipoff', minute: TIP_OFF, waitingHe: 'המדרגה שלך. בשמונה — טיפ־אוף.', at: 'ussishkin-hall' }
  }
  return null
}

/**
 * הסופים — three, and none of them is a failure.
 *
 * `hall` — he stayed to the horn and got home late. `wall` — he left when he said he
 * would and heard the end of it through a concrete wall. `missed` — he was not there at
 * all, and the day still happened. §54: failure changes the biography, not the history.
 */
export const ENDINGS_1991: Record<string, EndingCard> = {
  hall: {
    id: 'hall',
    titleHe: 'עד הסוף',
    bodyHe:
      'הצופר. הגג רועד מלמעלה, והאולם לא מפסיק. עמדת על כיסא שלא שלך ליד אנשים שאתה לא מכיר בשם, וכולם צעקו את אותו הדבר בדיוק באותו רגע.',
    memoryHe:
      'בכיס נשאר פתק קטן עם מספרים שמישהו חישב באמצע, ולא צדק, ולא היה אכפת לו. שמת אותו בקופסה האדומה, ליד הדבר מ-1990 והדבר מ-1986.',
    memoryItem: 'score-paper',
    after: {
      fromArt: 'rachel90-watch',
      toArt: 'rachel90',
      lineHe: 'היא לא תשכח את השעה הזאת. גם בפעם הבאה שתבקש, היא תזכיר לך אותה — ובכל זאת תיתן.',
    },
  },
  wall: {
    id: 'wall',
    titleHe: 'שמעתי דרך הקיר',
    bodyHe:
      'יצאת בזמן. בחוץ האוויר קר והרעש נשאר מאחורי דלת. ואז הקיר רעד — גל אחד ארוך, שנשמע כמו סוף — ועמדת ברחוב ריק והקשבת לו עד שנגמר.',
    memoryHe: 'הספח נשאר בכיס, קרוע בפינה. שמת אותו בקופסה. הערב הזה שלך גם ככה.',
    memoryItem: 'hall-ticket',
    after: {
      fromArt: 'rachel90-3q',
      toArt: 'rachel90',
      lineHe: 'היא פתחה לפני שהספקת לדפוק. לא אמרה כלום על השעה. לא היה מה להגיד.',
    },
  },
  missed: {
    id: 'missed',
    titleHe: 'ערב רגיל לגמרי',
    bodyHe:
      'ישבת על הרצפה בסלון ליד הרדיו. הקול של הקריין עלה ואז ירד ואז עלה, ואתה ידעת מה קורה בלי לראות כלום. בשלב מסוים אמא כיבתה את האור במטבח והלכה לישון.',
    memoryHe: 'למחרת גזרת מהעיתון פיסה קטנה ושמת בקופסה — משהו מערב שהיה, ולא היית בו.',
    memoryItem: 'clipping',
    after: {
      fromArt: 'ofir90',
      toArt: 'ofir90-arms',
      lineHe: 'אופיר יספר לך על זה שלוש פעמים, וכל פעם זה יהיה קצת אחרת. ככה זה כשלא היית.',
    },
  },
}
