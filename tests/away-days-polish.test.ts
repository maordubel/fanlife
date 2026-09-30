import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/** Away Days polish, 29.9.2026 — hierarchy and state clarity; storage, map data and filters
 *  themselves are untouched. */
const read = (path: string) => readFileSync(join(__dirname, '..', path), 'utf8')

describe('away days — filters', () => {
  const filters = read('components/away-days/AwayDaysFilters.tsx')
  it('a selected chip is marked by more than colour, and reset is disabled when nothing is set', () => {
    expect(filters).toContain('✓')
    expect(filters).toContain('activeFilterCount(filters) === 0')
  })
  it('keeps all four filter groups', () => {
    for (const key of ['away.filter.decade', 'away.filter.competition', 'away.filter.result', 'away.filter.country']) {
      expect(filters).toContain(key)
    }
  })
})

describe('away days — venue sheet', () => {
  const sheet = read('components/away-days/VenueSheet.tsx')
  it('places the ground and its visit count before the photograph, and the photograph before the visits', () => {
    const place = sheet.indexOf('venue.cityHe')
    const photo = sheet.indexOf('<VenuePhoto')
    const list = sheet.indexOf('visits.map((v) => (\n              <li')
    expect(place).toBeGreaterThan(-1)
    expect(photo).toBeGreaterThan(place)
    expect(list).toBeGreaterThan(photo)
  })
  it('still carries the "been there" toggle per visit', () => {
    expect(sheet).toContain('been={been ?')
  })
})

describe('away days — my journey and the map', () => {
  it('says how many public visits are ticked, from the existing ledger', () => {
    const mine = read('components/away-days/MyJourney.tsx')
    expect(mine).toContain("t('away89.mine.ticked'")
    expect(mine).toContain('isBeen(ledger, v.id)')
    expect(mine).not.toMatch(/localStorage/)
  })
  it('the selected ground wears a ring on the map', () => {
    expect(read('components/away-days/AwayDaysMap.tsx')).toContain('data-away="marker-ring"')
  })
})
