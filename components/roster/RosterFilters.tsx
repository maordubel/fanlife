'use client'

import { useEffect, useState } from 'react'

import { Num } from '@/components/ui/Num'
import {
  facetCounts,
  isFiltered,
  NO_FILTER,
  type RosterFilter,
  type Searchable,
} from '@/lib/game/roster-search'
import { t, type MessageKey } from '@/lib/i18n'

/**
 * הסינון — four ways to cut 637 names down to the ones you meant.
 *
 * Maor's note: *"קשה שמופיעים כל רשימות השחקנים בבת אחת. תעזור למשתתף, חלוקה וסינון
 * נכון."* The sheet already had a search and a letter rail; what it did not have was any
 * way to ask a question about a player rather than about his spelling.
 *
 * Four rows, in the order a supporter actually narrows:
 *
 *   · **עמדה** — goalkeeper, defence, midfield, attack, and **לא מתועד**.
 *   · **מכסת זרים** — Israeli, foreign, and לא מתועד — read off the CLUB's foreign-slot
 *     record (ויקיפועל's category), never nationality; the footnote under the row says so
 *     (players.md §3.1, 21.9.2026). It was headed "מוצא" until then, and 42 of its rows
 *     were a nationality somebody else declared.
 *   · **תקופה** — by decade, from the seasons his shirt numbers are recorded in.
 *   · **אות** — the family-name initial, which the rail already did and now composes
 *     with the rest instead of replacing them.
 *
 * And a fifth, **opt-in**: **עונה**, one four-digit year. Gate 1's scouting drawer turns
 * it on (`showYear`) because "who was here in 2010" is the question a supporter building
 * an all-time eleven asks constantly; gate 7 never does, and gets the four rows it
 * always had. It is the same `fromYear`/`toYear` the decade chips read, at a finer
 * grain — not a new fact, and never a guess about a man the archive cannot date.
 *
 * **Every chip prints its own count, and לא מתועד is a chip like any other.** That is
 * the part that makes this honest rather than decorative: the archive states a position
 * for a few dozen of the 637 (`lib/game/roster-facets.ts` explains exactly which sources
 * and why nothing is guessed), so a "שוער" filter that silently hid the other six
 * hundred would read as a complete list of Hapoel's outfield players and be wrong by an
 * order of magnitude. A reader can see the size of the gap, tap into it, and — through
 * the report link the wings already carry — help close it.
 *
 * A row whose only non-empty bucket is לא מתועד does not render at all. A filter with
 * one option is not a filter.
 */

const POSITIONS: Array<{ id: RosterFilter['position']; key: MessageKey }> = [
  { id: 'GK', key: 'roster.pos.GK' },
  { id: 'DF', key: 'roster.pos.DF' },
  { id: 'MF', key: 'roster.pos.MF' },
  { id: 'FW', key: 'roster.pos.FW' },
  { id: 'unknown', key: 'roster.pos.unknown' },
]

const ORIGINS: Array<{ id: RosterFilter['origin']; key: MessageKey }> = [
  { id: 'israeli', key: 'roster.origin.israeli' },
  { id: 'foreign', key: 'roster.origin.foreign' },
  { id: 'unknown', key: 'roster.origin.unknown' },
]

