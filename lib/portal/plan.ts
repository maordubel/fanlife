import {
  cleanCard,
  cleanNumber,
  cleanSupporter,
  type MemberBook,
  type SupporterRecord,
  type WorkerCardFields,
} from '@/lib/game/member'
import { isSyncedSet, type Deed, type GateStat, type Profile } from '@/lib/profile/store'
import type { Json } from '@/types/database'

import {
  foldItems,
  mergeCardUnit,
  mergeDeviceProfiles,
  mergeIdentity,
  mergeSupporter,
  remoteProfile,
  unitOfBook,
  type CardUnit,
  type ItemRow,
  type PortalIdentity,
} from './merge'

/**
 * התוכנית — the whole of a sync, decided before a single byte is written.
 *
 * `lib/portal/sync.ts` used to read both sides and merge them inline, which put every
 * decision worth testing inside a function that needs a network to run. Now it reads,
 * hands both sides here, and EXECUTES the answer: what the device keeps, what the book
 * adopts, what `worker_profile` is updated with, which collection items and which deeds the
 * account has not heard of yet. Everything in this file is pure, and
 * `tests/portal-sync.test.ts` plays the first sign-in, the second device and the Google
 * name through it without a Supabase project.
 *
 * **Anonymous-first is the default, not a mode.** A device that never signs in never
 * reaches this file. A device that signs in for the first time meets an account that
 * holds nothing (or only what Google seeded), and the plan is "keep everything the device
 * has and send it up" — its runs as counters (max-merged, rule 76), its collections and
 * deeds as ROWS, its nickname as the account's `display_name`.
 */

/** A `worker_gate_run` row as the sync reads it. The key is read so deeds are not re-sent. */
export type RunRow = {
  gate: string
  score: number
  asked: number
  correct: number
  played_on: string
  idempotency_key?: string | null
}

/** `worker_profile`, with the card columns optional: before the SQL runs they do not exist. */
export type AppProfileRow = {
  display_name: string | null
  member_no: string | null
  since: string | null
  card?: Json | null
  card_edited_at?: string | null
  shirt_number?: number | null
  supporter?: Json | null
}

export type LocalSide = { profile: Profile; book: MemberBook | null }

export type RemoteSide = {
  /** null: the account has no card row yet */
  row: AppProfileRow | null
  runs: readonly RunRow[]
  /** null: `worker_profile_item` is not there (the SQL has not been run) or could not be read */
  items: readonly ItemRow[] | null
  /** false: `worker_profile.card` and friends are not there yet */
  cardColumns: boolean
  /** the name Google put on the session — used only to print "signed in as" */
  accountName: string | null
}

export type AppProfileUpdate = {
  member_no?: string | null
  since?: string
  display_name?: string | null
  card?: Json | null
  card_edited_at?: string | null
  shirt_number?: number | null
  supporter?: Json | null
}

export type SyncPlan = {
  /** the account's side as a device profile — merged into the CURRENT local at write time */
  remote: Profile | null
  /** the merged device profile, for a screen that wants to print it */
  profile: Profile
  identity: PortalIdentity
  /** the name/number/card the book should hold after the sync, or null to leave it */
  unit: CardUnit | null
  supporter: SupporterRecord | null
  /** what `worker_profile` is updated with */
  update: AppProfileUpdate
  /** collection items the account does not hold yet, by set, in chunks */
  items: Array<{ set: string; ids: string[] }>
  /** deeds the account does not hold yet */
  deeds: Array<{ key: string; gate: string; day: string }>
}

/** How many ids one `worker_collect` call carries. The function refuses more than 500. */
export const ITEM_CHUNK = 200

/**
 * The account's `worker_gate_run` rows, folded into the device's shape — and the deeds they
 * carry, recovered from their keys (`deed:<gate>:<day>`), so a deed made on the laptop
 * today is not made again on the phone today.
 */
