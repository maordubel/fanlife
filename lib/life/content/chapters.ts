import type { LifeEvent } from '../events'
import { adultEntry } from '../income'
import type { LifeState, LocationId } from '../types'

/**
 * מרשם הפרקים — the life as a list of chapters, keyed by ids that are never renamed.
 *
 * Until this pass the order of the chapters lived in three places: a `PassageScene` that
 * knew 1986 goes to 1990, a bedroom beat that knew 1990 goes to 1991, and a card at the
 * end of 1991 that said "סוף שלב ב׳" and went nowhere. The Stage B brief (§13) asks for
 * the opposite: a registry keyed by stable ids, transitions driven by data, and no
 * chapter that pretends to be playable when it is not.
 *
 * Two rules, both persisted:
 *
 *  · **The id is a save key.** `chapter.entered` writes it and `redbox.ts` files objects
 *    under it. `1986`, `1990` and `1991` are the ids the game already wrote and they stay
 *    exactly as they are; every chapter after them is `year-unit`, because 1993 holds two
 *    chapters and 2000 holds two, and a calendar year alone cannot name them (§13).
 *  · **`playable` is the truth.** The runtime advances only to a chapter that has rooms
 *    behind it. A chapter declared here and not yet built is skipped by `nextPlayable`,
 *    and the last playable chapter ends on a coda instead of a "coming soon" card — so
 *    the game is always complete up to where it is complete, and never past it.
 */
/**
 * שלב ג׳ נוסף ב-21.9.2026, והוא **מקור** ולא גודל.
 *
 * `A` ו-`B` הם הבריף המקורי — 1983–2000. `C` הוא תסריט ההמשך שמאור מסר ב-20.9.2026
 * (`docs/life/SCREENPLAY-2000-2026.md`), והאות אומרת מאיפה הפרק נקרא. זה לא קישוט:
 * `WorldScene.chapterDate` מחליט לפי השלב אם להדפיס תאריך, ושלב ג׳ מתנהג כמו ב׳ —
 * אבל מי שיבוא לתקן סצנה של 2007 צריך לדעת באיזה מסמך לחפש אותה.
 */
export type ChapterStage = 'A' | 'B' | 'C'

export type Bridge = {
  /** the big word on the card — a month, a year, a place */
  titleHe: string
  subHe: string | null
  ms: number
}

export type ChapterDef = {
  id: string
  stage: ChapterStage
  /** the unit in the brief — `A8`, `B3` */
  unit: string
  titleHe: string
  /**
   * הפרק הזה קיים רק אם — every `life:` flag that must be up for this chapter to be part
   * of this life. Absent means the chapter always happens, which is true of all but one.
   */
  when?: readonly string[]
  /**
   * ...או לפחות אחד מאלה (21.9.2026) — לחלון שיש לו שתי דלתות. `2001-terrace` (T01) נפתח
   * גם למי שקיבל את דרגת הכניסה של מסלול היציע וגם למי שאמר לעמית ב-`Q01` *"אני רוצה
   * לנסות תפקיד קטן, בלי תואר"* — התסריט כותב שם *"פתיחת יחידת תוכן T01"*. `when` הוא
   * "וגם"; זה "או". פרק עם שניהם צריך את שניהם.
   */
  whenAny?: readonly string[]
  /**
   * (delta 93) the pre-match wardrobe. `MATCH_RITUALS` is the list of match days; this is
   * the chapter saying so out loud when it is NOT one — a day whose match is heard, watched
   * at home, or passed through as a card and time. `tests/life-match-ritual.test.ts` asks
   * every attended-match chapter for one or the other, so a new match day cannot slip in
   * without a decision.
   */
  matchRitual?: 'required' | 'none'
  /** what a card would say — never a scoreline */
  dateHe: string
  year: number
  /** 0 = Sunday … 6 = Saturday */
  weekday: number
  /** minutes since midnight the chapter opens on */
  minute: number
  start: { location: LocationId; spawn: string }
  /** the chapter after this one, or null at the end of the life as built */
  next: string | null
  /** the cut INTO this chapter — played by whoever advances to it */
  bridge: Bridge
  /** the anchor resolver key this chapter's history hangs on */
  anchorKey: string
  /** what the HUD calls the chapter's first day when `dateHe` is a span ('1996 – אביב 1997') */
  hudDateHe?: string
  /** events the chapter opens with — pocket money, a thing in a pocket. Never history. */
  entry?: (state: LifeState) => LifeEvent[]
  playable: boolean
}

const MIN = (h: number, m = 0) => h * 60 + m