export function RosterFilters({
  all,
  filter,
  onChange,
  showYear = false,
}: {
  all: Searchable[]
  filter: RosterFilter
  onChange: (next: RosterFilter) => void
  /**
   * A single season, as a four-digit year. Gate 1's scouting drawer asks for it — "who
   * was here in 2010" is the question a supporter building an all-time eleven asks over
   * and over — and gate 7 does not, so it stays off unless a caller turns it on.
   *
   * The decade chips stay either way. They are how you browse; this is how you aim.
   */
  showYear?: boolean
}) {
  // The box holds the TEXT, the filter holds the year. They are not the same thing:
  // "201" is a person halfway through typing 2010, and treating it as the year 201
  // would empty the sheet under their fingers. Only a complete four-digit year filters.
  const [yearText, setYearText] = useState(filter.year === null ? '' : String(filter.year))
  // A chip removed above the facets (or "clear all") resets the year from outside; the
  // box has to follow, or it would keep printing a year the list no longer filters by.
  useEffect(() => {
    if (filter.year === null) setYearText((text) => (text.length === 4 ? '' : text))
    else setYearText(String(filter.year))
  }, [filter.year])

  function setYear(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 4)
    setYearText(digits)
    onChange({ ...filter, year: digits.length === 4 ? Number(digits) : null })
  }

  const counts = facetCounts(all)
  const decades = Object.keys(counts.decade)
    .map(Number)
    .sort((a, b) => a - b)

  const positionsUseful = POSITIONS.filter((row) => row.id !== 'unknown').some(
    (row) => (counts.position[String(row.id)] ?? 0) > 0,
  )
  const originsUseful = ORIGINS.filter((row) => row.id !== 'unknown').some(
    (row) => (counts.origin[String(row.id)] ?? 0) > 0,
  )

  return (
    <div role="group" aria-label={t('roster.filterAria')} className="mt-2">
      {positionsUseful && (
        <Row label={t('roster.position')}>
          <Chip
            live={filter.position === 'any'}
            onClick={() => onChange({ ...filter, position: 'any' })}
            label={t('roster.any')}
          />
          {POSITIONS.map((row) => (
            <Chip
              key={String(row.id)}
              live={filter.position === row.id}
              onClick={() => onChange({ ...filter, position: row.id })}
              label={t(row.key)}
              count={counts.position[String(row.id)] ?? 0}
            />
          ))}
        </Row>
      )}

      {originsUseful && (
        <Row label={t('roster.foreignSlot')}>
          <Chip
            live={filter.origin === 'any'}
            onClick={() => onChange({ ...filter, origin: 'any' })}
            label={t('roster.any')}
          />
          {ORIGINS.map((row) => (
            <Chip
              key={String(row.id)}
              live={filter.origin === row.id}
              onClick={() => onChange({ ...filter, origin: row.id })}
              label={t(row.key)}
              count={counts.origin[String(row.id)] ?? 0}
            />
          ))}
        </Row>
      )}

      {decades.length > 1 && (
        <Row label={t('roster.era')}>
          <Chip
            live={filter.decade === 'any'}
            onClick={() => onChange({ ...filter, decade: 'any' })}
            label={t('roster.any')}
          />
          {decades.map((decade) => (
            <Chip
              key={decade}
              live={filter.decade === decade}
              onClick={() => onChange({ ...filter, decade })}
              label={t('roster.decade', { n: String(decade) })}
              count={counts.decade[decade] ?? 0}
              latin
            />
          ))}
        </Row>
      )}

      {showYear && (
        <Row label={t('roster.year')}>
          <input
            value={yearText}
            onChange={(event) => setYear(event.target.value)}
            inputMode="numeric"
            placeholder={t('roster.yearHint')}
            aria-label={t('roster.year')}
            dir="ltr"
            className="min-h-[38px] w-[104px] shrink-0 border-hair border-ink/40 bg-paper px-2 text-center font-mono text-[12px] tabular-nums text-ink outline-none placeholder:text-muted"
          />
          {yearText !== '' && (
            <Chip live={false} onClick={() => setYear('')} label={t('roster.yearClear')} />
          )}
        </Row>
      )}

      {originsUseful && (
        <p className="mt-0.5 font-body text-[10.5px] leading-snug text-muted">{t('roster.foreignSlot.note')}</p>
      )}

      {/*
        The gap, printed. Filtering 645 names down to the fifty-odd the archive can
        place would read as a complete list of Hapoel's goalkeepers and be wrong by an
        order of magnitude; saying so turns the same screen into an honest one — and
        the "לא מתועד" chip beside it turns the gap into something a reader can look at.
      */}
      <p className="mt-1.5 font-body text-[10.5px] leading-snug text-muted">
        {t('roster.honest', {
          total: String(all.length),
          placed: String(all.length - (counts.position.unknown ?? 0)),
        })}
      </p>

      {isFiltered(filter) && (
        <button
          type="button"
          onClick={() => {
            setYearText('')
            onChange(NO_FILTER)
          }}
          className="mt-1.5 min-h-tap border-hair border-red px-2.5 py-1 font-body text-[11.5px] font-extrabold text-red"
        >
          {t('roster.clear')}
        </button>
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <span className="w-[42px] shrink-0 font-body text-[10px] font-extrabold tracking-wide text-muted">
        {label}
      </span>
      <div className="-mx-0.5 flex flex-1 gap-1 overflow-x-auto px-0.5 pb-1">{children}</div>
    </div>
  )
}

function Chip({
  live,
  onClick,
  label,
  count,
  latin = false,
}: {
  live: boolean
  onClick: () => void
  label: string
  count?: number
  latin?: boolean
}) {
  const empty = count === 0
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={live}
      disabled={empty}
      className={`flex min-h-[38px] shrink-0 items-center gap-1.5 border-hair px-2.5 font-body text-[11.5px] font-extrabold leading-none transition-transform duration-press ease-stamp active:scale-[.96] disabled:opacity-30 motion-reduce:transition-none ${
        live ? 'border-ink bg-ink text-paper' : 'border-ink/40 bg-paper text-ink'
      }`}
    >
      <span dir={latin ? 'ltr' : undefined}>{label}</span>
      {count !== undefined && (
        <span className={`font-mono text-[10px] ${live ? 'text-concrete' : 'text-muted'}`}>
          <Num>{count}</Num>
        </span>
      )}
    </button>
  )
}
