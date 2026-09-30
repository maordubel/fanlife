import { at } from '../clock'
import type { LifeState } from '../types'

import type { Beat } from './beats'
import type { EndingCard } from './chapter1986'
import type { ChoiceDef, Conversation } from './script'

/**
 * הקצב — נושא אחד שעובר שלושה פרקים: נוצר כאן, חוזר בקיוסק ב-1999, ונשמע מהיציע ב-2000.
 */
export const RHYTHM_SUBJECT = 'הקצב שנתתי למלמד'

/**
 * שלושת המספרים של החורף הזה — במקום אחד, כי שלושתם נקראים גם במקום אחר.
 *
 * `TAXI_AGOROT` ו-`FUEL_AGOROT` הם שני חובות שהפרק לוקח, ושניהם נפרעים בפרקים אחרים
 * (1999 · האולם, 1999 · הגמר). הסכום נכתב כאן פעם אחת כדי ששתי הקצוות של אותו חוב לא
 * יוכלו להיפרד — חוב שנלקח בשלושים ונפרע בעשרים הוא פנקס שמשקר בשקט.
 */
export const TAXI_AGOROT = 3000
export const FUEL_AGOROT = 3000
const ARMY_PROMISE_DONE = 'promise:army:kept'

/**
 * B6 · "אין מקום אחד לעמוד בו" · 1996 – אביב 1997 — the centre of the decade.
 *
 * Four days across a winter: the eve of conscription; a Saturday at the ground where the
 * crowd splits around two gates and a boy has to stand somewhere; a dawn at the central
 * bus station where the bus that would get him back to base on time is a bus he will not
 * board; and a Saturday in February when the club is broke, the hero leaves, the club is
 * sold, and Liron's old car goes to an away match with a curfew in the passenger seat.
 *
 * The oral history in the third day is Maor's own and its core is kept exactly: a real
 * deadline, a bus that would make it, the wrong supporters on it, a refusal, two hours
 * late. Everything around it is fiction and says so by being a choice. **No amounts, no
 * scores, no names of buyers or opponents in any line.** The archive holds the season.
 *
 * ── Director V3 (24.9.2026) — this file is the ONLY source of 1996 again ─────────────
 *
 * On 23.9.2026 a compact "Director's Cut" (`chapter1996director.ts`) replaced this unit in
 * `era.ts` and `dialogue.ts`, and the world kept pointing at conversations only this file
 * had — Kobi and Barry at gate seven, Asaf under the stand, the bus — so a player could
 * see the task, see the people, and have no way on. The Director file is gone; what it got
 * right is folded in here:
 *
 *   · the first Saturday in uniform is **23.11.1996** (16.11 was an away fixture);
 *   · **no passive bus wait** — the bus is at the platform the moment the day opens;
 *   · **gate five is a place you walk to**, not a button.
 *
 * And the V3 contract on top of it: SEE → MOVE → DO → DECIDE → CONSEQUENCE → words. The bag
 * is packed with the hands (three things in the living room), the terrace is chosen by
 * where you stand (Kobi, the fence between five and seven, or the stand itself), and the
 * bus is three things in the station — its door, the station door, the bench — and never
 * a menu of three sentences. No mandatory choice lives only inside a one-shot beat: close
 * any box, reload, walk away, and the world still holds a way to finish the day.
 */

export const A1 = 'life:army:d1'
export const A2 = 'life:army:d2'
export const A3 = 'life:army:d3'
export const A4 = 'life:army:d4'
export const A5 = 'life:army:d5'

export const BUS_DEADLINE = at(6, 30)
/**
 * The bus is already at the platform when the playable beat starts (Director V3 §8). The
 * deadline makes the pressure; waiting for a prop to spawn is not gameplay. The day opens
 * on this minute, and `a3-open` raises `a3:bus-here` on arrival.
 */
export const BUS_AT = at(5, 52)
/**
 * When the bus goes without him if he does nothing at all — not a timer to beat, the
 * consequence of standing still. About twenty seconds of a clock that stops for every box.
 */
export const BUS_GOES = BUS_AT + 14

/** the bag in the living room — three things done with the hands before Rachel's last word */
export const PACK_SOCKS = 'a1:pack:socks'
export const PACK_RADIO = 'a1:pack:radio'
export const PACK_BAG = 'a1:bag'

export const PORTRAIT_ARMY: Record<string, string> = {
  'פוגי': 'faceHero80',
  'קובי': 'faceKobi',
  'רחל': 'faceRachel90',
  'אופיר': 'faceOfir',
  'עמית': 'faceAmit',
  'רפי מהקיוסק': 'faceOldMan',
  'בארי': 'faceBarry',
  'אסף': 'faceAsaf',
  'מלמד': 'faceMelamed',
  'פרדי': 'faceFreddy',
  'לירון': 'faceLiron',
  'ירון': 'faceYaron',
  'המפקד': 'faceCommander',
  'נהג': 'faceDriver',
  'אוהד': 'faceSupporter',
  'סדרן': 'faceUsher',
  'קופאית': 'faceWoman',
  // (Director fold-in) the soldier of the street encounter (`96-soldier-cigarette`)
  'חייל': 'faceSupporterB',
  // שני הקבועים של אלנבי — שני השחקנים האלה מתויגים `era: '*'` ב-`scenes.ts`, כלומר הם
  // עומדים שם בכל פרק, ולכן כל מפה צריכה את הפלייטים שלהם.
  'המוכר': 'faceVendor',
  'הגבר': 'faceSupporterB',
}

export function objectiveArmy(state: LifeState, sceneId: string): string | null {
  if (state.chapterDone) return null
  if (state.flags[A5]) return state.flags['a5:done'] ? null : 'שתי נסיעות, ואפשר אחת. הקיוסק.'
  if (state.flags[A4]) {
    if (state.flags['a4:drive'] && !state.flags['a4:arrived']) return 'לירון מחכה באוטו.'
    return state.flags['a4:road'] ? null : 'שבת של חורף. הקיוסק, ואוטו של לירון.'
  }
  if (state.flags[A3]) return state.flags['a3:decided'] ? null : 'שש וחצי בבסיס. האוטובוס ברציף, הדלת פתוחה.'
  if (state.flags[A2]) {
    // (V3) whatever gate he stood at last year, the question is asked again in uniform —
    // the old guard `gate.identity !== 'gate7'` hid it from anybody who was not at seven
    if (state.flags['a2:chose']) return null
    return sceneId === 'gate5' ? 'שער 5. להישאר פה — או לחזור לקובי.' : 'שער 7 עם אבא, שער 5 מתחת ליציע — או הגדר באמצע.'
  }
  if (state.flags['a1:packed']) return null
  if (state.flags[PACK_BAG]) return 'התיק סגור. אמא מחכה.'
  return sceneId === 'home' ? 'לארוז: הגרביים, הרדיו — ולסגור את התיק.' : 'הביתה. אמא אורזת לך תיק.'
}

export const ENDINGS_ARMY: Record<string, EndingCard> = {
  home: {
    id: 'home',
    titleHe: 'החורף נגמר',
    bodyHe:
      'חזרת לבסיס בזמן, או לא. עמדת בשער 7, או בשער 5, או בפינה שאין לה שם. המועדון נאבק להישאר בליגה, עבר לידיים חדשות, ומספר שבע כבר לא עומד על הקו. בחוץ אביב. בפנים עוד לא.',
    memoryHe: 'טופס חופשה, מקופל. השעה שכתובה בו והשעה שהגעת בה הן לא אותה שעה.',
    memoryItem: 'folded-paper',
    // (Director fold-in) the winter he went back to base and stayed there: 'army', which
    // is what this card describes, not the radio of a match he was not at
    presence: 'army',
  },
  road: {
    id: 'road',
    titleHe: 'הדרך חזרה',
    bodyHe:
      'האוטו של לירון, בלילה, על כביש ארוך, עם רדיו שתופס תחנה כל שני קילומטר. דיברתם על שער 7 של פעם, כשידיעה עברה מאיש לאיש עם טרנזיסטור. עכשיו יש פייג׳ר. יודעים מהר ולא יודעים יותר טוב. הבסיס חיכה. או שלא.',
    memoryHe: 'קבלה מתחנת דלק. מאחור, בכתב של לירון: "שווה".',
    memoryItem: 'folded-paper',
    presence: 'inside',
  },
}

const DAY = (flag: string, year: number, weekday: number, minute: number, dateHe?: string) =>
  [{ t: 'day.entered', dayId: flag, year, weekday, minute, ...(dateHe ? { dateHe } : {}) } as const, { t: 'flag.raised', flag } as const]

