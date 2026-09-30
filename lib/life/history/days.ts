/**
 * שני הימים — 12.5.1990 and 2.5.1998 as event streams, with every claim attributed.
 *
 * Both days already exist in `content/manual/matches.json` as one row each with a note.
 * What they did not have is a chronology, and a chronology is what a mission about
 * INFORMATION needs: not "Yavne were ahead", but a list of things that happened at a
 * ground forty kilometres away, each with a source, each with a confidence, and each with
 * an honest `null` where the source names a scorer and not a clock.
 *
 * ── What is actually verified, and what is not ──────────────────────────────────────
 *
 * 12.5.1990, Bloomfield. הפועל תל אביב 6 — מכבי רמת עמידר 0 is verified twice over.
 * The SCORERS come from the Walla retrospective, which lists them without minutes and
 * without an order: ז'אנו (2), מאיה, שמואל, אבוקסיס, אלבז. Maor's technical audit of
 * 7.9.2026 gives a different six — Zano three times, and no Elbaz — in a specific order.
 * Nobody gets to be right here on my say-so. Both counts are recorded, the sixth goal
 * carries the conflict in `conflictNote`, and every one of the six is `speakable: false`
 * except the two the two sources agree on without qualification.
 *
 * 12.5.1990, Yavne. This is the ground the whole mission listens to, and the archive holds
 * NO score for it — `matches.json` keeps the row with null–null and confidence 1 for
 * exactly that reason. What Walla does support is the SHAPE: before the last round Hapoel
 * and Yavne were level on 52 points with the same goal difference, Yavne ahead on the
 * head-to-head, and at half-time the status quo held with Yavne going up. That shape is
 * what the director runs on. The four Yavne scorers in Maor's brief are recorded because
 * they are what the brief says, and are `speakable: false` because a brief is not a
 * newspaper.
 *
 * 2.5.1998. The pair of results is verified — Hapoel 1–0 at Bloomfield, Beit She'an 2–3
 * — and one minute in the whole day has a public source attached to it: Sport5's own
 * headline, twenty-four years on, says Pisont in the 93rd. Maor's audit says the 94th.
 * That is the single most consequential minute in the club's history and two sources
 * disagree about it by sixty seconds, so both are here and the game says neither: on the
 * terrace it is "the fourth minute of stoppage time", which is what it felt like and what
 * no source contradicts.
 *
 * Nothing in this file was invented. Where I had nothing, the field is `null` and the
 * confidence says so.
 */
import type { HistoryDay, HistoricalMatchEvent, HistorySource } from './types'

const WALLA: HistorySource = {
  id: 'walla-3356277',
  shortHe: 'וואלה ספורט, 12.5.2020',
  titleHe: 'וואלה ספורט — 30 שנה לסערת העלייה של הפועל תל אביב (12.5.2020)',
  url: 'https://sports.walla.co.il/item/3356277',
  kind: 'archive',
}
const SPORT5: HistorySource = {
  id: 'sport5-400958',
  shortHe: 'ערוץ הספורט',
  titleHe: 'ערוץ הספורט — 24 שנה למשחק השרוכים (פישונט 93׳)',
  url: 'https://www.sport5.co.il/articles.aspx?FolderID=64&docID=400958',
  kind: 'archive',
}
const WIKI_98: HistorySource = {
  id: 'wiki-liga-9798',
  shortHe: 'ויקיפדיה האנגלית — ליגה לאומית 1997/98',
  titleHe: '1997–98 Liga Leumit — Wikipedia (טבלה סופית: בית"ר 69, הפועל ת"א 68)',
  url: 'https://en.wikipedia.org/wiki/1997%E2%80%9398_Liga_Leumit',
  kind: 'archive',
}
/**
 * מסמך פנימי הוא לא מקור היסטורי — 7.9.2026, במילים של מאור עצמו.
 *
 * הוא נשאר רשום, כי הוא כן טוען טענות ואנחנו שומרים טענות. הוא פשוט מסומן `brief`, ובדיקה
 * בקובץ `tests/life-history.test.ts` אוסרת על אירוע להיות `speakable` בלי מקור `archive`
 * אחד לפחות. זאת ההוראה שלו, אכיפה.
 */
const AUDIT: HistorySource = {
  id: 'maor-audit-2026-09-07',
  shortHe: 'מסמך ביקורת פנימי, 7.9.2026',
  titleHe: 'צוות The Worker — מסמך ביקורת פנימי, 7.9.2026 (טענה פנימית, לא מקור היסטורי)',
  url: null,
  kind: 'brief',
}
const WIKI_ARTZIT: HistorySource = {
  id: 'wiki-artzit-8990',
  shortHe: 'ויקיפדיה האנגלית — ליגה ארצית 1989/90',
  titleHe: '1989–90 Liga Artzit — Wikipedia (טבלה סופית: הפועל ת"א 55 והפרש 25+, מכבי יבנה 55 והפרש 23+; עלו צפרירים חולון והפועל ת"א)',
  url: 'https://en.wikipedia.org/wiki/1989%E2%80%9390_Liga_Artzit',
  kind: 'archive',
}
const BALLERZ: HistorySource = {
  id: 'ballerz-laces-26',
  shortHe: 'Ballerz — 26 שנה למשחק השרוכים',
  titleHe: 'Ballerz — 26 שנה למשחק השרוכים ("שני מחזורים לסיום העונה"; אבוקסיס 61, חזן 86, פישונט 93)',
  url: 'https://ballerz.co.il/26-%D7%A9%D7%A0%D7%94-%D7%9C%D7%9E%D7%A9%D7%97%D7%A7-%D7%94%D7%A9%D7%A8%D7%95%D7%9B%D7%99%D7%9D/',
  kind: 'archive',
}
const MISSION01: HistorySource = {
  id: 'maor-brief-mission01',
  shortHe: 'תסריט משימה 01 (מסמך פנימי)',
  titleHe: 'צוות The Worker — תסריט משימה 01, רשת הטרנזיסטורים',
  url: null,
  kind: 'brief',
}

/** every event defaults to unspeakable; you have to earn a name on this terrace */
const ev = (row: Omit<HistoricalMatchEvent, 'speakable'> & { speakable?: boolean }): HistoricalMatchEvent => ({
  speakable: false,
  ...row,
})

// ------------------------------------------------------------------- 12.5.1990 ---

const BLOOMFIELD_90 = 'bloomfield'
const YAVNE_90 = 'yavne'
const M90_HOME = '1989/90|ליגה-ארצית|הפועל-תל-אביב|מכבי-רמת-עמידר|מחזור אחרון'
const M90_AWAY = '1989/90|ליגה-ארצית|מכבי-יבנה|בית"ר-נתניה|מחזור אחרון'

/**
 * ששת השערים — the count both sources agree on, the scorers they do not.
 *
 * `pacingMinute` is the old `GOAL_AT` table, kept to the game-minute so that a save made
 * before 7.9.2026 plays the chapter at exactly the rhythm it always had. It is a
 * directing decision and it is labelled as one; `minute` stays null on all six because
 * neither source clocks a single goal of the six.
 */
const GOALS_90: HistoricalMatchEvent[] = [
  {
    seq: 1,
    pacing: 12,
    who: "מוריס ז'אנו",
    score: '1–0',
    minute: 15,
    how: 'נגיחה. הדקה היחידה שוואלה נוקב לאורך כל המשחק.',
  },
  { seq: 2, pacing: 29, who: "מוריס ז'אנו", score: '2–0', minute: null, how: 'מפנדל.' },
  { seq: 3, pacing: 44, who: "מוריס ז'אנו", score: '3–0', minute: null, how: 'שלושער, מקרוב, מבישול של מספרת של אלי כהן.', assist: 'אלי כהן' },
  { seq: 4, pacing: 58, who: 'רפי שמואל', score: '4–0', minute: null, how: 'נגיחה, "בחלוף שבע דקות" מהשלישי, מבישול של ישראל מאיה.', assist: 'ישראל מאיה', display: 'שבע דקות אחרי השלישי' },
  { seq: 5, pacing: 71, who: 'ישראל מאיה', score: '5–0', minute: null, how: 'החמישי, "תוצרת מאיה".' },
  { seq: 6, pacing: 84, who: 'יוסי אבוקסיס', score: '6–0', minute: null, how: 'נגיחה בזמן הפציעות, לרשת של השוער גבי אלבז.', display: 'בזמן הפציעות' },
].map((row) =>
  ev({
    id: `1990-bloomfield-goal-${row.seq}`,
    matchId: M90_HOME,
    venueId: BLOOMFIELD_90,
    minute: row.minute ?? null,
    ...(row.display ? { displayMinute: row.display } : {}),
    sequence: row.seq,
    type: 'goal',
    teamSlug: 'הפועל-תל-אביב',
    personHe: row.who,
    ...(row.assist ? { assistHe: row.assist } : {}),
    scoreAfter: row.score,
    sourceIds: [WALLA.id],
    confidence: row.minute !== null ? 'verified' : 'high',
    conflictNote: `${row.how} וואלה מתאר את השער; מלבד ה-15 אין דקות בשום מקור. עד 7.9.2026 רשם הפרויקט "אלבז" ככובש השישי — קריאה מוטעית של "נגיחה לרשת של גבי אלבז", שהוא השוער שספג.`,
    speakable: true,
    pacingMinute: row.pacing,
  }),
)

