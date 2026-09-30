'use client'

import { useState } from 'react'

import { HallPlate } from './HallPlate'
import { Num } from '@/components/ui/Num'
import { SourceNote } from '@/components/ui/SourceNote'
import { t, type MessageKey } from '@/lib/i18n'

/**
 * השחזור — walking back into a hall that is not there.
 *
 * Maor's brief was to take everything the project has gathered about Ussishkin and make
 * the wing an attempt at reconstructing the room, not a page about it. The material for
 * that already existed and was locked inside the 2D game: ten paintings of the same
 * building, made from his own reference, from four vantage points and in three lights.
 *
 * So the reconstruction is built the way you actually remember a room — you stand
 * somewhere, and then you look at things:
 *
 *   · **ארבעה מבטים** — outside, from the top of the stand, from the floor, and at
 *     night with the lights off. Switching vantage point, not switching a photo
 *     gallery: the label under the plate says where you are standing, and the room is
 *     recognisably the same room from all four.
 *   · **מה שמסתכלים עליו** — six marks over the wide view of the room, each one a
 *     feature the record has something sourced to say about: the red stand, the window
 *     strip, the hoop, the parquet, the cream stand opposite, the roof. Tap one and you
 *     get the fact and its source, not a caption somebody wrote.
 *
 * The marks are numbered because the numbers are also the keyboard order: this is a
 * picture, and a picture that can only be explored by pointing is a picture half the
 * people who come here cannot explore at all. Every mark is a real `<button>` in DOM
 * order, which is the lesson `GoalPitch` taught the hard way.
 *
 * Nothing here states a fact of its own. Every card below is a row out of
 * `content/manual/ussishkin.json` with its own source line, handed down as a prop.
 */

export type Look = {
  slug: string
  /** where the mark sits on the wide view, as a fraction of the painting */
  x: number
  y: number
  labelHe: string
  factHe: string
  periodHe: string
  sourceTitle: string
  sourceUrl: string
}

type Stand = {
  plate: 'high' | 'low' | 'cream' | 'night'
  label: MessageKey
  where: MessageKey
}

/**
 * Four places to stand, all of them INSIDE.
 *
 * The outside is the hero at the top of the page, so a fifth "מבחוץ" tab here was the
 * page showing the same wall twice — and it was also the heaviest file in the set. What
 * a reconstruction owes a reader is the room from the angles you could actually have
 * stood at: high in the red stand, down on the floor, across in the cream stand, and
 * the empty room after everyone went home.
 */
const STANDS: Stand[] = [
  { plate: 'high', label: 'uss.stand.high', where: 'uss.where.high' },
  { plate: 'low', label: 'uss.stand.low', where: 'uss.where.low' },
  { plate: 'cream', label: 'uss.stand.cream', where: 'uss.where.cream' },
  { plate: 'night', label: 'uss.stand.night', where: 'uss.where.night' },
]

