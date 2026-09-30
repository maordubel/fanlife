import { CHAPTERS } from '../../content/chapters'
import { facesLeft } from '../../runtime/art'
import { castFigure } from '../castFigures'
import { yearOfChapter } from '../homes'
import type { ActorDef, SceneDef } from '../scenes'
import type { Condition } from '../types'
import type { CityExit } from './index'

/**
 * ============================================ ליד המגרש, והאולם הגדול (27.9.2026) ====
 *
 * Maor, on the backgrounds pack: *"אלו רקעים שניתן להתאים בהתאם לתסריט ... כדי להרחיב את
 * חווית השחקן ולהרגיש שהוא באמת מטייל בעיר."* Four paintings that had no room become four
 * rooms, each for the chapter whose script walks through it — never a room that is only
 * pretty (rule 66): every one has a thing to do, a thing that is decided, and a flag a later
 * scene reads.
 *
 *   · `menora`       — the big basketball arena from the seats (`menoraSeats`). 2024-home, the
 *                      first night, 11.1.2025: find the seat, look for faces, sit (H24 §S5).
 *   · `gate5-stand`  — under Bloomfield's gate-5 stand, the stairs up (`gate5Stand`). 2001-terrace
 *                      (the prep and the gate opening) and 2012-terrace (the handoff and its test).
 *   · `undercroft`   — the approach under the stand on a match day (`undercroft`). 1990, before
 *                      the whistle: the rumour, the vendor, the empty lanes.
 *   · `bus-stop`     — the "Dan" shelter on the Ussishkin corner (`busStopDan`). 1993-cup: the
 *                      wait for the bus to the final is a scene — the papers, the payphone, the
 *                      people under the tin roof — and the bus is boarded from here.
 *
 * **How each floor was measured** (rule 52/55: horizon from two known sizes, then
 * `size = 1.3 × metre(y)`, the rooms2000 convention — the reference height is the 1.30 m child
 * the rooms were tuned for, and `PlayerFigure.scale` grows him):
 *
 *   · menora — the same camera as `arenaEuroSeats`/`botevgradSeats2026` (the door at 0.905–0.955,
 *     the rail, the court), but the painting sits ~0.03 lower in the frame: the door's foot is on
 *     0.56 (0.52 there) and the front row of seats on the left comes down to 0.78. Horizon 0.39,
 *     camera 1.6 m (arena-seats' own E) → metre(y) = (y − 0.39) / 1.6. Band 0.78–0.95 (the
 *     concourse in front of the first row), ramp 1.44.
 *   · gate5-stand — the barrier behind the drum (a 1.1 m crowd barrier, 0.47 → 0.80) and the
 *     stair handrail at its foot (≈1.0 m, 0.49 → 0.78) agree on ≈0.29 of the frame to the metre
 *     at 0.79–0.80; the bottom riser (0.17 m) is 0.04 there. Horizon 0.45, camera 1.21 m → metre(y)
 *     = (y − 0.45) / 1.21. Band 0.80 (the foot of the stairs) – 0.95, ramp 1.43.
 *   · undercroft — the walkers in the sun: a man at 0.80 is 0.24 of the frame (1.75 m), the ones
 *     at 0.69 are 0.10. Horizon 0.61, camera 1.38 m → metre(y) = (y − 0.61) / 1.38. Band 0.82–0.95,
 *     ramp 1.62 (0.80 would have been 1.79 — inside 1.8, and a dolly zoom in all but name).
 *   · bus-stop — the shelter (≈2.6 m, roof 0.13 → foot 0.87) and a parked car (1.4 m, 0.515 →
 *     0.61). Horizon 0.53, camera 1.2 m → metre(y) = (y − 0.53) / 1.2. Band 0.875 (in front of the
 *     shelter) – 0.97, ramp 1.28. Nobody walks behind the glass.
 *
 * `npm run life:boards` (ERA=2024-home / 2001-terrace / 1990 / 1993-cup) draws each of them.
 */

const menoraMetre = (y: number) => (y - 0.39) / 1.6
const standMetre = (y: number) => (y - 0.45) / 1.21
const underMetre = (y: number) => (y - 0.61) / 1.38
const stopMetre = (y: number) => (y - 0.53) / 1.2
const r4 = (n: number) => Math.round(n * 10000) / 10000
const floor = (metre: (y: number) => number, far: number, near: number) => ({
  band: { far, near },
  size: { far: r4(metre(far) * 1.3), near: r4(metre(near) * 1.3) },
  metre: r4(metre(near)),
})

