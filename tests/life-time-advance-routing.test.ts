import '@/lib/life/content/chapters'

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { freeTimePlan, preflight } from '@/lib/life/world/timeAdvance'
import { legMinutes, placesFrom, travelPlan } from '@/lib/life/world/travel'
import { at, engineAt, eraWith, waitBeat } from './fixtures/freeTimeEra'

/**
 * הדרך — one walk-length in the game (SMART FREE TIME §15). The map lists and charges what
 * `travel.ts` says; free time plans with the same function; QA reads it here.
 */
describe('travel.ts is the city, not the door count', () => {
  it('a doorway in the flat, the stairs, the neighbourhood, town', () => {
    expect(legMinutes('bedroom', 'home')).toBe(1)
    expect(legMinutes('home', 'street')).toBe(2)
    expect(legMinutes('street', 'kiosk')).toBe(3)
    expect(legMinutes('street', 'allenby')).toBeGreaterThanOrEqual(10)
    expect(legMinutes('allenby', 'ussishkin-outside')).toBe(legMinutes('ussishkin-outside', 'allenby'))
  })

  it('the walk is the sum of its legs, and the plan names the first door', () => {
    const engine = engineAt('kiosk', at(17), ['life:knows:hall'])
    const plan = travelPlan(engine.state, '1991', 'kiosk', 'ussishkin-outside')
    expect(plan.reachable).toBe(true)
    expect(plan.minutes).toBe(plan.legs.reduce((sum, leg) => sum + leg.minutes, 0))
    expect(plan.legs.at(-1)?.to).toBe('ussishkin-outside')
    expect(plan.firstStepHe).toBeTruthy()
  })

  it('a way he does not know is not a walk (the area is knowledge, not geography)', () => {
    const engine = engineAt('kiosk', at(17))
    const plan = travelPlan(engine.state, '1991', 'kiosk', 'ussishkin-outside')
    expect(plan.reachable).toBe(false)
    expect(plan.reason).toBe('AREA_NOT_KNOWN')
    expect(plan.whyHe).toBeTruthy()
  })

  it('the map list and travelPlan agree to the minute for every open place', () => {
    for (const from of ['bedroom', 'street', 'kiosk', 'allenby'] as const) {
      const engine = engineAt(from, at(12), ['life:knows:hall'])
      for (const place of placesFrom(engine.state, '1991', from)) {
        if (place.here || place.lockedHe) continue
        expect(travelPlan(engine.state, '1991', from, place.id).minutes, `${from}→${place.id}`).toBe(place.minutes)
      }
    }
  })
})

describe('auto travel never crosses what it may not (§16, §36)', () => {
  it('a guided way is walked with the person, not skipped', () => {
    const era = eraWith([waitBeat('doors', at(19, 10), { at: 'ussishkin-outside', waitingHe: 'ממתין: הדלתות' })])
    const engine = engineAt('street', at(17), ['guided:ofir'])
    const plan = freeTimePlan(engine.state, era)!
    expect(plan.blockers).toContain('guided')
    expect(preflight(plan).ok).toBe(false)
  })
  it('a beat that says the walk is the scene keeps it in his hands', () => {
    const era = eraWith([waitBeat('doors', at(19, 10), { at: 'ussishkin-outside', waitingHe: 'ממתין: הדלתות', freeTime: { allowAutoTravel: false } })])
    const engine = engineAt('street', at(17), ['life:knows:hall'])
    expect(preflight(freeTimePlan(engine.state, era)!).ok).toBe(false)
  })
})

describe('no duplicate travel math (§42)', () => {
  const scene = readFileSync(join(__dirname, '..', 'lib/life/runtime/scenes/WorldScene.ts'), 'utf8')
  it('the map and the walk in WorldScene read travel.ts', () => {
    const places = scene.slice(scene.indexOf('  places(): MapPlace[] {'), scene.indexOf('  // ---------------------------------------------------------------- free time ---'))
    expect(places).toContain('placesFrom(')
    expect(places).not.toMatch(/hops|MINUTES_PER_ROOM|queue\.shift/)
  })
})
