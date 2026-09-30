/**
 * פנקס חבר — the member book, from `The Worker - Gate 10 and States.dc.html`.
 *
 * The design brief for gate 10 is the sharpest thing in the whole handoff and it is a
 * product decision, not a layout: **the profile is not a scoreboard.** It shows days
 * you turned up and facts you corrected, and the one big number on the page is the
 * number of corrections the archive accepted from you. Nothing on it can be bought.
 *
 * That is why this module holds no score. A run's points live and die inside the run;
 * what persists is a punch — one per day you played — and the corrections you filed.
 *
 * It all lives in `localStorage`, which is the honest shape for it today: there is no
 * account system, so the book belongs to the device the way a paper one belongs to a
 * pocket. A correction is recorded as PENDING when you file it, and only the archive
 * can move it to approved — the card says so rather than pretending.
 */

import { addDays, todayInIsrael } from '@/lib/date/israel'
import venues from '@/content/manual/venues.json'
import { GATES } from '@/lib/gates'

const KEY = 'worker.member.v1'

/**
 * השם על הכרטיס — one cap, everywhere (21.9.2026).
 *
 * It was 24 here and 18 in gate 7 and in `shirtName()`, so a name typed on this card
 * could be six letters longer than the shirt that prints it. 18 is what a shirt carries,
 * and the card is the same person.
 */
export const NAME_MAX = 18

/** How long the free-text fallback for "the first game I remember" may be. Never printed on a share card. */
export const FIRST_TEXT_MAX = 24

/** At most this many value chips. */
export const VALUES_MAX = 3

export type Correction = {
  id: string
  /** which gate it came from — GATE 7 · KIT */
  tagHe: string
  /** the ISO date it was filed */
  filedOn: string
  bodyHe: string
  status: 'pending' | 'approved'
}

/** How the story began — the prototype's four chips, as ids. */
export const BEGAN = ['father', 'friends', 'alone', 'born'] as const
export type Began = (typeof BEGAN)[number]

/** What the card should keep — chips, never a sentence. */
export const CARD_VALUES = ['moments', 'shirts', 'archive', 'story', 'terrace', 'players'] as const
export type CardValue = (typeof CARD_VALUES)[number]

/**
 * The first place or game you remember: a FOOTBALL venue from `content/manual/venues.json`,
 * an archive match id, or — as a last resort — a few words of your own, which the card
 * prints and no share card ever does.
 */
export type FirstMemory = { venueSlug: string } | { matchId: string } | { textHe: string }

/**
 * כרטיס העובד — the fields a person declares about themselves, and nothing the app
 * already knows (brief §20: "do not make the user manually type information the app
 * already knows"). Everything else on the Worker Card is DERIVED, in `lib/profile/card.ts`.
 */
export type WorkerCardFields = {
  /** a gate number from `lib/gates.ts`, `'none'` for "not fixed", null until chosen */
  homeGate: number | 'none' | null
  /**
   * The year the person became a fan — NOT `book.since`, which is the year this book was
   * minted and cannot be reused for it. `'new'` is "just started".
   */
  fanSince: number | 'new' | null
  began: Began | null
  first: FirstMemory | null
  values: CardValue[]
  /** ISO date the card was first saved — the one-time issue beat keys on this. '' until then. */
  issuedOn: string
  /**
   * ISO timestamp of the last edit to the card OR the name OR the number. The three merge
   * as one unit across devices, newest edit wins (`lib/portal/merge.ts`). '' = never edited.
   */
  editedAt: string
}

/**
 * תעודת אוהד — gate 7's seal, kept on the book so `/tik` reads the book and not the
 * ballot. Ids and message keys only; the ballot's PICK labels never come here.
 */
export type SupporterRecord = {
  /** a player-master id */
  favouriteId: string | null
  /** GK / CB / FB / DM / CM / AM / W / ST */
  positionCode: string | null
  /** question id → reason message key */
  reasons: Record<string, string>
  /** ISO date of the seal — newer wins across devices */
  sealedOn: string
}

