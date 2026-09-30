import type { LocationId } from '../types'

import { facesLeft } from '../runtime/art'

import { allowedFigure, CAST_2000, castFigure } from './castFigures'
import { ADULT_LIFE, chaptersWhere, livesWithParents, ownHome, yearOfChapter } from './homes'
import type { ActorDef, ExitDef, HotspotDef, LayerDef, Repaint, SceneDef } from './scenes'
import type { Condition } from './types'

/**
 * =================================================== החדרים של 2000–2026 ====
 *
 * שבעה-עשר הציורים שמאור מסר ב-21.9.2026 (`THE-WORKER-BACKGROUNDS-2000-2026-17.zip`),
 * כל אחד כחדר: רצפה שנמדדה על הציור עצמו (כלל 52), דלת שהאור שלה יושב על פתח מצויר,
 * החפצים שהתסריט מזכיר במקום שבו הם מצוירים, והאנשים שמדברים בו — עומדים בו.
 *
 * **איך נמדדה כל רצפה.** לכל ציור נמדד קו האופק (`h`) משני גדלים ידועים בשני עומקים —
 * משקוף של 2.1 מ׳, שולחן של 0.75, דלפק של 0.9, טבעת סל של 3.05 — וגובה המצלמה (`E`)
 * יוצא מהשיפוע ביניהם. גובה הילד בן השמונה (1.30 מ׳) בנקודה `y` הוא אז
 * `(y − h) × 1.30 / E`, וממנו `size` בשני קווי הרצועה ו-`metre = size.near / 1.30`.
 * הרצועה עצמה נבחרה כך שהרמפה בין הקווים לא עוברת 1.8 (הכלל של המגרש, `scenes.ts`)
 * ושראש של גבר בן ארבעים בקו הקרוב לא יוצא מהמסגרת. המספרים בכל חדר למטה.
 *
 * **מי עומד איפה.** כל שיחה שנפתחת בכניסה לחדר (`trigger: 'enter'`) מקבלת את
 * האנשים שלה בחדר, בשנה שלה, מהרגע שהתנאי שלה יכול להתקיים — לא רק בזמן שהיא נאמרת,
 * כי אנשים לא מופיעים כשמדברים אליהם ולא נעלמים כשהמשפט נגמר. הם שותקים (`talk` ריק):
 * השיחה נפתחת מהביט, ולחיצה על אדם שכבר אמר את שלו הייתה פותחת אותה שוב. `life:sync`
 * (כלל 85) בודק שאף אחד שמדבר בשיחה כזאת לא חסר בחדר, חוץ ממי שהשיחה עצמה אומרת שהוא
 * בטלפון (`Conversation.remote`).
 */

// ----------------------------------------------------------------- כלים ---

const years = (from: number, to = 9999) => chaptersWhere((id) => yearOfChapter(id) >= from && yearOfChapter(id) <= to)
const PARENTS_YEARS = chaptersWhere(livesWithParents)
const OWN_HOME = chaptersWhere(ownHome)

export type Row = {
  who: string
  x: number
  y: number
  /** LOOKING LEFT — an intention, not a mirror: `facesLeft` turns it into one per body */
  flip?: boolean
  /** a pose other than the person's standing one */
  figure?: string
  when?: Condition
  sway?: number
}

const slug = (who: string) =>
  ({
    'קובי': 'kobi', 'רחל': 'rachel', 'אופיר': 'ofir', 'עמית': 'amit', 'אפי': 'efi', 'קרן': 'keren', 'מתוקי': 'matuki',
    'רומא': 'roma', 'שחור': 'shachor', 'יוסף': 'yosef', 'אסף': 'asaf', 'מלמד': 'melamed', 'פרדי': 'freddy', 'רפי': 'rafi',
    'לירון': 'liron', 'ירון': 'yaron', 'אילן': 'ilan', 'בתיה': 'batya', 'אולי': 'oli', 'לינה': 'lina', 'ניקו': 'nico',
    'שני': 'shani', 'מאיה': 'maya', 'מיכל': 'michal', 'אדם': 'adam', 'מראיינת': 'interviewer', 'גור': 'gur', 'יונתן': 'yonatan',
    'נטע': 'neta', 'ענבל': 'inbal', 'יבגני': 'yevgeny', 'הילד': 'child', 'מלאני': 'melanie', 'דור': 'dor', 'תמר': 'tamar',
    'אלכס': 'alex', 'האורח': 'guest', 'סוקו': 'soko',
  })[who] ?? 'extra'

/**
 * אנשים בחדר, בפרק אחד. `when` של הקבוצה הוא התנאי שהשיחה שלהם מחכה לו — בלי ה-`none`
 * שלה, כי מי שדיבר כבר נשאר.
 */
export function cast(era: string, when: Condition | undefined, rows: readonly Row[]): ActorDef[] {
  return rows.map((row) => {
    const figure = row.figure ?? castFigure(row.who, yearOfChapter(era))?.figure
    if (!figure) throw new Error(`rooms2000: no body for ${row.who}`)
    // a pose is the person's own pose (24.9.2026): a named person may not be handed another
    // man's body through `row.figure` — see `allowedFigure` in `castFigures.ts`
    if (row.figure && !allowedFigure(row.who, yearOfChapter(era), row.figure)) {
      throw new Error(`rooms2000: ${row.who} in ${era} cannot stand on ${row.figure} (not his family that year)`)
    }
    const cond = row.when ?? when
    return {
      id: `${era}-${slug(row.who)}${row.figure ? `-${row.figure.split('-').pop()}` : ''}`,
      era,
      figure,
      x: row.x,
      y: row.y,
      nameHe: row.who,
      ...(cond ? { when: cond } : {}),
      ...(Boolean(row.flip) !== facesLeft(figure) ? { flip: true } : {}),
      sway: row.sway ?? 0.003,
    }
  })
}

/**
 * `PARTNER` — שלוש אפשרויות, גוף אחד לכל אחת, ורק מי שנבחר עומד בחדר.
 */
export function partner(era: string, when: Condition | undefined, at: { x: number; y: number; flip?: boolean }): ActorDef[] {
  const whom: Array<[string, string]> = [['melanie', 'מלאני'], ['dor', 'דור'], ['tamar', 'תמר']]
  return whom.map(([id, name]) => ({
    id: `${era}-partner-${id}`,
    era,
    figure: CAST_2000[name]!.figure,
    x: at.x,
    y: at.y,
    nameHe: name,
    when: { all: [{ flagIs: { flag: 'life:partner', value: id } }, ...(when ? [when] : [])] },
    ...(Boolean(at.flip) !== facesLeft(CAST_2000[name]!.figure) ? { flip: true } : {}),
    sway: 0.003,
  }))
}

/** a thing to look at: a narration in `content/rooms2000Looks.ts` under the same id */
const look = (id: string, era: HotspotDef['era'], x: number, y: number, w: number, labelHe: string, prop?: HotspotDef['prop'], when?: Condition): HotspotDef => ({
  id,
  era,
  x,
  y,
  w,
  act: id,
  verb: 'look',
  labelHe,
  ...(prop ? { prop } : {}),
  ...(when ? { when } : {}),
})

/** one person in a staged group who may be spoken to — the others stay silent (see the header) */
const talkTo = (who: string, conversation: string) => (actor: ActorDef): ActorDef =>
  actor.nameHe === who ? { ...actor, talk: conversation } : actor

const flag = (name: string): Condition => ({ flag: name })
const all = (...names: string[]): Condition => ({ all: names.map((n) => ({ flag: n })) })

// ============================================================ המגרש · pitchSmall ===
/**
 * מגרש קטן, דשא סינתטי — **המגרש של השכונה מ-2000**, במקום חצר האבנים של 1986.
 *
 * נמדד: השערים הקטנים (2 מ׳) עומדים על 0.47 ומשקוף שלהם ב-0.34, הסככה (כ-2 מ׳) על 0.44
 * — אופק 0.367, מצלמה בגובה 1.6. הרצועה 0.62–0.82: עמוק יותר המגרש כבר "זום", ורחוק
 * יותר מזה ילד היה קטן מכדי שיראו מי הוא. הדלת היא השער בגדר (0.185–0.22), ולא קצה
 * המסגרת: יוצאים מהמגרש דרך השער, כמו שנכנסים.
 */
export const PITCH_2000: Repaint = {
  in: (chapter) => yearOfChapter(chapter) >= 2010,
  art: 'pitchSmall',
  titleHe: 'המגרש של השכונה',
  band: { far: 0.62, near: 0.82 },
  size: { far: 0.2056, near: 0.3681 },
  metre: 0.2832,
  spawns: { fromStreet: { x: 0.28, y: 0.67, facing: 'right' }, start: { x: 0.3, y: 0.7, facing: 'right' } },
  doors: { back: { x: 0.15, y: 0.62, w: 0.1, h: 0.045, light: { x: 0.185, y: 0.325, w: 0.036, h: 0.115, tone: 'daylight' } } },
  spots: {
    'street-match-2000-title': { x: 0.5, y: 0.72, w: 0.1 },
    'street-match-2000-double': { x: 0.5, y: 0.72, w: 0.1 },
    'alley-coin-2000-title': { x: 0.66, y: 0.78, w: 0.08 },
    'alley-coin-2000-double': { x: 0.66, y: 0.78, w: 0.08 },
    'penalty-contest-2000-title': { x: 0.84, y: 0.68, w: 0.09 },
    'penalty-contest-2000-double': { x: 0.84, y: 0.68, w: 0.09 },
  },
  // a ball at the centre spot is true of every afternoon on a pitch like this
  layers: [{ art: 'propFootball', era: ADULT_LIFE, x: 0.515, y: 0.66, w: 0.023, depth: 0.66, foot: true }],
  stuckHe: 'השער בגדר — משמאל, מאחורי השער הקטן.',
}

/**
 * 2000–2009: the same neighbourhood pitch before it was laid synthetic (pitchPark00, 27.9.2026) —
 * the same camera as `pitchSmall`, checked by overlay, so every measurement carries over.
 */
export const PITCH_2000S: Repaint = {
  ...PITCH_2000,
  in: (chapter) => yearOfChapter(chapter) >= 2000 && yearOfChapter(chapter) < 2010,
  art: 'pitchPark00',
}

// ======================================================= החדר · bedroom00 ===
/**
 * החדר של בן עשרים ושתיים, 2000 — ואותו חדר כשהוא כבר לא גר בו.
 *
 * נמדד: שולחן (0.75) מ-0.405 ל-0.6, משקוף הדלת הימנית (2.1) מ-0 ל-0.73 — אופק 0.225,
 * מצלמה 1.44. הקופסה האדומה עומדת **על המדף העליון** (הקרש ב-0.083, 0.483–0.645),
 * במקום הקופסה האפורה הקטנה שמצוירת שם — B01: *"הקופסה האדומה על המדף. הורדת אותה"*.
 */
export const BEDROOM_2000: Repaint = {
  in: (chapter) => yearOfChapter(chapter) >= 2000,
  art: 'bedroom00',
  titleHe: 'החדר שלך',
  band: { far: 0.66, near: 0.88 },
  size: { far: 0.3927, near: 0.5913 },
  metre: 0.4549,
  spawns: { start: { x: 0.5, y: 0.8, facing: 'left' }, fromHome: { x: 0.8, y: 0.78, facing: 'left' } },
  doors: { out: { x: 0.9, y: 0.7, w: 0.1, h: 0.18, light: { x: 0.922, y: 0.02, w: 0.075, h: 0.7, tone: 'inside' } } },
  spots: {
    'proof-create': { x: 0.47, y: 0.72, w: 0.12, prop: { key: 'propNote', size: 0.045, at: { x: 0.455, y: 0.405 } } },
    'small-write-account': { x: 0.2, y: 0.72, w: 0.14, labelHe: 'המחברת הפתוחה על המיטה' },
    'small-make-work': { x: 0.66, y: 0.74, w: 0.08 },
    'distance-window': { x: 0.36, y: 0.69, w: 0.08, labelHe: 'מהתריס החוצה' },
    'redbox-shelf': { x: 0.51, y: 0.7, w: 0.08, prop: { key: 'propRedBox', size: 0.042, at: { x: 0.51, y: 0.083 } } },
    // (Director V3 §12, 25.9.2026) 2000-double — the bed under the window, and the same box
    'd-bed': { x: 0.24, y: 0.76, w: 0.1 },
    'd-box': { x: 0.51, y: 0.72, w: 0.08 },
  },
  stuckHe: 'הדלת לסלון — מימין.',
}

// ============================================================= הבית · homeAdult ===
/**
 * הבית של פוגי, מ-2013 — סלון ומטבח פתוח, והמקרר שהיומן תלוי עליו (L04).
 *
 * נמדד: מטבח (0.9) מ-0.41 ל-0.28, כיסא אוכל (0.95) מ-0.53 ל-0.31 — אופק 0.214, מצלמה
 * 1.36. הרצועה 0.55–0.8 (1.74): הרצפה ממשיכה עד תחתית המסגרת, אבל גבר בגובה 1.78
 * שעומד ב-0.95 היה יוצא ממנה בראש. דלת הכניסה משמאל (0.04–0.16) היא הדלת לרחוב;
 * הפתח הימני (0.9) הוא חדר שינה, ואין בו דלת במשחק — הבית של אדם מבוגר הוא לא סיור.
 *
 * `kitchen` ו-`bedroom` נעלמים מהבית הזה (`doors: null`): המטבח הוא הפינה השמאלית של אותו
 * ציור, וביטים שהיו כתובים למטבח עוברים לכאן (כלל 35 — החדר נשמר, הדלת לא).
 */
