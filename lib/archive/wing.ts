import 'server-only'

import { kitRecord } from '@/lib/kit/kit-master'

import { linksForEntity } from '@/lib/links'
import { actionsFor } from '@/lib/links/actions'

import pressFile from '@/content/manual/press-columns.json'
import {
  beforeAfter,
  boxPool,
  cardOf,
  countsOf,
  describe,
  entity,
  graph,
  inSeason,
  matchRecordOf,
  neighbors,
  personRecordOf,
  pressQuote,
  rabbitStep,
  related,
  search,
  sourceOf,
  today,
} from '@/lib/archive/graph'
import {
  walkable,
  type ArchiveCard,
  type EntityDetail,
  type EntityType,
  type GraphEntity,
  type SourceLine,
  type WhatBlock,
} from '@/lib/archive/graph-types'
import { archive, rng, shuffle } from '@/lib/game/archive'
import { positionOf, takeFrom } from '@/lib/rotation/deck'

/**
 * שער 12 — אגף הארכיון. Two corners, both read-models (rule 1).
 *
 * The wing exists because the archive finally holds something dated enough to answer a
 * question about TODAY: 1,385 press columns from ויקיפועל's "בשער" series, every one
 * with a full ISO date, beside 3,068 dated matches. Nothing here is a new dataset —
 * `content/manual/press-columns.json` is the ingest's output and everything else is the
 * canon the whole app reads.
 *
 * ## היום לפני
 *
 * What happened on today's date, from the archive, or **nothing**. A wing that invents
 * an anniversary is worse than one that says the archive holds nothing for today, so
 * `empty` is a real state with its own sentence and the screen prints it (rule 11).
 *
 * **Trophies are not in it, and that is a decision rather than an omission.** A trophy
 * row carries a SEASON (`1999/00`, `1938`) and no day. "On this day the club won the
 * double" would be a date this archive does not hold — the exact shape of invention this
 * project refuses — so the corner answers from the two tables that carry a day.
 *
 * ## הידעת
 *
 * A fact with its source on screen (rule 16 — bring the source, never the bare claim).
 * The deck is built from rows that carry one: a press column, a curated moment, a
 * season the club won something in. Every card names where it came from.
 *
 * **A press column is somebody's copyrighted writing.** The card shows the headline, the
 * date, the byline and the ONE short quotation the ingest cut — and there is no second
 * quotation anywhere in the file it reads, so a piece cannot be reassembled across
 * several cards (rule 12, applied to journalism; the guarantee is structural and lives
 * in `scripts/ingest/sources/vikipoel-turim.ts`).
 *
 * ## The rotation
 *
 * Rule 24's standing demand — a different deal per visit, and a different one again the
 * same day — through `lib/rotation/deck.ts` and nothing of its own: the seed picks the
 * shuffle, the cursor walks the deck, and `PlayLink` on the wall steps the cursor on
 * every entry. Nothing repeats until the deck is used up, and the deal is reproducible
 * from the two numbers in the URL.
 */

export type PressColumnRow = {
  slug: string
  pageHe: string
  publishedOn: string
  decade: number
  titleHe: string
  bylineHe: string
  quoteHe: string | null
  quoteFrom: 'pull' | 'opening' | null
  words: number
  confidence: number
  sourceTitle: string
  sourceUrl: string
}

export const pressColumns: PressColumnRow[] = (
  pressFile as { records: PressColumnRow[] }
).records

/* --------------------------------------------------------------- היום לפני */

export type DayMatch = {
  playedOn: string
  year: number
  seasonLabel: string
  homeHe: string
  awayHe: string
  homeScore: number | null
  awayScore: number | null
  competitionHe: string
  sourceTitle: string
  sourceUrl: string | null
}

export type DayColumn = {
  slug: string
  publishedOn: string
  year: number
  titleHe: string
  bylineHe: string
  quoteHe: string | null
  words: number
  sourceTitle: string
  sourceUrl: string
}

export type OnThisDay = {
  /** the `MM-DD` the archive was asked about */
  monthDay: string
  matches: DayMatch[]
  columns: DayColumn[]
  /** true when the archive holds nothing at all for this date — a real answer */
  empty: boolean
}

