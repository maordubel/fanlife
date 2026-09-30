import type { Conversation } from '../../content/script'
import { chaptersWhere, yearOfChapter } from '../homes'
import type { Repaint, SceneDef } from '../scenes'
import type { CityExit } from './index'

/**
 * ======================================================== העיר שעל הים — יפו והטיילת ====
 *
 * Maor, 27.9.2026, on the approved paintings nobody walked through yet: *"אלו רקעים שניתן
 * להתאים בהתאם לתסריט ... כדי להרחיב את חווית השחקן ולהרגיש שהוא באמת מטייל בעיר ...
 * שפגישה מסויימת תהיה ביפו למשל."* Four places, one walk:
 *
 *     אלנבי ──(הקשת)── הטיילת ──(דרומה)── מגדל השעון ──┬── הסמטה, בית הקפה
 *                                                        └── השדרה, לפנות בוקר
 *
 * **Allenby ends at the sea, and that is the door.** The corner (`allenby`) already carries
 * six doors on one pavement; the only opening that is free after 2007 is the archway in the
 * middle — Ussishkin's door until the hall came down (`placeLifecycle.ts`), dark since. From
 * 2011 it is the way west, to the promenade. Jaffa is south along the water, so you WALK to
 * it past the sea, the way everybody in this city does, rather than being handed it by a menu.
 *
 * **Every floor below was measured off its own painting** (rule 52, rule 55): the horizon from
 * two known heights at two depths, the camera height E from the slope between them, a metre
 * at a line `y` = (y − horizon) / E, and `size` = 1.30 × metre — the child's own height, which
 * is how every room of `rooms2000.ts` is written, so the player's figure scale reads them the
 * same way. Every band keeps its ramp (near − h) / (far − h) at or under 1.8.
 *
 * **Painted people are dressing.** The promenade was painted full — walkers, a cyclist, men on
 * the steps, bicycles against the rail. Nobody who talks is ever stood inside one of them: the
 * STAGED rows (`rooms2000.ts`) put the cast on the empty paving between them, and the numbers
 * beside each row say which gap it is.
 */

/** the adult city: from 2011 the archway on Allenby leads to the sea (Ussishkin is gone) */
const CITY_YEARS = chaptersWhere((id) => yearOfChapter(id) >= 2011)

/** the two evenings the promenade is painted at dusk (X01's last evening, X04's sunset) */
const DUSK: readonly string[] = ['2021-suitcase', '2023-visit']

// ================================================================ הטיילת · promenade ===
/**
 * הטיילת ביום (`promenade`, 1600×900). The sea line is 0.50 and the walkers' heads sit just
 * above it; a man of 1.80 at x 0.14 is drawn from 0.455 to 0.80, i.e. 0.345 of the frame
 * with his feet 0.30 under the horizon — E = 1.80 × 0.30 / 0.345 ≈ 1.59 m, an eye-level
 * camera. Band 0.72–0.88 (ramp 0.38 / 0.22 = 1.73): a metre is 0.1384 at the far line and
 * 0.2390 at the near one. The empty paving is 0.25–0.47 at the near half of the band; the
 * steps down to the beach (0.47–0.70) and the bicycles (0.75–0.90) are the rest.
 *
 * The camera looks north: the city is on the LEFT (Allenby, the way back), the sea and the
 * sign on the right, and Jaffa behind — so the way south is the right-hand edge, past the
 * sign, where the water is.
 */
