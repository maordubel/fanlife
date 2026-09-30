import type { AdminLot, AdminOverview, AdminReport, AuditEntry } from '@/lib/collector/api'
import type { AdminLotWithBids, MerchantRow } from '@/lib/collector/auction'
import type { Closet, CollectorLabel, LotBrief, LotState, OwnerItem, PublicItem, Result, Thread } from '@/lib/collector/types'

import type { AuctionApi } from '@/components/auction/AuctionApi'

import type { QaView } from './views'

/**
 * נתוני דוגמה למתקן — לא נתונים. כותרות, תיאורים ומחירים מומצאים כדי לראות מסך, ולכן הם
 * כאן, תחת `app/qa/`, שאינו נפתח באתר החי. התצלומים הם של הארכיון (ה-slug אמיתי), והזמנים
 * יחסיים לרגע שהדף נפתח.
 */
export const LOT_ID = '11111111-2222-4333-8444-555555555555'
export const ITEM_ID = '99999999-8888-4777-8666-555555555555'

/**
 * "Seller photos" for the harness. There is no bucket here, so `photoUrl()` would answer 404s;
 * these paths climb out of `/storage/v1/object/public/worker-collector/` back to the site root
 * and land on archive photographs, which exist. Layout QA only — never a real path.
 */
const PHOTO = (file: string) => `../../../../../kits/${file}.webp`
const PHOTOS = [PHOTO('vp-1998-away-match-worn'), PHOTO('vp-1998-away'), PHOTO('vp-1998-home'), PHOTO('vp-1998-home-b')]

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR
const at = (offset: number) => new Date(Date.now() + offset).toISOString()

const label = (handle: number, extra: Partial<CollectorLabel> = {}): CollectorLabel => ({
  handle,
  nickname: null,
  since: 2026,
  completed: 0,
  trades: 0,
  sales: 0,
  items: 3,
  ...extra,
})

const item = (slug: string, extra: Partial<PublicItem> = {}): PublicItem => ({
  id: ITEM_ID,
  archiveSlug: slug,
  kitId: null,
  size: 'l',
  condition: 'excellent',
  itemType: 'original_period',
  authenticityClaim: 'match_worn',
  playerName: 'זהבי',
  playerNumber: 7,
  personalization: null,
  description: null,
  forTrade: false,
  forSale: false,
  askingPrice: null,
  currency: 'ILS',
  openToOffers: false,
  state: 'held',
  photos: [],
  openedAt: null,
  seller: label(1842, { completed: 4, sales: 3, nickname: 'הכורסא האדומה' }),
  ...extra,
})

const brief = (id: string, slug: string, extra: Partial<LotBrief>): LotBrief => ({
  id,
  title: 'חולצת חוץ 1998 — שוחקה בליגה',
  phase: 'live',
  archiveSlug: slug,
  kitId: null,
  photo: null,
  currency: 'ILS',
  startPrice: 300,
  currentPrice: 460,
  bidCount: 7,
  startsAt: at(-2 * DAY),
  endsAt: at(3 * HOUR + 14 * MIN + 5000),
  reserveSet: true,
  reserveMet: true,
  ...extra,
})

const BOARD_OPEN: LotBrief[] = [
  brief('a1111111-1111-4111-8111-111111111111', 'vp-1998-away-match-worn', {}),
  brief('a2222222-2222-4222-8222-222222222222', 'vp-1986-home', {
    title: 'חולצת בית 1986 — עונת האליפות, עם כל התוויות',
    photo: PHOTO('vp-1986-home'),
    currentPrice: 1250,
    bidCount: 19,
    endsAt: at(96 * 1000),
    reserveMet: false,
  }),
  brief('a3333333-3333-4333-8333-333333333333', 'fka-1975-76-home', {
    title: 'חולצת בית 1975/76',
    phase: 'upcoming',
    startsAt: at(3 * DAY + 2 * HOUR),
    endsAt: at(6 * DAY),
    currentPrice: 500,
    startPrice: 500,
    bidCount: 0,
    reserveSet: false,
    reserveMet: true,
  }),
  brief('a4444444-4444-4444-8444-444444444444', 'fka-2020-21-home', {
    title: 'חולצת בית 2020/21 חתומה',
    phase: 'upcoming',
    startsAt: at(2 * DAY + 5 * HOUR),
    endsAt: at(5 * DAY),
    currentPrice: 200,
    startPrice: 200,
    bidCount: 0,
    reserveMet: false,
  }),
]
const BOARD_RECENT: LotBrief[] = [
  brief('a5555555-5555-4555-8555-555555555555', 'vp-1985-away', {
    title: 'חולצת חוץ 1985 — הפס של ויזה',
    phase: 'completed',
    endsAt: at(-2 * DAY),
    currentPrice: 2100,
    bidCount: 23,
  }),
  brief('a6666666-6666-4666-8666-666666666666', 'vp-2001-home-league', {
    title: 'חולצת ליגה 2001',
    phase: 'ended',
    endsAt: at(-5 * DAY),
    currentPrice: 350,
    bidCount: 3,
    reserveMet: false,
  }),
]

