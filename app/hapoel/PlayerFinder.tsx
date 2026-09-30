'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import { Num } from '@/components/ui/Num'
import { RosterFilters } from '@/components/roster/RosterFilters'
import type { RosterIndex } from '@/lib/game/allTimeXI'
import {
  byInitial,
  filterRoster,
  isFiltered,
  NO_FILTER,
  searchRoster,
  type RosterFilter,
  type Searchable,
} from '@/lib/game/roster-search'
import { t, type MessageKey } from '@/lib/i18n'

/**
 * השחקנים — 637 names, on a page rather than in a sheet.
 *
 * `components/roster/RosterSheet.tsx` is the modal a game opens to PICK somebody. This
 * is the same index read rather than picked from, which is a different job: nothing is
 * taken, nothing is disabled, and the row leads with what the archive knows about the
 * man instead of with whether he is still available.
 *
 * The search, the filters and the letter rail are the shared ones, so the ranking Maor
 * tuned once ("it has to find a man by his family name") is the ranking here too. A
 * second copy of that would have drifted — rule 24 says so about the sheet, and it is
 * just as true of the page.
 *
 * **The list is capped until you narrow it.** Six hundred rows of names is not browsing,
 * it is scrolling; the first 120 are shown with a count and a line that says what is
 * hidden and how to reach it. Searching or filtering lifts the cap, because then the
 * list is an answer rather than an inventory.
 */

const PAGE = 120

export function PlayerFinder({ roster }: { roster: RosterIndex }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<RosterFilter>(NO_FILTER)
  const [full, setFull] = useState(false)

  const narrowed = useMemo(() => filterRoster(roster.all, filter), [roster.all, filter])
  const results = useMemo(() => searchRoster(narrowed, query), [query, narrowed])
  const grouped = useMemo(
    () => (query.trim() === '' ? byInitial(results) : null),
    [query, results],
  )

  const narrowing = query.trim() !== '' || isFiltered(filter)
  const capped = !narrowing && !full
  const shown = capped ? results.slice(0, PAGE) : results
  const groups = capped ? byInitial(shown) : grouped

  return (
    <div className="mt-3">
      <div className="flex items-stretch gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('roster.search')}
          aria-label={t('roster.search')}
          inputMode="search"
          className="min-h-tap w-full border-hair border-ink bg-paper px-3 font-body text-step-0 text-ink outline-none placeholder:text-muted"
        />
        {query !== '' && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label={t('xi.clear')}
            className="min-h-tap shrink-0 border-hair border-ink bg-paper px-3 font-body text-step-0 font-extrabold text-muted"
          >
            ×
          </button>
        )}
      </div>
      <p className="mt-1 font-mono text-[10.5px] tabular-nums text-muted">
        {t('roster.count', { shown: String(results.length), total: String(roster.total) })}
        {' · '}
        {t('roster.knownPositions')} <Num>{roster.withPosition}</Num>
      </p>

      <RosterFilters all={roster.all} filter={filter} onChange={setFilter} />

      {results.length === 0 ? (
        <p className="mt-4 border-rule border-ink bg-sheet p-4 font-body text-step--1 text-muted">
          {t('roster.empty')}
        </p>
      ) : (
        <div className="mt-3">
          {groups ? (
            groups.map((bucket) => (
              <section key={bucket.letter} className="mt-3 first:mt-0">
                <h3 className="border-b-rule border-ink bg-ink px-2 py-1 font-poster text-[17px] leading-none text-paper">
                  {bucket.letter}
                </h3>
                <ul className="grid sm:grid-cols-2">
                  {bucket.names.map((entry) => (
                    <PlayerRow key={entry.slug} entry={entry} />
                  ))}
                </ul>
              </section>
            ))
          ) : (
            <ul className="grid sm:grid-cols-2">
              {shown.map((entry) => (
                <PlayerRow key={entry.slug} entry={entry} />
              ))}
            </ul>
          )}
        </div>
      )}

      {capped && results.length > PAGE && (
        <button
          type="button"
          onClick={() => setFull(true)}
          className="mt-3 min-h-tap w-full border-rule border-ink bg-sheet px-3 py-2 font-body text-step--1 font-extrabold text-ink"
        >
          {t('roster.showAll', { n: String(results.length - PAGE) })}
        </button>
      )}
    </div>
  )
}

function PlayerRow({ entry }: { entry: Searchable }) {
  const years =
    entry.fromYear !== null && entry.fromYear !== undefined
      ? entry.toYear && entry.toYear !== entry.fromYear
        ? `${entry.fromYear}—${entry.toYear}`
        : String(entry.fromYear)
      : null

  return (
    <li className="border-b-hair border-ink/20">
     <Link href={`/archive?at=${encodeURIComponent(entry.slug)}`} className="flex min-h-tap items-baseline gap-2 py-2">
      <span className="font-sign text-step-0 leading-tight text-ink">{entry.familyHe}</span>
      {entry.givenHe !== '' && (
        <span className="min-w-0 truncate font-body text-[12px] leading-tight text-muted">
          {entry.givenHe}
        </span>
      )}
      <span className="ms-auto flex shrink-0 items-baseline gap-1.5">
        {years && (
          <span className="font-mono text-[10px] tabular-nums text-muted">
            <Num>{years}</Num>
          </span>
        )}
        {entry.position && (
          <span className="border-hair border-ink/30 px-1.5 py-[2px] font-body text-[9.5px] font-extrabold leading-none text-muted">
            {t(`roster.pos.${entry.position}` as MessageKey)}
            {entry.positionFrom === 'lineup' && <span aria-hidden="true">°</span>}
          </span>
        )}
      </span>
     </Link>
    </li>
  )
}
