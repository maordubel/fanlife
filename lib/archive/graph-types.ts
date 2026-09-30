/**
 * גרף הישויות — the client-safe half (21.9.2026).
 *
 * `content/generated/entity-graph.json` is read ONLY by `lib/archive/graph.ts`, which is
 * `server-only`: the graph is megabytes and, for gate 13, its adjacency IS the answer
 * (rule 4). What a component may know lives here — the shapes, the label keys, the time
 * spans and the pure rules that read them. Nothing in this file imports data.
 *
 * One graph, two gates (brief §6): gate 12 walks it (related, rabbit hole, trail) and
 * gate 13 plays on it (every link a real edge). They share entity ids — `p_…` from
 * `player-ids.json`, `m_…` from `match-ids.json`, `kit-…` from the Kit Master, and the
 * `trophy:`/`column:`/`moment:`/`goal:` ids devices already hold in their `archive` and
 * `memory` collections — so a saved item in one gate is the same item in the other.
 */

import type { CrossLink } from '@/lib/links/types'

export type EntityType =
  | 'person'
  | 'match'
  | 'season'
  | 'team'
  | 'place'
  | 'kit'
  | 'trophy'
  | 'press'
  | 'moment'
  | 'object'
  | 'song'
  | 'fans'

/** Every type, in the order a filter row prints them. */
export const ENTITY_TYPES: readonly EntityType[] = [
  'match',
  'person',
  'season',
  'moment',
  'trophy',
  'kit',
  'object',
  'place',
  'team',
  'fans',
  'song',
  'press',
]

export type Sport = 'football' | 'basketball'

/** high: confidence ≥3 or two sources agree · medium: one confidence-2 row or an exact join · low: confidence 1 or a date-only coincidence */
export type ConfidenceWord = 'high' | 'medium' | 'low'

export type Derivation = 'row' | 'join' | 'range' | 'temporal'

/**
 * A time span as ISO dates, both ends inclusive — or `null` for what can bridge eras.
 *
 * point (match, moment, press) · season window (season, kit, trophy) · career (person) ·
 * range (crest, maker, sponsor) · timeless (place, team, fans, song).
 */
export type Span = { from: string; to: string } | null

export type EntityDate = { value: string; precision: 'day' | 'year' | 'season' }

/** Values an entity's `attrs` may carry — flat, so a projection is a pick, never a walk. */
export type AttrValue = string | number | boolean | null | readonly string[]

export type GraphEntity = {
  id: string
  type: EntityType
  /** the finer kind inside a type: goal/moment/tie/grievance, crest/maker/sponsor, player/public… */
  kind: string | null
  sport: Sport
  /** the archive's own words — a name, a headline, a club pairing. Never a composed sentence. */
  titleHe: string
  year: number | null
  date: EntityDate | null
  seasonLabel: string | null
  span: Span
  attrs: Record<string, AttrValue>
  sourceIds: string[]
  /** 0–3, the row's own */
  confidence: number
  /** every other id that reaches this entity (legacy collection ids, slugs, v1 player ids) */
  aliases: string[]
  /** folded search strings — names, spellings, labels */
  search: string[]
  /** edges at medium confidence or better */
  degree: number
}

export type EdgeType =
  | 'in_season'
  | 'against'
  | 'at_venue'
  | 'home_of'
  | 'scored'
  | 'assisted'
  | 'started_in'
  | 'came_on_in'
  | 'played_in'
  | 'scored_goal'
  | 'happened_in'
  | 'leg_of'
  | 'won_in'
  | 'final_of'
  | 'worn_in'
  | 'supplied'
  | 'sponsored'
  | 'crest_of'
  | 'next_season'
  | 'published'
  | 'reported'
  | 'song_about'
  | 'written_by'
  | 'story_of'

