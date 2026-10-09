'use client'
import { evaluationMode } from '@/lib/master/mode'
import { normaliseWorld } from '@/lib/fanlife/world'

import { portalConfigured } from '@/lib/portal/env'
import { createClient } from '@/lib/supabase/client'

import type {
  Closet,
  ClosetView,
  CollectorError,
  CollectorLabel,
  CollectorNotification,
  ConnectionSummary,
  Currency,
  Fail,
  IdentityMode,
  ItemPatch,
  LotBrief,
  LotState,
  Matches,
  MerchantOffer,
  OwnerItem,
  PublicItem,
  Result,
  ShirtSignal,
  Thread,
} from './types'

/**
 * הצינור היחיד מהאפליקציה לארון, לשוק ולמכירה הפומבית.
 *
 * כל קריאה היא `rpc` אחת לפונקציה ב-`20260922120000_worker_collector_market.sql`, וכל תשובה היא
 * `Result`: לעולם לא זורקת. בלי מפתחות Supabase הכול עונה `{ ok: false, error: 'off' }`, כך
 * שמסך יכול להציג את עצמו בכל מצב. הלקוח לא מטופס כאן בכוונה, בקובץ הזה בלבד: `types/database.ts`
 * לא מכיר את הפונקציות האלה, והטיפוסים של התשובות חיים ב-`./types` — צורה אחת, במקום אחד.
 */

/** a call whose success carries nothing but `ok` */
type Ok = object

type RpcClient = {
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>
  storage: {
    from: (bucket: string) => {
      upload: (path: string, body: Blob, options?: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null }>
      remove: (paths: string[]) => PromiseLike<{ error: { message: string } | null }>
      download: (path: string) => PromiseLike<{ data: Blob | null; error: { message: string } | null }>
    }
  }
}

/** the closed bucket of old, owner-folder photos — read only by their owner, until they are migrated */
export const PHOTO_BUCKET = 'worker-collector'
/** the public bucket of opaque photos: `p/<random>.<ext>`, no owner id anywhere in the path */
export const PHOTO_BUCKET_PUB = 'worker-collector-pub'
const isOpaquePath = (path: string) => /^p\/[0-9a-f]{32}\.(webp|jpg|png)$/.test(path)
const bucketFor = (path: string) => (isOpaquePath(path) ? PHOTO_BUCKET_PUB : PHOTO_BUCKET)

function client(): RpcClient {
  return createClient() as unknown as RpcClient
}

const fail = (error: CollectorError): Fail => ({ ok: false, error })

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<Result<T>> {
  if (!portalConfigured()) return fail('off')
  try {
    const { data, error } = await client().rpc(fn, args)
    if (error) {
      // "permission denied for function" is what a guest gets from a member-only function
      // keep the real cause visible: a missing function is a deploy problem, not a network one
      if (typeof console !== 'undefined') console.error('[collector]', fn, error.message)
      if (/permission denied/i.test(error.message)) return fail('auth_required')
      if (/could not find the function|schema cache|does not exist|PGRST20\d/i.test(error.message)) return fail('setup')
      return fail('network')
    }
    if (data && typeof data === 'object' && 'ok' in (data as Record<string, unknown>)) return normaliseWorld(data) as Result<T>
    return fail('network')
  } catch {
    return fail('network')
  }
}

/** A function that answers a bare value (a list, a map) rather than `{ ok }`. */
async function read<T>(fn: string, args: Record<string, unknown> | undefined, fallback: T): Promise<T> {
  if (!portalConfigured()) return fallback
  try {
    const { data, error } = await client().rpc(fn, args)
    return error || data === null || data === undefined ? fallback : normaliseWorld(data as T)
  } catch {
    return fallback
  }
}

/** The public URL of a stored photo. Never built from anything but a path the database returned. */
export function photoUrl(path: string): string {
  if (evaluationMode()) return `/api/evaluation/files?path=${encodeURIComponent(path)}`
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '')
  return `${base}/storage/v1/object/public/${bucketFor(path)}/${path.split('/').map(encodeURIComponent).join('/')}`
}

// ---------------------------------------------------------------- the archive side
export const shirtSignals = (slugs: readonly string[]) =>
  read<Record<string, ShirtSignal>>('worker_shirt_signals', { p_slugs: [...slugs].slice(0, 240) }, {})

