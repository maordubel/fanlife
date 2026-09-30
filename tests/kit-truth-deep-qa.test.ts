import { describe, expect, it } from 'vitest'

import { describeKit } from '@/lib/kit/describe'
import { kitByLegacyKey, kitRecords, playableKits } from '@/lib/kit/kit-master'

/** Deep QA 29.9.2026 — the disputed shirts are held out of gate 4; the description is generated. */
describe('gate 4 — open historical disputes block the shirt', () => {
  const held = ['1984/85|home', '1988/89|home', '1992/93|home', '1997/98|home', '1999/00|home', '2002/03|home', '2005/06|home', '2008/09|home']
  it.each(held)('%s is not dealt while its dispute is open', (key) => {
    const kit = kitByLegacyKey(key)!
    expect(kit.review?.resolved).toBe(false)
    expect(kit.gate4.playable).toBe(false)
    expect(kit.gate4.reason).toMatch(/unresolved-/)
    expect(playableKits().map((k) => k.legacyKey)).not.toContain(key)
  })
  it('every review carries a type, a reason and at least one source', () => {
    for (const k of kitRecords().filter((r) => r.review)) {
      expect(['source-dispute', 'period-variant', 'competition-variant', 'unknown']).toContain(k.review!.conflictType)
      expect(k.review!.noteHe.length, k.id).toBeGreaterThan(20)
      expect(k.review!.sources.length, k.id).toBeGreaterThan(0)
    }
  })
  it('a period variant is never graded as "both sponsors right" — it is held, not accepted', () => {
    for (const k of kitRecords().filter((r) => r.review?.conflictType === 'period-variant')) expect(k.gate4.playable).toBe(false)
  })
})

describe('gate 4 — the description is generated from the truth', () => {
  it('reads the same fields the renderer draws', () => {
    const text = describeKit({ base: 'red', pattern: 'twin-stripe', patternInk: 'ink', sleeves: 'cuff', sleeveInk: 'ink', collar: 'v-neck', collarInk: 'ink', makerHe: 'נייקי', sponsorHe: 'כתר' })
    expect(text).toContain('אדומה')
    expect(text).toContain('נייקי')
    expect(text).toContain('שני פסים')
    expect(text).toContain('וי')
    expect(text).toContain('כתר')
  })
  it('leaves out what it does not know', () => {
    const text = describeKit({ base: 'red', pattern: 'solid', patternInk: 'red', sleeves: 'plain', sleeveInk: 'red', collar: 'crew', collarInk: 'cream', makerHe: null, sponsorHe: null })
    expect(text).not.toContain('של ')
    expect(text).not.toContain('ספונסר')
  })
  it('every record\'s noteHe IS the generated sentence', () => {
    for (const k of kitRecords()) expect(k.noteHe.startsWith('חולצה'), k.id).toBe(true)
  })
})
