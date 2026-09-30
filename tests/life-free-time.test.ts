import '@/lib/life/content/chapters'

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { eraFor } from '@/lib/life/content/era'
import { STORY_CHORES } from '@/lib/life/content/storyChores'
import type { DialogueChoice } from '@/lib/life/runtime/bus'
import { placementsAt } from '@/lib/life/schedules'
import { beatFlag } from '@/lib/life/content/beats'
import { EARLY_SUFFIX, freeTimePlan, preflight } from '@/lib/life/world/timeAdvance'
import { durationHe, plannerCopy, toPlaceHe, voiceOf } from '@/lib/life/world/timeAdvanceCopy'
import { WALK_AWAY, WorldSim } from './fixtures/lifeWorldSim'
import { advanceIn } from './fixtures/freeTimeSim'
import { at, engineAt, eraWith, live, waitBeat } from './fixtures/freeTimeEra'

/**
 * זמן פנוי — the scenarios of SMART FREE TIME §35, A to K (delta 90 · 90-F).
 *
 * A and K play the real 1991 afternoon through the headless world; the others use the
 * real 1991 rooms and doors with a controlled row or two (`fixtures/freeTimeEra.ts`), so
 * "the bus leaves at 17:50" is a fact of the test and not of whatever the chapter says
 * this week.
 */

const read = (choices: readonly DialogueChoice[]) => choices.find((c) => c.enabled)?.id ?? WALK_AWAY
const pick = (id: string) => (choices: readonly DialogueChoice[]) => (choices.some((c) => c.id === id && c.enabled) ? id : WALK_AWAY)

/** 11.3.1991, school out, page forty-one done at the desk — the only thing left is Rachel */
function homeworkDone(): WorldSim {
  const sim = new WorldSim('1991')
  sim.beatAnswer = read
  sim.onMinigame = (id, world) => {
    const chore = STORY_CHORES[id.slice('chore:story:'.length)]
    if (!chore) return
    const events = chore.finish(chore.shape.target, chore.shape.target)
    if (events.length) world.engine.dispatch(...events)
    world.go(chore.where)
  }
  sim.wait(50)
  sim.press('teacher-1991', read)
  sim.go('bedroom')
  sim.press('desk-1991', pick('work'))
  expect(sim.state.flags['hw:done']).toBe(true)
  return sim
}

describe('A — 1991: homework done, Rachel not home yet', () => {
  it('the planner says why, says he is already home, and the wait lands with Rachel standing in the living room', () => {
    const sim = homeworkDone()
    const era = eraFor('1991')
    const plan = freeTimePlan(sim.state, era)
    expect(plan?.beatId).toBe('era:1991:rachel')
    expect(plan!.atHome).toBe(true)
    expect(plan!.arrivalBufferMinutes).toBe(0)
    expect(plan!.plannedArrivalMinute).toBe(at(15))
    const copy = plannerCopy(plan!, sim.state)
    expect(copy.whyHe).toContain('אמא חוזרת')
    expect(copy.whereHe).toBe('אתה כבר בבית.')
    expect(copy.ctaHe).toBe('לחכות בבית')
    // the timeline has no "leave" point: nobody leaves the flat to wait for his mother
    expect(copy.timeline.leave).toBeNull()
    expect(placementsAt(sim.state, era.schedule, 'home').get('rachel-1991')?.visible).toBe(false)

    const done = advanceIn(sim, plan!.id)
    expect(done.ok).toBe(true)
    expect(sim.location).toBe('home')
    expect(sim.state.minute).toBe(at(15))
    // her schedule row has begun: she is THERE, no door in and out needed
    expect(placementsAt(sim.state, era.schedule, 'home').get('rachel-1991')?.visible).toBe(true)
    if (done.ok) expect(done.landing.ok).toBe(true)
    // and the next thing is talking to her
    expect(sim.find('rachel-1991')).toBeTruthy()
  })
})

