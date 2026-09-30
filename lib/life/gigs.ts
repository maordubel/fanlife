/**
 * ג׳ובים — the ways a boy with no money gets money.
 *
 * The economy of this game had exactly three: bottles once, crates at Rafi once, and
 * whatever a father took out of his pocket. Everything else was a chapter handing you a
 * sum at the door. So a shirt that costs thirty shekels was not a goal, it was a wall —
 * and Maor said what was missing in one line: "צריך לתת לפוגי יותר הזדמנויות להרוויח כסף…
 * כמו איסוף בקבוקים, כמו ניקיון באוסישקין, כמו עזרה לדמויות".
 *
 * Each gig is a piece of work somebody in this world actually needed doing in that decade,
 * priced off `prices.ts` rather than typed: `hours × WAGE[decade]`, so an hour of a boy's
 * afternoon is worth five shekels in 1985 and eighteen in 2000, and the shirt in the
 * window is always about six afternoons away. The clock and the energy are the cost —
 * this is a game about a Saturday, and an hour spent carrying crates is an hour not spent
 * at the ground.
 *
 * `once` gigs raise a plain flag, which `day.entered` clears — so "once" means once a
 * day, and tomorrow the crates need carrying again. That is what a job is.
 */
import { BOTTLE, WAGE, decadeOf } from './prices'
import { gigFlagOf, workDoneFlag } from './workFlags'
import { playableChapters } from './content/chapters'
import { ACTIVITY, activityIn, isActivityId, payShekels, type ActivityDef } from './activities'
import type { ChoiceDef, Conversation } from './content/script'
import type { Condition } from './world/types'
import { PITCH_GIG, eraForChapter, streetMatch } from './football/door'

/**
 * סדר הפרקים — **נגזר, לא מועתק** (21.9.2026).
 *
 * כאן ישבה רשימה ידנית של תשעה־עשר פרקים עם ההערה *"mirrors `shirts.ts`"* — אבל
 * `shirts.ts` כבר גוזר את הסדר מ-`playableChapters()` מזמן, כלומר זה היה העתק שלישי
 * של רשימת הפרקים, והיחיד שנתקע ב-2000. שלב ג׳ נוסף, והרשימה הזאת לא ידעה.
 *
 * זה היה **בטוח במקרה**: בגלל שהרשימה נגמרה ב-2000, אף ג׳וב של ילד לא דלף ל-2007. אבל
 * "בטוח כי הרשימה ישנה" הוא בדיוק התנאי שנשבר ביום שמישהו מעדכן אותה (כלל 59, ו-
 * כלל 78 על `until`: *"`until` של ג׳וב אינו קיצור של העבודה — הוא תיאור של הדלת"*).
 *
 * לכן שני שינויים ביחד: הסדר נגזר מהמרשם, **והסוף של ג׳ובי הילדות נאמר בשם** —
 * `CHILDHOOD_GIGS_END` — במקום להיות תוצאה של איפה שהרשימה נגמרה.
 */
const ORDER: readonly string[] = playableChapters().map((chapter) => chapter.id)

/**
 * עד כאן ג׳ובי הילדות והנערות — הבקבוקים, הארגזים, השטיפה, הגרעינים.
 *
 * ג׳וב בלי `until` נמשך עד כאן ולא עד סוף החיים. מבוגר מרוויח ב-`lib/life/income.ts`
 * ובמשמרות שהתסריט כותב בשמן (B02, H03), ולא באיסוף בקבוקים ב-2007.
 */
const CHILDHOOD_GIGS_END = '2000-double'

export type Gig = {
  id: string
  /** the room it is offered in */
  where: string
  /** who offers it, on the card */
  nameHe: string
  /**
   * when the offer is a spot in the room rather than a person's conversation: the id prefix
   * of the actor who has to be standing in the room for it to exist (`'rachel'` — her kitchen
   * job is not there at ten in the morning while she is at work). Read by the free-time
   * planner through the timetable.
   */
  hostActor?: string
  labelHe: string
  /** first and last chapter it exists in */
  from: string
  until?: string
  /** hours of work — the pay is this times the decade's wage */
  hours: number
  minutes: number
  energy: number
  /** the line that opens it, the line that closes it */
  askHe: string
  openHe: string
  doneHe: string
  /** a person it changes something with */
  rel?: { who: string; axis: 'bond' | 'trust' | 'sharedHistory'; delta: number }
  trait?: { key: 'reliability' | 'responsibility' | 'empathy' | 'independence' | 'courage'; delta: number }
  /** where it sits in the painting */
  at: { x: number; y: number; w: number }
  /**
   * מה רואים כשהעבודה מוצעת (delta 90, §22.4.1) — the thing the work is, drawn where it
   * waits: the crates by the wall, the bottles by the bin, the bundle of papers. It is drawn
   * only while the row is on offer (the hotspot's own `when`, rotation flag included), so a
   * week that dealt the crates SHOWS the crates, and a week that did not shows a wall.
   * No pixel hunting: the offer is a thing in the room, not a label that appears when a
   * thumb happens to walk over it. `size` is a fraction of the frame's height.
   */
  look?: { key: string; size: number }
  /**
   * שני משחקי הכסף — a gig that opens a CARD instead of the chore scene.
   *
   * `toto` is the slip: five questions from the site's own trivia bank, two shekels a
   * right answer. `coin` is עץ או פלי in the alley: a shekel in, five out. Both were
   * Maor's, on 5.9.2026, and both are here rather than in their own system because they
   * behave like a row in this table — they sit in a room, they cost the afternoon, and
   * they are once a day. **They are not jobs**, and rule 72 is the price of having once
   * counted one as the cheapest job in the pool: a boy offered a coin toss was not offered
   * work. `kindOf` returns `wager` for exactly these two, off exactly this field.
   *
   * `penalty` and `hoops` are the two skill contests Maor asked for on 6.9.2026, played
   * in three dimensions rather than painted: five penalty kicks against a keeper on the
   * neighbourhood pitch, five free throws at the schoolyard hoop. `pitch` is the street
   * match, which is the same thing at full size. Those three are `play`: a real thing to
   * be good or bad at is worth more than a number, and none of them is work.
   */
  opens?: 'toto' | 'coin' | 'penalty' | 'hoops' | 'pitch'
  /**
   * האם זו עבודה — or is it just a thing boys do.
   *
   * Maor, 6.9.2026: *"זריקה לסל ובעיטת פנדלים לא צריכים להיות רווח כספי, זה להנאה בלבד."*
   * He is right, and it was a design smell: the moment a penalty shoot-out pays a wage,
   * the pitch stops being the pitch and becomes a cash machine with a ball in it, and
   * every kick is arithmetic instead of nerve. Unpaid gigs cost the same afternoon and the
   * same energy, pay nothing, and are worth playing for the only thing they were ever
   * about — being the one who scored.
   *
   * Unpaid work is also outside the one-job-per-chapter rule below, because a rule that
   * stops a boy kicking a ball because he already carried crates is a rule about a
   * spreadsheet, not about a childhood.
   *
   * `paid: false` is the STORED form of `kind: 'play'` — see `kindOf` below for why the
   * third category has a name now and why this field is still the one on the row.
   */
  paid?: boolean
  /**
   * המשחק שהג׳וב הזה הוא, מפרק מסוים (21.9.2026) — `lib/life/activities.ts`.
   *
   * *"זו הרחבה של ה־gig הקיים של הקפה. לא ליצור job חדש במקביל."* (Maor's integration
   * file.) So an activity that is work or a wager IS a row here: the café shift is
   * `sweep-allenby`, the Shachor job is `chairs-end`, the paper round is `papers-round`.
   * From `activityFrom` on, the row's "do" plays the activity (a gate mechanic over a
   * paused room, or the chore scene with the activity's pay); before it, the row is exactly
   * the job it always was — which is how the tested 1984–86 economy stays untouched.
   */
  activity?: string
  activityFrom?: string
  /** a bet among friends, whatever its `opens` — rule 72's third kind, for rows that are not the coin or the slip */
  wager?: boolean
  /**
   * `false`: never dealt by the week's rotation — the row is there whenever its own
   * `when` says, like the ball on the pitch. For the bets friends offer and the bottles
   * after a match: a rotation that could deal away a friend's dare is not a week, it is a
   * slot machine. Absent means rotated, as every job always was.
   */
  rotates?: boolean
  /**
   * false — asked from inside another conversation (the shop's order comes from the man at the
   * counter, `fanShops` in `shirts.ts`), so the room draws no second hotspot for it.
   */
  spot?: false
  /** a condition on the hotspot beyond the rotation (the bottles are there after the whistle) */
  when?: Condition
  /**
   * The ways a job can be started, each a choice with its own line (Shachor asks which
   * first). The chosen id is written to `chore:order` and the chore scene reads it.
   */
  steps?: readonly { id: string; textHe: string }[]
}

