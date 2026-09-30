import 'server-only'

import graphJson from '@/content/generated/entity-graph.json'
import pressFile from '@/content/manual/press-columns.json'
import {
  CONFIDENCE_RANK,
  ENTITY_TYPES,
  OBJECT_TYPES,
  expandGraph,
  labelFrom,
  walkable,
  decadeOf,
  type ArchiveCard,
  type CompactGraphFile,
  type ConfidenceWord,
  type EntityGraphFile,
  type EntityType,
  type GraphEdge,
  type GraphEntity,
  type GraphSource,
} from '@/lib/archive/graph-types'
import { matchById } from '@/lib/archive/match-master'
import { playerById } from '@/lib/archive/player-master'
import { rng, shuffle } from '@/lib/game/archive'
import { fold } from '@/lib/game/roster-search'
import { t, type MessageKey } from '@/lib/i18n'

/**
 * גרף הישויות — the one reader (21.9.2026).
 *
 * `content/generated/entity-graph.json` (`npm run archive:graph`) is imported HERE and
 * nowhere else, and this file is `server-only`: for gate 13 the adjacency is the answer,
 * and for gate 12 it is megabytes a phone never needs. Every function below answers with
 * ids, entities or `ArchiveCard` projections; a component never sees an edge list.
 *
 * Gate 12 reads `entity` · `related` · `rabbitStep` · `beforeAfter` · `today` ·
 * `inSeason` · `search` · `describe`; gate 13 reads `edgeBetween` and `subgraph`
 * (through `lib/game/thread.ts`); gate 10 reads `describe` — which resolves the legacy
 * ids devices already hold (`euro:`, `kit:<maker>:<from>`, `2009/10|home`, a v1 player
 * id, a roster slug) to the entity they name.
 */

export const graph: EntityGraphFile = expandGraph(graphJson as unknown as CompactGraphFile)

const byId = new Map<string, GraphEntity>(graph.entities.map((entity) => [entity.id, entity]))
const aliasOf = new Map<string, string>(Object.entries(graph.aliases))
const edgesOf = new Map<string, GraphEdge[]>()
const pairIndex = new Map<string, GraphEdge>()
for (const edge of graph.edges) {
  edgesOf.set(edge.from, [...(edgesOf.get(edge.from) ?? []), edge])
  edgesOf.set(edge.to, [...(edgesOf.get(edge.to) ?? []), edge])
  // one edge per unordered pair for the walk; the stronger one wins a tie
  for (const key of [`${edge.from}|${edge.to}`, `${edge.to}|${edge.from}`]) {
    const had = pairIndex.get(key)
    if (!had || CONFIDENCE_RANK[edge.confidence] > CONFIDENCE_RANK[had.confidence]) pairIndex.set(key, edge)
  }
}

type PressRow = { slug: string; quoteHe: string | null; bylineHe: string; words: number }
const pressBySlug = new Map<string, PressRow>(
  (pressFile as unknown as { records: PressRow[] }).records.map((row) => [row.slug, row]),
)

/** A node this connected is a hub — Bloomfield, an opponent met 200 times. The walk visits one last. */
export const HUB_DEGREE = 60

/* ------------------------------------------------------------------ lookup */

/** Any id a device, a URL or another gate may hold → the entity id, or null. */
export function resolveId(anyId: string | null | undefined): string | null {
  if (!anyId) return null
  const raw = anyId.trim()
  if (byId.has(raw)) return raw
  const alias = aliasOf.get(raw)
  if (alias && byId.has(alias)) return alias
  return null
}

export function entity(anyId: string | null | undefined): GraphEntity | null {
  const id = resolveId(anyId)
  return id ? (byId.get(id) ?? null) : null
}

export function sourceOf(id: string): (GraphSource & { id: string }) | null {
  const src = graph.sources[id]
  return src ? { id, ...src } : null
}

/* ------------------------------------------------------------------ edges */

export type Neighbor = { edge: GraphEdge; other: GraphEntity; labelKey: string }