// ---------------------------------------------------------------- the closet
export const closetMine = () => call<Closet>('worker_closet_mine')
export const closetView = (handle: number, token?: string | null) =>
  call<ClosetView>('worker_closet_view', { p_handle: handle, p_token: token ?? null })
export const have = (slug: string, kitId?: string | null, newCopy = false) =>
  call<{ created: boolean; item: OwnerItem }>('worker_collector_have', { p_slug: slug, p_kit: kitId ?? null, p_new_copy: newCopy })
/** a shirt assembled in a game — a closet item tagged "game", not yet offerable (`worker_collector_have_game`) */
export const haveGame = (slug: string, kitId?: string | null) =>
  call<{ created: boolean; item: OwnerItem }>('worker_collector_have_game', { p_slug: slug, p_kit: kitId ?? null })
/** "I own a real one" — lifts the game tag so the item can be offered */
export const confirmOwned = (itemId: string) => call<Ok>('worker_collector_confirm_owned', { p_item: itemId })
/** which of my items are game-built */
export const gameItems = () => call<{ items: string[] }>('worker_game_items_mine')
export const unhave = (itemId: string) => call<Ok>('worker_collector_unhave', { p_item: itemId })
export const wantSet = (slug: string, on: boolean, opts: { kitId?: string | null; size?: string | null; notes?: string | null } = {}) =>
  call<{ wanting: boolean }>('worker_collector_want_set', {
    p_slug: slug,
    p_on: on,
    p_kit: opts.kitId ?? null,
    p_size: opts.size ?? null,
    p_notes: opts.notes ?? null,
  })
export const itemUpdate = (itemId: string, patch: ItemPatch) =>
  call<{ item: OwnerItem }>('worker_collector_item_update', { p_item: itemId, p_patch: patch })
export const settings = (patch: { visibility?: 'public' | 'link_only' | 'private'; showNickname?: boolean; rotateToken?: boolean }) =>
  call<{ visibility: string; showNickname: boolean; shareToken: string }>('worker_collector_settings', { p_patch: patch })
/** One atomic change of how I appear. Anonymous also closes the closet — the first call answers `confirm_private` until `confirm` is true. */
export const identitySet = (mode: IdentityMode, nickname: string | null = null, confirm = false) =>
  call<{ identityMode: IdentityMode; nickname: string | null; visibility: string; shareToken: string; label: CollectorLabel }>(
    'worker_collector_identity_set',
    { p_mode: mode, p_nickname: nickname, p_confirm: confirm },
  )
/** Put copies in, or take them out of, the closet's display selection. */
export const displaySet = (itemIds: readonly string[], on: boolean) =>
  call<{ changed: number; on: boolean }>('worker_collector_display_set', { p_items: [...itemIds], p_on: on })

/**
 * A photo, shrunk on the device to at most 1400px and ~0.8 quality WebP (JPEG where the
 * browser cannot encode WebP), uploaded into the owner's own folder, then registered.
 * The bucket refuses anything over 2MB or outside WebP/JPEG/PNG, and a path outside
 * `<you>/<item>/` — the database checks the same three things again.
 */
export async function photoUpload(_userId: string, itemId: string, file: File): Promise<Result<{ photos: string[] }>> {
  const put = await photoStore(_userId, itemId, file)
  if (!put.ok) return put
  return call<{ photos: string[] }>('worker_collector_photo_add', { p_item: itemId, p_path: put.path })
}

/** A photo that belongs to no copy yet: shrunk and stripped on the device, uploaded to an opaque slot (`p/<random>`, no owner id); the caller registers the path. */
export async function photoStore(_userId: string, _folderId: string, file: File): Promise<Result<{ path: string }>> {
  if (!portalConfigured()) return fail('off')
  const blob = await shrink(file)
  if (!blob) return fail('image_unreadable')
  const ext = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg'
  const slot = await call<{ path: string }>('worker_photo_slot', { p_ext: ext })
  if (!slot.ok) return slot
  try {
    const { error } = await client().storage.from(PHOTO_BUCKET_PUB).upload(slot.path, blob, { contentType: blob.type, upsert: false })
    if (error) return fail('upload_failed')
  } catch {
    return fail('upload_failed')
  }
  return { ok: true, path: slot.path }
}

