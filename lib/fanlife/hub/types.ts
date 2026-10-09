import type { Condition, Currency, ItemType, PublicItem, Size } from '@/lib/collector/types'

/**
 * THE SHIRT HUB — the shapes the Wave 1 functions of `20261009090000_worker_market_search.sql` answer.
 * Kept out of `lib/collector/types.ts` on purpose: that file is The Worker's, and the hub is FAN LIFE's.
 */
export type Delivery = 'local' | 'ship' | 'both'
export type WantMode = 'buy' | 'swap' | 'any'

/** a market copy as the search answers it: the collector's public item, plus how it can travel */
export type HubItem = PublicItem & { delivery?: Delivery }

/** the server's cleaned query — only keys the market understands */
export type HubQuery = {
  slugs?: string[]
  kinds?: ('sale' | 'trade')[]
  sizes?: Size[]
  conditions?: Condition[]
  itemTypes?: ItemType[]
  delivery?: 'local' | 'ship'
  maxPrice?: number
  currency?: Currency
}

export type Cursor = { at: string | null; id: string }

export type HubFacets = {
  total: number
  sale: number
  trade: number
  sizes: Partial<Record<Size, number>>
  conditions: Partial<Record<Condition, number>>
  itemTypes: Partial<Record<ItemType, number>>
  slugs: Record<string, number>
}

export type SearchPage = { items: HubItem[]; next: Cursor | null; facets: HubFacets; query: HubQuery }

export type WantedRow = {
  id: string
  archiveSlug: string
  kitId: string | null
  size: Size | null
  mode: WantMode
  delivery: Delivery
  note: string | null
  createdAt: string
  requester: PublicItem['seller']
  mine: boolean
  /** the viewer's own open copies that would answer this request */
  myMatches: string[]
}

export type WantedPage = { wanted: WantedRow[]; next: Cursor | null; total: number }

/** the requester's own request — the only shape that carries the private budget */
export type MyWant = {
  id: string
  archiveSlug: string
  kitId: string | null
  size: Size | null
  mode: WantMode
  delivery: Delivery
  note: string | null
  public: boolean
  maxPrice: number | null
  currency: Currency
  createdAt: string
  available: number
}

export type SavedSearch = { id: string; name: string; query: HubQuery; notify: boolean; createdAt: string; open: number }

export type WantInput = {
  slug: string
  size: Size | null
  mode: WantMode
  delivery: Delivery
  note: string
  maxPrice: number | null
  currency: Currency
  public: boolean
}
