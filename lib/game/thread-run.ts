/**
 * החוט האדום — the pure half (21.9.2026).
 *
 * Gate 13's rules, move checks, solver and level generator, over an abstract view of the
 * Entity Graph. Nothing here holds data: `lib/game/thread.ts` (server-only) binds it to
 * the graph, and the client imports only the TYPES and `ruleStates` — which read the
 * entity types printed on the cards, never an edge. The same split `timeline.ts` /
 * `timeline-run.ts` already uses.
 *
 * **Every link is a real edge** (brief §23): `checkMove` asks the view whether the last
 * stop and the candidate share a walkable (medium-or-better) edge in the one graph gate
 * 12 also walks. **Time is a level rule, not a law** — `forward` forbids only a move
 * whose span ends before the last one starts, and a place, a team or the terrace
 * (timeless) bridges eras either way.
 */

import {
  OBJECT_TYPES,
  SUPPORTER_TYPES,
  isBackward,
  type ArchiveCard,
  type ConfidenceWord,
  type EntityType,
  type SourceLine,
  type Span,
} from '@/lib/archive/graph-types'

export type RuleType = 'person' | 'object' | 'place' | 'season' | 'match' | 'moment'

export type ThreadRules = {
  /** most intermediate stops allowed */
  maxStops: number
  /** "the shortest route": exactly `maxStops`, which is the optimum */
  exact?: boolean
  /** at least one stop of each */
  mustTypes?: RuleType[]
  /** named stops the route must pass through */
  mustPass?: string[]
  /** pass through the supporter world — a song or the terrace */
  world?: boolean
  noConsecutiveMatches?: boolean
  time: 'free' | 'forward'
}

export type Tier = 1 | 2 | 3 | 4 | 5

export type ThreadLevel = {
  id: string
  tier: Tier
  start: string
  end: string
  /** the cards dealt to the hand, in the order they are shown */
  hand: string[]
  integrity: number
  rules: ThreadRules
}

/** What the engine needs from a graph. The server's is `lib/game/thread.ts threadView()`. */
export interface ThreadView {
  typeOf(id: string): EntityType | null
  spanOf(id: string): Span
  hasEdge(a: string, b: string): boolean
}

export interface ThreadWalk extends ThreadView {
  /** walkable neighbours */
  neighborsOf(id: string): readonly string[]
  degreeOf(id: string): number
}

export const RUN_LENGTH = 5
export const TIER_NAMES: readonly Tier[] = [1, 2, 3, 4, 5]

export function typeMatches(rule: RuleType, type: EntityType | null): boolean {
  if (type === null) return false
  if (rule === 'object') return OBJECT_TYPES.has(type)
  return rule === type
}

/* ------------------------------------------------------------------ rules */

export type RuleKey =
  | { key: 'stops'; n: number; exact: boolean }
  | { key: 'type'; type: RuleType }
  | { key: 'pass'; id: string }
  | { key: 'world' }
  | { key: 'noConsecutive' }
  | { key: 'time'; mode: 'free' | 'forward' }

/**
 * Where each rule stands for a path of intermediate stops. Pure and client-safe: it reads
 * the TYPES of the stops (printed on every card) — never whether two of them connect.
 */
export function ruleStates(
  rules: ThreadRules,
  path: readonly string[],
  typeOf: (id: string) => EntityType | null,
  ends?: { start: string; end: string },
): { rule: RuleKey; met: boolean }[] {
  const types = path.map(typeOf)
  const out: { rule: RuleKey; met: boolean }[] = []
  out.push({
    rule: { key: 'stops', n: rules.maxStops, exact: rules.exact === true },
    met: rules.exact ? path.length === rules.maxStops : path.length <= rules.maxStops,
  })
  for (const type of rules.mustTypes ?? []) out.push({ rule: { key: 'type', type }, met: types.some((t) => typeMatches(type, t)) })
  for (const id of rules.mustPass ?? []) out.push({ rule: { key: 'pass', id }, met: path.includes(id) })
  if (rules.world) out.push({ rule: { key: 'world' }, met: types.some((t) => t !== null && SUPPORTER_TYPES.has(t)) })
  if (rules.noConsecutiveMatches) {
    const full = ends ? [ends.start, ...path] : [...path]
    let clean = true
    for (let i = 1; i < full.length; i += 1) if (typeOf(full[i - 1] as string) === 'match' && typeOf(full[i] as string) === 'match') clean = false
    out.push({ rule: { key: 'noConsecutive' }, met: clean })
  }
  out.push({ rule: { key: 'time', mode: rules.time }, met: true })
  return out
}

