import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { rosterIndex, formationList } from '@/lib/game/allTimeXI'
import { FORMATIONS } from '@/lib/game/lineup'
import {
  filterRoster,
  NO_FILTER,
  positionsOf,
  type Searchable,
} from '@/lib/game/roster-search'
import { spellIndex, spellsFor } from '@/lib/kit/playerKit'
import { kitForSeason } from '@/lib/kit/seasons'
import { shirtBoard } from '@/lib/xi/board'
import { restore } from '@/lib/xi/store'
import { xiDna } from '@/lib/xi/dna'
import { fitOf, isSlotRole, ROLE_ACCEPTS, SLOT_ROLES } from '@/lib/xi/roles'
import { fitFor, scoutGroups, scoutTotal, SCOUT_ORDERS } from '@/lib/xi/scout'

const ROOT = join(__dirname, '..')
const POSITIONS = ['GK', 'DF', 'MF', 'FW'] as const

/**
 * שער 1 — שולחן המאמן: the formation, the fit, the versions and the DNA.
 *
 * Every test here is about the same thing said four ways: **gate 1 may describe, and may
 * not decide.** A slot's shape is ours to state; a man's position, his years and his
 * shirt are the archive's, and where the archive is silent the screen has to be silent
 * with it rather than filling the gap with something plausible.
 */

/* ------------------------------------------------------------------ the mapping */

describe('התאמה לעמדה — computed from the four the sources actually state', () => {
  it('maps every slot role down to canonical positions and never invents a fifth', () => {
    for (const role of SLOT_ROLES) {
      const accepts = ROLE_ACCEPTS[role]
      expect(accepts.length, role).toBeGreaterThan(0)
      for (const code of accepts) expect(POSITIONS, role).toContain(code)
    }
  })

  it('never accepts more than two of the four — a filter that takes everything is not one', () => {
    // The point of the mapping is that it narrows. A role that accepted three of the
    // four buckets would put nearly the whole roster in the "fit" group and the drawer
    // would be back to being a list of 661 names in a different order.
    for (const role of SLOT_ROLES) {
      expect(ROLE_ACCEPTS[role].length, role).toBeLessThanOrEqual(2)
    }
  })

  it('keeps the goalkeeper on both sides of the door', () => {
    // A keeper is the one position every source agrees on and the one slot nobody else
    // has filled — so GK accepts only GK, and no outfield slot accepts a GK.
    expect([...ROLE_ACCEPTS.GK]).toEqual(['GK'])
    for (const role of SLOT_ROLES) {
      if (role === 'GK') continue
      expect(ROLE_ACCEPTS[role], role).not.toContain('GK')
    }
    expect(fitOf(['GK'], 'ST')).toBe('other')
    expect(fitOf(['FW'], 'GK')).toBe('other')
  })

  it('answers unknown — never "unfit" — for a man no source places', () => {
    // The 25 with no documented position. `unknown` is the absence of a verdict, and
    // the screen shows them in their own group for exactly that reason (rule 11).
    for (const role of SLOT_ROLES) expect(fitOf([], role), role).toBe('unknown')
  })

  it('finds שייע פייגנבוים at both ends of the pitch, because the source lists both', () => {
    // Rule 74's own case, read the other way round. `תפקיד` is a LIST — he is filed as
    // a forward AND as a defender — so a striker's slot and a centre back's slot both
    // accept him, and neither answer throws the other away.
    const roster = rosterIndex()
    const shaye = roster.all.find((entry) => entry.nameHe === 'שייע פייגנבוים')
    expect(shaye).toBeTruthy()
    expect([...positionsOf(shaye as Searchable)]).toEqual(['FW', 'DF'])
    expect(fitFor(shaye as Searchable, 'ST')).toBe('fit')
    expect(fitFor(shaye as Searchable, 'CB')).toBe('fit')
    expect(fitFor(shaye as Searchable, 'GK')).toBe('other')
  })

  it('gives the whole back four the same answer, and says so out loud in the module', () => {
    // The mapping is coarse ON PURPOSE: the archive holds four buckets, so a right back
    // slot and a left back slot cannot honestly disagree about anybody. The comment that
    // explains it is load-bearing documentation, not decoration — this is what stops it
    // being "tidied away" by somebody adding a finer role next year.
    for (const role of ['RB', 'CB', 'LB'] as const) {
      expect([...ROLE_ACCEPTS[role]]).toEqual(['DF'])
    }
    const source = readFileSync(join(ROOT, 'lib/xi/roles.ts'), 'utf8')
    expect(source).toContain('GK / DF / MF / FW')
    expect(source).toContain('mapped DOWN')
  })
})