export const CHAPTERS: readonly ChapterDef[] = [
  /**
   * שלב א׳ — ששת הימים שלפני השבת. Played as data (`chapterStageA.ts`), in the rooms
   * that exist, with the eight-year-old standing in for the smaller boys until their
   * sheets arrive. A day is short and ends on its card, not on a finale: the finale is
   * for the Saturday. `1986` stays the id it always was — a save that finished it keeps
   * its Red Box row.
   */
  {
    id: 'a2-alley',
    stage: 'A',
    unit: 'A2',
    titleHe: 'הסמטה',
    dateHe: 'אביב 1984',
    year: 1984,
    weekday: 2,
    minute: MIN(15, 40),
    start: { location: 'home', spawn: 'start' },
    next: 'a3-hall',
    bridge: { titleHe: '1984', subHe: 'השכונה נהיית משחק', ms: 2600 },
    anchorKey: '1986',
    hudDateHe: 'אביב 1984',
    playable: true,
  },
  {
    id: 'a3-hall',
    stage: 'A',
    unit: 'A3',
    // (delta 92, upgrade plan §3) Every life plays A3 now: it is where Efi is MET, as a new
    // person on the street. It used to be only for a boy who had answered him in the A2
    // alley — which made the whole basketball branch depend on pressing an unmarked NPC in
    // the first mission. "Not now" here is still a real answer, and A4 asks once more.
    titleHe: 'הבית האדום השני',
    dateHe: 'סתיו 1984',
    year: 1984,
    weekday: 4,
    minute: MIN(17, 0),
    start: { location: 'street', spawn: 'fromHome' },
    next: 'a4-shirt',
    bridge: { titleHe: 'סתיו 1984', subHe: 'אחרי הקיר, ימינה', ms: 2600 },
    anchorKey: '1986',
    hudDateHe: 'סתיו 1984',
    playable: true,
  },
  {
    id: 'a4-shirt',
    stage: 'A',
    unit: 'A4',
    titleHe: 'החולצה',
    /**
     * ספטמבר, לא קיץ — the day the shirt costs thirty shekels has to be a day on which
     * shekels exist.
     *
     * The new shekel came in on 4.9.1985. A4 was set in "קיץ 1985" and its whole mechanic
     * is counting to thirty of them, which is a currency the summer of 1985 did not have —
     * and in the old one, thirty bought nothing. It is the second half of September now:
     * after the changeover, and before 28.9.1985, which is A5. Nothing else about the day
     * moves. (Found by the language audit, 6.9.2026.)
     */
    dateHe: 'ספטמבר 1985',
    year: 1985,
    weekday: 0,
    minute: MIN(9, 30),
    start: { location: 'bedroom', spawn: 'start' },
    next: 'a5-first',
    bridge: { titleHe: 'ספטמבר 1985', subHe: 'פחית עם חריץ', ms: 2600 },
    anchorKey: '1986',
    hudDateHe: 'ספטמבר 1985',
    playable: true,
  },
  {
    id: 'a5-first',
    stage: 'A',
    unit: 'A5',
    titleHe: 'בחולצה שלך',
    dateHe: '28 בספטמבר 1985',
    year: 1985,
    weekday: 6,
    minute: MIN(13, 0),
    start: { location: 'bedroom', spawn: 'start' },
    next: 'a6-radio',
    bridge: { titleHe: '28.9.1985', subHe: 'שבת', ms: 2600 },
    anchorKey: '1986',
    hudDateHe: '28 בספטמבר 1985',
    playable: true,
  },
  {
    id: 'a6-radio',
    stage: 'A',
    unit: 'A6',
    titleHe: 'אכזבה רגילה',
    dateHe: 'חורף 1985/86',
    year: 1986,
    weekday: 6,
    minute: MIN(14, 0),
    start: { location: 'home', spawn: 'start' },
    next: 'a7-week',
    bridge: { titleHe: 'חורף', subHe: 'גשם על התריס', ms: 2600 },
    anchorKey: '1986',
    hudDateHe: 'חורף 1986',
    playable: true,
  },
  {
    id: 'a7-week',
    stage: 'A',
    unit: 'A7',
    titleHe: 'השבוע שלפני',
    dateHe: '17 במאי 1986',
    year: 1986,
    weekday: 6,
    minute: MIN(16, 0),
    start: { location: 'street', spawn: 'fromHome' },
    next: '1986',
    bridge: { titleHe: 'שבוע לפני', subHe: '17.5.1986', ms: 2600 },
    anchorKey: '1986',
    hudDateHe: '17 במאי 1986',
    playable: true,
  },
  {
    id: '1986',
    stage: 'A',
    unit: 'A8',
    titleHe: 'להגיע לבלומפילד',
    dateHe: '24 במאי 1986',
    year: 1986,
    weekday: 6,
    minute: MIN(12, 35),
    start: { location: 'bedroom', spawn: 'start' },
    next: '1990',
    bridge: { titleHe: '1986', subHe: 'שבת', ms: 2400 },
    anchorKey: '1986',
    entry: (state) => {
      // (Director V3 §11, 24.9.2026) the house key is no longer handed over on entry to
      // unlock a door: the door is open, and the key waits in the drawer on its string for
      // the boy who opens it (`desk`) — a thing an eight-year-old has, not a quest
      const events: LifeEvent[] = [{ t: 'flag.raised', flag: 'knows:match' }]
      if (state.flags['life:a7:refused'] || state.flags['life:a7:promised']) {
        events.push({ t: 'flag.raised', flag: 'asked:ticket' })
      }
      return events
    },
    playable: true,
  },
  {
    id: '1990',
    stage: 'B',
    unit: 'B1',
    titleHe: 'כמה צריך?',
    dateHe: '12 במאי 1990',
    year: 1990,
    weekday: 6,
    minute: MIN(13, 10),
    start: { location: 'kitchen', spawn: 'start' },
    next: '1991',
    bridge: { titleHe: '1990', subHe: 'ארבע שנים', ms: 2400 },
    anchorKey: '1990',
    playable: true,
  },
  {
    id: '1991',
    stage: 'B',
    unit: 'B2',
    titleHe: 'יש עוד בית',
    dateHe: '11 במרץ 1991',
    year: 1991,
    weekday: 1,
    minute: MIN(8, 10),
    start: { location: 'classroom', spawn: 'start' },
    next: '1993-cup',
    bridge: { titleHe: 'מרץ', subHe: 'אוסישקין', ms: 2400 },
    anchorKey: '1991',
    playable: true,
  },
  {
    id: '1993-cup',
    stage: 'B',
    unit: 'B3',
    titleHe: 'הגביע אדום',
    dateHe: '19 באפריל 1993',
    year: 1993,
    weekday: 1,
    minute: MIN(15, 30),
    start: { location: 'home', spawn: 'start' },
    next: '1993-galil',
    bridge: { titleHe: '1993', subHe: 'שנתיים. הוא כבר לא מבקש רשות.', ms: 3000 },
    anchorKey: '1993-cup',
    entry: () => [{ t: 'money.changed', agorot: 2200, why: 'מה שנשאר מהחודש' }],
    playable: true,
  },
  {
    id: '1993-galil',
    stage: 'B',
    unit: 'B4',
    titleHe: 'הבית נשבר',
    dateHe: '9–19 במאי 1993',
    year: 1993,
    weekday: 0,
    minute: MIN(18, 0),
    start: { location: 'ussishkin-outside', spawn: 'start' },
    next: '1995-sinai',
    bridge: { titleHe: 'שלושה שבועות', subHe: 'הגמר', ms: 2600 },
    anchorKey: '1993-galil',
    hudDateHe: '9 במאי 1993',
    playable: true,
  },
  {
    id: '1995-sinai',
    stage: 'B',
    unit: 'B5',
    titleHe: 'המספר שבע על הקיר',
    dateHe: '1994–1995',
    year: 1994,
    weekday: 2,
    minute: MIN(18, 40),
    start: { location: 'kiosk', spawn: 'start' },
    next: '1996-army',
    bridge: { titleHe: '1994', subHe: 'שנים רעות', ms: 2600 },
    anchorKey: '1994-cup',
    hudDateHe: 'סתיו 1994',
    playable: true,
  },
  {
    id: '1996-army',
    stage: 'B',
    unit: 'B6',
    titleHe: 'אין מקום אחד לעמוד בו',
    dateHe: '1996 – אביב 1997',
    year: 1996,
    weekday: 4,
    minute: MIN(16, 0),
    start: { location: 'street', spawn: 'fromHome' },
    entry: () => [{ t: 'money.changed', agorot: 2500, why: 'הערב האחרון בבית' }],
    next: '1997-basket',
    bridge: { titleHe: '1996', subHe: 'שמונה־עשרה', ms: 2600 },
    anchorKey: '1997-sale',
    hudDateHe: 'נובמבר 1996',
    playable: true,
  },
  {
    id: '1997-basket',
    stage: 'B',
    unit: 'B7',
    titleHe: 'גם האולם יכול לרדת',
    dateHe: '1996/97 – 1997/98',
    year: 1997,
    weekday: 2,
    minute: MIN(19, 0),
    start: { location: 'ussishkin-outside', spawn: 'start' },
    next: '1998-laces',
    bridge: { titleHe: '1997', subHe: 'אוסישקין', ms: 2600 },
    anchorKey: '1997-relegation',
    hudDateHe: 'אביב 1997',
    playable: true,
  },
  {
    id: '1998-laces',
    stage: 'B',
    unit: 'B8',
    titleHe: 'השרוכים',
    dateHe: '2 במאי 1998',
    year: 1998,
    weekday: 6,
    minute: MIN(13, 0),
    start: { location: 'home', spawn: 'start' },
    next: '1999-basket',
    bridge: { titleHe: '2.5.1998', subHe: 'המחזור ה-29', ms: 3000 },
    anchorKey: '1998',
    playable: true,
  },
  {
    id: '1999-basket',
    stage: 'B',
    unit: 'B9',
    titleHe: 'זה לא נגמר כשעולים',
    dateHe: '1998/99',
    year: 1999,
    weekday: 3,
    minute: MIN(18, 30),
    start: { location: 'ussishkin-outside', spawn: 'start' },
    next: '1999-cup',
    bridge: { titleHe: '1999', subHe: 'שוב', ms: 2600 },
    anchorKey: '1999-relegation',
    hudDateHe: 'אביב 1999',
    playable: true,
  },
  {
    id: '1999-cup',
    stage: 'B',
    unit: 'B10',
    titleHe: 'שש־עשרה שנה',
    dateHe: '19 במאי 1999',
    year: 1999,
    weekday: 3,
    minute: MIN(14, 0),
    start: { location: 'home', spawn: 'start' },
    next: '2000-title',
    bridge: { titleHe: '19.5.1999', subHe: 'רמת גן', ms: 3000 },
    anchorKey: '1999-cup',
    playable: true,
  },
  {
    id: '2000-title',
    stage: 'B',
    unit: 'B11a',
    titleHe: 'ארבעה ימים',
    dateHe: '13 במאי 2000',
    year: 2000,
    weekday: 6,
    minute: MIN(14, 30),
    start: { location: 'home', spawn: 'start' },
    next: '2000-double',
    bridge: { titleHe: '2000', subHe: 'שכונת התקווה', ms: 3000 },
    anchorKey: '2000-title',
    playable: true,
  },
  {
    id: '2000-double',
    stage: 'B',
    unit: 'B11b',
    titleHe: 'הדאבל',
    dateHe: '17 במאי 2000',
    year: 2000,
    weekday: 3,
    minute: MIN(15, 0),
    start: { location: 'home', spawn: 'start' },
    next: '2000-bridge',
    bridge: { titleHe: 'ארבעה ימים אחר כך', subHe: 'רמת גן', ms: 3000 },
    anchorKey: '2000-cup',
    playable: true,
  },
  /**
   * שלב ג׳ — תסריט ההמשך, 2000–2026. הפרק הראשון הוא **הגשר**, וזה שמו.
   *
   * `2000-double` נשא `next: null` עד היום, וזה היה נכון כל עוד 2000 היה סוף מה
   * שנבנה. מרגע שמאור מסר תסריט שנפתח בדיוק שם, זה הפך לחיים שנגמרים בגמר גביע:
   * השחקן מסיים את הדאבל, מקבל כרטיס, ואין מחר. הפרק הזה הוא שלוש הסצנות שהתסריט
   * עצמו פותח בהן — B00 הסלון, B01 הקופסה, B02 הקיוסק.
   *
   * **השעה היא לילה.** 22:40 של יום רביעי, אחרי גמר גביע המדינה ברמת גן. זה הפרק
   * היחיד במשחק שמתחיל אחרי חשכה, ולכן גם היחיד שהמטרה שלו אינה מגרש (`goalBridge`).
   */
  {
    id: '2000-bridge',
    stage: 'C',
    unit: 'B00–B02',
    titleHe: 'מה שאחרי',
    dateHe: '17 במאי 2000',
    year: 2000,
    weekday: 3,
    minute: MIN(22, 40),
    start: { location: 'home', spawn: 'start' },
    next: '2000-team',
    bridge: { titleHe: 'אחרי הדאבל', subHe: 'שכונת התקווה', ms: 3000 },
    anchorKey: '2000-cup',
    playable: true,
  },
  /**
   * חלון — `TOURNAMENT` (Y01–Y05). נפתח מהחיים: למי שבחר בקיוסק של `2000-bridge` ערב עם
   * החבר׳ה (`life:team`, `chapterTeam.ts`) — בלי הזמנה ובלי שאלה. סצנה אישית בדיונית: העוגן שאול מ-`2000-cup`, ולכן
   * הפרק הזה לא כותב נוכחות (`anchorOwner`).
   */
  {
    id: '2000-team',
    stage: 'C',
    unit: 'Y01–Y05',
    titleHe: 'צריך שם עד מחר',
    when: ['life:team'],
    dateHe: 'קיץ 2000',
    year: 2000,
    weekday: 5,
    minute: MIN(17, 30),
    start: { location: 'pitch', spawn: 'start' },
    next: '2001-terrace',
    bridge: { titleHe: 'קיץ', subHe: 'חמישה על חמישה', ms: 3000 },
    anchorKey: '2000-cup',
    hudDateHe: 'קיץ 2000',
    playable: true,
  },
  /**
   * חלונות CAREER — T01–T03 ו-J01–J03 (`chapterCareer.ts`). כל אחד נפתח רק למי שמחזיק
   * את הדרגה שלפניו במסלול, ואף אחד לא מעניק דרגה: הוא כותב את ההוכחה שהמסלול מבקש.
   * כולם שואלים את העוגן מהפרק שלפניהם, ולכן אינם כותבים נוכחות (`anchorOwner`).
   */
  {
    id: '2001-terrace',
    stage: 'C',
    unit: 'T01',
    titleHe: 'לא מי שצועק הכי חזק',
    whenAny: ['own:route:ULTRAS:entry', 'life:terrace:exploring'],
    dateHe: '2001',
    year: 2001,
    weekday: 6,
    minute: MIN(16, 0),
    start: { location: 'gate5', spawn: 'start' },
    next: '2002-europe',
    bridge: { titleHe: 'יציע', subHe: 'ידיים, לא צעקות', ms: 3000 },
    anchorKey: '2000-cup',
    hudDateHe: '2001',
    playable: true,
  },
  /**
   * 2001–2002 — הפרק הראשון במשחק שנתלה על **הפסד**.
   *
   * העוגן הוא 21.3.2002 בסן סירו, כי זו הסצנה שהתסריט כותב במפורש. `dateHe` הוא טווח
   * ולא יום, כמו `1996-army`, ולכן `hudDateHe` נושא את מה שה-HUD מדפיס ביום הראשון.
   */
  {
    id: '2002-europe',
    stage: 'C',
    unit: 'E01–E05',
    titleHe: 'העולם שמע עלינו',
    dateHe: '2001–2002',
    year: 2002,
    weekday: 4,
    minute: MIN(18, 0),
    start: { location: 'home', spawn: 'start' },
    next: '2002-desk',
    bridge: { titleHe: 'שנה וחצי אחר כך', subHe: 'אירופה יודעת איפה זה', ms: 3000 },
    anchorKey: '2002-milan',
    hudDateHe: '2002',
    /**
     * מה שנשאר משנה וחצי — **והמספר הזה נולד משומר שנפל, לא מהרגשה.**
     *
     * `npm run life:budget` דיווח שהכרטיס לאירופה (1,800 ₪) הוא סף מעל התקרה: כל הכסף
     * שאפשר להרוויח בחיים האלה עד 2002 הוא **692 ₪**. זה סף בלתי-אפשרי, כלומר ענף
     * מת (כלל 66) — שליש מהפרק שאיש לא היה יכול לקחת.
     *
     * ומה שהוא חשף גדול מהמספר: **הפרקים הבוגרים משלמים שכר של ילד.** הארנק יודע
     * סכום ולא קצב (`NEEDS_A_HOME`), אז בן עשרים־וארבע שעובד שנה וחצי מרוויח בדיוק
     * כמו בן שמונה שאוסף בקבוקים. זו המערכת החסרה, וזו הצורה הזמנית והכנה שלה.
     *
     * **הגזירה:** `WAGE['00s']` הוא 18 ₪ לשעה. בין 17.5.2000 לאביב 2002 עוברים כ-78
     * שבועות. מי שלקח את ההתחייבות אצל רפי ב-B02 חוסך כשעתיים־שכר בשבוע → ~2,800 ₪
     * ברוטו, ומזה **1,600 ₪** נשארים בכיס: הערכה שמרנית, לא תקרה. מי שלא לקח אותה
     * הגיע עם **900 ₪**, שזה מספיק לכל שאר הפרק ולא מספיק לכרטיס.
     *
     * וזה מה שהופך את B02 לבחירה עם המשך: ההתחייבות שנלקחה בלילה שאחרי הדאבל היא
     * מה שמחליט אם אפשר לטוס למילאן שנה וחצי אחר כך.
     *
     * **וכל זה הוחלף במודל, אחרי שמאור אמר "תסדר שנושא הכסף יהיה יותר לגיטימי".**
     * הוא צדק: סכום מוקלד ב-`entry` אינו קצב — הוא לא יודע כמה זמן עבר, מה פוגי עושה
     * לפרנסה, או איפה הוא גר. `lib/life/income.ts` יודע את שלושתם, וכל מספר בו נגזר
     * מ-`WAGE` ומ-186 שעות בחודש. מה שנשאר מהמשפט הזה נכון: מי שלקח את ההתחייבות אצל
     * רפי מגיע לכאן עם יותר, כי עבודה יציבה שומרת יותר.
     */
    entry: adultEntry(2000, 2002),
    playable: true,
  },
  /** חלון CAREER · J01 (`chapterCareer.ts`) */
  {
    id: '2002-desk',
    stage: 'C',
    unit: 'J01',
    titleHe: 'לכתוב או להיות צודק',
    when: ['own:route:JOURNALIST:entry'],
    dateHe: '2002',
    year: 2002,
    weekday: 2,
    minute: MIN(19, 0),
    start: { location: 'allenby', spawn: 'fromSouth' },
    next: '2006-home',
    bridge: { titleHe: 'פרסום', subHe: 'ראשון', ms: 3000 },
    anchorKey: '2002-milan',
    hudDateHe: '2002',
    playable: true,
  },
  /**
   * 2004–2006 — קשת, לא יום.
   *
   * התסריט כותב *"לתת לבית הישן רגע שמחה לפני קשת האובדן"*, ולכן הפרק נפתח על ניצחון
   * ונגמר שנתיים אחר כך ליד דלת. העוגן — 8.3.2004 באוסישקין — לא היה בארכיון והוסף
   * ממקור (ראה `anchor-server.ts`), כי כלל 49 אומר להוסיף שורה ולא להקליד תוצאה.
   */
  {
    id: '2006-home',
    stage: 'C',
    unit: 'H01–H04',
    titleHe: 'ריח של בית',
    dateHe: '2004–2006',
    year: 2006,
    weekday: 1,
    minute: MIN(19, 30),
    start: { location: 'ussishkin-hall', spawn: 'start' },
    next: '2006-desk',
    bridge: { titleHe: 'שנתיים', subHe: 'אוסישקין', ms: 3000 },
    anchorKey: '2004-derby',
    hudDateHe: '2004',
    entry: adultEntry(2002, 2006),
    playable: true,
  },
  /** חלון CAREER · J02 — פרק אחר מ-J01, כי תיקון נכתב אחרי מה שהוא מתקן */
  {
    id: '2006-desk',
    stage: 'C',
    unit: 'J02',
    titleHe: 'התיקון נשאר באותו מקום',
    when: ['life:desk'],
    dateHe: '2006',
    year: 2006,
    weekday: 0,
    minute: MIN(21, 0),
    start: { location: 'newsroom', spawn: 'start' },
    next: '2007-table',
    bridge: { titleHe: 'תיקון', subHe: 'באותו מקום', ms: 3000 },
    anchorKey: '2004-derby',
    hudDateHe: '2006',
    playable: true,
  },
  /**
   * 2007 — **שלושה פרקים, וזה מבנה שהמנוע כופה ולא טעם.**
   *
   * `USSISHKIN_FOUNDER.apex` מבקש שלוש ראיות בשלושה פרקים שונים בתוך חלון 2007
   * (`FOUNDING_YEAR`), ו-`achievements.ts` אמר את זה בקול מאז 16.9.2026: *"שנה שהיא
   * פרק אחד הופכת אותה לבלתי-אפשרית במבנה."* אז זו שנה אחת בשלושה ימים: השולחן,
   * הרישום וההריסה, והמפתח.
   */
  {
    id: '2007-table',
    stage: 'C',
    unit: 'U01',
    titleHe: 'הדף מהקיוסק',
    dateHe: 'אביב 2007',
    year: 2007,
    weekday: 2,
    minute: MIN(17, 30),
    start: { location: 'community-room', spawn: 'start' },
    next: '2007-registered',
    bridge: { titleHe: '2007', subHe: 'שולחן, ודף', ms: 3000 },
    anchorKey: '2007-founding',
    hudDateHe: 'אביב 2007',
    entry: adultEntry(2006, 2007),
    playable: true,
  },
  {
    id: '2007-registered',
    stage: 'C',
    unit: 'U02–U03',
    titleHe: 'חודש אחד',
    dateHe: '25 ביוני – 25 ביולי 2007',
    year: 2007,
    weekday: 1,
    minute: MIN(16, 0),
    start: { location: 'community-room', spawn: 'start' },
    next: '2007-key',
    bridge: { titleHe: '25.6.2007', subHe: 'נרשמה קבוצה', ms: 3000 },
    anchorKey: '2007-demolition',
    hudDateHe: '25 ביוני 2007',
    playable: true,
  },
  {
    id: '2007-key',
    stage: 'C',
    unit: 'U04',
    titleHe: 'מי פותח מחר',
    dateHe: 'סתיו 2007',
    year: 2007,
    weekday: 0,
    minute: MIN(20, 0),
    start: { location: 'hall-new', spawn: 'start' },
    next: '2009-up',
    bridge: { titleHe: 'סתיו', subHe: 'אולם ריק, ומפתח', ms: 3000 },
    anchorKey: '2007-founding',
    hudDateHe: 'סתיו 2007',
    playable: true,
  },
  /** 2009 — וזה כבר לא ייסוד. זה מה שגדל ממנו, ומי מחזיק את המפתח עכשיו. */
  {
    id: '2009-up',
    stage: 'C',
    unit: 'U05',
    titleHe: 'עלינו. יש מי שיסגור?',
    dateHe: '2009',
    year: 2009,
    weekday: 6,
    minute: MIN(21, 0),
    start: { location: 'hall-new', spawn: 'start' },
    next: '2010-cup',
    bridge: { titleHe: 'שנתיים', subHe: 'עשרים ושניים ניצחונות', ms: 3000 },
    anchorKey: '2009-promotion',
    hudDateHe: '2009',
    entry: adultEntry(2007, 2009),
    playable: true,
  },
  /**
   * 2010 — הדאבל השני, **בשני פרקים מאותה סיבה שהראשון היה**.
   *
   * התסריט כותב D01–D09 כפרק אחד. אליפות וגביע הם שני ימים שונים בחיים גם כשהם באותו
   * שבוע, ו-`2000-title`/`2000-double` כבר קבעו את הצורה: החלק הראשון נגמר בגמר הגביע,
   * השני פותח ארבעה ימים אחר כך. הבטחת החזרה מטדי חוצה סצנות בתוך השני.
   */
  {
    id: '2010-cup',
    stage: 'C',
    unit: 'D01–D04',
    titleHe: 'אל תתחיל לחשב',
    dateHe: 'חורף–אביב 2010',
    year: 2010,
    weekday: 6,
    minute: MIN(14, 0),
    start: { location: 'pitch', spawn: 'start' },
    next: '2010-teddy',
    bridge: { titleHe: 'שנה', subHe: 'חורף 2009/10', ms: 3000 },
    anchorKey: '2010-cup',
    hudDateHe: 'חורף 2010',
    entry: adultEntry(2009, 2010),
    playable: true,
  },
  {
    id: '2010-teddy',
    stage: 'C',
    unit: 'D05–D09',
    titleHe: 'עד שהטלפון נופל',
    dateHe: '15 במאי 2010',
    year: 2010,
    weekday: 6,
    minute: MIN(15, 30),
    start: { location: 'street', spawn: 'fromHome' },
    next: '2010-qualify',
    bridge: { titleHe: 'ארבעה ימים', subHe: 'טדי', ms: 3000 },
    anchorKey: '2010-title',
    playable: true,
  },
  /**
   * 2010 — אירופה, C01–C07, **בשני פרקים**.
   *
   * התסריט כותב שבע סצנות תחת כותרת אחת. הפיצול הוא לפי מה שהן: `2010-qualify` הוא
   * קיץ אחד — שלושה סיבובי מוקדמות ובחירה אחת של חופשה, שנגמר כשעולים — ו-`2010-anthem`
   * הוא הסתיו שאחריו, שישה משחקים בשלב הבתים. שני העוגנים הם שורות ויקיפועל בביטחון 2.
   */
  {
    id: '2010-qualify',
    stage: 'C',
    unit: 'C01–C02',
    titleHe: 'עוד לא הוגרלה עיר',
    dateHe: 'קיץ 2010',
    year: 2010,
    weekday: 3,
    minute: MIN(17, 40),
    start: { location: 'kiosk', spawn: 'start' },
    next: '2010-friends',
    bridge: { titleHe: 'קיץ', subHe: 'שלושה סיבובים', ms: 3000 },
    anchorKey: '2010-salzburg',
    hudDateHe: 'קיץ 2010',
    playable: true,
  },
  /**
   * חלון INTERNATIONAL · I01–I03 (`chapterFriends.ts`). נפתח למי שבחר ב-`C02` לארח בארץ
   * (`life:international`): רומא מביא אליו את לינה וניקו. העוגן שאול מ-`2010-qualify`.
   */
  {
    id: '2010-friends',
    stage: 'C',
    unit: 'I01–I03',
    titleHe: 'לא כל צעיף הוא אותה עמדה',
    when: ['life:international'],
    dateHe: 'סתיו 2010',
    year: 2010,
    weekday: 4,
    minute: MIN(19, 30),
    start: { location: 'allenby', spawn: 'fromSouth' },
    next: '2010-anthem',
    bridge: { titleHe: 'אורחים', subHe: 'רומא מביא אנשים', ms: 3000 },
    anchorKey: '2010-salzburg',
    hudDateHe: 'סתיו 2010',
    playable: true,
  },
  {
    id: '2010-anthem',
    stage: 'C',
    unit: 'C03–C07',
    titleHe: 'המנגינה הזאת',
    dateHe: 'סתיו 2010',
    year: 2010,
    weekday: 3,
    minute: MIN(20, 10),
    start: { location: 'home', spawn: 'start' },
    next: '2011-people',
    bridge: { titleHe: 'שלושה חודשים', subHe: 'שלב הבתים', ms: 3000 },
    anchorKey: '2010-benfica',
    hudDateHe: 'סתיו 2010',
    playable: true,
  },
  /**
   * חיי בית, הפרק הראשון — L01–L03. **ענף רשות בתוכן, לא בשרשרת:** כל אחד משלושת
   * המפגשים יכול להיגמר בחברות ובלי מחיר, ולכן הפרק עובר בכל חיים ואינו מחייב אף
   * קשר. זו אותה הכרעה של Z04: מה שרשות הוא הבחירה, לא הנוכחות של הסצנה.
   */
  {
    id: '2011-people',
    stage: 'C',
    unit: 'L01–L03',
    titleHe: 'לא תמונה שלך',
    dateHe: '2011',
    year: 2011,
    weekday: 4,
    minute: MIN(19, 30),
    start: { location: 'allenby', spawn: 'start' },
    next: '2012-cups',
    bridge: { titleHe: 'חצי שנה', subHe: 'אנשים', ms: 3000 },
    anchorKey: '2011-cup',
    hudDateHe: '2011',
    playable: true,
  },
  /**
   * 2011–2013 — N01–N04, בשני פרקים.
   *
   * `2012-cups` הוא ערב אחד של גביע שלישי ברצף; `2012-five` הוא חמש השנים שמאחוריו —
   * העלייה בכדורסל, מה זה "בעלים", וחדר חזרות. שני עוגנים ולכן שני פרקים.
   */
  {
    id: '2012-cups',
    matchRitual: 'none',
    stage: 'C',
    unit: 'N01',
    titleHe: 'שלושה גביעים ואותה הבטחה',
    dateHe: '15 במאי 2012',
    year: 2012,
    weekday: 2,
    minute: MIN(18, 20),
    start: { location: 'home', spawn: 'start' },
    next: '2012-five',
    bridge: { titleHe: 'שנה וחצי', subHe: 'עוד גמר', ms: 3000 },
    anchorKey: '2012-cup',
    hudDateHe: 'מאי 2012',
    entry: adultEntry(2010, 2012),
    playable: true,
  },
  {
    id: '2012-five',
    stage: 'C',
    unit: 'N02–N04',
    titleHe: 'חמש שנים וכמה מפתחות',
    dateHe: 'קיץ 2012',
    year: 2012,
    weekday: 4,
    minute: MIN(19, 0),
    start: { location: 'allenby', spawn: 'start' },
    next: '2012-terrace',
    bridge: { titleHe: 'יום אחד', subHe: 'חמש שנים', ms: 3000 },
    anchorKey: '2012-promotion',
    hudDateHe: 'קיץ 2012',
    playable: true,
  },
  /** חלון CAREER · T02 */
  {
    id: '2012-terrace',
    stage: 'C',
    unit: 'T02',
    titleHe: 'מי פותח כשאתה לא בא',
    when: ['own:route:ULTRAS:entry', 'life:terrace:role'],
    dateHe: '2012',
    year: 2012,
    weekday: 6,
    minute: MIN(17, 0),
    start: { location: 'gate5', spawn: 'start' },
    next: '2013-household',
    bridge: { titleHe: 'יציע', subHe: 'מי פותח', ms: 3000 },
    anchorKey: '2012-promotion',
    hudDateHe: '2012',
    playable: true,
  },
  /**
   * חיי בית, הפרק השני — L04–L06. **שני צורות, והפרק נגמר בשתיהן** (כלל 75): עם
   * בן/בת זוג שנבחר/ה ב-`2011-people`, או בבית עצמאי שבו קרן חברה לשיחה — *"לא בת
   * זוג אוטומטית"*, בלשון התסריט. הערב הראשון עם ילד קורה רק כשהכוונה נאמרה על ידי
   * שניהם, והוא המקום היחיד במשחק ש-`life:child` מורם בו.
   */
  {
    id: '2013-household',
    stage: 'C',
    unit: 'L04–L06',
    titleHe: 'היומן שעל המקרר',
    dateHe: '2013',
    year: 2013,
    weekday: 0,
    minute: MIN(20, 0),
    start: { location: 'home', spawn: 'start' },
    next: '2015-newhall',
    bridge: { titleHe: 'שנה', subHe: 'בית', ms: 3000 },
    anchorKey: '2012-derby',
    hudDateHe: '2013',
    playable: true,
  },
  /**
   * 2015–2016 — N05–N06, **פרק אחד ועוגן אחד**, וזו הוראה ולא קיצור.
   *
   * `N06` אסור לו עוגן: הוראת ההפקה אומרת ש-`V4-BLOOMFIELD` הוא מזהה הקשר תקופתי
   * *"ולא טענת אימות חדשה — אין לחבר אותו לארכיון כמשחק מתועד"*. האולם החדש, לעומת
   * זה, הוא עובדה שהארכיון כבר מחזיק, ולכן `2015-drivein` הוא עוגן סיכום.
   */
  {
    id: '2015-newhall',
    matchRitual: 'none',
    stage: 'C',
    unit: 'N05–N06',
    titleHe: 'בית עם כתובת אחרת',
    dateHe: 'בין 2015 ל-2016',
    year: 2015,
    weekday: 5,
    minute: MIN(16, 45),
    start: { location: 'drive-in', spawn: 'start' },
    next: '2016-crisis',
    bridge: { titleHe: 'שלוש שנים', subHe: 'כתובת חדשה', ms: 3000 },
    anchorKey: '2015-drivein',
    hudDateHe: '2015',
    entry: adultEntry(2012, 2015),
    playable: true,
  },
  /**
   * 2016–2018 — P01–P07, בשני פרקים: מה שקרה, ומה שנשאר אחריו.
   *
   * שני העוגנים הם **רגעים** ולא משחקים — צו הקפאת ההליכים של 12.12.2016 והפחתת תשע
   * הנקודות של 10.1.2017 — ושניהם נקראים מ-`moments.json` דרך `momentSlug`, כך
   * שהמשפט חי בארכיון ולא בשני מקומות (כלל 59).
   */
  {
    id: '2016-crisis',
    stage: 'C',
    unit: 'P01–P04',
    titleHe: 'מה בעצם קרה',
    dateHe: 'דצמבר 2016',
    year: 2016,
    weekday: 1,
    minute: MIN(17, 15),
    start: { location: 'kiosk', spawn: 'start' },
    next: '2017-after',
    bridge: { titleHe: 'שנה', subHe: 'דצמבר', ms: 3000 },
    anchorKey: '2016-freeze',
    hudDateHe: 'דצמבר 2016',
    entry: adultEntry(2015, 2016),
    playable: true,
  },
  {
    id: '2017-after',
    stage: 'C',
    unit: 'P05–P07',
    titleHe: 'את המשפט הזה כבר שמעתי',
    dateHe: '2017',
    year: 2017,
    weekday: 0,
    minute: MIN(18, 40),
    start: { location: 'kiosk', spawn: 'start' },
    next: '2017-distance',
    bridge: { titleHe: 'חודשים', subHe: 'מה שנשאר', ms: 3000 },
    anchorKey: '2017-nine',
    hudDateHe: '2017',
    playable: true,
  },
  /**
   * חלון — `DISTANCE` (K01–K03). נפתח רק למי שאמר לקובי ב-`P06` שהוא לוקח הפסקה.
   * `when` הוא המנגנון של `a3-hall`: החלון **אינו** בשרשרת של חיים אחרים, ו-`nextPlayable`
   * מדלג עליו בלי שום דבר על המסך.
   */
  {
    id: '2017-distance',
    stage: 'C',
    unit: 'K01–K03',
    titleHe: 'העשור שלא היית בו',
    when: ['life:distance'],
    dateHe: '2017–2018',
    year: 2017,
    weekday: 2,
    minute: MIN(18, 30),
    start: { location: 'kiosk', spawn: 'start' },
    next: '2018-return',
    bridge: { titleHe: 'שנים', subHe: 'במקום אחר', ms: 3000 },
    anchorKey: '2017-nine',
    hudDateHe: '2017',
    playable: true,
  },
  /**
   * 2018–2022 — R01–R05, בשני פרקים.
   *
   * `2018-return` נשען על **רגע בלי תאריך** — ראש הליגה הלאומית ועלייה, שלארכיון אין
   * את הערב שבו זה נחתם. `2021-losses` נשען על גמר הגביע של 2.6.2021, שורה שהייתה
   * בארכיון מלפני התסריט. `V4-BLOOMFIELD` ו-`V4-COVID` אינם עוגנים בכוונה.
   */
  {
    id: '2018-return',
    matchRitual: 'none',
    stage: 'C',
    unit: 'R01–R02',
    titleHe: 'עלינו, לא חזרנו אחורה',
    dateHe: '2018–2019',
    year: 2018,
    weekday: 4,
    minute: MIN(18, 0),
    start: { location: 'kiosk', spawn: 'start' },
    next: '2019-armchair',
    bridge: { titleHe: 'עונה', subHe: 'למעלה', ms: 3000 },
    anchorKey: '2018-promotion',
    hudDateHe: '2018',
    entry: adultEntry(2017, 2018),
    playable: true,
  },
  /**
   * חלון — `ARMCHAIR` (A01–A03). נפתח רק למי שבחר ב-`P06` להיות אוהד מזדמן — או
   * ב-`Z05`, מאוחר יותר, אבל אז החלון כבר מאחוריו בשרשרת. `A04` היא ענף של `Z07`
   * (`z-up`) שנפתח ב-`life:armchair` — וזה נקוב בראש `chapterWindows.ts`.
   */
  {
    id: '2019-armchair',
    stage: 'C',
    unit: 'A01–A03',
    titleHe: 'השלט אצל אבא',
    when: ['life:armchair'],
    dateHe: '2019',
    year: 2019,
    weekday: 6,
    minute: MIN(16, 30),
    start: { location: 'home', spawn: 'start' },
    next: '2021-losses',
    bridge: { titleHe: 'שנה', subHe: 'מהכורסה', ms: 3000 },
    anchorKey: '2018-promotion',
    hudDateHe: '2019',
    playable: true,
  },
  {
    id: '2021-losses',
    stage: 'C',
    unit: 'R03–R05',
    titleHe: 'הפסד שלא צריך שיעור',
    dateHe: '2020–2022',
    year: 2021,
    weekday: 2,
    minute: MIN(20, 30),
    start: { location: 'home', spawn: 'start' },
    next: '2021-promises',
    bridge: { titleHe: 'שנתיים', subHe: 'בפנים', ms: 3000 },
    anchorKey: '2021-cup',
    hudDateHe: '2021',
    entry: adultEntry(2018, 2021),
    playable: true,
  },
  /**
   * חיי בית, הפרק השלישי — L07–L09. **שני חיים עוברים בו ושניהם נגמרים בו:** עם
   * ילד (המשחק הראשון שלו, ההבטחה, והשבת שלו) ובלי (ההבטחה בלבד). `L08` היא
   * התשלום של `promise:householdEvening`, שנפתחה ב-`2013-household` ואיש לא סגר.
   */
  {
    id: '2021-promises',
    matchRitual: 'none',
    stage: 'C',
    unit: 'L07–L09',
    titleHe: 'אמרת שתחזור',
    dateHe: '2021',
    year: 2021,
    weekday: 5,
    minute: MIN(17, 0),
    start: { location: 'home', spawn: 'start' },
    next: '2021-suitcase',
    bridge: { titleHe: 'חודשים', subHe: 'הבטחות', ms: 3000 },
    anchorKey: '2021-cup',
    hudDateHe: 'סוף 2021',
    playable: true,
  },
  /**
   * חלון ABROAD · X01 (`chapterAbroad.ts`) — למי שלקח ב-2017 הפסקה ולא חזר ממנה
   * (`life:distance`). X02, X03 ו-X05 קורות בחו״ל ומחכות לציור `flatAway`.
   */
  {
    id: '2021-suitcase',
    stage: 'C',
    unit: 'X01',
    titleHe: 'מה נכנס למזוודה',
    when: ['life:distance'],
    dateHe: 'קיץ 2021',
    year: 2021,
    weekday: 4,
    minute: MIN(20, 0),
    start: { location: 'home', spawn: 'start' },
    next: '2023-tournament',
    bridge: { titleHe: 'מזוודה', subHe: 'אוגוסט', ms: 3000 },
    anchorKey: '2021-cup',
    hudDateHe: 'קיץ 2021',
    playable: true,
  },
  /**
   * 2023–2025 — Z01–Z07, בשלושה פרקים. **`2023-quiet` נשען על ירידה ולא על ערב**,
   * ולכן העוגן שלו הוא רגע בלי תאריך; `2025-eurocup` נשען על הערב שסגר את הסדרה.
   */
  {
    id: '2023-tournament',
    stage: 'C',
    unit: 'Z01–Z03',
    titleHe: 'הילדים על הקו',
    dateHe: '2023',
    year: 2023,
    weekday: 0,
    minute: MIN(17, 50),
    start: { location: 'pitch', spawn: 'start' },
    next: '2023-abroad',
    bridge: { titleHe: 'שנתיים', subHe: 'אותו צבע', ms: 3000 },
    anchorKey: '2023-derby',
    hudDateHe: 'יוני 2023',
    entry: adultEntry(2021, 2023),
    playable: true,
  },
  /**
   * X02–X03 (ו-Q05) — **הדירה שם**, מ-21.9.2026 (`flatAway`). ערב הדרבי של סדרת הגמר
   * (11.6.2023, `2023-derby`): קובי שואל בווידאו *"אצלכם כבר התחיל?"*, ושעה אחר כך אלכס
   * בדלת. רק למי שבאמת עבר (`life:abroad`, X01).
   */
  {
    id: '2023-abroad',
    stage: 'C',
    unit: 'X02–X03',
    titleHe: 'אצלכם כבר התחיל',
    when: ['life:abroad'],
    dateHe: 'יוני 2023',
    year: 2023,
    weekday: 0,
    minute: MIN(19, 40),
    start: { location: 'flat-abroad', spawn: 'start' },
    next: '2023-quiet',
    bridge: { titleHe: 'שם', subHe: 'דירה, ערב', ms: 3000 },
    anchorKey: '2023-derby',
    hudDateHe: 'יוני 2023',
    playable: true,
  },
  {
    id: '2023-quiet',
    stage: 'C',
    unit: 'Z04–Z05',
    titleHe: 'אין משימה לזה',
    dateHe: '2023–2024',
    year: 2023,
    weekday: 1,
    minute: MIN(21, 0),
    start: { location: 'home', spawn: 'start' },
    next: '2023-visit',
    bridge: { titleHe: 'חורף', subHe: 'בלי משימה', ms: 3000 },
    anchorKey: '2024-relegation',
    hudDateHe: '2023–2024',
    playable: true,
  },
  /** חלון ABROAD · X04 — יומיים בארץ, למי שעבר (`life:abroad`) */
  {
    id: '2023-visit',
    stage: 'C',
    unit: 'X04',
    titleHe: 'יש לך יומיים, לא עשור',
    when: ['life:abroad'],
    dateHe: '2023',
    year: 2023,
    weekday: 5,
    minute: MIN(12, 0),
    start: { location: 'kiosk', spawn: 'start' },
    next: '2024-terrace',
    bridge: { titleHe: 'ביקור', subHe: 'יומיים', ms: 3000 },
    anchorKey: '2024-relegation',
    hudDateHe: '2023',
    playable: true,
  },
  /** חלון CAREER · T03 — על הרחבה של בלומפילד המחודש */
  {
    id: '2024-terrace',
    stage: 'C',
    unit: 'T03',
    titleHe: 'הם מסתכלים אליך',
    when: ['own:route:ULTRAS:practice'],
    dateHe: '2024',
    year: 2024,
    weekday: 6,
    minute: MIN(18, 0),
    start: { location: 'bloomfield-outside', spawn: 'start' },
    next: '2024-lina',
    bridge: { titleHe: 'יציע', subHe: 'הם מסתכלים', ms: 3000 },
    anchorKey: '2024-relegation',
    hudDateHe: '2024',
    playable: true,
  },
  /** חלון INTERNATIONAL · I04 — לינה, ארבע-עשרה שנה אחרי, בטלפון */
  {
    id: '2024-lina',
    stage: 'C',
    unit: 'I04',
    titleHe: 'כשלא מסכימים',
    when: ['life:international', 'life:intl:met'],
    dateHe: '2024',
    year: 2024,
    weekday: 1,
    // 27.9.2026 — מוקדם בבוקר: הם נחתו בחמש, והמלון רק בשתיים (`chapterFriends.ts`, יפו)
    minute: MIN(6, 40),
    start: { location: 'home', spawn: 'start' },
    next: '2024-home',
    bridge: { titleHe: 'שיחה', subHe: 'מחו״ל', ms: 3000 },
    anchorKey: '2024-relegation',
    hudDateHe: '2024',
    playable: true,
  },
  /**
   * H24a–H24c · 2024 — **הפרק הראשי היחיד של השנה** (תנ"ך מהדורה 2, §12, §24). הכדורגל
   * נקנה והכדורסל עובר אולם, באותו חורף ובאותה קבוצת וואטסאפ. `chapter2024home.ts`.
   * המשחק הראשון בהיכל הגדול הוא נסיעה (`ride:menora-25`) ולא יום משחק שהולכים בו, ולכן
   * אין טקס ארון (`matchRitual: 'none'`).
   */
  {
    id: '2024-home',
    stage: 'C',
    unit: 'H24a–H24c',
    titleHe: 'איפה הבית?',
    matchRitual: 'none',
    dateHe: 'יולי 2024 – ינואר 2025',
    year: 2024,
    weekday: 0,
    minute: MIN(11, 0),
    start: { location: 'kiosk', spawn: 'start' },
    next: '2025-eurocup',
    bridge: { titleHe: 'ירדנו', subHe: 'ואז הופיע עוד בעלים', ms: 3200 },
    anchorKey: '2024-safra',
    hudDateHe: 'קיץ 2024',
    playable: true,
  },
  {
    id: '2025-eurocup',
    stage: 'C',
    unit: 'Z06–Z07',
    titleHe: 'מהאולם הקטן לאירופה',
    dateHe: 'אביב 2025',
    year: 2025,
    weekday: 5,
    minute: MIN(21, 20),
    start: { location: 'home', spawn: 'start' },
    next: '2025-interview',
    bridge: { titleHe: 'שנה', subHe: 'אירופה', ms: 3000 },
    anchorKey: '2025-eurocup',
    hudDateHe: 'אפריל 2025',
    entry: adultEntry(2023, 2025),
    playable: true,
  },
  /** חלון CAREER · J03 */
  {
    id: '2025-interview',
    stage: 'C',
    unit: 'J03',
    titleHe: 'פעם אחת שואלים אותך',
    when: ['own:route:JOURNALIST:apex'],
    dateHe: '2025',
    year: 2025,
    weekday: 3,
    minute: MIN(11, 0),
    start: { location: 'allenby', spawn: 'fromSouth' },
    next: '2025-owner',
    bridge: { titleHe: 'ראיון', subHe: 'פעם אחת', ms: 3000 },
    anchorKey: '2025-eurocup',
    hudDateHe: '2025',
    playable: true,
  },
  /**
   * חלון OWNER · O01–O05 (`chapterOwner.ts`) — למי שכבר שותף בעסק (`OWNER:practice`).
   * ענף בדיוני מוצהר; ההתחלה של הפרק היא הנקודה ההיסטורית שלפני הפיצול.
   */
  {
    id: '2025-owner',
    stage: 'C',
    unit: 'O01–O05',
    titleHe: 'המספר שלא כתוב על חולצה',
    when: ['own:route:OWNER:practice'],
    dateHe: 'קיץ 2025',
    year: 2025,
    weekday: 2,
    minute: MIN(18, 30),
    start: { location: 'office', spawn: 'start' },
    next: '2025-abroad',
    bridge: { titleHe: 'עסקה', subHe: 'ענף בדיוני', ms: 3000 },
    anchorKey: '2025-eurocup',
    hudDateHe: 'קיץ 2025',
    playable: true,
  },
  /**
   * X05 — *"הפעם אני מחכה לך"*, בדירה שם, לקראת 2026. ההזמנה להיפגש באירופה היא מה
   * ש-`F01` פותח כ-`reunion` (`life:finale:reunionOffered`).
   */
  {
    id: '2025-abroad',
    stage: 'C',
    unit: 'X05',
    titleHe: 'הפעם אני מחכה לך',
    when: ['life:abroad'],
    dateHe: 'סתיו 2025',
    year: 2025,
    weekday: 3,
    minute: MIN(21, 0),
    start: { location: 'flat-abroad', spawn: 'start' },
    next: '2026-plan',
    bridge: { titleHe: 'שם', subHe: 'לקראת 2026', ms: 3000 },
    anchorKey: '2025-eurocup',
    hudDateHe: 'סתיו 2025',
    playable: true,
  },
  /**
   * 2025–2026 — F00–F04, **סוף הציר הראשי**, בשני פרקים.
   *
   * `2026-plan` הוא הכסף והתוכנית, ולכן הוא נשען על העלייה של 2024/25 — מה שקרה
   * לפניו. `2026-finale` נשען על הערב עצמו: 7.5.2026 בבוטבגרד, שורה שנקראה משני
   * מקורות בלתי-תלויים. **התוצאה אינה תנאי לסיום** — היא כרטיס היסטורי, והסיום
   * האישי הוא שלוש הבחירות של F04.
   */
  {
    id: '2026-plan',
    stage: 'C',
    unit: 'F00–F01',
    titleHe: 'לא מבטיחים לפני שסוגרים',
    dateHe: '2025–2026',
    year: 2025,
    weekday: 3,
    minute: MIN(19, 15),
    start: { location: 'kiosk', spawn: 'start' },
    next: '2026-finale',
    bridge: { titleHe: 'חורף', subHe: 'תוכנית', ms: 3000 },
    anchorKey: '2025-promotion',
    hudDateHe: 'חורף 2026',
    playable: true,
  },
  {
    id: '2026-finale',
    stage: 'C',
    unit: 'F02–F04',
    titleHe: 'היום אתה אחריי',
    dateHe: '7 במאי 2026',
    year: 2026,
    weekday: 4,
    minute: MIN(6, 40),
    start: { location: 'bus-station', spawn: 'start' },
    next: null,
    bridge: { titleHe: 'אביב', subHe: 'בולגריה', ms: 3000 },
    anchorKey: '2026-botevgrad',
    hudDateHe: '7 במאי 2026',
    entry: adultEntry(2025, 2026),
    playable: true,
  },
]

