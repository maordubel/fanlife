import Link from 'next/link'
import type { ReactNode } from 'react'

import { handleLabel } from '@/lib/collector/labels'
import { shirtName } from '@/lib/collector/market'
import type { CollectorShirt, Matches } from '@/lib/collector/types'
import { t } from '@/lib/i18n'

import { itemHref } from './CopyTicket'
import { ArchivePhoto, Kicker, ShieldTile, ShirtDate } from './ShirtBits'

export type MatchesState =
  | { state: 'loading' }
  | { state: 'off' }
  | { state: 'guest' }
  | { state: 'error'; message: string }
  | { state: 'ready'; data: Matches }

/**
 * ההתאמות שלך — מנוע ההתאמות במילים של המפרט (§13): "מצאנו החלפה כמעט מושלמת.", "החולצה שחיפשת
 * הופיעה.", "מישהו רוצה חולצה שיש לך", ומכירה פומבית של חולצה מהרשימה. A box on the terrace
 * noticeboard, not a recommendations widget: each kind is a headline and the shirts under it.
 */
export function MatchesPanel({
  matches,
  shirts,
  shielded,
  onUncover,
  signIn,
}: {
  matches: MatchesState
  shirts: Readonly<Record<string, CollectorShirt>>
  shielded: (shirt: CollectorShirt) => boolean
  onUncover: (slug: string) => void
  /** the sign-in nudge for a guest, supplied by the screen (it knows where to come back to) */
  signIn?: ReactNode
}) {
  if (matches.state === 'off' || matches.state === 'loading') return null
  return (
    <section aria-labelledby="market-matches" className="border-plate border-ink bg-paper" data-market-matches="">
      <header className="bg-ink px-3 py-2.5">
        <Kicker tone="paper">{t('market.matches.kicker')}</Kicker>
        <h2 id="market-matches" className="mt-0.5 font-display text-step-2 leading-none text-paper">
          {t('market.matches.title')}
        </h2>
      </header>
      {matches.state === 'guest' ? (
        <div className="p-3">
          <p className="font-display text-step-0 leading-tight text-ink">{t('market.matches.guest.title')}</p>
          <p className="mt-1.5 font-body text-[12.5px] leading-relaxed text-ink">{t('market.matches.guest.body')}</p>
          {signIn ? <div className="mt-3">{signIn}</div> : null}
        </div>
      ) : matches.state === 'error' ? (
        <p role="alert" className="p-3 font-body text-step--1 text-red">
          {matches.message}
        </p>
      ) : (
        <MatchLists data={matches.data} shirts={shirts} shielded={shielded} onUncover={onUncover} />
      )}
    </section>
  )
}

