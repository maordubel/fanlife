import type { Challenge } from './contract'
import { dayNumber } from './wire'

/**
 * EXPIRY — how long a challenge's COMPARISON stays honest. Client-safe.
 *
 * A link never stops opening the gate; what expires is the promise that the run it opens
 * is the run the sender played. Decks are dealt from the archive (`lib/rotation/deck.ts`),
 * and the archive grows: a seed dealt today may deal a different twelve in two months. So
 * a same-run comparison has a window, a daily a shorter one (its whole point is "the same
 * day"), and a prompt — a rule, not a deal — none at all. The run fingerprint
 * (`runs.ts`) catches drift inside the window; the window catches what a fingerprint of
 * ids cannot, a changed answer behind an unchanged id.
 */
export const WINDOW_DAYS = {
  'same-run': 45,
  daily: 7,
  creation: null,
  opinion: null,
  duel: 7,
  group: 14,
} as const

export function expiresOn(challenge: Challenge): number | null {
  const days = WINDOW_DAYS[challenge.mode]
  return days === null ? null : challenge.issued + days
}

/** §9's `expiresAt`, as an ISO date, or undefined for a challenge that does not expire. */
export function expiresAt(challenge: Challenge): string | undefined {
  const day = expiresOn(challenge)
  return day === null ? undefined : new Date(day * 86_400_000).toISOString()
}

export function challengeState(challenge: Challenge, now: number = Date.now()): 'live' | 'expired' {
  const day = expiresOn(challenge)
  return day !== null && dayNumber(now) > day ? 'expired' : 'live'
}
