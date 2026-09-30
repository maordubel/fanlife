'use client'

import type { SupabaseClient } from '@supabase/supabase-js'

import { portalConfigured } from '@/lib/portal/env'
import { createClient } from '@/lib/supabase/client'
import { beenFromRows, beenRows, mergeBeen, readBeen, writeBeen, type BeenLedger } from './been'

/**
 * "הייתי שם", בחשבון — the device's ticks and the account's, merged (spec §30).
 *
 * The house pattern of `lib/portal/marks-sync.ts`, line for line: the device never waits
 * for the network (a tick writes `lib/away-days/been.ts` first and always), every failure
 * is silent and local, and the remote side is only the account's own rows, read and
 * written through `worker_away_been_list` / `worker_away_been_set` (migration
 * `20260925092000_worker_away_been.sql`), which merge exactly as the device does. Without
 * Supabase keys, or with nobody signed in, every function here is a no-op.
 *
 * Guest → account: a guest's ticks stay on the device; the first sync after signing in
 * pulls the account, merges, writes the device, and pushes the merge — so nothing a guest
 * ticked is lost and nothing the account held is overwritten by an older device.
 *
 * `types/database.ts` does not know the functions yet (generated from the linked project
 * before the migration is pasted), so the client is untyped here on purpose, in this file.
 */

function db(): SupabaseClient {
  return createClient() as unknown as SupabaseClient
}

async function signedIn(client: SupabaseClient): Promise<boolean> {
  try {
    const { data } = await client.auth.getUser()
    return Boolean(data.user?.id)
  } catch {
    return false
  }
}

export async function pullBeen(): Promise<BeenLedger | null> {
  if (!portalConfigured()) return null
  try {
    const client = db()
    if (!(await signedIn(client))) return null
    const { data, error } = await client.rpc('worker_away_been_list')
    const answer = data as { ok?: boolean; rows?: { v?: unknown; b?: unknown; at?: unknown }[] } | null
    if (error || !answer?.ok) return null
    return beenFromRows(answer.rows ?? [])
  } catch {
    return null
  }
}

/** Push some or all of the device's ledger (500 rows a call). `false` on anything but success. */
export async function pushBeen(ledger: BeenLedger): Promise<boolean> {
  if (!portalConfigured()) return false
  const rows = beenRows(ledger)
  if (rows.length === 0) return true
  try {
    const client = db()
    if (!(await signedIn(client))) return false
    for (let i = 0; i < rows.length; i += 500) {
      const { data, error } = await client.rpc('worker_away_been_set', { p_rows: rows.slice(i, i + 500) })
      if (error || !(data as { ok?: boolean } | null)?.ok) return false
    }
    return true
  } catch {
    return false
  }
}

/** Pull, merge, write the device, push the merge. The device is written first. */
export async function syncBeen(): Promise<{ state: 'off' | 'signed-out' | 'synced' | 'failed'; ledger: BeenLedger }> {
  if (!portalConfigured()) return { state: 'off', ledger: readBeen() }
  const remote = await pullBeen()
  if (remote === null) {
    const state = (await signedIn(db())) ? 'failed' : 'signed-out'
    return { state, ledger: readBeen() }
  }
  const merged = mergeBeen(readBeen(), remote)
  writeBeen(merged)
  return { state: (await pushBeen(merged)) ? 'synced' : 'failed', ledger: merged }
}

/** Call `onSignIn` whenever an account signs in on this tab. Returns the unsubscribe. */
export function onSignIn(onSignInCb: () => void): () => void {
  if (!portalConfigured()) return () => {}
  try {
    const { data } = db().auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') onSignInCb()
    })
    return () => data.subscription.unsubscribe()
  } catch {
    return () => {}
  }
}
