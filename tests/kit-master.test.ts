import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { buildKitMaster, type KitField } from '@/lib/kit/kit-master-build'
import { kitMaster, kitRecord, playableKits } from '@/lib/kit/kit-master'
import { crestMark } from '@/lib/kit/crestMarks'
import { photoGeometry } from '@/lib/kit/photo'

const ROOT = join(__dirname, '..')
const master = kitMaster()

/**
 * The Kit Master — one row per shirt, every field with its source, every disagreement kept.
 */
describe('Kit Master', () => {
  it('is the file the builder writes today — rebuild with `npm run kits:master`', () => {
    expect(JSON.parse(JSON.stringify(buildKitMaster()))).toEqual(master)
  })

  it('holds one row per kit, with the ids the other gates join on', () => {
    const ids = master.kits.map((kit) => kit.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(master.counts.kits).toBe(master.kits.length)
    expect(master.kits.length).toBeGreaterThanOrEqual(35)
    for (const kit of master.kits) {
      expect(kit.id).toMatch(/^kit-\d{4}-\d{2}-(home|away|third)$/)
      expect(kit.legacyKey).toBe(`${kit.seasonLabel}|${kit.variant}`)
      expect(kit.id).toBe(`kit-${kit.seasonLabel.replace('/', '-')}-${kit.variant}`)
    }
    expect(kitRecord('kit-2009-10-home')?.legacyKey).toBe('2009/10|home')
  })

  it('sources every field it states, at confidence two or better', () => {
    for (const kit of master.kits) {
      expect(kit.confidence, kit.id).toBeGreaterThanOrEqual(2)
      expect(kit.sourceTitle, kit.id).toMatch(/\S/)
      for (const [name, value] of Object.entries(kit.fields) as [string, KitField<unknown>][]) {
        if (value.value === null) continue
        expect(value.source, `${kit.id}.${name}`).not.toBeNull()
        expect(value.confidence, `${kit.id}.${name}`).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('keeps a conflict instead of deciding it — the 2009/10 crest', () => {
    const kit = kitRecord('kit-2009-10-home')!
    expect(kit.fields.crest.value?.key).toBe('circle-1923')
    expect(kit.fields.crest.alternates.map((row) => row.key)).toEqual(['circle-1927'])
    expect(kit.fields.crest.conflict).toMatch(/crest-versions/)
    const conflicts = JSON.parse(readFileSync(join(ROOT, 'content/manual/fact-conflicts.json'), 'utf8')) as {
      records: { entityTable: string; entityKey: string; field: string; resolution: unknown }[]
    }
    const row = conflicts.records.find((r) => r.entityTable === 'kit' && r.entityKey === 'kit-2009-10-home')
    expect(row?.field).toBe('crest')
    expect(row?.resolution).toBeNull()
  })

  it('prints the era\'s own crest once the artwork exists — and none before it does', () => {
    // 1999/00 could not be dealt until 22.9.2026: its era had no artwork, so the shirt printed
    // no crest and gate 4 refused it ('crest-art-missing'). The 1997–2000 crest arrived that day,
    // and the same shirt now prints it and plays. The refusal itself is still the rule for any
    // era without artwork — asserted over every kit, so the next gap fails here too.
    const kit = kitRecord('kit-1999-00-home')!
    expect(kit.fields.crest.value?.key).toBe('keter-color')
    expect(kit.render.marks.crest).toBe('print')
    // since the Deep QA (29.9.2026) it is held back by an OPEN dispute (sponsor CAL vs כתר), not by missing art
    expect(kit.gate4.reason).not.toContain('crest-art-missing')
    expect(kit.gate4.reason).toContain('unresolved-source-dispute')
    for (const row of master.kits) {
      if (row.fields.crest.value === null) expect(row.gate4.reason, row.id).toContain('crest-art-missing')
    }
    expect(kitRecord('kit-1978-79-home')!.gate4.reason).toContain('maker-unknown')
    for (const row of master.kits) {
      if (row.fields.crest.value) expect(crestMark(row.fields.crest.value.key), row.id).not.toBeNull()
    }
  })

  it('never turns a year-only photograph into a season', () => {
    const photos = JSON.parse(readFileSync(join(ROOT, 'content/manual/kit-photos.json'), 'utf8')) as {
      records: { file: string; seasonAmbiguous: boolean; seasonLabel: string | null }[]
    }
    const byFile = new Map(photos.records.map((row) => [row.file, row]))
    for (const kit of master.kits) {
      const exact = kit.evidence.exactPhoto
      if (exact) {
        expect(byFile.get(exact.file)?.seasonAmbiguous, kit.id).toBe(false)
        expect(byFile.get(exact.file)?.seasonLabel, kit.id).toBe(kit.seasonLabel)
        expect(exact.yearRaw).toBeNull()
      }
      for (const candidate of kit.evidence.candidatePhotos) {
        expect(byFile.get(candidate.file)?.seasonAmbiguous, kit.id).toBe(true)
        expect(candidate.yearRaw, kit.id).toBeGreaterThan(1900)
      }
    }
  })

  it('counts what it holds', () => {
    const c = master.counts
    expect(c.playable).toBe(playableKits().length)
    expect(c.exactPhoto + c.candidateOnly + c.noPhoto).toBe(c.kits)
    expect(c.playable).toBeGreaterThanOrEqual(20)
  })

  it('claims photo only where the template has geometry on disk', () => {
    for (const kit of master.kits) {
      if (!kit.render.photo.available) continue
      const geometry = photoGeometry(kit.render.photo.template)
      expect(geometry, kit.id).not.toBeNull()
      expect(existsSync(join(ROOT, 'public', geometry!.shading)), kit.id).toBe(true)
      expect(existsSync(join(ROOT, 'public', geometry!.highlight)), kit.id).toBe(true)
      if (kit.render.photo.complete) expect(kit.render.photo.missing).toEqual([])
    }
    expect(master.counts.photoComplete).toBeGreaterThanOrEqual(9)
  })
})
