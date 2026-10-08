/**
 * Gate 13 · Thread — the graph game, generic for every club (rulebook §15.2, TH-R01..R12).
 *
 * Pure and client-safe: no data, no `server-only`, no node APIs. The server binds it to a club's graph
 * (`thread-data.ts`); the browser only ever receives a `PublicLevel` — cards and rules, never an edge, never the
 * optimum route (TH-R11).
 *
 * One constraint checker (`checkMove` / `checkClose`) is used by BOTH the grader and the solver, so the two cannot
 * disagree about what a legal route is (TH-R05, acceptance: "the solver and grader agree on every published level").
 */

/* ------------------------------------------------------------------ graph */

export const NODE_TYPES = ['person', 'team', 'place', 'season', 'match', 'moment', 'object'] as const
export type NodeType = (typeof NODE_TYPES)[number]

export type ThreadNode = {
  id: string
  name: string
  type: NodeType
  /** first / last year the node is anchored to; null = timeless (a place, a club) */
  from?: number | null
  to?: number | null
  /** other ids that name the same node — they can never be a second copy of it (TH-R02) */
  aliases?: string[]
}

export type ThreadEdge = {
  a: string
  b: string
  /** the typed relation: "played for", "scored in", "managed" … editorial association is not a kind */
  kind: string
  sources: string[]
  confidence: 0 | 1 | 2 | 3
  status: 'approved' | 'review' | 'draft' | 'rejected' | 'deep_research'
}

export type ThreadGraph = { nodes: ThreadNode[]; edges: ThreadEdge[] }

/** TH-R01 — an edge is usable only when it is typed, approved, evidenced and at least medium confidence. */
export const MIN_EDGE_CONFIDENCE = 2

export type EdgeRejection = 'UNTYPED' | 'NOT_APPROVED' | 'NO_SOURCE' | 'LOW_CONFIDENCE' | 'UNKNOWN_NODE' | 'SELF_LOOP'

export function edgeRejection(edge: ThreadEdge, known: (id: string) => boolean): EdgeRejection | null {
  if (typeof edge.kind !== 'string' || edge.kind.trim() === '') return 'UNTYPED'
  if (edge.status !== 'approved') return 'NOT_APPROVED'
  if (!Array.isArray(edge.sources) || edge.sources.filter((s) => typeof s === 'string' && s.trim() !== '').length === 0) return 'NO_SOURCE'
  if (!(edge.confidence >= MIN_EDGE_CONFIDENCE)) return 'LOW_CONFIDENCE'
  if (!known(edge.a) || !known(edge.b)) return 'UNKNOWN_NODE'
  if (edge.a === edge.b) return 'SELF_LOOP'
  return null
}

export interface ThreadView {
  nodeOf(id: string): ThreadNode | null
  /** the canonical id for an id or an alias, or null */
  canon(id: string): string | null
  /** the best legal edge between two canonical ids, or null */
  edgeOf(a: string, b: string): ThreadEdge | null
  neighborsOf(id: string): readonly string[]
  degreeOf(id: string): number
  /** every nodes the view knows, sorted by id */
  ids(): readonly string[]
  readonly rejected: readonly { edge: ThreadEdge; reason: EdgeRejection }[]
}

