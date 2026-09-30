import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { rosterIndex } from '@/lib/game/allTimeXI'
import { facetIndex } from '@/lib/game/roster-facets'
import {
  facetCounts,
  filterRoster,
  isFiltered,
  NO_FILTER,
  positionsOf,
  type RosterFilter,
  type Searchable,
} from '@/lib/game/roster-search'
import { cardFigures, gateId, rankOf, standingScore, stillToDo } from '@/lib/profile/standing'
import { keysToForget } from '@/lib/profile/summary'
import {
  emptyProfile,
  emptyStat,
  gatesTouched,
  historyGrid,
  HISTORY_DAYS,
  streak,
  totalCorrect,
  totalPlays,
  type Profile,
} from '@/lib/profile/store'

/**
 * המנוי — the card's numbers, and the one thing the roster is not allowed to do.
 *
 * Two subjects in one file because they are the same promise from two ends: the
 * personal area may only print what somebody actually did, and the roster may only
 * filter on what a source actually said. Both are places where an invented number
 * would look completely at home.
 */

function withDays(days: string[]): Profile {
  return { ...emptyProfile(), days }
}

function back(from: Date, days: number): string {
  const day = new Date(from)
  day.setDate(from.getDate() - days)
  return day.toISOString().slice(0, 10)
}

describe('רצף — the streak', () => {
  const NOW = new Date('2026-09-15T10:00:00Z')

  it('counts consecutive days up to today', () => {
    expect(streak(withDays([back(NOW, 0), back(NOW, 1), back(NOW, 2)]), NOW)).toBe(3)
  })

  it('survives the night — yesterday still counts as alive', () => {
    // Somebody who played last night and opens the app at nine in the morning has not
    // broken anything, and telling them they have is the kind of pressure this project
    // bans by name.
    expect(streak(withDays([back(NOW, 1), back(NOW, 2)]), NOW)).toBe(2)
  })

  it('breaks on a real gap, and does not count a gap as a day', () => {
    expect(streak(withDays([back(NOW, 0), back(NOW, 2), back(NOW, 3)]), NOW)).toBe(1)
    expect(streak(withDays([]), NOW)).toBe(0)
    expect(streak(withDays([back(NOW, 5)]), NOW)).toBe(0)
  })

  it('prints ninety slots however long the history is', () => {
    const grid = historyGrid(withDays([back(NOW, 0), back(NOW, 200)]), NOW)
    expect(grid).toHaveLength(HISTORY_DAYS)
    expect(grid.filter(Boolean)).toHaveLength(1)
    expect(grid[HISTORY_DAYS - 1]).toBe(true)
  })
})

describe('המעמד — nothing on the card is bought', () => {
  it('starts everybody at the bottom with nothing to show', () => {
    const fresh = emptyProfile()
    expect(standingScore(fresh)).toBe(0)
    expect(rankOf(fresh).now.id).toBe('visitor')
    expect(cardFigures(fresh)).toMatchObject({ correct: 0, plays: 0, days: 0, gates: 0 })
  })

  it('weights turning up above volume, so one gate cannot be ground', () => {
    const grinder: Profile = {
      ...emptyProfile(),
      days: ['2026-09-15'],
      gates: { '/trivia': { ...emptyStat(), plays: 10 } },
    }
    const regular: Profile = {
      ...emptyProfile(),
      days: ['2026-09-11', '2026-09-12', '2026-09-13', '2026-09-14', '2026-09-15'],
      gates: {
        '/trivia': { ...emptyStat(), plays: 2 },
        '/goal': { ...emptyStat(), plays: 2 },
        '/timeline': { ...emptyStat(), plays: 2 },
      },
    }
    expect(standingScore(regular)).toBeGreaterThan(standingScore(grinder))
  })

  it('always names the next rung, until there is none', () => {
    const fresh = rankOf(emptyProfile())
    expect(fresh.next?.id).toBe('single')
    expect(fresh.toGo).toBe(1)

    const top = rankOf({ ...emptyProfile(), days: Array.from({ length: 200 }, (_, i) => `d${i}`) })
    expect(top.now.id).toBe('terrace')
    expect(top.next).toBeNull()
  })

  it('totals what the gates reported and nothing else', () => {
    const profile: Profile = {
      ...emptyProfile(),
      gates: {
        '/trivia': { ...emptyStat(), plays: 3, correct: 21, asked: 36 },
        '/goal': { ...emptyStat(), plays: 1, correct: 2, asked: 9 },
        '/memory': emptyStat(),
      },
    }
    expect(totalPlays(profile)).toBe(4)
    expect(totalCorrect(profile)).toBe(23)
    // a gate with a row but no rounds is not a gate you have been through
    expect(gatesTouched(profile)).toBe(2)
  })

  it('reads a gate id off its route, so one gate cannot be filed twice', () => {
    expect(gateId('/lineup?seed=1')).toBe('/lineup')
    expect(gateId('/kits/build')).toBe('/kits/build')
    expect(gateId('/')).toBe('/')
  })

  it('offers what has not been played, never what has', () => {
    const profile: Profile = {
      ...emptyProfile(),
      gates: { '/xi': { ...emptyStat(), plays: 1 } },
    }
    const todo = stillToDo(profile, 3)
    expect(todo).toHaveLength(3)
    expect(todo.map((gate) => gate.href)).not.toContain('/xi')
  })
})

