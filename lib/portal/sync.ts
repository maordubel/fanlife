'use client'

/**
 * התפר — the only file that puts the device's card and the account's card in the same
 * room, and the only one that knows a Supabase client exists outside `lib/supabase/`.
 *
 * Everything hard about this is in `lib/portal/merge.ts`, which is pure and tested. What
 * is left here is plumbing, and plumbing is kept deliberately thin: read both sides,
 * hand them to the merge, write the answer back to both. No arithmetic, no field rules,
 * no "if this is newer" — every one of those belongs to the pure function, because every
 * one of them is a decision somebody will want to read the reasoning for later.
 *
 * Three properties this seam holds to, and each is a rule this repo already has:
 *
 *  · **The device never waits for the network.** Nothing here is on the path of a round.
 *    A gate records into `localStorage` first and always (`components/play/RecordRun.tsx`),
 *    and the push is a fire-and-forget afterwards. A supporter on the 61 bus with no
 *    signal plays exactly the app he played yesterday.
 *  · **Every failure is silent and local.** A sync that cannot reach the server leaves
 *    the device's card exactly as it was and says so in its return value. Nothing throws
 *    at a screen, because losing a sync is much smaller than losing the page a person is
 *    on — the same reasoning every `localStorage` call in this codebase is wrapped with.
 *  · **Nothing is invented on the way up.** The remote side of a merge is assembled from
 *    REAL rows in `worker_gate_run`, counted, not estimated. A person who has played nothing has
 *    an empty remote profile and merges to exactly what their device already held.
 */

import { storedBook, writeBook, type SupporterRecord } from '@/lib/game/member'
import { readProfile, updateProfile } from '@/lib/profile/store'
import { createClient } from '@/lib/supabase/client'
import type { Json } from '@/types/database'
import { portalDb } from './db'
import { portalConfigured } from './env'
import { runSyncHandlers } from './handlers'
import { mergeDeviceProfiles, type ItemRow, type PortalProfile } from './merge'
import {
  bookAfter,
  cardJson,
  planSync,
  type AppProfileRow,
  type RemoteSide,
  type RunRow,
} from './plan'

/**
 * `foldRuns` moved to `lib/portal/plan.ts` with the rest of the pure sync decisions; it
 * is re-exported so every existing import keeps working.
 */
export { foldRuns } from './plan'

export type Account = {
  id: string
  email: string | null
  displayName: string | null
}

/**
 * `off` — this build has no keys, so there is no account to have.
 * `signed-out` — there is a server and nobody is signed in. The device is the card.
 * `synced` — both sides were read, merged, and written back.
 * `failed` — the network or the server said no. The device's card is untouched.
 */
export type SyncState = 'off' | 'signed-out' | 'synced' | 'failed'

export type SyncResult = {
  state: SyncState
  account: Account | null
  /** the merged card, for a screen that wants to print it without re-reading storage */
  merged: PortalProfile | null
  /**
   * What the account could and could not take this time, so a screen can say "saved, but
   * the collections are waiting for the SQL" rather than a flat "synced".
   *   · `cardColumns` — `worker_profile.card` exists (the 22.9.2026 SQL has been run)
   *   · `items` — `worker_profile_item` exists and was read
   *   · `extras` — each handler in `lib/portal/handlers.ts`, by id
   */
  reach?: { cardColumns: boolean; items: boolean; extras: Record<string, boolean> }
}

/** Who is signed in on this device, or null. Never throws. */
export async function currentAccount(): Promise<Account | null> {
  if (!portalConfigured()) return null
  try {
    const { data, error } = await createClient().auth.getUser()
    if (error || !data.user) return null
    const meta = data.user.user_metadata as { full_name?: unknown; name?: unknown }
    return {
      id: data.user.id,
      email: data.user.email ?? null,
      displayName: text(meta?.full_name) ?? text(meta?.name),
    }
  } catch {
    return null
  }
}

/**
 * Google, and the redirect back through `/auth/callback`.
 *
 * `redirectTo` is built from the window's own origin rather than from `SITE_URL`, so a
 * Vercel preview deployment signs in against itself instead of bouncing the person to
 * production. Both origins have to be listed in Supabase's redirect allow-list — that is
 * a click in the dashboard and it is written down in `docs/14-portal-identity.md`.
 */
export async function signInWithGoogle(next = '/tik'): Promise<void> {
  if (!portalConfigured() || typeof window === 'undefined') return
  try {
    await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
  } catch {
    // the button simply does nothing rather than throwing on the personal area
  }
}

