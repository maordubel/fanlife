'use client'

import { useEffect, useState } from 'react'

import { t } from '@/lib/i18n'
import type { HudState } from '@/lib/life/runtime/bus'

/**
 * יש לך שתי סיבות לצאת עכשיו — the story director's dilemma card (delta 92, plan §2.2).
 *
 * Not a menu: it names two destinations at the same weight and asks nothing. There is no
 * button that goes to either one and no arrow on the glass — the two doors that lead to
 * them glow at the same strength in the world (`WorldScene.pulseLights`). It comes down
 * the moment it has been read (a tap, the close mark, or ten seconds), and comes back only
 * when the dilemma itself changes — one of its two reasons stops being possible.
 */
export function DirectorCard({ director }: { director: NonNullable<HudState['director']> }) {
  const key = `${director.id}|${director.destinations.map((d) => d.labelHe).join('|')}`
  const [closed, setClosed] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setClosed(key), 10_000)
    return () => window.clearTimeout(timer)
  }, [key])

  if (closed === key) return null

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-[calc(154px+env(safe-area-inset-top))] z-20 flex justify-center px-gutter"
      data-life="director"
      data-director-mode={director.mode}
    >
      <section
        aria-live="polite"
        aria-label={director.titleHe}
        className="life-director-card pointer-events-auto relative w-full max-w-[420px] border-rule border-sheet bg-ink px-4 pb-3 pt-3 text-sheet"
      >
        <button
          type="button"
          onClick={() => setClosed(key)}
          aria-label={t('life92.director.close')}
          data-life="director-close"
          className="absolute end-1 top-1 flex min-h-tap min-w-tap items-center justify-center font-display text-[18px] leading-none text-sheet/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sheet"
        >
          ×
        </button>
        <p className="font-mono tabular-nums text-[10.5px] uppercase tracking-[0.14em] text-red">
          <bdi>{t('life92.director.dilemmaKicker')}</bdi>
        </p>
        <h2 className="mt-1 pe-10 font-display text-[19px] leading-tight">
          <bdi>{director.titleHe}</bdi>
        </h2>
        {/* the two reasons, side by side on a desktop and stacked on a phone — same size, same ink */}
        <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {director.destinations.map((d) => (
            <li key={d.labelHe} className="border-hair border-sheet/40 px-2.5 py-2" data-life="director-destination">
              <p className="font-display text-[16px] leading-none">
                <bdi>{d.labelHe}</bdi>
              </p>
              <p className="mt-1 font-body text-[13px] leading-snug text-sheet/85">
                <bdi>{d.reasonHe}</bdi>
              </p>
            </li>
          ))}
        </ul>
        {director.footHe ? (
          <p className="mt-2 font-body text-[12.5px] leading-snug text-concrete">
            <bdi>{director.footHe}</bdi>
          </p>
        ) : null}
      </section>
    </div>
  )
}