export const HOME_OWN: Repaint = {
  in: ownHome,
  art: 'homeAdult',
  titleHe: 'הבית שלך',
  band: { far: 0.55, near: 0.8 },
  size: { far: 0.3202, near: 0.5585 },
  metre: 0.4296,
  spawns: {
    fromStreet: { x: 0.24, y: 0.66, facing: 'right' },
    start: { x: 0.52, y: 0.72, facing: 'left' },
    fromKitchen: { x: 0.4, y: 0.64, facing: 'right' },
    fromBedroom: { x: 0.7, y: 0.66, facing: 'left' },
  },
  doors: {
    street: { x: 0.02, y: 0.55, w: 0.14, h: 0.1, light: { x: 0.042, y: 0.02, w: 0.118, h: 0.47, tone: 'daylight' } },
    kitchen: null,
    bedroom: null,
  },
  hotspots: [
    // L04 — "היומן שעל המקרר": the fridge is painted with notes on it, 0.215–0.295
    // the diary on the fridge door (0.21–0.29, door 0.12–0.30; the fridge stands on 0.31, where
    // a metre is 0.07 of the frame — a wall planner of 0.4 m is 0.028)
    look('flat-fridge', OWN_HOME, 0.255, 0.57, 0.08, 'היומן על המקרר', { key: 'propPlanner', size: 0.028, at: { x: 0.257, y: 0.25 } }),
    // the box came with him — on the bookcase, the lowest free shelf (0.79–0.86)
    {
      id: 'redbox-flat',
      era: OWN_HOME,
      x: 0.82,
      y: 0.58,
      w: 0.07,
      act: 'redbox-flat',
      verb: 'look',
      labelHe: 'הקופסה האדומה',
      prop: { key: 'propRedBox', size: 0.036, at: { x: 0.822, y: 0.302 } },
    },
    look('flat-window', OWN_HOME, 0.385, 0.56, 0.07, 'התריס במטבח'),
    // the dining table (top 0.335, legs on 0.53, 0.23 of the frame to the metre): a mug
    look('flat-table', OWN_HOME, 0.28, 0.6, 0.1, 'שולחן האוכל', { key: 'propMug', size: 0.023, at: { x: 0.31, y: 0.337 } }),
  ],
  // R03 (2021-losses) — "המסך על השולחן": the call with Kobi is on a laptop on the dining table
  layers: [{ art: 'propLaptop', era: '2021-losses', x: 0.255, y: 0.337, w: 0.037, depth: 0.53, foot: true }],
  stuckHe: 'הדלת לרחוב — משמאל, ליד המקרר.',
}

// ========================================= היציע של בלומפילד · 2000–2015 ===
/**
 * בלומפילד הישן מבפנים — המעבר מאחורי המושבים של היציע המקורה (ART-PROMPTS §17א).
 *
 * נמדד: העמוד (כ-4.7 מ׳) מ-0.52 ל-0.05, אופק 0.36. הרצועה היא המעבר עצמו (0.68–0.92);
 * השורה האחרונה של המושבים נגמרת ב-0.66 משמאל. היציאה היא הפתח מימין לעמוד.
 */
export const STAND_OLD: Repaint = {
  in: (chapter) => yearOfChapter(chapter) >= 2000 && yearOfChapter(chapter) <= 2015,
  art: 'bloomOldTerrace',
  titleHe: 'בלומפילד — היציע',
  air: 'day',
  band: { far: 0.68, near: 0.92 },
  size: { far: 0.26, near: 0.455 },
  metre: 0.35,
  spawns: { start: { x: 0.74, y: 0.8, facing: 'left' } },
  doors: { home: { x: 0.9, y: 0.68, w: 0.1, h: 0.24, light: { x: 0.885, y: 0.3, w: 0.07, h: 0.25, tone: 'daylight' } } },
  spots: { rail: { x: 0.3, y: 0.7, w: 0.14 } },
  arrival: null,
  stuckHe: 'היציאה — מימין לעמוד.',
}

/** בלומפילד המחודש מבפנים, 2019 והלאה (ART-PROMPTS §17ב). אופק 0.38, רצועה 0.68–0.9. */
export const STAND_NEW: Repaint = {
  in: (chapter) => chapter === '2018-return' || yearOfChapter(chapter) >= 2019,
  art: 'bloomNewTerrace',
  titleHe: 'בלומפילד — היציע החדש',
  air: 'day',
  band: { far: 0.68, near: 0.9 },
  size: { far: 0.2438, near: 0.4225 },
  metre: 0.325,
  spawns: { start: { x: 0.8, y: 0.8, facing: 'left' } },
  doors: { home: { x: 0.93, y: 0.68, w: 0.07, h: 0.22, light: { x: 0.952, y: 0.3, w: 0.046, h: 0.25, tone: 'daylight' } } },
  spots: { rail: { x: 0.3, y: 0.7, w: 0.14 } },
  // T03 (2024) — Asaf's terrace: the drum stands where the leaders stand, beside him. 0.55 m on
  // a floor where a metre is 0.255 of the frame
  layers: [{ art: 'propDrum', era: '2024-terrace', x: 0.625, y: 0.785, w: 0.088, depth: 0.785, foot: true }],
  arrival: null,
  stuckHe: 'היציאה — מימין, מאחורי העמוד.',
}

/**
 * ------------------------------------------ בלומפילד מבפנים, בלי משחק (24.9.2026) ----
 *
 * שלושה צילומים שמאור שלח ב-23.9.2026 (`bloom80Goal`, `bloom90Side`, `bloom90Corner`) והכריע:
 * *"חדרי הבלומפילד של העשורים שלהם."* השלטים מתארכים (olivetti / בנק הפועלים → השמונים;
 * שיכון עובדים / Hertz → התשעים), והיציעים **ריקים**. לכן הם החדר רק ביום בלי משחק: ביום
 * משחק — 1986, 1990, 1998-laces — `stand` עם הקהל האפוי נשאר, כי יציע ריק בזמן שהתסריט
 * אומר "היציע קופץ" הוא שקר גדול יותר מציור. הרצפה היא הדשא שלפני השלטים — המצלמה עומדת
 * על המגרש, ואין מדרגה קרובה לעמוד עליה.
 *
 * נמדד (שתי מדידות לכל צילום, לפי `art-drop-ingest` §7):
 *   · `bloom90Side` — השער בשמאל: המשקוף (2.44 מ׳) 0.40→0.51, כלומר 0.045 למטר ב-0.51; מצלמה
 *     בגובה עין (1.6) נותנת אופק 0.44, והמעגל (18.3 מ׳ בעומק, 0.575→0.715 על קו האמצע)
 *     מתיישב על אותו אופק. מטר = (y − 0.44) / 1.6: 0.1625 ב-0.70, 0.2875 ב-0.90 — רמפה 1.77.
 *   · `bloom80Goal` — השער מול המצלמה: המשקוף 0.51→0.70, 0.078 למטר בקו השער; אופק 0.575.
 *     קו השטח הקטן (5.5 מ׳) ב-0.74 וקו הרחבה ב-0.945 מתיישבים עליו (22.7 ו-7.7 מ׳ מהמצלמה).
 *     מטר = (y − 0.575) / 1.6: 0.128 ב-0.78, 0.222 ב-0.93 — רמפה 1.73.
 * גבר בן 1.78 בקו הקרוב: חצי מהמסגרת (0.51 / 0.40), והעיניים שלו על האופק בכל עומק — זו
 * הבדיקה. הדלת היא הפתח המצויר (המנהרה מתחת ל-Hertz; השער האדום מתחת ליציע מאחורי השער),
 * והאור שלה יושב עליו; אזור הלחיצה על קו הרחוק של הרצועה, כמו ב-`STAND_OLD`.
 */
const NON_MATCH_80S = new Set(['a2-alley', 'a3-hall', 'a4-shirt', 'a6-radio', 'a7-week'])
export const STAND_80S: Repaint = {
  in: (chapter) => NON_MATCH_80S.has(chapter),
  art: 'bloom80Goal',
  titleHe: 'בלומפילד — המגרש',
  air: 'day',
  band: { far: 0.78, near: 0.93 },
  size: { far: 0.1668, near: 0.2886 },
  metre: 0.222,
  spawns: { start: { x: 0.2, y: 0.86, facing: 'right' } },
  doors: { home: { x: 0.45, y: 0.78, w: 0.1, h: 0.05, light: { x: 0.44, y: 0.52, w: 0.13, h: 0.14, tone: 'inside' } } },
  spots: { rail: null },
  arrival: null,
  stuckHe: 'היציאה — מתחת ליציע, מאחורי השער.',
}

export const STAND_90S: Repaint = {
  in: (chapter) => {
    const year = yearOfChapter(chapter)
    return year >= 1991 && year <= 1999 && chapter !== '1998-laces'
  },
  art: 'bloom90Side',
  titleHe: 'בלומפילד — המגרש',
  air: 'day',
  band: { far: 0.7, near: 0.9 },
  size: { far: 0.2113, near: 0.374 },
  metre: 0.2875,
  spawns: { start: { x: 0.8, y: 0.8, facing: 'left' } },
  doors: { home: { x: 0.86, y: 0.7, w: 0.1, h: 0.05, light: { x: 0.875, y: 0.385, w: 0.055, h: 0.06, tone: 'inside' } } },
  spots: { rail: null },
  // the corner — the same ground from the other end, the establishing shot on the way in
  arrival: { art: 'bloom90Corner', ms: 3200, flag: 'saw:bloom90' },
  stuckHe: 'היציאה — המנהרה מימין, מתחת לשלט.',
}

// ===================================================== הרחוב · street10 · 2010–2026 ===
/**
 * הרחוב ליד הבית, 2010–2026 (`street10`, 27.9.2026) — אותו רחוב, ציור 16:9 ולא 2.56:1.
 *
 * הקומפוזיציה היא של `street`/`street90` (הדלת עם ה-12 משמאל, הקיוסק, הסמטה, החומה עם
 * הכתובת האדומה, העמוד, הרחוב הצדדי עם הסוככים מימין) — אבל המצלמה נמוכה וקרובה, אז שום
 * מספר של הציור הישן לא עובר. עד היום כל פרק מ-2010 עמד על הרחוב של שנות התשעים.
 *
 * נמדד (שתי מדידות):
 *   · אופק 0.59 — נקודת המגוז של הרחוב הצדדי: קו בסיס הבתים (0.625 → 0.665) וקו תחתית
 *     הסוככים (0.53 → 0.49) נפגשים ב-(0.63, 0.585); רצפת הסמטה נגמרת ב-0.61.
 *   · הקיוסק: מתחתית הסוכך (0.405) עד רגלי הדלפק (0.675) — פתח של כ-2.25 מ׳; החומה עם
 *     הכתובת (0.415 → 0.655) כ-2.6 מ׳. מטר = 1.4 × (y − 0.59): 0.14 ב-0.69, 0.231 ב-0.755.
 *     כלומר המצלמה נמוכה (כ-0.7 מ׳): ראשים של מבוגרים גבוהים מהאופק, וזה נכון לציור הזה.
 * הרצועה היא החצי האחורי של המדרכה, מבסיס הבתים (0.69–0.755, רמפה 1.65): קרוב לדלתות. החצי
 * הקדמי, עד שפת המדרכה (0.77), נשאר ריק — בגובה המצלמה הזאת כל צעד קדימה הוא עוד חצי גוף.
 * גבר בן 1.78 בגב המדרכה ליד הקיוסק: ארבע חמישיות מהפתח, מועבר לעומק הדלפק — זו הבדיקה.
 *
 * הדלתות: הבית (הדלת עם ה-12), הקיוסק, הסמטה למגרש — כמו תמיד. מימין לחומה הרחוב הצדדי
 * הוא ארבעת הפתחים שהיו פזורים בציור הרחב: הפנייה עצמה (למרכז), הדלת תחת הסוכך הראשון
 * (בית הספר), הדלת תחת השני (היציאה של הפרק — התחנה, חדר הקהילה, הדרייב אין, המשרד),
 * והדלת בקצה (מזרחה). צפוף — ולכן כולן רדודות, בגב המדרכה, עם שהייה (`dwellMs`) כמו תמיד.
 */
