'use client'

import { useEffect, useMemo, useState } from 'react'

import { conditionLabel, sizeLabel, typeLabel } from '@/lib/fanlife/collector/labels'
import { CONDITIONS, ITEM_TYPES, SIZES } from '@/lib/collector/types'
import type { Condition, Currency, ItemType, Size } from '@/lib/collector/types'
import { activeCount, type HubFilters as Filters, type HubShirt } from '@/lib/fanlife/hub/query'
import type { HubFacets } from '@/lib/fanlife/hub/types'
import { h } from '@/lib/fanlife/hub/copy'
import { countryFlag, countryName } from '@/lib/fanlife/hub/places'
import { t } from '@/lib/fanlife/i18n'
import { isWorldSlug, worldClubs } from '@/lib/fanlife/world'

import { Chip, Rail, buttonPlain } from './HubParts'

const VARIANT_LABEL: Record<string, string> = { home: 'Home', away: 'Away', third: 'Third', fourth: 'Fourth', gk: 'Keeper', special: 'Special' }
const toggle = <T,>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

/**
 * The market's filter rails. Counts come from the database (each rail is counted with every OTHER filter on,
 * so a chip says how many copies choosing it would leave). On a phone the rails fold behind one button that
 * shows how many narrowings are on; from `md` up they are always open.
 */
