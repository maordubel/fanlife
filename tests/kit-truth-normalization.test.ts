import { describe, expect, it } from 'vitest'

import { dealKitRound, gradeKitField, gradeKitPuzzle } from '@/lib/game/kitBuild'
import { STEP_ORDER, type KitStep } from '@/lib/game/kit-build-run'
import { kitRecord, kitRecords, playableKits, type KitMasterRecord } from '@/lib/kit/kit-master'
import { canonMaker, canonSponsor, colourFamily, judge, sameColour } from '@/lib/kit/truth'

/**
 * שער 4 — kit truth normalization (29.9.2026), on the real shirts that made it necessary:
 * 2008/09 (`umbro` the maker AND `UMBRO` the sponsor), 2019/20 home (ARKIA, with הכשרה as a
 * recorded alternate), 2015/16 (FUJITSU beside 2014/15's FUJICOM), 2020/21 home (a red shirt
 * whose second ink is `paper` where its neighbours say `cream`).
 */

const WINDOW = { before: 3000, options: 5 }
const puzzleOf = (kit: KitMasterRecord) => dealKitRound(1, 0, { ...WINDOW, pin: kit.id })[0]!

describe('canonical aliases', () => {
  it('folds the same maker written three ways', () => {
    expect(canonMaker('adidas')).toBe('adidas')
    expect(canonMaker('Adidas')).toBe('adidas')
    expect(canonMaker('אדידס')).toBe('adidas')
    expect(canonMaker('NIKE')).toBe('nike')
    expect(canonMaker('נייקי')).toBe('nike')
    expect(canonMaker('Kappa')).toBe(canonMaker('KAPPA'))
  })

  it('folds sponsors, and keeps FUJICOM and FUJITSU two different companies', () => {
    expect(canonSponsor('ארקיע')).toBe(canonSponsor('ARKIA'))
    expect(canonSponsor('Visa')).toBe(canonSponsor('VISA'))
    expect(canonSponsor('FUJICOM')).not.toBe(canonSponsor('FUJITSU'))
  })

  it('a name with no alias keeps itself, folded — nothing is invented', () => {
    expect(canonSponsor('גלאב הוטל טבריה')).toBe('גלאבהוטלטבריה')
    expect(canonMaker('')).toBeNull()
    expect(canonMaker(null)).toBeNull()
  })

  it('treats white and cream as one chalk family and nothing else as equal', () => {
    expect(sameColour('paper', 'cream')).toBe(true)
    expect(colourFamily('paper')).toBe(colourFamily('cream'))
    expect(sameColour('red', 'deep')).toBe(false)
    expect(sameColour('ink', 'navy')).toBe(false)
    expect(sameColour('red', null)).toBe(false)
  })

  it('judges unknown truth as unknown, never as a mismatch', () => {
    expect(judge(null, 'x')).toBe('unknown')
    expect(judge(undefined, undefined)).toBe('unknown')
    expect(judge('a', null)).toBe('mismatch')
    expect(judge('a', 'a')).toBe('match')
  })
})

