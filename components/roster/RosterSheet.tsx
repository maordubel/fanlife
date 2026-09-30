'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { KitShirt } from '@/components/kit/KitShirt'
import { Num } from '@/components/ui/Num'
import { RosterFilters } from '@/components/roster/RosterFilters'
import { byInitial, filterRoster, isFiltered, NO_FILTER, searchRoster, slotStatusOf, type RosterFilter, type Searchable, compactName } from '@/lib/game/roster-search'
import type { RosterIndex } from '@/lib/game/allTimeXI'
import type { KitSpec } from '@/lib/kit/spec'
import type { ShirtLook } from '@/lib/kit/playerShirt'
import { PlayerShirt } from '@/components/stage/PlayerShirt'
import type { SlotRole } from '@/lib/xi/roles'
import { fitFor, scoutGroups, SCOUT_ORDERS, type ScoutOrder } from '@/lib/xi/scout'
import { useDialog } from '@/components/ui/useDialog'
import { t, type MessageKey } from '@/lib/i18n'

/**
 * גיליון השמות — the way into 653 names, owned in one place.
 *
 * This was written inside the all-time XI and then wanted a second time by the polls
 * wing, which asks six questions whose answer is "one of everybody who ever wore the
 * shirt". Copying it would have been the start of two rosters that drift: the search
 * ranking was tuned once, against Maor's complaint that it could not find a man by his
 * family name, and a second copy would have been tuned again or — much likelier — not
 * tuned at all.
 *
 * The design decisions inside it are the ones the XI arrived at and are not
 * negotiable per caller:
 *  · an empty query shows the WHOLE roster bucketed by family-name initial, because a
 *    truncated alphabetical list neither answers a search nor lets you browse;
 *  · with a term, the grouping is dropped — re-sorting a ranked list into buckets
 *    throws the ranking away;
 *  · the list reserves the fixed tab bar's height plus the home indicator, or the last
 *    name on the sheet cannot be reached.
 *
 * ## `scout` — the drawer gate 1 opens once a position has been chosen (19.9.2026)
 *
 * With it the names are grouped by FIT against the open slot, a sort and a "fit only"
 * toggle appear, and every row carries a ★. **21.9.2026 (players.md §2)** the drawer also
 * keeps the slot in view — a mini formation in the header on a phone, and the whole
 * sheet DOCKED beside the pitch at `lg` (`docked`) — shows every active filter as a
 * removable chip with "clear all", carries the shortlist strip inside it, and prints on
 * each row the spell's years, the foreign-slot badge, the fit mark and a mini kit, the
 * kit drawn only once the row scrolls into view.
 *
 * ## `initialFilter` — gate 7 opens the sheet already narrowed (21.9.2026)
 *
 * "Who is your keeper" opens on the goalkeepers, "the best foreigner" on the foreign-slot
 * men — the question's own filter, removable like any other, and never a list of
 * featured names the app chose (a counted vote must not be steered).
 */
export type ScoutProps = {
  /** the open slot's detailed role. Mapped down to the four canonical positions in `lib/xi/roles.ts` */
  role: SlotRole
  /** what the slot is called on the pitch, for the drawer's own heading */
  roleHe: string
  order: ScoutOrder
  onOrder: (next: ScoutOrder) => void
  fitOnly: boolean
  onFitOnly: (next: boolean) => void
  /** keys (`rosterKey`) of the starred men */
  shortlist: ReadonlySet<string>
  onShortlist: (entry: Searchable) => void
  /** the starred men, in starring order — the strip inside the drawer */
  shortlistEntries?: readonly Searchable[]
  /** the formation, drawn small in the header with the open slot marked */
  mini?: { slots: ReadonlyArray<{ slotId: string; x: number; y: number }>; active: string }
  /**
   * The challenge gate (`lib/xi/challenge.ts`): a reason string hides the man, and every
   * hidden man is COUNTED under the list by reason — never silently dropped.
   */
  refuse?: (entry: Searchable) => string | null
  /** turns the counts of hidden men into the sentence under the list */
  describeHidden?: (counts: Readonly<Record<string, number>>) => string | null
  /** the years and the shirt of the spell this man would be picked as, under the current filters */
  rowInfo?: (entry: Searchable, filter: RosterFilter) => RowInfo
}

export type RowInfo = {
  /** the spell's years, as one LTR run */
  years: string | null
  kit: KitSpec | null
  kitSeason: string | null
  /** his REAL shirt (delta 88, `lib/kit/playerShirt.ts`) — drawn instead of `kit` when present */
  look?: ShirtLook | null
}

