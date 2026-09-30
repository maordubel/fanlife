import { trackIds } from '@/lib/ads'
import { meterProgress } from '@/lib/analytics/progress'
import {
  saveCard,
  saveSupporter,
  type CardPatch,
  type SupporterRecord,
} from '@/lib/game/member'
import {
  collectRemote,
  pushCardRemote,
  pushSupporterRemote,
  recordRunRemote,
} from '@/lib/portal/sync'

import { canonicalGate, cleanVariant, wallNumber } from './gate-id'
import {
  addToSet,
  applyDeed,
  applyDuel,
  applyLatest,
  applyRun,
  emptyProfile,
  isOn,
  today,
  tombstoneOf,
  toggleToken,
  updateProfile,
  type Profile,
} from './store'

/**
 * שכבת ההתקדמות — one call for everything a gate wants remembered (21.9.2026).
 *
 * Before this file every gate reached into the store for itself: `recordRun` here,
 * `recordDeed` there, `collect` somewhere else, and only `RecordRun` ever told the
 * account anything. So deeds, collections, the Royal Rumble and two whole gates never
 * left the device, and nothing at all reached analytics. Brief §9 asks for "one
 * abstraction"; this is it, and it is deliberately not a second store:
 *
 *   emit(event)
 *     1. `applyEvent(profile, event)` — PURE — runs inside `updateProfile()`. That is the
 *        only local write to the profile, and it is what the tests exercise.
 *     2. If the portal has keys and somebody is signed in, the remote operations the
 *        reducer asked for go up, fire-and-forget (`lib/portal/sync.ts`). A failure is
 *        silent: the device already holds the truth and the next sync reconciles.
 *     3. `trackIds()` — GA4, with ids and integers only (`lib/ads.ts safeParams`). No
 *        free text, no names, and never a ballot pick (rule 76): `vote_cast` does not
 *        even CARRY a pick, so there is nothing to leak.
 *
 * Two events write the member BOOK rather than the profile — `card_edited` and
 * `ballot_sealed` — because the book is the identity record and the profile the progress
 * record (`lib/game/member.ts`). They go through the book's own writers.
 */

/* ---------------------------------------------------------------------------- events */

export type ShareChannel = 'story' | 'whatsapp' | 'telegram' | 'copy'

export type ProgressEvent =
  /** a finished round. `gate` is the route; `variant` one slug segment (a trivia topic). */
  | {
      type: 'gate_completed'
      gate: string
      variant?: string | null
      score?: number
      correct?: number
      asked?: number
      seed?: number | null
      /** the round's idempotency key; minted here when absent */
      key?: string
    }
  /** a wing MADE something — an eleven, a sealed slip, a design. Once per gate per day. */
  | { type: 'deed'; gate: string; mark?: string }
  | { type: 'kit_unlocked'; kitId: string }
  | { type: 'kit_design_saved'; designId: string }
  /** gate 12 "Mine": a parity toggle, set to `on` (default true) */
  | { type: 'archive_saved'; entityId: string; on?: boolean }
  | { type: 'goal_rebuilt'; replayId: string; score: number }
  | { type: 'red_thread_completed'; routeId: string }
  | { type: 'hate_wall_completed'; seed: number; survivorId: string }
  /** generic grow-only set; with `gate`, the same tap is also that wing's deed */
  | { type: 'collected'; set: string; ids: readonly string[]; gate?: string }
  /** generic parity toggle; `on` sets a state, absent flips it */
  | { type: 'toggled'; set: string; id: string; on?: boolean }
  /** grow-only removal: ids go into the set's tombstone */
  | { type: 'retired'; set: string; ids: readonly string[] }
  /** gate 7 — the ballot store keeps the pick; this event deliberately has no field for one */
  | { type: 'vote_cast'; questionId: string }
  /** gate 7's seal: the supporter record goes on the book, and the seal is the wing's deed */
  | { type: 'ballot_sealed'; supporter: SupporterRecord }
  | { type: 'shared'; kind: string; channel: ShareChannel }
  | { type: 'duel_taken'; gate: string; seed: number }
  /** gate 10: what the person declared on the Worker Card */
  | { type: 'card_edited'; patch: CardPatch }

