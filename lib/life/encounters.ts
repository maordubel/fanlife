import type { Effect } from './content/script'
import type { LifeEvent } from './events'
import { Roller } from './rng'
import type { LifeState, LocationId } from './types'
import { meets, type Condition } from './world/types'

/**
 * מפגשים — the small unrepeatable things, from a pool, off the seed.
 *
 * The reason a street feels alive is not that a lot happens on it. It is that something
 * happened that the player cannot make happen again, and that they suspect somebody
 * else's Saturday did not contain. A coin in the gutter, a card somebody dropped, a
 * supporter who asks the child a question on the way east.
 *
 * All of it is DATA. Nothing here is hardcoded into a scene, which is the difference
 * between an encounter system and eleven `if (Math.random() < 0.2)` statements scattered
 * through a nine-hundred-line file — and it is what lets 1990 have its own pool with no
 * new code at all.
 *
 * **Canonical history is never in a pool.** The championship happens because it happened.
 */

export type RandomEncounter = {
  id: string
  era: string
  locations: LocationId[]
  weight: number
  /** minutes before this may fire again; absent means once per life */
  cooldown?: number
  requirements?: Condition[]
  /** what the player sees — a line, then whatever it did */
  lineHe: string
  who?: string | null
  effects: Effect[]
}

export type EncounterRoll = {
  encounter: RandomEncounter
  events: LifeEvent[]
}

function eligible(state: LifeState, encounter: RandomEncounter, era: string, where: LocationId): boolean {
  if (encounter.era !== era && encounter.era !== '*') return false
  if (!encounter.locations.includes(where)) return false
  const last = state.encounters[encounter.id]
  if (last !== undefined) {
    if (encounter.cooldown === undefined) return false
    if (state.minute - last < encounter.cooldown) return false
  }
  if (encounter.requirements && !encounter.requirements.every((condition) => meets(state, condition))) return false
  return true
}

/**
 * One roll, at one place, at one moment.
 *
 * `probability` is the chance that ANYTHING happens; the weights then decide what. Two
 * numbers rather than one because the two questions are genuinely different — how busy
 * the world is, and what kind of place this is — and because a designer tuning "the
 * street should surprise you about once a visit" should not have to re-balance a table.
 */
export function rollEncounter(
  state: LifeState,
  pool: readonly RandomEncounter[],
  era: string,
  where: LocationId,
  probability: number,
): { picked: RandomEncounter | null; consumed: number } {
  const roller = new Roller(state.rng)
  if (!roller.chance(probability)) return { picked: null, consumed: roller.consumed }
  const options = pool.filter((encounter) => eligible(state, encounter, era, where))
  const picked = roller.weighted(options, (encounter) => encounter.weight)
  return { picked, consumed: roller.consumed }
}

/** The bookkeeping events for a roll — the cursor advance and the record it fired. */
export function encounterEvents(picked: RandomEncounter | null, consumed: number): LifeEvent[] {
  const events: LifeEvent[] = [{ t: 'rng.consumed', count: consumed }]
  if (picked) events.push({ t: 'encounter.triggered', id: picked.id })
  return events
}
