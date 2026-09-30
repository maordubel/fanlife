import { notFound } from 'next/navigation'

import { CRAFT_RECIPE_IDS, recipeById } from '@/lib/game/craft/recipes'
import type { MechanicLevel } from '@/lib/mechanics/types'
import { qaAllowed } from '@/lib/qa'

import { Preview } from './Preview'

/**
 * QA only — the supporter's workbench, standalone, without a save or a mission to reach it.
 *
 * Same discipline as `/qa/life-cutscene` (rule 19): `notFound()` in production, the real
 * component with the real recipes. `?recipe=<id>&level=child|teen|adult` opens one bench;
 * the page prints what came back — the measure, the output's size in bytes, and the same
 * output drawn again by `CraftOutputView`, which is what the world will show.
 */
export const dynamic = 'force-dynamic'

const LEVELS: readonly MechanicLevel[] = ['child', 'teen', 'adult']

export default async function Page({ searchParams }: { searchParams: Promise<{ recipe?: string; level?: string }> }) {
  if (!qaAllowed()) notFound()
  const { recipe: id, level: rawLevel } = await searchParams
  const recipe = recipeById(id) ?? recipeById(CRAFT_RECIPE_IDS[0])
  if (!recipe) notFound()
  const level: MechanicLevel = (LEVELS as readonly string[]).includes(rawLevel ?? '') ? (rawLevel as MechanicLevel) : 'adult'
  return <Preview recipe={recipe} level={level} recipes={CRAFT_RECIPE_IDS} />
}
