'use client'

import { useState } from 'react'

import { CraftOutputView } from '@/components/mechanics/craft/CraftOutputView'
import { CreativeWorkbench, type CraftDone } from '@/components/mechanics/craft/CreativeWorkbench'
import { recipeForLevel } from '@/lib/game/craft/recipes'
import { toOutputData } from '@/lib/game/craft/serialize'
import type { CraftRecipe } from '@/lib/game/craft/types'
import type { MechanicLevel } from '@/lib/mechanics/types'

/**
 * The client half: the real bench at the requested level, and afterwards what it handed
 * back — drawn again read-only, with the number the life would settle on and the bytes the
 * save would keep. The recipe/level links are plain query strings so a screenshot script
 * can walk them.
 */
export function Preview({ recipe, level, recipes }: { recipe: CraftRecipe; level: MechanicLevel; recipes: readonly string[] }) {
  const [done, setDone] = useState<CraftDone | null>(null)
  const [run, setRun] = useState(0)
  const levelled = recipeForLevel(recipe, level)
  const json = done ? JSON.stringify(toOutputData(done.output)) : ''

  return (
    <div dir="rtl" className="min-h-dvh bg-paper text-ink">
      <div className="flex flex-wrap items-center gap-2 border-b-rule border-ink px-gutter py-2 font-body text-[12px]">
        {recipes.map((id) => (
          <a key={id} href={`?recipe=${id}&level=${level}`} className={`px-2 py-1 ${id === recipe.id ? 'bg-ink text-sheet' : 'border-hair border-ink'}`} data-qa-recipe={id}>
            {id}
          </a>
        ))}
        <span className="ms-auto flex gap-1">
          {(['child', 'teen', 'adult'] as const).map((l) => (
            <a key={l} href={`?recipe=${recipe.id}&level=${l}`} className={`px-2 py-1 ${l === level ? 'bg-red text-sheet' : 'border-hair border-ink'}`} data-qa-level={l}>
              {l}
            </a>
          ))}
        </span>
      </div>
      <div className="mx-auto w-full max-w-[960px] px-gutter py-3">
        {done === null ? (
          <CreativeWorkbench key={run} recipe={levelled} level={level} onDone={setDone} />
        ) : (
          <div className="flex flex-col gap-3" data-qa-result>
            <p className="font-mono text-[13px] tabular-nums" data-qa-measure={done.measure}>
              measure {done.measure.toFixed(3)} · done {String(done.done)} · marks {done.output.marks.length} · bytes {new TextEncoder().encode(json).length}
            </p>
            <div className="mx-auto w-full max-w-[480px]">
              <CraftOutputView output={done.output} label={recipe.id} />
            </div>
            <pre className="max-h-[30dvh] overflow-auto border-hair border-ink/40 bg-sheet p-2 font-mono text-[10px]" dir="ltr">
              {json}
            </pre>
            <button
              type="button"
              onClick={() => {
                setDone(null)
                setRun((n) => n + 1)
              }}
              className="flex min-h-tap items-center justify-center border-rule border-ink px-4 font-sign text-[14px]"
            >
              שוב
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
