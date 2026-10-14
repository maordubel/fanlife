'use client'

import Link from 'next/link'
import { useMemo } from 'react'

import { groupListings, shirtName } from '@/lib/fanlife/collector/market'
import type { CollectorShirt } from '@/lib/collector/types'
import { reasonsFor } from '@/lib/fanlife/hub/reasons'
import type { HubItem, MyWant } from '@/lib/fanlife/hub/types'
import { h, type HubKey } from '@/lib/fanlife/hub/copy'
import { t } from '@/lib/fanlife/i18n'
import { isWorldSlug } from '@/lib/fanlife/world'

import { UserPhoto } from '@/components/fanlife/collector/UserPhoto'
import { CopyTicket, itemHref } from '@/components/fanlife/market/CopyTicket'
import { conditionLabel, sizeLabel } from '@/lib/fanlife/collector/labels'
import { copyTerms } from '@/lib/fanlife/collector/market'
import { ArchivePhoto, ShirtDate } from '@/components/fanlife/market/ShirtBits'

const REASON: Record<string, HubKey> = {
  wishlist: 'hub.reason.wishlist',
  yourSize: 'hub.reason.yourSize',
  budget: 'hub.reason.budget',
  swap: 'hub.reason.swap',
  justListed: 'hub.reason.justListed',
}

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
  query = '',
}: {
  items: HubItem[]
  shirts: Readonly<Record<string, CollectorShirt>>
  wants: readonly MyWant[]
  onFocus: (slug: string) => void
  focused: boolean
  query?: string
}) {
  const groups = useMemo(() => groupListings(items, shirts, { kind: 'all', decade: 'all' }), [items, shirts])
  const needle = query.trim().toLowerCase()
  const shown = useMemo(
    () =>
      needle
        ? groups.filter((g) => {
            const s = g.shirt as CollectorShirt & { clubName?: string }
            const people = (g.items as HubItem[]).map((i) => `${i.playerName ?? ''} ${i.playerNumber ?? ''}`).join(' ')
            return `${shirtName(s)} ${s.variantHe} ${s.clubName ?? ''} ${s.seasonLabel ?? ''} ${s.yearRaw ?? ''} ${people}`.toLowerCase().includes(needle)
          })
        : groups,
    [groups, needle],
  )
  if (needle && shown.length === 0) return <p className="wk-cap white" role="status">{h('hub.search.empty', { q: query.trim() })}</p>
  return (
    <ul className="wkc-ads">
      {shown.map((group) => {
        const shirt = group.shirt
        const copies = group.items as HubItem[]
        const first = copies[0]!
        const visible = focused ? copies : []
        const terms = copyTerms(first)
        const why = reasonsFor(first, wants)[0]
        const travel = first.delivery === 'local' ? h('hub.card.meet') : first.delivery === 'ship' ? h('hub.card.ships') : null
        const priced = first.forSale && first.askingPrice !== null
        return (
          <li key={shirt.slug} className="min-w-0" data-market-shirt={shirt.slug}>
            <article className="wkc-ad" data-sale={first.forSale || undefined}>
              <Link href={itemHref(first.id)} aria-label={t('market.copy.aria', { shirt: shirtName(shirt) })} className="wkc-ad-link" data-market-copy="">
                <span className="wkc-ad-pic">
                  {first.photos[0] ? <UserPhoto path={first.photos[0]} /> : <><ArchivePhoto shirt={shirt} />{isWorldSlug(shirt.slug) ? null : <span className="wkc-ad-ref">{h('hub.card.archive')}</span>}</>}
                  {isWorldSlug(shirt.slug) ? <span className="wk-tag cyan wkc-ad-world">{h('hub.world.tag')}</span> : null}
                </span>
                <span className="wk-k wk-muted wkc-ad-club">{shirt.variantHe}</span>
                <b className="wk-num wkc-ad-season"><ShirtDate shirt={shirt} /></b>
                <span className="wkc-ad-meta">
                  {[first.size ? sizeLabel(first.size) : null, first.condition ? conditionLabel(first.condition) : null].filter(Boolean).join(' · ')}
                </span>
                <span className="wkc-ad-deal">
                  {first.forSale ? (priced ? <b className="wk-num wkc-ad-price">{terms[0]}</b> : <span className="wk-tag">{terms[0]}</span>) : null}
                  {first.forTrade ? <span className="wk-k wkc-swap">{first.forSale ? '+ ' : ''}⇄ {h('hub.card.swap')}</span> : null}
                </span>
                {travel ? <span className="wkc-ad-where">{travel}</span> : null}
                {why ? <span className="wk-tag wkc-ad-why">{h(REASON[why]!)}</span> : null}
              </Link>
              {copies.length > 1 && !focused ? (
                <button type="button" onClick={() => onFocus(shirt.slug)} className="wk-k wkc-ad-more min-h-tap">
                  {h('hub.card.copies', { n: String(copies.length) })} →
                </button>
              ) : null}
              {visible.length > 1 ? (
                <ul className="wkc-ad-copies">
                  {visible.map((item) => (
                    <li key={item.id}>
                      <CopyTicket item={item} shirt={shirt} />
                    </li>
                  ))}
                </ul>
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
    <div className="wk-panel wkc-focus" data-market-focus={shirt.slug}>
      <span className="wkc-focus-pic">
        <ArchivePhoto shirt={shirt} eager />
      </span>
      <span className="wkc-focus-t">
        <b className="wk-head">{t('market.slug.title')}</b>
        <span className="wk-k red">
          {shirt.variantHe} · <ShirtDate shirt={shirt} />
        </span>
      </span>
      <button type="button" onClick={onClear} className="wk-btn paper min-h-tap">
        ✕ {t('market.slug.clear')}
      </button>
    </div>
  )
}