const STREET_SLOT: Pick<ExitDef, 'x' | 'y' | 'w' | 'h'> & { light: ExitDef['light'] } = {
  x: 0.9,
  y: 0.69,
  w: 0.045,
  h: 0.03,
  light: { x: 0.903, y: 0.51, w: 0.028, h: 0.15, tone: 'daylight' },
}
export const STREET_2010: Repaint = {
  in: (chapter) => yearOfChapter(chapter) >= 2010,
  art: 'street10',
  band: { far: 0.69, near: 0.755 },
  size: { far: 0.182, near: 0.3003 },
  metre: 0.231,
  spawns: {
    fromHome: { x: 0.14, y: 0.73, facing: 'right' },
    fromKiosk: { x: 0.2, y: 0.735, facing: 'right' },
    fromPitch: { x: 0.44, y: 0.735, facing: 'left' },
    fromRoute: { x: 0.93, y: 0.74, facing: 'left' },
    fromUss: { x: 0.78, y: 0.74, facing: 'left' },
    fromCentre: { x: 0.78, y: 0.74, facing: 'left' },
    fromSchool: { x: 0.84, y: 0.745, facing: 'left' },
    fromBus: { x: 0.8, y: 0.74, facing: 'right' },
    fromFar: { x: 0.8, y: 0.745, facing: 'right' },
    start: { x: 0.44, y: 0.735, facing: 'right' },
  },
  doors: {
    // the door with the 12 on it (0.035–0.10), up its three steps
    home: { x: 0, y: 0.69, w: 0.09, h: 0.065, light: { x: 0.035, y: 0.29, w: 0.065, h: 0.37, tone: 'inside' } },
    // the counter under the tin awning (0.225–0.36)
    kiosk: { x: 0.225, y: 0.69, w: 0.135, h: 0.03, light: { x: 0.225, y: 0.4, w: 0.14, h: 0.28, tone: 'inside' } },
    // the alley between the kiosk's building and the wall (0.42–0.54)
    pitch: { x: 0.425, y: 0.69, w: 0.1, h: 0.03, light: { x: 0.435, y: 0.4, w: 0.09, h: 0.28, tone: 'inside' } },
    // the side street itself, turning in past the pole
    centre: { x: 0.805, y: 0.69, w: 0.045, h: 0.03, light: { x: 0.81, y: 0.55, w: 0.04, h: 0.13, tone: 'daylight' } },
    // the door under the first awning (0.87–0.89)
    school: { x: 0.855, y: 0.69, w: 0.045, h: 0.03, light: { x: 0.866, y: 0.515, w: 0.03, h: 0.145, tone: 'daylight' } },
    // the far door at the end of the row (0.965–0.99), and the edge of the frame beyond it
    route: { x: 0.95, y: 0.69, w: 0.05, h: 0.065, light: { x: 0.962, y: 0.505, w: 0.032, h: 0.16, tone: 'daylight' } },
    // the chapter's way out of the neighbourhood: the door under the second awning (0.905–0.93)
    busStation: STREET_SLOT,
    ramatGan: STREET_SLOT,
    hatikva: STREET_SLOT,
    hallNew: STREET_SLOT,
    driveIn: STREET_SLOT,
    community: STREET_SLOT,
    office: STREET_SLOT,
  },
  spots: {
    wall: { x: 0.64, y: 0.725, w: 0.09 },
    'alley-view': { x: 0.475, y: 0.74, w: 0.05 },
    'kiosk-view': { x: 0.2, y: 0.74, w: 0.05 },
    // 2010-teddy · D05 — Oli's list, his cash, Amit: beside the people they belong to (`STAGED.street`)
    'd10-roster': { x: 0.24, y: 0.745, w: 0.06 },
    'd10-pay': { x: 0.34, y: 0.745, w: 0.06 },
    'd10-promise': { x: 0.62, y: 0.75, w: 0.06 },
  },
  // I02 (2010-friends) — Lina's banner, blank, on its two poles against the wall with the red
  // writing, clear of every door: 1.6 m where a metre is 0.189 of the frame (1672 × 0.17 = 284 px)
  layers: [{ art: 'propBannerBlank', era: '2010-friends', x: 0.665, y: 0.725, w: 0.17, depth: 0.725, foot: true }],
  stuckHe: 'הקיוסק משמאל, הסמטה למגרש באמצע. מימין לחומה — הרחוב הצדדי: למרכז, לבית הספר, ומזרחה.',
}

// ============================================== התחנה המרכזית · busStation20 · 2017– ===
/**
 * רציף האוטובוסים של האוהדים, 2017–2026 (`busStation20`, 27.9.2026) — אותו רציף של 1996,
 * אותה מצלמה, אבל ציור 16:9: הרציף מתחיל גבוה יותר במסגרת ומתחתיו רואים את הכביש.
 *
 * נמדד: האוטובוס (כ-3.2 מ׳) מהגג 0.16 עד הגלגלים 0.54, הספסל (מושב 0.45 מ׳) 0.50 → 0.555 —
 * שניהם 0.12–0.125 למטר על 0.545. האופק 0.43, בסיס הרציפים הרחוקים. מטר = 1.087 × (y − 0.43).
 * הרצועה היא הרציף עצמו, מלפני הספסל עד השפה האדומה-לבנה (0.58–0.665, רמפה 1.57).
 * דלת האוטובוס (0.30–0.40) היא הדלת לשדה התעופה, כמו בציור הישן.
 */
export const BUS_STATION_2017: Repaint = {
  in: (chapter) => yearOfChapter(chapter) >= 2017,
  art: 'busStation20',
  band: { far: 0.58, near: 0.665 },
  size: { far: 0.212, near: 0.3321 },
  metre: 0.2555,
  spawns: { start: { x: 0.2, y: 0.63, facing: 'right' } },
  doors: {
    back: { x: 0, y: 0.58, w: 0.06, h: 0.085, light: { x: 0.0, y: 0.47, w: 0.05, h: 0.19, tone: 'daylight' } },
    flight: { x: 0.3, y: 0.58, w: 0.09, h: 0.025, light: { x: 0.305, y: 0.235, w: 0.09, h: 0.28, tone: 'inside' } },
  },
  stuckHe: 'רציף. האוטובוס משמאל, הדלת פתוחה. חזרה לשכונה — בקצה השמאלי.',
}

// ================================================================= חדרים חדשים ===

/** the neighbourhood's way out (the street's x 0.872 slot): every room below comes back to it */
const BACK_TO_STREET = (labelHe: string, zone: Pick<ExitDef, 'x' | 'y' | 'w' | 'h'>, light: ExitDef['light']): ExitDef => ({
  id: 'out',
  ...zone,
  to: 'street',
  spawn: 'fromBus',
  labelHe,
  light,
  dwellMs: 600,
})