/* ------------------------------------------------------------------ moves */

export type MoveVerdict = 'ok' | 'no-edge' | 'backward' | 'consecutive' | 'full' | 'used' | 'not-in-hand'

/** Does this verdict tear the thread? A missing edge, a step back in time, two matches in a row. */
export function costsIntegrity(verdict: MoveVerdict | Extract<CloseVerdict, { ok: false }>['reason']): boolean {
  return verdict === 'no-edge' || verdict === 'backward' || verdict === 'consecutive'
}

export function checkMove(level: ThreadLevel, path: readonly string[], candidate: string, view: ThreadView): MoveVerdict {
  if (!level.hand.includes(candidate)) return 'not-in-hand'
  if (path.includes(candidate) || candidate === level.start || candidate === level.end) return 'used'
  if (path.length >= level.rules.maxStops) return 'full'
  const last = path.length ? (path[path.length - 1] as string) : level.start
  if (!view.hasEdge(last, candidate)) return 'no-edge'
  if (level.rules.time === 'forward' && isBackward(view.spanOf(last), view.spanOf(candidate))) return 'backward'
  if (level.rules.noConsecutiveMatches && view.typeOf(last) === 'match' && view.typeOf(candidate) === 'match') return 'consecutive'
  return 'ok'
}

/** Is a whole path a legal prefix — every step a real edge under the level's rules? */
export function validPrefix(level: ThreadLevel, path: readonly string[], view: ThreadView): boolean {
  for (let i = 0; i < path.length; i += 1) {
    if (checkMove(level, path.slice(0, i), path[i] as string, view) !== 'ok') return false
  }
  return true
}

export type CloseVerdict =
  | { ok: true }
  | { ok: false; reason: 'no-edge' | 'backward' | 'consecutive' | 'missing' | 'stops' | 'invalid' }

export function checkClose(level: ThreadLevel, path: readonly string[], view: ThreadView): CloseVerdict {
  if (!validPrefix(level, path, view)) return { ok: false, reason: 'invalid' }
  const states = ruleStates(level.rules, path, (id) => view.typeOf(id), { start: level.start, end: level.end })
  if (states.some((s) => s.rule.key === 'stops' && !s.met)) return { ok: false, reason: 'stops' }
  if (states.some((s) => !s.met)) return { ok: false, reason: 'missing' }
  const last = path.length ? (path[path.length - 1] as string) : level.start
  if (!view.hasEdge(last, level.end)) return { ok: false, reason: 'no-edge' }
  if (level.rules.time === 'forward' && isBackward(view.spanOf(last), view.spanOf(level.end))) return { ok: false, reason: 'backward' }
  if (level.rules.noConsecutiveMatches && view.typeOf(last) === 'match' && view.typeOf(level.end) === 'match')
    return { ok: false, reason: 'consecutive' }
  return { ok: true }
}

/* ------------------------------------------------------------------ the solver */

/**
 * The shortest legal route through the hand, or null — a constrained search, iterative
 * deepening so the first route found is a shortest one, cards in id order so the answer
 * is deterministic. `exact` is ignored here (the solver finds the optimum; a level with
 * `exact` is valid when the optimum IS its `maxStops`).
 */
