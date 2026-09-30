import '@/lib/life/content/chapters'

import { describe, expect, it } from 'vitest'

import { CHAPTER } from '@/lib/life/content/chapters'
import { DEFAULT_IDENTITY } from '@/lib/life/content/chapter1986'
import { ERA_KEYS, eraFor } from '@/lib/life/content/era'
import { beatFlag } from '@/lib/life/content/beats'
import { emptyState } from '@/lib/life/events'
import type { LifeState, LocationId } from '@/lib/life/types'
import * as flow from '@/lib/life/world/flow'
import { advanceSteps, freeTimePlan, isLapse, preflight, verifyLanding } from '@/lib/life/world/timeAdvance'
import { at, engineAt, eraWith, live, waitBeat } from './fixtures/freeTimeEra'

/**
 * האינווריאנטים — SMART FREE TIME §36, over every chapter this life can live.
 *
 * For every chapter, at every quarter hour from six in the morning to midnight, standing
 * in the rooms a day actually uses, with the beats' own required flags raised so their
 * clocks are what is left: whenever a plan exists it must be one the world can carry out.
 */

const ROOMS: LocationId[] = ['bedroom', 'home', 'kitchen', 'street', 'kiosk', 'allenby', 'ussishkin-outside', 'bloomfield-outside']

/** the positive flags a chapter's time-gated beats ask for — so their clocks are the only gate */
function wanted(chapter: string): string[] {
  const out = new Set<string>()
  const walk = (c: unknown) => {
    if (!c || typeof c !== 'object') return
    const cond = c as { flag?: string; all?: unknown[] }
    if (cond.flag) out.add(cond.flag)
    for (const part of cond.all ?? []) walk(part)
  }
  for (const beat of eraFor(chapter).beats ?? []) walk(beat.when)
  return [...out]
}

function states(): Array<{ chapter: string; state: LifeState }> {
  const out: Array<{ chapter: string; state: LifeState }> = []
  for (const chapter of ERA_KEYS) {
    const def = CHAPTER[chapter]
    if (!def) continue
    const base = { ...emptyState(DEFAULT_IDENTITY, def.year), chapter }
    const flags = Object.fromEntries(wanted(chapter).map((flag) => [flag, true]))
    for (const flagged of [false, true]) {
      for (const location of [def.start.location as LocationId, ...ROOMS]) {
        for (let minute = 6 * 60; minute < 24 * 60; minute += 15) {
          out.push({ chapter, state: { ...base, location, minute, flags: flagged ? { ...base.flags, ...flags, 'life:knows:hall': true } : base.flags } })
        }
      }
    }
  }
  return out
}

describe('every plan in every chapter is one the world can carry out', () => {
  const all = states()
  it('sweeps a real number of plans', () => {
    const plans = all.map(({ chapter, state }) => freeTimePlan(state, eraFor(chapter))).filter(Boolean)
    expect(plans.length).toBeGreaterThan(50)
  })

  it('plannedArrivalMinute <= eventMinute, always; a walk only on a reachable route; steps land where the plan says', () => {
    const failures: string[] = []
    for (const { chapter, state } of all) {
      const era = eraFor(chapter)
      const plan = freeTimePlan(state, era)
      if (!plan) continue
      const tag = `${chapter}@${state.location}@${state.minute}:${plan.beatId}`
      if (plan.plannedArrivalMinute > plan.eventMinute && !plan.blockers.includes('too-late')) failures.push(`${tag} arrives after`)
      if (plan.plannedArrivalMinute < state.minute) failures.push(`${tag} lands in the past`)
      const ok = preflight(plan).ok
      if (plan.targetLocation && plan.targetLocation !== state.location && ok && !plan.route?.reachable) failures.push(`${tag} walks an unreachable route`)
      if (plan.route?.locked && ok) failures.push(`${tag} walks through a locked door`)
      if (!ok) continue
      const steps = advanceSteps(plan, state, era)
      let minute = state.minute
      let where = state.location
      for (const step of steps) {
        minute += step.minutes
        if (step.kind === 'travel') where = step.to
      }
      if (minute > plan.eventMinute) failures.push(`${tag} steps overshoot`)
      if (minute !== plan.plannedArrivalMinute) failures.push(`${tag} steps end ${minute} not ${plan.plannedArrivalMinute}`)
      if (plan.targetLocation && where !== plan.targetLocation) failures.push(`${tag} ends in ${where}`)
      for (let i = 1; i < steps.length; i += 1) {
        const prev = steps[i - 1]!
        if (prev.kind === 'clock' && steps[i]!.kind === 'clock' && (steps[i] as { to: number }).to <= prev.to) failures.push(`${tag} steps go backwards`)
      }
    }
    expect(failures.slice(0, 12)).toEqual([])
  })

  it('never waits through a lapse by default, never walks past an unresolved choice', () => {
    for (const { chapter, state } of all) {
      const era = eraFor(chapter)
      const plan = freeTimePlan(state, era)
      if (!plan) continue
      const beat = (era.beats ?? []).find((row) => row.id === plan.beatId) ?? null
      if (isLapse(beat) && plan.alreadyThere) expect(preflight(plan).ok, `${chapter}:${plan.beatId}`).toBe(false)
      if (plan.blockers.includes('on-the-way') || plan.blockers.includes('guided') || plan.blockers.includes('route')) expect(preflight(plan).ok).toBe(false)
    }
  })
})

describe('after landing there is always something: the event, a named wait, or an action (§32–§33)', () => {
  it('a wait that lands on its event reports the event', () => {
    const era = eraWith([waitBeat('mum', at(15), { at: 'home', waitingHe: 'ממתין: אמא', freeTime: { person: true } })])
    const engine = engineAt('home', at(14))
    const plan = freeTimePlan(engine.state, era)!
    live(engine, era, plan)
    // the controlled era has no beat runner: fire it as the minute would
    engine.dispatch({ t: 'flag.raised', flag: beatFlag('mum') })
    expect(verifyLanding(engine.state, era, plan).has).toBe('event')
  })
  it('a landing short of an authored scene still has the named wait ahead', () => {
    const era = eraWith([waitBeat('talk', at(15), { waitingHe: 'ממתין: שיחה', do: [{ a: 'talk', conversation: 'x' }] })])
    const engine = engineAt('home', at(14))
    const plan = freeTimePlan(engine.state, era)!
    live(engine, era, plan)
    const report = verifyLanding(engine.state, era, plan)
    expect(report.ok).toBe(true)
    expect(report.has).toBe('waiting')
  })
  it('a walk that did not arrive is a flow failure QA sees', () => {
    const era = eraWith([waitBeat('bus', at(17, 50), { at: 'ussishkin-outside', waitingHe: 'ממתין: האוטובוס' })])
    const engine = engineAt('kiosk', at(17), ['life:knows:hall'])
    const plan = freeTimePlan(engine.state, era)!
    const report = verifyLanding(engine.state, era, plan)
    expect(report.ok).toBe(false)
    expect(report.issues.some((issue) => issue.startsWith('not-at-target'))).toBe(true)
  })
})

describe('the old API is gone', () => {
  it('LANDS_BEFORE and landingMinute are not exported', () => {
    expect((flow as Record<string, unknown>).LANDS_BEFORE).toBeUndefined()
    expect((flow as Record<string, unknown>).landingMinute).toBeUndefined()
  })
})