const clubName = new Map(archive.clubs.map((row) => [row.slug, row.nameHe]))
const competitionName = new Map(archive.competitions.map((row) => [row.slug, row.nameHe]))

/**
 * What the archive holds for one day of the year.
 *
 * The date is a parameter, never `new Date()` inside the model: a read-model that reads
 * the clock cannot be tested, and the one thing this corner must be is checkable on a
 * day when the archive is empty.
 */
export function onThisDay(isoDate: string): OnThisDay {
  const monthDay = isoDate.slice(5, 10)

  const matches: DayMatch[] = archive.matches
    .filter((row) => typeof row.playedOn === 'string' && row.playedOn.slice(5, 10) === monthDay)
    .map((row) => ({
      playedOn: row.playedOn as string,
      year: Number((row.playedOn as string).slice(0, 4)),
      seasonLabel: row.seasonLabel,
      homeHe: clubName.get(row.homeClubSlug) ?? row.homeClubSlug,
      awayHe: clubName.get(row.awayClubSlug) ?? row.awayClubSlug,
      homeScore: row.homeScore ?? null,
      awayScore: row.awayScore ?? null,
      competitionHe: competitionName.get(row.competitionSlug) ?? row.competitionSlug,
      sourceTitle: row.sourceTitle,
      sourceUrl: row.sourceUrl,
    }))
    .sort((a, b) => b.year - a.year)

  const columns: DayColumn[] = pressColumns
    .filter((row) => row.publishedOn.slice(5, 10) === monthDay)
    .map((row) => ({
      slug: row.slug,
      publishedOn: row.publishedOn,
      year: Number(row.publishedOn.slice(0, 4)),
      titleHe: row.titleHe,
      bylineHe: row.bylineHe,
      quoteHe: row.quoteHe,
      words: row.words,
      sourceTitle: row.sourceTitle,
      sourceUrl: row.sourceUrl,
    }))
    .sort((a, b) => b.year - a.year)

  return { monthDay, matches, columns, empty: matches.length === 0 && columns.length === 0 }
}

/* ------------------------------------------------------------------ הידעת */

export type FactKind = 'column' | 'moment' | 'trophy'

export type FactCard = {
  /** unique across the whole deck, and checked — rule 31 */
  id: string
  kind: FactKind
  /** the heading of the card */
  titleHe: string
  /** the fact itself, in the archive's own words where it has any */
  bodyHe: string | null
  /** a press column's one short quotation. Never more than one per column. */
  quoteHe: string | null
  /** who wrote it, where the source names a person or a paper */
  bylineHe: string | null
  /** the date or the season, as the archive holds it — never both, never invented */
  whenHe: string
  sourceTitle: string
  sourceUrl: string | null
}

const HE_MONTHS = [
  'בינואר',
  'בפברואר',
  'במרץ',
  'באפריל',
  'במאי',
  'ביוני',
  'ביולי',
  'באוגוסט',
  'בספטמבר',
  'באוקטובר',
  'בנובמבר',
  'בדצמבר',
]

/** `1986-05-23` → `23 במאי 1986`. A date the archive holds, spelled out. */
export function longDateHe(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number) as [number, number, number]
  return `${day} ${HE_MONTHS[month - 1]} ${year}`
}

let deckCache: FactCard[] | null = null

/** Everything the wing can deal, built once. */
export function factDeck(): FactCard[] {
  if (deckCache) return deckCache
  const cards: FactCard[] = []

  for (const column of pressColumns) {
    // A column with no quotation is still a card: a headline, a date and a name are a
    // fact about the archive. What it is not is an excuse to go and find more text.
    cards.push({
      id: `column:${column.slug}`,
      kind: 'column',
      titleHe: column.titleHe,
      bodyHe: null,
      quoteHe: column.quoteHe,
      bylineHe: column.bylineHe,
      whenHe: longDateHe(column.publishedOn),
      sourceTitle: column.sourceTitle,
      sourceUrl: column.sourceUrl,
    })
  }

  for (const moment of archive.moments) {
    cards.push({
      id: `moment:${moment.slug}`,
      kind: 'moment',
      titleHe: moment.titleHe,
      bodyHe: moment.bodyHe,
      quoteHe: null,
      bylineHe: null,
      whenHe: moment.happenedOn ? longDateHe(moment.happenedOn) : '',
      sourceTitle: moment.sourceTitle,
      sourceUrl: moment.sourceUrl,
    })
  }

  for (const trophy of archive.trophies) {
    if (trophy.result !== 'won') continue
    if (trophy.sport !== undefined && trophy.sport !== 'football') continue
    cards.push({
      id: `trophy:${trophy.competitionSlug}:${trophy.seasonLabel}`,
      kind: 'trophy',
      titleHe: competitionName.get(trophy.competitionSlug) ?? trophy.competitionSlug,
      bodyHe: trophy.noteHe ?? null,
      quoteHe: null,
      bylineHe: null,
      // A trophy row holds a SEASON and no day, so the card says a season. Dressing it
      // as a date would be inventing the one field the source did not write.
      whenHe: trophy.seasonLabel,
      sourceTitle: trophy.sourceTitle,
      sourceUrl: trophy.sourceUrl,
    })
  }

  deckCache = cards
  return cards
}

