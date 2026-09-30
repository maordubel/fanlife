import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { ChallengeDraft } from '@/lib/challenges/contract'
import { land, mintCode } from '@/lib/challenges/runs'
import { dealChallenge } from '@/lib/game/lineup'
import { buildRound } from '@/lib/game/memory'
import { royalRumbleRoundDrafts } from '@/lib/game/royal-rumble'
import { dealTimelineRun } from '@/lib/game/timeline'
import { challengeUrl } from '@/lib/share/copy'

/**
 * THE CHALLENGE LAYER, WIRED (ONE RED WORLD §27–§29, §44, 28.9.2026).
 *
 * `tests/challenges.test.ts` holds the layer; this file holds the GATES to it. For every gate
 * that takes a challenge: its result screen passes one to the ONE share row (rule 19) and
 * draws the comparison; the draft it hands over — built the way the gate builds it — mints a
 * link that works for a guest and names nothing the run asks for, in the code or in the gate
 * URL the landing forwards to.
 */
const NOW = Date.UTC(2026, 8, 28, 12)
const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')
const decoded = (code: string) => Buffer.from(code, 'base64url').toString('binary')

const WIRED: ReadonlyArray<{ gate: number; file: string; compare: string }> = [
  { gate: 1, file: 'app/xi/XIBuilder.tsx', compare: 'app/xi/XIBuilder.tsx' },
  { gate: 2, file: 'app/trivia/MatchReport.tsx', compare: 'app/trivia/MatchReport.tsx' },
  { gate: 3, file: 'app/lineup/LineupBoard.tsx', compare: 'app/lineup/LineupBoard.tsx' },
  { gate: 6, file: 'app/memory/MemoryBoard.tsx', compare: 'app/memory/MemoryBoard.tsx' },
  { gate: 8, file: 'app/goal/GoalRun.tsx', compare: 'app/goal/GoalRun.tsx' },
  { gate: 9, file: 'app/royal-rumble/RoyalRumbleChallenge.tsx', compare: 'app/royal-rumble/RoyalRumbleRun.tsx' },
  { gate: 10, file: 'components/blind-cow/ResultPanel.tsx', compare: 'components/blind-cow/ResultPanel.tsx' },
  { gate: 13, file: 'app/timeline/TimelineBoard.tsx', compare: 'app/timeline/TimelineBoard.tsx' },
  { gate: 13, file: 'components/archive/ThreadBoard.tsx', compare: 'components/archive/ThreadBoard.tsx' },
]

