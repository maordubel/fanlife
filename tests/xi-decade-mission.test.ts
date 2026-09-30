import { describe, expect, it } from 'vitest'

import { formationList, rosterIndex } from '@/lib/game/allTimeXI'
import type { Formation } from '@/lib/game/lineup'
import { slotStatusOf, type Searchable } from '@/lib/game/roster-search'
import { shirtBoard } from '@/lib/xi/board'
import {
  SPAN_DECADES,
  SPAN_MAX,
  challengeStatus,
  chooseSpell,
  cleanDecades,
  decadeWord,
  spellsFor,
  toggleDecade,
  type SheetRow,
  type Spell,
} from '@/lib/xi/challenge'
import { migrateSheet, restore, type SavedXI } from '@/lib/xi/store'

/**
 * שער 1 · missions (29.9.2026) — foreign only, one decade, two, three. A mission is checked
 * against the CHOSEN SPELL, never the whole career; a man the archive cannot vouch for is
 * refused, never guessed.
 */

const roster = rosterIndex()
const board = shirtBoard(roster)
const byName = (nameHe: string): Searchable => {
  const entry = roster.all.find((row) => row.nameHe === nameHe)
  if (!entry) throw new Error(`no ${nameHe} in the roster`)
  return entry
}
const spells = (entry: Searchable) => spellsFor(entry, board.versions[entry.slug])
const span = (...decades: number[]) => ({ allowedDecades: decades })
const spell = (fromYear: number | null, toYear: number | null, id = ''): Spell => ({ id, fromYear, toYear })
const row = (slotId: string, s: Spell, status: 'israeli' | 'foreign' | 'unknown' = 'israeli'): SheetRow => ({
  slotId,
  spell: s,
  status,
})

describe('decade mission — the model', () => {
  it('cleans decades: whole decades only, ascending, no repeats, at most three', () => {
    expect(cleanDecades([2000, 1990, 1990, 1995, 'x', null])).toEqual([1990, 2000])
    expect(cleanDecades([1980, 1990, 2000, 2010])).toEqual([1980, 1990, 2000])
    expect(cleanDecades('1990')).toEqual([])
    expect(cleanDecades(undefined)).toEqual([])
    for (const decade of SPAN_DECADES) expect(decade % 10).toBe(0)
    expect(SPAN_MAX).toBe(3)
  })

  it('writes a decade the way the sentence does', () => {
    expect(decadeWord(1990)).toBe('90')
    expect(decadeWord(1980)).toBe('80')
    expect(decadeWord(2000)).toBe('2000')
    expect(decadeWord(2010)).toBe('2010')
  })
})

describe('one decade', () => {
  it('a spell overlapping the decade passes; a spell outside it does not', () => {
    expect(chooseSpell('span', [spell(1991, 1995)], 'israeli', {}, undefined, {}, span(1990)).ok).toBe(true)
    // begins in the 80s and runs into the 90s: it overlaps the decade, so it stands
    expect(chooseSpell('span', [spell(1988, 1992)], 'israeli', {}, undefined, {}, span(1990)).ok).toBe(true)
    expect(chooseSpell('span', [spell(2001, 2004)], 'israeli', {}, undefined, {}, span(1990))).toEqual({
      ok: false,
      why: 'era',
    })
  })

  it('judges the CHOSEN spell of a two-spell man, not his career', () => {
    // יוסי אבוקסיס: 1987–1992 and 2001–2006. Under "2000s" he is his second self; under
    // "1970s" he has no self at all, though his career is long.
    const abukasis = byName('יוסי אבוקסיס')
    const list = spells(abukasis)
    const nineties = chooseSpell('span', list, slotStatusOf(abukasis), {}, undefined, {}, span(1990))
    expect(nineties.ok && nineties.spell.id).toBe('1987-1992')
    const noughties = chooseSpell('span', list, slotStatusOf(abukasis), {}, undefined, {}, span(2000))
    expect(noughties.ok && noughties.spell.id).toBe('2001-2006')
    expect(chooseSpell('span', list, slotStatusOf(abukasis), {}, undefined, {}, span(1970))).toEqual({
      ok: false,
      why: 'era',
    })
  })

  it('the sheet report names the exact slot whose spell is outside the decade', () => {
    const rows = [row('GK', spell(1991, 1994)), row('D1', spell(1975, 1979)), row('D2', spell(1998, 2003))]
    const verdict = challengeStatus('span', rows, 3, span(1990))
    expect(verdict.broken).toEqual(['D1'])
    expect(verdict.met).toBe(false)
  })
})

describe('two and three decades', () => {
  it('two decades: every spell must belong to one of them', () => {
    const rows = [row('A', spell(1992, 1996)), row('B', spell(2003, 2007)), row('C', spell(1982, 1985))]
    const verdict = challengeStatus('span', rows, 3, span(1990, 2000))
    expect(verdict.broken).toEqual(['C'])
    expect(challengeStatus('span', rows.slice(0, 2), 2, span(1990, 2000)).met).toBe(true)
  })

  it('a spell outside BOTH decades is refused', () => {
    expect(chooseSpell('span', [spell(2012, 2015)], 'israeli', {}, undefined, {}, span(1990, 2000))).toEqual({
      ok: false,
      why: 'era',
    })
  })

  it('three decades work the same way', () => {
    const rows = [
      row('A', spell(1984, 1986)),
      row('B', spell(1995, 1999)),
      row('C', spell(2011, 2014)),
      row('D', spell(2005, 2006)),
    ]
    const three = span(1980, 1990, 2010)
    const verdict = challengeStatus('span', rows, 4, three)
    expect(verdict.broken).toEqual(['D'])
    expect(challengeStatus('span', rows.slice(0, 3), 3, three).met).toBe(true)
  })

  it('a fourth decade is not kept', () => {
    expect(cleanDecades([1970, 1980, 1990, 2000])).toEqual([1970, 1980, 1990])
  })
})

