'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { Badge } from '@/components/clubs/Badge'
import { livery } from '@/lib/club-livery'
import { conditionLabel, sizeLabel, typeLabel } from '@/lib/fanlife/collector/labels'
import { CONDITIONS, ITEM_TYPES, SIZES } from '@/lib/collector/types'
import type { Condition, Currency, ItemType, Size } from '@/lib/collector/types'
import { fl } from '@/lib/fanlife/copy'
import { activeCount, type HubFilters as Filters, type HubShirt } from '@/lib/fanlife/hub/query'
import type { HubFacets } from '@/lib/fanlife/hub/types'
import { h } from '@/lib/fanlife/hub/copy'
import { countryFlag, countryName } from '@/lib/fanlife/hub/places'
import { t } from '@/lib/fanlife/i18n'
import { isWorldSlug, worldClubs } from '@/lib/fanlife/world'

const VARIANT_LABEL: Record<string, string> = { home: 'Home', away: 'Away', third: 'Third', fourth: 'Fourth', gk: 'Keeper', special: 'Special' }
const toggle = <T,>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

/** a desktop lays the options out on the page; a phone keeps them in a sheet behind one button */
function useDesk(): boolean | null {
  const [desk, setDesk] = useState<boolean | null>(null)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 901px)')
    const read = () => setDesk(mq.matches)
    read()
    mq.addEventListener('change', read)
    return () => mq.removeEventListener('change', read)
  }, [])
  return desk
}

function Group({ label, aside, children }: { label: string; aside?: string | null; children: ReactNode }) {
  return (
    <div className="wkc-fgroup" role="group" aria-label={label}>
      <div className="wkc-fgroup-h"><h3 className="wk-head">{label}</h3>{aside ? <span className="wk-k wk-muted">{aside}</span> : null}</div>
      {children}
    </div>
  )
}

function Opt({ on, onClick, label, count, disabled, children }: { on: boolean; onClick: () => void; label: string; count?: number; disabled?: boolean; children?: ReactNode }) {
  return (
    <button type="button" className="wk-opt min-h-tap" aria-pressed={on} disabled={disabled} onClick={onClick}>
      {children}
      <span>{label}</span>
      {count !== undefined ? <small>{count}</small> : null}
    </button>
  )
}

function Fold({ label, value, children }: { label: string; value: string; children: ReactNode }) {
  return (
    <details className="wk-fold wkc-ffold">
      <summary><span className="wkc-ffold-l">{label}</span><span className="wk-k wk-muted">{value}</span></summary>
      <div>{children}</div>
    </details>
  )
}

/**
 * The market's filters (THE WEEKLY, rule 124): one "Filters" button, the filters that are on as chips you can take off,
 * and the options as grids — in a bottom sheet on a phone, laid out on the page as a coupon on a desktop. Nothing
 * scrolls sideways. Counts come from the database (each group is counted with every OTHER filter on, so an option says
 * how many copies choosing it would leave). The filter state and the address bar are the page's, unchanged.
 */
