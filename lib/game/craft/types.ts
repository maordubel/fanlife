/**
 * סדנת האוהדים — the contract of the supporter's workbench (spec 25.9.2026, §18–§19, §44).
 *
 * One mechanic, `supporterCraft`, and one board, `CreativeWorkbench`, for every surface a
 * supporter ever puts a hand to: a shirt, a banner, a sheet of paper that becomes confetti,
 * a wall, a flag, a poster, a stencil, a sticker. There is no ConfettiGame and no
 * BannerGame — there is a RECIPE, which says which tools are on the bench and what "done"
 * means for this job. The recipe is the verb. The life supplies the person, the need, the
 * place and the hour (the mission), and `routes.ts` decides what it all meant.
 *
 * Three rules this file fixes so the rest cannot drift:
 *
 *  · **A recipe is not a route.** No `route` field, ever: the same banner recipe serves
 *    ULTRAS, CREATOR, FOUNDER and a boy helping a friend. Meaning belongs to the mission.
 *  · **What is kept is marks, never pixels.** A `CraftOutput` is a short list of
 *    normalised marks (0..1 coordinates, capped count, reduced precision) that draws the same
 *    thing on a card, a wardrobe, a stand or a wall years later. No PNG, no raw pointer log.
 *  · **The engine returns 0..1 and nothing else.** Whether it was "high" or "away", what it
 *    paid and who saw it is the life's arithmetic (`settleActivity`).
 */

import type { SerializableOutput } from '@/lib/mechanics/types'

export type CraftSurface = 'shirt' | 'banner' | 'paper' | 'wall' | 'flag' | 'poster' | 'stencil' | 'sticker'

export const CRAFT_SURFACES: readonly CraftSurface[] = [
  'shirt',
  'banner',
  'paper',
  'wall',
  'flag',
  'poster',
  'stencil',
  'sticker',
]

/** the bench's primitives — a tool is a verb, and the palette is the set a chapter can afford */
export type CraftTool = 'cut' | 'paint' | 'spray' | 'place' | 'stamp' | 'text' | 'rotate' | 'scale' | 'assemble' | 'stencil'

export const CRAFT_TOOLS: readonly CraftTool[] = [
  'cut',
  'paint',
  'spray',
  'place',
  'stamp',
  'text',
  'rotate',
  'scale',
  'assemble',
  /** paint through cut letters — a banner's word, a wall's card (delta 91) */
  'stencil',
]

/**
 * The drawing box of each surface, in SVG units. Marks are stored in 0..1 of THIS box, so
 * the aspect is part of the contract: a stroke's round brush is a circle on the glass and an
 * ellipse in normalised space, and `score.ts` rasterises with the same ratio the renderer
 * draws with. Change a box and every saved mark on that surface moves — so do not.
 */
export const SURFACE_BOX: Record<CraftSurface, { readonly w: number; readonly h: number }> = {
  shirt: { w: 360, h: 420 },
  banner: { w: 480, h: 180 },
  paper: { w: 400, h: 300 },
  wall: { w: 480, h: 300 },
  flag: { w: 480, h: 300 },
  poster: { w: 300, h: 400 },
  stencil: { w: 400, h: 300 },
  sticker: { w: 320, h: 320 },
}

/** a colour is a design token name, never a hex — the brand guard reads tokens (rule 8) */
export type CraftColor = 'red' | 'ink' | 'sheet' | 'concrete' | 'sign'

/** what "done" means for this job — the only thing the score reads */
export type CraftTarget =
  /** every required element placed (a shirt: text + crest + a stripe; a sticker: text) */
  | { type: 'complete-layout'; required: readonly CraftMarkKind[] }
  /** at least `min` pieces cut from the sheet (confetti) */
  | { type: 'piece-count'; min: number }
  /** at least `min` of the paintable area covered (a banner) */
  | { type: 'coverage'; min: number }
  /** at least `min` of the stencil's mask covered, penalised by spray outside it (a wall) */
  | { type: 'stencil-coverage'; min: number }

export type CraftRecipe = {
  id: string
  surface: CraftSurface
  tools: readonly CraftTool[]
  palette?: readonly CraftColor[]
  target: CraftTarget
  /** the stamps a `stamp` tool offers — crest keys / motif ids the surface renders */
  stamps?: readonly string[]
  /** the stencil's letters, when the recipe is a stencil job */
  stencilText?: string
  constraints?: {
    maxMarks?: number
    maxText?: number
    /** on the base recipe: whether a timer is ALLOWED; `recipeForLevel` turns it on for a teen only */
    timePressure?: boolean
    /** the timer's length when it runs, seconds (default 90) */
    seconds?: number
    overspray?: boolean
    /** a placed mark and a cut's ends snap to this grid (normalised units); a child gets one */
    snap?: number
    /** the bench shows what is still missing while working, not only on "מוכן" */
    hints?: boolean
    /** brush / roller / can width multiplier — a child gets a wider one (less precision asked) */
    brush?: number
  }
  output?: {
    /** kept in the save and shown again in the world */
    persistent?: boolean
    /** where the world shows it again — a key the callback layer resolves (`pugi:fan-shirt`, `stand:banner`) */
    worldUse?: string
  }
}

export type CraftMarkKind = 'text' | 'stamp' | 'stripe' | 'shape' | 'stroke' | 'spray' | 'cut' | 'stencil'

/**
 * One mark on a surface, in normalised coordinates (0..1 of the surface's box), rounded to
 * three decimals. `points` is a simplified polyline for strokes and cuts (capped by
 * `serialize.ts`), never the raw pointer trail.
 */
export type CraftMark = {
  kind: CraftMarkKind
  x: number
  y: number
  /** text content, stamp id, or a shape name */
  value?: string
  color?: CraftColor
  scale?: number
  /** degrees, -180..180 */
  rotate?: number
  /** stroke width as a fraction of the surface's width */
  width?: number
  points?: readonly (readonly [number, number])[]
}

/** what the save keeps — small, deterministic, editable, drawable at any size */
export type CraftOutput = {
  recipeId: string
  surface: CraftSurface
  /** the base colour of the garment / cloth / paper */
  base?: CraftColor
  marks: readonly CraftMark[]
  /** the engine's own measure of the target, 0..1 — kept so the world can pick a tier (light / full) without re-scoring */
  measure?: number
}

/** the `ActivityResult.output.data` shape — `CraftOutput` is serialisable by construction */
export type CraftOutputData = CraftOutput & SerializableOutput
