import type { KitSpec } from './spec'

type CutSpec = Pick<KitSpec, 'seasonLabel' | 'variant' | 'base' | 'pattern' | 'collar' | 'collarInk' | 'sleeves' | 'sleeveInk'>

export function isDoubleHomeCut(spec: CutSpec): boolean {
  return spec.seasonLabel === '1999/00' && spec.variant === 'home' && spec.pattern === 'twin-stripe'
    && spec.collar === 'polo' && spec.collarInk === spec.base && spec.sleeves === 'cuff' && spec.sleeveInk === 'ink'
}
