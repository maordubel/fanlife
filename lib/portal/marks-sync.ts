'use client'

import type { SupabaseClient } from '@supabase/supabase-js'

import { cleanMarks, mergeMarks, readMarks, writeMarks, type Marks } from '@/lib/profile/marks'
import { createClient } from '@/lib/supabase/client'
import { portalConfigured } from './env'

/**
 * פנקס הנקמות, בחשבון — the device's ledger and the account's, merged.
 *
 * Same three promises as `lib/portal/sync.ts`: the device never waits for the network
 * (a round writes `lib/profile/marks.ts` first and always), every failure is silent and
 * local, and nothing is invented on the way up — the remote side is the account's own
 * `worker_question_mark` rows. Without Supabase keys, or with nobody signed in, every function
 * here is a no-op and Revenge runs on the device alone.
 *
 * The table is written through `worker_mark_questions` (migration
 * `20260922090000_worker_shared_project.sql`), which applies the same merge the device does —
 * newer outcome wins, counters take the max — so two devices pushing in either order
 * land on the same row. `types/database.ts` does not know the table yet (it is generated
 * from the linked project, which does not have it until the migration is pasted), so the
 * client here is untyped on purpose, in this one file.
 */

type Row = {
  question_id: string
  wrong: number
  right: number
  last_outcome: 'w' | 'r'
  last_at: string
}

function db(): SupabaseClient {
  return createClient() as unknown as SupabaseClient
}

async function userId(client: SupabaseClient): Promise<string | null> {
  try {
    const { data } = await client.auth.getUser()
    return data.user?.id ?? null
  } catch {
    return null
  }
}

/** rows → the device's shape */
export function marksFromRows(rows: readonly Row[]): Marks {
  const out: Record<string, unknown> = {}
  for (const row of rows) {
    out[row.question_id] = {
      t: (row.wrong ?? 0) + (row.right ?? 0),
      w: row.wrong ?? 0,
      r: row.right ?? 0,
      last: row.last_outcome,
      at: row.last_at,
    }
  }
  return cleanMarks(out)
}

/** the device's shape → the RPC's payload (topic is looked up by the caller) */
export function payloadOf(marks: Marks, topicOf: (id: string) => string | null = () => null) {
  return Object.entries(marks).map(([id, mark]) => ({
    q: id,
    topic: topicOf(id),
    w: mark.w,
    r: mark.r,
    last: mark.last,
    at: mark.at,
  }))
}

/** The account's ledger, or null when there is no account or the read failed. */
export async function pullMarks(): Promise<Marks | null> {
  if (!portalConfigured()) return null
  try {
    const client = db()
    const user = await userId(client)
    if (!user) return null
    const { data, error } = await client
      .from('worker_question_mark')
      .select('question_id, wrong, right, last_outcome, last_at')
      .eq('user_id', user)
    if (error) return null
    return marksFromRows((data ?? []) as Row[])
  } catch {
    return null
  }
}

/** Push some or all of the device's ledger. Best-effort; `false` on anything but success. */
export async function pushMarks(marks: Marks, topicOf?: (id: string) => string | null): Promise<boolean> {
  if (!portalConfigured()) return false
  const payload = payloadOf(marks, topicOf)
  if (payload.length === 0) return true
  try {
    const client = db()
    if (!(await userId(client))) return false
    const { error } = await client.rpc('worker_mark_questions', { p_marks: payload })
    return !error
  } catch {
    return false
  }
}

/**
 * Pull, merge, write back to the device, push the merge up. The device is written first,
 * so a push that fails still leaves the device holding the better of the two ledgers.
 */
export async function syncMarks(): Promise<'off' | 'signed-out' | 'synced' | 'failed'> {
  if (!portalConfigured()) return 'off'
  const remote = await pullMarks()
  if (remote === null) {
    const client = db()
    return (await userId(client)) ? 'failed' : 'signed-out'
  }
  const merged = mergeMarks(readMarks(), remote)
  writeMarks(merged)
  return (await pushMarks(merged)) ? 'synced' : 'failed'
}