export const CHAPTER: Record<string, ChapterDef> = Object.fromEntries(CHAPTERS.map((c) => [c.id, c]))

export function chapterFor(id: string): ChapterDef | null {
  return CHAPTER[id] ?? null
}

/**
 * פרק שאפשר לדלג עליו — a chapter that is only in this life if the life earned it.
 *
 * Stage A §7 is explicit that the Ussishkin branch is OPTIONAL and "opens only after
 * meaningful Efi engagement in A2", and that skipping it must cost something real. Until
 * 6.9.2026 it was an unconditional link in the chain: every player discovered the second
 * red house, so discovering it meant nothing and Efi's invitation was scenery.
 *
 * `when` is how a chapter says that. It is checked against the LIFE — the `life:` flags
 * that survive a year — because whether a six-year-old chose to stand with somebody two
 * autumns ago is exactly the kind of thing a chapter should be allowed to ask about.
 */
/**
 * של מי העוגן — the one chapter a shared anchor belongs to (21.9.2026).
 *
 * Six anchors are shared: `2000-cup` by the Double and the night after it, `2017-nine` by
 * `2017-after` and the DISTANCE window, `2021-cup` by the cup final and the FAMILY evening
 * after it, and so on. A presence is folded **last-write-wins** (`presence.recorded` in
 * `events.ts`), so the chapter AFTER the match used to overwrite how he was at the match:
 * a boy who heard the 2000 final on a radio was "inside" by the time `2000-bridge` closed,
 * because all three of its endings say `presence: 'inside'` about a night that was over.
 *
 * The owner is the chapter NAMED for the anchor when there is one (`1986`), otherwise the
 * earliest in the registry — the match comes before its aftermath. Stage A is left alone:
 * its six days all hang on `1986` and the Saturday settles it last by design.
 */