export const NEW_ROOMS: SceneDef[] = [
  /**
   * אולם אימון שכור, 2007 — U04 *"מי פותח מחר"* ו-U05 *"עלינו. יש מי שיסגור?"*.
   *
   * אוסישקין נהרס חודש קודם (U03); הקבוצה החדשה מתאמנת באולם של מישהו אחר. נמדד: הדלת
   * הכפולה מימין (2.2 מ׳) מ-0.3 ל-0.51, טבעת הסל על 0.25 — אופק 0.358.
   */
  {
    id: 'hall-new',
    titleHe: 'אולם האימונים',
    art: 'hallNew',
    band: { far: 0.63, near: 0.84 },
    size: { far: 0.221, near: 0.3916 },
    metre: 0.3012,
    ambience: 'hall',
    stuckHe: 'הדלתות החוצה — מימין.',
    spawns: { start: { x: 0.75, y: 0.76, facing: 'left' } },
    actors: [],
    hotspots: [
      // U04 — the key on the bench by the wall bars (seat 0.474, legs on 0.52; a hall this size
      // is 0.10 of the frame to the metre there, so a bunch of keys is a glint)
      look('hallnew-key', years(2007, 2009), 0.12, 0.66, 0.08, 'המפתח של האולם', { key: 'propKeys', size: 0.016, at: { x: 0.1, y: 0.476 } }),
      look('hallnew-balls', years(2007, 2009), 0.34, 0.66, 0.08, 'כלוב הכדורים'),
      // 2007-key — נקודת ההוכחה של הייסוד (ראה חדר הקהילה), אחרי שנעשתה עבודה
      { id: 'proof-found-key', era: ['2007-key'], x: 0.42, y: 0.74, w: 0.09, act: 'route-proof-found', verb: 'look', labelHe: 'הציוד, לפני מחר', when: { flag: 'u:hands' } },
      // U04 — המסירה: להראות לענבל (אחרי `kit-07`), או לתלות את הרשימה ליד הדלתות (אחרי `labels-07`)
      { id: 'u-show', era: ['2007-key'], x: 0.5, y: 0.72, w: 0.08, act: 'u-show', verb: 'hold', labelHe: 'להראות לענבל איפה הכול', when: { all: [{ flagIs: { flag: 'u:keyPlan', value: 'sort' } }, { flag: 'u:sorted' }], none: [{ flag: 'u:key' }] }, priority: 5 },
      // U04 — מה שנבחר ועוד לא נעשה עומד בחדר (Director V3 §7, recovery): הארגזים ליד הדלתות, הדף הריק על הספסל
      { id: 'u-crates', era: ['2007-key'], x: 0.2, y: 0.72, w: 0.08, act: 'u-crates', verb: 'take', labelHe: 'הארגזים ליד הדלתות', when: { all: [{ flagIs: { flag: 'u:keyPlan', value: 'sort' } }], none: [{ flag: 'u:sorted' }, { flag: 'u:key' }] }, priority: 4 },
      { id: 'u-notes', era: ['2007-key'], x: 0.72, y: 0.72, w: 0.08, act: 'u-notes', verb: 'take', labelHe: 'דף ועט, על הספסל', when: { all: [{ flagIs: { flag: 'u:keyPlan', value: 'list' } }], none: [{ flag: 'u:listed' }, { flag: 'u:key' }] }, priority: 4 },
      { id: 'u-pin', era: ['2007-key'], x: 0.8, y: 0.7, w: 0.08, act: 'u-pin', verb: 'hold', labelHe: 'לתלות את הרשימה ליד הדלתות', when: { all: [{ flagIs: { flag: 'u:keyPlan', value: 'list' } }, { flag: 'u:listed' }], none: [{ flag: 'u:key' }] }, priority: 5 },
    ],
    layers: [{ art: 'propBasketball', era: '*', x: 0.395, y: 0.655, w: 0.018, depth: 0.655, foot: true }],
    exits: [
      {
        id: 'out',
        x: 0.86,
        y: 0.63,
        w: 0.12,
        h: 0.08,
        to: 'street',
        spawn: 'fromBus',
        labelHe: 'החוצה, לשכונה',
        light: { x: 0.845, y: 0.3, w: 0.135, h: 0.21, tone: 'daylight' },
        dwellMs: 600,
      },
    ],
  },

  /**
   * הדרייב אין, 2015 — N05 *"הילד לא חייב להתגעגע"*. קונספט לפי תיאור (README החבילה).
   * נמדד: הסל (3.05 מ׳) והדלתות האחוריות (2.1) — אופק 0.47; הרצועה צרה (0.73–0.93)
   * כי זה אולם עמוק, והרמפה לא עוברת 1.8.
   */
  {
    id: 'drive-in',
    titleHe: 'הדרייב אין',
    art: 'driveIn',
    band: { far: 0.73, near: 0.93 },
    size: { far: 0.2113, near: 0.3738 },
    metre: 0.2875,
    ambience: 'hall',
    stuckHe: 'היציאה — הדלתות משמאל.',
    spawns: { start: { x: 0.24, y: 0.82, facing: 'right' } },
    actors: [],
    hotspots: [look('drivein-court', '2015-newhall', 0.6, 0.76, 0.12, 'הפרקט החדש')],
    layers: [
      { art: 'propBasketball', era: '*', x: 0.8, y: 0.745, w: 0.012, depth: 0.745, foot: true },
      // (pass D) 2015 · N05 — what was prepared is there when the doors open: the old banner on
      // the railing over the entrance (0.37 on the board), red flags on the seats to the right
      { art: 'propBanner', era: '2015-newhall', x: 0.12, y: 0.33, w: 0.14, depth: 0.5, when: { flag: 'nr:did:banner' } },
      { art: 'propFlag', era: '2015-newhall', x: 0.84, y: 0.43, w: 0.04, depth: 0.5, when: { flag: 'nr:did:confetti' } },
      { art: 'propFlag', era: '2015-newhall', x: 0.93, y: 0.46, w: 0.035, depth: 0.5, when: { flag: 'nr:did:confetti' } },
    ],
    exits: [
      BACK_TO_STREET('החוצה, הביתה', { x: 0.0, y: 0.73, w: 0.07, h: 0.2 }, { x: 0.05, y: 0.25, w: 0.15, h: 0.3, tone: 'inside' }),
    ],
  },

  /**
   * חדר חזרות, 2013 — N04 *"לא כל החדר באותו קצב"*. מלמד יושב עם הדרבוקה כמו שהוא
   * מצויר מאז 1996, ליד הספה. נמדד: הדלת (2.1) מ-0.04 ל-0.5 — אופק 0.15. נכנסים אליו
   * מאלנבי, במדרגות שמאחורי חלון הסלולר — המרתף של אותו בניין.
   */
  {
    id: 'rehearsal',
    titleHe: 'חדר החזרות',
    art: 'rehearsal',
    band: { far: 0.56, near: 0.8 },
    size: { far: 0.3331, near: 0.5281 },
    metre: 0.4062,
    ambience: 'interior',
    stuckHe: 'הדלת — מימין.',
    spawns: { start: { x: 0.79, y: 0.72, facing: 'left' } },
    actors: [],
    hotspots: [look('rehearsal-drums', '2012-five', 0.47, 0.6, 0.1, 'התופים')],
    layers: [
      // Melamed's darbuka, on the concrete beside him (0.45 m; a metre is 0.29 here)
      { art: 'propDarbuka', era: '2012-five', x: 0.255, y: 0.632, w: 0.055, depth: 0.632, foot: true },
      // on the stool left of the guitar (seat 0.418, feet on 0.50)
      { art: 'propHeadphones', era: '2012-five', x: 0.27, y: 0.418, w: 0.024, depth: 0.5, foot: true },
      // a lead coiled on the concrete, off the rug, by the amp
      { art: 'propCable', era: '2012-five', x: 0.635, y: 0.548, w: 0.045, depth: 0.548, foot: true },
    ],
    exits: [
      {
        id: 'out',
        x: 0.85,
        y: 0.56,
        w: 0.11,
        h: 0.1,
        to: 'allenby',
        spawn: 'fromShop',
        labelHe: 'למעלה, לאלנבי',
        light: { x: 0.865, y: 0.04, w: 0.07, h: 0.46, tone: 'inside' },
        dwellMs: 600,
      },
    ],
  },

  /**
   * מערכת קטנה — J02 *"התיקון נשאר באותו מקום"* ו-Q06 *"מי כותב על הבעלים"*. בקומה
   * השנייה של בניין 96 באלנבי, מעל בית הקפה של J01. נמדד: שולחן 0.4→0.6, משקוף הדלת
   * הימנית 0→0.72 — אופק 0.14, מצלמה 1.7.
   */
  {
    id: 'newsroom',
    titleHe: 'המערכת',
    art: 'deskNewsroom',
    band: { far: 0.64, near: 0.88 },
    size: { far: 0.3824, near: 0.5659 },
    metre: 0.4353,
    ambience: 'interior',
    stuckHe: 'המדרגות למטה — הדלת מימין.',
    spawns: { start: { x: 0.72, y: 0.76, facing: 'left' } },
    actors: [],
    hotspots: [
      look('newsroom-screen', ['2006-desk', '2025-owner'], 0.53, 0.68, 0.1, 'הטיוטה על המסך'),
      look('newsroom-board', ['2006-desk', '2025-owner'], 0.37, 0.67, 0.1, 'הלוח עם הגזרים'),
    ],
    // J02 / Q06 — the reporter's recorder on the desk top (0.40), beside the screen: 0.12 m at
    // a desk whose floor is 0.56, where a metre is 0.25 of the frame
    layers: [{ art: 'propRecorder', era: ['2006-desk', '2025-owner'], x: 0.575, y: 0.402, w: 0.009, depth: 0.56, foot: true }],
    exits: [
      {
        id: 'out',
        x: 0.84,
        y: 0.66,
        w: 0.1,
        h: 0.12,
        to: 'allenby',
        spawn: 'fromDesk',
        labelHe: 'למטה, לאלנבי',
        light: { x: 0.85, y: 0.02, w: 0.07, h: 0.68, tone: 'inside' },
        dwellMs: 600,
      },
    ],
  },

  /**
   * משרד ענף הבעלות, 2025 — O01–O03, *"שולחן עבודה עסקי"*. בדיוני מכאן והלאה, כמו
   * שהפרק אומר בשורה הראשונה שלו. נמדד: שולחן 0.38→0.55, הפתח האחורי 0.1→0.47 — אופק
   * 0.194, מצלמה 1.57.
   */
  {
    id: 'office',
    titleHe: 'המשרד',
    art: 'officeOwner',
    band: { far: 0.6, near: 0.84 },
    size: { far: 0.3362, near: 0.5349 },
    metre: 0.4115,
    ambience: 'interior',
    stuckHe: 'הדלת החוצה — משמאל.',
    spawns: { start: { x: 0.2, y: 0.72, facing: 'right' } },
    actors: [],
    hotspots: [
      // (pass D) while the seller's hour runs, the board and the window are the triangle's (`questsPassD.ts`)
      look('office-board', '2025-owner', 0.42, 0.62, 0.1, 'הלוח עם המספרים', undefined, { any: [{ notFlag: 'o:brief' }, { flag: 'o:verdict' }] }),
      look('office-window', '2025-owner', 0.87, 0.66, 0.08, 'החלון', undefined, { any: [{ notFlag: 'o:brief' }, { flag: 'o:verdict' }] }),
    ],
    exits: [
      {
        ...BACK_TO_STREET('החוצה', { x: 0.0, y: 0.6, w: 0.08, h: 0.22 }, { x: 0.005, y: 0.0, w: 0.08, h: 0.6, tone: 'inside' }),
        // (pass D) 2025 · O02 — the seller wants an answer by eight, and nobody leaves the room before it
        needs: { any: [{ notFlag: 'o:brief' }, { flag: 'o:verdict' }] },
        blockedHe: 'עד שמונה אתה פה. המוכר מחכה לתשובה, לא לך.',
      },
    ],
  },

  /**
   * חדר קהילה — U01 *"שולחן קהילה"*, U02, P03 *"מפגש קהילתי"*, Z03 *"מפגש אוהדים"*.
   * שולחן ארוך, לוח שעם, קומקום. שתי דלתות: שמאל לרחוב, ימין למחסן. נמדד: חלון (סף
   * 1.0 מ׳, משקוף 2.3) על הקיר האחורי, שולחן 0.415→0.59 — אופק 0.232, מצלמה 1.75.
   */
  {
    id: 'community-room',
    titleHe: 'חדר הקהילה',
    art: 'communityRoom',
    band: { far: 0.63, near: 0.9 },
    size: { far: 0.2957, near: 0.4962 },
    metre: 0.3817,
    ambience: 'interior',
    stuckHe: 'החוצה — הדלת משמאל. המחסן — מימין.',
    spawns: { start: { x: 0.22, y: 0.76, facing: 'right' }, fromStore: { x: 0.8, y: 0.76, facing: 'left' } },
    actors: [],
    hotspots: [
      look('community-board', '*', 0.6, 0.65, 0.1, 'לוח השעם'),
      look('community-kettle', '*', 0.74, 0.66, 0.07, 'הקומקום'),
      /**
       * 2007 (LIFE 90-D) — נקודת ההוכחה של הייסוד, אחת בכל פרק (`FOUNDING_CHAPTERS` ב-`scenes.ts`),
       * בחדר של הפרק ולא בקיוסק/באלנבי שבהם ישבה עד שהחדר צויר — ורק **אחרי** שנעשתה בו
       * עבודה בידיים (`u:hands`; ב-U02 — המסירה ליוסף, `u:did`): *"הסצנה מאשרת את התרומה בפועל"* (`USSISHKIN_FOUNDER.apex`).
       */
      { id: 'proof-found-table', era: ['2007-table'], x: 0.3, y: 0.8, w: 0.09, act: 'route-proof-found', verb: 'look', labelHe: 'מה שצריך עד מחר', when: { flag: 'u:hands' } },
      { id: 'proof-found-registered', era: ['2007-registered'], x: 0.56, y: 0.8, w: 0.09, act: 'route-proof-found', verb: 'look', labelHe: 'מה שהבטחת למסור', when: { flag: 'u:did' } },
      // U02 — הדף עם המספרים: שיחה בכל לחיצה (`u-calls`), ואז ביד ליוסף (`u-list`)
      { id: 'u-phone', era: ['2007-registered'], x: 0.28, y: 0.8, w: 0.08, act: 'u-calls', verb: 'take', labelHe: 'הדף עם המספרים', when: { all: [{ flag: 'u:calls' }], none: [{ flag: 'u:deliver' }] }, priority: 4 },
      { id: 'u-hand', era: ['2007-registered'], x: 0.4, y: 0.76, w: 0.08, act: 'u-list', verb: 'hold', labelHe: 'לתת ליוסף את הרשימה', when: { all: [{ flag: 'u:adapted' }], none: [{ flag: 'u:deliver' }] }, priority: 5 },
    ],
    // (21.9.2026) no paper on the table: a sheet drawn from above stands upright in a room
    // seen from the side, and read as a sign held up between the chairs
    exits: [
      BACK_TO_STREET('החוצה, לשכונה', { x: 0.02, y: 0.63, w: 0.1, h: 0.14 }, { x: 0.045, y: 0.08, w: 0.07, h: 0.5, tone: 'daylight' }),
      {
        id: 'store',
        x: 0.88,
        y: 0.63,
        w: 0.1,
        h: 0.14,
        to: 'storeroom',
        spawn: 'start',
        labelHe: 'למחסן',
        light: { x: 0.915, y: 0.08, w: 0.065, h: 0.47, tone: 'inside' },
        dwellMs: 600,
      },
    ],
  },

  /**
   * מחסן ציוד קהילתי — Q03 *"שתי חולצות באותו תיק"*. כדורים ברשתות, קונוסים, דגל
   * מגולגל: הציוד של הקבוצה והציוד של היציע על אותם מדפים. נמדד: הדלת הכפולה (2.2)
   * מ-0.17 ל-0.5 — אופק 0.257; הרצפה צרה בעומק, ולכן הרצועה מתחילה ב-0.64.
   */
  {
    id: 'storeroom',
    titleHe: 'המחסן',
    art: 'storeroom',
    band: { far: 0.64, near: 0.9 },
    size: { far: 0.3112, near: 0.5224 },
    metre: 0.4018,
    ambience: 'interior',
    stuckHe: 'חזרה — הדלת בקצה.',
    spawns: { start: { x: 0.5, y: 0.8, facing: 'left' } },
    actors: [],
    hotspots: [
      look('store-shelves', '*', 0.2, 0.74, 0.1, 'המדפים'),
      // U01, תפעול — לספור בידיים מה יש ומה אין (`u-shelves` → `chore:story:count-07`)
      { id: 'u-shelves', era: ['2007-table'], x: 0.3, y: 0.8, w: 0.1, act: 'u-shelves', verb: 'take', labelHe: 'המדפים — מה יש, ומה חסר', when: { all: [{ flagIs: { flag: 'u:roleKind', value: 'operations' } }], none: [{ flag: 'u:counted' }] }, priority: 4 },
    ],
    exits: [
      {
        id: 'out',
        x: 0.42,
        y: 0.64,
        w: 0.15,
        h: 0.06,
        to: 'community-room',
        spawn: 'fromStore',
        labelHe: 'חזרה לחדר',
        light: { x: 0.405, y: 0.17, w: 0.17, h: 0.33, tone: 'inside' },
        dwellMs: 600,
      },
    ],
  },

  /**
   * הסדנה של לירון, 2006 — H03 *"הקו תפוס"*. מאחורי חלון הסלולר באלנבי, והתריס פתוח
   * לרחוב. על השולחן טרנזיסטור פתוח: *"פעם היית בא עם רדיו"* — ורדיו הוא מה שמונח
   * שם. נמדד: שולחן עבודה (0.9) מ-0.39 ל-0.6 — אופק 0.227.
   */
  {
    id: 'workshop',
    titleHe: 'הסדנה של לירון',
    art: 'workshopFix',
    band: { far: 0.64, near: 0.9 },
    size: { far: 0.3356, near: 0.5468 },
    metre: 0.4206,
    ambience: 'interior',
    stuckHe: 'החוצה — התריס משמאל.',
    spawns: { start: { x: 0.22, y: 0.78, facing: 'right' } },
    actors: [],
    hotspots: [
      look('workshop-radio', '2006-home', 0.45, 0.7, 0.08, 'הטרנזיסטור הפתוח', { key: 'propRadio', size: 0.05, at: { x: 0.445, y: 0.392 } }),
      look('workshop-phones', '2006-home', 0.64, 0.7, 0.08, 'הטלפונים בשורה'),
    ],
    exits: [
      {
        id: 'out',
        x: 0.0,
        y: 0.64,
        w: 0.1,
        h: 0.2,
        to: 'allenby',
        spawn: 'fromShop',
        labelHe: 'החוצה, לאלנבי',
        light: { x: 0.005, y: 0.2, w: 0.16, h: 0.4, tone: 'daylight' },
        dwellMs: 500,
      },
    ],
  },

  /**
   * נמל הגעה באירופה — F02 *"המפתח בכיס שלך"*, ו-E05 *"בסוף צריך למצוא את האוטובוס"*.
   * האוטובוס עומד מחוץ לדלתות הזכוכית, בציור עצמו. נמדד: הדלתות (2.4) מ-0.13 ל-0.49.
   */
  {
    id: 'port-europe',
    titleHe: 'נמל ההגעה',
    art: 'portEurope',
    band: { far: 0.58, near: 0.84 },
    size: { far: 0.2681, near: 0.4794 },
    metre: 0.3688,
    ambience: 'station',
    stuckHe: 'האוטובוס — מחוץ לדלתות הזכוכית.',
    spawns: { start: { x: 0.3, y: 0.72, facing: 'right' } },
    actors: [],
    hotspots: [look('port-board', '*', 0.21, 0.62, 0.1, 'לוח היציאות')],
    layers: [
      // "שני תיקים" — F02's own narration; by the seats, where two people put them down.
      // A shoulder bag is ~0.4 m; a metre on this floor at 0.60 is 0.123 of the width
      // (0.3688 × taper 0.593 × 9/16), so 0.048 — at 0.03 they read as a pair of shoes
      { art: 'propSportsBag', era: '2026-finale', x: 0.35, y: 0.6, w: 0.074, depth: 0.6, foot: true },
      { art: 'propBagStrap90', era: '2026-finale', x: 0.415, y: 0.605, w: 0.045, depth: 0.605, foot: true, flip: true },
    ],
    exits: [
      {
        id: 'bus',
        era: '2026-finale',
        x: 0.56,
        y: 0.58,
        w: 0.18,
        h: 0.07,
        to: 'arena-out',
        spawn: 'start',
        labelHe: 'לאוטובוס, לבוטבגרד',
        light: { x: 0.56, y: 0.13, w: 0.17, h: 0.36, tone: 'daylight' },
        needs: { flag: 'f:road' },
        blockedHe: 'קודם הכרטיסים. קובי מחזיק אותם.',
        dwellMs: 700,
      },
      {
        // E05 — *"בסוף צריך למצוא את האוטובוס"*: אותן דלתות, והאוטובוס הביתה
        id: 'busHome',
        era: '2002-europe',
        x: 0.56,
        y: 0.58,
        w: 0.18,
        h: 0.07,
        to: 'street',
        spawn: 'fromBus',
        labelHe: 'לאוטובוס, הביתה',
        light: { x: 0.56, y: 0.13, w: 0.17, h: 0.36, tone: 'daylight' },
        dwellMs: 700,
      },
      {
        // מי שגר שם: מהטרמינל הביתה, לדירה (`flat-abroad`)
        id: 'flat',
        era: ['2023-abroad', '2025-abroad'],
        x: 0.56,
        y: 0.58,
        w: 0.18,
        h: 0.07,
        to: 'flat-abroad',
        spawn: 'start',
        labelHe: 'הביתה, לדירה',
        light: { x: 0.56, y: 0.13, w: 0.17, h: 0.36, tone: 'daylight' },
        dwellMs: 700,
      },
      {
        /**
         * הדלת הימנית — טיסה חזרה לתל אביב, בכל שנה. חדר בלי דלת בשנה כלשהי הוא באג (כלל
         * 41, `tests/life-1990`): גם כשהנמל הוא רק תחנה בדרך, אפשר לחזור ממנו הביתה, והדלת
         * `flight` בתחנה המרכזית מחזירה אליו בשנים שיש בהן אליו דרך.
         */
        id: 'home',
        x: 0.92,
        y: 0.58,
        w: 0.08,
        h: 0.12,
        to: 'street',
        spawn: 'fromBus',
        labelHe: 'טיסה חזרה הביתה',
        light: { x: 0.925, y: 0.1, w: 0.075, h: 0.4, tone: 'daylight' },
        /**
         * 2010 (27.9.2026, `city2027/europe2010.ts`) — the flight home waits for the evening
         * he flew out for: the match is behind the glass doors, not behind this one.
         */
        needsByEra: {
          '2010-qualify': { none: [{ all: [{ flagIs: { flag: 'c10:tripTo', value: 'salzburg' } }], none: [{ flag: 'c10:salzDone' }] }] },
          '2010-anthem': {
            none: [
              { all: [{ flagIs: { flag: 'life:trip2010', value: 'lisbon' } }], none: [{ flag: 'c10:debut' }] },
              { all: [{ flagIs: { flag: 'life:trip2010', value: 'lyon' } }, { flag: 'c10:benfica' }], none: [{ flag: 'c10:lyon' }] },
            ],
          },
        },
        blockedByEra: { '2010-qualify': 'המשחק עוד לפניך — האוטובוס לאצטדיון בדלתות הזכוכית.', '2010-anthem': 'המשחק עוד לפניך — האוטובוס לאצטדיון בדלתות הזכוכית.' },
        dwellMs: 900,
      },
    ],
  },

  /**
   * מחוץ לאולם בבוטבגרד — F03 *"מחוץ לאולם"* ו-F04 *"מחוץ לאולם, אחרי המשחק"*.
   * מ-27.9.2026 הציור הוא `botevgradOut2026`: האולם עצמו, עם השלט **АРЕНА БОТЕВГРАД** מעל
   * הכניסה — לא עוד הקונספט הכללי בלי שם (`arenaEuroOut`). אותה מצלמה (נבדק בלוח): הדלתות
   * (2.4) 0.345–0.5 ומתקני האופניים (0.8) על 0.5 — אופק 0.404, וכל מספר כאן נשאר.
   */
  {
    id: 'arena-out',
    titleHe: 'מחוץ לאולם בבוטבגרד',
    art: 'botevgradOut2026',
    band: { far: 0.69, near: 0.9 },
    size: { far: 0.2324, near: 0.403 },
    metre: 0.31,
    ambience: 'dusk',
    stuckHe: 'הכניסה לאולם — באמצע, מתחת לגגון.',
    spawns: { start: { x: 0.14, y: 0.8, facing: 'right' }, fromSeats: { x: 0.5, y: 0.8, facing: 'left' } },
    actors: [],
    hotspots: [],
    exits: [
      {
        id: 'in',
        x: 0.42,
        y: 0.69,
        w: 0.16,
        h: 0.06,
        to: 'arena-seats',
        spawn: 'start',
        labelHe: 'פנימה, למושבים',
        light: { x: 0.33, y: 0.33, w: 0.35, h: 0.17, tone: 'inside' },
        needs: { flag: 'f:seats' },
        blockedHe: 'קובי עוד לא זז. היום אתה מוביל — תגיד לו.',
        dwellMs: 700,
      },
      {
        id: 'bus',
        x: 0.0,
        y: 0.69,
        w: 0.05,
        h: 0.21,
        to: 'port-europe',
        spawn: 'start',
        labelHe: 'חזרה לאוטובוס',
        light: { x: 0.0, y: 0.42, w: 0.04, h: 0.08, tone: 'daylight' },
        dwellMs: 900,
      },
    ],
  },

  /**
   * מהמושבים באותו אולם — F03 *"ובמושבים"*. מ-27.9.2026 `botevgradSeats2026`: האולם
   * בבוטבגרד, עם השם על הקיר והסמל מעל היציע. אותה מצלמה: טבעת (3.05) מ-0.28 ל-0.4 —
   * אופק 0.36. הרצועה היא המעבר מאחורי השורה העליונה; הדלת מימין (0.905–0.955).
   */
  {
    id: 'arena-seats',
    titleHe: 'המושבים בבוטבגרד',
    art: 'botevgradSeats2026',
    band: { far: 0.72, near: 0.94 },
    size: { far: 0.2925, near: 0.4713 },
    metre: 0.3625,
    ambience: 'hall',
    stuckHe: 'היציאה — הדלת מימין.',
    spawns: { start: { x: 0.8, y: 0.8, facing: 'left' } },
    actors: [],
    hotspots: [look('seats-court', '2026-finale', 0.36, 0.76, 0.12, 'המגרש מלמעלה')],
    exits: [
      {
        id: 'out',
        x: 0.9,
        y: 0.72,
        w: 0.1,
        h: 0.22,
        to: 'arena-out',
        spawn: 'fromSeats',
        labelHe: 'החוצה',
        light: { x: 0.905, y: 0.12, w: 0.05, h: 0.4, tone: 'inside' },
        dwellMs: 700,
      },
    ],
  },

  /**
   * הדירה בחו״ל — X02, X03, X05, Q05. ערב, מנורה אחת, טלוויזיה ישנה שבאה עם הדירה.
   *
   * נמדד: הדלת (2.1 מ׳) מ-0.05 ל-0.58, שולחן נמוך (0.45) מ-0.44 ל-0.55 — אופק 0.177.
   * הקופסה האדומה על השידה, מימין לטלוויזיה (0.755–0.79, המשטח ב-0.397): היא טסה איתו.
   *
   * **הדלת היא לשדה התעופה.** "העיר" שם אינה מצוירת, ומסדרון לשום מקום הוא לא דלת. מה
   * שכן מצויר הוא הדרך: הדירה ← נמל ההגעה ← הבית בתל אביב, ובחזרה דרך התחנה המרכזית
   * (`flight`). הערב עצמו קורה בדירה ונגמר בה (`x-close`, `x-reunion`).
   */
  {
    id: 'flat-abroad',
    titleHe: 'הדירה שם',
    art: 'flatAway',
    band: { far: 0.62, near: 0.84 },
    size: { far: 0.3599, near: 0.5387 },
    metre: 0.4144,
    ambience: 'interior',
    stuckHe: 'הטלפון על השולחן. הערב הזה בבית.',
    spawns: { start: { x: 0.44, y: 0.72, facing: 'right' } },
    actors: [],
    hotspots: [
      look('abroad-tv', ['2023-abroad', '2025-abroad'], 0.72, 0.64, 0.07, 'הטלוויזיה'),
      look('abroad-door', ['2023-abroad', '2025-abroad'], 0.9, 0.64, 0.08, 'הדלת'),
      // X02 — "הטלפון על השולחן הנמוך", and X05's "המצגת עוד פתוחה על המחשב": the low table
      // (top 0.445, legs on 0.56; a metre is 0.24 of the frame there)
      look('abroad-phone', ['2023-abroad', '2025-abroad'], 0.56, 0.66, 0.06, 'הטלפון', { key: 'propPhone2020', size: 0.024, at: { x: 0.56, y: 0.447 } }),
      look('abroad-laptop', '2023-abroad', 0.49, 0.66, 0.06, 'המחשב', { key: 'propLaptop', size: 0.05, at: { x: 0.495, y: 0.447 } }),
      {
        id: 'redbox-abroad',
        era: ['2023-abroad', '2025-abroad'],
        x: 0.78,
        y: 0.66,
        w: 0.06,
        act: 'redbox-abroad',
        verb: 'look',
        labelHe: 'הקופסה האדומה',
        prop: { key: 'propRedBox', size: 0.032, at: { x: 0.775, y: 0.397 } },
      },
    ],
    // the scarf he took (X01: "הצעיף, מקופל בין חולצות") — over the back of the sofa
    layers: [{ art: 'propScarfRed', era: ['2023-abroad', '2025-abroad'], x: 0.3, y: 0.365, w: 0.1, depth: 0.5, foot: true, flip: true }],
    exits: [
      {
        id: 'out',
        x: 0.84,
        y: 0.62,
        w: 0.13,
        h: 0.1,
        to: 'port-europe',
        spawn: 'start',
        labelHe: 'לשדה התעופה',
        light: { x: 0.848, y: 0.05, w: 0.115, h: 0.53, tone: 'inside' },
        dwellMs: 900,
      },
    ],
  },
]

