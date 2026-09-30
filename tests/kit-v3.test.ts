import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { dealKitRound } from '@/lib/game/kitBuild'
import { STEP_ORDER } from '@/lib/game/kit-build-run'
import { exactArchivePhoto } from '@/lib/kit/archive-dna'
import { grantedFiles, grantedMaker, grantedSponsor } from '@/lib/kit/mark-library'

const ROOT = join(__dirname, '..')

/**
 * The archive photographs are EVIDENCE, shown after the answer — never a builder part and never a
 * reference fetched before submit (brief §15, rule 4). V3's reference route served the archive
 * photo for a part token mid-puzzle; it is a tombstone that answers 410.
 */
describe('Kit System — the archive is evidence, not a part', () => {
  it('deals the five steps with no reference flag and no archive path', () => {
    for (const puzzle of dealKitRound(23)) {
      expect(puzzle.steps.map((row) => row.step)).toEqual([...STEP_ORDER])
      const payload = JSON.stringify(puzzle)
      expect(payload).not.toContain('/kits/')
      expect(payload).not.toContain('hasReference')
      expect(payload).not.toContain(puzzle.seasonLabel.replace('/', '-'))
    }
  })

  it('retired the reference route to an inert 410', () => {
    const route = readFileSync(join(ROOT, 'app/api/kits/reference/[token]/route.ts'), 'utf8')
    expect(route).toContain('TOMBSTONE')
    expect(route).toContain('410')
    expect(route).not.toMatch(/from\s+'/)
  })

  it('uses only exact-season photographs as reconstruction evidence', () => {
    const photo = exactArchivePhoto('2009/10', 'home')
    if (photo) {
      expect(photo.seasonAmbiguous).toBe(false)
      expect(photo.seasonLabel).toBe('2009/10')
    }
  })

  it('ships every granted mark it can print', () => {
    for (const src of grantedFiles()) expect(existsSync(join(ROOT, 'public', src)), src).toBe(true)
    expect(grantedMaker('umbro', '2009/10')).not.toBeNull()
    expect(grantedMaker('adidas', '1985/86')).not.toBeNull()
    // the trefoil is the eighties' mark: a later adidas shirt takes the alternative mark instead
    expect(grantedMaker('adidas', '2022/23')).toBeNull()
    expect(grantedSponsor('SUBARU')).not.toBeNull()
    expect(grantedSponsor('VISA')).not.toBeNull()
    expect(grantedSponsor('ARKIA')?.print).toBe('colour')
    expect(grantedMaker('PUMA', '2015/16')?.print).toBe('mono')
  })
})
