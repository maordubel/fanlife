'use client'

import { useEffect, useRef } from 'react'

import { duelArrival, emit } from '@/lib/profile/events'

/**
 * הדיווח — the one line that makes a gate part of the personal area.
 *
 * Mounted by a result screen, it reports the finished round into the device's profile:
 * which gate, what it scored, how many were right out of how many asked. That is what
 * lets "המנוי שלך" print a wall of gates with your own history on it instead of a list
 * of links, and it is the whole of the "שהכל ידבר עם הכל" plumbing.
 *
 * **It reports from the RESULT screen, never from the run**, because the only moment
 * the app can honestly say you played something is the moment it ended. Opening a gate
 * and walking away is not a round, and a profile that counted it would be the first
 * number on that page that was not earned.
 *
 * The ref guards React's development double-invoke, which would otherwise record every
 * round twice — the same trap the LIFE intro's seen-flag fell into.
 *
 * **And then, if there is an account, the same round goes up.** The device is written
 * first and always; the push is fire-and-forget and its failure is silent, because a
 * round that reached the card and not the server is a round, and a result screen that
 * threw on a bad connection is a bug (`lib/portal/sync.ts`).
 *
 * The idempotency key is a fresh uuid minted HERE, once, for this mount — not the
 * ballot's device id, and not a value derived from the gate and the score. Two reasons,
 * and the first is the one that decided it:
 *
 *  · **The ballot's device id must never travel with a user id.** `worker_poll_vote` is
 *    anonymous precisely because no row in it names a person; putting that same id into
 *    a row that carries `user_id` would let the two tables be joined, and the whole
 *    privacy argument for gate 7 would be undone by an idempotency key.
 *  · **It matches what the device itself counts.** A retry of this push reuses the key
 *    and writes one row; a page RELOAD mounts again, and the local store records again
 *    too — so both sides count the same thing, which is worth more than either side
 *    being cleverer than the other.
 */
export function RecordRun({
  gate,
  score,
  correct,
  asked,
  variant,
  seed,
}: {
  gate: string
  score?: number
  correct?: number
  asked?: number
  /**
   * One slug segment under the gate — a trivia topic, `live` for the Royal Rumble room.
   * The round is filed as `/trivia/europe`; the wall still lights ONE plate
   * (`lib/profile/gate-id.ts wallGate`), and gate 10 reads per-topic strengths from it.
   */
  variant?: string | null
  /** the deck seed this round was dealt from, when the gate has one — `worker_gate_run.seed` */
  seed?: number | null
}) {
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    done.current = true
    // Everything — the device, the account, the measurement — goes through the one
    // progress layer (`lib/profile/events.ts`). The key is still minted HERE, once per
    // mount, for the reasons above.
    const key = globalThis.crypto?.randomUUID?.()
    emit({ type: 'gate_completed', gate, variant, score, correct, asked, seed, key })
    // A round that arrived by somebody's challenge link (`?from=share&seed=N`) is a duel
    // taken — counted once per plate and seed, so reloading this screen is not a second.
    const dared = duelArrival(window.location.search)
    if (dared !== null) emit({ type: 'duel_taken', gate, seed: dared })
  }, [gate, score, correct, asked, variant, seed])

  return null
}
