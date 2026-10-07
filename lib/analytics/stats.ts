import 'server-only'

import { timingSafeEqual } from 'node:crypto'

import { evaluationMode } from '@/lib/master/mode'
import { localStatsClient } from '@/lib/master/evaluation-db'
import { createClient } from '@supabase/supabase-js'

import { GATES } from '@/lib/gates'

import { METERED_ROUTES, gateNumberOf } from './events'

/**
 * דף המספרים של מאור (/qa/stats) — the read side of the measurement, server only.
 *
 * The three sums (`worker_events_funnel`, `worker_events_daily`, `worker_events_blind_cow`)
 * are granted to `service_role` alone, so they are called here with the service key and
 * nowhere else; the browser gets the rows the page prints and nothing more.
 *
 * Who may open it: a preview or `next dev` (`qaAllowed()`, like every /qa screen) — or the
 * live site with `?key=` equal to the env var `WORKER_STATS_KEY` (16+ characters), checked
 * here in constant time. No key set = the live page is a 404.
 */

export type FunnelRow = {
  gate: string
  visitors: number
  starters: number
  finishers: number
  finishRate: number | null
  leaves: number
  topLeaveStep: number | null
  topLeaveCount: number | null
  crossClicks: number
  shares: number
}

export type DailyRow = { day: string; gate: string; visitors: number; starters: number; finishers: number; shares: number }

export type BlindCowStats = {
  counts: Record<string, number>
  avgHintsToSolve: number | null
  medianSolveMs: number | null
  duelJoinRate: number | null
  duelCompleteRate: number | null
}

export type Stats =
  | { state: 'ok'; days: number; funnel: FunnelRow[]; daily: DailyRow[]; blindCow: BlindCowStats | null }
  | { state: 'unconfigured' }
  | { state: 'error' }

export function statsKeyOk(given: unknown): boolean {
  const want = process.env.WORKER_STATS_KEY ?? ''
  if (want.length < 16 || typeof given !== 'string' || given.length !== want.length) return false
  return timingSafeEqual(Buffer.from(given), Buffer.from(want))
}

export const PERIODS = [1, 7, 30, 90] as const

export function cleanDays(raw: unknown): number {
  const n = Number(raw)
  return (PERIODS as readonly number[]).includes(n) ? n : 30
}

const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v ?? 0) || 0)
const numOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : num(v))

export function funnelRow(raw: Record<string, unknown>): FunnelRow {
  return {
    gate: String(raw.gate ?? ''),
    visitors: num(raw.visitors),
    starters: num(raw.starters),
    finishers: num(raw.finishers),
    finishRate: numOrNull(raw.finish_rate),
    leaves: num(raw.leaves),
    topLeaveStep: numOrNull(raw.top_leave_step),
    topLeaveCount: numOrNull(raw.top_leave_count),
    crossClicks: num(raw.cross_clicks),
    shares: num(raw.shares),
  }
}

/** Every measured route in wall order (gate number, then AWAY DAYS, then LIFE), zero-filled. */
export function orderedFunnel(rows: readonly FunnelRow[]): FunnelRow[] {
  const by = new Map(rows.map((row) => [row.gate, row]))
  const empty = (gate: string): FunnelRow => ({
    gate, visitors: 0, starters: 0, finishers: 0, finishRate: null, leaves: 0, topLeaveStep: null, topLeaveCount: null, crossClicks: 0, shares: 0,
  })
  const routes = [...new Set(METERED_ROUTES)].sort((a, b) => (gateNumberOf(a) ?? 100 + METERED_ROUTES.indexOf(a)) - (gateNumberOf(b) ?? 100 + METERED_ROUTES.indexOf(b)))
  // FAN LIFE club routes (`/clubs/<club>/<gate>`) follow the wall, grouped by club, only when they were visited
  const clubs = rows.filter((row) => !routes.includes(row.gate)).sort((a, b) => a.gate.localeCompare(b.gate))
  return [...routes.map((route) => by.get(route) ?? empty(route)), ...clubs]
}

export function gateTitleKey(route: string) {
  return GATES.find((gate) => gate.href?.split('?')[0] === route)?.title ?? null
}

export async function loadStats(days: number): Promise<Stats> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (!evaluationMode() && (!url || !key)) return { state: 'unconfigured' }
  try {
    const db = (evaluationMode() ? localStatsClient() : createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })) as unknown as { rpc(name:string,args:{p_days:number}):PromiseLike<{data:unknown;error:unknown}> }
    const [funnel, daily, cow] = await Promise.all([
      db.rpc('worker_events_funnel', { p_days: days }),
      db.rpc('worker_events_daily', { p_days: Math.min(days, 14) }),
      db.rpc('worker_events_blind_cow', { p_days: days }),
    ])
    if (funnel.error) return { state: 'error' }
    return {
      state: 'ok',
      days,
      funnel: orderedFunnel(((funnel.data ?? []) as Record<string, unknown>[]).map(funnelRow)),
      daily: ((daily.data ?? []) as Record<string, unknown>[]).map((r) => ({
        day: String(r.day),
        gate: String(r.gate),
        visitors: num(r.visitors),
        starters: num(r.starters),
        finishers: num(r.finishers),
        shares: num(r.shares),
      })),
      blindCow: cow.error ? null : (cow.data as BlindCowStats),
    }
  } catch {
    return { state: 'error' }
  }
}
