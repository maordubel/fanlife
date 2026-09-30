import { describe, expect, it } from 'vitest'

import {
  canDealRoyalRumble,
  composeRoyalRumbleBoard,
  dealRoyalRumbleDraft,
  draftDistance,
  evaluateRoyalRumbleBoard,
  pairedRoyalRumbleDrafts,
  playRoyalRumble,
  playRoyalRumbleHeadToHead,
  resolveFormation,
  royalRumbleAuditView,
  rumbleDepth,
  ROYAL_RUMBLE_BUDGET,
  type RoyalRumbleDraft,
  type RoyalRumbleSelection,
} from '@/lib/game/royal-rumble'
import { alternateRoyalRumbleOfferSeed } from '@/lib/game/royal-rumble-seeds'
import {
  canPickRoyalRumbleOffer,
  countPicked,
  formationOf,
  minimumCompletionCost,
  parseLivePicks,
  parseSelection,
  resolvePublicFormation,
  ROYAL_RUMBLE_DRAFT_VERSION,
  toLivePicks,
  toSelection,
  type RoyalRumblePick,
} from '@/lib/game/royal-rumble-public'

/**
 * Royal Rumble V2 (25.9.2026, spec §78–§79): the board composer, FLEX, validation, the
 * shuffle's distance, the opponent's independence, determinism, the Live version, and a
 * property sweep over the seed space.
 *
 * The full sweep is 0..9999; that is ~20s of composing, so the default run samples every
 * seventh seed and `RUMBLE_FULL_SWEEP=1` walks them all (the audit script walks them too).
 */

type Lineup = { selection: RoyalRumbleSelection[]; cost: number }

function lineups(draft: RoyalRumbleDraft): Lineup[] {
  const out: Lineup[] = []
  const walk = (index: number, selection: RoyalRumbleSelection[], cost: number) => {
    if (index === draft.slots.length) {
      out.push({ selection, cost })
      return
    }
    for (const offer of draft.slots[index]!.offers) {
      walk(index + 1, [...selection, { slug: offer.player.slug, offeredAs: offer.offeredAs }], cost + offer.player.price)
    }
  }
  walk(0, [], 0)
  return out
}

function legalLineups(draft: RoyalRumbleDraft): Lineup[] {
  return lineups(draft).filter((lineup) => lineup.cost <= draft.budget)
}

function cheapestLineup(draft: RoyalRumbleDraft): Lineup {
  return [...lineups(draft)].sort((a, b) => a.cost - b.cost)[0]!
}

const SWEEP_STEP = process.env.RUMBLE_FULL_SWEEP ? 1 : 7

describe('slot composition', () => {
  it('deals every slot as its own fixed position — GK · DF · MF · MF · FW — never a flat FLEX pool', () => {
    for (let seed = 0; seed < 60; seed += 1) {
      const draft = dealRoyalRumbleDraft(seed)
      draft.slots.forEach((slot, index) => {
        const want = (['GK', 'DF', 'MF', 'MF', 'FW'] as const)[index]!
        expect(slot.rule).toEqual({ kind: 'fixed', position: want })
        for (const offer of slot.offers) expect(offer.offeredAs).toBe(want)
      })
    }
  })

  it('composes boards that meet the hard rules of §23 and land inside the legal-ratio band', () => {
    let inBand = 0
    const seeds = 200
    for (let seed = 0; seed < seeds; seed += 1) {
      const { slots, quality, attempt } = composeRoyalRumbleBoard(seed)
      expect(attempt).toBeGreaterThanOrEqual(0)
      expect(slots).toHaveLength(5)
      expect(quality.cheapest).toBeLessThanOrEqual(ROYAL_RUMBLE_BUDGET)
      expect(quality.deadPrefixes).toBe(0)
      expect(quality.legalLineups).toBeGreaterThan(0)
      if (quality.legalRatio >= 0.3 && quality.legalRatio <= 0.65) inBand += 1
    }
    expect(inBand / seeds).toBeGreaterThan(0.95)
  })

  it('evaluates the 243 lineups the way the sweep counts them', () => {
    const draft = dealRoyalRumbleDraft(77)
    const quality = evaluateRoyalRumbleBoard(draft.slots)
    const all = lineups(draft)
    expect(all).toHaveLength(243)
    expect(quality.legalLineups).toBe(legalLineups(draft).length)
    expect(quality.cheapest).toBe(cheapestLineup(draft).cost)
  })
})