export type MemberBook = {
  /** the file number, printed vertically on the stub. Fixed for the life of the book. */
  tik: string
  nameHe: string
  /** the number on the back of your shirt */
  number: number
  since: number
  /** ISO dates, one per day of activity. Punched, never erased. */
  punches: string[]
  corrections: Correction[]
  /** the Worker Card's declared fields — absent until anything is declared or edited */
  card?: WorkerCardFields
  /** gate 7's seal — absent until a ballot is sealed */
  supporter?: SupporterRecord
}

export const QUARTER_SLOTS = 90

/** the supporter's calendar day — Israel's (`lib/date/israel.ts`); a punch at 00:30 is today's */
function today(): string {
  return todayInIsrael()
}

/** A file number that looks issued rather than generated. Stable once written. */
function mintTik(): string {
  const n = 1 + Math.floor(Math.random() * 8999)
  return `TIK-${String(n).padStart(4, '0')}`
}

export function emptyBook(): MemberBook {
  return {
    tik: mintTik(),
    nameHe: '',
    number: 17,
    since: new Date().getFullYear(),
    punches: [],
    corrections: [],
  }
}

/**
 * The book as it is actually stored, or `null` when this device has never had one.
 *
 * `readBook()` answers "what does the card look like", and for that an unsaved book is
 * the right answer. The sync seam (`lib/portal/sync.ts`) is asking something else —
 * *does this device already hold a file number?* — and a freshly minted one is the wrong
 * answer to that question, because a number nobody has seen yet must never be carried up
 * into an account that already has one.
 */
export function storedBook(): MemberBook | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    return normaliseBook(JSON.parse(raw) as Partial<MemberBook>)
  } catch {
    return null
  }
}

/**
 * Whatever is in storage, as a book this build can print: the name capped at `NAME_MAX`,
 * the number an integer 1–99, the card and the seal cleaned field by field. A field that
 * cannot be read is dropped rather than trusted — the same rule `readProfile` keeps.
 */
export function normaliseBook(parsed: Partial<MemberBook>): MemberBook {
  const base = emptyBook()
  const card = parsed.card === undefined ? undefined : cleanCard(parsed.card)
  const supporter = parsed.supporter === undefined ? null : cleanSupporter(parsed.supporter)
  const book: MemberBook = {
    ...base,
    ...parsed,
    tik: typeof parsed.tik === 'string' && parsed.tik !== '' ? parsed.tik : base.tik,
    nameHe: capName(parsed.nameHe),
    number: cleanNumber(parsed.number) ?? base.number,
    since: typeof parsed.since === 'number' && Number.isFinite(parsed.since) ? parsed.since : base.since,
    punches: Array.isArray(parsed.punches) ? parsed.punches.filter((d) => typeof d === 'string') : [],
    corrections: Array.isArray(parsed.corrections) ? parsed.corrections : [],
  }
  delete book.card
  delete book.supporter
  if (card !== undefined) book.card = card
  if (supporter !== null) book.supporter = supporter
  return book
}

/**
 * **A file number is issued once.** Until 17.9.2026 this function minted a fresh `TIK-…`
 * on every call for a device that had never saved anything — so the card printed a
 * different number on every visit, and the one field on it the product describes as
 * unearnable was the one field that changed most. The first read now WRITES the book it
 * mints, which is the only way the number can mean what the card says it means, and it
 * is what makes `worker_profile.member_no` a real key rather than a snapshot of whatever
 * the last page load happened to roll.
 */
export function readBook(): MemberBook {
  if (typeof window === 'undefined') return emptyBook()
  const saved = storedBook()
  if (saved !== null) return saved
  const fresh = emptyBook()
  writeBook(fresh)
  return fresh
}

/**
 * Write the book. **An edit to the name, the number or the card stamps `card.editedAt`**,
 * whoever makes it — this card, gate 7's ballot, a future screen — because the three
 * merge across devices as one unit, newest edit first, and an edit that forgot to say
 * when it happened would lose to an older one. The sync seam writes merged books with
 * `{ stamp: false }`: adopting another device's edit is not a new edit.
 */
export function writeBook(book: MemberBook, options: { stamp?: boolean; now?: Date } = {}): void {
  if (typeof window === 'undefined') return
  try {
    const next = { ...book, nameHe: capName(book.nameHe) }
    const stamped =
      options.stamp === false ? next : stampIfEdited(storedBook(), next, options.now ?? new Date())
    window.localStorage.setItem(KEY, JSON.stringify(stamped))
  } catch {
    // private mode, blocked storage — the app keeps working, the book just does not persist
  }
}

