import type { SceneDef } from '../scenes'
import type { Condition } from '../types'
import type { CityExit } from './index'

/**
 * ============================================ טדי ואירופה 2010 — מקומות, לא כרטיסים ====
 *
 * Maor, 27.9.2026: *"כדי להרחיב את חווית השחקן ולהרגיש שהוא באמת מטייל בעיר."* Until today
 * Teddy, Salzburg, Lisbon and Lyon were a card and a `where` tag: the player who paid for
 * the ticket stood in his own street while the title was decided. These four rooms are the
 * away ends themselves.
 *
 * **The paintings are CONCEPT DRAFTS, not architectural reconstructions** (`teddy2010`,
 * `salzburg2010`, `benfica2010`, `lyon2010`, 1672×941). Each is an away-section view over a
 * rail with a concrete walkway in front; the walkway is the band. No room claims to be the
 * exact block Hapoel stood in on the night — the chapter never names a gate, a row or a
 * number of travelling supporters.
 *
 * **How each floor was measured** (rule 52, the same method as `rooms2000.ts`). The rail is
 * the known size: 1.1 m from its top to the walkway it stands on. Where the rail recedes
 * (Teddy, Lisbon, Lyon) it is measured at both ends and the horizon falls out of the two
 * heights; where it is square to the camera (Salzburg) the horizon is set just above the far
 * touchline, which the ground must stay below. With `k` = frame per metre per unit below the
 * horizon, a 1.30 m child at `y` is `1.3 · k · (y − h)` — that is `size`, and `metre` is
 * `size.near / 1.3`. Every ramp (`size.near / size.far`) is under 1.8.
 *
 * | room | horizon | k | band | size | ramp |
 * |---|---|---|---|---|---|
 * | teddy | 0.39 | 0.427 | 0.80–0.97 | 0.2276–0.3220 | 1.41 |
 * | away-salzburg | 0.42 | 0.2833 | 0.76–0.97 | 0.1252–0.2026 | 1.62 |
 * | away-lisbon | 0.473 | 0.379 | 0.82–0.97 | 0.1710–0.2449 | 1.43 |
 * | away-lyon | 0.36 | 0.367 | 0.80–0.97 | 0.2099–0.2910 | 1.39 |
 *
 * The rail recedes into the band on the right of Teddy, Lisbon and Lyon: nobody is placed
 * beyond x 0.8 there, and the doors are on the left, where the walkway leaves the frame.
 *
 * **A door out of an away end is a way HOME, and it opens when the evening is over.** Every
 * room has the same door on the left edge in every year (rule 41 — a room without a door in
 * some year is a bug), locked only in the one chapter it belongs to until that chapter's
 * evening has happened (`needsByEra`), so no player walks out before the whistle and none
 * is ever shut in after it (`life:worldlines` · `ROOM_TRAP`).
 */

const leftDoor = (
  to: 'street',
  labelHe: string,
  chapter: string,
  needs: Condition,
  blockedHe: string,
  band: { far: number; near: number },
): SceneDef['exits'][number] => ({
  id: 'home',
  x: 0.0,
  y: band.far,
  w: 0.06,
  h: band.near - band.far,
  to,
  spawn: 'fromBus',
  labelHe,
  light: { x: 0.0, y: band.far - 0.2, w: 0.05, h: 0.2, tone: 'daylight' },
  needsByEra: { [chapter]: needs },
  blockedByEra: { [chapter]: blockedHe },
  dwellMs: 900,
})

const TEDDY_BAND = { far: 0.8, near: 0.97 }
const SALZ_BAND = { far: 0.76, near: 0.97 }
const LIS_BAND = { far: 0.82, near: 0.97 }
const LYON_BAND = { far: 0.8, near: 0.97 }

