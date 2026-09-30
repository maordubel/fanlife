'use server'

import { playRoyalRumbleHeadToHead, type RoyalRumbleResult, type RoyalRumbleSelection } from '@/lib/game/royal-rumble'
import { ROYAL_RUMBLE_DRAFT_VERSION, parseLivePicks, parseSelection, toLivePicks } from '@/lib/game/royal-rumble-public'
import { createClient } from '@/lib/supabase/server'

export type RoyalRumbleLiveRoom = { id: string; code: string; matchSeed: number }
export type RoyalRumbleLiveState = RoyalRumbleLiveRoom & {
  /** the draft generation the room's picks are read under (spec §73) */
  draftVersion: typeof ROYAL_RUMBLE_DRAFT_VERSION
  status: 'waiting' | 'drafting' | 'countdown' | 'playing' | 'finished' | 'expired'
  isHost: boolean
  opponentJoined: boolean
  youReady: boolean
  opponentReady: boolean
  startsAt: string | null
  expiresAt: string
}

function one<T>(rows: T[] | null): T | null { return rows?.[0] ?? null }
function seed(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const out = Math.trunc(value)
  return out >= 0 && out <= 0xffffffff ? out >>> 0 : null
}
/** the V2 wire form of a room's picks — the parsers live with the public helpers (§73) */
function picks(value: unknown): RoyalRumbleSelection[] | null {
  return parseLivePicks(value)
}
function liveStatus(value: unknown): RoyalRumbleLiveState['status'] {
  return value === 'waiting' || value === 'drafting' || value === 'countdown' || value === 'playing' || value === 'finished' || value === 'expired' ? value : 'expired'
}

export async function createRoyalRumbleRoom(matchSeed: number, offerSeed: number): Promise<RoyalRumbleLiveRoom | null> {
  const supabase = createClient() as any
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null
  const { data, error } = await supabase.rpc('worker_rr_create_room', { p_match_seed: matchSeed >>> 0, p_offer_seed: offerSeed >>> 0 })
  if (error) return null
  const row = one<any>(data)
  return row ? { id: row.room_id, code: row.code, matchSeed: Number(row.match_seed) >>> 0 } : null
}

export async function joinRoyalRumbleRoom(code: string, matchSeed: number, offerSeed: number): Promise<RoyalRumbleLiveRoom | null> {
  const supabase = createClient() as any
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null
  const { data, error } = await supabase.rpc('worker_rr_join_room', { p_code: code.trim().toUpperCase(), p_match_seed: matchSeed >>> 0, p_offer_seed: offerSeed >>> 0 })
  if (error) return null
  const row = one<any>(data)
  return row ? { id: row.room_id, code: row.code, matchSeed: Number(row.match_seed) >>> 0 } : null
}

export async function getRoyalRumbleLiveState(roomId: string): Promise<RoyalRumbleLiveState | null> {
  const supabase = createClient() as any
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null
  const { data, error } = await supabase.rpc('worker_rr_state', { p_room_id: roomId })
  if (error) return null
  const row = one<any>(data)
  if (!row) return null
  return { id: row.room_id, code: row.code, matchSeed: Number(row.match_seed) >>> 0, draftVersion: ROYAL_RUMBLE_DRAFT_VERSION, status: liveStatus(row.status), isHost: Boolean(row.is_host), opponentJoined: Boolean(row.opponent_joined), youReady: Boolean(row.you_ready), opponentReady: Boolean(row.opponent_ready), startsAt: row.starts_at, expiresAt: row.expires_at }
}

export async function lockRoyalRumbleLive(roomId: string, offerSeed: number, selection: RoyalRumbleSelection[]): Promise<RoyalRumbleLiveState | null> {
  const payload = parseSelection(selection)
  if (!payload) return null
  const supabase = createClient() as any
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null
  const { error } = await supabase.rpc('worker_rr_lock', { p_room_id: roomId, p_offer_seed: offerSeed >>> 0, p_picks: toLivePicks(payload) })
  if (error) return null
  return getRoyalRumbleLiveState(roomId)
}

export async function resolveRoyalRumbleLive(roomId: string): Promise<RoyalRumbleResult | null> {
  const supabase = createClient() as any
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null
  const { data, error } = await supabase.rpc('worker_rr_claim', { p_room_id: roomId })
  if (error) return null
  const row = one<any>(data)
  if (!row) return null
  const matchSeed = seed(Number(row.match_seed))
  const hostOfferSeed = seed(Number(row.host_offer_seed))
  const guestOfferSeed = seed(Number(row.guest_offer_seed))
  const hostPicks = picks(row.host_picks)
  const guestPicks = picks(row.guest_picks)
  if (matchSeed === null || hostOfferSeed === null || guestOfferSeed === null || !hostPicks || !guestPicks) return null
  const resolved = playRoyalRumbleHeadToHead(matchSeed, hostOfferSeed, hostPicks, guestOfferSeed, guestPicks)
  if (!resolved) return null
  return auth.user.id === row.host_user_id ? resolved.home : resolved.away
}
