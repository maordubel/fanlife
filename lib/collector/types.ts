/**
 * הארון, השוק והמכירה הפומבית — הצורות שחוזרות מהמסד (22.9.2026).
 *
 * כל פונקציה ב-`supabase/migrations/20260922120000_worker_collector_market.sql` מחזירה JSON אחד:
 * `{ ok: true, ... }` או `{ ok: false, error }`. אין כאן מזהה משתמש אחד — האספן הוא תווית
 * (`CollectorLabel`: מספר, ואולי כינוי), וכך זה נשאר גם בצד של האפליקציה.
 */

export type Size = 'kids' | 'xs' | 's' | 'm' | 'l' | 'xl' | 'xxl' | 'xxxl'
export type Condition = 'mint' | 'excellent' | 'good' | 'worn' | 'damaged'
export type ItemType = 'original_period' | 'official_reissue' | 'replica' | 'fan_reproduction' | 'unknown'
export type AuthenticityClaim = 'original' | 'match_worn' | 'unsure' | 'replica'
export type ItemState = 'held' | 'reserved' | 'sold' | 'traded' | 'removed' | 'suspended'
export type Currency = 'ILS' | 'EUR' | 'USD'
export type Visibility = 'public' | 'link_only' | 'private'

export const SIZES: readonly Size[] = ['kids', 'xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl']
export const CONDITIONS: readonly Condition[] = ['mint', 'excellent', 'good', 'worn', 'damaged']
export const ITEM_TYPES: readonly ItemType[] = ['original_period', 'official_reissue', 'replica', 'fan_reproduction', 'unknown']
export const CLAIMS: readonly AuthenticityClaim[] = ['original', 'match_worn', 'unsure', 'replica']
export const CURRENCIES: readonly Currency[] = ['ILS', 'EUR', 'USD']

/** Every refusal the database can answer with, so a screen can map each one to a sentence. */
export type CollectorError =
  | 'off' // no Supabase keys in this build
  | 'network'
  | 'auth_required'
  | 'forbidden'
  | 'not_found'
  | 'not_available'
  | 'bad_slug'
  | 'bad_kit'
  | 'bad_key'
  | 'bad_value'
  | 'bad_patch'
  | 'bad_kind'
  | 'bad_amount'
  | 'bad_currency'
  | 'bad_items'
  | 'bad_action'
  | 'bad_step'
  | 'bad_state'
  | 'bad_path'
  | 'bad_reason'
  | 'bad_status'
  | 'busy'
  | 'closed'
  | 'empty'
  | 'own_item'
  | 'own_lot'
  | 'suspended'
  | 'details_required'
  | 'price_required'
  | 'replica_claim'
  | 'photos_required'
  | 'not_uploaded'
  | 'too_many_photos'
  | 'items_gone'
  | 'closet_full'
  | 'wishlist_full'
  | 'slow_down'
  | 'not_live'
  | 'too_low'
  | 'raise_above_your_max'
  | 'note_required'
  | 'not_reported'
  | 'upload_failed'
  | 'image_unreadable'

export type Fail = { ok: false; error: CollectorError; missing?: string[]; minNext?: number; yourMax?: number; key?: string }
export type Result<T> = ({ ok: true } & T) | Fail

export type CollectorLabel = {
  handle: number
  nickname: string | null
  since: number | null
  completed: number
  trades: number
  sales: number
  items: number
}

export type PublicItem = {
  id: string
  archiveSlug: string
  kitId: string | null
  size: Size | null
  condition: Condition | null
  itemType: ItemType
  authenticityClaim: AuthenticityClaim | null
  playerName: string | null
  playerNumber: number | null
  personalization: string | null
  description: string | null
  forTrade: boolean
  forSale: boolean
  askingPrice: number | null
  currency: Currency
  openToOffers: boolean
  state: ItemState
  /** storage paths inside the `worker-collector` bucket — `photoUrl()` turns one into a URL */
  photos: string[]
  openedAt: string | null
  seller?: CollectorLabel
  mine?: boolean
}

