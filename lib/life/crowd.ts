import { ALL_CHARACTERS, isActiveIn, type CharacterDefinition } from './characters'
import { Roller } from './rng'
import type { CharacterId, LifeState } from './types'

/**
 * הקהל שאינו מסה — the reusable supporter ensemble, chosen off the seed.
 *
 * The character bible asks for one small system in so many words (§13): a pool of
 * recurring, fully-specified supporters that the world may draw from at random, filtered
 * by era, never repeating a person inside one scene, and never able to pull somebody the
 * story owns into a beat the story did not write.
 *
 * All three of those rules are here, and the third is the important one. A crowd chosen
 * from the whole cast would eventually put Michel in a queue as set dressing, which is
 * exactly the thing a memorial character may not be. So the pool is an explicit list of
 * ids — the twelve people the production table marks as reusable — and everybody else is
 * unreachable from here by construction, not by care.
 *
 * Determinism is the save's, not this module's: the roller advances the same cursor every
 * other system uses, and the caller records how much it consumed. Two folds of one log
 * therefore produce the same faces in the same doorway, which is what makes a supporter
 * you met twice a supporter you MET twice.
 */

/** The reusable twelve. Anybody not on this list can only be placed by authored content. */
export const CROWD_POOL: readonly CharacterId[] = [
  'liron',
  'crowd-aliza',
  'crowd-dudu',
  'crowd-limor',
  'crowd-erez',
  'crowd-inbal',
  'crowd-lior',
  'crowd-shani',
  'crowd-noam',
  'crowd-maya',
  'yaron',
  'batya',
]

const POOL = new Set<CharacterId>(CROWD_POOL)

/** Everybody in the pool who exists in this chapter. */
export function crowdFor(era: string): readonly CharacterDefinition[] {
  return ALL_CHARACTERS.filter((entry) => POOL.has(entry.id) && isActiveIn(entry.id, era))
}

export type CrowdPick = {
  people: readonly CharacterDefinition[]
  consumed: number
}

/**
 * `count` different people from this era's pool, seeded, in a stable order.
 *
 * `exclude` is how a scene keeps somebody out — the person it already placed by hand, or
 * the one the last doorway used. Asking for more people than the era has returns everybody
 * it has and nobody twice; that is deliberate, because a room with four supporters in a
 * chapter that only knows two should look thin rather than doubled.
 */
export function pickCrowd(
  state: LifeState,
  era: string,
  count: number,
  exclude: readonly CharacterId[] = [],
): CrowdPick {
  const roller = new Roller(state.rng)
  const blocked = new Set(exclude)
  const available = crowdFor(era).filter((entry) => !blocked.has(entry.id))
  const people: CharacterDefinition[] = []
  const remaining = [...available]
  const wanted = Math.min(count, remaining.length)
  for (let i = 0; i < wanted; i += 1) {
    const picked = roller.pick(remaining)
    if (!picked) break
    people.push(picked)
    remaining.splice(remaining.indexOf(picked), 1)
  }
  return { people, consumed: roller.consumed }
}

/** One name for a line of ambient dialogue — `@crowd` in an encounter's `who`. */
export function crowdSpeaker(state: LifeState, era: string, exclude: readonly CharacterId[] = []): CrowdPick {
  return pickCrowd(state, era, 1, exclude)
}