/**
 * שלושה סוגים, ולא שניים — עבודה, הימור, משחק (17.9.2026).
 *
 * מאור: *"במשחק עצמו, ניתן לשחק בחיובים / פנדלים — ללא קשר ללקיחת עבודה. זוהי לא עבודה.
 * זה משחק העברת זמן. אפשר לקחת גם עבודה וגם לשחק פנדלים באותו יום."*
 *
 * This table has held three kinds of row since the day the coin was added and has had
 * names for two of them. Rule 72 found the third the expensive way — *"ילד שהוצע לו הטלת
 * מטבע לא הוצעה לו עבודה. `opens: 'coin'` ו-`opens: 'toto'` הם הסימן"* — and then left the
 * distinction living in two unrelated fields, so every question about it had to be asked
 * as `isPaid(gig) && gig.opens !== 'coin'` by whoever remembered. `kindOf` is that sentence
 * written once:
 *
 *  · **`work`** — somebody needed this doing and paid for it. Once a DAY (`gig:<id>`) and
 *    once a CHAPTER (`work:paid:<chapter>`), and in the week's rotation (`offeredIn`).
 *  · **`wager`** — the slip and the coin. Money changes hands, so it is in the rotation and
 *    it does spend the chapter's money act, but it is not work and nobody should read it as
 *    "the cheapest job in the pool" ever again.
 *  · **`play`** — the street match, the penalties, the free throws. **Costs the afternoon
 *    and never the job.** Once a day, never in the rotation (so the ball is always there),
 *    never raises `work:paid:<chapter>`, and therefore takeable on the same day as a job in
 *    either order. That last sentence is the whole of what Maor asked for and
 *    `tests/life-tiers.test.ts` holds all four halves of it.
 *
 * Derived rather than stored, because `paid` already IS the discriminator for play and two
 * fields that mean one thing are a drift waiting for its first delta. Adding a stored
 * `kind` would also have meant writing `paid: false, kind: 'play'` on three rows, which is
 * the same fact twice on the same object.
 */
export type GigKind = 'work' | 'wager' | 'play'

export function kindOf(gig: Gig): GigKind {
  if (gig.paid === false) return 'play'
  if (gig.opens === 'coin' || gig.opens === 'toto' || gig.wager) return 'wager'
  return 'work'
}

/** משחק העברת זמן — costs the afternoon, never the job */
export const isPlay = (gig: Gig) => kindOf(gig) === 'play'

/** work in the sense the chapter's one-paid-job rule means it — not a bet, not a ball */
export const isWork = (gig: Gig) => kindOf(gig) === 'work'

/**
 * שבעה ג׳ובים — and every one of them is a thing somebody in south Tel Aviv did for money
 * at eight, at twelve, at fifteen.
 */
