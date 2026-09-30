'use server'

import { randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'

import { LIVED_MIN, cleanFilter, dailyQuestion, livedSoloPool, pickSolo, todayInIsrael } from '@/lib/game/blind-cow/bank'
import {
  createDuel,
  duelState,
  giveUpDuel,
  guessDuel,
  joinDuel,
  liveReady,
  liveStart,
  liveState,
  revealDuel,
  startDuelRun,
  type DuelError,
  type DuelState,
  type LiveState,
} from '@/lib/game/blind-cow/duel'
import { giveUp, guess, newRun, reveal, viewOf, type RunState } from '@/lib/game/blind-cow/engine'
import { open, seal } from '@/lib/game/blind-cow/token'
import { cleanChapters, livedPlayerIds } from '@/lib/life/livedPool'
import type { RunView } from '@/lib/game/blind-cow/types'

/**
 * Server authority for gate 10 (rule 4, spec §8). The client holds the clues it has
 * opened and nothing else; the answer, the unopened clues and the clock live here (solo,
 * daily: a sealed httpOnly cookie) or in the database (duel). Every action returns the
 * whole `RunView`, so a refresh, a retried request or a second tab all converge on the
 * same state instead of each keeping its own.
 */

const COOKIE = { solo: 'bc_solo', daily: 'bc_daily', me: 'bc_me' } as const
const PLAYER = /^p_[0-9a-f]{10}$/
const TOKEN = /^[0-9a-f]{32}$/

export type Verdict = 'right' | 'wrong' | 'none'
export type ActionResult = { view: RunView | null; verdict: Verdict; error?: DuelError | 'empty' }

function store(state: RunState): void {
  cookies().set(COOKIE[state.mode], seal(state), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: state.mode === 'daily' ? 60 * 60 * 36 : 60 * 60 * 24 * 7,
  })
}

function load(mode: 'solo' | 'daily'): RunState | null {
  const state = open<RunState>(cookies().get(COOKIE[mode])?.value)
  if (!state || state.v !== 1 || state.mode !== mode) return null
  if (mode === 'daily' && state.day !== todayInIsrael()) return null
  return state
}

/** The device's duel key — minted once, httpOnly, never shown to the page. */
function deviceKey(): string {
  const have = cookies().get(COOKIE.me)?.value
  if (have && /^[0-9a-f]{32}$/.test(have)) return have
  const fresh = randomBytes(16).toString('hex')
  cookies().set(COOKIE.me, fresh, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  return fresh
}

function cleanName(name: unknown): string | null {
  if (typeof name !== 'string') return null
  const out = name.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 24)
  return out || null
}

/* ------------------------------------------------------------------ solo / daily */

/** the lived pool of this device's finished LIFE chapters — `null` below the floor */
function livedPool(chapters: unknown) {
  const pool = livedSoloPool(livedPlayerIds(cleanChapters(chapters)))
  return pool.length >= LIVED_MIN ? pool : null
}

/**
 * §19 — may the lobby offer "תן לי מישהו מהשנים שחיית עכשיו"? A yes/no only: which men are
 * in the pool is the answer to the game, so neither the ids nor the count leave the server.
 */
export async function livedFilterOpen(chapters: string[]): Promise<boolean> {
  return livedPool(chapters) !== null
}

export async function startSolo(filter: string, chapters: string[] = []): Promise<ActionResult> {
  const f = cleanFilter(filter)
  const previous = open<RunState>(cookies().get(COOKIE.solo)?.value)
  const lived = f === 'lived' ? livedPool(chapters) : null
  if (f === 'lived' && !lived) return { view: null, verdict: 'none', error: 'empty' }
  const q = pickSolo(f, previous?.recent ?? [], lived ?? undefined)
  if (!q) return { view: null, verdict: 'none', error: 'empty' }
  const state = newRun('solo', q, Date.now(), { filter: f, recent: previous?.recent ?? [] })
  store(state)
  return { view: viewOf(state), verdict: 'none' }
}

/** The daily: the same question for everybody today; opening it again resumes it. */
export async function startDaily(): Promise<ActionResult> {
  const have = load('daily')
  if (have) return { view: viewOf(have), verdict: 'none' }
  const day = todayInIsrael()
  const q = dailyQuestion(day)
  if (!q) return { view: null, verdict: 'none', error: 'empty' }
  const state = newRun('daily', q, Date.now(), { day })
  store(state)
  return { view: viewOf(state), verdict: 'none' }
}

export async function resumeRun(mode: 'solo' | 'daily'): Promise<ActionResult> {
  const state = load(mode === 'daily' ? 'daily' : 'solo')
  return { view: state ? viewOf(state) : null, verdict: 'none' }
}

/* ------------------------------------------------------------------ the three moves */

