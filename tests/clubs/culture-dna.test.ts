import {describe, expect, it} from 'vitest'
import {CULTURE_SLOTS, cultureIssues, cultureVars, emptySlots, type CultureManifest} from '@/lib/life/universal/culture'

const m = (slots: CultureManifest['slots']): CultureManifest => ({schemaVersion: 1, clubId: 'x', status: 'proposed', slots})

describe('Culture DNA', () => {
  it('prints the neutral phrase for every empty slot and never throws', () => {
    const v = cultureVars(null, 'x')
    for (const s of CULTURE_SLOTS) expect(v[s].length).toBeGreaterThan(0)
    expect(emptySlots(null, 'x')).toEqual([...CULTURE_SLOTS])
  })
  it('uses the pack text for a filled slot, and only for its own club', () => {
    expect(cultureVars(m({food: {text: 'a pie', needsReview: true}}), 'x').food).toBe('a pie')
    expect(cultureVars(m({food: {text: 'a pie', needsReview: true}}), 'other').food).not.toBe('a pie')
  })
  it('a filled slot needs an https source or needsReview', () => {
    expect(cultureIssues(m({food: {text: 'a pie'}}), 'x')).toHaveLength(1)
    expect(cultureIssues(m({food: {text: 'a pie', source: 'http://x'}}), 'x')).toHaveLength(1)
    expect(cultureIssues(m({food: {text: 'a pie', source: 'https://example.org/p'}}), 'x')).toEqual([])
    expect(cultureIssues(m({food: {text: 'a pie', needsReview: true}}), 'x')).toEqual([])
  })
})