describe('every challenge gate is wired to the one share row and the comparison', () => {
  for (const row of WIRED) {
    it(`gate ${row.gate} · ${row.file}`, () => {
      const source = read(row.file)
      expect(source).toMatch(/<ShareRow/)
      expect(source).toMatch(new RegExp(`challenge=\\{\\{\\s*gate: ${row.gate}\\b|gate: ${row.gate}(,| as const)`))
      expect(read(row.compare)).toMatch(new RegExp(`<CompareCard\\s+gate=\\{${row.gate}\\}`))
      // the artefact builder, not a hand-rolled card (§28) — gate 1's team sheet IS the `xi`
      // list template (rule 19: a card whose content is a list gets its own template)
      if (row.gate === 1) expect(source).toMatch(/template: 'xi' as const/)
      else expect(source).toMatch(/from '@\/lib\/share\/artefacts'/)
    })
  }

  it('the rumble shares through ShareRow now — its own navigator.share is gone, the live H2H stays', () => {
    const banner = read('app/royal-rumble/RoyalRumbleChallenge.tsx')
    expect(banner).not.toMatch(/navigator\.(share|clipboard)/)
    expect(read('app/royal-rumble/RoyalRumbleMode.tsx')).toMatch(/<RoyalRumbleLiveRun/)
  })

  it('gate 8 reads a hashed pin (`gh`) as well as the plain one', () => {
    expect(read('app/goal/page.tsx')).toMatch(/pinnedGoal\([\s\S]*?\) \?\?\s*goalFromHash\(/)
  })

  it('the artefacts for 5, 7, 11, 12 and LIFE are the builders', () => {
    expect(read('app/kits/KitWing.tsx')).toMatch(/collectorCard\(/)
    expect(read('components/ballot/Manifesto.tsx')).toMatch(/debateCard\(/)
    expect(read('app/derby/HateWall.tsx')).toMatch(/blackCard\(/)
    expect(read('components/archive/ArchiveDrawer.tsx')).toMatch(/kind="archive"[\s\S]*clippingCard\(/)
    expect(read('components/life/StageFinale.tsx')).toMatch(/kind="life"[\s\S]*ticketCard\(/)
  })

  it('the archive and LIFE links are a story to open, never a round', () => {
    expect(challengeUrl('archive', 1, 0, '/archive?at=m_9f2c0a41b7d3')).toMatch(/\/archive\?at=m_9f2c0a41b7d3&from=share$/)
    const life = challengeUrl('life', 1, 0, '/life?ch=1986')
    expect(life).toMatch(/\/life\?ch=1986&from=share$/)
    expect(life).not.toMatch(/seed=|[?&]r=/)
    // the landing uses `ch` for the preview only — it opens where THIS device's life stands
    expect(read('app/life/page.tsx')).toMatch(/generateMetadata/)
  })
})

describe('the drafts the gates hand over — guest-playable, no spoiler (§44, §50)', () => {
  const clean = (code: string, secrets: readonly string[]) => {
    const target = land(code, NOW)!.target
    for (const text of [code, decoded(code), target, decodeURIComponent(target)]) {
      for (const secret of secrets) expect(text, secret).not.toContain(secret)
    }
    return target
  }

  it('the mint needs no account: the server step reads no user', () => {
    const actions = read('app/c/actions.ts')
    expect(actions).not.toMatch(/supabase|getUser|auth\(/i)
  })

  it('gate 3: ticks per slot, never the eleven', () => {
    for (const seed of [3, 17, 404, 9001]) {
      const dealt = dealChallenge(seed, 1)
      if (!dealt) continue
      const draft: ChallengeDraft = { gate: 3, seed, cursor: 1, result: { gate: 3, found: dealt.bank.slice(0, 11).map((_, i) => i % 2 === 0) } }
      const code = mintCode(draft, NOW)
      expect(code).toBeTruthy()
      clean(code!, dealt.bank.map((locker) => locker.nameHe).filter((name) => name.length >= 3))
    }
  })

  it('gate 6: the order travels as hashes, never the pair ids', () => {
    for (const seed of [2, 77, 5150]) {
      const round = buildRound(seed, 6, 0)
      const ids = round.pairs.map((pair) => pair.id)
      const code = mintCode({ gate: 6, seed, result: { gate: 6, moves: 14, misses: 2, order: ids, perfect: ids.slice(0, 2) } }, NOW)
      expect(code).toBeTruthy()
      clean(code!, [...ids, ...round.pairs.map((pair) => pair.a).filter((a) => a.length >= 3)])
    }
  })

  it('gate 9: the five as hashes', () => {
    for (const seed of [8, 88, 888]) {
      const { draft } = royalRumbleRoundDrafts(seed, 0)
      const five = draft.slots.map((slot) => slot.offers[0]!.player.slug)
      const code = mintCode({ gate: 9, seed, result: { gate: 9, picks: five } }, NOW)
      expect(code).toBeTruthy()
      clean(code!, [...five, ...draft.slots.map((slot) => slot.offers[0]!.player.nameHe)])
    }
  })

  it('gate 13 · order: ten ticks in dealt order, never the dates', () => {
    for (const seed of [4, 44, 444]) {
      const deal = dealTimelineRun(seed, 0)
      const code = mintCode({ gate: 13, seed, params: { variant: 'order' }, result: { gate: 13, variant: 'order', marks: Array.from({ length: 10 }, (_, i) => i % 3 !== 0) } }, NOW)
      expect(code).toBeTruthy()
      const target = clean(code!, deal.queue.map((card) => card.id))
      expect(target.startsWith('/timeline/order?')).toBe(true)
    }
  })

  it('gate 1: the prompt is the seed `/xi` reads, the eleven stay hashed', () => {
    const code = mintCode({ gate: 1, cursor: 3, params: { prompt: '8812' }, result: { gate: 1, picks: ['shaya-feigenbaum', 'p_0123456789'], captain: 'p_0123456789', twelfth: null } }, NOW)
    expect(code).toBeTruthy()
    const target = new URL(clean(code!, ['shaya-feigenbaum', 'p_0123456789']), 'https://x.test')
    expect(target.pathname).toBe('/xi')
    expect(target.searchParams.get('prompt')).toBe('8812')
    expect(target.searchParams.get('r')).toBe('3')
  })

  it('gate 8: routes are zone indices on the twenty squares (and the mouth), inside the whitelist', () => {
    const code = mintCode({ gate: 8, seed: 12, result: { gate: 8, accuracy: [40, 80, 100], routes: [[17, 12, 7, 20], [15, 20], [19, 14, 9, 4, 20]] } }, NOW)
    expect(code).toBeTruthy()
    expect(land(code!, NOW)!.challenge.result).toMatchObject({ gate: 8, routes: [[17, 12, 7, 20], [15, 20], [19, 14, 9, 4, 20]] })
  })
})
