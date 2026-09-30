'use client'

import type { WorkerCardState } from '@/lib/profile/card'
import { t } from '@/lib/i18n'

import { storyItems, type CardNames } from './cardView'

/**
 * הסיפור שלי — not a generic timeline: what the person declared, then the days the app
 * actually recorded, in order, and nothing in between (`storyItems`). A beat with no
 * real date has none printed; a year the person gave is printed as theirs.
 */
export function StoryPanel({ state, names, onEdit }: { state: WorkerCardState; names: CardNames; onEdit: () => void }) {
  const items = storyItems(state, names)
  const declared = items.some((item) => item.id === 'fan' || item.id === 'began' || item.id === 'first' || item.id === 'home')

  return (
    <section aria-labelledby="story-title">
      <p dir="ltr" className="font-latin text-[9px] font-bold tracking-[0.24em] text-red">
        MY STORY
      </p>
      <h2 id="story-title" className="mt-1 font-display text-step-3 leading-none text-ink">
        {t('tik.story.title')}
      </h2>
      <p className="mt-2 max-w-prose font-body text-step--1 leading-relaxed text-muted">{t('tik.story.lede')}</p>

      <ol className="mt-3 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li
            key={item.id}
            data-story={item.id}
            className={`border-rule p-3 ${item.tone === 'red' ? 'border-red bg-red text-paper' : 'border-ink bg-sheet text-ink'}`}
          >
            <p className={`font-body text-[10.5px] font-extrabold tracking-wide ${item.tone === 'red' ? 'text-paper/80' : 'text-muted'}`}>
              {item.kicker}
            </p>
            <p className="mt-0.5 font-display text-step-2 leading-tight">
              <bdi>{item.title}</bdi>
            </p>
            {item.body && <p className="mt-1 font-body text-[12.5px] leading-snug">{item.body}</p>}
          </li>
        ))}
      </ol>

      {!declared && (
        <div className="mt-3 border-s-rule border-red ps-3">
          <p className="font-body text-[12.5px] leading-snug text-ink">{t('tik.story.empty')}</p>
          <button
            type="button"
            onClick={onEdit}
            className="mt-2 min-h-tap border-rule border-ink bg-paper px-3 font-body text-[12px] font-extrabold text-ink"
          >
            {t('tik.card.fill')}
          </button>
        </div>
      )}
    </section>
  )
}