describe('סינון השחקנים — no position is ever guessed', () => {
  const roster = rosterIndex()

  it('places a real share of the roster, and still admits the gap', () => {
    expect(roster.total).toBeGreaterThan(600)
    // Three research passes. 15.9.2026 took this from 64 to 342 off worldfootball's
    // season squads; 16.9.2026 took it to 564 with the two Wikipedia categories and
    // worldfootball's all-time table; then Maor pointed at ויקיפועל, the club's own
    // encyclopedia, which took origin to every single name. The floor is a regression
    // guard: if a future change silently drops `player-facts.json`, the filters quietly
    // become decorative again and this is what says so.
    expect(roster.withPosition).toBeGreaterThan(600)
    expect(roster.withOrigin).toBeGreaterThan(640)
    // And the gap is still real. A day when every one of 653 names has a position is a
    // day somebody guessed, unless the same commit also brought the source that knows.
    expect(roster.withPosition).toBeLessThan(roster.total)
  })

  it('carries a source for every facet it states', () => {
    const unsourced = roster.all.filter(
      (entry) =>
        (entry.position !== null && !entry.positionFrom) ||
        (entry.origin !== null && !entry.originFrom),
    )
    expect(unsourced.map((entry) => entry.nameHe)).toEqual([])
  })

  it('never invents a facet for somebody no file mentions', () => {
    const facts = facetIndex()
    const invented = roster.all.filter(
      (entry) => entry.position !== null && facts.size > 0 && entry.positionFrom === null,
    )
    expect(invented).toEqual([])
  })

  it('counts the undocumented as their own bucket rather than hiding them', () => {
    // THE DECISION CHANGED (17.9.2026, rule 65): `תפקיד` is a LIST, so a man may be
    // filed under two positions and the buckets no longer partition the roster. This
    // guard knew "every name lands in exactly one bucket" and that is no longer what is
    // true; what it was protecting — nobody vanishes between the buckets — is asserted
    // directly instead, and the sum is asserted to be AT LEAST the total so a bucket
    // can still never lose a man.
    const counts = facetCounts(roster.all)
    expect(counts.position.unknown).toBeGreaterThan(0)
    const placed = ['GK', 'DF', 'MF', 'FW'].reduce(
      (sum, key) => sum + (counts.position[key] ?? 0),
      0,
    )
    expect(placed + (counts.position.unknown ?? 0)).toBeGreaterThanOrEqual(roster.total)
    const named = roster.all.filter((entry) => positionsOf(entry).length > 0).length
    expect(named + (counts.position.unknown ?? 0)).toBe(roster.total)
    // and the double-counting is real rather than a rounding artefact
    expect(placed).toBe(
      roster.all.reduce((sum, entry) => sum + positionsOf(entry).length, 0),
    )
  })

  it('narrows to exactly what was asked for', () => {
    const keepers = filterRoster(roster.all, { ...NO_FILTER, position: 'GK' })
    expect(keepers.length).toBeGreaterThan(0)
    // THE DECISION CHANGED (17.9.2026, rule 65): asking for defenders has to find a man
    // whose page says he played there, even where the value on screen is the other role
    // he is better known for. So the promise is about the positions he is filed under,
    // not about the one the row prints.
    expect(keepers.every((entry) => positionsOf(entry).includes('GK'))).toBe(true)

    const unplaced = filterRoster(roster.all, { ...NO_FILTER, position: 'unknown' })
    expect(unplaced.every((entry) => !entry.position)).toBe(true)
    expect(keepers.length + unplaced.length).toBeLessThanOrEqual(roster.total)
  })

  it('composes — a filter is not a radio button in disguise', () => {
    const filter: RosterFilter = { ...NO_FILTER, origin: 'foreign', decade: 1990 }
    const rows = filterRoster(roster.all, filter)
    expect(isFiltered(filter)).toBe(true)
    for (const row of rows) {
      expect(row.origin).toBe('foreign')
      expect(row.fromYear).not.toBeNull()
    }
  })

  it('leaves the list alone when nothing is asked', () => {
    const untouched: Searchable[] = filterRoster(roster.all, NO_FILTER)
    expect(untouched).toBe(roster.all)
    expect(isFiltered(NO_FILTER)).toBe(false)
  })
})

