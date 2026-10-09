import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  EMPTY_FILTERS, MAX_SLUGS, NO_SHIRT, activeCount, autoName, filtersFromQuery, filtersFromSearch, filtersToSearch, slugsFor, toQuery, viewFromSearch,
  type HubShirt,
} from '@/lib/fanlife/hub/query'
import { reasonsFor } from '@/lib/fanlife/hub/reasons'
import type { HubItem, MyWant } from '@/lib/fanlife/hub/types'
import hub from '@/messages/en.hub.json'

const ROOT = join(__dirname, '..')
const shirts: Record<string, HubShirt> = {
  'olym-1998-away': { slug: 'olym-1998-away', decade: 1990, variant: 'away', club: 'olympiacos', clubName: 'Olympiacos' },
  'olym-1999-home': { slug: 'olym-1999-home', decade: 1990, variant: 'home', club: 'olympiacos', clubName: 'Olympiacos' },
  'hapoel-2011-home': { slug: 'hapoel-2011-home', decade: 2010, variant: 'home', club: 'hapoel-tel-aviv', clubName: 'Hapoel Tel Aviv' },
}

describe('hub filters ⇄ address bar', () => {
  it('round-trips every filter', () => {
    const f = { ...EMPTY_FILTERS, club: 'olympiacos', decade: 1990, variant: 'away', kind: 'sale' as const, sizes: ['l' as const, 'xl' as const], conditions: ['good' as const], types: ['original_period' as const], delivery: 'ship' as const, maxPrice: 80, currency: 'EUR' as const }
    const search = filtersToSearch(f, 'market')
    expect(filtersFromSearch(search, shirts)).toEqual(f)
  })
  it('an empty state is an empty address', () => expect(filtersToSearch(EMPTY_FILTERS, 'market')).toBe(''))
  it('keeps the tab in the address, and ignores a made-up one', () => {
    expect(viewFromSearch(filtersToSearch(EMPTY_FILTERS, 'wanted'))).toBe('wanted')
    expect(viewFromSearch('?view=nonsense')).toBe('market')
  })
  it('ignores anything it does not know — a hand-edited link never breaks the page', () => {
    const f = filtersFromSearch('?size=l,zz,xl&cond=broken&type=replica,x&kind=free&delivery=teleport&max=-4&decade=abc&slug=nope&cur=XXX', shirts)
    expect(f.sizes).toEqual(['l', 'xl'])
    expect(f.conditions).toEqual([])
    expect(f.types).toEqual(['replica'])
    expect(f.kind).toBeNull()
    expect(f.delivery).toBeNull()
    expect(f.maxPrice).toBeNull()
    expect(f.decade).toBeNull()
    expect(f.slug).toBeNull()
    expect(f.currency).toBe('EUR')
  })
  it('the old ?slug= link still lands on that shirt', () => {
    expect(filtersFromSearch('?slug=olym-1998-away', shirts).slug).toBe('olym-1998-away')
  })
})

describe('hub query', () => {
  it('club + decade + kit become the slugs the database filters on', () => {
    expect(slugsFor({ ...EMPTY_FILTERS, club: 'olympiacos', decade: 1990, variant: 'away' }, shirts)).toEqual(['olym-1998-away'])
    expect(slugsFor({ ...EMPTY_FILTERS, club: 'olympiacos' }, shirts)).toEqual(['olym-1998-away', 'olym-1999-home'])
  })
  it('a combination no shirt satisfies searches to nothing, not to everything', () => {
    expect(slugsFor({ ...EMPTY_FILTERS, club: 'olympiacos', decade: 2010 }, shirts)).toEqual([NO_SHIRT])
  })
  it('no club/decade/kit means no slug filter at all', () => expect(toQuery(EMPTY_FILTERS, shirts)).toEqual({}))
  it('never sends more slugs than the database accepts', () => {
    const big: Record<string, HubShirt> = Object.fromEntries(Array.from({ length: MAX_SLUGS + 50 }, (_, i) => [`s-${i}-aaa`, { slug: `s-${i}-aaa`, decade: 1990, variant: 'home', club: 'x', clubName: 'X' }]))
    expect(slugsFor({ ...EMPTY_FILTERS, club: 'x' }, big)?.length).toBe(MAX_SLUGS)
  })
  it('a price carries its currency, and nothing else is sent unset', () => {
    expect(toQuery({ ...EMPTY_FILTERS, maxPrice: 50, currency: 'ILS' }, shirts)).toEqual({ maxPrice: 50, currency: 'ILS' })
  })
  it('counts narrowings and names an unnamed search from what is set', () => {
    const f = { ...EMPTY_FILTERS, club: 'olympiacos', decade: 1990, sizes: ['l' as const], kind: 'trade' as const }
    expect(activeCount(f)).toBe(4)
    expect(autoName(f, shirts)).toBe('Olympiacos · 1990s · L · Swap')
    expect(autoName(EMPTY_FILTERS, shirts)).toBe('My search')
    expect(autoName({ ...EMPTY_FILTERS, club: 'olympiacos', decade: 1990, variant: 'away', sizes: ['kids', 'xxl', 'xl', 's'], types: ['official_reissue', 'fan_reproduction'] }, shirts).length).toBeLessThanOrEqual(40)
  })
  it('a saved search runs back into filters', () => {
    expect(filtersFromQuery({ slugs: ['olym-1998-away'], sizes: ['l'], maxPrice: 70, currency: 'EUR' })).toMatchObject({ slug: 'olym-1998-away', sizes: ['l'], maxPrice: 70 })
  })
})

