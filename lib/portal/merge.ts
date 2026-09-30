/**
 * המיזוג — what happens when the same person arrives from two devices.
 *
 * This is the whole of the "exact synchronisation" Maor asked for, and it is a pure
 * function on purpose: no `window`, no Supabase client, no clock. Every decision it
 * makes is the kind that is impossible to check by playing the app — you would need two
 * phones, two evenings and a memory of which one had the higher streak — so it is the
 * one part of the portal that is settled in a test instead of in a screenshot.
 *
 * **The device stays authoritative.** Offline, signed out, blocked storage: the profile
 * in `localStorage` is the profile. Signing in does not hand the card over to the server;
 * it merges the two and writes the result back to BOTH sides. Nothing is ever replaced
 * wholesale, in either direction, because both directions have been wrong in this app's
 * short history — a server that overwrites loses the evening you just played, a device
 * that overwrites loses the other phone entirely.
 *
 * ---------------------------------------------------------------------------
 * The three kinds of field, and why they merge differently
 * ---------------------------------------------------------------------------
 *
 *  1. **Counters take `max()`, never `sum()`.** `plays`, `correct`, `asked`, `best`,
 *     `bestRate`, `shares`, `duelsTaken`. Summing looks obviously right and is the one
 *     thing that cannot be allowed: a sync is not a one-off event, it runs every time
 *     the person opens the app, and summing two totals that each already contain the
 *     other doubles the card on every visit. `max()` cannot invent — it says "at least
 *     this many", which is a true sentence after any number of syncs in any order.
 *     What `max()` does instead is UNDERCOUNT: forty rounds on the phone and thirty on
 *     the laptop merge to forty, not seventy. That is the honest failure of the two, and
 *     it is why `worker_gate_run` stores a ROW per round with an idempotency key — the exact
 *     total is recoverable by counting rows, and no arithmetic here has to guess at it.
 *
 *  2. **Sets take a union.** `days` and `collections` are sets of ids, not counts, so
 *     merging them is exact rather than approximate: two devices that played on the same
 *     day contribute one day, and the Ussishkin card you turned over on the laptop is in
 *     the collection on the phone. This is the same reason `lib/profile/store.ts` stores
 *     `days` as dates and `collections` as ids in the first place — "completing the set
 *     twice does not read as ninety cards out of forty-five".
 *
 *  3. **Identity is never overwritten. Ever.** `member_no` and `since` are the two
 *     fields a newer device can only damage:
 *
 *     · **`member_no`** is the file number on the card, and `lib/game/member.ts` says the
 *       only thing about it that matters — *nothing here can be bought*, and a number
 *       cannot be re-earned. A phone that opens the app for the first time mints itself a
 *       fresh `TIK-0417`; if that were allowed to travel up to an account that already
 *       has one, the person would lose the number they have had since the beginning, in
 *       exchange for one they got by installing a browser. So: once either side has one,
 *       that one wins, and the SERVER's wins a tie, because the server's is the one every
 *       other device has already seen.
 *
 *     · **`since`** takes the EARLIEST of the two, which is the case a `max()` merge gets
 *       exactly backwards. It is not a counter and it is not a "latest wins" field: it is
 *       the day this person started, and a new laptop signing in today carries today's
 *       date. Taking the later of the two would quietly reset a card that began a year
 *       ago every time somebody opened the app somewhere new. The database enforces the
 *       same rule in a trigger (`worker_profile_keep_identity`) rather than trusting this
 *       file, because the next person to write a sync path will not have read it.
 */

import type { MemberBook, SupporterRecord, WorkerCardFields } from '@/lib/game/member'
import {
  emptyProfile,
  emptyStat,
  type Deed,
  type GateStat,
  type Latest,
  type Profile,
  type Rotation,
} from '@/lib/profile/store'

/**
 * The two fields that live on `worker_profile` rather than in the device's `Profile`.
 * Kept beside it here, and not folded into it, because they are the fields with the
 * different merge rule — putting them in the same record as the counters is how somebody
 * ends up running `Math.max` over a date.
 */