export function foldRuns(rows: readonly RunRow[]): Partial<Profile> {
  const gates: Record<string, GateStat> = {}
  const days = new Set<string>()
  const deeds: Record<string, Deed> = {}
  let since = ''

  for (const row of rows) {
    if (typeof row.gate !== 'string' || row.gate === '') continue
    const day = typeof row.played_on === 'string' ? row.played_on : ''
    if (day !== '') {
      days.add(day)
      since = since === '' || day < since ? day : since
    }
    const prior = gates[row.gate] ?? { plays: 0, best: 0, bestRate: 0, lastOn: '', correct: 0, asked: 0 }
    const asked = row.asked ?? 0
    const correct = row.correct ?? 0
    gates[row.gate] = {
      plays: prior.plays + 1,
      best: Math.max(prior.best, row.score ?? 0),
      bestRate: Math.max(prior.bestRate, asked > 0 ? correct / asked : 0),
      lastOn: day > prior.lastOn ? day : prior.lastOn,
      correct: prior.correct + correct,
      asked: prior.asked + asked,
    }
    const deed = parseDeedKey(row.idempotency_key)
    if (deed !== null && (deeds[deed.gate]?.on ?? '') < deed.day) deeds[deed.gate] = { on: deed.day }
  }

  const out: Partial<Profile> = { since, days: [...days].sort(), gates }
  if (Object.keys(deeds).length > 0) out.deeds = deeds
  return out
}

export function parseDeedKey(key: string | null | undefined): { gate: string; day: string } | null {
  if (typeof key !== 'string') return null
  const match = /^deed:(\/[^:]*):(\d{4}-\d{2}-\d{2})$/.exec(key)
  return match ? { gate: match[1] as string, day: match[2] as string } : null
}

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.replace(/\s+/g, ' ').trim()
  return trimmed === '' ? null : trimmed
}

/**
 * The account's card unit. A `display_name` with no `card_edited_at` is Google's seed —
 * a person's legal name — and is NOT a nickname: it never travels down into a book.
 */
export function unitOfRow(row: AppProfileRow | null, cardColumns: boolean): CardUnit | null {
  if (row === null || !cardColumns) return null
  const stamp = typeof row.card_edited_at === 'string' ? Date.parse(row.card_edited_at) : Number.NaN
  const editedAt = Number.isFinite(stamp) ? new Date(stamp).toISOString() : ''
  if (editedAt === '' && (row.card === null || row.card === undefined)) {
    return { nameHe: '', number: null, card: null, editedAt: '' }
  }
  const card: WorkerCardFields | null =
    row.card === null || row.card === undefined ? null : { ...cleanCard(row.card), editedAt }
  return {
    nameHe: editedAt === '' ? '' : text(row.display_name) ?? '',
    number: cleanNumber(row.shirt_number),
    card,
    editedAt,
  }
}

/** The declared card as it is stored in `worker_profile.card` — no edit stamp, no free text limits lost. */
export function cardJson(card: WorkerCardFields | null): Json | null {
  if (card === null) return null
  return {
    homeGate: card.homeGate,
    fanSince: card.fanSince,
    began: card.began,
    first: card.first as Json,
    values: card.values,
    issuedOn: card.issuedOn,
  }
}

/** Ids the device holds that the account does not, per synced set, in chunks. */
export function itemsToPush(
  local: Record<string, readonly string[]>,
  remote: Record<string, readonly string[]>,
): Array<{ set: string; ids: string[] }> {
  const out: Array<{ set: string; ids: string[] }> = []
  for (const [set, ids] of Object.entries(local)) {
    if (!isSyncedSet(set)) continue
    const have = new Set(remote[set] ?? [])
    const missing = ids.filter((id) => typeof id === 'string' && id !== '' && id.length <= 128 && !have.has(id))
    for (let i = 0; i < missing.length; i += ITEM_CHUNK) out.push({ set, ids: missing.slice(i, i + ITEM_CHUNK) })
  }
  return out
}

/** Deeds the device holds whose key the account's rows do not carry. */
export function deedsToPush(
  deeds: Record<string, Deed>,
  remoteKeys: ReadonlySet<string>,
): Array<{ key: string; gate: string; day: string }> {
  const out: Array<{ key: string; gate: string; day: string }> = []
  for (const [gate, deed] of Object.entries(deeds)) {
    if (!gate.startsWith('/') || !/^\d{4}-\d{2}-\d{2}$/.test(deed?.on ?? '')) continue
    const key = `deed:${gate}:${deed.on}`
    if (!remoteKeys.has(key)) out.push({ key, gate, day: deed.on })
  }
  return out
}

