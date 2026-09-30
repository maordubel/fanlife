'use client'

import { SlideSheet } from '@/components/stage/SlideSheet'
import { NO_FILTERS, activeFilterCount, filterOptions, type Filters, type JourneyData } from '@/lib/away-days/journey'
import type { Result } from '@/lib/away-days/types'
import { t } from '@/lib/i18n'

/** Explore's filters — decade, country, competition, result — in one sheet (spec §23.2). */
export function AwayDaysFilters({
  data,
  open,
  filters,
  shown,
  onChange,
  onClose,
}: {
  data: JourneyData
  open: boolean
  filters: Filters
  shown: number
  onChange: (next: Filters) => void
  onClose: () => void
}) {
  const options = filterOptions(data)
  const results: { value: Result; label: string }[] = [
    { value: 'W', label: t('away.result.win') },
    { value: 'D', label: t('away.result.draw') },
    { value: 'L', label: t('away.result.loss') },
  ]
  return (
    <SlideSheet
      open={open}
      onClose={onClose}
      title={t('away.explore.filters')}
      latin="FILTER"
      size="auto"
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange(NO_FILTERS)}
            disabled={activeFilterCount(filters) === 0}
            data-away="filters-clear"
            className="min-h-tap shrink-0 border-hair border-ink/40 px-3 font-body text-[12px] font-extrabold text-ink disabled:opacity-40"
          >
            {t('away.filter.clear')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-tap flex-1 items-center justify-center bg-red px-3 font-body text-step--1 font-extrabold text-paper transition-transform duration-press ease-stamp active:scale-[.97] motion-reduce:transition-none"
          >
            {t('away.filter.show', { n: String(shown) })}
          </button>
        </div>
      }
    >
      <Group label={t('away.filter.decade')}>
        {options.decades.map((d) => (
          <Chip key={d} on={filters.decade === d} onClick={() => onChange({ ...filters, decade: filters.decade === d ? null : d })}>
            <span dir="ltr" className="font-mono tabular-nums">
              {d}s
            </span>
          </Chip>
        ))}
      </Group>
      <Group label={t('away.filter.competition')}>
        {options.competitions.map((c) => (
          <Chip key={c} on={filters.competition === c} onClick={() => onChange({ ...filters, competition: filters.competition === c ? null : c })}>
            {c}
          </Chip>
        ))}
      </Group>
      <Group label={t('away.filter.result')}>
        {results.map((r) => (
          <Chip key={r.value} on={filters.result === r.value} onClick={() => onChange({ ...filters, result: filters.result === r.value ? null : r.value })}>
            {r.label}
          </Chip>
        ))}
      </Group>
      <Group label={t('away.filter.country')}>
        {options.countries.map((c) => (
          <Chip key={c.code} on={filters.country === c.code} onClick={() => onChange({ ...filters, country: filters.country === c.code ? null : c.code })}>
            {c.he}
          </Chip>
        ))}
      </Group>
    </SlideSheet>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="mb-3">
      <legend className="mb-1.5 font-sign text-[13px] text-sign">{label}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex min-h-tap items-center gap-1.5 border-hair px-3 font-body text-[12px] font-extrabold transition-transform duration-press ease-stamp active:scale-[.96] motion-reduce:transition-none ${
        on ? 'border-ink bg-ink text-paper' : 'border-ink/40 bg-paper text-ink'
      }`}
    >
      {on && (
        <span aria-hidden="true" className="text-[11px] leading-none">
          ✓
        </span>
      )}
      {children}
    </button>
  )
}
