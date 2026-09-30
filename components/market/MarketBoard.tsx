'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'

import { Num } from '@/components/ui/Num'
import {
  decadeLabel,
  groupListings,
  shirtName,
  tableFacets,
  type DecadeFilter,
  type KindFilter,
  type ListingGroup,
} from '@/lib/collector/market'
import type { CollectorShirt, PublicItem } from '@/lib/collector/types'
import { t } from '@/lib/i18n'

import { CopyTicket } from './CopyTicket'
import { MatchesPanel, type MatchesState } from './MatchesPanel'
import { ArchivePhoto, Kicker, PlateHeading, ShieldTile, ShirtDate } from './ShirtBits'
import { useShield } from './useShield'

export type TableState =
  | { state: 'loading' }
  | { state: 'off' }
  | { state: 'error'; message: string }
  | { state: 'ready'; items: PublicItem[]; more: boolean; loadingMore?: boolean }

/** A shirt hangs with at most this many copies under it; the rest are one tap away (`?slug=`). */
const COPIES_SHOWN = 3

/**
 * שוק האדומים — the board. The copies on the table hung on their archive shirts (spec §6), the
 * two rails a fan actually asks with (for sale or trade, and which decade), `?slug=` to stand in
 * front of one shirt, and — for a signed-in collector — the matches box beside the table on a wide
 * screen and above it on a phone, because on a phone the first thing worth reading is "someone has
 * the shirt you are after".
 */