/** What the reducer asks the account to do. Executed by `emit`, never by the reducer. */
export type RemoteOp =
  | {
      op: 'run'
      key: string
      gate: string
      score: number
      correct: number
      asked: number
      seed: number | null
      day?: string
    }
  | { op: 'collect'; set: string; ids: string[] }
  | { op: 'card' }
  | { op: 'supporter'; record: SupporterRecord }

export type Applied = { profile: Profile; remote: RemoteOp[]; counted: boolean }

/** A deed's remote idempotency key: one row per gate per day, from any device. */
export function deedKey(gate: string, day: string): string {
  return `deed:${canonicalGate(gate)}:${day}`
}

function num(value: number | undefined | null): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : 0
}

function seedOf(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null
}

function deed(profile: Profile, gate: string, date: string, mark?: string): Applied {
  const next = applyDeed(profile, gate, date, mark)
  const id = canonicalGate(gate)
  return {
    profile: next.profile,
    counted: next.counted,
    remote: next.counted
      ? [{ op: 'run', key: deedKey(id, date), gate: id, score: 0, correct: 0, asked: 0, seed: null, day: date }]
      : [],
  }
}

function grow(profile: Profile, set: string, ids: readonly string[]): Applied {
  const next = addToSet(profile, set, ids)
  return {
    profile: next.profile,
    counted: next.added.length > 0,
    remote: next.added.length > 0 ? [{ op: 'collect', set, ids: next.added }] : [],
  }
}

function toggle(profile: Profile, set: string, id: string, on?: boolean): Applied {
  if (on !== undefined && isOn(set, id, profile) === on) return { profile, remote: [], counted: false }
  const next = toggleToken(profile, set, id)
  return { profile: next.profile, counted: true, remote: [{ op: 'collect', set, ids: [next.token] }] }
}

function both(first: Applied, second: (profile: Profile) => Applied): Applied {
  const next = second(first.profile)
  return {
    profile: next.profile,
    counted: first.counted || next.counted,
    remote: [...first.remote, ...next.remote],
  }
}

/**
 * The reducer. Pure: the day and the round key come in through `ctx`, so a test can
 * replay any sequence and get the same profile out.
 */
