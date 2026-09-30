'use client'

import { ObjectMark } from '@/components/memory/ObjectMark'
import { Num } from '@/components/ui/Num'
import { numericFace } from '@/lib/game/memory-run'
import type { MemoryPair } from '@/lib/game/memory'
import { t } from '@/lib/i18n'

/**
 * מדף המזכרות — what the run leaves behind.
 *
 * Six slots, fixed from the moment the board is dealt, filling as pairs are closed. The
 * order is the deal's, never the shuffle's, so a slot does not move under the player's
 * eye when the board rearranges itself (see `buildRound`).
 *
 * **A locked slot shows the OBJECT and the category and nothing else** — the same rule
 * gate 5 arrived at for a shirt nobody has built yet (rule 24): "a shirt you have not
 * built shows its season, an outline, and the way in". Printing the memory under a
 * locked slot would be the answer sheet to the board sitting beside the board.
 *
 * The line at the foot is the only cross-gate claim this wing makes and it is a count of
 * rows, not a score: how many distinct memories this device has ever closed, held in the
 * profile's `collections` (`lib/profile/store.ts`) exactly like the archive cards are.
 * It is passed in rather than read here, because this component never touches storage.
 */
export function SouvenirShelf({
  pairs,
  done,
  kept,
}: {
  pairs: readonly MemoryPair[]
  done: readonly string[]
  /** how many memories this device holds across every run, or null before it is known */
  kept: number | null
}) {
  return (
    <section className="mt-stack border-rule border-sheet/45 bg-sheet/[.06] p-3">
      <div className="flex items-baseline justify-between gap-3 border-b-hair border-sheet/30 pb-1.5">
        <h2 className="font-display text-step-1 leading-none text-sheet">
          {t('memory.shelf.title')}
        </h2>
        <p className="shrink-0 font-mono text-[12px] tabular-nums text-red">
          <Num>{`${done.length}/${pairs.length}`}</Num>
        </p>
      </div>

      <ol className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {pairs.map((pair) => {
          const unlocked = done.includes(pair.id)
          return (
            <li
              key={pair.id}
              className={`flex items-center gap-2 border-hair p-1.5 ${
                unlocked ? 'animate-slam border-red bg-red/15' : 'border-sheet/30'
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center border-hair ${
                  unlocked ? 'border-red bg-red text-sheet' : 'border-sheet/40 text-sheet/45'
                }`}
              >
                <ObjectMark object={pair.object} className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-sign text-[12.5px] font-bold leading-tight text-sheet">
                  {unlocked ? face(pair.a) : pair.kind}
                </span>
                <span className="block truncate font-body text-[9.5px] leading-tight text-concrete">
                  {unlocked ? face(pair.b) : t('memory.shelf.locked')}
                </span>
              </span>
            </li>
          )
        })}
      </ol>

      {kept !== null && kept > 0 && (
        <p className="mt-2 border-t-hair border-sheet/25 pt-2 font-body text-[11px] leading-snug text-concrete">
          {t('memory.shelf.kept', { n: String(kept) })}
        </p>
      )}
    </section>
  )
}

/** A face, isolated LTR when it is a pure figure. See `numericFace`. */
function face(value: string) {
  return numericFace(value) ? <Num>{value}</Num> : value
}
