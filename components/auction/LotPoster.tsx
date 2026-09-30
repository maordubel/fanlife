import Link from 'next/link'

import { endsInLabel, livePhase, msToNext, shirtSeason, startsInLabel, type AuctionShirt } from '@/lib/collector/auction'
import { formatPrice } from '@/lib/collector/labels'
import type { LotBrief } from '@/lib/collector/types'
import { t } from '@/lib/i18n'
import { Num } from '@/components/ui/Num'

import { PhaseStamp } from './PhaseStamp'
import { ReserveLine } from './ReserveLine'
import { ShirtPicture } from './ShirtPicture'

/**
 * כרזה של לוט — לא כרטיס של אתר מכירות. העונה בגדול בראש, התמונה באמצע, המחיר בספרות של
 * לוח התוצאות, ופס תחתון בצבע של הרגע: אדום כשחי, נייבי כשמתחיל בקרוב, דיו כשנסגר.
 */
export function LotPoster({ lot, shirt, now }: { lot: LotBrief; shirt: AuctionShirt | undefined; now: number }) {
  const phase = livePhase(lot, now)
  const remaining = msToNext(lot, now)
  const band =
    phase === 'live' || phase === 'closing'
      ? 'bg-red text-paper'
      : phase === 'upcoming'
        ? 'bg-sign text-paper'
        : 'bg-ink text-paper'
  const bandText =
    phase === 'upcoming' && remaining !== null
      ? startsInLabel(remaining)
      : phase === 'live' && remaining !== null
        ? endsInLabel(remaining)
        : phase === 'closing'
          ? t('auction.band.closing')
          : phase === 'awaiting_completion' || phase === 'completed'
            ? t('auction.band.sold', { price: formatPrice(lot.currentPrice, lot.currency) })
            : t('auction.band.ended')
  const priceLabel = lot.bidCount === 0 && phase !== 'completed' && phase !== 'awaiting_completion' ? t('auction.price.start') : t('auction.price.now')
  return (
    <Link
      href={`/kits/auction/${lot.id}`}
      prefetch={false}
      data-lot-poster={phase}
      className="group flex h-full flex-col border-plate border-ink bg-sheet text-ink transition-transform duration-press ease-stamp active:scale-[.99] motion-reduce:transition-none"
    >
      <div className="flex items-start justify-between gap-2 bg-ink px-3 pb-2 pt-2.5 text-paper">
        <div className="min-w-0">
          <p className="font-body text-[11px] font-bold leading-none text-concrete">{t('auction.kicker')}</p>
          <p className="mt-1 font-poster text-[34px] leading-none">
            {shirt ? (shirt.approx ? shirtSeason(shirt) : <Num>{shirt.season}</Num>) : '—'}
          </p>
          {shirt ? <p className="mt-0.5 font-body text-[12px] font-bold text-concrete">{shirt.variantHe}</p> : null}
        </div>
        <PhaseStamp phase={phase} />
      </div>
      <div className="relative border-b-rule border-ink">
        <ShirtPicture photo={lot.photo} shirt={shirt} aspect="aspect-[4/3] sm:aspect-square" />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 px-3 pb-3 pt-2.5">
        <p className="line-clamp-2 font-display text-step-1 leading-tight group-hover:underline group-hover:decoration-red group-hover:decoration-2 group-hover:underline-offset-4">
          <bdi>{lot.title}</bdi>
        </p>
        <div className="mt-auto flex items-end justify-between gap-3 border-t-hair border-ink/40 pt-2">
          <div>
            <p className="font-body text-[11px] font-bold text-muted">{priceLabel}</p>
            <p className="font-poster text-[30px] leading-none text-red">
              <Num>{formatPrice(lot.currentPrice, lot.currency)}</Num>
            </p>
          </div>
          {phase === 'upcoming' ? null : (
            <p className="pb-0.5 font-body text-step--1 font-bold text-ink">
              {lot.bidCount === 1 ? t('auction.bids.one') : t('auction.bids.n', { n: String(lot.bidCount) })}
            </p>
          )}
        </div>
        <ReserveLine reserveSet={lot.reserveSet} reserveMet={lot.reserveMet} />
      </div>
      <p className={`px-3 py-2 font-sign text-[14px] font-bold leading-tight ${band}`} data-band="">
        {bandText}
      </p>
    </Link>
  )
}