export const EUROPE_ROOMS: SceneDef[] = [
  /**
   * טדי, יציע האורחים — 15.5.2010, D06–D08 for whoever took the seat in Oli's car. The
   * painted red-and-white cloth on the rail (0.115–0.18) is somebody else's; the scarf he may
   * tie beside it (0.3) is his, and appears the moment he ties it.
   */
  {
    id: 'teddy',
    titleHe: 'טדי — יציע האורחים',
    art: 'teddy2010',
    band: TEDDY_BAND,
    size: { far: 0.2276, near: 0.322 },
    metre: 0.2476,
    ambience: 'stadium',
    air: 'day',
    arrival: { art: 'teddy2010', ms: 3000, flag: 'saw:teddy2010' },
    stuckHe: 'היציאה משמאל, איפה שהבטון נגמר.',
    stuckByEra: { '2010-teddy': 'החבר׳ה ליד המעקה. מקום אחד עוד פנוי — ואחרי השריקה, היציאה משמאל.' },
    spawns: { start: { x: 0.1, y: 0.9, facing: 'right' } },
    actors: [],
    hotspots: [
      { id: 'd10-cloth', era: '2010-teddy', x: 0.17, y: 0.84, w: 0.08, act: 'd10-cloth', verb: 'hold', labelHe: 'הבד על המעקה', when: { all: [{ flag: 'd10:away' }], none: [{ flag: 'd10:cloth' }] }, priority: 4 },
      { id: 'd10-spot', era: '2010-teddy', x: 0.42, y: 0.86, w: 0.1, act: 'd10-spot', verb: 'hold', labelHe: 'מקום ליד המעקה', when: { all: [{ flag: 'd10:away' }], none: [{ flag: 'd10:spot' }, { flag: 'd10:title' }] }, priority: 5 },
      // the consequence, in the room: his own scarf on the rail, from the moment he ties it
      {
        id: 'd10-scarf',
        era: '2010-teddy',
        x: 0.3,
        y: 0.84,
        w: 0.08,
        act: 'd10-scarf',
        verb: 'look',
        labelHe: 'הצעיף שלך, על המעקה',
        when: { flagIs: { flag: 'd10:clothKind', value: 'scarf' } },
        prop: { key: 'propScarfRed', size: 0.042, at: { x: 0.3, y: 0.625 } },
      },
    ],
    exits: [leftDoor('street', 'לחניה — הרכב של אולי, והביתה', '2010-teddy', { flag: 'd10:back' }, 'עוד לא. אף אחד לא זז לפני השריקה.', TEDDY_BAND)],
  },

  /**
   * זלצבורג, יציע האורחים — אוגוסט 2010, for whoever spent the one trip of the summer on the
   * qualifier played there. The chapter never says which leg this was or what it ended; the
   * archive's anchor for the summer is the night at Bloomfield, and the ledger records this
   * one as a ticket stub, not as attendance at that anchor.
   */
  {
    id: 'away-salzburg',
    titleHe: 'זלצבורג — יציע האורחים',
    art: 'salzburg2010',
    band: SALZ_BAND,
    size: { far: 0.1252, near: 0.2026 },
    metre: 0.1558,
    ambience: 'stadium',
    air: 'dusk',
    arrival: { art: 'salzburg2010', ms: 3000, flag: 'saw:salzburg2010' },
    stuckHe: 'היציאה משמאל, איפה שהבטון נגמר.',
    stuckByEra: { '2010-qualify': 'אופיר ליד המעקה, קצת ימינה.' },
    spawns: { start: { x: 0.1, y: 0.88, facing: 'right' } },
    actors: [],
    hotspots: [
      { id: 'c10-salz-find', era: '2010-qualify', x: 0.66, y: 0.84, w: 0.08, act: 'c10-salz-find', verb: 'talk', labelHe: 'אופיר, ליד המעקה', when: { none: [{ flag: 'c10:salzFound' }] }, priority: 6 },
      { id: 'c10-salz-rail', era: '2010-qualify', x: 0.5, y: 0.84, w: 0.1, act: 'c10-salz-rail', verb: 'hold', labelHe: 'המעקה — לתלות את הדגל', when: { all: [{ flag: 'c10:salzFound' }], none: [{ flag: 'c10:salzRail' }] }, priority: 5 },
      {
        id: 'c10-salz-banner',
        era: '2010-qualify',
        x: 0.5,
        y: 0.84,
        w: 0.1,
        act: 'c10-salz-banner',
        verb: 'look',
        labelHe: 'הדגל על המעקה',
        when: { flagIs: { flag: 'c10:salzRail', value: 'hung' } },
        prop: { key: 'propBanner', size: 0.06, at: { x: 0.5, y: 0.655 } },
      },
    ],
    exits: [leftDoor('street', 'הביתה — הטיסה בבוקר', '2010-qualify', { flag: 'c10:salzDone' }, 'המשחק עוד לפניך.', SALZ_BAND)],
  },

  /**
   * ליסבון, אסטדיו דה לוז — 14.9.2010, the first night of the group stage (C03), for whoever
   * chose Lisbon. The anthem is heard here and not on a television.
   */
  {
    id: 'away-lisbon',
    titleHe: 'ליסבון — יציע האורחים',
    art: 'benfica2010',
    band: LIS_BAND,
    size: { far: 0.171, near: 0.2449 },
    metre: 0.1884,
    ambience: 'stadium',
    air: 'dusk',
    arrival: { art: 'benfica2010', ms: 3000, flag: 'saw:benfica2010' },
    stuckHe: 'היציאה משמאל, איפה שהבטון נגמר.',
    stuckByEra: { '2010-anthem': 'רומא ואופיר ליד המעקה.' },
    spawns: { start: { x: 0.08, y: 0.9, facing: 'right' } },
    actors: [],
    hotspots: [
      { id: 'c10-lis-find', era: '2010-anthem', x: 0.54, y: 0.9, w: 0.08, act: 'c10-lis-find', verb: 'talk', labelHe: 'רומא ואופיר', when: { none: [{ flag: 'c10:lisFound' }] }, priority: 6 },
      { id: 'c10-lis-rail', era: '2010-anthem', x: 0.3, y: 0.88, w: 0.1, act: 'c10-lis-rail', verb: 'hold', labelHe: 'המעקה — לתלות את הדגל', when: { all: [{ flag: 'c10:lisFound' }], none: [{ flag: 'c10:lisRail' }] }, priority: 5 },
      {
        id: 'c10-lis-banner',
        era: '2010-anthem',
        x: 0.3,
        y: 0.88,
        w: 0.1,
        act: 'c10-lis-banner',
        verb: 'look',
        labelHe: 'הדגל על המעקה',
        when: { flagIs: { flag: 'c10:lisRail', value: 'hung' } },
        prop: { key: 'propBanner', size: 0.055, at: { x: 0.3, y: 0.7 } },
      },
    ],
    exits: [leftDoor('street', 'הביתה — הטיסה בבוקר', '2010-anthem', { flag: 'c10:debut' }, 'המנגינה עוד לא התחילה.', LIS_BAND)],
  },

  /**
   * ליון, ז׳רלן — 7.12.2010, the last night of the group stage (C07), for whoever kept his one
   * trip for the end. Rain on the walkway; somebody's red-and-white cloth already on the rail
   * (0.21–0.31).
   */
  {
    id: 'away-lyon',
    titleHe: 'ליון — יציע האורחים',
    art: 'lyon2010',
    band: LYON_BAND,
    size: { far: 0.2099, near: 0.291 },
    metre: 0.2239,
    ambience: 'stadium',
    air: 'dusk',
    arrival: { art: 'lyon2010', ms: 3000, flag: 'saw:lyon2010' },
    stuckHe: 'היציאה משמאל, איפה שהבטון נגמר.',
    stuckByEra: { '2010-anthem': 'רומא ליד המעקה, ליד הבד.' },
    spawns: { start: { x: 0.08, y: 0.9, facing: 'right' } },
    actors: [],
    hotspots: [
      { id: 'c10-lyon-find', era: '2010-anthem', x: 0.51, y: 0.88, w: 0.08, act: 'c10-lyon-find', verb: 'talk', labelHe: 'רומא, ליד הבד', when: { none: [{ flag: 'c10:lyonFound' }] }, priority: 6 },
      { id: 'c10-lyon-cloth', era: '2010-anthem', x: 0.26, y: 0.84, w: 0.08, act: 'c10-lyon-cloth', verb: 'hold', labelHe: 'הבד על המעקה', when: { all: [{ flag: 'c10:lyonFound' }], none: [{ flag: 'c10:lyonCloth' }] }, priority: 5 },
      {
        id: 'c10-lyon-scarf',
        era: '2010-anthem',
        x: 0.4,
        y: 0.84,
        w: 0.08,
        act: 'c10-lyon-scarf',
        verb: 'look',
        labelHe: 'הצעיף שלך, על המעקה',
        when: { flagIs: { flag: 'c10:lyonCloth', value: 'scarf' } },
        prop: { key: 'propScarfRed', size: 0.036, at: { x: 0.4, y: 0.63 } },
      },
    ],
    exits: [leftDoor('street', 'הביתה', '2010-anthem', { flag: 'c10:lyon' }, 'עוד לא. אף אחד לא זז.', LYON_BAND)],
  },
]

