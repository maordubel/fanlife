import { describe, expect, it } from 'vitest'

import { allPlayers } from '@/lib/archive/player-master'
import { dealRoyalRumbleDraft, priceForPlayer, royalRumbleAuditView, royalRumblePlayerCount } from '@/lib/game/royal-rumble'
import { anomaliesOf, reportOf, type AuditPlayer } from '@/lib/game/royal-rumble-audit'
import { ROYAL_RUMBLE_BALANCE_VERSION, ROYAL_RUMBLE_CANONICAL_FIVES, ROYAL_RUMBLE_FIVE_COUNT, ROYAL_RUMBLE_PRICE_OVERRIDES } from '@/lib/game/royal-rumble-prices'

/**
 * Pricing V3 (Gate 9, 29.9.2026). The product rule is no longer a percentage: EXACTLY TEN
 * players cost €5M, a reviewed canonical list, and no automated process can mint an
 * eleventh. €4M is the large elite tier; €1–€3 carry the bargains. Price is the draft
 * economy and rating is football strength — they correlate and are never the same number.
 */
describe('priceForPlayer', () => {
  const { players } = royalRumbleAuditView()

  it('prices every man in the pool 1–5, and nobody outside it', () => {
    expect(players.length).toBe(royalRumblePlayerCount())
    for (const player of players) {
      const price = priceForPlayer(player.slug)
      expect(price).toBe(player.price)
      expect(price).toBeGreaterThanOrEqual(1)
      expect(price).toBeLessThanOrEqual(5)
    }
    expect(priceForPlayer('nobody-at-all')).toBeNull()
  })

  it('prices exactly ten players at €5M — the canonical ten, and no other', () => {
    const fives = players.filter((player) => player.price === 5)
    expect(fives).toHaveLength(10)
    expect(ROYAL_RUMBLE_FIVE_COUNT).toBe(10)
    expect(ROYAL_RUMBLE_CANONICAL_FIVES).toHaveLength(10)
  })

  it('the canonical ten are this exact set — changing it is an owner decision', () => {
    expect(new Set(players.filter((player) => player.price === 5).map((player) => player.slug))).toEqual(
      new Set(['יעקב-חודורוב', 'שלום-תקוה', 'ריפעת-טורק', 'משה-סיני', 'יוסי-אבוקסיס', 'סלים-טועמה', 'דוד-פרימו', 'שייע-פייגנבוים', 'גילי-לנדאו', 'שבתאי-לוי']),
    )
    for (const row of ROYAL_RUMBLE_CANONICAL_FIVES) expect(row.reasonHe.length, row.slug).toBeGreaterThan(5)
  })

  it('no automated stage can produce a €5 — suggested and calibrated stop at €4, and no override is a €5', () => {
    for (const player of players) {
      expect(player.suggested, player.slug).toBeLessThanOrEqual(4)
      expect(player.calibrated, player.slug).toBeLessThanOrEqual(4)
    }
    expect(Object.values(ROYAL_RUMBLE_PRICE_OVERRIDES).filter((price) => price === 5)).toEqual([])
    const fiveSlugs = new Set(ROYAL_RUMBLE_CANONICAL_FIVES.map((row) => row.slug))
    for (const player of players.filter((row) => row.price === 5)) expect(fiveSlugs.has(player.slug), player.slug).toBe(true)
  })

  it('€4 is the large elite tier and €1–€3 keep the rest of the ladder', () => {
    const share = (tier: number) => players.filter((player) => player.price === tier).length / players.length
    expect(share(4)).toBeGreaterThanOrEqual(0.2)
    expect(share(4)).toBeLessThanOrEqual(0.32)
    expect(share(1)).toBeGreaterThanOrEqual(0.11)
    expect(share(1)).toBeLessThanOrEqual(0.19)
    expect(share(2)).toBeGreaterThanOrEqual(0.2)
    expect(share(2)).toBeLessThanOrEqual(0.3)
    expect(share(3)).toBeGreaterThanOrEqual(0.27)
    expect(share(3)).toBeLessThanOrEqual(0.38)
    expect(share(5)).toBeLessThan(0.02)
  })

  it('gives every position depth at every price — no position that always costs a premium (§15)', () => {
    for (const position of ['GK', 'DF', 'MF', 'FW'] as const) {
      for (const tier of [1, 2, 3, 4]) {
        const depth = players.filter((player) => player.positions.includes(position) && player.price === tier).length
        expect(depth, `${position} at €${tier}`).toBeGreaterThanOrEqual(3)
      }
      // and the ten themselves reach every line of the five
      expect(players.filter((player) => player.position === position && player.price === 5).length, `${position} at €5`).toBeGreaterThanOrEqual(1)
    }
  })

  it('keeps price a coarse zone of the hidden rating, ordered but overlapping', () => {
    const avg = (tier: number) => {
      const rows = players.filter((player) => player.price === tier)
      return rows.reduce((sum, row) => sum + row.rating, 0) / rows.length
    }
    expect(avg(1)).toBeLessThan(avg(2))
    expect(avg(2)).toBeLessThan(avg(3))
    expect(avg(3)).toBeLessThan(avg(4))
    expect(avg(4)).toBeLessThan(avg(5))
    // the elite tier is wide (§9): €4 spans a long stretch of strength, the ten sit above it
    const fours = players.filter((player) => player.price === 4).map((player) => player.rating)
    expect(Math.max(...fours) - Math.min(...fours)).toBeGreaterThanOrEqual(30)
    // and the budget's strategies are real: five €3s stand with 5+4+3+2+1
    const flat = 5 * avg(3)
    const spread = avg(5) + avg(4) + avg(3) + avg(2) + avg(1)
    expect(Math.abs(flat - spread) / spread).toBeLessThan(0.12)
  })

  it('keeps every era priced across the ladder — the sparse decades are not all premium, the dense ones not all cheap', () => {
    const era = (from: number, to: number) => players.filter((player) => player.fromYear !== null && player.fromYear >= from && player.fromYear < to)
    const share = (rows: typeof players, tiers: number[]) => rows.filter((player) => tiers.includes(player.price)).length / Math.max(1, rows.length)
    for (const [from, to] of [
      [1927, 1980],
      [1980, 2000],
      [2000, 2030],
    ] as const) {
      const rows = era(from, to)
      expect(rows.length).toBeGreaterThan(30)
      expect(share(rows, [4, 5]), `${from}–${to} premium`).toBeLessThan(0.8)
      expect(share(rows, [4, 5]), `${from}–${to} premium`).toBeGreaterThan(0.1)
      expect(share(rows, [1, 2]), `${from}–${to} value`).toBeGreaterThan(0.05)
    }
    // V1's longevity weight put a 1960s seven-season man at the top by default; the seasons
    // term is now a quarter of the score, so a pre-1980 spell alone does not buy a €5
    const pre = era(1927, 1980)
    expect(share(pre, [5])).toBeLessThan(0.4)
  })

})