export const GIGS: readonly Gig[] = [
  /**
   * המגרש — "אני הפועל", and then you are on the grass (Maor, 7.9.2026).
   *
   * The row lives in `lib/life/football/door.ts` rather than here, so the whole entrance to
   * the 3D engine is one import in one shared table instead of a block of football
   * knowledge in the middle of the job list. `where: 'pitch'` puts its hotspot on the
   * neighbourhood pitch automatically — `world/scenes.ts` builds them from `GIGS`.
   */
  PITCH_GIG,
  {
    id: 'bottles-round',
    where: 'street',
    nameHe: 'הפח בפינה',
    labelHe: 'הבקבוקים ליד הפח',
    from: 'a2-alley',
    until: '1993-cup',
    hours: 0.5,
    minutes: 25,
    energy: 6,
    askHe: 'לעבור על הפחים. בקבוקים.',
    openHe: 'ארבעה ריקים מאחורי הפח, אחד מתגלגל. אתה מכיר את הצליל הזה.',
    doneHe: 'רפי סופר אותם בלי להסתכל עליך. הפיקדון בכיס.',
    trait: { key: 'independence', delta: 2 },
    at: { x: 0.72, y: 0.86, w: 0.09 },
    look: { key: 'propBottle', size: 0.04 },
  },
  {
    id: 'crates-kiosk',
    where: 'kiosk',
    nameHe: 'רפי',
    labelHe: 'הארגזים מאחורי הדלפק',
    // A4 has its own crates, in Rafi's own voice, and two offers of the same work in one
    // room reads as a bug. The generated one takes over the chapter after.
    from: 'a5-first',
    hours: 1,
    minutes: 50,
    energy: 15,
    askHe: '"יש משהו לסדר? לסחוב?"',
    openHe: 'רפי מצביע עם הסנטר על שמונה ארגזים ליד הקיר. "לשם. אחד־אחד, לא שניים."',
    doneHe: 'שעה של ארגזים, וקולה פתוח על הדלפק שלא ביקשת.',
    rel: { who: 'rafi', axis: 'trust', delta: 3 },
    trait: { key: 'reliability', delta: 2 },
    at: { x: 0.62, y: 0.9, w: 0.1 },
    look: { key: 'propCrate', size: 0.075 },
  },
  {
    id: 'sweep-hall',
    where: 'ussishkin-hall',
    nameHe: 'השוער',
    labelHe: 'המטאטא ליד היציע',
    from: 'a3-hall',
    hours: 1.5,
    minutes: 70,
    energy: 18,
    askHe: '"אני יכול לנקות? אחרי המשחק."',
    openHe: 'הוא נותן לך מטאטא גבוה ממך ואומר: "מהשורה העליונה למטה. לא הפוך."',
    doneHe: 'האולם ריק ונקי, והפרקט מחזיר את האור של נורה אחת. הוא ספר לך את הכסף ביד.',
    rel: { who: 'usher', axis: 'trust', delta: 4 },
    trait: { key: 'responsibility', delta: 3 },
    at: { x: 0.24, y: 0.88, w: 0.1 },
  },
  {
    id: 'papers-round',
    where: 'street',
    nameHe: 'הדוכן',
    labelHe: 'חבילת העיתונים',
    from: 'a4-shirt',
    until: '1996-army',
    hours: 1,
    minutes: 45,
    energy: 12,
    askHe: '"אני יכול לחלק? אני מכיר את כל הבניינים."',
    openHe: 'חבילה קשורה בחוט, שלוש קומות בלי מעלית, וכלב אחד שאתה כבר יודע לדלג מעליו.',
    doneHe: 'שתים־עשרה תיבות דואר, אצבעות שחורות מדיו. הוא שילם בלי לספור פעמיים.',
    trait: { key: 'reliability', delta: 2 },
    at: { x: 0.33, y: 0.86, w: 0.08 },
    look: { key: 'propNewspaper', size: 0.05 },
    // from 1990 the round is planned before it is walked — `activities.ts` 'papers'
    activity: 'papers',
    activityFrom: '1990',
  },
  {
    id: 'shopping-neighbour',
    where: 'street',
    nameHe: 'השכנה מהקומה השלישית',
    labelHe: 'השקיות של השכנה',
    from: 'a2-alley',
    /**
     * עד 1986, ג׳וב; מ-1990, טובה (21.9.2026). *"זו encounter אנושית, לא 'job'."* In the
     * tested 1984–86 week she stays the job she was, so no Stage A rotation moves; from 1990
     * she is `activities.ts` 'neighbour' — a woman with bags who is sometimes in the street,
     * asked for in a conversation, paid out of the favour slot, and sometimes not in money.
     */
    until: '1986',
    hours: 0.5,
    minutes: 20,
    energy: 8,
    askHe: '"לעזור? זה כבד."',
    openHe: 'שתי שקיות בד, אחת עם אבטיח. היא לא אמרה תודה בהתחלה, היא אמרה "תחזיק מלמטה".',
    doneHe: 'היא הכניסה לך מטבע לכיס ודחפה את היד בחזרה כשניסית להחזיר.',
    trait: { key: 'empathy', delta: 3 },
    at: { x: 0.46, y: 0.87, w: 0.08 },
  },
  {
    id: 'drinks-hall',
    where: 'ussishkin-outside',
    nameHe: 'הקיוסק של האולם',
    labelHe: 'ארגזי השתייה',
    from: '1990',
    hours: 1,
    minutes: 45,
    energy: 14,
    askHe: '"צריך עזרה לפני שהם נכנסים?"',
    openHe: 'ארבעים בקבוקים בארגזים ירוקים, מהמדרכה לדלת הצדדית, לפני שהתור מתחיל.',
    doneHe: 'הכול בפנים לפני שנפתחו השערים, ואתה בפנים איתם.',
    trait: { key: 'responsibility', delta: 2 },
    at: { x: 0.68, y: 0.9, w: 0.1 },
    look: { key: 'propCrate', size: 0.075 },
  },
  /**
   * שלושת הג׳ובים שמאור ביקש (5.9.2026) — שליחויות לרפי, צעיפים ודגלים לפני משחק,
   * ועבודה באולם.
   */
  {
    id: 'errands-rafi',
    where: 'street',
    nameHe: 'רפי',
    labelHe: 'ההזמנות של רפי',
    from: 'a4-shirt',
    hours: 1,
    minutes: 45,
    energy: 12,
    askHe: '"אני מכיר את כל הבניינים. תן לי."',
    openHe: 'חמש הזמנות על פתק אחד: חלב לשלישית, סיגריות לשנייה, ולמעלה — מה שהיא מבקשת כל יום.',
    doneHe: 'כל ההזמנות בבתים, והפתק חזר לרפי מקופל.',
    rel: { who: 'rafi', axis: 'trust', delta: 4 },
    trait: { key: 'reliability', delta: 3 },
    at: { x: 0.4, y: 0.86, w: 0.08 },
    look: { key: 'propNote', size: 0.035 },
  },
  /**
   * שני ג׳ובים באלנבי — 6.9.2026, with the corner itself.
   *
   * A junction is a junction a boy can earn on, and these are the two things somebody on
   * this pavement actually needed doing: the crates outside the record shop have to come
   * in before he pulls the shutter, and the pavement in front has to be swept before he
   * opens it. They are also why the door into town is worth walking through on an ordinary
   * Tuesday, which a door that only leads to a stadium never is.
   */
  {
    id: 'crates-allenby',
    where: 'allenby',
    nameHe: 'המוכר בפינה',
    labelHe: 'הארגזים על המדרכה',
    from: 'a4-shirt',
    hours: 1,
    minutes: 45,
    energy: 15,
    askHe: '"להכניס? אני חזק."',
    openHe: 'שני ארגזי עץ מלאים על המדרכה, ארגז בקבוקים אדום מתחתם, והוא רוצה לסגור בעוד רבע שעה.',
    doneHe: 'הכול בפנים לפני שהוא הוריד את התריס, והוא נתן לך מטבע ותקליט שרוט "כי ממילא אף אחד לא ייקח".',
    trait: { key: 'responsibility', delta: 3 },
    at: { x: 0.15, y: 0.77, w: 0.09 },
    look: { key: 'propCrate', size: 0.075 },
  },
  {
    id: 'sweep-allenby',
    where: 'allenby',
    nameHe: 'המלצר',
    labelHe: 'המדרכה לפני בית הקפה',
    from: '1990',
    hours: 0.5,
    minutes: 25,
    energy: 7,
    askHe: '"לטאטא לפני שהם מגיעים?"',
    openHe: 'מטאטא מאחורי הדלת, וכל מה שהעיר הפילה כאן מאתמול.',
    doneHe: 'המדרכה נקייה עד אבן השפה. הוא הביא לך לימונדה ולא לקח עליה כסף.',
    trait: { key: 'reliability', delta: 2 },
    at: { x: 0.78, y: 0.778, w: 0.09 },
    // the café shift: the sweep, and then table four's argument — `activities.ts` 'cafe-shift'
    activity: 'cafe-shift',
    activityFrom: '1990',
  },
  {
    id: 'sell-scarves',
    where: 'bloomfield-outside',
    nameHe: 'הארגז עם הצעיפים',
    labelHe: 'צעיפים ודגלים',
    from: '1990',
    hours: 1,
    minutes: 40,
    energy: 10,
    askHe: 'לעמוד עם הארגז לפני שהם נכנסים.',
    openHe: 'ארגז קרטון, צעיפים מקופלים בשלוש שורות, ודגל אחד על מקל. הם באים בגלים.',
    doneHe: 'הארגז ריק לפני השריקה, והידיים מלאות מטבעות.',
    trait: { key: 'courage', delta: 3 },
    at: { x: 0.36, y: 0.88, w: 0.09 },
    look: { key: 'propScarfRed', size: 0.06 },
  },
  {
    id: 'balls-hall',
    where: 'ussishkin-hall',
    nameHe: 'המאמן',
    labelHe: 'הכדורים והמים',
    from: 'a3-hall',
    hours: 1,
    minutes: 40,
    energy: 12,
    askHe: '"אני יכול לאסוף כדורים לפני האימון?"',
    openHe: 'תשעה כדורים על כל הפרקט ועגלה אחת בפינה. הוא מסתכל על השעון, לא עליך.',
    doneHe: 'כל הכדורים בעגלה והמים בקו אחד ליד הספסל. הוא אמר "מחר גם".',
    rel: { who: 'usher', axis: 'bond', delta: 3 },
    trait: { key: 'responsibility', delta: 3 },
    at: { x: 0.72, y: 0.86, w: 0.09 },
    look: { key: 'propBasketball', size: 0.032 },
  },
  {
    id: 'toto-slip',
    where: 'kiosk',
    nameHe: 'הטופס אצל רפי',
    labelHe: 'שליחת טוטו',
    from: 'a4-shirt',
    hours: 0.5,
    minutes: 20,
    energy: 4,
    askHe: 'למלא טופס. חמש שאלות.',
    openHe: 'רפי דוחף לך טופס וקצה של עיפרון. "אם אתה כזה חכם על הפועל — תמלא."',
    doneHe: 'הטופס על הדלפק, והוא ספר לך את מה שהגיע.',
    trait: { key: 'independence', delta: 2 },
    at: { x: 0.52, y: 0.87, w: 0.08 },
    look: { key: 'propScorePaper', size: 0.03 },
    opens: 'toto',
    // the slip IS the kiosk's trivia activity — its window and its tier live in `activities.ts`
    activity: 'kiosk-trivia',
    activityFrom: 'a4-shirt',
  },
  {
    id: 'alley-coin',
    where: 'pitch',
    nameHe: 'הגדולים בסמטה',
    labelHe: 'הימורים בשכונה',
    from: 'a4-shirt',
    hours: 0.2,
    minutes: 10,
    energy: 3,
    askHe: 'שקל להיכנס.',
    openHe: 'שניים גדולים ממך, מטבע של חצי שקל על הציפורן. "עץ או פלי. שקל להיכנס, חמישה אם קלעת."',
    doneHe: 'המטבע נפל.',
    trait: { key: 'courage', delta: 2 },
    at: { x: 0.66, y: 0.9, w: 0.08 },
    look: { key: 'coinPali', size: 0.025 },
    opens: 'coin',
  },
  /**
   * שני קרבות — 6.9.2026, בתלת מימד. "משחק פנדלים, בעיטות לשער במגרש השכונתי" ו"תחרות
   * חיובים, זריקה לסל בחצר הבית ספר": the two contests Maor asked for by name, each its
   * own real ball flying through a real depth rather than a painted one.
   *
   * **They pay nothing** — `paid: false`, `perGoal: 0`, `perBasket: 0` — and the `hours`
   * on both rows is dead weight that `gigPay` returns before it ever reads (it is kept
   * only because `Gig.hours` is required and the field is read by a guard elsewhere). This
   * comment used to describe the wage they paid when they were first written; that wage was
   * removed the same week, and the sentence outlived it by ten days.
   */
  {
    id: 'penalty-contest',
    where: 'pitch',
    nameHe: 'הגדולים במגרש',
    labelHe: 'פנדלים עד חמש',
    from: 'a2-alley',
    hours: 0.5,
    minutes: 25,
    energy: 10,
    askHe: 'חמש בעיטות. בלי כסף — בשביל השם.',
    openHe: 'הם מעמידים שני מוטות עץ לרוחב, ואחד מהגדולים עומד בשער. "חמש בעיטות. תראה מה יש לך."',
    doneHe: 'הם סופרים בקול, גם כשאתה לא רוצה שיספרו. אף אחד לא מוציא כסף.',
    trait: { key: 'courage', delta: 2 },
    at: { x: 0.9, y: 0.87, w: 0.08 },
    opens: 'penalty',
    paid: false,
  },
  {
    id: 'hoops-contest',
    where: 'schoolyard',
    nameHe: 'קו העונשין',
    labelHe: 'תחרות חיובים',
    from: '1991',
    until: '1991',
    hours: 0.5,
    minutes: 20,
    energy: 8,
    askHe: 'חמש זריקות מהקו. מי שקולע — מלך ההפסקה.',
    openHe: 'קו לבן מצויר על האספלט, כבר דהוי. "חמש זריקות. מי שקולע יותר משלוש הוא המלך של ההפסקה."',
    doneHe: 'הכדור מקפץ על החישוק בלי רשת, ואף אחד לא מסכים על הספירה.',
    trait: { key: 'independence', delta: 2 },
    at: { x: 0.5, y: 0.84, w: 0.09 },
    opens: 'hoops',
    paid: false,
  },
  {
    id: 'wash-cars',
    where: 'street',
    nameHe: 'החניה מתחת לבניין',
    labelHe: 'הדלי והספוג',
    from: '1990',
    hours: 1.5,
    minutes: 60,
    energy: 20,
    askHe: 'לשטוף שתי מכוניות. דלי, ספוג, וכסף.',
    openHe: 'דלי מהמרפסת, ספוג ישן, ומים שנגמרים באמצע השנייה.',
    doneHe: 'שתי מכוניות נקיות, נעליים רטובות, וכסף שהרווחת ולא ביקשת.',
    trait: { key: 'independence', delta: 3 },
    at: { x: 0.58, y: 0.87, w: 0.09 },
  },

  /**
   * שש עבודות בשישה מקומות אחרים — 6.9.2026.
   *
   * *"צריך לחלק את נקודות ה'עבודה' האלו ביותר מקומות במפה וביותר מגוון מסכים, עם היגיון."*
   * Eleven of the sixteen jobs stood in three rooms, and five of them in the street alone,
   * so a boy who needed money went to the same corner every chapter and the rest of the
   * city had nothing to offer him. These six are placed where that decade actually paid a
   * child: the road to the ground on a matchday, the platform, the kitchen table at home,
   * the classroom after the bell, the end wall of the hall, and Gate 5 in the years the
   * terrace was building itself. Every one of them is in a room the player already walks
   * through for another reason, so the work is on the way rather than a detour.
   */
  {
    id: 'seeds-route',
    where: 'route',
    nameHe: 'הדוכן על הדרך',
    labelHe: 'שקיות גרעינים',
    from: 'a5-first',
    hours: 0.8,
    minutes: 30,
    energy: 12,
    askHe: 'למכור גרעינים לאנשים שהולכים למשחק.',
    openHe: 'ארגז על שרפרף, שקיות נייר חומות, ורחוב שלם שהולך לכיוון אחד. "תעמוד פה ותצעק. אני חוזר."',
    doneHe: 'הארגז ריק, הידיים מלוחות, והרחוב עוד הולך.',
    trait: { key: 'courage', delta: 2 },
    at: { x: 0.3, y: 0.83, w: 0.09 },
  },
  {
    id: 'kitchen-help',
    where: 'kitchen',
    nameHe: 'אמא',
    hostActor: 'rachel',
    labelHe: 'לעזור לאמא במטבח',
    from: 'a3-hall',
    hours: 0.6,
    minutes: 25,
    energy: 8,
    askHe: 'לקלף, לשטוף, לסדר. זה לא משכורת — זה תודה.',
    openHe: 'היא לא מבקשת פעמיים. היא רק מזיזה את הקערה לכיוון שלך ומחכה.',
    doneHe: 'היא נותנת לך משהו קטן מהארנק ואומרת "זה לא משכורת".',
    rel: { who: 'rachel', axis: 'trust', delta: 3 },
    trait: { key: 'responsibility', delta: 3 },
    at: { x: 0.62, y: 0.9, w: 0.1 },
  },
  {
    id: 'chairs-end',
    where: 'ussishkin-end',
    nameHe: 'הכיסאות בקצה',
    labelHe: 'לסדר כיסאות',
    from: '1991',
    hours: 1,
    minutes: 35,
    energy: 16,
    askHe: 'לסדר את הכיסאות מתחת לסל.',
    openHe: 'ערימה של כיסאות פלסטיק אדומים, חצי מהם שבורים, וכל אחד שסוחב שניים סוחב פחות.',
    doneHe: 'שורה ישרה של כיסאות, וכתפיים שכואבות מחר.',
    rel: { who: 'shachor', axis: 'bond', delta: 3 },
    trait: { key: 'reliability', delta: 3 },
    at: { x: 0.3, y: 0.88, w: 0.1 },
    /**
     * העבודה עם שחור, משודרגת ולא משוכפלת (21.9.2026) — `activities.ts` 'ussishkin-help'.
     * He asks which first, because the order is the job: chairs before the crowd, water
     * before the players, the cloth last. The right order is worth more on the way out.
     */
    activity: 'ussishkin-help',
    activityFrom: '1991',
    steps: [
      { id: 'right', textHe: 'קודם הכיסאות, אחר כך המים, הבד בסוף.' },
      { id: 'water', textHe: 'קודם המים. שחקנים לפני אנשים.' },
      { id: 'banner', textHe: 'קודם הבד. שיראו אותו מהכניסה.' },
    ],
  },
  {
    id: 'board-classroom',
    where: 'classroom',
    nameHe: 'המורה',
    labelHe: 'למחוק את הלוח',
    from: '1991',
    hours: 0.4,
    minutes: 15,
    energy: 5,
    askHe: 'למחוק לוח, לסדר כיסאות, לנקות מטליות.',
    openHe: 'הכיתה ריקה, האבק מהמטלית עולה בקו של האור, והמורה כותב משהו בפנקס.',
    doneHe: 'לוח נקי, ידיים לבנות, ומטבע שהוא מוציא בלי לספור.',
    rel: { who: 'teacher', axis: 'trust', delta: 3 },
    trait: { key: 'reliability', delta: 2 },
    at: { x: 0.42, y: 0.9, w: 0.1 },
  },
  {
    id: 'platform-bags',
    where: 'bus-station',
    nameHe: 'הרציף',
    labelHe: 'לעזור עם תיקים',
    from: '1996-army',
    /**
     * `until` כאן אינו קיצור של העבודה אלא תיאור של הדלת (כלל 78).
     *
     * `gigChapters` רץ מ-`from` עד סוף `ORDER` כשאין `until`, ולכן הג׳וב הזה הופיע בשבעה
     * פרקים — בזמן ש-`bus-station` נגיש **רק ב-1996-army**: הרציף הוא הבוקר של הגיוס, ואין
     * לו דלת באף פרק אחר. שש נקודות חמות עמדו בחדר שהפרק שלהן לא יכול להיכנס אליו, כלומר
     * שבוע עבודה שהרוטציה הציעה ואיש לא יכול היה לקחת.
     */
    until: '1996-army',
    hours: 0.7,
    minutes: 25,
    energy: 12,
    askHe: 'לעזור לאנשים עם תיקים אל האוטובוס.',
    openHe: 'רציף, שמונה בבוקר, ומזוודה אחת שאף אחד לא מצליח להרים לבד.',
    doneHe: 'שלושה תיקים, שתי תודות, ומטבע אחד ביד.',
    trait: { key: 'empathy', delta: 3 },
    at: { x: 0.7, y: 0.82, w: 0.1 },
    look: { key: 'propSportsBag', size: 0.07 },
  },
  {
    id: 'banner-gate5',
    where: 'gate5',
    nameHe: 'אסף',
    labelHe: 'להרים את הבד',
    from: '1998-laces',
    /**
     * אותה סיבה, שלושה פרקים: הדלת `bloomfield-outside/gate5` פתוחה ב-`1996-army`,
     * `1998-laces` ו-`1999-basket` ובאלה בלבד, וההחלטה הזאת רשומה ליד `proof-lead`.
     * בלי `until` הבד הוצע גם ב-1999-cup, 2000-title ו-2000-double — שלושה ערבים שבהם
     * אסף עומד בחדר שאי-אפשר להגיע אליו.
     */
    until: '1999-basket',
    hours: 1,
    minutes: 35,
    energy: 18,
    askHe: 'לפרוש בד, לקשור, להחזיק. אף אחד לא מדבר על כסף.',
    openHe: 'הוא לא מציג את עצמו. הוא רק אומר "תרים", ומראה על הקצה השני של הבד.',
    doneHe: 'הבד פרוש, הידיים שחורות מהחבל, ומישהו קורא לך בשם.',
    rel: { who: 'asaf', axis: 'trust', delta: 4 },
    trait: { key: 'reliability', delta: 4 },
    at: { x: 0.36, y: 0.88, w: 0.1 },
    look: { key: 'propBanner', size: 0.07 },
  },

  /**
   * ארבע שורות של פעילות (21.9.2026) — the gate games the life opens, where they are work
   * or a bet. Each is a row HERE because Maor's file forbids a second jobs system; each
   * plays as its activity from its first chapter (`activities.ts`).
   *
   *  · `order-shop` — the fan shop's seller needs a hand: a customer wants a shirt of a
   *    season, and the boy builds it (the shirt game, one shirt, dated before the year).
   *  · `rumble-pitch` — Ofir's dare on the pitch: five cards each, the losers buy the ice
   *    lollies. A WAGER (rule 72), and it takes nothing from the pocket: there is no stake.
   *  · `lineup-yard` — Amit's bet in the schoolyard: who started that night.
   *  · `bottles-ground` — the bottles after the whistle at Bloomfield, in a bag that holds
   *    four, with the clock running.
   */
  {
    id: 'order-shop',
    where: 'allenby',
    nameHe: 'המוכר בחנות האוהדים',
    labelHe: 'המוכר צריך עזרה',
    from: '1990',
    hours: 1,
    minutes: 45,
    energy: 6,
    askHe: 'לקחת את ההזמנה',
    openHe: 'המוכר מנופף בפתק מהדלת של החנות: "לקוח רוצה חולצה של עונה אחת, בדיוק כמו שהייתה. אתה מכיר את זה יותר טוב ממני."',
    doneHe: 'החולצה על הדלפק, והלקוח מסובב אותה לאור.',
    trait: { key: 'responsibility', delta: 2 },
    at: { x: 0.263, y: 0.74, w: 0.062 },
    activity: 'shop-order',
    activityFrom: '1990',
    rotates: false,
    spot: false,
  },
  {
    id: 'rumble-pitch',
    where: 'pitch',
    // the gang, not Ofir by name: nobody from the cast stands on this pitch in the nineties
    // (rule 85 — whoever speaks, stands), and a dare is the whole pitch's anyway
    nameHe: 'החבר׳ה במגרש',
    labelHe: 'רויאל ראמבל על ארטיק',
    from: '1990',
    until: '1999-cup',
    hours: 0.5,
    minutes: 30,
    energy: 6,
    askHe: 'להתערב',
    openHe: 'על האספלט ליד הקורה מישהו מנופף בחפיסת קלפים של שחקנים: "רויאל ראמבל. חמישה נגד חמישה, מהקלפים. המפסידים קונים ארטיק."',
    doneHe: 'הקלפים חוזרים לחפיסה, והוויכוח על הארטיק מתחיל.',
    trait: { key: 'courage', delta: 2 },
    at: { x: 0.42, y: 0.9, w: 0.08 },
    activity: 'pitch-rumble',
    activityFrom: '1990',
    wager: true,
    rotates: false,
  },
  {
    id: 'lineup-yard',
    where: 'schoolyard',
    // a boy from the class, not Amit: Amit stands in this yard only in 1991 (rule 85)
    nameHe: 'החבר׳ה בחצר',
    labelHe: 'התערבות על הרכב',
    from: '1990',
    until: '1995-sinai',
    hours: 0.3,
    minutes: 15,
    energy: 3,
    askHe: 'להתערב',
    openHe: 'ילד מהכיתה נשען על הגדר עם העיתון מקופל: "רוצה להתערב שאתה לא זוכר מי פתח?"',
    doneHe: 'העיתון מתקפל בחזרה.',
    trait: { key: 'courage', delta: 1 },
    at: { x: 0.34, y: 0.86, w: 0.08 },
    activity: 'yard-lineup',
    activityFrom: '1990',
    wager: true,
    rotates: false,
  },
  {
    id: 'bottles-ground',
    where: 'bloomfield-outside',
    nameHe: 'אחרי השריקה',
    labelHe: 'בקבוקים אחרי המשחק',
    from: '1990',
    hours: 1,
    minutes: 30,
    energy: 10,
    askHe: 'לאסוף בקבוקים לפני שמנקים',
    openHe: 'הקהל יוצא, והמדרכה מתחת לגדר מלאה בקבוקים. שקית אחת, ארבעה בקבוקים בכל סיבוב, והמנקים כבר בדרך.',
    doneHe: 'השקית ריקה, הפיקדון בכיס.',
    trait: { key: 'independence', delta: 2 },
    // the left of the colonnade, clear of gate seven's portal (0.45–0.58) and the fence at 0.08
    at: { x: 0.17, y: 0.93, w: 0.07 },
    look: { key: 'propBottle', size: 0.04 },
    activity: 'bottles',
    activityFrom: '1990',
    rotates: false,
    // after the whistle: the late afternoon, when the crowd has gone home
    when: { afterMinute: 17 * 60 },
  },
]