type LotShape = Partial<LotState['lot']>
const BASE_LOT = (extra: LotShape): LotState['lot'] => ({
  ...brief(LOT_ID, 'vp-1998-away-match-worn', {}),
  description:
    'קיבלתי אותה ב-1999 משחקן הקבוצה אחרי משחק חוץ, ומאז היא בארון. כל התוויות במקום, ההדפס מקורי, כתם קטן מתחת לשרוול השמאלי (רואים בתמונה הרביעית). מגיעה עם הצילום מהמשחק.',
  minIncrement: 20,
  antiSnipeSeconds: 120,
  requestedHours: 72,
  minNext: 480,
  isSeller: false,
  leading: false,
  yourMax: null,
  watching: false,
  watchers: 12,
  won: false,
  winningAmount: null,
  reservePrice: null,
  decisionNote: null,
  sellerDone: false,
  winnerDone: false,
  ...extra,
})

const BIDS: LotState['bids'] = [
  { amount: 460, at: at(-4 * MIN), proxy: true, bidder: 1, you: false },
  { amount: 440, at: at(-4 * MIN), proxy: false, bidder: 3, you: false },
  { amount: 420, at: at(-38 * MIN), proxy: false, bidder: 2, you: false },
  { amount: 380, at: at(-3 * HOUR), proxy: true, bidder: 1, you: false },
  { amount: 360, at: at(-3 * HOUR), proxy: false, bidder: 2, you: false },
  { amount: 320, at: at(-1 * DAY), proxy: false, bidder: 1, you: false },
  { amount: 300, at: at(-2 * DAY + HOUR), proxy: false, bidder: 1, you: false },
]
const youAre = (n: number) => BIDS.map((bid) => ({ ...bid, you: bid.bidder === n }))

function lotFor(view: QaView): { state: LotState; signedIn: boolean } {
  const plain = { item: item('vp-1998-away-match-worn'), bids: BIDS }
  switch (view) {
    case 'lot-outbid':
      return { state: { ...plain, lot: BASE_LOT({ yourMax: 440, watching: true }), bids: youAre(3) }, signedIn: true }
    case 'lot-guest':
      return { state: { ...plain, lot: BASE_LOT({ endsAt: at(95 * 1000) }) }, signedIn: false }
    case 'lot-upcoming':
      return {
        state: {
          item: item('fka-1975-76-home', { authenticityClaim: 'original', playerName: null, playerNumber: null }),
          bids: [],
          lot: BASE_LOT({
            title: 'חולצת בית 1975/76',
            archiveSlug: 'fka-1975-76-home',
            phase: 'upcoming',
            startsAt: at(3 * DAY + 2 * HOUR + 17 * MIN),
            endsAt: at(6 * DAY),
            currentPrice: 500,
            startPrice: 500,
            minNext: 500,
            bidCount: 0,
            reserveSet: false,
            watchers: 31,
          }),
        },
        signedIn: true,
      }
    case 'lot-seller':
      return {
        state: { ...plain, item: item('vp-1998-away-match-worn', { mine: true }), lot: BASE_LOT({ isSeller: true, reservePrice: 400 }) },
        signedIn: true,
      }
    case 'lot-won':
      return {
        state: {
          ...plain,
          bids: youAre(1),
          lot: BASE_LOT({
            phase: 'awaiting_completion',
            endsAt: at(-3 * HOUR),
            won: true,
            winningAmount: 460,
            sellerDone: true,
            connectionId: '5c2e8a41-7d3b-4f9e-a1c6-2b8d0e4f6a93',
          }),
        },
        signedIn: true,
      }
    case 'lot-completed':
      return {
        state: {
          ...plain,
          bids: youAre(1),
          lot: BASE_LOT({ phase: 'completed', endsAt: at(-2 * DAY), won: true, winningAmount: 460, sellerDone: true, winnerDone: true }),
        },
        signedIn: true,
      }
    case 'lot-ended':
      return {
        state: { ...plain, lot: BASE_LOT({ phase: 'ended', endsAt: at(-DAY), reserveMet: false, currentPrice: 350, bidCount: 3 }) },
        signedIn: true,
      }
    case 'lot-photos':
      return {
        state: { ...plain, item: item('vp-1998-away-match-worn', { photos: PHOTOS }), lot: BASE_LOT({}) },
        signedIn: true,
      }
    default:
      return { state: { ...plain, lot: BASE_LOT({ leading: true, yourMax: 1000, watching: true }), bids: youAre(1) }, signedIn: true }
  }
}

