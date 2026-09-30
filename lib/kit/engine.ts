import { kitAssemblyForSeason, type KitPlacement } from './assembly'
import { BODY_TEMPLATES, bodyTemplateForSeason, type KitBodyTemplate, type KitBodyTemplateId } from './body-templates'
import { crestArt, seasonStartYear } from './crestMarks'
import { markFor, type MakerMarkId } from './maker-marks'
import { grantedMaker, grantedSponsor, makerAssetForName, sponsorAssetForName } from './mark-library'
import { photoGeometry, photoMissing, type PhotoBox, type PhotoGeometry } from './photo'
import { COLOUR_VAR, type KitSpec } from './spec'

export type KitConstruction = {
  bodyTemplateId: KitBodyTemplateId
  template: KitBodyTemplate
  placements: Record<'maker' | 'crest' | 'sponsor', KitPlacement>
  exactArtwork: { maker: boolean; sponsor: boolean }
  referenceLevel: 'mastered' | 'modeled'
}

function bodyOverride(spec: KitSpec): KitBodyTemplateId | null {
  const value = (spec as KitSpec & { bodyTemplateId?: KitBodyTemplateId }).bodyTemplateId
  return value && BODY_TEMPLATES[value] ? value : null
}

export function templateFor(spec: KitSpec): KitBodyTemplate {
  const override = bodyOverride(spec)
  return override ? BODY_TEMPLATES[override] : bodyTemplateForSeason(spec.seasonLabel)
}

export function resolveKitConstruction(spec: KitSpec): KitConstruction {
  const template = templateFor(spec)
  const assembly = kitAssemblyForSeason(spec.seasonLabel, spec.variant)
  return {
    bodyTemplateId: template.id,
    template,
    placements: {
      maker: assembly?.placements.maker ?? template.anchors.maker,
      crest: assembly?.placements.crest ?? template.anchors.crest,
      sponsor: assembly?.placements.sponsor ?? template.anchors.sponsor,
    },
    exactArtwork: {
      maker: Boolean(makerAssetForName(spec.makerHe, spec.seasonLabel)),
      sponsor: Boolean(sponsorAssetForName(spec.sponsorHe)),
    },
    referenceLevel: assembly ? 'mastered' : 'modeled',
  }
}

export function constructionFingerprint(spec: KitSpec): string {
  const c = resolveKitConstruction(spec)
  return [c.bodyTemplateId, spec.pattern, spec.sleeves, spec.collar, spec.makerHe ?? '-', spec.sponsorHe ?? '-', spec.crestKey ?? '-'].join('|')
}

/* ==================================================================== the render plan
 *
 * ONE ENGINE, TWO LOOKS (21.9.2026). A shirt is still the eight layers of `lib/kit/spec.ts`; what
 * changes between the looks is only the garment the layers are drawn on:
 *
 *   · `vector` — the period silhouette of `body-templates.ts` on a 360×420 board, drawn cloth;
 *   · `photo`  — the SAME layers on the template's photographed garment (1122×1402): the spec's
 *     inks fill traced paths, and two greyscale maps lay the cloth's folds and light over them.
 *
 * Both looks come out of `resolveKitRender`, so Gate 4, Gate 5, the archive and the minis cannot
 * disagree about what a spec means. Photo is honoured only where the template has geometry for
 * every value in the spec (`photoMissing`); otherwise the plan says `vector` and why.
 *
 * Every mark sits INSIDE the SVG, in the board's own units. A mark positioned by CSS percentages
 * over a letterboxed SVG drifts the moment a caller gives the shirt a width and a height — which
 * is the V13/V14 bug Maor saw — and a mark in the viewBox cannot.
 *
 * The crest is always the printed artwork (`crestArt`, rule 25). The maker and sponsor follow the
 * regime the caller asks for: `granted` (gates 4–5, Maor 21.9.2026) prints the real logo where
 * the table has one; `rule25` (everywhere else) prints the alternative mark and the lettering.
 */

export type KitLook = 'vector' | 'photo'
export type KitMarksRegime = 'granted' | 'rule25'
export type RenderBox = { x: number; y: number; w: number; h: number }

export type KitMarkPlan =
  | { kind: 'image'; src: string; box: RenderBox; print: 'mono' | 'colour'; ink: string }
  | { kind: 'alt'; id: MakerMarkId; box: RenderBox; ink: string }
  | { kind: 'lettered'; text: string; box: RenderBox; ink: string }

