/**
 * What every tool shares: a pointer trail in normalised units, a snap grid, a mark out.
 * Pure modules — no React, no DOM — so a tool is a function from touches to a `CraftMark`
 * and the tests can drive one without a browser.
 */

import type { CraftColor, CraftMark, CraftRecipe } from '@/lib/game/craft/types'

export type Pt = readonly [number, number]

export type ToolContext = {
  recipe: CraftRecipe
  color: CraftColor
}

/** a pointer trail → one mark, or null when the trail is too short to be anything */
export type StrokeTool = (points: readonly Pt[], ctx: ToolContext) => CraftMark | null

export const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))

/** to the recipe's grid when it has one (a child's bench), untouched otherwise */
export function snap(value: number, recipe: CraftRecipe): number {
  const grid = recipe.constraints?.snap
  if (!grid || grid <= 0) return clamp01(value)
  return clamp01(Math.round(value / grid) * grid)
}

/** the length of a trail on the glass, aspect-corrected, in x-units */
export function trailLength(points: readonly Pt[], aspect: number): number {
  let len = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1] as Pt
    const b = points[i] as Pt
    len += Math.hypot(b[0] - a[0], (b[1] - a[1]) / aspect)
  }
  return len
}