/** The one key a row is known by: the Player Master id where it has one. */
export function rosterKey(entry: Searchable): string {
  return entry.id ?? entry.slug
}

/**
 * A man with no season on record still gets a SHIRT — a plain red home jersey, no
 * sponsor, no crest, no number (round 2, Maor: the ink-block-with-a-letter was ugly).
 * Generic on purpose: it never claims a season the archive doesn't have.
 */
export const NEUTRAL_SHIRT_SPEC: KitSpec = {
  seasonLabel: '',
  variant: 'home',
  base: 'red',
  pattern: 'solid',
  patternInk: 'cream',
  sleeves: 'raglan',
  sleeveInk: 'cream',
  collar: 'crew',
  collarInk: 'cream',
  sponsorHe: null,
  makerHe: null,
  nameset: 'block-solid',
  number: null,
  shorts: 'cream',
  socks: 'red',
  crestKey: null,
}

type SheetProps = {
  title: string
  roster: RosterIndex
  /** keys (`rosterKey`) already standing somewhere — dimmed, not removed */
  taken?: ReadonlySet<string>
  /** the pick, with the filters that were active when it was made (the version follows them) */
  onPick: (entry: Searchable, filter: RosterFilter) => void
  onClose: () => void
  /** gate 1's scouting drawer. Omit it and this is the sheet gate 7 has always had. */
  scout?: ScoutProps
  /** anything the caller wants under the list */
  footer?: ReactNode
  /** gate 7: the question's own filter, applied on open and removable like any chip */
  initialFilter?: Partial<RosterFilter>
  /** gate 1 at `lg`: a panel beside the pitch instead of a sheet over it */
  docked?: boolean
}

export function RosterSheet(props: SheetProps) {
  return props.docked ? <DockedShell {...props} /> : <ModalShell {...props} />
}

function ModalShell(props: SheetProps) {
  // (delta 88: the phone's picking moved to `PickRail`, docked under the pitch — this
  // sheet is the full searchable list again, with no card rail and no drag to hide for)
  const dialogRef = useDialog<HTMLDivElement>(props.onClose)
  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-[60] flex flex-col bg-ink/70 outline-none"
      role="dialog"
      aria-modal="true"
      aria-label={props.title}
    >
      <button type="button" aria-label={t('xi.close')} className="min-h-[8vh] flex-1" onClick={props.onClose} />
      <div className="max-h-[84vh] animate-slam-solid overflow-y-auto overscroll-contain border-t-rule border-ink bg-sheet">
        <RosterBody {...props} />
      </div>
    </div>
  )
}

/**
 * Docked beside the pitch — no scrim, no focus trap, because the pitch it sits beside is
 * still the thing being built. Escape still closes it.
 */
function DockedShell(props: SheetProps) {
  return (
    <section
      aria-label={props.title}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation()
          props.onClose()
        }
      }}
      className="max-h-[calc(100vh-7rem)] overflow-y-auto overscroll-contain border-rule border-ink bg-sheet"
    >
      <RosterBody {...props} />
    </section>
  )
}