const TRIP = (city: string): Condition => ({ flagIs: { flag: 'c10:tripTo', value: city } })
/** the autumn reads the summer's choice from the flag that crosses chapters */
const TRIP_LIFE = (city: string): Condition => ({ flagIs: { flag: 'life:trip2010', value: city } })
const GLASS = { x: 0.56, y: 0.58, w: 0.18, h: 0.07 }
const GLASS_LIGHT = { x: 0.56, y: 0.13, w: 0.17, h: 0.36, tone: 'daylight' as const }

/**
 * הדלתות מהנמל — the glass doors of `port-europe` (the same doors the bus of 2002 and 2026
 * waits behind), one per city, each only in the chapter and the life whose evening it is.
 * Lyon has no door of its own: in 2010-anthem the doorway already opens on Lisbon, and one
 * painted doorway leads to one room a year (`tests/life-rooms-2000`) — so in December Roma
 * meets him inside the terminal and the bus takes him straight on (`c10-port-lyon`).
 */
export const EUROPE_EXITS: CityExit[] = [
  {
    from: 'port-europe',
    exit: { id: 'toSalzburg', era: '2010-qualify', ...GLASS, to: 'away-salzburg', spawn: 'start', labelHe: 'לאוטובוס, לאצטדיון', light: GLASS_LIGHT, when: { all: [TRIP('salzburg')], none: [{ flag: 'c10:salzDone' }] }, dwellMs: 700 },
  },
  {
    from: 'port-europe',
    exit: { id: 'toLisbon', era: '2010-anthem', ...GLASS, to: 'away-lisbon', spawn: 'start', labelHe: 'לאוטובוס, לאסטדיו דה לוז', light: GLASS_LIGHT, when: { all: [TRIP_LIFE('lisbon')], none: [{ flag: 'c10:debut' }] }, dwellMs: 700 },
  },
]