export async function signOut(): Promise<void> {
  if (!portalConfigured()) return
  try {
    await createClient().auth.signOut()
  } catch {
    // already gone, or offline. Either way the next `currentAccount()` answers null.
  }
}

/**
 * Read both cards, merge them, write the answer back to both.
 *
 * The device is written first and unconditionally, so a push that fails halfway still
 * leaves the person holding the better of the two cards rather than the older one.
 *
 * **Before Maor runs the SQL, nothing breaks.** The tables are simply not there: the
 * reads fail, the result is `failed`, and the device keeps everything it already had.
 * The card columns are still read optimistically, with the three-column read as the
 * fallback, so a card never fails to load over a column list.
 */
export async function syncProfile(): Promise<SyncResult> {
  if (!portalConfigured()) return { state: 'off', account: null, merged: null }

  const account = await currentAccount()
  if (account === null) return { state: 'signed-out', account: null, merged: null }

  try {
    const supabase = portalDb()

    // The card row is created here, the first time this person opens THE WORKER — not by
    // a trigger on auth.users. The Supabase project is shared with DUBID, and a trigger
    // there would run on every DUBID sign-up too (supabase/migrations/20260922090000_…).
    // Idempotent: every later call returns the row that is already there.
    await supabase.rpc('worker_profile_ensure')

    const card = await readCardRow(account.id)
    if (card.failed) return { state: 'failed', account, merged: null }

    const runs = await readAll<RunRow>((from, to) =>
      supabase
        .from('worker_gate_run')
        .select('gate, score, asked, correct, played_on, idempotency_key')
        .eq('user_id', account.id)
        .order('played_at', { ascending: true })
        .range(from, to),
    )
    if (runs === null) return { state: 'failed', account, merged: null }

    const items = await readAll<ItemRow>((from, to) =>
      supabase
        .from('worker_profile_item')
        .select('set_id, item_id')
        .eq('user_id', account.id)
        .order('added_on', { ascending: true })
        .range(from, to),
    )

    const remote: RemoteSide = {
      row: card.row,
      runs,
      items,
      cardColumns: card.cardColumns,
      accountName: account.displayName,
    }
    const plan = planSync({ profile: readProfile(), book: storedBook() }, remote)

    // The device first — merged into what the device holds NOW, not into the snapshot
    // read before the network calls, so a round finished while the sync was in flight is
    // not overwritten by the older copy.
    if (plan.remote !== null) {
      const remoteSide = plan.remote
      updateProfile((current) => mergeDeviceProfiles(current, remoteSide))
    }
    const book = storedBook()
    if (book !== null) writeBook(bookAfter(book, plan), { stamp: false })

    const merged: PortalProfile = { identity: plan.identity, profile: plan.profile }
    if (card.row === null) {
      return { state: 'synced', account, merged, reach: { cardColumns: card.cardColumns, items: items !== null, extras: {} } }
    }

    const push = await supabase.from('worker_profile').update(plan.update).eq('id', account.id)
    let failed = !!push.error

    for (const chunk of plan.items) {
      if (!(await collectRemote(chunk.set, chunk.ids))) failed = true
    }
    for (const deed of plan.deeds) {
      const ok = await recordRunRemote({ key: deed.key, gate: deed.gate, playedOn: deed.day })
      if (!ok) failed = true
    }

    const extras = await runSyncHandlers({ db: supabase, userId: account.id })

    return {
      state: failed ? 'failed' : 'synced',
      account,
      merged,
      reach: { cardColumns: card.cardColumns, items: items !== null, extras },
    }
  } catch {
    return { state: 'failed', account, merged: null }
  }
}

const CARD_COLUMNS = 'display_name, member_no, since, card, card_edited_at, shirt_number, supporter'
const BASE_COLUMNS = 'display_name, member_no, since'

/** The account's card row: the full column list first, the three identity columns if refused. */
async function readCardRow(
  userId: string,
): Promise<{ failed: boolean; row: AppProfileRow | null; cardColumns: boolean }> {
  const supabase = portalDb()
  const full = await supabase.from('worker_profile').select(CARD_COLUMNS).eq('id', userId).maybeSingle()
  if (!full.error) return { failed: false, row: (full.data as AppProfileRow | null) ?? null, cardColumns: true }
  const base = await supabase.from('worker_profile').select(BASE_COLUMNS).eq('id', userId).maybeSingle()
  if (base.error) return { failed: true, row: null, cardColumns: false }
  return { failed: false, row: (base.data as AppProfileRow | null) ?? null, cardColumns: false }
}