describe('match reasons — words, never a score', () => {
  const now = Date.parse('2026-10-09T12:00:00Z')
  const item = (over: Partial<HubItem> = {}): HubItem => ({
    id: 'i', archiveSlug: 'olym-1998-away', kitId: null, size: 'l', condition: 'good', itemType: 'original_period', authenticityClaim: 'original',
    playerName: null, playerNumber: null, personalization: null, description: null, forTrade: true, forSale: true, askingPrice: 60, currency: 'EUR',
    openToOffers: true, state: 'held', photos: [], openedAt: '2026-10-01T00:00:00Z', ...over,
  })
  const want = (over: Partial<MyWant> = {}): MyWant => ({
    id: 'w', archiveSlug: 'olym-1998-away', kitId: null, size: 'l', mode: 'any', delivery: 'both', note: null, public: false, maxPrice: 80, currency: 'EUR', createdAt: '2026-09-01T00:00:00Z', available: 1, ...over,
  })
  it('names why a copy is here', () => {
    expect(reasonsFor(item(), [want()], now)).toEqual(['wishlist', 'yourSize', 'budget'])
  })
  it('stays silent when nothing explains the copy', () => expect(reasonsFor(item(), [], now)).toEqual([]))
  it('compares a budget only inside its own currency', () => {
    expect(reasonsFor(item({ currency: 'ILS', askingPrice: 10 }), [want({ size: null, mode: 'buy' })], now)).toEqual(['wishlist'])
  })
  it('says "just listed" for a fresh copy and never for a future timestamp', () => {
    expect(reasonsFor(item({ openedAt: '2026-10-08T12:00:00Z' }), [], now)).toEqual(['justListed'])
    expect(reasonsFor(item({ openedAt: '2026-10-10T12:00:00Z' }), [], now)).toEqual([])
  })
  it('never explains your own copy by your own wishlist', () => expect(reasonsFor(item({ mine: true }), [want()], now)).not.toContain('wishlist'))
  it('prints no percentage anywhere in the hub copy', () => {
    expect(Object.values(hub).filter((v) => /%|percent|match score/i.test(v))).toEqual([])
  })
})

describe('hub copy and database', () => {
  it('has English only, with no empty message', () => {
    expect(Object.entries(hub).filter(([, v]) => /[֐-׿]/.test(v) || !v.trim())).toEqual([])
  })
  it('every hub key the components ask for exists', () => {
    const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : []))
    const missing: string[] = []
    for (const f of [...walk(join(ROOT, 'components/fanlife')), ...walk(join(ROOT, 'lib/fanlife'))]) {
      for (const m of readFileSync(f, 'utf8').matchAll(/['"](hub\.[a-zA-Z0-9_.]+)['"]/g)) if (!(m[1]! in hub)) missing.push(`${f.slice(ROOT.length + 1)}: ${m[1]}`)
    }
    expect(missing).toEqual([])
  })
  it('the search migration touches only worker_ objects, nothing on auth, and never returns the budget', () => {
    const sql = readFileSync(join(ROOT, 'supabase/migrations/20261009090000_worker_market_search.sql'), 'utf8')
    expect(sql).not.toMatch(/\bon\s+auth\.|from\s+auth\.users|alter\s+table\s+auth\./i)
    for (const m of sql.matchAll(/create\s+(?:or\s+replace\s+)?(?:function|table(?:\s+if\s+not\s+exists)?|trigger)\s+(?:public\.)?([a-z_0-9]+)/gi)) expect(m[1]).toMatch(/^worker_/)
    // the public board builder never selects max_price
    const board = sql.slice(sql.indexOf('function public.worker_wanted_list'), sql.indexOf('function public.worker_want_respond'))
    expect(board).not.toMatch(/max_price/)
  })
})
