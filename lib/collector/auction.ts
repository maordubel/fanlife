import { t } from '@/lib/i18n'

import { errorLabel, formatPrice } from './labels'
import type { AdminLot } from './api'
import type { CollectorError, CollectorLabel, Currency, Fail, LotBrief, LotPhase, LotState } from './types'

/**
 * המכירה הפומבית — ההיגיון הטהור שהמסכים נשענים עליו (22.9.2026).
 *
 * שעון, שלב, קובץ יומן, בדיקת הצעה מול `minNext`, בדיקת הבקשה, ובדיקת כתובת של חנות.
 * אין כאן React ואין קריאה למסד, כדי שכל אחד מהם ייבדק לבד (`tests/auction.test.ts`) —
 * ובמיוחד השאלה אם המסך מציע למוכר להציע על הפריט שלו: `lotPanels` עונה עליה, והמסך שואל.
 */

// ---------------------------------------------------------------- time
export const SECOND = 1000
export const MINUTE = 60 * SECOND
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR

/** How often a live lot is read again. Paused while the tab is hidden. */
export const POLL_LIVE_MS = 3 * SECOND
/** A lot that is waiting — for its start, or for the other side to confirm — is read less often. */
export const POLL_IDLE_MS = 30 * SECOND

export type Countdown = { days: number; hours: number; minutes: number; seconds: number; total: number }

export function countdown(ms: number): Countdown {
  const total = Math.max(0, Math.floor(ms / SECOND) * SECOND)
  return {
    days: Math.floor(total / DAY),
    hours: Math.floor((total % DAY) / HOUR),
    minutes: Math.floor((total % HOUR) / MINUTE),
    seconds: Math.floor((total % MINUTE) / SECOND),
    total,
  }
}

const two = (n: number) => String(n).padStart(2, '0')

/** "02:14:05", or "3:02:14:05" once there is a day in it — for a screen reader and a title. */
export function clockText(ms: number): string {
  const c = countdown(ms)
  const hms = `${two(c.hours)}:${two(c.minutes)}:${two(c.seconds)}`
  return c.days > 0 ? `${c.days}:${hms}` : hms
}

/**
 * "בעוד 3 ימים", "בעוד יומיים", "בעוד שעה", "בעוד 12 דקות" — the time remaining, in words, the way a
 * poster says it. Floors to the largest whole unit: three days and a night is still "3 ימים".
 */
export function inWords(ms: number): string {
  const c = countdown(ms)
  if (c.days >= 1) {
    if (c.days === 1) return t('auction.in.day')
    if (c.days === 2) return t('auction.in.days2')
    return t('auction.in.days', { n: String(c.days) })
  }
  if (c.hours >= 1) {
    if (c.hours === 1) return t('auction.in.hour')
    if (c.hours === 2) return t('auction.in.hours2')
    return t('auction.in.hours', { n: String(c.hours) })
  }
  const minutes = Math.ceil(c.total / MINUTE)
  if (minutes > 1) return t('auction.in.minutes', { n: String(minutes) })
  if (c.total > 0) return t('auction.in.minute')
  return t('auction.in.now')
}

/** "המכירה מתחילה בעוד 3 ימים" (spec §29, §33). */
export const startsInLabel = (ms: number) => t('auction.startsIn', { when: inWords(ms) })
/** "נסגרת בעוד 2 שעות". */
export const endsInLabel = (ms: number) => t('auction.endsIn', { when: inWords(ms) })

const at = (iso: string | null): number | null => {
  if (!iso) return null
  const value = Date.parse(iso)
  return Number.isFinite(value) ? value : null
}

/**
 * The phase as the clock on this device sees it. The database computes `phase` when it is read;
 * a page kept open crosses the start and the end on its own, so an `upcoming` lot whose start has
 * passed is `live` here and a `live` one whose end has passed is `closing` — until the next read
 * says what really happened (the database settles a lot lazily, on read).
 */
