import { t, type MessageKey } from '@/lib/i18n'

import { formatPrice, handleLabel } from './labels'
import type {
  CollectorLabel,
  CollectorShirt,
  ConnectionStatus,
  Currency,
  MerchantOffer,
  Offer,
  PublicItem,
  Side,
  Thread,
  ThreadMessage,
} from './types'

/**
 * שוק האדומים — ההיגיון שאינו מסך: איך שורה מהמסד הופכת למשפט, ומה מותר לכל צד בכל שלב.
 *
 * הכול כאן טהור: בלי רשת, בלי `window`, בלי React. המסכים ב-`app/kits/market` ורכיבי
 * `components/market` קוראים לזה, והבדיקות ב-`tests/market.test.ts` בודקות את זה ישירות —
 * כי "איזה כפתור מופיע למי" הוא חוזה, ולא משהו שמגלים בצילום מסך.
 */

// ------------------------------------------------------------------ bidi

/** LRI … PDI — the string form of `<bdi dir="ltr">`, for a figure inside a sentence built by t(). */
export const ltr = (text: string) => `\u2066${text}\u2069`

// ------------------------------------------------------------------ the shirt

/** `1994/95`, or `1994 בערך` — the archive's own rule (rule 69 §4), as a string for alt text and sentences. */
export function shirtDateText(shirt: Pick<CollectorShirt, 'seasonLabel' | 'seasonAmbiguous' | 'yearRaw'>): string {
  if (!shirt.seasonAmbiguous && shirt.seasonLabel) return ltr(shirt.seasonLabel)
  return t('kits.archive.approxOf', { y: ltr(String(shirt.yearRaw ?? '')) })
}

/** `בית · 1994/95` — the name of a shirt wherever a sentence needs one. */
export function shirtName(shirt: CollectorShirt | undefined | null): string {
  if (!shirt) return t('market.shirt.unknown')
  return t('market.shirt.name', { variant: shirt.variantHe, date: shirtDateText(shirt) })
}

/** `1990` → `שנות ה-90`; `2010` → `שנות ה-2010` (the archive's own rail). */
export function decadeLabel(decade: number): string {
  const short = decade < 2000 ? String(decade).slice(2) : String(decade)
  return t('kits.archive.decade', { d: short })
}

// ------------------------------------------------------------------ the table

export type KindFilter = 'all' | 'sale' | 'trade'
export type DecadeFilter = number | 'all'

export type ListingGroup = { shirt: CollectorShirt; items: PublicItem[]; latest: string }

const byOpened = (a: PublicItem, b: PublicItem) => (b.openedAt ?? '').localeCompare(a.openedAt ?? '')

export function matchesKind(item: Pick<PublicItem, 'forSale' | 'forTrade'>, kind: KindFilter): boolean {
  if (kind === 'sale') return item.forSale
  if (kind === 'trade') return item.forTrade
  return item.forSale || item.forTrade
}

/**
 * The copies on the table, hung on the archive shirt they are copies of (spec §6: the archive is
 * the model, the row is the object). Groups are ordered by their freshest copy, so a shirt somebody
 * opened this morning is on top; a copy whose shirt the archive does not know is left out rather
 * than shown without a picture — the database refuses such a slug anyway (`worker_slug_ok`).
 */
export function groupListings(
  items: readonly PublicItem[],
  shirts: Readonly<Record<string, CollectorShirt>>,
  filter: { kind: KindFilter; decade: DecadeFilter },
): ListingGroup[] {
  const groups = new Map<string, ListingGroup>()
  for (const item of items) {
    const shirt = shirts[item.archiveSlug]
    if (!shirt) continue
    if (!matchesKind(item, filter.kind)) continue
    if (filter.decade !== 'all' && shirt.decade !== filter.decade) continue
    const group = groups.get(shirt.slug) ?? { shirt, items: [], latest: '' }
    group.items.push(item)
    if ((item.openedAt ?? '') > group.latest) group.latest = item.openedAt ?? ''
    groups.set(shirt.slug, group)
  }
  return [...groups.values()]
    .map((group) => ({ ...group, items: [...group.items].sort(byOpened) }))
    .sort((a, b) => b.latest.localeCompare(a.latest) || a.shirt.year - b.shirt.year)
}

/** The counts on the filter chips — read off everything on the table, before the filter itself. */
export function tableFacets(items: readonly PublicItem[], shirts: Readonly<Record<string, CollectorShirt>>) {
  const known = items.filter((item) => shirts[item.archiveSlug])
  const decades = new Map<number, number>()
  for (const item of known) {
    const decade = shirts[item.archiveSlug]!.decade
    decades.set(decade, (decades.get(decade) ?? 0) + 1)
  }
  return {
    all: known.length,
    sale: known.filter((item) => item.forSale).length,
    trade: known.filter((item) => item.forTrade).length,
    decades: [...decades.entries()].sort((a, b) => a[0] - b[0]).map(([decade, count]) => ({ decade, count })),
  }
}

