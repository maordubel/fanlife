/**
 * A controlled afternoon for the free-time scenarios (SMART FREE TIME §35): the real 1991
 * rooms and doors, with the chapter's own beats, gates and windows replaced by the few rows
 * a scenario needs — so "the bus leaves at 17:50 from Ussishkin" is a row, not a hope.
 */
import type { Beat } from '@/lib/life/content/beats'
import { DEFAULT_IDENTITY } from '@/lib/life/content/chapter1986'
import { eraFor, type Era } from '@/lib/life/content/era'
import { LifeEngine } from '@/lib/life/engine'
import type { LifeOpportunity } from '@/lib/life/opportunities'
import type { NPCScheduleEntry } from '@/lib/life/schedules'
import type { LocationId } from '@/lib/life/types'
import { tickOpportunities } from '@/lib/life/opportunities'
import { advanceSteps, preflight, type TimeAdvancePlan } from '@/lib/life/world/timeAdvance'

export const at = (hour: number, minute = 0) => hour * 60 + minute

export function eraWith(
  beats: Beat[],
  extra: { opportunities?: LifeOpportunity[]; schedule?: NPCScheduleEntry[] } = {},
): Era {
  const base = eraFor('1991')
  return {
    ...base,
    timeGate: undefined,
    beats,
    opportunities: extra.opportunities ?? [],
    schedule: extra.schedule ?? [],
    // a controlled day wants nothing but the clock
    objective: () => null,
  }
}

export function engineAt(location: LocationId, minute: number, flags: string[] = []): LifeEngine {
  const engine = new LifeEngine(DEFAULT_IDENTITY, 1991)
  engine.dispatch(
    { t: 'year.entered', year: 1991, weekday: 1, minute },
    { t: 'chapter.entered', chapter: '1991' },
    { t: 'moved', to: location },
    ...flags.map((flag) => ({ t: 'flag.raised' as const, flag })),
  )
  return engine
}

/** a clock beat that waits for `minute` and nothing else, at `where` (or anywhere) */
export function waitBeat(id: string, minute: number, opts: Partial<Beat> = {}): Beat {
  return {
    id,
    trigger: 'clock',
    when: { afterMinute: minute, ...(opts.when ?? {}) },
    do: opts.do ?? [{ a: 'flag', flag: `${id}:done` }],
    ...(opts.at ? { at: opts.at } : {}),
    ...(opts.waitingHe ? { waitingHe: opts.waitingHe } : {}),
    ...(opts.freeTime ? { freeTime: opts.freeTime } : {}),
  }
}

/** the executor without a scene: the clock, the windows at each step, the walk as a move */
export function live(engine: LifeEngine, era: Era, plan: TimeAdvancePlan, { early = false, letPass = false } = {}) {
  const check = preflight(plan, { early, letPass })
  if (!check.ok) return check
  for (const step of advanceSteps(plan, engine.state, era, { early })) {
    if (step.kind === 'travel') {
      if (step.minutes) engine.dispatch({ t: 'clock.advanced', minutes: step.minutes })
      engine.dispatch({ t: 'moved', to: step.to })
      break
    }
    if (step.minutes) engine.dispatch({ t: 'clock.advanced', minutes: step.minutes })
    const windows = tickOpportunities(engine.state, era.opportunities)
    if (windows.events.length) engine.dispatch(...windows.events)
  }
  return check
}