const PROMENADE_DUSK: Repaint = {
  /**
   * הטיילת בשקיעה (`promenadeDusk`) — the same walk, painted the other way: the beach and the
   * lifeguard hut are on the LEFT, the cafés and the parked cars on the right, so the doors
   * swap sides with the sea. Measured: the couple at 0.36–0.46 stand 0.27 tall with feet on
   * 0.84 and heads at the skyline's base (0.575) — horizon 0.58, E ≈ 1.73. Band 0.77–0.92
   * (ramp 0.34 / 0.19 = 1.79), a metre 0.1098 → 0.1965. The empty paving is 0.30–0.85 across
   * the near half; the bench on the right (0.87–1.0) is where somebody who waits sits.
   */
  in: (chapter) => DUSK.includes(chapter),
  art: 'promenadeDusk',
  band: { far: 0.77, near: 0.92 },
  size: { far: 0.1428, near: 0.2555 },
  metre: 0.1965,
  titleHe: 'הטיילת, בשקיעה',
  ambience: 'dusk',
  spawns: {
    fromTown: { x: 0.9, y: 0.87, facing: 'left' },
    fromJaffa: { x: 0.3, y: 0.9, facing: 'right' },
    start: { x: 0.42, y: 0.92, facing: 'left' },
  },
  doors: {
    // the café side and the cars: the city, and the way back up to Allenby
    town: { x: 0.95, y: 0.77, w: 0.05, h: 0.15, light: { x: 0.955, y: 0.5, w: 0.045, h: 0.27, tone: 'daylight' } },
    // the sea wall and the lifeguard hut: south, along the water
    jaffa: { x: 0.0, y: 0.77, w: 0.05, h: 0.15, light: { x: 0.0, y: 0.52, w: 0.05, h: 0.25, tone: 'daylight' } },
  },
  spots: {
    // the day painting's sign and steps are not in this one
    'promenade-sign': null,
    'promenade-steps': null,
    // ...and these two are this painting's own (measured on it): the bench, the lifeguard hut
    'promenade-bench': { x: 0.86, y: 0.86, w: 0.08 },
    'promenade-hut': { x: 0.2, y: 0.84, w: 0.08 },
  },
  // the bench and the lifeguard hut are the room's own spots in the two dusk chapters (below)
  stuckHe: 'הים משמאל — ליפו, לאורך המים. מימין, בין בתי הקפה, חזרה לאלנבי.',
}

const PROMENADE: SceneDef = {
  id: 'promenade',
  titleHe: 'הטיילת',
  art: 'promenade',
  band: { far: 0.72, near: 0.88 },
  size: { far: 0.1799, near: 0.3107 },
  metre: 0.239,
  ambience: 'day',
  stuckHe: 'שמאלה, בין הבניינים — חזרה לאלנבי. ימינה, ליד השלט — דרומה, ליפו.',
  spawns: {
    fromTown: { x: 0.07, y: 0.82, facing: 'right' },
    fromJaffa: { x: 0.9, y: 0.84, facing: 'left' },
    start: { x: 0.3, y: 0.83, facing: 'right' },
  },
  actors: [],
  hotspots: [
    // the sign on its concrete post (0.88–0.97), read from the paving in front of it
    { id: 'promenade-sign', era: '*', x: 0.84, y: 0.8, w: 0.07, act: 'promenade-sign', verb: 'look', labelHe: 'השלט: תמיד על הים' },
    // the stepped seats down to the sand (0.47–0.70)
    { id: 'promenade-steps', era: '*', x: 0.56, y: 0.78, w: 0.08, act: 'promenade-steps', verb: 'look', labelHe: 'המדרגות לחוף' },
    // ...and on the dusk painting (`PROMENADE_DUSK`, only these two chapters): the bench on the
    // right (0.87–1.0) and the lifeguard hut over the sand on the left — measured on THAT painting
    { id: 'promenade-bench', era: DUSK, x: 0.86, y: 0.86, w: 0.08, act: 'promenade-bench', verb: 'look', labelHe: 'הספסל' },
    { id: 'promenade-hut', era: DUSK, x: 0.2, y: 0.84, w: 0.08, act: 'promenade-hut', verb: 'look', labelHe: 'סוכת המציל' },
  ],
  exits: [
    {
      id: 'town',
      x: 0.0,
      y: 0.72,
      w: 0.05,
      h: 0.16,
      to: 'allenby',
      spawn: 'fromNorth',
      labelHe: 'לאלנבי, לעיר',
      light: { x: 0.0, y: 0.42, w: 0.05, h: 0.33, tone: 'daylight' },
      dwellMs: 600,
    },
    {
      id: 'jaffa',
      x: 0.95,
      y: 0.72,
      w: 0.05,
      h: 0.16,
      to: 'jaffa',
      spawn: 'fromSea',
      labelHe: 'דרומה, ליפו',
      light: { x: 0.965, y: 0.42, w: 0.035, h: 0.3, tone: 'daylight' },
      dwellMs: 600,
    },
  ],
  repaints: [PROMENADE_DUSK],
}

