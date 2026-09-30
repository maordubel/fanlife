import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  beforeAfter,
  describe as describeIds,
  edgeBetween,
  entity,
  graph,
  neighbors,
  related,
  resolveId,
  search,
  subgraph,
  today,
} from '@/lib/archive/graph'
import {
  EDGE_TYPES,
  compactGraph,
  expandGraph,
  isBackward,
  seasonOfDate,
  seasonSpan,
  walkable,
  type EntityType,
} from '@/lib/archive/graph-types'
import { matchMaster } from '@/lib/archive/match-master'
import { playerMaster } from '@/lib/archive/player-master'
import { factDeck } from '@/lib/archive/wing'
import { MESSAGES } from '@/lib/i18n'
import { GRAPH_INPUTS, buildGraph, graphInputsSha, serialiseGraph, sourceIdOf } from '@/scripts/archive/build-graph'

/**
 * גרף הישויות — the Entity Graph Master (spec archive-graph §5.2).
 *
 * One graph for gates 12 and 13. The claims it makes — every edge real, sourced, inside
 * one sport, and walkable only at medium confidence or better — are checked over the
 * WHOLE file, never a sample (rule 31's lesson).
 */
const ROOT = join(__dirname, '..')

describe('ids — reused, never minted', () => {
  it('holds every entity once and every edge once', () => {
    const ids = graph.entities.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    const edgeIds = graph.edges.map((e) => e.id)
    expect(new Set(edgeIds).size).toBe(edgeIds.length)
  })

  it('names a person by the Player Master id and a match by the registry', () => {
    const people = new Set(playerMaster.players.map((p) => p.id))
    const registry = new Set(
      (JSON.parse(readFileSync(join(ROOT, 'content/manual/match-ids.json'), 'utf8')) as { records: { id: string }[] }).records.map((r) => r.id),
    )
    for (const e of graph.entities) {
      if (e.type === 'person') {
        expect(e.id, e.id).toMatch(/^p_[0-9a-f]{10}$/)
        expect(people.has(e.id), e.id).toBe(true)
      }
      if (e.type === 'match') {
        expect(e.id, e.id).toMatch(/^m_[0-9a-f]{12}$/)
        expect(registry.has(e.id), e.id).toBe(true)
      }
      if (e.type === 'kit') expect(e.id).toMatch(/^kit-\d{4}-\d{2}-(home|away|third)$/)
    }
    // every person the master holds is in the graph
    expect(graph.entities.filter((e) => e.type === 'person').length).toBe(playerMaster.players.length)
  })

  it('keeps the ids devices already hold, so saved collections resolve', () => {
    // gate 12's old deck (`archive` collection) and gate 6's shelf (`memory` collection)
    for (const card of factDeck()) {
      const hit = resolveId(card.id)
      expect(hit, card.id).not.toBeNull()
    }
    const shelf = ['euro:2001-uefa-r2-chelsea', 'kit:umbro:2006/07', 'crest:1923', 'goal:chelsea-2001-gershon-88', 'trophy:גביע-המדינה:1998/99']
    for (const id of shelf) expect(resolveId(id), id).not.toBeNull()
    expect(resolveId('kit:umbro:2006/07')).toBe('maker:umbro')
    expect(resolveId('euro:2001-uefa-r2-chelsea')).toBe('tie:2001-uefa-r2-chelsea')
    // the Kit Master's legacy key, and a Player Master v1 id
    expect(resolveId('2009/10|home')).toBe('kit-2009-10-home')
    const tikva = playerMaster.players.find((p) => p.displayName === 'שלום תקוה')!
    for (const legacy of tikva.legacyIds) expect(resolveId(legacy)).toBe(tikva.id)
    expect(resolveId(tikva.slug)).toBe(tikva.id)
    // describe() drops what it cannot name, and says so
    const described = describeIds(['kit:umbro:2006/07', 'no-such-thing', tikva.id])
    expect(described.cards.map((c) => c.id)).toEqual(['maker:umbro', tikva.id])
    expect(described.unknown).toEqual(['no-such-thing'])
  })
})