describe('multi-position men', () => {
  it('lets a two-way man be offered as either of his positions, and only once per board', () => {
    const { players } = royalRumbleAuditView()
    const twoWay = new Set(players.filter((player) => player.positions.length > 1).map((player) => player.slug))
    const seenAs = new Map<string, Set<string>>()
    for (let seed = 0; seed < 400; seed += 1) {
      const slugs: string[] = []
      for (const slot of dealRoyalRumbleDraft(seed).slots) {
        for (const offer of slot.offers) {
          slugs.push(offer.player.slug)
          if (twoWay.has(offer.player.slug)) {
            const set = seenAs.get(offer.player.slug) ?? new Set<string>()
            set.add(offer.offeredAs)
            seenAs.set(offer.player.slug, set)
          }
        }
      }
      expect(new Set(slugs).size).toBe(slugs.length)
    }
    expect([...seenAs.values()].some((set) => set.size > 1)).toBe(true)
  })

  it('validates a two-way man only as the position he was offered in that slot', () => {
    for (let seed = 0; seed < 400; seed += 1) {
      const draft = dealRoyalRumbleDraft(seed)
      const slot = draft.slots[2]!
      const card = slot.offers.find((offer) => offer.player.positions.length > 1 && offer.player.positions.includes('DF'))
      if (!card) continue
      const legal = legalLineups(draft).find((lineup) => lineup.selection[2]!.slug === card.player.slug)
      if (!legal) continue
      expect(playRoyalRumble(seed, legal.selection)).not.toBeNull()
      const swapped: RoyalRumbleSelection[] = legal.selection.map((pick, index) => (index === 2 ? { ...pick, offeredAs: 'DF' as const } : pick))
      expect(playRoyalRumble(seed, swapped)).toBeNull()
      return
    }
  })
})

describe('formation validity', () => {
  it('resolves exactly one shape from the five — 1-1-2-1 — and nothing else', () => {
    expect(formationOf(['GK', 'DF', 'MF', 'MF', 'FW'])).toBe('creative')
    expect(formationOf(['GK', 'DF', 'MF', 'DF', 'FW'])).toBeNull()
    expect(formationOf(['GK', 'DF', 'DF', 'DF', 'FW'])).toBeNull()
    expect(formationOf(['GK', 'MF', 'MF', 'MF', 'FW'])).toBeNull()
    expect(formationOf(['GK', 'GK', 'MF', 'DF', 'FW'])).toBeNull()
    expect(formationOf(['GK', 'DF', 'MF', 'FW', 'FW'])).toBeNull()
    expect(resolveFormation([{ offeredAs: 'GK' }, { offeredAs: 'DF' }, { offeredAs: 'MF' }, { offeredAs: 'MF' }, { offeredAs: 'FW' }])).toBe('creative')
  })

  it('knows the shape from the first pick — there is no decision left in it', () => {
    const picks: RoyalRumblePick[] = [null, null, null, null, null]
    expect(resolvePublicFormation(picks)).toBe('creative')
  })

  it('plays 1-1-2-1 into the result and onto the pitch, for both sides', () => {
    const draft = dealRoyalRumbleDraft(31)
    const lineup = legalLineups(draft)[0]!
    const a = playRoyalRumble(31, lineup.selection)!
    expect(a.formation).toBe('creative')
    expect(a.opponentFormation).toBe('creative')
    expect(a.frames[0]!.us.map((player) => player.position).sort()).toEqual(['DF', 'FW', 'GK', 'MF', 'MF'])
    expect(formationOf(a.opponent.map((offer) => offer.offeredAs))).toBe('creative')
  })
})

