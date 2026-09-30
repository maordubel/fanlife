/**
 * רולר — a roller stroke: the trail as it was rolled, the recipe's width, the chosen colour.
 * A dab (a trail too short to be a line) is still a dab — a round of paint where the roller
 * touched the cloth.
 */

import { brushWidth } from '@/lib/game/craft/recipes'
import type { CraftMark } from '@/lib/game/craft/types'

import type { Pt, StrokeTool } from './shared'

export const paintTool: StrokeTool = (points, ctx) => {
  if (points.length === 0) return null
  const first = points[0] as Pt
  const mark: CraftMark = {
    kind: 'stroke',
    x: first[0],
    y: first[1],
    color: ctx.color,
    width: brushWidth(ctx.recipe, 'paint'),
    points: points.length === 1 ? [first, first] : points,
  }
  return mark
}