export function MarketBoard({
  shirts,
  table,
  matches,
  slug,
  onSlug,
  onMore,
  signIn,
}: {
  shirts: Readonly<Record<string, CollectorShirt>>
  table: TableState
  matches: MatchesState
  slug: string | null
  onSlug: (slug: string | null) => void
  onMore?: () => void
  signIn?: ReactNode
}) {
  const [kind, setKind] = useState<KindFilter>('all')
  const [decade, setDecade] = useState<DecadeFilter>('all')
  const { shielded, uncover } = useShield()

  const items = table.state === 'ready' ? table.items : []
  const facets = tableFacets(items, shirts)
  const groups = groupListings(items, shirts, { kind, decade })
  const copies = groups.reduce((sum, group) => sum + group.items.length, 0)
  const focus = slug ? (shirts[slug] ?? null) : null

  return (
    <div className="mt-stack">
      <p className="max-w-prose font-body text-step--1 leading-relaxed text-ink">{t('market.lede')}</p>
      <div className="mt-stack lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <aside className="mb-stack empty:hidden lg:order-2 lg:mb-0 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto lg:overscroll-contain">
          <MatchesPanel matches={matches} shirts={shirts} shielded={shielded} onUncover={uncover} signIn={signIn} />
        </aside>

        <div className="min-w-0 lg:order-1">
          {table.state === 'off' ? (
            <Notice title={t('market.off.title')} body={t('market.off.body')}>
              <Link href="/kits/archive" className="inline-flex min-h-tap items-center border-rule border-ink bg-red px-4 font-body text-step--1 font-extrabold text-paper">
                {t('market.toArchive')}
              </Link>
            </Notice>
          ) : table.state === 'error' ? (
            <Notice title={t('market.error.title')} body={table.message} tone="red" />
          ) : (
            <>
              <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
                <div>
                  <Kicker>{t('market.kicker')}</Kicker>
                  <PlateHeading>{t('market.table')}</PlateHeading>
                </div>
                {table.state === 'ready' && copies > 0 ? (
                  <p className="font-poster text-[20px] leading-none text-ink">
                    {copies === 1 && groups.length === 1
                      ? t('market.table.one')
                      : t('market.table.count', { n: String(copies), shirts: String(groups.length) })}
                  </p>
                ) : null}
              </div>

              {focus ? <FocusBanner shirt={focus} shielded={shielded(focus)} onUncover={() => uncover(focus.slug)} onClear={() => onSlug(null)} /> : null}

              {table.state === 'ready' && facets.all > 0 ? (
                <div className="mt-3">
                  <Rail label={t('market.filter.kind')}>
                    <Chip on={kind === 'all'} onClick={() => setKind('all')} label={t('market.filter.all')} count={facets.all} />
                    <Chip on={kind === 'sale'} onClick={() => setKind('sale')} label={t('collector.forSale')} count={facets.sale} />
                    <Chip on={kind === 'trade'} onClick={() => setKind('trade')} label={t('collector.forTrade')} count={facets.trade} />
                  </Rail>
                  {facets.decades.length > 1 ? (
                    <Rail label={t('market.filter.decade')}>
                      <Chip on={decade === 'all'} onClick={() => setDecade('all')} label={t('market.filter.all')} />
                      {facets.decades.map((row) => (
                        <Chip key={row.decade} on={decade === row.decade} onClick={() => setDecade(row.decade)} label={decadeLabel(row.decade)} count={row.count} />
                      ))}
                    </Rail>
                  ) : null}
                </div>
              ) : null}

              {table.state === 'loading' ? (
                <p className="mt-stack border-rule border-dashed border-ink/50 p-4 font-body text-step--1 text-muted">{t('market.loading')}</p>
              ) : groups.length === 0 ? (
                facets.all > 0 ? (
                  <Notice title={t('market.empty.filtered')} body={t('market.empty.body')} />
                ) : focus ? (
                  <Notice title={t('market.slug.none')} body={t('market.slug.want')}>
                    <Link href="/kits/archive" className="inline-flex min-h-tap items-center font-body text-step--1 font-extrabold text-sign underline underline-offset-4">
                      {t('market.toArchive')}
                    </Link>
                  </Notice>
                ) : (
                  <Notice title={t('market.empty.title')} body={t('market.empty.body')}>
                    <Link href="/kits/closet" className="inline-flex min-h-tap items-center border-rule border-ink bg-red px-4 font-body text-step--1 font-extrabold text-paper">
                      {t('market.toCloset')}
                    </Link>
                    <Link href="/kits/archive" className="inline-flex min-h-tap items-center px-2 font-body text-step--1 font-extrabold text-sign underline underline-offset-4">
                      {t('market.toArchive')}
                    </Link>
                  </Notice>
                )
              ) : (
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {groups.map((group) => (
                    <li key={group.shirt.slug} className="min-w-0">
                      <Hanger
                        group={group}
                        all={Boolean(focus)}
                        shielded={shielded(group.shirt)}
                        onUncover={() => uncover(group.shirt.slug)}
                        onFocus={() => onSlug(group.shirt.slug)}
                      />
                    </li>
                  ))}
                </ul>
              )}

              {table.state === 'ready' && table.more && onMore ? (
                <button
                  type="button"
                  onClick={onMore}
                  disabled={table.loadingMore}
                  className="mt-stack flex min-h-tap w-full items-center justify-center border-rule border-dashed border-ink bg-paper font-body text-step--1 font-extrabold text-ink disabled:opacity-60"
                >
                  {t('market.table.more')}
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/** One shirt on the table: the archive photograph as the sign above the hanger, and the copies. */
function Hanger({
  group,
  all,
  shielded,
  onUncover,
  onFocus,
}: {
  group: ListingGroup
  all: boolean
  shielded: boolean
  onUncover: () => void
  onFocus: () => void
}) {
  const { shirt, items } = group
  const shown = all ? items : items.slice(0, COPIES_SHOWN)
  const rest = items.length - shown.length
  return (
    <article className="flex h-full flex-col border-plate border-ink bg-sheet" data-market-shirt={shirt.slug}>
      <header className="flex items-stretch gap-3 border-b-rule border-ink p-2.5">
        <span className="block w-[92px] shrink-0 bg-paper">
          {shielded ? <ShieldTile shirt={shirt} onUncover={onUncover} /> : <ArchivePhoto shirt={shirt} />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col justify-center">
          <span className="font-poster text-[26px] leading-none text-ink">
            <ShirtDate shirt={shirt} />
          </span>
          <span className="mt-1 block truncate font-body text-[12px] font-extrabold text-red">{shirt.variantHe}</span>
          <span className="mt-1 font-body text-[11px] text-muted">
            {items.length === 1 ? t('market.copies.one') : t('market.copies', { n: String(items.length) })}
          </span>
          {!all ? (
            <button
              type="button"
              onClick={onFocus}
              aria-label={`${t('market.item.allCopies')} · ${shirtName(shirt)}`}
              className="mt-0.5 self-start min-h-tap font-body text-[12px] font-extrabold text-sign underline underline-offset-4"
            >
              {t('market.item.allCopies')}
            </button>
          ) : null}
        </span>
      </header>
      <ul className="flex-1">
        {shown.map((item) => (
          <li key={item.id}>
            <CopyTicket item={item} shirt={shirt} hidePhoto={shielded} />
          </li>
        ))}
      </ul>
      {rest > 0 ? (
        <button
          type="button"
          onClick={onFocus}
          className="min-h-tap border-t-hair border-dashed border-ink/45 font-body text-[12px] font-extrabold text-sign"
        >
          {rest === 1 ? t('market.copies.moreOne') : t('market.copies.more', { n: String(rest) })}
        </button>
      ) : null}
    </article>
  )
}

/** `?slug=` — standing in front of one shirt, with the way back to the whole table. */
function FocusBanner({ shirt, shielded, onUncover, onClear }: { shirt: CollectorShirt; shielded: boolean; onUncover: () => void; onClear: () => void }) {
  return (
    <div className="mt-3 flex items-center gap-3 border-plate border-red bg-paper p-2.5" data-market-focus={shirt.slug}>
      <span className="block w-[76px] shrink-0">{shielded ? <ShieldTile shirt={shirt} onUncover={onUncover} /> : <ArchivePhoto shirt={shirt} eager />}</span>
      <span className="min-w-0 flex-1">
        <Kicker>{t('market.slug.kicker')}</Kicker>
        <span className="block font-display text-step-1 leading-tight text-ink">{t('market.slug.title')}</span>
        <span className="block truncate font-body text-[12.5px] font-extrabold text-red">
          {shirt.variantHe} · <ShirtDate shirt={shirt} />
        </span>
      </span>
      <button
        type="button"
        onClick={onClear}
        className="min-h-tap shrink-0 border-rule border-ink bg-sheet px-3 font-body text-[12px] font-extrabold text-ink"
      >
        ✕ {t('market.slug.clear')}
      </button>
    </div>
  )
}

function Notice({ title, body, tone = 'ink', children }: { title: string; body: string; tone?: 'ink' | 'red'; children?: ReactNode }) {
  return (
    <div className={`mt-stack border-rule p-4 ${tone === 'red' ? 'border-red' : 'border-ink'} bg-sheet`} role={tone === 'red' ? 'alert' : undefined}>
      <p className={`font-sign text-step-1 leading-tight ${tone === 'red' ? 'text-red' : 'text-ink'}`}>{title}</p>
      <p className="mt-2 max-w-prose font-body text-step--1 leading-relaxed text-ink">{body}</p>
      {children ? <div className="mt-3 flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  )
}

/** A filter row as the archive draws it: a fixed label, and a strip of chips that scrolls sideways. */
function Rail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <span className="w-[42px] shrink-0 font-body text-[10px] font-extrabold tracking-wide text-muted">{label}</span>
      <div className="-mx-0.5 flex flex-1 gap-1 overflow-x-auto px-0.5 pb-1">{children}</div>
    </div>
  )
}

function Chip({ on, onClick, label, count }: { on: boolean; onClick: () => void; label: string; count?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`flex min-h-tap shrink-0 items-center gap-1.5 border-hair px-3 font-body text-[12px] font-extrabold leading-none transition-transform duration-press ease-stamp active:scale-[.96] motion-reduce:transition-none ${
        on ? 'border-ink bg-ink text-paper' : 'border-ink/40 bg-paper text-ink'
      }`}
    >
      <span>{label}</span>
      {count !== undefined ? (
        <span className={`text-[10.5px] ${on ? 'text-concrete' : 'text-muted'}`}>
          <Num>{count}</Num>
        </span>
      ) : null}
    </button>
  )
}
