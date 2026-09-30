'use client'

import { useRef, useState } from 'react'

import { firePickFxAt } from '@/components/stage/PickFx'
import { t } from '@/lib/i18n'

/**
 * [ הייתי שם ] — one visit, one press (spec §30). Pressed = a red stamp with a tick; the
 * press fires the ground's one pick effect, an un-press is quiet (navy, a small haptic).
 */
export function BeenToggle({ on, onToggle, city }: { on: boolean; onToggle: () => boolean; city?: string }) {
  const ref = useRef<HTMLButtonElement>(null)
  const [hits, setHits] = useState(0)
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={on}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onClick={() => {
        const now = onToggle()
        setHits((n) => n + 1)
        if (ref.current) {
          firePickFxAt(ref.current, now ? { label: city ? t('away89.been.stamp', { city }) : t('away89.been.on'), tone: 'red', haptic: 'tap' } : { tone: 'sign', haptic: 'tap' })
        }
      }}
      className={`flex min-h-tap shrink-0 items-center gap-1 border-hair px-2 font-body text-[11.5px] font-extrabold leading-none transition-transform duration-press ease-stamp active:scale-[.94] motion-reduce:transition-none ${
        on ? 'border-red bg-red text-paper' : 'border-ink/50 bg-paper text-ink'
      }`}
    >
      <span key={hits} aria-hidden="true" className={`grid h-4 w-4 place-items-center border-hair font-mono text-[11px] tabular-nums ${on ? 'animate-fx-pop border-paper' : 'border-ink/50'}`}>
        {on ? '✓' : ''}
      </span>
      {t('away89.been.label')}
    </button>
  )
}