export function livePhase(lot: Pick<LotBrief, 'phase' | 'startsAt' | 'endsAt'>, now: number): LotPhase {
  const start = at(lot.startsAt)
  const end = at(lot.endsAt)
  if (lot.phase === 'upcoming' && start !== null && now >= start) return end !== null && now >= end ? 'closing' : 'live'
  if (lot.phase === 'live' && end !== null && now >= end) return 'closing'
  return lot.phase
}

/** Milliseconds to the moment the current phase is waiting for, or null. */
export function msToNext(lot: Pick<LotBrief, 'phase' | 'startsAt' | 'endsAt'>, now: number): number | null {
  const phase = livePhase(lot, now)
  if (phase === 'upcoming') return Math.max(0, (at(lot.startsAt) ?? now) - now)
  if (phase === 'live') return Math.max(0, (at(lot.endsAt) ?? now) - now)
  return null
}

/** Inside the anti-sniping window: a bid now pushes the end out (spec §36). */
export function inSnipeWindow(lot: Pick<LotBrief, 'phase' | 'startsAt' | 'endsAt'>, antiSnipeSeconds: number, now: number): boolean {
  const remaining = msToNext(lot, now)
  return livePhase(lot, now) === 'live' && remaining !== null && remaining < antiSnipeSeconds * SECOND
}

export const FINAL_PHASES: readonly LotPhase[] = ['completed', 'ended', 'cancelled', 'rejected']

/** How often to read this lot again, or null for never (a finished lot does not change). */
export function pollEvery(phase: LotPhase): number | null {
  if (phase === 'live' || phase === 'closing') return POLL_LIVE_MS
  if (FINAL_PHASES.includes(phase)) return null
  return POLL_IDLE_MS
}

export type LotGroups = { live: LotBrief[]; upcoming: LotBrief[]; recent: LotBrief[] }

/** The board: live first by the soonest end, then upcoming by the soonest start, then the recently closed. */
export function groupLots(open: readonly LotBrief[], recent: readonly LotBrief[], now: number): LotGroups {
  const byTime = (key: 'startsAt' | 'endsAt') => (a: LotBrief, b: LotBrief) => (at(a[key]) ?? 0) - (at(b[key]) ?? 0)
  const live = open.filter((lot) => ['live', 'closing'].includes(livePhase(lot, now))).sort(byTime('endsAt'))
  const upcoming = open.filter((lot) => livePhase(lot, now) === 'upcoming').sort(byTime('startsAt'))
  const seen = new Set([...live, ...upcoming].map((lot) => lot.id))
  const closed = recent.filter((lot) => !seen.has(lot.id)).sort((a, b) => (at(b.endsAt) ?? 0) - (at(a.endsAt) ?? 0))
  return { live, upcoming, recent: closed }
}

// ---------------------------------------------------------------- what the lot page shows
export type LotPanels = {
  /** the bid form — never for the seller (spec §38), never for a lot that is not live */
  bidForm: boolean
  watch: boolean
  remind: boolean
  sellerPanel: boolean
  withdraw: boolean
  complete: boolean
  /** the donation card: after COMPLETED, and only to the two people who completed it (§55) */
  donation: boolean
  signInToBid: boolean
}

export function lotPanels(state: LotState, now: number, signedIn: boolean): LotPanels {
  const { lot } = state
  const phase = livePhase(lot, now)
  const party = lot.isSeller || lot.won
  return {
    bidForm: phase === 'live' && !lot.isSeller && signedIn,
    signInToBid: phase === 'live' && !lot.isSeller && !signedIn,
    watch: (phase === 'upcoming' || phase === 'live') && !lot.isSeller,
    remind: phase === 'upcoming' && lot.startsAt !== null,
    sellerPanel: lot.isSeller,
    withdraw: lot.isSeller && (phase === 'pending' || (phase === 'upcoming' && lot.bidCount === 0) || (phase === 'live' && lot.bidCount === 0)),
    complete: phase === 'awaiting_completion' && party && !(lot.isSeller ? lot.sellerDone : lot.winnerDone),
    donation: phase === 'completed' && party,
  }
}

// ---------------------------------------------------------------- bids
export type BidCheck =
  | { ok: true; amount: number }
  | { ok: false; reason: 'empty' | 'not_number' | 'too_low' | 'not_above_max' | 'too_high' }