/** Canonicalise aliases, drop every edge that is not legal, and index what is left. */
export function buildView(graph: ThreadGraph): ThreadView {
  const nodes = new Map<string, ThreadNode>()
  const alias = new Map<string, string>()
  for (const node of graph.nodes) {
    if (!node || typeof node.id !== 'string' || node.id === '' || nodes.has(node.id) || alias.has(node.id)) continue
    nodes.set(node.id, node)
  }
  for (const node of nodes.values()) {
    for (const other of node.aliases ?? []) {
      if (!nodes.has(other) && !alias.has(other)) alias.set(other, node.id)
    }
  }
  const canon = (id: string): string | null => (nodes.has(id) ? id : (alias.get(id) ?? null))
  const best = new Map<string, ThreadEdge>()
  const adjacent = new Map<string, Set<string>>()
  const rejected: { edge: ThreadEdge; reason: EdgeRejection }[] = []
  for (const edge of graph.edges) {
    const a = canon(edge.a)
    const b = canon(edge.b)
    const reason = edgeRejection({ ...edge, a: a ?? '', b: b ?? '' }, (id) => id !== '')
    if (reason || a === null || b === null) {
      rejected.push({ edge, reason: reason ?? 'UNKNOWN_NODE' })
      continue
    }
    const key = a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`
    const held = best.get(key)
    if (!held || edge.confidence > held.confidence) best.set(key, { ...edge, a, b })
    if (!adjacent.has(a)) adjacent.set(a, new Set())
    if (!adjacent.has(b)) adjacent.set(b, new Set())
    adjacent.get(a)?.add(b)
    adjacent.get(b)?.add(a)
  }
  const sortedIds = [...nodes.keys()].sort()
  return {
    nodeOf: (id) => {
      const c = canon(id)
      return c ? (nodes.get(c) ?? null) : null
    },
    canon,
    edgeOf: (x, y) => {
      const a = canon(x)
      const b = canon(y)
      if (!a || !b) return null
      return best.get(a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`) ?? null
    },
    neighborsOf: (id) => [...(adjacent.get(canon(id) ?? '') ?? [])].sort(),
    degreeOf: (id) => adjacent.get(canon(id) ?? '')?.size ?? 0,
    ids: () => sortedIds,
    rejected,
  }
}

/* ------------------------------------------------------------------ rules */

export type Tier = 1 | 2 | 3 | 4 | 5
export const TIERS: readonly Tier[] = [1, 2, 3, 4, 5]

export type ThreadRules = {
  /** most intermediate stops allowed */
  maxStops: number
  /** tier 5: exactly `maxStops`, which is the proven optimum */
  exact?: boolean
  /** at least one stop of each type */
  mustTypes?: NodeType[]
  /** named stops the route must pass through */
  mustPass?: string[]
  time: 'free' | 'forward'
  noConsecutiveMatches?: boolean
}

export type ThreadLevel = {
  id: string
  tier: Tier
  start: string
  end: string
  /** the cards dealt to the hand, canonical and distinct, in the order shown */
  hand: readonly string[]
  integrity: number
  rules: Readonly<ThreadRules>
}

/**
 * TH-R04 — a move is backward when the destination's span ENDS before the source's span STARTS. Overlap is allowed;
 * a timeless node (no years) never counts as backward by itself.
 */
export function isBackward(from: ThreadNode | null, to: ThreadNode | null): boolean {
  if (!from || !to) return false
  if (typeof from.from !== 'number' || typeof to.to !== 'number') return false
  return to.to < from.from
}

export type MoveVerdict = 'ok' | 'no-edge' | 'backward' | 'consecutive' | 'full' | 'used' | 'not-in-hand'

/** A move that tears the thread costs integrity; an offered-but-illegal UI action does not (TH-R07). */
export function costsIntegrity(verdict: MoveVerdict | CloseReason): boolean {
  return verdict === 'no-edge' || verdict === 'backward' || verdict === 'consecutive'
}

/** the last stop on the route that carries a date — the one a forward move is measured against (TH-R04) */
function lastDated(level: ThreadLevel, path: readonly string[], view: ThreadView): ThreadNode | null {
  for (let at = path.length - 1; at >= -1; at -= 1) {
    const node = view.nodeOf(at < 0 ? level.start : (path[at] as string))
    if (node && typeof node.from === 'number') return node
  }
  return null
}

