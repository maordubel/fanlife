import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { edgeBetween, entity, graph } from '@/lib/archive/graph'
import { walkable, type EntityType, type Span } from '@/lib/archive/graph-types'
import { anchorPool, closeRoute, curatedLevels, dealThreadRun, levelByRef, publicLevel, routeAnchors, threadWalk, tryLink } from '@/lib/game/thread'
import {
  checkClose,
  checkMove,
  costsIntegrity,
  generateLevel,
  levelIsSound,
  routeScore,
  ruleStates,
  solve,
  tierOf,
  type ThreadLevel,
  type ThreadView,
  type Tier,
} from '@/lib/game/thread-run'
import { MESSAGES } from '@/lib/i18n'

/**
 * החוט האדום — gate 13 (brief §23, spec archive-graph §5.4).
 *
 * Every level playable, every link a real edge of the one graph gate 12 walks, `low`
 * edges never walkable, the time rule a level rule that places and the terrace bridge,
 * and no adjacency in anything the board is dealt.
 */
const ROOT = join(__dirname, '..')
const view = threadWalk()

describe('curated levels', () => {
  const levels = curatedLevels()

  it('starts with at least one run of curated levels, ids unique', () => {
    expect(levels.length).toBeGreaterThanOrEqual(5)
    expect(new Set(levels.map((l) => l.id)).size).toBe(levels.length)
    expect(levels.slice(0, 5).map((l) => l.tier)).toEqual([1, 2, 3, 4, 5])
  })

  it('names only entities the graph holds — the same ids gate 12 opens', () => {
    for (const level of levels) {
      for (const id of [level.start, level.end, ...level.hand]) expect(entity(id), `${level.id}: ${id}`).not.toBeNull()
      expect(new Set(level.hand).size, level.id).toBe(level.hand.length)
      expect(level.hand).not.toContain(level.start)
      expect(level.hand).not.toContain(level.end)
      expect(entity(level.start)!.sport).toBe('football')
      expect(level.integrity).toBeGreaterThanOrEqual(2)
      expect(level.integrity).toBeLessThanOrEqual(4)
    }
  })

  it('can be solved, every one — and a "shortest" level’s limit IS its optimum', () => {
    for (const level of levels) {
      const sound = levelIsSound(level, view)
      expect(sound.ok, `${level.id} optimum ${sound.optimum}`).toBe(true)
      const route = solve(level, view)!
      // every step of the solution is a walkable edge in the graph
      const stops = [level.start, ...route, level.end]
      for (let i = 1; i < stops.length; i += 1) {
        const edge = edgeBetween(stops[i - 1]!, stops[i]!)
        expect(edge, `${level.id}: ${stops[i - 1]} → ${stops[i]}`).not.toBeNull()
        expect(walkable(edge!.confidence)).toBe(true)
      }
      if (level.rules.exact) expect(route.length).toBe(level.rules.maxStops)
    }
  })

  it('is closable through the server, with a label and a source on every edge', () => {
    for (const level of levels) {
      const route = solve(level, view)!
      const path: string[] = []
      for (const card of route) {
        const link = tryLink(level.id, path, card)
        expect(link.ok, `${level.id} → ${card}`).toBe(true)
        if (link.ok) {
          expect(MESSAGES[link.labelKey]).toBeTruthy()
          expect(link.sources.length).toBeGreaterThan(0)
        }
        path.push(card)
      }
      const closed = closeRoute(level.id, path, level.integrity)
      expect(closed.ok, level.id).toBe(true)
      if (closed.ok) {
        expect(closed.edges).toHaveLength(path.length + 1)
        for (const edge of closed.edges) expect(edge.sources.length).toBeGreaterThan(0)
        expect(closed.optimum).toBe(route.length)
        expect(closed.score).toBe(routeScore(path.length, route.length, level.integrity))
        expect(closed.routeId.startsWith(`${level.id}:`)).toBe(true)
        // gate 10 remembers the route by its two anchors
        expect(routeAnchors([closed.routeId])[0]!.end.id).toBe(level.end)
      }
    }
  })
})

