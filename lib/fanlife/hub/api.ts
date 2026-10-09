'use client'

import { portalConfigured } from '@/lib/portal/env'
import { createClient } from '@/lib/supabase/client'
import type { CollectorError, Fail, Result } from '@/lib/collector/types'

import type {
  Cursor,
  DealExtras,
  FeedbackRating,
  HandoverMethod,
  CircleKind,
  CircleOverview,
  CircleRef,
  Delivery,
  HubQuery,
  IdProposal,
  IdRequest,
  MyWant,
  Pipe,
  Place,
  SavedSearch,
  ShipScope,
  SearchPage,
  WantedPage,
  WantInput,
} from './types'

/**
 * The hub's pipe to the database: one `rpc` per function, every answer a `Result`, never a throw —
 * the same contract as `lib/collector/api.ts`, which this file deliberately does not edit (it is The
 * Worker's). Without Supabase keys everything answers `{ ok: false, error: 'off' }`.
 */
type Rpc = { rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }> }

const fail = (error: CollectorError): Fail => ({ ok: false, error })

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<Result<T>> {
  if (!portalConfigured()) return fail('off')
  try {
    const { data, error } = await (createClient() as unknown as Rpc).rpc(fn, args)
    if (error) {
      // keep the real cause visible: a missing function is a deploy problem, not a network one
      if (typeof console !== 'undefined') console.error('[hub]', fn, error.message)
      if (/permission denied/i.test(error.message)) return fail('auth_required')
      if (/could not find the function|schema cache|does not exist|PGRST20\d/i.test(error.message)) return fail('setup')
      return fail('network')
    }
    if (data && typeof data === 'object' && 'ok' in (data as Record<string, unknown>)) return data as Result<T>
    return fail('network')
  } catch {
    return fail('network')
  }
}

export const PAGE_SIZE = 24

export const marketSearch = (query: HubQuery, after?: Cursor | null, limit = PAGE_SIZE) =>
  call<SearchPage>('worker_market_search', {
    p_query: query,
    p_limit: limit,
    p_after_at: after?.at ?? null,
    p_after_id: after?.id ?? null,
  })

export const wantedList = (slugs: string[] | null, after?: Cursor | null, limit = PAGE_SIZE, clubs?: string[] | null) =>
  call<WantedPage>('worker_wanted_list', {
    p_slugs: slugs && slugs.length ? slugs : null,
    p_clubs: clubs && clubs.length ? clubs : null,
    p_limit: limit,
    p_after_at: after?.at ?? null,
    p_after_id: after?.id ?? null,
  })

export const wantsMine = () => call<{ wants: MyWant[] }>('worker_wants_mine')

export const wantRequest = (input: WantInput) =>
  call<{ id: string; public: boolean }>('worker_want_request', {
    p_slug: input.slug,
    p_kit: null,
    p_size: input.size,
    p_mode: input.mode,
    p_max_price: input.maxPrice,
    p_currency: input.currency,
    p_delivery: input.delivery,
    p_note: input.note.trim() || null,
    p_public: input.public,
  })

export const wantPublicSet = (wantId: string, on: boolean) => call<object>('worker_want_public_set', { p_want: wantId, p_public: on })
export const wantRespond = (wantId: string, itemId: string) => call<object>('worker_want_respond', { p_want: wantId, p_item: itemId })

export const searchSave = (name: string, query: HubQuery, notify = true) =>
  call<{ id: string }>('worker_search_save', { p_name: name, p_query: query, p_notify: notify })
export const searchList = () => call<{ searches: SavedSearch[] }>('worker_search_list')
export const searchDelete = (id: string) => call<object>('worker_search_delete', { p_id: id })
export const searchNotifySet = (id: string, on: boolean) => call<object>('worker_search_notify_set', { p_id: id, p_notify: on })

export const itemDeliverySet = (itemId: string, delivery: Delivery) => call<{ delivery: Delivery }>('worker_item_delivery_set', { p_item: itemId, p_delivery: delivery })

// ------------------------------------------------------------------ wave 2 — the deal

export const dealExtras = (conn: string) => call<DealExtras>('worker_deal_extras', { p_conn: conn })
export const bundleOffer = (conn: string, amount: number, currency: string, items: string[]) =>
  call<{ offerId: string }>('worker_bundle_offer', { p_conn: conn, p_amount: amount, p_currency: currency, p_items: items })
export const handoverSet = (conn: string, method: HandoverMethod, note: string) =>
  call<{ method: string }>('worker_handover_set', { p_conn: conn, p_method: method, p_note: note.trim() || null })
export const handoverSent = (conn: string) => call<object>('worker_handover_sent', { p_conn: conn })
export const feedbackGive = (conn: string, rating: FeedbackRating, note: string) =>
  call<object>('worker_feedback_give', { p_conn: conn, p_rating: rating, p_note: note.trim() || null })

// ------------------------------------------------------------------ wave 3 — place, circles, the pipe, identification help

export const itemReachSet = (itemId: string, scope: ShipScope) => call<{ shipScope: ShipScope }>('worker_item_reach_set', { p_item: itemId, p_scope: scope })

export const placeMine = () => call<Place>('worker_place_mine')
export const placeSet = (country: string | null, city: string | null, show: boolean) =>
  call<Place>('worker_place_set', { p_country: country, p_city: city, p_show: show })

export const circlesMine = () => call<{ circles: CircleRef[] }>('worker_circles_mine')
export const circleSet = (kind: CircleKind, key: string, on: boolean) => call<{ circles: CircleRef[] }>('worker_circle_set', { p_kind: kind, p_key: key, p_on: on })
export const circleOverview = (kind: CircleKind, key: string) => call<CircleOverview>('worker_circle_overview', { p_kind: kind, p_key: key })

export const pipe = () => call<Pipe>('worker_pipe')

export const idreqList = (after?: Cursor | null, limit = 20) =>
  call<{ requests: IdRequest[]; next: Cursor | null }>('worker_idreq_list', { p_limit: limit, p_after_at: after?.at ?? null, p_after_id: after?.id ?? null })
export const idreqMine = () => call<{ requests: IdRequest[] }>('worker_idreq_mine')
export const idreqGet = (id: string) => call<{ request: IdRequest; proposals: IdProposal[] }>('worker_idreq_get', { p_id: id })
export const idreqOpen = (id: string, photos: string[], note: string, club: string | null) =>
  call<{ id: string }>('worker_idreq_open', { p_id: id, p_photos: photos, p_note: note.trim() || null, p_club: club })
export const idreqPropose = (id: string, slug: string, note: string) =>
  call<object>('worker_idreq_propose', { p_id: id, p_slug: slug, p_kit: null, p_note: note.trim() || null })
export const idreqResolve = (id: string, proposalId: string | null) => call<{ status: string; archiveSlug?: string }>('worker_idreq_resolve', { p_id: id, p_prop: proposalId })