const OWNER: OwnerItem = {
  ...item('vp-1998-away-match-worn', { photos: PHOTOS.slice(0, 2), forSale: false }),
  suspendedReason: null,
  createdAt: at(-30 * DAY),
  openConnections: 0,
  lot: null,
  wanters: 4,
}

const ADMIN_LOT = (id: string, extra: Partial<AdminLotWithBids>): AdminLotWithBids => ({
  ...brief(id, 'vp-1998-away-match-worn', {}),
  status: 'pending_approval',
  description: 'קיבלתי אותה ב-1999 משחקן הקבוצה. כל התוויות במקום, כתם קטן מתחת לשרוול.',
  reservePrice: 400,
  requestedHours: 72,
  minIncrement: 20,
  seller: label(1842, { completed: 4 }),
  item: item('vp-1998-away-match-worn'),
  decisionNote: null,
  createdAt: at(-5 * HOUR),
  ...extra,
})

const ADMIN_BIDS: AdminLotWithBids['bids'] = [
  { id: 'b1', amount: 460, proxy: true, status: 'active', at: at(-4 * MIN), bidder: label(77) },
  { id: 'b2', amount: 440, proxy: false, status: 'active', at: at(-4 * MIN), bidder: label(3120) },
  { id: 'b3', amount: 420, proxy: false, status: 'voided', at: at(-38 * MIN), bidder: label(508) },
  { id: 'b4', amount: 300, proxy: false, status: 'active', at: at(-2 * DAY), bidder: label(77) },
]

const REPORTS: AdminReport[] = [
  {
    id: 'r1',
    reason: 'fake',
    details: 'התווית בתמונה השלישית לא תואמת את העונה. נראה כמו שחזור.',
    status: 'open',
    createdAt: at(-3 * HOUR),
    reporter: label(3120),
    reported: label(1842),
    connectionId: 'c1',
    itemId: ITEM_ID,
    lotId: null,
    resolutionNote: null,
    handledAt: null,
  },
  {
    id: 'r2',
    reason: 'spam',
    details: null,
    status: 'open',
    createdAt: at(-DAY),
    reporter: label(508),
    reported: label(77),
    connectionId: null,
    itemId: null,
    lotId: LOT_ID,
    resolutionNote: null,
    handledAt: null,
  },
]

const THREAD: Thread = {
  connection: { id: 'c1', kind: 'buy', status: 'negotiating', role: 'observer', myDone: false, theirDone: false, createdAt: at(-2 * DAY) },
  initiator: label(3120),
  recipient: label(1842),
  item: null,
  messages: [
    { id: 'm1', kind: 'text', body: 'היי, אפשר תמונה של התווית מקרוב?', meta: null, createdAt: at(-2 * DAY), from: 'initiator' },
    { id: 'm2', kind: 'text', body: 'בטח, העליתי עכשיו.', meta: null, createdAt: at(-2 * DAY + HOUR), from: 'recipient' },
    { id: 'm3', kind: 'offer', body: null, meta: { kind: 'price', amount: 250, currency: 'ILS' }, createdAt: at(-DAY), from: 'initiator' },
  ],
  offers: [],
}

const SHOPS: MerchantRow[] = [
  {
    id: 's1',
    archive_slug: 'fka-2026-27-home',
    kit_id: null,
    season_label: '2026/27',
    merchant_name: 'החנות הרשמית של הפועל תל אביב',
    merchant_type: 'club_store',
    offer_type: 'official',
    title_he: 'חולצת המשחק הרשמית – מדי הבית | עונת 2026/27',
    price: '270.00',
    currency: 'ILS',
    product_url: 'https://shop.htafc.co.il/product/red-match-t-shirt/',
    image_url: null,
    availability: 'in_stock',
    last_checked_at: '2026-09-22',
    is_official_club_store: true,
    is_active: true,
    sort_rank: 10,
  },
  {
    id: 's2',
    archive_slug: null,
    kit_id: null,
    season_label: '1995/96',
    merchant_name: 'Retro Jerseys',
    merchant_type: 'retro_store',
    offer_type: 'replica',
    title_he: 'שחזור של חולצת הבית 1995/96',
    price: '50.00',
    currency: 'EUR',
    product_url:
      'https://www.retro-jerseys.com/products/hapoel-tel-aviv-shirt-1995-1996-home-retro-jerseys-%D7%97%D7%95%D7%9C%D7%A6%D7%94-%D7%A9%D7%9C-%D7%94%D7%A4%D7%95%D7%A2%D7%9C-%D7%AA%D7%9C-%D7%90%D7%91%D7%99%D7%91',
    image_url: null,
    availability: 'unknown',
    last_checked_at: '2026-09-22',
    is_official_club_store: false,
    is_active: true,
    sort_rank: 100,
  },
]