export type KitRenderPlan = {
  look: KitLook
  requested: KitLook
  templateId: KitBodyTemplateId
  template: KitBodyTemplate
  width: number
  height: number
  colours: { base: string; secondary: string; sleeve: string; collar: string }
  dark: boolean
  photo: { geometry: PhotoGeometry; patternTransform: string } | null
  /** why a requested photo fell back to vector — empty when it did not */
  missing: string[]
  marks: {
    crest: { src: string; box: RenderBox } | null
    maker: KitMarkPlan | null
    sponsor: KitMarkPlan | null
  }
}

const VECTOR_W = 360
const VECTOR_H = 420

function percentBox(p: KitPlacement): RenderBox {
  return { x: (p.x / 100) * VECTOR_W, y: (p.y / 100) * VECTOR_H, w: (p.w / 100) * VECTOR_W, h: (p.h / 100) * VECTOR_H }
}

function numbers(path: string): number[] {
  return (path.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
}

/** the vector body's bounding box, read off its own path */
function vectorBodyBox(template: KitBodyTemplate): PhotoBox {
  const n = numbers(template.bodyPath)
  const xs = n.filter((_, i) => i % 2 === 0)
  const ys = n.filter((_, i) => i % 2 === 1)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

/**
 * A surface pattern is drawn in the vector board's units and mapped onto the photographed torso,
 * so a hoop sits on the same part of the body in both looks and the photo needs no pattern files.
 */
function patternTransform(template: KitBodyTemplate, geometry: PhotoGeometry): string {
  const from = vectorBodyBox(template)
  const to = geometry.torsoBox
  const sx = to.w / from.w
  const sy = to.h / from.h
  return `matrix(${sx.toFixed(4)} 0 0 ${sy.toFixed(4)} ${(to.x - from.x * sx).toFixed(2)} ${(to.y - from.y * sy).toFixed(2)})`
}

export function isDarkCloth(spec: Pick<KitSpec, 'base'>): boolean {
  return !['paper', 'cream', 'concrete'].includes(spec.base)
}

function lettered(text: string, box: RenderBox, ink: string): KitMarkPlan {
  return { kind: 'lettered', text, box, ink }
}

export function resolveKitRender(
  spec: KitSpec,
  { look = 'vector', marks = 'rule25' }: { look?: KitLook; marks?: KitMarksRegime } = {},
): KitRenderPlan {
  const template = templateFor(spec)
  const geometry = look === 'photo' ? photoGeometry(template.id) : null
  const missing = look === 'photo'
    ? photoMissing(template.id, { pattern: spec.pattern, collar: spec.collar, sleeves: spec.sleeves })
    : []
  const photo = geometry && missing.length === 0 ? { geometry, patternTransform: patternTransform(template, geometry) } : null
  const drawn: KitLook = photo ? 'photo' : 'vector'
  const dark = isDarkCloth(spec)
  const contrast = dark ? COLOUR_VAR.cream : COLOUR_VAR.ink

  let boxes: Record<'crest' | 'maker' | 'sponsor', RenderBox>
  if (photo) {
    boxes = photo.geometry.anchors
  } else {
    const construction = resolveKitConstruction(spec)
    boxes = {
      crest: percentBox(construction.placements.crest),
      maker: percentBox(construction.placements.maker),
      sponsor: percentBox(construction.placements.sponsor),
    }
  }

  const crestSrc = crestArt(spec.crestKey, dark, seasonStartYear(spec.seasonLabel))
  const realMaker = marks === 'granted' ? grantedMaker(spec.makerHe, spec.seasonLabel) : null
  const altMaker = markFor(spec.makerHe, spec.seasonLabel)
  const realSponsor = marks === 'granted' ? grantedSponsor(spec.sponsorHe) : null

  return {
    look: drawn,
    requested: look,
    templateId: template.id,
    template,
    width: photo ? photo.geometry.canvas.w : VECTOR_W,
    height: photo ? photo.geometry.canvas.h : VECTOR_H,
    colours: {
      base: COLOUR_VAR[spec.base],
      secondary: COLOUR_VAR[spec.patternInk],
      sleeve: COLOUR_VAR[spec.sleeveInk],
      collar: COLOUR_VAR[spec.collarInk],
    },
    dark,
    photo,
    missing: look === 'photo' && !geometry ? ['template'] : missing,
    marks: {
      crest: crestSrc ? { src: crestSrc, box: boxes.crest } : null,
      maker: realMaker
        ? { kind: 'image', src: realMaker.src, box: boxes.maker, print: realMaker.print, ink: contrast }
        : altMaker
          ? { kind: 'alt', id: altMaker, box: boxes.maker, ink: contrast }
          : null,
      sponsor: realSponsor
        ? { kind: 'image', src: realSponsor.src, box: boxes.sponsor, print: realSponsor.print, ink: contrast }
        : spec.sponsorHe
          ? lettered(spec.sponsorHe, boxes.sponsor, contrast)
          : null,
    },
  }
}