describe('B — the bus from Ussishkin: safe departure = event − travel − buffer', () => {
  const era = eraWith([waitBeat('bus', at(17, 50), { at: 'ussishkin-outside', waitingHe: 'ממתין: האוטובוס יוצא', freeTime: { arrivalBufferMinutes: 8 } })])

  it('plans the leave, not a landing three minutes before the bus wherever he stands', () => {
    const engine = engineAt('kiosk', at(17, 4), ['life:knows:hall'])
    const plan = freeTimePlan(engine.state, era)!
    expect(plan.mode).toBe('wait-then-travel')
    expect(plan.targetLocation).toBe('ussishkin-outside')
    expect(plan.safeDepartureMinute).toBe(at(17, 50) - plan.travelMinutes - 8)
    expect(plan.freeMinutes).toBe(plan.safeDepartureMinute - at(17, 4))
    expect(plan.plannedArrivalMinute).toBe(at(17, 42))
    const copy = plannerCopy(plan, engine.state)
    expect(copy.whyHe).toBe('האוטובוס יוצא ב־17:50.')
    expect(copy.ctaHe).toBe('להגיע בזמן לאולם אוסישקין')
    expect(copy.routeHe).toContain(`${plan.travelMinutes} דקות`)
  })

  it('lands at Ussishkin at 17:42 — the bus is still there', () => {
    const engine = engineAt('kiosk', at(17, 4), ['life:knows:hall'])
    const plan = freeTimePlan(engine.state, era)!
    expect(live(engine, era, plan).ok).toBe(true)
    expect(engine.state.location).toBe('ussishkin-outside')
    expect(engine.state.minute).toBe(at(17, 42))
    expect(engine.state.flags[beatFlag('bus')]).toBeFalsy()
  })

  it('"early" walks now, and the wait happens there', () => {
    const engine = engineAt('kiosk', at(17, 4), ['life:knows:hall'])
    const plan = freeTimePlan(engine.state, era)!
    expect(plan.earlyArrivalMinute).toBe(at(17, 4) + plan.travelMinutes)
    live(engine, era, plan, { early: true })
    expect(engine.state.location).toBe('ussishkin-outside')
    expect(engine.state.minute).toBe(plan.earlyArrivalMinute)
  })

  it('late: when there is no slack left, the planner says "now"', () => {
    const engine = engineAt('kiosk', at(17, 20), ['life:knows:hall'])
    const plan = freeTimePlan(engine.state, era)!
    expect(plan.late).toBe(true)
    expect(plannerCopy(plan, engine.state).freeHe).toBe('כבר מאוחר לצאת בנחת. אם אתה הולך — עכשיו.')
  })
})

describe('C — already there', () => {
  it('"אתה כבר במקום" and the CTA is to wait here', () => {
    const era = eraWith([waitBeat('doors', at(19, 10), { at: 'ussishkin-outside', waitingHe: 'ממתין: הדלתות נפתחות' })])
    const engine = engineAt('ussishkin-outside', at(18, 52), ['life:knows:hall'])
    const plan = freeTimePlan(engine.state, era)!
    expect(plan.mode).toBe('wait-here')
    expect(plan.alreadyThere).toBe(true)
    const copy = plannerCopy(plan, engine.state)
    expect(copy.whereHe).toBe('אתה כבר במקום.')
    expect(copy.ctaHe).toBe('לחכות כאן')
    expect(copy.chipHe).toBe('עוד 18 דק׳')
  })
})

describe('D — the way is not his yet', () => {
  it('no auto-walk: the CTA is shown disabled with the reason, never hidden and never taken', () => {
    const era = eraWith([waitBeat('bus', at(17, 50), { at: 'ussishkin-outside', waitingHe: 'ממתין: האוטובוס יוצא' })])
    const engine = engineAt('kiosk', at(17, 4))
    const plan = freeTimePlan(engine.state, era)!
    expect(plan.route?.reachable).toBe(false)
    expect(plan.blockers).toContain('route')
    expect(plan.safe).toBe(false)
    expect(preflight(plan).ok).toBe(false)
    const copy = plannerCopy(plan, engine.state)
    expect(copy.blockedHe).toContain('אי אפשר להגיע לשם עדיין')
    const before = engine.state.minute
    expect(live(engine, era, plan).ok).toBe(false)
    expect(engine.state.minute).toBe(before)
    expect(engine.state.location).toBe('kiosk')
  })
})

describe('E / F — what fits, what is tight, what does not', () => {
  const window = (costs: number) => ({
    id: `help-${costs}`,
    titleHe: 'לעזור לרפי',
    era: '1991',
    start: at(16),
    expires: at(20),
    location: 'kiosk' as const,
    costs: { minutes: costs },
    outcomes: [{ id: 'ok', effects: [] }],
  })

  it('E — thirty minutes, a twenty-minute job: safe, and it says so', () => {
    const era = eraWith([waitBeat('mum', at(17, 30), { at: 'kiosk', waitingHe: 'ממתין: אמא עוברת' })], { opportunities: [window(20)] })
    const engine = engineAt('kiosk', at(17))
    const row = freeTimePlan(engine.state, era)!.optionalActions.find((action) => action.id === 'opportunity:help-20')
    expect(row?.tier).toBe('safe')
    expect(row?.fits).toBe(true)
    expect(row?.marginMinutes).toBe(10)
  })

  it('F — a forty-minute job in a thirty-minute window is not offered as a safe choice', () => {
    const era = eraWith([waitBeat('mum', at(17, 30), { at: 'kiosk', waitingHe: 'ממתין: אמא עוברת' })], { opportunities: [window(40)] })
    const engine = engineAt('kiosk', at(17))
    expect(freeTimePlan(engine.state, era)!.optionalActions.some((action) => action.id === 'opportunity:help-40')).toBe(false)
  })

  it('F — …unless missing the event is a real, authored consequence: then it is a dramatic choice, and says the price', () => {
    const era = eraWith(
      [waitBeat('bus', at(17, 30), { waitingHe: 'ממתין: האוטובוס יוצא', when: { none: [{ flag: 'on:bus' }] } })],
      { opportunities: [window(40)] },
    )
    const engine = engineAt('kiosk', at(17))
    const plan = freeTimePlan(engine.state, era)!
    expect(plan.lapse).toBe(true)
    const row = plan.optionalActions.find((action) => action.id === 'opportunity:help-40')
    expect(row?.tier).toBe('no-fit')
    expect(row?.fits).toBe(false)
    expect(row?.riskHe).toContain('בלעדיך')
  })

  it('a tight row is marked tight', () => {
    const era = eraWith([waitBeat('mum', at(17, 30), { at: 'kiosk', waitingHe: 'ממתין: אמא עוברת' })], { opportunities: [window(27)] })
    const engine = engineAt('kiosk', at(17))
    expect(freeTimePlan(engine.state, era)!.optionalActions.find((action) => action.id === 'opportunity:help-27')?.tier).toBe('tight')
  })
})