// ============================================================ מגדל השעון · jaffa00 ===
/**
 * שדרות ירושלים ומגדל השעון (`jaffa00`, 1942×809 — 2.4:1). The road converges on the tower's
 * base at 0.69. The arcades on both sides are shopfront arches of about three metres drawn
 * from 0.60 to 0.74, 0.05 under the horizon — E ≈ 0.05 × 3 / 0.14 ≈ 1.1 m; the lamp posts on
 * the left (about four metres, 0.40 → 0.80) agree. A low camera, standing in the plaza.
 * Band 0.835–0.95 (ramp 0.26 / 0.145 = 1.79), a metre 0.1318 → 0.2364.
 *
 * The plaza between the tram lines is the room: the tower at 0.50, the planters at 0.40–0.45
 * and 0.57–0.62 on the far line, and the empty paving in front of them where two people who
 * flew in at five in the morning stand.
 */
const JAFFA: SceneDef = {
  id: 'jaffa',
  titleHe: 'מגדל השעון, יפו',
  art: 'jaffa00',
  band: { far: 0.835, near: 0.95 },
  size: { far: 0.1714, near: 0.3073 },
  metre: 0.2364,
  ambience: 'day',
  stuckHe: 'שמאלה, לאורך הים — הטיילת. מתחת לקשתות משמאל — הסמטה. ימינה — השדרה.',
  spawns: {
    fromSea: { x: 0.07, y: 0.9, facing: 'right' },
    fromAlley: { x: 0.33, y: 0.88, facing: 'right' },
    fromBoulevard: { x: 0.92, y: 0.9, facing: 'left' },
    start: { x: 0.3, y: 0.93, facing: 'right' },
  },
  actors: [],
  hotspots: [
    { id: 'jaffa-tower', era: '*', x: 0.5, y: 0.87, w: 0.06, act: 'jaffa-tower', verb: 'look', labelHe: 'מגדל השעון' },
    /**
     * 2024-lina · I04 — פעולת הצד היחידה בכיכר: תמונה של שלושתכם מתחת לשעון, כל עוד לינה
     * וניקו עומדים בה. `i-talk` קורא אותה (`life:lina:photo`).
     */
    {
      id: 'jaffa-photo',
      era: '2024-lina',
      x: 0.505,
      y: 0.92,
      w: 0.05,
      act: 'jaffa-photo',
      verb: 'hold',
      labelHe: 'תמונה מתחת לשעון',
      priority: 3,
      when: {
        all: [{ flag: 'i:jaffa' }],
        none: [
          { flag: 'i:call' },
          { flag: 'life:lina:photo' },
          { flagIs: { flag: 'life:lina:walk', value: 'alley' } },
          { flagIs: { flag: 'life:lina:walk', value: 'boulevard' } },
        ],
      },
    },
  ],
  exits: [
    {
      id: 'sea',
      x: 0.0,
      y: 0.835,
      w: 0.04,
      h: 0.115,
      to: 'promenade',
      spawn: 'fromJaffa',
      labelHe: 'לים, לטיילת',
      light: { x: 0.0, y: 0.55, w: 0.04, h: 0.27, tone: 'daylight' },
      dwellMs: 600,
    },
    {
      // the arcade on the left-hand building (0.25–0.30): under the arches, into the old town
      id: 'alley',
      x: 0.245,
      y: 0.835,
      w: 0.05,
      h: 0.03,
      to: 'jaffa-alley',
      spawn: 'fromSquare',
      labelHe: 'לסמטה, לבית הקפה',
      light: { x: 0.25, y: 0.6, w: 0.05, h: 0.14, tone: 'daylight' },
      dwellMs: 900,
    },
    {
      id: 'boulevard',
      x: 0.96,
      y: 0.835,
      w: 0.04,
      h: 0.115,
      to: 'jaffa-boulevard',
      spawn: 'fromSquare',
      labelHe: 'לשדרה',
      light: { x: 0.96, y: 0.55, w: 0.04, h: 0.27, tone: 'daylight' },
      dwellMs: 600,
    },
  ],
}

