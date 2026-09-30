import type { Effect } from './content/script'
import type { LifeState } from './types'

/**
 * למה לא הייתי שם — Missed Opportunity, with its reason (delta 93, brief §23, §46).
 *
 * A missed afternoon was one bit: `missed`. A life is more than that — he missed Teddy
 * because the ticket was more than his pocket, or because he chose the armchair beside his
 * father; he missed the schoolyard because the other whistle ran late. Callbacks that come
 * years after want to know WHICH, and a flag that only says "no" cannot tell them.
 *
 * The flag is `life:miss:<eventId>` (the `life:` prefix is what lets it survive the decade)
 * and its value is one reason from the list below. A save written before this read `true`
 * where a reason would be: that reads as `'choice'`, which is what a plain miss always was.
 *
 * Applied in three chapters on purpose (2010-teddy, 2017-distance, 2021-promises): the
 * shape is proven before it spreads, not migrated across forty years in one pass.
 */
export type MissReason = 'choice' | 'work' | 'money' | 'partner' | 'child' | 'route-conflict' | 'late' | 'distance'

export const MISS_REASONS: readonly MissReason[] = ['choice', 'work', 'money', 'partner', 'child', 'route-conflict', 'late', 'distance']

export const MISS_PREFIX = 'life:miss:'

export const missFlag = (eventId: string): string => `${MISS_PREFIX}${eventId}`

/** the one effect a miss is — used in the conversation where he stays away */
export const missed = (eventId: string, reason: MissReason): Effect => ({ e: 'flagValue', flag: missFlag(eventId), value: reason })

/** why he was not there, or null — he was, or it was never on the table */
export function missReasonOf(state: LifeState, eventId: string): MissReason | null {
  const value = state.flags[missFlag(eventId)]
  if (value === true) return 'choice'
  if (typeof value === 'string' && (MISS_REASONS as readonly string[]).includes(value)) return value as MissReason
  return null
}