// ============================================================= מי עומד איפה ===

/**
 * הצבה, חדר-חדר. כל שורה נכתבה מול השיחה שהיא משרתת (הביט בסוגריים) ומול הציור — ה-`x`
 * בין הרהיטים, ה-`y` בתוך הרצועה של אותו ציור באותה שנה.
 */
export const STAGED: Partial<Record<LocationId, ActorDef[]>> = {
  // ------------------------------------------ טדי ואירופה 2010 (27.9.2026) ----
  // `city2027/europe2010.ts` — the away ends. Everyone stands on the walkway, left of the
  // point where the rail recedes into the band (x ≤ 0.8), clear of the spawn at 0.1.
  teddy: [
    // D06–D08 — the ones who came: Ofir (by car or by bus), Metuki (the same), Amit with the phone
    ...cast('2010-teddy', { all: [{ flag: 'd10:road' }], none: [{ flag: 'd10:chaos' }] }, [
      { who: 'מתוקי', x: 0.47, y: 0.89 },
      { who: 'עמית', x: 0.66, y: 0.83, flip: true },
    ]),
    ...cast('2010-teddy', flag('d10:road'), [{ who: 'אופיר', x: 0.56, y: 0.86, flip: true }]),
    // D08 — after the chaos Oli comes up from the car park to collect his list
    ...cast('2010-teddy', flag('d10:chaos'), [{ who: 'אולי', x: 0.3, y: 0.88 }]),
    // the away end itself: people who are not in the story, and more of them after the whistle
    ...cast('2010-teddy', flag('d10:road'), [
      { who: 'אוהד', x: 0.76, y: 0.82, figure: 'adultA3', flip: true },
      { who: 'אוהד', x: 0.24, y: 0.82, figure: 'adultA5' },
    ]),
    ...cast('2010-teddy', flag('d10:call'), [
      { who: 'אוהד', x: 0.38, y: 0.94, figure: 'youngA4' },
      { who: 'אוהד', x: 0.71, y: 0.95, figure: 'youngB4' },
    ]),
  ],
  'away-salzburg': [
    // C01b — Ofir chose his city before the draw, and this was it
    ...cast('2010-qualify', { flagIs: { flag: 'c10:tripTo', value: 'salzburg' } }, [
      { who: 'אופיר', x: 0.7, y: 0.82, flip: true },
      { who: 'אוהד', x: 0.78, y: 0.86, figure: 'adultA3', flip: true },
      { who: 'אוהד', x: 0.36, y: 0.8, figure: 'youngA4' },
    ]),
  ],
  'away-lisbon': [
    // C03 away — Roma who arranged it, Ofir who would not miss it; Amit is on the phone
    ...cast('2010-anthem', { flagIs: { flag: 'life:trip2010', value: 'lisbon' } }, [
      { who: 'רומא', x: 0.58, y: 0.87, flip: true },
      { who: 'אופיר', x: 0.67, y: 0.9, flip: true },
      { who: 'אוהד', x: 0.46, y: 0.86, figure: 'adultA5' },
      { who: 'אוהד', x: 0.76, y: 0.94, figure: 'youngA4', flip: true },
    ]),
  ],
  'away-lyon': [
    // C07 away — Roma under the cloth; Amit and Ofir call from the living room
    ...cast('2010-anthem', { flagIs: { flag: 'life:trip2010', value: 'lyon' } }, [
      { who: 'רומא', x: 0.55, y: 0.85, flip: true },
      { who: 'אוהד', x: 0.66, y: 0.88, figure: 'adultA3', flip: true },
      { who: 'אוהד', x: 0.2, y: 0.92, figure: 'youngA4' },
    ]),
  ],
  home: [
    // 2000-bridge · B00 (b-home) — רחל בסלון, לפני שקובי חוזר
    ...cast('2000-bridge', undefined, [{ who: 'רחל', x: 0.3, y: 0.9, figure: 'rachel90' }]),
    // 2002-europe · E01 (e-chelsea) — מול הטלוויזיה של ההורים
    ...cast('2002-europe', undefined, [
      { who: 'אופיר', x: 0.24, y: 0.88, figure: 'ofir90-arms' },
      { who: 'עמית', x: 0.42, y: 0.93, flip: true },
    ]),
    // 2010-anthem · C03 (c10-debut), C07 (c10-lyon)
    ...cast('2010-anthem', undefined, [
      { who: 'אופיר', x: 0.24, y: 0.88 },
      { who: 'עמית', x: 0.42, y: 0.93, flip: true },
      { who: 'רומא', x: 0.56, y: 0.86, flip: true, when: flag('c10:benfica') },
    ]),
    // 2010-teddy · D05 (kobi) — "תשב כבר. אתה מסתיר עוד לפני שהתחיל." — מי שנשאר לראות עם אבא
    // מוצא אותו בכורסה שלו (LIFE 90-D: אנשים בחדרים שבהם הסיפור אומר שהם נמצאים)
    ...cast('2010-teddy', { flagIs: { flag: 'd10:mode', value: 'home' } }, [{ who: 'קובי', x: 0.19, y: 0.74, figure: 'kobi90-sitA' }]),
    // 2012-cups · N01 (n-cups) — קובי בכורסה שלו, רחל
    ...cast('2012-cups', undefined, [
      { who: 'קובי', x: 0.19, y: 0.74, figure: 'kobi90-sitA' },
      { who: 'רחל', x: 0.3, y: 0.9 },
    ]),
    // 2015-newhall · N06 (nr-route) — "מאיפה יוצאים?", בכורסה
    ...cast('2015-newhall', flag('nr:hall'), [{ who: 'קובי', x: 0.19, y: 0.74, figure: 'kobi90-sitA' }]),
    // 2017-after · P06 (p-choice)
    ...cast('2017-after', flag('p:amit'), [{ who: 'קובי', x: 0.19, y: 0.74, figure: 'kobi90-sitB' }]),
    // 2019-armchair · A01 (a-remote) — "סלון קובי": השלט אצלו
    ...cast('2019-armchair', undefined, [{ who: 'קובי', x: 0.19, y: 0.74, figure: 'kobi90-sitA' }]),
    // (pass D) A02 — Rachel in the doorway with an empty basket (`a-interrupt`)
    ...cast('2019-armchair', { flagIs: { flag: 'a:how', value: 'watch' } }, [{ who: 'רחל', x: 0.42, y: 0.84 }]),
    // 2021-suitcase · X01 (x-suitcase) — אצל אבא ואמא, ערב לפני
    ...cast('2021-suitcase', undefined, [
      { who: 'קובי', x: 0.6, y: 0.86, flip: true },
      { who: 'רחל', x: 0.3, y: 0.9 },
    ]),
    // 2026-plan · F01 (f-plan) — "אבא ביקש לראות את התוכנית"
    ...cast('2026-plan', flag('f:money'), [{ who: 'קובי', x: 0.19, y: 0.74, figure: 'kobi90-sitA' }]),

    // ---- הבית של פוגי (homeAdult) — הרצועה 0.55–0.8
    // 2013-household · L04 (hh-diary) ליד המקרר, L05 (hh-parent)
    ...partner('2013-household', undefined, { x: 0.33, y: 0.58 }),
    ...cast('2013-household', undefined, [{ who: 'קרן', x: 0.33, y: 0.58, when: { notFlag: 'life:partner' } }]),
    // 2017-distance · K02 (k-life) — עברה לטיילת (27.9.2026): ראה `promenade` למטה
    // 2021-promises · L07 (pr-first), L08 (pr-promise), Q07 (q-week)
    ...cast('2021-promises', undefined, [
      { who: 'הילד', x: 0.44, y: 0.64, when: flag('life:child') },
      { who: 'קובי', x: 0.67, y: 0.6, flip: true, when: flag('life:child') },
    ]),
    ...partner('2021-promises', undefined, { x: 0.33, y: 0.58 }),
    // ...ובלי בן/בת זוג, L08 היא שיחה עם קרן — *"קרן חברה לשיחה, לא בת זוג אוטומטית"*
    ...cast('2021-promises', { notFlag: 'life:partner' }, [{ who: 'קרן', x: 0.33, y: 0.58 }]),
    // 2023-quiet · Z04 (z-aid) — "מאיה כתבה": היא בטלפון, והבית ריק; Z05 (z-again) — קובי בא
    ...cast('2023-quiet', flag('z:aid'), [{ who: 'קובי', x: 0.3, y: 0.6 }]),
    // 2024-home · H24c (h24-night, h24-with-kobi, h24-after) — קובי אצלו בערב של אחד־עשר בינואר
    ...cast('2024-home', flag('h24:concern'), [{ who: 'קובי', x: 0.3, y: 0.6 }]),
    // 2025-eurocup · Z06 (z-euro) — הקלסר על השולחן
    ...cast('2025-eurocup', undefined, [
      { who: 'אפי', x: 0.31, y: 0.6 },
      { who: 'יוסף', x: 0.42, y: 0.57, flip: true },
      { who: 'מתוקי', x: 0.67, y: 0.61, flip: true },
    ]),
    // 2025-owner · O04 (o-sign) — "אמרת שהערב הזה שלנו"; עמית בטלפון
    ...partner('2025-owner', flag('o:moneyGo'), { x: 0.67, y: 0.6, flip: true }),
    ...cast('2025-owner', { all: [{ flag: 'o:moneyGo' }, { notFlag: 'life:partner' }] }, [{ who: 'קרן', x: 0.67, y: 0.6, flip: true }]),
  ],

  bedroom: [
    // 2000-bridge · B01 (b-box) — "את זה שמרת?", ליד הארון
    ...cast('2000-bridge', flag('b:night'), [{ who: 'קובי', x: 0.74, y: 0.72, flip: true, figure: 'kobi90-arms' }]),
  ],

  kitchen: [
    // 2002-europe · E03 (e-trip) — "דרכון בפעם הראשונה", שולחן המטבח
    ...cast('2002-europe', flag('e:beds'), [
      { who: 'רחל', x: 0.44, y: 0.8, figure: 'rachel90-3q' },
      { who: 'קובי', x: 0.785, y: 0.7, figure: 'kobi90-paper', flip: true },
    ]),
    // 2010-teddy · D09 (d10-morning) — "אכלת משהו?"
    ...cast('2010-teddy', flag('d10:back'), [{ who: 'רחל', x: 0.44, y: 0.8, figure: 'rachel90-apron' }]),
  ],

  kiosk: [
    // רפי מאחורי הדלפק, כל עוד הקיוסק שלו — 2000 עד 2012 (B02 הוא הפעם האחרונה שהוא מדבר)
    ...years(2000, 2012).map((era) => ({
      id: `${era}-rafi`,
      era,
      // standing in his own shop, arms folded. `oldMan-lean` is a man cut at the waist
      // leaning on a counter, and a floor-anchored actor drew it as a torso a metre and
      // seventy tall; `oldMan-stool` sat on nothing — the kiosk has no stool in it
      figure: 'oldMan-arms',
      x: 0.5,
      y: 0.8,
      nameHe: 'רפי',
      sway: 0.003,
    })),
    // 2000-bridge · B02 (b-kiosk)
    ...cast('2000-bridge', flag('b:box'), [{ who: 'עמית', x: 0.61, y: 0.87, flip: true }]),
    // 2000-team · Y02 (y-guest) — until the match; after it he is outside with the rest
    ...cast('2000-team', { all: [{ flag: 'y:name' }, { notFlag: 'y:match' }] }, [{ who: 'מתוקי', x: 0.26, y: 0.86 }]),
    // 2010-cup · D02 (d10-math)
    ...cast('2010-cup', flag('d10:photo'), [
      { who: 'עמית', x: 0.3, y: 0.87 },
      { who: 'אופיר', x: 0.61, y: 0.88, flip: true },
      { who: 'קובי', x: 0.16, y: 0.84 },
    ]),
    // 2010-qualify · C01 (c10-qualify)
    ...cast('2010-qualify', undefined, [
      { who: 'עמית', x: 0.3, y: 0.87 },
      { who: 'אופיר', x: 0.61, y: 0.88, flip: true },
      { who: 'מתוקי', x: 0.87, y: 0.86, flip: true },
    ]),
    // 2011-people · L03 (l-tamar)
    ...cast('2011-people', flag('l:dor'), [{ who: 'תמר', x: 0.61, y: 0.88, flip: true }]),
    // 2016-crisis · P01 (p-news) — "אומרים שאין קבוצה"
    ...cast('2016-crisis', undefined, [
      { who: 'אופיר', x: 0.3, y: 0.87 },
      { who: 'עמית', x: 0.61, y: 0.88, flip: true },
      { who: 'פרדי', x: 0.87, y: 0.86, flip: true },
    ]),
    // 2017-after · P05 (p-amit)
    ...cast('2017-after', undefined, [{ who: 'עמית', x: 0.61, y: 0.88, flip: true }]),
    // 2017-distance · K01 (k-told)
    ...cast('2017-distance', undefined, [{ who: 'אופיר', x: 0.61, y: 0.88, flip: true }]),
    // 2018-return · R01 (r-back)
    ...cast('2018-return', undefined, [{ who: 'אופיר', x: 0.61, y: 0.88, flip: true }]),
    // 2021-losses · R04 (r-cup)
    ...cast('2021-losses', flag('r:indoors'), [
      { who: 'אופיר', x: 0.61, y: 0.88, flip: true },
      { who: 'קובי', x: 0.3, y: 0.86 },
    ]),
    // 2023-quiet · Q08 (q-evening)
    ...cast('2023-quiet', undefined, [{ who: 'אופיר', x: 0.61, y: 0.88, flip: true }]),
    // 2023-visit · X04 (x-visit)
    ...cast('2023-visit', undefined, [
      { who: 'עמית', x: 0.3, y: 0.87 },
      { who: 'אופיר', x: 0.61, y: 0.88, flip: true },
      { who: 'קרן', x: 0.87, y: 0.86, flip: true },
    ]),
    // 2024-home · H24a (h24-rumor, h24-card-done, h24-ask) — הקיוסק, קיץ
    ...cast('2024-home', undefined, [
      { who: 'מתוקי', x: 0.3, y: 0.87 },
      { who: 'עמית', x: 0.47, y: 0.88, flip: true },
      { who: 'אופיר', x: 0.61, y: 0.88, flip: true },
    ]),
    // 2025-eurocup · Z07 (z-up)
    ...cast('2025-eurocup', flag('z:euro'), [{ who: 'קובי', x: 0.3, y: 0.86 }]),
    // 2026-plan · F00 (f-money) — אחרי התקציב קובי הולך הביתה, ומחכה לתוכנית שם (90-E)
    ...cast('2026-plan', undefined, [
      { who: 'עמית', x: 0.61, y: 0.88, flip: true },
      { who: 'קובי', x: 0.3, y: 0.86, when: { notFlag: 'f:money' } },
    ]),
  ],

  pitch: [
    // 2000-team · Y01 (y-name), Y03 (y-train), Y04 (y-match) — אפי ליד השער, "מי עומד בשער"
    ...cast('2000-team', undefined, [
      { who: 'אפי', x: 0.8, y: 0.66, flip: true },
      { who: 'אופיר', x: 0.52, y: 0.74 },
      { who: 'עמית', x: 0.64, y: 0.7, flip: true },
      { who: 'מתוקי', x: 0.38, y: 0.68, when: flag('y:guest') },
    ]),
    // 2010-cup · D01 (d10-photo) — "תעמדו כמו בפעם הקודמת": בשורה, מול המצלמה
    ...cast('2010-cup', undefined, [
      { who: 'מתוקי', x: 0.4, y: 0.7 },
      { who: 'אפי', x: 0.49, y: 0.69 },
      { who: 'אופיר', x: 0.58, y: 0.7, flip: true },
      { who: 'עמית', x: 0.67, y: 0.69, flip: true },
    ]),
    // 2010-friends · I03 (i-lineup)
    ...cast('2010-friends', flag('i:banner'), [
      { who: 'רומא', x: 0.42, y: 0.7 },
      { who: 'מתוקי', x: 0.5, y: 0.74 },
      { who: 'ניקו', x: 0.58, y: 0.68, flip: true },
      { who: 'אופיר', x: 0.7, y: 0.71, flip: true },
    ]),
    // 2016-crisis · P02 (p-till) — הקופה של הקבוצה
    ...cast('2016-crisis', flag('p:news'), [
      { who: 'אופיר', x: 0.46, y: 0.72 },
      { who: 'עמית', x: 0.6, y: 0.7, flip: true },
      { who: 'מתוקי', x: 0.72, y: 0.73, flip: true },
    ]),
    // 2021-promises · L09 (pr-scarf) — "אני רוצה שתבוא לראות אותי"
    ...cast('2021-promises', all('life:child', 'pr:promise'), [{ who: 'הילד', x: 0.52, y: 0.72, flip: true }]),
    // 2023-tournament · Z01 (z-role) — קובי על הקו
    ...cast('2023-tournament', undefined, [
      { who: 'אופיר', x: 0.42, y: 0.71 },
      { who: 'עמית', x: 0.55, y: 0.73, flip: true },
      { who: 'קובי', x: 0.72, y: 0.68, flip: true },
    ]),
    // 2023-tournament · (90-E) מי שענה להודעה — מתוקי בא, אפי מהגדר; והבן, אם נקרא
    ...cast('2023-tournament', flag('z:sub'), [
      { who: 'מתוקי', x: 0.62, y: 0.66, flip: true },
      { who: 'אפי', x: 0.88, y: 0.64, flip: true },
    ]),
    ...cast('2023-tournament', { flagIs: { flag: 'z:sub', value: 'child' } }, [{ who: 'הילד', x: 0.36, y: 0.72 }]),
  ],

  street: [
    // 2000-team · Y05 (y-after) — "שולחן פלסטיק מחוץ לקיוסק": under the striped awning
    // (0.19–0.36), beside the door and not in it (0.185–0.29 is the way in)
    ...cast('2000-team', flag('y:match'), [
      { who: 'אפי', x: 0.105, y: 0.78 },
      { who: 'אופיר', x: 0.305, y: 0.77, figure: 'ofir90-arms' },
      { who: 'עמית', x: 0.34, y: 0.82, flip: true },
      { who: 'מתוקי', x: 0.368, y: 0.755, flip: true },
    ]),
    // ---- from 2010 the street is `street10` (STREET_2010): the pavement is 0.69–0.77, the
    // kiosk's way in 0.225–0.36 and the alley's 0.425–0.525 at the back of it (0.69–0.72), so
    // everybody below stands on the walk band (0.69–0.755) in front of both (27.9.2026)
    // 2010-teddy · D05 (d10-plan) — ליד הרכב של אולי
    ...cast('2010-teddy', undefined, [
      { who: 'אולי', x: 0.29, y: 0.735 },
      { who: 'אופיר', x: 0.5, y: 0.745, flip: true },
      { who: 'עמית', x: 0.67, y: 0.735, flip: true },
    ]),
    // 2010-friends · I02 (i-banner) — beside the blank banner in front of the alley
    ...cast('2010-friends', flag('i:meet'), [
      { who: 'לינה', x: 0.53, y: 0.74, flip: true },
      { who: 'רומא', x: 0.72, y: 0.745, flip: true },
    ]),
    // 2011-people · L02 (l-dor)
    ...cast('2011-people', flag('l:melanie'), [{ who: 'דור', x: 0.56, y: 0.74, flip: true }]),
    // 2019-armchair · A03 (a-saturday) — אילן ובתיה, והסולם
    ...cast('2019-armchair', flag('a:photo'), [
      { who: 'אילן', x: 0.5, y: 0.73 },
      { who: 'בתיה', x: 0.58, y: 0.745, flip: true },
    ]).map(talkTo('בתיה', 'batya-19')),
    // 2026-plan · בתיה (27.9.2026) — השכנה, מול הסמטה, עם קופסה לדרך לבולגריה (`content/batya.ts`)
    ...cast('2026-plan', undefined, [{ who: 'בתיה', x: 0.67, y: 0.745, flip: true }]).map(talkTo('בתיה', 'batya-26')),
    // 2023-quiet · Q08 (q-hall)
    ...cast('2023-quiet', { flag: 'own:route:USSISHKIN_FOUNDER:entry' }, [{ who: 'אפי', x: 0.56, y: 0.74, flip: true }]),
  ],

  allenby: [
    // ההצבה באלנבי (21.9.2026): בין הקשת (0.566–0.624) לדלת בית הקפה, מול הכיסאות האדומים,
    // ומשמאל לגבר מהשולחן (0.862). הוא מגיע משמאל (fromSouth, 0.085) והולך אליהם — לא נוחת
    // בתוכם, וגם לא מסתיר אותם כשהוא חוזר מהקשת (fromNorth, 0.62).
    // 2002-europe · E02 (e-beds)
    ...cast('2002-europe', flag('e:chelsea'), [
      { who: 'מתוקי', x: 0.672, y: 0.75, flip: true },
      { who: 'רומא', x: 0.735, y: 0.785, flip: true },
    ]),
    // 2002-desk · J01 (j-first) — ליד בית הקפה; הדלת למערכת (0.748) פתוחה, אז הם משמאלה
    ...cast('2002-desk', undefined, [
      { who: 'שני', x: 0.665, y: 0.75, flip: true },
      { who: 'עמית', x: 0.715, y: 0.79, flip: true },
    ]),
    // 2010-qualify · C02 (c10-trip)
    ...cast('2010-qualify', flag('c10:qualify'), [{ who: 'רומא', x: 0.7, y: 0.77, flip: true }]),
    // 2010-friends · I01 (i-meet)
    ...cast('2010-friends', undefined, [
      { who: 'רומא', x: 0.672, y: 0.75, flip: true },
      { who: 'לינה', x: 0.735, y: 0.785, flip: true },
      { who: 'ניקו', x: 0.8, y: 0.755, flip: true },
    ]),
    // 2010-anthem · C04 (c10-host)
    ...cast('2010-anthem', flag('c10:debut'), [
      { who: 'מתוקי', x: 0.672, y: 0.75, flip: true },
      { who: 'לינה', x: 0.735, y: 0.785, flip: true },
      { who: 'רומא', x: 0.8, y: 0.755, flip: true },
    ]),
    // 2011-people · L01 (l-melanie)
    ...cast('2011-people', undefined, [{ who: 'מלאני', x: 0.7, y: 0.77, flip: true }]),
    // 2012-five · N02 (n-five)
    ...cast('2012-five', undefined, [
      { who: 'אפי', x: 0.672, y: 0.75, flip: true },
      { who: 'יוסף', x: 0.735, y: 0.785, flip: true },
      { who: 'שחור', x: 0.8, y: 0.755, flip: true },
    ]),
    // 2025-interview · J03 (j-where, j-asked) — בבית הקפה באלנבי; מי שבחר ביפו פוגש אותה בסמטה
    ...cast('2025-interview', { none: [{ flagIs: { flag: 'life:interview:at', value: 'jaffa' } }] }, [{ who: 'מראיינת', x: 0.7, y: 0.77, flip: true }]),
  ],

  schoolyard: [
    // 2021-promises · L09 (pr-saturday) — ליגת ילדים, בחצר של 1991; הוא ליד הגדר (90-E)
    ...cast('2021-promises', { all: [{ flag: 'life:child' }, { any: [{ flagIs: { flag: 'pr:ask', value: 'go' } }, { flagIs: { flag: 'pr:ask', value: 'split' } }] }] }, [{ who: 'הילד', x: 0.6, y: 0.84, flip: true }]),
  ],

  'bloomfield-outside': [
    // 2018-return · R02 (r-signs) — "פה היינו פונים", על הרחבה החדשה
    ...cast('2018-return', flag('r:reopen'), [{ who: 'קובי', x: 0.4, y: 0.86 }]),
  ],

  'bloomfield-inside': [
    // 2010-anthem · C06 (c10-benfica) — שלוש אפס, והפרצוף מ-1986
    ...cast('2010-anthem', flag('c10:call'), [{ who: 'קובי', x: 0.42, y: 0.75 }]),
    // 2024-terrace · T03 (t-lead) — "תראה אותם"
    ...cast('2024-terrace', undefined, [{ who: 'אסף', x: 0.52, y: 0.76, flip: true }]),
  ],

  // under the gate-5 stand (`world/city2027/stadiumSide.ts`, 27.9.2026) — the stairs are 0.56–0.8,
  // so the people who wait stand at their foot and to the right of the corridor (0.28–0.47)
  'gate5-stand': [
    // 2001-terrace · T01 S1–S3 (t-prep, t-credit) — אסף at the foot of the stairs, מלמד by the ropes
    ...cast('2001-terrace', flag('t:first'), [
      { who: 'אסף', x: 0.58, y: 0.84 },
      { who: 'מלמד', x: 0.88, y: 0.88, flip: true },
    ]),
    // 2012-terrace · T02 (t-hand) — אסף in front of the pillar, left of Yevgeny's stairs, for the "בשביל זה אנחנו פה"
    ...cast('2012-terrace', undefined, [{ who: 'אסף', x: 0.47, y: 0.88 }]),
  ],

  gate5: [
    // 2001-terrace · T01 (t-first)
    ...cast('2001-terrace', undefined, [
      { who: 'אסף', x: 0.5, y: 0.86 },
      { who: 'מלמד', x: 0.68, y: 0.9, flip: true },
    ]),
    // 2012-five · N03 (n-own)
    ...cast('2012-five', flag('n:five'), [
      { who: 'פרדי', x: 0.52, y: 0.86 },
      { who: 'אופיר', x: 0.36, y: 0.88 },
      { who: 'יוסף', x: 0.68, y: 0.9, flip: true },
    ]),
    // 2012-terrace · T02 (t-hand)
    ...cast('2012-terrace', undefined, [
      { who: 'יבגני', x: 0.46, y: 0.86 },
      { who: 'אסף', x: 0.62, y: 0.88, flip: true },
    ]),
  ],

  'ussishkin-hall': [
    // 2006-home · H01 (h-derby) — שחור ליד הדלת: "תזוזו מהדלת"
    ...cast('2006-home', undefined, [
      { who: 'אפי', x: 0.3, y: 0.86 },
      { who: 'שחור', x: 0.17, y: 0.9, flip: true },
    ]),
  ],

  'ussishkin-outside': [
    // 2006-home · H02 (h-door)
    // (27.9.2026) סוקו עומד כאן עם המצלמה — "תצלם גם את הכניסה" הוא שלו, לא של בתיה (מאור)
    ...cast('2006-home', flag('h:derby'), [
      { who: 'אפי', x: 0.55, y: 0.9, flip: true },
      { who: 'בתיה', x: 0.72, y: 0.88, flip: true },
      { who: 'סוקו', x: 0.4, y: 0.89 },
    ]).map(talkTo('בתיה', 'batya-06')),
    // 2007-registered · U03 (u-loss)
    // (delta 92, §8 Beat 4) the morning of 25.7.2007: Efi, Shachor, Inbal — outside, mostly quiet
    ...cast('2007-registered', flag('u:news'), [
      { who: 'אפי', x: 0.72, y: 0.9, flip: true, figure: 'efi96-concern' },
      { who: 'שחור', x: 0.55, y: 0.89, flip: true },
      { who: 'ענבל', x: 0.38, y: 0.9 },
    ]),
  ],

  'bus-station': [
    // 2006-home · H04 (h-oli)
    ...cast('2006-home', flag('h:work'), [
      { who: 'אולי', x: 0.55, y: 0.78, flip: true },
      { who: 'אופיר', x: 0.68, y: 0.8, flip: true },
    ]),
    // ---- from 2017 the platform is `busStation20` (BUS_STATION_2017): the platform floor is
    // 0.58–0.665, the timetable pole stands at 0.53 and the bench at 0.595–0.765 (27.9.2026)
    // 2017-distance · K03 (k-back) — in front of the bench
    ...cast('2017-distance', flag('k:life'), [{ who: 'אופיר', x: 0.64, y: 0.625, flip: true }]),
    // 2026-finale · Q10 (f-name) — הרציף, לפני: between the bus door and the pole
    ...cast('2026-finale', undefined, [{ who: 'קובי', x: 0.47, y: 0.615, flip: true }]),
    ...cast('2026-finale', { flagIs: { flag: 'life:finale:party', value: 'three' } }, [{ who: 'הילד', x: 0.6, y: 0.635, flip: true }]),
  ],

  'ticket-office': [
    // 2025-owner · O05 (o-monday)
    ...cast('2025-owner', flag('o:signGo'), [
      { who: 'אדם', x: 0.62, y: 0.9, flip: true },
      // on Melanie's body unless Melanie is the partner — then on Tamar's, who is not here
      { who: 'מיכל', x: 0.78, y: 0.9, flip: true, when: { all: [{ flag: 'o:signGo' }, { none: [{ flagIs: { flag: 'life:partner', value: 'melanie' } }] }] } },
      { who: 'מיכל', x: 0.78, y: 0.9, flip: true, figure: 'adultB5', when: { all: [{ flag: 'o:signGo' }, { flagIs: { flag: 'life:partner', value: 'melanie' } }] } },
    ]),
  ],

  'hall-new': [
    // 2007-key · U04 (u-key)
    ...cast('2007-key', undefined, [
      { who: 'יוסף', x: 0.36, y: 0.72 },
      { who: 'ענבל', x: 0.5, y: 0.69 },
      { who: 'שחור', x: 0.64, y: 0.71, flip: true },
      { who: 'מתוקי', x: 0.46, y: 0.78, flip: true },
    ]),
    // 2009-up · U05 (u-after) — "עכשיו תחייכו לתמונה"
    ...cast('2009-up', undefined, [
      { who: 'יוסף', x: 0.4, y: 0.7 },
      { who: 'שחור', x: 0.52, y: 0.69, flip: true },
      { who: 'אפי', x: 0.3, y: 0.74 },
    ]),
  ],

  'drive-in': [
    // 2015-newhall · N05 (nr-hall) — "פה יהיה לנו מקום"
    ...cast('2015-newhall', undefined, [
      { who: 'אפי', x: 0.46, y: 0.8 },
      { who: 'מתוקי', x: 0.6, y: 0.82, flip: true },
    ]),
    // (pass D) N05 S4 — six thirty: the doors open on the hall he prepared (`nr-doors` rebuilds the room)
    ...cast('2015-newhall', flag('nr:crowd'), [
      { who: 'אוהד', x: 0.78, y: 0.8, figure: 'adultA3', flip: true },
      { who: 'אוהד', x: 0.34, y: 0.78, figure: 'youngA4' },
      { who: 'אוהד', x: 0.9, y: 0.86, figure: 'youngB4', flip: true },
    ]),
    // …and the family he waited for at the doors, standing where he showed them
    ...cast('2015-newhall', all('nr:crowd', 'nr:did:families'), [{ who: 'אוהד', x: 0.34, y: 0.84, figure: 'adultA5' }]),
    // 2024-home · H24b (h24-small, h24-meeting) — "אנחנו באמת לא נכנסים פה"; ואחרי זה,
    // על הפרקט, פגישה פתוחה: יוסף מהעמותה, והבעלים בווידאו על מסך (`remote`)
    ...cast('2024-home', flag('h24:ask'), [
      { who: 'אפי', x: 0.46, y: 0.8 },
      { who: 'יבגני', x: 0.6, y: 0.82, flip: true },
    ]),
    ...cast('2024-home', flag('h24:small'), [{ who: 'יוסף', x: 0.34, y: 0.84 }]),
  ],

  rehearsal: [
    // 2012-five · N04 (n-room) — "חדר חזרות. מישהו כבר מכוון"
    ...cast('2012-five', undefined, [
      { who: 'מלמד', x: 0.2, y: 0.62 },
      { who: 'נטע', x: 0.44, y: 0.6 },
      { who: 'גור', x: 0.58, y: 0.62, flip: true },
      { who: 'יונתן', x: 0.69, y: 0.64, flip: true },
    ]),
  ],

  newsroom: [
    // 2006-desk · J02 (j-fix)
    ...cast('2006-desk', undefined, [
      { who: 'עמית', x: 0.44, y: 0.72 },
      { who: 'שני', x: 0.6, y: 0.7, flip: true },
    ]),
    // 2025-owner · Q06 (o-conflict) — "אני מונעת לך את הפסקה הבאה"
    ...cast('2025-owner', flag('o:signGo'), [{ who: 'שני', x: 0.58, y: 0.7, flip: true }]),
  ],

  office: [
    // 2025-owner · O01 (o-fork), O02 (o-team), O03 (o-money)
    ...cast('2025-owner', undefined, [
      { who: 'עמית', x: 0.36, y: 0.66 },
      { who: 'פרדי', x: 0.52, y: 0.64, flip: true },
    ]),
    ...cast('2025-owner', flag('o:forkGo'), [
      { who: 'מיכל', x: 0.66, y: 0.63, flip: true, when: { all: [{ flag: 'o:forkGo' }, { none: [{ flagIs: { flag: 'life:partner', value: 'melanie' } }] }] } },
      { who: 'מיכל', x: 0.66, y: 0.63, flip: true, figure: 'adultB5', when: { all: [{ flag: 'o:forkGo' }, { flagIs: { flag: 'life:partner', value: 'melanie' } }] } },
      { who: 'אדם', x: 0.8, y: 0.66, flip: true },
    ]),
    // (pass D) O02 — Yevgeny came without being asked, and waits at the window (the trust corner)
    ...cast('2025-owner', flag('o:brief'), [{ who: 'יבגני', x: 0.92, y: 0.7, flip: true }]),
  ],

  'community-room': [
    // 2007-table · U01 (u-table) — "תן לו תפקיד, לא חידה"
    ...cast('2007-table', undefined, [
      { who: 'יוסף', x: 0.42, y: 0.68 },
      { who: 'שחור', x: 0.56, y: 0.66, flip: true },
      { who: 'אפי', x: 0.7, y: 0.7, flip: true },
    ]),
    // 2007-registered · U02 (u-deliver) — "הבאתי קלסר"
    ...cast('2007-registered', undefined, [
      { who: 'יוסף', x: 0.4, y: 0.68 },
      { who: 'שחור', x: 0.52, y: 0.66, flip: true },
      { who: 'מתוקי', x: 0.63, y: 0.7, flip: true },
      { who: 'אפי', x: 0.75, y: 0.68, flip: true },
    ]),
    // 2016-crisis · P03 (p-deliver) — "יש פה שמות, לא רק סכומים"
    ...cast('2016-crisis', flag('p:till'), [{ who: 'מתוקי', x: 0.5, y: 0.68, flip: true }]),
    // 2023-tournament · Z03 (z-grow)
    ...cast('2023-tournament', flag('z:derby'), [
      { who: 'יוסף', x: 0.44, y: 0.68 },
      { who: 'אפי', x: 0.6, y: 0.7, flip: true },
    ]),
  ],

  storeroom: [
    // 2012-five · Q03 (q-shirts) — מייסד וגם יציע
    ...cast('2012-five', { all: [{ flag: 'own:route:USSISHKIN_FOUNDER:entry' }, { flag: 'own:route:ULTRAS:entry' }] }, [
      // the door is the back of the room (0.42–0.57): nobody stands in it
      { who: 'אפי', x: 0.32, y: 0.72 },
      { who: 'עמית', x: 0.66, y: 0.76, flip: true },
      { who: 'מתוקי', x: 0.77, y: 0.7, flip: true },
    ]),
  ],

  workshop: [
    // 2006-home · H03 (h-liron) — לירון מאחורי השולחן, ירון ליד הדלת האחורית
    ...cast('2006-home', flag('h:door'), [
      { who: 'לירון', x: 0.54, y: 0.68, flip: true },
      { who: 'ירון', x: 0.8, y: 0.72, flip: true },
    ]),
  ],

  'port-europe': [
    // 2002-europe · E05 (e-after) — אחרי מילאן, מחפשים את האוטובוס
    ...cast('2002-europe', flag('e:milan'), [
      { who: 'אופיר', x: 0.46, y: 0.68, flip: true },
      { who: 'רומא', x: 0.6, y: 0.66, flip: true },
      { who: 'עמית', x: 0.2, y: 0.7 },
    ]),
    // 2010-anthem · the terminal on the way to Lisbon or Lyon — Roma holds the tickets (27.9.2026)
    ...cast('2010-anthem', { any: [{ all: [{ flag: 'c10:lisFlown' }], none: [{ flag: 'c10:debut' }] }, { all: [{ flag: 'c10:lyonFlown' }], none: [{ flag: 'c10:lyon' }] }] }, [
      { who: 'רומא', x: 0.46, y: 0.68, flip: true },
    ]),
    // 2026-finale · F02 (f-road) — "יש לי את הכרטיסים"
    ...cast('2026-finale', undefined, [{ who: 'קובי', x: 0.46, y: 0.68, flip: true }]),
    ...cast('2026-finale', { flagIs: { flag: 'life:finale:party', value: 'three' } }, [{ who: 'הילד', x: 0.54, y: 0.7, flip: true }]),
  ],

  'arena-out': [
    // 2026-finale · F03 (f-seats), F04 (f-back)
    ...cast('2026-finale', undefined, [{ who: 'קובי', x: 0.3, y: 0.78 }]),
    ...cast('2026-finale', { flagIs: { flag: 'life:finale:party', value: 'three' } }, [{ who: 'הילד', x: 0.38, y: 0.8, flip: true }]),
  ],

  'flat-abroad': [
    // 2023-abroad · X03 (x-alex) — אלכס נכנס מהדלת, אחרי השיחה עם אבא
    ...cast('2023-abroad', flag('x:call'), [{ who: 'אלכס', x: 0.79, y: 0.66, flip: true }]),
    // 2023-abroad · Q05 (q-soup) — רומא, ואורח שבא כחבר ולא ככתבה
    ...cast('2023-abroad', { all: [{ flag: 'x:alex' }, { flag: 'own:route:JOURNALIST:entry' }, { flag: 'life:international' }] }, [
      { who: 'רומא', x: 0.6, y: 0.64, flip: true },
      { who: 'האורח', x: 0.68, y: 0.63, flip: true, figure: 'adultA1' },
    ]),
  ],

  'arena-seats': [
    // 2026-finale · F03 "ובמושבים" — קובי לידך
    ...cast('2026-finale', undefined, [{ who: 'קובי', x: 0.5, y: 0.78, flip: true }]),
    ...cast('2026-finale', { flagIs: { flag: 'life:finale:party', value: 'three' } }, [{ who: 'הילד', x: 0.4, y: 0.8, flip: true }]),
  ],
  /**
   * ===================================================== העיר שעל הים (27.9.2026) ====
   * `world/city2027/jaffa.ts`. כל שורה עומדת על ריצוף ריק של הציור שלה — לא בתוך אדם מצויר,
   * לא בתוך העגלה בסמטה, לא בתוך פתח — והמספר ליד כל אחת אומר איזה פער זה.
   */
  promenade: [
    // 2017-distance · K02 (k-life) — קרן על הטיילת ביום, בריצוף הריק לפני המדרגות (0.25–0.47);
    // אחרי השיחה היא הולכת למים (`k-keren-walks`) ולא חוזרת לחדר הזה
    ...cast('2017-distance', { all: [{ flag: 'k:told' }], none: [{ flag: 'k:keren-gone' }] }, [{ who: 'קרן', x: 0.4, y: 0.84, flip: true }]),
    // 2021-suitcase · X01 (x-sea) — הערב האחרון, בשקיעה: קרן, בריצוף הריק מתחת לזוג המצויר (0.47–0.62)
    ...cast('2021-suitcase', flag('x:move'), [{ who: 'קרן', x: 0.58, y: 0.87, flip: true }]),
    // 2023-visit · X04 (x-sunset) — ערב המשפחה: קובי מחכה לו על הטיילת, באותו מקום
    ...cast('2023-visit', { flagIs: { flag: 'life:abroad:visit', value: 'family' } }, [{ who: 'קובי', x: 0.58, y: 0.9, flip: true }]),
    // (pass D) 2021-promises · L08 — the evening that was promised, at the same empty paving (0.47–0.62)
    ...partner('2021-promises', flag('pr:out'), { x: 0.58, y: 0.87, flip: true }),
    ...cast('2021-promises', { all: [{ flag: 'pr:out' }, { notFlag: 'life:partner' }] }, [{ who: 'קרן', x: 0.58, y: 0.87, flip: true }]),
  ],

  jaffa: [
    // 2024-lina · I04 (i-tower) — מתחת למגדל השעון, לפני העציצים (0.40–0.45, 0.57–0.62)
    ...cast(
      '2024-lina',
      { all: [{ flag: 'i:jaffa' }], none: [{ flagIs: { flag: 'life:lina:walk', value: 'alley' } }, { flagIs: { flag: 'life:lina:walk', value: 'boulevard' } }] },
      [
        { who: 'לינה', x: 0.44, y: 0.9, flip: true },
        { who: 'ניקו', x: 0.57, y: 0.91, flip: true },
      ],
    ).map((actor) => ({ ...actor, talk: 'i-tower' })),
  ],

  'jaffa-alley': [
    // 2024-lina · I04 (i-talk) — מול בית הקפה, בין הפנס לאופניים; ניקו לפני העגלה
    ...cast('2024-lina', { flagIs: { flag: 'life:lina:walk', value: 'alley' } }, [
      { who: 'לינה', x: 0.81, y: 0.88, flip: true },
      { who: 'ניקו', x: 0.64, y: 0.91, flip: true },
    ]),
    // 2023-visit · X04 (x-jaffa) — ערב החברים: אופיר ועמית כבר בבית הקפה
    ...cast('2023-visit', { flagIs: { flag: 'life:abroad:visit', value: 'friends' } }, [
      { who: 'אופיר', x: 0.64, y: 0.91, flip: true },
      { who: 'עמית', x: 0.81, y: 0.88, flip: true },
    ]),
    // 2025-interview · J03 (j-archive, j-asked) — המראיינת, ליד הדלת הכחולה
    ...cast('2025-interview', { flagIs: { flag: 'life:interview:at', value: 'jaffa' } }, [{ who: 'מראיינת', x: 0.81, y: 0.88, flip: true }]),
  ],

  'jaffa-boulevard': [
    // 2024-lina · I04 (i-talk) — על המדרכה השמאלית, בין עמוד התאורה לקיוסק הסגור
    ...cast('2024-lina', { flagIs: { flag: 'life:lina:walk', value: 'boulevard' } }, [
      { who: 'לינה', x: 0.44, y: 0.76, flip: true },
      { who: 'ניקו', x: 0.56, y: 0.77, flip: true },
    ]),
  ],
}