/* --------------------------------------------------------------- the formations */

describe('המערכים — eleven slots, all of them on the pitch', () => {
  const formations = formationList()

  it('ships every formation the map declares', () => {
    expect(formations.length).toBe(Object.keys(FORMATIONS).length)
    expect(formations.length).toBeGreaterThanOrEqual(4)
  })

  for (const formation of formations) {
    it(`${formation.name} — eleven unique slots, one keeper, none off the grass`, () => {
      expect(formation.slots.length).toBe(11)

      const ids = formation.slots.map((slot) => slot.slotId)
      expect(new Set(ids).size, 'duplicate slot id').toBe(11)

      // Two slots at the same point are one slot the player cannot tap. The pitch is a
      // percentage box, so the coordinates are the only thing that makes a slot
      // reachable at all.
      const points = formation.slots.map((slot) => `${slot.x}:${slot.y}`)
      expect(new Set(points).size, 'two slots on the same spot').toBe(11)

      for (const slot of formation.slots) {
        expect(slot.x, `${slot.slotId} x`).toBeGreaterThan(0)
        expect(slot.x, `${slot.slotId} x`).toBeLessThan(100)
        expect(slot.y, `${slot.slotId} y`).toBeGreaterThan(0)
        expect(slot.y, `${slot.slotId} y`).toBeLessThan(100)
        expect(isSlotRole(slot.role), `${slot.slotId} role ${slot.role}`).toBe(true)
        expect(slot.roleHe.length, slot.slotId).toBeGreaterThan(1)
      }

      const keepers = formation.slots.filter((slot) => slot.role === 'GK')
      expect(keepers.length, 'exactly one keeper').toBe(1)
      expect(keepers[0]?.slotId).toBe('GK')
    })
  }

  it('names the shape in the same order the pitch draws it', () => {
    // Index 0 of a row sits at the lowest inline-start, which in RTL is the right of the
    // screen. The Hebrew label and the code have to agree about that or every formation
    // puts a right back on the left wing at once.
    const back = FORMATIONS['4-4-2']?.slots.filter((slot) => slot.slotId.startsWith('D')) ?? []
    expect(back.map((slot) => slot.role)).toEqual(['RB', 'CB', 'CB', 'LB'])
    expect(back[0]?.roleHe).toBe('מגן ימני')
    expect(back[3]?.roleHe).toBe('מגן שמאלי')
  })
})

/* -------------------------------------------------------------------- the drawer */