/**
 * Old photos lived in `<you>/<item>/<file>` — an owner id in a public URL. This moves each of
 * mine to an opaque slot, re-encoded (which also drops every metadata block), repoints the row,
 * and only then removes the old file. Safe to run again; a failure leaves the old photo in place.
 */
export async function migrateLegacyPhotos(): Promise<{ moved: number; left: number }> {
  if (!portalConfigured()) return { moved: 0, left: 0 }
  const list = await call<{ photos: { itemId: string; path: string }[] }>('worker_photo_legacy')
  if (!list.ok) return { moved: 0, left: 0 }
  let moved = 0
  let left = 0
  for (const { path: old } of list.photos) {
    try {
      const got = await client().storage.from(PHOTO_BUCKET).download(old)
      if (got.error || !got.data) {
        left++
        continue
      }
      const file = new File([got.data], 'p.' + (old.split('.').pop() ?? 'webp'), { type: got.data.type || 'image/webp' })
      const put = await photoStore('', '', file)
      if (!put.ok) {
        left++
        continue
      }
      const done = await call<{ path: string }>('worker_collector_photo_migrate', { p_old: old, p_new: put.path })
      if (!done.ok) {
        left++
        continue
      }
      moved++
      await client().storage.from(PHOTO_BUCKET).remove([old])
    } catch {
      left++
    }
  }
  return { moved, left }
}

export async function photoRemove(path: string): Promise<Result<{ path: string; photos: string[] }>> {
  const out = await call<{ path: string; photos: string[] }>('worker_collector_photo_remove', { p_path: path })
  if (out.ok) {
    try {
      await client().storage.from(bucketFor(path)).remove([path])
    } catch {
      // the row is gone; an orphaned file costs storage, not correctness
    }
  }
  return out
}

export const photoOrder = (itemId: string, paths: readonly string[]) =>
  call<{ photos: string[] }>('worker_collector_photo_order', { p_item: itemId, p_paths: [...paths] })

async function shrink(file: File): Promise<Blob | null> {
  if (typeof window === 'undefined' || !file.type.startsWith('image/')) return null
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const encode = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.82))
    const webp = await encode('image/webp')
    const blob = webp && webp.type === 'image/webp' ? webp : await encode('image/jpeg')
    return blob && blob.size <= 2 * 1024 * 1024 ? blob : null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------- the market
export const marketList = (opts: { slug?: string | null; kind?: 'sale' | 'trade' | null; limit?: number; before?: string | null } = {}) =>
  read<PublicItem[]>('worker_market_list', {
    p_slug: opts.slug ?? null,
    p_kind: opts.kind ?? null,
    p_limit: opts.limit ?? 60,
    p_before: opts.before ?? null,
  }, [])
export const marketItem = (itemId: string) => call<{ item: PublicItem; connectionId: string | null }>('worker_market_item', { p_item: itemId })
export const matches = () => call<Matches>('worker_market_matches')

// ---------------------------------------------------------------- connections
export const connect = (itemId: string, kind: 'buy' | 'trade', body?: string) =>
  call<{ connectionId: string; existing: boolean }>('worker_connect', { p_item: itemId, p_kind: kind, p_body: body ?? null })
export const respond = (connectionId: string, accept: boolean) =>
  call<{ status: string }>('worker_connection_respond', { p_conn: connectionId, p_accept: accept })
export const sendMessage = (connectionId: string, body: string, kind: 'text' | 'photo_request' = 'text') =>
  call<Ok>('worker_message_send', { p_conn: connectionId, p_body: body, p_kind: kind })
export const offerMake = (connectionId: string, kind: 'price' | 'trade', amount: number | null, currency: Currency = 'ILS', items: string[] = []) =>
  call<{ offerId: string }>('worker_offer_make', {
    p_conn: connectionId,
    p_kind: kind,
    p_amount: amount,
    p_currency: currency,
    p_items: kind === 'trade' ? items : null,
  })
export const offerRespond = (offerId: string, action: 'accept' | 'decline' | 'counter', amount?: number) =>
  call<{ status?: string; offerId?: string }>('worker_offer_respond', { p_offer: offerId, p_action: action, p_amount: amount ?? null })
