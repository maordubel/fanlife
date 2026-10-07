import { GATES } from '@/lib/gates'

/**
 * המדידה — the vocabulary, shared by the browser and the route (delta 89, 25.9.2026).
 *
 * Maor: "לחבר מדידה בסיסית (כמה נכנסים לכל שער, איפה עוזבים)". First-party only: the rows
 * go to THE WORKER's own table (`supabase/migrations/20260925090000_worker_events.sql`)
 * and carry no name, no account, no address — an event is a closed name, a gate route, a
 * step number, one short slug and one integer. The list below and the table's check
 * constraint are the same list (`tests/events-schema.test.ts`).
 */
export const EVENT_NAMES = [
  'gate_view',
  'gate_start',
  'gate_step',
  'gate_finish',
  'gate_leave',
  'share_click',
  'cross_link_click',
  'blind_cow_started',
  'blind_cow_hint_revealed',
  'blind_cow_guess_wrong',
  'blind_cow_solved',
  'blind_cow_gave_up',
  'blind_cow_duel_created',
  'blind_cow_duel_shared',
  'blind_cow_duel_joined',
  'blind_cow_duel_completed',
  'blind_cow_result_shared',
  'blind_cow_live_started',
  // ONE RED WORLD §37 (28.9.2026) — one vocabulary for every gate instead of one per feature.
  // `gate_open` of the plan IS `gate_view` above; a second name for the same moment would
  // split one count in two. The table's check is widened by
  // `supabase/migrations/20260928090000_worker_events_taxonomy.sql`.
  'run_start',
  'run_complete',
  'result_view',
  'archive_open',
  'entity_follow',
  'life_chapter_complete',
  'share_open',
  'share_created',
  'share_joined',
  'challenge_created',
  'challenge_joined',
  'challenge_complete',
  'stand_created',
  'stand_joined',
  'stand_daily_complete',
  'daily_open',
  'daily_item_complete',
  'daily_complete',
  // Royal Rumble match experience (30.9.2026)
  'rumble_reveal_start',
  'rumble_reveal_complete',
  'rumble_match_start',
  'rumble_match_skip',
  'rumble_goal_shown',
  'rumble_match_complete',
] as const

export type EventName = (typeof EVENT_NAMES)[number]

export type MeterEvent = {
  name: EventName
  /** the gate's route — `/goal`, `/blind-cow`, `/away-days`, `/life` */
  gate: string
  step?: number
  /** one lowercase slug: a mode, a channel, a link kind (`solo`, `whatsapp`, `away`) */
  detail?: string
  value?: number
}

const NAMES = new Set<string>(EVENT_NAMES)
const GATE = /^\/[a-z0-9/-]{0,48}$/
const DETAIL = /^[a-z0-9_:.-]{1,48}$/

export const MAX_BATCH = 25

/** The one filter both ends run: a malformed event is dropped, never "fixed". */
export function cleanEvent(raw: unknown): MeterEvent | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>
  if (typeof e.name !== 'string' || !NAMES.has(e.name)) return null
  if (typeof e.gate !== 'string' || !GATE.test(e.gate)) return null
  const out: MeterEvent = { name: e.name as EventName, gate: e.gate }
  if (typeof e.step === 'number' && Number.isInteger(e.step) && e.step >= 0 && e.step <= 999) out.step = e.step
  if (typeof e.detail === 'string' && DETAIL.test(e.detail)) out.detail = e.detail
  if (typeof e.value === 'number' && Number.isFinite(e.value) && Math.abs(e.value) <= 100_000_000) out.value = Math.round(e.value)
  return out
}

/** A device id as the portal mints it (`lib/portal/device.ts`: a uuid). */
export function cleanDevice(raw: unknown): string | null {
  return typeof raw === 'string' && /^[0-9a-f-]{8,64}$/.test(raw) ? raw : null
}

/**
 * The routes measured: the thirteen gates, AWAY DAYS and the LIFE entry. A path belongs
 * to the longest route that is a whole-segment prefix of it (`/kits/build` is gate 4,
 * `/kits` gate 5, `/trivia/europe` is `/trivia`).
 */
export const METERED_ROUTES: readonly string[] = [
  ...GATES.map((gate) => gate.href?.split('?')[0]).filter((href): href is string => Boolean(href)),
  '/away-days',
  '/life',
]

export function meteredGate(pathname: string | null | undefined): string | null {
  if (!pathname) return null
  const path = pathname.split('?')[0]?.replace(/\/$/, '') || '/'
  const club = CLUB_GATE.exec(path)
  if (club) return `/clubs/${club[1]}/${club[2]}`
  let best: string | null = null
  for (const route of METERED_ROUTES) {
    if (path === route || path.startsWith(`${route}/`)) {
      if (!best || route.length > best.length) best = route
    }
  }
  return best
}

/**
 * FAN LIFE's club gates (research 7.10.2026 §4.2): `/clubs/<club>/<gate>` is measured as itself, so
 * the stats can tell Panathinaikos' trivia from Hapoel's. The club slug and gate key are the route's
 * own segments — no name, no account. Fits the table's gate check (`^/[a-z0-9/-]{0,48}$`).
 */
export const CLUB_GATE_KEYS = ['xi', 'trivia', 'lineup', 'kit-builder', 'kits', 'memory', 'polls', 'goal', 'royal-rumble', 'blind-cow', 'derby', 'archive', 'timeline', 'life'] as const
const CLUB_GATE = new RegExp(`^/clubs/([a-z0-9-]{1,24})/(${CLUB_GATE_KEYS.join('|')})(?:/|$)`)

/** The stats page's order and names: gate number, then AWAY DAYS, then LIFE. */
export function gateNumberOf(route: string): number | null {
  return GATES.find((gate) => gate.href?.split('?')[0] === route)?.number ?? null
}