export type PortalIdentity = {
  /** the file number from `lib/game/member.ts`. Null until a card claims one. */
  memberNo: string | null
  displayName: string | null
  /** ISO date, `YYYY-MM-DD` */
  since: string
  /**
   * When the name was last edited THROUGH THE APP — `book.card.editedAt` on a device,
   * `worker_profile.card_edited_at` on the account. '' means never: on the account side that
   * is a `display_name` Google seeded at sign-up, which is a person's legal name and not
   * the nickname they chose for the terrace. See `editWinner`.
   */
  editedAt?: string
}

/**
 * A device name that predates edit stamps. It is an edit — somebody typed it — made at a
 * time nobody recorded, so it is dated to the earliest instant there is: it beats a name
 * nobody chose (Google's) and loses to any edit that carries a real date.
 */
export const LEGACY_EDIT = '1970-01-01T00:00:00.000Z'

export type PortalProfile = {
  identity: PortalIdentity
  profile: Profile
}

export function emptyIdentity(): PortalIdentity {
  return { memberNo: null, displayName: null, since: '' }
}

/**
 * Merge the device's side and the account's side into the one that goes back to both.
 *
 * `remote` is null for a person who has signed in for the first time — there is nothing
 * on the server yet — and the answer then is the device's own card, unchanged. That is
 * not a special case bolted on: it is what the rules below produce anyway, and it is
 * written out so the first sign-in is obviously non-destructive rather than provably so.
 */
export function mergeProfiles(local: PortalProfile, remote: PortalProfile | null): PortalProfile {
  if (remote === null) return { identity: { ...local.identity }, profile: { ...local.profile } }

  return {
    identity: mergeIdentity(local.identity, remote.identity),
    profile: mergeDeviceProfiles(local.profile, remote.profile),
  }
}

export function mergeIdentity(local: PortalIdentity, remote: PortalIdentity): PortalIdentity {
  const winner = editWinner(
    { editedAt: local.editedAt ?? '', has: (local.displayName ?? '').trim() !== '' },
    { editedAt: remote.editedAt ?? '' },
  )
  const named = winner === 'local' ? local : remote
  return {
    // The server's number wins whenever it has one — see the header. A device number is
    // only ever ADOPTED upward, into an account that has none.
    memberNo: firstOf(remote.memberNo, local.memberNo),
    // THE NAME IS THE NICKNAME (21.9.2026). This line used to prefer the account's copy
    // outright — and the account's copy is whatever Google handed `handle_new_user`, a
    // person's full legal name. So the nickname typed on the card never reached the
    // account, and signing in on a second phone printed "Maor Dubel" where "פוגי" was.
    // Now the newest EDIT wins, and Google's seed is not an edit (`editWinner`).
    displayName: firstOf(named.displayName, null),
    // Earliest, always. The single most important line in this file.
    since: earlier(local.since, remote.since),
    editedAt: named.editedAt ?? '',
  }
}

/**
 * Whose edit wins — the one rule for the name, the number and the declared card fields,
 * which merge as ONE unit so a card can never print one device's name over the other
 * device's number.
 *
 *  · The account side was never edited through the app (`''`): anything the device holds
 *    wins, because the account's only name is Google's seed.
 *  · The device was never edited and holds nothing: the account wins.
 *  · Both edited: the later timestamp. A tie goes to the account, which is the copy the
 *    person's other devices have already seen.
 */
export function editWinner(
  local: { editedAt: string; has: boolean },
  remote: { editedAt: string },
): 'local' | 'remote' {
  if (remote.editedAt === '') return local.editedAt !== '' || local.has ? 'local' : 'remote'
  if (local.editedAt === '') return 'remote'
  return local.editedAt > remote.editedAt ? 'local' : 'remote'
}

/**
 * The name, the number and the declared card, as they travel between a device's book
 * and `worker_profile` (`display_name`, `shirt_number`, `card`, `card_edited_at`).
 */
export type CardUnit = {
  nameHe: string
  number: number | null
  card: WorkerCardFields | null
  /** ISO timestamp, '' = never edited through the app */
  editedAt: string
}