export const step = (connectionId: string, which: 'agreed' | 'done' | 'cancel') =>
  call<{ status: string; kind?: 'buy' | 'trade'; waitingForOther?: boolean }>('worker_connection_step', { p_conn: connectionId, p_step: which })
export const myConnections = () => call<{ connections: ConnectionSummary[] }>('worker_my_connections')
export const thread = (connectionId: string) => call<Thread>('worker_connection_thread', { p_conn: connectionId })
/** Block by handle, or — when the other side is anonymous — from the thing they sent: a conversation, a listing or a lot. */
export const block = (handle: number | null, on: boolean, target: { connectionId?: string | null; itemId?: string | null; lotId?: string | null } = {}) =>
  call<{ blocked: boolean }>('worker_block_set', {
    p_handle: handle,
    p_on: on,
    p_connection: target.connectionId ?? null,
    p_item: target.itemId ?? null,
    p_lot: target.lotId ?? null,
  })
export const report = (args: {
  reason: 'scam' | 'fake' | 'abuse' | 'spam' | 'other'
  details?: string
  connectionId?: string
  itemId?: string
  lotId?: string
  handle?: number
}) =>
  call<{ reportId: string }>('worker_report', {
    p_reason: args.reason,
    p_details: args.details ?? null,
    p_connection: args.connectionId ?? null,
    p_item: args.itemId ?? null,
    p_lot: args.lotId ?? null,
    p_handle: args.handle ?? null,
  })

// ---------------------------------------------------------------- the auction
export const auctionSubmit = (args: {
  itemId: string
  title: string
  description: string
  startPrice: number
  reservePrice?: number | null
  currency?: Currency
  hours?: number
  increment?: number | null
}) =>
  call<{ lotId: string }>('worker_auction_submit', {
    p_item: args.itemId,
    p_title: args.title,
    p_description: args.description,
    p_start: args.startPrice,
    p_reserve: args.reservePrice ?? null,
    p_currency: args.currency ?? 'ILS',
    p_hours: args.hours ?? 72,
    p_increment: args.increment ?? null,
  })
export const auctionWithdraw = (lotId: string) => call<Ok>('worker_auction_withdraw', { p_lot: lotId })
export const auctionList = (scope: 'open' | 'recent' | 'mine' = 'open') => call<{ lots: LotBrief[] }>('worker_auction_list', { p_scope: scope })
export const auctionState = (lotId: string) => call<LotState>('worker_auction_state', { p_lot: lotId })
export const auctionBid = (lotId: string, max: number) =>
  call<{ leading: boolean; state: Result<LotState> }>('worker_auction_bid', { p_lot: lotId, p_max: max })
export const auctionWatch = (lotId: string, on: boolean) => call<{ watching: boolean }>('worker_auction_watch', { p_lot: lotId, p_on: on })
export const auctionComplete = (lotId: string) =>
  call<{ status: string; waitingForOther?: boolean }>('worker_auction_complete', { p_lot: lotId })

// ---------------------------------------------------------------- notifications
export const notifications = (limit = 50) =>
  call<{ unread: number; items: CollectorNotification[] }>('worker_notifications', { p_limit: limit })
export const notificationsRead = (ids?: string[]) =>
  call<Ok>('worker_notifications_read', { p_ids: ids ?? null })

// ---------------------------------------------------------------- merchant offers
export const merchantOffers = (target: { slug?: string | null; kitId?: string | null; season?: string | null } = {}) =>
  read<MerchantOffer[]>('worker_merchant_offers', {
    p_slug: target.slug ?? null,
    p_kit: target.kitId ?? null,
    p_season: target.season ?? null,
  }, [])

// ---------------------------------------------------------------- admin (every function re-checks in the database)
export type AdminLot = LotBrief & {
  status: string
  description: string
  reservePrice: number | null
  requestedHours: number
  minIncrement: number
  seller: CollectorLabel
  item: PublicItem
  decisionNote: string | null
  createdAt: string
}
export type AdminReport = {
  id: string
  reason: string
  details: string | null
  status: 'open' | 'reviewed' | 'actioned' | 'dismissed'
  createdAt: string
  reporter: CollectorLabel | null
  reported: CollectorLabel | null
  connectionId: string | null
  itemId: string | null
  lotId: string | null
  resolutionNote: string | null
  handledAt: string | null
}
export type AdminOverview = {
  openReports: number
  pendingLots: number
  liveLots: number
  awaitingLots: number
  collectors: number
  items: number
  listed: number
  completed: number
  merchantOffers: number
}
export type AuditEntry = { id: number; action: string; entity: string; entityId: string | null; detail: unknown; at: string; actor: CollectorLabel | null }