const F = (flag: string): Condition => ({ flag })

/**
 * The doors OUT of these rooms are geography and stand in every year (a room with no way out
 * in some chapter is a trap, and `tests/life-1991.test.ts` asks every room for a door). The two
 * that lead back into Bloomfield keep the ground's own calendar: shut 2016–2018, until it
 * reopens (`BLOOMFIELD_SHUT` in `scenes.ts`, repeated here because this file is read while
 * `scenes.ts` is still being built — the test in `life-bloomfield.test.ts` holds them equal).
 */
const SHUT = CHAPTERS.map((c) => c.id).filter((id) => yearOfChapter(id) >= 2016 && yearOfChapter(id) <= 2018)
const SHUT_NEEDS = Object.fromEntries(SHUT.map((id) => [id, { flag: 'r:reopen' } as Condition]))
const SHUT_BLOCKED = Object.fromEntries(SHUT.map((id) => [id, 'בלומפילד בשיפוץ — גדר ומנופים. משחקי הבית בינתיים בעיר אחרת.']))

/** a named person standing in one of these rooms, on his own body for that year (rule 67) */
function person(id: string, era: string, who: string, year: number, at: { x: number; y: number; left?: boolean }, rest: Partial<ActorDef> = {}): ActorDef {
  const body = castFigure(who, year)
  if (!body) throw new Error(`stadiumSide: no body for ${who}`)
  return {
    id,
    era,
    figure: body.figure,
    x: at.x,
    y: at.y,
    nameHe: who,
    ...(Boolean(at.left) !== facesLeft(body.figure) ? { flip: true } : {}),
    sway: 0.003,
    ...rest,
  }
}

// --------------------------------------------------------------- flags read here ---

/** 2024-home — the night in the big hall (`chapter2024home.ts`) */
const H24_WENT: Condition = { flagIs: { flag: 'life:menora:2025', value: 'went' } }
/** 2001-terrace — the role Asaf gave (`chapterCareer.ts`) */
const T01_ROLE: Condition = { all: [F('t:first'), { flagIs: { flag: 'life:terrace:role', value: 'active' } }] }
/** 2012-terrace — the two modes that are tested on the stairs */
const T02_TESTED: Condition = { any: [{ flagIs: { flag: 't:mode', value: 'trust' } }, { flagIs: { flag: 't:mode', value: 'small' } }] }