export const DEAL_SIZE = 6

/**
 * The deal — `size` cards from this device's place in this shuffle of the deck.
 *
 * Pure arithmetic over `lib/rotation/deck.ts`, exactly like every other gate: no second
 * rotation engine, no `Math.random()` inside a deal, and the same two numbers always
 * produce the same cards.
 */
export function dealFacts(
  seed: number,
  cursor: number,
  size: number = DEAL_SIZE,
): { cards: FactCard[]; cycle: number; slices: number } {
  const pool = factDeck()
  const position = positionOf(seed, cursor, pool.length, size)
  const shuffled = shuffle(pool, rng(position.seed))
  return {
    cards: takeFrom(shuffled, position.slot * size, size),
    cycle: position.cycle,
    slices: position.slices,
  }
}

/** What the wing holds, counted — printed on the screen rather than promised. */
export function archiveFigures(): {
  columns: number
  datedMatches: number
  moments: number
  trophies: number
  earliest: string | null
  latest: string | null
} {
  const dates = pressColumns.map((row) => row.publishedOn).sort()
  return {
    columns: pressColumns.length,
    datedMatches: archive.matches.filter((row) => typeof row.playedOn === 'string').length,
    moments: archive.moments.length,
    trophies: archive.trophies.filter((row) => row.result === 'won').length,
    earliest: dates[0] ?? null,
    latest: dates[dates.length - 1] ?? null,
  }
}

/* ================================================================ שער 12 v10 — the graph wing */

/**
 * **21.9.2026 — the wing walks the Entity Graph.** The two corners above stay (their
 * tests are the contract for the day and the deal), and five Today chips, the dig box,
 * the drawer, the rabbit hole and the search are read-models over `lib/archive/graph.ts`.
 * Every card is an `ArchiveCard` projection; every chip is dealt through
 * `lib/rotation/deck.ts` like every other gate (rule 24 — never `Math.random`).
 */

export type TodayChip = 'today' | 'know' | 'shelf' | 'forgotten' | 'discover'
export const TODAY_CHIPS: readonly TodayChip[] = ['today', 'know', 'shelf', 'forgotten', 'discover']
export const CHIP_SIZE = 8

/** A seeded slice of a pool: the seed picks the shuffle, the cursor walks it (lib/rotation/deck.ts). */
function rotateDeal<T>(pool: readonly T[], seed: number, cursor: number, size: number, salt: number): T[] {
  if (pool.length === 0) return []
  const at = positionOf(seed ^ salt, cursor, pool.length, Math.min(size, pool.length))
  return takeFrom(shuffle(pool, rng(at.seed)), at.slot * Math.min(size, pool.length), Math.min(size, pool.length))
}

let shelfCache: GraphEntity[] | null = null
/** מהמדף — a shirt, a crest, a maker's mark, a song, the terrace, a column that carries a quote. */
export function shelfPool(): GraphEntity[] {
  return (shelfCache ??= graph.entities.filter(
    (e) =>
      e.sport === 'football' &&
      (e.type === 'kit' ||
        e.type === 'object' ||
        e.type === 'song' ||
        e.type === 'fans' ||
        (e.type === 'press' && (pressQuote(e)?.quote ?? null) !== null)),
  ))
}

let forgottenCache: GraphEntity[] | null = null
/**
 * שם ששכחת — a player with one or two seasons the archive confirms (confidence ≥2), who
 * also scored a documented goal or wore a documented number, and is not in today's squad.
 */