export const adminWhoami = () => call<{ admin: boolean }>('worker_admin_whoami')
export const adminOverview = () => call<AdminOverview>('worker_admin_overview')
export const adminLots = (status: string | null = 'pending_approval') => call<{ lots: AdminLot[] }>('worker_admin_lots', { p_status: status })
export const adminLotDecide = (lotId: string, approve: boolean, startsAt?: string | null, note?: string | null) =>
  call<{ status: string; startsAt?: string; endsAt?: string }>('worker_admin_lot_decide', {
    p_lot: lotId,
    p_approve: approve,
    p_starts_at: startsAt ?? null,
    p_note: note ?? null,
  })
export const adminLotCancel = (lotId: string, note: string) => call<Ok>('worker_admin_lot_cancel', { p_lot: lotId, p_note: note })
export const adminBidVoid = (bidId: string, note: string) => call<{ state: Result<LotState> }>('worker_admin_bid_void', { p_bid: bidId, p_note: note })
export const adminReports = (status: string | null = 'open') => call<{ reports: AdminReport[] }>('worker_admin_reports', { p_status: status })
export const adminReportResolve = (reportId: string, status: 'reviewed' | 'actioned' | 'dismissed', note?: string) =>
  call<Ok>('worker_admin_report_resolve', { p_report: reportId, p_status: status, p_note: note ?? null })
export const adminConnectionView = (connectionId: string) => call<Thread>('worker_admin_connection_view', { p_conn: connectionId })
export const adminItemSuspend = (itemId: string, on: boolean, reason?: string) =>
  call<Ok>('worker_admin_item_suspend', { p_item: itemId, p_on: on, p_reason: reason ?? null })
export const adminMerchantList = () => call<{ offers: Record<string, unknown>[] }>('worker_admin_merchant_list')
export const adminMerchantUpsert = (offer: Record<string, unknown>) => call<{ id: string }>('worker_admin_merchant_upsert', { p_offer: offer })
export const adminAudit = (limit = 100, entity: string | null = null) =>
  call<{ entries: AuditEntry[] }>('worker_admin_audit', { p_limit: limit, p_entity: entity })

export type { CollectorLabel }

// ---------------------------------------------------------------- contributions (privacy stage C)
export type CreditChoice = 'none' | 'anonymous' | 'nickname'
export type ReviewState = 'none' | 'pending' | 'approved' | 'rejected'
export type Contribution = {
  id: string; path: string; itemId: string; club: string; season: string | null
  archiveUse: boolean; marketingUse: boolean; credit: CreditChoice; review: ReviewState; decidedAt: string | null
}
export type QueuedPhoto = {
  id: string; path: string; club: string; season: string | null; variant: string | null
  marketingUse: boolean; credit: string | null; note: string | null; decidedAt: string
}
/** Per photo: may the editors reuse it in the club archive, may it be used to promote the hub, and how to credit it. No row means no. */
export const consentSet = (photoId: string, archive: boolean, marketing: boolean, credit: CreditChoice) =>
  call<{ review: ReviewState }>('worker_photo_consent_set', { p_photo: photoId, p_archive: archive, p_marketing: marketing, p_credit: credit })
export const contributionsMine = () => call<{ photos: Contribution[] }>('worker_contributions_mine')
export const adminContributionQueue = (status: 'pending' | 'approved' | 'rejected' = 'pending') =>
  call<{ items: QueuedPhoto[] }>('worker_admin_contribution_queue', { p_status: status })
export const adminContributionReview = (photoId: string, status: 'approved' | 'rejected' | 'pending', note?: string) =>
  call<Ok>('worker_admin_contribution_review', { p_photo: photoId, p_status: status, p_note: note ?? null })
export const adminClubMerge = (from: string, to: string) => call<{ moved: number }>('worker_admin_club_merge', { p_from: from, p_to: to })