export const gigId = (gig: Gig, chapter: string) => `gig-${gig.id}-${chapter}`
export { gigFlagOf }
export const gigFlag = (gig: Gig) => gigFlagOf(gig.id)

/**
 * האם כסף עובר כאן בכלל — כלומר: כל מה שאינו `play`.
 *
 * Kept under its original name and its original meaning, because `offeredIn`, the hotspot
 * builder in `world/scenes.ts` and three test files all ask it and all mean "does this row
 * take part in the week's money". `isWork` is the narrower question (`wager` answers no to
 * that one and yes to this one), and the two are not interchangeable — which is exactly
 * why both exist instead of one of them being asked twice with a mental asterisk.
 */
export const isPaid = (gig: Gig) => !isPlay(gig)

/** whole shekels for one turn of this gig, in the money of the chapter's decade */
export function gigPay(gig: Gig, chapter: string): number {
  if (!isPaid(gig)) return 0
  if (gig.id === 'bottles-round') return Math.round(BOTTLE[decadeOf(chapter)] * 4)
  return Math.max(1, Math.round(WAGE[decadeOf(chapter)] * gig.hours))
}

/**
 * עבודה אחת לפרק — the flag that says this chapter's paid work has been done.
 *
 * Maor, 6.9.2026: *"צריך להגביל את האפשרות להרוויח כסף, פעם אחת בכל משימה."* Before this,
 * money was a tap: every job was once a DAY, and a day is short, so a determined player
 * could stand in the street doing bottles, cars, papers and crates in one afternoon and
 * buy the shirt on the first Saturday. One paid job per chapter puts the shirt back where
 * §13 of the Stage A bible wants it — several memory days away — and makes WHICH job you
 * took a decision rather than a queue.
 *
 * **ומה שהדגל הזה לא נוגע בו הוא `play`** (מאור, 17.9.2026: *"אפשר לקחת גם עבודה וגם לשחק
 * פנדלים באותו יום"*). Nothing with `kindOf === 'play'` raises it, nothing with
 * `kindOf === 'play'` is refused by it, and neither order matters: work then ball, ball
 * then work, both on the same Saturday. A boy who carried crates all morning has still not
 * kicked anything, and a chapter-scoped money rule that stopped him would be a rule about
 * an economy applied to a childhood.
 */
