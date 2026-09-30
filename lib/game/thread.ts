import 'server-only'

import levelsFile from '@/content/manual/red-thread-levels.json'
import { cardOf, edgeBetween, entity, graph, neighbors, sourceOf } from '@/lib/archive/graph'
import { labelFrom, type SourceLine } from '@/lib/archive/graph-types'
import { publicId } from '@/lib/game/publicId'
import {
  HUB,
  RUN_LENGTH,
  checkClose,
  checkMove,
  generateLevel,
  routeScore,
  solve,
  tierOf,
  validPrefix,
  type CloseResult,
  type LinkResult,
  type PublicLevel,
  type ThreadLevel,
  type ThreadWalk,
  type Tier,
} from './thread-run'

/**
 * החוט האדום — the server half (21.9.2026).
 *
 * Gate 13 plays on the Entity Graph gate 12 walks (brief §6, §23): the same ids, the same
 * edges, the same label keys. The board is dealt CARDS and RULES — never an edge — and
 * every link is asked here (`tryLink`, rule 4 — the same shape as `submitInsert`), so the
 * adjacency that IS the answer never reaches a browser.
 *
 * Levels: the curated ones first (`content/manual/red-thread-levels.json`, each proved
 * solvable by `tests/thread.test.ts`), then levels generated from the graph by seed —
 * `gen-<seed>-<tier>` regenerates identically on every call, so a ref is all a URL or a
 * grade needs to carry.
 */

type CuratedFile = { records: ThreadLevel[] }

export function curatedLevels(): readonly ThreadLevel[] {
  return (levelsFile as unknown as CuratedFile).records
}

let walkCache: ThreadWalk | null = null

/** The graph as the engine sees it: types, spans and walkable edges. */
export function threadWalk(): ThreadWalk {
  return (walkCache ??= {
    typeOf: (id) => entity(id)?.type ?? null,
    spanOf: (id) => entity(id)?.span ?? null,
    hasEdge: (a, b) => edgeBetween(a, b) !== null,
    neighborsOf: (id) => neighbors(id).map(({ other }) => other.id),
    // a season is the spine ("the same season"), so it never counts as a hub for the walk
    degreeOf: (id) => {
      const e = entity(id)
      return !e ? 0 : e.type === 'season' ? Math.min(e.degree, HUB) : e.degree
    },
  })
}

let anchorCache: string[] | null = null

/** Where a generated level may start or end: football items with a few real links, never a hub or a column. */
export function anchorPool(): string[] {
  return (anchorCache ??= graph.entities
    .filter(
      (e) =>
        e.sport === 'football' &&
        e.degree >= 2 &&
        e.degree <= HUB &&
        (e.type === 'moment' ||
          e.type === 'trophy' ||
          e.type === 'kit' ||
          e.type === 'object' ||
          e.type === 'song' ||
          (e.type === 'person' && e.degree >= 4) ||
          (e.type === 'match' && e.degree >= 5)),
    )
    .map((e) => e.id)
    .sort())
}

const GEN = /^gen-(\d{1,10})-([1-5])$/

/** A level by its ref — curated `rt-…`, or `gen-<seed>-<tier>` regenerated from the graph. */
export function levelByRef(ref: string): ThreadLevel | null {
  const curated = curatedLevels().find((level) => level.id === ref)
  if (curated) return curated
  const match = GEN.exec(ref)
  if (!match) return null
  const seed = Number(match[1])
  const tier = Number(match[2]) as Tier
  if (!Number.isSafeInteger(seed) || seed > 0xffffffff) return null
  const level = generateLevel(seed, tier, anchorPool(), threadWalk())
  return level && level.id === ref ? level : null
}

/** The five refs of one run: curated levels in order first, then generated ones, tier 1 → 5. */
export function dealThreadRun(seed: number, cursor: number): string[] {
  const curated = curatedLevels()
  const refs: string[] = []
  for (let i = 0; i < RUN_LENGTH; i += 1) {
    const k = cursor * RUN_LENGTH + i
    if (k < curated.length) {
      refs.push((curated[k] as ThreadLevel).id)
      continue
    }
    const tier = tierOf(i)
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const candidate = ((seed >>> 0) + k * 7919 + attempt * 104729) >>> 0
      const level = generateLevel(candidate, tier, anchorPool(), threadWalk())
      if (level && !refs.includes(level.id)) {
        refs.push(level.id)
        break
      }
    }
  }
  return refs
}