export function checkMove(level: ThreadLevel, path: readonly string[], candidate: string, view: ThreadView): MoveVerdict {
  const card = view.canon(candidate)
  if (card === null || !level.hand.includes(card)) return 'not-in-hand'
  if (path.some((id) => view.canon(id) === card) || card === view.canon(level.start) || card === view.canon(level.end)) return 'used'
  if (path.length >= level.rules.maxStops) return 'full'
  const last = path.length ? (path[path.length - 1] as string) : level.start
  if (!view.edgeOf(last, card)) return 'no-edge'
  if (level.rules.time === 'forward' && isBackward(lastDated(level, path, view), view.nodeOf(card))) return 'backward'
  if (level.rules.noConsecutiveMatches && view.nodeOf(last)?.type === 'match' && view.nodeOf(card)?.type === 'match') return 'consecutive'
  return 'ok'
}

/** Is the whole path a legal prefix — every step a real edge under the level's rules? */
export function validPrefix(level: ThreadLevel, path: readonly string[], view: ThreadView): boolean {
  for (let at = 0; at < path.length; at += 1) {
    if (checkMove(level, path.slice(0, at), path[at] as string, view) !== 'ok') return false
  }
  return true
}

export type RuleKey =
  | { key: 'stops'; n: number; exact: boolean }
  | { key: 'type'; type: NodeType }
  | { key: 'pass'; id: string }
  | { key: 'time'; mode: 'free' | 'forward' }
  | { key: 'noConsecutive' }

/** Where each rule stands for a path. Reads only node TYPES — printed on every card — never an edge. */
export function ruleStates(rules: ThreadRules, path: readonly string[], typeOf: (id: string) => NodeType | null, ends?: { start: string; end: string }): { rule: RuleKey; met: boolean }[] {
  const types = path.map(typeOf)
  const out: { rule: RuleKey; met: boolean }[] = []
  out.push({ rule: { key: 'stops', n: rules.maxStops, exact: rules.exact === true }, met: rules.exact ? path.length === rules.maxStops : path.length <= rules.maxStops })
  for (const type of rules.mustTypes ?? []) out.push({ rule: { key: 'type', type }, met: types.includes(type) })
  for (const id of rules.mustPass ?? []) out.push({ rule: { key: 'pass', id }, met: path.includes(id) })
  if (rules.noConsecutiveMatches) {
    const full = ends ? [ends.start, ...path, ends.end] : [...path]
    let clean = true
    for (let at = 1; at < full.length; at += 1) if (typeOf(full[at - 1] as string) === 'match' && typeOf(full[at] as string) === 'match') clean = false
    out.push({ rule: { key: 'noConsecutive' }, met: clean })
  }
  out.push({ rule: { key: 'time', mode: rules.time }, met: true })
  return out
}

export type CloseReason = 'invalid' | 'stops' | 'missing' | 'no-edge' | 'backward' | 'consecutive'
export type CloseVerdict = { ok: true } | { ok: false; reason: CloseReason }

/** TH-R03 / TH-R08 — the complete route, the last edge to the destination, and every required rule. */
export function checkClose(level: ThreadLevel, path: readonly string[], view: ThreadView): CloseVerdict {
  if (!validPrefix(level, path, view)) return { ok: false, reason: 'invalid' }
  const states = ruleStates(level.rules, path, (id) => view.nodeOf(id)?.type ?? null, { start: level.start, end: level.end })
  if (states.some((s) => s.rule.key === 'stops' && !s.met)) return { ok: false, reason: 'stops' }
  const last = path.length ? (path[path.length - 1] as string) : level.start
  if (!view.edgeOf(last, level.end)) return { ok: false, reason: 'no-edge' }
  if (level.rules.time === 'forward' && isBackward(lastDated(level, path, view), view.nodeOf(level.end))) return { ok: false, reason: 'backward' }
  if (level.rules.noConsecutiveMatches && view.nodeOf(last)?.type === 'match' && view.nodeOf(level.end)?.type === 'match') return { ok: false, reason: 'consecutive' }
  if (states.some((s) => !s.met)) return { ok: false, reason: 'missing' }
  return { ok: true }
}

/* ------------------------------------------------------------------ solver */

export const SOLVER_BUDGET = 60000
export const SOLVER_MAX_STOPS = 6

