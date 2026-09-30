import { describe, expect, it } from 'vitest'

import { POSITION_WEIGHTS, confidenceOf, eraOf, rateAll, type RatingEvidence } from '@/lib/game/royal-rumble-rating'
import type { Position } from '@/lib/game/royal-rumble-public'

/** Gate 9 V3 — the rating engine on synthetic evidence, so each rule stands on its own. */

function man(slug: string, position: Position, over: Partial<RatingEvidence> = {}): RatingEvidence {
  return { slug, position, fromYear: 2005, seasons: 6, titles: 2, goals: 10, lineups: 1, shirtSeasons: 1, songs: 0, moments: 2, captain: false, numberHolding: false, ...over }
}

/** a small population per position so percentiles have something to rank against */
function crowd(position: Position, n = 12): RatingEvidence[] {
  return Array.from({ length: n }, (_, i) => man(`${position}-${i}`, position, { seasons: 2 + i, titles: i % 4, goals: position === 'GK' ? 0 : i * 4, moments: i % 3, lineups: i % 2 }))
}

describe('position-normalized rating', () => {
  it('weights sum to one at every position, and a keeper has no output weight', () => {
    for (const weights of Object.values(POSITION_WEIGHTS)) expect(Object.values(weights).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10)
    expect(POSITION_WEIGHTS.GK.output).toBe(0)
  })

  it('a keeper is never marked down for having no goals', () => {
    const pool = [...crowd('GK'), ...crowd('FW'), man('gk-star', 'GK', { seasons: 15, titles: 6, goals: 0, lineups: 3, moments: 3 }), man('fw-star', 'FW', { seasons: 15, titles: 6, goals: 90, lineups: 3, moments: 3 })]
    const rated = rateAll(pool)
    const gk = rated.get('gk-star')!
    const fw = rated.get('fw-star')!
    expect(Math.abs(gk.rating - fw.rating)).toBeLessThanOrEqual(8)
    expect(gk.factors.output).toBeGreaterThanOrEqual(0)
  })

  it('a defender is ranked on the defender scale, not against strikers', () => {
    // 20 goals tops a back line whose best has 12; strikers around him score 40+
    const defenders = Array.from({ length: 10 }, (_, i) => man(`d-${i}`, 'DF', { goals: i + 1, seasons: 8, titles: 2 }))
    const forwards = Array.from({ length: 10 }, (_, i) => man(`f-${i}`, 'FW', { goals: 40 + i * 5, seasons: 8, titles: 2 }))
    const rated = rateAll([...defenders, ...forwards, man('d-top', 'DF', { goals: 20, seasons: 8, titles: 2 })])
    expect(rated.get('d-top')!.factors.output).toBeGreaterThan(0.9)
    expect(rated.get('d-top')!.rating).toBeGreaterThan(rated.get('f-0')!.rating)
  })

  it('is deterministic and independent of input order', () => {
    const pool = [...crowd('MF'), ...crowd('DF'), ...crowd('GK'), ...crowd('FW')]
    const a = rateAll(pool)
    const b = rateAll([...pool].reverse())
    for (const row of pool) expect(a.get(row.slug)!.rating).toBe(b.get(row.slug)!.rating)
  })
})

describe('evidence confidence and sparse data', () => {
  it('grades confidence by how many kinds of evidence a man has', () => {
    expect(confidenceOf(man('rich', 'FW', { songs: 1 }))).toBe('high')
    expect(confidenceOf(man('thin', 'FW', { seasons: 1, titles: 0, goals: 0, lineups: 0, moments: 0, shirtSeasons: 0 }))).toBe('low')
    expect(confidenceOf(man('gk-thin', 'GK', { seasons: 4, titles: 1, goals: 0, lineups: 0, moments: 0, shirtSeasons: 0 }))).toBe('medium')
  })

  it('a man from a thinly documented era is not marked down for what the archive never logged', () => {
    const early = (slug: string, over: Partial<RatingEvidence>) => man(slug, 'FW', { fromYear: 1955, lineups: 0, moments: 0, shirtSeasons: 0, songs: 0, ...over })
    const pool = [...crowd('FW'), early('old-star', { seasons: 13, titles: 3, goals: 85 }), early('old-quiet', { seasons: 13, titles: 3, goals: 85, fromYear: 1955 })]
    const rated = rateAll(pool)
    // no big-game row is the neutral value, not zero
    expect(rated.get('old-star')!.factors.bigGames).toBeCloseTo(0.4, 5)
    expect(rated.get('old-star')!.rating).toBeGreaterThan(rated.get('FW-3')!.rating)
  })

  it('a modern man with a richer record does not out-rate an equal old man merely for the density of his decade', () => {
    const base = { seasons: 10, titles: 3, goals: 60 }
    const pool = [
      ...crowd('FW'),
      man('modern', 'FW', { ...base, fromYear: 2008, moments: 6, lineups: 2 }),
      man('old', 'FW', { ...base, fromYear: 1960, moments: 0, lineups: 0, shirtSeasons: 0 }),
    ]
    const rated = rateAll(pool)
    // the most documentation can buy is bounded by the two density weights: (1 − neutral) of them, on a 90-point scale
    const w = POSITION_WEIGHTS.FW
    const ceiling = 90 * (w.bigGames + w.legacy) * (1 - 0.4)
    expect(Math.abs(rated.get('modern')!.rating - rated.get('old')!.rating)).toBeLessThanOrEqual(Math.ceil(ceiling))
  })

  it('places a year into an era', () => {
    expect([eraOf(1955), eraOf(1985), eraOf(2010), eraOf(null)]).toEqual(['early', 'middle', 'late', 'middle'])
  })
})