/** A `?slug=` the archive handed over, accepted only when it names a shirt the archive has. */
export function slugFromSearch(search: string, shirts: Readonly<Record<string, CollectorShirt>>): string | null {
  const slug = new URLSearchParams(search).get('slug')
  return slug && shirts[slug] ? slug : null
}

/** What a copy on the table asks for, in one line: a price, "open to offers", and/or "for trade". */
export function copyTerms(item: Pick<PublicItem, 'forSale' | 'forTrade' | 'askingPrice' | 'currency' | 'openToOffers'>): string[] {
  const out: string[] = []
  if (item.forSale) {
    if (item.askingPrice !== null) out.push(ltr(formatPrice(item.askingPrice, item.currency)))
    else if (item.openToOffers) out.push(t('collector.openToOffers'))
    else out.push(t('collector.forSale'))
  }
  if (item.forTrade) out.push(t('market.copy.trade'))
  return out
}

const SYMBOL: Record<Currency, string> = { ILS: '₪', EUR: '€', USD: '$' }
/** The sign beside an amount field — the three currencies the database accepts. */
export const currencySymbol = (currency: Currency) => SYMBOL[currency]

// ------------------------------------------------------------------ the thread

const SYSTEM: Record<string, MessageKey> = {
  accepted: 'market.system.accepted',
  declined: 'market.system.declined',
  offer_accepted: 'market.system.offer_accepted',
  offer_declined: 'market.system.offer_declined',
  agreed: 'market.system.agreed',
  half_done: 'market.system.half_done',
  completed: 'market.system.completed',
  cancelled: 'market.system.cancelled',
  auction_won: 'market.system.auction_won',
}

/** The nine codes the database writes into a system message, each as the sentence a person reads. */
export const SYSTEM_CODES = Object.keys(SYSTEM) as readonly string[]

export function systemSentence(code: string | null): string {
  const key = code ? SYSTEM[code] : undefined
  return t(key ?? 'market.system.unknown')
}

const STATUS: Record<ConnectionStatus, MessageKey> = {
  requested: 'market.status.requested',
  accepted: 'market.status.accepted',
  negotiating: 'market.status.negotiating',
  agreed: 'market.status.agreed',
  completed: 'market.status.completed',
  declined: 'market.status.declined',
  cancelled: 'market.status.cancelled',
  reported: 'market.status.reported',
}
export const statusLabel = (status: ConnectionStatus) => t(STATUS[status])

const OFFER_STATUS: Record<Offer['status'], MessageKey> = {
  open: 'market.offer.status.open',
  accepted: 'market.offer.status.accepted',
  declined: 'market.offer.status.declined',
  countered: 'market.offer.status.countered',
  withdrawn: 'market.offer.status.withdrawn',
  superseded: 'market.offer.status.superseded',
}
export const offerStatusLabel = (status: Offer['status']) => t(OFFER_STATUS[status])

/** Which side of the connection I am, or null for a view that is not a participant's. */
export function mySide(thread: Pick<Thread, 'connection'>): Side | null {
  const role = thread.connection.role
  return role === 'initiator' || role === 'recipient' ? role : null
}

export const otherSide = (side: Side): Side => (side === 'initiator' ? 'recipient' : 'initiator')

export function labelOf(thread: Pick<Thread, 'initiator' | 'recipient'>, side: Side): CollectorLabel {
  return side === 'initiator' ? thread.initiator : thread.recipient
}

/** The collector across the table. */
export function counterpart(thread: Pick<Thread, 'connection' | 'initiator' | 'recipient'>): CollectorLabel {
  const me = mySide(thread)
  return labelOf(thread, me ? otherSide(me) : 'recipient')
}

/** Who wrote a message, as a person reads it: "אני", "אספן #1842", or nobody (the system). */
export function senderName(thread: Pick<Thread, 'connection' | 'initiator' | 'recipient'>, from: ThreadMessage['from']): string | null {
  if (from === 'system') return null
  return from === mySide(thread) ? t('market.thread.me') : handleLabel(labelOf(thread, from))
}

/**
 * The line printed on an offer slip (spec §17: "מאור הציע ₪250"). The amount is isolated LTR inside
 * the sentence, so `₪250` stays one run in a Hebrew line.
 */