export type Solved = { status: 'solved'; route: string[]; optimum: number } | { status: 'none' } | { status: 'budget' }

/**
 * The shortest legal route THROUGH THE DEALT HAND, found with the same `checkMove`/`checkClose` the grader runs
 * (TH-R05). Iterative deepening, so the first route found is a shortest one; hand cards in id order, so the answer
 * is deterministic; node-bounded, so a pathological graph cannot hang a request. `exact` is relaxed here — the solver
 * finds the optimum and an exact level is valid when its `maxStops` equals it.
 */
export function solve(level: ThreadLevel, view: ThreadView, budget = SOLVER_BUDGET): Solved {
  const loose: ThreadLevel = { ...level, rules: { ...level.rules, exact: false } }
  const cards = [...new Set(level.hand)].sort()
  const limit = Math.min(level.rules.maxStops, SOLVER_MAX_STOPS)
  let spent = 0
  const dig = (path: string[], depth: number): string[] | 'budget' | null => {
    spent += 1
    if (spent > budget) return 'budget'
    if (path.length === depth) return checkClose({ ...loose, rules: { ...loose.rules, maxStops: Math.max(depth, loose.rules.maxStops) } }, path, view).ok ? [...path] : null
    for (const card of cards) {
      if (checkMove(loose, path, card, view) !== 'ok') continue
      const found = dig([...path, card], depth)
      if (found) return found
    }
    return null
  }
  for (let depth = 0; depth <= limit; depth += 1) {
    const found = dig([], depth)
    if (found === 'budget') return { status: 'budget' }
    if (found) return { status: 'solved', route: found, optimum: found.length }
  }
  return { status: 'none' }
}

/** A level is sound when the solver proves a route in the dealt hand and an `exact` level's limit IS the optimum. */
export function levelIsSound(level: ThreadLevel, view: ThreadView): { ok: boolean; optimum: number | null; route: string[] | null } {
  const solved = solve(level, view)
  if (solved.status !== 'solved') return { ok: false, optimum: null, route: null }
  if (level.rules.exact && solved.optimum !== level.rules.maxStops) return { ok: false, optimum: solved.optimum, route: solved.route }
  return { ok: solved.optimum <= level.rules.maxStops, optimum: solved.optimum, route: solved.route }
}

/* ------------------------------------------------------------------ score + integrity */

/** TH-R09 — for a CLOSED route only. */
export function routeScore(stops: number, optimum: number, integrityLeft: number): number {
  return Math.max(10, 100 - 15 * Math.max(0, stops - optimum) + 20 * Math.max(0, integrityLeft))
}

/**
 * TH-R07 — a tear costs one integrity, ONCE per (path, card): the same refused attempt sent again (a network retry,
 * a double tap, a replayed log) is the same attempt and charges nothing more. Integrity can never go below zero.
 */
export type Ledger = { integrity: number; seen: string[] }

export function newLedger(level: ThreadLevel): Ledger {
  return { integrity: level.integrity, seen: [] }
}

export function charge(ledger: Ledger, path: readonly string[], card: string, verdict: MoveVerdict | CloseReason): Ledger {
  if (!costsIntegrity(verdict)) return ledger
  const key = `${path.join('>')}|${card}|${verdict}`
  if (ledger.seen.includes(key)) return ledger
  return { integrity: Math.max(0, ledger.integrity - 1), seen: [...ledger.seen, key] }
}

export const exhausted = (ledger: Ledger): boolean => ledger.integrity <= 0

/* ------------------------------------------------------------------ the generator */

/** xorshift32 — a seeded stream so a level is the same for everyone with the same seed. */
export function rngOf(seed: number): () => number {
  let state = (Math.imul(seed >>> 0 || 1, 2654435761) ^ 0x9e3779b9) >>> 0 || 1
  return () => {
    state ^= state << 13
    state >>>= 0
    state ^= state >>> 17
    state ^= state << 5
    state >>>= 0
    return (state % 1000003) / 1000003
  }
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    const held = out[i] as T
    out[i] = out[j] as T
    out[j] = held
  }
  return out
}