export const EDGE_TYPES: readonly EdgeType[] = [
  'in_season',
  'against',
  'at_venue',
  'home_of',
  'scored',
  'assisted',
  'started_in',
  'came_on_in',
  'played_in',
  'scored_goal',
  'happened_in',
  'leg_of',
  'won_in',
  'final_of',
  'worn_in',
  'supplied',
  'sponsored',
  'crest_of',
  'next_season',
  'published',
  'reported',
  'song_about',
  'written_by',
  'story_of',
]

export type GraphEdge = {
  /** `<type>:<from>><to>` — unique, checked */
  id: string
  from: string
  to: string
  type: EdgeType
  /** the label read from `from` towards `to` */
  labelKey: string
  /** the label read from `to` back towards `from` */
  inverseLabelKey: string
  /** a figure the label prints — a shirt number, a goal count */
  params?: Record<string, number>
  sourceIds: string[]
  confidence: ConfidenceWord
  derivation: Derivation
  /** where the edge came from: the file, and the row's key in it */
  evidence: { file: string; key: string }
  sport: Sport
}

export type GraphSource = {
  file: string
  title: string
  url: string | null
  kind: string
  /** only where the file itself records when it was read */
  readOn: string | null
}

export type GraphReport = {
  counts: Record<string, number>
  unresolved: { file: string; what: string; count: number; reason: string }[]
  refused: { file: string; count: number; reason: string }[]
  conflicts: { entityId: string; refs: string[] }[]
}

export type EntityGraphFile = {
  schemaVersion: 1
  inputsSha: string
  inputs: string[]
  counts: Record<string, number>
  entities: GraphEntity[]
  edges: GraphEdge[]
  sources: Record<string, GraphSource>
  /** legacy id → entity id */
  aliases: Record<string, string>
  report: GraphReport
}

/* ------------------------------------------------------------------ label keys */

/** `graph.rel.<type>` / `graph.rel.<type>.inv` — every one of them is in `he.gates.archive.json`. */
export function relLabelKey(type: EdgeType, inverse = false): string {
  return `graph.rel.${type}${inverse ? '.inv' : ''}`
}

/** The label key that reads an edge from `fromId` — forward or inverse by direction. */
export function labelFrom(edge: Pick<GraphEdge, 'from' | 'labelKey' | 'inverseLabelKey'>, fromId: string): string {
  return edge.from === fromId ? edge.labelKey : edge.inverseLabelKey
}

export const CONFIDENCE_RANK: Record<ConfidenceWord, number> = { low: 0, medium: 1, high: 2 }

/** Gate 13 and the rabbit hole walk medium-or-better edges only; `low` is shown, never walked. */
export function walkable(confidence: ConfidenceWord): boolean {
  return CONFIDENCE_RANK[confidence] >= CONFIDENCE_RANK.medium
}

/* ------------------------------------------------------------------ groups */

/** "the supporter world" of a gate-13 rule — the terrace, its songs and chants */
export const SUPPORTER_TYPES: ReadonlySet<EntityType> = new Set<EntityType>(['fans', 'song'])

/** "an object" of a gate-13 rule — a shirt, a crest, a maker's mark, a trophy */
/**
 * What the archive says about a shirt beyond its season and variant. Present ONLY for a kit
 * Gate 4 does not deal — for a shirt the game asks about, the maker, the sponsor and the photograph
 * are the puzzle's answer sheet, and they live behind the shield in `/kits/archive` (brief §15).
 * A field the record does not hold is null, never a guess (rule 11).
 */
export type KitFacts = { makerHe: string | null; sponsorHe: string | null; photo: string | null }

export const OBJECT_TYPES: ReadonlySet<EntityType> = new Set<EntityType>(['kit', 'object', 'trophy'])

/** can bridge eras under a `forward` time rule */
export const TIMELESS_TYPES: ReadonlySet<EntityType> = new Set<EntityType>(['place', 'team', 'fans', 'song'])

/* ------------------------------------------------------------------ time */

/**
 * The `forward` time rule of gate 13: a move is backward only when the next span ENDS
 * before the previous one STARTS. A timeless span never is — a place, a team, the
 * terrace can carry the thread across eras (brief §23, "do not apply this blindly").
 */
