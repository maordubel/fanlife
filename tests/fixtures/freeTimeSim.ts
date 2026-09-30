/**
 * זמן פנוי בלי מסך — `WorldScene.advanceTime` as the headless sim lives it (delta 90).
 *
 * The same contract, in the same order: re-plan at the tap (a stale id is refused),
 * preflight, then walk `advanceSteps` — each clock step is time passing in the sim (clock
 * beats get their turn), the windows tick and the milestones reconcile as the runtime's
 * minute does; a travel step charges the walk and moves the boy through the door the walk
 * ends on. It stops as soon as something authored has played (a beat fired, a day ended).
 * No rule lives here: if this and `WorldScene.advanceTime` disagree, the scene is right.
 */
import type { Era } from '@/lib/life/content/era'
import { eraFor } from '@/lib/life/content/era'
import { tickOpportunities } from '@/lib/life/opportunities'
import { reconcile } from '@/lib/life/world/milestones'
import {
  EARLY_SUFFIX,
  LET_PASS_SUFFIX,
  advanceSteps,
  freeTimePlan,
  preflight,
  verifyLanding,
  type LandingReport,
  type TimeAdvancePlan,
} from '@/lib/life/world/timeAdvance'
import type { WorldSim } from './lifeWorldSim'

export type SimAdvance =
  | { ok: false; reason: string }
  | { ok: true; plan: TimeAdvancePlan; landing: LandingReport; stopped: boolean; from: number; to: number }

const beatsFired = (sim: WorldSim) => Object.keys(sim.state.flags).filter((flag) => flag.startsWith('beat:') && sim.state.flags[flag]).length

export function advanceIn(sim: WorldSim, planId: string, era: Era = eraFor(sim.chapter)): SimAdvance {
  const early = planId.endsWith(EARLY_SUFFIX)
  const letPass = planId.endsWith(LET_PASS_SUFFIX)
  const id = early ? planId.slice(0, -EARLY_SUFFIX.length) : letPass ? planId.slice(0, -LET_PASS_SUFFIX.length) : planId
  const plan = freeTimePlan(sim.state, era)
  if (!plan || plan.id !== id) return { ok: false, reason: 'changed' }
  const check = preflight(plan, { early, letPass })
  if (!check.ok) return { ok: false, reason: check.reason }
  const from = sim.state.minute
  const fired = beatsFired(sim)
  const endings = sim.endings.length
  let stopped = false
  for (const step of advanceSteps(plan, sim.state, era, { early })) {
    if (step.kind === 'travel') {
      if (step.minutes > 0) sim.engine.dispatch({ t: 'clock.advanced', minutes: step.minutes })
      sim.go(step.to)
      break
    }
    if (step.minutes <= 0) continue
    sim.wait(step.minutes)
    const windows = tickOpportunities(sim.state, era.opportunities ?? [])
    if (windows.events.length) sim.engine.dispatch(...windows.events)
    const raised = reconcile(sim.state)
    if (raised.length) sim.engine.dispatch(...raised.map((flag) => ({ t: 'flag.raised' as const, flag })))
    if (beatsFired(sim) > fired || sim.endings.length > endings) {
      stopped = true
      break
    }
  }
  const landing = verifyLanding(sim.state, era, plan, { early, busy: stopped })
  return { ok: true, plan, landing, stopped, from, to: sim.state.minute }
}
