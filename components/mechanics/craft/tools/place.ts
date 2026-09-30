/**
 * לסדר — the things that are put down rather than drawn: a word, a stamp, a stripe, a
 * stencil card. Each arrives at the centre of the surface (nobody has to hit a spot with a
 * thumb), and is then dragged, turned and sized. Hit-testing is a box around the mark, big
 * enough for a finger.
 */

import { stencilCard, stencilGrid } from '@/lib/game/craft/stencil'
import { SURFACE_BOX, type CraftColor, type CraftMark, type CraftRecipe } from '@/lib/game/craft/types'

import { clamp01, snap } from './shared'

export type Placeable = 'text' | 'stamp' | 'stripe' | 'stencil'

/** the card's size when it is first put down — a wall takes a bigger word than a banner */
const STENCIL_SCALE: Partial<Record<CraftRecipe['surface'], number>> = { wall: 1.25, banner: 1.15, flag: 1.15 }


/** a new mark of a kind, at the surface's centre (snapped), in the chosen colour */
export function newPlaced(kind: Placeable, recipe: CraftRecipe, color: CraftColor, value?: string): CraftMark {
  const x = snap(0.5, recipe)
  const y = snap(kind === 'stripe' ? 0.62 : 0.42, recipe)
  if (kind === 'text') return { kind: 'text', x, y, value: (value ?? '').slice(0, recipe.constraints?.maxText ?? 12), color, scale: 1 }
  if (kind === 'stamp') return { kind: 'stamp', x, y: snap(0.3, recipe), value: value ?? recipe.stamps?.[0] ?? 'shield', color, scale: 1 }
  if (kind === 'stripe') return { kind: 'stripe', x, y, color, scale: 1 }
  return { kind: 'stencil', x, y: snap(0.5, recipe), value: recipe.stencilText ?? value ?? '', color, scale: STENCIL_SCALE[recipe.surface] ?? 1 }
}

export type Box = { x: number; y: number; w: number; h: number }

/** the box a placed mark occupies, normalised — the renderer and the hit-test agree on it */
export function markBox(mark: CraftMark, recipe: Pick<CraftRecipe, 'surface' | 'stencilText'>): Box | null {
  const box = SURFACE_BOX[recipe.surface]
  const aspect = box.h / box.w
  const scale = mark.scale ?? 1
  switch (mark.kind) {
    case 'text': {
      const chars = Math.max(2, (mark.value ?? '').length)
      const w = Math.min(0.96, 0.09 * chars * scale)
      const h = (0.16 * scale) / aspect
      return { x: mark.x - w / 2, y: mark.y - h / 2, w, h }
    }
    case 'stamp': {
      const w = 0.24 * scale
      const h = w / aspect
      return { x: mark.x - w / 2, y: mark.y - h / 2, w, h }
    }
    case 'stripe': {
      const h = (0.08 * scale) / aspect
      return { x: 0, y: mark.y - h / 2, w: 1, h }
    }
    case 'stencil':
      return stencilCard(stencilGrid(mark.value ?? recipe.stencilText ?? ''), mark.x, mark.y, scale, aspect)
    default:
      return null
  }
}

/** the topmost placed mark under a point, with a finger's margin; drawn marks are never picked */
export function hitTest(marks: readonly CraftMark[], recipe: Pick<CraftRecipe, 'surface' | 'stencilText'>, x: number, y: number): number | null {
  const margin = 0.03
  for (let i = marks.length - 1; i >= 0; i--) {
    const box = markBox(marks[i] as CraftMark, recipe)
    if (!box) continue
    if (x >= box.x - margin && x <= box.x + box.w + margin && y >= box.y - margin && y <= box.y + box.h + margin) return i
  }
  return null
}

export function moved(mark: CraftMark, recipe: CraftRecipe, x: number, y: number): CraftMark {
  return { ...mark, x: snap(clamp01(x), recipe), y: snap(clamp01(y), recipe) }
}

export function rotated(mark: CraftMark, degrees: number): CraftMark {
  const next = (((mark.rotate ?? 0) + degrees + 180) % 360 + 360) % 360 - 180
  return { ...mark, rotate: next }
}

export function scaled(mark: CraftMark, factor: number): CraftMark {
  return { ...mark, scale: Math.max(0.4, Math.min(3, (mark.scale ?? 1) * factor)) }
}
