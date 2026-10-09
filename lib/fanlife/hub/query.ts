import { CONDITIONS, ITEM_TYPES, SIZES } from '@/lib/collector/types'
import type { CollectorShirt, Condition, Currency, ItemType, Size } from '@/lib/collector/types'

import type { HubQuery } from './types'

/**
 * The market's filters as a fan sees them, and how they become (a) the address bar and (b) the query the
 * database searches with. Pure: no React, no network — `tests/shirt-hub.test.ts` holds it to arithmetic.
 *
 * The database does the filtering (so a page of 24 is a page of 24 matches, never "the first 100 rows,
 * filtered"). What it cannot know is which archive shirts belong to a club, a decade or a variant, so the
 * client turns those three into a `slugs` list from the catalogue it already holds.
 */
export type HubView = 'market' | 'wanted' | 'foryou'
export type HubShirt = Pick<CollectorShirt, 'slug' | 'decade' | 'variant'> & { club?: string; clubName?: string }

export type HubFilters = {
  slug: string | null
  club: string | null
  decade: number | null
  variant: string | null
  kind: 'sale' | 'trade' | null
  sizes: Size[]
  conditions: Condition[]
  types: ItemType[]
  delivery: 'local' | 'ship' | null
  maxPrice: number | null
  currency: Currency
}

export const EMPTY_FILTERS: HubFilters = {
  slug: null, club: null, decade: null, variant: null, kind: null,
  sizes: [], conditions: [], types: [], delivery: null, maxPrice: null, currency: 'EUR',
}

/** the database refuses a slug list longer than this; the client never sends more */
export const MAX_SLUGS = 400
/** a slug that matches nothing: "no shirt satisfies club + decade + variant" must search to zero, not to everything */
export const NO_SHIRT = 'no-such-shirt-zzz'

const VIEWS: readonly HubView[] = ['market', 'wanted', 'foryou']
const CURRENCIES: readonly Currency[] = ['ILS', 'EUR', 'USD']
const pick = <T extends string>(values: readonly T[], raw: string | null): T[] =>
  Array.from(new Set((raw ?? '').split(',').filter((v): v is T => (values as readonly string[]).includes(v))))

export function viewFromSearch(search: string): HubView {
  const v = new URLSearchParams(search).get('view')
  return (VIEWS as readonly string[]).includes(v ?? '') ? (v as HubView) : 'market'
}

/** Reads the address bar. Anything unknown is ignored — a hand-edited link never breaks the page. */
export function filtersFromSearch(search: string, shirts: Readonly<Record<string, HubShirt>>): HubFilters {
  const p = new URLSearchParams(search)
  const slug = p.get('slug')
  const decade = Number(p.get('decade'))
  const max = Number(p.get('max'))
  const currency = p.get('cur') as Currency | null
  return {
    slug: slug && shirts[slug] ? slug : null,
    club: p.get('club') || null,
    decade: Number.isInteger(decade) && decade >= 1900 && decade <= 2090 ? decade : null,
    variant: p.get('variant') || null,
    kind: p.get('kind') === 'sale' || p.get('kind') === 'trade' ? (p.get('kind') as 'sale' | 'trade') : null,
    sizes: pick<Size>(SIZES, p.get('size')),
    conditions: pick<Condition>(CONDITIONS, p.get('cond')),
    types: pick<ItemType>(ITEM_TYPES, p.get('type')),
    delivery: p.get('delivery') === 'local' || p.get('delivery') === 'ship' ? (p.get('delivery') as 'local' | 'ship') : null,
    maxPrice: Number.isFinite(max) && max > 0 ? max : null,
    currency: currency && (CURRENCIES as readonly string[]).includes(currency) ? currency : 'EUR',
  }
}

export function filtersToSearch(f: HubFilters, view: HubView): string {
  const p = new URLSearchParams()
  if (view !== 'market') p.set('view', view)
  if (f.slug) p.set('slug', f.slug)
  if (f.club) p.set('club', f.club)
  if (f.decade) p.set('decade', String(f.decade))
  if (f.variant) p.set('variant', f.variant)
  if (f.kind) p.set('kind', f.kind)
  if (f.sizes.length) p.set('size', f.sizes.join(','))
  if (f.conditions.length) p.set('cond', f.conditions.join(','))
  if (f.types.length) p.set('type', f.types.join(','))
  if (f.delivery) p.set('delivery', f.delivery)
  if (f.maxPrice) {
    p.set('max', String(f.maxPrice))
    p.set('cur', f.currency)
  }
  const s = p.toString()
  return s ? `?${s}` : ''
}

