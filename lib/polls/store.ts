'use client'

import { BALLOT, type Ballot, type Tally, type TallyRow } from './ballot'
import { cleanReasons, isReasonOf, type Reasons } from './reasons'
import { deviceId } from '@/lib/portal/device'
import { portalConfigured } from '@/lib/portal/env'
import { portalDb } from '@/lib/portal/db'

/**
 * איפה הקול נשמר.
 *
 * Maor's call was "מקומי עכשיו, Supabase כשיהיה" — local now, the database when it is
 * there. The risk in that instruction is the obvious one: "local now" usually means
 * `localStorage.getItem` sprinkled through a component, and then "the database when it
 * is there" means rewriting the screen. So the seam is drawn here, once, and the screen
 * never learns which side of it it is talking to.
 *
 * Three things make the swap real rather than aspirational:
 *
 *  · **The interface is async.** A synchronous local store would let the screen be
 *    written without a pending state, and every one of those is a bug the day the
 *    network is on the other end.
 *  · **The tally is a separate call from the ballot.** Your own picks are yours and
 *    read instantly; the count is everybody's and will be a round trip. Fusing them
 *    into one read is what makes a local prototype impossible to promote.
 *  · **`countable` is honest.** The local store cannot count a terrace — it has one
 *    voter. It says so, and the screen shows the slip instead of drawing a bar chart
 *    of a sample of one. Nothing in this app invents a number (rule 11), and a poll
 *    with fabricated baseline votes would be the worst possible place to start.
 *
 * **The table exists as of 17.9.2026 (as `worker_poll_vote` from 22.9), and so does the store.** `SupabaseBallotStore`
 * below implements this same interface against `worker_poll_vote (device_id, question_id, pick,
 * voted_at)` with a unique key on `(device_id, question_id)` — exactly the shape this
 * paragraph promised before the migration was written — so a changed mind updates rather
 * than stuffs the box. `activeStore()` returns it when the keys are present.
 *
 * What it is NOT is a store that reads a table: `worker_poll_vote` has RLS on and no policy at
 * all, so nothing can select a row from it, signed in or not. A vote goes in through
 * `worker_poll_cast` and comes back only as a count, through `worker_poll_tally`. That is rule
 * 4's construction — the one that keeps trivia answers off the client — applied to the
 * opposite-looking problem: eight rows sharing one device id are one supporter's whole
 * ballot, and a public `select` on this table would hand that to anybody who asked. The
 * count is everybody's; the slip is nobody's. See §3 of
 * `supabase/migrations/20260922090000_worker_shared_project.sql`.
 */
export interface BallotStore {
  /** true when this store can report what OTHER people voted */
  readonly countable: boolean
  read(): Promise<Ballot>
  save(questionId: string, pick: string): Promise<void>
  clear(): Promise<void>
  tally(questionId: string): Promise<Tally | null>
  /** true once the slip has been sealed on this device — see `seal()` */
  sealed(): Promise<boolean>
  /**
   * Locks the slip. Sealing is a separate call from `save`, on purpose: a save happens
   * on every tap and has to be cheap and silent, while a seal is the one deliberate
   * action the whole document leads up to — the moment that prints the stamp and opens
   * the count board's door. Nothing here re-validates 8/8; the screen already refuses
   * to call it below that, the same way it already refuses to render the button as
   * pressable.
   */
  seal(): Promise<void>
  reasons(): Promise<Reasons>
  saveReason(questionId: string, reason: string): Promise<void>
  /**
   * Put a migrated slip back on this device's paper WITHOUT casting it (21.9.2026): moving
   * a saved name to its id is not a vote, and a read that stuffed the box would be the
   * quietest possible way to double-count. The next real vote on a question casts the id.
   */
  rewrite(ballot: Ballot): Promise<void>
}

const KEY = 'worker.ballot.v1'
/** a second, separate key — sealing is a different fact from the picks themselves,
 *  and keeping it apart means `read()` never has to change shape to carry it. */