export function forgottenPool(): GraphEntity[] {
  return (forgottenCache ??= graph.entities.filter((e) => {
    if (e.type !== 'person' || e.kind !== 'player' || e.attrs.currentSquad === true) return false
    const edges = neighbors(e.id)
    const seasons = edges.filter(({ edge }) => edge.type === 'played_in')
    if (seasons.length < 1 || seasons.length > 2) return false
    return edges.some(({ edge }) => edge.type === 'scored' || (edge.type === 'played_in' && edge.params?.n !== undefined))
  }))
}

let discoverCache: GraphEntity[] | null = null
/** גלה לי משהו — anything with three or more real connections (a match needs five: its season, opponent and ground are three). */
export function discoverPool(): GraphEntity[] {
  return (discoverCache ??= graph.entities.filter(
    (e) =>
      e.sport === 'football' &&
      e.type !== 'press' &&
      e.type !== 'season' &&
      e.type !== 'team' &&
      e.degree >= (e.type === 'match' ? 5 : 3),
  ))
}

/** The five Today decks, dealt for one visit (`seed`, `cursor`) on one date. */
export function todayDecks(isoDate: string, seed: number, cursor: number): Record<TodayChip, ArchiveCard[]> {
  const day = today(isoDate)
  const dayCards = day.length > 12 ? rotateDeal(day, seed, cursor, 12, 0x1d).sort((a, b) => (b.year ?? 0) - (a.year ?? 0)) : day
  const know = describe(dealFacts(seed, cursor, CHIP_SIZE).cards.map((card) => card.id)).cards
  return {
    today: dayCards.map(cardOf),
    know,
    shelf: rotateDeal(shelfPool(), seed, cursor, CHIP_SIZE, 0x5e).map(cardOf),
    forgotten: rotateDeal(forgottenPool(), seed, cursor, CHIP_SIZE, 0xf0).map(cardOf),
    discover: rotateDeal(discoverPool(), seed, cursor, CHIP_SIZE, 0xd1).map(cardOf),
  }
}

/** The dig box: eight things off the table, seeded by visit and shuffle count, optionally one decade. */
export function boxDeal(seed: number, decade: number | null, round: number): ArchiveCard[] {
  return rotateDeal(boxPool(decade), seed + round * 7919, 0, 8, 0xb0).map(cardOf)
}

/**
 * הערימה על השיש (21.9.2026) — THE WORKER LIFE's kitchen: the same box, cut to what a boy
 * could have found in a pile of old papers at home — a match, a moment, a column, a trophy,
 * a song — dated before `before`. A row the archive does not date is not in the pile.
 */
export function lifeBox(seed: number, before: number, round = 0): ArchiveCard[] {
  const pile = boxPool(null).filter(
    (e) => e.year !== null && e.year < before && ['match', 'moment', 'press', 'trophy', 'song', 'fans'].includes(e.type),
  )
  return rotateDeal(pile, seed + round * 7919, 0, 6, 0x11fe).map(cardOf)
}

/** one card's "what happened", for the kitchen — its own text only, never a list that reaches past `before` */
export function lifeWhat(anyId: string, before: number): { card: ArchiveCard; what: WhatBlock | null } | null {
  const detail = detailOf(anyId)
  if (!detail || detail.card.year === null || detail.card.year >= before) return null
  const what = detail.what.kind === 'text' || detail.what.kind === 'quote' || detail.what.kind === 'match' ? detail.what : null
  return { card: detail.card, what }
}

/** A season's hub — the time machine's answer, trophies and moments first. */
export function seasonCards(label: string): ArchiveCard[] {
  return inSeason(label).slice(0, 40).map(cardOf)
}

const VARIANT_ORDER: Record<string, number> = { home: 0, away: 1, third: 2, gk: 3 }

/**
 * הארון המלא — every canonical kit the archive holds, one card each, oldest first and home
 * before away inside a season. `/archive?show=kits` (Gate 5's "full collection"). It reads the
 * graph's own kit entities — which the graph builds from the Kit Master — so there is no
 * second historical-kit list to drift (`tests/kit-collection-route.test.ts` holds the two equal).
 */
