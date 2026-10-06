import { describe, expect, it } from 'vitest'

import { dealRoyalRumbleDraft, playRoyalRumble, type RoyalRumbleDraft, type RoyalRumbleOffer } from '@/lib/game/royal-rumble'
import { buildRumbleScript } from '@/lib/game/royal-rumble-presentation'

function five(draft: RoyalRumbleDraft) {
  const offers = draft.slots.map((slot) => [...slot.offers].sort((a, b) => a.player.price - b.player.price)[0]!)
  return { offers: offers as RoyalRumbleOffer[], selection: offers.map((o) => ({ slug: o.player.slug, offeredAs: o.offeredAs })) }
}

const SEEDS = Array.from({ length: 40 }, (_, i) => 1000 + i * 7919)

function run(seed: number) {
  const draft = dealRoyalRumbleDraft(seed)
  const mine = five(draft)
  const result = playRoyalRumble(draft.seed, mine.selection)
  if (!result) return null
  return { result, mine, script: buildRumbleScript({ result, ours: mine.offers, seed: draft.seed }) }
}

describe('royal rumble presentation', () => {
  const runs = SEEDS.map(run).filter((r) => r !== null)

  it('actually produced matches', () => expect(runs.length).toBeGreaterThan(20))

  it('is deterministic', () => {
    for (const r of runs.slice(0, 8)) {
      expect(buildRumbleScript({ result: r.result, ours: r.mine.offers, seed: 5 })).toEqual(buildRumbleScript({ result: r.result, ours: r.mine.offers, seed: 5 }))
    }
  })

  it('goal events equal the server score, on the right sides', () => {
    for (const { result, script } of runs) {
      const goals = script.events.filter((e) => e.type === 'goal')
      expect(goals.filter((e) => e.side === 'us')).toHaveLength(result.scoreFor)
      expect(goals.filter((e) => e.side === 'them')).toHaveLength(result.scoreAgainst)
      expect(script.final).toEqual({ us: result.scoreFor, them: result.scoreAgainst, winner: result.winner })
      const last = script.events[script.events.length - 1]!
      expect(last.scoreAfter).toEqual({ us: result.scoreFor, them: result.scoreAgainst })
    }
  })

  it('every goal has an outfield scorer of the scoring side; minutes are sorted, 5–9 moments', () => {
    for (const { script } of runs) {
      const find = (side: 'us' | 'them', slug: string) => (side === 'us' ? script.us : script.them).find((p) => p.slug === slug)!
      expect(script.events.length).toBeGreaterThanOrEqual(5)
      expect(script.events.length).toBeLessThanOrEqual(9)
      for (let i = 1; i < script.events.length; i += 1) expect(script.events[i]!.minute).toBeGreaterThan(script.events[i - 1]!.minute)
      for (const e of script.events.filter((x) => x.type === 'goal')) {
        const p = find(e.side, e.playerSlug)
        expect(p).toBeTruthy()
        expect(p.position).not.toBe('GK')
        expect(e.textHe.length).toBeGreaterThan(0)
        expect(e.textHe).not.toMatch(/בישול:\s*$/)
        if (e.assistPlayerId) expect(find(e.side, e.assistPlayerId)).toBeTruthy()
      }
      expect(script.durationMs).toBeGreaterThanOrEqual(16000)
      expect(script.durationMs).toBeLessThanOrEqual(50000)
    }
  })

  it('never carries a hidden rating', () => {
    for (const { script } of runs) expect(JSON.stringify(script)).not.toMatch(/"rating"/)
  })

  it('MoM is one of the ten, the summary is not empty, fives are GK/DF/MF/MF/FW', () => {
    for (const { script } of runs) {
      const slugs = [...script.us, ...script.them].map((p) => p.slug)
      expect(slugs).toContain(script.manOfTheMatch.slug)
      expect(script.summaryHe.length).toBeGreaterThan(10)
      for (const team of [script.us, script.them]) expect(team.map((p) => p.position)).toEqual(['GK', 'DF', 'MF', 'MF', 'FW'])
    }
  })

  it('skipping cannot change the result — the final is read from the script, not replayed', () => {
    const r = runs[0]!
    expect(r.script.final.us).toBe(r.result.scoreFor)
    expect(r.script.final.them).toBe(r.result.scoreAgainst)
  })
})
