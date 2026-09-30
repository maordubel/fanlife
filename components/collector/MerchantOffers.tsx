'use client'

import { useEffect, useState } from 'react'

import { Num } from '@/components/ui/Num'
import { merchantOffers } from '@/lib/collector/api'
import { formatPrice } from '@/lib/collector/labels'
import { merchantHref, orderMerchantOffers } from '@/lib/collector/market'
import type { MerchantOffer } from '@/lib/collector/types'
import { t } from '@/lib/i18n'

/**
 * לקנות חדשה — מקורות רכישה חיצוניים לחולצה (מפרט §22–§27, Phase 4).
 *
 * The club's own store comes first, always, and says so in the spec's words: "חדש · רשמי",
 * "זמין בחנות הרשמית", "קנה מהמועדון ↗" (§23). A replica never appears without its label and
 * its note (§24). Every link is the product page and nothing else — `merchantHref()` removes the
 * query and the fragment, so there is no affiliate tag, referral or tracking parameter to add or
 * forget (§27) — and opens in a new tab with `rel="noopener noreferrer"`.
 *
 * Renders nothing at all when there is nothing to buy: an empty "shops" box is an advert for an
 * absence. The archive sheet imports this; so does the listing.
 */
export function MerchantOffers({ slug, kitId, season }: { slug: string; kitId: string | null; season: string | null }) {
  const [offers, setOffers] = useState<MerchantOffer[]>([])
  useEffect(() => {
    let live = true
    void merchantOffers({ slug, kitId, season }).then((rows) => {
      if (live) setOffers(Array.isArray(rows) ? rows : [])
    })
    return () => {
      live = false
    }
  }, [slug, kitId, season])
  return <MerchantOffersView offers={offers} />
}

/** The drawing, apart from the fetch — so the QA harness and the tests can hand it rows. */
export function MerchantOffersView({ offers }: { offers: readonly MerchantOffer[] }) {
  const rows = orderMerchantOffers(offers)
  if (rows.length === 0) return null
  return (
    <section aria-labelledby="merchant-offers-title" className="border-rule border-ink bg-sheet" data-merchant-offers="">
      <header className="border-b-hair border-ink/30 px-3 py-2.5">
        <h2 id="merchant-offers-title" className="font-display text-step-1 leading-tight text-ink">
          {t('market.shops.title')}
        </h2>
        <p className="mt-0.5 max-w-prose font-body text-[12px] leading-snug text-muted">{t('market.shops.body')}</p>
      </header>
      <ul>
        {rows.map((offer) => (
          <OfferRow key={offer.id} offer={offer} />
        ))}
      </ul>
    </section>
  )
}

function tagOf(offer: MerchantOffer): string {
  if (offer.offerType === 'replica') return t('market.shops.replica.tag')
  if (offer.offerType === 'official_reissue') return t('market.shops.reissue.tag')
  if (offer.offerType === 'official' || offer.isOfficialClubStore) return t('market.shops.official.tag')
  return t('market.shops.external.tag')
}

function OfferRow({ offer }: { offer: MerchantOffer }) {
  const href = merchantHref(offer.productUrl)
  if (!href) return null
  const official = offer.isOfficialClubStore
  const replica = offer.offerType === 'replica'
  const out = offer.availability === 'out_of_stock'
  return (
    <li className={`border-b-hair border-ink/20 px-3 py-3 last:border-b-0 ${official ? 'bg-paper' : ''}`} data-merchant-offer={offer.offerType}>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center px-2 py-0.5 font-body text-[11px] font-extrabold leading-snug ${
            official ? 'bg-red text-paper' : replica ? 'border-rule border-sign text-sign' : 'border-hair border-ink text-ink'
          }`}
        >
          {tagOf(offer)}
        </span>
        <span className="font-body text-[13px] font-bold text-ink">
          <bdi>{offer.merchantName}</bdi>
        </span>
        {offer.price !== null ? (
          <span className="font-poster text-[20px] leading-none text-ink">
            <Num>{formatPrice(offer.price, offer.currency)}</Num>
          </span>
        ) : null}
      </div>
      {official ? <p className="mt-1 font-body text-[12.5px] font-bold text-ink">{t('market.shops.official.line')}</p> : null}
      {offer.title ? (
        <p className="mt-1 font-body text-[12.5px] leading-snug text-ink">
          <bdi>{offer.title}</bdi>
        </p>
      ) : null}
      {replica ? (
        <p className="mt-1.5 border-s-4 border-sign ps-2 font-body text-[11.5px] leading-snug text-ink">{t('collector.replica.note')}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex min-h-tap items-center px-4 font-body text-step--1 font-extrabold ${
            official ? 'border-rule border-ink bg-red text-paper' : 'border-rule border-ink bg-paper text-ink'
          }`}
        >
          {official ? t('market.shops.official.cta') : t('market.shops.cta')}
          <span className="sr-only">{t('market.shops.newTab')}</span>
        </a>
        {out ? <span className="font-body text-[12px] font-bold text-muted">{t('market.shops.out')}</span> : null}
      </div>
    </li>
  )
}