export function anchorOwner(anchorKey: string): string | null {
  if (CHAPTER[anchorKey]) return anchorKey
  let best: ChapterDef | null = null
  for (const def of CHAPTERS) if (def.anchorKey === anchorKey && (!best || def.year < best.year)) best = def
  return best?.id ?? null
}

/** the anchor key this chapter only borrows — its presence is somebody else's to record */
export function borrowedAnchorKey(chapter: string): string | null {
  const def = CHAPTER[chapter]
  if (!def || def.stage === 'A') return null
  return anchorOwner(def.anchorKey) === def.id ? null : def.anchorKey
}

export function chapterOpen(def: ChapterDef, flags: Record<string, boolean | string | number>): boolean {
  if (!def.playable) return false
  if (def.whenAny && def.whenAny.length > 0 && !def.whenAny.some((flag) => Boolean(flags[flag]))) return false
  if (!def.when) return true
  return def.when.every((flag) => Boolean(flags[flag]))
}

/** a chapter that only some lives have — `when` or `whenAny` */
export const isWindow = (def: ChapterDef): boolean => (def.when?.length ?? 0) > 0 || (def.whenAny?.length ?? 0) > 0

/** every flag a window asks for, one way or the other */
export const windowFlagsOf = (def: ChapterDef): readonly string[] => [...(def.when ?? []), ...(def.whenAny ?? [])]

/**
 * The next chapter that has rooms behind it AND is open to this life, or null when the
 * life as built is over. `flags` is optional so the callers that only need the shape of
 * the chain (the finale card, the tests) keep working; the runtime passes the real ones.
 */
export function nextPlayable(id: string, flags: Record<string, boolean | string | number> = {}): ChapterDef | null {
  let cursor = chapterFor(id)?.next ?? null
  while (cursor) {
    const def = CHAPTER[cursor]
    if (!def) return null
    if (chapterOpen(def, flags)) return def
    cursor = def.next
  }
  return null
}

/** Every chapter that can be played today, in order. */
export function playableChapters(): readonly ChapterDef[] {
  return CHAPTERS.filter((c) => c.playable)
}

/** The last playable chapter — the one whose ending is the coda of the game as built. */
export function lastPlayable(): ChapterDef {
  const all = playableChapters()
  return all[all.length - 1]!
}