/** Every edge touching an entity, read from its side. `low` edges only when asked for. */
export function neighbors(anyId: string, options: { includeLow?: boolean; types?: readonly EntityType[] } = {}): Neighbor[] {
  const id = resolveId(anyId)
  if (!id) return []
  const out: Neighbor[] = []
  for (const edge of edgesOf.get(id) ?? []) {
    if (!options.includeLow && !walkable(edge.confidence)) continue
    const otherId = edge.from === id ? edge.to : edge.from
    const other = byId.get(otherId)
    if (!other) continue
    if (options.types && !options.types.includes(other.type)) continue
    out.push({ edge, other, labelKey: labelFrom(edge, id) })
  }
  return out
}

/** The walkable edge between two entities, or null — gate 13's whole question. */
export function edgeBetween(a: string, b: string): GraphEdge | null {
  const edge = pairIndex.get(`${a}|${b}`)
  return edge && walkable(edge.confidence) ? edge : null
}

/** Counts of connected entities by type — "why it is interesting" is these numbers and nothing else. */
export function countsOf(anyId: string): { type: EntityType; n: number }[] {
  const tally = new Map<EntityType, Set<string>>()
  for (const { other } of neighbors(anyId)) {
    const set = tally.get(other.type) ?? new Set<string>()
    set.add(other.id)
    tally.set(other.type, set)
  }
  return ENTITY_TYPES.filter((type) => tally.has(type)).map((type) => ({ type, n: tally.get(type)?.size ?? 0 }))
}

/* ------------------------------------------------------------------ related */

export type RelatedPick = { entity: GraphEntity; edge: GraphEdge; labelKey: string }
export type RelatedGroupRaw = { type: EntityType; total: number; items: RelatedPick[] }

/**
 * What to continue with — at most `perType` of each type, each with the label of the
 * edge that brought it. Strongest first, then the better-connected, then by id, so the
 * same entity always shows the same related items. Press coincidences (`low`) come last
 * as their own group, labelled as what they are.
 */
export function related(anyId: string, perType = 2): RelatedGroupRaw[] {
  const id = resolveId(anyId)
  if (!id) return []
  const groups = new Map<EntityType, RelatedPick[]>()
  for (const { edge, other, labelKey } of neighbors(id, { includeLow: true })) {
    const list = groups.get(other.type) ?? []
    list.push({ entity: other, edge, labelKey })
    groups.set(other.type, list)
  }
  const out: RelatedGroupRaw[] = []
  for (const type of ENTITY_TYPES) {
    const list = groups.get(type)
    if (!list) continue
    const unique = [...new Map(list.map((pick) => [pick.entity.id, pick])).values()]
    unique.sort(
      (a, b) =>
        CONFIDENCE_RANK[b.edge.confidence] - CONFIDENCE_RANK[a.edge.confidence] ||
        Math.min(b.entity.degree, HUB_DEGREE) - Math.min(a.entity.degree, HUB_DEGREE) ||
        (a.entity.id < b.entity.id ? -1 : 1),
    )
    out.push({ type, total: unique.length, items: unique.slice(0, perType) })
  }
  // walkable groups first, a press-only group last
  return out.sort((a, b) => Number(isLowOnly(a)) - Number(isLowOnly(b)))
}

function isLowOnly(group: RelatedGroupRaw): boolean {
  return group.items.every((pick) => pick.edge.confidence === 'low')
}

/* ------------------------------------------------------------------ the rabbit hole */

function mix(seed: number, depth: number, id: string): number {
  let h = (seed ^ Math.imul(depth + 1, 0x9e3779b1)) >>> 0
  for (let i = 0; i < id.length; i += 1) h = Math.imul(h ^ id.charCodeAt(i), 16777619) >>> 0
  return h
}

/**
 * One deterministic step deeper (spec §2): keyed on (seed, depth) — the same trail
 * always digs the same way — never back to something already on the trail, a type
 * different from the last two, a medium-or-better edge only, and a hub only when nothing
 * else is left. `null` when the item leads nowhere new, and the screen says so.
 */
export function rabbitStep(
  anyId: string,
  options: { seed: number; depth: number; visited?: readonly string[]; lastTypes?: readonly EntityType[] },
): GraphEntity | null {
  const id = resolveId(anyId)
  if (!id) return null
  const visited = new Set([id, ...(options.visited ?? []).map((v) => resolveId(v) ?? v)])
  const avoid = new Set(options.lastTypes ?? [])
  const candidates = neighbors(id).filter(({ other }) => !visited.has(other.id) && other.type !== 'press')
  if (candidates.length === 0) return null
  const rank = ({ other }: Neighbor) =>
    (avoid.has(other.type) ? 2 : 0) + (other.degree > HUB_DEGREE ? 4 : 0) + (other.degree <= 1 ? 1 : 0)
  const best = Math.min(...candidates.map(rank))
  const pool = candidates.filter((candidate) => rank(candidate) === best)
  pool.sort((a, b) => mix(options.seed, options.depth, a.other.id) - mix(options.seed, options.depth, b.other.id) || (a.other.id < b.other.id ? -1 : 1))
  return pool[0]?.other ?? null
}

