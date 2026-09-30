/**
 * המתכונים — what is on the bench and what "done" means, one record per job (spec §12–§13).
 *
 * A recipe is the verb and only the verb: a surface, the tools, the palette, the target. It
 * does not know which route it serves, who asked, what it pays or where the world shows it
 * again — `output.worldUse` is a KEY the callback layer resolves, not a place this file
 * knows. The missions agent opens one by id through `MechanicRequest.contentId`.
 *
 * Three ages, one recipe: `recipeForLevel` DERIVES the child's and the teen's bench from the
 * adult's record — fewer tools and a snap grid for a child, the recipe's own timer for a
 * teen, the plain bench for an adult whose difficulty is his life (spec §35, §49). Nothing
 * is written three times, so a change to the banner is a change to every banner.
 */

import type { MechanicLevel } from '@/lib/mechanics/types'

import type { CraftColor, CraftRecipe, CraftSurface, CraftTool } from './types'

export const CRAFT_RECIPES: Record<string, CraftRecipe> = {
  /** slice 1 — place, text, stamp, rotate, scale; a shirt Pugi can wear later */
  'fan-shirt-first': {
    id: 'fan-shirt-first',
    surface: 'shirt',
    tools: ['place', 'text', 'stamp', 'rotate', 'scale'],
    palette: ['sheet', 'ink', 'red'],
    target: { type: 'complete-layout', required: ['text', 'stamp', 'stripe'] },
    stamps: ['shield', 'ball', 'heart'],
    constraints: { maxMarks: 12, maxText: 10 },
    output: { persistent: true, worldUse: 'pugi:fan-shirt' },
  },
  /** slice 3 — cut; quantity */
  'derby-confetti': {
    id: 'derby-confetti',
    surface: 'paper',
    tools: ['cut'],
    target: { type: 'piece-count', min: 35 },
    constraints: { maxMarks: 40, timePressure: true, seconds: 90 },
  },
  /** slice 2 — paint, stencil; coverage; the banner hangs in the stand afterwards */
  'gate5-banner': {
    id: 'gate5-banner',
    surface: 'banner',
    tools: ['paint', 'stencil'],
    palette: ['red', 'ink', 'sheet'],
    target: { type: 'coverage', min: 0.78 },
    stencilText: 'הפועל',
    constraints: { maxMarks: 24, timePressure: true, seconds: 120 },
    output: { persistent: true, worldUse: 'stand:banner' },
  },
  /** slice 4 — place the card, spray through it; overspray counts against you */
  'wall-stencil': {
    id: 'wall-stencil',
    surface: 'wall',
    tools: ['place', 'spray'],
    palette: ['red', 'ink'],
    target: { type: 'stencil-coverage', min: 0.7 },
    stencilText: 'הפועל',
    constraints: { maxMarks: 30, overspray: true },
    output: { persistent: true, worldUse: 'wall:stencil' },
  },
  /** the smallest job on the bench — a sticker with a word and a mark on it */
  'sticker-first': {
    id: 'sticker-first',
    surface: 'sticker',
    tools: ['text', 'stamp', 'place'],
    palette: ['red', 'ink'],
    target: { type: 'complete-layout', required: ['text', 'stamp'] },
    stamps: ['shield', 'ball', 'heart'],
    constraints: { maxMarks: 6, maxText: 8 },
    output: { persistent: true },
  },
}

export const CRAFT_RECIPE_IDS: readonly string[] = Object.keys(CRAFT_RECIPES)

export function recipeById(id: string | null | undefined): CraftRecipe | null {
  if (!id) return null
  return CRAFT_RECIPES[id] ?? null
}

/** the cloth's own colour before anybody touches it */
export const SURFACE_BASE: Record<CraftSurface, CraftColor> = {
  shirt: 'red',
  banner: 'sheet',
  paper: 'sheet',
  wall: 'concrete',
  flag: 'red',
  poster: 'sheet',
  stencil: 'sheet',
  sticker: 'sheet',
}

/** what a `paint` / `spray` mark is drawn with when the recipe names no palette */
export const DEFAULT_PALETTE: readonly CraftColor[] = ['red', 'ink', 'sheet']

/** the two modifiers are not modes — a child's bench simply has no rotate and no scale */
const CHILD_DROPS: ReadonlySet<CraftTool> = new Set(['rotate', 'scale'])

/**
 * The same job at three ages. Derived, never duplicated:
 *
 *  · child — no rotate/scale, a snap grid, hints on, a wider brush, no timer.
 *  · teen — every tool, the recipe's own timer if it allows one, no snap.
 *  · adult — every tool, no timer: the mechanic stays simple, the life is what is hard.
 *
 * Monotone by construction (tests assert it): tools(child) ⊆ tools(teen) = tools(adult),
 * and a child is never given a timer.
 */
export function recipeForLevel(recipe: CraftRecipe, level: MechanicLevel): CraftRecipe {
  const base = recipe.constraints ?? {}
  if (level === 'child') {
    return {
      ...recipe,
      tools: recipe.tools.filter((tool) => !CHILD_DROPS.has(tool)),
      constraints: { ...base, timePressure: false, snap: 0.05, hints: true, brush: 1.4 },
    }
  }
  if (level === 'teen') {
    return { ...recipe, constraints: { ...base, timePressure: base.timePressure === true, hints: false } }
  }
  return { ...recipe, constraints: { ...base, timePressure: false, hints: false } }
}

/** the marks a `place` tray offers for this recipe, in the order the tray shows them */
export function placeables(recipe: CraftRecipe): readonly ('text' | 'stamp' | 'stripe' | 'stencil')[] {
  const out: ('text' | 'stamp' | 'stripe' | 'stencil')[] = []
  if (recipe.tools.includes('text')) out.push('text')
  if (recipe.tools.includes('stamp') && (recipe.stamps?.length ?? 0) > 0) out.push('stamp')
  if (recipe.target.type === 'complete-layout' && recipe.target.required.includes('stripe')) out.push('stripe')
  if (recipe.stencilText && (recipe.tools.includes('stencil') || recipe.tools.includes('place'))) out.push('stencil')
  return out
}

/** brush width as a fraction of the surface's width, per tool, before the level's multiplier */
export const BRUSH: Record<'paint' | 'spray' | 'cut', number> = { paint: 0.11, spray: 0.07, cut: 0.006 }

export function brushWidth(recipe: CraftRecipe, tool: 'paint' | 'spray' | 'cut'): number {
  const mul = recipe.constraints?.brush ?? 1
  return tool === 'cut' ? BRUSH.cut : BRUSH[tool] * mul
}
