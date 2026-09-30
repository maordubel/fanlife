import { creditLine, photoLabel, type MediaLite } from '@/lib/away-days/media'
import { t } from '@/lib/i18n'

/**
 * A ground's photograph, always with its year and its credit (spec §29).
 *
 * The year sits ON the picture, on an ink plate, so it cannot be cropped away from it or
 * read as a caption for something else: "צילום מ-2019" says this is how the stands looked
 * in 2019, not on the night of the match. The credit line (author · licence) sits under
 * it and links to the source page when there is one — the attribution a CC licence asks
 * for, beside the use. Lazy, and sized by aspect ratio so the sheet does not jump.
 */
export function VenuePhoto({ media, alt, variant = 'wide' }: { media: MediaLite; alt: string; variant?: 'wide' | 'tall' }) {
  const tall = variant === 'tall' && media.tall
  const src = tall ? media.tall! : media.wide
  const credit = creditLine(media)
  return (
    <figure className="min-w-0">
      <div className={`relative overflow-hidden border-hair border-ink bg-ink ${tall ? 'aspect-[3/4]' : 'aspect-[16/9]'}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- the ledger ships the bytes it measured (away-media.json) */}
        <img src={src} alt={alt} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        <span className="absolute bottom-0 start-0 bg-ink px-1.5 py-0.5 font-body text-[10.5px] font-extrabold leading-tight text-paper">
          {photoLabel(media)}
        </span>
      </div>
      {credit && (
        <figcaption className="mt-1 truncate font-body text-[10px] leading-tight text-muted">
          {media.sourceUrl ? (
            <a href={media.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-ink/30 underline-offset-2">
              {t('away89.photo.credit', { credit })}
            </a>
          ) : (
            t('away89.photo.credit', { credit })
          )}
        </figcaption>
      )}
    </figure>
  )
}