/** The pure half of the stamp: `next` with `card.editedAt` set when its identity changed. */
export function stampIfEdited(prior: MemberBook | null, next: MemberBook, now: Date): MemberBook {
  if (prior !== null && identityOf(prior) === identityOf(next)) return next
  if (prior === null && next.nameHe === '' && next.card === undefined) return next
  return { ...next, card: { ...(next.card ?? emptyCard()), editedAt: now.toISOString() } }
}

/** Name, number and the declared card fields — the unit that merges newest-first. */
function identityOf(book: MemberBook): string {
  const card = book.card ?? emptyCard()
  return JSON.stringify([
    book.nameHe,
    book.number,
    card.homeGate,
    card.fanSince,
    card.began,
    card.first,
    card.values,
  ])
}

/* ------------------------------------------------------------------ the card's fields */

export function emptyCard(): WorkerCardFields {
  return {
    homeGate: null,
    fanSince: null,
    began: null,
    first: null,
    values: [],
    issuedOn: '',
    editedAt: '',
  }
}

/** The name as typed, capped — NOT trimmed, because this runs on every keystroke. */
export function capName(raw: unknown): string {
  return typeof raw === 'string' ? raw.slice(0, NAME_MAX) : ''
}

/** The name as printed and synced: whitespace collapsed, trimmed, capped. */
export function cleanName(raw: unknown): string {
  return typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX) : ''
}

/** A shirt number is a whole number 1–99, or nothing. */
export function cleanNumber(raw: unknown): number | null {
  return typeof raw === 'number' && Number.isInteger(raw) && raw >= 1 && raw <= 99 ? raw : null
}

/** The earliest year a person can have been a fan of a club founded in 1923. */
export const FAN_SINCE_MIN = 1923

const GATE_NUMBERS: ReadonlySet<number> = new Set(GATES.map((gate) => gate.number))

/**
 * Football venues only (rule 6): `venues.json` also lists Ussishkin Hall and Yad Eliyahu,
 * which are basketball, and a football card may not name them.
 */
export const FIRST_VENUES: readonly { slug: string; nameHe: string }[] = (
  venues as { records: { slug: string; nameHe: string; sport: string }[] }
).records
  .filter((venue) => venue.sport === 'football')
  .map((venue) => ({ slug: venue.slug, nameHe: venue.nameHe }))

const VENUE_SLUGS: ReadonlySet<string> = new Set(FIRST_VENUES.map((venue) => venue.slug))

function cleanFirst(raw: unknown): FirstMemory | null {
  if (typeof raw !== 'object' || raw === null) return null
  const row = raw as Record<string, unknown>
  if (typeof row.venueSlug === 'string' && VENUE_SLUGS.has(row.venueSlug)) return { venueSlug: row.venueSlug }
  if (typeof row.matchId === 'string' && /^[\w:.|/-]{1,80}$/.test(row.matchId)) return { matchId: row.matchId }
  if (typeof row.textHe === 'string') {
    const text = row.textHe.replace(/\s+/g, ' ').trim().slice(0, FIRST_TEXT_MAX)
    return text === '' ? null : { textHe: text }
  }
  return null
}

/** Every declared field checked against what the picker could have offered. */
export function cleanCard(raw: unknown, now: Date = new Date()): WorkerCardFields {
  const row = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const gate = row.homeGate
  const since = row.fanSince
  const year = now.getUTCFullYear()
  const values = Array.isArray(row.values)
    ? [...new Set(row.values.filter((v): v is CardValue => CARD_VALUES.includes(v as CardValue)))]
    : []
  return {
    homeGate:
      gate === 'none' ? 'none' : typeof gate === 'number' && GATE_NUMBERS.has(gate) ? gate : null,
    fanSince:
      since === 'new'
        ? 'new'
        : typeof since === 'number' && Number.isInteger(since) && since >= FAN_SINCE_MIN && since <= year
          ? since
          : null,
    began: BEGAN.includes(row.began as Began) ? (row.began as Began) : null,
    first: cleanFirst(row.first),
    values: values.slice(0, VALUES_MAX),
    issuedOn: isoDate(row.issuedOn) ? (row.issuedOn as string) : '',
    editedAt: isoStamp(row.editedAt) ? (row.editedAt as string) : '',
  }
}

