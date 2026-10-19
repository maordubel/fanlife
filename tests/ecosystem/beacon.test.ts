import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (p: string) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8')

describe('ecosystem beacon', () => {
  const beacon = read('components/ecosystem/EcosystemBeacon.tsx')
  it('is mounted once in the root layout', () => {
    expect(read('app/layout.tsx').match(/<EcosystemBeacon \/>/g)?.length).toBe(1)
  })
  it('uses only the shared SDK, and arrives as this app for real sessions only', () => {
    expect(beacon).toContain("from '@/ecosystem/sdk'")
    expect(beacon).toContain("arrived(client, 'fanlife')")
    expect(beacon).toContain('is_anonymous')
    expect(beacon).not.toMatch(/schema\(['"]shared['"]\)/)
  })
  it('is a no-op without Supabase', () => {
    expect(beacon).toMatch(/if \((evaluationMode\(\) \|\| )?!portalConfigured\(\)\) return/)
  })
})