export function isBackward(prev: Span, next: Span): boolean {
  if (prev === null || next === null) return false
  return next.to < prev.from
}

/** `1999/00` → the season window, 1 July to 30 June. A bare year (`1928`) is that calendar year. */
export function seasonSpan(label: string): Span {
  const pair = /^(\d{4})\/(\d{2})$/.exec(label)
  if (pair) {
    const start = Number(pair[1])
    return { from: `${start}-07-01`, to: `${start + 1}-06-30` }
  }
  const single = /^(\d{4})$/.exec(label)
  if (single) return { from: `${single[1]}-01-01`, to: `${single[1]}-12-31` }
  return null
}

/** The season a day falls in — 1 July opens a season. */
export function seasonOfDate(iso: string): string | null {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(iso)
  if (!match) return null
  const year = Number(match[1])
  const start = Number(match[2]) >= 7 ? year : year - 1
  return `${start}/${String((start + 1) % 100).padStart(2, '0')}`
}

/** The decade a card belongs to, for the era tint and the box filter. */
export function decadeOf(year: number | null): number | null {
  return year === null ? null : Math.floor(year / 10) * 10
}

/* ------------------------------------------------------------------ the client's view */

/**
 * One entity as a screen may hold it: what a card prints, and nothing about its edges.
 *
 * Built on the server (`lib/archive/graph.ts cardOf`). A Hebrew phrase is never composed
 * here — the season's "עונת", the kit's "חולצת הבית" come from the catalogue on the
 * client (`components/archive/EntityCard.tsx cardTitle`), so the data stays data.
 */
export type ArchiveCard = {
  id: string
  type: EntityType
  kind: string | null
  sport: Sport
  titleHe: string
  /** a second data line — a competition and a stage, a byline, a city */
  subHe: string | null
  /** the date or season as the archive holds it — `19.5.1999`, `1999/00`, `1995–2000` */
  when: string | null
  year: number | null
  decade: number | null
  /** for `MatchLine`: never a hand-built scoreline */
  match: { homeHe: string; awayHe: string; homeScore: number | null; awayScore: number | null } | null
  /** kit: the season and the variant — and nothing a gate-4 player could use */
  kit: { seasonLabel: string; variant: string } | null
  /** a printed crest's artwork key, where the archive holds the artwork */
  crestKey: string | null
  /** edges at medium or better */
  degree: number
  confidence: ConfidenceWord
  disputed: boolean
}

/** The confidence word of a 0–3 row. */
export function confidenceWordOf(confidence: number, agreeingSources = 1): ConfidenceWord {
  if (confidence >= 3 || (confidence >= 2 && agreeingSources >= 2)) return 'high'
  if (confidence >= 2) return 'medium'
  return 'low'
}

/* ------------------------------------------------------------------ the file's codec */

/**
 * The file on disk is COMPACT; the graph in memory is not. Thirteen thousand edges as
 * objects repeat every field name thirteen thousand times, and the first build weighed
 * 9 MB — so an edge is stored as one tuple (`EDGE_COLUMNS`), an entity omits what it can
 * derive (an empty list, a null, a span its own date implies, its degree), and the one
 * reader (`lib/archive/graph.ts`) expands it on load. The builder writes through
 * `compactGraph`, the reader reads through `expandGraph`, and the test round-trips them.
 */
export const EDGE_COLUMNS = ['type', 'from', 'to', 'confidence', 'derivation', 'sourceIds', 'evidence', 'params', 'labelKey'] as const

export type EdgeRow = [
  EdgeType,
  string,
  string,
  ConfidenceWord,
  Derivation,
  string[],
  /** `<file>` when the key is the edge's own `from`, else `<file>#<key>` */
  string,
  (Record<string, number> | 0)?,
  string?,
]

export type CompactEntity = Partial<Omit<GraphEntity, 'id' | 'type' | 'titleHe' | 'degree'>> &
  Pick<GraphEntity, 'id' | 'type' | 'titleHe'>