describe('no decision teleport (§8) and no spoilers (§24)', () => {
  it('a lapse is never the default: waiting through it is his explicit "let it pass"', () => {
    const era = eraWith([waitBeat('bus', at(17, 30), { waitingHe: 'ממתין: האוטובוס יוצא', when: { none: [{ flag: 'on:bus' }] } })])
    const engine = engineAt('kiosk', at(17))
    const plan = freeTimePlan(engine.state, era)!
    expect(preflight(plan).ok).toBe(false)
    expect(preflight(plan, { letPass: true }).ok).toBe(true)
    const copy = plannerCopy(plan, engine.state)
    expect(copy.letPassHe).toBe('לתת לזה לעבור')
    expect(copy.letPassSubHe).toContain('בלעדיך')
  })

  it('an event the chapter has not told him about has no name and no place', () => {
    const era = eraWith([waitBeat('secret', at(18), { at: 'ussishkin-outside' })])
    const engine = engineAt('kiosk', at(17), ['life:knows:hall'])
    const plan = freeTimePlan(engine.state, era)!
    expect(plan.knownToPlayer).toBe(false)
    expect(plan.targetLocation).toBeNull()
    const copy = plannerCopy(plan, engine.state)
    expect(copy.whyHe).toBe('כרגע אין משהו שאתה חייב לעשות.')
    expect(copy.whyHe).not.toContain('אוסישקין')
    expect(copy.ctaHe).not.toContain('אוסישקין')
  })
})

describe('I — an authored scene inside the wait is played, not skipped', () => {
  it('a3-hall: the wait lands one minute before the conversation, and the conversation then plays', () => {
    const sim = new WorldSim('a3-hall')
    sim.beatAnswer = read
    // (pass 28.9.2026) the tip-off whistle (18:05, a toast, no scene) has blown: the wait is to the lights-off conversation
    sim.engine.dispatch({ t: 'flag.raised', flag: 'a3:inside' }, { t: 'flag.raised', flag: 'a3:tipoff' }, { t: 'clock.advanced', minutes: Math.max(0, at(18) - sim.state.minute) })
    const plan = freeTimePlan(sim.state, eraFor('a3-hall'))
    expect(plan).toBeTruthy()
    expect(plan!.plannedArrivalMinute).toBe(plan!.eventMinute - 1)
    const done = advanceIn(sim, plan!.id)
    expect(done.ok).toBe(true)
    expect(sim.state.minute).toBeLessThan(plan!.eventMinute)
    expect(sim.state.flags[beatFlag(plan!.beatId)]).toBeFalsy()
    sim.wait(1)
    expect(sim.state.flags[beatFlag(plan!.beatId)]).toBeTruthy()
  })
})

describe('J — historical footage is a lead-in, never opened or finished by the skip', () => {
  it('a gate whose beat opens a film lands before it; no step of the advance reaches the film minute', () => {
    const era = eraWith([waitBeat('film', at(18), { waitingHe: 'ממתין: השידור', do: [{ a: 'cutscene', id: 'x' }] })])
    const engine = engineAt('home', at(17))
    const plan = freeTimePlan(engine.state, era)!
    expect(plan.plannedArrivalMinute).toBe(at(18) - 1)
    live(engine, era, plan)
    expect(engine.state.minute).toBe(at(18) - 1)
    expect(engine.state.flags['cutscene:x']).toBeFalsy()
  })
})