describe('undated men and unknown foreign-slot records', () => {
  it('an undated spell cannot satisfy a decade — it is refused as undated, and its slot is broken', () => {
    expect(chooseSpell('span', [spell(null, null)], 'israeli', {}, undefined, {}, span(1990))).toEqual({
      ok: false,
      why: 'undated',
    })
    expect(challengeStatus('span', [row('A', spell(null, null))], 1, span(1990)).broken).toEqual(['A'])
  })

  it('with no decade named the mission asks nothing and is never met', () => {
    const verdict = challengeStatus('span', [row('A', spell(1995, 1996))], 1, {})
    expect(verdict.broken).toEqual([])
    expect(verdict.met).toBe(false)
  })

  it('foreign XI: a man with no foreign-slot record is refused, and so is the other side', () => {
    expect(chooseSpell('foreign', [spell(1995, 1997)], 'unknown')).toEqual({ ok: false, why: 'no-record' })
    expect(chooseSpell('foreign', [spell(1995, 1997)], 'israeli')).toEqual({ ok: false, why: 'other-side' })
    expect(chooseSpell('foreign', [spell(1995, 1997)], 'foreign').ok).toBe(true)
    const rows = [row('A', spell(1995, 1997), 'foreign'), row('B', spell(1995, 1997), 'unknown')]
    expect(challengeStatus('foreign', rows, 2).broken).toEqual(['B'])
  })

  it('foreign XI is read from the real archive record, never from a name', () => {
    const foreigners = roster.all.filter((entry) => slotStatusOf(entry) === 'foreign')
    expect(foreigners.length).toBeGreaterThan(100)
    for (const entry of foreigners.slice(0, 15)) {
      expect(chooseSpell('foreign', spells(entry), 'foreign').ok, entry.nameHe).toBe(true)
    }
  })
})

describe('editing a slot recomputes validity', () => {
  it('replacing an invalid man with a valid one clears the report', () => {
    const decades = span(1990)
    const bad = [row('GK', spell(1991, 1994)), row('D1', spell(1975, 1979))]
    expect(challengeStatus('span', bad, 2, decades).met).toBe(false)
    const fixed = [bad[0] as SheetRow, row('D1', spell(1993, 1996))]
    const verdict = challengeStatus('span', fixed, 2, decades)
    expect(verdict.broken).toEqual([])
    expect(verdict.met).toBe(true)
  })

  it('changing the mission decades re-judges the same sheet', () => {
    const rows = [row('A', spell(1992, 1995)), row('B', spell(2004, 2006))]
    expect(challengeStatus('span', rows, 2, span(1990)).broken).toEqual(['B'])
    expect(challengeStatus('span', rows, 2, span(1990, 2000)).met).toBe(true)
  })
})

describe('the free XI and saved sheets are untouched', () => {
  it('free still admits everybody', () => {
    expect(chooseSpell('free', [spell(null, null)], 'unknown').ok).toBe(true)
    expect(challengeStatus('free', [row('A', spell(null, null), 'unknown')], 1).met).toBe(true)
  })

  it('other rules ignore any decades handed to them', () => {
    const rows = [row('A', spell(1975, 1977), 'foreign')]
    expect(challengeStatus('foreign', rows, 1, span(1990)).met).toBe(true)
  })

  it('switching decades: never fewer than one, never more than three, always ascending', () => {
    expect(toggleDecade([1990], 1990)).toEqual([1990])
    expect(toggleDecade([1990], 2000)).toEqual([1990, 2000])
    expect(toggleDecade([2000], 1980)).toEqual([1980, 2000])
    expect(toggleDecade([1980, 1990, 2000], 2010)).toEqual([1980, 1990, 2000])
    expect(toggleDecade([1980, 1990], 1990)).toEqual([1980])
  })

  it('a sheet saved before missions existed restores with no decades and stays free', () => {
    const first = formationList()[0] as Formation
    const restored = restore({ formation: first.name, picks: {}, savedOn: '' }, formationList())
    expect(restored?.challenge).toBe('free')
    expect(restored?.decades).toEqual([])
  })

  it('a decade mission survives a save and a restore, cleaned', () => {
    const first = formationList()[0] as Formation
    const saved: SavedXI = { formation: first.name, picks: {}, challenge: 'span', decades: [2000, 1990], savedOn: '' }
    const restored = restore(saved, formationList())
    expect(restored?.challenge).toBe('span')
    expect(restored?.decades).toEqual([1990, 2000])
    // a corrupted value is dropped, not repaired
    const junk = restore({ ...saved, decades: [1995, 'x'] as never }, formationList())
    expect(junk?.decades).toEqual([])
  })

  it('migrating a sheet keeps its decades', () => {
    const first = formationList()[0] as Formation
    const { sheet } = migrateSheet(
      { formation: first.name, picks: {}, challenge: 'span', decades: [1980], savedOn: '' },
      () => null,
    )
    expect(sheet.decades).toEqual([1980])
  })
})