export function Reconstruction({ looks }: { looks: Look[] }) {
  const [stand, setStand] = useState<Stand['plate']>('high')
  const [open, setOpen] = useState<string | null>(null)

  const here = STANDS.find((row) => row.plate === stand) ?? (STANDS[0] as Stand)
  const card = looks.find((look) => look.slug === open) ?? null

  return (
    <section className="mt-stack" aria-labelledby="uss-rebuild">
      <div className="flex items-baseline justify-between gap-3 border-b-rule border-ink pb-1.5">
        <h2 id="uss-rebuild" className="font-display text-step-2 leading-tight text-ink">
          {t('uss.rebuild')}
        </h2>
        <p className="font-latin text-[9px] font-bold tracking-[0.24em] text-sign" dir="ltr">
          RECONSTRUCTION
        </p>
      </div>
      <p className="mt-2 max-w-prose font-body text-step--1 leading-relaxed text-muted">
        {t('uss.rebuildLede')}
      </p>

      {/* where you are standing */}
      <div role="group" aria-label={t('uss.standAria')} className="mt-3 grid grid-cols-4 gap-1">
        {STANDS.map((row) => {
          const live = row.plate === stand
          return (
            <button
              key={row.plate}
              type="button"
              onClick={() => setStand(row.plate)}
              aria-pressed={live}
              className={`min-h-tap border-rule px-1 py-2 font-body text-[11px] font-extrabold leading-none transition-transform duration-press ease-stamp active:scale-[.96] motion-reduce:transition-none ${
                live ? 'border-red bg-red text-paper' : 'border-ink bg-sheet text-ink'
              }`}
            >
              {t(row.label)}
            </button>
          )
        })}
      </div>

      <figure className="mt-2 border-rule border-ink bg-ink">
        <HallPlate plate={stand} alt={t(here.where)} />
        <figcaption className="border-t-hair border-concrete/30 px-3 py-2 font-body text-[11.5px] leading-snug text-concrete">
          {t(here.where)}
        </figcaption>
      </figure>

      {/* the wide view, and the six things there are to look at in it */}
      <h3 className="mt-stack border-b-rule border-ink pb-1 font-display text-step-1 leading-tight text-ink">
        {t('uss.lookAt')}
      </h3>
      <p className="mt-1.5 font-body text-[11.5px] leading-snug text-muted">{t('uss.lookHint')}</p>

      <div className="mt-2 overflow-x-auto border-rule border-ink bg-ink">
        {/* 2:1 and very wide: on a phone it scrolls rather than shrinking to a stripe */}
        <div className="relative w-[190%] min-w-[640px] sm:w-full">
          <HallPlate plate="hall" alt={t('uss.hallAlt')} />
          {looks.map((look, index) => {
            const live = look.slug === open
            return (
              <button
                key={look.slug}
                type="button"
                onClick={() => setOpen(live ? null : look.slug)}
                aria-pressed={live}
                // Placed by margin rather than by a transform: `translateX` is a
                // PHYSICAL axis and this document is RTL, so a `-50%` that centres the
                // mark on an LTR page pushes it a full width off on this one.
                // The plate is a known 30px, so half of it is a number.
                style={{
                  insetInlineStart: `${look.x * 100}%`,
                  top: `${look.y * 100}%`,
                  marginInlineStart: -15,
                  marginTop: -15,
                }}
                className="absolute"
              >
                {/* the mark itself: a plate, not a pin. Radius 0 like everything else. */}
                <span
                  className={`flex h-[30px] w-[30px] items-center justify-center border-rule font-poster text-[15px] leading-none transition-transform duration-press ease-stamp active:scale-90 motion-reduce:transition-none ${
                    live ? 'border-paper bg-red text-paper' : 'border-red bg-ink/85 text-paper'
                  }`}
                >
                  <Num>{index + 1}</Num>
                </span>
                <span className="sr-only">{look.labelHe}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* the end wall, which is where the hoop in the wide view actually lives */}
      <figure className="mt-2 border-rule border-ink bg-ink">
        <HallPlate plate="end" alt={t('uss.endAlt')} />
        <figcaption className="border-t-hair border-concrete/30 px-3 py-2 font-body text-[11.5px] leading-snug text-concrete">
          {t('uss.endCaption')}
        </figcaption>
      </figure>

      {/* what you are looking at, printed under the room */}
      <div aria-live="polite" className="mt-2 min-h-[136px] border-rule border-ink bg-sheet p-4">
        {card ? (
          <>
            <p className="font-body text-[10px] font-extrabold tracking-widest text-red">
              {card.labelHe}
              {card.periodHe !== '' && (
                <>
                  {' · '}
                  <Num className="font-mono font-normal text-muted">{card.periodHe}</Num>
                </>
              )}
            </p>
            <p className="mt-1.5 font-body text-step-0 leading-relaxed text-ink">{card.factHe}</p>
            {/* the source is on /credits (spec §0.3, 22.9.2026) */}
            <p className="mt-2">
              <SourceNote />
            </p>
          </>
        ) : (
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {looks.map((look, index) => (
              <li key={look.slug} className="font-body text-step--1 leading-relaxed text-muted">
                <span className="font-poster text-[13px] text-red">
                  <Num>{index + 1}</Num>
                </span>{' '}
                {look.labelHe}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
