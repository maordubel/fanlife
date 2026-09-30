import type { LifeState, LocationId } from '../types'
import { ALL_SCENES, exitInEra, needsFor, whenFor } from './scenes'
import { meets } from './types'

/**
 * לאן ללכת מפה — the next door on the way to somewhere, and why the game needed one.
 *
 * Maor, 6.9.2026: *"אפי אומר לך ללכת אחרי הקיר ימינה, אין לי מושג מה הכוונה במשפט הזה."*
 * He is right, and the line is not the bug. A six-year-old in 1984 says "after the wall,
 * right" because that is how a child gives directions; the bug is that the game then left
 * him to work out which of six doorways on a painted street that sentence meant, in a
 * chapter whose whole content is one room he has never been to.
 *
 * A game with rooms and doors already knows the answer. This is a breadth-first search
 * over the doors that are OPEN IN THIS CHAPTER — `exitInEra` for existence, `whenFor` for
 * whether it is drawn, `needsFor` for whether it is locked — from where the player is
 * standing to where the chapter wants him. It returns the first door of the shortest way
 * there, with the label printed on it, so the room can say «למרכז תל אביב» instead of
 * «אחרי הקיר», and the arrow at the edge of the glass can point at the door that is
 * actually on the way rather than at the biggest one in the room.
 *
 * It reports a locked door as locked rather than routing around it, because "the way is
 * that one and it is shut" is information and silently proposing a longer way is not.
 */

export type Step = {
  /** the door to take from here */
  exitId: string
  /** where that door goes */
  to: LocationId
  /** what is written on it */
  labelHe: string
  /** how many doors from here to the destination */
  distance: number
  /** the door is on the way but will not open in the state the player is in */
  locked: boolean
}

const sceneById = new Map(ALL_SCENES.map((scene) => [scene.id, scene]))

/**
 * The first step from `from` to `to`, or null when there is no way at all in this chapter.
 *
 * `state` decides only whether a door is currently OPEN; the search itself walks every
 * door the chapter has, so a route through a locked door is still found and returned with
 * `locked: true`. A game that hides the way because the way is shut is how a player ends
 * up believing a chapter is broken.
 */
export function nextStep(state: LifeState, chapter: string, from: LocationId, to: LocationId): Step | null {
  if (from === to) return null
  const seen = new Set<LocationId>([from])
  type Node = { at: LocationId; first: Step | null; distance: number }
  const queue: Node[] = [{ at: from, first: null, distance: 0 }]

  while (queue.length) {
    const node = queue.shift()!
    const scene = sceneById.get(node.at)
    if (!scene) continue
    for (const exit of scene.exits) {
      if (!exitInEra(exit, chapter)) continue
      const target = exit.to as LocationId
      if (seen.has(target)) continue
      seen.add(target)
      const shut = !meets(state, whenFor(exit, chapter)) || !meets(state, needsFor(exit, chapter))
      const step: Step =
        node.first ??
        {
          exitId: exit.id,
          to: target,
          labelHe: exit.labelHe ?? exit.id,
          distance: node.distance + 1,
          locked: shut,
        }
      if (target === to) return { ...step, distance: node.distance + 1 }
      queue.push({ at: target, first: step, distance: node.distance + 1 })
    }
  }
  return null
}
