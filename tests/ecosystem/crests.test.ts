import {describe, expect, it} from 'vitest'
import {crestSlug, crestUrl, CREST_BASE} from '../../ecosystem/crests/index.mjs'

// The universe's one crest library (OFFSIDES public/logos), used by FAN LIFE, DUBID and OFFSIDES (owner, 26.10.2026).
describe('shared crest library', () => {
  it('names the FAN LIFE clubs and their rivals', () => {
    expect(crestSlug('Olympiacos')).toBe('olympiacos-piraeus')
    expect(crestSlug('Celtic')).toBe('celtic-fc')
    expect(crestSlug('FC St. Pauli')).toBe('fc-st-pauli')
    expect(crestSlug('Maccabi Tel Aviv')).toBe('maccabi-tel-aviv')
    expect(crestSlug('Rangers')).toBe('rangers-fc')
    expect(crestUrl('AEK Athens')).toBe(`${CREST_BASE}/aek-athens.png`)
  })
  it('prefers no crest to the wrong one', () => {
    expect(crestSlug('Milan')).toBeNull() // ambiguous single token
    expect(crestSlug('Levski Sofia')).toBeNull() // known-bad art in the library
    expect(crestSlug('Tre Penne')).toBeNull()
    expect(crestSlug('')).toBeNull()
  })
})
