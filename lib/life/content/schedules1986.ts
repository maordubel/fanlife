import { at } from '../clock'
import type { NPCScheduleEntry } from '../schedules'
import { FULL_TIME, KOBI_LEAVES } from '../world/scenes'

/**
 * מי איפה, ומתי — the afternoon's timetable.
 *
 * Read this top to bottom and you can see the chapter: everybody drains eastwards. Efi
 * is gone by two. Ofir moves from the wall to the pitch and then, at ten past three,
 * starts walking the same way as the grown-ups. Amit gives up on his newspaper at twenty
 * to three. The street the child walks back into at half past three is not the street he
 * left, and nothing in the code had to say so — it is six rows of data.
 *
 * The point is not realism. It is that the player who spent forty minutes on the pitch
 * comes back to an emptier street, and understands, without being told, what forty
 * minutes cost.
 */

/**
 * כל מיקום כאן הוא בתוך רצועת ההליכה של הסצנה שלו — every coordinate below stands inside
 * the walk band of the scene it names, and clear of its doors.
 *
 * That is not a style note, it is the whole contract. A schedule row OVERRIDES the
 * scene's own actor position at `create`, so a row a few hundredths below the band puts
 * a person in the road where the child physically cannot reach them: no prompt, no
 * conversation, and nothing anywhere that says so. Three street rows were exactly that
 * after the September backdrops moved the street's band from 0.9 to 0.86 — Ofir was
 * standing in the kiosk doorway and Amit and Keren were in the traffic — and the
 * playthrough harness is what found it. `tests/life-systems.test.ts` now asserts it, so
 * the next person to re-frame a backdrop gets a failing test instead of a silent street.
 */
const DAY_START = at(12, 0)

export const SCHEDULE_1986: NPCScheduleEntry[] = [
  // ------------------------------------------------------------------------- Kobi ---
  {
    characterId: 'kobi',
    actorId: 'kobi',
    location: 'home',
    start: DAY_START,
    end: KOBI_LEAVES,
    behavior: 'wait',
    // in the painted armchair (0.11–0.27), the figure's own chair drawn over it (21.9.2026)
    x: 0.19,
    y: 0.74,
  },

  // ------------------------------------------------------------------------ Ofir ----
  {
    characterId: 'ofir',
    actorId: 'ofir',
    location: 'street',
    start: DAY_START,
    end: at(13, 40),
    behavior: 'wait',
    // 6.9.2026: west of the counter rather than on it. The kiosk's door moved onto the
    // counter it is the door of (0.185–0.29) and he was standing in the middle of it —
    // a boy you have to walk through a shop to reach.
    x: 0.135,
    y: 0.775,
    drift: 0.008,
  },
  {
    characterId: 'ofir',
    actorId: 'ofir-pitch',
    location: 'pitch',
    start: at(13, 40),
    end: at(14, 50),
    behavior: 'play',
    x: 0.6,
    y: 0.88,
    drift: 0.02,
  },
  {
    characterId: 'ofir',
    actorId: 'ofir-later',
    location: 'street',
    start: at(14, 50),
    end: at(15, 40),
    behavior: 'walk',
    x: 0.665,
    y: 0.79,
    drift: 0.012,
    facing: 'right',
  },
  {
    characterId: 'ofir',
    actorId: 'ofir-ground',
    location: 'bloomfield-outside',
    start: at(15, 40),
    end: FULL_TIME,
    behavior: 'wait',
    x: 0.4,
    y: 0.92,
  },

  // ------------------------------------------------------------------------ Amit ----
  {
    characterId: 'amit',
    actorId: 'amit-kiosk',
    location: 'kiosk',
    start: DAY_START,
    end: at(13, 0),
    behavior: 'buy',
    x: 0.62,
    y: 0.9,
  },
  {
    characterId: 'amit',
    actorId: 'amit-street',
    location: 'street',
    start: at(13, 0),
    end: at(14, 40),
    behavior: 'wait',
    x: 0.375,
    y: 0.755,
    drift: 0.004,
  },
  {
    characterId: 'amit',
    actorId: 'amit',
    location: 'pitch',
    start: at(14, 40),
    end: at(15, 30),
    behavior: 'play',
    x: 0.83,
    y: 0.86,
  },

  // -------------------------------------------------------------------------- Efi ---
  // He is the missable one, and he is missable on purpose: the hall is the other life
  // this child could have, and it closes at two whether or not anybody went.
  {
    characterId: 'efi',
    actorId: 'efi',
    location: 'pitch',
    start: DAY_START,
    end: at(14, 0),
    behavior: 'wait',
    x: 0.26,
    y: 0.9,
    drift: 0.01,
  },

  // ------------------------------------------------------------------------ Keren ---
  {
    characterId: 'keren',
    actorId: 'keren',
    location: 'street',
    start: at(13, 30),
    end: at(15, 30),
    behavior: 'wait',
    x: 0.715,
    y: 0.815,
    drift: 0.003,
  },

  // ---------------------------------------------------------------------- neighbour -
  {
    characterId: 'neighbour',
    actorId: 'neighbour',
    location: 'street',
    start: DAY_START,
    end: at(16, 10),
    behavior: 'wait',
    x: 0.525,
    y: 0.735,
    drift: 0.005,
  },
]