export { workDoneFlag } from './workFlags'

/** the flag that says this particular job is on offer in this life, this chapter */
export const offerFlag = (gig: Gig) => `work:offer:${gig.id}`

/**
 * מה מוצע היום — the rotation, and the reason two players never have the same week.
 *
 * *"וכל פעם הצעות רנדומליות, לא תמיד כל האופציות קיימות. ליצור רוטציות חכמות, ליצור שוני
 * ביום יום של פוגי."* Every eligible paid job in a room used to be on offer, always, which
 * made the street a menu. Now a chapter offers a SUBSET, chosen from the save's own seed:
 * the same save sees the same jobs every time it loads that chapter (so it is a world, not
 * a slot machine), and two saves see different ones (so it is a life, not a script).
 *
 * Two rules keep it from being merely random:
 *   · at least one paid job is always reachable somewhere in the chapter, because a
 *     chapter that offers no way to earn is a chapter that cannot be played by a boy who
 *     needs money;
 *   · **`play` is never rotated at all** — the ball is always there. A week that could deal
 *     away the street match would make "אני הפועל" a thing the seed decides, and a boy who
 *     wants to kick a ball in his own street is not making an economic decision. This is
 *     the same sentence as *"אפשר לקחת גם עבודה וגם לשחק פנדלים באותו יום"*, read from the
 *     rotation's end instead of the work slot's.
 */
