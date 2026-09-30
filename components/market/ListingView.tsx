'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'

import { CollectorTag } from '@/components/collector/CollectorTag'
import { ItemFacts } from '@/components/collector/ItemFacts'
import type { CollectorShirt, PublicItem, ShirtSignal } from '@/lib/collector/types'
import { t } from '@/lib/i18n'

import { ConnectPanel } from './ConnectPanel'
import { PhotoGallery } from './PhotoGallery'
import { SafetyLinks, SafetySheet } from './SafetySheet'
import { ArchivePhoto, Kicker, ShirtDate } from './ShirtBits'

export type Viewer = 'loading' | 'guest' | 'member'

/**
 * עותק על השולחן — one physical copy of one archive shirt (spec §6–§9): its photographs, what it
 * is (a replica is ALWAYS labelled and carries its note; a claim of originality is always "המוכר
 * מציין: …"), who holds it — by number, with facts and no stars (§19, §21) — how many fans want
 * the shirt, the shops, and the request. On a wide screen the photographs hold still beside the
 * facts; on a phone they come first and swipe.
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
  const mine = item.mine === true

  return (
    <div className="mt-stack">
      <Link href="/kits/market" className="inline-flex min-h-tap items-center font-body text-step--1 font-extrabold text-red underline underline-offset-4">
        ← {t('market.item.back')}
      </Link>

      <div className="mt-3 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <div className="lg:sticky lg:top-4">
          <PhotoGallery photos={item.photos} shirt={shirt} />
        </div>

        <div className="mt-stack flex min-w-0 flex-col gap-stack lg:mt-0">
          {/* the archive card this copy hangs on */}
          <section className="border-plate border-ink bg-paper">
            <div className="bg-red px-4 py-3 text-paper">
              <Kicker tone="paper">{t('market.item.shirt')}</Kicker>
              <p className="mt-1 font-display text-step-3 leading-tight">
                {shirt ? (
                  <>
                    {shirt.variantHe} · <ShirtDate shirt={shirt} />
                  </>
                ) : (
                  t('market.shirt.unknown')
                )}
              </p>
            </div>
            {shirt ? (
              <div className="flex items-center gap-3 p-3">
                <span className="block w-[64px] shrink-0">
                  <ArchivePhoto shirt={shirt} />
                </span>
                <Link
                  href={`/kits/market?slug=${encodeURIComponent(shirt.slug)}`}
                  className="inline-flex min-h-tap items-center font-body text-step--1 font-extrabold text-sign underline underline-offset-4"
                >
                  {t('market.item.allCopies')}
                </Link>
              </div>
            ) : null}
          </section>

          {/* the copy */}
          <section aria-labelledby="market-item-facts" className="border-rule border-ink bg-sheet p-4">
            <h2 id="market-item-facts" className="font-display text-step-1 leading-tight text-ink">
              {t('market.item.facts')}
            </h2>
            <div className="mt-2">
              <ItemFacts item={item} />
            </div>
            {item.authenticityClaim && item.authenticityClaim !== 'replica' ? (
              <p className="mt-2 font-body text-[11.5px] leading-snug text-muted">{t('collector.claim.note')}</p>
            ) : null}
            {item.personalization ? (
              <p className="mt-2 font-body text-[12.5px] leading-snug text-ink">
                <span className="font-extrabold">{t('market.item.personalization')}: </span>
                <bdi>{item.personalization}</bdi>
              </p>
            ) : null}
            {item.description ? (
              <blockquote className="mt-3 border-s-4 border-red ps-3">
                <p className="font-body text-[11px] font-extrabold tracking-wide text-muted">{t('market.item.says')}</p>
                <p className="mt-0.5 whitespace-pre-line font-body text-step--1 leading-relaxed text-ink">
                  <bdi>{item.description}</bdi>
                </p>
              </blockquote>
            ) : null}
            {item.state === 'reserved' ? (
              <p className="mt-3 border-rule border-dashed border-ink/50 p-2 font-body text-[12.5px] leading-snug text-ink">{t('market.item.reserved')}</p>
            ) : null}
          </section>

          {/* who holds it, and how many want the shirt */}
          <section className="grid gap-3 sm:grid-cols-2">
            {item.seller ? (
              <div className="border-rule border-ink bg-sheet p-3">
                <Kicker>{t('market.item.seller')}</Kicker>
                <div className="mt-1">
                  <CollectorTag label={item.seller} />
                </div>
                <p className="mt-1 flex flex-wrap gap-x-3 font-body text-[11.5px] text-muted">
                  {item.seller.trades > 0 ? <span>{t('collector.stats.trades', { n: String(item.seller.trades) })}</span> : null}
                  {item.seller.sales > 0 ? <span>{t('collector.stats.sales', { n: String(item.seller.sales) })}</span> : null}
                  {item.seller.items > 0 ? <span>{t('collector.stats.items', { n: String(item.seller.items) })}</span> : null}
                </p>
              </div>
            ) : null}
            {signal ? <Demand signal={signal} /> : null}
          </section>

          {mine ? (
            <section className="border-plate border-ink bg-paper p-4" data-market-own="">
              <p className="font-display text-step-2 leading-tight text-ink">{t('market.own.title')}</p>
              <p className="mt-1.5 max-w-prose font-body text-step--1 leading-relaxed text-ink">{t('market.own.body')}</p>
              <Link
                href="/kits/closet"
                className="mt-3 inline-flex min-h-tap items-center border-rule border-ink bg-ink px-5 font-body text-step--1 font-extrabold text-paper"
              >
                {t('market.toCloset')}
              </Link>
            </section>
          ) : viewer === 'guest' ? (
            <section className="flex flex-col gap-2" data-market-guest="">
              <p className="font-body text-step--1 leading-relaxed text-ink">{t('market.connect.guest')}</p>
              {signIn}
            </section>
          ) : viewer === 'member' ? (
            <ConnectPanel item={item} connectionId={connectionId} busy={connect.busy} error={connect.error} onConnect={onConnect} />
          ) : null}

          <p className="font-body text-[11.5px] leading-snug text-muted">{t('market.safety')}</p>
          {!mine && viewer === 'member' && item.seller ? (
            <SafetyLinks onReport={() => setSheet('report')} onBlock={() => setSheet('block')} />
          ) : null}

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

/** "יש ל-41 אוהדים · 18 מחפשים · 3 פתוחות להחלפה · 1 למכירה" (spec §12) — counts, never names. */
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
    <div className="border-rule border-ink bg-sheet p-3" data-market-demand="">
      <Kicker>{t('market.item.demand')}</Kicker>
      <ul className="mt-1 font-body text-[12.5px] leading-relaxed text-ink">
        {rows.map((row) => (
          <li key={row.text} className={row.hot ? 'font-extrabold text-red' : ''}>
            {row.text}
          </li>
        ))}
      </ul>
    </div>
  )
}