export function solve(level: ThreadLevel, view: ThreadView, cap = 7): string[] | null {
  const loose: ThreadLevel = { ...level, rules: { ...level.rules, exact: false } }
  const cards = [...new Set(level.hand)].filter((id) => id !== level.start && id !== level.end).sort()
  const limit = Math.min(level.rules.maxStops, cap)
  for (let depth = 0; depth <= limit; depth += 1) {
    const found = dig(loose, view, cards, [], depth)
    if (found) return found
  }
  return null
}

function dig(level: ThreadLevel, view: ThreadView, cards: readonly string[], path: string[], depth: number): string[] | null {
  if (path.length === depth) return checkClose(level, path, view).ok ? [...path] : null
  const last = path.length ? (path[path.length - 1] as string) : level.start
  for (const card of cards) {
    if (path.includes(card)) continue
    if (!view.hasEdge(last, card)) continue
    const next = [...path, card]
    if (checkMove({ ...level, rules: { ...level.rules, maxStops: depth } }, path, card, view) !== 'ok') continue
    const found = dig(level, view, cards, next, depth)
    if (found) return found
  }
  return null
}

/** Is this level playable as written — a route exists, and a "shortest" level's optimum is its limit? */
export function levelIsSound(level: ThreadLevel, view: ThreadView): { ok: boolean; optimum: number | null } {
  const route = solve(level, view)
  if (!route) return { ok: false, optimum: null }
  if (level.rules.exact && route.length !== level.rules.maxStops) return { ok: false, optimum: route.length }
  return { ok: route.length <= level.rules.maxStops, optimum: route.length }
}

/* ------------------------------------------------------------------ score */

/** A hundred for a closed route, fifteen off per stop beyond the optimum, twenty per integrity left. */
export function routeScore(stops: number, optimum: number, integrityLeft: number): number {
  return Math.max(10, 100 - 15 * Math.max(0, stops - optimum) + 20 * Math.max(0, integrityLeft))
}

/* ------------------------------------------------------------------ the generator */

/** xorshift32 — the same generator shape as `lib/game/archive.ts rng`, kept here so this file imports no data. */
function rngOf(seed: number): () => number {
  let state = seed >>> 0 || 1
  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return ((state >>> 0) % 100000) / 100000
  }
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    const a = out[i] as T
    out[i] = out[j] as T
    out[j] = a
  }
  return out
}

const TIER_SHAPE: Record<Tier, { stops: number; decoys: number; integrity: number }> = {
  1: { stops: 2, decoys: 5, integrity: 4 },
  2: { stops: 3, decoys: 6, integrity: 4 },
  3: { stops: 3, decoys: 7, integrity: 3 },
  4: { stops: 4, decoys: 8, integrity: 3 },
  5: { stops: 3, decoys: 9, integrity: 2 },
}

export const HUB = 60

/**
 * A level from the graph (brief §23 — "generate valid levels from the graph"), seeded:
 * a start from the anchor pool, a shortest route of the tier's length through non-hub
 * stops to an end from the pool, decoys drawn from the route's own neighbourhood (so they
 * look right), then rules read off the route itself — and the solver has the last word.
 */