describe('links are real edges', () => {
  const level = curatedLevels()[2] as ThreadLevel

  it('refuses a card with no edge to the last stop, and that tears the thread', () => {
    const lonely = level.hand.find((id) => edgeBetween(level.start, id) === null)!
    expect(lonely).toBeDefined()
    const link = tryLink(level.id, [], lonely)
    expect(link.ok).toBe(false)
    if (!link.ok) {
      expect(['no-edge', 'backward']).toContain(link.reason)
      expect(costsIntegrity(link.reason as 'no-edge')).toBe(true)
    }
  })

  it('refuses a forged path and a card outside the hand', () => {
    const forged = tryLink(level.id, [level.end], level.hand[0]!)
    expect(forged.ok).toBe(false)
    const outside = tryLink(level.id, [], 'season:1950/51')
    expect(outside.ok).toBe(false)
    if (!outside.ok) expect(outside.reason).toBe('not-in-hand')
    expect(tryLink('rt-999', [], level.hand[0]!).ok).toBe(false)
    expect(tryLink('gen-x-1', [], level.hand[0]!).ok).toBe(false)
  })

  it('never walks a low edge — a press coincidence is not a link', () => {
    const low = graph.edges.filter((edge) => edge.confidence === 'low').slice(0, 300)
    expect(low.length).toBeGreaterThan(100)
    for (const edge of low) {
      const synthetic: ThreadLevel = { id: 'x', tier: 1, start: edge.from, end: 'season:1999/00', hand: [edge.to], integrity: 3, rules: { maxStops: 3, time: 'free' } }
      const verdict = checkMove(synthetic, [], edge.to, view)
      // a stronger edge between the same pair is fine; a low one alone never is
      if (edgeBetween(edge.from, edge.to) === null) expect(verdict, edge.id).toBe('no-edge')
    }
  })
})

describe('time is a level rule, per type', () => {
  const spans: Record<string, Span> = {
    match2010: { from: '2010-05-11', to: '2010-05-11' },
    season1999: { from: '1999-07-01', to: '2000-06-30' },
    career: { from: '1995-07-01', to: '2011-06-30' },
    place: null,
  }
  const types: Record<string, EntityType> = { match2010: 'match', season1999: 'season', career: 'person', place: 'place' }
  const fake: ThreadView = {
    typeOf: (id) => types[id] ?? null,
    spanOf: (id) => spans[id] ?? null,
    hasEdge: () => true,
  }
  const level = (time: 'free' | 'forward', hand: string[], start = 'match2010'): ThreadLevel => ({
    id: 't',
    tier: 3,
    start,
    end: 'season1999',
    hand,
    integrity: 3,
    rules: { maxStops: 3, time },
  })

  it('forbids a move whose span ends before the last one starts — only under `forward`', () => {
    expect(checkMove(level('forward', ['season1999']), [], 'season1999', fake)).toBe('used')
    const back = level('forward', ['season1999x'])
    spans.season1999x = spans.season1999 as Span
    types.season1999x = 'season'
    expect(checkMove(back, [], 'season1999x', fake)).toBe('backward')
    expect(checkMove(level('free', ['season1999x']), [], 'season1999x', fake)).toBe('ok')
  })

  it('lets a place bridge eras, and an overlapping career carry the thread back', () => {
    expect(checkMove(level('forward', ['place']), [], 'place', fake)).toBe('ok')
    // 2010 → a place → 1999/00: timeless in the middle, so neither move is backward
    const bridge = level('forward', ['place', 'season1999x'])
    expect(checkMove(bridge, ['place'], 'season1999x', fake)).toBe('ok')
    expect(checkMove(level('forward', ['career']), [], 'career', fake)).toBe('ok')
  })

  it('reads the rules the board shows from card types only', () => {
    const rules = { maxStops: 2, mustTypes: ['person', 'object'] as ('person' | 'object')[], world: true, noConsecutiveMatches: true, time: 'forward' as const }
    const typeOf = (id: string) => (({ a: 'person', b: 'kit', c: 'song', m1: 'match', m2: 'match' }) as Record<string, EntityType>)[id] ?? null
    const states = ruleStates(rules, ['a', 'b', 'c'], typeOf)
    expect(states.find((s) => s.rule.key === 'stops')!.met).toBe(false)
    expect(states.filter((s) => s.rule.key === 'type').every((s) => s.met)).toBe(true)
    expect(states.find((s) => s.rule.key === 'world')!.met).toBe(true)
    expect(ruleStates(rules, ['m1', 'm2'], typeOf).find((s) => s.rule.key === 'noConsecutive')!.met).toBe(false)
  })

  it('will not close onto the end with a rule unmet', () => {
    const l: ThreadLevel = { ...level('free', ['career']), rules: { maxStops: 2, mustTypes: ['object'], time: 'free' } }
    expect(checkClose(l, ['career'], fake)).toEqual({ ok: false, reason: 'missing' })
  })
})

