import type { KitPlacement } from './assembly'
import { makerAssetForName, sponsorAssetForName } from './mark-library'
import type { KitSpec } from './spec'

export type VisualPartKind = 'base' | 'secondary' | 'pattern' | 'collar' | 'sleeve' | 'maker' | 'sponsor' | 'crest'

/**
 * All archive photographs are centred shirt cut-outs, so one normalized crop language can
 * sample them without inventing a second illustration. These are visual references only:
 * the archive data remains the source of truth for grading.
 */
export type PhotoCrop = { size: string; position: string }
export const PHOTO_CROP: Record<VisualPartKind, PhotoCrop> = {
  base: { size: '158% auto', position: '50% 46%' },
  secondary: { size: '174% auto', position: '50% 50%' },
  pattern: { size: '165% auto', position: '50% 52%' },
  collar: { size: '285% auto', position: '50% 6%' },
  sleeve: { size: '225% auto', position: '15% 30%' },
  maker: { size: '330% auto', position: '34% 23%' },
  sponsor: { size: '235% auto', position: '50% 49%' },
  crest: { size: '330% auto', position: '68% 23%' },
}

export const DEFAULT_CREST: KitPlacement = { x: 57.5, y: 20.5, w: 15, h: 17 }
export const DEFAULT_MAKER: KitPlacement = { x: 29.5, y: 21.5, w: 13, h: 10 }
export const DEFAULT_SPONSOR: KitPlacement = { x: 30, y: 44.5, w: 40, h: 14 }

/**
 * A mark's size is a property of the mark, not of the component drawing it. VISA really
 * occupied a broader block than several later wordmarks; Subaru is lower and narrower.
 */
export function defaultMarkPlacement(spec: KitSpec, kind: 'maker' | 'sponsor' | 'crest'): KitPlacement {
  if (kind === 'crest') return DEFAULT_CREST
  if (kind === 'maker') return makerAssetForName(spec.makerHe, spec.seasonLabel)?.defaultPlacement ?? DEFAULT_MAKER
  return sponsorAssetForName(spec.sponsorHe)?.defaultPlacement ?? DEFAULT_SPONSOR
}

export function darkCloth(spec: KitSpec): boolean {
  return !['paper', 'cream'].includes(spec.base)
}