describe('המגירה — grouping and order, and neither of them is a score', () => {
  const roster = rosterIndex()

  it('splits the roster into three buckets that add back up to it', () => {
    for (const role of SLOT_ROLES) {
      const groups = scoutGroups(roster.all, role, 'fit', false)
      expect(scoutTotal(groups), role).toBe(roster.total)
      expect(groups.fit.length, role).toBeGreaterThan(0)
    }
  })

  it('keeps the undocumented men when "fit only" is on', () => {
    // The whole point. Dropping them would turn "no source places him" into "he does not
    // suit this position" — a claim about a named man that nothing supports.
    const groups = scoutGroups(roster.all, 'CB', 'fit', true)
    expect(groups.other).toEqual([])
    expect(groups.unknown.length).toBeGreaterThan(0)
    for (const entry of groups.unknown) expect(positionsOf(entry).length, entry.nameHe).toBe(0)
    for (const entry of groups.fit) expect(positionsOf(entry), entry.nameHe).toContain('DF')
  })

  it('orders by name, by earliest and by latest — and never sorts a null to the front', () => {
    // A man the archive cannot date is not year zero. Sorting him to the top of
    // "earliest" would state that he played before everybody else.
    const undated = roster.all.filter((entry) => entry.fromYear === null)
    expect(undated.length, 'the roster has somebody with no years').toBeGreaterThan(0)

    const earliest = scoutGroups(roster.all, 'CM', 'earliest', false)
    for (const bucket of [earliest.fit, earliest.other, earliest.unknown]) {
      let seenNull = false
      let previous = -Infinity
      for (const entry of bucket) {
        if (entry.fromYear === null || entry.fromYear === undefined) {
          seenNull = true
          continue
        }
        expect(seenNull, `${entry.nameHe} came after an undated man`).toBe(false)
        expect(entry.fromYear).toBeGreaterThanOrEqual(previous)
        previous = entry.fromYear
      }
    }

    const latest = scoutGroups(roster.all, 'CM', 'latest', false)
    const dated = latest.fit.filter((entry) => entry.toYear !== null && entry.toYear !== undefined)
    for (let i = 1; i < dated.length; i += 1) {
      expect((dated[i - 1]?.toYear ?? 0) >= (dated[i]?.toYear ?? 0)).toBe(true)
    }

    const named = scoutGroups(roster.all, 'CM', 'name', false).fit
    for (let i = 1; i < named.length; i += 1) {
      expect(
        (named[i - 1] as Searchable).familyHe.localeCompare((named[i] as Searchable).familyHe, 'he'),
      ).toBeLessThanOrEqual(0)
    }
  })

  it('keeps the same men in every order — a sort is not a filter', () => {
    const slugs = (list: Searchable[]) => [...list.map((entry) => entry.slug)].sort()
    const base = scoutGroups(roster.all, 'RW', 'fit', false)
    for (const order of SCOUT_ORDERS) {
      const groups = scoutGroups(roster.all, 'RW', order, false)
      expect(slugs(groups.fit), order).toEqual(slugs(base.fit))
      expect(slugs(groups.unknown), order).toEqual(slugs(base.unknown))
    }
  })

  it('filters by a single season without assuming anybody into it', () => {
    const narrowed = filterRoster(roster.all, { ...NO_FILTER, year: 2010 })
    expect(narrowed.length).toBeGreaterThan(0)
    expect(narrowed.length).toBeLessThan(roster.total)
    for (const entry of narrowed) {
      expect(entry.fromYear, entry.nameHe).not.toBeNull()
      expect(entry.fromYear as number, entry.nameHe).toBeLessThanOrEqual(2010)
      expect((entry.toYear ?? entry.fromYear) as number, entry.nameHe).toBeGreaterThanOrEqual(2010)
    }
    // a man with no years is missing from the answer, never assumed into it
    const undated = roster.all.filter((entry) => entry.fromYear === null)
    for (const entry of undated) expect(narrowed).not.toContain(entry)
    // and no year at all is no filter at all
    expect(filterRoster(roster.all, NO_FILTER).length).toBe(roster.total)
  })
})

/* ------------------------------------------------------------------ the versions */