/** Decide the sync. See the header. */
export function planSync(local: LocalSide, remote: RemoteSide): SyncPlan {
  const localUnit = unitOfBook(local.book)
  const localIdentity: PortalIdentity = {
    memberNo: local.book === null ? null : text(local.book.tik),
    displayName: localUnit?.nameHe || null,
    since: local.profile.since,
    editedAt: localUnit?.editedAt ?? '',
  }

  if (remote.row === null) {
    return {
      remote: null,
      profile: local.profile,
      identity: localIdentity,
      unit: null,
      supporter: local.book?.supporter ?? null,
      update: {},
      items: [],
      deeds: [],
    }
  }

  const remoteUnit = unitOfRow(remote.row, remote.cardColumns)
  const remoteIdentity: PortalIdentity = {
    memberNo: text(remote.row.member_no),
    displayName: remoteUnit === null ? text(remote.row.display_name) : remoteUnit.nameHe || text(remote.row.display_name),
    since: text(remote.row.since) ?? '',
    editedAt: remoteUnit?.editedAt ?? '',
  }

  const folded = foldRuns(remote.runs)
  const remoteSide = remoteProfile({
    ...folded,
    ...(remote.items === null ? {} : { collections: foldItems(remote.items) }),
  })
  const profile = mergeDeviceProfiles(local.profile, remoteSide)
  const identity = mergeIdentity(localIdentity, remoteIdentity)
  const unit = mergeCardUnit(localUnit, remoteUnit)
  const supporter = mergeSupporter(
    local.book?.supporter,
    remote.cardColumns ? cleanSupporter(remote.row.supporter) : null,
  )

  // The name goes up only when somebody CHOSE it. With no edit anywhere the account keeps
  // whatever Google seeded — it is the account's own row, owner-only, and never printed.
  const named = unit !== null && unit.editedAt !== ''
  const update: AppProfileUpdate = {
    // Sending the merged number is safe by construction: the merge prefers the server's
    // whenever it has one. `worker_profile_keep_identity` refuses anything else.
    member_no: identity.memberNo,
    ...(identity.since === '' ? {} : { since: identity.since }),
    ...(named ? { display_name: unit.nameHe === '' ? null : unit.nameHe } : {}),
    ...(remote.cardColumns && named
      ? { card: cardJson(unit.card), card_edited_at: unit.editedAt, shirt_number: unit.number }
      : {}),
    ...(remote.cardColumns && supporter !== null ? { supporter: supporter as unknown as Json } : {}),
  }

  const remoteKeys = new Set(
    remote.runs.map((row) => row.idempotency_key).filter((key): key is string => typeof key === 'string'),
  )

  return {
    remote: remoteSide,
    profile,
    identity: {
      ...identity,
      displayName: (named ? unit.nameHe : null) || identity.displayName || remote.accountName,
    },
    unit,
    supporter,
    update,
    items: remote.items === null ? [] : itemsToPush(profile.collections, remoteSide.collections),
    deeds: deedsToPush(profile.deeds, remoteKeys),
  }
}

/** The book after the sync: the merged unit and seal adopted, everything else untouched. */
export function bookAfter(book: MemberBook, plan: Pick<SyncPlan, 'unit' | 'supporter' | 'identity'>): MemberBook {
  const next: MemberBook = { ...book }
  if (plan.unit !== null && plan.unit.editedAt !== '') {
    next.nameHe = plan.unit.nameHe
    if (plan.unit.number !== null) next.number = plan.unit.number
    if (plan.unit.card !== null) next.card = plan.unit.card
  }
  if (plan.supporter !== null) next.supporter = plan.supporter
  if (plan.identity.memberNo !== null && book.tik !== plan.identity.memberNo) next.tik = plan.identity.memberNo
  return next
}