const SEAL_KEY = 'worker.ballot.sealed.v1'
const REASON_KEY = 'worker.ballot.reasons.v1'

/**
 * The local store. One device, one ballot, kept across visits.
 *
 * Everything is wrapped: a browser in private mode, with site data blocked, or simply
 * out of quota throws on `localStorage`, and a poll losing its saved picks is a much
 * smaller problem than a poll throwing during render.
 */
export class LocalBallotStore implements BallotStore {
  readonly countable = false

  async read(): Promise<Ballot> {
    try {
      const raw = window.localStorage.getItem(KEY)
      if (!raw) return {}
      const parsed: unknown = JSON.parse(raw)
      if (typeof parsed !== 'object' || parsed === null) return {}
      // Only the questions that exist today are read back, so a renamed question in a
      // later version cannot resurrect a pick under a heading nobody asked for.
      const known = new Set(BALLOT.map((question) => question.id))
      const out: Ballot = {}
      for (const [id, pick] of Object.entries(parsed as Record<string, unknown>)) {
        if (known.has(id) && typeof pick === 'string' && pick !== '') out[id] = pick
      }
      return out
    } catch {
      return {}
    }
  }

  async save(questionId: string, pick: string): Promise<void> {
    try {
      const current = await this.read()
      const next: Ballot = { ...current, [questionId]: pick }
      window.localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      // an unsaved vote is still a cast vote for this session
    }
  }

  async rewrite(ballot: Ballot): Promise<void> {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(ballot))
    } catch {
      // the migrated slip is still the one on screen; it migrates again on the next read
    }
  }

  async clear(): Promise<void> {
    try {
      for (const key of [KEY, SEAL_KEY, REASON_KEY]) window.localStorage.removeItem(key)
    } catch {
      // nothing to do and nothing worth throwing over
    }
  }

  async tally(): Promise<Tally | null> {
    return null
  }

  async sealed(): Promise<boolean> {
    try {
      return window.localStorage.getItem(SEAL_KEY) === '1'
    } catch {
      return false
    }
  }

  async seal(): Promise<void> {
    try {
      window.localStorage.setItem(SEAL_KEY, '1')
    } catch {
      // an unsealed slip locally is still a sealed slip for this session — the stamp
      // already printed on screen, and losing the flag on reload is a smaller failure
      // than throwing during the one action the whole document leads up to
    }
  }


  async reasons(): Promise<Reasons> {
    try {
      const raw = window.localStorage.getItem(REASON_KEY)
      if (!raw) return {}
      const parsed: unknown = JSON.parse(raw)
      if (typeof parsed !== 'object' || parsed === null) return {}
      return cleanReasons(parsed as Record<string, unknown>)
    } catch {
      return {}
    }
  }

  async saveReason(questionId: string, reason: string): Promise<void> {
    if (!isReasonOf(questionId, reason)) return
    try {
      const current = await this.reasons()
      const next: Reasons = { ...current }
      if (next[questionId] === reason) delete next[questionId]
      else next[questionId] = reason
      window.localStorage.setItem(REASON_KEY, JSON.stringify(next))
    } catch {
      // reasons are optional and must never break the ballot
    }
  }
}

/**
 * הקלפי האמיתית — one device, one ballot, and a count the whole terrace shares.
 *
 * The device's own slip is still kept locally, and that is not laziness: `worker_poll_vote` has
 * no read policy, so there is no way to fetch your own picks back and no reason to want
 * one. The server holds the COUNT; the browser holds the SLIP. Every call that is about
 * your own paper — `read`, `clear`, `sealed`, `seal` — is the local store's, unchanged
 * and already tested; the two calls that are about everybody else's — `save`, which casts
 * the vote, and `tally`, which asks what the count is — are the ones that go out.
 *
 * **The ballot is keyed to a device and never to a person.** It works signed out, which
 * is the point: gate 7 is a public wing, and requiring an account to vote would be the
 * quietest possible way of turning an anonymous ballot into an identified one. That is
 * also why this store is chosen on the KEYS being present rather than on somebody being
 * signed in — there is nothing here for a session to unlock.
 */