export function kitShelf(): ArchiveCard[] {
  return graph.entities
    .filter((e) => e.type === 'kit' && e.sport === 'football')
    .sort(
      (a, b) =>
        (a.year ?? 0) - (b.year ?? 0) ||
        (VARIANT_ORDER[String(a.attrs.variant ?? a.kind)] ?? 9) - (VARIANT_ORDER[String(b.attrs.variant ?? b.kind)] ?? 9),
    )
    .map(cardOf)
}

export function searchCards(query: string, type: EntityType | null): ArchiveCard[] {
  return search(query, { types: type ? [type] : undefined, limit: 24 }).map(cardOf)
}

/* ------------------------------------------------------------------ the drawer */

function sourceLines(ids: readonly string[], confidence: SourceLine['confidence']): SourceLine[] {
  const lines: SourceLine[] = []
  for (const id of ids) {
    const src = sourceOf(id)
    if (src) lines.push({ id, title: src.title, url: src.url, kind: src.kind, readOn: src.readOn, confidence })
  }
  return lines
}

function whatOf(e: GraphEntity): WhatBlock {
  const a = e.attrs
  const text = (value: unknown, summary = false): WhatBlock | null =>
    typeof value === 'string' && value.trim() ? { kind: 'text', text: value, summary } : null
  switch (e.type) {
    case 'match': {
      const record = matchRecordOf(e)
      const venue = neighbors(e.id, { types: ['place'] })[0]?.other.titleHe ?? null
      return {
        kind: 'match',
        competitionHe: String(a.competitionHe ?? ''),
        stage: typeof a.stage === 'string' ? a.stage : null,
        day: e.date?.precision === 'day' ? e.date.value : null,
        venueHe: venue,
        // the scorers as the archive records them; a disputed list is flagged, not hidden
        scorers: (record?.scorers ?? [])
          .filter((s) => s.confidence >= 2 && s.nameHe)
          .map((s) => ({ nameHe: s.nameHe as string, minute: s.minute, penalty: s.penalty, ownGoal: s.ownGoal })),
        disputed: a.disputed === true || record?.scorersDisputed === true,
      }
    }
    case 'press': {
      const q = pressQuote(e)
      return q ? { kind: 'quote', quote: q.quote, byline: q.byline, words: q.words } : { kind: 'none' }
    }
    case 'person': {
      const record = personRecordOf(e)
      return {
        kind: 'person',
        from: typeof a.from === 'number' ? a.from : null,
        to: typeof a.to === 'number' ? a.to : null,
        seasons: neighbors(e.id).filter(({ edge }) => edge.type === 'played_in').length,
        numbers: [...((a.numbers as readonly string[] | undefined) ?? [])],
        goals: typeof a.documentedGoals === 'number' ? a.documentedGoals : 0,
        positions: record?.positions.fine?.terms ?? [...((a.positionTerms as readonly string[] | undefined) ?? [])],
      }
    }
    case 'season': {
      const matches = neighbors(e.id, { types: ['match'] }).length
      const trophies = neighbors(e.id, { types: ['trophy'] }).map(({ other }) => other.titleHe)
      return { kind: 'season', matches, trophies }
    }
    case 'kit': {
      const record = kitRecord(e.id)
      return {
        kind: 'kit',
        seasonLabel: e.seasonLabel ?? '',
        variant: String(a.variant ?? e.kind ?? 'home'),
        playable: a.playable === true,
        // a shirt Gate 4 deals keeps its answers off this screen (see KitFacts)
        facts:
          record && !record.gate4.playable
            ? {
                makerHe: record.fields.maker.value?.name ?? null,
                sponsorHe: record.fields.sponsor.value?.name ?? null,
                photo: record.evidence.exactPhoto?.src ?? null,
              }
            : null,
      }
    }
    case 'object':
      if (e.kind === 'crest')
        return { kind: 'crest', text: typeof a.text === 'string' ? a.text : null, note: typeof a.note === 'string' ? a.note : null, imageKey: typeof a.imageKey === 'string' ? a.imageKey : null }
      return { kind: 'spells', spells: [...((a.spells as readonly string[] | undefined) ?? [])], nameEn: typeof a.nameEn === 'string' ? a.nameEn : null }
    case 'song':
      return {
        kind: 'song',
        originalTitle: typeof a.originalTitle === 'string' ? a.originalTitle : null,
        originalArtist: typeof a.originalArtist === 'string' ? a.originalArtist : null,
        lyricsBy: typeof a.lyricsBy === 'string' ? a.lyricsBy : null,
      }
    default:
      return text(a.text, a.textKind === 'summary') ?? { kind: 'none' }
  }
}

