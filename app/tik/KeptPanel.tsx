'use client'

import Link from 'next/link'

import { Num } from '@/components/ui/Num'
import type { ArchiveCard } from '@/lib/archive/graph-types'
import type { MessageKey } from '@/lib/i18n'
import type { WorkerCardState } from '@/lib/profile/card'
import { t } from '@/lib/i18n'

import type { CardExtras } from './actions'

const VARIANT_LABEL: Readonly<Record<string, MessageKey>> = {
  home: 'graph.kit.variant.home',
  away: 'graph.kit.variant.away',
  third: 'graph.kit.variant.third',
}

/** `1984/85|home` → the season and the variant, as the collection's key spells them. */
export function kitKeyParts(key: string): { season: string; variant: string } | null {
  const [season, variant] = key.split('|')
  if (!season || !variant || !/^\d{4}\/\d{2}$/.test(season)) return null
  return { season, variant }
}

/**
 * מה ששמרתי — everything the person kept, across the gates, read from the ids the
 * device holds and described by the archive (`cardExtras`): the archive's own "Mine",
 * the shirts unlocked out of the Kit Master's whole catalogue (not the 33 this screen
 * used to hard-code), gate 6's shelf, the goals rebuilt, the routes closed, and the
 * collections with an honest denominator where one exists.
 *
 * A locked shirt is never drawn here either: a kit is listed by its season and variant
 * only, which is everything gate 5's own locked grid shows (rule 24).
 */
