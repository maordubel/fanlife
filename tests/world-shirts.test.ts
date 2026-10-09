import { describe, expect, it } from 'vitest'

import { EMPTY_FILTERS, filtersFromSearch, filtersToSearch, toQuery } from '@/lib/fanlife/hub/query'
import { WORLD_PREFIX, adoptShirts, isWorldSlug, normaliseWorld, worldClubs } from '@/lib/fanlife/world'

const item = (id: string) => ({ id, archiveSlug: null, world: { clubKey: 'boca', club: 'Boca Juniors', country: 'AR', season: null, variant: 'home', maker: null, checked: true } })

describe('rest of the world', () => {
  it('gives a world copy a view key and a shirt, never a fake archive slug', () => {
    const catalogue: Record<string, unknown> = {}
    adoptShirts(catalogue)
    const out = normaliseWorld({ ok: true, items: [item('i1'), { id: 'i2', archiveSlug: 'real-slug', world: null }] })
    expect(out.items[0]!.archiveSlug).toBe(`${WORLD_PREFIX}i1`)
    expect(out.items[1]!.archiveSlug).toBe('real-slug')
    const shirt = catalogue[`${WORLD_PREFIX}i1`] as { seasonLabel: string; clubName: string }
    expect(shirt.clubName).toBe('Boca Juniors')
    expect(shirt.seasonLabel).toBe('Season unknown')
    expect(isWorldSlug('real-slug')).toBe(false)
    expect(worldClubs().get('boca')).toBe('Boca Juniors')
  })

  it('scope travels in the address and in the query, and world clubs are keys not slugs', () => {
    const f = filtersFromSearch('?scope=world&club=boca', {})
    expect(f.scope).toBe('world')
    expect(toQuery(f, {})).toEqual({ scope: 'world', clubs: ['boca'] })
    expect(filtersToSearch(f, 'market')).toContain('scope=world')
    expect(filtersFromSearch('?scope=nonsense', {}).scope).toBe('all')
    expect(toQuery(EMPTY_FILTERS, {}).scope).toBeUndefined()
  })
})
