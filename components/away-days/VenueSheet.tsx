'use client'

import { SlideSheet } from '@/components/stage/SlideSheet'
import { visitsAt, type JourneyData } from '@/lib/away-days/journey'
import { venuePhoto } from '@/lib/away-days/media'
import { t } from '@/lib/i18n'
import { VenuePhoto } from './VenuePhoto'
import { VisitCard } from './VisitCard'

/**
 * One ground, every visit (spec §27): one marker, however many nights — and however many
 * names the ground has answered to. Oldest first. The ground's photograph, when the media
 * ledger has one (§29), heads the sheet with its year and credit; otherwise the typography
 * stands alone, as it always did. Every visit carries its "הייתי שם" toggle (§30).
 */
export function VenueSheet({
  data,
  venueId,
  onClose,
  onJourney,
  been,
}: {
  data: JourneyData
  venueId: string | null
  onClose: () => void
  /** jump the journey to this visit */
  onJourney?: (visitId: string) => void
  /** "הייתי שם" per visit */
  been?: { isOn: (visitId: string) => boolean; toggle: (visitId: string) => boolean }
}) {
  const venue = venueId ? data.venues[venueId] : null
  const visits = venueId ? visitsAt(data, venueId) : []
  const photo = venueId ? venuePhoto(venueId) : null
  return (
    <SlideSheet open={Boolean(venue)} onClose={onClose} title={venue?.nameHe ?? ''} latin={venue?.nameLatin ?? undefined} size="auto">
      {venue && (
        <div>
          <p className="font-sign text-[13px] text-sign">
            {venue.cityHe} · {venue.countryHe}
          </p>
          <p className="mt-0.5 font-body text-[12px] font-extrabold text-ink">
            {visits.length === 0
              ? t('away89.sheet.origin')
              : visits.length === 1
                ? t('away.card.visitOne')
                : t('away.card.visits', { n: String(visits.length) })}
          </p>
          {visits.length > 1 && (
            <p className="mt-1 flex gap-1.5 overflow-x-auto font-mono text-[11px] tabular-nums text-muted" dir="ltr">
              {visits.map((v) => (
                <span key={v.id} className="border-hair border-ink/30 px-1.5 py-0.5">
                  {v.year}
                </span>
              ))}
            </p>
          )}
          {photo && (
            <div className="mt-3">
              <VenuePhoto media={photo} alt={t('away89.photo.alt', { venue: venue.nameHe, city: venue.cityHe })} />
            </div>
          )}
          <ul className="mt-3 divide-y divide-ink/15 border-y border-ink/15">
            {visits.map((v) => (
              <li key={v.id} className="py-2.5">
                <VisitCard visit={v} data={data} compact been={been ? { on: been.isOn(v.id), onToggle: () => been.toggle(v.id) } : undefined} />
                {onJourney && (
                  <button
                    type="button"
                    onClick={() => onJourney(v.id)}
                    className="mt-1.5 min-h-tap border-hair border-ink/40 px-3 font-body text-[11.5px] font-extrabold text-ink transition-transform duration-press ease-stamp active:scale-[.97] motion-reduce:transition-none"
                  >
                    {t('away.sheet.toJourney')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </SlideSheet>
  )
}
