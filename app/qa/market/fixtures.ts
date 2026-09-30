import type { CollectorLabel, Matches, MerchantOffer, Offer, OwnerItem, PublicItem, ShirtSignal, Thread, ThreadMessage } from '@/lib/collector/types'

/**
 * Fixture rows for `/qa/market` — shaped exactly like what the SQL functions answer, so the harness
 * draws the real components with nothing mocked but the network.
 *
 * Photo paths climb out of the storage prefix `photoUrl()` builds (`/storage/v1/object/public/
 * worker-collector/…`) back to `/kits/…`, so a copy's "user photo" here is an archive cut-out served
 * by this dev server rather than a 404 from a bucket that does not exist in this build. QA only.
 */
const photo = (slug: string) => `../../../../../kits/${slug}.webp`

const label = (handle: number, extra: Partial<CollectorLabel> = {}): CollectorLabel => ({
  handle,
  nickname: null,
  since: 2026,
  completed: 0,
  trades: 0,
  sales: 0,
  items: 0,
  ...extra,
})

export const SELLER = label(1842, { completed: 12, trades: 4, sales: 8, items: 38 })
export const BUYER = label(2207, { completed: 1, sales: 0, trades: 1, items: 6 })
export const ME = label(3310, { completed: 2, trades: 2, items: 14, nickname: null })
const OTHER = label(977, { nickname: 'הצפון האדום', completed: 5, trades: 5, items: 51, since: 2026 })

const base = {
  kitId: null,
  size: 'l' as const,
  condition: 'excellent' as const,
  itemType: 'original_period' as const,
  authenticityClaim: 'original' as const,
  playerName: null,
  playerNumber: null,
  personalization: null,
  description: null,
  forTrade: false,
  forSale: true,
  askingPrice: 250,
  currency: 'ILS' as const,
  openToOffers: false,
  state: 'held' as const,
  photos: [] as string[],
}

const clock = Date.parse('2026-09-22T09:00:00Z')
const at = (minutesAgo: number) => new Date(clock - minutesAgo * 60_000).toISOString()

export const ITEMS: PublicItem[] = [
  {
    ...base,
    id: 'qa-a',
    archiveSlug: 'vp-1985-away',
    askingPrice: 650,
    description: 'קניתי אותה ב-1985 בדוכן ליד בלומפילד. נכבסה ביד כל השנים, הסמל שלם, בלי חורים. מוכר כי אני עובר דירה ואין לה מקום.',
    photos: [photo('vp-1985-away'), photo('vp-1986-home'), photo('vp-1988-home')],
    openedAt: at(40),
    seller: SELLER,
  },
  {
    ...base,
    id: 'qa-b',
    archiveSlug: 'vp-1999-home',
    itemType: 'replica',
    authenticityClaim: 'replica',
    size: 'm',
    condition: 'mint',
    forTrade: true,
    askingPrice: null,
    openToOffers: true,
    photos: [photo('vp-1999-home')],
    openedAt: at(95),
    seller: OTHER,
  },
  {
    ...base,
    id: 'qa-c',
    archiveSlug: 'vp-1999-home',
    size: 'xl',
    condition: 'worn',
    forTrade: true,
    forSale: false,
    askingPrice: null,
    playerName: 'גלזר',
    playerNumber: 10,
    openedAt: at(200),
    seller: BUYER,
  },
  {
    ...base,
    id: 'qa-d',
    archiveSlug: 'fka-1965-66-home',
    askingPrice: 1200,
    authenticityClaim: 'match_worn',
    condition: 'good',
    photos: [photo('fka-1965-66-home')],
    openedAt: at(300),
    seller: OTHER,
  },
  {
    ...base,
    id: 'qa-e',
    archiveSlug: 'vp-2001-home',
    itemType: 'fan_reproduction',
    authenticityClaim: 'replica',
    forTrade: true,
    forSale: false,
    askingPrice: null,
    photos: [photo('vp-2001-home')],
    openedAt: at(420),
    seller: SELLER,
  },
  {
    ...base,
    id: 'qa-f',
    archiveSlug: 'vp-1994-home',
    askingPrice: 180,
    size: 's',
    photos: [photo('vp-1994-home')],
    openedAt: at(500),
    mine: true,
    seller: ME,
  },
  {
    ...base,
    id: 'qa-g',
    archiveSlug: 'fka-2006-07-home',
    kitId: 'kit-2006-07-home',
    askingPrice: 250,
    authenticityClaim: 'unsure',
    itemType: 'unknown',
    photos: [photo('fka-2006-07-home')],
    openedAt: at(700),
    seller: BUYER,
  },
  {
    ...base,
    id: 'qa-h',
    archiveSlug: 'vp-2010-home',
    forTrade: true,
    forSale: false,
    askingPrice: null,
    state: 'reserved',
    openedAt: at(900),
    seller: OTHER,
  },
  {
    ...base,
    id: 'qa-i',
    archiveSlug: 'vp-1998-away',
    askingPrice: 320,
    currency: 'EUR',
    size: 'xxl',
    photos: [photo('vp-1998-away')],
    openedAt: at(1300),
    seller: SELLER,
  },
  {
    ...base,
    id: 'qa-j',
    archiveSlug: 'vp-1999-home',
    askingPrice: 400,
    size: 'kids',
    condition: 'damaged',
    openedAt: at(1500),
    seller: SELLER,
  },
  {
    ...base,
    id: 'qa-k',
    archiveSlug: 'vp-1999-home',
    forTrade: true,
    askingPrice: 300,
    openedAt: at(1700),
    seller: BUYER,
  },
]