export function HubFilters({
  filters,
  onChange,
  shirts,
  facets,
  showCopyRails = true,
  myCountry = null,
  panelOpen,
}: {
  filters: Filters
  onChange: (next: Filters) => void
  shirts: Readonly<Record<string, HubShirt>>
  facets: HubFacets | null
  /** the wanted board filters by shirt only; size / condition / price rails are for copies */
  showCopyRails?: boolean
  /** the collector's own country, when they have told us: powers "ships to me" */
  myCountry?: string | null
  /** when the page owns the Filters button (the market hero), it says whether the rails are open */
  panelOpen?: boolean
}) {
  const [own, setOpen] = useState(false)
  const external = panelOpen !== undefined
  const open = external ? panelOpen : own
  const set = (patch: Partial<Filters>) => onChange({ ...filters, slug: null, ...patch })
  const clubs = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of Object.values(shirts)) if (s.club && s.clubName && !isWorldSlug(s.slug)) m.set(s.club, s.clubName)
    return [...m].sort((a, b) => a[1].localeCompare(b[1]))
  }, [shirts])
  const decades = useMemo(() => {
    const pool = Object.values(shirts).filter((s) => !isWorldSlug(s.slug) && (!filters.club || s.club === filters.club))
    return [...new Set(pool.map((s) => s.decade))].sort((a, b) => a - b)
  }, [shirts, filters.club])
  const variants = useMemo(() => [...new Set(Object.values(shirts).filter((s) => !isWorldSlug(s.slug)).map((s) => s.variant))].filter((v) => VARIANT_LABEL[v]), [shirts])
  const count = activeCount(filters)
  const [price, setPrice] = useState(filters.maxPrice ? String(filters.maxPrice) : '')
  useEffect(() => setPrice(filters.maxPrice ? String(filters.maxPrice) : ''), [filters.maxPrice])

  return (
    <section aria-label={h('hub.filters.title')} className={external ? `fl-mk-filters ${open ? '' : 'hidden'}` : 'mt-3 border-rule border-ink bg-sheet p-2.5'} data-hub="filters">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className={`${buttonPlain} flex-1 md:hidden ${external ? 'hidden' : ''}`}>
          {h('hub.filters.title')}
          {count ? ` · ${count}` : ''}
          <span aria-hidden="true" className="ms-2">{open ? '▴' : '▾'}</span>
        </button>
        <h3 className="hidden font-body text-[11px] font-extrabold uppercase tracking-wide text-muted md:block">{h('hub.filters.title')}</h3>
        {count ? (
          <button type="button" onClick={() => onChange({ ...filters, scope: 'all', slug: null, club: null, decade: null, variant: null, kind: null, sizes: [], conditions: [], types: [], delivery: null, maxPrice: null, country: null, city: null, reach: null })} className="min-h-tap px-2 font-body text-[12px] font-extrabold text-sign underline underline-offset-4">
            {h('hub.filters.clear')}
          </button>
        ) : null}
      </div>

      <div className={external ? 'block' : `${open ? 'block' : 'hidden'} md:block`}>
        {filters.scope === 'world' ? (
          <Rail label={h('hub.world.clubs')}>
            <Chip on={!filters.club} onClick={() => set({ club: null })} label={h('hub.all')} />
            {Object.entries(facets?.clubs ?? {}).sort((a, b) => b[1] - a[1]).map(([key, n]) => (
              <Chip key={key} on={filters.club === key} onClick={() => set({ club: filters.club === key ? null : key })} label={worldClubs().get(key) ?? key} count={n} />
            ))}
          </Rail>
        ) : null}
        {filters.scope !== 'world' && clubs.length > 1 ? (
          <Rail label={h('hub.rail.club')}>
            <Chip on={!filters.club} onClick={() => set({ club: null, decade: null })} label={h('hub.all')} />
            {clubs.map(([id, name]) => (
              <Chip key={id} on={filters.club === id} onClick={() => set({ club: filters.club === id ? null : id, decade: null })} label={name} />
            ))}
          </Rail>
        ) : null}
        {filters.scope !== 'world' && decades.length > 1 ? (
          <Rail label={h('hub.rail.decade')}>
            <Chip on={!filters.decade} onClick={() => set({ decade: null })} label={h('hub.all')} />
            {decades.map((d) => (
              <Chip key={d} on={filters.decade === d} onClick={() => set({ decade: filters.decade === d ? null : d })} label={`${d}s`} />
            ))}
          </Rail>
        ) : null}
        {filters.scope !== 'world' && variants.length > 1 ? (
          <Rail label={h('hub.rail.kit')}>
            <Chip on={!filters.variant} onClick={() => set({ variant: null })} label={h('hub.all')} />
            {variants.map((v) => (
              <Chip key={v} on={filters.variant === v} onClick={() => set({ variant: filters.variant === v ? null : v })} label={VARIANT_LABEL[v]!} />
            ))}
          </Rail>
        ) : null}

        {showCopyRails ? (
          <>
            <Rail label={h('hub.rail.deal')}>
              <Chip on={!filters.kind} onClick={() => set({ kind: null })} label={h('hub.all')} count={facets?.total} />
              <Chip on={filters.kind === 'sale'} onClick={() => set({ kind: filters.kind === 'sale' ? null : 'sale' })} label={t('collector.forSale')} count={facets?.sale} />
              <Chip on={filters.kind === 'trade'} onClick={() => set({ kind: filters.kind === 'trade' ? null : 'trade' })} label={t('collector.forTrade')} count={facets?.trade} />
            </Rail>
            <Rail label={h('hub.rail.size')}>
              {SIZES.map((s: Size) => (
                <Chip key={s} on={filters.sizes.includes(s)} onClick={() => set({ sizes: toggle(filters.sizes, s) })} label={sizeLabel(s)} count={facets?.sizes[s]} disabled={!filters.sizes.includes(s) && facets !== null && !facets.sizes[s]} />
              ))}
            </Rail>
            <Rail label={h('hub.rail.condition')}>
              {CONDITIONS.map((c: Condition) => (
                <Chip key={c} on={filters.conditions.includes(c)} onClick={() => set({ conditions: toggle(filters.conditions, c) })} label={conditionLabel(c)} count={facets?.conditions[c]} disabled={!filters.conditions.includes(c) && facets !== null && !facets.conditions[c]} />
              ))}
            </Rail>
            <Rail label={h('hub.rail.type')}>
              {ITEM_TYPES.filter((x) => x !== 'unknown').map((x: ItemType) => (
                <Chip key={x} on={filters.types.includes(x)} onClick={() => set({ types: toggle(filters.types, x) })} label={typeLabel(x)} count={facets?.itemTypes[x]} disabled={!filters.types.includes(x) && facets !== null && !facets.itemTypes[x]} />
              ))}
            </Rail>
            {(myCountry || Object.keys(facets?.countries ?? {}).length > 1 || filters.country) ? (
              <Rail label={h('hub.rail.where')}>
                <Chip on={!filters.country && !filters.reach} onClick={() => set({ country: null, city: null, reach: null })} label={h('hub.all')} />
                {myCountry ? (
                  <Chip on={filters.reach === myCountry} onClick={() => set({ reach: filters.reach === myCountry ? null : myCountry, country: null, city: null })} label={h('hub.filters.shipsToMe')} />
                ) : null}
                {Object.entries(facets?.countries ?? {}).sort((a, b) => b[1] - a[1]).map(([cc, n]) => (
                  <Chip key={cc} on={filters.country === cc} onClick={() => set({ country: filters.country === cc ? null : cc, city: null, reach: null })} label={`${countryFlag(cc)} ${countryName(cc)}`} count={n} />
                ))}
              </Rail>
            ) : null}
            <Rail label={h('hub.rail.delivery')}>
              <Chip on={!filters.delivery} onClick={() => set({ delivery: null })} label={h('hub.all')} />
              <Chip on={filters.delivery === 'ship'} onClick={() => set({ delivery: filters.delivery === 'ship' ? null : 'ship' })} label={h('hub.delivery.ship')} />
              <Chip on={filters.delivery === 'local'} onClick={() => set({ delivery: filters.delivery === 'local' ? null : 'local' })} label={h('hub.delivery.local')} />
            </Rail>
            <form
              className="mt-1.5 flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                const n = Number(price.replace(',', '.'))
                set({ maxPrice: Number.isFinite(n) && n > 0 ? n : null })
              }}
            >
              <label htmlFor="hub-max" className="w-[52px] shrink-0 font-body text-[10px] font-extrabold uppercase tracking-wide text-muted">{h('hub.rail.price')}</label>
              <input
                id="hub-max"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={h('hub.price.placeholder')}
                className="min-h-tap w-24 border-hair border-ink/40 bg-paper px-2 font-body text-[13px] text-ink"
              />
              <select
                aria-label={h('hub.price.currency')}
                value={filters.currency}
                onChange={(e) => onChange({ ...filters, currency: e.target.value as Currency })}
                className="min-h-tap border-hair border-ink/40 bg-paper px-1 font-body text-[13px] text-ink"
              >
                <option value="EUR">EUR</option>
                <option value="ILS">ILS</option>
                <option value="USD">USD</option>
              </select>
              <button type="submit" className="min-h-tap border-hair border-ink bg-ink px-3 font-body text-[12px] font-extrabold text-paper">{h('hub.price.apply')}</button>
            </form>
          </>
        ) : null}
      </div>
    </section>
  )
}
