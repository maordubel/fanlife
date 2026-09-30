import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import aliasesFile from '@/content/manual/player-aliases.json'
import { pickerRoster, resolvePlayer } from '@/lib/archive/player-master'
import { formationList, rosterIndex } from '@/lib/game/allTimeXI'
import { slotStatusOf, type Searchable } from '@/lib/game/roster-search'
import { shirtBoard } from '@/lib/xi/board'
import {
  CHALLENGES,
  challengeStatus,
  chooseSpell,
  decadeOf,
  isChallenge,
  spellsFor,
  takenDecades,
  type SheetRow,
} from '@/lib/xi/challenge'
import { migrateSheet, refResolver, restore, type SavedXI } from '@/lib/xi/store'

const ROOT = join(__dirname, '..')

/**
 * שער 1 · Manager's Table V2 — the challenges are rules, the version follows the filters,
 * and a sheet saved under an old key still opens (players.md §2 and §5 step 2).
 */

const roster = rosterIndex()
const board = shirtBoard(roster)
const byName = (nameHe: string): Searchable => {
  const entry = roster.all.find((row) => row.nameHe === nameHe)
  if (!entry) throw new Error(`no ${nameHe} in the roster`)
  return entry
}
const spells = (entry: Searchable) => spellsFor(entry, board.versions[entry.slug])