/** The slugs a club / decade / variant choice stands for, or null when none of the three is set. */
export function slugsFor(f: Pick<HubFilters, 'slug' | 'club' | 'decade' | 'variant'>, shirts: Readonly<Record<string, HubShirt>>): string[] | null {
  if (f.slug) return [f.slug]
  if (!f.club && !f.decade && !f.variant) return null
  const out = Object.values(shirts)
    .filter((s) => (!f.club || s.club === f.club) && (!f.decade || s.decade === f.decade) && (!f.variant || s.variant === f.variant))
    .map((s) => s.slug)
  return out.length ? out.slice(0, MAX_SLUGS) : [NO_SHIRT]
}

export function toQuery(f: HubFilters, shirts: Readonly<Record<string, HubShirt>>): HubQuery {
  const q: HubQuery = {}
  const slugs = slugsFor(f, shirts)
  if (slugs) q.slugs = slugs
  if (f.kind) q.kinds = [f.kind]
  if (f.sizes.length) q.sizes = f.sizes
  if (f.conditions.length) q.conditions = f.conditions
  if (f.types.length) q.itemTypes = f.types
  if (f.delivery) q.delivery = f.delivery
  if (f.maxPrice) {
    q.maxPrice = f.maxPrice
    q.currency = f.currency
  }
  return q
}

/** How many separate narrowings are on — the number on the "Clear" chip. A saved search needs at least one. */
export function activeCount(f: HubFilters): number {
  return [f.slug, f.club, f.decade, f.variant, f.kind, f.delivery, f.maxPrice].filter(Boolean).length + f.sizes.length + f.conditions.length + f.types.length
}

const TYPE_WORD: Record<ItemType, string> = {
  original_period: 'Original', official_reissue: 'Reissue', replica: 'Replica', fan_reproduction: 'Reproduction', unknown: 'Unknown type',
}
const SIZE_WORD = (s: Size) => (s === 'kids' ? 'Kids' : s.toUpperCase())

/** A name for a search nobody named: "Olympiacos · 1990s · away · L". Short, built from what is set. */
export function autoName(f: HubFilters, shirts: Readonly<Record<string, HubShirt>>): string {
  const parts: string[] = []
  if (f.slug) parts.push(shirts[f.slug]?.clubName ?? 'One shirt')
  else if (f.club) parts.push(Object.values(shirts).find((s) => s.club === f.club)?.clubName ?? f.club)
  if (f.decade) parts.push(`${f.decade}s`)
  if (f.variant) parts.push(f.variant.charAt(0).toUpperCase() + f.variant.slice(1))
  if (f.sizes.length) parts.push(f.sizes.map(SIZE_WORD).join('/'))
  if (f.types.length) parts.push(f.types.map((t) => TYPE_WORD[t]).join('/'))
  if (f.kind) parts.push(f.kind === 'sale' ? 'For sale' : 'Swap')
  if (f.maxPrice) parts.push(`≤ ${f.maxPrice} ${f.currency}`)
  return (parts.join(' · ') || 'My search').slice(0, 40)
}

/** A saved search, back into filters (the club/decade/variant are not stored — only the slug list is). */
export function filtersFromQuery(q: HubQuery): HubFilters {
  return {
    ...EMPTY_FILTERS,
    slug: q.slugs && q.slugs.length === 1 && q.slugs[0] !== NO_SHIRT ? q.slugs[0]! : null,
    kind: q.kinds && q.kinds.length === 1 ? q.kinds[0]! : null,
    sizes: q.sizes ?? [],
    conditions: q.conditions ?? [],
    types: q.itemTypes ?? [],
    delivery: q.delivery ?? null,
    maxPrice: q.maxPrice ?? null,
    currency: q.currency ?? 'EUR',
  }
}
