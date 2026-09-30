import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import nameParts from '@/content/manual/player-name-parts.json'
import { allPlayers } from '@/lib/archive/player-master'
import { compactName, fold, isSharedFamily, score, searchRoster, splitName } from '@/lib/game/roster-search'
import type { Searchable } from '@/lib/game/roster-search'

const mk = (nameHe: string): Searchable => {
  const p = splitName(nameHe)
  return { slug: nameHe, nameHe, givenHe: p.givenHe, familyHe: p.familyHe, initial: p.initial }
}

describe('player names — compound families stay intact', () => {
  it.each([
    ['דדי בן דיין', 'דדי', 'בן דיין'],
    ['דאגלס דה סילבה', 'דאגלס', 'דה סילבה'],
    ['אייל בן עמי', 'אייל', 'בן עמי'],
    ['יאיר כהן צדק', 'יאיר', 'כהן צדק'],
    ['אברהם בית הלוי', 'אברהם', 'בית הלוי'],
    ['איאד אבו עביד', 'איאד', 'אבו עביד'],
    ['שבי בן ברוך', 'שבי', 'בן ברוך'],
    ['משה סיני', 'משה', 'סיני'],
  ])('%s', (name, given, family) => {
    const p = splitName(name)
    expect(p.givenHe).toBe(given)
    expect(p.familyHe).toBe(family)
  })
  it('a bracketed qualifier never enters the family', () => {
    expect(splitName("בן ציון צין (צינוביץ')").familyHe).toBe('צין')
  })
})

describe('player names — search', () => {
  const pool = ['דדי בן דיין', 'שמעון דיין', 'דאגלס דה סילבה', 'רוני סילבה'].map(mk)
  it('the full compound surname outranks the bare last word, and both find him', () => {
    const full = score(pool[0]!, fold('בן דיין'))
    const last = score(pool[0]!, fold('דיין'))
    expect(full).toBeGreaterThan(last)
    expect(last).toBeGreaterThan(0)
    expect(searchRoster(pool, 'דיין').map((e) => e.nameHe)).toContain('דדי בן דיין')
    expect(searchRoster(pool, 'סילבה').map((e) => e.nameHe)).toContain('דאגלס דה סילבה')
    expect(searchRoster(pool, 'דה סילבה')[0]!.nameHe).toBe('דאגלס דה סילבה')
  })
})

describe('player names — compact display', () => {
  it('a unique surname may be compact, compound or not', () => {
    expect(compactName('משה סיני')).toBe('סיני')
    expect(compactName('דדי בן דיין')).toBe('בן דיין')
    expect(compactName('דאגלס דה סילבה')).toBe('דה סילבה')
  })
  it('a shared surname forces the full name — fifteen Cohens are never fifteen כהן', () => {
    const cohens = allPlayers().filter((p) => p.kind === 'player' && splitName(p.displayName).familyHe === 'כהן')
    expect(cohens.length).toBeGreaterThanOrEqual(5)
    for (const p of cohens) expect(compactName(p.displayName)).toBe(p.displayName.replace(/\s*[("].*$/, ''))
  })
  it('the shared-family list matches the archive (drift guard)', () => {
    const count = new Map<string, number>()
    for (const p of allPlayers().filter((x) => x.kind === 'player')) {
      const f = fold(splitName(p.displayName).familyHe)
      count.set(f, (count.get(f) ?? 0) + 1)
    }
    for (const [family, n] of count) expect(isSharedFamily(family), family).toBe(n > 1)
  })
})

describe('player names — identity', () => {
  it('reviewed rows only cover names that need them, and never two-word names', () => {
    for (const [name, row] of Object.entries(nameParts.names)) {
      expect(name.split(' ').length, name).toBeGreaterThan(2)
      expect(`${row.givenHe} ${row.familyHe}`.replace(/\s+/g, ' ')).toBe(name.replace(/\s*\(.*$/, ''))
    }
  })
  it('every stored pick is keyed by player id, never by a visible name', () => {
    const src = readFileSync('lib/game/roster-search.ts', 'utf8')
    expect(src).not.toMatch(/givenHe\s*\+\s*['"` ]*\s*\+?\s*familyHe/)
  })
})