/** What the board is dealt: the anchors, the hand as cards, the rules — no adjacency. */
export function publicLevel(ref: string, index: number, total: number): PublicLevel | null {
  const level = levelByRef(ref)
  if (!level) return null
  const start = entity(level.start)
  const end = entity(level.end)
  if (!start || !end) return null
  const hand = level.hand.map((id) => entity(id)).filter((e): e is NonNullable<typeof e> => e !== null)
  return {
    ref: level.id,
    index,
    total,
    tier: level.tier,
    start: cardOf(start),
    end: cardOf(end),
    hand: hand.map(cardOf),
    integrity: level.integrity,
    rules: level.rules,
    passNames: Object.fromEntries((level.rules.mustPass ?? []).map((id) => [id, entity(id)?.titleHe ?? id])),
  }
}

function edgeSources(sourceIds: readonly string[], confidence: SourceLine['confidence']): SourceLine[] {
  return sourceIds
    .map((id) => sourceOf(id))
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .map((s) => ({ id: s.id, title: s.title, url: s.url, kind: s.kind, readOn: s.readOn, confidence }))
}

/**
 * One link, asked of the server: is `candidate` really connected to the last stop, under
 * this level's rules? The path so far is re-checked too — a forged path is `invalid`.
 */
export function tryLink(ref: string, path: readonly string[], candidate: string): LinkResult {
  const level = levelByRef(ref)
  if (!level || path.length > 12) return { ok: false, reason: 'invalid' }
  const view = threadWalk()
  if (!validPrefix(level, path, view)) return { ok: false, reason: 'invalid' }
  const verdict = checkMove(level, path, candidate, view)
  if (verdict !== 'ok') return { ok: false, reason: verdict }
  const last = path.length ? (path[path.length - 1] as string) : level.start
  const edge = edgeBetween(last, candidate)
  if (!edge) return { ok: false, reason: 'no-edge' }
  return {
    ok: true,
    labelKey: labelFrom(edge, last),
    params: edge.params ?? null,
    confidence: edge.confidence,
    sources: edgeSources(edge.sourceIds, edge.confidence),
  }
}

/** Close the route onto the end: every edge re-checked, the rules, the optimum, the score. */
export function closeRoute(ref: string, path: readonly string[], integrityLeft: number): CloseResult {
  const level = levelByRef(ref)
  if (!level || path.length > 12) return { ok: false, reason: 'invalid' }
  const view = threadWalk()
  const verdict = checkClose(level, path, view)
  if (!verdict.ok) return { ok: false, reason: verdict.reason }
  const stops = [level.start, ...path, level.end]
  const edges = []
  for (let i = 1; i < stops.length; i += 1) {
    const a = stops[i - 1] as string
    const b = stops[i] as string
    const edge = edgeBetween(a, b)
    const from = entity(a)
    const to = entity(b)
    if (!edge || !from || !to) return { ok: false, reason: 'invalid' }
    edges.push({ from: cardOf(from), to: cardOf(to), labelKey: labelFrom(edge, a), params: edge.params ?? null, sources: edgeSources(edge.sourceIds, edge.confidence) })
  }
  const optimum = solve(level, view)?.length ?? path.length
  const left = Math.max(0, Math.min(level.integrity, Math.round(integrityLeft)))
  return {
    ok: true,
    edges,
    stops: path.length,
    optimum,
    score: routeScore(path.length, optimum, left),
    routeId: `${level.id}:${publicId(stops.join('>'), 'thread')}`,
  }
}

/**
 * Gate 10: the routes a device has closed (`thread.routes`, ids `<level ref>:<hash>`),
 * as their two anchors — a route is remembered by where it started and where it ended.
 */
export function routeAnchors(routeIds: readonly string[]): { routeId: string; start: ReturnType<typeof cardOf>; end: ReturnType<typeof cardOf> }[] {
  const out = []
  for (const routeId of routeIds) {
    const ref = routeId.slice(0, routeId.lastIndexOf(':'))
    const level = ref ? levelByRef(ref) : null
    const start = level ? entity(level.start) : null
    const end = level ? entity(level.end) : null
    if (start && end) out.push({ routeId, start: cardOf(start), end: cardOf(end) })
  }
  return out
}