describe('האתגרים — six rules and "free", checked against the chosen spell', () => {
  it('knows its seven rules (six plus the decade mission) and refuses anything else', () => {
    expect([...CHALLENGES]).toEqual(['free', 'decades', 'pre2000', 'modern', 'israeli', 'foreign', 'span'])
    for (const id of CHALLENGES) expect(isChallenge(id)).toBe(true)
    expect(isChallenge('best')).toBe(false)
    expect(isChallenge(undefined)).toBe(false)
  })

  it('admits a two-spell man as the self the era asks for, and refuses him only when none fits', () => {
    // יוסי אבוקסיס: 1987–1992, and again 2001–2006. The rule is about the man you put on
    // the pitch, so each era challenge takes a different version of him.
    const abukasis = byName('יוסי אבוקסיס')
    const list = spells(abukasis)
    expect(list.map((spell) => spell.id)).toEqual(['1987-1992', '2001-2006'])
    const pre = chooseSpell('pre2000', list, slotStatusOf(abukasis))
    const modern = chooseSpell('modern', list, slotStatusOf(abukasis))
    expect(pre.ok && pre.spell.id).toBe('1987-1992')
    expect(modern.ok && modern.spell.id).toBe('2001-2006')

    // a man whose every spell is before 2000 has no modern self to offer
    const sinai = byName('משה סיני')
    expect(chooseSpell('modern', spells(sinai), slotStatusOf(sinai))).toEqual({ ok: false, why: 'era' })
  })

  it('reads the foreign-slot record, and excludes — never guesses — a man with none', () => {
    const unknown = roster.all.filter((entry) => slotStatusOf(entry) === 'unknown')
    // the gap is real and small; the drawer counts it on screen by this reason
    expect(unknown.length).toBeGreaterThan(0)
    expect(unknown.length).toBeLessThan(40)
    for (const entry of unknown) {
      expect(chooseSpell('israeli', spells(entry), 'unknown')).toEqual({ ok: false, why: 'no-record' })
      expect(chooseSpell('foreign', spells(entry), 'unknown')).toEqual({ ok: false, why: 'no-record' })
    }
    const foreign = roster.all.filter((entry) => slotStatusOf(entry) === 'foreign')
    expect(foreign.length).toBeGreaterThan(100)
    for (const entry of foreign.slice(0, 20)) {
      expect(chooseSpell('foreign', spells(entry), 'foreign').ok, entry.nameHe).toBe(true)
      expect(chooseSpell('israeli', spells(entry), 'foreign')).toEqual({ ok: false, why: 'other-side' })
    }
  })

  it('takes the badge from the club record, not from a nationality somebody declared', () => {
    // `foreignSlot` is the vikipoel category; `origin` is the legacy facet that mixed in
    // squad-sheet and Wikipedia nationality. The row carries both, and the screens read the first.
    const master = pickerRoster()
    for (const entry of roster.all.slice(0, 200)) {
      const player = master.players.find((row) => row.id === entry.id)
      expect(entry.foreignSlot, entry.nameHe).toBe(player?.foreignSlot)
    }
  })

  it('allows one spell per decade — the decade the chosen spell BEGAN in', () => {
    const abukasis = byName('יוסי אבוקסיס')
    const taken = new Set([1980])
    const answer = chooseSpell('decades', spells(abukasis), slotStatusOf(abukasis), {}, taken)
    // his 1987 spell's decade is taken, so the rule picks his 2001 self
    expect(answer.ok && answer.spell.id).toBe('2001-2006')
    expect(
      chooseSpell('decades', spells(abukasis), slotStatusOf(abukasis), {}, new Set([1980, 2000])),
    ).toEqual({ ok: false, why: 'decade-taken' })
    // an undated man cannot be placed in any decade, so he cannot satisfy the rule
    const undated = roster.all.find((entry) => entry.fromYear === null) as Searchable
    expect(chooseSpell('decades', spells(undated), slotStatusOf(undated))).toEqual({ ok: false, why: 'undated' })
  })

  it('names the slots that break the rule and says met only for a full, obedient eleven', () => {
    const row = (slotId: string, fromYear: number, status: SheetRow['status'] = 'israeli'): SheetRow => ({
      slotId,
      spell: { id: '', fromYear, toYear: fromYear + 2 },
      status,
    })
    const rows = [row('GK', 1985), row('D1', 1987), row('D2', 1995)]
    const decades = challengeStatus('decades', rows)
    // the LATER slot of the clash is named, never both
    expect(decades.broken).toEqual(['D1'])
    expect(decades.complete).toBe(false)
    expect(decades.met).toBe(false)

    const eleven = Array.from({ length: 11 }, (_, index) => row(`S${index}`, 1920 + index * 10))
    expect(challengeStatus('decades', eleven)).toMatchObject({ met: true, broken: [] })
    expect(challengeStatus('pre2000', eleven).broken).toEqual(['S8', 'S9', 'S10'])
    expect(challengeStatus('free', eleven).met).toBe(true)
    expect(challengeStatus('israeli', [...eleven.slice(0, 10), row('S10', 2020, 'unknown')]).broken).toEqual(['S10'])
    expect(takenDecades(rows, 'D2')).toEqual(new Set([1980]))
    expect(decadeOf({ id: '', fromYear: null, toYear: null })).toBeNull()
  })

  it('produces a verdict and never a score', () => {
    const status = challengeStatus('free', [])
    expect(Object.keys(status).sort()).toEqual(['broken', 'challenge', 'complete', 'met'])
    const source = readFileSync(join(ROOT, 'lib/xi/challenge.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/^\s*\/\/.*$/gm, ' ')
    for (const word of ['score', 'percent', 'grade', 'points']) {
      expect(source, `lib/xi/challenge.ts names ${word}`).not.toContain(word)
    }
  })
})

describe('הגרסה הולכת אחרי הסינון — the version follows the active filters', () => {
  it('picks the spell containing the asked season, then the decade, then the default', () => {
    const sinai = byName('משה סיני')
    const list = spells(sinai)
    const fallbackId = board.defaultVersion[sinai.slug] ?? null
    expect(fallbackId).toBe('1979-1988')
    const pick = (wish: Parameters<typeof chooseSpell>[3]) => {
      const answer = chooseSpell('free', list, slotStatusOf(sinai), wish)
      return answer.ok ? answer.spell.id : null
    }
    expect(pick({ year: 1991, fallbackId })).toBe('1990-1992')
    expect(pick({ decade: 1990, fallbackId })).toBe('1990-1992')
    expect(pick({ decade: 1980, fallbackId })).toBe('1979-1988')
    expect(pick({ fallbackId })).toBe('1979-1988')
    // a season he was not at the club falls back rather than inventing a spell
    expect(pick({ year: 1989, fallbackId })).toBe('1979-1988')
  })

  it('lets the challenge overrule the default version', () => {
    const abukasis = byName('יוסי אבוקסיס')
    const fallbackId = board.defaultVersion[abukasis.slug] ?? null
    const answer = chooseSpell('modern', spells(abukasis), slotStatusOf(abukasis), { fallbackId })
    expect(answer.ok && answer.spell.id).toBe('2001-2006')
  })

  it('gives a single-spell man one spell with no id to store', () => {
    const tikva = byName('שלום תקוה')
    expect(board.versions[tikva.slug]).toBeUndefined()
    const list = spells(tikva)
    expect(list).toHaveLength(1)
    expect(list[0]?.id).toBe('')
    expect(list[0]?.fromYear).toBe(tikva.fromYear)
  })
})

describe('מזהים במקום סלאגים — a saved sheet moves to p_ ids and nothing is silently dropped', () => {
  const formations = formationList()
  const first = formations[0]!
  const slots = first.slots.map((slot) => slot.slotId)
  const resolve = refResolver({ roster: roster.all, slugAliases: pickerRoster().slugAliases })
  const merged = (aliasesFile as { merges: { keep: string; absorb: string[] }[] }).merges

  it('resolves each of the six slugs a reviewed merge retired to the id it now belongs to', () => {
    const absorbed = merged.flatMap((merge) => merge.absorb.map((slug) => ({ slug, keep: merge.keep })))
    expect(absorbed).toHaveLength(6)
    for (const { slug, keep } of absorbed) {
      const id = resolve(slug)
      expect(id, slug).toMatch(/^p_[0-9a-f]{10}$/)
      expect(id, slug).toBe(resolvePlayer(keep)?.id)
      // and the current roster no longer carries the retired slug as a row of its own
      expect(roster.all.some((entry) => entry.slug === slug), slug).toBe(false)
    }
  })

  it('migrates a legacy sheet built on those six slugs without losing a single pick', () => {
    const absorbed = merged.flatMap((merge) => merge.absorb)
    const legacy: SavedXI = {
      formation: first.name,
      picks: Object.fromEntries(absorbed.map((slug, index) => [slots[index] as string, slug])),
      versions: {},
      captain: slots[0],
      twelfth: 'משה-סיני',
      cut: absorbed[0],
      shortlist: [...absorbed, 'שלום-תקוה'],
      savedOn: '2026-09-01',
    }
    const { sheet, unresolved } = migrateSheet(legacy, resolve)
    expect(unresolved).toEqual([])
    expect(Object.keys(sheet.picks)).toHaveLength(6)
    for (const id of Object.values(sheet.picks)) expect(id).toMatch(/^p_[0-9a-f]{10}$/)
    expect(sheet.captain).toBe(slots[0])
    expect(sheet.twelfth).toBe(resolvePlayer('משה-סיני')?.id)
    expect(sheet.cut).toBe(sheet.picks[slots[0] as string])
    expect(sheet.shortlist).toHaveLength(7)
    // and it restores onto the pitch as the same shape
    expect(Object.keys(restore(sheet, formations)?.picks ?? {})).toHaveLength(6)
  })

  it('keeps an id as an id, and SAYS what it cannot resolve instead of shortening the eleven', () => {
    const id = resolvePlayer('משה סיני')?.id as string
    const { sheet, unresolved } = migrateSheet(
      {
        formation: first.name,
        picks: { [slots[0] as string]: id, [slots[1] as string]: 'no-such-man', [slots[2] as string]: 'עמרי-אפק' },
        versions: { [slots[1] as string]: '1990-1992' },
        savedOn: '',
      },
      resolve,
    )
    expect(sheet.picks[slots[0] as string]).toBe(id)
    expect(sheet.picks[slots[2] as string]).toBe(resolvePlayer('עומרי-אפק')?.id)
    expect(unresolved).toEqual(['no-such-man'])
    // a version hanging on the unresolved slot goes with it
    expect(sheet.versions).toEqual({})
  })

  it('reports a duplicate that two retired spellings of one man would create', () => {
    const { sheet, unresolved } = migrateSheet(
      {
        formation: first.name,
        picks: { [slots[0] as string]: 'עמרי-אפק', [slots[1] as string]: 'עומרי-אפק' },
        savedOn: '',
      },
      resolve,
    )
    expect(Object.keys(sheet.picks)).toHaveLength(1)
    expect(unresolved).toHaveLength(1)
  })

  it('stores ids and the challenge, and reads an old sheet with neither', () => {
    const store = readFileSync(join(ROOT, 'lib/xi/store.ts'), 'utf8')
    expect(store).toContain('isChallenge(sheet.challenge)')
    const restored = restore({ formation: first.name, picks: {}, savedOn: '' }, formations)
    expect(restored?.challenge).toBe('free')
  })
})

describe('המסך — what the builder is held to', () => {
  const builder = readFileSync(join(ROOT, 'app/xi/XIBuilder.tsx'), 'utf8')

  it('reports the deed through the progress layer, fingerprinted, and never through recordDeed', () => {
    expect(builder).toContain("emit({ type: 'deed', gate: '/xi', mark })")
    expect(builder).toContain('markOf(')
    expect(builder).not.toContain('recordDeed')
  })

  it('buzzes through the one shared helper', () => {
    expect(builder).toContain("from '@/lib/play/haptics'")
    expect(builder).not.toContain('navigator.vibrate')
  })

  it('draws the shirts with the kit engine at mini density, not a second renderer', () => {
    expect(builder).toContain('density="mini"')
    expect(builder).not.toContain('KitPlate')
    expect(builder).not.toContain('shirtInner')
    const sheet = readFileSync(join(ROOT, 'components/roster/RosterSheet.tsx'), 'utf8')
    expect(sheet).toContain('IntersectionObserver')
    expect(sheet).toContain('density="mini"')
  })
})