export function offeredIn(chapter: string, seed: string): Set<string> {
  // a friend's dare and the bottles after a whistle are not in the week's deal (`rotates: false`)
  const eligible = GIGS.filter((gig) => isPaid(gig) && gig.rotates !== false && gigChapters(gig).includes(chapter))
  if (eligible.length === 0) return new Set()
  const scored = eligible
    .map((gig) => ({ id: gig.id, score: hash(`${seed}|${chapter}|${gig.id}`) }))
    .sort((a, b) => a.score - b.score)
  // between a third and two thirds of what exists, never fewer than one, never all of it
  const take = Math.max(1, Math.min(eligible.length - (eligible.length > 2 ? 1 : 0), Math.round(eligible.length * 0.45)))
  return new Set(scored.slice(0, take).map((entry) => entry.id))
}

/** a small, stable string hash — the rotation has to survive a reload, not a cryptanalyst */
function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967295
}

/** the gigs that exist in this chapter, in this room */
export function gigsIn(chapter: string, where: string): Gig[] {
  const now = ORDER.indexOf(chapter)
  if (now < 0) return []
  return GIGS.filter((gig) => {
    if (gig.where !== where) return false
    if (ORDER.indexOf(gig.from) > now) return false
    if (gig.until && ORDER.indexOf(gig.until) < now) return false
    return true
  })
}