/**
 * מה שכן מאומת ביבנה — the shape, not the score.
 *
 * Walla gives two facts about the parallel ground and the game runs on both: the two clubs
 * arrived level with Yavne ahead on the head-to-head, and at half-time the status quo held
 * and Yavne were the ones going up. Everything between those two facts is Maor's brief.
 */
const YAVNE_90_EVENTS: HistoricalMatchEvent[] = [
  ev({
    id: '1990-yavne-standing',
    matchId: M90_AWAY,
    venueId: YAVNE_90,
    minute: 0,
    sequence: 0,
    type: 'state',
    scoreAfter: '0–0',
    sourceIds: [WALLA.id],
    confidence: 'verified',
    speakable: true,
    pacingMinute: 0,
    lineHe: 'ביבנה עוד אין שערים.',
  }),
  ev({
    id: '1990-yavne-goal-1',
    matchId: M90_AWAY,
    venueId: YAVNE_90,
    minute: null,
    sequence: 1,
    type: 'goal',
    teamSlug: 'מכבי-יבנה',
    personHe: 'בני טבק',
    scoreAfter: '1–0',
    sourceIds: [AUDIT.id, MISSION01.id],
    confidence: 'disputed',
    conflictNote: 'הכובשים ביבנה מופיעים רק במסמכים הפנימיים. וואלה מאמת את קיום המשחק ואת מצב הטבלה, ולא את התוצאה.',
    pacingMinute: 21,
    lineHe: 'יבנה מובילה.',
  }),
  ev({
    id: '1990-yavne-half',
    matchId: M90_AWAY,
    venueId: YAVNE_90,
    minute: 45,
    sequence: 2,
    type: 'half_time',
    sourceIds: [WALLA.id],
    confidence: 'verified',
    speakable: true,
    pacingMinute: 45,
    lineHe: 'בהפסקה — הסטטוס־קוו נשמר, ויבנה עולה.',
  }),
  ev({
    id: '1990-yavne-goal-2',
    matchId: M90_AWAY,
    venueId: YAVNE_90,
    minute: null,
    sequence: 3,
    type: 'goal',
    teamSlug: 'מכבי-יבנה',
    personHe: 'מירו בן שמעון',
    scoreAfter: '2–0',
    sourceIds: [AUDIT.id],
    confidence: 'disputed',
    conflictNote: 'הכובש מופיע במסמכים הפנימיים בלבד ואינו מקור היסטורי. מה שכן מאומת הוא המרווח — ראו 1990-yavne-margin.',
    pacingMinute: 63,
    lineHe: 'יבנה מובילה, ובגדול.',
  }),
  ev({
    id: '1990-yavne-goal-3',
    matchId: M90_AWAY,
    venueId: YAVNE_90,
    minute: null,
    sequence: 4,
    type: 'goal',
    teamSlug: 'מכבי-יבנה',
    personHe: 'מנשה אלאווה',
    scoreAfter: '3–0',
    sourceIds: [AUDIT.id],
    confidence: 'disputed',
    conflictNote: 'הכובש מופיע במסמכים הפנימיים בלבד ואינו מקור היסטורי. מה שכן מאומת הוא המרווח — ראו 1990-yavne-margin.',
    pacingMinute: 70,
    lineHe: 'יבנה מובילה, ובגדול.',
  }),
  ev({
    id: '1990-yavne-pen-missed',
    matchId: M90_AWAY,
    venueId: YAVNE_90,
    minute: null,
    sequence: 5,
    type: 'penalty_missed',
    teamSlug: 'מכבי-יבנה',
    personHe: 'בני טבק',
    sourceIds: [AUDIT.id],
    confidence: 'disputed',
    conflictNote: 'הכובש מופיע במסמכים הפנימיים בלבד ואינו מקור היסטורי. מה שכן מאומת הוא המרווח — ראו 1990-yavne-margin.',
    pacingMinute: 78,
  }),
  ev({
    id: '1990-yavne-goal-4',
    matchId: M90_AWAY,
    venueId: YAVNE_90,
    minute: null,
    sequence: 6,
    type: 'goal',
    teamSlug: 'מכבי-יבנה',
    personHe: 'אשר חלפון',
    scoreAfter: '4–0',
    sourceIds: [AUDIT.id],
    confidence: 'disputed',
    conflictNote: 'הכובש ממסמך פנימי בלבד. שורת התוצאה בארכיון נשארת ריקה בכוונה; המרווח נגזר בנפרד.',
    pacingMinute: 86,
    lineHe: 'יבנה מובילה, ובגדול.',
  }),
  /**
   * מה שהארכיון כן יודע על יבנה — בלי שאף מקור אומר את זה במפורש.
   *
   * וואלה: לפני המחזור שתיהן על 52 נקודות עם הפרש שערים זהה (19+).
   * ויקיפדיה, טבלת 1989/90 בליגה הארצית: בסיום הפועל תל אביב 55 והפרש 25+, מכבי יבנה 55
   * והפרש 23+.
   *
   * 19+6=25 ✓ (השישייה בבלומפילד), ו-19+4=23 — כלומר **יבנה ניצחה בהפרש של ארבעה שערים**,
   * ושלוש הנקודות מאשרות ניצחון. זו נגזרת משני מקורות מאומתים ולא טענה חדשה; התוצאה
   * המדויקת (0:4? 1:5?) אינה נגזרת ולכן אינה נטענת. וזה גם כל מה שהמשחק צריך: המרווח.
   */
  ev({
    id: '1990-yavne-margin',
    matchId: M90_AWAY,
    venueId: YAVNE_90,
    minute: null,
    sequence: 7,
    type: 'state',
    sourceIds: [WALLA.id, WIKI_ARTZIT.id],
    confidence: 'high',
    conflictNote:
      'נגזר, לא נמצא: 52 נקודות והפרש 19+ לשתיהן לפני המחזור (וואלה) מול 55 והפרש 25+/23+ בסיום (ויקיפדיה) נותנים ליבנה ניצחון בהפרש ארבעה. התוצאה המדויקת אינה נגזרת ואינה נטענת.',
    speakable: true,
    pacingMinute: 87,
  }),
]

export const DAY_1990: HistoryDay = {
  id: '1990-05-12',
  dateHe: '12 במאי 1990',
  primaryVenueId: BLOOMFIELD_90,
  sources: [WALLA, WIKI_ARTZIT, AUDIT, MISSION01],
  silenceHe: 'הארכיון אינו מחזיק תוצאה למשחק יבנה, ואינו נוקב דקה לאף אחד מששת השערים בבלומפילד.',
  venues: [
    {
      venueId: BLOOMFIELD_90,
      matchId: M90_HOME,
      nameHe: 'בלומפילד',
      kickoffOffset: 0,
      finalHe: '6–0',
      round: { number: 30, ofTotal: 30, isFinal: true },
      stakeHe: 'המשחק שאתה בתוכו.',
      events: [
        ...GOALS_90,
        ev({
          id: '1990-bloomfield-full',
          matchId: M90_HOME,
          venueId: BLOOMFIELD_90,
          minute: 90,
          sequence: 7,
          type: 'full_time',
          scoreAfter: '6–0',
          sourceIds: [WALLA.id],
          confidence: 'verified',
          speakable: true,
          pacingMinute: 90,
        }),
      ],
    },
    {
      venueId: YAVNE_90,
      matchId: M90_AWAY,
      nameHe: 'יבנה',
      kickoffOffset: 0,
      finalHe: null,
      round: { number: 30, ofTotal: 30, isFinal: true },
      stakeHe: 'המשחק שמחליט אם המשחק שלך שווה משהו.',
      events: YAVNE_90_EVENTS,
    },
  ],
}

