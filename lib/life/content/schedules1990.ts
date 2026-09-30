import { at } from '../clock'
import type { NPCScheduleEntry } from '../schedules'
import { FULL_TIME, KICKOFF, KOBI_LEAVES } from '../world/scenes'

/**
 * 12.5.1990 — who is where, and when, on the day of the last round.
 *
 * Same machine as 1986 and a different day. The one structural difference is Kobi: in
 * 1986 he left at ten past three whether or not the child was ready, and that was the
 * chapter's antagonist. In 1990 he says "יוצאים" and WAITS — at the table, then at the
 * gate — because a twelve-year-old is somebody you wait for. He still leaves eventually
 * (`kobi:left`), and the boy who is not with him by then walks alone, which is not a
 * punishment: it is the other half of the chapter.
 */

const DAY_START = at(12, 0)
export const KOBI_SAYS_LEAVING = at(14, 40)
/** after "five minutes" he gives it fifteen */
export const KOBI_LEAVES_LATE = KOBI_LEAVES + 15
const FRIENDS_AT_KIOSK = at(14, 30)
const FRIENDS_TO_GROUND = at(15, 35)
const GATES = at(15, 40)

export const SCHEDULE_1990: NPCScheduleEntry[] = [
  // ------------------------------------------------------------------------- Kobi ---
  {
    characterId: 'kobi',
    actorId: 'kobi-table',
    location: 'kitchen',
    start: DAY_START,
    end: FULL_TIME,
    behavior: 'wait',
    x: 0.785,
    y: 0.68,
    when: { notFlag: 'kobi:left' },
  },
  {
    characterId: 'kobi',
    actorId: 'kobi-gate',
    location: 'bloomfield-outside',
    start: GATES,
    end: KICKOFF + 12,
    behavior: 'wait',
    x: 0.62,
    y: 0.9,
    facing: 'left',
    when: { any: [{ flag: 'went:withKobi' }, { flag: 'asked:five' }] },
  },

  // ----------------------------------------------------------------------- Rachel ---
  {
    characterId: 'rachel',
    actorId: 'rachel-kitchen',
    location: 'kitchen',
    start: DAY_START,
    end: at(13, 30),
    behavior: 'wait',
    x: 0.42,
    y: 0.73,
  },
  {
    characterId: 'rachel',
    actorId: 'rachel-home',
    location: 'home',
    start: at(13, 30),
    end: at(23, 59),
    behavior: 'wait',
    x: 0.6,
    y: 0.84,
  },

  // ---------------------------------------------------------------------- friends ---
  {
    characterId: 'ofir',
    actorId: 'ofir-street',
    location: 'street',
    start: DAY_START,
    end: FRIENDS_AT_KIOSK,
    behavior: 'wait',
    // west of the counter, not on it — see the same move in `schedules1986.ts`
    x: 0.14,
    y: 0.78,
    drift: 0.008,
  },
  {
    characterId: 'amit',
    actorId: 'amit-street',
    location: 'street',
    start: DAY_START,
    end: FRIENDS_AT_KIOSK,
    behavior: 'wait',
    x: 0.57,
    y: 0.79,
  },
  {
    characterId: 'ofir',
    actorId: 'ofir-kiosk',
    location: 'kiosk',
    start: FRIENDS_AT_KIOSK,
    end: FRIENDS_TO_GROUND,
    behavior: 'wait',
    x: 0.6,
    y: 0.92,
    facing: 'left',
    when: { notFlag: 'went:withFriends' },
  },
  {
    characterId: 'amit',
    actorId: 'amit-kiosk',
    location: 'kiosk',
    start: FRIENDS_AT_KIOSK,
    end: FRIENDS_TO_GROUND,
    behavior: 'wait',
    x: 0.5,
    y: 0.95,
    when: { notFlag: 'went:withFriends' },
  },
  {
    characterId: 'ofir',
    actorId: 'ofir-ground',
    location: 'bloomfield-outside',
    start: FRIENDS_TO_GROUND,
    end: KICKOFF + 5,
    behavior: 'wait',
    x: 0.33,
    y: 0.93,
  },

  // ----------------------------------------------------------- the street's own ---
  {
    characterId: 'veteran',
    actorId: 'veteran',
    location: 'street',
    start: at(13, 0),
    end: at(15, 20),
    behavior: 'wait',
    x: 0.66,
    y: 0.8,
    facing: 'left',
  },
  {
    characterId: 'radio-walker',
    actorId: 'radio-walker',
    location: 'route',
    start: at(14, 30),
    end: KICKOFF + 20,
    behavior: 'walk',
    x: 0.5,
    y: 0.8,
    drift: 0.03,
  },
]
