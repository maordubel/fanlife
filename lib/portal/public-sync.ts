'use client'

import type { SupabaseClient } from '@supabase/supabase-js'

import { cleanPref, mergePref, readPref, writePref, type PublicPref } from '@/lib/profile/identity'
import { createClient } from '@/lib/supabase/client'
import { portalConfigured } from './env'
import type { SyncHandler } from './handlers'

/**
 * הזהות הציבורית, בחשבון — "אדום #N" או כינוי (ONE RED WORLD §35).
 *
 * Same promises as the other seams: the device is written first, every failure is a quiet
 * `false`, and nothing is invented. The account side is `worker_public_identity_me` /
 * `worker_public_identity_set` (migration `20260928130000_worker_public_identity.sql`); both
 * answer a value (`{ ok:false, error }`) rather than throwing, and before the SQL is pasted
 * they simply do not exist — the rpc errors and the device keeps its own choice.
 *
 * The account is where N comes from. A device never mints one.
 */

type Remote = { ok: boolean; mode?: string; nickname?: string | null; no?: number | null; editedAt?: string | null }

function db(): SupabaseClient {
  return createClient() as unknown as SupabaseClient
}

function prefOf(remote: Remote): PublicPref {
  return cleanPref({ mode: remote.mode, nickname: remote.nickname ?? '', editedAt: remote.editedAt ?? '', no: remote.no ?? null })
}

async function reconcile(client: SupabaseClient): Promise<PublicPref | null> {
  const me = await client.rpc('worker_public_identity_me')
  const remote = (me.data ?? null) as Remote | null
  if (me.error || !remote?.ok) return null
  const account = prefOf(remote)
  const merged = mergePref(readPref(), account)
  writePref(merged)
  const deviceNewer =
    merged.editedAt !== '' && (account.editedAt === '' || Date.parse(merged.editedAt) > Date.parse(account.editedAt))
  if (deviceNewer) {
    const set = await client.rpc('worker_public_identity_set', {
      p_mode: merged.mode,
      p_nickname: merged.nickname === '' ? null : merged.nickname,
      p_at: merged.editedAt,
    })
    const after = (set.data ?? null) as Remote | null
    if (set.error || !after?.ok) return merged
    const settled = mergePref(merged, prefOf(after))
    writePref(settled)
    return settled
  }
  return merged
}

/** Pull, merge, push the newer side. Returns the settled preference, or null when there is no account. */
export async function syncPublicIdentity(): Promise<PublicPref | null> {
  if (!portalConfigured()) return null
  try {
    const client = db()
    const { data } = await client.auth.getUser()
    if (!data.user) return null
    return await reconcile(client)
  } catch {
    return null
  }
}

/** The `lib/portal/handlers.ts` entry: runs after the core sync whenever somebody is signed in. */
export const publicIdentityHandler: SyncHandler = {
  id: 'public-identity',
  async sync(ctx) {
    try {
      return (await reconcile(ctx.db as unknown as SupabaseClient)) !== null
    } catch {
      return false
    }
  },
}
