import { describe, expect, it } from 'vitest'

import { CHAPTERS } from '@/lib/life/content/chapters'
import { eraFor } from '@/lib/life/content/era'
import { emptyState } from '@/lib/life/events'
import { nextStep } from '@/lib/life/world/route'
import type { LifeState, LocationId } from '@/lib/life/types'

/**
 * שכל פרק ידע לאן הוא שולח אותך, ושאפשר להגיע לשם.
 *
 * Maor, 6.9.2026, stuck in the autumn of 1984: *"אפי אומר לך ללכת אחרי הקיר ימינה. אין לי
 * מושג מה הכוונה במשפט הזה. והדרך לאוסישקין חסומה בכלל."* Two separate failures behind one
 * sentence — a chapter that knew where it was sending him but had nowhere to write it down,
 * and a destination whose map pin did not exist until 1990 in a chapter set in 1984.
 *
 * These tests are the lock on both. Every playable chapter declares a `goal`; every room a
 * `goal` can name is reachable from that chapter's own starting room through doors that
 * exist in that chapter. The route search is the same one the game uses for the arrow, so
 * a test that passes is a promise about what a thumb will find, not about what a
 * developer believes.
 */

const CHAPTER_IDS = CHAPTERS.filter((chapter) => chapter.playable !== false).map((chapter) => chapter.id)

const stateFor = (chapter: string, flags: Record<string, boolean | string | number> = {}): LifeState => {
  const definition = CHAPTERS.find((entry) => entry.id === chapter)!
  const base = emptyState({ name: 'פוגי', sex: 'boy', birthYear: 1978 }, definition.year)
  return {
    ...base,
    chapter,
    minute: definition.minute,
    location: definition.start.location as LocationId,
    flags: { ...flags },
  }
}

/**
 * Every flag any `goal` in the game reads, so the sweep can turn them on one at a time and
 * see every room a chapter can point at. Listed rather than derived, because deriving it
 * would mean parsing the functions and a wrong list is better than a clever one that is
 * also wrong: a flag missing from here means a destination goes unchecked, and the test
 * below will still catch the ones that are checked.
 */
const GOAL_FLAGS = [
  'a2:played', 'a2:late', 'a2:errand', 'a2:bread',
  'a3:inside', 'knows:hall', 'life:knows:hall', 'entry:granted',
  'own:shirt85', 'a4:gave', 'a5:there', 'a5:dressed',
  'a6:heard', 'a6:radio-dead', 'a6:with-liron', 'a7:refused', 'a7:knows',
  'found:kobi', 'knows:match', 'walked:march', 'walked:home', 'knows:math', 'kobi:left',
  'derby:over', 'permission:yes', 'sneak:ready', 'hw:done', 'hw:half', 'hw:faked', 'school:done',
  'final:over', 'route:tv', 'route:efi', 'route:ofir',
  'life:galil:d2', 'life:galil:d3', 'life:galil:d4', 'life:galil:d5', 'g4:decided', 'after:done',
  'life:sinai:s2', 's2:done', 's1:argued', 's1:heard',
  'life:army:d2', 'life:army:d3', 'life:army:d4', 'a2:chose', 'a3:decided', 'a4:road',
  'life:hall:h2', 'h2:done', 'h1:decided',
  'life:laces:l2', 'l2:done', 'l1:after', 'l1:inside',
  'seed:list', 'seed:hall', 'c99:over', 'c99:route', 't:over', 't:route', 'd:over', 'd:final',
]

describe('every chapter knows where it is sending the player', () => {
  it('all nineteen declare a goal', () => {
    const silent = CHAPTER_IDS.filter((chapter) => !eraFor(chapter).goal)
    expect(silent).toEqual([])
  })

  for (const chapter of CHAPTER_IDS) {
    it(`${chapter}: every room it can point at is reachable from where the chapter starts`, () => {
      const era = eraFor(chapter)
      const definition = CHAPTERS.find((entry) => entry.id === chapter)!
      const start = definition.start.location as LocationId
      const unreachable: string[] = []

      // the opening state, then one state per flag the goals read — enough to walk every
      // branch of every goal function without knowing how any of them is written
      const states = [stateFor(chapter), ...GOAL_FLAGS.map((flag) => stateFor(chapter, { [flag]: true }))]
      for (const state of states) {
        const goal = era.goal?.(state) ?? null
        if (!goal || goal === start) continue
        if (!nextStep(state, chapter, start, goal)) unreachable.push(goal)
      }
      expect([...new Set(unreachable)]).toEqual([])
    })
  }
})
