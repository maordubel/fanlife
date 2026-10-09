'use client'

import { portalConfigured } from '@/lib/portal/env'
import { createClient } from '@/lib/supabase/client'
import type { CollectorError, Fail, Result } from '@/lib/collector/types'

import type {
  Cursor,
  Delivery,
  HubQuery,
  MyWant,
  SavedSearch,
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
    if (error) return fail(/permission denied/i.test(error.message) ? 'auth_required' : 'network')
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

export const wantedList = (slugs: string[] | null, after?: Cursor | null, limit = PAGE_SIZE) =>
  call<WantedPage>('worker_wanted_list', {
    p_slugs: slugs && slugs.length ? slugs : null,
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
