import 'server-only'

import { evaluationMode } from '@/lib/master/mode'
import { serverLocalClient } from '@/lib/master/evaluation-db'
import { createClient } from '@supabase/supabase-js'

import { rosterIndex } from '@/lib/game/allTimeXI'
import { t } from '@/lib/i18n'
import { debateOptions } from '@/lib/polls/debates-server'
import { DEBATES } from '@/lib/polls/debates'
import { portalConfigured } from '@/lib/portal/env'

import type {
  BlindCowView,
  DebateView,
  FeedRow,
  PairFacts,
  Peek,
  Pick,
  RememberedDebate,
  Result,
  StandError,
  StandHome,
  StandRef,
} from './contract'

/**
 * The Next server's side of the stand — a forwarder, like gate 10's duel. The DATABASE is
 * the referee (`20260928120000_worker_stands.sql`); this file hands it the device key from
 * the httpOnly cookie and turns its answers into typed values, resolving the one thing the
 * database cannot: what a debate pick is CALLED (a match, a title, a player's name).
 *
 * With no Supabase env every call answers `unavailable` and the stand says so on screen;
 * the daily, the gates and the solo week never touch this file.
 */
export function standAvailable(): boolean {
  return portalConfigured()
}

function client() {
  if (evaluationMode()) return serverLocalClient() as unknown as ReturnType<typeof createClient>
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

type Row = Record<string, unknown>
const KNOWN: ReadonlySet<string> = new Set([
  'unavailable', 'bad_identity', 'bad_name', 'not_found', 'not_member', 'full', 'too_many',
  'slow_down', 'bad_post', 'bad_day', 'bad_week', 'busy', 'network',
])

async function rpc(name: string, args: Record<string, unknown>): Promise<Result<Row>> {
  if (!standAvailable()) return { ok: false, error: 'unavailable' }
  try {
    const { data, error } = await client().rpc(name, args)
    if (error || !data || typeof data !== 'object') return { ok: false, error: 'network' }
    const row = data as Row
    if (row.ok !== true) {
      const code = typeof row.error === 'string' && KNOWN.has(row.error) ? (row.error as StandError) : 'network'
      return { ok: false, error: code }
    }
    return { ok: true, value: row }
  } catch {
    return { ok: false, error: 'network' }
  }
}

const num = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : Number(value) || 0)
const str = (value: unknown): string | null => (typeof value === 'string' ? value : null)

export async function createStand(key: string, name: string, nick: string | null): Promise<Result<{ code: string; name: string }>> {
  const out = await rpc('worker_stand_create', { p_me: key, p_name: name, p_nick: nick })
  return out.ok ? { ok: true, value: { code: String(out.value.code), name: String(out.value.name) } } : out
}

export async function joinStand(key: string, code: string, nick: string | null): Promise<Result<{ code: string; name: string; no: number }>> {
  const out = await rpc('worker_stand_join', { p_me: key, p_code: code, p_nick: nick })
  return out.ok ? { ok: true, value: { code: String(out.value.code), name: String(out.value.name), no: num(out.value.no) } } : out
}

export async function leaveStand(key: string, code: string): Promise<Result<true>> {
  const out = await rpc('worker_stand_leave', { p_me: key, p_code: code })
  return out.ok ? { ok: true, value: true } : out
}

export async function peekStand(key: string | null, code: string): Promise<Result<Peek>> {
  const out = await rpc('worker_stand_peek', { p_me: key ?? '', p_code: code })
  if (!out.ok) return out
  const v = out.value
  return { ok: true, value: { code: String(v.code), name: String(v.name), members: num(v.members), member: v.member === true } }
}

export async function myStands(key: string): Promise<Result<StandRef[]>> {
  const out = await rpc('worker_stand_mine', { p_me: key })
  if (!out.ok) return out
  const rows = Array.isArray(out.value.stands) ? (out.value.stands as Row[]) : []
  return {
    ok: true,
    value: rows.map((r) => ({
      code: String(r.code),
      name: String(r.name),
      no: num(r.no),
      nick: str(r.nick),
      members: num(r.members),
      othersToday: num(r.othersToday),
    })),
  }
}

export type ReportIn = {
  day: string
  slots: string[]
  bc: { status: 'solved' | 'gave_up' | 'timeout'; hints: number; wrong: number } | null
  debateId: string | null
  debatePick: string | null
  weekStart: string
  stations: string[]
}

export async function reportDay(key: string, r: ReportIn): Promise<Result<true>> {
  const out = await rpc('worker_stand_report', {
    p_me: key,
    p_day: r.day,
    p_slots: r.slots,
    p_bc_status: r.bc?.status ?? null,
    p_bc_hints: r.bc?.hints ?? null,
    p_bc_wrong: r.bc?.wrong ?? null,
    p_debate_id: r.debateId,
    p_debate_pick: r.debatePick,
    p_week_start: r.weekStart,
    p_stations: r.stations,
  })
  return out.ok ? { ok: true, value: true } : out
}

