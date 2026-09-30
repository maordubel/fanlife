/**
 * npm run archive:graph — the Entity Graph Master (21.9.2026).
 *
 * One graph for gates 12 and 13 (brief §6): every person, match, season, moment, kit,
 * trophy, crest, maker, sponsor, song, terrace item, place, opponent and press column the
 * archive holds, and every relation between them that a ROW states — each edge with its
 * label keys, its sources, a confidence word and the file and key it came from.
 *
 * **It reuses, it does not re-derive.** People come from the Player Master (`p_…`),
 * matches, moments and their relations from the Match/Moment Master (`m_…`, `goal:`,
 * `moment:`), shirts from the Kit Master (`kit-…`). A manual file is read only for what
 * no master holds: trophies, European ties, crests, makers, sponsors, songs, the terrace,
 * places, press columns, and the per-season evidence of who played when.
 *
 * **It never mints.** Every id is a master's id or a derived address (`season:1999/00`,
 * `team:football:<slug>`, `place:<slug>`, `crest:<fromYear>`, `maker:<slug>`, …). Names
 * resolve through the Player Master's identity index — exact spelling or reviewed alias,
 * never fuzzy (rule 7); what does not resolve is COUNTED in `report.unresolved`.
 *
 * **Confidence** (brief §6 · spec §3): high = confidence ≥3 or two sources agree;
 * medium = one confidence-2 row or an exact join; low = confidence 1 or a date-only
 * coincidence. The floor of 2 applies to every row except the press corpus, which is
 * kept at confidence 1 and can only ever produce `low` edges — shown in gate 12, never
 * walked by the rabbit hole and never offered by gate 13.
 *
 * **Sport partition** (rule 6/14): basketball matches sit in their own partition; no edge
 * crosses sports, and the builder refuses one rather than writing it.
 *
 * Deterministic: no clock, no randomness; `inputsSha` fingerprints the inputs and
 * `tests/entity-graph.test.ts` rebuilds the file and compares bytes.
 */

import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import {
  compactGraph,
  confidenceWordOf,
  relLabelKey,
  seasonOfDate,
  seasonSpan,
  type ConfidenceWord,
  type Derivation,
  type EdgeType,
  type EntityGraphFile,
  type EntityType,
  type GraphEdge,
  type GraphEntity,
  type GraphReport,
  type GraphSource,
  type Span,
  type Sport,
} from '@/lib/archive/graph-types'
import { buildIdentityIndex, type PlayerIdEntry, type PlayerMasterV2File } from '@/lib/archive/player-identity'
import type { MatchMasterFile, MatchRecord } from '@/lib/archive/match-master-types'
import { fold } from '@/lib/game/roster-search'

const OUT = 'content/generated/entity-graph.json'
const FLOOR = 2
const US = 'הפועל-תל-אביב'

/** Every file the graph reads. Append, never re-sort — the order is the fingerprint's. */
export const GRAPH_INPUTS = [
  'content/generated/player-master.json',
  'content/generated/match-master.json',
  'content/generated/kit-master.json',
  'content/manual/player-ids.json',
  'content/manual/clubs.json',
  'content/manual/competitions.json',
  'content/manual/venues.json',
  'content/manual/trophies.json',
  'content/manual/euro-ties.json',
  'content/manual/grievances.json',
  'content/manual/crest-versions.json',
  'content/manual/manufacturers.json',
  'content/manual/kit-supply.json',
  'content/manual/sponsors.json',
  'content/manual/sponsor-deals.json',
  'content/manual/songs.json',
  'content/manual/fan-culture.json',
  'content/manual/fan-groups.json',
  'content/manual/press-columns.json',
  'content/manual/player-facts-seasons.json',
  'content/manual/squads.json',
  'content/manual/kit-designs.json',
  'content/raw/vikipoel-games.json',
] as const

export function graphInputsSha(root: string, inputs: readonly string[] = GRAPH_INPUTS): string {
  const hash = createHash('sha256')
  for (const file of inputs) {
    hash.update(`${file}\n${createHash('sha256').update(readFileSync(join(root, file))).digest('hex')}\n`)
  }
  return hash.digest('hex')
}