describe('player-facts — the merged research file, and what it is not allowed to do', () => {
  const read = (name: string) =>
    JSON.parse(readFileSync(join(__dirname, '..', 'content', 'manual', name), 'utf8'))

  const file = read('player-facts.json') as {
    records: Array<{
      personNameHe: string
      personNameLatin?: string
      position: string | null
      positionFrom: string | null
      origin: string | null
      originFrom: string | null
      fromYear: number | null
      toYear: number | null
      sources: string[]
      confidence: number
    }>
    conflicts: Array<{ personNameHe: string; field: string }>
    unknown: string[]
    refusedMatches: Array<{ personNameHe: string; source: string; reason: string }>
    sources: Array<{ key: string }>
  }

  const SOURCES = new Set([
    'squad',
    'vikipoel',
    // THE DECISION CHANGED (17.9.2026, rule 65): the ויקיפועל player page makes TWO
    // claims about a position — the infobox states a career, the lead sentence states
    // what he played at Hapoel — and they are not the same source. The set grew because
    // a seventh source exists, not because a row needed to be let through.
    'vikipoel-body',
    'wiki-he',
    'wiki-en',
    'wf-all',
    'wf-season',
    'archive-qualifier',
  ])

  it('states nothing without saying who said it', () => {
    // The whole file rests on this. A position with no `positionFrom` is a position
    // somebody typed, and there is no way to tell it apart from one somebody read.
    for (const row of file.records) {
      expect(row.sources.length, row.personNameHe).toBeGreaterThan(0)
      for (const key of row.sources) expect(SOURCES.has(key), `${row.personNameHe}: ${key}`).toBe(true)
      if (row.position !== null) {
        expect(['GK', 'DF', 'MF', 'FW'], row.personNameHe).toContain(row.position)
        expect(SOURCES.has(row.positionFrom ?? ''), row.personNameHe).toBe(true)
      }
      if (row.origin !== null) {
        expect(['israeli', 'foreign'], row.personNameHe).toContain(row.origin)
        expect(SOURCES.has(row.originFrom ?? ''), row.personNameHe).toBe(true)
      }
      if (row.fromYear !== null) {
        expect(row.fromYear, row.personNameHe).toBeGreaterThan(1900)
        expect(row.toYear ?? 0, row.personNameHe).toBeGreaterThanOrEqual(row.fromYear)
      }
      expect(row.confidence, row.personNameHe).toBeGreaterThanOrEqual(2)
    }
  })

  it('claims one man once', () => {
    const he = file.records.map((row) => row.personNameHe)
    expect(new Set(he).size).toBe(he.length)
  })

  it('keeps what the losing source said instead of deleting it', () => {
    // Five sources will not agree about every winger, and the merge is not allowed to
    // make the disagreement disappear. `conflicts` is where it goes — each entry names
    // the man, the field, what each source said, and which one was taken.
    expect(file.conflicts.length).toBeGreaterThan(0)
    for (const clash of file.conflicts) {
      expect(clash.personNameHe).toBeTruthy()
      expect(['position', 'origin', 'years', 'club']).toContain(clash.field)
      expect(file.records.find((row) => row.personNameHe === clash.personNameHe)).toBeTruthy()
    }
  })

  it('keeps the gap on the page instead of filling it in', () => {
    // ויקיפועל closed `unknown` entirely — every man in the roster now has a row. The
    // gap did not disappear, it MOVED: it is now the rows whose `position` is null
    // because ויקיפועל's own `תפקיד` field is empty on those pages. A null is the
    // honest shape for that, and the day none of them is null is the day somebody
    // guessed.
    const bare = file.records.filter((row) => row.position === null)
    expect(bare.length).toBeGreaterThan(0)
    expect(bare.every((row) => row.positionFrom === null)).toBe(true)
    for (const name of file.unknown) {
      expect(file.records.find((row) => row.personNameHe === name)).toBeUndefined()
    }
    // A refusal is about a SOURCE, not about a man: "worldfootball did not link to him"
    // leaves him free to be covered by another source, or by the archive's own
    // qualifier. What it must never do is quietly become a fact from the source that
    // refused.
    expect(file.refusedMatches.length).toBeGreaterThan(0)
    for (const refusal of file.refusedMatches) {
      expect(refusal.reason.length).toBeGreaterThan(20)
      const row = file.records.find((candidate) => candidate.personNameHe === refusal.personNameHe)
      if (!row) continue
      expect(row.sources, refusal.personNameHe).not.toContain(refusal.source)
      expect(row.positionFrom, refusal.personNameHe).not.toBe(refusal.source)
      expect(row.originFrom, refusal.personNameHe).not.toBe(refusal.source)
    }
  })

  it('covers most of the roster and still admits what it does not', () => {
    const roster = read('players-roster.json') as { records: Array<{ fullNameHe: string }> }
    const total = roster.records.length
    expect(file.records.length + file.unknown.length).toBe(total)
    const three = file.records.filter(
      (row) => row.position && row.origin && row.fromYear !== null,
    ).length
    expect(three).toBeGreaterThan(600)
    expect(three).toBeLessThan(total) // the day this is equal, somebody guessed
  })

  it('carries its two raw sources beside it, so the merge can be re-run', () => {
    // rule 11: the merge is reproducible from the repo, with no network and no /tmp.
    const seasons = read('player-facts-seasons.json') as {
      records: Array<{ personNameHe: string; matchedBy: string }>
    }
    for (const row of seasons.records) {
      expect(['alias', 'transliteration'], row.personNameHe).toContain(row.matchedBy)
    }
    const vp = read('player-facts-vikipoel.json') as {
      table: Array<{ personNameHe: string; origin: string }>
      source: { url: string; read: number }
    }
    expect(vp.table.length).toBeGreaterThan(600)
    expect(vp.source.url).toContain('wiki.red-fans.com')
    expect(vp.table.every((row) => row.origin === 'israeli' || row.origin === 'foreign')).toBe(true)
    const wiki = read('player-facts-wiki.json') as {
      wikiHe: { table: unknown[]; matched: unknown[] }
      wikiEn: { table: unknown[]; matched: unknown[] }
      wfAllPlayers: { table: unknown[]; matched: unknown[] }
    }
    expect(wiki.wikiHe.table.length).toBeGreaterThan(400)
    expect(wiki.wikiEn.table.length).toBeGreaterThan(40)
    expect(wiki.wfAllPlayers.table.length).toBeGreaterThan(500)
  })
})