describe('generated levels — 300 seeds, all playable', () => {
  const pool = anchorPool()

  it('draws anchors from the football graph, never a hub or a column', () => {
    expect(pool.length).toBeGreaterThan(200)
    for (const id of pool) {
      const e = entity(id)!
      expect(e.sport).toBe('football')
      expect(e.type).not.toBe('press')
    }
  })

  it('solves every level the generator deals', () => {
    for (let seed = 1; seed <= 60; seed += 1) {
      for (const tier of [1, 2, 3, 4, 5] as Tier[]) {
        const level = generateLevel(seed, tier, pool, view)
        expect(level, `seed ${seed} tier ${tier}`).not.toBeNull()
        const sound = levelIsSound(level!, view)
        expect(sound.ok, `seed ${seed} tier ${tier}`).toBe(true)
        expect(new Set(level!.hand).size).toBe(level!.hand.length)
        expect(level!.start).not.toBe(level!.end)
        for (const id of level!.hand) expect(entity(id), id).not.toBeNull()
        // and it regenerates identically from its ref alone
        expect(levelByRef(level!.id)).toEqual(level)
        if (tier === 5) expect(level!.rules.exact).toBe(true)
      }
    }
  })

  it('deals curated levels first, then generated ones, tier 1 to 5', () => {
    const curated = curatedLevels()
    expect(dealThreadRun(42, 0)).toEqual(curated.slice(0, 5).map((l) => l.id))
    const second = dealThreadRun(42, 1)
    expect(second.slice(0, curated.length - 5)).toEqual(curated.slice(5).map((l) => l.id))
    for (const cursor of [0, 1, 2, 3, 7]) {
      const refs = dealThreadRun(99, cursor)
      expect(refs).toHaveLength(5)
      expect(new Set(refs).size).toBe(5)
      for (const [i, ref] of refs.entries()) {
        const level = levelByRef(ref)
        expect(level, ref).not.toBeNull()
        if (ref.startsWith('gen-')) expect(level!.tier).toBe(tierOf(i))
      }
    }
    expect(dealThreadRun(99, 3)).toEqual(dealThreadRun(99, 3))
  })
})

describe('no adjacency reaches the client (rule 4)', () => {
  it('deals cards and rules only', () => {
    const level = publicLevel(curatedLevels()[0]!.id, 0, 5)!
    const blob = JSON.stringify(level)
    for (const field of ['"edges"', '"labelKey"', '"inverseLabelKey"', '"neighbors"', '"sourceIds"', '"evidence"']) expect(blob).not.toContain(field)
    expect(level.hand.length).toBe(curatedLevels()[0]!.hand.length)
  })

  it('keeps the graph and the engine out of every client module', () => {
    const files: string[] = []
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name)
        if (statSync(path).isDirectory()) walk(path)
        else if (/\.tsx?$/.test(name)) files.push(path)
      }
    }
    for (const dir of ['app', 'components']) walk(join(ROOT, dir))
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      if (!/^['"]use client['"]/m.test(text)) continue
      for (const banned of ["'@/lib/archive/graph'", "'@/lib/game/thread'", 'entity-graph.json', 'red-thread-levels.json']) {
        expect(text.includes(banned), `${file} imports ${banned}`).toBe(false)
      }
    }
  })
})