/* ------------------------------------------------------------------ before and after */

const orderCache = new Map<string, GraphEntity[]>()

/** The chronology an entity sits in: same type, and same kind where the kind is the thing (a variant, a competition, a moment's kind). */
function lineOf(e: GraphEntity): string | null {
  switch (e.type) {
    case 'match':
    case 'press':
    case 'season':
      return e.type
    case 'kit':
      return `kit|${e.kind ?? ''}`
    case 'trophy':
      return `trophy|${e.titleHe}`
    case 'moment':
      return `moment|${e.kind ?? ''}`
    case 'object':
      return e.kind === 'crest' ? 'object|crest' : null
    default:
      return null
  }
}

function startOf(e: GraphEntity): string | null {
  return e.span?.from ?? (e.date?.precision === 'day' ? e.date.value : null)
}

/** The item before and the item after, of the same kind — the archive's own order, nothing written. */
export function beforeAfter(anyId: string): { before: GraphEntity | null; after: GraphEntity | null } {
  const e = entity(anyId)
  const line = e ? lineOf(e) : null
  if (!e || !line || e.sport !== 'football' || !startOf(e)) return { before: null, after: null }
  let list = orderCache.get(line)
  if (!list) {
    list = graph.entities
      .filter((other) => other.sport === 'football' && lineOf(other) === line && startOf(other) !== null)
      .sort((a, b) => ((startOf(a) as string) < (startOf(b) as string) ? -1 : (startOf(a) as string) > (startOf(b) as string) ? 1 : a.id < b.id ? -1 : 1))
    orderCache.set(line, list)
  }
  const at = list.findIndex((other) => other.id === e.id)
  return { before: at > 0 ? (list[at - 1] ?? null) : null, after: at >= 0 ? (list[at + 1] ?? null) : null }
}

/* ------------------------------------------------------------------ today, a season */

/** What the archive holds for this day of the year — matches, columns, moments — newest first. */
export function today(isoDate: string): GraphEntity[] {
  const monthDay = isoDate.slice(5, 10)
  return graph.entities
    .filter((e) => e.sport === 'football' && e.date?.precision === 'day' && e.date.value.slice(5, 10) === monthDay)
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || (a.id < b.id ? -1 : 1))
}

const SEASON_ORDER: EntityType[] = ['trophy', 'moment', 'kit', 'object', 'song', 'person', 'match']

/** Everything the graph ties to one season — the season hub of the time machine. */
export function inSeason(label: string): GraphEntity[] {
  const hub = byId.get(`season:${label}`)
  if (!hub) return []
  const items = neighbors(hub.id).map(({ other }) => other)
  const unique = [...new Map(items.map((e) => [e.id, e])).values()].filter((e) => e.type !== 'season')
  return unique.sort(
    (a, b) =>
      SEASON_ORDER.indexOf(a.type) - SEASON_ORDER.indexOf(b.type) ||
      (startOf(a) ?? '') .localeCompare(startOf(b) ?? '') ||
      (a.id < b.id ? -1 : 1),
  )
}

/** The seasons the archive holds, by decade — the time machine's two rows of chips. */
export function decades(): { decade: number; seasons: string[] }[] {
  const map = new Map<number, string[]>()
  for (const e of graph.entities) {
    if (e.type !== 'season' || e.year === null || e.kind !== 'season') continue
    const decade = decadeOf(e.year) as number
    map.set(decade, [...(map.get(decade) ?? []), e.titleHe])
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([decade, seasons]) => ({ decade, seasons: seasons.sort() }))
}

/* ------------------------------------------------------------------ search */

const TYPE_WORDS: Record<EntityType, string[]> = Object.fromEntries(
  ENTITY_TYPES.map((type) => [type, [t(`graph.type.${type}` as MessageKey), t(`graph.types.${type}` as MessageKey)].map((word) => fold(word).toLowerCase())]),
) as Record<EntityType, string[]>