export function generateLevel(seed: number, tier: Tier, pool: readonly string[], walk: ThreadWalk): ThreadLevel | null {
  const random = rngOf(seed * 2654435761 + tier)
  const shape = TIER_SHAPE[tier]
  const anchors = new Set(pool)
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const start = pool[Math.floor(random() * pool.length)]
    if (!start) continue
    // breadth-first to exactly stops+1 edges, never through a hub
    const parent = new Map<string, string>([[start, '']])
    let frontier = [start]
    for (let d = 0; d <= shape.stops && frontier.length; d += 1) {
      const next: string[] = []
      for (const node of frontier) {
        for (const n of walk.neighborsOf(node)) {
          if (parent.has(n)) continue
          if (walk.degreeOf(n) > HUB && d < shape.stops) continue
          if (walk.typeOf(n) === 'press') continue
          parent.set(n, node)
          next.push(n)
        }
      }
      frontier = next
    }
    const ends = frontier.filter((id) => anchors.has(id) && walk.degreeOf(id) <= HUB).sort()
    if (ends.length === 0) continue
    const end = ends[Math.floor(random() * ends.length)] as string
    const route: string[] = []
    for (let at = parent.get(end) as string; at && at !== start; at = parent.get(at) as string) route.unshift(at)
    if (route.length !== shape.stops) continue

    // decoys: the route's own neighbourhood, never the end, never a hub
    const decoyPool = new Set<string>()
    for (const node of [start, ...route]) {
      for (const n of walk.neighborsOf(node)) {
        if (n === end || n === start || route.includes(n) || walk.degreeOf(n) > HUB || walk.typeOf(n) === 'press') continue
        decoyPool.add(n)
      }
    }
    const decoys = shuffled([...decoyPool].sort(), random).slice(0, shape.decoys)
    const hand = shuffled([...route, ...decoys], random)

    const base: ThreadLevel = { id: `gen-${seed}-${tier}`, tier, start, end, hand, integrity: shape.integrity, rules: { maxStops: shape.stops + 2, time: 'free' } }
    const optimumRoute = solve(base, walk)
    if (!optimumRoute) continue
    const optimum = optimumRoute.length
    const types = optimumRoute.map((id) => walk.typeOf(id))
    const firstType = (['person', 'object', 'place', 'season'] as RuleType[]).find((rule) => types.some((t) => typeMatches(rule, t)))
    const rules: ThreadRules = { maxStops: optimum + 2, time: 'free' }
    if (tier >= 2 && firstType) rules.mustTypes = [firstType]
    if (tier >= 3) {
      rules.maxStops = optimum + 1
      rules.time = 'forward'
    }
    if (tier >= 4) rules.noConsecutiveMatches = true
    if (tier === 5) {
      rules.maxStops = optimum
      rules.exact = true
    }
    let level: ThreadLevel = { ...base, rules }
    let sound = levelIsSound(level, walk)
    if (!sound.ok && rules.time === 'forward') {
      level = { ...level, rules: { ...rules, time: 'free' } }
      sound = levelIsSound(level, walk)
    }
    if (!sound.ok && rules.noConsecutiveMatches) {
      level = { ...level, rules: { ...level.rules, noConsecutiveMatches: false } }
      sound = levelIsSound(level, walk)
    }
    if (!sound.ok || sound.optimum === null) continue
    if (level.rules.exact) level = { ...level, rules: { ...level.rules, maxStops: sound.optimum } }
    return level
  }
  return null
}

/** The tier of the k-th level of a run: 1 → 5, then the run starts over at 1. */
export function tierOf(index: number): Tier {
  return ((((index % RUN_LENGTH) + RUN_LENGTH) % RUN_LENGTH) + 1) as Tier
}

/* ------------------------------------------------------------------ what the client holds */


/** One level as the board receives it: cards and rules, never an edge (rule 4). */
export type PublicLevel = {
  ref: string
  index: number
  total: number
  tier: Tier
  start: ArchiveCard
  end: ArchiveCard
  hand: ArchiveCard[]
  integrity: number
  rules: ThreadRules
  /** names for the `mustPass` rule's cards */
  passNames: Record<string, string>
}

export type LinkResult =
  | { ok: true; labelKey: string; params: Record<string, number> | null; confidence: ConfidenceWord; sources: SourceLine[] }
  | { ok: false; reason: MoveVerdict | 'invalid' }

export type ClosedEdge = { from: ArchiveCard; to: ArchiveCard; labelKey: string; params: Record<string, number> | null; sources: SourceLine[] }

export type CloseResult =
  | { ok: true; edges: ClosedEdge[]; stops: number; optimum: number; score: number; routeId: string }
  | { ok: false; reason: 'no-edge' | 'backward' | 'consecutive' | 'missing' | 'stops' | 'invalid' }
