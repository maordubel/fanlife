import 'server-only'
import { cookies } from 'next/headers'
import { terraceFinished } from './server'

/**
 * The Daily Terrace board (opt-in). Talks to Supabase with the service role only; any failure — no config, table not run yet —
 * answers `available:false` and the screen simply shows no board. The score is never read from the browser.
 */
export type BoardRow = { nick: string; score: number }
export type Board = { available: boolean; rows: BoardRow[]; mine: string | null; rank: number | null }
const NONE: Board = { available: false, rows: [], mine: null, rank: null }
const DEVICE = 'fanlife-terrace-dev'
export const NICK = /^[\p{L}\p{N} _.-]{2,20}$/u

const base = () => (process.env.FAN_LIFE_STORE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
async function rpc(fn: string, args: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!base() || !key) return null
  try {
    const r = await fetch(`${base()}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args), cache: 'no-store', signal: AbortSignal.timeout(4000) })
    if (!r.ok) return null
    return (await r.json()) as Record<string, unknown>
  } catch { return null }
}
const device = () => cookies().get(DEVICE)?.value ?? null
function ensureDevice(): string {
  const have = device()
  if (have && have.length >= 16) return have
  const id = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8)
  cookies().set(DEVICE, id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 365 })
  return id
}
function shape(d: Record<string, unknown> | null): Board {
  if (!d || d.ok !== true) return NONE
  const rows = Array.isArray(d.rows) ? (d.rows as BoardRow[]).filter(r => typeof r.nick === 'string' && typeof r.score === 'number') : []
  return { available: true, rows, mine: typeof d.mine === 'string' ? d.mine : null, rank: typeof d.rank === 'number' ? d.rank : null }
}

export async function boardFor(slug: unknown): Promise<Board> {
  const f = await terraceFinished(slug)
  if (!f) return NONE
  return shape(await rpc('worker_terrace_board', { p_club: f.club, p_day: f.date, p_device: device() }))
}
export async function joinBoard(slug: unknown, nick: unknown): Promise<Board | { error: 'NICK' | 'NOT_DONE' | 'UNAVAILABLE' }> {
  if (typeof nick !== 'string' || !NICK.test(nick.trim()) || /https?:|www\.|@/i.test(nick)) return { error: 'NICK' }
  const f = await terraceFinished(slug)
  if (!f) return { error: 'NOT_DONE' }
  const r = await rpc('worker_terrace_submit', { p_club: f.club, p_day: f.date, p_edition: f.edition, p_device: ensureDevice(), p_nick: nick.trim(), p_score: f.total })
  if (!r || r.ok !== true) return { error: r && r.error === 'nick' ? 'NICK' : 'UNAVAILABLE' }
  return boardFor(slug)
}