/** Gate 7's seal, cleaned: ids and message keys only, or null when it is not a seal. */
export function cleanSupporter(raw: unknown): SupporterRecord | null {
  if (typeof raw !== 'object' || raw === null) return null
  const row = raw as Record<string, unknown>
  if (!isoDate(row.sealedOn)) return null
  const reasons: Record<string, string> = {}
  if (typeof row.reasons === 'object' && row.reasons !== null) {
    for (const [question, key] of Object.entries(row.reasons as Record<string, unknown>)) {
      if (/^[\w.-]{1,32}$/.test(question) && typeof key === 'string' && /^[a-z][\w.]{0,63}$/.test(key)) {
        reasons[question] = key
      }
    }
  }
  return {
    favouriteId:
      typeof row.favouriteId === 'string' && /^[^\s]{1,64}$/.test(row.favouriteId) ? row.favouriteId : null,
    positionCode:
      typeof row.positionCode === 'string' && /^[A-Z]{1,3}$/.test(row.positionCode) ? row.positionCode : null,
    reasons,
    sealedOn: row.sealedOn as string,
  }
}

export type CardPatch = Partial<Omit<WorkerCardFields, 'issuedOn' | 'editedAt'>> & {
  nameHe?: string
  number?: number
}

/**
 * Save what the person declared. The first save ISSUES the card — `issuedOn` is set once
 * and never again — and says so, so the screen can play its one-time beat. Pure: the
 * caller reads the book and writes the answer (`saveCard` below does both).
 */
export function applyCardPatch(
  book: MemberBook,
  patch: CardPatch,
  now: Date = new Date(),
): { book: MemberBook; firstIssue: boolean } {
  const prior = book.card ?? emptyCard()
  const merged = cleanCard({ ...prior, ...patch, issuedOn: prior.issuedOn, editedAt: prior.editedAt }, now)
  const firstIssue = prior.issuedOn === ''
  const next: MemberBook = {
    ...book,
    nameHe: patch.nameHe !== undefined ? cleanName(patch.nameHe) : book.nameHe,
    number: patch.number !== undefined ? cleanNumber(patch.number) ?? book.number : book.number,
    card: {
      ...merged,
      issuedOn: firstIssue ? todayInIsrael(now) : prior.issuedOn,
      editedAt: now.toISOString(),
    },
  }
  return { book: next, firstIssue }
}

export function saveCard(patch: CardPatch, now: Date = new Date()): { book: MemberBook; firstIssue: boolean } {
  const result = applyCardPatch(readBook(), patch, now)
  writeBook(result.book, { stamp: false })
  return result
}

/** Keep gate 7's seal on the book. Starting a new ballot never erases it. */
export function saveSupporter(record: SupporterRecord): MemberBook | null {
  const clean = cleanSupporter(record)
  if (clean === null) return null
  const book = { ...readBook(), supporter: clean }
  writeBook(book, { stamp: false })
  return book
}

function isoDate(value: unknown): boolean {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isoStamp(value: unknown): boolean {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(value)
}

/** Stamp today's slot. Idempotent: a day is punched once however much you play. */
export function punchToday(book: MemberBook): MemberBook {
  const date = today()
  if (book.punches.includes(date)) return book
  return { ...book, punches: [...book.punches, date] }
}

export function fileCorrection(book: MemberBook, tagHe: string, bodyHe: string): MemberBook {
  return {
    ...book,
    corrections: [
      { id: `${Date.now()}`, tagHe, filedOn: today(), bodyHe, status: 'pending' },
      ...book.corrections,
    ],
  }
}

export function approvedCount(book: MemberBook): number {
  return book.corrections.filter((row) => row.status === 'approved').length
}

/** The last ninety days, newest last — the grid the card prints. */
export function quarterGrid(book: MemberBook): boolean[] {
  const punched = new Set(book.punches)
  const out: boolean[] = []
  const end = todayInIsrael()
  for (let back = QUARTER_SLOTS - 1; back >= 0; back -= 1) out.push(punched.has(addDays(end, -back)))
  return out
}
