import type { CharacterId, LifeState, LocationId } from './types'
import { meets, type Condition } from './world/types'

/**
 * לוח הזמנים — people stop being furniture.
 *
 * An NPC who stands on the same paving stone from noon until dark is a quest terminal
 * with a face. The fix is small and it is entirely data: a person has a list of places
 * to be, with times, and a behaviour while they are there. Walk out of the kiosk twenty
 * minutes later and the street is not the street you left.
 *
 * A schedule entry can also carry a POSITION, because "Ofir is on the street" and "Ofir
 * is at the far end of the street with his back to you, about to go" are different
 * sentences, and the second one is the one that makes a player hurry.
 *
 * The scene reads this every minute and moves people. Nothing is animated by hand and
 * nothing is scripted per NPC; adding somebody to the afternoon is adding rows.
 */

export type NPCBehavior = 'wait' | 'walk' | 'leave' | 'arrive' | 'talkTo' | 'buy' | 'play' | 'watch'

export type NPCScheduleEntry = {
  characterId: CharacterId
  /** the actor id in the scene definition this entry drives */
  actorId: string
  location: LocationId
  start: number
  end: number
  behavior: NPCBehavior
  /** where in the painting, if this entry moves them */
  x?: number
  y?: number
  /** how far they drift while they are here, as a fraction of the backdrop */
  drift?: number
  facing?: 'left' | 'right'
  when?: Condition
}

export type ScheduledPlacement = {
  actorId: string
  visible: boolean
  x?: number
  y?: number
  drift?: number
  facing?: 'left' | 'right'
  behavior?: NPCBehavior
}

/**
 * What the room looks like right now.
 *
 * Returns one placement per actor that a schedule has an opinion about. An actor nobody
 * scheduled is left exactly as the scene definition placed them — schedules are an
 * override, not a replacement, so a room with no schedule still works.
 */
export function placementsAt(
  state: LifeState,
  schedule: readonly NPCScheduleEntry[],
  where: LocationId,
): Map<string, ScheduledPlacement> {
  const out = new Map<string, ScheduledPlacement>()
  const scheduledActors = new Set(schedule.map((entry) => entry.actorId))

  for (const actorId of scheduledActors) out.set(actorId, { actorId, visible: false })

  for (const entry of schedule) {
    if (entry.location !== where) continue
    if (state.minute < entry.start || state.minute >= entry.end) continue
    if (!meets(state, entry.when)) continue
    out.set(entry.actorId, {
      actorId: entry.actorId,
      visible: entry.behavior !== 'leave',
      ...(entry.x !== undefined ? { x: entry.x } : {}),
      ...(entry.y !== undefined ? { y: entry.y } : {}),
      ...(entry.drift !== undefined ? { drift: entry.drift } : {}),
      ...(entry.facing ? { facing: entry.facing } : {}),
      behavior: entry.behavior,
    })
  }

  return out
}

/** Where somebody is right now, for a conversation that wants to say so. */
export function whereIs(
  state: LifeState,
  schedule: readonly NPCScheduleEntry[],
  who: CharacterId,
): LocationId | null {
  const entry = schedule.find(
    (candidate) =>
      candidate.characterId === who &&
      state.minute >= candidate.start &&
      state.minute < candidate.end &&
      candidate.behavior !== 'leave' &&
      meets(state, candidate.when),
  )
  return entry?.location ?? null
}
