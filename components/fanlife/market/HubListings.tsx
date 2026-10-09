'use client'

import Link from 'next/link'
import { useMemo } from 'react'

import { groupListings, shirtName } from '@/lib/fanlife/collector/market'
import type { CollectorShirt } from '@/lib/collector/types'
import { reasonsFor } from '@/lib/fanlife/hub/reasons'
import type { HubItem, MyWant } from '@/lib/fanlife/hub/types'
import { h, type HubKey } from '@/lib/fanlife/hub/copy'
import { t } from '@/lib/fanlife/i18n'

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
  if (needle && shown.length === 0) return <p className="fl-mk-empty" role="status">{h('hub.search.empty', { q: query.trim() })}</p>
  return (
    <ul className="fl-mk-grid">
      {shown.map((group) => {
        const shirt = group.shirt
        const copies = group.items as HubItem[]
        const first = copies[0]!
        const visible = focused ? copies : []
        const terms = copyTerms(first)
        const why = reasonsFor(first, wants)[0]
        const travel = first.delivery === 'local' ? h('hub.card.meet') : h('hub.card.ships')
        return (
          <li key={shirt.slug} className="min-w-0" data-market-shirt={shirt.slug}>
            <article className="fl-mk-card">
              <Link href={itemHref(first.id)} aria-label={t('market.copy.aria', { shirt: shirtName(shirt) })} className="fl-mk-card-link" data-market-copy="">
                <span className="fl-mk-card-pic">
                  {first.photos[0] ? <UserPhoto path={first.photos[0]} /> : <ArchivePhoto shirt={shirt} />}
                  {first.forTrade ? <span className="fl-mk-swap-tag">{h('hub.card.swap')}</span> : null}
                </span>
                <span className="fl-mk-card-name">{(shirt as CollectorShirt & { clubName?: string }).clubName ?? shirtName(shirt)}</span>
                <span className="fl-mk-card-meta">
                  <ShirtDate shirt={shirt} /> / {shirt.variantHe}
                </span>
                <span className="fl-mk-card-deal">
                  <b className={first.forSale && first.askingPrice !== null ? 'fl-mk-price' : 'fl-mk-price fl-mk-price-swap'}>{terms[0]}</b>
                  <small>
                    {[first.size ? sizeLabel(first.size) : null, first.condition ? conditionLabel(first.condition) : null].filter(Boolean).join(' · ')}
                  </small>
                </span>
                <span className="fl-mk-card-where">● {travel}</span>
                {why ? <span className="fl-mk-why">{h(REASON[why]!)}</span> : null}
              </Link>
              {copies.length > 1 && !focused ? (
                <button type="button" onClick={() => onFocus(shirt.slug)} className="fl-mk-more">
                  {h('hub.card.copies', { n: String(copies.length) })} →
                </button>
              ) : null}
              {visible.length > 1 ? (
                <ul className="fl-mk-copies">
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
    <div className="fl-mk-focus" data-market-focus={shirt.slug}>
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