describe('edges — real, sourced, one sport', () => {
  const byId = new Map(graph.entities.map((e) => [e.id, e]))

  it('has both ends of every edge, and at least one known source on it', () => {
    for (const edge of graph.edges) {
      expect(byId.has(edge.from), `${edge.id}: from`).toBe(true)
      expect(byId.has(edge.to), `${edge.id}: to`).toBe(true)
      expect(edge.sourceIds.length, edge.id).toBeGreaterThan(0)
      for (const src of edge.sourceIds) expect(graph.sources[src], `${edge.id}: ${src}`).toBeDefined()
      expect(edge.evidence.file.length).toBeGreaterThan(5)
      expect(EDGE_TYPES).toContain(edge.type)
    }
  })

  it('never crosses sports (rule 6/14)', () => {
    for (const edge of graph.edges) {
      expect(byId.get(edge.from)!.sport, edge.id).toBe(byId.get(edge.to)!.sport)
      expect(edge.sport).toBe(byId.get(edge.from)!.sport)
    }
    expect(graph.entities.some((e) => e.sport === 'basketball')).toBe(true)
  })

  it('lets the press produce low edges only, and never a walkable one', () => {
    for (const edge of graph.edges) {
      const touchesPress = byId.get(edge.from)!.type === 'press' || byId.get(edge.to)!.type === 'press'
      if (touchesPress) expect(edge.confidence, edge.id).toBe('low')
    }
    // and gate 13's question never answers "yes" through a low edge
    const low = graph.edges.filter((edge) => edge.confidence === 'low')
    expect(low.length).toBeGreaterThan(1000)
    for (const edge of low.slice(0, 400)) {
      const between = edgeBetween(edge.from, edge.to)
      if (between) expect(walkable(between.confidence), edge.id).toBe(true)
    }
    const { edges } = subgraph(graph.entities.slice(0, 800).map((e) => e.id))
    for (const edge of edges) expect(walkable(edge.confidence)).toBe(true)
  })

  it('prints a label for every edge, both ways, from the catalogue', () => {
    for (const edge of graph.edges) {
      expect(MESSAGES[edge.labelKey], edge.labelKey).toBeTruthy()
      expect(MESSAGES[edge.inverseLabelKey], edge.inverseLabelKey).toBeTruthy()
    }
    for (const type of new Set(graph.entities.map((e) => e.type))) {
      expect(MESSAGES[`graph.type.${type}`]).toBeTruthy()
      expect(MESSAGES[`graph.types.${type}`]).toBeTruthy()
    }
  })

  it('reads a match from the Match Master and a scorer from its relations', () => {
    // the 1999 cup final: its season, its opponent, and the trophy it decided
    const final = graph.edges.find((edge) => edge.type === 'final_of' && edge.to === 'trophy:גביע-המדינה:1998/99')
    expect(final).toBeDefined()
    expect(matchMaster.matches.some((m) => m.matchId === final!.from)).toBe(true)
    const types = neighbors(final!.from).map(({ edge }) => edge.type)
    expect(types).toContain('in_season')
    expect(types).toContain('against')
  })
})

describe('the numbers the spec promised, as floors', () => {
  const count = (type: EntityType) => graph.entities.filter((e) => e.type === type).length
  const edgesOf = (type: string) => graph.edges.filter((e) => e.type === type).length

  it('holds the archive, not a demo', () => {
    expect(graph.entities.length).toBeGreaterThan(5000)
    expect(graph.edges.length).toBeGreaterThan(12000)
    expect(count('match')).toBeGreaterThan(3000)
    expect(count('season')).toBeGreaterThan(90)
    expect(count('press')).toBe(1385)
    expect(count('kit')).toBe(35)
    expect(count('trophy')).toBeGreaterThan(29)
    expect(edgesOf('scored')).toBeGreaterThan(2800)
    expect(edgesOf('played_in')).toBeGreaterThan(900)
    expect(edgesOf('leg_of')).toBe(131)
    // the venue pass: the Games table's stadium, joined by day AND both scores
    expect(edgesOf('at_venue')).toBeGreaterThan(800)
    expect(edgesOf('final_of')).toBeGreaterThan(10)
  })

  it('is one connected archive, not islands', () => {
    const adj = new Map<string, string[]>()
    for (const edge of graph.edges) {
      if (!walkable(edge.confidence)) continue
      adj.set(edge.from, [...(adj.get(edge.from) ?? []), edge.to])
      adj.set(edge.to, [...(adj.get(edge.to) ?? []), edge.from])
    }
    const start = 'season:1999/00'
    const seen = new Set([start])
    const stack = [start]
    while (stack.length) for (const next of adj.get(stack.pop()!) ?? []) if (!seen.has(next)) seen.add(next), stack.push(next)
    expect(seen.size).toBeGreaterThan(3900)
  })
})

