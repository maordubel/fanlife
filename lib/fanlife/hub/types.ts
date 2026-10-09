import type { Condition, Currency, ItemType, PublicItem, Size } from '@/lib/collector/types'

/**
 * THE SHIRT HUB — the shapes the Wave 1 functions of `20261009090000_worker_market_search.sql` answer.
 * Kept out of `lib/collector/types.ts` on purpose: that file is The Worker's, and the hub is FAN LIFE's.
 */
export type Delivery = 'local' | 'ship' | 'both'
export type WantMode = 'buy' | 'swap' | 'any'

/** a market copy as the search answers it: the collector's public item, plus how it can travel */
export type ShipScope = 'country' | 'world'
export type HubItem = PublicItem & { delivery?: Delivery; shipScope?: ShipScope; route?: ItemRoute; wantId?: string }

/** the server's cleaned query — only keys the market understands */
export type HubQuery = {
  slugs?: string[]
  kinds?: ('sale' | 'trade')[]
  sizes?: Size[]
  conditions?: Condition[]
  itemTypes?: ItemType[]
  delivery?: 'local' | 'ship'
  clubs?: string[]
  countries?: string[]
  cities?: string[]
  /** a buyer's country: only copies whose seller ships there */
  reach?: string
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
  clubs?: Record<string, number>
  countries?: Record<string, number>
  reachable?: number
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

// ------------------------------------------------------------------ wave 2 — the deal

export type HandoverMethod = 'meet' | 'ship'
export type FeedbackRating = 'good' | 'fine' | 'bad'
export type DealExtras = {
  status: string
  kind: 'buy' | 'trade'
  role: 'initiator' | 'recipient'
  handover: { method: HandoverMethod; note: string | null; at: string } | null
  mySent: boolean
  theirSent: boolean
  feedbackGiven: boolean
  feedbackReceived: { rating: FeedbackRating; note: string | null } | null
  bundleItems: import('@/lib/collector/types').PublicItem[]
}

// ------------------------------------------------------------------ wave 3 — place, circles, the pipe, identification help

export type Place = { country: string | null; city: string | null; cityKey?: string | null; show: boolean }
export type CircleKind = 'club' | 'country' | 'city'
export type CircleRef = { kind: CircleKind; key: string }
export type CircleOverview = {
  kind: CircleKind
  key: string
  label: string | null
  shirts: number
  newThisWeek: number
  people: number
  wanted: number
  top: { slug: string; count: number }[]
  following: boolean
}

/** how a copy reaches the viewer, in facts — `reaches` is null while the viewer has told us no place */
export type ItemRoute = { sameCity: boolean; sameCountry: boolean; crossBorder: boolean; reaches: boolean | null; delivery: Delivery }

export type Pipe = {
  found: HubItem[]
  answers: WantedRow[]
  /** new copies in the last two weeks, per followed club */
  clubs: Record<string, number>
  /** open "what shirt is this?" questions the viewer could answer */
  help: number
  place: Place
}

export type IdRequest = {
  id: string
  note: string | null
  photos: string[]
  clubHint: string | null
  status: 'open' | 'solved' | 'closed'
  solvedSlug: string | null
  createdAt: string
  asker: PublicItem['seller']
  mine: boolean
  proposals: number
  iProposed: boolean
}
export type IdProposal = { id: string; archiveSlug: string; kitId: string | null; note: string | null; createdAt: string; by: PublicItem['seller']; mine: boolean }
