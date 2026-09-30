import 'server-only'

import { evaluationMode } from '@/lib/master/mode'
import { serverLocalClient } from '@/lib/master/evaluation-db'
import { createClient } from '@supabase/supabase-js'

import { portalConfigured } from '@/lib/portal/env'

import { resultOf } from './engine'
import { weightedTimeMs } from './scoring'
import type { OpenClue, RunStatus, RunView } from './types'

/**
 * הדו-קרב — the Next server's side of it. The DATABASE is the referee
 * (`supabase/migrations/20260924090000_worker_blind_cow.sql`): it deals the clues, keeps the
 * clock and grades the guess. This module only forwards: the device key from the httpOnly
 * cookie, the token from the link, and turns the answer the database gives back (after
 * the whistle, never before) into the same `RunView` the solo screen draws.
 *
 * With no Supabase env the duel is simply unavailable and says so; solo and daily never
 * touch this file.
 */
export function duelAvailable(): boolean {
  return portalConfigured()
}

function client() {
  if (evaluationMode()) return serverLocalClient() as unknown as ReturnType<typeof createClient>
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export type DuelError =
  | 'unavailable'
  | 'bad_identity'
  | 'not_found'
  | 'expired'
  | 'full'
  | 'not_joined'
  | 'not_started'
  | 'slow_down'
  | 'no_questions'
  | 'network'
  // the live room (20260925091000_worker_blind_cow_live.sql)
  | 'started'
  | 'not_ready'
  | 'too_early'

type Rpc = Record<string, unknown> & { ok?: boolean; error?: string }

async function rpc(name: string, args: Record<string, unknown>): Promise<Rpc> {
  if (!duelAvailable()) return { ok: false, error: 'unavailable' }
  try {
    const { data, error } = await client().rpc(name, args)
    if (error || !data || typeof data !== 'object') return { ok: false, error: 'network' }
    return data as Rpc
  } catch {
    return { ok: false, error: 'network' }
  }
}

type DbRun = {
  status: RunStatus
  startedAt: number
  finishedAt: number | null
  serverNow: number
  hintsUsed: number
  wrongGuesses: number
  total: number
  clues: OpenClue[]
  tried: string[]
  rawElapsedMs: number | null
  weightedTimeMs: number | null
  scoringVersion: number
  answer: string | null
}

export type DuelOpponent = {
  name: string | null
  started: boolean
  finished: boolean
  result: { status: RunStatus; hintsUsed: number; wrongGuesses: number; rawElapsedMs: number | null; weightedTimeMs: number | null } | null
}

export type DuelState = {
  status: 'waiting' | 'active' | 'completed' | 'expired'
  expiresAt: number
  joined: boolean
  mySlot: 1 | 2 | null
  myName: string | null
  me: RunView | null
  opponent: DuelOpponent | null
  winner: 'me' | 'them' | 'tie' | 'none' | null
  /** server clock minus this server's clock, so the screen's timer runs on the database's time */
  skewMs: number
}

export function runView(db: DbRun): RunView {
  const view: RunView = {
    mode: 'duel',
    status: db.status,
    clues: db.clues.slice(0, db.hintsUsed),
    total: db.total,
    wrong: db.wrongGuesses,
    startedAt: db.startedAt,
    finishedAt: db.finishedAt,
    serverNow: db.serverNow,
    tried: db.tried,
  }
  if (db.status !== 'playing' && db.answer) {
    const run = {
      hintsUsed: db.hintsUsed,
      wrongGuesses: db.wrongGuesses,
      rawElapsedMs: db.rawElapsedMs ?? 0,
      caughtBy: db.status === 'solved' ? db.hintsUsed : null,
      scoringVersion: db.scoringVersion,
    }
    // the database's own ten clues are the ones he played, whatever the bank says today
    const result = resultOf({ playerId: db.answer, fallbackNameHe: '', allClues: db.clues }, run)
    result.weightedTimeMs = db.weightedTimeMs ?? weightedTimeMs(run, db.scoringVersion)
    view.result = result
  }
  return view
}

function asRun(data: Rpc): RunView | null {
  if (!data || data.ok === false || typeof data.status !== 'string') return null
  return runView(data as unknown as DbRun)
}

export async function createDuel(me: string, name: string | null): Promise<{ ok: true; token: string } | { ok: false; error: DuelError }> {
  const data = await rpc('worker_blind_cow_duel_create', { p_me: me, p_name: name })
  if (data.ok && typeof data.token === 'string') return { ok: true, token: data.token }
  return { ok: false, error: (data.error as DuelError) ?? 'network' }
}

export async function joinDuel(me: string, token: string, name: string | null): Promise<{ ok: true; slot: 1 | 2 } | { ok: false; error: DuelError }> {
  const data = await rpc('worker_blind_cow_duel_join', { p_me: me, p_token: token, p_name: name })
  if (data.ok) return { ok: true, slot: data.slot === 2 ? 2 : 1 }
  return { ok: false, error: (data.error as DuelError) ?? 'network' }
}

export async function startDuelRun(me: string, token: string): Promise<RunView | { error: DuelError }> {
  const data = await rpc('worker_blind_cow_run_start', { p_me: me, p_token: token })
  return asRun(data) ?? { error: (data.error as DuelError) ?? 'network' }
}

export async function revealDuel(me: string, token: string, have: number): Promise<RunView | { error: DuelError }> {
  const data = await rpc('worker_blind_cow_run_reveal', { p_me: me, p_token: token, p_have: have })
  return asRun(data) ?? { error: (data.error as DuelError) ?? 'network' }
}

export async function guessDuel(me: string, token: string, playerId: string, clientMs: number | null): Promise<RunView | { error: DuelError }> {
  const data = await rpc('worker_blind_cow_run_guess', { p_me: me, p_token: token, p_player: playerId, p_client_ms: clientMs })
  return asRun(data) ?? { error: (data.error as DuelError) ?? 'network' }
}

export async function giveUpDuel(me: string, token: string): Promise<RunView | { error: DuelError }> {
  const data = await rpc('worker_blind_cow_run_give_up', { p_me: me, p_token: token })
  return asRun(data) ?? { error: (data.error as DuelError) ?? 'network' }
}

export async function duelState(me: string, token: string): Promise<DuelState | { error: DuelError }> {
  const data = await rpc('worker_blind_cow_duel_state', { p_me: me, p_token: token })
  if (!data.ok) return { error: (data.error as DuelError) ?? 'network' }
  const mine = data.me as (DbRun & { serverNow: number }) | null
  return {
    status: data.status as DuelState['status'],
    expiresAt: Number(data.expiresAt),
    joined: data.joined === true,
    mySlot: data.mySlot === 1 || data.mySlot === 2 ? data.mySlot : null,
    myName: typeof data.myName === 'string' ? data.myName : null,
    me: mine ? runView(mine) : null,
    opponent: (data.opponent as DuelOpponent | null) ?? null,
    winner: (data.winner as DuelState['winner']) ?? null,
    skewMs: mine?.serverNow ? mine.serverNow - Date.now() : 0,
  }
}

/* ------------------------------------------------------------------ live (spec §2.4) */

/**
 * The live room — the same duel, the same seven functions, plus three
 * (`supabase/migrations/20260925091000_worker_blind_cow_live.sql`): who is in the room and
 * ready, one shared go time the DATABASE sets when both are, and a start that opens both
 * runs at that instant. The state carries no result; Realtime only says "ask again".
 */
export type LiveState = {
  mySlot: 1 | 2
  meReady: boolean
  meStarted: boolean
  them: { name: string | null; ready: boolean; started: boolean } | null
  /** the shared go time, ms since epoch (database clock), once both are ready */
  goAt: number | null
  expired: boolean
  /** database clock minus this server's, so the countdown runs on the database's time */
  skewMs: number
}

function asLive(data: Rpc): LiveState | { error: DuelError } {
  if (!data.ok) return { error: (data.error as DuelError) ?? 'network' }
  const them = data.them as { name?: unknown; ready?: unknown; started?: unknown } | null
  return {
    mySlot: data.mySlot === 2 ? 2 : 1,
    meReady: data.meReady === true,
    meStarted: data.meStarted === true,
    them: them ? { name: typeof them.name === 'string' ? them.name : null, ready: them.ready === true, started: them.started === true } : null,
    goAt: typeof data.goAt === 'number' ? data.goAt : null,
    expired: data.expired === true,
    skewMs: typeof data.serverNow === 'number' ? data.serverNow - Date.now() : 0,
  }
}

export async function liveState(me: string, token: string): Promise<LiveState | { error: DuelError }> {
  return asLive(await rpc('worker_blind_cow_live_state', { p_me: me, p_token: token }))
}

export async function liveReady(me: string, token: string, ready: boolean): Promise<LiveState | { error: DuelError }> {
  return asLive(await rpc('worker_blind_cow_live_ready', { p_me: me, p_token: token, p_ready: ready }))
}

export async function liveStart(me: string, token: string): Promise<RunView | { error: DuelError; goAt?: number }> {
  const data = await rpc('worker_blind_cow_live_start', { p_me: me, p_token: token })
  const run = asRun(data)
  if (run) return run
  return { error: (data.error as DuelError) ?? 'network', ...(typeof data.goAt === 'number' ? { goAt: data.goAt } : {}) }
}
