'use client'

import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { portalConfigured } from '@/lib/portal/env'
import { deviceId } from '@/lib/portal/device'

/**
 * The hub ballot's wire to Football Master (public.worker_hub_vote_*; FAN LIFE owns worker_*, ecosystem contract rule 1).
 * Accounts count once per account, guests once per device, and the two are counted apart. The device id travels with
 * the call only so an account vote can replace that device's earlier guest vote; the server stores both as hashes.
 * Every failure is silent: the ballot then runs on the device alone, like every other convenience here.
 */
export const BALLOT = 'next-club'

export type Tally = Record<string, { account: number; guest: number }>
export type CastResult = 'ok' | 'off' | 'failed' | 'too_many'

function db(): SupabaseClient {
  return createClient() as unknown as SupabaseClient
}

export async function fetchTally(): Promise<Tally | null> {
  if (!portalConfigured()) return null
  try {
    const { data, error } = await db().rpc('worker_hub_vote_tally', { p_ballot: BALLOT })
    if (error || !Array.isArray(data)) return null
    const out: Tally = {}
    for (const r of data as { club_id: string; account_votes: number | string; guest_votes: number | string }[]) {
      out[r.club_id] = { account: Number(r.account_votes) || 0, guest: Number(r.guest_votes) || 0 }
    }
    return out
  } catch {
    return null
  }
}

/** The club this account (or, signed out, this device) voted for, or null. */
export async function fetchMine(): Promise<string | null> {
  if (!portalConfigured()) return null
  try {
    const { data, error } = await db().rpc('worker_hub_vote_mine', { p_ballot: BALLOT, p_device: deviceId() })
    const r = data as { ok?: boolean; club?: string | null } | null
    return !error && r?.ok && typeof r.club === 'string' ? r.club : null
  } catch {
    return null
  }
}

/** Casting again moves the vote; it never adds one. */
export async function castVote(club: string): Promise<CastResult> {
  if (!portalConfigured()) return 'off'
  try {
    const { data, error } = await db().rpc('worker_hub_vote_cast', { p_ballot: BALLOT, p_club: club, p_device: deviceId() })
    const r = data as { ok?: boolean; error?: string } | null
    if (error || !r) return 'failed'
    if (r.ok) return 'ok'
    return r.error === 'too_many' ? 'too_many' : 'failed'
  } catch {
    return 'failed'
  }
}

/** Seed (the labelled early count) plus the real tally. */
export function totalFor(seed: number, t: Tally | null, id: string, mineDelta = 0): number {
  const r = t?.[id]
  return seed + (r ? r.account + r.guest : 0) + mineDelta
}
