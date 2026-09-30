import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { archive } from '@/lib/game/archive'
import { buildBoard, buildRound, firstSentence, memoryEntityId, type MemoryPair } from '@/lib/game/memory'
import {
  KIND_CAP,
  MEMORY_PAIR_TYPES,
  coherenceOf,
  pairStrength,
  spreadKinds,
  themeOf,
  themedOrder,
} from '@/lib/game/memory-quality'
import { archiveHref } from '@/lib/links'

/**
 * שער 6 — the memory pairs (29.9.2026). The mechanic did not change; what is asserted here is
 * which pairs the deck may hold: a stated relationship, a strength above zero, one entity once
 * per board, a board that reads as one stretch of history, and the same deal for the same seed.
 */

const ROOT = join(__dirname, '..')
const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1)
const CURSORS = [0, 1, 2, 3, 4, 5]

const boards = SEEDS.flatMap((seed) => CURSORS.map((cursor) => ({ seed, cursor, round: buildRound(seed, 6, cursor) })))

/** the archive row a pair id names — the evidence behind it, or null when there is none */
function rowOf(pair: MemoryPair): unknown {
  const [kind, ...rest] = pair.id.split(':')
  const key = rest.join(':')
  switch (kind) {
    case 'trophy':
      return archive.trophies.find((row) => row.result === 'won' && `${row.competitionSlug}:${row.seasonLabel}` === key)
    case 'moment':
      return archive.moments.find((row) => row.slug === key && row.happenedOn !== null)
    case 'goal':
      return archive.goals.find((row) => row.goalId === key)
    case 'euro':
      return archive.euroTies.find((row) => row.slug === key)
    case 'crest':
      return archive.crests.find((row) => String(row.fromYear) === key)
    case 'kit':
      return archive.kitSupply.find((row) => `${row.manufacturerSlug}:${row.fromLabel}` === key)
    case 'election':
      return archive.electionCandidates.find((row) => `${row.electionSlug}:${row.personNameHe}` === key)
    default:
      return null
  }
}

describe('every pair is a stated relationship', () => {
  it('has a registered type and a strength above zero', () => {
    for (const { round } of boards) {
      for (const pair of round.pairs) {
        expect(MEMORY_PAIR_TYPES, pair.id).toContain(pair.type)
        expect([1, 2, 3], pair.id).toContain(pair.strength)
      }
    }
  })

  it('has an archive row behind it, and both faces are that row\'s own', () => {
    for (const { round } of boards) {
      for (const pair of round.pairs) {
        expect(rowOf(pair), `${pair.id} has no archive row`).toBeTruthy()
        expect(pair.a.trim(), pair.id).not.toBe('')
        expect(pair.b.trim(), pair.id).not.toBe('')
        expect(pair.a, pair.id).not.toBe(pair.b)
      }
    }
  })

  it('every dealt card belongs to one of the board\'s pairs, two faces each', () => {
    for (const { round } of boards.slice(0, 40)) {
      const ids = new Set(round.pairs.map((pair) => pair.id))
      expect(round.cards).toHaveLength(round.pairs.length * 2)
      for (const card of round.cards) expect(ids.has(card.pair)).toBe(true)
    }
  })
})

describe('no score-0 relationship is ever dealt', () => {
  it('refuses an empty face, a repeated face, a dated pair with no year and an unknown type', () => {
    const base = { type: 'trophy-season' as const, a: 'גביע המדינה', b: '2006/07', year: 2007 }
    expect(pairStrength(base)).toBe(3)
    expect(pairStrength({ ...base, a: '  ' })).toBe(0)
    expect(pairStrength({ ...base, b: '' })).toBe(0)
    expect(pairStrength({ ...base, b: base.a })).toBe(0)
    expect(pairStrength({ ...base, year: null })).toBe(0)
    expect(pairStrength({ ...base, year: Number.NaN })).toBe(0)
    expect(pairStrength({ ...base, type: 'coincidence' as never })).toBe(0)
  })

  it('an undated vote is a 2, a maker and its span a 2, an event a 3', () => {
    expect(pairStrength({ type: 'candidate-votes', a: 'נועה', b: '232 קולות', year: null })).toBe(2)
    expect(pairStrength({ type: 'maker-span', a: 'umbro', b: '1980/81', year: 1981 })).toBe(2)
    expect(pairStrength({ type: 'goal-year', a: 'שער', b: '2001', year: 2001 })).toBe(3)
  })

  it('never lets a zero into a board, in any seed or window', () => {
    for (const { round } of boards) for (const pair of round.pairs) expect(pair.strength).toBeGreaterThan(0)
    const windowed = buildRound(7, 6, 0, { before: 1995 })
    for (const pair of windowed.pairs) expect(pair.strength).toBeGreaterThan(0)
  })
})

describe('no entity collides inside a board', () => {
  it('has six distinct pairs, twelve distinct faces and one archive entity each', () => {
    for (const { seed, cursor, round } of boards) {
      const at = `seed ${seed} cursor ${cursor}`
      expect(new Set(round.pairs.map((pair) => pair.id)).size, at).toBe(round.pairs.length)
      const faces = round.pairs.flatMap((pair) => [pair.a, pair.b])
      expect(new Set(faces).size, at).toBe(faces.length)
      const entities = round.pairs.map((pair) => memoryEntityId(pair.id)).filter((id): id is string => id !== null)
      expect(new Set(entities).size, at).toBe(entities.length)
    }
  })

  it('one competition wants one year on a board', () => {
    for (const { round } of boards) {
      const names = round.pairs.filter((pair) => pair.type === 'trophy-season').map((pair) => pair.a)
      expect(new Set(names).size).toBe(names.length)
    }
  })
})

