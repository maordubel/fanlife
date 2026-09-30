import type { AuctionShirt } from '@/lib/collector/auction'
import { shirtSeason } from '@/lib/collector/auction'
import { t } from '@/lib/i18n'
import { UserPhoto } from '@/components/collector/UserPhoto'
import { Num } from '@/components/ui/Num'

/**
 * התמונה של לוט: התצלום של המוכר אם יש, אחרת התצלום של הדגם בארכיון — ואם שער 4 עוד יכול
 * לחלק את החולצה הזאת, לוחית עם העונה במקום התצלום (מגן הספוילר של הארכיון, כלל 69).
 */
export function ShirtPicture({
  photo,
  shirt,
  className = '',
  aspect = 'aspect-square',
}: {
  photo: string | null
  shirt: AuctionShirt | undefined
  className?: string
  /** the frame's proportion — a poster on a phone is shorter than the square on a desk */
  aspect?: string
}) {
  if (photo) {
    return (
      <div className={`relative ${aspect} overflow-hidden bg-paper ${className}`}>
        <UserPhoto path={photo} />
      </div>
    )
  }
  if (shirt && !shirt.spoiler) {
    return (
      <div className={`relative ${aspect} bg-paper ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- the archive ships the bytes it measured (rule 69 §5) */}
        <img
          data-archive-photo=""
          src={shirt.src}
          alt={t('auction.archivePhoto.alt', { season: shirtSeason(shirt), variant: shirt.variantHe })}
          width={760}
          height={760}
          loading="lazy"
          decoding="async"
          className="block h-full w-full object-contain p-3"
        />
      </div>
    )
  }
  return (
    <div className={`relative flex ${aspect} flex-col items-center justify-center gap-2 overflow-hidden bg-sign px-4 text-center text-paper ${className}`}>
      <div aria-hidden="true" className="screen-dots pointer-events-none absolute inset-0" />
      <span className="relative font-poster text-[52px] leading-none">
        <Num>{shirt ? shirt.season : '—'}</Num>
      </span>
      {shirt ? <span className="relative font-body text-step--1 font-bold">{shirt.variantHe}</span> : null}
      {shirt?.spoiler ? <span className="relative max-w-[26ch] font-body text-[12px] leading-snug">{t('auction.spoiler')}</span> : null}
    </div>
  )
}