export type CompactGraphFile = Omit<EntityGraphFile, 'entities' | 'edges'> & {
  edgeColumns: typeof EDGE_COLUMNS
  entities: CompactEntity[]
  edges: EdgeRow[]
}

/** The span an entity's own date implies — what the file leaves out. */
export function spanOfDate(date: EntityDate | null): Span {
  if (!date) return null
  if (date.precision === 'day') return { from: date.value, to: date.value }
  if (date.precision === 'season') return seasonSpan(date.value)
  return null
}

const sameSpan = (a: Span, b: Span) => (a === null ? b === null : b !== null && a.from === b.from && a.to === b.to)

export function compactEntity(entity: GraphEntity): CompactEntity {
  const out: CompactEntity = { id: entity.id, type: entity.type, titleHe: entity.titleHe }
  if (entity.kind !== null) out.kind = entity.kind
  if (entity.sport !== 'football') out.sport = entity.sport
  if (entity.year !== null) out.year = entity.year
  if (entity.date !== null) out.date = entity.date
  if (entity.seasonLabel !== null) out.seasonLabel = entity.seasonLabel
  if (!sameSpan(entity.span, spanOfDate(entity.date))) out.span = entity.span
  if (Object.keys(entity.attrs).length > 0) out.attrs = entity.attrs
  if (entity.sourceIds.length > 0) out.sourceIds = entity.sourceIds
  out.confidence = entity.confidence
  if (entity.aliases.length > 0) out.aliases = entity.aliases
  if (entity.search.length > 0) out.search = entity.search
  return out
}

export function expandEntity(row: CompactEntity): GraphEntity {
  const date = row.date ?? null
  return {
    id: row.id,
    type: row.type,
    kind: row.kind ?? null,
    sport: row.sport ?? 'football',
    titleHe: row.titleHe,
    year: row.year ?? null,
    date,
    seasonLabel: row.seasonLabel ?? null,
    span: 'span' in row ? (row.span ?? null) : spanOfDate(date),
    attrs: row.attrs ?? {},
    sourceIds: row.sourceIds ?? [],
    confidence: row.confidence ?? 0,
    aliases: row.aliases ?? [],
    search: row.search ?? [],
    degree: 0,
  }
}

