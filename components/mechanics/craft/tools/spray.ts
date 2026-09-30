/**
 * ספריי — the can. Same shape as the roller, a narrower, softer mark; the renderer gives it
 * the grain, the score gives it the mask. Where the can goes outside the card is the
 * player's problem, which is what `constraints.overspray` means.
 */

import { brushWidth } from '@/lib/game/craft/recipes'
import type { CraftMark } from '@/lib/game/craft/types'

import type { Pt, StrokeTool } from './shared'

export const sprayTool: StrokeTool = (points, ctx) => {
  if (points.length === 0) return null
  const first = points[0] as Pt
  const mark: CraftMark = {
    kind: 'spray',
    x: first[0],
    y: first[1],
    color: ctx.color,
    width: brushWidth(ctx.recipe, 'spray'),
    points: points.length === 1 ? [first, first] : points,
  }
  return mark
}
