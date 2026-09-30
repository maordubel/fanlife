import { describe, expect, it } from 'vitest'

import { CHAPTERS } from '@/lib/life/content/chapters'
import { eraFor } from '@/lib/life/content/era'
import { emptyState } from '@/lib/life/events'
import { beatFlag } from '@/lib/life/content/beats'
import {
  forcedEnding,
  isStalled,
  LAST_RESORT_MINUTES,
  STALL_MINUTES,
  waitingForTheClock,
  type ResortInput,
} from '@/lib/life/world/lastResort'
import type { LifeState } from '@/lib/life/types'

/**
 * רשת הביטחון — the rule that guarantees no day stays open, tested without a browser.
 *
 * This logic shipped a dead end: in 1984 a boy who played football in the alley could not
 * end the afternoon, because the one beat that closes the day fired on entering a room he
 * was already standing in and the night ending excluded him by name. It lived inside a
 * Phaser scene, so the only way to exercise it was to boot a browser and play. It is a
 * pure function now, and these run it over every chapter in the game.
 */

const stateFor = (chapter: string, extra: Partial<LifeState> = {}): LifeState => {
  const def = CHAPTERS.find((entry) => entry.id === chapter)!
  return { ...emptyState({ name: 'פוגי', sex: 'boy', birthYear: 1978 }, def.year), chapter, ...extra }
}

const input = (chapter: string, over: Partial<ResortInput> = {}): ResortInput => ({
  state: stateFor(chapter),
  era: eraFor(chapter),
  objectiveHe: null,
  livedFor: 0,
  stalledFor: 0,
  busy: false,
  ...over,
})

const PLAYABLE = CHAPTERS.filter((chapter) => chapter.playable !== false).map((chapter) => chapter.id)

describe('רשת הביטחון — no day stays open', () => {
  /**
   * The two conditions are different in kind and the test says so.
   *
   * The STALL never fires while the chapter still wants something — that is the whole
   * point of it, and `isStalled` is where the objective is read. The CLOCK is the floor
   * and fires regardless: a player twenty-two game-hours into a single day has been in one
   * chapter for a very long time, and leaving him there because the objective line is
   * non-empty is the failure this exists to prevent.
   */
  it('never stalls a chapter that still wants something', () => {
    expect(isStalled(input('a2-alley', { objectiveHe: 'לחם מהקיוסק.' }))).toBe(false)
    expect(forcedEnding(input('a2-alley', { objectiveHe: 'לחם מהקיוסק.', stalledFor: STALL_MINUTES - 1 }))).toBeNull()
  })

  it('the clock floor fires even when the chapter still wants something', () => {
    expect(forcedEnding(input('a2-alley', { objectiveHe: 'לחם מהקיוסק.', livedFor: LAST_RESORT_MINUTES }))).toBeTruthy()
  })

  it('does nothing while a card, a match or a conversation owns the screen', () => {
    expect(forcedEnding(input('a2-alley', { busy: true, stalledFor: 999, livedFor: 9999 }))).toBeNull()
  })

  it('does nothing to a chapter that has already closed', () => {
    const state = stateFor('a2-alley', { chapterDone: true })
    expect(forcedEnding(input('a2-alley', { state, stalledFor: 999, livedFor: 9999 }))).toBeNull()
  })

  it('closes a day that has wanted nothing for ninety minutes', () => {
    expect(forcedEnding(input('a2-alley', { stalledFor: STALL_MINUTES }))).toBeTruthy()
  })

  it('closes a day that has run twenty-two game-hours whatever it wants', () => {
    expect(forcedEnding(input('a2-alley', { objectiveHe: null, livedFor: LAST_RESORT_MINUTES }))).toBeTruthy()
  })

  /**
   * The bug this guard exists for, in the other direction: 1984 ends at half past five and
   * the boy has nothing to want from four o'clock, so ninety idle minutes ran out before
   * the chapter's own ending was due and the backstop stole it. A rescue that beats the
   * written scene is worse than the bug it was built for.
   */
  it('does not count a chapter as stalled while a beat is merely early', () => {
    // (23.9.2026) `a2-after` — the beat this used to exercise — no longer waits on a
    // clock: the 23.9.2026 overlay closes the alley evening as soon as the boy has played,
    // rather than at 17:30, so it is no longer "merely early" once `a2:played` is set. The
    // property this guards (a beat blocked on nothing but a future time is not a stall) is
    // still real — `a2-teams-full` is time-gated the same way and is still ahead of its
    // own clock at four in the afternoon — so the scenario now exercises that beat instead.
    const state = stateFor('a2-alley', { flags: { 'life:a:d2': true }, minute: 16 * 60 })
    expect(waitingForTheClock(state, eraFor('a2-alley'))).toBe(true)
    expect(isStalled(input('a2-alley', { state }))).toBe(false)
  })

  it('does count it as stalled once every beat that could fire has fired', () => {
    const era = eraFor('a2-alley')
    const flags: Record<string, boolean> = { 'a2:played': true }
    for (const beat of era.beats ?? []) flags[beatFlag(beat.id)] = true
    const state = stateFor('a2-alley', { flags, minute: 23 * 60 })
    expect(isStalled(input('a2-alley', { state }))).toBe(true)
  })

  for (const chapter of PLAYABLE) {
    it(`${chapter}: has an ending the backstop can close it with`, () => {
      expect(forcedEnding(input(chapter, { stalledFor: STALL_MINUTES }))).toBeTruthy()
    })
  }
})
