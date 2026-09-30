import geometryFile from '../../content/generated/kit-photo-geometry.json'

import type { KitBodyTemplateId } from './body-templates'
import type { CollarId, PatternId, SleeveId } from './spec'

/**
 * מצב הצילום — the geometry a body template needs to print a shirt photoreal.
 *
 * Built by `scripts/kits/build-photo-templates.py` from sources in `brand/source/kits/<template>/`
 * and written to `content/generated/kit-photo-geometry.json`: two greyscale maps (the cloth's
 * folds and light, no hue), the garment's own silhouette split into torso / sleeves / raglan, and
 * one traced path per construction mask. Nothing here is a crop of a real shirt: the engine fills
 * every path with the spec's own inks, so the same geometry draws any season, and the photograph
 * contributes only light.
 *
 * Photo is a property of the TEMPLATE, not of a season: wherever a template has geometry, every
 * kit on it can print photoreal — as long as each of its values has geometry too (`photoMissing`).
 */

export type PhotoBox = { x: number; y: number; w: number; h: number }

export type PhotoGeometry = {
  canvas: { w: number; h: number }
  shading: string
  highlight: string
  silhouette: string
  torso: string
  torsoBox: PhotoBox
  sleeves: [string, string]
  raglan: [string, string]
  masks: {
    collarCrew?: string
    collarV?: string
    /** delta 87 (23.9.2026): retro-90s-boxy / retro-80s-long's polo collar mask */
    collarPolo?: string
    cuffs?: string
    sidePanels?: string
    hem?: string
    /** delta 87: retro-80s-long's three-stripe-over-shoulder mask */
    sleeveStripe?: string
  }
  anchors: Record<'crest' | 'maker' | 'sponsor', PhotoBox>
  supports: { patternExcept: string[]; collar: string[]; sleeves: string[] }
  missing: string[]
}

export type PhotoMarkFile = { src: string; w: number; h: number; mode: 'mono' | 'palette'; label: string }

type GeometryFile = {
  schemaVersion: number
  templates: Partial<Record<KitBodyTemplateId, PhotoGeometry>>
  marks: Record<string, PhotoMarkFile>
}

const file = geometryFile as unknown as GeometryFile

export function photoGeometry(template: KitBodyTemplateId): PhotoGeometry | null {
  return file.templates[template] ?? null
}

export function photoTemplates(): KitBodyTemplateId[] {
  return Object.keys(file.templates) as KitBodyTemplateId[]
}

export function photoMarkFile(name: string): PhotoMarkFile | null {
  return file.marks[name] ?? null
}

/**
 * What this template CANNOT draw for these values — empty means photo is honest for them.
 * A generic surface pattern (stripes, hoops, a sash) is a full-bleed shape the torso clips, so it
 * needs no geometry; a construction-bound value (a polo collar, a yoke) needs its own mask.
 */
export function photoMissing(
  template: KitBodyTemplateId,
  values: { pattern?: PatternId; collar?: CollarId; sleeves?: SleeveId },
): string[] {
  const geometry = photoGeometry(template)
  if (!geometry) return ['template']
  const missing: string[] = []
  if (values.pattern && geometry.supports.patternExcept.includes(values.pattern)) missing.push(`pattern:${values.pattern}`)
  if (values.collar && !geometry.supports.collar.includes(values.collar)) missing.push(`collar:${values.collar}`)
  if (values.sleeves && !geometry.supports.sleeves.includes(values.sleeves)) missing.push(`sleeves:${values.sleeves}`)
  return missing
}
