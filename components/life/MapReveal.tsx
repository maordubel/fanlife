'use client'

import { useEffect, useState } from 'react'

import { CityMap } from '@/components/life/CityMap'
import { Grain } from '@/components/life/FilmFx'
import { t } from '@/lib/i18n'
import type { MapPlaceDef } from '@/lib/life/map'
import type { MapPlace } from '@/lib/life/runtime/game'
import type { LifeState, LocationId } from '@/lib/life/types'
import { placeLabel } from '@/lib/life/world/labels'

/**
 * מקום נחשף — the map plays a moment.
 *
 * The city is shown whole for a breath, then the drawing pushes in on the place; the pin
 * drops (`land`) as the push settles; a red stamp slams in with the name; a line says
 * what it means; a red rule draws. The whole thing is four seconds and one tap. Used for
 * the places that are a feeling — the first sight of Bloomfield, the second home — and
 * never for a kiosk.
 *
 * The push-in is a real camera move as of 16.9.2026. It always read as a hard cut before,
 * and the reason was one line: the old `CityMap` swapped its `viewBox` under a
 * `transition: all`, and no browser has ever animated an SVG `viewBox` from CSS. The
 * camera the same pass gave the map for dragging is what makes this shot work — the map
 * is handed a `focus` and flies to it, so the four beats below are now four beats of one
 * movement instead of two stills. `interactive` stays off: this is a shot, not a sheet,
 * and a thumb on it must not be able to steer away from the place being revealed.
 */
export function MapReveal({
  place,
  state,
  places,
  here,
  onClose,
}: {
  place: MapPlaceDef
  state: LifeState
  places: readonly MapPlace[]
  here: LocationId
  onClose: () => void
}) {
  const [focus, setFocus] = useState<MapPlaceDef | null>(null)
  const [stamp, setStamp] = useState(false)
  useEffect(() => {
    const a = window.setTimeout(() => setFocus(place), 350)
    const b = window.setTimeout(() => setStamp(true), 1500)
    return () => {
      window.clearTimeout(a)
      window.clearTimeout(b)
    }
  }, [place])

  return (
    <div className="pointer-events-auto absolute inset-0 z-50 flex flex-col bg-ink" data-life="reveal" onClick={stamp ? onClose : undefined}>
      <div className="relative flex-1 overflow-hidden">
        <CityMap state={state} places={places} here={here} focus={focus} wide={!focus} dropping className="h-full w-full" />
        <Grain opacity={0.14} />
        {stamp && (
          <div className="pointer-events-none absolute inset-x-0 top-[12%] flex flex-col items-center px-gutter text-center">
            <p className="animate-stamp-in border-stamp border-red bg-sheet px-4 py-2 font-display text-[12px] uppercase tracking-[0.22em] text-red" style={{ transform: 'rotate(-3deg)' }}>
              {t('life.reveal.kicker')}
            </p>
            <p className="mt-3 animate-title-rise font-poster text-[56px] leading-none text-sheet sm:text-[72px]" style={{ textShadow: '0 2px 20px rgb(var(--ink))' }}>
              {/* the name this life gives it — the reveal card says what the map will say */}
              <bdi>{placeLabel(place, state).labelHe}</bdi>
            </p>
            <span className="mt-3 block h-[3px] w-16 animate-rule-draw bg-red" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="border-t-rule border-red bg-ink px-5 py-4 pb-[max(16px,env(safe-area-inset-bottom))]">
        <p className="min-h-[3.2em] font-body text-[15px] leading-relaxed text-sheet transition-opacity duration-500" style={{ opacity: stamp ? 1 : 0 }}>
          <bdi>{place.revealHe}</bdi>
        </p>
        <button
          type="button"
          onClick={onClose}
          data-life="reveal-close"
          className="mt-3 flex min-h-tap w-full items-center justify-center border-rule border-sheet bg-red px-4 font-display text-[15px] text-sheet transition-opacity duration-500"
          style={{ opacity: stamp ? 1 : 0 }}
        >
          {t('life.reveal.close')}
        </button>
      </div>
    </div>
  )
}