export async function postToStand(key: string, code: string, gate: number, href: string, headline: string): Promise<Result<true>> {
  const out = await rpc('worker_stand_post', { p_me: key, p_code: code, p_gate: gate, p_href: href, p_headline: headline })
  return out.ok ? { ok: true, value: true } : out
}

/* ------------------------------------------------------------------ labels */

let rosterNames: Map<string, string> | null = null
function playerName(id: string): string | null {
  if (!rosterNames) {
    rosterNames = new Map()
    for (const entry of rosterIndex().all) {
      rosterNames.set(entry.slug, entry.nameHe)
      if (entry.id) rosterNames.set(entry.id, entry.nameHe)
    }
  }
  return rosterNames.get(id) ?? null
}

/** What a pick on a debate is called — the master's own label, or "אחר" when it is gone. */
export function pickLabel(debateId: string, pick: string): string {
  const debate = DEBATES.find((d) => d.id === debateId)
  if (debate?.options) return debateOptions(debate.options).find((o) => o.id === pick)?.labelHe ?? t('terrace.count.other')
  return playerName(pick) ?? t('terrace.count.other')
}

function picks(debateId: string, raw: unknown): Pick[] {
  return (Array.isArray(raw) ? (raw as Row[]) : []).map((p) => ({
    pick: String(p.pick),
    n: num(p.n),
    labelHe: pickLabel(debateId, String(p.pick)),
  }))
}

export async function standHome(
  key: string,
  code: string,
  debateId: string | null,
  weekStart: string,
  stations: readonly string[],
): Promise<Result<StandHome>> {
  const out = await rpc('worker_stand_home', {
    p_me: key,
    p_code: code,
    p_debate: debateId,
    p_week_start: weekStart,
    p_stations: stations,
  })
  if (!out.ok) return out
  const v = out.value
  const you = (v.you ?? {}) as Row
  const today = (v.today ?? {}) as Row
  const bcRaw = (v.blindCow ?? {}) as Row
  const blindCow: BlindCowView =
    bcRaw.mine === true
      ? {
          mine: true,
          finished: num(bcRaw.finished),
          solved: num(bcRaw.solved),
          early: num(bcRaw.early),
          ranking: (Array.isArray(bcRaw.ranking) ? (bcRaw.ranking as Row[]) : []).map((r) => ({
            no: num(r.no),
            nick: str(r.nick),
            hints: num(r.hints),
            wrong: num(r.wrong),
            you: r.you === true,
          })),
        }
      : { mine: false, finished: num(bcRaw.finished) }
  const dRaw = (v.debate ?? {}) as Row
  const debate: DebateView =
    dRaw.mine === true && debateId
      ? {
          mine: true,
          voters: num(dRaw.voters),
          yours: str(dRaw.yours),
          yoursHe: str(dRaw.yours) ? pickLabel(debateId, String(dRaw.yours)) : null,
          tally: picks(debateId, dRaw.tally),
        }
      : { mine: false, voters: num(dRaw.voters) }
  const rRaw = (v.remember ?? {}) as Row
  const debates: RememberedDebate[] = (Array.isArray(rRaw.debates) ? (rRaw.debates as Row[]) : [])
    .map((d) => {
      const id = String(d.debate)
      const prompt = DEBATES.find((x) => x.id === id)?.promptHe
      return prompt ? { debate: id, promptHe: prompt, voters: num(d.voters), picks: picks(id, d.picks) } : null
    })
    .filter((d): d is RememberedDebate => d !== null)
  const wRaw = (v.week ?? {}) as Row
  const stationCounts: Record<string, number> = {}
  for (const [id, count] of Object.entries((wRaw.stations ?? {}) as Row)) stationCounts[id] = num(count)
  const feed: FeedRow[] = (Array.isArray(v.feed) ? (v.feed as Row[]) : []).map((f) => ({
    no: num(f.no),
    nick: str(f.nick),
    gate: num(f.gate),
    href: String(f.href),
    headline: String(f.headline),
    at: String(f.at),
    mine: f.mine === true,
  }))
  const pairs: PairFacts[] = (Array.isArray(v.pairs) ? (v.pairs as Row[]) : []).map((p) => ({
    no: num(p.no),
    nick: str(p.nick),
    daysBoth: num(p.daysBoth),
    bcBoth: num(p.bcBoth),
    theyEarlier: num(p.theyEarlier),
    youEarlier: num(p.youEarlier),
    debatesBoth: num(p.debatesBoth),
    debatesAgree: num(p.debatesAgree),
    sameRuns: num(p.sameRuns),
  }))
  return {
    ok: true,
    value: {
      code: String(v.code),
      name: String(v.name),
      members: num(v.members),
      you: { no: num(you.no), nick: str(you.nick) },
      today: { played: num(today.played), all3: num(today.all3), youPlayed: today.youPlayed === true },
      blindCow,
      debate,
      remember: { daysTogether: num(rRaw.daysTogether), debates },
      week: {
        start: String(wRaw.start ?? weekStart),
        players: num(wRaw.players),
        solved: num(wRaw.solved),
        stations: stationCounts,
        closedAll: num(wRaw.closedAll),
      },
      feed,
      pairs,
    },
  }
}