describe('field-level grading on real shirts', () => {
  it('2020/21 home: a cream second ink is right where the archive says paper', () => {
    const kit = playableKits().find((row) => row.id === 'kit-2020-21-home')!
    expect(kit.fields.secondary.value).toBe('paper')
    expect(gradeKitField(kit, { pattern: 'shoulder-panel', patternInk: 'cream' }, 'secondary').ok).toBe(true)
    expect(gradeKitField(kit, { pattern: 'shoulder-panel', patternInk: 'ink' }, 'secondary').ok).toBe(false)
  })

  it('2008/09: the maker is umbro however it is written, and the sponsor is judged apart', () => {
    // held out of gate 4 by an open period-variant dispute, but its fields still grade
    const kit = kitRecords().find((row) => row.id === 'kit-2008-09-home')!
    for (const spelling of ['umbro', 'UMBRO', 'Umbro', 'אמברו']) {
      expect(gradeKitField(kit, { makerHe: spelling }, 'maker').ok, spelling).toBe(true)
      expect(gradeKitField(kit, { sponsorHe: spelling }, 'sponsor').ok, spelling).toBe(true)
    }
    expect(gradeKitField(kit, { makerHe: 'KAPPA' }, 'maker').ok).toBe(false)
  })

  it('2019/20 home: ARKIA and the recorded alternate הכשרה both pass, the alternate flagged tolerant', () => {
    const kit = playableKits().find((row) => row.id === 'kit-2019-20-home')!
    expect(gradeKitField(kit, { sponsorHe: 'ארקיע' }, 'sponsor')).toMatchObject({ ok: true, tolerant: false })
    expect(gradeKitField(kit, { sponsorHe: 'הכשרה' }, 'sponsor')).toMatchObject({ ok: true, tolerant: true })
    expect(gradeKitField(kit, { sponsorHe: 'FUJITSU' }, 'sponsor').ok).toBe(false)
  })

  it('2015/16: FUJITSU is not FUJICOM', () => {
    const kit = playableKits().find((row) => row.id === 'kit-2015-16-home')!
    expect(gradeKitField(kit, { sponsorHe: 'FUJITSU' }, 'sponsor').ok).toBe(true)
    expect(gradeKitField(kit, { sponsorHe: 'FUJICOM' }, 'sponsor').ok).toBe(false)
  })

  it('a truth the archive does not hold penalizes nobody', () => {
    const base = kitRecord('kit-2008-09-home')!
    const blank = {
      ...base,
      fields: { ...base.fields, maker: { ...base.fields.maker, value: null }, sponsor: { ...base.fields.sponsor, value: null } },
    } as KitMasterRecord
    expect(gradeKitField(blank, { makerHe: 'anything' }, 'maker')).toMatchObject({ ok: true, unknown: true })
    expect(gradeKitField(blank, { sponsorHe: 'anything' }, 'sponsor')).toMatchObject({ ok: true, unknown: true })
    expect(gradeKitField(blank, {}, 'maker').ok).toBe(true)
  })
})

describe('the dealt puzzles', () => {
  const kits = playableKits()

  it('every playable shirt can be answered perfectly by picking its own truth', () => {
    for (const kit of kits) {
      const puzzle = puzzleOf(kit)
      const placed: Partial<Record<KitStep, string>> = {}
      for (const { step, options } of puzzle.steps) {
        const winner = options.find((option) => {
          const probe = gradeKitPuzzle(1, 0, { ...placed, [step]: option.id }, 0, [], 0, { ...WINDOW, pin: kit.id })!
          return probe.steps.find((s) => s.step === step)!.correct
        })
        expect(winner, `${kit.id} ${step}`).toBeDefined()
        placed[step] = winner!.id
      }
      const verdict = gradeKitPuzzle(1, 0, placed, 0, [], 0, { ...WINDOW, pin: kit.id })!
      expect(verdict.perfect, kit.id).toBe(true)
    }
  })

  it('never offers two options a photograph cannot tell apart (paper/cream) or one accepted answer twice', () => {
    for (const kit of kits) {
      const puzzle = puzzleOf(kit)
      for (const row of puzzle.steps) {
        const keys = row.options.map((o) => {
          const p = o.patch
          if (row.step === 'body') return `${p.base && colourFamily(p.base)}|${p.pattern}|${p.pattern === 'solid' ? '' : p.patternInk && colourFamily(p.patternInk)}`
          if (row.step === 'construction') return `${p.collar}|${p.collarInk && colourFamily(p.collarInk)}|${p.sleeves}|${p.sleeveInk && colourFamily(p.sleeveInk)}`
          if (row.step === 'maker') return canonMaker(p.makerHe)
          if (row.step === 'sponsor') return canonSponsor(p.sponsorHe)
          return p.crestKey
        })
        expect(new Set(keys).size, `${kit.id} ${row.step}`).toBe(keys.length)
      }
    }
  })

  it('each step has exactly one option that grades right, apart from recorded alternates', () => {
    for (const kit of kits) {
      const puzzle = puzzleOf(kit)
      for (const { step, options } of puzzle.steps) {
        const right = options.filter((option) => {
          const probe = gradeKitPuzzle(1, 0, { [step]: option.id }, 0, [], 0, { ...WINDOW, pin: kit.id })!
          return probe.steps.find((s) => s.step === step)!.correct
        })
        expect(right.length, `${kit.id} ${step}`).toBe(1)
      }
    }
    expect(STEP_ORDER.length).toBe(5)
  })

  it('reveals a ✓/✕ verdict per field with the archive value in Hebrew', () => {
    const kit = kits.find((row) => row.id === 'kit-2019-20-home')!
    const verdict = gradeKitPuzzle(1, 0, {}, 0, [], 0, { ...WINDOW, pin: kit.id })!
    for (const step of verdict.steps) {
      for (const field of step.fields) {
        expect(field.ok).toBe(false)
        expect(field.truthHe.length).toBeGreaterThan(0)
      }
    }
  })
})
