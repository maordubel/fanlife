import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  allPlayers,
  findPlayer,
  holdersOfNumber,
  pickerRoster,
  playerById,
  playerCount,
  playerMaster,
  playersByShirtNumber,
  resolvePlayer,
  versionsOf,
} from '@/lib/archive/player-master'
import { facetsFor as facetsForCheck } from '@/lib/game/roster-facets'
import { isPlayerId, type PlayerIdEntry } from '@/lib/archive/player-identity'
import { rosterIndex } from '@/lib/game/allTimeXI'
import { footballPeople } from '@/lib/game/archive'
import { shirtFor, spellsFor } from '@/lib/kit/playerKit'
import { serialisePlayerRegistry, mintPlayerIds, planPersons } from '@/scripts/ingest/lib/playerIds'
import {
  PLAYER_MASTER_INPUTS,
  buildPlayerMaster,
  inputsSha,
  serialisePlayerMaster,
} from '@/scripts/players/build-master'

/**
 * Player Master v2 (21.9.2026). One person, one `p_…` id, whatever the file calls him —
 * and nobody who is only a spelling.
 */

const ROOT = join(__dirname, '..')
const read = (file: string) => JSON.parse(readFileSync(join(ROOT, file), 'utf8'))
const registry = (read('content/manual/player-ids.json') as { records: PlayerIdEntry[] }).records
const aliases = read('content/manual/player-aliases.json') as {
  merges: { keep: string; absorb: string[] }[]
  nameAliases: { slug: string; nameHe: string }[]
  classifications: { slug: string; kind: string }[]
}

describe('player master — the v1 promises, kept', () => {
  it('has unique ids and counts itself honestly', () => {
    const rows = allPlayers()
    expect(playerCount()).toBe(rows.length)
    expect(rows.length).toBeGreaterThan(500)
    expect(new Set(rows.map((p) => p.id)).size).toBe(rows.length)
  })

  it('preserves shirt-number season evidence', () => {
    const rows = playersByShirtNumber(11)
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.some((p) => p.shirtNumbers.some((s) => s.number === 11 && Boolean(s.seasonLabel)))).toBe(true)
  })

  it('never presents archive scorer evidence as a career total', () => {
    for (const p of allPlayers().filter((row) => row.archiveGoals)) {
      expect(p.archiveGoals?.complete).toBe(false)
      expect(p.archiveGoals?.scope).toMatch(/never a career total/)
      for (const spell of p.spells) if (spell.documentedGoals) expect(spell.documentedGoals.complete).toBe(false)
    }
  })

  it('finds canonical names without punctuation sensitivity', () => {
    const first = allPlayers()[0]!
    expect(findPlayer(first.displayName)?.id).toBe(first.id)
  })
})

