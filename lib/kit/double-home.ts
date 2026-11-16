import type { KitSpec } from './spec'

type CutSpec = Pick<KitSpec, 'seasonLabel' | 'variant' | 'base' | 'pattern' | 'collar' | 'collarInk' | 'sleeves' | 'sleeveInk'>

export function isDoubleHomeCut(spec: CutSpec): boolean {
  return spec.seasonLabel === '1999/00' && spec.variant === 'home' && spec.pattern === 'twin-stripe'
    && spec.collar === 'polo' && spec.collarInk === spec.base && spec.sleeves === 'cuff' && spec.sleeveInk === 'ink'
}

/** The 1999/00 home shirt's own inks, read off the front photograph (public/kits/vp-2000-home.webp). Data, not
 * styling: the component paints them, the brand rule keeps raw colour out of components. */
export const DOUBLE_HOME_RED = '#dc252c'
export const DOUBLE_INK = {
  dark: '#000', light: '#fff', seam: '#41060c', cuff: '#191719', collarShade: '#840b13', collarBand: '#20161a',
  yokeShade: '#7b0810', yokeLine: '#5d0710',
} as const