// -------------------------------------------------------------------- 2.5.1998 ---

const BLOOMFIELD_98 = 'bloomfield'
const BEITSHEAN_98 = 'beit-shean'
const M98_HOME = '1997/98|ליגת-העל|הפועל-תל-אביב|הפועל-פתח-תקווה|מחזור 29'
const M98_AWAY = '1997/98|ליגת-העל|הפועל-בית-שאן|בית"ר-ירושלים|מחזור 29 — המשחק המקביל'

export const DAY_1998: HistoryDay = {
  id: '1998-05-02',
  dateHe: '2 במאי 1998',
  primaryVenueId: BLOOMFIELD_98,
  sources: [SPORT5, WIKI_98, BALLERZ, AUDIT],
  silenceHe: 'שתי התוצאות מאומתות; מהמהלך עצמו רק דקת השער המכריע מופיעה במקור פומבי, ושני מקורות חלוקים עליה.',
  venues: [
    {
      venueId: BLOOMFIELD_98,
      matchId: M98_HOME,
      nameHe: 'בלומפילד',
      kickoffOffset: 0,
      finalHe: '1–0',
      round: { number: 29, ofTotal: 30, isFinal: false },
      stakeHe: 'אתם מנצחים. זאת האכזריות.',
      events: [
        ev({
          id: '1998-bloomfield-goal-1',
          matchId: M98_HOME,
          venueId: BLOOMFIELD_98,
          minute: null,
          sequence: 1,
          type: 'goal',
          teamSlug: 'הפועל-תל-אביב',
          personHe: 'כפיר אודי',
          scoreAfter: '1–0',
          sourceIds: [AUDIT.id],
          confidence: 'disputed',
          conflictNote: 'הכובש מופיע במסמך פנימי בלבד ואינו מקור היסטורי; ויקיפדיה מאמתת את התוצאה 1:0 ולא את הכובש, ואין דקה בשום מקור.',
          pacingMinute: 25,
        }),
        ev({
          id: '1998-bloomfield-full',
          matchId: M98_HOME,
          venueId: BLOOMFIELD_98,
          minute: 90,
          sequence: 2,
          type: 'full_time',
          scoreAfter: '1–0',
          sourceIds: [WIKI_98.id],
          confidence: 'verified',
          speakable: true,
          pacingMinute: 90,
          lineHe: 'שריקה. המשחק שלכם נגמר, ונגמר טוב.',
        }),
      ],
    },
    {
      venueId: BEITSHEAN_98,
      matchId: M98_AWAY,
      nameHe: 'קריית אליעזר', // the small speaker's ground, as the terrace called it
      round: { number: 29, ofTotal: 30, isFinal: false },
      /**
       * הם התחילו אחר כך — the reason the mission cannot end at its own final whistle.
       * The parallel ground kicked off later, so it is still playing when Bloomfield has
       * finished and is already celebrating. Fifteen minutes is the offset the chapter has
       * always played at (`FULL_98` is four minutes past our whistle); it is pacing, and
       * the archive does not hold kickoff times for either ground.
       */
      kickoffOffset: 15,
      finalHe: '2–3',
      stakeHe: 'המשחק ששולח את האליפות לירושלים בדקה התשעים ושלוש.',
      events: [
        ev({
          id: '1998-parallel-standing',
          matchId: M98_AWAY,
          venueId: BEITSHEAN_98,
          minute: 0,
          sequence: 0,
          type: 'state',
          scoreAfter: '0–0',
          sourceIds: [WIKI_98.id, SPORT5.id],
          confidence: 'verified',
          speakable: true,
          pacingMinute: 0,
          lineHe: 'שם עוד לא קרה כלום.',
        }),
        /**
         * מה שקרה בקריית אליעזר — לפי Ballerz, עם שמות ועם דקות.
         *
         * עד 7.9.2026 חמשת האירועים כאן היו "ממסמך הביקורת בלבד" ובלי אף דקה. מעבר מקורות
         * מצא תיאור מהלך מלא: שער פתיחה של בית שאן, השוואה של בית"ר בתוספת של המחצית
         * הראשונה, אבוקסיס מעונשין ב-61, חזן ב-86, ופישונט ב-93. שלוש הדקות האחרונות הן
         * דקות של מקור — לא שלנו.
         *
         * מה שהוסר: פנדל שהוחמץ בבית שאן. הוא הופיע רק במסמך פנימי, אף מקור לא נושא אותו,
         * ואירוע בלי ראיה לא נשאר בארכיון רק כי הוא דרמטי.
         */
        ev({
          id: '1998-parallel-goal-1',
          matchId: M98_AWAY,
          venueId: BEITSHEAN_98,
          minute: null,
          displayMinute: 'בפתיחה',
          sequence: 1,
          type: 'goal',
          teamSlug: 'הפועל-בית-שאן',
          personHe: "זלקו אצ'יץ'",
          scoreAfter: '1–0',
          sourceIds: [BALLERZ.id],
          confidence: 'high',
          conflictNote: 'Ballerz מתאר בעיטה מקו הרחבה לרשת העליונה בפתיחת המשחק, בלי דקה מדויקת.',
          speakable: true,
          pacingMinute: 20,
          lineHe: 'שם הם מפגרים.',
        }),
        ev({
          id: '1998-parallel-goal-2',
          matchId: M98_AWAY,
          venueId: BEITSHEAN_98,
          minute: null,
          displayMinute: 'בתוספת של המחצית הראשונה',
          sequence: 2,
          type: 'goal',
          teamSlug: 'בית"ר-ירושלים',
          personHe: 'סטפן שאלוי',
          assistHe: 'יוסי אבוקסיס',
          scoreAfter: '1–1',
          sourceIds: [BALLERZ.id],
          confidence: 'high',
          conflictNote: 'נגיחה מהרחקה שהגיעה לאבוקסיס. Ballerz ממקם אותה בתוספת של המחצית הראשונה ולא נוקב דקה.',
          speakable: true,
          pacingMinute: 45,
          lineHe: 'שם השוו.',
        }),
        ev({
          id: '1998-parallel-goal-3',
          matchId: M98_AWAY,
          venueId: BEITSHEAN_98,
          minute: 61,
          sequence: 3,
          type: 'goal',
          teamSlug: 'בית"ר-ירושלים',
          personHe: 'יוסי אבוקסיס',
          scoreAfter: '1–2',
          sourceIds: [BALLERZ.id],
          confidence: 'verified',
          speakable: true,
          pacingMinute: 62,
          lineHe: 'שם הם מובילים. מי אמר? ההוא אמר.',
        }),
        ev({
          id: '1998-parallel-goal-4',
          matchId: M98_AWAY,
          venueId: BEITSHEAN_98,
          minute: 86,
          sequence: 4,
          type: 'goal',
          teamSlug: 'הפועל-בית-שאן',
          personHe: 'אלמוג חזן',
          scoreAfter: '2–2',
          sourceIds: [BALLERZ.id],
          confidence: 'verified',
          speakable: true,
          pacingMinute: 86,
          lineHe: 'שוויון שם! שוויון!',
        }),
        /**
         * השער — עכשיו שני מקורות עצמאיים על אותה דקה.
         *
         * ערוץ הספורט נוקב 93 בכותרת שלו, ו-Ballerz נוקב 93 בגוף הטקסט. המסמך הפנימי נוקב
         * 94. שניים מול אחד, והשניים הם מקורות פומביים — לכן `verified`, והטענה השלישית
         * נשמרת. המשחק ממשיך לומר "תוספת הזמן" ולא מספר.
         */
        ev({
          id: '1998-parallel-goal-5',
          matchId: M98_AWAY,
          venueId: BEITSHEAN_98,
          minute: 93,
          displayMinute: 'תוספת הזמן',
          sequence: 5,
          type: 'goal',
          teamSlug: 'בית"ר-ירושלים',
          personHe: 'אישטוון פישונט',
          scoreAfter: '2–3',
          sourceIds: [SPORT5.id, BALLERZ.id],
          confidence: 'verified',
          conflictNote: 'ערוץ הספורט ו-Ballerz נוקבים 93; המסמך הפנימי נוקב 94. המשחק אומר "תוספת הזמן".',
          speakable: true,
          pacingMinute: 93,
          lineHe: 'שם — בתוספת הזמן.',
        }),
        ev({
          id: '1998-parallel-full',
          matchId: M98_AWAY,
          venueId: BEITSHEAN_98,
          minute: 95,
          sequence: 7,
          type: 'full_time',
          scoreAfter: '2–3',
          sourceIds: [SPORT5.id, WIKI_98.id, BALLERZ.id],
          confidence: 'verified',
          speakable: true,
          pacingMinute: 95,
          lineHe: 'נגמר שם.',
        }),
      ],
    },
  ],
}



