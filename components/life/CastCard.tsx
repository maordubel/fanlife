'use client'

import { useState } from 'react'

import { t } from '@/lib/i18n'
import type { LifeBusEvents } from '@/lib/life/runtime/bus'

/**
 * כרטיס היכרות — the first time somebody walks into this life.
 *
 * Maor asked for a short introduction film for every character: humorous, light, connected
 * to the story. This project has no film and does not need one — a card that reveals three
 * lines a tap at a time, over the figure at full height, has a beat and an edit, which is
 * what a title sequence actually is.
 *
 * The staging: the person arrives from the side and lands, the name stamps in over them,
 * and then the lines come one at a time so the third one can turn. It is dismissed only
 * from the last line, so nobody taps past somebody's introduction by accident — and it
 * plays exactly once per person, for the life of the save.
 */
export function CastCard({ cast, onClose }: { cast: NonNullable<LifeBusEvents['cast']>; onClose: () => void }) {
  const [shown, setShown] = useState(1)
  const last = shown >= cast.linesHe.length

  return (
    <button
      type="button"
      dir="rtl"
      onClick={() => (last ? onClose() : setShown((n) => n + 1))}
      aria-label={last ? t('life.cast.close') : t('life.cast.more')}
      className="min-h-tap absolute inset-0 z-[96] flex flex-col items-center justify-end bg-ink px-5 pb-6 pt-5 text-center"
      data-life="cast-card"
    >
      <p className="font-display text-[12px] uppercase tracking-[0.24em] text-red">{t('life.cast.kicker')}</p>

      <div className="relative my-3 min-h-0 w-[min(52vw,260px)] flex-1">
        {/* A plain <img>, not next/image: the optimiser re-encodes the cut-out (rules 61, 69)
            and on a phone it handed back a 63px-wide version of a 201px figure — measured by
            the screens probe (delta 91). The bytes on disk are the bytes that were scanned. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/life/art/${cast.art}.webp`}
          alt={cast.nameHe}
          className="absolute inset-0 h-full w-full object-contain object-bottom motion-safe:animate-[cast-land_620ms_cubic-bezier(.2,.8,.2,1)_both]"
        />
      </div>

      <h2 className="font-display text-[26px] leading-none text-sheet motion-safe:animate-[cast-stamp_420ms_cubic-bezier(.2,.9,.2,1)_both]">
        {cast.nameHe}
      </h2>
      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-red">{cast.roleHe}</p>

      <div className="mt-4 flex w-full max-w-[34ch] flex-col gap-2">
        {cast.linesHe.slice(0, shown).map((line, i) => (
          <p
            key={line}
            className={`font-body text-[14px] leading-relaxed motion-safe:animate-[cast-line_380ms_ease-out_both] ${
              i === shown - 1 ? 'text-sheet' : 'text-concrete'
            }`}
          >
            <bdi>{line}</bdi>
          </p>
        ))}
      </div>

      <p className="mt-4 border-hair border-red px-3 py-1 font-mono text-[11px] tabular-nums text-sheet">
        {cast.sinceHe}
      </p>

      <p className="mt-3 font-body text-[12px] text-concrete">{last ? t('life.cast.close') : t('life.cast.more')}</p>
    </button>
  )
}
