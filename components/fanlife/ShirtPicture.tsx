import { KitPlate } from '@/components/clubs/games/KitPlate'
import { UserPhoto } from '@/components/fanlife/collector/UserPhoto'
import { Num } from '@/components/ui/Num'
import { shirtSeason, type AuctionShirt } from '@/lib/fanlife/collector/auction'
import { t } from '@/lib/fanlife/i18n'

type Drawn = { kit?: { id: string; design: string | null; colours: string[]; season: string } | null }

/** A lot's picture: the seller's photo, else the archive photograph, else the drawn kit (FAN LIFE). */
export function ShirtPicture({ photo, shirt, className = '', aspect = 'aspect-square' }: { photo: string | null; shirt: (AuctionShirt & Drawn) | undefined; className?: string; aspect?: string }) {
  if (photo) return <div className={`relative ${aspect} overflow-hidden bg-paper ${className}`}><UserPhoto path={photo} /></div>
  if (shirt?.src) {
    return (
      <div className={`relative ${aspect} bg-paper ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- the measured archive bytes ship unchanged */}
        <img data-archive-photo="" src={shirt.src} alt={t('auction.archivePhoto.alt', { season: shirtSeason(shirt), variant: shirt.variantHe })} width={760} height={760} loading="lazy" decoding="async" className="block h-full w-full object-contain p-3" />
      </div>
    )
  }
  if (shirt?.kit) return <div className={`relative ${aspect} bg-paper p-3 ${className}`}><KitPlate kit={shirt.kit} label={false} /></div>
  return (
    <div className={`relative flex ${aspect} flex-col items-center justify-center gap-2 bg-sign px-4 text-center text-paper ${className}`}>
      <span className="font-poster text-[52px] leading-none"><Num>{shirt ? shirt.season : '—'}</Num></span>
      {shirt ? <span className="font-body text-step--1 font-bold">{shirt.variantHe}</span> : null}
    </div>
  )
}