const owner = (item: Partial<OwnerItem> & Pick<OwnerItem, 'id' | 'archiveSlug'>): OwnerItem => ({
  ...base,
  forSale: false,
  forTrade: true,
  askingPrice: null,
  openedAt: at(60),
  suspendedReason: null,
  createdAt: at(9000),
  openConnections: 0,
  lot: null,
  wanters: 0,
  ...item,
})

export const MY_TRADES: OwnerItem[] = [
  owner({ id: 'qa-m1', archiveSlug: 'vp-1992-home', size: 'l' }),
  owner({ id: 'qa-m2', archiveSlug: 'vp-1997-away', size: 'm', condition: 'good' }),
  owner({ id: 'qa-m3', archiveSlug: 'fka-1974-75-home', size: 'xl', condition: 'worn' }),
]

/** a copy as a conversation carries it: the same row without the seller label */
const item = (row: PublicItem): Omit<PublicItem, 'seller'> => {
  const { seller: _seller, ...rest } = row
  void _seller
  return rest
}
const swapTheirs = item(ITEMS[4]!)

export const MATCHES: Matches = {
  perfectSwaps: [{ theirs: ITEMS[4]!, mine: MY_TRADES[0]! }],
  wanted: [ITEMS[0]!, ITEMS[3]!, ITEMS[8]!],
  wantedByOthers: [
    { item: owner({ id: 'qa-f', archiveSlug: 'vp-1994-home', forSale: true, forTrade: false, askingPrice: 180 }), wanters: 4, wantersWithTrades: 2 },
    { item: owner({ id: 'qa-m9', archiveSlug: 'vp-1988-home', forTrade: false }), wanters: 1, wantersWithTrades: 0 },
  ],
  auctions: [
    {
      id: 'qa-lot',
      title: 'חוץ 1998 — Match Worn, עם חתימות',
      phase: 'live',
      archiveSlug: 'vp-1998-away-match-worn',
      kitId: null,
      photo: null,
      currency: 'ILS',
      startPrice: 500,
      currentPrice: 1450,
      bidCount: 7,
      startsAt: at(2000),
      endsAt: at(-600),
      reserveSet: true,
      reserveMet: true,
    },
  ],
}