export function HubFilters({
  filters,
  onChange,
  shirts,
  facets,
  showCopyRails = true,
  myCountry = null,
  panelOpen,
  onPanel,
}: {
  filters: Filters
  onChange: (next: Filters) => void
  shirts: Readonly<Record<string, HubShirt>>
  facets: HubFacets | null
  /** the wanted board filters by shirt only; size / condition / price rails are for copies */
  showCopyRails?: boolean
  /** the collector's own country, when they have told us: powers "ships to me" */
  myCountry?: string | null
  /** when the page owns the Filters button, it says whether the sheet is open */
  panelOpen?: boolean
  /** …and hears when the sheet closes itself */
  onPanel?: (open: boolean) => void
}) {
  const desk = useDesk()
  const [own, setOwn] = useState(false)
  const external = panelOpen !== undefined
  const open = external ? panelOpen : own
  const setOpen = (v: boolean) => { if (external) onPanel?.(v); else setOwn(v) }
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
  const clubName = (id: string) => clubs.find(([c]) => c === id)?.[1] ?? worldClubs().get(id) ?? id
  const clearAll = () => onChange({ ...filters, scope: 'all', slug: null, club: null, decade: null, variant: null, kind: null, sizes: [], conditions: [], types: [], delivery: null, maxPrice: null, country: null, city: null, reach: null })

  // what is on, as chips you can take off one by one (scope and deal have their own switches on the page)
  const applied: { key: string; label: string; off: () => void }[] = []
  if (filters.club) applied.push({ key: 'club', label: clubName(filters.club), off: () => set({ club: null, decade: null }) })
  if (filters.decade) applied.push({ key: 'decade', label: `${filters.decade}s`, off: () => set({ decade: null }) })
  if (filters.variant) applied.push({ key: 'variant', label: VARIANT_LABEL[filters.variant] ?? filters.variant, off: () => set({ variant: null }) })
  for (const s of filters.sizes) applied.push({ key: `size-${s}`, label: fl('hubf.size', { s: sizeLabel(s) }), off: () => set({ sizes: filters.sizes.filter((x) => x !== s) }) })
  for (const c of filters.conditions) applied.push({ key: `cond-${c}`, label: conditionLabel(c), off: () => set({ conditions: filters.conditions.filter((x) => x !== c) }) })
  for (const x of filters.types) applied.push({ key: `type-${x}`, label: typeLabel(x), off: () => set({ types: filters.types.filter((y) => y !== x) }) })
  if (filters.delivery) applied.push({ key: 'delivery', label: h(filters.delivery === 'ship' ? 'hub.delivery.ship' : 'hub.delivery.local'), off: () => set({ delivery: null }) })
  if (filters.country) applied.push({ key: 'country', label: `${countryFlag(filters.country)} ${countryName(filters.country)}`, off: () => set({ country: null, city: null }) })
  if (filters.reach) applied.push({ key: 'reach', label: h('hub.filters.shipsToMe'), off: () => set({ reach: null }) })
  if (filters.maxPrice) applied.push({ key: 'price', label: fl('hubf.upto', { n: filters.maxPrice, cur: filters.currency }), off: () => set({ maxPrice: null }) })

  const trigger = useRef<Element | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const sheetOpen = desk === false && open
  useEffect(() => {
    if (!sheetOpen) return
    trigger.current = document.activeElement
    const root = document.documentElement, prev = root.style.overflow
    root.style.overflow = 'hidden'
    closeRef.current?.focus()
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', key)
    return () => {
      root.style.overflow = prev
      window.removeEventListener('keydown', key)
      if (trigger.current instanceof HTMLElement) trigger.current.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open/close is the whole dependency
  }, [sheetOpen])

  const worldRows = Object.entries(facets?.clubs ?? {}).sort((a, b) => b[1] - a[1])
  const option = (
    <div className="wkc-fopts">
      {filters.scope === 'world' ? (
        <Group label={h('hub.world.clubs')}>
          <div className="wk-opts three">
            <Opt on={!filters.club} onClick={() => set({ club: null })} label={h('hub.all')} />
            {worldRows.map(([key, n]) => <Opt key={key} on={filters.club === key} onClick={() => set({ club: filters.club === key ? null : key })} label={worldClubs().get(key) ?? key} count={n} />)}
          </div>
        </Group>
      ) : null}
      {filters.scope !== 'world' && clubs.length > 1 ? (
        <Group label={h('hub.rail.club')} aside={h('hub.scope.game')}>
          <div className="wk-opts wkc-fclubs">
            {clubs.map(([id, name]) => {
              const l = livery(id)
              return (
                <Opt key={id} on={filters.club === id} onClick={() => set({ club: filters.club === id ? null : id, decade: null })} label={name}>
                  <Badge club={l ?? { id, initials: name.slice(0, 2).toUpperCase() }} />
                </Opt>
              )
            })}
          </div>
        </Group>
      ) : null}
      {filters.scope !== 'world' && decades.length > 1 ? (
        <Group label={h('hub.rail.decade')} aside={[filters.club ? clubName(filters.club) : null, fl('hubf.range', { from: decades[0]!, to: decades[decades.length - 1]! })].filter(Boolean).join(' · ')}>
          <div className="wk-opts wkc-fdecades">
            <Opt on={!filters.decade} onClick={() => set({ decade: null })} label={h('hub.all')} />
            {decades.map((d) => <Opt key={d} on={filters.decade === d} onClick={() => set({ decade: filters.decade === d ? null : d })} label={`${d}s`} />)}
          </div>
        </Group>
      ) : null}
      {filters.scope !== 'world' && variants.length > 1 ? (
        <Group label={h('hub.rail.kit')}>
          <div className="wk-opts">
            <Opt on={!filters.variant} onClick={() => set({ variant: null })} label={h('hub.all')} />
            {variants.map((v) => <Opt key={v} on={filters.variant === v} onClick={() => set({ variant: filters.variant === v ? null : v })} label={VARIANT_LABEL[v]!} />)}
          </div>
        </Group>
      ) : null}

      {showCopyRails ? (
        <>
          <Group label={h('hub.rail.size')} aside={fl('hubf.open')}>
            <div className="wk-opts">
              {SIZES.map((s: Size) => (
                <Opt key={s} on={filters.sizes.includes(s)} onClick={() => set({ sizes: toggle(filters.sizes, s) })} label={sizeLabel(s)} count={facets?.sizes[s]} disabled={!filters.sizes.includes(s) && facets !== null && !facets.sizes[s]} />
              ))}
            </div>
          </Group>
          <Group label={h('hub.rail.deal')}>
            <div className="wk-opts three">
              <Opt on={!filters.kind} onClick={() => set({ kind: null })} label={h('hub.all')} count={facets?.total} />
              <Opt on={filters.kind === 'sale'} onClick={() => set({ kind: filters.kind === 'sale' ? null : 'sale' })} label={t('collector.forSale')} count={facets?.sale} />
              <Opt on={filters.kind === 'trade'} onClick={() => set({ kind: filters.kind === 'trade' ? null : 'trade' })} label={t('collector.forTrade')} count={facets?.trade} />
            </div>
          </Group>
          <div className="wkc-ffolds">
            <Fold label={h('hub.rail.condition')} value={filters.conditions.length ? filters.conditions.map(conditionLabel).join(', ') : fl('hubf.any')}>
              <div className="wk-opts three">
                {CONDITIONS.map((c: Condition) => (
                  <Opt key={c} on={filters.conditions.includes(c)} onClick={() => set({ conditions: toggle(filters.conditions, c) })} label={conditionLabel(c)} count={facets?.conditions[c]} disabled={!filters.conditions.includes(c) && facets !== null && !facets.conditions[c]} />
                ))}
              </div>
            </Fold>
            <Fold label={h('hub.rail.type')} value={filters.types.length ? filters.types.map(typeLabel).join(', ') : fl('hubf.any')}>
              <div className="wk-opts two">
                {ITEM_TYPES.filter((x) => x !== 'unknown').map((x: ItemType) => (
                  <Opt key={x} on={filters.types.includes(x)} onClick={() => set({ types: toggle(filters.types, x) })} label={typeLabel(x)} count={facets?.itemTypes[x]} disabled={!filters.types.includes(x) && facets !== null && !facets.itemTypes[x]} />
                ))}
              </div>
            </Fold>
            <Fold label={h('hub.rail.delivery')} value={filters.delivery ? h(filters.delivery === 'ship' ? 'hub.delivery.ship' : 'hub.delivery.local') : h('hub.all')}>
              <div className="wk-opts three">
                <Opt on={!filters.delivery} onClick={() => set({ delivery: null })} label={h('hub.all')} />
                <Opt on={filters.delivery === 'ship'} onClick={() => set({ delivery: filters.delivery === 'ship' ? null : 'ship' })} label={h('hub.delivery.ship')} />
                <Opt on={filters.delivery === 'local'} onClick={() => set({ delivery: filters.delivery === 'local' ? null : 'local' })} label={h('hub.delivery.local')} />
              </div>
            </Fold>
            {(myCountry || Object.keys(facets?.countries ?? {}).length > 1 || filters.country) ? (
              <Fold label={h('hub.rail.where')} value={filters.reach ? h('hub.filters.shipsToMe') : filters.country ? countryName(filters.country) : h('hub.all')}>
                <div className="wk-opts two">
                  <Opt on={!filters.country && !filters.reach} onClick={() => set({ country: null, city: null, reach: null })} label={h('hub.all')} />
                  {myCountry ? <Opt on={filters.reach === myCountry} onClick={() => set({ reach: filters.reach === myCountry ? null : myCountry, country: null, city: null })} label={h('hub.filters.shipsToMe')} /> : null}
                  {Object.entries(facets?.countries ?? {}).sort((a, b) => b[1] - a[1]).map(([cc, n]) => (
                    <Opt key={cc} on={filters.country === cc} onClick={() => set({ country: filters.country === cc ? null : cc, city: null, reach: null })} label={`${countryFlag(cc)} ${countryName(cc)}`} count={n} />
                  ))}
                </div>
              </Fold>
            ) : null}
            <Fold label={h('hub.rail.price')} value={filters.maxPrice ? fl('hubf.upto', { n: filters.maxPrice, cur: filters.currency }) : fl('hubf.any')}>
              <form
                className="wkc-fprice"
                onSubmit={(e) => {
                  e.preventDefault()
                  const n = Number(price.replace(',', '.'))
                  set({ maxPrice: Number.isFinite(n) && n > 0 ? n : null })
                }}
              >
                <label htmlFor="hub-max" className="sr-only">{h('hub.rail.price')}</label>
                <input id="hub-max" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={h('hub.price.placeholder')} />
                <select aria-label={h('hub.price.currency')} value={filters.currency} onChange={(e) => onChange({ ...filters, currency: e.target.value as Currency })}>
                  <option value="EUR">EUR</option>
                  <option value="ILS">ILS</option>
                  <option value="USD">USD</option>
                </select>
                <button type="submit" className="wk-btn min-h-tap">{h('hub.price.apply')}</button>
              </form>
            </Fold>
          </div>
        </>
      ) : null}
    </div>
  )

  return (
    <section aria-label={h('hub.filters.title')} className="wkc-filters" data-hub="filters">
      {applied.length || !external ? (
        <div className="wk-filterbar wkc-applied" aria-label={fl('hubf.applied')}>
          {!external && desk === false ? (
            <button type="button" className="wk-btn paper min-h-tap wkc-fbtn" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(!open)}>
              {h('hub.filters.title')}{count ? <span className="wk-tag red">{count}</span> : null}
            </button>
          ) : null}
          {applied.map((a) => (
            <button key={a.key} type="button" className="wk-applied min-h-tap" onClick={a.off} aria-label={fl('hubf.remove', { what: a.label })}>
              {a.label}<i aria-hidden="true">✕</i>
            </button>
          ))}
          {count ? <button type="button" onClick={clearAll} className="wk-link min-h-tap wkc-clear">{h('hub.filters.clear')}</button> : null}
        </div>
      ) : null}

      {desk ? (
        <div className="wk-coupon wkc-fcoupon">
          <span className="wk-scissors" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="6" cy="7" r="3" /><circle cx="6" cy="17" r="3" /><path d="M8.5 8.5L20 18M8.5 15.5L20 6" /></svg></span>
          <div className="wkc-fcoupon-h"><h2 className="wkc-h2-t orange">{h('hub.filters.title')}</h2>{count ? <span className="wk-tag ink">{fl('hubf.on', { n: count })}</span> : null}{count ? <button type="button" onClick={clearAll} className="wk-link min-h-tap wkc-clear">{h('hub.filters.clear')}</button> : null}</div>
          {option}
        </div>
      ) : null}

      {sheetOpen && typeof document !== 'undefined' ? createPortal(
        <div className="wk-portal wkc-portal">
          <div className="wk-scrim" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="wk-sheet wkc-fsheet z-[91]" role="dialog" aria-modal="true" aria-labelledby="hub-filters-h">
            <span className="wk-scissors" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="6" cy="7" r="3" /><circle cx="6" cy="17" r="3" /><path d="M8.5 8.5L20 18M8.5 15.5L20 6" /></svg></span>
            <div className="wk-sheet-head">
              <div className="wkc-fsheet-t"><h2 id="hub-filters-h" className="wkc-h2-t orange">{h('hub.filters.title')}</h2>{count ? <span className="wk-tag ink">{fl('hubf.on', { n: count })}</span> : null}</div>
              <button ref={closeRef} type="button" className="wk-icon min-h-tap" onClick={() => setOpen(false)} aria-label={fl('hubf.close')}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
            {option}
            <div className="wkc-fsheet-foot">
              <button type="button" onClick={clearAll} className="wk-link min-h-tap" disabled={!count}>{h('hub.filters.clear')}</button>
              <button type="button" onClick={() => setOpen(false)} className="wk-btn orange lg min-h-tap">{facets && showCopyRails ? fl('hubf.show', { n: facets.total }) : fl('hubf.showAll')}</button>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </section>
  )
}
