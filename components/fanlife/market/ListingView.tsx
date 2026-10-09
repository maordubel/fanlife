'use client'
// FAN LIFE — hand-written (the market redesign, 9.10.2026). The Worker's ListingView is Hebrew and
// plate-heavy; this is the same screen drawn as the magazine's "The Shirt" page. scripts/fanlife/fork-economy.py
// lists it as HAND and never rewrites it.

import Link from 'next/link'
import { useState, type ReactNode } from 'react'

import { CollectorTag } from '@/components/fanlife/collector/CollectorTag'
import { ItemFacts } from '@/components/fanlife/collector/ItemFacts'
import { claimLabel, conditionLabel, isReproduction, sizeLabel, typeLabel } from '@/lib/fanlife/collector/labels'
import { copyTerms, shirtName } from '@/lib/fanlife/collector/market'
import type { CollectorShirt, PublicItem, ShirtSignal } from '@/lib/collector/types'
import { h } from '@/lib/fanlife/hub/copy'
import { t } from '@/lib/fanlife/i18n'

import { ConnectPanel, threadHref } from '@/components/fanlife/market/ConnectPanel'
import { PhotoGallery } from '@/components/fanlife/market/PhotoGallery'
import { SafetyLinks, SafetySheet } from '@/components/fanlife/market/SafetySheet'
import { ShirtDate } from '@/components/fanlife/market/ShirtBits'

export type Viewer = 'loading' | 'guest' | 'member'

/**
 * One physical copy of one archive shirt: club in the big type, season / kit, the photographs, the asking
 * price, three facts (size, condition, what the seller declares), the seller by number, the seller's own
 * words, and the two things a fan does — make an offer, or ask. A replica is ALWAYS labelled and a claim of
 * originality is always "Seller states…"; nothing here is a verdict, and nobody's e-mail or phone is ever shown.
 */
