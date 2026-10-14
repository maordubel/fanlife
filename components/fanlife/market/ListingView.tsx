'use client'
// FAN LIFE — hand-written (the market redesign, 9.10.2026; THE WEEKLY, 13.10.2026 — rule 124). The Worker's
// ListingView is Hebrew and plate-heavy; this is the same screen drawn as the weekly's "An item on the table" spread. scripts/fanlife/fork-economy.py
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
import { ItemPhotos } from '@/components/fanlife/market/ItemPhotos'
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

  const price = item.forSale && item.askingPrice !== null ? terms[0] ?? null : null

  return (
    <div className="fl-mk-item wkc-item">
      <div className="wkc-l wkc-item-l">
        <Link href="/market" className="wk-k wkc-back">
          <span aria-hidden="true">‹</span> {t('market.item.back')}
        </Link>
        <div className="wkc-item-gallery">
          <ItemPhotos photos={item.photos} shirt={shirt} price={price} />
        </div>
        {signal ? <Demand signal={signal} /> : null}
        {shirt ? (
          <nav className="wkc-item-links" aria-label={t('market.item.shirt')}>
            <Link className="wk-seeall" href={`/shirts?shirt=${encodeURIComponent(shirt.slug)}`}>{t('market.item.shirt')} <span aria-hidden="true">→</span></Link>
            <Link className="wk-seeall" href={`/market?slug=${encodeURIComponent(shirt.slug)}`}>{t('market.item.allCopies')} <span aria-hidden="true">→</span></Link>
          </nav>
        ) : null}
      </div>

      <div className="wkc-r wkc-item-r">
        <header className="wkc-item-head">
          <p className="wk-banner">{t('market.item.title')}</p>
          <h1 className="wk-logo red wkc-item-club">{club}</h1>
          {shirt ? (
            <p className="wk-head wkc-item-sub">
              <ShirtDate shirt={shirt} /> / {shirt.variantHe}
            </p>
          ) : null}
        </header>

        <p className="wkc-item-tags">
          {item.forSale ? <span className="wk-tag red">{t('collector.forSale')}{price ? <> · {price}</> : null}</span> : null}
          {item.forSale && item.askingPrice !== null && item.openToOffers ? <span className="wk-tag">{t('collector.openToOffers')}</span> : null}
          {item.forTrade ? <span className="wk-k wkc-swap">⇄ {t('collector.forTrade')}</span> : null}
          {item.state === 'reserved' ? <span className="wk-tag ink">{t('market.copy.reserved')}</span> : null}
        </p>

        <dl className="wkc-item-facts">
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

        {mine ? (
          <section className="wk-coupon wkc-item-note" data-market-own="">
            <p className="wk-head">{t('market.own.title')}</p>
            <p>{t('market.own.body')}</p>
            <Link href="/closet" className="wk-btn min-h-tap">
              {t('market.toCloset')}
            </Link>
          </section>
        ) : viewer === 'guest' ? (
          <section className="wk-coupon wkc-item-note" data-market-guest="">
            <p>{t('market.connect.guest')}</p>
            {signIn}
          </section>
        ) : viewer === 'member' ? (
          connectionId ? (
            <section className="wkc-item-actions" data-market-connect="existing">
              <Link href={threadHref(connectionId)} className="wk-btn red lg">
                {h('hub.item.openThread')}
              </Link>
            </section>
          ) : (
            <>
              <div className="wkc-item-actions">
                <button type="button" className="wk-btn red lg min-h-tap" aria-expanded={composer} onClick={() => setComposer(true)}>
                  {item.forSale && item.forTrade ? h('hub.item.request') : item.forTrade ? h('hub.item.swapIt') : h('hub.item.buy')}
                </button>
                <button type="button" className="wk-btn paper lg min-h-tap" onClick={() => setComposer(true)}>
                  {h('hub.item.ask')}
                </button>
              </div>
              {composer ? <div className="wkc-item-compose"><ConnectPanel item={item} connectionId={connectionId} busy={connect.busy} error={connect.error} onConnect={onConnect} /></div> : null}
            </>
          )
        ) : null}

        {item.seller || item.description ? (
          <section className="wk-panel shadow wkc-seller" aria-label={t('market.item.seller')}>
            {item.seller ? (
              <>
                <p className="wk-k wk-muted">{t('market.item.seller')}</p>
                <div className="wkc-seller-id">
                  <span className="wk-roundel wkc-seller-badge" aria-hidden="true">#</span>
                  <span className="wkc-seller-t">
                    <CollectorTag label={item.seller} />
                    {place ? <small><bdi>{place.city ?? place.country}</bdi></small> : null}
                  </span>
                </div>
              </>
            ) : null}
            {item.description ? (
              <blockquote className="wkc-quote">
                <p className="wk-k wk-muted">{t('market.item.says')}</p>
                <p><bdi>“{item.description}”</bdi></p>
              </blockquote>
            ) : null}
            <span className="wk-stamp wkc-seller-stamp" aria-hidden="true">{h('hub.hero.kicker')}</span>
          </section>
        ) : null}

        <details className="wk-fold wkc-item-details">
          <summary>{h('hub.item.details')}</summary>
          <div className="wkc-item-details-body" id="market-item-facts">
            <ItemFacts item={item} showPrice={false} />
            {item.authenticityClaim && item.authenticityClaim !== 'replica' ? (
              <p className="wk-small wk-muted">{t('collector.claim.note')}</p>
            ) : null}
            {item.personalization ? (
              <p>
                <b>{t('market.item.personalization')}: </b>
                <bdi>{item.personalization}</bdi>
              </p>
            ) : null}
            {item.state === 'reserved' ? <p className="wk-small wk-muted">{t('market.item.reserved')}</p> : null}
          </div>
        </details>

        {shirt ? (
          <Link href={`/shirts?shirt=${encodeURIComponent(shirt.slug)}`} className="wk-k cyan wkc-history">
            {h('hub.item.history')} →
          </Link>
        ) : null}

        <p className="wk-small wk-muted wkc-item-fine">{t('market.safety')}</p>
        {!mine && viewer === 'member' && item.seller ? <div className="wkc-item-safety"><SafetyLinks onReport={() => setSheet('report')} onBlock={() => setSheet('block')} /></div> : null}

        {shops ? <div className="wkc-item-shops">{shops}</div> : null}
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
    <div className="wkc-demand" data-market-demand="">
      <p className="wk-k wk-muted">{t('market.item.demand')}</p>
      <ul>
        {rows.map((row) => (
          <li key={row.text} className={row.hot ? 'wkc-hot' : ''}>
            {row.text}
          </li>
        ))}
      </ul>
    </div>
  )
}
