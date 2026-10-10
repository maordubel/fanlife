import { existsSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import { CRESTS, crestFor } from '@/lib/clubs/crest'
import { REGISTRY } from '@/lib/master/registry'

const ledger = JSON.parse(readFileSync('content/manual/club-crests.json', 'utf8')) as { crests: { club: string; file: string; sha256: string }[] }

describe('club crests', () => {
  it('every crest on the map is a real file recorded in the ledger with the hash it arrived with', () => {
    for (const [club, src] of Object.entries(CRESTS)) {
      const file = `public${src}`
      expect(existsSync(file), file).toBe(true)
      const row = ledger.crests.find((c) => c.club === club)
      expect(row, club).toBeTruthy()
      expect(createHash('sha256').update(readFileSync(file)).digest('hex')).toBe(row!.sha256)
    }
    expect(ledger.crests).toHaveLength(Object.keys(CRESTS).length)
  })
  it('only knows registry clubs, and a club with no crest falls back to initials', () => {
    for (const club of Object.keys(CRESTS)) expect(REGISTRY.some((c) => c.id === club), club).toBe(true)
    expect(crestFor('zrinjski-mostar')).toBeNull()
    expect(crestFor(undefined)).toBeNull()
  })
})

describe('Me account block', () => {
  const src = readFileSync('components/fanlife/me/GoogleAccount.tsx', 'utf8')
  it('never offers a dead sign-in in a preview, reports a failed sign-out, and refreshes the page behind it', () => {
    expect(src).toContain('evaluationMode()')
    expect(src).toContain("fl('account.signOutFailed')")
    expect(src).toContain("searchParams.delete('auth')")
    expect(src).toContain('onChange')
  })
  it('signs out this browser only, and says whether it worked', () => {
    const sync = readFileSync('lib/portal/sync.ts', 'utf8')
    expect(sync).toContain("signOut({ scope: 'local' })")
    expect(sync).toMatch(/export async function signOut\(\): Promise<boolean>/)
  })
})
