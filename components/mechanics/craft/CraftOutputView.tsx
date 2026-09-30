/**
 * מה שנשאר ביד, מוצג — a finished `CraftOutput` at any size, read-only (spec §21, §47).
 *
 * This is the component the WORLD uses: the banner in the stand, the shirt in the wardrobe,
 * the stencil on the wall years later. It imports the surfaces and the mark renderer and
 * nothing of the bench — no state, no pointer, no toolbar — so a room that shows a banner
 * never downloads the editor. Give it the output (a saved blob is fine: it goes through
 * `fromOutput`) and a box to fill; the SVG scales to it.
 */

import { useId } from 'react'

import { SURFACE_BASE, recipeById } from '@/lib/game/craft/recipes'
import { fromOutput } from '@/lib/game/craft/serialize'
import { SURFACE_BOX, type CraftOutput, type CraftRecipe } from '@/lib/game/craft/types'

import { GrainFilter, Marks, SURFACES } from './render'

export type CraftOutputViewProps = {
  /** a `CraftOutput`, or the raw `output.data` a save kept — anything else renders nothing */
  output: CraftOutput | unknown
  /** the words a screen reader gets — the mission's own name for the thing */
  label?: string
  className?: string
}

/** the recipe a saved output was made with, or a stand-in that draws it plainly */
function recipeFor(output: CraftOutput): Pick<CraftRecipe, 'surface' | 'stencilText' | 'target'> {
  const known = recipeById(output.recipeId)
  if (known && known.surface === output.surface) return known
  return { surface: output.surface, target: { type: 'complete-layout', required: [] } }
}

export function CraftOutputView({ output, label, className = '' }: CraftOutputViewProps) {
  const uid = useId().replace(/:/g, '')
  const parsed = fromOutput(output)
  if (!parsed) return null
  const recipe = recipeFor(parsed)
  const Surface = SURFACES[parsed.surface]
  const { w, h } = SURFACE_BOX[parsed.surface]
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={`block h-auto w-full ${className}`}
      role={label ? 'img' : undefined}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      data-craft-output={parsed.recipeId}
    >
      <defs>
        <GrainFilter uid={uid} />
      </defs>
      <Surface surface={parsed.surface} base={parsed.base ?? SURFACE_BASE[parsed.surface]} uid={uid}>
        <Marks marks={parsed.marks} recipe={recipe} uid={uid} />
      </Surface>
    </svg>
  )
}