const haystack = new Map<string, string>()
function textOf(e: GraphEntity): string {
  let text = haystack.get(e.id)
  if (text === undefined) {
    const parts = [e.titleHe, ...e.search, e.seasonLabel ?? '', e.year !== null ? String(e.year) : '']
    for (const key of ['homeHe', 'awayHe', 'competitionHe', 'byline', 'stageHe', 'nameEn'] as const) {
      const value = e.attrs[key]
      if (typeof value === 'string') parts.push(value)
    }
    text = ` ${parts.map((part) => fold(String(part)).toLowerCase()).join(' | ')} `
    haystack.set(e.id, text)
  }
  return text
}

/**
 * One server search over the graph (spec §2 — no second index). Every word must match;
 * a word that names a type ("חולצה", "עונה") narrows to that type. Names match through
 * the Player Master's spellings, which the builder already put in `search`. Ranked:
 * title starts with the query, then a whole-word hit, then the better-connected.
 */
export function search(query: string, options: { types?: readonly EntityType[]; limit?: number } = {}): GraphEntity[] {
  const words = fold(query).toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const typeWords = new Set<EntityType>()
  const terms: string[] = []
  for (const word of words) {
    const type = ENTITY_TYPES.find((candidate) => TYPE_WORDS[candidate].includes(word))
    if (type) typeWords.add(type)
    else terms.push(word)
  }
  const allowed = options.types?.length ? new Set(options.types) : typeWords.size ? typeWords : null
  const phrase = terms.join(' ')
  const scored: { e: GraphEntity; score: number }[] = []
  for (const e of graph.entities) {
    if (allowed && !allowed.has(e.type)) continue
    if (e.sport !== 'football' && !allowed) continue
    const text = textOf(e)
    if (!terms.every((term) => text.includes(term))) continue
    const names = [fold(e.titleHe).toLowerCase(), ...e.search]
    let score = Math.min(e.degree, 40)
    if (phrase && names.includes(phrase)) score += 400
    else if (phrase && names.some((name) => name.startsWith(phrase))) score += 200
    else if (phrase && text.includes(` ${phrase}`)) score += 100
    if (e.type === 'press') score -= 30
    scored.push({ e, score })
  }
  scored.sort((a, b) => b.score - a.score || (a.e.id < b.e.id ? -1 : 1))
  return scored.slice(0, options.limit ?? 24).map((row) => row.e)
}

/* ------------------------------------------------------------------ projections */