export const STADIUM_ROOMS: SceneDef[] = [
  // ============================================================ ההיכל הגדול ===
  {
    id: 'menora',
    titleHe: 'ההיכל הגדול',
    art: 'menoraSeats',
    ...floor(menoraMetre, 0.78, 0.95),
    ambience: 'hall',
    stuckHe: 'השורה הראשונה, ליד המעקה. הכרטיס אומר איפה.',
    spawns: { start: { x: 0.84, y: 0.86, facing: 'left' } },
    actors: [
      // אפי, ליד המעבר — הוא העביר את המנוי כמוך (`h24:ticket` moved), והוא היחיד כאן שמכיר
      // אותך בשם. Walks up once when you come near (delta 93 `initiative`).
      person('menora-efi', '2024-home', 'אפי', 2024, { x: 0.42, y: 0.84 }, {
        talk: 'h24-efi-menora',
        initiative: { reachM: 2.2, when: { none: [F('h24:efi-menora')] } },
      }),
    ],
    hotspots: [
      // S5 — find the seat: the front row by the rail (seats 0.52–0.8, bottoms on 0.66)
      { id: 'menora-seat', era: '2024-home', x: 0.63, y: 0.8, w: 0.08, act: 'h24-find-seat', verb: 'look', labelHe: 'השורה הראשונה — המושב שבכרטיס', when: { none: [F('h24:seat')] }, priority: 3 },
      // S5 — look for familiar faces: the stand across the court
      { id: 'menora-faces', era: '2024-home', x: 0.26, y: 0.82, w: 0.08, act: 'h24-faces', verb: 'look', labelHe: 'לחפש פנים מוכרות ביציע', when: { none: [F('h24:faces')] }, priority: 2 },
      // S5 — sit: the commit (the same spot, once the seat is found)
      { id: 'menora-sit', era: '2024-home', x: 0.63, y: 0.8, w: 0.08, act: 'h24-inside', verb: 'sit', labelHe: 'לשבת', when: { all: [F('h24:seat')], none: [F('h24:inside')] }, priority: 5 },
    ],
    exits: [
      {
        id: 'out',
        x: 0.9,
        y: 0.78,
        w: 0.1,
        h: 0.17,
        to: 'home',
        spawn: 'start',
        labelHe: 'החוצה, הביתה',
        light: { x: 0.9, y: 0.2, w: 0.055, h: 0.36, tone: 'inside' },
        needsByEra: { '2024-home': F('h24:inside') },
        blockedByEra: { '2024-home': 'עוד לא התחיל. הכיסא שלך — ליד המעקה.' },
        dwellMs: 700,
      },
    ],
  },

  // ============================================================= שער 5, מבפנים ===
  {
    id: 'gate5-stand',
    titleHe: 'מתחת ליציע — שער 5',
    art: 'gate5Stand',
    ...floor(standMetre, 0.8, 0.95),
    ambience: 'tunnel',
    stuckHe: 'המדרגות ליציע — באמצע. החוצה — במסדרון משמאל.',
    stuckByEra: {
      '2001-terrace': 'שלוש עבודות מתחת ליציע, זמן לשתיים: הדגלים, הבד, החבלים.',
      '2012-terrace': 'יבגני ליד המדרגות. הוא לא יבקש עזרה — הוא מחכה לתפקיד.',
    },
    spawns: {
      start: { x: 0.4, y: 0.86, facing: 'right' },
      stairs: { x: 0.56, y: 0.88, facing: 'right' },
    },
    layers: [
      // 2001 — the gate opened: the banner on the wall if it was painted, rolled on the floor if not
      { art: 'propBanner', era: '2001-terrace', x: 0.3, y: 0.34, w: 0.13, depth: 0.5, when: { all: [F('t:open'), F('t:task:banner')] } },
      { art: 'propBannerBlank', era: '2001-terrace', x: 0.52, y: 0.905, w: 0.06, depth: 0.905, foot: true, when: { all: [F('t:open')], none: [F('t:task:banner')] } },
      // 2012 — where the big flag ended up: on the wall (he let Yevgeny decide) or on the rail
      { art: 'propFlag', era: '2012-terrace', x: 0.3, y: 0.33, w: 0.08, depth: 0.5, when: { flagIs: { flag: 'life:terrace:handoff', value: 'let' } } },
      { art: 'propFlag', era: '2012-terrace', x: 0.585, y: 0.5, w: 0.07, depth: 0.5, when: { flagIs: { flag: 'life:terrace:handoff', value: 'stepped' } } },
    ],
    actors: [
      // 2012 — יבגני ליד המדרגות, מחכה לתפקיד (T02 S1). He takes the last step himself.
      person('stand-yevgeny', '2012-terrace', 'יבגני', 2012, { x: 0.64, y: 0.84, left: true }, {
        talk: 't-hand',
        initiative: { reachM: 2.2, when: { none: [F('t:hand')] } },
      }),
    ],
    hotspots: [
      // ---- 2001 · S1/S2 — three jobs, time for two; the gate opens at five ----
      { id: 'g5s-flags', era: '2001-terrace', x: 0.21, y: 0.86, w: 0.08, act: 't-task-flags', verb: 'take', labelHe: 'הדגלים על הגדר — להעלות אותם', when: { all: [T01_ROLE], none: [F('t:task:flags'), F('t:open')] }, priority: 3 },
      { id: 'g5s-banner', era: '2001-terrace', x: 0.5, y: 0.91, w: 0.07, act: 't-task-banner', verb: 'take', labelHe: 'הבד על הרצפה — שלוש אותיות חסרות', prop: { key: 'propBannerBlank', size: 0.05, at: { x: 0.5, y: 0.905 } }, when: { all: [T01_ROLE], none: [F('t:task:banner'), F('t:open')] }, priority: 3 },
      { id: 'g5s-rope', era: '2001-terrace', x: 0.8, y: 0.85, w: 0.06, act: 't-task-rope', verb: 'take', labelHe: 'החבלים — לקשור את המעקה למעלה', when: { all: [T01_ROLE], none: [F('t:task:rope'), F('t:open')] }, priority: 3 },
      // ---- 2001 · S3 — the gate is open; what he says about who did it (fallback for a closed box) ----
      { id: 'g5s-open', era: '2001-terrace', x: 0.66, y: 0.84, w: 0.09, act: 't-credit', verb: 'watch', labelHe: 'המדרגות — השער נפתח', when: { all: [F('t:open')], none: [F('t:credit')] }, priority: 5 },
      // ---- 2012 · S3 — the test, if its box was closed (V3 rule 2) ----
      { id: 'g5s-test', era: '2012-terrace', x: 0.66, y: 0.84, w: 0.09, act: 't-test', verb: 'watch', labelHe: 'הדגל הגדול — מה יבגני מחליט', when: { all: [F('t:hand'), T02_TESTED], none: [F('t:test')] }, priority: 5 },
    ],
    exits: [
      {
        // the corridor on the left, to the barred gate at its end (0.43–0.48) — the turnstiles
        id: 'out',
        x: 0.28,
        y: 0.8,
        w: 0.17,
        h: 0.05,
        to: 'gate5',
        spawn: 'start',
        labelHe: 'החוצה, לקרוסלות',
        needsByEra: SHUT_NEEDS,
        blockedByEra: SHUT_BLOCKED,
        light: { x: 0.43, y: 0.55, w: 0.05, h: 0.14, tone: 'daylight' },
        dwellMs: 700,
      },
    ],
  },

  // ============================================================ מתחת ליציע ===
  {
    id: 'undercroft',
    titleHe: 'מתחת ליציע',
    art: 'undercroft',
    ...floor(underMetre, 0.82, 0.95),
    ambience: 'stadium',
    stuckHe: 'האיש עם הטרנזיסטור ליד העמוד. החוצה — ימינה, לשער 7.',
    spawns: { start: { x: 0.88, y: 0.88, facing: 'left' } },
    actors: [],
    hotspots: [
      // 1990, before the whistle — the rumour (primary), the cart, the empty lanes
      { id: 'uc-radio', era: '1990', x: 0.58, y: 0.86, w: 0.09, act: 'uc-radio-1990', verb: 'listen', labelHe: 'האיש עם הטרנזיסטור, ליד העמוד', when: { none: [F('uc:heard')] }, priority: 4 },
      { id: 'uc-cart', era: '1990', x: 0.84, y: 0.86, w: 0.07, act: 'uc-cart-1990', verb: 'buy', labelHe: 'גרעינים מהעגלה', when: { none: [F('uc:cart')] }, priority: 2 },
      { id: 'uc-lanes', era: '1990', x: 0.4, y: 0.9, w: 0.1, act: 'uc-lanes-1990', verb: 'look', labelHe: 'המעברים הריקים', when: { none: [F('uc:lanes')] }, priority: 2 },
      // B1 S4 (27.9.2026) — after the whistle, the payphone on the pillar: tell home before the radio does
      { id: 'uc-phone', era: '1990', x: 0.21, y: 0.88, w: 0.07, act: 'uc-phone-1990', verb: 'hold', labelHe: 'הטלפון הציבורי מאחורי העמוד — להתקשר הביתה', when: { all: [F('match:over')], none: [F('life:1990:called')] }, priority: 5 },
    ],
    exits: [
      {
        id: 'out',
        x: 0.95,
        y: 0.82,
        w: 0.05,
        h: 0.13,
        to: 'bloomfield-outside',
        spawn: 'fromGate5',
        labelHe: 'החוצה, לשער 7',
        needsByEra: SHUT_NEEDS,
        blockedByEra: SHUT_BLOCKED,
        light: { x: 0.95, y: 0.5, w: 0.05, h: 0.3, tone: 'daylight' },
        dwellMs: 600,
      },
    ],
  },

  // ======================================================= תחנת "דן" בפינה ===
  {
    id: 'bus-stop',
    titleHe: 'התחנה בפינה',
    art: 'busStopDan',
    ...floor(stopMetre, 0.875, 0.97),
    ambience: 'day',
    stuckHe: 'העיתונים, הטלפון, והאוטובוס מאחורי הסככה.',
    spawns: { start: { x: 0.1, y: 0.92, facing: 'right' } },
    actors: [],
    hotspots: [
      // 1993-cup — the wait (S2 travel): the papers, the payphone, who else waits, and the bus
      { id: 'bs-papers', era: '1993-cup', x: 0.49, y: 0.92, w: 0.08, act: 'bs-papers-1993', verb: 'look', labelHe: 'העיתונים של הערב', when: { none: [F('bs:papers'), F('on:bus')] }, priority: 2 },
      { id: 'bs-phone', era: '1993-cup', x: 0.69, y: 0.91, w: 0.06, act: 'bs-phone-1993', verb: 'talk', labelHe: 'הטלפון הציבורי — להתקשר הביתה', when: { none: [F('bs:phone'), F('on:bus')] }, priority: 3 },
      { id: 'bs-wait', era: '1993-cup', x: 0.3, y: 0.92, w: 0.08, act: 'bs-wait-1993', verb: 'look', labelHe: 'מי עוד מחכה', when: { none: [F('bs:wait'), F('on:bus')] }, priority: 2 },
      // the bus itself, behind the shelter — the same boarding as on the corner (`bus-1993`)
      { id: 'bs-bus', era: '1993-cup', x: 0.82, y: 0.91, w: 0.09, act: 'bus-1993', verb: 'enter', labelHe: 'האוטובוס', when: { none: [F('final:over'), F('on:bus')] }, priority: 4 },
    ],
    exits: [
      {
        id: 'back',
        x: 0.0,
        y: 0.875,
        w: 0.05,
        h: 0.09,
        to: 'ussishkin-outside',
        spawn: 'start',
        labelHe: 'חזרה לפינה של האולם',
        light: { x: 0.0, y: 0.55, w: 0.04, h: 0.3, tone: 'daylight' },
        dwellMs: 600,
      },
    ],
  },
]

