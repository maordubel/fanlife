import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { EMPTY_DRAFT, flagsFor, issues, publishPayload, statusOf, newKey, type ListingDraft } from '@/lib/fanlife/hub/listing'

const draft = (p: Partial<ListingDraft>): ListingDraft => ({ ...EMPTY_DRAFT, ...p })
const read = (f: string) => readFileSync(f, 'utf8')

describe('direct listing — the rules the form and the server share', () => {
  it('sell / swap / both are never (0,0)', () => {
    expect(flagsFor('sell')).toEqual({ forSale: true, forTrade: false })
    expect(flagsFor('swap')).toEqual({ forSale: false, forTrade: true })
    expect(flagsFor('both')).toEqual({ forSale: true, forTrade: true })
    for (const m of ['sell', 'swap', 'both'] as const) expect(Object.values(flagsFor(m)).some(Boolean)).toBe(true)
  })

  it('case A: a free-text club with a photo passes step 1 with no closet and no season', () => {
    expect(issues(draft({ clubName: 'Boca Juniors', photos: ['p/a.webp'] }), 1)).toEqual([])
  })
  it('case C/D: season, size, condition and maker are never required', () => {
    const d = draft({ clubKey: 'real-madrid', clubName: 'Real Madrid', photos: ['p/a.webp'], mode: 'swap' })
    expect(issues(d, 2)).toEqual([])
  })
  it('a photo is required; a closet copy that already has one is enough', () => {
    expect(issues(draft({ clubName: 'Boca' }), 1)).toContain('photo')
    expect(issues(draft({ itemId: 'x' }), 1, 1)).toEqual([])
  })
  it('a sale needs a price or "open to offers"; a swap needs neither', () => {
    const base = { clubName: 'Boca', photos: ['p/a.webp'] }
    expect(issues(draft({ ...base, mode: 'sell' }), 2)).toContain('price')
    expect(issues(draft({ ...base, mode: 'sell', price: '120' }), 2)).toEqual([])
    expect(issues(draft({ ...base, mode: 'both', openToOffers: true }), 2)).toEqual([])
    expect(issues(draft({ ...base, mode: 'swap' }), 2)).toEqual([])
    expect(issues(draft({ ...base }), 2)).toContain('mode')
  })
  it('a replica cannot be called original', () => {
    expect(issues(draft({ clubName: 'Boca', photos: ['p/a'], mode: 'swap', itemType: 'replica', authenticityClaim: 'original' }), 2)).toContain('replica')
  })

  it('the payload drops empty text, never sends a price for a swap, and never adds to the closet unless asked', () => {
    const p = publishPayload(draft({ clubName: ' Boca ', season: '', price: '99', mode: 'swap', photos: ['p/a.webp'], lookingFor: ' a River shirt ' }))
    expect(p).toMatchObject({ clubName: 'Boca', mode: 'swap', lookingFor: 'a River shirt', addToCloset: false, openToOffers: false })
    expect(p).not.toHaveProperty('price')
    expect(p).not.toHaveProperty('season')
  })
  it('a closet copy is published by id, with no club typed', () => {
    const p = publishPayload(draft({ itemId: 'i1', archiveSlug: 'vp-1985-away', clubName: 'Hapoel', mode: 'sell', price: '50' }))
    expect(p).toMatchObject({ itemId: 'i1', archiveSlug: 'vp-1985-away' })
  })

  it('status words: no Draft or Pending in this build, a live listing is live at once', () => {
    expect(statusOf({ state: 'held', forSale: true, forTrade: false, paused: false })).toBe('live')
    expect(statusOf({ state: 'held', forSale: false, forTrade: false, paused: true })).toBe('paused')
    expect(statusOf({ state: 'sold', forSale: false, forTrade: false, paused: false })).toBe('sold')
    expect(statusOf({ state: 'traded', forSale: false, forTrade: false, paused: false })).toBe('swapped')
  })
  it('one key per form: 32 hex characters, never repeated', () => {
    const a = newKey(), b = newKey()
    expect(a).toMatch(/^[0-9a-f]{32}$/)
    expect(a).not.toBe(b)
  })
})

describe('direct listing — wiring', () => {
  it('the market never sends a seller to the closet to list', () => {
    const hub = read('components/fanlife/market/HubScreen.tsx')
    expect(hub).not.toMatch(/href="\/closet"/)
    expect(hub).not.toMatch(/assign\('\/closet'\)/)
    expect(hub).toContain('/market/list/new')
  })
  it('the form talks to the server only through the one publish call and a per-form key', () => {
    const f = read('components/fanlife/market/ListingForm.tsx')
    expect(f).toContain('marketPublish(key.current, d)')
    expect(f).not.toMatch(/worldHave|worker_collector_have/)
  })
  it('the migration is additive and prefixed (rule 89)', () => {
    const sql = read('supabase/migrations/20261030090000_worker_market_direct_listing.sql')
    expect(sql).not.toMatch(/drop table|drop column|on auth\./i)
    for (const m of sql.matchAll(/create or replace function public\.(\w+)/g)) expect(m[1]).toMatch(/^worker_/)
  })
  it('honest copy: no payment or shipping promise, no verified claim', () => {
    const copy = JSON.parse(read('messages/en.hub.json')) as Record<string, string>
    const all = Object.entries(copy).filter(([k]) => k.startsWith('listing.') || k.startsWith('mine.')).map(([, v]) => v).join(' ')
    expect(all).toMatch(/doesn't take payment or arrange shipping/)
    expect(all).not.toMatch(/\bverified\b|\bauthenticated\b|guarantee/i)
  })
})