export type OwnerItem = Omit<PublicItem, 'seller'> & {
  suspendedReason: string | null
  createdAt: string
  openConnections: number
  lot: { id: string; status: string } | null
  wanters: number
}

export type Want = {
  id: string
  archiveSlug: string
  kitId: string | null
  preferredSize: Size | null
  notes: string | null
  createdAt: string
  /** how many copies other collectors have open for sale or trade right now */
  available: number
}

export type Closet = {
  profile: { handle: number; showNickname: boolean; visibility: Visibility; shareToken: string }
  label: CollectorLabel
  items: OwnerItem[]
  wants: Want[]
  unread: number
}

export type ClosetView = {
  label: CollectorLabel
  /** the viewer is this closet's owner — the page says so and links to the editor */
  mine?: boolean
  items: {
    archiveSlug: string
    kitId: string | null
    itemType: ItemType
    playerName: string | null
    playerNumber: number | null
    forTrade: boolean
    forSale: boolean
    /** present only when the copy is open in the market, so the card can link to it */
    id: string | null
  }[]
  wants: string[]
}

export type ShirtSignal = {
  have: number
  want: number
  forTrade: number
  forSale: number
  live: number
  youHave: boolean
  youWant: boolean
}

export type LotPhase =
  | 'pending'
  | 'upcoming'
  | 'live'
  | 'closing'
  | 'awaiting_completion'
  | 'completed'
  | 'ended'
  | 'cancelled'
  | 'rejected'

export type LotBrief = {
  id: string
  title: string
  phase: LotPhase
  archiveSlug: string
  kitId: string | null
  photo: string | null
  currency: Currency
  startPrice: number
  currentPrice: number
  bidCount: number
  startsAt: string | null
  endsAt: string | null
  reserveSet: boolean
  reserveMet: boolean
}

export type Matches = {
  perfectSwaps: { theirs: PublicItem; mine: OwnerItem }[]
  wanted: PublicItem[]
  wantedByOthers: { item: OwnerItem; wanters: number; wantersWithTrades: number }[]
  auctions: LotBrief[]
}

export type ConnectionStatus =
  | 'requested'
  | 'accepted'
  | 'negotiating'
  | 'agreed'
  | 'completed'
  | 'declined'
  | 'cancelled'
  | 'reported'

export type ConnectionSummary = {
  id: string
  kind: 'buy' | 'trade'
  status: ConnectionStatus
  role: 'initiator' | 'recipient'
  counterpart: CollectorLabel
  item: Omit<PublicItem, 'seller'> | null
  lastMessageAt: string
  unread: boolean
  myDone: boolean
  theirDone: boolean
}

export type Side = 'initiator' | 'recipient'

export type ThreadMessage = {
  id: string
  kind: 'text' | 'offer' | 'system' | 'photo_request'
  /** for 'system' this is a code: accepted, declined, offer_accepted, offer_declined, agreed, half_done, completed, cancelled */
  body: string | null
  meta: { offerId?: string; kind?: 'price' | 'trade'; amount?: number | null; currency?: Currency; items?: string[] } | null
  createdAt: string
  from: Side | 'system'
}

export type Offer = {
  id: string
  kind: 'price' | 'trade'
  amount: number | null
  currency: Currency
  status: 'open' | 'accepted' | 'declined' | 'countered' | 'withdrawn' | 'superseded'
  from: Side
  createdAt: string
  items: Omit<PublicItem, 'seller'>[]
}

export type Thread = {
  connection: {
    id: string
    kind: 'buy' | 'trade'
    status: ConnectionStatus
    role: Side | 'observer'
    myDone: boolean
    theirDone: boolean
    createdAt: string
    /** set when this conversation is an auction win: completion goes through the lot */
    lotId?: string | null
  }
  initiator: CollectorLabel
  recipient: CollectorLabel
  item: Omit<PublicItem, 'seller'> | null
  messages: ThreadMessage[]
  offers: Offer[]
}