describe('K — advance → save → reload is the same world', () => {
  it('same minute, same room, same people, same objective', () => {
    const sim = homeworkDone()
    const plan = freeTimePlan(sim.state, eraFor('1991'))!
    advanceIn(sim, plan.id)
    const again = sim.reload()
    expect(again.state.minute).toBe(sim.state.minute)
    expect(again.location).toBe(sim.location)
    expect(again.state.flags).toEqual(sim.state.flags)
    expect(placementsAt(again.state, eraFor('1991').schedule, 'home').get('rachel-1991')?.visible).toBe(true)
    expect(eraFor('1991').objective(again.state, again.location, false)).toBe(eraFor('1991').objective(sim.state, sim.location, false))
  })
})

describe('TOCTOU (§19) — a plan is recalculated at the tap', () => {
  it('a stale plan id is refused and nothing moves', () => {
    const sim = homeworkDone()
    const plan = freeTimePlan(sim.state, eraFor('1991'))!
    sim.go('kitchen') // he moved after the card was opened
    const before = sim.state.minute
    const done = advanceIn(sim, plan.id)
    expect(done.ok).toBe(false)
    if (!done.ok) expect(done.reason).toBe('changed')
    expect(sim.state.minute).toBe(before)
  })
  it('the early variant of a plan with no walk is refused', () => {
    const era = eraWith([waitBeat('doors', at(19, 10), { at: 'ussishkin-outside', waitingHe: 'ממתין: הדלתות' })])
    const engine = engineAt('ussishkin-outside', at(18, 52), ['life:knows:hall'])
    const plan = freeTimePlan(engine.state, era)!
    expect(preflight(plan, { early: true }).ok).toBe(false)
    expect(`${plan.id}${EARLY_SUFFIX}`.endsWith('|early')).toBe(true)
  })
})

describe('the time grows up with Pugi (§39)', () => {
  const state = (year: number) => ({ ...engineAt('home', at(12)).state, year })
  it('child, teen, soldier, adult', () => {
    expect(voiceOf(state(1986))).toBe('child')
    expect(voiceOf(state(1993))).toBe('teen')
    expect(voiceOf(state(1997))).toBe('soldier')
    expect(voiceOf(state(2007))).toBe('adult')
  })
  it('minutes the way a person says them, places with their preposition', () => {
    expect(durationHe(30)).toBe('חצי שעה')
    expect(durationHe(15)).toBe('רבע שעה')
    expect(durationHe(60)).toBe('שעה')
    expect(durationHe(22)).toBe('22 דקות')
    expect(toPlaceHe('אולם אוסישקין — מבחוץ')).toBe('לאולם אוסישקין')
    expect(toPlaceHe('הרחוב')).toBe('לרחוב')
  })
  it('the same wait reads differently at eight and at thirty', () => {
    const era = eraWith([waitBeat('doors', at(19), { at: 'home', waitingHe: 'ממתין: מישהו' })])
    const kid = engineAt('home', at(18, 30)).state
    const man = { ...kid, year: kid.year + 19 }
    const plan = freeTimePlan(kid, era)!
    expect(plannerCopy(plan, { ...kid, year: 1986 }).freeHe).not.toBe(plannerCopy(plan, man).freeHe)
  })
})

describe('one system, not two (§40, §36)', () => {
  const root = join(__dirname, '..')
  const src = (path: string) => readFileSync(join(root, path), 'utf8')
  it('PassTime is gone and nothing imports it', () => {
    expect(existsSync(join(root, 'components/life/PassTime.tsx'))).toBe(false)
    expect(src('app/life/LifeStage.tsx')).not.toMatch(/PassTime|landingMinute/)
  })
  it('the fixed three-minute landing does not exist', () => {
    expect(src('lib/life/world/flow.ts')).not.toMatch(/LANDS_BEFORE|landingMinute/)
  })
  it('no UI-level raw clock skip: the shell asks the world by plan id', () => {
    for (const file of ['app/life/LifeStage.tsx', 'app/life/stage/useFreeTime.ts', 'components/life/FreeTimeChip.tsx', 'components/life/FreeTimePlanner.tsx', 'components/life/TimeAdvanceTransition.tsx']) {
      expect(src(file), file).not.toContain('clock.advanced')
    }
    const ledger = src('app/life/stage/useLifeLedger.ts')
    expect(ledger).not.toMatch(/passTime|landingMinute/)
    expect(src('app/life/stage/useFreeTime.ts')).toContain('advanceTime(')
  })
  it('the planner is a dialog above the tab bar, with a 52px row and a pinned CTA', () => {
    const planner = src('components/life/FreeTimePlanner.tsx')
    expect(planner).toMatch(/role="dialog"[\s\S]*z-\[6\d\]/)
    expect(planner).toContain('min-h-[52px]')
    expect(planner).toContain('max-h-[76dvh]')
    expect(planner).not.toMatch(/(?<![\w-])(left|right)-|\bml-|\bmr-|\bpl-|\bpr-|rounded-/)
  })
})
