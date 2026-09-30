import { describe, expect, it } from 'vitest'

import { kitDnaFor } from '@/app/kits/actions'
import { dealKitRound, gradeKitPuzzle, kitHint } from '@/lib/game/kitBuild'
import { DNA_THRESHOLD, KIT_HINT_PENALTY, OPTION_RAMP, SHIRT_POINTS, STEP_ORDER, type KitPuzzle } from '@/lib/game/kit-build-run'
import { kitRecord, playableKits } from '@/lib/kit/kit-master'
import { photoMissing } from '@/lib/kit/photo'
import { signKitUnlock, verifyKitUnlock } from '@/lib/kit/unlock'

const SEEDS = Array.from({ length: 80 }, (_, i) => i + 1)

function find(test: (puzzle: KitPuzzle) => boolean): { seed: number; puzzle: KitPuzzle } {
  for (let seed = 1; seed < 2000; seed += 1) {
    const puzzle = dealKitRound(seed).find(test)
    if (puzzle) return { seed, puzzle }
  }
  throw new Error('no seed deals that puzzle')
}

describe('שער 4 — the deal carries no answer', () => {
  it('sends no truth, no season, no archive path and no year in any label or info line', () => {
    for (const seed of SEEDS) {
      for (const puzzle of dealKitRound(seed)) {
        const blob = JSON.stringify(puzzle)
        expect(blob).not.toMatch(/truth|correct|sourceTitle|exactPhoto|realSrc/)
        expect(blob).not.toContain('/kits/')
        for (const row of puzzle.steps) {
          for (const option of row.options) {
            expect(`${option.labelHe} ${option.infoHe}`, `${seed} ${row.step}`).not.toMatch(/\d{4}/)
            expect(option.id).toMatch(/^[0-9a-f]{12}$/)
          }
        }
        expect(JSON.stringify(puzzle.steps)).not.toContain(puzzle.seasonLabel)
      }
    }
  })

  it('ramps the options 3·4·4·4·5 by the shirt\'s place in the round', () => {
    const counts = new Map<number, number>()
    for (const seed of SEEDS) {
      dealKitRound(seed).forEach((puzzle, index) => {
        for (const row of puzzle.steps) {
          expect(row.options.length).toBeLessThanOrEqual(OPTION_RAMP[index]!)
          counts.set(index, Math.max(counts.get(index) ?? 0, row.options.length))
        }
      })
    }
    expect([...counts.entries()].sort((a, b) => a[0] - b[0]).map(([, n]) => n)).toEqual([...OPTION_RAMP])
  })
})

describe('שער 4 — the photo invariant', () => {
  it('deals photo only when every option of the puzzle has geometry on its template', () => {
    let photos = 0
    for (const seed of SEEDS) {
      for (const puzzle of dealKitRound(seed)) {
        if (puzzle.look !== 'photo') continue
        photos += 1
        const kit = playableKits().find((row) => row.seasonLabel === puzzle.seasonLabel && row.variant === puzzle.variant)!
        for (const row of puzzle.steps) {
          for (const option of row.options) {
            expect(photoMissing(kit.bodyTemplateId, option.patch), `${puzzle.seasonLabel} ${row.step} ${option.labelHe}`).toEqual([])
          }
        }
      }
    }
    expect(photos).toBeGreaterThan(20)
  })

  it('opens 2009/10 on the photographed garment', () => {
    const { puzzle } = find((p) => p.seasonLabel === '2009/10' && p.variant === 'home')
    expect(puzzle.look).toBe('photo')
  })
})

describe('שער 4 — tolerant grading', () => {
  it('never offers an alternate the sources give as a distractor', () => {
    const doubles = [
      { season: '2009/10', variant: 'home', step: 'crest', alt: 'circle-1927' },
      { season: '2019/20', variant: 'home', step: 'sponsor', alt: 'הכשרה' },
    ] as const
    for (const row of doubles) {
      const { seed, puzzle } = find((p) => p.seasonLabel === row.season && p.variant === row.variant)
      const options = puzzle.steps.find((s) => s.step === row.step)!.options
      expect(JSON.stringify(options.map((o) => o.patch)), `${row.season} seed ${seed}`).not.toContain(row.alt)
    }
  })

  it('scores a conflicted field against every value the sources give', () => {
    const kit = kitRecord('kit-2019-20-home')!
    expect(kit.fields.sponsor.alternates.map((s) => s.name)).toContain('הכשרה')
    expect(kit.fields.sponsor.conflict).toMatch(/sponsor-deals/)
  })
})

