/**
 * מספריים — a cut is a line across the sheet.
 *
 * The score counts a cut only when both ends reach an edge, so the tool helps the hand get
 * there: an end that lands within `REACH` of an edge is pulled onto it. A child's bench
 * (snap set) also straightens the cut into a line between its two ends — scissors that
 * cannot wander. The trail in between is kept for everybody else: a wobbly cut is a wobbly
 * piece of confetti, which is the point.
 */

import { EDGE } from '@/lib/game/craft/score'
import type { CraftMark } from '@/lib/game/craft/types'

import { clamp01, type Pt, type StrokeTool } from './shared'

const REACH = 0.1

function toEdge(p: Pt): Pt {
  let [x, y] = p
  const dx = Math.min(x, 1 - x)
  const dy = Math.min(y, 1 - y)
  if (dx <= REACH && dx <= dy) x = x < 0.5 ? 0 : 1
  else if (dy <= REACH) y = y < 0.5 ? 0 : 1
  return [clamp01(x), clamp01(y)]
}

export const cutTool: StrokeTool = (points, ctx) => {
  if (points.length < 2) return null
  const first = toEdge(points[0] as Pt)
  const last = toEdge(points[points.length - 1] as Pt)
  const straight = (ctx.recipe.constraints?.snap ?? 0) > 0
  const trail: Pt[] = straight ? [first, last] : [first, ...points.slice(1, -1), last]
  const mark: CraftMark = { kind: 'cut', x: first[0], y: first[1], points: trail, width: 0.006 }
  return mark
}

/** does a cut reach two different edges — the tool's own preview of what the score will say */
export function crossesSheet(points: readonly Pt[]): boolean {
  if (points.length < 2) return false
  const side = (p: Pt) => (p[1] <= EDGE ? 't' : p[1] >= 1 - EDGE ? 'b' : p[0] <= EDGE ? 's' : p[0] >= 1 - EDGE ? 'e' : null)
  const a = side(points[0] as Pt)
  const b = side(points[points.length - 1] as Pt)
  return a !== null && b !== null && a !== b
}