describe('budget validity and the eight rules of §6', () => {
  const seed = 2024
  const draft = dealRoyalRumbleDraft(seed)
  const legal = legalLineups(draft)[0]!

  it('accepts a legal five and refuses one over the budget', () => {
    expect(playRoyalRumble(seed, legal.selection)).not.toBeNull()
    const dearest = [...lineups(draft)].sort((a, b) => b.cost - a.cost)[0]!
    expect(dearest.cost).toBeGreaterThan(ROYAL_RUMBLE_BUDGET)
    expect(playRoyalRumble(seed, dearest.selection)).toBeNull()
  })

  it('refuses a slug that was not on the slot, a wrong offeredAs, a duplicate, and a short list', () => {
    const notDealt = { ...legal.selection[4]!, slug: legal.selection[0]!.slug }
    expect(playRoyalRumble(seed, [...legal.selection.slice(0, 4), notDealt])).toBeNull()
    const wrongAs: RoyalRumbleSelection[] = legal.selection.map((pick, index) => (index === 0 ? { ...pick, offeredAs: 'DF' } : pick))
    expect(playRoyalRumble(seed, wrongAs)).toBeNull()
    const duplicate: RoyalRumbleSelection[] = legal.selection.map((pick, index) => (index === 1 ? { ...legal.selection[2]!, offeredAs: pick.offeredAs } : pick))
    expect(playRoyalRumble(seed, duplicate)).toBeNull()
    expect(playRoyalRumble(seed, legal.selection.slice(0, 4))).toBeNull()
    expect(playRoyalRumble(seed + 1, legal.selection)).toBeNull()
  })

  it('never lets the client pick a card that cannot be completed, and never blocks one that can', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const draft = dealRoyalRumbleDraft(seed)
      const picks: RoyalRumblePick[] = [null, null, null, null, null]
      for (let index = 0; index < draft.slots.length; index += 1) {
        for (const offer of draft.slots[index]!.offers) {
          const allowed = canPickRoyalRumbleOffer(draft, picks, index, offer)
          const prefix = picks.slice(0, index).map((pick) => pick!.player.slug)
          const completable = legalLineups(draft).some(
            (lineup) => lineup.selection[index]!.slug === offer.player.slug && prefix.every((slug, at) => lineup.selection[at]!.slug === slug),
          )
          expect(allowed).toBe(completable)
        }
        picks[index] = draft.slots[index]!.offers.find((offer) => canPickRoyalRumbleOffer(draft, picks, index, offer)) ?? null
        expect(picks[index]).not.toBeNull()
      }
      expect(countPicked(picks)).toBe(5)
      expect(minimumCompletionCost(draft, picks)).toBeLessThanOrEqual(ROYAL_RUMBLE_BUDGET)
      expect(playRoyalRumble(seed, toSelection(picks)!)).not.toBeNull()
    }
  })
})

describe('the shuffle', () => {
  it('is a rigid pair — the shuffle board is the seed under the mask, so a Live room can hold it', () => {
    const { draft, shuffleDraft } = pairedRoyalRumbleDrafts(9001)
    expect(shuffleDraft.seed).toBe(alternateRoyalRumbleOfferSeed(draft.seed))
    expect(dealRoyalRumbleDraft(shuffleDraft.seed)).toEqual(shuffleDraft)
  })

  it('is meaningfully different: ten new cards of fifteen at least, twelve nearly always, two per slot', () => {
    let preferred = 0
    const seeds = 120
    for (let seed = 0; seed < seeds; seed += 1) {
      const { draft, shuffleDraft } = pairedRoyalRumbleDrafts(seed * 13)
      const distance = draftDistance(draft, shuffleDraft)
      expect(distance.cards).toBeGreaterThanOrEqual(10)
      expect(distance.perSlot).toBeGreaterThanOrEqual(2)
      if (distance.cards >= 12) preferred += 1
      expect(evaluateRoyalRumbleBoard(shuffleDraft.slots).cheapest).toBeLessThanOrEqual(ROYAL_RUMBLE_BUDGET)
    }
    expect(preferred / seeds).toBeGreaterThan(0.9)
  })
})