export const MAX_BID = 99_999_999

/** "1,000", "₪ 1000", "1000.50" → a number with at most two decimals, or null. */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[\s,₪€$]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

/**
 * A Max Bid against the lot as it stands (spec §35). Someone who is not leading needs at least
 * `minNext`; the leader raising their own ceiling needs more than the ceiling they already set —
 * the same two refusals the database answers with (`too_low`, `raise_above_your_max`).
 */
export function checkBid(raw: string, lot: Pick<LotState['lot'], 'minNext' | 'leading' | 'yourMax'>): BidCheck {
  if (raw.trim() === '') return { ok: false, reason: 'empty' }
  const amount = parseAmount(raw)
  if (amount === null || amount <= 0) return { ok: false, reason: 'not_number' }
  if (amount > MAX_BID) return { ok: false, reason: 'too_high' }
  if (lot.leading && lot.yourMax !== null) {
    if (amount <= lot.yourMax) return { ok: false, reason: 'not_above_max' }
    return { ok: true, amount }
  }
  if (amount < lot.minNext) return { ok: false, reason: 'too_low' }
  return { ok: true, amount }
}

/** Three one-tap ceilings: the minimum, and two and five steps above it. */
export function quickBids(lot: Pick<LotState['lot'], 'minNext' | 'minIncrement' | 'leading' | 'yourMax'>): number[] {
  const floor = lot.leading && lot.yourMax !== null ? Math.max(lot.minNext, lot.yourMax + lot.minIncrement) : lot.minNext
  return [floor, floor + lot.minIncrement * 2, floor + lot.minIncrement * 5].map((n) => Math.round(n * 100) / 100)
}

/** "אתה" or "מציע 3" — the bidders are numbered by their first bid, and nobody is named (§19). */
export const bidderLabel = (bid: { bidder: number; you: boolean }) =>
  bid.you ? t('auction.bidder.you') : t('auction.bidder.n', { n: String(bid.bidder) })

// ---------------------------------------------------------------- errors
const AUCTION_ERROR: Partial<Record<CollectorError, Parameters<typeof t>[0]>> = {
  not_live: 'auction.error.not_live',
  own_lot: 'auction.error.own_lot',
  bad_amount: 'auction.error.bad_amount',
  bad_state: 'auction.error.bad_state',
  bad_value: 'auction.error.bad_value',
  not_found: 'auction.error.not_found',
  forbidden: 'auction.error.forbidden',
  note_required: 'auction.error.note_required',
  not_reported: 'auction.error.not_reported',
}

/** A refusal from the database, as one sentence — with the minimum or the ceiling when it came back. */
export function auctionErrorLabel(fail: Pick<Fail, 'error' | 'minNext' | 'yourMax'>, currency: Currency = 'ILS'): string {
  if (fail.error === 'too_low' && typeof fail.minNext === 'number') {
    return t('auction.error.too_low', { min: formatPrice(fail.minNext, currency) })
  }
  if (fail.error === 'raise_above_your_max' && typeof fail.yourMax === 'number') {
    return t('auction.error.raise', { max: formatPrice(fail.yourMax, currency) })
  }
  const key = AUCTION_ERROR[fail.error]
  return key ? t(key) : errorLabel(fail.error)
}

// ---------------------------------------------------------------- the calendar file
/** RFC 5545 TEXT: backslash, semicolon, comma and newline escaped. */
export function icsEscape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

const octets = (ch: string): number => {
  const code = ch.codePointAt(0) ?? 0
  return code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4
}

/** Lines longer than 75 octets are folded with CRLF + one space, never inside a character. */
export function icsFold(line: string): string {
  const out: string[] = []
  let current = ''
  let size = 0
  for (const ch of line) {
    const n = octets(ch)
    const limit = out.length === 0 ? 75 : 74
    if (size + n > limit) {
      out.push(current)
      current = ''
      size = 0
    }
    current += ch
    size += n
  }
  out.push(current)
  return out.join('\r\n ')
}

const icsDate = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