/** Code-point order — locale-free, so a rebuild on any machine sorts the same. */
function byCodePoint(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * A short, stable, readable id for a source — the SAME function the Match Master uses
 * (`scripts/archive/build-match-master.ts sourceIdOf`), so one article is one id across
 * both masters. `tests/entity-graph.test.ts` checks that every id the two share agrees.
 */
export function sourceIdOf(url: string | null | undefined, title: string | null | undefined): string {
  const u = url ?? ''
  let m: RegExpMatchArray | null
  if ((m = u.match(/ynet\.co\.il\/articles\/[\d,]+,L-(\d+)/))) return `ynet:L-${m[1]}`
  if ((m = u.match(/walla\.co\.il\/item\/(\d+)/))) return `walla:${m[1]}`
  if ((m = u.match(/one\.co\.il\/Article\/(\d+)/))) return `one:${m[1]}`
  if (u === 'https://wiki.red-fans.com/index.php?title=Special:CargoTables/Games') return 'vikipoel:games'
  const host = u.match(/^https?:\/\/(?:www\.)?([^/]+)/)?.[1] ?? 'src'
  const label = host.includes('red-fans') ? 'vikipoel' : host.split('.').slice(0, -1).join('.') || host
  return `${label}:${createHash('sha1').update(`${title ?? ''}|${u}`).digest('hex').slice(0, 8)}`
}

function seasonStart(label: string | null | undefined): number | null {
  if (!label) return null
  const pair = /^(\d{4})\/\d{2}$/.exec(label)
  if (pair) return Number(pair[1])
  const single = /^(\d{4})$/.exec(label)
  return single ? Number(single[1]) : null
}

function seasonLabelOf(start: number): string {
  return `${start}/${String((start + 1) % 100).padStart(2, '0')}`
}

type Row = Record<string, any>
type ManualFile = { confidence?: number; source?: Row; records: Row[] }

export function buildGraph(root = process.cwd()): { out: EntityGraphFile; problems: string[] } {
  const cache = new Map<string, unknown>()
  const read = (file: string): any => {
    if (!cache.has(file)) cache.set(file, JSON.parse(readFileSync(join(root, file), 'utf8')))
    return cache.get(file)
  }
  const problems: string[] = []

  /* ------------------------------------------------------------------ registries */

  const sources = new Map<string, GraphSource>()
  const entities = new Map<string, GraphEntity>()
  const edges = new Map<string, GraphEdge>()
  const aliases = new Map<string, string>()
  const unresolved = new Map<string, { file: string; what: string; count: number; reason: string }>()
  const refused = new Map<string, { file: string; count: number; reason: string }>()
  const conflicts: { entityId: string; refs: string[] }[] = []

  const miss = (file: string, what: string, reason: string) => {
    const key = `${file}|${what}|${reason}`
    const row = unresolved.get(key) ?? { file, what, count: 0, reason }
    row.count += 1
    unresolved.set(key, row)
  }
  const refuse = (file: string, reason: string, count = 1) => {
    const key = `${file}|${reason}`
    const row = refused.get(key) ?? { file, count: 0, reason }
    row.count += count
    refused.set(key, row)
  }

  /** The file-level source of a manual file, registered once. */
  const fileSources = new Map<string, string>()
  const fileSource = (file: string): string | null => {
    if (fileSources.has(file)) return fileSources.get(file) ?? null
    const doc = read(file) as ManualFile
    const src = doc.source
    if (!src || typeof src.title !== 'string') {
      fileSources.set(file, '')
      return null
    }
    const id = addSource(file, src.url ?? null, src.title, src.kind ?? 'other', src.readOn ?? null)
    fileSources.set(file, id)
    return id
  }

  function addSource(file: string, url: string | null, title: string, kind: string, readOn: string | null): string {
    const id = sourceIdOf(url, title)
    if (!sources.has(id)) sources.set(id, { file, title, url: url || null, kind, readOn })
    return id
  }

  /** A row's own source when it carries one, else its file's. */
  const rowSource = (file: string, row: Row, kind?: string): string[] => {
    if (typeof row.sourceTitle === 'string' && row.sourceTitle.trim()) {
      const doc = read(file) as ManualFile
      return [
        addSource(
          file,
          typeof row.sourceUrl === 'string' ? row.sourceUrl : null,
          row.sourceTitle,
          kind ?? doc.source?.kind ?? 'other',
          doc.source?.readOn ?? null,
        ),
      ]
    }
    const id = fileSource(file)
    return id ? [id] : []
  }

  const confOf = (row: Row, doc: ManualFile): number =>
    typeof row.confidence === 'number' ? row.confidence : typeof doc.confidence === 'number' ? doc.confidence : 0

  function addEntity(entity: Omit<GraphEntity, 'degree' | 'search' | 'aliases'> & { search?: string[]; aliases?: string[] }) {
    if (entities.has(entity.id)) {
      problems.push(`duplicate entity id ${entity.id}`)
      return
    }
    // the folded title is the reader's to compute; the file keeps only the OTHER spellings
    const title = fold(entity.titleHe).toLowerCase().trim()
    const search = new Set<string>()
    for (const value of entity.search ?? []) {
      const folded = fold(String(value)).toLowerCase().trim()
      if (folded && folded !== title) search.add(folded)
    }
    entities.set(entity.id, {
      ...entity,
      aliases: [...new Set(entity.aliases ?? [])].sort(byCodePoint),
      search: [...search],
      degree: 0,
    })
    for (const alias of entity.aliases ?? []) addAlias(alias, entity.id)
  }

  function addAlias(alias: string, id: string) {
    if (!alias || alias === id) return
    const had = aliases.get(alias)
    if (had && had !== id) {
      // two entities claim one legacy id: neither gets it (rule 7 — never guess)
      aliases.set(alias, '')
      miss('aliases', alias, 'claimed by two entities')
      return
    }
    aliases.set(alias, id)
  }

  function addEdge(spec: {
    type: EdgeType
    from: string
    to: string
    sourceIds: string[]
    /** the row's own 0–3 */
    confidence: number
    derivation: Derivation
    evidence: { file: string; key: string }
    params?: Record<string, number>
    /** `low` whatever the row says — a date-only coincidence */
    forceLow?: boolean
    labelKey?: string
    inverseLabelKey?: string
  }): boolean {
    const a = entities.get(spec.from)
    const b = entities.get(spec.to)
    if (!a || !b) {
      miss(spec.evidence.file, `${spec.type}:${!a ? spec.from : spec.to}`, 'endpoint is not an entity')
      return false
    }
    if (a.sport !== b.sport) {
      refuse(spec.evidence.file, `cross-sport ${spec.type} (rule 6/14)`)
      return false
    }
    if (spec.sourceIds.length === 0) {
      problems.push(`edge ${spec.type} ${spec.from}>${spec.to} has no source`)
      return false
    }
    const id = `${spec.type}:${spec.from}>${spec.to}`
    const had = edges.get(id)
    const sourceIds = [...new Set([...(had?.sourceIds ?? []), ...spec.sourceIds])].sort(byCodePoint)
    let confidence: ConfidenceWord = spec.forceLow ? 'low' : confidenceWordOf(spec.confidence, sourceIds.length)
    if (had) {
      const rank = { low: 0, medium: 1, high: 2 } as const
      if (rank[had.confidence] > rank[confidence]) confidence = had.confidence
      // two independent rows agreeing lift a medium edge to high
      if (!spec.forceLow && had.confidence !== 'low' && sourceIds.length >= 2) confidence = 'high'
    }
    edges.set(id, {
      id,
      from: spec.from,
      to: spec.to,
      type: spec.type,
      labelKey: spec.labelKey ?? had?.labelKey ?? relLabelKey(spec.type),
      inverseLabelKey: spec.inverseLabelKey ?? had?.inverseLabelKey ?? relLabelKey(spec.type, true),
      ...(spec.params || had?.params ? { params: { ...(had?.params ?? {}), ...(spec.params ?? {}) } } : {}),
      sourceIds,
      confidence,
      derivation: had?.derivation ?? spec.derivation,
      evidence: had?.evidence ?? spec.evidence,
      sport: a.sport,
    })
    return true
  }

  /* ------------------------------------------------------------------ names */

  const clubs = (read('content/manual/clubs.json') as ManualFile).records
  const clubName = new Map<string, string>()
  for (const club of clubs) {
    const sport = club.sport ?? 'football'
    const key = `${sport}|${club.slug}`
    if (!clubName.has(key)) clubName.set(key, club.nameHe)
  }
  const nameOfClub = (slug: string, sport: Sport): string =>
    clubName.get(`${sport}|${slug}`) ?? clubName.get(`football|${slug}`) ?? slug.replace(/-/g, ' ')

  const competitions = (read('content/manual/competitions.json') as ManualFile).records
  const competitionName = new Map<string, string>(competitions.map((row) => [row.slug as string, row.nameHe as string]))
  const nameOfCompetition = (slug: string): string => competitionName.get(slug) ?? slug.replace(/-/g, ' ')

  /* ------------------------------------------------------------------ people (Player Master) */

  const players = read('content/generated/player-master.json') as PlayerMasterV2File
  const identity = buildIdentityIndex((read('content/manual/player-ids.json') as { records: PlayerIdEntry[] }).records)
  const resolvePerson = (name: string | null | undefined): string | null => identity.resolve(name)?.id ?? null
  const peopleSource = (() => {
    // a person is the Player Master's record; its evidence is the files its provenance names
    const map = new Map<string, string>()
    return (file: string): string | null => {
      if (map.has(file)) return map.get(file) || null
      let id: string | null = null
      try {
        id = fileSource(`content/manual/${file}`)
      } catch {
        id = null
      }
      map.set(file, id ?? '')
      return id
    }
  })()

  for (const p of players.players) {
    const sourceIds = new Set<string>()
    for (const ref of p.provenance) {
      if (ref.sourceTitle) sourceIds.add(addSource(`content/manual/${ref.file}`, ref.sourceUrl ?? null, ref.sourceTitle, 'wiki', null))
      else {
        const id = peopleSource(ref.file)
        if (id) sourceIds.add(id)
      }
    }
    const from = p.years.from
    const to = p.years.to
    const span: Span =
      from !== null && to !== null ? { from: `${from}-07-01`, to: `${Math.max(to, from + 1)}-06-30` } : null
    addEntity({
      id: p.id,
      type: 'person',
      kind: p.kind,
      sport: 'football',
      titleHe: p.displayName,
      year: from,
      date: null,
      seasonLabel: null,
      span,
      attrs: {
        from,
        to,
        positions: p.positions.codes,
        positionTerms: p.positions.fine?.terms ?? [],
        numbers: [...new Set(p.shirtNumbers.filter((n) => n.historical).map((n) => String(n.number)))],
        seasons: p.spells.reduce((sum, spell) => sum + spell.seasons.length, 0),
        documentedGoals: p.archiveGoals?.documentedGoals ?? 0,
        currentSquad: p.currentSquad?.active === true,
      },
      sourceIds: [...sourceIds].sort(byCodePoint),
      confidence: 2,
      aliases: [p.slug, ...p.slugAliases, ...p.legacyIds],
      search: [p.displayName, ...p.aliases.he, ...p.aliases.latin, p.slug.replace(/-/g, ' ')],
    })
  }

  /* ------------------------------------------------------------------ matches (Match Master) */

  const master = read('content/generated/match-master.json') as MatchMasterFile
  for (const [id, src] of Object.entries(master.sources)) {
    if (!sources.has(id)) {
      const kind = id.startsWith('vikipoel') ? 'wiki' : /^(ynet|walla|one|sport1|haaretz|maariv|israelhayom)/.test(id) ? 'newspaper' : 'other'
      sources.set(id, { file: 'content/generated/match-master.json', title: src.title, url: src.url, kind, readOn: null })
    }
  }

  const seasonsSeen = new Set<string>()
  const matchesByDay = new Map<string, MatchRecord[]>()
  const matchSport = new Map<string, Sport>()

  for (const match of master.matches) {
    if (match.confidence < FLOOR) {
      refuse('content/generated/match-master.json', 'match below confidence 2')
      continue
    }
    const sport = match.sport as Sport
    const home = match.home ?? match.clubs[0]
    const away = match.away ?? match.clubs[1]
    const day = match.playedOn.precision === 'day' ? match.playedOn.value : null
    const disputed = match.conflictRefs.length > 0 || match.home === null
    const competitionHe = nameOfCompetition(match.competition)
    addEntity({
      id: match.matchId,
      type: 'match',
      kind: match.competition,
      sport,
      titleHe: `${nameOfClub(home, sport)} – ${nameOfClub(away, sport)}`,
      year: day ? Number(day.slice(0, 4)) : seasonStart(match.season),
      date: day ? { value: day, precision: 'day' } : { value: match.season, precision: 'season' },
      seasonLabel: match.season,
      span: day ? { from: day, to: day } : seasonSpan(match.season),
      attrs: {
        homeHe: nameOfClub(home, sport),
        awayHe: nameOfClub(away, sport),
        homeScore: match.score && match.home !== null ? match.score.home : null,
        awayScore: match.score && match.home !== null ? match.score.away : null,
        competitionHe,
        stage: match.stage,
        hapoelSide: match.hapoelSide,
        disputed,
      },
      sourceIds: [...match.sourceIds].sort(byCodePoint),
      confidence: match.confidence,
    })
    matchSport.set(match.matchId, sport)
    if (disputed && match.conflictRefs.length > 0) conflicts.push({ entityId: match.matchId, refs: match.conflictRefs })
    if (sport === 'football') {
      seasonsSeen.add(match.season)
      if (day) {
        const list = matchesByDay.get(day) ?? []
        list.push(match)
        matchesByDay.set(day, list)
      }
    }
  }

  /* ------------------------------------------------------------------ seasons */

  const trophiesFile = read('content/manual/trophies.json') as ManualFile
  const kitMaster = read('content/generated/kit-master.json') as {
    kits: { id: string; legacyKey: string; seasonLabel: string; variant: string; decade: number; fields: Record<string, { source: string; confidence: number }>; gate4: { playable: boolean } }[]
  }
  for (const row of trophiesFile.records) if (confOf(row, trophiesFile) >= FLOOR) seasonsSeen.add(row.seasonLabel)
  for (const kit of kitMaster.kits) seasonsSeen.add(kit.seasonLabel)

  const seasonList = [...seasonsSeen].filter((label) => seasonStart(label) !== null).sort(byCodePoint)
  const seasonId = (label: string) => `season:${label}`
  const gamesSource = sources.has('vikipoel:games') ? 'vikipoel:games' : null
  for (const label of seasonList) {
    const start = seasonStart(label) as number
    addEntity({
      id: seasonId(label),
      type: 'season',
      kind: /^\d{4}$/.test(label) ? 'year' : 'season',
      sport: 'football',
      titleHe: label,
      year: start,
      date: { value: label, precision: 'season' },
      seasonLabel: label,
      span: seasonSpan(label),
      attrs: {},
      sourceIds: gamesSource ? [gamesSource] : [],
      confidence: 2,
      search: [String(start), String(start + 1)],
    })
  }
  const latestSeason = seasonList.filter((label) => /\//.test(label)).map((label) => seasonStart(label) as number).reduce((a, b) => Math.max(a, b), 0)

  // the season after — only where the archive holds both, a year apart
  for (const label of seasonList) {
    const start = seasonStart(label) as number
    if (!/\//.test(label)) continue
    const next = seasonLabelOf(start + 1)
    if (!seasonsSeen.has(next) || !gamesSource) continue
    addEdge({
      type: 'next_season',
      from: seasonId(label),
      to: seasonId(next),
      sourceIds: [gamesSource],
      confidence: 2,
      derivation: 'temporal',
      evidence: { file: 'content/generated/match-master.json', key: `${label}>${next}` },
    })
  }

  /* ------------------------------------------------------------------ opponents */

  const teamId = (sport: Sport, slug: string) => `team:${sport}:${slug}`
  for (const match of master.matches) {
    if (!entities.has(match.matchId) || !match.opponent) continue
    const sport = match.sport as Sport
    const id = teamId(sport, match.opponent)
    if (!entities.has(id)) {
      addEntity({
        id,
        type: 'team',
        kind: null,
        sport,
        titleHe: nameOfClub(match.opponent, sport),
        year: null,
        date: null,
        seasonLabel: null,
        span: null,
        attrs: {},
        sourceIds: gamesSource ? [gamesSource] : [...match.sourceIds],
        confidence: 2,
        search: [match.opponent.replace(/-/g, ' ')],
      })
    }
  }

  for (const match of master.matches) {
    if (!entities.has(match.matchId)) continue
    const sport = match.sport as Sport
    const evidence = { file: 'content/generated/match-master.json', key: match.matchId }
    if (sport === 'football' && entities.has(seasonId(match.season))) {
      addEdge({ type: 'in_season', from: match.matchId, to: seasonId(match.season), sourceIds: match.sourceIds, confidence: match.confidence, derivation: 'row', evidence })
    }
    if (match.opponent) {
      addEdge({ type: 'against', from: match.matchId, to: teamId(sport, match.opponent), sourceIds: match.sourceIds, confidence: match.confidence, derivation: 'row', evidence })
    }
  }

  /* ------------------------------------------------------------------ places */

  const venuesFile = read('content/manual/venues.json') as ManualFile
  const venueIndex = new Map<string, string>()
  for (const row of venuesFile.records) {
    if (confOf(row, venuesFile) < FLOOR) {
      refuse('content/manual/venues.json', 'venue below confidence 2')
      continue
    }
    const id = `place:${row.slug}`
    addEntity({
      id,
      type: 'place',
      kind: null,
      sport: (row.sport ?? 'football') as Sport,
      titleHe: row.nameHe,
      year: null,
      date: null,
      seasonLabel: null,
      span: null,
      attrs: { city: row.city ?? null },
      sourceIds: rowSource('content/manual/venues.json', row),
      confidence: confOf(row, venuesFile),
      search: [row.slug.replace(/-/g, ' '), ...(row.aliases ?? []), row.city ?? ''],
    })
    for (const name of [row.slug, row.nameHe, ...(row.aliases ?? [])]) {
      const key = `${row.sport ?? 'football'}|${fold(name).toLowerCase()}`
      if (venueIndex.has(key) && venueIndex.get(key) !== id) venueIndex.set(key, '')
      else venueIndex.set(key, id)
    }
  }
  /** a venue by an exact spelling, or the part before a comma ("אצטדיון GSP, ניקוסיה") */
  const venueOf = (name: string | null | undefined, sport: Sport): string | null => {
    if (!name) return null
    for (const candidate of [name, name.split(',')[0] ?? '']) {
      const hit = venueIndex.get(`${sport}|${fold(candidate.replace(/&quot;/g, '"')).toLowerCase()}`)
      if (hit) return hit
    }
    return null
  }

  // the Match Master's own venue field
  for (const match of master.matches) {
    if (!entities.has(match.matchId) || !match.venue) continue
    const place = venueOf(match.venue, match.sport as Sport)
    if (!place) {
      miss('content/generated/match-master.json', match.venue, 'venue not in venues.json')
      continue
    }
    addEdge({ type: 'at_venue', from: match.matchId, to: place, sourceIds: match.sourceIds, confidence: match.confidence, derivation: 'row', evidence: { file: 'content/generated/match-master.json', key: match.matchId } })
  }

  // The venue pass: ויקיפועל's Games table carries a stadium on ~2,000 football rows that
  // the ingest does not keep. A row joins a match only when the DAY and BOTH SCORES agree
  // and exactly one match fits; the stadium must be an exact venues.json spelling.
  const raw = read('content/raw/vikipoel-games.json') as Row[]
  for (const row of raw) {
    const sport: Sport | null = row.department === 'כדורגל' ? 'football' : row.department === 'כדורסל' ? 'basketball' : null
    if (!sport || !row.stadium || !row.year || !row.month || !row.day) continue
    const day = `${row.year}-${String(row.month).padStart(2, '0')}-${String(row.day).padStart(2, '0')}`
    const place = venueOf(String(row.stadium), sport)
    if (!place) {
      miss('content/raw/vikipoel-games.json', String(row.stadium).replace(/&quot;/g, '"'), 'stadium spelling not in venues.json')
      continue
    }
    const candidates = (sport === 'football' ? (matchesByDay.get(day) ?? []) : master.matches.filter((m) => m.sport === 'basketball' && m.playedOn.value === day)).filter(
      (m) => entities.has(m.matchId) && m.score !== null && m.score.home === row.homescore && m.score.away === row.awayscore,
    )
    if (candidates.length !== 1) {
      miss('content/raw/vikipoel-games.json', `${sport} rows`, candidates.length === 0 ? 'no match with that day and score' : 'two matches fit')
      continue
    }
    const match = candidates[0] as MatchRecord
    addEdge({
      type: 'at_venue',
      from: match.matchId,
      to: place,
      sourceIds: gamesSource ? [gamesSource] : match.sourceIds,
      confidence: 2,
      derivation: 'join',
      evidence: { file: 'content/raw/vikipoel-games.json', key: `${day}|${row.homescore}-${row.awayscore}` },
    })
  }

  /* ------------------------------------------------------------------ moments (Match Master) */

  for (const moment of master.moments) {
    if (moment.confidence < FLOOR || !moment.usable.archive) {
      refuse('content/generated/match-master.json', 'moment below confidence 2')
      continue
    }
    const day = moment.playedOn
    const src = moment.sourceId
    addEntity({
      id: moment.momentId,
      type: 'moment',
      kind: moment.kind,
      sport: 'football',
      titleHe: moment.titleHe,
      year: day ? Number(day.slice(0, 4)) : seasonStart(moment.season),
      date: day ? { value: day, precision: 'day' } : moment.season ? { value: moment.season, precision: 'season' } : null,
      seasonLabel: moment.season,
      span: day ? { from: day, to: day } : moment.season ? seasonSpan(moment.season) : null,
      attrs: {
        text: moment.text.he,
        textKind: moment.text.kind,
        minute: moment.minute,
        category: moment.category,
        scorerHe: moment.scorer?.nameHe ?? null,
        disputed: moment.conflictRefs.length > 0,
      },
      sourceIds: [src],
      confidence: moment.confidence,
      search: [moment.scorer?.nameHe ?? '', moment.season ?? ''],
    })
    if (moment.conflictRefs.length > 0) conflicts.push({ entityId: moment.momentId, refs: moment.conflictRefs })
  }

  const relationType: Record<string, EdgeType> = {
    scored: 'scored',
    assisted: 'assisted',
    started_in: 'started_in',
    came_on_in: 'came_on_in',
    happened_in: 'happened_in',
    in_season: 'in_season',
    leg_of: 'leg_of',
  }
  const legsOfTie = new Map<string, string[]>()
  const pendingLegs: { from: string; to: string; sourceIds: string[]; confidence: number }[] = []
  for (const rel of master.relations) {
    let type = relationType[rel.type]
    if (!type) continue
    if (rel.type === 'scored' && rel.to.startsWith('goal:')) type = 'scored_goal'
    const to = rel.to.startsWith('season:') ? rel.to : rel.to
    if (rel.type === 'leg_of') {
      // `tie:` entities are built below, from euro-ties.json
      pendingLegs.push({ from: rel.from, to, sourceIds: rel.sourceIds, confidence: rel.confidence })
      legsOfTie.set(to, [...(legsOfTie.get(to) ?? []), rel.from])
      continue
    }
    if (rel.confidence < FLOOR) {
      refuse('content/generated/match-master.json', `${rel.type} relation below confidence 2`)
      continue
    }
    addEdge({
      type,
      from: rel.from,
      to,
      sourceIds: rel.sourceIds,
      confidence: rel.confidence,
      derivation: 'row',
      evidence: { file: 'content/generated/match-master.json', key: `${rel.type}:${rel.from}>${rel.to}` },
      ...(rel.count && rel.count > 1 ? { params: { n: rel.count } } : {}),
    })
  }

  /* ------------------------------------------------------------------ European ties */

  const tiesFile = read('content/manual/euro-ties.json') as ManualFile
  for (const tie of tiesFile.records) {
    const confidence = confOf(tie, tiesFile)
    if (confidence < FLOOR) {
      refuse('content/manual/euro-ties.json', 'tie below confidence 2')
      continue
    }
    const days = (tie.legs as Row[]).map((leg) => leg.playedOn).filter((d): d is string => typeof d === 'string').sort()
    const first = days[0] ?? null
    const last = days[days.length - 1] ?? null
    const id = `tie:${tie.slug}`
    addEntity({
      id,
      type: 'moment',
      kind: 'tie',
      sport: 'football',
      titleHe: tie.opponentHe,
      year: first ? Number(first.slice(0, 4)) : seasonStart(tie.seasonLabel),
      date: first ? { value: first, precision: 'day' } : { value: tie.seasonLabel, precision: 'season' },
      seasonLabel: tie.seasonLabel,
      span: first && last ? { from: first, to: last } : seasonSpan(tie.seasonLabel),
      attrs: {
        competitionHe: tie.competitionHe,
        stageHe: tie.stageHe,
        countryHe: tie.opponentCountryHe ?? null,
        forHapoel: (tie.legs as Row[]).reduce((sum, leg) => sum + (typeof leg.forHapoel === 'number' ? leg.forHapoel : 0), 0),
        against: (tie.legs as Row[]).reduce((sum, leg) => sum + (typeof leg.against === 'number' ? leg.against : 0), 0),
        legs: (tie.legs as Row[]).length,
        advanced: tie.advanced ?? null,
        text: tie.notableHe ?? null,
      },
      sourceIds: rowSource('content/manual/euro-ties.json', tie),
      confidence,
      aliases: [`euro:${tie.slug}`],
      search: [tie.opponentLatin ?? '', tie.competitionHe, tie.seasonLabel, tie.opponentCountryHe ?? ''],
    })
    if (entities.has(seasonId(tie.seasonLabel))) {
      addEdge({ type: 'in_season', from: id, to: seasonId(tie.seasonLabel), sourceIds: rowSource('content/manual/euro-ties.json', tie), confidence, derivation: 'row', evidence: { file: 'content/manual/euro-ties.json', key: tie.slug } })
    }
  }
  for (const leg of pendingLegs) {
    if (leg.confidence < FLOOR) continue
    addEdge({ type: 'leg_of', from: leg.from, to: leg.to, sourceIds: leg.sourceIds, confidence: leg.confidence, derivation: 'row', evidence: { file: 'content/generated/match-master.json', key: `leg_of:${leg.from}>${leg.to}` } })
  }
  // a tie meets the opponent its legs met — a join, and only when every leg agrees
  for (const [tie, legs] of legsOfTie) {
    if (!entities.has(tie)) continue
    const opponents = new Set(legs.map((leg) => master.matches.find((m) => m.matchId === leg)?.opponent ?? null))
    if (opponents.size !== 1) continue
    const opponent = [...opponents][0]
    if (!opponent) continue
    const tieSources = entities.get(tie)?.sourceIds ?? []
    addEdge({ type: 'against', from: tie, to: teamId('football', opponent), sourceIds: tieSources, confidence: 2, derivation: 'join', evidence: { file: 'content/manual/euro-ties.json', key: tie } })
  }
  // a leg's venue as the tie file names it
  for (const tie of tiesFile.records) {
    for (const leg of tie.legs as Row[]) {
      if (!leg.venueHe || !leg.playedOn) continue
      const place = venueOf(leg.venueHe, 'football')
      if (!place) {
        miss('content/manual/euro-ties.json', leg.venueHe, 'leg venue not in venues.json')
        continue
      }
      const match = (matchesByDay.get(leg.playedOn) ?? []).filter((m) => entities.has(m.matchId))
      if (match.length !== 1) continue
      addEdge({ type: 'at_venue', from: (match[0] as MatchRecord).matchId, to: place, sourceIds: rowSource('content/manual/euro-ties.json', tie), confidence: confOf(tie, tiesFile), derivation: 'join', evidence: { file: 'content/manual/euro-ties.json', key: `${tie.slug}|${leg.playedOn}` } })
    }
  }

  /* ------------------------------------------------------------------ grievances */

  const grievancesFile = read('content/manual/grievances.json') as ManualFile
  for (const row of grievancesFile.records) {
    const confidence = confOf(row, grievancesFile)
    if (confidence < FLOOR) continue
    const day = row.dateConfirmed === true && typeof row.happenedOn === 'string' ? row.happenedOn : null
    const id = `grievance:${row.slug}`
    addEntity({
      id,
      type: 'moment',
      kind: 'grievance',
      sport: 'football',
      titleHe: row.titleHe,
      year: day ? Number(day.slice(0, 4)) : null,
      date: day ? { value: day, precision: 'day' } : null,
      seasonLabel: null,
      span: day ? { from: day, to: day } : null,
      attrs: { text: row.bodyHe ?? null, category: row.kind },
      sourceIds: rowSource('content/manual/grievances.json', row, 'newspaper'),
      confidence,
      search: [row.personNameHe ?? ''],
    })
    if (row.personNameHe) {
      const person = resolvePerson(row.personNameHe)
      if (person) addEdge({ type: 'story_of', from: id, to: person, sourceIds: rowSource('content/manual/grievances.json', row, 'newspaper'), confidence, derivation: 'row', evidence: { file: 'content/manual/grievances.json', key: row.slug } })
      else miss('content/manual/grievances.json', row.personNameHe, 'name does not resolve in the Player Master')
    }
  }

  /* ------------------------------------------------------------------ trophies */

  for (const row of trophiesFile.records) {
    const confidence = confOf(row, trophiesFile)
    if (confidence < FLOOR || (row.sport && row.sport !== 'football')) {
      refuse('content/manual/trophies.json', 'trophy below confidence 2')
      continue
    }
    const id = `trophy:${row.competitionSlug}:${row.seasonLabel}`
    const src = rowSource('content/manual/trophies.json', row)
    addEntity({
      id,
      type: 'trophy',
      kind: row.result,
      sport: 'football',
      titleHe: nameOfCompetition(row.competitionSlug),
      year: seasonStart(row.seasonLabel),
      date: { value: row.seasonLabel, precision: 'season' },
      seasonLabel: row.seasonLabel,
      span: seasonSpan(row.seasonLabel),
      attrs: { text: row.noteHe ?? null, result: row.result },
      sourceIds: src,
      confidence,
      search: [row.seasonLabel],
    })
    if (entities.has(seasonId(row.seasonLabel))) {
      addEdge({ type: 'won_in', from: id, to: seasonId(row.seasonLabel), sourceIds: src, confidence, derivation: 'row', evidence: { file: 'content/manual/trophies.json', key: id } })
    }
    // the final that decided it — the one match of that competition, season and stage
    const finals = master.matches.filter(
      (m) => entities.has(m.matchId) && m.sport === 'football' && m.season === row.seasonLabel && m.competition === row.competitionSlug && m.stage === 'גמר',
    )
    if (finals.length === 1) {
      const final = finals[0] as MatchRecord
      addEdge({ type: 'final_of', from: final.matchId, to: id, sourceIds: [...final.sourceIds, ...src], confidence: 2, derivation: 'join', evidence: { file: 'content/manual/trophies.json', key: `${id}|${final.matchId}` } })
    }
  }

  /* ------------------------------------------------------------------ kits (Kit Master) */

  const kitDesigns = fileSource('content/manual/kit-designs.json')
  for (const kit of kitMaster.kits) {
    const base = kit.fields.base
    const confidence = base?.confidence ?? 2
    // A kit is its season and its variant here — never its maker, sponsor or crest: those
    // are gate 4's answers (rule 24's "a locked shirt shows nothing", kept in gate 12 too).
    addEntity({
      id: kit.id,
      type: 'kit',
      kind: kit.variant,
      sport: 'football',
      titleHe: kit.seasonLabel,
      year: seasonStart(kit.seasonLabel),
      date: { value: kit.seasonLabel, precision: 'season' },
      seasonLabel: kit.seasonLabel,
      span: seasonSpan(kit.seasonLabel),
      attrs: { variant: kit.variant, playable: kit.gate4.playable },
      sourceIds: kitDesigns ? [kitDesigns] : [],
      confidence,
      aliases: [kit.legacyKey, `kit:${kit.legacyKey}`],
      search: [kit.seasonLabel],
    })
    if (kitDesigns && entities.has(seasonId(kit.seasonLabel))) {
      addEdge({ type: 'worn_in', from: kit.id, to: seasonId(kit.seasonLabel), sourceIds: [kitDesigns], confidence, derivation: 'row', evidence: { file: 'content/generated/kit-master.json', key: kit.id } })
    }
  }

  /* ------------------------------------------------------------------ crests */

  const crestsFile = read('content/manual/crest-versions.json') as ManualFile
  const crestRows = crestsFile.records.filter((row) => (row.sport ?? 'football') === 'football' && confOf(row, crestsFile) >= FLOOR)
  const crestClaims = new Map<number, number>()
  for (const row of crestRows) {
    const to = row.toYear ?? latestSeason
    for (let y = row.fromYear; y <= to; y += 1) crestClaims.set(y, (crestClaims.get(y) ?? 0) + 1)
  }
  for (const row of crestRows) {
    const id = `crest:${row.fromYear}`
    const confidence = confOf(row, crestsFile)
    const src = rowSource('content/manual/crest-versions.json', row, 'club')
    const to = row.toYear ?? latestSeason
    addEntity({
      id,
      type: 'object',
      kind: 'crest',
      sport: 'football',
      titleHe: row.nameHe,
      year: row.fromYear,
      date: { value: String(row.fromYear), precision: 'year' },
      seasonLabel: null,
      span: { from: `${row.fromYear}-01-01`, to: `${to}-12-31` },
      attrs: {
        fromYear: row.fromYear,
        toYear: row.toYear ?? null,
        text: row.changeHe ?? null,
        note: row.noteHe ?? null,
        imageKey: row.imageKey ?? null,
        stars: row.stars ?? 0,
      },
      sourceIds: src,
      confidence,
      search: [String(row.fromYear)],
    })
    for (let y = row.fromYear; y <= to; y += 1) {
      const label = seasonLabelOf(y)
      if (!entities.has(seasonId(label))) continue
      addEdge({
        type: 'crest_of',
        from: id,
        to: seasonId(label),
        sourceIds: src,
        confidence,
        derivation: 'range',
        evidence: { file: 'content/manual/crest-versions.json', key: `${row.fromYear}|${label}` },
        // a boundary year two crests claim is not a fact about either
        forceLow: (crestClaims.get(y) ?? 0) > 1,
      })
    }
  }

  /* ------------------------------------------------------------------ makers & sponsors */

  const makersFile = read('content/manual/manufacturers.json') as ManualFile
  const supplyFile = read('content/manual/kit-supply.json') as ManualFile
  const spansOf = (rows: Row[]) =>
    rows
      .map((row) => ({ row, from: seasonStart(row.fromLabel), to: row.toLabel ? seasonStart(row.toLabel) : latestSeason }))
      .filter((s): s is { row: Row; from: number; to: number } => s.from !== null && s.to !== null)
  for (const maker of makersFile.records) {
    const spells = spansOf(supplyFile.records.filter((row) => row.manufacturerSlug === maker.slug && confOf(row, supplyFile) >= FLOOR))
    const id = `maker:${maker.slug}`
    const from = spells.reduce((min, s) => Math.min(min, s.from), 9999)
    const to = spells.reduce((max, s) => Math.max(max, s.to), 0)
    addEntity({
      id,
      type: 'object',
      kind: 'maker',
      sport: 'football',
      titleHe: maker.nameHe,
      year: spells.length ? from : null,
      date: null,
      seasonLabel: null,
      span: spells.length ? { from: `${from}-07-01`, to: `${to + 1}-06-30` } : null,
      attrs: { nameEn: maker.nameEn ?? null, spells: spells.map((s) => `${seasonLabelOf(s.from)}–${seasonLabelOf(s.to)}`) },
      sourceIds: fileSource('content/manual/kit-supply.json') ? [fileSource('content/manual/kit-supply.json') as string] : [],
      confidence: 2,
      aliases: spells.map((s) => `kit:${maker.slug}:${s.row.fromLabel}`),
      search: [maker.nameEn ?? '', maker.slug],
    })
    for (const spell of spells) {
      for (let y = spell.from; y <= spell.to; y += 1) {
        const label = seasonLabelOf(y)
        if (!entities.has(seasonId(label))) continue
        addEdge({ type: 'supplied', from: id, to: seasonId(label), sourceIds: rowSource('content/manual/kit-supply.json', spell.row), confidence: confOf(spell.row, supplyFile), derivation: 'range', evidence: { file: 'content/manual/kit-supply.json', key: `${maker.slug}|${spell.row.fromLabel}` } })
      }
    }
  }

  const sponsorsFile = read('content/manual/sponsors.json') as ManualFile
  const dealsFile = read('content/manual/sponsor-deals.json') as ManualFile
  for (const sponsor of sponsorsFile.records) {
    const rows = dealsFile.records.filter((row) => row.sponsorSlug === sponsor.slug)
    const spells = spansOf(rows.filter((row) => confOf(row, dealsFile) >= FLOOR))
    if (rows.length > spells.length) refuse('content/manual/sponsor-deals.json', 'deal below confidence 2 or undated', rows.length - spells.length)
    if (spells.length === 0) continue
    const id = `sponsor:${sponsor.slug}`
    const from = spells.reduce((min, s) => Math.min(min, s.from), 9999)
    const to = spells.reduce((max, s) => Math.max(max, s.to), 0)
    addEntity({
      id,
      type: 'object',
      kind: 'sponsor',
      sport: 'football',
      titleHe: sponsor.nameHe,
      year: from,
      date: null,
      seasonLabel: null,
      span: { from: `${from}-07-01`, to: `${to + 1}-06-30` },
      attrs: { nameEn: sponsor.nameEn ?? null, industry: sponsor.industry ?? null, spells: spells.map((s) => `${seasonLabelOf(s.from)}–${seasonLabelOf(s.to)}`) },
      sourceIds: [...new Set(spells.flatMap((s) => rowSource('content/manual/sponsor-deals.json', s.row)))].sort(byCodePoint),
      confidence: 2,
      search: [sponsor.nameEn ?? '', sponsor.slug.replace(/-/g, ' ')],
    })
    for (const spell of spells) {
      for (let y = spell.from; y <= spell.to; y += 1) {
        const label = seasonLabelOf(y)
        if (!entities.has(seasonId(label))) continue
        addEdge({ type: 'sponsored', from: id, to: seasonId(label), sourceIds: rowSource('content/manual/sponsor-deals.json', spell.row), confidence: confOf(spell.row, dealsFile), derivation: 'range', evidence: { file: 'content/manual/sponsor-deals.json', key: `${sponsor.slug}|${spell.row.fromLabel ?? ''}` } })
      }
    }
  }

  /* ------------------------------------------------------------------ the terrace */

  const fansFile = read('content/manual/fan-culture.json') as ManualFile
  for (const row of fansFile.records) {
    const confidence = confOf(row, fansFile)
    if (confidence < FLOOR || (row.sport ?? 'football') !== 'football') continue
    const id = `fans:${row.slug}`
    addEntity({
      id,
      type: 'fans',
      kind: row.category,
      sport: 'football',
      titleHe: row.titleHe,
      year: null,
      date: null,
      seasonLabel: null,
      span: null,
      attrs: { text: row.descriptionHe ?? null, location: row.locationHe ?? null, period: row.periodHe ?? null },
      sourceIds: rowSource('content/manual/fan-culture.json', row, 'wiki'),
      confidence,
    })
    // the one place the row itself names ("שער 5, בלומפילד") — an exact venue spelling only
    for (const part of String(row.locationHe ?? '').split(/[,;]/)) {
      const place = venueOf(part.trim(), 'football')
      if (place) addEdge({ type: 'home_of', from: id, to: place, sourceIds: rowSource('content/manual/fan-culture.json', row, 'wiki'), confidence, derivation: 'row', evidence: { file: 'content/manual/fan-culture.json', key: row.slug } })
    }
  }
  const groupsFile = read('content/manual/fan-groups.json') as ManualFile
  const groupByName = new Map<string, string>()
  for (const row of groupsFile.records) {
    const confidence = confOf(row, groupsFile)
    if (confidence < FLOOR) continue
    const id = `fans:${row.slug}`
    addEntity({
      id,
      type: 'fans',
      kind: 'group',
      sport: 'football',
      titleHe: row.nameHe,
      year: row.foundedYear ?? null,
      date: row.foundedYear ? { value: String(row.foundedYear), precision: 'year' } : null,
      seasonLabel: null,
      span: null,
      attrs: { text: row.noteHe ?? null, stand: row.standHe ?? null, formerName: row.formerNameHe ?? null },
      sourceIds: rowSource('content/manual/fan-groups.json', row, 'fans'),
      confidence,
      search: [row.formerNameHe ?? '', row.standHe ?? ''],
    })
    groupByName.set(fold(row.nameHe).toLowerCase(), id)
  }

  const songsFile = read('content/manual/songs.json') as ManualFile
  for (const row of songsFile.records) {
    const confidence = confOf(row, songsFile)
    if (confidence < FLOOR || (row.sport ?? 'football') !== 'football') {
      refuse('content/manual/songs.json', 'song below confidence 2')
      continue
    }
    const id = `song:${row.slug}`
    const src = rowSource('content/manual/songs.json', row, 'wiki')
    // metadata only — a title, a tune, a subject. Never a verse (rule 12).
    addEntity({
      id,
      type: 'song',
      kind: row.songType,
      sport: 'football',
      titleHe: row.titleHe,
      year: seasonStart(row.seasonLabel),
      date: row.seasonLabel ? { value: row.seasonLabel, precision: 'season' } : null,
      seasonLabel: row.seasonLabel ?? null,
      span: null,
      attrs: { originalTitle: row.originalTitle ?? null, originalArtist: row.originalArtist ?? null, lyricsBy: row.lyricsAuthorHe ?? null },
      sourceIds: src,
      confidence,
      search: [row.originalTitle ?? '', row.originalArtist ?? '', row.personNameHe ?? ''],
    })
    if (row.personNameHe) {
      const person = resolvePerson(row.personNameHe)
      if (person) addEdge({ type: 'song_about', from: id, to: person, sourceIds: src, confidence, derivation: 'row', evidence: { file: 'content/manual/songs.json', key: row.slug } })
      else miss('content/manual/songs.json', row.personNameHe, 'name does not resolve in the Player Master')
    }
    if (row.seasonLabel && entities.has(seasonId(row.seasonLabel))) {
      addEdge({ type: 'in_season', from: id, to: seasonId(row.seasonLabel), sourceIds: src, confidence, derivation: 'row', evidence: { file: 'content/manual/songs.json', key: row.slug } })
    }
    if (row.lyricsAuthorHe) {
      const group = groupByName.get(fold(row.lyricsAuthorHe).toLowerCase())
      if (group) addEdge({ type: 'written_by', from: id, to: group, sourceIds: src, confidence, derivation: 'row', evidence: { file: 'content/manual/songs.json', key: row.slug } })
    }
  }

  /* ------------------------------------------------------------------ who played when */

  // Per (person, season): which files say so, the strongest row, and a shirt number where
  // a source ties one to that season. Squad lists are confidence 1 on their own — they
  // only ever CONFIRM a season another source states (spec §3: "162 confirmed by 2+").
  type Played = { files: Set<string>; conf: number; sourceIds: Set<string>; numbers: Set<number>; disputed: boolean }
  const played = new Map<string, Played>()
  const note = (person: string, season: string, file: string, conf: number, sourceId: string | null, number?: number, disputed = false) => {
    const key = `${person}|${season}`
    const row = played.get(key) ?? { files: new Set(), conf: 0, sourceIds: new Set(), numbers: new Set(), disputed: false }
    row.files.add(file)
    row.conf = Math.max(row.conf, conf)
    if (sourceId) row.sourceIds.add(sourceId)
    if (typeof number === 'number') row.numbers.add(number)
    row.disputed = row.disputed || disputed
    played.set(key, row)
  }
  for (const p of players.players) {
    for (const n of p.shirtNumbers) {
      if (!n.historical) continue
      const src = n.source.sourceTitle
        ? addSource(`content/manual/${n.source.file}`, n.source.sourceUrl ?? null, n.source.sourceTitle, 'wiki', null)
        : peopleSource(n.source.file)
      note(p.id, n.seasonLabel, n.source.file, n.disputed ? 1 : 2, src, n.number, n.disputed === true)
    }
  }
  const factsFile = read('content/manual/player-facts-seasons.json') as ManualFile
  for (const row of factsFile.records) {
    const person = resolvePerson(row.personNameHe)
    if (!person) {
      miss('content/manual/player-facts-seasons.json', row.personNameHe, 'name does not resolve in the Player Master')
      continue
    }
    for (const season of row.seasons as string[]) note(person, season, 'player-facts-seasons.json', confOf(row, factsFile), fileSource('content/manual/player-facts-seasons.json'))
  }
  const squadsFile = read('content/manual/squads.json') as ManualFile
  for (const row of squadsFile.records) {
    if (row.clubSlug && row.clubSlug !== US) continue
    const person = resolvePerson(row.personName)
    if (!person) {
      miss('content/manual/squads.json', row.personName, 'name does not resolve in the Player Master')
      continue
    }
    note(person, row.seasonLabel, 'squads.json', confOf(row, squadsFile), rowSource('content/manual/squads.json', row, 'wiki')[0] ?? null, typeof row.shirtNumber === 'number' && confOf(row, squadsFile) >= FLOOR ? row.shirtNumber : undefined)
  }
  for (const [key, row] of [...played.entries()].sort((a, b) => byCodePoint(a[0], b[0]))) {
    const [person, season] = key.split('|') as [string, string]
    if (!entities.has(seasonId(season)) || !entities.has(person)) continue
    const agreeing = row.files.size
    if (row.conf < FLOOR && agreeing < 2) {
      refuse('content/manual/squads.json', 'a season only a confidence-1 squad list states')
      continue
    }
    const numbers = [...row.numbers].sort((a, b) => a - b)
    const number = numbers.length === 1 ? numbers[0] : undefined
    addEdge({
      type: 'played_in',
      from: person,
      to: seasonId(season),
      sourceIds: [...row.sourceIds].sort(byCodePoint),
      confidence: agreeing >= 2 ? 3 : row.conf,
      derivation: agreeing >= 2 ? 'join' : 'row',
      evidence: { file: `content/manual/${[...row.files].sort(byCodePoint).join('+')}`, key },
      ...(number !== undefined ? { params: { n: number }, labelKey: 'graph.rel.wore', inverseLabelKey: 'graph.rel.wore.inv' } : {}),
      forceLow: row.disputed && agreeing < 2,
    })
  }

  /* ------------------------------------------------------------------ the press (confidence 1) */

  const pressFile = read('content/manual/press-columns.json') as ManualFile
  const pressSource = fileSource('content/manual/press-columns.json')
  for (const row of pressFile.records) {
    const id = `column:${row.slug}`
    const day = row.publishedOn as string
    addEntity({
      id,
      type: 'press',
      kind: 'column',
      sport: 'football',
      titleHe: row.titleHe,
      year: Number(day.slice(0, 4)),
      date: { value: day, precision: 'day' },
      seasonLabel: seasonOfDate(day),
      span: { from: day, to: day },
      // the one quotation stays in press-columns.json, read by slug — never copied (rule 12)
      attrs: { byline: row.bylineHe, words: row.words },
      sourceIds: pressSource ? [pressSource] : [],
      confidence: confOf(row, pressFile),
      search: [row.bylineHe],
    })
    if (!pressSource) continue
    const season = seasonOfDate(day)
    if (season && entities.has(seasonId(season))) {
      addEdge({ type: 'published', from: id, to: seasonId(season), sourceIds: [pressSource], confidence: 1, derivation: 'temporal', evidence: { file: 'content/manual/press-columns.json', key: row.slug }, forceLow: true })
    }
    // a column on the day of a match, or the morning after it — a coincidence of dates,
    // never a claim that the piece is ABOUT the match: always `low`
    const before = new Date(`${day}T00:00:00Z`)
    before.setUTCDate(before.getUTCDate() - 1)
    const dayBefore = before.toISOString().slice(0, 10)
    for (const candidate of [day, dayBefore]) {
      const list = (matchesByDay.get(candidate) ?? []).filter((m) => entities.has(m.matchId))
      if (list.length !== 1) continue
      addEdge({ type: 'reported', from: id, to: (list[0] as MatchRecord).matchId, sourceIds: [pressSource], confidence: 1, derivation: 'temporal', evidence: { file: 'content/manual/press-columns.json', key: `${row.slug}|${candidate}` }, forceLow: true })
      break
    }
  }

  /* ------------------------------------------------------------------ memory-shelf ids the graph does not hold */

  // `election:` pairs are the Ussishkin association's (basketball, rule 17) — not football
  // history, so the graph names them rather than guessing a home for them.
  miss('lib/game/memory.ts', 'election:*', 'Ussishkin association elections are outside the football graph')

  /* ------------------------------------------------------------------ degree, order */

  for (const edge of edges.values()) {
    if (edge.confidence === 'low') continue
    const a = entities.get(edge.from)
    const b = entities.get(edge.to)
    if (a) a.degree += 1
    if (b) b.degree += 1
  }

  const entityList = [...entities.values()].sort((a, b) => byCodePoint(a.id, b.id))
  const edgeList = [...edges.values()].sort((a, b) => byCodePoint(a.id, b.id))
  const aliasList = [...aliases.entries()].filter(([, id]) => id !== '').sort((a, b) => byCodePoint(a[0], b[0]))

  const byType = (type: EntityType) => entityList.filter((e) => e.type === type).length
  const counts: Record<string, number> = {
    entities: entityList.length,
    edges: edgeList.length,
    edgesHigh: edgeList.filter((e) => e.confidence === 'high').length,
    edgesMedium: edgeList.filter((e) => e.confidence === 'medium').length,
    edgesLow: edgeList.filter((e) => e.confidence === 'low').length,
    basketball: entityList.filter((e) => e.sport === 'basketball').length,
    sources: sources.size,
    aliases: aliasList.length,
  }
  for (const type of ['person', 'match', 'season', 'team', 'place', 'kit', 'trophy', 'press', 'moment', 'object', 'song', 'fans'] as EntityType[]) {
    counts[`type.${type}`] = byType(type)
  }
  const edgeTypes = [...new Set(edgeList.map((e) => e.type))].sort(byCodePoint)
  for (const type of edgeTypes) counts[`edge.${type}`] = edgeList.filter((e) => e.type === type).length

  const report: GraphReport = {
    counts: {
      isolated: entityList.filter((e) => e.degree === 0).length,
      atVenueJoined: edgeList.filter((e) => e.type === 'at_venue' && e.derivation === 'join').length,
    },
    unresolved: [...unresolved.values()].sort((a, b) => b.count - a.count || byCodePoint(`${a.file}|${a.what}`, `${b.file}|${b.what}`)),
    refused: [...refused.values()].sort((a, b) => byCodePoint(`${a.file}|${a.reason}`, `${b.file}|${b.reason}`)),
    conflicts: conflicts.sort((a, b) => byCodePoint(a.entityId, b.entityId)),
  }

  const out: EntityGraphFile = {
    schemaVersion: 1,
    inputsSha: graphInputsSha(root),
    inputs: [...GRAPH_INPUTS],
    counts,
    entities: entityList,
    edges: edgeList,
    sources: Object.fromEntries([...sources.entries()].sort((a, b) => byCodePoint(a[0], b[0]))),
    aliases: Object.fromEntries(aliasList),
    report,
  }
  return { out, problems }
}

/**
 * One row per line — readable diffs — in the compact codec of `lib/archive/graph-types.ts`
 * (edges as tuples, entities without what they can derive). The reader expands it.
 */
export function serialiseGraph(out: EntityGraphFile): string {
  const compact = compactGraph(out)
  const lines: string[] = ['{']
  const entries = Object.entries(compact)
  entries.forEach(([key, value], index) => {
    const comma = index < entries.length - 1 ? ',' : ''
    if (Array.isArray(value) && key !== 'edgeColumns' && key !== 'inputs') {
      if (value.length === 0) {
        lines.push(`${JSON.stringify(key)}:[]${comma}`)
        return
      }
      lines.push(`${JSON.stringify(key)}:[`)
      value.forEach((item, i) => lines.push(`${JSON.stringify(item)}${i < value.length - 1 ? ',' : ''}`))
      lines.push(`]${comma}`)
    } else {
      lines.push(`${JSON.stringify(key)}:${JSON.stringify(value)}${comma}`)
    }
  })
  lines.push('}')
  return `${lines.join('\n')}\n`
}

function main(): void {
  const { out, problems } = buildGraph(process.cwd())
  if (problems.length > 0) {
    for (const problem of problems) console.error(`PROBLEM: ${problem}`)
    process.exitCode = 1
    return
  }
  const path = join(process.cwd(), OUT)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, serialiseGraph(out), 'utf8')
  console.log(JSON.stringify(out.counts))
}

if (process.argv[1] && /build-graph\.ts$/.test(process.argv[1])) main()