export const dayFor = (id: string): HistoryDay | null => HISTORY_DAYS[id] ?? null

export const venueOf = (day: HistoryDay, venueId: string) => day.venues.find((v) => v.venueId === venueId) ?? null

/** every conflict on a day, for the debug panel and for the archive card */
export const conflictsOf = (day: HistoryDay) =>
  day.venues.flatMap((venue) =>
    venue.events
      .filter((e) => e.conflictNote)
      .map((e) => ({ id: e.id, venueId: venue.venueId, noteHe: e.conflictNote as string, sourceIds: e.sourceIds })),
  )

// ------------------------------------------------------- 19.5.1999 · הגמר ---
/**
 * גמר גביע המדינה, רמת גן. 1:1 אחרי הארכה, והגביע בפנדלים 3:1.
 *
 * **התאריך היה שגוי, והמקור שצוטט מעולם לא אמר אותו.** הקובץ הזה, `anchor-server.ts`,
 * `share.ts`, `chapters.ts` ועוד חמישה קבצים כתבו 26.5.1999 וציטטו לכך את ערך ויקיפדיה
 * האנגלי של הגביע — שלא נוקב בתאריך הגמר בכלל. ויקיפועל נוקבת, בשני דפים בלתי־תלויים:
 * דף המשחק אומר "תאריך 19.5.1999", ומפתח התאריכים של 19 במאי מחזיק את השורה. מפתח 26
 * במאי לא מחזיק שום דבר מ-1999. הכתובות עצמן בשורת המשחק בארכיון. 16.9.2026.
 *
 * ואותו מקור סוגר את השתיקה שהקובץ הזה הצהיר עליה. מי כבש, מתי ובאיזה סדר היה "טענה של
 * הפרק ולא של מקור" ולכן `disputed` ולכן אילם. עכשיו: ניר סביליה לבית"ר בדקה 6 אחרי
 * ריבאונד מבעיטה של עופר שטרית, ושלום תקוה לשוויון בדקה 13 — פס מדויק מחוץ לרחבה אחרי
 * שקורנפיין יצא. שניהם `verified`, שניהם `speakable`, ושניהם בדקה שמקור נוקב בה.
 *
 * הגמר הזה הוא הסיבה שהבמאי צריך שלב `extra` ושלב `penalties`: משחק גביע לא נגמר בתשעים,
 * ותוצאה של פנדלים היא הדבר היחיד ביום מבוים שהוא לא שעון אלא הכרעה.
 */
const CUP99 = 'ramat-gan-99'
const M99 = '1998/99|גביע-המדינה|בית"ר-ירושלים|הפועל-תל-אביב|גמר'
const WIKI_99: HistorySource = {
  id: 'wiki-cup-9899',
  shortHe: 'ויקיפדיה האנגלית — גביע המדינה 1998/99',
  titleHe: '1998–99 Israel State Cup — Wikipedia (1–1, 3–1 בפנדלים; 33,000; שופט קורן)',
  url: 'https://en.wikipedia.org/wiki/1998%E2%80%9399_Israel_State_Cup',
  kind: 'archive',
}
/**
 * `url` הוא null בכוונה, וזה הגבול ולא עצלנות.
 *
 * `tests/life.test.ts` אוסר על כל קובץ תחת `lib/life` להכיל את המחרוזת שמזהה את
 * האנציקלופדיה של האוהדים — "שכבת החיים קוראת היסטוריה רק דרך הארכיון". הכתובת עצמה
 * יושבת בשורת המשחק ב-`content/manual/matches.json`, שהוא הארכיון, ומגיעה לכאן דרך
 * `anchor-server.ts` כמו כל עובדה אחרת. השם נשאר, הקישור לא — וזה בדיוק מה שהכלל מבקש.
 */
const VIKIPOEL_99: HistorySource = {
  id: 'vikipoel-cup-9899',
  shortHe: 'ויקיפועל — גמר גביע 1998/99',
  titleHe: 'ויקיפועל — עונת 1998/99 (כדורגל) גביע המדינה גמר (19.5.1999; סביליה 6׳, תקוה 13׳; 40,000)',
  url: null,
  kind: 'archive',
}
/**
 * העמוד שמאור סרק — a printed page about this final, and the reason it is worth more than
 * a second encyclopaedia entry: it prints the line-ups, the referee, the bookings and the
 * shootout KICK BY KICK, under the headline "שלום ובטחון".
 *
 * **What it does not print, or what the scan does not show, is stated rather than filled
 * in.** The masthead is cut off the top of the scan and the date line with it, so the
 * paper is not named here and no date is claimed for it — rule 11, in the shape it takes
 * when the unreadable field is the one that would identify the document. The attendance
 * figure in its own footer is likewise below the resolution of this scan: the digits
 * `?3,000` are there and they are not readable, so the crowd conflict below is recorded
 * from the two sources that ARE legible and this page is not counted as a third.
 */
const PAGE_99: HistorySource = {
  id: 'scan-page-1999',
  shortHe: 'עמוד ספורט מודפס, 1999 (סריקה)',
  titleHe: 'עמוד ספורט מודפס, סריקה מהאוסף של צוות The Worker (16.9.2026) — "שלום ובטחון": הרכבים, שופט, כרטיסים ודו־קרב הפנדלים. שם העיתון והתאריך נחתכו מהסריקה ואינם נקבעים כאן.',
  url: null,
  kind: 'archive',
}
/**
 * שלושת החפצים — a trophy on its plinth, a clipping and two season books.
 *
 * Each one is its own source because each one is a different object, and lumping four
 * scans under one id would make the card cite a thing that does not exist. Each is also
 * SELF-IDENTIFYING: the plaque names the season, the clipping carries its own printed
 * caption, the books print the season, the ground and the price. That is the whole reason
 * these four were used and three other scans in the same delivery were not — a photograph
 * with nothing printed on it cannot be captioned without a claim, and this game does not
 * make claims (rule 11).
 */
const PHOTO_CUP99: HistorySource = {
  id: 'scan-cup-1999',
  shortHe: 'תצלום הגביע עם הלוחית (סריקה)',
  titleHe: 'תצלום הגביע, סריקה מהאוסף של צוות The Worker (16.9.2026) — הלוחית מודפסת על הכן.',
  url: null,
  kind: 'archive',
}
const CLIP_TIKVA: HistorySource = {
  id: 'scan-clip-tikva',
  shortHe: 'גזיר עיתון עם כיתוב מודפס (סריקה)',
  titleHe: 'גזיר עיתון עם כיתוב מודפס (צילום: יוסי רוט), סריקה מהאוסף של צוות The Worker (16.9.2026). שם העיתון והתאריך אינם בסריקה.',
  url: null,
  kind: 'archive',
}
const SEASON_TICKET_99: HistorySource = {
  id: 'scan-season-9899',
  shortHe: 'מנוי עונת 1998/99 (סריקה)',
  titleHe: 'מנוי עונת 1998/99, סריקה מהאוסף של צוות The Worker (16.9.2026).',
  url: null,
  kind: 'archive',
}
const SEASON_TICKET_00: HistorySource = {
  id: 'scan-season-9900',
  shortHe: 'מנוי עונת 99/00 (סריקה)',
  titleHe: 'מנוי עונת 99/00, סריקה מהאוסף של צוות The Worker (16.9.2026).',
  url: null,
  kind: 'archive',
}
const TICKET_00: HistorySource = {
  id: 'scan-ticket-2000-05-17',
  shortHe: 'כרטיס הגמר, 17.5.2000 (סריקה)',
  titleHe: 'כרטיס גמר גביע המדינה, 17.5.2000, אצטדיון רמת גן — סריקה מהאוסף של צוות The Worker (16.9.2026).',
  url: null,
  kind: 'archive',
}

