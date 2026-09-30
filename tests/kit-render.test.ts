import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { resolveKitRender } from '@/lib/kit/engine'
import { kitRecords, specOf } from '@/lib/kit/kit-master'
import { photoGeometry, photoTemplates } from '@/lib/kit/photo'

const ROOT = join(__dirname, '..')
const spec = (id: string) => specOf(kitRecords().find((kit) => kit.id === id)!)

describe('the kit engine — one plan, two looks', () => {
  it('prints 2009/10 on the photographed garment, and a season with no geometry in the drawn look', () => {
    const photo = resolveKitRender(spec('kit-2009-10-home'), { look: 'photo' })
    expect(photo.look).toBe('photo')
    expect(photo.width).toBe(1122)
    expect(photo.missing).toEqual([])
    // delta 87 (23.9.2026): retro-80s-long now HAS a photo template (the art delivery's fifth
    // cut), so 1985/86 prints photoreal too — the template-less case moved to the 1970s, whose
    // cut (retro-70s-boxy) the delivery never covered.
    const eighties = resolveKitRender(spec('kit-1985-86-home'), { look: 'photo' })
    expect(eighties.look).toBe('photo')
    expect(eighties.missing).toEqual([])
    expect(eighties.width).toBe(1122)
    const seventies = resolveKitRender(spec('kit-1978-79-home'), { look: 'photo' })
    expect(seventies.look).toBe('vector')
    expect(seventies.missing).toEqual(['template'])
    expect(seventies.width).toBe(360)
  })

  it('falls back, and says why, when one value has no geometry', () => {
    const plan = resolveKitRender({ ...spec('kit-2009-10-home'), collar: 'polo' }, { look: 'photo' })
    expect(plan.look).toBe('vector')
    expect(plan.missing).toEqual(['collar:polo'])
  })

  it('always prints the crest from /brand/crests — in both looks, for every kit', () => {
    for (const kit of kitRecords()) {
      for (const look of ['vector', 'photo'] as const) {
        const plan = resolveKitRender(specOf(kit), { look })
        if (kit.fields.crest.value) expect(plan.marks.crest?.src, kit.id).toMatch(/^\/brand\/crests\/[a-z0-9-]+\.png$/)
        else expect(plan.marks.crest, kit.id).toBeNull()
      }
    }
  })

  it('keeps rule 25 by default and prints the granted logos only when asked', () => {
    const s = spec('kit-2009-10-home')
    const rule = resolveKitRender(s)
    expect(rule.marks.maker?.kind).toBe('alt')
    expect(rule.marks.sponsor?.kind).toBe('lettered')
    const granted = resolveKitRender(s, { marks: 'granted' })
    expect(granted.marks.maker?.kind).toBe('image')
    expect(granted.marks.sponsor?.kind).toBe('image')
    // a sponsor with no granted file is lettered either way
    expect(resolveKitRender(spec('kit-2025-26-home'), { marks: 'granted' }).marks.sponsor?.kind).toBe('lettered')
  })

  it('places every mark inside the board, in its own units', () => {
    for (const kit of kitRecords()) {
      for (const look of ['vector', 'photo'] as const) {
        const plan = resolveKitRender(specOf(kit), { look, marks: 'granted' })
        for (const mark of [plan.marks.crest, plan.marks.maker, plan.marks.sponsor]) {
          if (!mark) continue
          expect(mark.box.x).toBeGreaterThanOrEqual(0)
          expect(mark.box.y).toBeGreaterThanOrEqual(0)
          expect(mark.box.x + mark.box.w).toBeLessThanOrEqual(plan.width)
          expect(mark.box.y + mark.box.h).toBeLessThanOrEqual(plan.height)
        }
      }
    }
  })

  it('draws no crest of its own and positions nothing by CSS percentage', () => {
    const shirt = readFileSync(join(ROOT, 'components/kit/KitEngineShirt.tsx'), 'utf8')
    expect(shirt).not.toContain('assembly.parts')
    expect(shirt).not.toContain('placementStyle')
    expect(shirt).not.toMatch(/left: `\$\{/)
    expect(shirt).toContain('resolveKitRender')
  })

  it('has real geometry for every photo template it claims', () => {
    expect(photoTemplates()).toContain('2010s-fitted')
    for (const id of photoTemplates()) {
      const g = photoGeometry(id)!
      for (const path of [g.silhouette, g.torso, ...g.sleeves, ...g.raglan, ...Object.values(g.masks)]) {
        expect(path, id).toMatch(/^M\d+ \d+L/)
      }
      expect(g.torsoBox.w).toBeGreaterThan(g.canvas.w / 2)
    }
  })
})