// ======================================================= הסמטה · jaffaAlleyCafe ===
/**
 * סמטה מרוצפת, בית קפה ג'אפנא (`jaffaAlleyCafe`, 2816×1536). The alley vanishes at 0.58. The
 * handcart (a table of about 0.9 m) stands on 0.82 with its top at 0.69 — 0.13 of the frame at
 * 0.24 under the horizon: E ≈ 0.9 × 0.24 / 0.13 ≈ 1.66 m. Band 0.79–0.95 (ramp 0.37 / 0.21 =
 * 1.76), a metre 0.1265 → 0.2229. The café is the building on the right, its tall blue door
 * at 0.86–0.92; people who meet there stand between the lamp post (foot 0.83 at 0.755) and
 * the bicycle (0.87–0.97), on the cobbles, never inside the cart.
 */
const JAFFA_ALLEY: SceneDef = {
  id: 'jaffa-alley',
  titleHe: 'הסמטה, ג׳אפנא',
  art: 'jaffaAlleyCafe',
  band: { far: 0.79, near: 0.95 },
  size: { far: 0.1645, near: 0.2898 },
  metre: 0.2229,
  ambience: 'day',
  stuckHe: 'בית הקפה מימין. חזרה לכיכר השעון — שמאלה, ליד הקיוסק.',
  spawns: {
    fromSquare: { x: 0.1, y: 0.88, facing: 'right' },
    start: { x: 0.3, y: 0.9, facing: 'right' },
  },
  actors: [],
  hotspots: [
    { id: 'jaffa-cafe', era: '*', x: 0.9, y: 0.84, w: 0.06, act: 'jaffa-cafe', verb: 'look', labelHe: 'בית הקפה' },
    { id: 'jaffa-kiosk', era: '*', x: 0.16, y: 0.83, w: 0.07, act: 'jaffa-kiosk', verb: 'look', labelHe: 'הקיוסק עם המודעות' },
  ],
  exits: [
    {
      id: 'square',
      x: 0.0,
      y: 0.79,
      w: 0.05,
      h: 0.16,
      to: 'jaffa',
      spawn: 'fromAlley',
      labelHe: 'לכיכר השעון',
      light: { x: 0.0, y: 0.52, w: 0.04, h: 0.28, tone: 'daylight' },
      dwellMs: 600,
    },
  ],
}

// ====================================================== השדרה · jaffaBoulevard ===
/**
 * שדרה ביפו, לפנות בוקר (`jaffaBoulevard`, 2816×1536) — the shutters are down, the kiosks
 * closed, nobody on the pavement. The road vanishes at 0.59. The kiosk on the right (about
 * 2.6 m, 0.475 → 0.645) and the shop door on the left (about 2.5 m, 0.37 → 0.67) both put the
 * camera low, E ≈ 0.82 m. Band 0.71–0.80 (ramp 0.21 / 0.12 = 1.75), a metre 0.1463 → 0.2561.
 */