export class SupabaseBallotStore implements BallotStore {
  /** true: this one can report what other people voted. */
  readonly countable = true

  /** the device's own paper, kept exactly where it was */
  private readonly slip = new LocalBallotStore()

  read(): Promise<Ballot> {
    return this.slip.read()
  }

  /**
   * Saved locally first, then cast.
   *
   * The order matters on a bad connection: the tap has to register on the slip whatever
   * the network does, and a vote that is on the paper and not yet in the box is a much
   * smaller failure than a tap that appears to do nothing. A device with no id — private
   * mode, blocked storage — votes on paper only and the count never hears from it, which
   * is correct: an id minted fresh on every page load would be one browser stuffing the
   * box by accident (`lib/portal/device.ts`).
   *
   * What is cast is the pick as stored — a `p_…` id, a position code or the digits — so
   * `worker_poll_vote.pick` carries the id from 21.9.2026 on; `lib/polls/board.ts` folds the rows
   * cast before that (display names, Hebrew labels) into the same keys. No SQL change.
   */
  async save(questionId: string, pick: string): Promise<void> {
    await this.slip.save(questionId, pick)
    const device = deviceId()
    if (device === null) return
    try {
      await portalDb().rpc('worker_poll_cast', {
        p_device_id: device,
        p_question_id: questionId,
        p_pick: pick,
      })
    } catch {
      // an uncast vote is still a cast vote for this slip — and never a throw mid-tap
    }
  }

  /** Clears this device's paper. A vote already in the box stays counted, and the next
   *  vote on the same question replaces it rather than adding to it — which is what the
   *  unique key on `(device_id, question_id)` is for. */
  clear(): Promise<void> {
    return this.slip.clear()
  }

  /**
   * Counts only — `(pick, votes)` and nothing else. `null` on any failure, which is the
   * same answer the local store gives and which `lib/polls/board.ts` already renders as
   * the honesty plate. A count that could not be read is not a count of zero.
   */
  async tally(questionId: string): Promise<Tally | null> {
    try {
      const { data, error } = await portalDb().rpc('worker_poll_tally', {
        p_question_id: questionId,
      })
      if (error || !Array.isArray(data)) return null
      const rows: TallyRow[] = []
      let total = 0
      for (const row of data) {
        const count = Number(row.votes)
        if (typeof row.pick !== 'string' || !Number.isFinite(count) || count <= 0) continue
        rows.push({ pick: row.pick, votes: count })
        total += count
      }
      return { total, rows }
    } catch {
      return null
    }
  }

  sealed(): Promise<boolean> {
    return this.slip.sealed()
  }

  seal(): Promise<void> {
    return this.slip.seal()
  }


  reasons(): Promise<Reasons> {
    return this.slip.reasons()
  }

  saveReason(questionId: string, reason: string): Promise<void> {
    return this.slip.saveReason(questionId, reason)
  }

  /** Paper only — never cast. See the interface. */
  rewrite(ballot: Ballot): Promise<void> {
    return this.slip.rewrite(ballot)
  }
}

/**
 * The store this build votes into.
 *
 * One condition, checked synchronously: are the keys there? `NEXT_PUBLIC_*` values are
 * inlined by Next at build time, so a deploy with no Supabase behind it cannot even be
 * asked to try — which is what lets this stay the plain synchronous call the two screens
 * already make (`useMemo(() => activeStore(), [])`) instead of becoming a promise the
 * whole wing has to wait on.
 *
 * **Being signed in is deliberately not a condition.** It is for the CARD — the profile,
 * the collections, the life — where every row is keyed to a person. It is not for the
 * ballot, where the entire privacy design rests on no row ever being keyed to one.
 */
export function activeStore(): BallotStore {
  return portalConfigured() ? new SupabaseBallotStore() : new LocalBallotStore()
}