/**
 * "הזכר לי" — a calendar file made on the device (spec §33). No server, no account, no
 * address book: the person's own calendar keeps the reminder. A half-hour event at the start,
 * with an alarm fifteen minutes before, and the lot's link in it.
 */
export function lotIcs(lot: { id: string; title: string; startsAt: string; endsAt: string | null }, url: string, stamp: number): string {
  const start = Date.parse(lot.startsAt)
  const end = start + 30 * MINUTE
  const summary = t('auction.ics.summary', { title: lot.title })
  const description = lot.endsAt
    ? t('auction.ics.description', { url, end: new Date(Date.parse(lot.endsAt)).toISOString() })
    : url
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//The Worker//Auction//HE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:lot-${lot.id}@the-worker`,
    `DTSTAMP:${icsDate(stamp)}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsEscape(summary)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    `URL:${url}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsEscape(summary)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return `${lines.map(icsFold).join('\r\n')}\r\n`
}

// ---------------------------------------------------------------- the submission (spec §30–§32)
export const CHECKLIST = ['front', 'back', 'labels', 'logos', 'print', 'defects', 'size', 'condition', 'origin', 'history', 'proof'] as const
export type ChecklistKey = (typeof CHECKLIST)[number]

export const HOUR_CHOICES = [24, 48, 72, 120, 168, 240, 336] as const
export const MIN_HOURS = 24
export const MAX_HOURS = 336

export type SubmitDraft = {
  title: string
  description: string
  startPrice: string
  reservePrice: string
  currency: Currency
  hours: number
  increment: string
  checked: Partial<Record<ChecklistKey, boolean>>
}

export type SubmitProblem =
  | 'checklist'
  | 'title'
  | 'description'
  | 'start'
  | 'reserve'
  | 'hours'
  | 'increment'

export type SubmitCheck =
  | {
      ok: true
      value: { title: string; description: string; startPrice: number; reservePrice: number | null; currency: Currency; hours: number; increment: number | null }
    }
  | { ok: false; problems: SubmitProblem[]; missing: ChecklistKey[] }

/** Which checklist rows this item needs: proof only when the seller claims it was worn in a match. */
export function checklistFor(matchWorn: boolean): ChecklistKey[] {
  return CHECKLIST.filter((key) => key !== 'proof' || matchWorn)
}

export function checkSubmission(draft: SubmitDraft, matchWorn: boolean): SubmitCheck {
  const problems: SubmitProblem[] = []
  const missing = checklistFor(matchWorn).filter((key) => !draft.checked[key])
  if (missing.length) problems.push('checklist')
  const title = draft.title.trim()
  const description = draft.description.trim()
  if (title.length < 3 || title.length > 120) problems.push('title')
  if (description.length < 20 || description.length > 3000) problems.push('description')
  const start = parseAmount(draft.startPrice)
  if (start === null || start <= 0) problems.push('start')
  const reserve = draft.reservePrice.trim() === '' ? null : parseAmount(draft.reservePrice)
  if (draft.reservePrice.trim() !== '' && (reserve === null || reserve <= 0 || (start !== null && reserve < start))) problems.push('reserve')
  if (!Number.isInteger(draft.hours) || draft.hours < MIN_HOURS || draft.hours > MAX_HOURS) problems.push('hours')
  const increment = draft.increment.trim() === '' ? null : parseAmount(draft.increment)
  if (draft.increment.trim() !== '' && (increment === null || increment <= 0)) problems.push('increment')
  if (problems.length) return { ok: false, problems, missing }
  return {
    ok: true,
    value: { title, description, startPrice: start as number, reservePrice: reserve, currency: draft.currency, hours: draft.hours, increment },
  }
}

// ---------------------------------------------------------------- admin
export type AdminBid = {
  id: string
  amount: number
  proxy: boolean
  status: 'active' | 'voided'
  at: string
  bidder: CollectorLabel | null
}
/** `worker_admin_lots` answers with the bids too (their ids, never a private max). */
export type AdminLotWithBids = AdminLot & { bids?: AdminBid[] }

export type UrlProblem = 'empty' | 'not_https' | 'has_query' | 'has_fragment' | 'bad'