export const DAY_1999: HistoryDay = {
  id: '1999-05-19',
  dateHe: '19 במאי 1999',
  primaryVenueId: CUP99,
  sources: [WIKI_99, VIKIPOEL_99, PAGE_99, PHOTO_CUP99, CLIP_TIKVA, SEASON_TICKET_99],
  silenceHe:
    'התוצאה, ההארכה, הפנדלים, שני השערים עם הדקות והכובשים, וכל שמונה הבעיטות — מאומתים. מספר הצופים נחלק: ויקיפדיה אומרת 33,000, ויקיפועל 40,000, והמספר בעמוד המודפס אינו קריא בסריקה.',
  facts: [
    {
      id: '1999-referee',
      labelHe: 'שופט',
      valueHe: 'דני קורן',
      sourceIds: [PAGE_99.id, WIKI_99.id],
      confidence: 'verified',
    },
    {
      id: '1999-crowd',
      labelHe: 'צופים',
      valueHe: '33,000 או 40,000',
      sourceIds: [WIKI_99.id, VIKIPOEL_99.id],
      confidence: 'high',
      conflictNote:
        'ויקיפדיה האנגלית אומרת 33,000; ויקיפועל אומרת 40,000. שני המספרים נשמרים כפי שהם — אין כאן ממוצע ואין הכרעה (כלל 60.3). העמוד המודפס נושא מספר משלו שאינו קריא בסריקה, ולכן אינו נספר כמקור שלישי.',
    },
    {
      id: '1999-booked',
      labelHe: 'כרטיסים צהובים',
      valueHe: 'אורד כחילה (הפועל); אמיר שלח, אילן בכר ותמאש שאנדור (בית"ר)',
      sourceIds: [PAGE_99.id],
      confidence: 'verified',
    },
    {
      id: '1999-gap',
      labelHe: 'הגביע הקודם',
      valueHe: 'שש־עשרה שנה לפני כן — 1982/83',
      sourceIds: [PAGE_99.id],
      confidence: 'verified',
    },
    /**
     * הספירה, ושתי הספירות — the one number on this card that two sources disagree about
     * without either of them being wrong.
     *
     * ויקיפועל calls 19.5.1999 the club's NINTH State Cup. `trophies.json` holds ten cup
     * rows at or before 1998/99, because it files the 1928, 1934, 1937, 1938, 1939 and
     * 1944 wins under the same competition — those were played before there was a state to
     * name the cup after. So the two counts differ by exactly one and the disagreement is
     * about what the competition IS, not about what the club won.
     *
     * The card shows both: the header prints the archive's count, which is COUNTED and not
     * typed (`countTitles`), and this row prints ויקיפועל's and says why they differ. Rule
     * 60.3 — a conflict is kept, and an average of nine and ten would be a number nobody
     * ever wrote down.
     */
    {
      id: '1999-cup-count',
      labelHe: 'גביע המדינה',
      valueHe: 'התשיעי לפי ויקיפועל; העשירי לפי ספירת הארכיון',
      sourceIds: [VIKIPOEL_99.id],
      confidence: 'high',
      conflictNote:
        'ויקיפועל סופרת את 1998/99 כגביע התשיעי. content/manual/trophies.json מחזיק עשר שורות גביע עד 1998/99 ועד בכלל, כי הזכיות של 1928–1944 רשומות באותה תחרות. ההפרש הוא הגדרה של התחרות, לא של הזכיות, והוא נשמר.',
    },
    {
      id: '1999-first-since',
      labelHe: 'התואר הקודם',
      valueHe: 'אליפות 1987/88 — התואר הראשון מאז',
      sourceIds: [VIKIPOEL_99.id],
      confidence: 'verified',
    },
  ],
  documents: [
    {
      art: 'docPage99',
      titleHe: '"שלום ובטחון"',
      printsHe:
        'אחרי 16 שנה זכתה הפועל ת"א בגביע המדינה, עם נצחון דרמטי 3:1 בפנדלים על בית"ר ירושלים (1:1 בהארכה). שלום תקוה סוף־סוף עשה זאת',
      sourceIds: [PAGE_99.id],
      lead: true,
    },
    {
      art: 'docCup99',
      titleHe: 'הגביע, עם הלוחית שלו',
      printsHe: 'ההתאחדות לכדורגל בישראל · הפועל תל-אביב · מחזיקת גביע המדינה 1998/99',
      sourceIds: [PHOTO_CUP99.id],
    },
    {
      art: 'docTikva99',
      titleHe: 'על הכתפיים, עם הגביע',
      printsHe: 'בחזרה לאושר. תקוה עם הגביע בשנה שעברה. העונה הפועל ת"א שואפת לדאבל (צילום: יוסי רוט)',
      sourceIds: [CLIP_TIKVA.id],
    },
    {
      art: 'docSeason9899',
      titleHe: 'המנוי של אותה עונה',
      printsHe: 'מנוי לעונת 1998/99 · הפועל "כתר" ת"א · איצטדיון בלומפילד ביפו · ילד · שורה 22, כסא 44 · שער 2 · 500 ש"ח',
      sourceIds: [SEASON_TICKET_99.id],
      keepsake: true,
    },
  ],
  films: [
    { id: 'film-99-goal', titleHe: 'השער של שלום תקוה', url: 'https://www.youtube.com/watch?v=HIycf4LjzKY', sourceIds: [VIKIPOEL_99.id] },
    { id: 'film-99-full', titleHe: 'התקציר המלא של הגמר', url: 'https://www.youtube.com/watch?v=0z6DE0LL-2g', sourceIds: [VIKIPOEL_99.id] },
  ],
  venues: [
    {
      venueId: CUP99,
      matchId: M99,
      nameHe: 'רמת גן',
      kickoffOffset: 0,
      finalHe: '1–1 (3–1 בפנדלים)',
      stakeHe: 'הגביע הראשון מאז הכתפיים.',
      shootout: {
        firstHe: 'בית"ר בעטה ראשונה בכל סיבוב.',
        resultHe: '3–1',
        sourceIds: [PAGE_99.id, VIKIPOEL_99.id],
        conflictNote:
          'ויקיפועל סופרת שלוש הצלות לאלימלך; דו־קרב הפנדלים המודפס מראה שתי הצלות שלו ובעיטה שלישית שפגעה במשקוף. שתי הספירות נשמרות, ואין כאן מספר אחד של הצלות.',
        kicks: [
          { order: 1, ours: false, takerHe: 'תמאש שאנדור', outcome: 'saved', keeperHe: 'שביט אלימלך', detailHe: 'בעט ימינה. אלימלך הדף.', afterHe: '0–0', sourceIds: [PAGE_99.id] },
          { order: 2, ours: true, takerHe: 'עידן טל', outcome: 'scored', detailHe: 'מתחת למשקוף ובפנים.', afterHe: '1–0', sourceIds: [PAGE_99.id] },
          { order: 3, ours: false, takerHe: 'אסי דומב', outcome: 'missed', detailHe: 'למשקוף והחוצה.', afterHe: '1–0', sourceIds: [PAGE_99.id] },
          { order: 4, ours: true, takerHe: 'סבסטיאן סימרוטיץ׳', outcome: 'scored', detailHe: 'לפינה הימנית הגבוהה.', afterHe: '2–0', sourceIds: [PAGE_99.id] },
          { order: 5, ours: false, takerHe: 'סטפן שאלוי', outcome: 'scored', detailHe: 'שטוח לפינה השמאלית.', afterHe: '2–1', sourceIds: [PAGE_99.id] },
          { order: 6, ours: true, takerHe: 'סלים טועמה', outcome: 'saved', keeperHe: 'איציק קורנפיין', detailHe: 'בעט למרכז השער. קורנפיין הדף.', afterHe: '2–1', sourceIds: [PAGE_99.id] },
          { order: 7, ours: false, takerHe: 'ניר סביליה', outcome: 'saved', keeperHe: 'שביט אלימלך', detailHe: 'בעט חלש שמאלה. אלימלך קלט.', afterHe: '2–1', sourceIds: [PAGE_99.id] },
          { order: 8, ours: true, takerHe: 'שמעון גרשון', outcome: 'scored', detailHe: 'כדור גבוה ובפנים — והגביע לאדומים.', afterHe: '3–1', sourceIds: [PAGE_99.id] },
        ],
      },
      events: [
        ev({
          id: '1999-goal-theirs',
          matchId: M99,
          venueId: CUP99,
          minute: 6,
          sequence: 1,
          type: 'goal',
          teamSlug: 'בית"ר-ירושלים',
          personHe: 'ניר סביליה',
          scoreAfter: '1–0',
          sourceIds: [VIKIPOEL_99.id, PAGE_99.id],
          confidence: 'verified',
          speakable: true,
          pacingMinute: 6,
          detailHe: 'ריבאונד. עופר שטרית בעט, שביט אלימלך הדף החוצה, וסביליה היה ראשון על הכדור.',
          lineHe: 'הצד השני של הקערה עולה באוויר. עוד לא התיישבנו.',
        }),
        ev({
          id: '1999-goal-ours',
          matchId: M99,
          venueId: CUP99,
          minute: 13,
          sequence: 2,
          type: 'goal',
          teamSlug: 'הפועל-תל-אביב',
          personHe: 'שלום תקוה',
          scoreAfter: '1–1',
          sourceIds: [VIKIPOEL_99.id, PAGE_99.id],
          confidence: 'verified',
          speakable: true,
          pacingMinute: 13,
          detailHe: 'פס נמוך ומדויק מחוץ לרחבה, אחרי שקורנפיין יצא מקו השער.',
          lineHe: 'השוויון. האצטדיון עולה באוויר ונשאר שם.',
        }),
        ev({
          id: '1999-full',
          matchId: M99,
          venueId: CUP99,
          minute: 90,
          sequence: 3,
          type: 'full_time',
          scoreAfter: '1–1',
          sourceIds: [WIKI_99.id, PAGE_99.id],
          confidence: 'verified',
          speakable: true,
          pacingMinute: 90,
          lineHe: 'הארכה.',
        }),
        ev({
          id: '1999-extra-end',
          matchId: M99,
          venueId: CUP99,
          minute: 120,
          sequence: 4,
          type: 'full_time',
          scoreAfter: '1–1',
          sourceIds: [WIKI_99.id, PAGE_99.id],
          confidence: 'verified',
          speakable: true,
          pacingMinute: 120,
          lineHe: 'ואז השופט מסתכל בשעון, ואתה יודע מה זה אומר.',
        }),
      ],
    },
  ],
}

