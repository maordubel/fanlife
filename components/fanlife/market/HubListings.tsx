'use client'

import { useMemo } from 'react'

import { groupListings, shirtName } from '@/lib/fanlife/collector/market'
import type { CollectorShirt } from '@/lib/collector/types'
import { reasonsFor, routeWords } from '@/lib/fanlife/hub/reasons'
import type { HubItem, MyWant } from '@/lib/fanlife/hub/types'
import { h, type HubKey } from '@/lib/fanlife/hub/copy'
import { t } from '@/lib/fanlife/i18n'

import { CopyTicket } from '@/components/fanlife/market/CopyTicket'
import { ArchivePhoto, ShirtDate } from '@/components/fanlife/market/ShirtBits'

const COPIES_SHOWN = 3
const REASON: Record<string, HubKey> = {
  wishlist: 'hub.reason.wishlist',
  yourSize: 'hub.reason.yourSize',
  budget: 'hub.reason.budget',
  swap: 'hub.reason.swap',
  justListed: 'hub.reason.justListed',
}
const ROUTE: Record<string, HubKey> = {
  sameCity: 'hub.route.sameCity',
  sameCountry: 'hub.route.sameCountry',
  crossBorder: 'hub.route.crossBorder',
  ships: 'hub.route.ships',
  noShip: 'hub.route.noShip',
  meetOnly: 'hub.route.meetOnly',
}
const DELIVERY: Record<string, HubKey> = { ship: 'hub.delivery.shipOnly', local: 'hub.delivery.localOnly' }

/**
 * The page of copies, hung on their archive shirts. Each copy carries (a) how it can travel, when the seller
 * restricted it, and (b) up to three plain reasons it is in front of this collector — none for a guest,
 * none when nothing in their wishlist explains it. Reasons are words, never a score.
 */
export function HubListings({
  items,
  shirts,
  wants,
  onFocus,
  focused,
}: {
  items: HubItem[]
  shirts: Readonly<Record<string, CollectorShirt>>
  wants: readonly MyWant[]
  onFocus: (slug: string) => void
  focused: boolean
}) {
  const groups = useMemo(() => groupListings(items, shirts, { kind: 'all', decade: 'all' }), [items, shirts])
  return (
    <ul className="mt-3 grid gap-3 sm:grid-cols-2">
      {groups.map((group) => {
        const shirt = group.shirt
        const copies = group.items as HubItem[]
        const shown = focused ? copies : copies.slice(0, COPIES_SHOWN)
        const rest = copies.length - shown.length
        return (
          <li key={shirt.slug} className="min-w-0">
            <article className="flex h-full flex-col border-plate border-ink bg-sheet" data-market-shirt={shirt.slug}>
              <header className="flex items-stretch gap-3 border-b-rule border-ink p-2.5">
                <span className="block w-[92px] shrink-0 bg-paper">
                  <ArchivePhoto shirt={shirt} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col justify-center">
                  <span className="font-poster text-[26px] leading-none text-ink">
                    <ShirtDate shirt={shirt} />
                  </span>
                  <span className="mt-1 block truncate font-body text-[12px] font-extrabold text-red">{shirt.variantHe}</span>
                  <span className="mt-1 font-body text-[11px] text-muted">
                    {copies.length === 1 ? t('market.copies.one') : t('market.copies', { n: String(copies.length) })}
                  </span>
                  {!focused ? (
                    <button
                      type="button"
                      onClick={() => onFocus(shirt.slug)}
                      aria-label={`${t('market.item.allCopies')} · ${shirtName(shirt)}`}
                      className="mt-0.5 min-h-tap self-start font-body text-[12px] font-extrabold text-sign underline underline-offset-4"
                    >
                      {t('market.item.allCopies')}
                    </button>
                  ) : null}
                </span>
              </header>
              <ul className="flex-1">
                {shown.map((item) => {
                  const reasons = reasonsFor(item, wants)
                  const route = routeWords(item.route)
                  const travel = item.delivery && !route.length ? DELIVERY[item.delivery] : undefined
                  return (
                    <li key={item.id}>
                      <CopyTicket item={item} shirt={shirt} />
                      {reasons.length || travel || route.length ? (
                        <p className="flex flex-wrap gap-1 px-3 pb-2 pt-0.5" data-hub-reasons="">
                          {reasons.map((r) => (
                            <span key={r} className="border-hair border-red px-1.5 py-0.5 font-body text-[10.5px] font-extrabold text-red">
                              {h(REASON[r]!)}
                            </span>
                          ))}
                          {route.map((r) => (
                            <span key={r} className="border-hair border-sign px-1.5 py-0.5 font-body text-[10.5px] font-bold text-sign">{h(ROUTE[r]!)}</span>
                          ))}
                          {travel ? <span className="border-hair border-ink/40 px-1.5 py-0.5 font-body text-[10.5px] font-bold text-muted">{h(travel)}</span> : null}
                        </p>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
              {rest > 0 ? (
                <button
                  type="button"
                  onClick={() => onFocus(shirt.slug)}
                  className="min-h-tap border-t-hair border-dashed border-ink/45 font-body text-[12px] font-extrabold text-sign"
                >
                  {rest === 1 ? t('market.copies.moreOne') : t('market.copies.more', { n: String(rest) })}
                </button>
              ) : null}
            </article>
          </li>
        )
      })}
    </ul>
  )
}

export function BackToAll({ onClear, shirt }: { onClear: () => void; shirt: CollectorShirt }) {
  return (
    <div className="mt-3 flex items-center gap-3 border-plate border-red bg-paper p-2.5" data-market-focus={shirt.slug}>
      <span className="block w-[64px] shrink-0">
        <ArchivePhoto shirt={shirt} eager />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-step-0 leading-tight text-ink">{t('market.slug.title')}</span>
        <span className="block truncate font-body text-[12.5px] font-extrabold text-red">
          {shirt.variantHe} · <ShirtDate shirt={shirt} />
        </span>
      </span>
      <button type="button" onClick={onClear} className="min-h-tap shrink-0 border-rule border-ink bg-sheet px-3 font-body text-[12px] font-extrabold text-ink">
        ✕ {t('market.slug.clear')}
      </button>
    </div>
  )
}