/** every chapter a gig is offered in, so a hotspot can be generated per era */
export function gigChapters(gig: Gig): string[] {
  const from = ORDER.indexOf(gig.from)
  const until = ORDER.indexOf(gig.until ?? CHILDHOOD_GIGS_END)
  return ORDER.slice(from, until + 1)
}

/**
 * One conversation per gig per chapter — generated, for the same reason the fan shop is:
 * a wage that is typed in nineteen places is nineteen chances to be wrong about a decade.
 *
 * The refusal is not a locked door. A gig you have already done today says so in the
 * person's own voice, because "כבר סידרת לי היום" is a sentence a shopkeeper says and
 * "לא זמין" is a sentence a menu says.
 */
/** the activity a gig row plays as in this chapter — null before its first chapter */
export function gigActivity(gig: Gig, chapter: string): ActivityDef | null {
  if (!gig.activity || !isActivityId(gig.activity)) return null
  const def = ACTIVITY[gig.activity]
  const order = ORDER
  if (order.indexOf(chapter) < order.indexOf(gig.activityFrom ?? gig.from)) return null
  return activityIn(def, chapter) ? def : null
}

/**
 * The same three branches every gig has — done today, the chapter's work already taken, and
 * the offer — with the offer opening the activity. Nothing is paid or flagged here: the
 * activity settles when it ends (`settleActivity`), because a job that paid on the handshake
 * would make the game decoration.
 */
/**
 * עבודה / התערבות / משחק — said on the button itself (delta 90, §22.3).
 *
 * The player should never wonder whether a thing is a job, a bet or just play, and the
 * handshake is the moment he decides. So a paid row's choice reads `עבודה: … — עד 12 ₪ ·
 * כ־45 דק׳` and a bet's `התערבות: …`. A game's door is left exactly as the boy says it
 * ("אני הפועל." IS the door — `tests/life-progress`), because a label on it would be the
 * menu talking over the child.
 */
