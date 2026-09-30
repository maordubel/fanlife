'use client'

import { useMemo } from 'react'

import { WardrobeRail } from '@/components/life/profile/WardrobeRail'
import { useDialog } from '@/components/ui/useDialog'
import { t } from '@/lib/i18n'
import { chapterFor } from '@/lib/life/content/chapters'
import { lastChosenBefore, PLAIN, ritualOptions } from '@/lib/life/matchRitual'
import { wardrobeReading } from '@/lib/life/profile'
import { CHAPTER_ORDER, wornIn } from '@/lib/life/shirts'
import type { LifeState } from '@/lib/life/types'

/**
 * לפני שיוצאים — the pre-match wardrobe (delta 92, upgrade plan §4).
 *
 * Not a second wardrobe: the same `WardrobeRail` the bag draws, restricted to the shirts he
 * owns that already existed on the day, with one action under the shirt in his hand. The
 * world is waiting underneath (`WorldScene.maybeOpenRitual`) and the only way out is a
 * choice — the dialog has no close button and Escape does nothing, because "the match
 * starts without a decision" is exactly what the plan forbids. Where the day allows it,
 * "no Hapoel shirt today" is a choice of its own, at the same weight.
 *
 * No buff, no number: under each shirt, the last day it was worn to and how many times —
 * identity and memory, which is all a shirt is here.
 */
export function RitualSheet({
  state,
  chapter,
  allowPlain,
  onWear,
}: {
  state: LifeState
  chapter: string
  allowPlain: boolean
  onWear: (choice: string) => void
}) {
  // Escape is not a way out of this one: the day waits for a shirt
  const dialogRef = useDialog<HTMLDivElement>(() => undefined)

  const options = useMemo(() => new Set(ritualOptions(state, chapter).map((shirt) => shirt.id)), [state, chapter])
  const wardrobe = useMemo(() => wardrobeReading(state).filter((row) => options.has(row.id)), [state, options])

  const lastChapter = useMemo(() => {
    // the shirt worn last time is the one "ללבוש שוב" is said for
    let best: { id: string; at: number } | null = null
    const now = CHAPTER_ORDER.indexOf(chapter)
    for (const row of wardrobe) {
      for (const worn of wornIn(state, row.id)) {
        const at = CHAPTER_ORDER.indexOf(worn)
        if (at >= 0 && at < now && (!best || at > best.at)) best = { id: row.id, at }
      }
    }
    return best?.id ?? null
  }, [wardrobe, state, chapter])

  const noteFor = (id: string): string | null => {
    const worn = wornIn(state, id).filter((c) => CHAPTER_ORDER.indexOf(c) < CHAPTER_ORDER.indexOf(chapter))
    const last = lastChosenBefore(state, id, CHAPTER_ORDER, chapter) ?? worn.sort((a, b) => CHAPTER_ORDER.indexOf(b) - CHAPTER_ORDER.indexOf(a))[0] ?? null
    const title = last ? chapterFor(last) : null
    // a shirt never worn says so once already, under its biography (`WardrobeRail`)
    if (!title) return null
    const parts: string[] = []
    parts.push(t('life92.ritual.lastWorn', { title: `${title.titleHe} · ${title.dateHe}` }))
    if (worn.length === 1) parts.push(t('life92.ritual.wornOnce'))
    else if (worn.length > 1) parts.push(t('life92.ritual.worn', { n: String(worn.length) }))
    return parts.join(' · ')
  }

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="life-ritual-title"
      data-life="ritual"
      className="absolute inset-0 z-[60] flex flex-col bg-ink text-sheet outline-none md:items-center md:justify-center md:bg-ink/90"
    >
      <div className="flex min-h-0 w-full flex-1 flex-col md:h-[calc(86dvh/var(--ui-scale,1))] md:max-w-[560px] md:flex-none md:overflow-hidden md:border-rule md:border-sheet/30 md:bg-ink">
        <header className="shrink-0 px-4 pb-2 pt-[max(18px,env(safe-area-inset-top))] md:px-6 md:pt-6">
          <p className="font-mono tabular-nums text-[11px] uppercase tracking-[0.14em] text-red">
            <bdi>{t('life92.ritual.kicker')}</bdi>
          </p>
          <h2 id="life-ritual-title" className="mt-1 font-display text-[28px] leading-none text-sheet md:text-[32px]">
            <bdi>{t('life92.ritual.title')}</bdi>
          </h2>
        </header>
        <WardrobeRail
          wardrobe={wardrobe}
          action={{
            labelFor: (id) => (id === lastChapter ? t('life92.ritual.wearAgain') : t('life92.ritual.wear')),
            onPick: (id) => onWear(id),
            noteFor,
          }}
        />
        {allowPlain && (
          <div className="shrink-0 border-t-hair border-sheet/20 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-2 md:px-6 md:pb-5">
            <button
              type="button"
              data-life="ritual-plain"
              onClick={() => onWear(PLAIN)}
              className="min-h-tap w-full border-rule border-sheet/60 px-4 font-body text-[14px] text-sheet transition-colors duration-press hover:bg-sheet/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sheet motion-reduce:transition-none"
            >
              <bdi>{t('life92.ritual.plain')}</bdi>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