function RosterBody({
  title,
  roster,
  taken,
  onPick,
  onClose,
  scout,
  footer,
  initialFilter,
  docked = false,
}: SheetProps) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<RosterFilter>({ ...NO_FILTER, ...initialFilter })
  /**
   * The facet rows, folded away while scouting — on a 390px phone search + five filter
   * rows + fit and sort left four names visible. What IS active is always shown as chips
   * above the list, so folding never hides a filter that is narrowing the names.
   */
  // Gate 7 opens them as it always did — unless the question already narrowed the sheet,
  // in which case the chip says so and the names get the room.
  const narrowedOnOpen = initialFilter !== undefined && isFiltered({ ...NO_FILTER, ...initialFilter })
  const [facetsOpen, setFacetsOpen] = useState(!scout && !narrowedOnOpen)
  const foldable = scout !== undefined || narrowedOnOpen

  // Filter first, search second: the counts on the chips then describe the set the
  // reader is looking at.
  const narrowed = useMemo(() => filterRoster(roster.all, filter), [roster.all, filter])
  const searched = useMemo(() => searchRoster(narrowed, query), [query, narrowed])

  // The challenge gate. Hidden men are counted by reason and the sentence says so.
  const refuse = scout?.refuse
  const { results, hidden } = useMemo(() => {
    if (!refuse) return { results: searched, hidden: {} as Record<string, number> }
    const counts: Record<string, number> = {}
    const kept: Searchable[] = []
    for (const entry of searched) {
      const why = refuse(entry)
      if (why === null) kept.push(entry)
      else counts[why] = (counts[why] ?? 0) + 1
    }
    return { results: kept, hidden: counts }
  }, [searched, refuse])

  const grouped = useMemo(
    () =>
      scout || query.trim() !== '' || refuse
        ? null
        : isFiltered(filter)
          ? byInitial(narrowed)
          : roster.letters,
    [scout, query, filter, narrowed, roster.letters, refuse],
  )
  const buckets = useMemo(
    () => (scout ? scoutGroups(results, scout.role, scout.order, scout.fitOnly) : null),
    [scout, results],
  )

  const shown = buckets
    ? buckets.fit.length + buckets.other.length + buckets.unknown.length
    : results.length
  const hiddenLine = scout?.describeHidden ? scout.describeHidden(hidden) : null
  const pick = (entry: Searchable) => onPick(entry, filter)

  const rowProps = (entry: Searchable) => ({
    entry,
    taken: taken?.has(rosterKey(entry)) ?? false,
    onPick: () => pick(entry),
    starred: scout?.shortlist.has(rosterKey(entry)) ?? false,
    onStar: scout ? () => scout.onShortlist(entry) : undefined,
    info: scout?.rowInfo ? scout.rowInfo(entry, filter) : undefined,
    fit: scout ? fitFor(entry, scout.role) === 'fit' : false,
  })

  return (
    <>
      <div className="sticky top-0 z-10 border-b-hair border-ink bg-sheet px-4 pb-2 pt-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            {/* the formation, small, with the open slot marked — the slot stays in view
                on a phone, where the sheet covers the pitch */}
            {scout?.mini && !docked && <MiniFormation slots={scout.mini.slots} active={scout.mini.active} />}
            <div className="min-w-0">
              <p className="font-display text-step-1 leading-tight text-ink">{title}</p>
              {scout && (
                <p className="mt-0.5 font-body text-[11px] leading-snug text-muted">
                  {t('scout.lede', { role: scout.roleHe })}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-tap shrink-0 px-2 font-body text-[12px] font-extrabold text-red"
          >
            {t('xi.close')}
          </button>
        </div>
        <>
            <div className="mt-2 flex items-stretch gap-2">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('xi.search')}
                aria-label={t('xi.search')}
                inputMode="search"
                className="min-h-tap w-full min-w-0 border-hair border-ink bg-paper px-3 font-body text-step-0 text-ink outline-none placeholder:text-muted focus-visible:border-rule"
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
              {query === '' && !isFiltered(filter) && !scout && !refuse
                ? t('xi.count', { n: String(roster.total) })
                : t('roster.count', { shown: String(shown), total: String(roster.total) })}
            </p>

            <ActiveFilters filter={filter} onChange={setFilter} />


            {foldable && (
              <button
                type="button"
                onClick={() => setFacetsOpen(!facetsOpen)}
                aria-expanded={facetsOpen}
                className={`mt-1.5 flex min-h-tap w-full items-center justify-between gap-2 border-hair px-2.5 font-body text-[11.5px] font-extrabold leading-none ${
                  isFiltered(filter) ? 'border-red text-red' : 'border-ink/40 text-ink'
                }`}
              >
                <span>{t('roster.find')}</span>
                <span aria-hidden="true" className="font-mono text-[13px]">
                  {facetsOpen ? '−' : '+'}
                </span>
              </button>
            )}

            {facetsOpen && (
              <RosterFilters all={roster.all} filter={filter} onChange={setFilter} showYear={scout !== undefined} />
            )}

            {scout && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => scout.onFitOnly(!scout.fitOnly)}
                  aria-pressed={scout.fitOnly}
                  className={`min-h-tap border-hair px-2.5 font-body text-[11.5px] font-extrabold leading-none transition-transform duration-press ease-stamp active:scale-[.96] motion-reduce:transition-none ${
                    scout.fitOnly ? 'border-ink bg-ink text-paper' : 'border-ink/40 bg-paper text-ink'
                  }`}
                >
                  {t('scout.fitOnly')}
                </button>
                <div className="-mx-0.5 flex flex-1 gap-1 overflow-x-auto px-0.5">
                  {SCOUT_ORDERS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => scout.onOrder(option)}
                      aria-pressed={scout.order === option}
                      className={`flex min-h-tap shrink-0 items-center border-hair px-2.5 font-body text-[11.5px] font-extrabold leading-none transition-transform duration-press ease-stamp active:scale-[.96] motion-reduce:transition-none ${
                        scout.order === option ? 'border-ink bg-ink text-paper' : 'border-ink/40 bg-paper text-ink'
                      }`}
                    >
                      {t(`scout.order.${option}` as MessageKey)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* the shortlist, inside the drawer — the argument you have not settled yet */}
            {scout && scout.shortlistEntries && scout.shortlistEntries.length > 0 && (
              <div className="mt-1.5">
                <p className="font-body text-[10px] font-extrabold tracking-wide text-muted">{t('xi.shortlist.title')}</p>
                <ul className="-mx-0.5 mt-1 flex gap-1 overflow-x-auto px-0.5 pb-1">
                  {scout.shortlistEntries.map((entry) => {
                    const key = rosterKey(entry)
                    const blocked = (taken?.has(key) ?? false) || (refuse ? refuse(entry) !== null : false)
                    return (
                      <li key={key} className="flex shrink-0 items-stretch">
                        <button
                          type="button"
                          disabled={blocked}
                          onClick={() => pick(entry)}
                          className="flex min-h-tap items-center border-hair border-ink/40 bg-paper px-2.5 font-body text-[11.5px] font-extrabold text-ink disabled:opacity-40"
                        >
                          <span aria-hidden="true" className="me-1">
                            ★
                          </span>
                          {compactName(entry.nameHe)}
                        </button>
                        <button
                          type="button"
                          onClick={() => scout.onShortlist(entry)}
                          aria-label={t('xi.shortlist.drop', { name: entry.nameHe })}
                          className="min-h-tap border-hair border-s-0 border-ink/40 bg-paper px-2 font-body text-[13px] leading-none text-muted"
                        >
                          ×
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {/* the letter rail — family-name initials */}
            {grouped && (
              <ol className="-mx-1 mt-1.5 flex gap-1 overflow-x-auto pb-1">
                {grouped.map((bucket) => (
                  <li key={bucket.letter}>
                    <a
                      href={`#roster-letter-${bucket.letter}`}
                      className="flex h-8 min-w-8 items-center justify-center border-hair border-ink/40 px-1.5 font-poster text-[17px] leading-none text-ink"
                    >
                      {bucket.letter}
                    </a>
                  </li>
                ))}
              </ol>
            )}
        </>
      </div>

      <div className="px-2 pb-[calc(var(--tap)+2rem+env(safe-area-inset-bottom))]">
        {hiddenLine && (
          <p className="mx-2 mt-2 border-s-rule border-red ps-2 font-body text-[11px] leading-snug text-ink">
            {hiddenLine}
          </p>
        )}
        {buckets ? (
          (
            [
              ['fit', buckets.fit],
              ['other', buckets.other],
              ['unknown', buckets.unknown],
            ] as const
          ).map(([group, names]) =>
            names.length === 0 ? null : (
              <section key={group}>
                <h4 className="sticky top-0 z-[5] flex items-baseline justify-between gap-2 border-b-hair border-ink bg-ink px-2 py-1 text-paper">
                  <span className="font-sign text-[13px] leading-tight">{t(`scout.group.${group}` as MessageKey)}</span>
                  <span className="font-mono text-[10px]">
                    <Num>{names.length}</Num>
                  </span>
                </h4>
                {group === 'unknown' && (
                  <p className="px-2 py-1.5 font-body text-[10.5px] leading-snug text-muted">
                    {t('scout.group.unknown.note')}
                  </p>
                )}
                <ol>
                  {names.map((entry) => (
                    <NameRow key={rosterKey(entry)} {...rowProps(entry)} />
                  ))}
                </ol>
              </section>
            ),
          )
        ) : grouped ? (
          grouped.map((bucket) => (
            <section key={bucket.letter}>
              <h4
                id={`roster-letter-${bucket.letter}`}
                className="sticky top-0 z-[5] scroll-mt-24 border-b-hair border-ink bg-ink px-2 py-1 font-poster text-[18px] leading-none text-paper"
              >
                {bucket.letter}
              </h4>
              <ol>
                {bucket.names.map((entry) => (
                  <NameRow key={rosterKey(entry)} {...rowProps(entry)} />
                ))}
              </ol>
            </section>
          ))
        ) : (
          <ol>
            {results.map((entry) => (
              <NameRow key={rosterKey(entry)} {...rowProps(entry)} />
            ))}
          </ol>
        )}
        {shown === 0 && <p className="px-2 py-6 text-center font-body text-step--1 text-muted">{t('xi.none')}</p>}
        {footer}
      </div>
    </>
  )
}

/**
 * מסננים פעילים — every filter that is narrowing the names, as a chip that removes it,
 * plus one "clear all". Printed whether the facet rows are open or folded: a filter the
 * reader cannot see is a list that looks complete and is not.
 */
function ActiveFilters({ filter, onChange }: { filter: RosterFilter; onChange: (next: RosterFilter) => void }) {
  if (!isFiltered(filter)) return null
  const chips: Array<{ key: string; label: string; clear: Partial<RosterFilter> }> = []
  if (filter.position !== 'any') {
    chips.push({ key: 'position', label: t(POSITION_LABEL[filter.position]), clear: { position: 'any' } })
  }
  if (filter.origin !== 'any') {
    chips.push({ key: 'origin', label: t(SLOT_LABEL[filter.origin]), clear: { origin: 'any' } })
  }
  if (filter.decade !== 'any') {
    chips.push({ key: 'decade', label: t('roster.decade', { n: String(filter.decade) }), clear: { decade: 'any' } })
  }
  if (filter.year !== null) {
    chips.push({ key: 'year', label: t('scout.active.year', { n: String(filter.year) }), clear: { year: null } })
  }
  if (filter.letter !== 'any') {
    chips.push({ key: 'letter', label: t('scout.active.letter', { n: filter.letter }), clear: { letter: 'any' } })
  }
  return (
    <div role="group" aria-label={t('scout.active.title')} className="mt-1.5 flex flex-wrap items-center gap-1">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onChange({ ...filter, ...chip.clear })}
          aria-label={t('scout.active.remove', { label: chip.label })}
          className="flex min-h-[36px] items-center gap-1.5 border-hair border-ink bg-ink px-2.5 font-body text-[11.5px] font-extrabold leading-none text-paper transition-transform duration-press ease-stamp active:scale-[.96] motion-reduce:transition-none"
        >
          <span dir="auto">{chip.label}</span>
          <span aria-hidden="true" className="font-mono text-[13px]">
            ×
          </span>
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange(NO_FILTER)}
        className="min-h-[36px] px-2 font-body text-[11.5px] font-extrabold text-red underline decoration-1 underline-offset-2"
      >
        {t('scout.active.clear')}
      </button>
    </div>
  )
}

const POSITION_LABEL: Record<Exclude<RosterFilter['position'], 'any'>, MessageKey> = {
  GK: 'roster.pos.GK',
  DF: 'roster.pos.DF',
  MF: 'roster.pos.MF',
  FW: 'roster.pos.FW',
  unknown: 'roster.pos.unknown',
}

const SLOT_LABEL: Record<Exclude<RosterFilter['origin'], 'any'>, MessageKey> = {
  israeli: 'roster.origin.israeli',
  foreign: 'roster.origin.foreign',
  unknown: 'roster.slot.unknown',
}

/** The formation, 11 dots on a tiny pitch, the open slot filled — mirrored to match the RTL pitch. */
function MiniFormation({
  slots,
  active,
}: {
  slots: ReadonlyArray<{ slotId: string; x: number; y: number }>
  active: string
}) {
  return (
    <svg
      viewBox="0 0 60 78"
      className="h-[58px] w-[45px] shrink-0 border-hair border-ink bg-paper"
      role="img"
      aria-label={t('scout.mini.aria')}
    >
      <g fill="none" stroke="rgb(var(--ink) / .35)" strokeWidth="1">
        <rect x="3" y="3" width="54" height="72" />
        <path d="M3 39H57" />
        <rect x="18" y="3" width="24" height="10" />
        <rect x="18" y="65" width="24" height="10" />
      </g>
      {slots.map((slot) => {
        const live = slot.slotId === active
        // The pitch places a slot at `inset-inline-start: x%`, so in this RTL app a low x
        // stands on the RIGHT. The drawing is physical, so it mirrors x to agree with it.
        return (
          <rect
            key={slot.slotId}
            x={3 + ((100 - slot.x) / 100) * 54 - (live ? 4 : 2.5)}
            y={3 + (slot.y / 100) * 72 - (live ? 4 : 2.5)}
            width={live ? 8 : 5}
            height={live ? 8 : 5}
            fill={live ? 'rgb(var(--red))' : 'rgb(var(--ink) / .55)'}
            stroke={live ? 'rgb(var(--ink))' : 'none'}
            strokeWidth="1"
          />
        )
      })}
    </svg>
  )
}

/**
 * שורת שם — the family name first, in the display face, the given name after it; and, in
 * the scouting drawer, the badges a scout reads at a glance: the spell's years, the
 * foreign-slot badge (the club's record, labelled as one — not nationality), the fit mark
 * and the shirt of that spell, drawn only once the row is on screen.
 *
 * The ★ is a SIBLING of the name button, never inside it: a button inside a button is
 * invalid markup and, on a phone, a tap that lands in the ambiguity picks a man you were
 * only marking.
 */
function NameRow({
  entry,
  taken,
  onPick,
  starred = false,
  onStar,
  info,
  fit = false,
}: {
  entry: Searchable
  taken: boolean
  onPick: () => void
  starred?: boolean
  onStar?: () => void
  info?: RowInfo
  fit?: boolean
}) {
  const foreign = slotStatusOf(entry) === 'foreign'
  return (
    <li className="flex items-stretch gap-1 border-b-hair border-ink/20">
      <button
        type="button"
        onClick={onPick}
        disabled={taken}
        className="flex min-h-tap min-w-0 flex-1 items-center gap-2 px-2 py-1 text-start disabled:opacity-35"
      >
        {info && (
          <span className="grid h-9 w-8 shrink-0 place-items-center" aria-hidden="true">
            {info.look ? (
              <PlayerShirt look={info.look} className="h-9 w-8" />
            ) : info.kit ? (
              <LazyKit spec={info.kit} />
            ) : (
              <span className="block h-7 w-6 border-hair border-dashed border-ink/30" />
            )}
          </span>
        )}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="font-sign text-step-0 leading-tight text-ink">{compactName(entry.nameHe)}</span>
            {entry.givenHe !== '' && (
              <span className="min-w-0 truncate font-body text-[12px] leading-tight text-muted">{entry.givenHe}</span>
            )}
          </span>
          {(info || foreign) && (
            <span className="mt-0.5 flex flex-wrap items-center gap-1">
              {info?.years && (
                <span className="font-mono text-[10.5px] tabular-nums leading-none text-muted">
                  <Num>{info.years}</Num>
                </span>
              )}
              {foreign && (
                <span
                  title={t('scout.badge.foreign.aria')}
                  className="border-hair border-sign px-1 py-[1px] font-body text-[9.5px] font-extrabold leading-none text-sign"
                >
                  {t('scout.badge.foreign')}
                  <span className="sr-only"> — {t('scout.badge.foreign.aria')}</span>
                </span>
              )}
              {fit && (
                <span className="border-hair border-ink px-1 py-[1px] font-body text-[9.5px] font-extrabold leading-none text-ink">
                  <span aria-hidden="true">✓ </span>
                  {t('scout.badge.fit')}
                </span>
              )}
            </span>
          )}
        </span>
        {/*
          The position, only when a source states one, and never as colour alone. An
          inferred position (a man's slot in ONE recorded XI) is marked with a degree sign.
        */}
        {entry.position && (
          <span className="shrink-0 border-hair border-ink/30 px-1.5 py-[2px] font-body text-[9.5px] font-extrabold leading-none text-muted">
            {t(`roster.pos.${entry.position}` as MessageKey)}
            {entry.positionFrom === 'lineup' && <span aria-hidden="true">°</span>}
          </span>
        )}
      </button>
      {onStar && (
        <button
          type="button"
          onClick={onStar}
          aria-pressed={starred}
          aria-label={t('scout.star', { name: entry.nameHe })}
          className={`min-h-tap w-tap shrink-0 border-s-hair border-ink/20 font-body text-[15px] leading-none ${
            starred ? 'bg-ink text-paper' : 'text-muted'
          }`}
        >
          ★
        </button>
      )}
    </li>
  )
}

/**
 * The mini kit, drawn only once its row is near the viewport — a fit list can be two
 * hundred rows, and two hundred shirts nobody has scrolled to are two hundred SVGs the
 * phone draws for nothing. Once drawn it stays drawn.
 */
function LazyKit({ spec }: { spec: KitSpec }) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    if (seen) return
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((row) => row.isIntersecting)) {
          setSeen(true)
          observer.disconnect()
        }
      },
      { rootMargin: '160px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [seen])
  return (
    <span ref={ref} className="block h-8 w-7">
      {seen && <KitShirt spec={spec} density="mini" className="block h-full w-full" />}
    </span>
  )
}