/** The device's unit, read off its book. A name with no stamp is a `LEGACY_EDIT`. */
export function unitOfBook(book: MemberBook | null): CardUnit | null {
  if (book === null) return null
  const stamped = book.card?.editedAt ?? ''
  const name = book.nameHe.replace(/\s+/g, ' ').trim()
  return {
    nameHe: name,
    number: book.number,
    card: book.card ?? null,
    editedAt: stamped !== '' ? stamped : name !== '' ? LEGACY_EDIT : '',
  }
}

/**
 * Newest edit wins, as a whole — except `issuedOn`, which is the day the card was first
 * issued on ANY device and so takes the earlier, exactly like `since`.
 */
export function mergeCardUnit(local: CardUnit | null, remote: CardUnit | null): CardUnit | null {
  if (local === null) return remote
  if (remote === null) return local
  const winner = editWinner(
    { editedAt: local.editedAt, has: local.nameHe !== '' || local.card !== null },
    { editedAt: remote.editedAt },
  )
  const chosen = winner === 'local' ? local : remote
  const issuedOn = earlier(local.card?.issuedOn ?? '', remote.card?.issuedOn ?? '')
  return {
    ...chosen,
    card: chosen.card === null ? null : { ...chosen.card, issuedOn },
  }
}

/** Gate 7's seal: the NEWER seal wins; a side with none never erases the other's. */
export function mergeSupporter(
  local: SupporterRecord | null | undefined,
  remote: SupporterRecord | null | undefined,
): SupporterRecord | null {
  if (!local) return remote ?? null
  if (!remote) return local
  return local.sealedOn > remote.sealedOn ? local : remote
}

export function mergeDeviceProfiles(local: Profile, remote: Profile): Profile {
  const gates: Record<string, GateStat> = {}
  for (const key of keysOf(local.gates, remote.gates)) {
    gates[key] = mergeStat(local.gates[key], remote.gates[key])
  }

  const rotation: Record<string, Rotation> = {}
  for (const key of keysOf(local.rotation, remote.rotation)) {
    const merged = mergeRotation(local.rotation[key], remote.rotation[key])
    if (merged !== null) rotation[key] = merged
  }

  const collections: Record<string, string[]> = {}
  for (const key of keysOf(local.collections, remote.collections)) {
    collections[key] = union(local.collections[key] ?? [], remote.collections[key] ?? [])
  }

  const deeds: Record<string, Deed> = {}
  for (const key of keysOf(local.deeds ?? {}, remote.deeds ?? {})) {
    const a = local.deeds?.[key]
    const b = remote.deeds?.[key]
    // The later day is the deed that counts; on a tie the local one keeps its mark,
    // because the device is the one that knows what it last made.
    deeds[key] = !a ? (b as Deed) : !b ? a : b.on > a.on ? b : a
  }

  const latest: Record<string, Latest> = {}
  for (const key of keysOf(local.latest ?? {}, remote.latest ?? {})) {
    const a = local.latest?.[key]
    const b = remote.latest?.[key]
    latest[key] = !a ? (b as Latest) : !b ? a : b.on > a.on ? b : a
  }

  return {
    v: 1,
    // `since` on the device profile is the same claim as `identity.since` and takes the
    // same rule. It is stored twice because `lib/profile/store.ts` predates the account;
    // the two are merged the same way, so they cannot disagree after a sync.
    since: earlier(local.since, remote.since),
    days: union(local.days, remote.days).sort(),
    gates,
    rotation,
    collections,
    shares: Math.max(local.shares, remote.shares),
    duelsTaken: Math.max(local.duelsTaken, remote.duelsTaken),
    deeds,
    // Preferences are the DEVICE's and never leave it, so the local side is the answer.
    prefs: { ...(local.prefs ?? {}) },
    latest,
  }
}

/** Counters take the higher of the two; the last day played takes the later. */
export function mergeStat(local: GateStat | undefined, remote: GateStat | undefined): GateStat {
  const a = local ?? emptyStat()
  const b = remote ?? emptyStat()
  return {
    plays: Math.max(a.plays, b.plays),
    best: Math.max(a.best, b.best),
    bestRate: Math.max(a.bestRate, b.bestRate),
    // The only field on a stat that is a DATE, and the only one where "later" is right:
    // "when did you last play this gate" is answered by whichever device played it last.
    lastOn: later(a.lastOn, b.lastOn),
    correct: Math.max(a.correct, b.correct),
    asked: Math.max(a.asked, b.asked),
  }
}