export function offerSlipLine(
  offer: { kind: 'price' | 'trade'; amount: number | null; currency: Currency },
  by: 'me' | Pick<CollectorLabel, 'handle' | 'nickname'>,
): string {
  const mine = by === 'me'
  if (offer.kind === 'price') {
    const amount = offer.amount === null ? '' : ltr(formatPrice(offer.amount, offer.currency))
    return mine
      ? t('market.offer.price.mine', { amount })
      : t('market.offer.price.theirs', { who: handleLabel(by), amount })
  }
  return mine ? t('market.offer.trade.mine') : t('market.offer.trade.theirs', { who: handleLabel(by) })
}

/** The slip a message of kind 'offer' points to — by id, falling back to what the message itself carried. */
export function offerOfMessage(thread: Pick<Thread, 'offers'>, message: ThreadMessage): Offer | null {
  const id = message.meta?.offerId
  return (id && thread.offers.find((offer) => offer.id === id)) || null
}

/** The open offer the OTHER side made — the one I can accept, decline or answer with a price. */
export function openOfferFromOther(thread: Pick<Thread, 'connection' | 'offers'>): Offer | null {
  const me = mySide(thread)
  if (!me) return null
  const open = thread.offers.filter((offer) => offer.status === 'open' && offer.from !== me)
  return open.length ? open[open.length - 1]! : null
}

/** My own open offer, if the other side has not answered it yet. */
export function myOpenOffer(thread: Pick<Thread, 'connection' | 'offers'>): Offer | null {
  const me = mySide(thread)
  if (!me) return null
  const open = thread.offers.filter((offer) => offer.status === 'open' && offer.from === me)
  return open.length ? open[open.length - 1]! : null
}

const LIVE: readonly ConnectionStatus[] = ['requested', 'accepted', 'negotiating', 'agreed']
const NEGOTIABLE: readonly ConnectionStatus[] = ['requested', 'accepted', 'negotiating']

export type ThreadActions = {
  /** the recipient of a request: accept it or decline it */
  respond: boolean
  compose: boolean
  photoRequest: boolean
  offerPrice: boolean
  /** only the side that ASKED offers its own shirts in exchange (the database checks they are its own) */
  offerTrade: boolean
  /** an open offer from the other side: accept / decline */
  answerOffer: boolean
  /** …and answer it with a price of my own (a price offer only) */
  counter: boolean
  agreed: boolean
  done: boolean
  /** I marked it done; the other side has not yet */
  waiting: boolean
  cancel: boolean
  report: boolean
  block: boolean
  /** "✓ העסקה הושלמה" — and only then the donation card (spec §51, §55) */
  success: boolean
}

/**
 * מה מותר למי, ומתי (מפרט §16). Mirrors the checks in `worker_connection_*` / `worker_offer_*` —
 * the database refuses anything this would not offer, so a button here is a promise it will keep.
 *
 * One narrowing on purpose: a recipient who has not answered the request yet sees accept/decline
 * and the composer (an answer IS an acceptance, as in `worker_message_send`), not the offer tools —
 * the first question in a request is "do you want to talk", and it gets answered first.
 */
export function threadActions(
  connection: Pick<Thread['connection'], 'status' | 'role' | 'myDone' | 'theirDone' | 'lotId'>,
  openFromOther: Pick<Offer, 'kind'> | null,
): ThreadActions {
  const { status, role, myDone, theirDone } = connection
  // an auction win: the price is settled and only an admin can undo the lot (spec §39, §65)
  const fromLot = Boolean(connection.lotId)
  const participant = role === 'initiator' || role === 'recipient'
  const live = participant && LIVE.includes(status)
  const negotiable = participant && NEGOTIABLE.includes(status)
  const unanswered = role === 'recipient' && status === 'requested'
  const answerOffer = negotiable && openFromOther !== null
  return {
    respond: unanswered,
    compose: live,
    photoRequest: live,
    offerPrice: negotiable && !unanswered,
    offerTrade: negotiable && role === 'initiator',
    answerOffer,
    counter: answerOffer && openFromOther?.kind === 'price',
    agreed: participant && (status === 'accepted' || status === 'negotiating'),
    done: participant && status === 'agreed' && !myDone,
    waiting: participant && status === 'agreed' && myDone && !theirDone,
    cancel: live && !fromLot,
    report: participant && status !== 'reported',
    block: participant,
    success: participant && status === 'completed',
  }
}

/** The one gate in front of the donation card: a deal both sides marked complete (spec §51, §55). */
export const donationAllowed = (status: ConnectionStatus) => status === 'completed'

