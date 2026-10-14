import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { photoUrl } from '@/lib/collector/api'
import { SEED_PHOTOS, seedPhotoUrl } from '@/lib/collector/seedPhotos'

const root = process.cwd()
const sql = readFileSync(join(root, 'supabase/migrations/20261014140000_worker_market_managed_photos.sql'), 'utf8')

describe('managed listings — photographs (owner, 14.10.2026)', () => {
  it('every seeded path has its file, its row, and nothing else sits in the folder', () => {
    const files = readdirSync(join(root, 'public/market/listings')).sort()
    expect(files).toEqual([...SEED_PHOTOS].map((p) => p.slice(2)).sort())
    for (const p of SEED_PHOTOS) {
      expect(p).toMatch(/^p\/[0-9a-f]{32}\.webp$/)
      expect(sql).toContain(`'${p}'`)
      expect(existsSync(join(root, 'public/market/listings', p.slice(2)))).toBe(true)
    }
  })
  it('photoUrl serves a seeded photograph from the site and every other path from storage', () => {
    const one = [...SEED_PHOTOS][0]!
    expect(photoUrl(one)).toBe(`/market/listings/${one.slice(2)}`)
    expect(seedPhotoUrl('p/00000000000000000000000000000000.webp')).toBeNull()
  })
  it('the rows attach only to listings of the managed sellers', () => {
    expect(sql).toContain('worker_market_managed')
    expect(sql).not.toMatch(/auth\./)
  })
})