export async function revealClue(mode: 'solo' | 'daily' | 'duel', have: number, token?: string): Promise<ActionResult> {
  const n = Math.trunc(Number(have))
  if (!Number.isFinite(n) || n < 1 || n > 10) return { view: null, verdict: 'none' }
  if (mode === 'duel') {
    if (typeof token !== 'string' || !TOKEN.test(token)) return { view: null, verdict: 'none', error: 'not_found' }
    const out = await revealDuel(deviceKey(), token, n)
    return 'error' in out ? { view: null, verdict: 'none', error: out.error } : { view: out, verdict: 'none' }
  }
  const state = load(mode)
  if (!state) return { view: null, verdict: 'none' }
  const next = reveal(state, n)
  if (next !== state) store(next)
  return { view: viewOf(next), verdict: 'none' }
}

export async function submitGuess(
  mode: 'solo' | 'daily' | 'duel',
  playerId: string,
  token?: string,
  clientMs?: number,
): Promise<ActionResult> {
  if (typeof playerId !== 'string' || !PLAYER.test(playerId)) return { view: null, verdict: 'none' }
  if (mode === 'duel') {
    if (typeof token !== 'string' || !TOKEN.test(token)) return { view: null, verdict: 'none', error: 'not_found' }
    const ms = Number.isFinite(clientMs) ? Math.trunc(clientMs as number) : null
    const out = await guessDuel(deviceKey(), token, playerId, ms)
    if ('error' in out) return { view: null, verdict: 'none', error: out.error }
    const verdict: Verdict = out.status === 'solved' && out.result?.playerId === playerId ? 'right' : out.tried.includes(playerId) ? 'wrong' : 'none'
    return { view: out, verdict }
  }
  const state = load(mode)
  if (!state) return { view: null, verdict: 'none' }
  const { state: next, correct } = guess(state, playerId, Date.now())
  if (next !== state) store(next)
  return { view: viewOf(next), verdict: correct === true ? 'right' : correct === false ? 'wrong' : 'none' }
}

export async function giveUpRun(mode: 'solo' | 'daily' | 'duel', token?: string): Promise<ActionResult> {
  if (mode === 'duel') {
    if (typeof token !== 'string' || !TOKEN.test(token)) return { view: null, verdict: 'none', error: 'not_found' }
    const out = await giveUpDuel(deviceKey(), token)
    return 'error' in out ? { view: null, verdict: 'none', error: out.error } : { view: out, verdict: 'none' }
  }
  const state = load(mode)
  if (!state) return { view: null, verdict: 'none' }
  const next = giveUp(state, Date.now())
  if (next !== state) store(next)
  return { view: viewOf(next), verdict: 'none' }
}

/* ------------------------------------------------------------------ duel */

export async function createDuelAction(name: string): Promise<{ token: string } | { error: DuelError }> {
  const out = await createDuel(deviceKey(), cleanName(name))
  return out.ok ? { token: out.token } : { error: out.error }
}

export async function joinDuelAction(token: string, name: string): Promise<{ slot: 1 | 2 } | { error: DuelError }> {
  if (typeof token !== 'string' || !TOKEN.test(token)) return { error: 'not_found' }
  const out = await joinDuel(deviceKey(), token, cleanName(name))
  return out.ok ? { slot: out.slot } : { error: out.error }
}

export async function duelStateAction(token: string): Promise<DuelState | { error: DuelError }> {
  if (typeof token !== 'string' || !TOKEN.test(token)) return { error: 'not_found' }
  return duelState(deviceKey(), token)
}

export async function startDuelAction(token: string): Promise<ActionResult> {
  if (typeof token !== 'string' || !TOKEN.test(token)) return { view: null, verdict: 'none', error: 'not_found' }
  const out = await startDuelRun(deviceKey(), token)
  return 'error' in out ? { view: null, verdict: 'none', error: out.error } : { view: out, verdict: 'none' }
}

/* ------------------------------------------------------------------ live duel (spec §2.4) */

export async function liveStateAction(token: string): Promise<LiveState | { error: DuelError }> {
  if (typeof token !== 'string' || !TOKEN.test(token)) return { error: 'not_found' }
  return liveState(deviceKey(), token)
}

export async function liveReadyAction(token: string, ready: boolean): Promise<LiveState | { error: DuelError }> {
  if (typeof token !== 'string' || !TOKEN.test(token)) return { error: 'not_found' }
  return liveReady(deviceKey(), token, ready === true)
}

/** At the go time: the run opens with its clock at that instant, for both sides. */
export async function liveStartAction(token: string): Promise<ActionResult & { goAt?: number }> {
  if (typeof token !== 'string' || !TOKEN.test(token)) return { view: null, verdict: 'none', error: 'not_found' }
  const out = await liveStart(deviceKey(), token)
  if ('error' in out) return { view: null, verdict: 'none', error: out.error, ...(out.goAt ? { goAt: out.goAt } : {}) }
  return { view: out, verdict: 'none' }
}