function dayLabel(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${Number(d)}.${Number(m)}.${y}`
}

function whenOf(e: GraphEntity): string | null {
  if (e.type === 'person') {
    const from = e.attrs.from
    const to = e.attrs.to
    return typeof from === 'number' ? (typeof to === 'number' && to !== from ? `${from}–${to}` : String(from)) : null
  }
  if (e.type === 'object' && e.kind === 'crest') {
    const to = e.attrs.toYear
    return `${e.attrs.fromYear}–${typeof to === 'number' ? to : ''}`
  }
  if (e.type === 'object' && Array.isArray(e.attrs.spells)) {
    // the first spell, and how many more — the drawer lists them all
    const spells = e.attrs.spells as readonly string[]
    return spells.length ? `${spells[0]}${spells.length > 1 ? ` +${spells.length - 1}` : ''}` : null
  }
  if (!e.date) return e.seasonLabel
  return e.date.precision === 'day' ? dayLabel(e.date.value) : e.date.value
}

function subOf(e: GraphEntity): string | null {
  const a = e.attrs
  const join = (...parts: unknown[]) => parts.filter((p) => typeof p === 'string' && p).join(' · ') || null
  switch (e.type) {
    case 'match':
      return join(a.competitionHe, a.stage)
    case 'person':
      return join(...((a.positionTerms as readonly string[] | undefined) ?? []).slice(0, 2))
    case 'place':
      return join(a.city)
    case 'press':
      return join(a.byline)
    case 'moment':
      return e.kind === 'tie' ? join(a.competitionHe, a.stageHe) : join(a.scorerHe)
    case 'object':
      return e.kind === 'maker' ? join(a.nameEn) : e.kind === 'sponsor' ? join(a.industry) : null
    case 'song':
      return join(a.originalArtist)
    case 'fans':
      return join(a.stand, a.location)
    default:
      return null
  }
}

export function cardOf(e: GraphEntity): ArchiveCard {
  const a = e.attrs
  const best = (edgesOf.get(e.id) ?? []).reduce<ConfidenceWord>((top, edge) => (CONFIDENCE_RANK[edge.confidence] > CONFIDENCE_RANK[top] ? edge.confidence : top), 'low')
  return {
    id: e.id,
    type: e.type,
    kind: e.kind,
    sport: e.sport,
    titleHe: e.titleHe,
    subHe: subOf(e),
    when: whenOf(e),
    year: e.year,
    decade: decadeOf(e.year),
    match:
      e.type === 'match'
        ? {
            homeHe: String(a.homeHe ?? ''),
            awayHe: String(a.awayHe ?? ''),
            homeScore: typeof a.homeScore === 'number' ? a.homeScore : null,
            awayScore: typeof a.awayScore === 'number' ? a.awayScore : null,
          }
        : null,
    kit: e.type === 'kit' && e.seasonLabel ? { seasonLabel: e.seasonLabel, variant: String(a.variant ?? e.kind ?? 'home') } : null,
    crestKey: e.type === 'object' && e.kind === 'crest' && typeof a.imageKey === 'string' ? a.imageKey : null,
    degree: e.degree,
    confidence: e.confidence >= 3 ? 'high' : e.confidence >= 2 ? best === 'high' ? 'high' : 'medium' : 'low',
    disputed: a.disputed === true,
  }
}

/**
 * `describe(ids)` — the cards for a list of ids, legacy spellings resolved, unknown ids
 * dropped (and counted). Gate 10's Worker Card and gate 12's Mine both read it.
 */
export function describe(ids: readonly string[]): { cards: ArchiveCard[]; unknown: string[] } {
  const cards: ArchiveCard[] = []
  const unknown: string[] = []
  const seen = new Set<string>()
  for (const raw of ids) {
    const e = entity(raw)
    if (!e) {
      unknown.push(raw)
      continue
    }
    if (seen.has(e.id)) continue
    seen.add(e.id)
    cards.push(cardOf(e))
  }
  return { cards, unknown }
}

/** The walkable edges among a set of entities — what gate 13 plays on, never shipped. */
export function subgraph(ids: readonly string[]): { nodes: string[]; edges: GraphEdge[] } {
  const nodes = [...new Set(ids.map((id) => resolveId(id)).filter((id): id is string => id !== null))]
  const set = new Set(nodes)
  const edges = graph.edges.filter((edge) => set.has(edge.from) && set.has(edge.to) && walkable(edge.confidence))
  return { nodes, edges }
}

/* ------------------------------------------------------------------ the text of an entity */

/** The one quotation a column carries, from `press-columns.json` itself — never copied into the graph. */
export function pressQuote(e: GraphEntity): { quote: string | null; byline: string; words: number } | null {
  if (e.type !== 'press') return null
  const row = pressBySlug.get(e.id.replace(/^column:/, ''))
  return row ? { quote: row.quoteHe, byline: row.bylineHe, words: row.words } : null
}

/** The Match Master's own record, for a drawer that prints the scorers. */
export function matchRecordOf(e: GraphEntity) {
  return e.type === 'match' ? matchById(e.id) : null
}

export function personRecordOf(e: GraphEntity) {
  return e.type === 'person' ? playerById(e.id) : null
}

/* ------------------------------------------------------------------ seeded picks */

/** A seeded draw from a pool of entities — `lib/game/archive.ts rng`, never `Math.random` (rule 24). */
export function seededPick<T>(pool: readonly T[], seed: number, size: number): T[] {
  return shuffle(pool, rng(seed)).slice(0, size)
}

/** Everything of the types gate 12's box can hold — ticket, clipping, photo, file, shirt, crest… */
export function boxPool(decade: number | null): GraphEntity[] {
  return graph.entities.filter(
    (e) =>
      e.sport === 'football' &&
      (e.type === 'match' ? e.degree >= 3 : ['moment', 'kit', 'trophy', 'press', 'object', 'song', 'fans', 'person'].includes(e.type)) &&
      (e.type !== 'person' || e.degree >= 2) &&
      (decade === null || decadeOf(e.year) === decade),
  )
}

export const OBJECT_GROUP = OBJECT_TYPES