describe('שער 4 — hints are counted by the server', () => {
  it('charges max(proven receipts, claim), capped at three', () => {
    const seed = 7
    const a = kitHint(seed, 0, 'whisper')!
    const b = kitHint(seed, 0, 'front')!
    expect(a.penalty).toBe(KIT_HINT_PENALTY)
    expect(a.receipt).toMatch(/^[0-9a-f]{16}$/)
    expect(gradeKitPuzzle(seed, 0, {}, 0, [a.receipt, b.receipt], 0)!.hintsUsed).toBe(2)
    // a receipt for another puzzle proves nothing
    const other = kitHint(seed, 1, 'detail')!
    expect(gradeKitPuzzle(seed, 0, {}, 0, [other.receipt, 'deadbeefdeadbeef'], 0)!.hintsUsed).toBe(0)
    expect(gradeKitPuzzle(seed, 0, {}, 0, [], 10)!.hintsUsed).toBe(3)
    expect(gradeKitPuzzle(seed, 0, {}, 0, [a.receipt], 1)!.hintsUsed).toBe(1)
  })

  it('never names the answer it was not asked for, and never the season', () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const puzzle = dealKitRound(seed)[2]!
      for (const kind of ['whisper', 'detail', 'front'] as const) {
        const hint = kitHint(seed, 2, kind)!
        expect(hint.textHe).not.toContain(puzzle.seasonLabel)
        expect(hint.textHe).not.toMatch(/\{|\}/)
      }
    }
  })
})

describe('שער 4 → שער 5 — the unlock token', () => {
  it('signs the shirt on submit, and the token opens exactly that shirt in Gate 5', async () => {
    const seed = 11
    const puzzle = dealKitRound(seed)[0]!
    const blind = gradeKitPuzzle(seed, 0, {})!
    expect(blind.unlock.dna).toBe(false)
    const proof = verifyKitUnlock(blind.unlock.token)!
    expect(proof.kitId).toBe(`kit-${puzzle.seasonLabel.replace('/', '-')}-${puzzle.variant}`)

    // a perfect shirt opens the DNA
    const perfect: Record<string, string> = {}
    for (const row of puzzle.steps) {
      perfect[row.step] = row.options.find((o) => gradeKitPuzzle(seed, 0, { [row.step]: o.id })!.steps.find((s) => s.step === row.step)!.correct)!.id
    }
    const graded = gradeKitPuzzle(seed, 0, perfect)!
    expect(graded.baseScore - 15).toBe(SHIRT_POINTS)
    expect(graded.unlock.dna).toBe(SHIRT_POINTS >= DNA_THRESHOLD)

    const gate5 = await kitDnaFor([graded.unlock.token])
    expect(gate5.rows).toHaveLength(1)
    expect(gate5.rows[0]!.key).toBe(graded.unlock.key)
    expect(gate5.rows[0]!.dna).toBe(true)
    expect(gate5.rows[0]!.spec.sponsorHe).toBe(graded.answer.sponsorHe)
  })

  it('refuses a forged or altered token', async () => {
    const token = signKitUnlock('kit-2009-10-home', false)
    expect(verifyKitUnlock(token)).toEqual({ kitId: 'kit-2009-10-home', dna: false })
    const flipped = token.replace('.0.', '.1.')
    expect(verifyKitUnlock(flipped)).toBeNull()
    expect(verifyKitUnlock('kit-2009-10-home.1.0000000000000000000000')).toBeNull()
    expect((await kitDnaFor([flipped, 'nonsense'])).rows).toEqual([])
  })

  it('accepts a legacy collection key once, and hands back a token that verifies', async () => {
    const answer = await kitDnaFor([], [{ key: '2009/10|home', dna: false }, { key: 'not|a-kit', dna: true }])
    expect(answer.rows.map((row) => row.key)).toEqual(['2009/10|home'])
    const minted = answer.minted['2009/10|home']!
    expect(verifyKitUnlock(minted.token)).toEqual({ kitId: 'kit-2009-10-home', dna: false })
  })
})

describe('שער 4 — steps', () => {
  it('grades the five steps it deals, field by field', () => {
    const verdict = gradeKitPuzzle(3, 1, {})!
    expect(verdict.steps.map((s) => s.step)).toEqual([...STEP_ORDER])
    expect(verdict.steps.reduce((sum, s) => sum + s.max, 0)).toBe(SHIRT_POINTS)
  })
})