describe('לשכוח את המכשיר — every worker.* key, whoever wrote it', () => {
  it('clears the three keys the hand-written list had fallen behind on', () => {
    const keys = keysToForget([])
    for (const key of ['worker.kitStudio.v1', 'worker.replayProgress.v1', 'worker.ballot.reasons.v1']) {
      expect(keys, key).toContain(key)
    }
    expect(keys).toContain('the-worker:life')
  })

  it('sweeps by prefix, so a key added next month is forgotten too — and nothing else is', () => {
    const keys = keysToForget([
      'worker.profile.v1',
      'worker.device.v1',
      'worker.marks.v1',
      'worker.intro.v1',
      'unrelated.key',
      'the-worker:life:sound',
    ])
    expect(keys).toEqual(expect.arrayContaining(['worker.device.v1', 'worker.marks.v1', 'worker.intro.v1']))
    expect(keys).not.toContain('unrelated.key')
    expect(keys).not.toContain('the-worker:life:sound')
  })
})

describe('שערים שנדלקו — plates, not ids', () => {
  it('counts a gate once however many topics it was played in', () => {
    const profile: Profile = {
      ...emptyProfile(),
      gates: {
        '/trivia/europe': { ...emptyStat(), plays: 2 },
        '/trivia/numbers': { ...emptyStat(), plays: 1 },
        '/derby/file': { ...emptyStat(), plays: 1 },
        '/life': { ...emptyStat(), plays: 4 },
      },
    }
    // trivia (one plate) + derby (the black file is gate 11); /life lights no plate
    expect(gatesTouched(profile)).toBe(2)
    expect(cardFigures(profile).gates).toBe(2)
    expect(totalPlays(profile)).toBe(8)
  })
})
