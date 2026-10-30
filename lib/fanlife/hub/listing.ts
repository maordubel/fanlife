// FAN LIFE — hand-written (direct listing, 30.10.2026). Pure: the draft, its rules and the payload sent to the server.
// The server judges everything again; this file only decides what the form may offer and when a step may move on.

import type { Condition, Currency, ItemType, OwnerItem, Size } from '@/lib/collector/types'

import type { HubKey } from './copy'
import type { Delivery } from './types'

export type Mode = 'sell' | 'swap' | 'both'

export type ListingDraft = {
  /** a copy already in the closet that gets its terms (never duplicated) */
  itemId: string | null
  clubKey: string | null
  clubName: string
  country: string | null
  archiveSlug: string | null
  kitId: string | null
  season: string
  variant: string | null
  maker: string
  size: Size | null
  condition: Condition | null
  itemType: ItemType
  authenticityClaim: 'original' | 'match_worn' | 'unsure' | 'replica' | null
  playerName: string
  playerNumber: string
  description: string
  mode: Mode | null
  price: string
  currency: Currency
  openToOffers: boolean
  lookingFor: string
  delivery: Delivery
  shipScope: 'country' | 'world'
  /** opaque server paths of photos already uploaded */
  photos: string[]
  addToCloset: boolean
}

export const EMPTY_DRAFT: ListingDraft = {
  itemId: null, clubKey: null, clubName: '', country: null, archiveSlug: null, kitId: null, season: '', variant: null, maker: '',
  size: null, condition: null, itemType: 'unknown', authenticityClaim: null, playerName: '', playerNumber: '', description: '',
  mode: null, price: '', currency: 'ILS', openToOffers: false, lookingFor: '', delivery: 'both', shipScope: 'country',
  photos: [], addToCloset: false,
}

/** Sell / Swap / Sell or swap → the two flags. (0,0) does not exist. */
export function flagsFor(mode: Mode): { forSale: boolean; forTrade: boolean } {
  return { forSale: mode !== 'swap', forTrade: mode !== 'sell' }
}

export const MAX_PHOTOS = 8

export type StepIssue = 'club' | 'photo' | 'mode' | 'price' | 'replica'

/** What is still missing before a step may move on. Season, size, condition and maker are never required: "not sure" is an answer. */
export function issues(d: ListingDraft, step: 1 | 2 | 3, closetPhotos = 0): StepIssue[] {
  const out: StepIssue[] = []
  if (step >= 1) {
    if (!d.itemId && !d.archiveSlug && !d.clubKey && d.clubName.trim().length < 2) out.push('club')
    if (d.photos.length + closetPhotos < 1) out.push('photo')
  }
  if (step >= 2) {
    if (!d.mode) out.push('mode')
    else if (d.mode !== 'swap') {
      const p = Number(d.price)
      if (!d.openToOffers && !(p > 0)) out.push('price')
    }
    if ((d.itemType === 'replica' || d.itemType === 'fan_reproduction') && (d.authenticityClaim === 'original' || d.authenticityClaim === 'match_worn')) out.push('replica')
  }
  return out
}

/** The exact object the RPC reads. Empty strings become absent keys so the server's own defaults apply. */
export function publishPayload(d: ListingDraft): Record<string, unknown> {
  const clean = (s: string) => (s.trim() === '' ? undefined : s.trim())
  const price = clean(d.price)
  const body: Record<string, unknown> = {
    itemId: d.itemId ?? undefined,
    clubKey: d.clubKey ?? undefined,
    clubName: d.clubKey ? undefined : clean(d.clubName),
    country: d.country ?? undefined,
    archiveSlug: d.archiveSlug ?? undefined,
    kitId: d.kitId ?? undefined,
    season: clean(d.season),
    variant: d.variant ?? undefined,
    maker: clean(d.maker),
    size: d.size ?? undefined,
    condition: d.condition ?? undefined,
    itemType: d.itemType,
    authenticityClaim: d.authenticityClaim ?? undefined,
    playerName: clean(d.playerName),
    playerNumber: clean(d.playerNumber),
    description: clean(d.description),
    mode: d.mode ?? undefined,
    price: d.mode === 'swap' ? undefined : price,
    currency: d.currency,
    openToOffers: d.mode === 'swap' ? false : d.openToOffers,
    lookingFor: d.mode === 'sell' ? undefined : clean(d.lookingFor),
    delivery: d.delivery,
    shipScope: d.shipScope,
    photos: d.photos,
    addToCloset: d.addToCloset,
  }
  return Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined))
}

/** A listing as My listings shows it. */
export type ListingRow = OwnerItem & { inCloset: boolean; paused: boolean; lookingFor: string | null; updatedAt: string }

export type ListingStatus = 'live' | 'reserved' | 'paused' | 'sold' | 'swapped' | 'removed' | 'held'

/** Draft and Pending review are not states of this build: a listing is live the moment the server accepts it. */
export function statusOf(r: Pick<ListingRow, 'state' | 'forSale' | 'forTrade' | 'paused'>): ListingStatus {
  if (r.state === 'sold') return 'sold'
  if (r.state === 'traded') return 'swapped'
  if (r.state === 'reserved') return 'reserved'
  if (r.state === 'removed' || r.state === 'suspended') return 'removed'
  if (r.paused) return 'paused'
  return r.forSale || r.forTrade ? 'live' : 'held'
}

/** A fresh key per publish attempt of one form; kept until the form is left, so a retry or a double tap is the same listing. */
export function newKey(): string {
  const c = typeof crypto !== 'undefined' ? crypto : undefined
  if (c && 'randomUUID' in c) return c.randomUUID().replaceAll('-', '')
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}

export const ERROR_KEY: Record<string, HubKey> = {
  photos_required: 'listing.err.photos',
  price_required: 'listing.err.price',
  club_required: 'listing.err.club',
  replica_claim: 'listing.err.replica',
  too_many_photos: 'listing.err.manyPhotos',
  listings_full: 'listing.err.full',
  slow_down: 'listing.err.slow',
  busy: 'listing.err.busy',
  auth_required: 'listing.err.auth',
  not_uploaded: 'listing.err.upload',
  upload_failed: 'listing.err.upload',
}