export const SIGNAL: ShirtSignal = { have: 41, want: 18, forTrade: 3, forSale: 1, live: 0, youHave: false, youWant: true }

export const OFFERS: MerchantOffer[] = [
  {
    id: 'qa-o2',
    archiveSlug: 'vp-1985-away',
    kitId: null,
    seasonLabel: null,
    merchantName: 'Retro Jerseys',
    merchantType: 'retro_store',
    offerType: 'replica',
    title: 'חולצת חוץ 1985 — שחזור',
    price: 89,
    currency: 'EUR',
    productUrl: 'https://www.retro-jerseys.com/collections/hapoel-tel-aviv-retro-jerseys?ref=affiliate-7&utm_source=worker#top',
    imageUrl: null,
    availability: 'in_stock',
    lastCheckedAt: at(3000),
    isOfficialClubStore: false,
  },
  {
    id: 'qa-o1',
    archiveSlug: 'vp-1985-away',
    kitId: null,
    seasonLabel: null,
    merchantName: 'החנות הרשמית — הפועל תל אביב',
    merchantType: 'club_store',
    offerType: 'official',
    title: 'חולצת משחק 2026/27',
    price: 299,
    currency: 'ILS',
    productUrl: 'https://shop.htafc.co.il/shop/?utm_campaign=x',
    imageUrl: null,
    availability: 'in_stock',
    lastCheckedAt: at(3000),
    isOfficialClubStore: true,
  },
  {
    id: 'qa-o3',
    archiveSlug: 'vp-1985-away',
    kitId: null,
    seasonLabel: null,
    merchantName: 'Classic Football Shirts',
    merchantType: 'other',
    offerType: 'external_new',
    title: null,
    price: null,
    currency: 'ILS',
    productUrl: 'javascript:alert(1)',
    imageUrl: null,
    availability: 'out_of_stock',
    lastCheckedAt: null,
    isOfficialClubStore: false,
  },
]

// ---------------------------------------------------------------- threads

const msg = (id: string, kind: ThreadMessage['kind'], from: ThreadMessage['from'], minutesAgo: number, body: string | null, meta: ThreadMessage['meta'] = null): ThreadMessage => ({
  id,
  kind,
  from,
  body,
  meta,
  createdAt: at(minutesAgo),
})

const offer = (id: string, from: Offer['from'], minutesAgo: number, rest: Partial<Offer>): Offer => ({
  id,
  kind: 'price',
  amount: null,
  currency: 'ILS',
  status: 'open',
  from,
  createdAt: at(minutesAgo),
  items: [],
  ...rest,
})

/** I hold the 1985 away shirt; collector 2207 asked to buy it, with an offer, and I have not answered. */
export const THREAD_REQUEST: Thread = {
  connection: { id: 'qa-t1', kind: 'buy', status: 'requested', role: 'recipient', myDone: false, theirDone: false, createdAt: at(30) },
  initiator: BUYER,
  recipient: ME,
  item: item({ ...ITEMS[0]!, seller: ME }),
  messages: [
    msg('m1', 'text', 'initiator', 30, 'שלום! מחפש את החולצה הזאת כבר שנים — אבא שלי לקח אותי איתה למשחק הראשון שלי. היא עדיין אצלך?'),
    msg('m2', 'offer', 'initiator', 29, null, { offerId: 'o1', kind: 'price', amount: 550, currency: 'ILS' }),
  ],
  offers: [offer('o1', 'initiator', 29, { amount: 550 })],
}