export function compactEdge(edge: GraphEdge): EdgeRow {
  const file = edge.evidence.file.replace(/^content\//, '')
  const evidence = edge.evidence.key === edge.from ? file : `${file}#${edge.evidence.key}`
  const row: EdgeRow = [edge.type, edge.from, edge.to, edge.confidence, edge.derivation, edge.sourceIds, evidence]
  const custom = edge.labelKey !== relLabelKey(edge.type)
  if (edge.params || custom) row.push(edge.params ?? 0)
  if (custom) row.push(edge.labelKey)
  return row
}

export function expandEdge(row: EdgeRow, sportOf: (id: string) => Sport): GraphEdge {
  const [type, from, to, confidence, derivation, sourceIds, evidence, params, labelKey] = row
  const hash = evidence.indexOf('#')
  const file = `content/${hash < 0 ? evidence : evidence.slice(0, hash)}`
  const key = hash < 0 ? from : evidence.slice(hash + 1)
  return {
    id: `${type}:${from}>${to}`,
    from,
    to,
    type,
    labelKey: labelKey ?? relLabelKey(type),
    inverseLabelKey: labelKey ? `${labelKey}.inv` : relLabelKey(type, true),
    ...(params ? { params } : {}),
    sourceIds,
    confidence,
    derivation,
    evidence: { file, key },
    sport: sportOf(from),
  }
}

export function compactGraph(graph: EntityGraphFile): CompactGraphFile {
  const { entities, edges, ...rest } = graph
  return {
    ...rest,
    edgeColumns: EDGE_COLUMNS,
    entities: entities.map(compactEntity),
    edges: edges.map(compactEdge),
  }
}

/** The file as the reader holds it: every entity whole, every edge an object, degrees counted. */
export function expandGraph(file: CompactGraphFile): EntityGraphFile {
  const { entities: rows, edges: edgeRows, edgeColumns: _columns, ...rest } = file
  const entities = rows.map(expandEntity)
  const byId = new Map(entities.map((entity) => [entity.id, entity]))
  const edges = edgeRows.map((row) => expandEdge(row, (id) => byId.get(id)?.sport ?? 'football'))
  for (const edge of edges) {
    if (edge.confidence === 'low') continue
    const a = byId.get(edge.from)
    const b = byId.get(edge.to)
    if (a) a.degree += 1
    if (b) b.degree += 1
  }
  return { ...rest, entities, edges }
}

/* ------------------------------------------------------------------ gate 12's drawer */

/** One source line under a drawer or a thread edge: the title, the link, a confidence word, a read date where the file has one. */
export type SourceLine = { id: string; title: string; url: string | null; kind: string; readOn: string | null; confidence: ConfidenceWord }

export type RelatedItem = { card: ArchiveCard; labelKey: string; params: Record<string, number> | null; confidence: ConfidenceWord }
export type RelatedGroup = { type: EntityType; total: number; items: RelatedItem[] }

export type ScorerLine = { nameHe: string; minute: number | null; penalty: boolean; ownGoal: boolean }

/** "מה קרה?" — only what the archive itself holds for this entity, in its own words or figures. */
export type WhatBlock =
  | { kind: 'text'; text: string; summary: boolean }
  | {
      kind: 'match'
      competitionHe: string
      stage: string | null
      day: string | null
      venueHe: string | null
      scorers: ScorerLine[]
      disputed: boolean
    }
  | { kind: 'quote'; quote: string | null; byline: string; words: number }
  | { kind: 'person'; from: number | null; to: number | null; seasons: number; numbers: string[]; goals: number; positions: string[] }
  | { kind: 'season'; matches: number; trophies: string[] }
  | { kind: 'kit'; seasonLabel: string; variant: string; playable: boolean; facts: KitFacts | null }
  | { kind: 'crest'; text: string | null; note: string | null; imageKey: string | null }
  | { kind: 'spells'; spells: string[]; nameEn: string | null }
  | { kind: 'song'; originalTitle: string | null; originalArtist: string | null; lyricsBy: string | null }
  | { kind: 'none' }

export type EntityDetail = {
  card: ArchiveCard
  what: WhatBlock
  /** connected entities by type — "למה זה מעניין" is these counts and nothing else */
  counts: { type: EntityType; n: number }[]
  before: ArchiveCard | null
  after: ArchiveCard | null
  related: RelatedGroup[]
  sources: SourceLine[]
  /** delta 89 — the same match / man in the other gates (`lib/links`), every target checked */
  links?: CrossLink[]
  /**
   * ONE RED WORLD §21 — the Cross Gate Router (`lib/links/actions.ts`): the gates that can
   * actually serve this entity, and the LIFE chapters it is lived in (drawn only when the
   * device's save has completed one — the server never knows that).
   */
  router?: {
    actions: { kind: string; gate: number; href: string; label: string }[]
    lifeChapters: string[]
  }
}

/** The personal reaction chips a type offers — a personal set, never a fact about the item. */
export const REACTIONS: Record<'event' | 'place' | 'object' | 'person' | 'other', readonly string[]> = {
  event: ['there', 'home', 'moved'],
  place: ['there', 'ground', 'moved'],
  object: ['had', 'looked', 'moved'],
  person: ['legend', 'fav', 'moved'],
  other: ['moved'],
}

export function reactionSetOf(type: EntityType): keyof typeof REACTIONS {
  if (type === 'match' || type === 'moment' || type === 'season') return 'event'
  if (type === 'place') return 'place'
  if (type === 'kit' || type === 'object' || type === 'trophy' || type === 'press') return 'object'
  if (type === 'person') return 'person'
  return 'other'
}