describe('time', () => {
  it('spans a season from July to June, and a day to its season', () => {
    expect(seasonSpan('1999/00')).toEqual({ from: '1999-07-01', to: '2000-06-30' })
    expect(seasonOfDate('1999-05-19')).toBe('1998/99')
    expect(seasonOfDate('1999-07-01')).toBe('1999/00')
  })

  it('calls a move backward only when the next span ends before the last one starts', () => {
    const y2010 = { from: '2010-05-11', to: '2010-05-11' }
    const s1999 = seasonSpan('1999/00')
    expect(isBackward(y2010, s1999)).toBe(true)
    expect(isBackward(s1999, y2010)).toBe(false)
    // a timeless place bridges eras either way
    expect(isBackward(y2010, null)).toBe(false)
    expect(isBackward(null, s1999)).toBe(false)
    // an overlapping career is never backward
    expect(isBackward(y2010, { from: '1995-07-01', to: '2011-06-30' })).toBe(false)
  })
})

describe('the reader', () => {
  it('finds a player by name, and a type by its word', () => {
    const tikva = search('שלום תקוה')
    expect(tikva[0]?.type).toBe('person')
    const kits = search('חולצה 2009')
    expect(kits.length).toBeGreaterThan(0)
    expect(kits.every((e) => e.type === 'kit')).toBe(true)
    expect(search('בלומפילד')[0]?.id).toBe('place:בלומפילד')
    expect(search('')).toEqual([])
  })

  it('keeps related to two per type, labelled', () => {
    const tikva = search('שלום תקוה')[0]!
    for (const group of related(tikva.id)) {
      expect(group.items.length).toBeLessThanOrEqual(2)
      expect(group.total).toBeGreaterThanOrEqual(group.items.length)
      for (const item of group.items) expect(MESSAGES[item.labelKey]).toBeTruthy()
    }
  })

  it('orders before and after by the archive’s own dates', () => {
    const around = beforeAfter('season:1999/00')
    expect(around.before?.id).toBe('season:1998/99')
    expect(around.after?.id).toBe('season:2000/01')
    const kit = beforeAfter('kit-2009-10-home')
    expect(kit.before?.kind).toBe('home')
  })

  it('answers today from dated rows only', () => {
    for (const e of today('2026-05-19')) {
      expect(e.date?.precision).toBe('day')
      expect(e.date?.value.slice(5)).toBe('05-19')
    }
    expect(today('2026-02-30')).toEqual([])
    expect(entity('nothing')).toBeNull()
  })
})

describe('freshness', () => {
  it('was built from the inputs on disk (npm run archive:graph)', () => {
    expect(graph.inputs).toEqual([...GRAPH_INPUTS])
    expect(graph.inputsSha, 'stale — run `npm run archive:graph`').toBe(graphInputsSha(ROOT))
  })

  it('rebuilds byte for byte, with no problem', () => {
    const { out, problems } = buildGraph(ROOT)
    expect(problems).toEqual([])
    expect(
      serialiseGraph(out) === readFileSync(join(ROOT, 'content/generated/entity-graph.json'), 'utf8'),
      'the builder and the committed graph disagree — run `npm run archive:graph`',
    ).toBe(true)
    // and the compact codec is lossless
    const round = expandGraph(compactGraph(out))
    expect(round.entities).toEqual(out.entities)
    expect(round.edges).toEqual(out.edges)
  })

  it('mints the same source id as the Match Master for the same article', () => {
    let agreed = 0
    for (const [id, src] of Object.entries(matchMaster.sources)) {
      if (!src.url || id === 'vikipoel:games') continue
      expect(sourceIdOf(src.url, src.title), id).toBe(id)
      agreed += 1
    }
    expect(agreed).toBeGreaterThan(20)
  })
})
