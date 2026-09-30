import { describe, expect, it } from 'vitest'

import {
  dealRoyalRumbleDraft,
  priceForRating,
  ROYAL_RUMBLE_BALANCE_VERSION,
  ROYAL_RUMBLE_BUDGET,
  ROYAL_RUMBLE_DRAFT_SLOTS,
  ROYAL_RUMBLE_LINEUP_SIZE,
  ROYAL_RUMBLE_OFFERS_PER_SLOT,
} from '@/lib/game/royal-rumble'
import { slotLabel } from '@/lib/game/royal-rumble-public'

describe('Royal Rumble price bands', () => {
  it('keeps the suggested price of a bare rating in the five coarse bands', () => {
    expect(priceForRating(9)).toBe(1)
    expect(priceForRating(29)).toBe(1)
    expect(priceForRating(30)).toBe(2)
    expect(priceForRating(49)).toBe(2)
    expect(priceForRating(50)).toBe(3)
    expect(priceForRating(64)).toBe(3)
    expect(priceForRating(65)).toBe(4)
    expect(priceForRating(79)).toBe(4)
    expect(priceForRating(80)).toBe(5)
    expect(priceForRating(99)).toBe(5)
  })
})

describe('Royal Rumble draft contract', () => {
  it('deals five slots — GK · DF · MF · MF · FW — with three public cards each', () => {
    const draft = dealRoyalRumbleDraft(190923)
    expect(draft.budget).toBe(ROYAL_RUMBLE_BUDGET)
    expect(draft.version).toBe(ROYAL_RUMBLE_BALANCE_VERSION)
    expect(draft.slots).toHaveLength(ROYAL_RUMBLE_LINEUP_SIZE)
    expect(draft.slots.map((slot) => slotLabel(slot.rule))).toEqual(['GK', 'DF', 'MF', 'MF', 'FW'])
    expect(draft.slots.map((slot) => slot.rule)).toEqual([...ROYAL_RUMBLE_DRAFT_SLOTS])
    for (const slot of draft.slots) expect(slot.offers).toHaveLength(ROYAL_RUMBLE_OFFERS_PER_SLOT)
  })

  it('is deterministic for a named seed', () => {
    expect(dealRoyalRumbleDraft(4242)).toEqual(dealRoyalRumbleDraft(4242))
    expect(dealRoyalRumbleDraft(4242)).not.toEqual(dealRoyalRumbleDraft(4243))
  })

  it('never deals the same man twice on one board', () => {
    const draft = dealRoyalRumbleDraft(918273)
    const slugs = draft.slots.flatMap((slot) => slot.offers.map((offer) => offer.player.slug))
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('never leaks the hidden 9-99 rating into public draft cards', () => {
    const draft = dealRoyalRumbleDraft(1234)
    for (const offer of draft.slots.flatMap((slot) => slot.offers)) {
      expect(Object.prototype.hasOwnProperty.call(offer.player, 'rating')).toBe(false)
      expect(Object.keys(offer.player)).not.toContain('rating')
      expect(Object.keys(offer)).toEqual(['player', 'offeredAs'])
      expect(offer.player.price).toBeGreaterThanOrEqual(1)
      expect(offer.player.price).toBeLessThanOrEqual(5)
    }
  })
})