/** I asked to trade for collector 1842's 2001 home; the talk is on, my trade offer was answered with a price. */
export const THREAD_TALK: Thread = {
  connection: { id: 'qa-t2', kind: 'trade', status: 'negotiating', role: 'initiator', myDone: false, theirDone: false, createdAt: at(2900) },
  initiator: ME,
  recipient: SELLER,
  item: swapTheirs,
  messages: [
    msg('m1', 'text', 'initiator', 2900, 'היי, יש לי את הבית של 1992 פתוחה להחלפה. מתאים לך?'),
    msg('m2', 'system', 'system', 2800, 'accepted'),
    msg('m3', 'text', 'recipient', 2790, 'מתאים לדבר. איזה מצב היא?\nאני צריך לראות את הצווארון.'),
    msg('m4', 'photo_request', 'recipient', 2789, null),
    msg('m5', 'offer', 'initiator', 1500, null, { offerId: 'o1', kind: 'trade', items: ['vp-1992-home'] }),
    msg('m6', 'offer', 'recipient', 70, null, { offerId: 'o2', kind: 'price', amount: 420, currency: 'ILS' }),
    msg('m7', 'text', 'recipient', 69, 'בעצם אני מעדיף למכור. 420 ואני סוגר איתך היום.'),
  ],
  offers: [
    offer('o1', 'initiator', 1500, { kind: 'trade', status: 'countered', items: [item({ ...ITEMS[0]!, id: 'qa-m1', archiveSlug: 'vp-1992-home', photos: [] })] }),
    offer('o2', 'recipient', 70, { amount: 420 }),
  ],
}

/** A sale that was agreed on an accepted offer; I marked it done, the buyer has not yet. */
export const THREAD_WAITING: Thread = {
  connection: { id: 'qa-t3', kind: 'buy', status: 'agreed', role: 'recipient', myDone: true, theirDone: false, createdAt: at(5000) },
  initiator: OTHER,
  recipient: ME,
  item: item({ ...ITEMS[5]!, state: 'reserved' }),
  messages: [
    msg('m1', 'text', 'initiator', 5000, 'אפשר 150?'),
    msg('m2', 'system', 'system', 4990, 'accepted'),
    msg('m3', 'offer', 'initiator', 4980, null, { offerId: 'o1', kind: 'price', amount: 150, currency: 'ILS' }),
    msg('m4', 'offer', 'recipient', 4000, null, { offerId: 'o2', kind: 'price', amount: 170, currency: 'ILS' }),
    msg('m5', 'system', 'system', 3900, 'offer_accepted', { offerId: 'o2' }),
    msg('m6', 'text', 'initiator', 3890, 'סגור. נפגשים ביום שבת בכניסה לשער 5.'),
    msg('m7', 'system', 'system', 20, 'half_done'),
  ],
  offers: [
    offer('o1', 'initiator', 4980, { amount: 150, status: 'countered' }),
    offer('o2', 'recipient', 4000, { amount: 170, status: 'accepted' }),
  ],
}

/** The perfect swap, done: my 1992 home for collector 1842's 2001 home. */
export const THREAD_DONE: Thread = {
  connection: { id: 'qa-t4', kind: 'trade', status: 'completed', role: 'initiator', myDone: true, theirDone: true, createdAt: at(9000) },
  initiator: ME,
  recipient: SELLER,
  item: { ...swapTheirs, state: 'traded', forTrade: false },
  messages: [
    msg('m1', 'text', 'initiator', 9000, 'ההתאמה אמרה שאתה מחפש את 1992. יש לי אותה.'),
    msg('m2', 'system', 'system', 8990, 'accepted'),
    msg('m3', 'offer', 'initiator', 8980, null, { offerId: 'o1', kind: 'trade', items: ['vp-1992-home'] }),
    msg('m4', 'system', 'system', 8000, 'offer_accepted', { offerId: 'o1' }),
    msg('m5', 'system', 'system', 300, 'half_done'),
    msg('m6', 'system', 'system', 12, 'completed'),
  ],
  offers: [offer('o1', 'initiator', 8980, { kind: 'trade', status: 'accepted', items: [item({ ...ITEMS[0]!, id: 'qa-m1', archiveSlug: 'vp-1992-home', photos: [] })] })],
}