export type LotState = {
  lot: LotBrief & {
    description: string
    minIncrement: number
    antiSnipeSeconds: number
    requestedHours: number
    minNext: number
    isSeller: boolean
    leading: boolean
    yourMax: number | null
    watching: boolean
    watchers: number
    won: boolean
    winningAmount: number | null
    reservePrice: number | null
    decisionNote: string | null
    sellerDone: boolean
    winnerDone: boolean
    /** the winner↔seller conversation opened at settle — only the two of them get it */
    connectionId?: string | null
  }
  item: PublicItem
  bids: { amount: number; at: string; proxy: boolean; bidder: number; you: boolean }[]
}

export type MerchantOffer = {
  id: string
  archiveSlug: string | null
  kitId: string | null
  seasonLabel: string | null
  merchantName: string
  merchantType: 'club_store' | 'retro_store' | 'other'
  offerType: 'official' | 'official_reissue' | 'replica' | 'external_new'
  title: string | null
  price: number | null
  currency: Currency
  productUrl: string
  imageUrl: string | null
  availability: 'in_stock' | 'out_of_stock' | 'unknown'
  lastCheckedAt: string | null
  isOfficialClubStore: boolean
}

export type NotificationKind =
  | 'COLLECTOR_WANT_MATCHED'
  | 'COLLECTOR_ITEM_REQUESTED'
  | 'COLLECTOR_REQUEST_ACCEPTED'
  | 'COLLECTOR_REQUEST_DECLINED'
  | 'COLLECTOR_MESSAGE'
  | 'COLLECTOR_OFFER_RECEIVED'
  | 'COLLECTOR_OFFER_ACCEPTED'
  | 'COLLECTOR_OFFER_DECLINED'
  | 'CONNECTION_COMPLETED'
  | 'CONNECTION_CANCELLED'
  | 'AUCTION_SUBMITTED'
  | 'AUCTION_APPROVED'
  | 'AUCTION_REJECTED'
  | 'AUCTION_SCHEDULED'
  | 'AUCTION_STARTED'
  | 'AUCTION_OUTBID'
  | 'AUCTION_ENDING'
  | 'AUCTION_WON'
  | 'AUCTION_SOLD'
  | 'AUCTION_UNSOLD'
  | 'AUCTION_CANCELLED'
  | 'ITEM_SUSPENDED'
  | 'REPORT_RECEIVED'

export type CollectorNotification = {
  id: string
  kind: NotificationKind
  payload: {
    itemId?: string
    archiveSlug?: string
    connectionId?: string
    offerId?: string
    lotId?: string
    amount?: number
    price?: number
    currency?: Currency
    kind?: string
    startsAt?: string
    endsAt?: string
    note?: string
    reason?: string
    reportId?: string
    from?: number
    /** COLLECTOR_WANT_MATCHED: how the copy that appeared is open */
    forSale?: boolean
    forTrade?: boolean
    /** AUCTION_UNSOLD: there were bids, and none reached the reserve */
    reserveMissed?: boolean
  }
  read: boolean
  at: string
}

export type ItemPatch = Partial<{
  size: Size | null
  condition: Condition | null
  itemType: ItemType
  authenticityClaim: AuthenticityClaim | null
  playerName: string | null
  playerNumber: number | null
  personalization: string | null
  description: string | null
  forTrade: boolean
  forSale: boolean
  askingPrice: number | null
  currency: Currency
  openToOffers: boolean
}>

/**
 * A shirt of the archive as the collector screens need it — read on the SERVER from
 * `lib/kit/archive.ts` and the Kit Master (`lib/collector/catalog.ts`), handed to the client.
 * Season, maker and sponsor are never copied into a collector row (spec §72); this is the join.
 */
export type CollectorShirt = {
  slug: string
  src: string
  seasonLabel: string | null
  yearRaw: number | null
  seasonAmbiguous: boolean
  year: number
  decade: number
  variant: string
  variantHe: string
  kitId: string | null
  /** gate 4 can still deal this shirt: its photograph is a spoiler until it is assembled */
  spoiler: string | null
}