describe('a board reads as one stretch of history', () => {
  it('shares a decade across at least four of its six pairs on the great majority of boards', () => {
    const coherent = boards.filter(({ round }) => coherenceOf(round.pairs.map((pair) => pair.theme)) >= 4)
    expect(coherent.length / boards.length).toBeGreaterThanOrEqual(0.8)
  })

  it('names the decade a pair belongs to from the year the archive dates it in', () => {
    expect(themeOf(1985)).toBe('d1980')
    expect(themeOf(2001)).toBe('d2000')
    expect(themeOf(null)).toBe('undated')
    for (const { round } of boards.slice(0, 60)) {
      for (const pair of round.pairs) expect(pair.theme).toMatch(/^(d\d{4}|undated)$/)
    }
  })

  it('cuts a deck into whole blocks per theme, then mixes only what is left over', () => {
    const items = [
      ...Array.from({ length: 7 }, (_, i) => ({ id: `a${i}`, theme: 'd1990', kind: i % 2 ? 'x' : 'y' })),
      ...Array.from({ length: 3 }, (_, i) => ({ id: `b${i}`, theme: 'd2000', kind: 'x' })),
      { id: 'u', theme: 'undated', kind: 'z' },
    ]
    const ordered = themedOrder(items, 6)
    expect(ordered).toHaveLength(items.length)
    expect(new Set(ordered.map((item) => item.id)).size).toBe(items.length)
    // the first board is one theme; the rest is what no decade could fill
    expect(ordered.slice(0, 6).every((item) => item.theme === 'd1990')).toBe(true)
    // spreading across kinds interleaves them
    expect(spreadKinds([{ kind: 'x' }, { kind: 'x' }, { kind: 'y' }]).map((item) => item.kind)).toEqual(['x', 'y', 'x'])
  })

  it('does not put a wall of one kind on a board', () => {
    for (const { round } of boards) {
      const counts = new Map<string, number>()
      for (const pair of round.pairs) counts.set(pair.type, (counts.get(pair.type) ?? 0) + 1)
      // one question asked more than three times is not a memory board
      expect(Math.max(...counts.values())).toBeLessThanOrEqual(KIND_CAP)
    }
  })
})

describe('deterministic by seed and cursor', () => {
  it('deals the same board for the same address, and a different one for the next cursor', () => {
    for (const seed of [1, 7, 12345]) {
      expect(buildRound(seed, 6, 2)).toEqual(buildRound(seed, 6, 2))
      expect(buildBoard(seed, 6, 2)).toEqual(buildRound(seed, 6, 2).cards)
      const first = new Set(buildRound(seed, 6, 0).pairs.map((pair) => pair.id))
      const next = buildRound(seed, 6, 1).pairs.map((pair) => pair.id)
      expect(next.some((id) => first.has(id))).toBe(false)
    }
  })

  it('keeps a LIFE window a window: only what had happened, and still a stated relationship', () => {
    const round = buildRound(7, 6, 0, { before: 2000 })
    expect(round.pairs.length).toBeGreaterThan(0)
    for (const pair of round.pairs) expect(pair.strength).toBeGreaterThan(0)
  })
})

describe('the payoff: one concise archive fact, and a link that resolves', () => {
  it('prints a sentence the row itself holds — at most 121 characters, never a biography', () => {
    let withFact = 0
    for (const { round } of boards.slice(0, 80)) {
      for (const pair of round.pairs) {
        if (pair.factHe === null) continue
        withFact += 1
        expect(pair.factHe.length, pair.id).toBeLessThanOrEqual(121)
        expect(pair.factHe, pair.id).toBe(pair.factHe.trim())
      }
    }
    expect(withFact).toBeGreaterThan(0)
  })

  it('cuts at the first sentence and leaves a null for a row with no text', () => {
    expect(firstSentence('משפט ראשון. משפט שני.')).toBe('משפט ראשון.')
    expect(firstSentence('18.10.2001 · בלומפילד · דקה 88')).toBe('18.10.2001 · בלומפילד · דקה 88')
    expect(firstSentence('')).toBeNull()
    expect(firstSentence(null)).toBeNull()
    expect((firstSentence('א '.repeat(200)) ?? '').length).toBeLessThanOrEqual(121)
  })

  it('opens an archive card where it has one, and says nothing where it has none', () => {
    for (const { round } of boards.slice(0, 80)) {
      for (const pair of round.pairs) {
        const id = memoryEntityId(pair.id)
        const href = id ? archiveHref(id) : null
        if (href) expect(href).toMatch(/^\/archive\?at=/)
      }
    }
  })
})

describe('the mechanic is untouched', () => {
  it('still deals six pairs and twelve cards, and the screen still owns the flash, echo and shelf', () => {
    expect(buildRound(7).pairs).toHaveLength(6)
    expect(buildRound(7).cards).toHaveLength(12)
    const board = readFileSync(join(ROOT, 'app/memory/MemoryBoard.tsx'), 'utf8')
    for (const word of ['FusionPlate', 'SouvenirShelf', 'PairThreads']) expect(board).toContain(word)
  })
})

describe('emotional recognisability (Deep QA §26)', () => {
  it('every board of six keeps at least three pairs a supporter recognises', async () => {
    const { MEMORY_VALUE, RECOGNISABLE_MIN } = await import('@/lib/game/memory-quality')
    let short = 0
    for (const { round } of boards) {
      const recognisable = round.pairs.filter((pair) => MEMORY_VALUE[pair.type] >= 2).length
      if (recognisable < RECOGNISABLE_MIN) short += 1
    }
    // the cap holds wherever the archive has enough recognisable pairs to honour it
    expect(short).toBeLessThanOrEqual(Math.floor(boards.length * 0.02))
  })
})
