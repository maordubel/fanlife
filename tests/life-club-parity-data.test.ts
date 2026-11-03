/**
 * LIFE — every core club is handed the same newest life. The club-side files that make a life personal (cast names, the
 * supporter's birth year) exist for every club that has the data to need them, name their own club, and wait for the
 * owner's approval where they are proposals. The full composition is `npm run life:parity`.
 */
import {describe, expect, it} from 'vitest'
import {CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {LIFE_CAST, LIFE_TIMELINE} from '@/lib/clubs/life/packs'

describe('club parity: the data every life reads', () => {
  it('every core club has a cast of its own, fictional, with the five named roles', () => {
    for (const id of CORE_CLUB_IDS) {
      const c = (LIFE_CAST as Record<string, {clubId: string; status: string; names: Record<string, string>}>)[id]
      expect(c, `${id} has no cast.json`).toBeTruthy()
      expect(c!.clubId).toBe(id)
      for (const role of ['dad', 'mum', 'friend', 'kiosk', 'elder']) expect(c!.names[role]?.trim(), `${id} ${role}`).toBeTruthy()
      expect(c!.names.kiosk!.length).toBeLessThanOrEqual(16)
    }
  })
  it('a timeline names its own club, a plausible birth year, and an honest status', () => {
    for (const [id, t] of Object.entries(LIFE_TIMELINE as Record<string, {clubId: string; birthYear: number; status: string}>)) {
      expect(t.clubId).toBe(id)
      expect(t.birthYear).toBeGreaterThanOrEqual(1940)
      expect(t.birthYear).toBeLessThanOrEqual(2008)
      expect(['approved', 'review', 'proposed']).toContain(t.status)
    }
  })
})
