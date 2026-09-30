'use client'

import { CityMap } from '@/components/life/CityMap'
import type { MapPlace } from '@/lib/life/runtime/game'
import type { LifeState, LocationId } from '@/lib/life/types'
import { SheetHead } from '@/components/life/Plate'
import { useDialog } from '@/components/ui/useDialog'
import { t } from '@/lib/i18n'
import { OFFER_KIND_HE, offerPlaces } from '@/lib/life/offers'

/**
 * המפה — the city you can move, and the same doors written out underneath it.
 *
 * This comment used to open "Not a drawn map. A drawn neighbourhood invites the player to
 * read the world off a diagram…", which was true of the list this sheet started life as
 * and has been the opposite of the truth since `CityMap` landed (rule 59: a comment that
 * describes the opposite of its file is worse than no comment). What actually settled the
 * question is Maor asking for the drawing twice — 5.9.2026 "מפה שנראית כמו תל אביב", and
 * 16.9.2026 "אשמח למפה אינטרקטיבית, שאפשר להזיז אותה". The rationale that survived is in
 * `lib/life/map.ts:4–21`: a place is not on the map until this life has reached it, so the
 * drawing is a record of where the boy has been rather than a diagram to plan off.
 *
 * The sheet is two halves and both are the same doors:
 *
 *  · **the city** — `CityMap`, pannable, with the pins this life has revealed. A tap on an
 *    open pin walks there through the door graph and is charged the door graph's minutes.
 *  · **the list** — every place those doors reach, what the walk costs, and for a place
 *    behind a shut door the name of the door so the map says why. It is not a caption: it
 *    is the whole sheet for a keyboard and for a screen reader, which cannot tap a pin
 *    inside an `role="img"` drawing, and it is also the faster way for a thumb that just
 *    wants a row. Deleting it would take the map away from the people who need it most.
 */
export function LifeMap({
  places,
  state,
  here,
  onGo,
  onClose,
}: {
  places: MapPlace[]
  state: LifeState
  here: LocationId
  onGo: (id: string) => void
  onClose: () => void
}) {
  const dialogRef = useDialog<HTMLDivElement>(onClose)
  // a known offer is a small mark beside its place (§22.4.4) — only places this life has reached
  const marks = offerPlaces(state)
  return (
    <div
      className="absolute inset-0 z-40 flex items-end justify-center bg-ink/70 p-2.5 pb-[max(10px,env(safe-area-inset-bottom))] sm:items-center"
      data-life="map"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative z-[60] flex max-h-full w-full max-w-[420px] flex-col border-rule border-ink bg-sheet outline-none"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label={t('life.map.title')}
      >
        <SheetHead title={t('life.map.title')} onClose={onClose} closeLabel={t('life.map.close')} />
        <CityMap
          state={state}
          places={places}
          here={here}
          onGo={onGo}
          interactive
          className="aspect-square w-full shrink-0 border-b-rule border-ink"
        />
        <nav className="overflow-y-auto" aria-label={t('life.map.list')}>
          <p className="border-b-hair border-ink/30 px-3 py-1.5 font-body text-[10px] uppercase text-muted">{t('life.map.list')}</p>
          {places.length === 0 && (
            <p className="px-3 py-4 font-body text-[13px] text-muted">
              <bdi>{t('life.map.empty')}</bdi>
            </p>
          )}
          {places.map((place) => {
            const shut = Boolean(place.lockedHe)
            return (
              <button
                key={place.id}
                type="button"
                disabled={place.here || shut}
                onClick={() => onGo(place.id)}
                data-life="map-place"
                data-place={place.id}
                className={`flex min-h-tap w-full items-center justify-between gap-3 border-b-hair border-ink/30 px-3 text-start font-sign text-[15px] transition-colors duration-press motion-reduce:transition-none ${
                  place.here
                    ? 'bg-ink text-sheet'
                    : shut
                      ? 'text-muted'
                      : 'text-ink active:bg-red active:text-sheet'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <bdi>{place.titleHe}</bdi>
                  {marks.has(place.id as LocationId) && (
                    <span
                      className={`shrink-0 px-1 font-sign text-[10px] leading-tight ${
                        place.here ? 'border-hair border-sheet text-sheet' : 'border-hair border-red text-red'
                      }`}
                      data-life="map-offer"
                    >
                      {OFFER_KIND_HE[marks.get(place.id as LocationId) ?? 'work']}
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-body text-[11px]">
                  {place.here ? (
                    t('life.map.here')
                  ) : shut ? (
                    <bdi>
                      {t('life.map.locked')} {place.lockedHe}
                    </bdi>
                  ) : (
                    <span dir="rtl">
                      <span className="font-mono tabular-nums">{place.minutes}</span> {t('life.map.minutes')}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
