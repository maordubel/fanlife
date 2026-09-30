import { describe, expect, it } from 'vitest'

import {
  dealRoyalRumbleDraft,
  pairedRoyalRumbleDrafts,
  playRoyalRumble,
  royalRumbleRoundDrafts,
  type RoyalRumbleDraft,
} from '@/lib/game/royal-rumble'
import { royalRumbleMatchSeed, royalRumbleRoundSeed, royalRumbleShareHref } from '@/lib/game/royal-rumble-seeds'
import { roundFrom } from '@/lib/rotation/round'

/**
 * ONE RED WORLD §18 / P0.1 — the cursor is part of the round.
 *
 * Before this, `/royal-rumble?seed=X&r=0` and `?seed=X&r=1` dealt the identical board, so
 * every "again" off the wall was the same Rumble. The engine is pure in ONE number (the
 * offer seed), so the fold happens once and every consumer — draft, shuffle, opponent,
 * match, validation, share — follows it.
 */

const SEED = 4_217_733

function signature(draft: RoyalRumbleDraft): string {
  return draft.slots.map((slot) => slot.offers.map((offer) => `${offer.player.slug}:${offer.offeredAs}`).join(',')).join('|')
}

/** the cheapest card in every slot — a legal five on any board the composer accepts */
function cheapestFive(draft: RoyalRumbleDraft) {
  return draft.slots.map((slot) => {
    const offer = [...slot.offers].sort((a, b) => a.player.price - b.player.price)[0]!
    return { slug: offer.player.slug, offeredAs: offer.offeredAs }
  })
}

describe('royalRumbleRoundSeed', () => {
  it('is the seed itself at cursor 0, so every link shared before the fix still deals its board', () => {
    expect(royalRumbleRoundSeed(SEED, 0)).toBe(SEED)
    expect(royalRumbleRoundSeed(SEED, -3)).toBe(SEED)
    expect(royalRumbleRoundSeed(SEED, Number.NaN)).toBe(SEED)
  })

  it('is deterministic and never 0', () => {
    for (let cursor = 0; cursor < 200; cursor += 1) {
      const a = royalRumbleRoundSeed(SEED, cursor)
      expect(a).toBe(royalRumbleRoundSeed(SEED, cursor))
      expect(a).toBeGreaterThan(0)
    }
  })

  it('hashes neighbouring cursors apart — no linear walk into the next cursor’s search', () => {
    const seeds = Array.from({ length: 500 }, (_, cursor) => royalRumbleRoundSeed(SEED, cursor))
    expect(new Set(seeds).size).toBe(500)
    // pairedRoyalRumbleDrafts walks seed + k·7919; a round seed must not sit on that lattice
    for (let i = 1; i < seeds.length; i += 1) expect(Math.abs(seeds[i]! - seeds[i - 1]!) % 7919).not.toBe(0)
  })
})

describe('Royal Rumble round cursor', () => {
  it('seed=X&r=0 and seed=X&r=1 deal different drafts', () => {
    const r0 = royalRumbleRoundDrafts(SEED, 0)
    const r1 = royalRumbleRoundDrafts(SEED, 1)
    expect(r0.draft.seed).not.toBe(r1.draft.seed)
    expect(signature(r0.draft)).not.toBe(signature(r1.draft))
    expect(signature(r0.shuffleDraft)).not.toBe(signature(r1.shuffleDraft))
  })

  it('cursor 0 is the pre-fix board, byte for byte', () => {
    expect(royalRumbleRoundDrafts(SEED, 0)).toEqual(pairedRoyalRumbleDrafts(SEED))
  })

  it('sweeps 500 cursors with no repeated board (no deck to exhaust: every cursor is a new board)', () => {
    const offerSeeds = new Set<number>()
    const boards = new Set<string>()
    for (let cursor = 0; cursor < 500; cursor += 1) {
      // the draft alone is what the cursor has to move; the paired search is the route's
      const draft = dealRoyalRumbleDraft(royalRumbleRoundSeed(SEED, cursor))
      offerSeeds.add(draft.seed)
      boards.add(signature(draft))
    }
    expect(offerSeeds.size).toBe(500)
    expect(boards.size).toBe(500)
  }, 120_000)

  it('the same seed and cursor reproduce the same run: draft, shuffle, opponent, match', () => {
    for (const cursor of [0, 1, 7, 42]) {
      const a = royalRumbleRoundDrafts(SEED, cursor)
      const b = royalRumbleRoundDrafts(SEED, cursor)
      expect(a).toEqual(b)
      const five = cheapestFive(a.draft)
      const first = playRoyalRumble(a.draft.seed, five)
      expect(first).not.toBeNull()
      expect(playRoyalRumble(b.draft.seed, five)).toEqual(first)
      expect(royalRumbleMatchSeed(a.draft.seed)).toBe(royalRumbleMatchSeed(a.shuffleDraft.seed))
    }
  })

  it('validation follows the cursor: a five from r=0 is not a five on r=1', () => {
    const r0 = royalRumbleRoundDrafts(SEED, 0)
    const r1 = royalRumbleRoundDrafts(SEED, 1)
    const five = cheapestFive(r0.draft)
    expect(playRoyalRumble(r0.draft.seed, five)).not.toBeNull()
    expect(playRoyalRumble(r1.draft.seed, five)).toBeNull()
  })

  it('the share link carries seed + r and reproduces the run on arrival', () => {
    for (const cursor of [0, 3, 250]) {
      const played = royalRumbleRoundDrafts(SEED, cursor)
      const href = royalRumbleShareHref(SEED, cursor)
      expect(href.includes('&r=')).toBe(cursor > 0)
      const query = Object.fromEntries(new URL(href, 'https://theworker.dubelteam.com').searchParams)
      const round = roundFrom(query)
      expect(round.pinned).toBe(true)
      expect(royalRumbleRoundDrafts(round.seed, round.cursor)).toEqual(played)
    }
  })
})
