import { describe, expect, it } from 'vitest'

import { bodyTemplateForSeason } from '@/lib/kit/body-templates'
import { constructionFingerprint, resolveKitConstruction } from '@/lib/kit/engine'
import type { KitSpec } from '@/lib/kit/spec'

const base: KitSpec = {
  seasonLabel: '1985/86', variant: 'home', base: 'red', pattern: 'solid', patternInk: 'cream',
  sleeves: 'shoulder-stripe', sleeveInk: 'red', collar: 'polo', collarInk: 'cream', sponsorHe: 'VISA',
  makerHe: 'adidas', nameset: 'block-solid', number: 10, shorts: 'red', socks: 'red', crestKey: 'worker-ta',
}

describe('Kit Engine V5', () => {
  it('uses different anatomy for 1985/86 and 2009/10', () => {
    expect(bodyTemplateForSeason('1985/86').id).toBe('retro-80s-long')
    expect(bodyTemplateForSeason('2009/10').id).toBe('2010s-fitted')
    expect(bodyTemplateForSeason('1985/86').leftSleevePath).not.toBe(bodyTemplateForSeason('2009/10').leftSleevePath)
  })

  it('uses historical mark placements when an assembly master exists', () => {
    const c = resolveKitConstruction(base)
    expect(c.referenceLevel).toBe('mastered')
    expect(c.placements.sponsor.w).toBeGreaterThan(c.placements.maker.w)
  })

  it('changes construction fingerprint when a sewing/detail choice changes', () => {
    expect(constructionFingerprint(base)).not.toBe(constructionFingerprint({ ...base, collar: 'crew' }))
  })
})
