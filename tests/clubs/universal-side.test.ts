/**
 * LIFE, universal — the side of a day: jobs, rests, the hatch. Optional, bounded, and never in the story's way.
 */
import {describe, expect, it} from 'vitest'
import {screenplayChapters} from '@/lib/life/universal/screenplay'
import {sideLife, SIDE_ECONOMY} from '@/lib/life/universal/content/side'
import {afterPlay, eventsOf, playAmount} from '@/lib/life/universal/engine'
import type {Effect} from '@/lib/life/universal/types'

describe('side life economy', () => {
  it('every job costs 15–25 energy and pays at most 9 coins', () => {
    for (const j of SIDE_ECONOMY.jobs) { expect(j.cost).toBeGreaterThanOrEqual(15); expect(j.cost).toBeLessThanOrEqual(25); for (const p of j.pay) expect(p).toBeLessThanOrEqual(9) }
  })
  it('a play carries good and slip, and a slip never pays more than a good go', () => {
    const chapters = screenplayChapters('en').map(sideLife)
    let plays = 0
    for (const c of chapters) for (const t of c.talks) for (const b of t.branches) for (const ch of b.choices ?? []) for (const fx of ch.then ?? []) {
      if (fx.e !== 'play' || !c.spots.some(s => s.talk === t.id && s.id.startsWith('job-'))) continue
      plays++
      const d = eventsOf([fx], {} as never).directives[0] as Extract<ReturnType<typeof eventsOf>['directives'][number], {d: 'play'}>
      const coins = (l: Effect[]) => l.reduce((n, e) => n + (e.e === 'coins' ? e.by : 0), 0)
      expect(coins(afterPlay(d, 'slip'))).toBeLessThanOrEqual(coins(afterPlay(d, 'good')))
      expect(coins(afterPlay(d, 'ok'))).toBe(coins(afterPlay(d, 'good')))
      expect(afterPlay(d, 'slip').some(e => e.e === 'energy' && e.by < 0)).toBe(true)
      expect(playAmount(d)).toBeGreaterThanOrEqual(0)
    }
    expect(plays).toBeGreaterThan(5)
  })
})
