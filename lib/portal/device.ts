'use client'

/**
 * מזהה המכשיר — one random id per browser, and the only file that mints one.
 *
 * `worker_poll_vote` is keyed on `(device_id, question_id)`, which is a decision about privacy
 * before it is a decision about storage: a ballot row carries no user id, so the table
 * structurally cannot say who voted for whom (see §3 of
 * `supabase/migrations/20260922090000_worker_shared_project.sql`). What it needs instead is
 * something that is stable enough to stop one browser voting eight times on one question
 * and meaningless enough that it names nobody. A random uuid in `localStorage` is both.
 *
 * Three things it deliberately is not:
 *
 *  · **Not a fingerprint.** Nothing is derived from the browser, the screen, the clock or
 *    the address. It is `crypto.randomUUID()` and nothing else, so two devices are
 *    different because they drew different numbers, not because they are different.
 *  · **Not an identity.** Clearing site data mints a new one, and that is correct
 *    behaviour rather than a bug to work around — a person who wipes their browser has
 *    asked to be a new voter, and `forgetDevice()` in `lib/profile/summary.ts` is the
 *    button that means it.
 *  · **Not shared with the account.** Signing in does not attach this id to a user, and
 *    nothing in the app ever sends the two together. The moment they travel in one
 *    request the anonymity of the ballot is over, whatever the schema says.
 *
 * `null` when there is no browser or storage is blocked. Every caller must handle it:
 * a device that cannot be identified cannot be kept from voting twice, so it votes
 * locally and the count does not hear from it. That is a smaller failure than a vote
 * cast under an id minted fresh on every page load, which would be one browser stuffing
 * the box by accident.
 */

const KEY = 'worker.device.v1'

export function deviceId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const saved = window.localStorage.getItem(KEY)
    if (saved !== null && saved.length >= 8) return saved
    const minted = mint()
    if (minted === null) return null
    window.localStorage.setItem(KEY, minted)
    return minted
  } catch {
    // private mode, blocked site data, a full quota. An unidentifiable device is not a
    // crash on a screen whose whole subject is a ballot.
    return null
  }
}

/**
 * A uuid from the platform's own cryptographic generator, never from the language's
 * ordinary pseudo-random one.
 *
 * `crypto.randomUUID` is missing on an insecure origin and on older Safari, and the
 * honest answer there is no id at all rather than a weaker one: an id with poor entropy
 * is an id that can collide with somebody else's, and a collision in this table means
 * two supporters overwriting each other's vote.
 */
function mint(): string | null {
  const source = globalThis.crypto
  if (typeof source?.randomUUID !== 'function') return null
  return source.randomUUID()
}