/** §15.2 table — route-stop shape, decoys, integrity per tier. */
export const TIER_SHAPE: Record<Tier, { stops: number; decoys: number; integrity: number }> = {
  1: { stops: 2, decoys: 5, integrity: 4 },
  2: { stops: 3, decoys: 6, integrity: 4 },
  3: { stops: 3, decoys: 7, integrity: 3 },
  4: { stops: 4, decoys: 8, integrity: 3 },
  5: { stops: 3, decoys: 9, integrity: 2 },
}

/** TH-R06 — a node with more neighbours than this is a hub: it connects everything, so it is no puzzle. */
export const HUB_DEGREE = 60

export type Generated = {
  level: ThreadLevel
  optimum: number
  /** the solver's witness — server-side only, never in a PublicLevel */
  witness: string[]
  quality: { decoys: number; target: number; warning: 'DECOYS_SHORT' | null }
}

/** The rule set a tier ANNOUNCES, built from a witness route so the route itself satisfies it. */
export function rulesForTier(tier: Tier, optimum: number, witnessTypes: readonly (NodeType | null)[]): ThreadRules {
  const base: ThreadRules = { maxStops: optimum + 2, time: 'free' }
  if (tier >= 2) {
    const type = (['person', 'season', 'place', 'moment', 'object', 'team', 'match'] as NodeType[]).find((t) => witnessTypes.includes(t))
    if (type) base.mustTypes = [type]
  }
  if (tier >= 3) {
    base.maxStops = optimum + 1
    base.time = 'forward'
  }
  if (tier >= 4) base.noConsecutiveMatches = true
  if (tier === 5) {
    base.maxStops = optimum
    base.exact = true
  }
  return base
}

/** A rule set can only be called a tier when it carries what that tier announces. */
export function tierHonest(tier: Tier, rules: ThreadRules): boolean {
  if (tier >= 2 && !(rules.mustTypes && rules.mustTypes.length > 0)) return false
  if (tier >= 3 && rules.time !== 'forward') return false
  if (tier >= 4 && !rules.noConsecutiveMatches) return false
  if (tier === 5 && !rules.exact) return false
  return true
}

/**
 * Try to generate one level of exactly this tier. A walk of `shape.stops` intermediate stops from a start to an end
 * through non-hub nodes, decoys from the route's own neighbourhood, rules read off the route, and the solver has the
 * last word. If the announced rules cannot be met this attempt is dropped — never relaxed (§15.2).
 */