function MatchLists({
  data,
  shirts,
  shielded,
  onUncover,
}: {
  data: Matches
  shirts: Readonly<Record<string, CollectorShirt>>
  shielded: (shirt: CollectorShirt) => boolean
  onUncover: (slug: string) => void
}) {
  const swaps = data.perfectSwaps.filter((row) => shirts[row.theirs.archiveSlug] && shirts[row.mine.archiveSlug])
  const wanted = data.wanted.filter((row) => shirts[row.archiveSlug])
  const others = data.wantedByOthers.filter((row) => shirts[row.item.archiveSlug])
  const auctions = data.auctions.filter((row) => shirts[row.archiveSlug])
  if (swaps.length + wanted.length + others.length + auctions.length === 0) {
    return (
      <div className="p-3">
        <p className="font-display text-step-0 leading-tight text-ink">{t('market.matches.none')}</p>
        <p className="mt-1.5 font-body text-[12.5px] leading-relaxed text-ink">{t('market.matches.none.body')}</p>
        <Link href="/kits/archive" className="mt-2 inline-flex min-h-tap items-center font-body text-step--1 font-extrabold text-sign underline underline-offset-4">
          {t('market.toArchive')}
        </Link>
      </div>
    )
  }
  const thumb = (shirt: CollectorShirt) =>
    shielded(shirt) ? <ShieldTile shirt={shirt} onUncover={() => onUncover(shirt.slug)} /> : <ArchivePhoto shirt={shirt} />
  return (
    <div className="divide-y-hair divide-ink/25">
      {swaps.length > 0 ? (
        <Block title={t('market.matches.swap')} body={t('market.matches.swap.body')}>
          <ul className="flex flex-col gap-3">
            {swaps.map(({ theirs, mine }) => {
              const a = shirts[mine.archiveSlug]!
              const b = shirts[theirs.archiveSlug]!
              return (
                <li key={`${mine.id}:${theirs.id}`} className="border-rule border-ink bg-sheet p-2">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <figure className="min-w-0">
                      {thumb(a)}
                      <figcaption className="mt-1 font-body text-[11px] leading-tight text-ink">
                        <span className="block font-extrabold">{t('market.matches.swap.yours')}</span>
                        <span className="block truncate text-muted">
                          <ShirtDate shirt={a} /> · {a.variantHe}
                        </span>
                      </figcaption>
                    </figure>
                    <span aria-hidden="true" className="font-poster text-[34px] leading-none text-red">
                      ⇄
                    </span>
                    <figure className="min-w-0">
                      {thumb(b)}
                      <figcaption className="mt-1 font-body text-[11px] leading-tight text-ink">
                        <bdi className="block truncate font-extrabold">
                          {theirs.seller ? t('market.matches.swap.theirs', { who: handleLabel(theirs.seller) }) : shirtName(b)}
                        </bdi>
                        <span className="block truncate text-muted">
                          <ShirtDate shirt={b} /> · {b.variantHe}
                        </span>
                      </figcaption>
                    </figure>
                  </div>
                  <Link
                    href={itemHref(theirs.id)}
                    className="mt-2 flex min-h-tap items-center justify-center border-rule border-ink bg-red font-body text-step--1 font-extrabold text-paper"
                  >
                    {t('market.matches.swap.open')}
                  </Link>
                </li>
              )
            })}
          </ul>
        </Block>
      ) : null}

      {wanted.length > 0 ? (
        <Block title={t('market.matches.wanted')}>
          <ul className="grid grid-cols-3 gap-2">
            {wanted.map((item) => {
              const shirt = shirts[item.archiveSlug]!
              return (
                <li key={item.id}>
                  {shielded(shirt) ? (
                    <ShieldTile shirt={shirt} onUncover={() => onUncover(shirt.slug)} />
                  ) : (
                    <Link href={itemHref(item.id)} className="block min-h-tap border-rule border-ink bg-sheet p-1">
                      <ArchivePhoto shirt={shirt} />
                      <span className="mt-1 block truncate font-poster text-[15px] leading-none text-ink">
                        <ShirtDate shirt={shirt} />
                      </span>
                      <span className="block truncate font-body text-[10.5px] font-extrabold text-red">{shirt.variantHe}</span>
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </Block>
      ) : null}

      {others.length > 0 ? (
        <Block title={t('market.matches.wantedByOthers')}>
          <ul className="flex flex-col gap-2">
            {others.map(({ item, wanters, wantersWithTrades }) => {
              const shirt = shirts[item.archiveSlug]!
              const open = item.forSale || item.forTrade
              return (
                <li key={item.id} className="flex items-center gap-3 border-rule border-ink bg-sheet p-2">
                  <span className="block w-[64px] shrink-0">{thumb(shirt)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-body text-[12.5px] font-extrabold text-ink">{shirtName(shirt)}</span>
                    <span className="block font-body text-[12px] text-red">
                      {wanters === 1
                        ? t('market.matches.wanters.one')
                        : t('market.matches.wanters', { n: String(wanters) })}
                    </span>
                    {wantersWithTrades > 0 ? (
                      <span className="block font-body text-[11px] text-muted">
                        {t('market.matches.withTrades', { n: String(wantersWithTrades) })}
                      </span>
                    ) : null}
                    <Link
                      href={open ? itemHref(item.id) : '/kits/closet'}
                      className="mt-0.5 inline-flex min-h-tap items-center font-body text-[12px] font-extrabold text-sign underline underline-offset-4"
                    >
                      {open ? t('market.matches.onTable') : t('market.matches.openIt')}
                    </Link>
                  </span>
                </li>
              )
            })}
          </ul>
        </Block>
      ) : null}

      {auctions.length > 0 ? (
        <Block title={t('market.matches.auction')}>
          <ul className="flex flex-col gap-2">
            {auctions.map((lot) => {
              const shirt = shirts[lot.archiveSlug]!
              return (
                <li key={lot.id}>
                  <Link
                    href={`/kits/auction/${encodeURIComponent(lot.id)}`}
                    className="flex min-h-tap items-center gap-3 border-rule border-ink bg-sheet p-2"
                  >
                    <span className="block w-[56px] shrink-0">{shielded(shirt) ? null : <ArchivePhoto shirt={shirt} />}</span>
                    <span className="min-w-0 flex-1">
                      <bdi className="block truncate font-body text-[12.5px] font-extrabold text-ink">{lot.title || shirtName(shirt)}</bdi>
                      <span className="block font-body text-[11px] text-muted">
                        {t('market.matches.auction.bids', { n: String(lot.bidCount) })}
                      </span>
                      <span className="block font-body text-[12px] font-extrabold text-sign">{t('market.matches.auction.open')}</span>
                    </span>
                    <span aria-hidden="true" className="font-body text-step-0 text-red">
                      ←
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Block>
      ) : null}
    </div>
  )
}

function Block({ title, body, children }: { title: string; body?: string; children: ReactNode }) {
  return (
    <div className="p-3">
      <h3 className="font-display text-step-1 leading-tight text-ink">{title}</h3>
      {body ? <p className="mt-0.5 font-body text-[12px] leading-snug text-muted">{body}</p> : null}
      <div className="mt-2.5">{children}</div>
    </div>
  )
}
