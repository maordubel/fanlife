'use client'

import { useState, type ReactNode } from 'react'

import { DebateStand } from '@/components/ballot/DebateStand'
import type { RosterIndex } from '@/lib/game/allTimeXI'
import type { DebateView } from '@/lib/polls/debates'
import { t } from '@/lib/i18n'

/**
 * שער 7, בשני חלקים (ONE RED WORLD §16, P0.3): one route, two things.
 *
 *  · **הכרטיס שלי** — the identity ballot, `BallotSheet`, exactly as it was. It is a
 *    profile: eight stable questions, one slip, one seal. Its storage and its board are
 *    untouched.
 *  · **הוויכוח של היציע** — `DebateStand`, a rotating handful of opinion questions dealt by
 *    `?seed=` and `?r=`.
 *
 * The card opens by default; `?tab=debate` (the "עוד ויכוחים" link) opens the debate.
 */
export function TerraceWing({
  ballot,
  debates,
  roster,
  slot,
  slices,
  initialTab,
}: {
  /** the identity ballot, rendered by the server page so its props stay where they were */
  ballot: ReactNode
  debates: DebateView[]
  roster: RosterIndex
  slot: number
  slices: number
  initialTab: 'card' | 'debate'
}) {
  const [tab, setTab] = useState<'card' | 'debate'>(initialTab)
  const tabs: { id: 'card' | 'debate'; label: string }[] = [
    { id: 'card', label: t('terrace.tab.card') },
    { id: 'debate', label: t('terrace.tab.debate') },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col md:block md:flex-none">
      <div role="tablist" aria-label={t('terrace.tabs')} className="mb-2 grid shrink-0 grid-cols-2 border-rule border-ink bg-paper">
        {tabs.map((item) => {
          const on = item.id === tab
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`terrace-tab-${item.id}`}
              aria-selected={on}
              aria-controls={`terrace-panel-${item.id}`}
              onClick={() => setTab(item.id)}
              className={`min-h-tap px-3 font-display text-step-0 transition-colors motion-reduce:transition-none ${
                on ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-sheet'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </div>
      <div
        role="tabpanel"
        id={`terrace-panel-${tab}`}
        aria-labelledby={`terrace-tab-${tab}`}
        className="flex min-h-0 flex-1 flex-col md:block md:flex-none"
      >
        {tab === 'card' ? ballot : <DebateStand debates={debates} roster={roster} slot={slot} slices={slices} />}
      </div>
    </div>
  )
}