export function applyEvent(
  profile: Profile,
  event: ProgressEvent,
  ctx: { date: string; key?: string },
): Applied {
  switch (event.type) {
    case 'gate_completed': {
      const gate = canonicalGate(event.gate, event.variant)
      const score = num(event.score)
      const asked = num(event.asked)
      const correct = Math.min(num(event.correct), asked > 0 ? asked : num(event.correct))
      const next = applyRun(profile, { gate, score, correct, asked }, ctx.date)
      const key = event.key ?? ctx.key
      return {
        profile: next,
        counted: true,
        remote:
          key === undefined
            ? []
            : [
                {
                  op: 'run',
                  key,
                  gate,
                  score,
                  // `worker_gate_run` refuses a row that is more right than it was long
                  correct: Math.min(correct, asked),
                  asked,
                  seed: seedOf(event.seed),
                },
              ],
      }
    }
    case 'deed':
      return deed(profile, event.gate, ctx.date, event.mark)
    case 'kit_unlocked':
      return grow(profile, 'kits', [event.kitId])
    case 'kit_design_saved':
      return both(grow(profile, 'kit.designs', [event.designId]), (p) => deed(p, '/kits', ctx.date))
    case 'archive_saved':
      return toggle(profile, 'archive.mine', event.entityId, event.on ?? true)
    case 'goal_rebuilt':
      return grow(profile, 'goal.rebuilt', [event.replayId])
    case 'red_thread_completed':
      return grow(profile, 'thread.routes', [event.routeId])
    case 'hate_wall_completed': {
      const token = `${num(event.seed)}:${event.survivorId}`
      const next = grow(profile, 'derby.walls', [token])
      return { ...next, profile: applyLatest(next.profile, 'derby.wall', token, ctx.date) }
    }
    case 'collected': {
      const next = grow(profile, event.set, event.ids)
      return event.gate === undefined ? next : both(next, (p) => deed(p, event.gate as string, ctx.date))
    }
    case 'toggled':
      return toggle(profile, event.set, event.id, event.on)
    case 'retired':
      return grow(profile, tombstoneOf(event.set), event.ids)
    case 'vote_cast':
      // The ballot store keeps the pick and nothing else may (rule 76). The profile does
      // not change: the SEAL is the deed, not each vote.
      return { profile, remote: [], counted: false }
    case 'ballot_sealed': {
      const next = deed(profile, '/polls', ctx.date)
      return { ...next, remote: [...next.remote, { op: 'supporter', record: event.supporter }] }
    }
    case 'shared':
      return { profile: { ...profile, shares: profile.shares + 1 }, remote: [], counted: true }
    case 'duel_taken': {
      const next = applyDuel(profile, event.gate, event.seed)
      return {
        profile: next.profile,
        counted: next.counted,
        remote:
          next.counted && next.token !== null ? [{ op: 'collect', set: 'duel.seeds', ids: [next.token] }] : [],
      }
    }
    case 'card_edited':
      return { profile, remote: [{ op: 'card' }], counted: true }
  }
}

/* ------------------------------------------------------------------------- analytics */

/**
 * The GA event for a progress event: its name and ONLY the parameters listed here. The
 * lists are closed on purpose — a field added to an event later does not reach analytics
 * until somebody decides, here, that it should. `safeParams` then drops anything that is
 * not an id or an integer anyway.
 */
export function gaEvent(event: ProgressEvent): { name: string; params: Record<string, unknown> } {
  switch (event.type) {
    case 'gate_completed':
      return {
        name: 'gate_completed',
        params: {
          gate: wallNumber(event.gate),
          variant: cleanVariant(event.variant) ?? undefined,
          score: num(event.score),
          correct: num(event.correct),
          asked: num(event.asked),
        },
      }
    case 'deed':
      return { name: 'gate_deed', params: { gate: wallNumber(event.gate) } }
    case 'kit_unlocked':
      return { name: 'kit_unlocked', params: { kit: event.kitId } }
    case 'kit_design_saved':
      return { name: 'kit_design_saved', params: { design: event.designId } }
    case 'archive_saved':
      return { name: 'archive_item_saved', params: { entity: event.entityId, on: event.on ?? true } }
    case 'goal_rebuilt':
      return { name: 'goal_rebuilt', params: { replay: event.replayId, score: num(event.score) } }
    case 'red_thread_completed':
      return { name: 'red_thread_completed', params: { route: event.routeId } }
    case 'hate_wall_completed':
      return { name: 'hate_wall_completed', params: { seed: num(event.seed) } }
    case 'collected':
      return { name: 'collected', params: { set: event.set, n: event.ids.length } }
    case 'toggled':
      return { name: 'toggled', params: { set: event.set } }
    case 'retired':
      return { name: 'retired', params: { set: event.set, n: event.ids.length } }
    case 'vote_cast':
      return { name: 'vote_cast', params: { question: event.questionId } }
    case 'ballot_sealed':
      return { name: 'ballot_sealed', params: { reasons: Object.keys(event.supporter.reasons ?? {}).length } }
    case 'shared':
      return { name: 'shared', params: { kind: event.kind, channel: event.channel } }
    case 'duel_taken':
      return { name: 'duel_taken', params: { gate: wallNumber(event.gate) } }
    case 'card_edited':
      return {
        name: 'card_edited',
        params: { fields: Object.values(event.patch).filter((v) => v !== null && v !== undefined).length },
      }
  }
}