/** A shop link is a plain https address: no query string and no fragment at all (spec §27). */
export function merchantUrlProblem(raw: string): UrlProblem | null {
  const value = raw.trim()
  if (value === '') return 'empty'
  if (/\s/.test(value)) return 'bad'
  if (!/^https:\/\//i.test(value)) return 'not_https'
  if (value.includes('?')) return 'has_query'
  if (value.includes('#')) return 'has_fragment'
  try {
    new URL(value)
  } catch {
    return 'bad'
  }
  return null
}

/** `<input type="datetime-local">` speaks local wall-clock time without a zone; the database wants an instant. */
export function toLocalInput(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}T${two(d.getHours())}:${two(d.getMinutes())}`
}
export function fromLocalInput(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null
  const ms = new Date(value).getTime()
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null
}

// ---------------------------------------------------------------- the archive shirt behind a lot
/**
 * What an auction screen needs to know about the archive shirt a lot points at — built on the
 * server (`lib/collector/auctionShirts.ts`) and handed to the client. `spoiler`: Gate 4 can
 * still deal this shirt, so its photograph is not shown here (the seller's own photos are).
 */
export type AuctionShirt = {
  slug: string
  src: string
  season: string
  approx: boolean
  variantHe: string
  kitId: string | null
  spoiler: boolean
}

/** "1999/00", or "1999 בערך" when the archive dates the shirt by one year only (rule 69 §4). */
export const shirtSeason = (shirt: Pick<AuctionShirt, 'season' | 'approx'>) =>
  shirt.approx ? t('kits.archive.approxOf', { y: shirt.season }) : shirt.season

// ---------------------------------------------------------------- dates on screen
/** "יום שישי, 25 בספטמבר, 20:00" — the start or the end of a lot, in this device's own time. */
export function whenText(iso: string): string {
  try {
    return new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
  } catch {
    return iso
  }
}

/** "21:04:12" for a bid today, "24.9 · 21:04" for an older one. */
export function bidTimeText(iso: string, now: number): string {
  const date = new Date(iso)
  const today = new Date(now)
  const same = date.toDateString() === today.toDateString()
  try {
    return same
      ? new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(date)
      : `${date.getDate()}.${date.getMonth() + 1} · ${new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date)}`
  } catch {
    return iso
  }
}

/** "שתי הדקות האחרונות" for the default window, otherwise the window in minutes or seconds. */
export function snipeWindowText(seconds: number): string {
  if (seconds === 120) return t('auction.snipe.window2')
  if (seconds % 60 === 0) return t('auction.snipe.windowMinutes', { n: String(seconds / 60) })
  return t('auction.snipe.windowSeconds', { n: String(seconds) })
}

// ---------------------------------------------------------------- the shops, as the admin edits them (spec §25–§27)
/** A row of `worker_merchant_offer` exactly as `worker_admin_merchant_list` answers it (`to_jsonb`, snake_case). */
export type MerchantRow = {
  id: string
  archive_slug: string | null
  kit_id: string | null
  season_label: string | null
  merchant_name: string
  merchant_type: 'club_store' | 'retro_store' | 'other'
  offer_type: 'official' | 'official_reissue' | 'replica' | 'external_new'
  title_he: string | null
  price: number | string | null
  currency: Currency
  product_url: string
  image_url: string | null
  availability: 'in_stock' | 'out_of_stock' | 'unknown'
  last_checked_at: string | null
  is_official_club_store: boolean
  is_active: boolean
  sort_rank: number
}

export type MerchantDraft = {
  id: string | null
  archiveSlug: string
  kitId: string
  seasonLabel: string
  merchantName: string
  merchantType: MerchantRow['merchant_type']
  offerType: MerchantRow['offer_type']
  title: string
  price: string
  currency: Currency
  productUrl: string
  imageUrl: string
  availability: MerchantRow['availability']
  lastCheckedAt: string
  isOfficialClubStore: boolean
  isActive: boolean
  sortRank: string
}

export const EMPTY_MERCHANT: MerchantDraft = {
  id: null,
  archiveSlug: '',
  kitId: '',
  seasonLabel: '',
  merchantName: '',
  merchantType: 'retro_store',
  offerType: 'replica',
  title: '',
  price: '',
  currency: 'ILS',
  productUrl: '',
  imageUrl: '',
  availability: 'unknown',
  lastCheckedAt: '',
  isOfficialClubStore: false,
  isActive: true,
  sortRank: '100',
}

export function merchantDraftOf(row: MerchantRow): MerchantDraft {
  return {
    id: row.id,
    archiveSlug: row.archive_slug ?? '',
    kitId: row.kit_id ?? '',
    seasonLabel: row.season_label ?? '',
    merchantName: row.merchant_name,
    merchantType: row.merchant_type,
    offerType: row.offer_type,
    title: row.title_he ?? '',
    price: row.price === null ? '' : String(row.price),
    currency: row.currency,
    productUrl: row.product_url,
    imageUrl: row.image_url ?? '',
    availability: row.availability,
    lastCheckedAt: row.last_checked_at ?? '',
    isOfficialClubStore: row.is_official_club_store,
    isActive: row.is_active,
    sortRank: String(row.sort_rank),
  }
}

export type MerchantProblem =
  | 'target'
  | 'slug'
  | 'kit'
  | 'season'
  | 'name'
  | 'url'
  | 'image'
  | 'price'
  | 'official_needs_store'
  | 'replica_not_store'
  | 'date'
  | 'rank'

/**
 * The same rules the table enforces (`worker_merchant_offer` checks), said before the round trip:
 * a target, a plain https link with no parameters, "official" only from the club store and a
 * replica never dressed as one (§23, §24, §77).
 */
export function checkMerchant(draft: MerchantDraft): { problems: MerchantProblem[]; url: UrlProblem | null; payload: Record<string, unknown> } {
  const problems: MerchantProblem[] = []
  const slug = draft.archiveSlug.trim()
  const kit = draft.kitId.trim()
  const season = draft.seasonLabel.trim()
  if (!slug && !kit && !season) problems.push('target')
  if (slug && !/^[a-z0-9][a-z0-9-]{2,63}$/.test(slug)) problems.push('slug')
  if (kit && !/^kit-[0-9]{4}-[0-9]{2}-[a-z0-9-]{2,24}$/.test(kit)) problems.push('kit')
  if (season && !/^[0-9]{4}\/[0-9]{2}$/.test(season)) problems.push('season')
  if (draft.merchantName.trim().length < 1 || draft.merchantName.trim().length > 80) problems.push('name')
  const url = merchantUrlProblem(draft.productUrl)
  if (url) problems.push('url')
  if (draft.imageUrl.trim() && merchantUrlProblem(draft.imageUrl)) problems.push('image')
  const price = draft.price.trim() === '' ? null : parseAmount(draft.price)
  if (draft.price.trim() !== '' && (price === null || price <= 0)) problems.push('price')
  if (draft.offerType === 'official' && !draft.isOfficialClubStore) problems.push('official_needs_store')
  if (draft.offerType === 'replica' && draft.isOfficialClubStore) problems.push('replica_not_store')
  if (draft.lastCheckedAt.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(draft.lastCheckedAt.trim())) problems.push('date')
  const rank = Number(draft.sortRank)
  if (!Number.isInteger(rank) || rank < 0 || rank > 32767) problems.push('rank')
  return {
    problems,
    url,
    payload: {
      ...(draft.id ? { id: draft.id } : {}),
      archiveSlug: slug,
      kitId: kit,
      seasonLabel: season,
      merchantName: draft.merchantName.trim(),
      merchantType: draft.merchantType,
      offerType: draft.offerType,
      title: draft.title.trim(),
      price: price === null ? '' : String(price),
      currency: draft.currency,
      productUrl: draft.productUrl.trim(),
      imageUrl: draft.imageUrl.trim(),
      availability: draft.availability,
      lastCheckedAt: draft.lastCheckedAt.trim(),
      isOfficialClubStore: draft.isOfficialClubStore,
      isActive: draft.isActive,
      sortRank: String(rank),
    },
  }
}