describe('value discovery (§9, §51) — bargains at €1, €2 and €3', () => {
  const { players } = royalRumbleAuditView()
  const medianRating = (tier: number) => {
    const rows = players.filter((player) => player.price === tier).map((player) => player.rating).sort((a, b) => a - b)
    return rows[Math.floor(rows.length / 2)] ?? 0
  }

  it('has strong €2 and strong €3 players — men who out-rate the middle of the tier above', () => {
    expect(players.filter((player) => player.price === 2 && player.rating >= medianRating(3)).length).toBeGreaterThanOrEqual(10)
    expect(players.filter((player) => player.price === 3 && player.rating >= medianRating(4)).length).toBeGreaterThanOrEqual(3)
  })

  it('has contextually useful €1 players — men who out-rate the middle of €2', () => {
    expect(players.filter((player) => player.price === 1 && player.rating >= medianRating(2)).length).toBeGreaterThanOrEqual(10)
  })

  it('and never nonsense: no €4 below the elite floor, no canonical five under 80, the ten out-rate every €3', () => {
    expect(players.filter((player) => player.price === 4 && !player.overridden && player.rating < 45)).toEqual([])
    const fives = players.filter((player) => player.price === 5)
    expect(Math.min(...fives.map((player) => player.rating))).toBeGreaterThanOrEqual(80)
    expect(Math.min(...fives.map((player) => player.rating))).toBeGreaterThan(medianRating(3))
  })

  it('a dealt slot holds a real bargain often enough', () => {
    // on dealt boards: a cheaper card within eight rating points of a dearer one, in a fair share of slots
    const rating = new Map(players.map((player) => [player.slug, player.rating]))
    let slots = 0
    let near = 0
    for (let seed = 0; seed < 300; seed += 1) {
      for (const slot of dealRoyalRumbleDraft(seed).slots) {
        slots += 1
        const cards = slot.offers.map((offer) => ({ price: offer.player.price, rating: rating.get(offer.player.slug) ?? 0 }))
        if (cards.some((a) => cards.some((b) => a.price < b.price && a.rating >= b.rating - 8))) near += 1
      }
    }
    expect(near / slots).toBeGreaterThan(0.12)
  })

  it('does not let the ten headline every board — a €5 card is rare on a dealt slot', () => {
    let cards = 0
    let fives = 0
    const seen = new Set<string>()
    for (let seed = 0; seed < 300; seed += 1) {
      for (const slot of dealRoyalRumbleDraft(seed).slots) {
        for (const offer of slot.offers) {
          cards += 1
          if (offer.player.price === 5) {
            fives += 1
            seen.add(offer.player.slug)
          }
        }
      }
    }
    expect(fives / cards).toBeLessThan(0.12)
    expect(seen.size).toBeGreaterThanOrEqual(6)
  })
})