/**
 * Everything the drawer shows for one entity — and ONLY what the archive holds: its own
 * text, its figures, graph counts, the item before and after it, at most two related
 * items per type (each with the label of the edge that brought it), and its sources
 * with a confidence word. The prototype's `spicy`/`secret`/`why` prose is not here and
 * cannot be (brief §25): there is no field for it.
 */
export function detailOf(anyId: string): EntityDetail | null {
  const e = entity(anyId)
  if (!e) return null
  const around = beforeAfter(e.id)
  const confidence = e.confidence >= 3 ? 'high' : e.confidence >= 2 ? 'medium' : 'low'
  return {
    card: cardOf(e),
    what: whatOf(e),
    counts: countsOf(e.id),
    before: around.before ? cardOf(around.before) : null,
    after: around.after ? cardOf(around.after) : null,
    related: related(e.id, 2).map((group) => ({
      type: group.type,
      total: group.total,
      items: group.items.map((pick) => ({
        card: cardOf(pick.entity),
        labelKey: pick.labelKey,
        params: pick.edge.params ?? null,
        confidence: pick.edge.confidence,
      })),
    })),
    sources: sourceLines(e.sourceIds, confidence),
    links: linksForEntity(e.id),
    // ONE RED WORLD §21 — the Cross Gate Router: what this entity can do in the other gates
    router: actionsFor(e.id),
  }
}

/** One step down the rabbit hole from `fromId` — deterministic on (seed, depth, trail). */
export function rabbitDetail(fromId: string, seed: number, depth: number, trail: readonly string[]): EntityDetail | null {
  const types = trail
    .slice(-2)
    .map((id) => entity(id)?.type)
    .filter((type): type is EntityType => type !== undefined)
  const next = rabbitStep(fromId, { seed, depth, visited: trail, lastTypes: types })
  return next ? detailOf(next.id) : null
}

/** How many walkable links an entity has — the drawer's "you can go on" test. */
export function hasWay(anyId: string): boolean {
  return neighbors(anyId).some(({ edge }) => walkable(edge.confidence))
}

/* ------------------------------------------------------------------ for gate 10 */

export type ArchiveIdentity = {
  /** the saved items, newest-saved last as the device holds them — at most `limit` */
  saved: ArchiveCard[]
  /** the decade most saved items belong to, and how many — null under three dated saves */
  favouriteDecade: { decade: number; count: number } | null
  /** how much of the archive this person has opened (the `archive` collection) */
  seen: number
  /** matches marked "הייתי שם" (`archive.react` tokens `there:<id>`) */
  beenThere: ArchiveCard[]
  /** ids nothing in the graph answers to — reported, never guessed */
  unknown: string[]
}

/**
 * What gate 10's Worker Card reads from gate 12 (spec §4 "What Gate 10 needs"): the
 * saved items described (legacy ids resolved), a favourite era from the DECADES of the
 * saves — computed, never declared — the discovery count, and the matches marked
 * "הייתי שם". The inputs are the device's own sets; nothing here is stored.
 */
export function archiveIdentity(input: { saved: readonly string[]; seen: readonly string[]; reactions: readonly string[] }, limit = 12): ArchiveIdentity {
  const saved = describe(input.saved)
  const tally = new Map<number, number>()
  for (const card of saved.cards) if (card.decade !== null) tally.set(card.decade, (tally.get(card.decade) ?? 0) + 1)
  const dated = [...tally.values()].reduce((sum, n) => sum + n, 0)
  const best = [...tally.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]
  const there = describe(
    input.reactions.filter((token) => token.startsWith('there:')).map((token) => token.slice('there:'.length)),
  ).cards.filter((card) => card.type === 'match')
  return {
    saved: saved.cards.slice(-limit),
    favouriteDecade: best && dated >= 3 ? { decade: best[0], count: best[1] } : null,
    seen: new Set(input.seen).size,
    beenThere: there,
    unknown: saved.unknown,
  }
}