export function ListingView({
  item,
  shirt,
  signal,
  viewer,
  connectionId,
  connect,
  onConnect,
  signIn,
  shops,
  onBlocked,
}: {
  item: PublicItem
  shirt: CollectorShirt | null
  signal: ShirtSignal | null
  viewer: Viewer
  connectionId: string | null
  connect: { busy: boolean; error: string | null }
  onConnect: (kind: 'buy' | 'trade', body: string) => void
  /** the sign-in nudge, for a guest */
  signIn?: ReactNode
  /** `<MerchantOffers>` — a slot, so the QA harness can hand it rows */
  shops?: ReactNode
  onBlocked?: () => void
}) {
  const [sheet, setSheet] = useState<'report' | 'block' | null>(null)
  const [composer, setComposer] = useState(false)
  const mine = item.mine === true
  const terms = copyTerms(item)
  const club = shirt ? (shirt as CollectorShirt & { clubName?: string }).clubName ?? shirtName(shirt) : t('market.shirt.unknown')
  const place = item.seller?.place

  return (
    <div className="fl-mk-item">
      <Link href="/market" className="fl-mk-back">
        <span aria-hidden="true">←</span> {t('market.item.back')}
      </Link>

      <header className="fl-mk-itemhead">
        <h1 className="fl-mk-itemtitle">{club}</h1>
        {shirt ? (
          <p className="fl-mk-itemsub">
            <ShirtDate shirt={shirt} /> / {shirt.variantHe}
          </p>
        ) : null}
      </header>

      <div className="fl-mk-itemgrid">
        <div className="fl-mk-gallery">
          <PhotoGallery photos={item.photos} shirt={shirt} />
        </div>

        <div className="fl-mk-itembody">
          <div className="fl-mk-pricerow">
            {terms.map((term, i) => (
              <b key={term} className={i === 0 && item.forSale && item.askingPrice !== null ? 'fl-mk-bigprice' : 'fl-mk-bigprice fl-mk-bigprice-soft'}>
                {term}
              </b>
            ))}
            {item.forSale && item.askingPrice !== null && item.openToOffers ? <span className="fl-mk-pill">{t('collector.openToOffers')}</span> : null}
            {item.state === 'reserved' ? <span className="fl-mk-pill">{t('market.copy.reserved')}</span> : null}
          </div>

          <dl className="fl-mk-facts">
            <div>
              <dt>{h('hub.item.size')}</dt>
              <dd>{item.size ? sizeLabel(item.size) : '—'}</dd>
            </div>
            <div>
              <dt>{h('hub.item.condition')}</dt>
              <dd>{item.condition ? conditionLabel(item.condition) : '—'}</dd>
            </div>
            <div>
              <dt>{item.authenticityClaim && !isReproduction(item.itemType) ? h('hub.item.declaration') : h('hub.item.type')}</dt>
              <dd>{item.authenticityClaim && !isReproduction(item.itemType) ? claimLabel(item.authenticityClaim) : typeLabel(item.itemType)}</dd>
            </div>
          </dl>

          {item.seller ? (
            <div className="fl-mk-seller">
              <span className="fl-mk-avatar" aria-hidden="true">●</span>
              <span className="fl-mk-seller-id">
                <CollectorTag label={item.seller} compact />
                <small>
                  {place ? <bdi>{place.city ?? place.country}</bdi> : null}
                </small>
              </span>
            </div>
          ) : null}

          {item.description ? (
            <blockquote className="fl-mk-quote">
              <p><bdi>“{item.description}”</bdi></p>
            </blockquote>
          ) : null}

          <details className="fl-mk-details">
            <summary>
              <span>{h('hub.item.details')}</span>
              {shirt ? (
                <Link href={`/shirts?shirt=${encodeURIComponent(shirt.slug)}`} onClick={(e) => e.stopPropagation()} className="fl-mk-history">
                  {h('hub.item.history')} →
                </Link>
              ) : null}
            </summary>
            <div className="fl-mk-details-body" id="market-item-facts">
              <ItemFacts item={item} showPrice={false} />
              {item.authenticityClaim && item.authenticityClaim !== 'replica' ? (
                <p className="fl-mk-fine">{t('collector.claim.note')}</p>
              ) : null}
              {item.personalization ? (
                <p>
                  <b>{t('market.item.personalization')}: </b>
                  <bdi>{item.personalization}</bdi>
                </p>
              ) : null}
              {item.state === 'reserved' ? <p className="fl-mk-fine">{t('market.item.reserved')}</p> : null}
              {signal ? <Demand signal={signal} /> : null}
            </div>
          </details>

          {mine ? (
            <section className="fl-mk-note" data-market-own="">
              <p className="fl-mk-note-title">{t('market.own.title')}</p>
              <p>{t('market.own.body')}</p>
              <Link href="/closet" className="fl-mk-btn fl-mk-btn-ink">
                {t('market.toCloset')}
              </Link>
            </section>
          ) : viewer === 'guest' ? (
            <section className="fl-mk-note" data-market-guest="">
              <p>{t('market.connect.guest')}</p>
              {signIn}
            </section>
          ) : viewer === 'member' ? (
            connectionId ? (
              <section className="fl-mk-actions" data-market-connect="existing">
                <Link href={threadHref(connectionId)} className="fl-mk-btn fl-mk-btn-red">
                  {h('hub.item.openThread')}
                </Link>
              </section>
            ) : (
              <>
                <div className="fl-mk-actions">
                  <button type="button" className="fl-mk-btn fl-mk-btn-red min-h-tap" aria-expanded={composer} onClick={() => setComposer((v) => !v)}>
                    {h('hub.item.makeOffer')}
                  </button>
                  <button type="button" className="fl-mk-btn fl-mk-btn-ink min-h-tap" onClick={() => setComposer(true)}>
                    {h('hub.item.ask')}
                  </button>
                </div>
                {composer ? <ConnectPanel item={item} connectionId={connectionId} busy={connect.busy} error={connect.error} onConnect={onConnect} /> : null}
              </>
            )
          ) : null}

          <p className="fl-mk-fine">{t('market.safety')}</p>
          {!mine && viewer === 'member' && item.seller ? <SafetyLinks onReport={() => setSheet('report')} onBlock={() => setSheet('block')} /> : null}

          {shops}
        </div>
      </div>

      {sheet && item.seller ? (
        <SafetySheet
          mode={sheet}
          who={item.seller}
          target={{ itemId: item.id }}
          onClose={() => setSheet(null)}
          onDone={(mode) => (mode === 'block' ? onBlocked?.() : undefined)}
        />
      ) : null}
    </div>
  )
}

/** "41 fans have it · 18 want it · 3 open to swap" — counts, never names. */
function Demand({ signal }: { signal: ShirtSignal }) {
  const rows = [
    { text: t('market.demand.have', { n: String(signal.have) }), n: signal.have, hot: false },
    { text: t('market.demand.want', { n: String(signal.want) }), n: signal.want, hot: true },
    { text: t('market.demand.trade', { n: String(signal.forTrade) }), n: signal.forTrade, hot: false },
    { text: t('market.demand.sale', { n: String(signal.forSale) }), n: signal.forSale, hot: false },
    { text: t('market.demand.live', { n: String(signal.live) }), n: signal.live, hot: false },
  ].filter((row) => row.n > 0)
  if (rows.length === 0) return null
  return (
    <ul className="fl-mk-demand" data-market-demand="">
      {rows.map((row) => (
        <li key={row.text} className={row.hot ? 'fl-mk-hot' : ''}>
          {row.text}
        </li>
      ))}
    </ul>
  )
}