describe('identity — ids, registry, resolution', () => {
  it('holds exactly the registry persons, each under a minted p_ id', () => {
    const minted = new Map(registry.map((entry) => [entry.slug, entry.id]))
    for (const p of allPlayers()) {
      expect(isPlayerId(p.id), p.slug).toBe(true)
      expect(minted.get(p.slug), p.slug).toBe(p.id)
    }
  })

  it('keeps the registry frozen — re-minting over it changes nothing', () => {
    const plan = planPersons(ROOT)
    expect(plan.problems).toEqual([])
    const again = mintPlayerIds(registry, plan.persons, '2099-01-01')
    expect(again.minted).toBe(0)
    expect(again.grown).toBe(0)
    expect(serialisePlayerRegistry(again.records)).toBe(
      readFileSync(join(ROOT, 'content/manual/player-ids.json'), 'utf8'),
    )
  })

  it('resolves every roster slug and every archive person', () => {
    const excluded = new Set(playerMaster.excluded.map((row) => row.nameHe))
    for (const file of ['content/manual/players-roster.json', 'content/manual/people.json']) {
      for (const row of read(file).records as { slug: string; fullNameHe: string }[]) {
        if (excluded.has(row.fullNameHe)) continue
        expect(resolvePlayer(row.slug), `${file} ${row.slug}`).not.toBeNull()
        expect(resolvePlayer(row.fullNameHe), `${file} ${row.fullNameHe}`).not.toBeNull()
      }
    }
    for (const person of footballPeople) expect(resolvePlayer(person.slug), person.slug).not.toBeNull()
  })

  it('resolves every name in every lineup — XI, bench, decoys and coach', () => {
    for (const lineup of read('content/manual/lineups.json').records as Record<string, any>[]) {
      const names = [
        ...Object.values(lineup.xi as Record<string, string>),
        ...((lineup.benchHe ?? []) as string[]).map((raw) => raw.replace(/\s*\(.*$/, '')),
        ...((lineup.distractors ?? []) as string[]),
        ...(lineup.coachHe ? [lineup.coachHe as string] : []),
      ]
      for (const name of names) expect(resolvePlayer(name), `${lineup.matchId}: ${name}`).not.toBeNull()
    }
  })

  it('folds the reviewed merges into one person and nothing else', () => {
    for (const merge of aliases.merges) {
      const kept = resolvePlayer(merge.keep)
      expect(kept?.slug, merge.keep).toBe(merge.keep)
      for (const slug of merge.absorb) {
        expect(resolvePlayer(slug)?.id, slug).toBe(kept?.id)
        expect(kept?.slugAliases).toContain(slug)
      }
    }
    for (const alias of aliases.nameAliases) expect(resolvePlayer(alias.nameHe)?.slug).toBe(alias.slug)
    // exactly the reviewed merges carry former slugs — the pipeline merged nobody itself
    const merged = allPlayers().filter((p) => p.slugAliases.length > 0).map((p) => p.slug).sort()
    expect(merged).toEqual(aliases.merges.map((m) => m.keep).sort())
  })

  it('resolves by id, by former slug and by a v1 id; refuses a shared spelling', () => {
    const afek = resolvePlayer('עומרי-אפק')!
    expect(playerById(afek.id)).toBe(afek)
    expect(resolvePlayer('עמרי-אפק')).toBe(afek)
    expect(resolvePlayer('עמרי אפק')).toBe(afek)
    expect(resolvePlayer('Omri Afek')).toBe(afek)
    expect(afek.legacyIds.length).toBeGreaterThan(0)
    for (const legacy of afek.legacyIds) expect(resolvePlayer(legacy)).toBe(afek)
    // two men are עומר פרץ — the bare name is nobody's (rule 7)
    expect(resolvePlayer('עומר פרץ')).toBeNull()
    // a surname alone is never enough (rule 64 §5)
    expect(resolvePlayer('אלטמן')).toBeNull()
  })

  it('resolves the two lineup spellings that used to fall through', () => {
    expect(resolvePlayer('גילי ורמוט')?.slug).toBe('גיל-ורמוט')
    expect(resolvePlayer('יום טוב טליאס')?.kind).toBe('player')
  })
})

describe('no phantoms — a spelling is not a person', () => {
  it('builds every person from people.json or the roster, never from a number row', () => {
    const known = new Set<string>()
    for (const file of ['content/manual/players-roster.json', 'content/manual/people.json']) {
      for (const row of read(file).records as { slug: string }[]) known.add(row.slug)
    }
    for (const p of allPlayers()) {
      expect(known.has(p.slug), p.slug).toBe(true)
      expect(
        p.provenance.some((ref) => ref.file === 'people.json' || ref.file === 'players-roster.json'),
        p.slug,
      ).toBe(true)
    }
  })

  it('reports the unattached shirt-number spellings instead of creating them', () => {
    const spellings = playerMaster.unresolved.filter((row) => row.file === 'shirt-numbers.json')
    expect(spellings.length).toBeGreaterThan(0)
    for (const row of spellings) {
      expect(resolvePlayer(row.nameHe), row.nameHe).toBeNull()
      expect(allPlayers().some((p) => p.displayName === row.nameHe)).toBe(false)
      expect(row.numbers?.length, row.nameHe).toBeGreaterThan(0)
      // a suggestion is a suggestion: its slug is a real person, and it was not applied
      for (const candidate of row.candidates ?? []) expect(resolvePlayer(candidate.slug)).not.toBeNull()
    }
    // …and "who wore #N" still answers with them, by the name the source wrote
    const sample = spellings[0]!.numbers![0]!
    const holders = holdersOfNumber(sample.number, sample.seasonLabel)
    expect(holders.some((h) => h.playerId === null && h.nameHe === spellings[0]!.nameHe)).toBe(true)
    for (const holder of holders) expect(holder.seasonLabel).toBe(sample.seasonLabel)
  })
})

describe('kind — only footballers are pickable', () => {
  it('keeps the four non-players in the archive and out of every picker', () => {
    for (const row of aliases.classifications) {
      const person = resolvePlayer(row.slug)
      expect(person?.kind, row.slug).toBe(row.kind)
    }
    const nonPlayers = allPlayers().filter((p) => p.kind !== 'player')
    expect(nonPlayers.length).toBe(aliases.classifications.length)
    const roster = rosterIndex()
    const picker = pickerRoster()
    for (const p of nonPlayers) {
      expect(roster.all.some((entry) => entry.slug === p.slug), p.slug).toBe(false)
      expect(picker.players.some((entry) => entry.id === p.id), p.slug).toBe(false)
    }
    expect(roster.total).toBe(playerMaster.counts.pickable)
    expect(picker.players.length).toBe(roster.total)
  })

  it('offers each person once — a merged-away slug is not a second row', () => {
    const roster = rosterIndex()
    expect(new Set(roster.all.map((entry) => entry.id)).size).toBe(roster.total)
    for (const merge of aliases.merges) {
      for (const slug of merge.absorb) expect(roster.all.some((entry) => entry.slug === slug), slug).toBe(false)
    }
    // the picker says where a saved legacy slug went
    for (const merge of aliases.merges) {
      for (const slug of merge.absorb) expect(pickerRoster().slugAliases[slug]).toBe(resolvePlayer(merge.keep)?.id)
    }
  })

  it('sends each season label once in the picker payload', () => {
    const picker = pickerRoster()
    expect(new Set(picker.seasons).size).toBe(picker.seasons.length)
    for (const player of picker.players) {
      for (const spell of player.spells ?? []) {
        for (const index of spell.seasons) expect(picker.seasons[index]).toBeTruthy()
      }
    }
  })
})

describe('foreign slot is not nationality', () => {
  it('takes the slot only from ויקיפועל\'s category and never from a nationality', () => {
    for (const p of allPlayers()) {
      expect(['israeli', 'foreign', 'unknown']).toContain(p.foreignSlot.status)
      expect(p.foreignSlotStatus).toBe(p.foreignSlot.status)
      if (p.foreignSlot.status === 'unknown') expect(p.foreignSlot.from).toBeNull()
      else expect(p.foreignSlot.from).toBe('vikipoel-category')
      for (const claim of p.nationalityClaims ?? []) expect(claim.from).not.toBe('vikipoel')
      if (p.currentSquad?.declaredNationality) {
        expect(p.declaredNationality).toEqual(expect.arrayContaining(p.currentSquad.declaredNationality))
      }
    }
  })

  it('keeps the Hebrew-Wikipedia nationality rows as claims with no slot behind them', () => {
    const facts = read('content/manual/player-facts.json').records as { personNameHe: string; originFrom: string }[]
    const wiki = facts.filter((row) => row.originFrom === 'wiki-he')
    expect(wiki.length).toBeGreaterThan(0)
    for (const row of wiki) {
      const p = resolvePlayer(row.personNameHe)!
      expect(p.nationalityClaims?.some((claim) => claim.from === 'wiki-he'), row.personNameHe).toBe(true)
      expect(p.foreignSlot.status, row.personNameHe).toBe('unknown')
    }
  })
})

describe('the views agree with the join they replace', () => {
  it('gives every spelling of one man the same facets', () => {
    expect(facetsForCheck('עמרי אפק')).toBe(facetsForCheck('עומרי אפק'))
    expect(facetsForCheck('גילי ורמוט')).toBe(facetsForCheck('גיל ורמוט'))
    expect(facetsForCheck('עומרי אפק')?.position).not.toBeNull()
  })

  it('dresses each spell by lib/kit/playerKit\'s rule — the same season, the same reason', () => {
    const merged = new Set(allPlayers().filter((p) => p.slugAliases.length).map((p) => p.id))
    let compared = 0
    for (const p of allPlayers()) {
      if (merged.has(p.id)) continue
      const shirt = shirtFor(p.displayName)
      const spells = spellsFor(p.displayName)
      if (spells.length === 0) continue
      compared += 1
      expect(p.shirt?.seasonLabel ?? null, p.slug).toBe(shirt?.seasonLabel ?? null)
      expect(p.shirt?.why ?? null, p.slug).toBe(shirt?.why ?? null)
      expect(p.spells.map((s) => [s.id, s.kitSeason, s.primary]), p.slug).toEqual(
        spells.map((s) => [`${s.fromYear}-${s.toYear}`, s.seasonLabel, s.primary]),
      )
    }
    expect(compared).toBeGreaterThan(500)
    expect(versionsOf('משה סיני').length).toBeGreaterThan(1)
  })
})

describe('freshness', () => {
  it('was built from the inputs on disk (npm run players:master)', () => {
    expect(playerMaster.inputs).toEqual([...PLAYER_MASTER_INPUTS])
    expect(playerMaster.inputsSha, 'stale — run `npm run players:master`').toBe(inputsSha(ROOT))
  })

  it('rebuilds byte for byte', () => {
    const { out, problems } = buildPlayerMaster(ROOT)
    expect(problems).toEqual([])
    expect(serialisePlayerMaster(out) === readFileSync(join(ROOT, 'content/generated/player-master.json'), 'utf8'),
      'the builder and the committed master disagree — run `npm run players:master`').toBe(true)
  })
})