export const BEATS_ARMY: Beat[] = [
  // ---------------------------------------------------------------- A1 · the eve ---
  {
    id: 'a1-open',
    at: 'street',
    trigger: 'enter',
    when: { none: [{ flag: A2 }, { flag: A3 }, { flag: A4 }, { flag: A1 }] },
    delayMs: 700,
    do: [
      { a: 'flag', flag: A1 },
      { a: 'lines', lines: [{ who: null, text: 'נובמבר. שמונה־עשרה. מחר בבוקר אוטובוס, ומחרתיים כבר יגידו לך מתי לקום.' }, { who: null, text: 'אותו רחוב, אותו ריח של שמן עמוק מהפינה. רק שהערב אתה סופר אותו במקום ללכת בו.' }, { who: null, text: 'בבית מחכה תיק פתוח. אמא כבר הכניסה לתוכו יותר גרביים ממה שאדם אחד יכול ללבוש.' }] },
    ],
  },
  /**
   * הבית — Rachel says what is missing the moment he walks in (Director fold-in: the eve
   * is lived at home, not described on the pavement). The packing itself is three things
   * in the room (`scenes.ts`, `pack-*`), and her `rachel-army` is also the actor standing
   * there — so closing this box costs nothing: she is still in the room, and says it again.
   */
  {
    id: 'a1-home',
    at: 'home',
    trigger: 'enter',
    when: { flag: A1, none: [{ flag: 'a1:packed' }, { flag: 'a1:told' }, { flag: A2 }] },
    delayMs: 350,
    // `a1:told` first: a box he closes is not replayed at him — she is standing right there
    do: [{ a: 'flag', flag: 'a1:told' }, { a: 'talk', conversation: 'rachel-army' }],
  },
  {
    id: 'a1-night',
    trigger: 'clock',
    // (V3) packing and the goodbye ARE the action — no clock to burn after them
    when: { all: [{ flag: A1 }, { flag: 'a1:packed' }], none: [{ flag: A2 }] },
    do: [
      { a: 'card', titleHe: '23 בנובמבר 1996', subHe: 'השבת הראשונה שאתה בא אליה במדים', ms: 2600 },
      { a: 'events', events: DAY(A2, 1996, 6, at(14, 30), '23 בנובמבר 1996') },
      { a: 'travel', to: 'bloomfield-outside', spawn: 'start' },
    ],
  },
  // ---------------------------------------------------------------- A2 · the gates ---
  /**
   * The arrival has no choices, on purpose (V3 §7): Kobi calls from seven, the drum is
   * heard from five, and control comes back. The decision is WHERE HE WALKS — to Kobi
   * (`kobi-gate7`), through the door under the stand (`gate5` → `asaf-gate5`), or to the
   * fence between them (`a2-between`). All three are standing in the world for as long as
   * `a2:chose` is down, so a closed box, a reload or a walk back is never a dead end.
   */
  {
    id: 'a2-open',
    at: 'bloomfield-outside',
    trigger: 'enter',
    when: { flag: A2, none: [{ flag: 'a2:seen' }] },
    delayMs: 800,
    do: [
      { a: 'flag', flag: 'a2:seen' },
      { a: 'talk', conversation: 'a2-arrive' },
    ],
  },
  /** under the stand, the first time — the room is described before anybody speaks */
  {
    id: 'a2-gate5',
    at: 'gate5',
    trigger: 'enter',
    when: { flag: A2, none: [{ flag: 'a2:gate5-seen' }, { flag: 'a2:chose' }] },
    delayMs: 350,
    do: [
      { a: 'flag', flag: 'a2:gate5-seen' },
      { a: 'sfx', key: 'darbuka-three-two', level: 0.5 },
      { a: 'lines', lines: [
        { who: null, text: 'מתחת ליציע יש פחות מקום ממה שדמיינת. בד מקופל, תוף, כמה אנשים שמכירים אחד את השני בשם.' },
        { who: 'אסף', text: 'אם באת רק לראות — תראה. אם אתה נשאר, תזיז את התיק מהמעבר.' },
        { who: 'מלמד', text: 'עזוב אותו. פעם ראשונה. גם אנחנו היינו פעם ראשונה.' },
      ] },
    ],
  },
  {
    id: 'a2-close',
    trigger: 'clock',
    when: { all: [{ flag: A2 }, { flag: 'a2:chose' }], none: [{ flag: A3 }] },
    do: [
      { a: 'card', titleHe: 'דצמבר 1996', subHe: 'התחנה המרכזית · לפני הזריחה', ms: 2400 },
      { a: 'events', events: DAY(A3, 1996, 0, BUS_AT, 'דצמבר 1996') },
      { a: 'travel', to: 'bus-station', spawn: 'start' },
    ],
  },
  // ---------------------------------------------------------------- A3 · the bus ---
  /**
   * The bus is THERE (V3 §8) — `a3:bus-here` is raised on arrival, first thing, so a
   * reload in the middle of the lines still finds the door open. From here the day is
   * three places in the station: the bus door (`a3-bus`), the door out of the platform
   * (`a3-walk-away`), and the bench (`a3-bench`); plus the timetable pole for the boy who
   * runs to find another line (`a3-timetable`).
   */
  {
    id: 'a3-open',
    at: 'bus-station',
    trigger: 'enter',
    when: { flag: A3, none: [{ flag: 'a3:seen' }] },
    delayMs: 450,
    do: [
      { a: 'flag', flag: 'a3:seen' },
      { a: 'flag', flag: 'a3:bus-here' },
      { a: 'sfx', key: 'bus-door', level: 0.7 },
      { a: 'lines', lines: [{ who: null, text: 'התחנה המרכזית. לפני הזריחה. אוויר של סיגריות ודלק ולחם. בשש וחצי אתה צריך להיות בשער של הבסיס.' }, { who: null, text: 'יש אוטובוס אחד שמגיע בזמן, והוא כבר ברציף. אגד רגיל, קו רגיל — רק שהצדדים שלו צבועים בסמלים של בית"ר ירושלים. בימי משחק הוא מסיע אותם. היום הוא מסיע את כולם.' }, { who: null, text: 'הדלת פתוחה. ההחלטה כבר מולך — לא בעוד רבע שעה.' }] },
    ],
  },
  /**
   * Old saves only. A save written before 24.9.2026 can stand on this platform without
   * `a3:bus-here`; new runs raise it on entry, so this is unreachable for them and it is
   * kept rather than deleted so that an old life is not stranded on an empty platform.
   */
  {
    id: 'a3-bus-arrives',
    trigger: 'clock',
    when: { flag: A3, afterMinute: BUS_AT, none: [{ flag: 'a3:decided' }, { flag: 'a3:bus-here' }] },
    do: [{ a: 'flag', flag: 'a3:bus-here' }, { a: 'sfx', key: 'bus-door', level: 0.7 }, { a: 'toast', text: 'הנהג מתניע. הדלת פתוחה.', tone: 'red' }],
  },
  /** standing still is a decision too — the same one the bench makes, only slower */
  {
    id: 'a3-bus-leaves',
    trigger: 'clock',
    when: { flag: A3, afterMinute: BUS_GOES, none: [{ flag: 'a3:decided' }] },
    do: [{ a: 'flag', flag: 'a3:decided' }, { a: 'flag', flag: 'a3:hesitated' }, { a: 'talk', conversation: 'a3-left-behind' }],
  },
  /**
   * The base asks, until he answers (V3 recovery rule). Every answer on the platform chains
   * into what the morning cost — the commander's "סיבה?", the seat at the back, the other
   * line — and a box can be walked out of (rule 42). Until 24.9.2026 walking out of that
   * one left `a3:decided` up, the platform empty and `a3:done` down for ever. Now the
   * morning comes back to him: a beat whose `when` still holds after it ran is armed again.
   */
  {
    id: 'a3-report',
    trigger: 'clock',
    when: { all: [{ flag: A3 }, { flag: 'a3:decided' }], none: [{ flag: 'a3:done' }] },
    delayMs: 600,
    do: [{ a: 'talk', conversation: 'a3-report' }],
  },
  {
    id: 'a3-to-a4',
    trigger: 'clock',
    when: { flag: 'a3:done', none: [{ flag: A4 }] },
    do: [
      { a: 'card', titleHe: 'פברואר', subHe: 'החורף של המועדון', ms: 2600, art: 'plate-1996-army' },
      { a: 'events', events: DAY(A4, 1997, 6, at(13, 0), 'חורף 1997') },
      { a: 'travel', to: 'kiosk', spawn: 'start' },
    ],
  },
  // ---------------------------------------------------------------- A4 · the winter ---
  {
    id: 'a4-open',
    at: 'kiosk',
    trigger: 'enter',
    /**
     * `none: A5` (25.9.2026): `a4:seen` is a day flag, and the fifth day clears it on the
     * way into this same kiosk — so February opened a second time on the afternoon of the
     * two journeys, with a second soldier's pay in the pocket and Freddy's whole winter
     * again (found by the V3 dialogue-streak count). The winter belongs to its own day.
     */
    when: { flag: A4, none: [{ flag: 'a4:seen' }, { flag: A5 }] },
    delayMs: 700,
    do: [
      { a: 'flag', flag: 'a4:seen' },
      { a: 'events', events: [{ t: 'money.changed', agorot: 6000, why: 'משכורת של חייל' }] },
      { a: 'talk', conversation: 'a4-winter' },
    ],
  },
  /**
   * The winter does not end on the road any more. Until 24.9.2026 `road-back` and Liron's
   * "stay" both closed the chapter on an ending card, and the fifth day — Maor's two
   * journeys — could not be reached by anybody. Now both lead here, and the chapter ends
   * where the two journeys are offered.
   */
  {
    id: 'a4-to-a5',
    trigger: 'clock',
    when: { flag: 'a4:done', none: [{ flag: A5 }] },
    do: [
      { a: 'card', titleHe: 'חורף 1997', subHe: 'אחרי הצבא ולפני האוטובוס', ms: 2400 },
      { a: 'events', events: DAY(A5, 1997, 4, at(14, 30), 'חורף 1997') },
      { a: 'travel', to: 'kiosk', spawn: 'start' },
    ],
  },

  /**
   * ---------------------------------------------------- A5 · שני מסעות ---
   *
   * שתי הנסיעות — the two journeys, and they are the user's, not the game's.
   *
   * Stage B §19 is the personal oral-history layer, and it lists two confirmed 1990s
   * memories with their details still pending: hitchhiking north to a Toto Cup match
   * because only about ten supporters went and no bus left, and a promised lift that was
   * forgotten, after which supporters in the stand collected taxi money so he reached the
   * match. Maor asked on 6.9.2026 that both be built now, WITHOUT dates.
   *
   * So neither states a date, an opponent, a competition round or a result. The Toto Cup
   * and the road north are his words; everything around them is the journey, the people and
   * the money, which is what §6 says supporter culture actually is — "seats, calls, coins,
   * and a noticed absence".
   *
   * They are also a choice and not a checklist. One winter afternoon, one wallet, one
   * curfew: taking one is giving up the other, which is §11 — no route attends everything
   * without paying time, trust, money or a relationship.
   */
  {
    id: 'a5-open',
    at: 'kiosk',
    trigger: 'enter',
    when: { flag: A5, none: [{ flag: 'a5:seen' }] },
    delayMs: 700,
    do: [
      { a: 'flag', flag: 'a5:seen' },
      { a: 'lines', lines: [
        { who: null, text: 'אחרי הצבא ולפני האוטובוס. שעתיים בכיס, ארבעים שקל, ושתי שיחות שקורות באותו רגע ליד הדלפק.' },
      ] },
      // Rafi is also standing at the counter (`rafi-a5`): closing this box loses nothing
      { a: 'talk', conversation: 'a5-kiosk' },
    ],
  },
  /**
   * *"לא אעשה שטויות."* — ומה שקורה אם באמת לא.
   *
   * ההבטחה נאמרה בערב האחרון בבית ונבדקת לאורך כל החורף, ולכן היא לא יכולה להיסגר בענף
   * אחד: היא נסגרת כשהחורף נגמר. הביט הזה רץ אחרי שהיום האחרון נסגר, ורק אם שני הדברים
   * שהיא הייתה עליהם לא קרו — לא נסיעה בלי חופשה (`life:awol`), ולא שקר למפקד
   * (`life:lied:army`). אין לו שורה ואין לו טוסט: פנקס אינו הודעה.
   */
  {
    id: 'a5-promise-kept',
    trigger: 'clock',
    when: {
      all: [{ flag: 'a5:done' }, { flag: 'promise:rachel-army' }],
      none: [{ flag: 'life:awol' }, { flag: 'life:lied:army' }, { flag: ARMY_PROMISE_DONE }],
    },
    do: [
      { a: 'flag', flag: ARMY_PROMISE_DONE },
      {
        a: 'derive',
        events: (state) => [
          {
            t: 'proof.recorded',
            proof: {
              kind: 'promise_kept',
              proofId: `promise_kept:${state.chapter}:army`,
              chapter: state.chapter,
              year: state.year,
              subjectHe: 'ההבטחה לאמא לפני הגיוס',
              noteHe: 'חורף שלם. בלי נסיעה בלי חופשה, ובלי לשקר למפקד.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'a5-night',
    trigger: 'clock',
    waitingHe: 'ממתין: מישהו יחליט משהו',
    when: { flag: A5, afterMinute: at(21, 30), none: [{ flag: 'a5:done' }] },
    do: [
      { a: 'flag', flag: 'a5:done' },
      { a: 'lines', lines: [{ who: null, text: 'בסוף לא נסעת לשום מקום. בבוקר, בבסיס, שאלו איך היה, ואמרת "לא הלכתי", וזה נשמע כמו משהו אחר ממה שהתכוונת.' }] },
      { a: 'ending', id: 'home' },
    ],
  },

]

/**
 * הערב האחרון בבית, וחמש שנים אחרי הערב ההוא באוסישקין.
 *
 * הבחירה השלישית קיימת רק למי שרחל **זוכרת** שחזר אחרי השעה (`relationshipMemory`,
 * ולא דגל — זה דבר שאדם זוכר עליך). זה מה ש-`ACH_REPAIR` חיכה לו: הפרה נרשמה
 * ב-1991 כראיה, וכאן אפשר לחזור אליה. **התיקון לא מוחק את התקרית** — שתי הראיות
 * נושאות את אותו נושא ויושבות בפנקס זו ליד זו, וזה בדיוק מה שהפרס של ההישג מתאר.
 *
 * (24.9.2026) One list for both states of the closed bag, so the two cannot drift.
 */
const RACHEL_ARMY_CHOICES: ChoiceDef[] = [
  { id: 'repair', text: '"אמא. הערב ההוא באוסישקין, כשחזרתי אחרי השעה."', when: { relationshipMemory: { who: 'rachel', eventId: 'came-home-late-1991' } }, hidden: true, then: [{ e: 'goto', node: 'rachel-army-curfew' }] },
  { id: 'promise', text: '"לא אעשה שטויות."', then: [{ e: 'flag', flag: 'a1:packed' }, { e: 'flag', flag: 'promise:rachel-army' }, { e: 'rel', who: 'rachel', axis: 'trust', delta: 3 }] },
  { id: 'honest', text: '"אני לא מבטיח."', then: [{ e: 'flag', flag: 'a1:packed' }, { e: 'rel', who: 'rachel', axis: 'trust', delta: -1 }, { e: 'personality', key: 'independence', delta: 2 }, { e: 'toast', text: 'היא לא כעסה. היא ידעה.', tone: 'plain' }] },
]

/**
 * מתחת ליציע — the four answers to Asaf and Melamed, one list for both ways of meeting them.
 */
const ASAF_GATE5_CHOICES: ChoiceDef[] = [
  { id: 'join', text: '"אני איתכם."', then: [{ e: 'flag', flag: 'a2:chose' }, { e: 'gate', to: 'gate5', reason: 'friends' }, { e: 'rel', who: 'asaf', axis: 'trust', delta: 3 }, { e: 'rel', who: 'kobi', axis: 'tension', delta: 5 }, { e: 'redheart', key: 'terraceCulture', delta: 5 }, { e: 'remember', who: 'asaf', eventId: 'joined-gate5-1996', significance: 'major' }, { e: 'goto', node: 'a2-after' }] },
  /**
   * *"אתה לא יודע עוד מה עשית."* — והשורה הזאת הייתה נכונה גם על הפנקס.
   *
   * חייל בן שמונה־עשרה עונה למלמד שלוש-הפסקה-שתיים, מלמד מנגן את זה שוב, וזהו:
   * דבר קטן שנעשה מתחת ליציע ואי אפשר לדעת מה יהיה איתו. זו **יצירה**, וזה בדיוק
   * מה ש-`creation_proof` אמור לסמן — לא הרגע שבו מישהו שר אותה, אלא הרגע שבו
   * היא נוצרה. מה שקורה לה אחר כך הוא שאלה אחרת, והיא נשאלת בקיוסק ב-1999
   * וברמת גן ב-2000.
   */
  { id: 'rhythm', text: 'לענות למלמד: "ככה." (הראשון)', when: { notFlag: 'life:melamed:rhythm' }, hidden: true, then: [{ e: 'sfx', key: 'darbuka-three-two', level: 0.8 }, { e: 'flag', flag: 'life:melamed:rhythm' }, { e: 'rel', who: 'melamed', axis: 'bond', delta: 4 }, { e: 'redheart', key: 'terraceCulture', delta: 2 }, { e: 'proof', kind: 'creation_proof', proofId: 'creation_proof:{chapter}:rhythm', subjectHe: RHYTHM_SUBJECT, noteHe: 'שלוש, הפסקה, שתיים. מתחת ליציע, על דרבוקה של מישהו אחר.' }, { e: 'skill', skill: 'creativity', delta: 3, why: 'נתן למלמד קצב' }, { e: 'toast', text: 'מלמד ניגן את זה שוב. ושוב. אתה לא יודע עוד מה עשית.', tone: 'plain' }] },
  { id: 'back', text: '"אני חוזר לאבא."', then: [{ e: 'flag', flag: 'a2:chose' }, { e: 'gate', to: 'gate7', reason: 'family' }, { e: 'rel', who: 'asaf', axis: 'distance', delta: 3 }, { e: 'goto', node: 'a2-after' }] },
  { id: 'neither', text: 'ללכת. לא לפה ולא לשם.', then: [{ e: 'flag', flag: 'a2:chose' }, { e: 'gate', to: 'outside', reason: 'conflict' }, { e: 'wellbeing', key: 'loneliness', delta: 6 }, { e: 'goto', node: 'a2-after' }] },
]

/** לעלות — the effects the "board" button always carried, on the bus door now */
const A3_BOARD: ChoiceDef['then'] = [{ e: 'flag', flag: 'a3:decided' }, { e: 'flag', flag: 'life:bus:boarded' }, { e: 'wellbeing', key: 'regret', delta: 8 }, { e: 'redheart', key: 'loyaltyReturn', delta: -3 }, { e: 'personality', key: 'responsibility', delta: 2 }, { e: 'goto', node: 'a3-boarded' }]
/** לסרב — the oral history's own answer, on the station door */
const A3_REFUSE: ChoiceDef['then'] = [{ e: 'sfx', key: 'bus-door', level: 0.6, delayMs: 900 }, { e: 'consequence', id: 'a3:refused', text: 'האוטובוס יצא. בלעדיך.', laterText: 'שעתיים איחור. זה יירשם.', afterMinutes: 30 }, { e: 'plate', art: 'armyRoom', titleHe: 'הבסיס', subHe: 'שעתיים אחרי השעה', ms: 2600 }, { e: 'flag', flag: 'a3:decided' }, { e: 'flag', flag: 'life:bus:refused' }, { e: 'redheart', key: 'loyaltyReturn', delta: 6 }, { e: 'personality', key: 'stubbornness', delta: 4 }, { e: 'goto', node: 'a3-refused' }]

export const CONVERSATIONS_ARMY: Conversation[] = [
  /**
   * ------------------------------------------- 1996/97 · שבעת הסימנים ---
   *
   * מה שרואים כשמועדון בצרות — the crisis as things in rooms, not as a conversation.
   *
   * Stage B §7 B6 lists seven concrete signs and asks that the club's near-death be a
   * LIVED event: delayed pay rumours, missing supplies, a closed office window, figures in
   * a newspaper, an overheard creditor, uncertainty about next season's tickets, and one
   * person doing two jobs. Until 6.9.2026 all seven were one kiosk conversation in which
   * Freddy explained the situation — which is the unit's declared centre delivered as a
   * briefing.
   *
   * None of these seven states a fact. Every one of them is a thing a nineteen-year-old
   * standing in his own neighbourhood in the winter of 1997 could see with his eyes: a
   * shutter, a shelf, a column of numbers he does not read, two men outside an office who
   * stop talking when he passes. What they add up to is the player's to add up. The
   * archive holds the sale (`ANCHOR_SPECS['1997-sale']`) and the archive is what says it.
   */
  {
    id: 'sign-shelf',
    nameHe: null,
    branches: [
      {
        when: { flag: 'saw:shelf' },
        lines: [{ who: null, text: 'המדף עדיין חצי ריק.' }],
      },
      {
        lines: [
          { who: null, text: 'המדף מאחורי רפי חצי ריק. לא חסר משהו אחד — חסרה שורה שלמה.' },
          { who: 'רפי מהקיוסק', text: 'לא הביאו השבוע. וגם לא בשבוע שעבר. אני לא שואל למה, הם לא עונים.' },
        ],
        then: [{ e: 'flag', flag: 'saw:shelf' }, { e: 'institution', key: 'footballOwnershipTrust', delta: -2 }],
      },
    ],
  },
  /**
   * המדבקה של 96 — the last one, and nobody sells it.
   *
   * Number 231, Shalom Tikva, out of the album nobody in this neighbourhood finished.
   * Rafi has had it in the till since the boy was collecting, and he gives it away in the
   * year the boy stopped — which is what happens to the last sticker of every album.
   * It closes its own page on its own, and there is nothing to complete after it.
   */
  {
    id: 'sign-till',
    nameHe: 'רפי מהקיוסק',
    branches: [
      {
        when: { hasSticker: 'tikva' },
        lines: [{ who: 'רפי מהקיוסק', text: 'שמת אותה באלבום? יופי. עכשיו זה כבר לא שלי.' }],
      },
      {
        lines: [
          { who: null, text: 'רפי פותח את הקופה ומזיז את המגש. מתחת למגש, בין שטרות ישנים, מדבקה אחת.' },
          { who: 'רפי מהקיוסק', text: 'זאת נשארה לי משנה שעברה. מאתיים שלושים ואחת. אף אחד לא ביקש.' },
          { who: 'רפי מהקיוסק', text: 'קח. אתה היחיד פה שעוד סופר.' },
        ],
        then: [
          { e: 'sticker', id: 'tikva' },
          { e: 'toast', text: 'שלום תקוה, 231.', tone: 'red' },
          { e: 'bond', who: 'shopkeeper', delta: 4 },
          { e: 'redheart', key: 'historyMemory', delta: 3 },
        ],
      },
    ],
  },
  {
    id: 'sign-paper',
    nameHe: null,
    branches: [
      {
        when: { flag: 'saw:figures' },
        lines: [{ who: null, text: 'אותו עמוד. אותם מספרים.' }],
      },
      {
        lines: [
          { who: null, text: 'העיתון פתוח על הדלפק בעמוד שאף אחד לא קורא — טור של מספרים, וכמה מהם בסוגריים.' },
          { who: null, text: 'אתה לא יודע מה זה סוגריים במספר. אתה יודע שאף אחד לא שם אותם שם סתם.' },
        ],
        then: [
          { e: 'flag', flag: 'saw:figures' },
          { e: 'institution', key: 'legalUnderstanding', delta: 2 },
          { e: 'redheart', key: 'historyMemory', delta: 2 },
        ],
      },
    ],
  },
  {
    id: 'sign-window',
    nameHe: null,
    branches: [
      {
        when: { flag: 'saw:window' },
        lines: [{ who: null, text: 'התריס עדיין למטה.' }],
      },
      {
        lines: [
          { who: null, text: 'החלון של המשרד סגור בתריס פח, ועליו דף שנתלה במסקינטייפ ונקרע בפינה.' },
          { who: null, text: 'מתחת לדף מישהו כתב בעט משהו קצר, ואז מחק. את המחיקה רואים יותר טוב מהמילה.' },
        ],
        then: [{ e: 'flag', flag: 'saw:window' }, { e: 'institution', key: 'footballOwnershipTrust', delta: -3 }],
      },
    ],
  },
  {
    id: 'sign-tickets',
    nameHe: 'קופאית',
    branches: [
      {
        when: { flag: 'saw:tickets' },
        lines: [{ who: 'קופאית', text: 'עוד לא. אמרתי לך, עוד לא.' }],
      },
      {
        lines: [
          { who: null, text: 'בקופה יש תור של ארבעה. השלט על הזכוכית הוא של העונה שעברה.' },
          { who: 'קופאית', text: 'מנויים לעונה הבאה? עוד לא פתחנו. כשיהיה ברור — יהיה.' },
        ],
        choices: [
          {
            id: 'ask',
            text: '"ברור לגבי מה?"',
            then: [
              { e: 'flag', flag: 'saw:tickets' },
              { e: 'institution', key: 'legalUnderstanding', delta: 2 },
              { e: 'toast', text: 'היא הסתכלה עליך שנייה ואמרה "אתה בן כמה?" ואז חייכה ולא ענתה.', tone: 'plain' },
            ],
          },
          { id: 'go', text: 'לא לשאול.', then: [{ e: 'flag', flag: 'saw:tickets' }] },
        ],
      },
    ],
  },
  {
    id: 'sign-two-jobs',
    nameHe: 'סדרן',
    branches: [
      {
        when: { flag: 'saw:twojobs' },
        lines: [{ who: 'סדרן', text: 'מה, עוד לא הלכת? יאללה, יש לי עוד ערימה.' }],
      },
      {
        lines: [
          { who: null, text: 'הסדרן שמכיר אותך בשם עומד היום עם ערימת דפים ביד ומוכר אותם. את החולצה של הסדרנים הוא עוד לובש.' },
          { who: 'סדרן', text: 'גם וגם. לא הוסיפו לי, הורידו למישהו אחר.' },
        ],
        then: [
          { e: 'flag', flag: 'saw:twojobs' },
          { e: 'redheart', key: 'community', delta: 3 },
          { e: 'institution', key: 'footballOwnershipTrust', delta: -2 },
        ],
      },
    ],
  },
  {
    id: 'sign-creditor',
    nameHe: null,
    branches: [
      {
        when: { flag: 'saw:creditor' },
        lines: [{ who: null, text: 'הם כבר לא שם.' }],
      },
      {
        lines: [
          { who: null, text: 'שני גברים בחליפות עומדים ליד המשרד. אחד מחזיק תיק, השני מחזיק סיגריה שהוא לא מעשן.' },
          { who: null, text: '"...בסוף החודש," אמר הראשון, ואז ראה אותך והפסיק.' },
          { who: null, text: 'עברת לידם לאט יותר משהיית צריך, וזה לא עזר.' },
        ],
        then: [
          { e: 'flag', flag: 'saw:creditor' },
          { e: 'institution', key: 'footballOwnershipTrust', delta: -4 },
          { e: 'wellbeing', key: 'stress', delta: 3 },
        ],
      },
    ],
  },
  // ================================================================== A1 ==
  /**
   * רחל — the last evening, in three states: she tells him what is missing; the bag is
   * closed and she has one thing left to say; it is all said. The promise is asked AFTER
   * the bag is shut (V3 §7): the packing is the action, her question is its payoff, and
   * what she says first depends on what he put in it.
   */
  {
    id: 'rachel-army',
    nameHe: 'רחל',
    branches: [
      // any later day of the winter: he is home on leave, and the bag is long packed
      { when: { flag: A2 }, lines: [{ who: 'רחל', text: 'באת? תאכל משהו. ואת המדים — לכביסה, לא על הכיסא.' }] },
      { when: { flag: 'a1:packed' }, lines: [{ who: 'רחל', text: 'ארזת? יופי. תאכל. לא, לא "אחר כך". עכשיו.' }] },
      {
        when: { all: [{ flag: PACK_BAG }, { flag: 'a1:took:radio' }] },
        lines: [
          { who: 'רחל', text: 'לקחת את הרדיו הקטן. חשבתי שתיקח. (היא לא אומרת את זה כמו שבח.)' },
          { who: 'רחל', text: 'ותשמע. שם, בבסיס, כשיהיה משחק בשבת — לא לעשות שטויות. שומע? הצבא זה לא שער 7.' },
        ],
        choices: RACHEL_ARMY_CHOICES,
      },
      {
        when: { flag: PACK_BAG },
        lines: [
          { who: 'רחל', text: 'השארת לו את הרדיו. הוא לא יגיד לך תודה, אבל הוא ישים לב.' },
          { who: 'רחל', text: 'ותשמע. שם, בבסיס, כשיהיה משחק בשבת — לא לעשות שטויות. שומע? הצבא זה לא שער 7.' },
        ],
        choices: RACHEL_ARMY_CHOICES,
      },
      {
        lines: [
          { who: 'רחל', text: 'שמתי לך גרביים. שמתי לך עוד גרביים. אמרו לי שאף פעם אין מספיק גרביים.' },
          { who: 'רחל', text: 'הזוגות האחרונים על השולחן. התיק ליד החדר שלך. מה שאתה רוצה לקחת משלך — תכניס בעצמך, ותסגור אותו. אני לא סוגרת לך תיק לצבא.' },
        ],
        then: [{ e: 'flag', flag: 'a1:told' }],
      },
    ],
  },
  /** the socks on the coffee table — a thing taken, not a line agreed to */
  {
    id: 'pack-socks',
    nameHe: null,
    branches: [
      { when: { flag: PACK_SOCKS }, lines: [{ who: null, text: 'השולחן ריק. רק הסימן העגול של הכוס של אבא.' }] },
      {
        lines: [{ who: null, text: 'שלושה זוגות על השולחן, מקופלים כמו שרק היא מקפלת — אחד בתוך השני, כמו כדור. הכנסת אותם לכיס הצד של התיק.' }],
        then: [{ e: 'flag', flag: PACK_SOCKS }, { e: 'rel', who: 'rachel', axis: 'bond', delta: 1 }],
      },
    ],
  },
  /**
   * the transistor on the sideboard — the only thing in the room that is a choice. It is
   * Kobi's, it is how a Saturday reached this flat for twenty years, and a soldier with a
   * radio in his bag is a soldier who will hear the score on a base. Taking it and leaving
   * it both cost something, and Rachel notices which.
   */
  {
    id: 'pack-radio',
    nameHe: null,
    branches: [
      { when: { flag: PACK_RADIO }, lines: [{ who: null, text: 'השידה. המקום של הרדיו, או הרדיו עצמו.' }] },
      {
        lines: [{ who: null, text: 'הטרנזיסטור על השידה. הכפתור של התחנות שחוק במקום של הספורט. אבא מקשיב בו לכל שבת שהוא לא במגרש.' }],
        choices: [
          { id: 'take', text: 'להכניס אותו לתיק.', then: [{ e: 'flag', flag: PACK_RADIO }, { e: 'flag', flag: 'a1:took:radio' }, { e: 'redheart', key: 'footballLove', delta: 2 }, { e: 'rel', who: 'kobi', axis: 'tension', delta: 1 }, { e: 'toast', text: 'הרדיו בתיק. בשבת, בבסיס, תשמע.', tone: 'plain' }] },
          { id: 'leave', text: 'להשאיר אותו לאבא.', then: [{ e: 'flag', flag: PACK_RADIO }, { e: 'rel', who: 'kobi', axis: 'bond', delta: 2 }, { e: 'toast', text: 'הרדיו נשאר על השידה.', tone: 'plain' }] },
        ],
      },
    ],
  },
  /** the bag by the bedroom door — it closes only on what is in it */
  {
    id: 'pack-bag',
    nameHe: null,
    branches: [
      { when: { flag: PACK_BAG }, lines: [{ who: null, text: 'התיק סגור. כבד יותר ממה שהוא נראה.' }] },
      {
        when: { all: [{ flag: PACK_SOCKS }, { flag: PACK_RADIO }] },
        lines: [{ who: null, text: 'הרוכסן נתקע באמצע, על הגרביים, ואז נסגר. תיק צבאי אחד, עם השם שלך בטוש על הבד.' }],
        then: [{ e: 'flag', flag: PACK_BAG }, { e: 'personality', key: 'responsibility', delta: 1 }],
      },
      {
        when: { flag: PACK_SOCKS },
        lines: [{ who: null, text: 'התיק עוד פתוח. חסר בו משהו משלך — הרדיו על השידה, או ההחלטה להשאיר אותו.' }],
      },
      { lines: [{ who: null, text: 'התיק פתוח ליד הדלת לחדר שלך. הגרביים של אמא עוד על השולחן.' }] },
    ],
  },
  {
    /**
     * *"ראיתי מה השעה."* — חמש שנים, ומשפט אחד שלא נאמר מאז.
     *
     * היא לא מוחלת ולא מרימה את הקול: היא אומרת שזכרה, ושהיא שמחה ששאלת. הענף משלם
     * אמון ומוריד מתח — ולא מאפס אותו — ואז חוזר לאותן שתי תשובות על ערב המחר, כי הפרק
     * לא זז מהמקום שבו הוא עומד: תיק על הרצפה וטרמפ בשש בבוקר.
     */
    id: 'rachel-army-curfew',
    nameHe: 'רחל',
    branches: [
      {
        lines: [
          { who: 'רחל', text: '(לא מרימה את הראש מהגרביים.) אה. זה.' },
          { who: 'פוגי', text: 'ידעתי מה השעה. נשארתי בכל זאת.' },
          { who: 'רחל', text: 'ידעתי שידעת. זה מה שהיה קשה, לא השעה.' },
          { who: null, text: 'היא קיפלה את הזוג האחרון והניחה אותו על התיק.' },
          { who: 'רחל', text: 'טוב שאמרת את זה עכשיו ולא אז. אז לא היית מתכוון.' },
        ],
        then: [
          { e: 'rel', who: 'rachel', axis: 'trust', delta: 6 },
          { e: 'rel', who: 'rachel', axis: 'tension', delta: -5 },
          { e: 'proof', kind: 'repair_completed', proofId: 'repair_completed:{chapter}:curfew', subjectHe: 'השעה שאמא אמרה', noteHe: 'חמש שנים אחרי, בערב האחרון בבית.' },
          { e: 'remember', who: 'rachel', eventId: 'came-back-to-1991', significance: 'major' },
          { e: 'personality', key: 'honesty', delta: 2 },
        ],
        choices: [
          { id: 'promise', text: '"לא אעשה שטויות."', then: [{ e: 'flag', flag: 'a1:packed' }, { e: 'flag', flag: 'promise:rachel-army' }, { e: 'rel', who: 'rachel', axis: 'trust', delta: 3 }] },
          { id: 'honest', text: '"אני לא מבטיח."', then: [{ e: 'flag', flag: 'a1:packed' }, { e: 'rel', who: 'rachel', axis: 'trust', delta: -1 }, { e: 'personality', key: 'independence', delta: 2 }, { e: 'toast', text: 'היא לא כעסה. היא ידעה.', tone: 'plain' }] },
        ],
      },
    ],
  },
  {
    id: 'ofir-army',
    nameHe: 'אופיר',
    branches: [
      {
        lines: [
          { who: 'אופיר', text: 'מחר, אה. תשמע, יש בשער משהו חדש. חבר\'ה צעירים, מהצד השני של היציע. שער 5. שרים אחרת. עומדים אחרת.' },
          { who: 'אופיר', text: 'אבא שלך לא אוהב את זה. בארי לא אוהב את זה. אני? אני אוהב את מה שעושה רעש.' },
        ],
        then: [{ e: 'flag', flag: 'knows:gate5' }, { e: 'rel', who: 'ofir', axis: 'familiarity', delta: 2 }],
      },
    ],
  },
  {
    id: 'kobi-army',
    nameHe: 'קובי',
    branches: [
      {
        lines: [{ who: 'קובי', text: 'בשבת אני בשער 7. אם תצא — תדע איפה אני. אני לא זז משם. לא זזתי עשרים שנה.' }],
        then: [{ e: 'rel', who: 'kobi', axis: 'sharedHistory', delta: 2 }],
      },
    ],
  },
  // ================================================================== A2 ==
  {
    id: 'a2-arrive',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'בלומפילד בשבת, במדים. הסדרן הסתכל על המדים ולא על הכרטיס.' },
          { who: null, text: 'מבחוץ שומעים שני קולות. מימין, שער 7: שתי מילים חוזרות שאתה יודע מגיל שמונה, איטיות, של אנשים ששרים אותן עשרים שנה. משמאל, מתחת ליציע, תוף.' },
          { who: 'קובי', text: 'פוגי! פה!' },
          { who: null, text: 'ומהצד השני, מישהו שאתה לא מכיר: "חייל! בוא תראה משהו."' },
        ],
      },
    ],
  },
  {
    id: 'kobi-gate7',
    nameHe: 'קובי',
    branches: [
      { when: { flag: 'a2:chose', gateIs: 'gate7' }, lines: [{ who: 'קובי', text: 'פה. איפה שתמיד.' }, { who: null, text: 'הוא לא שאל למה. הוא לא היה צריך.' }] },
      { when: { flag: 'a2:chose', gateIs: 'gate5' }, lines: [{ who: 'קובי', text: 'לך. לך לשם. אני לא אחזיק אותך.' }, { who: null, text: 'הוא הסתכל למגרש כשאמר את זה. לא עליך.' }] },
      { when: { flag: 'a2:chose' }, lines: [{ who: 'קובי', text: 'אתה לא פה ולא שם. תחליט מתישהו. זה לא מקום, זה בין.' }] },
      {
        lines: [
          { who: 'קובי', text: 'שמעת אותם? מתחת ליציע? עשרים שנה שרים פה אותו שיר, ופתאום צריך תוף.' },
          { who: 'בארי', text: 'תעזוב, קובי. גם אנחנו היינו פעם רעש.' },
          { who: 'קובי', text: 'היינו רעש בשער 7. לא מתחתיו.' },
        ],
        choices: [
          { id: 'stay', text: 'להישאר פה. ליד אבא.', then: [{ e: 'flag', flag: 'a2:chose' }, { e: 'gate', to: 'gate7', reason: 'family' }, { e: 'rel', who: 'kobi', axis: 'bond', delta: 4 }, { e: 'redheart', key: 'familyTradition', delta: 4 }, { e: 'remember', who: 'kobi', eventId: 'stayed-gate7-1996', significance: 'major' }, { e: 'goto', node: 'a2-after' }] },
          { id: 'look', text: '"אני הולך לראות. אני חוזר."', then: [{ e: 'flag', flag: 'a2:looked' }, { e: 'toast', text: '"תחזור," הוא אמר, כמו שאומרים משהו שלא בטוחים בו.', tone: 'plain' }] },
        ],
      },
    ],
  },
  {
    id: 'barry-gate7',
    nameHe: 'בארי',
    branches: [
      {
        lines: [{ who: 'בארי', text: 'אבא שלך צודק וטועה באותו משפט. ראיתי את זה קורה פה לאנשים טובים. תעמוד איפה שתעמוד — רק שזה יהיה אתה שהחלטת.' }],
        then: [{ e: 'rel', who: 'barry', axis: 'familiarity', delta: 4 }, { e: 'personality', key: 'independence', delta: 1 }],
      },
    ],
  },
  {
    id: 'asaf-gate5',
    nameHe: 'אסף',
    branches: [
      // (V3) `a2:chose` as well as the gate: a man who stood at five in an earlier year
      // still gets asked tonight, in uniform — the gate alone used to answer for him
      { when: { all: [{ flag: 'a2:chose' }, { gateIs: 'gate5' }] }, lines: [{ who: 'אסף', text: 'אתה פה. יופי. בשבוע הבא אתה מגיע שעה לפני ומחזיק בד. אין "אני רק בא לשיר".' }] },
      { when: { flag: 'a2:chose' }, lines: [{ who: 'אסף', text: 'שבוע הבא, שעה לפני המשחק. אם אתה בא — אתה סוחב. אם לא — לא נכעס. נזכור.' }] },
      {
        // he did the work before he was asked to say anything — Asaf saw
        when: { any: [{ flag: 'a2:banner' }, { flag: 'a2:bag-moved' }] },
        lines: [
          { who: 'אסף', text: 'ראיתי. לא ביקשתי פעמיים, וזה כבר יותר ממה שרוב מי שבא לפה עושה בערב הראשון.' },
          { who: 'מלמד', text: 'תן לו לשמוע קודם. (מלמד, עם דרבוקה בין הברכיים, מנסה קצב.) ככה? או ככה?' },
        ],
        choices: ASAF_GATE5_CHOICES,
      },
      {
        lines: [
          { who: null, text: 'מתחת ליציע. תוף, עשרים בחורים, בד שמישהו צייר ביד. אסף באמצע, לא שר — מסתכל.' },
          { who: 'אסף', text: 'חייל. תשמע טוב: פה לא באים לראות משחק. פה עובדים. סוחבים, תולים, מגיעים שעה לפני. כבוד מקבלים אחר כך, אם בכלל.' },
          { who: 'מלמד', text: 'תן לו לשמוע קודם. (מלמד, עם דרבוקה בין הברכיים, מנסה קצב.) ככה? או ככה?' },
        ],
        choices: ASAF_GATE5_CHOICES,
      },
    ],
  },
  {
    id: 'a2-after',
    nameHe: null,
    branches: [
      { when: { gateIs: 'gate5' }, lines: [{ who: null, text: 'מהמקום החדש רואים את שער 7 באלכסון. בהפסקה אנשים נצמדים לגדר שבין 5 ל-7 ומדברים דרכה. אבא לא בא לגדר.' }, { who: null, text: 'התוף לא הפסיק תשעים דקות. בסוף לא שמעת אותו. הוא היה בפנים.' }] },
      { when: { any: [{ gateIs: 'outside' }, { gateIs: 'between' }] }, lines: [{ who: null, text: 'עמדת ליד הגדר שבין 5 ל-7 — מקום שעוברים בו בהפסקה ולא עומדים בו במשחק. ראית תשעים דקות לבד. זה היה הדבר הכי לא־בלומפילד שעשית.' }] },
      { lines: [{ who: null, text: 'שער 7. השיר האיטי. הכתף של אבא ליד הכתף שלך. ומתחת ליציע, כל המשחק, תוף שאתה שומע ולא רואה.' }] },
    ],
  },
  /**
   * באמצע — the third place to stand, and it is a PLACE (V3 §7 "Between").
   *
   * Until 24.9.2026 the middle was a sentence in a menu. It is the fence between five and
   * seven now, on the forecourt between Kobi and the door under the stand, and walking to
   * it and pressing is the decision: the words come after, as its consequence. It stays
   * standing for as long as nothing has been chosen, which is what makes the choice
   * recoverable from any closed box.
   */
  {
    id: 'a2-between',
    nameHe: null,
    branches: [
      { when: { flag: 'a2:chose' }, lines: [{ who: null, text: 'הגדר בין 5 ל-7. בהפסקה נצמדים אליה ומדברים דרכה.' }] },
      {
        lines: [
          { who: null, text: 'נעמדת ליד הגדר. מימין השיר האיטי של שער 7, משמאל התוף. שניהם שומעים אותך לא בוחר.' },
          { who: null, text: 'קובי הסתכל לכאן פעם אחת. אסף לא הסתכל בכלל.' },
        ],
        then: [
          { e: 'flag', flag: 'a2:chose' },
          { e: 'gate', to: 'between', reason: 'conflict' },
          { e: 'personality', key: 'independence', delta: 2 },
          { e: 'wellbeing', key: 'loneliness', delta: 4 },
          { e: 'goto', node: 'a2-after' },
        ],
      },
    ],
  },
  /** under the stand — "תזיז את התיק מהמעבר", done with the hands */
  {
    id: 'a2-gate5-bag',
    nameHe: null,
    branches: [
      { when: { flag: 'a2:bag-moved' }, lines: [{ who: null, text: 'התיק שלך מתחת למדרגה, ליד התוף של מישהו אחר.' }] },
      {
        lines: [{ who: null, text: 'התיק הצבאי שלך באמצע המעבר, בדיוק איפה שסוחבים את התופים. הרמת אותו ודחפת אותו מתחת למדרגה.' }],
        then: [{ e: 'flag', flag: 'a2:bag-moved' }, { e: 'rel', who: 'asaf', axis: 'familiarity', delta: 2 }],
      },
    ],
  },
  /** the cloth someone painted by hand — the other end of it is a job, not a view */
  {
    id: 'a2-banner',
    nameHe: null,
    branches: [
      { when: { flag: 'a2:banner' }, lines: [{ who: null, text: 'הבד מקופל שוב על המעקה. הצבע עוד לא יבש בפינה.' }] },
      {
        lines: [
          { who: null, text: 'שניים מותחים בד על המעקה, והקצה השלישי נופל. תפסת אותו. אף אחד לא אמר תודה — מישהו רק אמר "חזק יותר".' },
          { who: null, text: 'הצבע עוד לח. על היד שלך נשאר אדום.' },
        ],
        then: [{ e: 'flag', flag: 'a2:banner' }, { e: 'redheart', key: 'terraceCulture', delta: 2 }, { e: 'rel', who: 'asaf', axis: 'trust', delta: 1 }],
      },
    ],
  },
  // ================================================================== A3 ==
  /**
   * האוטובוס — the oral history, kept exactly: a real deadline, a bus that would make it,
   * the wrong supporters on it, a refusal, two hours late. What changed on 24.9.2026 is
   * only WHERE each answer lives (V3 §8). It used to be four buttons in one box; now it is
   * the station itself:
   *
   *   · the bus DOOR (`a3-bus`) — you walk to it, you hear the driver, you get on;
   *   · the station DOOR (`a3-walk-away`) — you walk away from it: the refusal;
   *   · the BENCH (`a3-bench`) — you sit, "עוד רגע", and the second time it is too late;
   *   · the TIMETABLE on the pole (`a3-timetable`) — the boy who runs for another line.
   *
   * The words and every effect are the ones the four buttons carried.
   */
  {
    id: 'a3-bus',
    nameHe: null,
    branches: [
      { when: { flag: 'a3:decided' }, lines: [{ who: null, text: 'הרציף ריק. החלטת.' }] },
      {
        when: { flag: 'a3:bus-here' },
        lines: [
          { who: null, text: 'האוטובוס. הנהג בדלת: "חייל, עולה? אני נוסע דרך הצומת שלך. בזמן."' },
          { who: null, text: 'אגד רגיל, קו רגיל — והצדדים שלו צבועים בסמלים של בית"ר ירושלים, כי בימי משחק הוא מסיע אותם. השעון בתחנה אומר חמש חמישים ושש, וזה שלושים וארבע דקות לשער של הבסיס.' },
        ],
        choices: [
          { id: 'board', text: 'לעלות. לשתוק. להגיע בזמן.', then: A3_BOARD },
          { id: 'step-back', text: 'לרדת מהמדרגה.', then: [{ e: 'toast', text: 'הנהג לא סגר את הדלת. עוד לא.', tone: 'plain' }] },
        ],
      },
      { lines: [{ who: null, text: 'הרציף. עוד אין אוטובוס. יש שעון, ויש לך תחושה שאתה כבר יודע מה תעשה.' }] },
    ],
  },
  /** the refusal is a walk — away from the bus, through the station door */
  {
    id: 'a3-walk-away',
    nameHe: null,
    branches: [
      { when: { flag: 'a3:decided' }, lines: [{ who: null, text: 'הרציף מאחוריך.' }] },
      {
        lines: [
          { who: 'פוגי', text: 'לא. לא על האוטובוס הזה.' },
          { who: null, text: 'הנהג קרא אחריך "חייל?" פעם אחת, ולא חיכה לתשובה.' },
        ],
        then: A3_REFUSE,
      },
    ],
  },
  /** hesitating is sitting down — once is a breath, twice is the bus leaving without you */
  {
    id: 'a3-bench',
    nameHe: null,
    branches: [
      { when: { flag: 'a3:decided' }, lines: [{ who: null, text: 'הספסל רטוב מהלילה.' }] },
      {
        when: { flag: 'a3:bench' },
        lines: [{ who: null, text: 'ישבת שוב. עוד רגע. ועוד רגע. הדלת של האוטובוס נסגרה באוויר, בלי שאף אחד נגע בה.' }],
        then: [{ e: 'flag', flag: 'a3:decided' }, { e: 'flag', flag: 'a3:hesitated' }, { e: 'sfx', key: 'bus-door', level: 0.6 }, { e: 'goto', node: 'a3-left-behind' }],
      },
      {
        lines: [{ who: null, text: 'ישבת על קצה הספסל, עם התיק בין הרגליים. השעון בתחנה אומר חמש חמישים ושש.' }],
        then: [{ e: 'flag', flag: 'a3:bench' }, { e: 'personality', key: 'impulsiveness', delta: -1 }, { e: 'toast', text: 'הנהג הסתכל בשעון. אתה הסתכלת באוטובוס.', tone: 'plain' }],
      },
    ],
  },
  /** the pole with the timetable — another line, another city, and no promise */
  {
    id: 'a3-timetable',
    nameHe: null,
    branches: [
      { when: { flag: 'a3:decided' }, lines: [{ who: null, text: 'לוח הזמנים. קווים לערים אחרות.' }] },
      {
        lines: [{ who: null, text: 'על העמוד, לוח זמנים בכתב יד. יש אחד בשש וחצי לעיר אחרת, מרציף בצד השני של התחנה.' }],
        choices: [
          { id: 'other', text: 'לרוץ לחפש רציף אחר.', then: [{ e: 'flag', flag: 'a3:decided' }, { e: 'flag', flag: 'life:bus:searched' }, { e: 'personality', key: 'streetSmarts', delta: 2 }, { e: 'goto', node: 'a3-searched' }] },
          { id: 'not-yet', text: 'לא עכשיו.', then: [] },
        ],
      },
    ],
  },
  /** which morning he is still standing in, and back into it */
  {
    id: 'a3-report',
    nameHe: null,
    branches: [
      { when: { flag: 'life:bus:refused' }, lines: [{ who: null, text: 'הבסיס. שער, שומר, ואז המשרד של המפקד.' }], then: [{ e: 'goto', node: 'a3-refused' }] },
      { when: { flag: 'life:bus:boarded' }, lines: [{ who: null, text: 'האוטובוס. המושב האחורי.' }], then: [{ e: 'goto', node: 'a3-boarded' }] },
      { when: { flag: 'life:bus:searched' }, lines: [{ who: null, text: 'הרציף האחר.' }], then: [{ e: 'goto', node: 'a3-searched' }] },
      { lines: [{ who: null, text: 'הרציף, והאוטובוס שיצא בלעדיך.' }], then: [{ e: 'goto', node: 'a3-left-behind' }] },
    ],
  },
  {
    id: 'a3-refused',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'הנהג משך בכתפיים וסגר. האוטובוס יצא עם השירים שלו. הרציף נשאר עם השעון.' },
          { who: null, text: 'קו אחר, צומת אחר, והמתנה על מעקה. איך הגעת זה כבר לא הסיפור. הגעת שעתיים אחרי השעה.' },
          { who: 'המפקד', text: 'שעתיים.' },
          { who: 'פוגי', text: 'שעתיים.' },
          { who: 'המפקד', text: 'סיבה?' },
        ],
        choices: [
          { id: 'truth', text: '"האוטובוס בזמן היה ממותג בית"ר. לא עליתי."', then: [{ e: 'army', key: 'commanderTrust', delta: -15 }, { e: 'army', key: 'leaveDebt', delta: 1 }, { e: 'armyRoute', route: 'rebellious' }, { e: 'flag', flag: 'a3:done' }, { e: 'toast', text: 'הוא הסתכל עליך זמן ארוך. ואז כתב משהו. לא ידעת אם זה עונש או סיפור.', tone: 'plain' }] },
          { id: 'lie', text: '"האוטובוס התקלקל."', then: [{ e: 'army', key: 'commanderTrust', delta: -5 }, { e: 'flag', flag: 'life:lied:army' }, { e: 'personality', key: 'streetSmarts', delta: 1 }, { e: 'wellbeing', key: 'regret', delta: 3 }, { e: 'flag', flag: 'a3:done' }, { e: 'toast', text: 'עבד. פעם אחת זה עובד.', tone: 'plain' }] },
          { id: 'silent', text: 'לשתוק.', then: [{ e: 'army', key: 'commanderTrust', delta: -20 }, { e: 'armyRoute', route: 'punished' }, { e: 'army', key: 'leaveDebt', delta: 2 }, { e: 'flag', flag: 'a3:done' }, { e: 'toast', text: 'שבת הבאה — בבסיס. הוא לא צעק. הוא רק אמר.', tone: 'red' }] },
        ],
      },
    ],
  },
  {
    id: 'a3-boarded',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'ישבת מאחור, עם התיק על הברכיים, ושתקת שעה. הם שרו כל הדרך. אחד הציע לך גרעינים. לקחת. זה היה הדבר הכי גרוע.' },
          { who: null, text: 'הגעת בזמן. המפקד לא ידע כלום. אתה ידעת.' },
        ],
        then: [{ e: 'army', key: 'commanderTrust', delta: 3 }, { e: 'armyRoute', route: 'trusted' }, { e: 'flag', flag: 'a3:done' }],
      },
    ],
  },
  {
    id: 'a3-searched',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'רצת בין הרציפים. אין. יש אחד בשש וחצי לעיר אחרת, ומשם — לא ידעת. עלית עליו בכל זאת.' },
          { who: null, text: 'הגעת בשמונה ורבע. שעה ושלושת רבעי. המפקד שאל. אמרת "אוטובוסים". זה היה נכון, בערך.' },
        ],
        then: [{ e: 'army', key: 'commanderTrust', delta: -8 }, { e: 'armyRoute', route: 'negotiator' }, { e: 'redheart', key: 'travelDrive', delta: 2 }, { e: 'flag', flag: 'a3:done' }],
      },
    ],
  },
  {
    id: 'a3-left-behind',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'לא עלית ולא ירדת. עמדת. הנהג סגר את הדלת בעצמו. האוטובוס יצא, והחלטת בלי להחליט.' },
          { who: null, text: 'שעתיים איחור. המפקד שאל "למה". לא היה לך סיפור. זה היה יותר גרוע מלא להיות שם.' },
        ],
        then: [{ e: 'army', key: 'commanderTrust', delta: -12 }, { e: 'army', key: 'leaveDebt', delta: 1 }, { e: 'personality', key: 'impulsiveness', delta: -2 }, { e: 'flag', flag: 'a3:done' }],
      },
    ],
  },
  {
    id: 'yaron-base',
    nameHe: 'ירון',
    branches: [
      { when: { flag: 'life:bus:refused' }, lines: [{ who: 'ירון', text: 'שמעתי. האוטובוס. אתה יודע שזה או הסיפור הכי טוב שלך או הכי מטומטם, ותלוי מי מספר.' }, { who: 'פוגי', text: 'תלוי מי מספר.' }], then: [{ e: 'rel', who: 'yaron', axis: 'familiarity', delta: 5 }] },
      { lines: [{ who: 'ירון', text: 'ירון, מהאוהל ליד. אם מישהו יספר לך מי אבא שלי — תגיד שכבר שמעת ותעבור נושא. אתה מהפועל? אז אנחנו מסתדרים.' }], then: [{ e: 'rel', who: 'yaron', axis: 'familiarity', delta: 4 }] },
    ],
  },
  // ================================================================== A4 ==
  {
    id: 'a4-winter',
    nameHe: null,
    branches: [
      /**
       * Rafi stands at the counter on every day of this chapter (`shopkeeper-army` has no
       * `when`), and until 24.9.2026 he opened February on the eve of conscription: a boy
       * could talk to him the night before the army and be offered Liron's car and the
       * winter's ending. Before the winter, the winter is not his to talk about.
       */
      { when: { notFlag: A4 }, lines: [{ who: 'רפי מהקיוסק', text: 'מחר בבוקר, אה? תביא לי משהו מהבסיס. סתם. תחזור שלם, זה מה שתביא.' }] },
      /**
       * מי שכבר ראה — the version of this conversation for somebody who walked around
       * first. Freddy explains less, because there is less to explain to a boy who has
       * already seen the shutter and the brackets in the newspaper. The brief asks for
       * lived signs; this is what makes them worth having noticed.
       */
      {
        when: { all: [{ flag: 'saw:window' }, { flag: 'saw:figures' }] },
        lines: [
          { who: null, text: 'פברואר. הקיוסק, שבת בצהריים. הפעם לא מדברים על מאמן. מדברים על כסף.' },
          { who: 'פוגי', text: 'החלון של המשרד סגור כבר שבועיים. ובעיתון יש מספרים בסוגריים.' },
          { who: 'פרדי', text: 'אז אתה כבר יודע. סוגריים זה מינוס. וההסתדרות מוכרת.' },
          { who: 'פרדי', text: 'יש קבוצת אנשי עסקים. זה יכול להציל את המועדון וזה יכול לקנות אותו. שני הדברים נכונים באותו רגע.' },
          { who: 'עמית', text: 'ואנחנו נאבקים להישאר בליגה. המאמן הלך באמצע השבוע, אחרי כל השנים.' },
        ],
        choices: [
          { id: 'legal', text: 'לפרדי: "מי חותם על זה בכלל?"', then: [{ e: 'institution', key: 'legalUnderstanding', delta: 8 }, { e: 'rel', who: 'freddy', axis: 'trust', delta: 4 }, { e: 'goto', node: 'a4-freddy' }] },
          { id: 'protest', text: '"אז נלך למשרדים. שיראו אותנו."', then: [{ e: 'institution', key: 'protestEscalation', delta: 8 }, { e: 'institution', key: 'footballOwnershipTrust', delta: -5 }, { e: 'rel', who: 'freddy', axis: 'tension', delta: 3 }, { e: 'goto', node: 'a4-freddy' }] },
          { id: 'sinai', text: 'על המאמן: "הוא כבר לא התשובה."', then: [{ e: 'sinai', stance: 'broken' }, { e: 'flag', flag: 'life:sinai:broken' }, { e: 'wellbeing', key: 'regret', delta: 4 }, { e: 'redheart', key: 'historyMemory', delta: 3 }, { e: 'goto', node: 'a4-liron' }] },
        ],
      },
      {
        lines: [
          { who: null, text: 'פברואר. הקיוסק, שבת בצהריים. הפעם לא מדברים על מאמן. מדברים על כסף.' },
          { who: 'עמית', text: 'אל תסתכל עלי, תסתכל בטבלה. אנחנו נאבקים להישאר בליגה. והמאמן הלך באמצע השבוע, אחרי כל השנים.' },
          { who: 'פרדי', text: 'וזה עוד לא הכל. ההסתדרות מוכרת, ויש קבוצת אנשי עסקים. זה יכול להציל את המועדון וזה יכול לקנות אותו. שני הדברים נכונים באותו רגע.' },
          { who: 'רפי מהקיוסק', text: 'העיקר שיהיה מועדון. לא אכפת לי של מי.' },
          { who: 'אוהד', text: 'לי אכפת.' },
        ],
        choices: [
          { id: 'sinai', text: 'על המאמן: "הוא לימד אותי מה זו החולצה הזאת. הוא כבר לא התשובה."', then: [{ e: 'sinai', stance: 'broken' }, { e: 'flag', flag: 'life:sinai:broken' }, { e: 'wellbeing', key: 'regret', delta: 4 }, { e: 'redheart', key: 'historyMemory', delta: 3 }, { e: 'goto', node: 'a4-liron' }] },
          { id: 'reconcile', text: '"אני עדיין אוהב את השחקן. על המאמן — נדבר בעוד עשר שנים."', then: [{ e: 'sinai', stance: 'reconciled-memory' }, { e: 'flag', flag: 'life:sinai:reconciled' }, { e: 'personality', key: 'empathy', delta: 2 }, { e: 'redheart', key: 'loyaltyReturn', delta: 3 }, { e: 'goto', node: 'a4-liron' }] },
          { id: 'protest', text: 'על המכירה: "אז נלך למשרדים. שיראו אותנו."', then: [{ e: 'institution', key: 'protestEscalation', delta: 8 }, { e: 'institution', key: 'footballOwnershipTrust', delta: -5 }, { e: 'rel', who: 'freddy', axis: 'tension', delta: 3 }, { e: 'goto', node: 'a4-freddy' }] },
          { id: 'legal', text: 'לפרדי: "מה חוקי לעשות, ומה לא?"', then: [{ e: 'institution', key: 'legalUnderstanding', delta: 8 }, { e: 'rel', who: 'freddy', axis: 'trust', delta: 4 }, { e: 'goto', node: 'a4-freddy' }] },
        ],
      },
    ],
  },
  {
    id: 'a4-freddy',
    nameHe: 'פרדי',
    branches: [
      {
        lines: [
          { who: 'פרדי', text: 'חוקי: לעמוד, לצעוק, לכתוב, לחתום. לא חוקי: לשבור, לאיים, לחסום. ההבדל הוא לא מוסר, הוא מה שיישאר לכם למחרת.' },
          { who: 'פרדי', text: 'ומי שרוצה שיהיה לו יום אחד מה להגיד על המועדון הזה — שילמד לקרוא מאזן. לא היום. אבל שיתחיל.' },
        ],
        then: [{ e: 'institution', key: 'supporterOwnershipSeed', delta: 6 }, { e: 'goto', node: 'a4-liron' }],
      },
    ],
  },
  {
    id: 'a4-liron',
    nameHe: 'לירון',
    branches: [
      // a reload in the middle of the road: the car is still outside, and the engine is running
      {
        when: { all: [{ flag: 'a4:drive' }, { notFlag: 'a4:arrived' }] },
        lines: [{ who: 'לירון', text: 'האוטו מונע. אתה בא, או שאני נוסע לבד?' }],
        then: [{ e: 'minigame', id: 'ride:1997' }],
      },
      // he asked once; a second visit is not a second offer (the choices below used to repeat)
      { when: { flag: 'a4:road' }, lines: [{ who: 'לירון', text: 'בפעם הבאה תביא סוכריות. אני תמיד נגמר מהן באמצע הדרך.' }] },
      {
        lines: [
          { who: null, text: 'בדלת, גבר עם צרור מפתחות ביד ומעיל שראה חורפים. לירון. פתח לך פעם טרנזיסטור על שולחן המטבח שלו, בחיים אחרים.' },
          { who: 'לירון', text: 'משחק חוץ הערב. יש לי אוטו, יש לי רדיו שתופס חצי, ויש לי מקום אחד. אתה חייל, יש לך שעה שצריך לחזור בה?' },
        ],
        choices: [
          { id: 'go', text: '"יש. אני נוסע."', when: { armyAbove: { key: 'commanderTrust', min: 25 } }, noteHe: 'אחרי מה שהיה — אין חופשה.', then: [{ e: 'flag', flag: 'a4:road' }, { e: 'army', key: 'leaveDebt', delta: 1 }, { e: 'redheart', key: 'travelDrive', delta: 4 }, { e: 'rel', who: 'liron', axis: 'sharedHistory', delta: 4 }, { e: 'flag', flag: 'a4:drive' }, { e: 'minigame', id: 'ride:1997' }] },
          { id: 'go-anyway', text: '"אין לי חופשה. נוסע בכל זאת."', when: { armyBelow: { key: 'commanderTrust', max: 24 } }, noteHe: 'המפקד סומך עליך. אתה לא זורק את זה על משחק.', then: [{ e: 'flag', flag: 'a4:road' }, { e: 'flag', flag: 'life:awol' }, { e: 'army', key: 'commanderTrust', delta: -20 }, { e: 'armyRoute', route: 'punished' }, { e: 'personality', key: 'riskTolerance', delta: 4 }, { e: 'rel', who: 'liron', axis: 'sharedHistory', delta: 4 }, { e: 'flag', flag: 'a4:drive' }, { e: 'minigame', id: 'ride:1997' }] },
          /**
           * החלפה (implementation pass 27.9.2026, B6 S1; bible B6 "Swap: למצוא חייל אחר —
           * relationship/debt"). No leave, and no lie: Yaron from the next tent takes this
           * Saturday's guard, and the Saturday is owed. `life:swap:yaron` outlives the winter
           * and he calls it in at the kiosk in the spring (`a5-kiosk`), on the one evening
           * there is something else to do.
           */
          { id: 'swap', text: '"ירון, תחליף אותי בשמירה של השבת? אני חייב לך אחת."', when: { all: [{ armyBelow: { key: 'commanderTrust', max: 24 } }, { relationship: { who: 'yaron', axis: 'familiarity', min: 4 } }] }, hidden: true, then: [{ e: 'flag', flag: 'a4:road' }, { e: 'flag', flag: 'life:swap:yaron' }, { e: 'army', key: 'leaveDebt', delta: 1 }, { e: 'rel', who: 'yaron', axis: 'trust', delta: 3 }, { e: 'remember', who: 'yaron', eventId: 'took-my-shabbat-1997', significance: 'major' }, { e: 'rel', who: 'liron', axis: 'sharedHistory', delta: 4 }, { e: 'toast', text: 'ירון לא שאל לאן. "שבת אחת. אני אזכיר לך."', tone: 'plain' }, { e: 'flag', flag: 'a4:drive' }, { e: 'minigame', id: 'ride:1997' }] },
          { id: 'stay', text: '"לא הפעם. אני חוזר לבסיס."', then: [{ e: 'army', key: 'commanderTrust', delta: 6 }, { e: 'personality', key: 'reliability', delta: 3 }, { e: 'wellbeing', key: 'regret', delta: 4 }, { e: 'flag', flag: 'a4:road' }, { e: 'presence', mode: 'army' }, { e: 'flag', flag: 'a4:done' }] },
        ],
      },
    ],
  },
  /**
   * הדרך — four stops of one ride (`content/passages.ts`, `RIDE_1997`), and each of these is
   * asked at its own stop: the fuel needle (`road-1`), the junction (`road-2`), the lights of
   * the ground (`road-3` → `road-back`). Until 24.9.2026 they were one chain of `goto`s read
   * in a row; the chain is cut so the road can be ridden between them (Director V3 §9).
   */
  {
    id: 'road-1',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'חצי דרך. מחוג הדלק נמוך, ותחנה אחת לפני הכביש הארוך. חייל מקבל שישים שקל בחודש, ודלק לחצי דרך עולה שלושים.' },
        ],
        choices: [
          { id: 'fuel', text: 'לשלם חצי דלק. שלושים שקל.', when: { minAgorot: 3000 }, noteHe: 'אין.', then: [{ e: 'money', agorot: -3000, why: 'דלק, חצי' }, { e: 'rel', who: 'liron', axis: 'trust', delta: 4 }] },
          { id: 'food', text: 'לקנות אוכל לשניכם בתחנה. חמישה־עשר.', when: { minAgorot: 1500 }, noteHe: 'אין.', then: [{ e: 'money', agorot: -1500, why: 'אוכל בתחנה' }, { e: 'rel', who: 'liron', axis: 'bond', delta: 3 }] },
          /**
           * ומי ששותק — לירון משלם, והמחוג מתמלא.
           *
           * הענף הזה עלה שתי נקודות אמון ותו לא, כאילו לא קרה בו כלום. קרה בו משהו: מישהו
           * שילם עליך שלושים שקל מהמשכורת שלו. זה חוב, והוא נרשם כחוב — לא כדי להעניש, אלא
           * כדי שיהיה מה להחזיר. הפרעון עומד ב-1999, באותו אוטו, והוא הענף היחיד שסוגר
           * התחייבות כספית **מחוץ** לפינה של אוסישקין (`ACH_BALANCE` מבקש שניים בשני פרקים).
           */
          { id: 'nothing', text: 'לשתוק. הוא הציע, לא אתה.', then: [{ e: 'rel', who: 'liron', axis: 'trust', delta: -2 }, { e: 'flag', flag: 'owe:liron' }, { e: 'debt', agorot: FUEL_AGOROT, why: 'חצי הדלק שלירון שילם' }] },
        ],
      },
    ],
  },
  {
    id: 'road-2',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'הכביש הארוך. לירון מדבר על המכירה, אתה על המאמן, ובאמצע זה נהיה ויכוח. לא צעקות. גרוע יותר — שקט.' },
          { who: 'לירון', text: 'אני יכול לעצור בצומת. יש משם אוטובוס. אני לא נעלב. אני רק שואל.' },
        ],
        choices: [
          { id: 'stay', text: '"תמשיכי. אני איתך."', then: [{ e: 'rel', who: 'liron', axis: 'sharedHistory', delta: 6 }, { e: 'personality', key: 'empathy', delta: 2 }] },
          { id: 'bus', text: '"תעצרי. אני אמשיך באוטובוס."', then: [{ e: 'rel', who: 'liron', axis: 'distance', delta: 5 }, { e: 'personality', key: 'stubbornness', delta: 3 }, { e: 'flag', flag: 'road:bus' }] },
        ],
      },
    ],
  },
  {
    id: 'road-3',
    nameHe: null,
    branches: [
      {
        when: { flag: 'road:bus' },
        lines: [{ who: null, text: 'האוטובוס איחר. הגעת אחרי שהתחילו. לירון עמד בשער וחיכה לך, עם הכרטיס שלך ביד. לא אמר כלום.' }, { who: null, text: 'המשחק היה מה שהיה. הדרך חזרה — כל אחד לחוד.' }],
        then: [{ e: 'presence', mode: 'late' }, { e: 'goto', node: 'road-back' }],
      },
      {
        lines: [{ who: null, text: 'הגעתם בזמן. משחק חוץ של חורף, קהל של מאה, וכל אחד מהמאה מכיר את השני. הרדיו של לירון סיפר לכם על המשחק שלכם בזמן שעמדתם בו.' }],
        then: [{ e: 'presence', mode: 'inside' }, { e: 'redheart', key: 'community', delta: 3 }, { e: 'goto', node: 'road-back' }],
      },
    ],
  },
  {
    id: 'road-back',
    nameHe: null,
    branches: [
      {
        when: { flag: 'life:awol' },
        lines: [{ who: null, text: 'הדרך חזרה, בלילה, כשאתה יודע שבשער של הבסיס מחכה שיחה. לירון הוריד אותך שני רחובות לפני. "היה שווה?" "היה." "טוב. תגיד להם שהיה."' }],
        then: [{ e: 'army', key: 'leaveDebt', delta: 2 }, { e: 'flag', flag: 'a4:done' }],
      },
      {
        lines: [{ who: null, text: 'הדרך חזרה. תחנת דלק אחת, רדיו אחד, שיחה אחת שלא נגמרה. הגעת לבסיס בדקה האחרונה של החופשה, כמו שצריך.' }],
        then: [{ e: 'army', key: 'commanderTrust', delta: 2 }, { e: 'flag', flag: 'a4:done' }],
      },
    ],
  },
  {
    id: 'a5-kiosk',
    nameHe: 'רפי מהקיוסק',
    branches: [
      {
        when: { flag: 'a5:done' },
        lines: [{ who: 'רפי מהקיוסק', text: 'נסעת? יופי. עכשיו לך לישון, יש לך בסיס בבוקר.' }],
      },
      /** the Saturday Yaron gave in the winter, called in on the evening there are two other things to do */
      {
        when: { flag: 'life:swap:yaron', none: [{ flag: 'life:swap:repaid' }, { flag: 'life:swap:broken' }] },
        lines: [
          { who: 'רפי מהקיוסק', text: 'שלושה ביקשו ממני להעביר לך הודעה, ואני לא דואר.' },
          { who: 'רפי מהקיוסק', text: 'אחד: משחק בצפון, בלי הסעה. שתיים: מישהו הבטיח לאסוף אותך ולא בא.' },
          { who: 'רפי מהקיוסק', text: 'ושלוש: חייל בשם ירון התקשר מהבסיס. אמר "השבת שלי. הוא יודע."' },
          { who: null, text: 'אתה יכול להספיק אחד. לא שלושה.' },
        ],
        choices: [
          { id: 'repay', text: 'לחזור לבסיס. לשמירה של ירון.', then: [{ e: 'flag', flag: 'life:swap:repaid' }, { e: 'army', key: 'leaveDebt', delta: -1 }, { e: 'army', key: 'commanderTrust', delta: 4 }, { e: 'rel', who: 'yaron', axis: 'trust', delta: 6 }, { e: 'personality', key: 'reliability', delta: 3 }, { e: 'proof', kind: 'promise_kept', proofId: 'promise_kept:{chapter}:yaron', subjectHe: 'השבת של ירון', noteHe: 'החליף אותו בחורף. החזיר באביב, בערב שהיה לו משהו אחר לעשות.' }, { e: 'flag', flag: 'a5:done' }, { e: 'ending', id: 'home' }] },
          { id: 'north', text: 'לצאת צפונה. בטרמפים. ירון יסתדר.', then: [{ e: 'flag', flag: 'life:swap:broken' }, { e: 'rel', who: 'yaron', axis: 'trust', delta: -6 }, { e: 'remember', who: 'yaron', eventId: 'did-not-return-shabbat-1997', significance: 'major' }, { e: 'flag', flag: 'a5:north' }, { e: 'redheart', key: 'travelDrive', delta: 6 }, { e: 'goto', node: 'a5-north-1' }] },
          { id: 'wait', text: 'לחכות להסעה שהבטיחו.', then: [{ e: 'flag', flag: 'life:swap:broken' }, { e: 'rel', who: 'yaron', axis: 'trust', delta: -6 }, { e: 'remember', who: 'yaron', eventId: 'did-not-return-shabbat-1997', significance: 'major' }, { e: 'flag', flag: 'a5:pickup' }, { e: 'goto', node: 'a5-pickup-1' }] },
        ],
      },
      {
        lines: [
          { who: 'רפי מהקיוסק', text: 'שניים ביקשו ממני להעביר לך הודעה, ואני לא דואר.' },
          { who: 'רפי מהקיוסק', text: 'אחד: יש משחק בצפון, גביע הטוטו, ואין הסעה כי נוסעים בערך עשרה. אם אתה רוצה — אתה מוצא דרך.' },
          { who: 'רפי מהקיוסק', text: 'שתיים: מישהו הבטיח לאסוף אותך למשחק ולא בא. הוא הבטיח, ולא בא.' },
          { who: null, text: 'אתה יכול להספיק אחד. לא שניים.' },
        ],
        choices: [
          {
            id: 'north',
            text: 'לצאת צפונה. בטרמפים.',
            then: [
              { e: 'flag', flag: 'a5:north' },
              { e: 'redheart', key: 'travelDrive', delta: 6 },
              { e: 'personality', key: 'riskTolerance', delta: 3 },
              { e: 'goto', node: 'a5-north-1' },
            ],
          },
          {
            id: 'wait',
            text: 'לחכות להסעה שהבטיחו.',
            then: [{ e: 'flag', flag: 'a5:pickup' }, { e: 'goto', node: 'a5-pickup-1' }],
          },
          { id: 'neither', text: 'לחזור לבסיס מוקדם.', then: [{ e: 'army', key: 'commanderTrust', delta: 5 }, { e: 'wellbeing', key: 'regret', delta: 3 }, { e: 'flag', flag: 'a5:done' }, { e: 'ending', id: 'home' }] },
        ],
      },
    ],
  },
  {
    /** the road north — the journey IS the unit, per §7 B6 */
    id: 'a5-north-1',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'בצומת שבקצה העיר עומדים שניים שאתה מכיר מהיציע ואחד שלא. ארבעה אנשים, יד אחת מורמת, וכל אוטו שעובר הוא הימור.' },
          { who: null, text: 'הראשון שעצר לקח שניים. אמרו לך "תמשיך אחרינו" והלכו.' },
        ],
        choices: [
          {
            id: 'alone',
            text: 'להישאר בצומת לבד.',
            then: [
              { e: 'personality', key: 'stubbornness', delta: 3 },
              { e: 'wellbeing', key: 'loneliness', delta: 3 },
              { e: 'time', minutes: 55 },
              { e: 'goto', node: 'a5-north-2' },
            ],
          },
          {
            id: 'pair',
            text: 'לעצור עם השלישי ולנסות ביחד.',
            then: [
              { e: 'redheart', key: 'community', delta: 4 },
              { e: 'rel', who: 'shachor', axis: 'familiarity', delta: 2 },
              { e: 'time', minutes: 35 },
              { e: 'goto', node: 'a5-north-2' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'a5-north-2',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'משאית, אחר כך מסחרית, אחר כך אחד שנסע לחתונה והוריד אותך במקום הלא נכון. שלוש שעות, ארבעה אוטואים, וגשם קטן שלא הפסיק.' },
          { who: null, text: 'בשער היו בערך עשרה. אתה הכרת שמונה מהם.' },
          { who: null, text: 'אחד מהם אמר "אתה הגעת בטרמפים?" ואז לא אמר כלום, וזה היה הדבר הכי טוב ששמעת באותו חורף.' },
        ],
        then: [
          { e: 'presence', mode: 'inside' },
          { e: 'flag', flag: 'life:north:hitched' },
          { e: 'redheart', key: 'travelDrive', delta: 5 },
          { e: 'redheart', key: 'community', delta: 4 },
          { e: 'remember', who: 'shachor', eventId: 'hitched-north', significance: 'major' },
          { e: 'flag', flag: 'a5:done' },
          { e: 'ending', id: 'road' },
        ],
      },
    ],
  },
  {
    /** the lift that never came, and the coins that made up for it */
    id: 'a5-pickup-1',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'עמדת בפינה שסיכמתם עליה. ארבע וחצי, חמש פחות רבע, חמש. האוטו לא בא.' },
          { who: null, text: 'בטלפון הציבורי אין תשובה. בכיס יש ארבעים שקל, ומונית לשם עולה יותר.' },
        ],
        choices: [
          {
            id: 'ask',
            text: 'ללכת לשער ולהגיד שאין לך.',
            then: [
              { e: 'personality', key: 'courage', delta: 3 },
              { e: 'goto', node: 'a5-pickup-2' },
            ],
          },
          {
            id: 'home',
            text: 'ללכת הביתה ולא להגיד לאף אחד.',
            then: [
              { e: 'wellbeing', key: 'loneliness', delta: 5 },
              { e: 'wellbeing', key: 'regret', delta: 4 },
              { e: 'flag', flag: 'a5:done' },
              { e: 'ending', id: 'home' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'a5-pickup-2',
    nameHe: null,
    branches: [
      {
        lines: [
          { who: null, text: 'אמרת את זה מהר, כדי לגמור. מישהו הוציא עשרים. מישהו אחר עשר. אחד נתן חמישה ואמר "זה מה שיש".' },
          { who: null, text: 'תוך שתי דקות היה מספיק למונית, ועוד עשרה שהוא לא לקח בחזרה.' },
          { who: null, text: 'הנהג שאל למה אתם ממהרים. אף אחד לא ענה לו.' },
        ],
        then: [
          { e: 'presence', mode: 'inside' },
          { e: 'flag', flag: 'life:carried:taxi' },
          { e: 'flag', flag: 'owe:stand' },
          /**
           * החוב נרשם גם בכיס ולא רק בדגל.
           *
           * `owe:stand` הוא מי שחייב למי; `debt` הוא כמה. עד עכשיו רק הראשון נכתב, ושדה
           * החוב במנוע נשאר אפס לנצח — בדיוק הפער שסעיף 8 של התסריט מצביע עליו בשם.
           * שלושים שקל הם מה שהערב הזה באמת עלה, ומה שהפרעון ב-1999 באמת גובה.
           */
          { e: 'debt', agorot: TAXI_AGOROT, why: 'המונית ששער 5 שילם עליה' },
          { e: 'redheart', key: 'community', delta: 7 },
          { e: 'wellbeing', key: 'belonging', delta: 5 },
          { e: 'personality', key: 'empathy', delta: 3 },
          { e: 'remember', who: 'asaf', eventId: 'stand-paid-my-taxi', significance: 'major' },
          { e: 'flag', flag: 'a5:done' },
          { e: 'ending', id: 'road' },
        ],
      },
    ],
  },
]