// ------------------------------------------------- 13.5.2000 · האליפות ---
/**
 * בני יהודה 1:1 הפועל תל אביב בשכונת התקווה, מחזור 33 — והתיקו הספיק.
 *
 * זה מה שהופך את היום הזה לשונה משני הימים המקבילים: אין כאן מגרש שני. מה שמאומת הוא
 * שהתיקו הבטיח את האליפות, וזאת הצורה שהיום רץ עליה. **לא המצאתי משחק מקביל** רק כדי
 * שיהיה לבמאי שני שעונים.
 */
const HATIKVA = 'hatikva-2000'
const M00T = '1999/00|ליגת-העל|בני-יהודה|הפועל-תל-אביב|מחזור 33 — האליפות הוכרעה'
const WIKI_00L: HistorySource = {
  id: 'wiki-league-9900',
  shortHe: 'ויקיפדיה האנגלית — ליגת העל 1999/00',
  titleHe: '1999–2000 Israeli Premier League — Wikipedia (בני יהודה 1–1 הפועל ת"א; טבלה סופית: הפועל 85)',
  url: 'https://en.wikipedia.org/wiki/1999%E2%80%932000_Israeli_Premier_League',
  kind: 'archive',
}
/**
 * ושער אחד מהשניים יצא מהשתיקה — 16.9.2026.
 *
 * עד היום הזה שני השערים של 13.5.2000 היו `disputed` בלי כובש ובלי דקה. ויקיפועל נוקבת
 * באחד מהם: עומרי אפק, דקה 58. השני נשאר בדיוק כפי שהיה — בלי שם, בלי דקה — ו**הסדר בין
 * השניים עדיין אינו ממקור**, ולכן אין `scoreAfter` על אף אחד מהם. התוצאה 1:1 יושבת על
 * שריקת הסיום, שם היא מאומתת, ולא על שער שהייתה הופכת לטענה על סדר.
 */
const VIKIPOEL_00L: HistorySource = {
  id: 'vikipoel-league-9900',
  shortHe: 'ויקיפועל — 13.5.2000',
  titleHe: 'ויקיפועל — עונת 1999/00 (כדורגל), 13.5.2000 בשכונת התקווה: 1:1, עומרי אפק בדקה 58',
  url: null,
  kind: 'archive',
}

export const DAY_2000_TITLE: HistoryDay = {
  id: '2000-05-13',
  dateHe: '13 במאי 2000',
  primaryVenueId: HATIKVA,
  sources: [WIKI_00L, VIKIPOEL_00L, SEASON_TICKET_00],
  silenceHe:
    'התוצאה, הטבלה ושער אחד — עומרי אפק בדקה 58 — מאומתים. מי כבש את השער השני ומתי אינו ידוע, וגם לא הסדר בין השניים. אין מגרש מקביל שהארכיון מחזיק ליום הזה.',
  facts: [
    {
      id: '2000-title-enough-fact',
      labelHe: 'מה הספיק',
      valueHe: 'נקודה אחת',
      sourceIds: [WIKI_00L.id],
      confidence: 'verified',
    },
    {
      id: '2000-title-table',
      labelHe: 'הטבלה בסוף',
      valueHe: 'הפועל תל אביב, 85 נקודות',
      sourceIds: [WIKI_00L.id],
      confidence: 'verified',
    },
  ],
  documents: [
    {
      art: 'docSeason9900',
      titleHe: 'המנוי של אותה עונה',
      printsHe: 'מנוי אכי"א · הפועל "כתר" תל-אביב · עונת 99/00 · איצטדיון בלומפילד ביפו · שערים 4-5 · המחיר 410 ש"ח · סיבוב שלישי · מס׳ 905',
      sourceIds: [SEASON_TICKET_00.id],
      lead: true,
      keepsake: true,
    },
  ],
  venues: [
    {
      venueId: HATIKVA,
      matchId: M00T,
      nameHe: 'שכונת התקווה',
      kickoffOffset: 0,
      finalHe: '1–1',
      stakeHe: 'תיקו מספיק. זאת כל האריתמטיקה של היום.',
      events: [
        ev({
          id: '2000-title-enough',
          matchId: M00T,
          venueId: HATIKVA,
          minute: 0,
          sequence: 0,
          type: 'state',
          scoreAfter: '0–0',
          sourceIds: [WIKI_00L.id],
          confidence: 'verified',
          speakable: true,
          pacingMinute: 0,
          lineHe: 'נקודה אחת. זה כל מה שצריך היום.',
        }),
        ev({
          id: '2000-title-goal-1',
          matchId: M00T,
          venueId: HATIKVA,
          minute: null,
          sequence: 1,
          type: 'goal',
          sourceIds: [WIKI_00L.id],
          confidence: 'disputed',
          conflictNote: 'התוצאה 1:1 מאומתת; מי כבש את השער הזה ומתי — אין מקור. מקומו ברצף הוא בימוי.',
          pacingMinute: 38,
        }),
        ev({
          id: '2000-title-goal-2',
          matchId: M00T,
          venueId: HATIKVA,
          minute: 58,
          sequence: 2,
          type: 'goal',
          teamSlug: 'הפועל-תל-אביב',
          personHe: 'עומרי אפק',
          sourceIds: [VIKIPOEL_00L.id],
          confidence: 'high',
          conflictNote: 'הכובש והדקה מאומתים; הסדר מול השער השני אינו, ולכן אין כאן תוצאה רצה.',
          speakable: true,
          pacingMinute: 58,
        }),
        ev({
          id: '2000-title-full',
          matchId: M00T,
          venueId: HATIKVA,
          minute: 90,
          sequence: 3,
          type: 'full_time',
          scoreAfter: '1–1',
          sourceIds: [WIKI_00L.id],
          confidence: 'verified',
          speakable: true,
          pacingMinute: 90,
          lineHe: 'שריקה. וזהו — זה קרה.',
        }),
      ],
    },
  ],
}