export const GIG_KIND_HE: Record<GigKind, string> = { work: 'עבודה', wager: 'התערבות', play: 'משחק' }

function labelled(gig: Gig, text: string, pay: number, minutes: number): string {
  const kind = kindOf(gig)
  if (kind === 'play') return text
  const money = pay > 0 ? ` — עד ${pay} ₪` : ''
  const time = minutes > 0 ? ` · כ־${minutes} דק׳` : ''
  return `${GIG_KIND_HE[kind]}: ${text}${money}${time}`
}

function activityGigConversation(gig: Gig, chapter: string, act: ActivityDef): Conversation {
  const top = payShekels(act, chapter, 1)
  const quote = (text: string) => labelled(gig, text, top, act.minutes)
  const choices: ChoiceDef[] = gig.steps
    ? gig.steps.map((step) => ({
        id: `do-${step.id}`,
        text: quote(step.textHe),
        then: [
          { e: 'flagValue' as const, flag: CHORE_ORDER_FLAG, value: step.id },
          { e: 'minigame' as const, id: `chore:${gig.id}` },
        ],
      }))
    : [
        {
          id: 'do',
          text: quote(gig.askHe),
          then: act.kind === 'chore' ? [{ e: 'minigame' as const, id: `chore:${gig.id}` }] : [{ e: 'mechanic' as const, activity: act.id }],
        },
      ]
  return {
    id: gigId(gig, chapter),
    nameHe: gig.nameHe,
    branches: [
      { when: { flag: gigFlag(gig) } as Condition, lines: [{ who: null, text: 'עשית את זה היום כבר. מחר יש עוד.' }] },
      ...(isPaid(gig)
        ? [{ when: { flag: workDoneFlag(chapter) } as Condition, lines: [{ who: null, text: 'היום כבר יש מי שעושה את זה. תבוא בפעם הבאה.' }] }]
        : []),
      { lines: [{ who: null, text: gig.openHe }], choices: [...choices, { id: 'later', text: 'לא עכשיו.', then: [] }] },
    ],
  }
}

/** which way Shachor's job was started — read once, by the chore scene, on the way out */
export const CHORE_ORDER_FLAG = 'chore:order'

export function gigConversations(): Conversation[] {
  const out: Conversation[] = []
  for (const gig of GIGS) {
    for (const chapter of gigChapters(gig)) {
      /**
       * מפרק מסוים, הג׳וב הזה הוא פעילות (`activities.ts`): the handshake opens the game —
       * or, for Shachor's chairs, asks which first — and the pay quoted is the activity's
       * top, in this decade's money. The Toto slip keeps its own door, as it always had,
       * and quotes what the slip itself says it pays (the probe found "עד 5" at the counter
       * and "עד 10" on the slip — one of the two was lying).
       */
      const act = gigActivity(gig, chapter)
      const pay = act ? payShekels(act, chapter, 1) : gigPay(gig, chapter)
      if (act && gig.opens !== 'toto') {
        out.push(activityGigConversation(gig, chapter, act))
        continue
      }
      out.push({
        id: gigId(gig, chapter),
        nameHe: gig.nameHe,
        branches: [
          {
            when: { flag: gigFlag(gig) } as Condition,
            lines: [{ who: null, text: 'עשית את זה היום כבר. מחר יש עוד.' }],
          },
          /**
           * כבר עבדת — the refusal that enforces one paid job per chapter, in a person's
           * voice rather than a greyed-out button. The work still exists; today it is
           * somebody else's turn, which is exactly how a street with four kids in it and
           * one crate to carry actually behaves.
           */
          ...(isPaid(gig)
            ? [
                {
                  when: { flag: workDoneFlag(chapter) } as Condition,
                  lines: [{ who: null, text: 'היום כבר יש מי שעושה את זה. תבוא בפעם הבאה.' }],
                },
              ]
            : []),
          {
            lines: [{ who: null, text: gig.openHe }],
            choices: [
              {
                id: 'do',
                /**
                 * An unpaid gig does not quote a wage. `coin` was the first exception and
                 * `pitch` is the second, and the second one matters more: the choice text
                 * IS the door — a boy says "אני הפועל" and the game takes him at his word.
                 * Appending "— עד 0 ₪" to that would be the funniest possible way to break
                 * a scene.
                 */
                text: gig.opens === 'coin' || isPlay(gig) ? labelled(gig, gig.askHe, 0, gig.minutes) : labelled(gig, gig.askHe, pay, act?.minutes ?? gig.minutes),
                /**
                 * The conversation agrees to the work; `ChoreScene` is the work. Nothing is
                 * paid here on purpose — the pay depends on how it went, and a gig that
                 * paid on the handshake would make the minigame decoration.
                 */
                then: [
                  ...(gig.rel ? [{ e: 'rel' as const, who: gig.rel.who, axis: gig.rel.axis, delta: gig.rel.delta }] : []),
                  ...(gig.opens === 'toto'
                    ? /**
                       * The slip no longer claims the day's work on the handshake (delta 90,
                       * §22.7 "reload safe"): the kiosk's activity settlement raises the gig
                       * and the work flags when the slip is handed in, exactly like every other
                       * activity. Before, a reload between "yes" and the slip spent the
                       * chapter's paid work and paid nothing for it. The slip's own deal is
                       * seeded off the minute, so a reload deals the same five questions.
                       */
                      [{ e: 'toto' as const }]
                    : gig.opens === 'coin'
                      ? [{ e: 'flag' as const, flag: workDoneFlag(chapter) }, { e: 'coin' as const }]
                      : gig.opens === 'penalty'
                        ? // no money: five kicks, and whatever the big boys say afterwards
                          [{ e: 'penalty' as const, attempts: 5, perGoal: 0 }]
                        : gig.opens === 'hoops'
                          ? [{ e: 'hoops' as const, attempts: 5, perBasket: 0 }]
                          : gig.opens === 'pitch'
                            ? // the era comes off the chapter, so 1986 imagines a 1986 pitch
                              [{ e: 'pitch' as const, intent: streetMatch(eraForChapter(chapter)) }]
                            : [{ e: 'minigame' as const, id: `chore:${gig.id}` }]),
                ],
              },
              { id: 'later', text: 'לא עכשיו.', then: [] },
            ],
          },
        ],
      })
    }
  }
  return out
}