const AUDIT: AuditEntry[] = [
  { id: 3, action: 'update', entity: 'worker_auction_bid', entityId: 'b3', detail: { status: ['active', 'voided'], voided_note: [null, 'חשבון קשור למוכר'] }, at: at(-30 * MIN), actor: label(1) },
  { id: 2, action: 'read', entity: 'worker_collector_connection', entityId: 'c1', detail: null, at: at(-2 * HOUR), actor: label(1) },
  { id: 1, action: 'insert', entity: 'worker_merchant_offer', entityId: 's1', detail: { offer_type: 'official' }, at: at(-DAY), actor: null },
]

const OVERVIEW: AdminOverview = {
  openReports: 2,
  pendingLots: 1,
  liveLots: 3,
  awaitingLots: 1,
  collectors: 214,
  items: 612,
  listed: 88,
  completed: 17,
  merchantOffers: 28,
}

/** The fake pipe: every call answers from the fixtures above, after a beat, like a network would. */
const EMPTY_OK: Result<object> = { ok: true }

export function fixtureApi(view: QaView): Partial<AuctionApi> {
  const later = <T,>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 120))
  const { state, signedIn } = lotFor(view)
  let current = state
  return {
    signedIn: () => later(signedIn),
    auctionList: (scope = 'open') =>
      later({ ok: true as const, lots: scope === 'open' ? BOARD_OPEN : scope === 'recent' ? BOARD_RECENT : [BOARD_OPEN[0] as LotBrief] }),
    auctionState: () => later({ ok: true as const, ...current }),
    auctionBid: (_id, max) => {
      const lot = current.lot
      if (max < lot.minNext && !lot.leading) return later({ ok: false as const, error: 'too_low' as const, minNext: lot.minNext })
      const price = lot.leading ? lot.currentPrice : lot.minNext
      current = {
        ...current,
        lot: { ...lot, leading: true, yourMax: max, currentPrice: price, minNext: price + lot.minIncrement, bidCount: lot.bidCount + (lot.leading ? 0 : 1) },
        bids: [{ amount: price, at: new Date().toISOString(), proxy: false, bidder: 4, you: true }, ...current.bids],
      }
      return later({ ok: true as const, leading: true, state: { ok: true as const, ...current } })
    },
    auctionWatch: (_id, on) => {
      current = { ...current, lot: { ...current.lot, watching: on, watchers: current.lot.watchers + (on ? 1 : -1) } }
      return later({ ok: true as const, watching: on })
    },
    auctionComplete: () => {
      current = { ...current, lot: { ...current.lot, phase: 'completed', winnerDone: true } }
      return later({ ok: true as const, status: 'completed' })
    },
    auctionWithdraw: () => later(EMPTY_OK),
    auctionSubmit: () => later({ ok: true as const, lotId: LOT_ID }),
    closetMine: () =>
      later({
        ok: true as const,
        profile: { handle: 1842, showNickname: true, visibility: 'public' as const, shareToken: 'qa' },
        label: label(1842),
        items: [OWNER],
        wants: [],
        unread: 0,
      } satisfies { ok: true } & Closet),
    adminWhoami: () => later({ ok: true as const, admin: true }),
    adminOverview: () => later({ ok: true as const, ...OVERVIEW }),
    adminLots: (status = 'pending_approval') =>
      later({
        ok: true as const,
        lots: (status === 'pending_approval'
          ? [ADMIN_LOT('d1111111-1111-4111-8111-111111111111', {})]
          : status === 'scheduled'
            ? [ADMIN_LOT('d2222222-2222-4222-8222-222222222222', { status: 'scheduled', phase: 'live', bids: ADMIN_BIDS })]
            : []) as AdminLot[],
      }),
    adminLotDecide: () => later({ ok: true as const, status: 'scheduled' }),
    adminLotCancel: () => later(EMPTY_OK),
    adminBidVoid: () => later({ ok: true as const, state: { ok: false as const, error: 'off' as const } }),
    adminReports: () => later({ ok: true as const, reports: REPORTS }),
    adminReportResolve: () => later(EMPTY_OK),
    adminConnectionView: () => later({ ok: true as const, ...THREAD }),
    adminItemSuspend: () => later(EMPTY_OK),
    adminMerchantList: () => later({ ok: true as const, offers: SHOPS as unknown as Record<string, unknown>[] }),
    adminMerchantUpsert: () => later({ ok: true as const, id: 's3' }),
    adminAudit: () => later({ ok: true as const, entries: AUDIT }),
  }
}
