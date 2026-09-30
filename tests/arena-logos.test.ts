import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (p: string) => readFileSync(p, 'utf8')

describe('arena logos + entrance (29.9.2026)', () => {
  it('ships both logos as WebP and records their provenance', () => {
    for (const n of ['blind-cow', 'royal-rumble']) expect(existsSync(`public/brand/gates/${n}.webp`)).toBe(true)
    expect(read('content/manual/asset-provenance.json')).toContain('public/brand/gates')
  })
  it('places the logos in the lobbies and the entrances', () => {
    expect(read('components/blind-cow/BlindCowGame.tsx')).toContain('<GateLogo logo="blind-cow"')
    expect(read('app/royal-rumble/RoyalRumbleMode.tsx')).toContain('<GateLogo logo="royal-rumble"')
    expect(read('app/blind-cow/page.tsx')).toContain('<ArenaEntrance logo="blind-cow"')
    expect(read('app/royal-rumble/page.tsx')).toContain('<ArenaEntrance logo="royal-rumble"')
  })
  it('the logo is an <img> with alt through t(), never the optimizer', () => {
    const s = read('components/gates/GateLogo.tsx')
    expect(s).not.toContain('next/image')
    expect(s).toContain('t(s.alt)')
  })
  it('the entrance follows rule 30: session-once, reduced motion, Escape, seen-flag on end', () => {
    const s = read('components/gates/ArenaEntrance.tsx')
    expect(s).toContain('prefers-reduced-motion')
    expect(s).toContain('sessionStorage')
    expect(s).toContain("'Escape'")
    expect(s).toContain('z-[60]')
    expect(s).not.toMatch(/rounded-/)
    expect(s.indexOf('setItem')).toBeGreaterThan(s.indexOf('const end'))
  })
})