/** The four stations of a deal, for the rail on the thread (spec §66). */
export const DEAL_STATIONS = ['requested', 'talking', 'agreed', 'completed'] as const
export type DealStation = (typeof DEAL_STATIONS)[number]

/** How far along the rail a status is; -1 for a connection that ended without a deal. */
export function dealStation(status: ConnectionStatus): number {
  switch (status) {
    case 'requested':
      return 0
    case 'accepted':
    case 'negotiating':
      return 1
    case 'agreed':
      return 2
    case 'completed':
      return 3
    default:
      return -1
  }
}

/** The offer both sides settled on, if the deal was settled by one. */
export function acceptedOffer(thread: Pick<Thread, 'offers'>): Offer | null {
  const accepted = thread.offers.filter((offer) => offer.status === 'accepted')
  return accepted.length ? accepted[accepted.length - 1]! : null
}

export type DealOutcome = {
  kind: 'trade' | 'buy'
  role: 'buyer' | 'seller' | 'trader'
  /** the shirts I walked away with — what "עדכן את הארון" offers to add (spec §60) */
  received: { slug: string; kitId: string | null }[]
  /** for the share card: the shirt on my side of the deal, and the one on theirs */
  mine: string | null
  theirs: string | null
}

/**
 * מה כל צד קיבל (מפרט §60). The one who asked (the initiator) receives the copy the connection is
 * about; in a trade, the other side receives the shirts of the accepted trade offer. A sale is
 * decided by what was actually accepted: a buy connection settled by a trade offer is a trade.
 */
export function dealOutcome(thread: Pick<Thread, 'connection' | 'item' | 'offers'>): DealOutcome | null {
  const me = mySide(thread)
  if (!me || !thread.item) return null
  const settled = acceptedOffer(thread)
  const swap = settled?.kind === 'trade' && settled.items.length > 0 ? settled : null
  const kind: 'trade' | 'buy' = swap ? 'trade' : thread.connection.kind === 'trade' && !settled ? 'trade' : 'buy'
  const item = { slug: thread.item.archiveSlug, kitId: thread.item.kitId }
  const offered = (swap?.items ?? []).map((row) => ({ slug: row.archiveSlug, kitId: row.kitId }))
  if (me === 'initiator') {
    return {
      kind,
      role: kind === 'trade' ? 'trader' : 'buyer',
      received: [item],
      mine: kind === 'trade' ? (offered[0]?.slug ?? null) : item.slug,
      theirs: kind === 'trade' ? item.slug : null,
    }
  }
  return {
    kind,
    role: kind === 'trade' ? 'trader' : 'seller',
    received: kind === 'trade' ? offered : [],
    mine: item.slug,
    theirs: kind === 'trade' ? (offered[0]?.slug ?? null) : null,
  }
}

// ------------------------------------------------------------------ merchant offers

/**
 * The address a shop link opens — the product page and nothing else. Spec §27: no affiliate
 * parameter, no referral, no tracking tag; so the query and the fragment are not "left alone",
 * they are REMOVED, and a link that is not http(s) is not a link at all.
 */
export function merchantHref(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    return null
  }
}

const OFFER_ORDER: Record<MerchantOffer['offerType'], number> = {
  official: 0,
  official_reissue: 1,
  external_new: 2,
  replica: 3,
}

/** The club's own store first, always (spec §23); then official, reissue, other new, and replicas last. */
export function orderMerchantOffers(offers: readonly MerchantOffer[]): MerchantOffer[] {
  return offers
    .filter((offer) => merchantHref(offer.productUrl) !== null)
    .map((offer, index) => ({ offer, index }))
    .sort(
      (a, b) =>
        Number(b.offer.isOfficialClubStore) - Number(a.offer.isOfficialClubStore) ||
        OFFER_ORDER[a.offer.offerType] - OFFER_ORDER[b.offer.offerType] ||
        a.index - b.index,
    )
    .map(({ offer }) => offer)
}

// ------------------------------------------------------------------ time

/**
 * When a line was written, as a slip prints it: the time alone today, the day and the time before.
 * Formatted in Israel's own clock, whatever the device says — the two sides of a conversation should
 * read the same stamp.
 */
export function stampTime(iso: string, now: Date = new Date()): string {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return ''
  const zone = { timeZone: 'Asia/Jerusalem' } as const
  const day = (date: Date) => new Intl.DateTimeFormat('en-CA', { ...zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
  const time = new Intl.DateTimeFormat('he-IL', { ...zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(at)
  if (day(at) === day(now)) return time
  const date = new Intl.DateTimeFormat('he-IL', { ...zone, day: 'numeric', month: 'numeric' }).format(at)
  return `${date} · ${time}`
}
