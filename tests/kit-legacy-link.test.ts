import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { dealKitRound, gradeKitPuzzle } from '@/lib/game/kitBuild'
import { KIT_ROUND } from '@/lib/game/kit-build-run'
import { challengeUrl } from '@/lib/share/copy'

/**
 * שער 4 — the old shared link (28.9.2026).
 *
 * Before the cursor counted SHIRTS, a round was `?seed=S&r=k&from=share` with no `n`, and `r`
 * named ROUND k: one shuffle per cycle of rounds, the k-th slice of five, the options drawn on
 * the same stream. `tests/fixtures/kit-legacy-rounds.json` is that deal, produced by the
 * pre-change `lib/game/kitBuild.ts` (commit c5c61d8^) over today's Kit Master — shirt, season and
 * every option id, in order. A legacy link must deal it back exactly.
 */
const FIXTURE = JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/kit-legacy-rounds.json'), 'utf8')) as Record<string, string[][]>

const flat = (seed: number, cursor: number, legacy: boolean) =>
  dealKitRound(seed, cursor, undefined, legacy).map((p) => [p.id, `${p.seasonLabel}|${p.variant}`, ...p.steps.flatMap((s) => s.options.map((o) => o.id))])

describe('שער 4 — a link shared before the cursor counted shirts', () => {
  it('reproduces the old round exactly: the shirts, their order and every option', () => {
    const keys = Object.keys(FIXTURE)
    expect(keys.length).toBeGreaterThanOrEqual(30)
    for (const key of keys) {
      const [seed, k] = key.split('|').map(Number) as [number, number]
      expect(flat(seed, k, true), key).toEqual(FIXTURE[key])
    }
  })

  it('is a different deal from the shirt-counting cursor — which is why the link needed this', () => {
    const differs = Object.keys(FIXTURE).filter((key) => {
      const [seed, k] = key.split('|').map(Number) as [number, number]
      return JSON.stringify(flat(seed, k, false)) !== JSON.stringify(FIXTURE[key])
    })
    expect(differs.length).toBeGreaterThan(0)
  })

  it('grades against the round it dealt: the legacy truth, not the new one', () => {
    const [p] = dealKitRound(42, 2, undefined, true)
    expect(p).toBeTruthy()
    const placed = Object.fromEntries(p!.steps.map((s) => [s.step, s.options[0]!.id]))
    const legacy = gradeKitPuzzle(42, 0, placed, 2, [], 0, undefined, true)
    expect(legacy?.puzzleId).toBe(p!.id)
  })

  it('the page reads a SHARED link with no `n` as legacy — and only a shared one', () => {
    const page = readFileSync(join(process.cwd(), 'app/kits/build/page.tsx'), 'utf8')
    expect(page).toMatch(/round\.pinned && searchParams\.n === undefined && searchParams\.from === 'share'/)
    expect(page).toMatch(/legacy \? 'full'/)
    expect(page).toMatch(/dealKitRound\(round\.seed, round\.cursor, undefined, legacy\)/)
  })

  it('links minted now carry `n`; a legacy round re-shares in its own form', () => {
    const run = readFileSync(join(process.cwd(), 'app/kits/build/KitGameRun.tsx'), 'utf8')
    expect(run).toMatch(/route=\{legacy \? '\/kits\/build' : `\/kits\/build\?n=\$\{size\}`\}/)
    expect(challengeUrl('kit', 42, 3, '/kits/build?n=5')).toMatch(/\/kits\/build\?n=5&seed=42&r=3&from=share$/)
    expect(challengeUrl('kit', 42, 3, '/kits/build')).toMatch(/\/kits\/build\?seed=42&r=3&from=share$/)
    expect(KIT_ROUND).toBe(5)
  })
})
