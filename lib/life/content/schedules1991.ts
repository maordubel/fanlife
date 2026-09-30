import { at } from '../clock'
import type { NPCScheduleEntry } from '../schedules'

import { BELL, CURFEW, SCHOOL_STARTS, TIP_OFF } from './chapter1991'

/**
 * 11.3.1991 — מי איפה, ומתי, ביום שני.
 *
 * The same machine as the two Saturdays, and the first day in this game with a
 * TIMETABLE that is not the child's own: school starts whether or not he is ready, the
 * bell goes whether or not the note has been answered, and the hall fills from seven.
 * Nobody in this file waits for the player. That is the whole difference between a
 * Saturday you are taken to and a Monday you have to arrange.
 */

const YARD = BELL
const YARD_END = at(9, 40)
const AFTER_SCHOOL = at(13, 30)
const EVENING = at(18, 30)
const DOORS = at(19, 10)

export const SCHEDULE_1991: NPCScheduleEntry[] = [
  // -------------------------------------------------------------------- the school ---
  {
    characterId: 'teacher',
    actorId: 'teacher',
    location: 'classroom',
    start: SCHOOL_STARTS,
    end: at(13, 0),
    behavior: 'wait',
    x: 0.47,
    y: 0.76,
    drift: 0.02,
  },
  {
    characterId: 'keren',
    actorId: 'keren-desk',
    location: 'classroom',
    start: SCHOOL_STARTS,
    end: YARD,
    behavior: 'wait',
    x: 0.78,
    y: 0.745,
    facing: 'left',
  },
  {
    characterId: 'ofir',
    actorId: 'ofir-yard',
    location: 'schoolyard',
    start: YARD,
    end: YARD_END,
    behavior: 'wait',
    x: 0.36,
    y: 0.88,
    drift: 0.01,
  },
  {
    characterId: 'amit',
    actorId: 'amit-yard',
    location: 'schoolyard',
    start: YARD,
    end: YARD_END,
    behavior: 'wait',
    x: 0.62,
    y: 0.9,
    facing: 'left',
  },
  {
    characterId: 'keren',
    actorId: 'keren-yard',
    location: 'schoolyard',
    start: YARD,
    end: YARD_END,
    behavior: 'wait',
    // on the stone bench under the tree — her figure is seated (`keren90-sit`, 21.9.2026)
    x: 0.76,
    y: 0.68,
    facing: 'left',
  },

  // ------------------------------------------------------------------ the afternoon ---
  {
    characterId: 'ofir',
    actorId: 'ofir-street-1991',
    location: 'street',
    start: AFTER_SCHOOL,
    end: EVENING,
    behavior: 'wait',
    x: 0.16,
    y: 0.79,
    drift: 0.01,
  },
  {
    characterId: 'rachel',
    actorId: 'rachel-1991',
    location: 'home',
    start: at(15, 0),
    end: at(23, 59),
    behavior: 'wait',
    x: 0.6,
    y: 0.84,
  },
  {
    characterId: 'kobi',
    actorId: 'kobi-1991',
    location: 'home',
    start: at(17, 40),
    end: at(23, 59),
    behavior: 'wait',
    x: 0.28,
    y: 0.8,
  },

  // -------------------------------------------------------------------- the evening ---
  {
    characterId: 'usher',
    actorId: 'usher-night',
    location: 'ussishkin-outside',
    start: EVENING,
    /**
     * …ועד אחרי שכולם יצאו.
     *
     * This was `TIP_OFF + 20` — twenty past eight — and `derby:over` does not land until
     * about five to ten. Which meant the one line this man exists for, the one where he
     * says goodnight to a boy by name after a night neither of them will forget, could
     * never be heard. He stays until half past ten now, which is what a doorman does: he
     * lets them in, and then he stands there while they come out.
     */
    end: at(22, 30),
    behavior: 'wait',
    // Beside the glass doors (0.33–0.45), never in them: a person standing in a doorway
    // wins the prompt over the door itself.
    x: 0.55,
    y: 0.9,
    facing: 'left',
  },
  {
    characterId: 'amit',
    actorId: 'amit-hall',
    location: 'ussishkin-hall',
    start: DOORS,
    end: CURFEW + 60,
    behavior: 'wait',
    x: 0.42,
    y: 0.9,
  },
  {
    characterId: 'ofir',
    actorId: 'ofir-hall',
    location: 'ussishkin-hall',
    start: DOORS,
    end: CURFEW + 60,
    behavior: 'wait',
    x: 0.3,
    y: 0.93,
    facing: 'right',
  },
  {
    characterId: 'vendor',
    actorId: 'hall-vendor',
    location: 'ussishkin-outside',
    start: EVENING,
    end: TIP_OFF + 40,
    behavior: 'wait',
    x: 0.72,
    y: 0.92,
    facing: 'left',
  },
]