describe('rating and price are separate (§8.2)', () => {
  const { players } = royalRumbleAuditView()

  it('correlate, and are not the same number', () => {
    const differing = players.filter((player) => player.rating !== player.price * 20).length
    expect(differing / players.length).toBeGreaterThan(0.5)
    // ordered on average, yet a cheaper player out-rates a dearer one somewhere
    const rating = (slug: string) => players.find((player) => player.slug === slug)!.rating
    const cheaperBeatsDearer = players.some((a) => players.some((b) => a.price < b.price && a.rating > b.rating + 10))
    expect(cheaperBeatsDearer).toBe(true)
    expect(rating('משה-סיני')).toBeGreaterThan(80)
  })

  it('gives every man a hidden rating in 9–99 and an evidence confidence', () => {
    for (const player of players) {
      expect(player.rating, player.slug).toBeGreaterThanOrEqual(9)
      expect(player.rating, player.slug).toBeLessThanOrEqual(99)
      expect(['high', 'medium', 'low']).toContain(player.confidence)
    }
  })

  it('is deterministic — the same pool twice is the same ratings', () => {
    const again = royalRumbleAuditView().players
    expect(again.map((player) => [player.slug, player.rating, player.price])).toEqual(players.map((player) => [player.slug, player.rating, player.price]))
  })

  it('rates a keeper on his own terms — the best keepers are as strong as the best forwards', () => {
    const top = (position: string) => Math.max(...players.filter((player) => player.position === position).map((player) => player.rating))
    expect(top('GK')).toBeGreaterThanOrEqual(top('FW') - 10)
    const mean = (position: string) => {
      const rows = players.filter((player) => player.position === position)
      return rows.reduce((sum, player) => sum + player.rating, 0) / rows.length
    }
    for (const position of ['GK', 'DF', 'MF', 'FW']) expect(Math.abs(mean(position) - mean('FW')), position).toBeLessThan(6)
  })

  it('handles sparse evidence explicitly — low-confidence men exist, are flagged, and the ten are never among them', () => {
    expect(players.filter((player) => player.confidence === 'low').length).toBeGreaterThan(0)
    expect(players.filter((player) => player.price === 5 && player.confidence === 'low')).toEqual([])
  })
})

describe('the audit report (§8.8) — anomalies are surfaced, not hidden', () => {
  const view = royalRumbleAuditView().players as unknown as AuditPlayer[]

  it('reports the ten, the top 30 and per-position and per-era distributions', () => {
    const report = reportOf(view)
    expect(report.fives).toHaveLength(10)
    expect(report.top30).toHaveLength(30)
    expect(Object.keys(report.positions).sort()).toEqual(['DF', 'FW', 'GK', 'MF'])
    expect(Object.keys(report.eras)).toHaveLength(3)
    expect(report.highestByTier[2].length).toBeGreaterThan(0)
  })

  it('flags a planted mispricing and a thin-evidence premium', () => {
    const base = view.find((player) => player.price === 3)!
    const planted: AuditPlayer[] = [
      { ...base, slug: 'planted-four', price: 4, overridden: false, rating: 30 },
      { ...base, slug: 'planted-five', price: 5, rating: 60 },
      { ...base, slug: 'planted-thin', price: 4, rating: 80, confidence: 'low' },
    ]
    const kinds = anomaliesOf(planted).map((row) => `${row.slug}:${row.kind}`)
    expect(kinds).toContain('planted-four:elite-weak')
    expect(kinds).toContain('planted-five:five-weak')
    expect(kinds).toContain('planted-thin:low-confidence-premium')
  })

  it('finds no canonical five under 80 in the real pool', () => {
    expect(anomaliesOf(view).filter((row) => row.kind === 'five-weak')).toEqual([])
  })

  it('shows no era as automatically premium by longevity — the middle of the ladder is populated in every era', () => {
    const report = reportOf(view)
    for (const [era, row] of Object.entries(report.eras)) {
      expect(row.premiumShare, era).toBeLessThan(0.6)
      expect(row.tiers[2]! + row.tiers[1]!, `${era} middle`).toBeGreaterThan(row.count * 0.25)
    }
  })
})

describe('canonical overrides', () => {
  it('name real Player Master men only, at most sixty of them, none a €5, and every override took', () => {
    const known = new Set(allPlayers().map((player) => player.slug))
    const entries = Object.entries(ROYAL_RUMBLE_PRICE_OVERRIDES)
    expect(entries.length).toBeGreaterThanOrEqual(20)
    expect(entries.length).toBeLessThanOrEqual(60)
    for (const [slug, price] of entries) {
      expect(known.has(slug), slug).toBe(true)
      expect(price, slug).toBeLessThanOrEqual(4)
      expect(priceForPlayer(slug)).toBe(price)
    }
    expect(ROYAL_RUMBLE_BALANCE_VERSION).toBe(3)
  })

  it('every canonical five is a real man in the pool', () => {
    const known = new Set(allPlayers().map((player) => player.slug))
    for (const row of ROYAL_RUMBLE_CANONICAL_FIVES) {
      expect(known.has(row.slug), row.slug).toBe(true)
      expect(priceForPlayer(row.slug), row.slug).toBe(5)
    }
  })
})