describe('גרסאות שחקן — derived from the squad table, never from an era somebody typed', () => {
  const index = spellIndex()
  const roster = rosterIndex()
  const board = shirtBoard(roster)

  it('splits משה סיני exactly where the archive does, and nobody else', () => {
    // Two spells: 1979/80–1988/89, away, then 1990/91–1992/93. The break is the
    // source's, and it is what makes a second version honest rather than manufactured.
    const spells = spellsFor('משה סיני')
    expect(spells.length).toBe(2)
    expect(spells[0]?.fromYear).toBe(1979)
    expect(spells[0]?.toYear).toBe(1988)
    expect(spells[0]?.primary).toBe(true)
    expect(spells[1]?.fromYear).toBe(1990)
    expect(spells[1]?.toYear).toBe(1992)
    // The whole-career shirt is unchanged by any of this: it is still the first shirt
    // inside his longest run (`tests/xi.test.ts` owns that rule).
    expect(spells[0]?.seasonLabel).toBe('1985/86')

    // שלום תקוה never left. One unbroken run, one version, no chooser.
    expect(spellsFor('שלום תקוה').length).toBe(1)
  })

  it('is a run of consecutive seasons with a real gap between the runs', () => {
    for (const [key, spells] of index) {
      expect(spells.length, key).toBeGreaterThan(0)
      let primaries = 0
      let longest = 0
      for (const spell of spells) {
        expect(spell.seasons.length, key).toBeGreaterThan(0)
        longest = Math.max(longest, spell.seasons.length)
        if (spell.primary) primaries += 1
        // consecutive inside the run
        for (let i = 1; i < spell.seasons.length; i += 1) {
          const before = Number((spell.seasons[i - 1] as string).slice(0, 4))
          const after = Number((spell.seasons[i] as string).slice(0, 4))
          expect(after, key).toBe(before + 1)
        }
        expect(spell.fromYear, key).toBe(Number((spell.seasons[0] as string).slice(0, 4)))
      }
      // one spell is the spell — the longest run, which is what `shirtFor` uses
      expect(primaries, key).toBe(1)
      expect(spells.find((spell) => spell.primary)?.seasons.length, key).toBe(longest)
      // and the runs are in time order with at least one missing season between them
      for (let i = 1; i < spells.length; i += 1) {
        expect((spells[i] as { fromYear: number }).fromYear, key).toBeGreaterThan(
          (spells[i - 1] as { toYear: number }).toYear + 1,
        )
      }
    }
  })

  it('dresses a version only from a season inside that version', () => {
    for (const [key, spells] of index) {
      for (const spell of spells) {
        if (spell.seasonLabel === null) {
          // silence is allowed and has to mean something: no season in this run has a
          // kit in the archive
          for (const season of spell.seasons) expect(kitForSeason(season), key).toBeNull()
          expect(spell.why, key).toBeNull()
          continue
        }
        expect(spell.seasons, key).toContain(spell.seasonLabel)
        expect(kitForSeason(spell.seasonLabel), key).not.toBeNull()
        expect(['trophy', 'run'], key).toContain(spell.why)
      }
    }
  })

  it('ships a chooser only to the men who have something to choose between', () => {
    // 109 of the 661. Everybody else carries no `versions` key at all rather than a
    // one-button control that teaches a fact nobody stated (rule 59).
    expect(board.withVersions).toBe(109)
    expect(Object.keys(board.versions).length).toBe(board.withVersions)
    for (const [slug, versions] of Object.entries(board.versions)) {
      expect(versions.length, slug).toBeGreaterThan(1)
      expect(new Set(versions.map((version) => version.id)).size, slug).toBe(versions.length)
      for (const version of versions) {
        expect(version.id, slug).toBe(`${version.fromYear}-${version.toYear}`)
        expect(version.toYear, slug).toBeGreaterThanOrEqual(version.fromYear)
        expect(version.seasons, slug).toBeGreaterThan(0)
        // every drawable version's shirt is in the payload, or the screen would ask for
        // a season it was never sent
        if (version.seasonLabel) expect(board.seasons[version.seasonLabel], slug).toBeTruthy()
      }
      // the pick opens on a version this man actually has
      const start = board.defaultVersion[slug]
      expect(versions.map((version) => version.id), slug).toContain(start)
    }
    // a single-spell man is absent from both maps
    const tikva = roster.all.find((entry) => entry.nameHe === 'שלום תקוה')
    expect(tikva).toBeTruthy()
    expect(board.versions[(tikva as Searchable).slug]).toBeUndefined()
    expect(board.defaultVersion[(tikva as Searchable).slug]).toBeUndefined()
  })

  it('opens a multi-spell man on the version holding the shirt he is identified with', () => {
    const sinai = roster.all.find((entry) => entry.nameHe === 'משה סיני') as Searchable
    const start = board.defaultVersion[sinai.slug]
    const chosen = board.versions[sinai.slug]?.find((version) => version.id === start)
    expect(chosen?.seasonLabel).toBe(board.bySlug[sinai.slug]?.seasonLabel)
    expect(chosen?.id).toBe('1979-1988')
  })

  it('still leaves every shirt in the payload once, not once per player', () => {
    // The versions widened what the board has to send. Twenty-one home kits dress the
    // whole roster, and that number is what keeps the payload a payload.
    expect(Object.keys(board.seasons).length).toBeLessThan(25)
    for (const row of Object.values(board.bySlug)) {
      expect(board.seasons[row.seasonLabel]).toBeTruthy()
    }
  })
})

/* ----------------------------------------------------------------------- the DNA */

