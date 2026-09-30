'use client'

import { CreativeWorkbench } from '@/components/mechanics/craft/CreativeWorkbench'
import type { ActivityBoardProps } from '@/components/life/MechanicSheet'
import { recipeById, recipeForLevel } from '@/lib/game/craft/recipes'
import { toOutputData } from '@/lib/game/craft/serialize'
import { MESSAGES } from '@/lib/i18n'

import { Nothing, backLabel } from './shared'

/**
 * הסדנה, בתוך החדר — the life's wrapper for `supporterCraft` (spec §38, §41).
 *
 * No server deal: a craft job needs no archive row, so the recipe comes from the mission.
 * **Contract with the missions layer: `request.contentId` IS the recipe id** (a key of
 * `CRAFT_RECIPES`, e.g. `gate5-banner`); `pickContent` hands `supporterCraft` a null
 * contentId, and the mission that opens the bench sets it. An unknown or missing id is the
 * same as nothing to deal — the way out costs what walking away costs.
 *
 * Level comes from the request's window, the recipe is derived for it, and the result is
 * the mechanic contract and nothing more: `completed`, `score` (the engine's 0..1 measure),
 * and `output: { id: recipeId, data }` where `data` is a `CraftOutput` (marks, never
 * pixels). Money, reputation, proof and route are the life's (`settleActivity`).
 */
export default function LifeCraft({ request, onResult }: ActivityBoardProps) {
  const base = recipeById(request.contentId)
  if (!base) return <Nothing onLeave={() => onResult({ completed: false, score: 0 })} />
  const level = request.window.level
  const recipe = recipeForLevel(base, level)
  // the activity's own "back to the room" words, when the missions layer wrote them; the bench's "מוכן" otherwise
  const back = `life.act.${request.activity}.back` in MESSAGES ? backLabel(request.activity) : undefined
  return (
    <div className="mt-3" data-life="craft" data-craft-recipe={base.id}>
      <CreativeWorkbench
        recipe={recipe}
        level={level}
        doneLabel={back}
        onDone={({ output, measure }) =>
          onResult({
            completed: true,
            score: measure,
            output: { id: base.id, data: toOutputData(output) },
          })
        }
      />
    </div>
  )
}
