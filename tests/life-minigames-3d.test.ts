import { describe, expect, it } from 'vitest'

import { DIALOGUE } from '@/lib/life/content/dialogue'
import { GIGS, gigChapters, gigConversations, gigId, gigPay } from '@/lib/life/gigs'
import { HOOPS_WHY_HE, PENALTY_WHY_HE } from '@/lib/life/toto'
import { SCENE } from '@/lib/life/world/scenes'

/**
 * שני הקרבות בתלת מימד — פנדלים במגרש, חיובים בחצר (Maor, 6.9.2026).
 *
 * These two ride the exact rails the coin and the Toto slip already proved: a Gig that
 * `opens` a card instead of the chore scene, priced off the same wage table as every
 * other job. This file checks the rails carry them correctly rather than trusting that
 * "it looks right in the browser" — the same discipline the coin/Toto tests already use.
 */

describe('פנדלים — חמש בעיטות במגרש השכונתי', () => {
  const gig = GIGS.find((row) => row.id === 'penalty-contest')

  it('exists, is offered on the pitch, and opens the 3D card', () => {
    expect(gig).toBeDefined()
    expect(gig?.where).toBe('pitch')
    expect(gig?.opens).toBe('penalty')
  })

  it('has its own hotspot on the pitch, distinct from the football ball', () => {
    const pitch = SCENE.pitch
    const spots = pitch.hotspots.filter((spot) => spot.act.includes('penalty-contest'))
    expect(spots.length).toBeGreaterThan(0)
    expect(pitch.hotspots.some((spot) => spot.act === 'pitch-ball')).toBe(true)
  })

  /**
   * לא משלמים על פנדלים — Maor, 6.9.2026: *"זריקה לסל ובעיטת פנדלים לא צריכים להיות רווח
   * כספי, זה להנאה בלבד."* The contest used to pay a shekel a goal, which quietly turned
   * the pitch into a wage and every kick into arithmetic. This test is the opposite of the
   * one it replaces, and it exists so nobody re-attaches money to a childhood.
   */
  it('pays nothing at all — five kicks, for the name and not for the money', () => {
    expect(gig!.paid, 'the penalty contest is not work').toBe(false)
    expect(gigPay(gig!, '1991'), 'a contest that pays is a job').toBe(0)
    for (const chapter of gigChapters(gig!)) {
      const conversation = gigConversations().find((row) => row.id === gigId(gig!, chapter))
      const json = JSON.stringify(conversation)
      expect(json, chapter).toContain('"e":"penalty"')
      expect(json, chapter).toContain('"attempts":5')
      expect(json, chapter).toContain('"perGoal":0')
      expect(json, chapter).not.toContain('work:paid')
    }
  })

  it('is registered and reachable like every other gig', () => {
    for (const chapter of gigChapters(gig!)) {
      expect(DIALOGUE[gigId(gig!, chapter)]).toBeTruthy()
    }
  })
})

describe('תחרות חיובים — חמש זריקות בחצר בית הספר', () => {
  const gig = GIGS.find((row) => row.id === 'hoops-contest')

  it('exists, is offered in the schoolyard, and opens the 3D card', () => {
    expect(gig).toBeDefined()
    expect(gig?.where).toBe('schoolyard')
    expect(gig?.opens).toBe('hoops')
  })

  it('has its own hotspot in the yard, distinct from the one-on-one hoop', () => {
    const yard = SCENE.schoolyard
    const spots = yard.hotspots.filter((spot) => spot.act.includes('hoops-contest'))
    expect(spots.length).toBeGreaterThan(0)
    expect(yard.hotspots.some((spot) => spot.act === 'yard-ball')).toBe(true)
  })

  it('exists only in 1991, the one chapter the schoolyard itself exists in', () => {
    expect(gigChapters(gig!)).toEqual(['1991'])
  })

  it('pays nothing at all — five throws, for the break and not for the money', () => {
    expect(gig!.paid, 'the free-throw contest is not work').toBe(false)
    expect(gigPay(gig!, '1991'), 'a contest that pays is a job').toBe(0)
    for (const chapter of gigChapters(gig!)) {
      const conversation = gigConversations().find((row) => row.id === gigId(gig!, chapter))
      const json = JSON.stringify(conversation)
      expect(json, chapter).toContain('"e":"hoops"')
      expect(json, chapter).toContain('"attempts":5')
      expect(json, chapter).toContain('"perBasket":0')
      expect(json, chapter).not.toContain('work:paid')
    }
  })

  it('is registered and reachable like every other gig', () => {
    for (const chapter of gigChapters(gig!)) {
      expect(DIALOGUE[gigId(gig!, chapter)]).toBeTruthy()
    }
  })
})

describe('הלוח משלם על שני הקרבות — the ledger has a name for both', () => {
  it('has a Hebrew line for each, and they are not the same line', () => {
    expect(PENALTY_WHY_HE).toBeTruthy()
    expect(HOOPS_WHY_HE).toBeTruthy()
    expect(PENALTY_WHY_HE).not.toBe(HOOPS_WHY_HE)
  })
})