// --------------------------------------------------- 17.5.2000 · הדאבל ---
/**
 * גמר הגביע, ארבעה ימים אחרי האליפות. 2:2 אחרי הארכה, 4:2 בפנדלים — הדאבל.
 *
 * **וכאן השתיקה נסגרה, ב-16.9.2026.** הקובץ הזה כתב ארבעה שערים `disputed` בלי כובש, בלי
 * דקה ובלי קבוצה, והערה שאומרת "הסדר כאן הוא בימוי". ויקיפועל נוקבת בארבעתם, ושני עמודים
 * ראשונים שמאור סרק — "הכדור הוא אדום" ו"דאבל טיים", שניהם מ-18.5.2000 — מאשרים את הצורה
 * באופן בלתי־תלוי: *"גמר דרמטי בו היא הובילה פעמיים רק כדי לראות את בית"ר חוזרת פעמיים
 * למשחק"*. זאת בדיוק סדרת השערים: שלנו, שלהם, שלנו, שלהם.
 *
 * מה שלא נסגר הוא שתי דקות. שני השערים הראשונים נמסרים כ-86/87 וכ-92/93, כלומר שני מקורות
 * שחלוקים בדקה אחת — אותה צורה בדיוק של פישונט ב-93׳/94׳ ב-2.5.1998. אז `minute` נשאר
 * `null` בשניהם, `displayMinute` נושא את שתי האפשרויות, וההפרש יושב ב-`conflictNote`.
 * שני השערים של ההארכה — 115 ו-119 — נמסרים בדקה אחת, ולכן הם `verified` עם דקה.
 */
const RG00 = 'ramat-gan-2000'
const M00C = '1999/00|גביע-המדינה|בית"ר-ירושלים|הפועל-תל-אביב|גמר'
const WIKI_00C: HistorySource = {
  id: 'wiki-cup-9900',
  shortHe: 'ויקיפדיה האנגלית — גביע המדינה 1999/00',
  titleHe: '1999–2000 Israel State Cup — Wikipedia (2–2, 4–2 בפנדלים; 40,000; שופט לוי)',
  url: 'https://en.wikipedia.org/wiki/1999%E2%80%932000_Israel_State_Cup',
  kind: 'archive',
}
const VIKIPOEL_00: HistorySource = {
  id: 'vikipoel-cup-9900',
  shortHe: 'ויקיפועל — גמר גביע 1999/00',
  titleHe:
    'ויקיפועל — עונת 1999/00 (כדורגל) גביע המדינה גמר (17.5.2000; רצ׳וניצה, פאצ׳ו, טועמה, פאצ׳ו; 4:2 בפנדלים; 40,000)',
  url: null,
  kind: 'archive',
}
/** העמוד הראשון של ידיעות אחרונות ספורט, 18.5.2000 — הכותרת והתאריך מודפסים על הסריקה עצמה. */
const YEDIOT_00: HistorySource = {
  id: 'scan-yediot-2000-05-18',
  shortHe: 'ידיעות אחרונות ספורט, 18.5.2000',
  titleHe: 'ידיעות אחרונות ספורט, 18.5.2000 — "הכדור הוא אדום" (צילום: יוסי רוט). סריקה מהאוסף של צוות The Worker.',
  url: null,
  kind: 'archive',
}
/** והעמוד הראשון של מעריב ספורט מאותו בוקר, עם המספרים בגוף הידיעה. */
const MAARIV_00: HistorySource = {
  id: 'scan-maariv-2000-05-18',
  shortHe: 'מעריב ספורט, 18.5.2000',
  titleHe: 'מעריב ספורט, יום ה׳ י״ג באייר תש״ס, 18.5.2000 — "דאבל טיים" (צילומים: עדי אביש). סריקה מהאוסף של צוות The Worker.',
  url: null,
  kind: 'archive',
}
/** התוכנייה הרשמית של הערב, שמדפיסה את המגרש, השעה ושני המשחקים. */
const PROGRAMME_00: HistorySource = {
  id: 'scan-programme-2000',
  shortHe: 'תוכניית הגמר, 17.5.2000 (סריקה)',
  titleHe: 'תוכנייה למזכרת, ההתאחדות לכדורגל בישראל — גמר גביע המדינה, 17.5.2000, אצטדיון רמת-גן. סריקה מהאוסף של צוות The Worker.',
  url: null,
  kind: 'archive',
}