describe('the historical window', () => {
  it('deals only men who had played before the year, on both boards, and says when it cannot', () => {
    const { players } = royalRumbleAuditView()
    const from = new Map(players.map((player) => [player.slug, player.fromYear]))
    for (const before of [1960, 1986, 1993, 2000]) {
      expect(canDealRoyalRumble({ before })).toBe(true)
      expect(rumbleDepth({ before })).toBeGreaterThanOrEqual(3)
      const { draft, shuffleDraft } = pairedRoyalRumbleDrafts(1986, { before })
      for (const slot of [...draft.slots, ...shuffleDraft.slots]) {
        expect(slot.offers).toHaveLength(3)
        for (const offer of slot.offers) expect(from.get(offer.player.slug)!).toBeLessThan(before)
      }
      const legal = legalLineups(draft)[0]!
      const result = playRoyalRumble(draft.seed, legal.selection, { before })
      expect(result).not.toBeNull()
      for (const offer of result!.opponent) expect(from.get(offer.player.slug)!).toBeLessThan(before)
      // the same selection against the wrong window is another board, and is refused
      expect(playRoyalRumble(draft.seed, legal.selection)).toBeNull()
    }
    expect(canDealRoyalRumble({ before: 1950 })).toBe(false)
    expect(rumbleDepth({ before: 1950 })).toBeLessThan(3)
  })

  it('falls back to simpler profiles rather than guessing past a thin pool', () => {
    // 1960 is the thinnest window that can be dealt at all — four goalkeepers
    expect(canDealRoyalRumble({ before: 1960 })).toBe(true)
    for (let seed = 0; seed < 30; seed += 1) {
      const { slots, quality } = composeRoyalRumbleBoard(seed, { before: 1960 })
      expect(slots).toHaveLength(5)
      expect(slots.every((slot) => slot.offers.length === 3)).toBe(true)
      expect(quality.cheapest).toBeLessThanOrEqual(ROYAL_RUMBLE_BUDGET)
      expect(quality.legalLineups).toBeGreaterThan(0)
    }
    // and a window nobody can be dealt over composes nothing — never a guess past the cutoff
    expect(composeRoyalRumbleBoard(3, { before: 1935 }).slots).toHaveLength(0)
  })
})

describe('the opponent', () => {
  it('depends on the seed alone — never on what the supporter picked', () => {
    const seed = 4711
    const draft = dealRoyalRumbleDraft(seed)
    const legal = legalLineups(draft)
    const results = legal.slice(0, 6).map((lineup) => playRoyalRumble(seed, lineup.selection)!)
    for (const result of results) {
      expect(result.opponent.map((offer) => offer.player.slug)).toEqual(results[0]!.opponent.map((offer) => offer.player.slug))
      expect(result.opponentFormation).toBe(results[0]!.opponentFormation)
      expect(result.opponent.reduce((sum, offer) => sum + offer.player.price, 0)).toBeLessThanOrEqual(ROYAL_RUMBLE_BUDGET)
      expect(new Set(result.opponent.map((offer) => offer.player.slug)).size).toBe(5)
    }
    // and the shuffle board meets the same opponent (one match seed for the pair)
    const shuffled = dealRoyalRumbleDraft(alternateRoyalRumbleOfferSeed(seed))
    const other = playRoyalRumble(shuffled.seed, legalLineups(shuffled)[0]!.selection)!
    expect(other.opponent.map((offer) => offer.player.slug)).toEqual(results[0]!.opponent.map((offer) => offer.player.slug))
  })

  it('carries a public-safe highlight and no rating anywhere in the result', () => {
    const draft = dealRoyalRumbleDraft(12)
    const result = playRoyalRumble(12, legalLineups(draft)[0]!.selection)!
    const text = JSON.stringify(result)
    expect(text).not.toContain('rating')
    expect(text).not.toContain('power')
    if (result.highlight) {
      expect(['value', 'star', 'matchHero']).toContain(result.highlight.kind)
      expect(result.highlight.textHe.length).toBeGreaterThan(0)
      expect(draft.slots.some((slot) => slot.offers.some((offer) => offer.player.slug === result.highlight!.slug))).toBe(true)
    }
  })
})