export function generateLevel(view: ThreadView, tier: Tier, seed: number, attempts = 120): Generated | null {
  const random = rngOf(seed * 7919 + tier * 104729)
  const shape = TIER_SHAPE[tier]
  const pool = view.ids().filter((id) => view.degreeOf(id) > 0 && view.degreeOf(id) <= HUB_DEGREE)
  if (pool.length === 0) return null
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const start = pool[Math.floor(random() * pool.length)] as string
    // a random simple walk of stops+1 edges, never through a hub
    const walk: string[] = [start]
    let ok = true
    for (let step = 0; step <= shape.stops && ok; step += 1) {
      const last = walk[walk.length - 1] as string
      const options = view.neighborsOf(last).filter((n) => !walk.includes(n) && view.degreeOf(n) <= HUB_DEGREE)
      if (options.length === 0) {
        ok = false
        break
      }
      walk.push(options[Math.floor(random() * options.length)] as string)
    }
    if (!ok || walk.length !== shape.stops + 2) continue
    const end = walk[walk.length - 1] as string
    const route = walk.slice(1, -1)
    if (view.edgeOf(start, end)) continue // a direct edge would make zero stops the optimum
    const decoyPool = new Set<string>()
    for (const node of [start, ...route]) {
      for (const n of view.neighborsOf(node)) {
        if (n === start || n === end || route.includes(n) || view.degreeOf(n) > HUB_DEGREE) continue
        decoyPool.add(n)
      }
    }
    const decoys = shuffled([...decoyPool].sort(), random).slice(0, shape.decoys)
    const hand = shuffled([...route, ...decoys], random)
    const witnessTypes = route.map((id) => view.nodeOf(id)?.type ?? null)
    const probe: ThreadLevel = { id: '', tier, start, end, hand, integrity: shape.integrity, rules: { maxStops: shape.stops + 2, time: 'free' } }
    const first = solve(probe, view)
    if (first.status !== 'solved') continue
    const rules = rulesForTier(tier, first.optimum, witnessTypes)
    const level: ThreadLevel = { ...probe, id: `th-${seed}-${tier}`, rules }
    if (!tierHonest(tier, rules)) continue
    const sound = levelIsSound(level, view)
    if (!sound.ok || sound.optimum === null || sound.route === null) continue
    // a tier-5 level is only exact when its (re-solved) optimum is its limit
    const finalLevel: ThreadLevel = level.rules.exact ? { ...level, rules: { ...level.rules, maxStops: sound.optimum } } : level
    const again = levelIsSound(finalLevel, view)
    if (!again.ok || again.route === null || again.optimum === null) continue
    return {
      level: finalLevel,
      optimum: again.optimum,
      witness: again.route,
      quality: { decoys: decoys.length, target: shape.decoys, warning: decoys.length < shape.decoys ? 'DECOYS_SHORT' : null },
    }
  }
  return null
}

export type ThreadPlan = {
  /** levels in tier order — a tier that could not be generated honestly is simply absent */
  levels: Generated[]
  missingTiers: Tier[]
  /** practice: at least one sound level; full: all five tiers (TH-R12) */
  mode: 'locked' | 'practice' | 'full'
  blocker: 'THREAD_NO_VALID_LEVEL' | null
  /** graph facts for the admin / the honest locked screen */
  counts: { nodes: number; edges: number; rejectedEdges: number }
}

export function planThread(view: ThreadView, graph: ThreadGraph, seed: number): ThreadPlan {
  const levels: Generated[] = []
  const missing: Tier[] = []
  for (const tier of TIERS) {
    const made = generateLevel(view, tier, seed)
    if (made) levels.push(made)
    else missing.push(tier)
  }
  return {
    levels,
    missingTiers: missing,
    mode: levels.length === 0 ? 'locked' : missing.length === 0 ? 'full' : 'practice',
    blocker: levels.length === 0 ? 'THREAD_NO_VALID_LEVEL' : null,
    counts: { nodes: view.ids().length, edges: graph.edges.length - view.rejected.length, rejectedEdges: view.rejected.length },
  }
}

/* ------------------------------------------------------------------ the public payload (TH-R11) */

export type PublicCard = { id: string; name: string; type: NodeType; years: string | null }

/** One level as the browser receives it: cards and rules. No edge, no optimum, no route. */
export type PublicLevel = {
  ref: string
  tier: Tier
  index: number
  total: number
  start: PublicCard
  end: PublicCard
  hand: PublicCard[]
  integrity: number
  rules: ThreadRules
  /** names for the must-pass rule's cards */
  passNames: Record<string, string>
}

export function yearsOf(node: ThreadNode): string | null {
  const a = typeof node.from === 'number' ? node.from : null
  const b = typeof node.to === 'number' ? node.to : null
  if (a === null && b === null) return null
  if (a !== null && b !== null) return a === b ? String(a) : `${a}–${b}`
  return String(a ?? b)
}

export function cardOf(view: ThreadView, id: string): PublicCard | null {
  const node = view.nodeOf(id)
  return node ? { id: node.id, name: node.name, type: node.type, years: yearsOf(node) } : null
}