/**
 * איפה אתה בחפיסה — and the one field that is not merged at all when the two disagree.
 *
 * A rotation is this DEVICE's place in a shuffle (`lib/rotation/deck.ts`): the seed says
 * which shuffle, the cursor says how far in. Two devices that were handed different
 * seeds are walking two different decks, and taking the higher cursor across them would
 * skip a stranger's worth of rounds you have never seen — the deck's whole purpose is
 * that nothing repeats until the pool is exhausted, and a cursor from another shuffle
 * makes it skip instead.
 *
 * So: same seed, take the further cursor. Different seeds, the LOCAL device keeps its own
 * deck, because it is the one mid-walk. Nothing is lost by that — a deck is a position,
 * not a possession, and the other device keeps walking its own.
 */
export function mergeRotation(
  local: Rotation | undefined,
  remote: Rotation | undefined,
): Rotation | null {
  if (!isRotation(local)) return isRotation(remote) ? { ...remote } : null
  if (!isRotation(remote)) return { ...local }
  if (local.seed !== remote.seed) return { ...local }
  return { seed: local.seed, cursor: Math.max(local.cursor, remote.cursor) }
}

function isRotation(value: Rotation | undefined): value is Rotation {
  return !!value && Number.isFinite(value.seed) && value.seed > 0 && Number.isFinite(value.cursor)
}

/**
 * The earlier of two ISO dates, ignoring the empty string.
 *
 * An empty `since` is what an untouched profile carries before anything is written to
 * it, and treating `''` as "the beginning of time" would make every merge answer `''`.
 * It means "nothing known", which is the opposite.
 */
export function earlier(a: string, b: string): string {
  if (a === '') return b
  if (b === '') return a
  return a < b ? a : b
}

export function later(a: string, b: string): string {
  if (a === '') return b
  if (b === '') return a
  return a > b ? a : b
}

function firstOf(preferred: string | null, fallback: string | null): string | null {
  const first = (preferred ?? '').trim()
  if (first !== '') return first
  const second = (fallback ?? '').trim()
  return second === '' ? null : second
}

/** Local order first, then whatever the other side had and this one did not. */
function union(a: readonly string[], b: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of [...a, ...b]) {
    if (typeof value !== 'string' || value === '' || seen.has(value)) continue
    seen.add(value)
    out.push(value)
  }
  return out
}

function keysOf(a: Record<string, unknown>, b: Record<string, unknown>): string[] {
  return [...new Set([...Object.keys(a), ...Object.keys(b)])]
}

/**
 * The device profile as it comes back from the account.
 *
 * Assembled by `lib/portal/sync.ts` from real rows and handed here as a plain `Profile`,
 * so this file never learns what a Supabase response looks like and the tests never need
 * one. Anything the server does not hold falls back to an empty profile rather than to a
 * guess.
 */
export function remoteProfile(partial: Partial<Profile>): Profile {
  return {
    ...emptyProfile(),
    ...partial,
    since: partial.since ?? '',
    days: Array.isArray(partial.days) ? partial.days : [],
    gates: partial.gates ?? {},
    rotation: partial.rotation ?? {},
    collections: partial.collections ?? {},
    deeds: partial.deeds ?? {},
    prefs: {},
    latest: partial.latest ?? {},
  }
}

/**
 * `worker_profile_item` rows, folded into the device's `collections` shape — the fourth read
 * model on the account side, and the reason collections are exact across devices now:
 * once both sides hold the same sets, the union above is the whole answer.
 */
export type ItemRow = { set_id: string; item_id: string }

export function foldItems(rows: readonly ItemRow[]): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  const seen: Record<string, Set<string>> = {}
  for (const row of rows) {
    if (typeof row?.set_id !== 'string' || typeof row.item_id !== 'string') continue
    if (row.set_id === '' || row.item_id === '') continue
    const have = (seen[row.set_id] ??= new Set())
    if (have.has(row.item_id)) continue
    have.add(row.item_id)
    ;(out[row.set_id] ??= []).push(row.item_id)
  }
  return out
}
