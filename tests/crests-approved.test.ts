import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { CREST_FILES, crestArt } from '@/lib/kit/crestMarks'

/** Maor, 27.9.2026: the eighties mark in black and white; the KETER mark with black lettering, both drawings */
describe('the approved crest rulings', () => {
  it('the original mark prints its eighties drawing from 1980 — black on light, white on red', () => {
    expect(crestArt('worker-hapoel', false, 1985)).toBe('/brand/crests/worker-80s-ink.png')
    expect(crestArt('worker-hapoel', true, 1985)).toBe('/brand/crests/worker-80s-white.png')
    expect(crestArt('worker-hapoel', false, 1965)).toBe('/brand/crests/worker-hapoel.png')
  })
  it('the KETER era prints black lettering: the flat mark on light cloth, the patch on red', () => {
    expect(crestArt('keter-ball', false)).toBe('/brand/crests/keter-ball-black.png')
    expect(crestArt('keter-ball', true)).toBe('/brand/crests/keter-ball-patch.png')
  })
  it('every file the table can ask for is on disk', () => {
    for (const file of CREST_FILES) expect(existsSync(join(process.cwd(), 'public/brand/crests', `${file}.png`)), file).toBe(true)
  })
})
