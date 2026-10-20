import { describe, expect, it } from 'vitest'

import { SITE_URL } from '@/lib/brand'
import { clubCanonical, clubMetadata, indexableStatus } from '@/lib/seo/club'

describe('club SEO (ADR-U03)', () => {
  it('names the main address as canonical, never a sub-domain', () => {
    expect(clubCanonical('aek-athens')).toBe(`${SITE_URL}/clubs/aek-athens`)
    const m = clubMetadata({ id: 'aek-athens', name: 'AEK Athens', city: 'Athens', status: 'live' })
    expect(m.alternates?.canonical).toBe(`${SITE_URL}/clubs/aek-athens`)
    expect(JSON.stringify(m)).not.toContain('.fanlife.')
  })
  it('indexes only a published club', () => {
    for (const s of ['research', 'review', 'paused', undefined]) expect(indexableStatus(s)).toBe(false)
    expect(indexableStatus('live')).toBe(true)
    expect(clubMetadata({ id: 'x', name: 'X', city: 'Y', status: 'research' }).robots).toMatchObject({ index: false })
  })
})