/**
 * הדלתות פנימה — from rooms that already exist, only in the chapters that walk through them.
 *
 * The night in the big hall is reached by the ride (`ride:menora-25` lands in it), the way the
 * 1997 car lands at the kiosk. It has a door as well, because a room the player can only be
 * carried into is a room he can never walk back to: the bus shelter painted on the road south
 * (`route`, 0.66–0.74 on the far line) — Yad Eliyahu is south-east — open only on the night he
 * chose to go and until he has sat down. In play it is the way back in after a reload mid-ride.
 */
export const STADIUM_EXITS: CityExit[] = [
  {
    from: 'route',
    exit: {
      id: 'menora',
      era: '2024-home',
      x: 0.655,
      y: 0.69,
      w: 0.085,
      h: 0.04,
      to: 'menora',
      spawn: 'start',
      labelHe: 'לאוטובוס — להיכל ביד אליהו',
      light: { x: 0.665, y: 0.5, w: 0.07, h: 0.19, tone: 'daylight' },
      when: { all: [H24_WENT], none: [F('h24:inside')] },
      dwellMs: 900,
    },
  },
  {
    // 2001/2012 — through the turnstiles of the old gate 5 (bloomOldGates: 0.70–0.87)
    from: 'gate5',
    exit: {
      id: 'stand',
      era: ['2001-terrace', '2012-terrace'],
      x: 0.72,
      y: 0.74,
      w: 0.14,
      h: 0.07,
      to: 'gate5-stand',
      spawn: 'start',
      labelHe: 'דרך הקרוסלות, מתחת ליציע',
      light: { x: 0.7, y: 0.55, w: 0.17, h: 0.22, tone: 'inside' },
      dwellMs: 700,
    },
  },
  {
    // 1990 — the gate-5 slot of the forecourt (0.93), which is not a door that year
    from: 'bloomfield-outside',
    exit: {
      id: 'undercroft',
      era: '1990',
      x: 0.93,
      y: 0.82,
      w: 0.07,
      h: 0.16,
      to: 'undercroft',
      spawn: 'start',
      labelHe: 'מתחת ליציע',
      light: { x: 0.92, y: 0.55, w: 0.08, h: 0.4, tone: 'inside' },
      dwellMs: 600,
    },
  },
  {
    // 1993-cup — the corner, where the road turns right past the building
    from: 'ussishkin-outside',
    exit: {
      id: 'stop',
      era: '1993-cup',
      x: 0.965,
      y: 0.82,
      w: 0.035,
      h: 0.14,
      to: 'bus-stop',
      spawn: 'start',
      labelHe: 'לתחנה בפינה',
      light: { x: 0.96, y: 0.55, w: 0.04, h: 0.25, tone: 'daylight' },
      dwellMs: 600,
    },
  },
]

export const STADIUM_CHAPTERS = { menora: ['2024-home'], stand: ['2001-terrace', '2012-terrace'], undercroft: ['1990'], stop: ['1993-cup'] } as const
export { H24_WENT }