export const DAY_2000_DOUBLE: HistoryDay = {
  id: '2000-05-17',
  dateHe: '17 במאי 2000',
  primaryVenueId: RG00,
  sources: [WIKI_00C, VIKIPOEL_00, YEDIOT_00, MAARIV_00, PROGRAMME_00, TICKET_00],
  silenceHe:
    'התוצאה, ההארכה, הפנדלים, ארבעת הכובשים וסדרם — מאומתים. שתי דקות אינן: השער הראשון נמסר כ-86 או 87, והשוויון הראשון כ-92 או 93. שתיהן נשמרות כפי שנמסרו.',
  facts: [
    { id: '2000-kickoff', labelHe: 'שעת פתיחה', valueHe: '20:15', sourceIds: [PROGRAMME_00.id], confidence: 'verified' },
    { id: '2000-referee', labelHe: 'שופט', valueHe: 'מאיר לוי', sourceIds: [VIKIPOEL_00.id, WIKI_00C.id], confidence: 'verified' },
    {
      id: '2000-crowd',
      labelHe: 'צופים',
      valueHe: 'למעלה מ-40 אלף',
      sourceIds: [MAARIV_00.id, WIKI_00C.id, VIKIPOEL_00.id],
      confidence: 'verified',
    },
    {
      id: '2000-sent-off',
      labelHe: 'הורחקו',
      valueHe: 'רענן דרעי (בית"ר), אייל בן עמי (הפועל), והמאמן אלי אוחנה (בית"ר)',
      sourceIds: [VIKIPOEL_00.id],
      confidence: 'verified',
    },
    {
      id: '2000-double',
      labelHe: 'הדאבל',
      valueHe: 'הראשון של הפועל תל אביב; השני של דרור קשטן',
      sourceIds: [YEDIOT_00.id],
      confidence: 'verified',
    },
    {
      id: '2000-cup-count',
      labelHe: 'גביע המדינה',
      valueHe: 'העשירי לפי ויקיפועל; האחד־עשר לפי ספירת הארכיון',
      sourceIds: [VIKIPOEL_00.id],
      confidence: 'high',
      conflictNote:
        'אותו הפרש של אחד כמו ב-1999, ומאותה סיבה: ויקיפועל אינה סופרת את הזכיות שלפני קום המדינה בתוך גביע המדינה, ו-trophies.json כן. שתי הספירות נשמרות.',
    },
    {
      id: '2000-lift',
      labelHe: 'מי הרים',
      valueHe: 'שמעון גרשון הזמין את שלום תקוה להרים איתו',
      sourceIds: [VIKIPOEL_00.id],
      confidence: 'verified',
    },
  ],
  documents: [
    {
      art: 'docTicket2000',
      titleHe: 'הכרטיס',
      printsHe: 'אצטדיון רמת גן · 17.5.2000 · אס"א ת"א – מכבי חיפה · הפועל "כתר" ת"א – בית"ר ירושלים · גמר גביע המדינה · מבוגר · יציע 5, שורה 54, כסא 18 · 70 ש"ח · שער 2',
      sourceIds: [TICKET_00.id],
      lead: true,
      keepsake: true,
    },
    {
      art: 'docRedBall2000',
      titleHe: '"הכדור הוא אדום"',
      printsHe:
        'העונה הנפלאה של הפועל ת"א הוכתרה אתמול עם גביע המדינה, לאחר גמר דרמטי בו היא הובילה פעמיים רק כדי לראות את בית"ר חוזרת פעמיים למשחק. זה נגמר בפנדלים, עם דאבל ראשון של הפועל ת"א ושני של דרור קשטן',
      sourceIds: [YEDIOT_00.id],
    },
    {
      art: 'docDouble2000',
      titleHe: '"דאבל טיים"',
      printsHe:
        'בסיומו של אחד ממשחקי הגמר הדרמטיים ביותר שראה הכדורגל הישראלי, השלימה אתמול הפועל ת"א את הזכייה בדאבל, עם ניצחון 4-2 על בית"ר ירושלים בבעיטות עונשין מ-11 מטרים, אחרי 2-2 בתום 120 דקות. למעלה מ-40 אלף צופים היו שותפים לחוויה בלתי נשכחת, שלא היו בה מפסידים, אבל היתה בה מנצחת אחת',
      sourceIds: [MAARIV_00.id],
    },
    {
      art: 'docProgramme2000',
      titleHe: 'התוכנייה',
      printsHe:
        'גמר גביע המדינה · תוכניה למזכרת · יום רביעי 17.5.2000 · איצטדיון רמת-גן · משחק נשים בשעה 17:00: אס"א תל אביב – מכבי חיפה · משחק גברים בשעה 20:15: בית"ר "סלקום" ירושלים – הפועל "כתר" תל אביב',
      sourceIds: [PROGRAMME_00.id],
    },
  ],
  films: [
    { id: 'film-00-full', titleHe: 'תקציר המשחק', url: 'https://www.youtube.com/watch?v=RO14bGFcD-Q', sourceIds: [VIKIPOEL_00.id] },
    { id: 'film-00-first', titleHe: 'השער הראשון', url: 'https://www.youtube.com/watch?v=36smQxcDzmQ', sourceIds: [VIKIPOEL_00.id] },
    { id: 'film-00-theirs', titleHe: 'שני השערים של בית"ר', url: 'https://www.youtube.com/watch?v=JXknFCs6nrg', sourceIds: [VIKIPOEL_00.id] },
    { id: 'film-00-pens', titleHe: 'הפנדלים', url: 'https://www.youtube.com/watch?v=RvyReKDwCC0', sourceIds: [VIKIPOEL_00.id] },
    { id: 'film-00-fans', titleHe: 'ראיון אוהדים אחרי המשחק', url: 'https://www.youtube.com/watch?v=3jT_ULOU09U', sourceIds: [VIKIPOEL_00.id] },
  ],
  venues: [
    {
      venueId: RG00,
      matchId: M00C,
      nameHe: 'רמת גן',
      kickoffOffset: 0,
      finalHe: '2–2 (4–2 בפנדלים)',
      stakeHe: 'ארבעה ימים אחרי האליפות. דאבל.',
      shootout: {
        firstHe: 'הפועל בעטה ראשונה.',
        resultHe: '4–2',
        sourceIds: [VIKIPOEL_00.id, MAARIV_00.id],
        kicks: [
          { order: 1, ours: true, takerHe: 'שמעון גרשון', outcome: 'scored', afterHe: '1–0', sourceIds: [VIKIPOEL_00.id] },
          { order: 2, ours: false, takerHe: 'יוסי אבוקסיס', outcome: 'scored', afterHe: '1–1', sourceIds: [VIKIPOEL_00.id] },
          { order: 3, ours: true, takerHe: 'דניס אונישנקו', outcome: 'scored', afterHe: '2–1', sourceIds: [VIKIPOEL_00.id] },
          { order: 4, ours: false, takerHe: 'גולן דרעי', outcome: 'saved', keeperHe: 'שביט אלימלך', afterHe: '2–1', sourceIds: [VIKIPOEL_00.id] },
          { order: 5, ours: true, takerHe: 'אילן בכר', outcome: 'scored', afterHe: '3–1', sourceIds: [VIKIPOEL_00.id] },
          { order: 6, ours: false, takerHe: 'תמאש שאנדור', outcome: 'scored', afterHe: '3–2', sourceIds: [VIKIPOEL_00.id] },
          { order: 7, ours: true, takerHe: 'דיאן רצ׳וניצה', outcome: 'scored', detailHe: 'והדאבל.', afterHe: '4–2', sourceIds: [VIKIPOEL_00.id] },
        ],
      },
      events: [
        ev({
          id: '2000-double-goal-1',
          matchId: M00C,
          venueId: RG00,
          minute: null,
          displayMinute: '86׳ או 87׳',
          sequence: 1,
          type: 'goal',
          teamSlug: 'הפועל-תל-אביב',
          personHe: 'דיאן רצ׳וניצה',
          assistHe: 'פיני בלילי',
          scoreAfter: '0–1',
          sourceIds: [VIKIPOEL_00.id, YEDIOT_00.id],
          confidence: 'high',
          conflictNote: 'הכובש והסדר מאומתים; הדקה נמסרת כ-86 בעמוד אחד וכ-87 באחר, ושתיהן נשמרות. אין כאן דקה אחת.',
          speakable: true,
          pacingMinute: 86,
          detailHe: 'כדור אלכסוני של דניס אונישנקו, בלילי שחרר קדימה, ורצ׳וניצה נכנס.',
        }),
        ev({
          id: '2000-double-goal-2',
          matchId: M00C,
          venueId: RG00,
          minute: null,
          displayMinute: '92׳ או 93׳',
          sequence: 2,
          type: 'goal',
          teamSlug: 'בית"ר-ירושלים',
          personHe: 'ויקטור פאצ׳ו',
          assistHe: 'אישטוון האמר',
          scoreAfter: '1–1',
          sourceIds: [VIKIPOEL_00.id, YEDIOT_00.id],
          confidence: 'high',
          conflictNote: 'הכובש והסדר מאומתים; הדקה נמסרת כ-92 בעמוד אחד וכ-93 באחר, ושתיהן נשמרות.',
          speakable: true,
          pacingMinute: 92,
          detailHe: 'נגיחה משלושה מטרים, ממסירה רוחבית של האמר, בתוספת הזמן של המחצית השנייה.',
        }),
        ev({
          id: '2000-double-full',
          matchId: M00C,
          venueId: RG00,
          minute: 90,
          sequence: 3,
          type: 'full_time',
          scoreAfter: '1–1',
          sourceIds: [WIKI_00C.id, MAARIV_00.id],
          confidence: 'verified',
          speakable: true,
          pacingMinute: 94,
          lineHe: 'הארכה. שוב.',
        }),
        ev({
          id: '2000-double-goal-3',
          matchId: M00C,
          venueId: RG00,
          minute: 115,
          sequence: 4,
          type: 'goal',
          teamSlug: 'הפועל-תל-אביב',
          personHe: 'סלים טועמה',
          assistHe: 'שלום תקוה',
          scoreAfter: '1–2',
          sourceIds: [VIKIPOEL_00.id, YEDIOT_00.id],
          confidence: 'verified',
          speakable: true,
          pacingMinute: 115,
          detailHe: 'כחילה החליק, תקוה שחרר את טועמה — המסירה האחרונה של תקוה לפני שפרש.',
        }),
        ev({
          id: '2000-double-goal-4',
          matchId: M00C,
          venueId: RG00,
          minute: 119,
          sequence: 5,
          type: 'goal',
          teamSlug: 'בית"ר-ירושלים',
          personHe: 'ויקטור פאצ׳ו',
          scoreAfter: '2–2',
          sourceIds: [VIKIPOEL_00.id, YEDIOT_00.id],
          confidence: 'verified',
          speakable: true,
          pacingMinute: 119,
          detailHe: 'נגיחה מתלייה, מהקרן האחרונה של ההארכה.',
          lineHe: 'שוויון. ברגע האחרון.',
        }),
        ev({
          id: '2000-double-extra-end',
          matchId: M00C,
          venueId: RG00,
          minute: 120,
          sequence: 6,
          type: 'full_time',
          scoreAfter: '2–2',
          sourceIds: [WIKI_00C.id, MAARIV_00.id],
          confidence: 'verified',
          speakable: true,
          pacingMinute: 120,
          lineHe: 'פנדלים. שוב. ארבעה ימים אחרי.',
        }),
      ],
    },
  ],
}

export const HISTORY_DAYS: Record<string, HistoryDay> = {
  '1990-05-12': DAY_1990,
  '1998-05-02': DAY_1998,
  '1999-05-19': DAY_1999,
  '2000-05-13': DAY_2000_TITLE,
  '2000-05-17': DAY_2000_DOUBLE,
}
