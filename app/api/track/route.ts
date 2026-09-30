import { evaluationMode } from '@/lib/master/mode'
import { serverLocalClient } from '@/lib/master/evaluation-db'
import { createClient } from '@supabase/supabase-js'

import { MAX_BATCH, cleanDevice, cleanEvent, type MeterEvent } from '@/lib/analytics/events'
import { portalConfigured } from '@/lib/portal/env'

/**
 * POST /api/track — the measurement's one door (delta 89).
 *
 * The browser sends `{ device, events[] }` (a `sendBeacon` from a closing tab, or a
 * keepalive fetch); this forwards it, filtered, to `worker_events_record` with the PUBLIC
 * key — the database re-checks every field, salts and hashes the device id, and applies
 * the rate limit. Same origin, so no third party ever sees a request. No IP, no
 * user-agent and no cookie is read or forwarded.
 *
 * Without Supabase env it is a no-op that answers 204, like every other portal seam.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BYTES = 16_384

function noContent() {
  return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } })
}

export async function POST(request: Request): Promise<Response> {
  if (!portalConfigured()) return noContent()
  let text: string
  try {
    text = await request.text()
  } catch {
    return noContent()
  }
  if (text.length === 0 || text.length > MAX_BYTES) return noContent()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return noContent()
  }
  const raw = parsed as { device?: unknown; events?: unknown }
  const device = cleanDevice(raw?.device)
  if (!device || !Array.isArray(raw.events)) return noContent()
  const events = raw.events
    .slice(0, MAX_BATCH)
    .map(cleanEvent)
    .filter((event): event is MeterEvent => event !== null)
  if (events.length === 0) return noContent()
  try {
    const client = evaluationMode() ? serverLocalClient() : createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    await client.rpc('worker_events_record', { p_device: device, p_events: events })
  } catch {
    // a lost event is a smaller failure than a slow page
  }
  return noContent()
}

export function GET(): Response {
  return new Response(null, { status: 405 })
}