const JAFFA_BOULEVARD: SceneDef = {
  id: 'jaffa-boulevard',
  titleHe: 'השדרה, יפו',
  art: 'jaffaBoulevard',
  band: { far: 0.71, near: 0.8 },
  size: { far: 0.1902, near: 0.3329 },
  metre: 0.2561,
  ambience: 'day',
  stuckHe: 'השדרה עוד סגורה. חזרה לכיכר השעון — שמאלה.',
  spawns: {
    fromSquare: { x: 0.08, y: 0.76, facing: 'right' },
    start: { x: 0.3, y: 0.77, facing: 'right' },
  },
  actors: [],
  hotspots: [
    { id: 'jaffa-shutters', era: '*', x: 0.68, y: 0.73, w: 0.07, act: 'jaffa-shutters', verb: 'look', labelHe: 'הקיוסק, סגור' },
    { id: 'jaffa-bustan', era: '*', x: 0.18, y: 0.74, w: 0.07, act: 'jaffa-bustan', verb: 'look', labelHe: 'בית הקפה בתריס' },
  ],
  exits: [
    {
      id: 'square',
      x: 0.0,
      y: 0.71,
      w: 0.05,
      h: 0.09,
      to: 'jaffa',
      spawn: 'fromBoulevard',
      labelHe: 'לכיכר השעון',
      light: { x: 0.0, y: 0.45, w: 0.045, h: 0.27, tone: 'daylight' },
      dwellMs: 600,
    },
  ],
}

export const JAFFA_ROOMS: SceneDef[] = [PROMENADE, JAFFA, JAFFA_ALLEY, JAFFA_BOULEVARD]

/**
 * הקשת באלנבי — from 2011, the way to the sea. Same camera on `allenby2000` and `allenby20`
 * (checked by overlay when those arrived), so the door needs no `onPaint`. Shallow, at the
 * far line, exactly where Ussishkin's archway door stood: you go UP into the passage and
 * walking the pavement never falls in.
 */
export const JAFFA_EXITS: CityExit[] = [
  {
    from: 'allenby',
    exit: {
      id: 'sea',
      era: CITY_YEARS,
      x: 0.566,
      y: 0.725,
      w: 0.058,
      h: 0.045,
      to: 'promenade',
      spawn: 'fromTown',
      labelHe: 'דרך הקשת — לים',
      light: { x: 0.57, y: 0.42, w: 0.05, h: 0.3, tone: 'daylight' },
      dwellMs: 900,
    },
  },
]

// ============================================================ מה שיש לראות בעיר ===
/**
 * What the eyes say at each thing in these rooms (`who: null`, the `rooms2000Looks` voice).
 * Nothing here invents a fact about the city — no date, no result, no name that is not
 * painted — and each line is true in any year the room is walked.
 */
const lookAt = (id: string, ...lines: string[]): Conversation => ({
  id,
  nameHe: null,
  branches: [{ lines: lines.map((text) => ({ who: null, text })) }],
})

export const JAFFA_LOOKS: Conversation[] = [
  lookAt('promenade-sign', 'השלט על העמוד: תל אביב־יפו, תמיד על הים. תמיד מישהו מצטלם מולו, והיום זה לא אתה.'),
  lookAt('promenade-steps', 'מדרגות אבן אל החול. יושבים עליהן עם הגב לעיר, וזה כל הרעיון.'),
  lookAt('promenade-bench', 'ספסל עץ עם הפנים לכביש ולא לים. מי שיושב עליו מחכה למישהו, לא לשקיעה.'),
  lookAt('promenade-hut', 'סוכת המציל, סגורה לערב. הדגל עוד תלוי, ואף אחד לא נכנס למים.'),
  lookAt('jaffa-tower', 'מגדל השעון, באמצע הכיכר. פה קובעים, כי אי אפשר לפספס אותו — גם מי שנחת לפני שעתיים.'),
  lookAt('jaffa-cafe', 'בית קפה ג׳אפנא. שלט בשלוש שפות, דלת כחולה גבוהה, ואף אחד בפנים לא ממהר.'),
  lookAt('jaffa-kiosk', 'קיוסק ירוק מכוסה מודעות ישנות. כמו הקיוסק של רפי, רק שאף אחד כאן לא מכיר אותך.'),
  lookAt('jaffa-shutters', 'הקיוסק בשדרה, סגור. עוד שעה יפתחו אותו, ואז השדרה הזאת תהיה מקום אחר.'),
  lookAt('jaffa-bustan', 'בית קפה, התריס למטה. השולחנות בפנים, הכיסאות הפוכים עליהם.'),
]
