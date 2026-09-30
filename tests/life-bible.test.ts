import { describe, expect, it } from 'vitest'
import { ALL_CHARACTERS, CHARACTERS, FORBIDDEN_CHARACTER_IDS, castFor, isActiveIn, isRealPerson } from '../lib/life/characters'

/**
 * The character bible of 5.9.2026 — forty-five locked ids, seven forbidden ones.
 *
 * This test is the bible's §15 as code: every id in the table exists under exactly that
 * spelling, none of the provisional names survive, the two ארזים are two people, שלום
 * is only ever the footballer, and the real owners are flagged so no script can hand
 * them an invented line.
 */
const BIBLE_IDS = [
  'kobi', 'rachel', 'ofir', 'amit', 'efi', 'keren', 'yosef', 'neighbour', 'shopkeeper', 'veteran',
  'barry', 'melamed', 'asaf', 'michel', 'soko', 'omer-hermesh', 'shachor', 'freddy',
  'shalom-tikva', 'shavit-elimelech', 'shaul-eisenberg', 'eli-tabib', 'ofer-yannay',
  'uli', 'fan-azoulay', 'fan-erez-haifa', 'shlomi-tattoo', 'yevgeny', 'yonatan',
  'neta-katamin', 'gur-katamin', 'melanie', 'dor', 'liron', 'crowd-aliza', 'yaron', 'batya',
  'crowd-dudu', 'crowd-limor', 'crowd-erez', 'crowd-inbal', 'crowd-lior', 'crowd-shani',
  'crowd-noam', 'crowd-maya',
]

describe('character bible 5.9.2026', () => {
  it('registers all forty-five ids under the exact spelling', () => {
    expect(BIBLE_IDS).toHaveLength(45)
    for (const id of BIBLE_IDS) expect(CHARACTERS[id], id).toBeDefined()
  })

  it('never creates a forbidden id', () => {
    expect(FORBIDDEN_CHARACTER_IDS).toEqual(['maor', 'assi', 'eyal-melamed', 'gabi', 'meir', 'tiki', 'yuri'])
    for (const id of FORBIDDEN_CHARACTER_IDS) expect(CHARACTERS[id]).toBeUndefined()
  })

  it('has no duplicate ids', () => {
    const ids = ALL_CHARACTERS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('spells שלום תקוה with one vav and keeps him a footballer, not a fan', () => {
    expect(CHARACTERS['shalom-tikva']!.displayNameHe).toBe('שלום תקוה')
    expect(CHARACTERS['shalom-tikva']!.category).toBe('historical')
    expect(ALL_CHARACTERS.filter((c) => c.displayNameHe.startsWith('שלום'))).toHaveLength(1)
  })

  it('keeps the two ארזים apart', () => {
    expect(CHARACTERS['crowd-erez']!.displayNameHe).toBe('ארז')
    expect(CHARACTERS['fan-erez-haifa']!.displayNameHe).toBe('ארז מחיפה')
    expect(CHARACTERS['fan-erez-haifa']!.category).toBe('rival')
  })

  it('flags the real owners and marks Yannay as open history', () => {
    for (const id of ['shaul-eisenberg', 'eli-tabib', 'ofer-yannay']) expect(isRealPerson(id), id).toBe(true)
    expect(CHARACTERS['ofer-yannay']!.provenance).toBe('open-history')
    expect(CHARACTERS['ofer-yannay']!.tags).toContain('open-history')
    expect(isRealPerson('yosef')).toBe(false)
    expect(isRealPerson('yevgeny')).toBe(false)
  })

  it('keeps Yosef out of the eighties and nineties', () => {
    expect(isActiveIn('yosef', '1986')).toBe(false)
    expect(isActiveIn('yosef', '1993-cup')).toBe(false)
    expect(isActiveIn('yosef', '1999-cup')).toBe(false)
    expect(isActiveIn('yosef', '2000')).toBe(true)
  })

  it('reads eras the way the bible writes them', () => {
    expect(isActiveIn('melamed', '1993-galil')).toBe(true)
    expect(isActiveIn('melamed', '1986')).toBe(false)
    expect(isActiveIn('asaf', '1993-cup')).toBe(false)
    expect(isActiveIn('asaf', '1996-army')).toBe(true)
    expect(isActiveIn('asaf', '2010')).toBe(true)
    expect(isActiveIn('shavit-elimelech', '1995-sinai')).toBe(false)
    expect(isActiveIn('shavit-elimelech', '1999-cup')).toBe(true)
    expect(isActiveIn('liron', '1996-army')).toBe(true)
    expect(castFor('1993-cup').map((c) => c.id)).toContain('kobi')
    expect(castFor('1993-cup').map((c) => c.id)).not.toContain('eli-tabib')
  })
})