/** PostgREST answers 1,000 rows by default. Page through, up to a ceiling. Null on error. */
async function readAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>,
  size = 1000,
  ceiling = 20,
): Promise<T[] | null> {
  const out: T[] = []
  for (let n = 0; n < ceiling; n += 1) {
    const { data, error } = await page(n * size, n * size + size - 1)
    if (error) return null
    const rows = Array.isArray(data) ? (data as T[]) : []
    out.push(...rows)
    if (rows.length < size) break
  }
  return out
}

/**
 * Who is signed in, from the session this browser already holds — no network round-trip.
 * The fire-and-forget pushes below ask this rather than `getUser()`, which calls the auth
 * server on every tap. Row level security decides what the push may touch either way.
 * Exported for `lib/portal/handlers.ts` handlers that push on their own.
 */
export async function sessionUserId(): Promise<string | null> {
  if (!portalConfigured()) return null
  try {
    const { data } = await createClient().auth.getSession()
    return data.session?.user?.id ?? null
  } catch {
    return null
  }
}

/**
 * דיווח על סבב — one finished round, up to the account, exactly once.
 *
 * `p_key` is minted by the caller when the round ends and re-sent on every retry, so a
 * dropped response, a double-invoked effect and a reload all resolve to one row. The
 * whole call is best-effort: the device has already recorded the round by the time this
 * runs, and a failed push is a row that the next sync simply does not know about.
 *
 * A DEED is the same call with the key `deed:<gate>:<day>` and `playedOn` set to that
 * day, so a wing counts once per gate per day on the account exactly as it does on the
 * device (`lib/profile/store.ts applyDeed`).
 */
export async function recordRunRemote(run: {
  key: string
  gate: string
  score?: number
  correct?: number
  asked?: number
  seed?: number | null
  playedOn?: string
}): Promise<boolean> {
  if (!portalConfigured()) return false
  try {
    if ((await sessionUserId()) === null) return false
    const asked = Math.max(0, Math.round(run.asked ?? 0))
    const { error } = await portalDb().rpc('worker_record_run', {
      p_key: run.key,
      p_gate: run.gate,
      p_score: Math.max(0, Math.round(run.score ?? 0)),
      p_asked: asked,
      p_correct: Math.min(asked, Math.max(0, Math.round(run.correct ?? 0))),
      p_seed: typeof run.seed === 'number' && run.seed > 0 ? run.seed : null,
      p_played_on: run.playedOn ?? null,
    })
    return !error
  } catch {
    return false
  }
}

/**
 * אוסף — ids into one of the account's sets, grow-only and idempotent (`worker_collect`).
 * Preference sets never leave the device (`isSyncedSet`), and before the SQL is run the
 * function does not exist and this answers false — which is the whole failure mode.
 */
export async function collectRemote(set: string, ids: readonly string[]): Promise<boolean> {
  if (!portalConfigured() || ids.length === 0) return false
  try {
    if ((await sessionUserId()) === null) return false
    const { error } = await portalDb().rpc('worker_collect', { p_set: set, p_ids: [...ids] })
    return !error
  } catch {
    return false
  }
}

/**
 * The card, right after it was edited on this device — which makes this edit the newest
 * there is, so it can go up without a merge. The next full sync reconciles anything a
 * clock skew got wrong. Falls back to the name alone before the card columns exist.
 */
export async function pushCardRemote(): Promise<boolean> {
  if (!portalConfigured()) return false
  try {
    const userId = await sessionUserId()
    const book = storedBook()
    if (userId === null || book === null) return false
    const name = book.nameHe.replace(/\s+/g, ' ').trim()
    const supabase = portalDb()
    const full = await supabase
      .from('worker_profile')
      .update({
        display_name: name === '' ? null : name,
        shirt_number: book.number,
        card: cardJson(book.card ?? null),
        card_edited_at: book.card?.editedAt || null,
      })
      .eq('id', userId)
    if (!full.error) return true
    const base = await supabase
      .from('worker_profile')
      .update({ display_name: name === '' ? null : name })
      .eq('id', userId)
    return !base.error
  } catch {
    return false
  }
}

/** Gate 7's seal, up to the account (owner-only row; votes stay unlinkable — rule 76). */
export async function pushSupporterRemote(record: SupporterRecord): Promise<boolean> {
  if (!portalConfigured()) return false
  try {
    const userId = await sessionUserId()
    if (userId === null) return false
    const { error } = await portalDb()
      .from('worker_profile')
      .update({ supporter: record as unknown as Json })
      .eq('id', userId)
    return !error
  } catch {
    return false
  }
}

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}
