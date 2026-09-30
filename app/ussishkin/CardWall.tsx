'use client'

import { useEffect, useState } from 'react'

import { Num } from '@/components/ui/Num'
import { SourceNote } from '@/components/ui/SourceNote'
import { collect, collected, readProfile } from '@/lib/profile/store'
import { t, type MessageKey } from '@/lib/i18n'

/**
 * קיר הקלפים — the memorial wall.
 *
 * The Ussishkin handoff draws a tifo: a grid of cards, each one held by one person, and
 * the picture only exists from the far side of the hall. That mechanic is exactly right
 * for a memorial and exactly wrong to fake — a live counter of "1,208 cards raised"
 * needs a hall full of people, and inventing one would be a lie printed on a memorial.
 *
 * So the cards hold the RECORD instead. Every card is a sourced fact about the hall,
 * the club, the nights or the fans' own club; turning one over is what raises it, and
 * the counter counts what the reader has actually read. The mosaic still assembles, and
 * every line in it is true.
 *
 * Two things changed when the wing was rebuilt:
 *
 *   · **The wall remembers.** Raised cards go into the device's profile
 *     (`lib/profile/store.ts`), so the mosaic is still half-built when you come back
 *     tomorrow, and "המנוי שלך" can say how much of the hall you have actually read.
 *     Forty-five facts is a lot to take in one sitting and the old wall reset every
 *     time, which quietly told a returning reader that nothing they did counted.
 *   · **A section can be isolated.** Four filters, because somebody who came for what
 *     the supporters built afterwards should not have to hunt for ten cards among
 *     forty-five. The filter changes which cards are ON THE WALL, never their colour —
 *     colour carries the section, and a wall whose colours move means nothing.
 */

export type Fact = {
  slug: string
  cat: 'building' | 'nights' | 'club' | 'players' | 'ussishkin-club'
  periodHe: string
  factHe: string
  sourceTitle: string
  sourceUrl: string
}

const SET = 'ussishkin'

const FACE: Record<Fact['cat'], string> = {
  building: 'bg-red text-paper',
  nights: 'bg-ink text-paper',
  // concrete, not sheet: sheet and paper are one step apart on the same cream, so a
  // club card read as an un-raised one and half the wall looked untouched.
  club: 'bg-concrete text-ink',
  players: 'bg-concrete text-ink',
  'ussishkin-club': 'bg-sign text-paper',
}

type Filter = 'all' | 'building' | 'nights' | 'club' | 'ussishkin-club'

const FILTERS: Array<{ id: Filter; key: MessageKey }> = [
  { id: 'all', key: 'uss.filter.all' },
  { id: 'building', key: 'uss.cat.building' },
  { id: 'nights', key: 'uss.cat.nights' },
  { id: 'club', key: 'uss.cat.club' },
  { id: 'ussishkin-club', key: 'uss.cat.ussishkin-club' },
]

function inFilter(fact: Fact, filter: Filter): boolean {
  if (filter === 'all') return true
  if (filter === 'club') return fact.cat === 'club' || fact.cat === 'players'
  return fact.cat === filter
}

export function CardWall({ facts }: { facts: Fact[] }) {
  const [open, setOpen] = useState<string | null>(null)
  const [seen, setSeen] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<Filter>('all')

  // The profile is a browser record, so it is read after mount rather than during
  // render — reading storage in a render is how a server/client mismatch starts.
  useEffect(() => {
    setSeen(new Set(collected(readProfile(), SET)))
  }, [])

  function raise(slug: string) {
    setOpen((current) => (current === slug ? null : slug))
    setSeen((current) => {
      if (current.has(slug)) return current
      const next = new Set(current).add(slug)
      collect(SET, [slug])
      return next
    })
  }

  const shown = facts.filter((fact) => inFilter(fact, filter))
  const card = facts.find((fact) => fact.slug === open) ?? null

  return (
    <>
      <div className="mt-3 flex items-baseline justify-between gap-3 border-b-rule border-ink pb-1.5">
        <p className="font-display text-step-1 leading-tight text-ink">{t('uss.wall')}</p>
        <p className="font-mono text-[11px] tabular-nums text-muted">
          <Num>{`${seen.size}/${facts.length}`}</Num> {t('uss.raised')}
        </p>
      </div>

      <div role="group" aria-label={t('uss.filterAria')} className="mt-2 flex flex-wrap gap-1">
        {FILTERS.map((row) => {
          const live = row.id === filter
          const count = facts.filter((fact) => inFilter(fact, row.id)).length
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => setFilter(row.id)}
              aria-pressed={live}
              className={`min-h-tap border-hair px-2.5 py-1.5 font-body text-[11.5px] font-extrabold leading-none transition-transform duration-press ease-stamp active:scale-[.96] motion-reduce:transition-none ${
                live ? 'border-ink bg-ink text-paper' : 'border-ink/40 bg-sheet text-ink'
              }`}
            >
              {t(row.key)}{' '}
              <span className={`font-mono text-[10px] ${live ? 'text-concrete' : 'text-muted'}`}>
                <Num>{count}</Num>
              </span>
            </button>
          )
        })}
      </div>

      <ul className="mt-2 grid grid-cols-6 gap-1 sm:grid-cols-10">
        {shown.map((fact) => {
          const raised = seen.has(fact.slug)
          const active = open === fact.slug
          return (
            <li key={fact.slug}>
              <button
                type="button"
                onClick={() => raise(fact.slug)}
                aria-label={fact.factHe.slice(0, 40)}
                aria-pressed={active}
                className={`block aspect-square min-h-tap w-full border-hair border-ink transition-transform duration-press ease-stamp active:scale-90 motion-reduce:transition-none ${
                  raised ? FACE[fact.cat] : 'bg-paper'
                } ${active ? 'outline outline-2 outline-offset-1 outline-ink' : ''}`}
              />
            </li>
          )
        })}
      </ul>

      {/* the card the reader turned over, printed at full size under the wall */}
      <div aria-live="polite" className="mt-2 min-h-[132px] border-rule border-ink bg-sheet p-4">
        {card ? (
          <>
            <p className="font-body text-[10px] tracking-widest text-red">
              {t(`uss.cat.${card.cat}` as MessageKey)}
              {card.periodHe !== '' && (
                <>
                  {' · '}
                  <Num className="font-mono text-muted">{card.periodHe}</Num>
                </>
              )}
            </p>
            <p className="mt-1.5 font-body text-step-0 leading-relaxed text-ink">{card.factHe}</p>
            {/* the source is on /credits (spec §0.3, 22.9.2026) */}
            <p className="mt-2">
              <SourceNote />
            </p>
          </>
        ) : (
          <p className="font-body text-step-0 leading-relaxed text-muted">{t('uss.wallHint')}</p>
        )}
      </div>
    </>
  )
}