export function KeptPanel({
  state,
  extras,
  kitKeys,
  collections,
}: {
  state: WorkerCardState
  extras: CardExtras | null
  kitKeys: readonly string[]
  collections: { xi: number; ballot: number; archiveSeen: number; lifeEvents: number | null; lifeYear: number | null }
}) {
  const kitsLine = state.lines.find((line) => line.gate === 4)?.figures.find((figure) => figure.key === 'kits')
  const kitsHave = typeof kitsLine?.value === 'number' ? kitsLine.value : 0
  const kitsOf = kitsLine?.of ?? null
  const saved = extras?.archive.saved ?? []
  const loading = extras === null

  return (
    <section aria-labelledby="kept-title">
      <p dir="ltr" className="font-latin text-[9px] font-bold tracking-[0.24em] text-red">
        WHAT I KEPT
      </p>
      <h2 id="kept-title" className="mt-1 font-display text-step-3 leading-none text-ink">
        {t('tik.mine.title')}
      </h2>
      <p className="mt-2 max-w-prose font-body text-step--1 leading-relaxed text-muted">{t('tik.mine.lede')}</p>

      {/* ------------------------------------------------------------ collections */}
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        <Collection href="/kits" label={t('tik.mine.kits')} have={kitsHave} of={kitsOf} />
        <Collection href="/xi" label={t('screen.xi.title')} have={collections.xi} of={2} />
        <Collection href="/ussishkin" label={t('screen.ussishkin.title')} have={state.ussishkin.have} of={state.ussishkin.of} />
        <Collection href="/polls" label={t('screen.polls.title')} have={collections.ballot} of={8} />
        {collections.archiveSeen > 0 && (
          <Collection href="/archive" label={t('member.archiveCards')} have={collections.archiveSeen} of={null} />
        )}
        {collections.lifeEvents !== null && (
          <Collection
            href="/life"
            label={t('life.title')}
            have={collections.lifeEvents}
            of={null}
            note={collections.lifeYear !== null ? String(collections.lifeYear) : undefined}
          />
        )}
      </ul>

      {/* ---------------------------------------------------------------- the kits */}
      {kitKeys.length > 0 && (
        <Shelf title={t('tik.mine.kitsTitle')} count={kitKeys.length}>
          <ul className="flex flex-wrap gap-1.5">
            {kitKeys.map((key) => {
              const parts = kitKeyParts(key)
              if (parts === null) return null
              const variant = VARIANT_LABEL[parts.variant]
              return (
                <li key={key}>
                  <Link
                    href="/kits"
                    className="flex min-h-tap items-center gap-1.5 border-hair border-ink bg-paper px-2.5 font-body text-[12.5px] font-bold text-ink"
                  >
                    <Num>{parts.season}</Num>
                    {variant && <span className="text-muted">{t(variant)}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        </Shelf>
      )}

      {/* ------------------------------------------------------------- the archive */}
      <Shelf
        title={t('tik.mine.archive')}
        count={saved.length}
        note={
          extras?.archive.favouriteDecade ? (
            <>
              {t('tik.mine.decade')}{' '}
              <Num>{`${extras.archive.favouriteDecade.decade}–${extras.archive.favouriteDecade.decade + 9}`}</Num>
            </>
          ) : undefined
        }
      >
        {loading ? (
          <Loading />
        ) : saved.length > 0 ? (
          <CardList cards={saved} />
        ) : (
          <Empty href="/archive" text={t('tik.mine.archiveEmpty')} />
        )}
        {extras && extras.archive.beenThere.length > 0 && (
          <div className="mt-3">
            <p className="font-body text-[11.5px] font-extrabold text-muted">{t('tik.mine.beenThere')}</p>
            <CardList cards={extras.archive.beenThere} />
          </div>
        )}
      </Shelf>

      {/* ------------------------------------------------------------ memory shelf */}
      <Shelf title={t('tik.mine.shelf')} count={extras?.shelf.length ?? 0}>
        {loading ? (
          <Loading />
        ) : extras.shelf.length > 0 ? (
          <CardList cards={extras.shelf} compact />
        ) : (
          <Empty href="/memory" text={t('tik.mine.shelfEmpty')} />
        )}
      </Shelf>

      {/* ------------------------------------------------------------ goals rebuilt */}
      <Shelf title={t('tik.mine.goals')} count={extras?.goals.length ?? 0}>
        {loading ? (
          <Loading />
        ) : extras.goals.length > 0 ? (
          <CardList cards={extras.goals} compact />
        ) : (
          <Empty href="/goal" text={t('tik.mine.goalsEmpty')} />
        )}
      </Shelf>

      {/* ------------------------------------------------------------------ routes */}
      <Shelf title={t('tik.mine.routes')} count={extras?.routes.length ?? 0}>
        {loading ? (
          <Loading />
        ) : extras.routes.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {extras.routes.map((route) => (
              <li key={route.routeId} className="border-hair border-ink bg-paper px-2.5 py-2">
                <p className="flex flex-wrap items-baseline gap-x-1.5 font-sign text-[13.5px] font-bold leading-snug text-ink">
                  <bdi>{route.start.titleHe}</bdi>
                  <span aria-hidden="true" className="text-red">
                    ←
                  </span>
                  <span className="sr-only">{t('tik.mine.routeTo')}</span>
                  <bdi>{route.end.titleHe}</bdi>
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <Empty href="/timeline" text={t('tik.mine.routesEmpty')} />
        )}
      </Shelf>
    </section>
  )
}

function Shelf({ title, count, note, children }: { title: string; count: number; note?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-stack">
      <div className="flex items-baseline justify-between gap-3 border-b-rule border-ink pb-1">
        <h3 className="font-display text-step-1 leading-tight text-ink">{title}</h3>
        <p className="font-mono text-[11px] tabular-nums text-muted">
          <Num>{count}</Num>
          {note && (
            <>
              {' · '}
              {note}
            </>
          )}
        </p>
      </div>
      <div className="mt-2">{children}</div>
    </section>
  )
}

function CardList({ cards, compact = false }: { cards: readonly ArchiveCard[]; compact?: boolean }) {
  return (
    <ul className={compact ? 'flex flex-wrap gap-1.5' : 'grid gap-1.5 sm:grid-cols-2'}>
      {cards.slice(0, 24).map((card) => (
        <li key={card.id}>
          <Link
            href={`/archive?at=${encodeURIComponent(card.id)}`}
            className={`flex min-h-tap flex-col justify-center border-hair border-ink bg-paper px-2.5 py-1.5 ${compact ? '' : 'w-full'}`}
          >
            <span className="font-sign text-[13.5px] font-bold leading-tight text-ink">
              <bdi>{card.titleHe}</bdi>
            </span>
            {!compact && (card.when || card.subHe) && (
              <span className="mt-0.5 font-body text-[11px] leading-tight text-muted">
                <bdi>{[card.when, card.subHe].filter(Boolean).join(' · ')}</bdi>
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  )
}

function Loading() {
  return <p className="font-body text-[12px] text-muted">{t('tik.mine.loading')}</p>
}

function Empty({ href, text }: { href: string; text: string }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 font-body text-[12.5px] leading-snug text-muted">
      {text}
      <Link href={href} className="inline-flex min-h-tap items-center font-extrabold text-red underline decoration-2 underline-offset-4">
        {t('member.enter')}
      </Link>
    </p>
  )
}

function Collection({
  href,
  label,
  have,
  of,
  note,
}: {
  href: string
  label: string
  have: number
  of: number | null
  note?: string
}) {
  const share = of === null || of === 0 ? 0 : Math.min(1, have / of)
  return (
    <li>
      <Link
        href={href}
        className="block border-rule border-ink bg-sheet p-3 transition-transform duration-press ease-stamp active:scale-[.985] motion-reduce:transition-none"
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-sign text-step-0 leading-tight text-ink">{label}</span>
          <span className="font-mono text-[11px] tabular-nums text-muted">
            <Num>{of === null ? String(have) : `${have}/${of}`}</Num>
            {note && (
              <>
                {' · '}
                <Num>{note}</Num>
              </>
            )}
          </span>
        </div>
        {of !== null && (
          <div aria-hidden="true" className="mt-2 h-[6px] w-full bg-ink/15">
            <div className="h-full bg-red" style={{ inlineSize: `${Math.round(share * 100)}%` }} />
          </div>
        )}
      </Link>
    </li>
  )
}