describe('determinism', () => {
  it('returns the same draft, shuffle and match for the same seed, version and window', () => {
    expect(pairedRoyalRumbleDrafts(777)).toEqual(pairedRoyalRumbleDrafts(777))
    expect(pairedRoyalRumbleDrafts(777, { before: 1993 })).toEqual(pairedRoyalRumbleDrafts(777, { before: 1993 }))
    const selection = legalLineups(dealRoyalRumbleDraft(777))[0]!.selection
    expect(playRoyalRumble(777, selection)).toEqual(playRoyalRumble(777, selection))
  })
})

describe('Live', () => {
  it('stamps every persisted pick with draft version 2 and never reads a V1 room as V2', () => {
    const draft = dealRoyalRumbleDraft(99)
    const selection = legalLineups(draft)[0]!.selection
    const persisted = toLivePicks(selection)
    expect(persisted.every((pick) => pick.v === ROYAL_RUMBLE_DRAFT_VERSION)).toBe(true)
    expect(parseLivePicks(persisted)).toEqual(selection)
    // V1 stored five bare slugs
    expect(parseLivePicks(selection.map((pick) => pick.slug))).toBeNull()
    expect(parseLivePicks(selection)).toBeNull()
    expect(parseLivePicks(persisted.slice(0, 4))).toBeNull()
    expect(parseSelection(selection)).toEqual(selection)
    expect(parseSelection([...selection.slice(0, 4), { slug: 'x', offeredAs: 'XX' }])).toBeNull()
  })

  it('plays head to head with both boards validated and both sides mirrored', () => {
    const matchSeed = 5150
    const home = dealRoyalRumbleDraft(matchSeed)
    const guest = dealRoyalRumbleDraft(alternateRoyalRumbleOfferSeed(matchSeed))
    const both = playRoyalRumbleHeadToHead(matchSeed, home.seed, legalLineups(home)[0]!.selection, guest.seed, legalLineups(guest)[0]!.selection)!
    expect(both.home.scoreFor).toBe(both.away.scoreAgainst)
    expect(both.home.formation).toBe(both.away.opponentFormation)
    expect(both.home.winner === 'draw' ? 'draw' : both.home.winner === 'us' ? 'them' : 'us').toBe(both.away.winner)
    expect(playRoyalRumbleHeadToHead(matchSeed, home.seed, legalLineups(home)[0]!.selection, guest.seed, legalLineups(guest)[0]!.selection.map((pick) => ({ ...pick, offeredAs: 'GK' as const })))).toBeNull()
  })
})

describe('property sweep (§79)', () => {
  it('holds every board invariant across the seed space', () => {
    for (let seed = 0; seed < 10_000; seed += SWEEP_STEP) {
      const draft = dealRoyalRumbleDraft(seed)
      expect(draft.slots).toHaveLength(5)
      const slugs: string[] = []
      for (const slot of draft.slots) {
        expect(slot.offers).toHaveLength(3)
        for (const offer of slot.offers) {
          slugs.push(offer.player.slug)
          expect(offer.player.price).toBeGreaterThanOrEqual(1)
          expect(offer.player.price).toBeLessThanOrEqual(5)
          expect(offer.offeredAs).toBe(slot.rule.position)
        }
      }
      expect(new Set(slugs).size).toBe(15)
      const quality = evaluateRoyalRumbleBoard(draft.slots)
      expect(quality.legalLineups).toBeGreaterThan(0)
      expect(quality.deadPrefixes).toBe(0)
      expect(quality.cheapest).toBeLessThanOrEqual(ROYAL_RUMBLE_BUDGET)
    }
  })

  it('keeps the shuffle valid and the opponent legal on sampled seeds', () => {
    for (let seed = 0; seed < 10_000; seed += SWEEP_STEP * 8) {
      const { draft, shuffleDraft } = pairedRoyalRumbleDrafts(seed)
      expect(draftDistance(draft, shuffleDraft).cards).toBeGreaterThanOrEqual(10)
      const result = playRoyalRumble(draft.seed, cheapestLineup(draft).selection)!
      expect(result).not.toBeNull()
      expect(result.opponent).toHaveLength(5)
      expect(result.opponent.reduce((sum, offer) => sum + offer.player.price, 0)).toBeLessThanOrEqual(ROYAL_RUMBLE_BUDGET)
      expect(formationOf(result.opponent.map((offer) => offer.offeredAs))).toBe(result.opponentFormation)
    }
  })
})