describe('DNA — counted, and never added up into a verdict', () => {
  it('counts each man once, in the decade his spell began', () => {
    const dna = xiDna(
      [
        { fromYear: 1979, origin: 'israeli' },
        { fromYear: 1984, origin: 'israeli' },
        { fromYear: 1999, origin: 'foreign' },
        { fromYear: 2001, origin: null },
      ],
      '4-4-2',
    )
    expect(dna.decades).toEqual([
      { decade: 1970, count: 1 },
      { decade: 1980, count: 1 },
      { decade: 1990, count: 1 },
      { decade: 2000, count: 1 },
    ])
    // the columns are a partition: they add up to the men who have years, and no more
    const summed = dna.decades.reduce((total, row) => total + row.count, 0)
    expect(summed + dna.undated).toBe(dna.picked)
    expect(dna.spread).toBe(4)
    expect(dna.origin).toEqual({ israeli: 2, foreign: 1, unknown: 1 })
    expect(dna.formation).toBe('4-4-2')
  })

  it('never folds an unknown into the likely answer', () => {
    // A man the archive cannot date and a man with no stated origin each get their own
    // row. Counting them as Israelis — the overwhelmingly likely answer — would be a
    // guess about named people (rule 11).
    const dna = xiDna([{ fromYear: null, origin: null }], '4-3-3')
    expect(dna.decades).toEqual([])
    expect(dna.undated).toBe(1)
    expect(dna.spread).toBe(0)
    expect(dna.origin).toEqual({ israeli: 0, foreign: 0, unknown: 1 })
  })

  it('describes an incomplete eleven rather than refusing to', () => {
    const dna = xiDna([{ fromYear: 2010, origin: 'foreign' }], '3-5-2')
    expect(dna.picked).toBe(1)
    expect(dna.decades).toEqual([{ decade: 2010, count: 1 }])
    expect(xiDna([], '4-4-2').picked).toBe(0)
  })

  it('produces no total, no percentage and no grade', () => {
    // The shape of the object is the promise. A field called `score`, `total` or
    // `balance` here would be the fake scoring gate 1 refuses (rule 74).
    const dna = xiDna([{ fromYear: 1990, origin: 'israeli' }], '4-4-2')
    expect(Object.keys(dna).sort()).toEqual(
      ['decades', 'formation', 'origin', 'picked', 'spread', 'undated'].sort(),
    )
    const source = readFileSync(join(ROOT, 'lib/xi/dna.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/^\s*\/\/.*$/gm, ' ')
    for (const word of ['score', 'percent', 'grade', 'best', 'worstOf']) {
      expect(source, `lib/xi/dna.ts names ${word}`).not.toContain(word)
    }
  })
})

/* -------------------------------------------------------------------- the sheets */

describe('מה שנשמר — the sheet grew, and an old sheet still opens', () => {
  const formations = formationList()
  const first = formations[0]!
  const slot = first.slots[0]!.slotId
  const other = first.slots[1]!.slotId

  it('reads a sheet written before any of this existed', () => {
    // Every field after `picks` is optional precisely so that a device holding last
    // week's eleven opens it, rather than dropping it on the floor.
    const restored = restore(
      { formation: first.name, picks: { [slot]: 'אבדגי' }, savedOn: '' },
      formations,
    )
    expect(restored?.picks).toEqual({ [slot]: 'אבדגי' })
    expect(restored?.versions).toEqual({})
    expect(restored?.captain).toBeNull()
    expect(restored?.twelfth).toBeNull()
    expect(restored?.shortlist).toEqual([])
  })

  it('drops a version and an armband that no longer have a man under them', () => {
    const restored = restore(
      {
        formation: first.name,
        picks: { [slot]: 'אבדגי' },
        versions: { [slot]: '1979-1988', [other]: '1990-1992' },
        captain: other,
        twelfth: 'אבו-דוסו',
        cut: 'אבדגי',
        shortlist: ['אבו-דוסו'],
        savedOn: '',
      },
      formations,
    )
    // the version on the empty slot goes with the man who was not there
    expect(restored?.versions).toEqual({ [slot]: '1979-1988' })
    // a captain of an empty shirt is a C drawn on nothing
    expect(restored?.captain).toBeNull()
    expect(restored?.twelfth).toBe('אבו-דוסו')
    expect(restored?.cut).toBe('אבדגי')
    expect(restored?.shortlist).toEqual(['אבו-דוסו'])
  })
})