export function publicLevel(level: ThreadLevel, view: ThreadView, ref: string, index: number, total: number): PublicLevel | null {
  const start = cardOf(view, level.start)
  const end = cardOf(view, level.end)
  if (!start || !end) return null
  const hand = level.hand.map((id) => cardOf(view, id)).filter((c): c is PublicCard => c !== null)
  const passNames: Record<string, string> = {}
  for (const id of level.rules.mustPass ?? []) passNames[id] = view.nodeOf(id)?.name ?? id
  return { ref, tier: level.tier, index, total, start, end, hand, integrity: level.integrity, rules: { ...level.rules }, passNames }
}

/* ------------------------------------------------------------------ grading + reveal */

export type ClosedEdge = { from: PublicCard; to: PublicCard; kind: string; sources: string[]; confidence: number }

export function edgesOf(level: ThreadLevel, path: readonly string[], view: ThreadView): ClosedEdge[] | null {
  const chain = [level.start, ...path, level.end]
  const out: ClosedEdge[] = []
  for (let at = 1; at < chain.length; at += 1) {
    const edge = view.edgeOf(chain[at - 1] as string, chain[at] as string)
    const from = cardOf(view, chain[at - 1] as string)
    const to = cardOf(view, chain[at] as string)
    if (!edge || !from || !to) return null
    out.push({ from, to, kind: edge.kind, sources: edge.sources, confidence: edge.confidence })
  }
  return out
}

export type MoveResult = { ok: true; edge: { kind: string; sources: string[] } } | { ok: false; reason: MoveVerdict }

/** The server's answer to one proposed stop. The edge is revealed only for a legal move. */
export function tryMove(level: ThreadLevel, path: readonly string[], candidate: string, view: ThreadView): MoveResult {
  const verdict = checkMove(level, path, candidate, view)
  if (verdict !== 'ok') return { ok: false, reason: verdict }
  const last = path.length ? (path[path.length - 1] as string) : level.start
  const edge = view.edgeOf(last, candidate) as ThreadEdge
  return { ok: true, edge: { kind: edge.kind, sources: edge.sources } }
}

export type CloseResult =
  | { ok: true; edges: ClosedEdge[]; stops: number; optimum: number; score: number }
  | { ok: false; reason: CloseReason }

export function closeRoute(level: ThreadLevel, path: readonly string[], integrityLeft: number, view: ThreadView, optimum: number): CloseResult {
  const verdict = checkClose(level, path, view)
  if (!verdict.ok) return verdict
  const edges = edgesOf(level, path, view)
  if (!edges) return { ok: false, reason: 'invalid' }
  return { ok: true, edges, stops: path.length, optimum, score: routeScore(path.length, optimum, integrityLeft) }
}

/** TH-R10 — at zero integrity the level fails and the valid route is shown with its sources. */
export function failReveal(level: ThreadLevel, view: ThreadView): { route: PublicCard[]; edges: ClosedEdge[]; optimum: number } | null {
  const solved = solve(level, view)
  if (solved.status !== 'solved') return null
  const edges = edgesOf(level, solved.route, view)
  if (!edges) return null
  const route = [level.start, ...solved.route, level.end].map((id) => cardOf(view, id)).filter((c): c is PublicCard => c !== null)
  return { route, edges, optimum: solved.optimum }
}

/**
 * Settle a level from the ACTIONS the player took (TH-R07): every logged move is re-checked here, so a retried action
 * charges once and a fabricated "clean" log is exactly as strong as the client is honest — the ranked run contract
 * (§17.4) is the authoritative store for that, and is not wired for clubs yet.
 */
export type Action = { path: string[]; card: string }

export function settle(level: ThreadLevel, attempts: readonly Action[], finalPath: readonly string[], view: ThreadView): { integrity: number; closed: boolean } {
  let ledger = newLedger(level)
  for (const a of attempts) ledger = charge(ledger, a.path, a.card, checkMove(level, a.path, a.card, view))
  return { integrity: ledger.integrity, closed: !exhausted(ledger) && checkClose(level, finalPath, view).ok }
}