/**
 * The events that are MEASURED and never stored (identity spec §3.1). A gate calls
 * `telemetry()` for these; nothing about them lands in the profile or the account.
 */
export const TELEMETRY_EVENTS = [
  'gate_opened',
  'gate_started',
  'gate_restarted',
  'hint_used',
  'reveal_opened',
  'undo_used',
  'trivia_mode_started',
  'trivia_answered',
  'trivia_wrong',
  'trivia_revenged',
  'archive_item_opened',
  'rabbit_hole_used',
  'red_thread_edge_attempted',
  'replay_touch_added',
  'replay_submitted',
  'hate_wall_shared',
] as const
export type TelemetryEvent = (typeof TELEMETRY_EVENTS)[number]

/** Measure, do not store. Ids and integers only, like everything else. */
export function telemetry(name: TelemetryEvent, params: Record<string, string | number | boolean | null | undefined> = {}): void {
  if (!(TELEMETRY_EVENTS as readonly string[]).includes(name)) return
  const gate = typeof params.gate === 'string' ? wallNumber(params.gate) : params.gate
  trackIds(name, { ...params, gate })
}

/* ------------------------------------------------------------------------------ emit */

function mintKey(): string | undefined {
  return globalThis.crypto?.randomUUID?.()
}

/**
 * Report something. Never throws, never waits: the device is written synchronously and
 * the account push runs in the background. Returns what the reducer did, for a screen
 * that wants to know whether the plate moved.
 */
export function emit(event: ProgressEvent): Applied {
  const date = today()
  let applied: Applied = { profile: emptyProfile(), remote: [], counted: false }
  try {
    const key = event.type === 'gate_completed' && event.key === undefined ? mintKey() : undefined
    updateProfile((profile) => {
      applied = applyEvent(profile, event, { date, key })
      return applied.profile
    })
    if (event.type === 'card_edited') saveCard(event.patch)
    if (event.type === 'ballot_sealed') saveSupporter(event.supporter)
    void pushRemote(applied.remote)
    const ga = gaEvent(event)
    trackIds(ga.name, ga.params)
    meterProgress(event) // delta 89: first-party measurement (lib/analytics)
  } catch {
    // the progress layer is never the reason a result screen breaks
  }
  return applied
}

/** Execute the reducer's remote operations, one after another, silently. */
export async function pushRemote(ops: readonly RemoteOp[]): Promise<void> {
  for (const op of ops) {
    try {
      if (op.op === 'run') {
        await recordRunRemote({
          key: op.key,
          gate: op.gate,
          score: op.score,
          correct: op.correct,
          asked: op.asked,
          seed: op.seed,
          playedOn: op.day,
        })
      } else if (op.op === 'collect') {
        await collectRemote(op.set, op.ids)
      } else if (op.op === 'card') {
        await pushCardRemote()
      } else if (op.op === 'supporter') {
        await pushSupporterRemote(op.record)
      }
    } catch {
      // next sync reconciles
    }
  }
}

/* ---------------------------------------------------------------------------- helpers */

/**
 * סימן — a stable fingerprint of what a wing made, for `deed {mark}`.
 *
 * Gate 1 passes `markOf(sheet)`: the same eleven reopened tomorrow has the same mark and
 * is not a deed; one changed man is a new mark and is. Keys are sorted so an object
 * written in a different order is the same sheet. FNV-1a, 32 bits, hex — a fingerprint,
 * not a security boundary.
 */
export function markOf(value: unknown): string {
  const text = stable(value)
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

/**
 * Did this page arrive from somebody's challenge link? `?from=share&seed=N` is what
 * `lib/share/copy.ts challengeUrl` writes. Returns the seed, or null.
 */
export function duelArrival(search: string): number | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  if (params.get('from') !== 'share') return null
  const seed = Number(params.get('seed'))
  return Number.isInteger(seed) && seed > 0 ? seed : null
}
