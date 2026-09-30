import { beatFlag } from '../content/beats'
import type { Era } from '../content/era'
import type { LifeState } from '../types'
import { unmet } from './why'

/**
 * שאף יום לא יישאר פתוח — the rule, out of the Phaser scene and into a function.
 *
 * This logic has already produced one shipped dead end. In 1984 a boy who played football
 * in the alley raised `a2:played`; the only beat that closed the day fired on ENTERING the
 * pitch — the room he was already standing in — and the night ending excluded `a2:played`
 * by name. The afternoon ran to midnight and past it with nothing left to press.
 *
 * It lived inside `WorldScene` as two private methods, which meant the only way to test it
 * was to boot a browser and play a chapter. It is a pure function of the state, the era's
 * beats and two counters, so it is one here, and `tests/life-lastresort.test.ts` runs it
 * over every chapter without a canvas.
 *
 * The two conditions are deliberately different in kind:
 *
 *   - **the clock** is the crude floor. Twenty-two game-hours after a chapter opened,
 *     whatever it was about is over. Counted as ELAPSED minutes rather than a time of day,
 *     because the clock wraps at midnight and a chapter that runs past it comes back round
 *     to a number that looks like the morning.
 *   - **the stall** is the honest signal, and it is the exact shape of every dead end
 *     reported so far: the chapter has stopped WANTING anything — its objective has gone
 *     null — and no beat is waiting to say so.
 *
 * A beat whose only unmet clause is a time that has not arrived yet is NOT a stall: the
 * chapter is still doing something, it is simply early. A rescue that beats the written
 * ending is worse than the bug it was built for.
 */

/** twenty-two game-hours: an hour past the latest thing any chapter schedules, and then some */
export const LAST_RESORT_MINUTES = 22 * 60

/** game-minutes of wanting nothing before the day is closed for the player */
export const STALL_MINUTES = 90

export type ResortInput = {
  state: LifeState
  era: Era
  /** what the chapter's objective says right now — null means it wants nothing */
  objectiveHe: string | null
  /** game-minutes since `chapter.entered`, never wrapped */
  livedFor: number
  /** consecutive game-minutes of wanting nothing */
  stalledFor: number
  /** a card, a conversation, a match or a cutscene owns the screen */
  busy: boolean
}

/** Is a beat of this chapter merely EARLY — waiting on a clock that will come? */
export function waitingForTheClock(state: LifeState, era: Era): boolean {
  return (era.beats ?? []).some((beat) => {
    if (state.flags[beatFlag(beat.id)]) return false
    const needs = unmet(state, beat.when)
    return needs.length > 0 && needs.every((need) => need.startsWith('אחרי '))
  })
}

/** Is the day idle — nothing wanted, nothing pending, and nothing merely early? */
export function isStalled(input: ResortInput): boolean {
  if (input.busy) return false
  if (input.objectiveHe) return false
  return !waitingForTheClock(input.state, input.era)
}

/**
 * The ending to close this day with, or null to leave it running.
 *
 * The chapter's own writing always gets first refusal: this only answers once the day has
 * either run out of time or run out of anything to want. The ending chosen is the
 * chapter's own idea of "nothing happened" where it has one.
 */
export function forcedEnding(input: ResortInput): string | null {
  if (input.state.chapterDone || input.busy) return null
  if (input.livedFor < LAST_RESORT_MINUTES && input.stalledFor < STALL_MINUTES) return null
  const endings = input.era.endings
  const id = ['home', 'missed', 'late', 'played'].find((key) => endings[key]) ?? Object.keys(endings)[0]
  return id ?? null
}
