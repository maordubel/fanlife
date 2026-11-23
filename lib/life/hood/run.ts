/**
 * LIFE · the hood — the run: RUSH's simulation, a free-roam state and the jobs people give.
 *
 * `stepHood` is one `stepSim` plus the few rules the open neighbourhood adds:
 *   · there is no clock and no fail state; nothing ends — finishing a job returns to roaming with the job marked done;
 *   · a job starts only when the player presses talk beside the person who gives it AND picks the accept choice (`acceptJob`); nothing is ever done for him
 *     (a step only advances on the player's own walk or talk, exactly as in a mission);
 *   · any other person near him answers a talk with a line that fits the moment; a talk never locks anything.
 */
import {IDLE, startSim, stepSim, steer, STEP, botInput, type Input, type Sim} from '@/lib/life/rush/sim'
import type {Level, PickupKind} from '@/lib/life/rush/level'
import type {HoodJob, HoodPerson, HoodPlace, PersonId} from './types'
import {HOOD} from './level'

export type JobState = 'idle' | 'active' | 'done'
export type HoodRun = {level: Level; sim: Sim; job: JobState; said: Partial<Record<PersonId, number>>; lastPlace: string | null}
export type HoodEvent =
  | {k: 'say'; who: PersonId; key: string}
  | {k: 'job'; state: 'start' | 'done'; id: string}
  | {k: 'step'; next: number}
  | {k: 'pickup'; kind: PickupKind}
  | {k: 'hit'}
  | {k: 'place'; id: string | null}

const COOLDOWN = 1.2

export function startHood(level: Level): HoodRun {
  if (!level.hood) throw new Error('not a hood level')
  const sim = startSim(level)
  // no job is open until somebody gives it: the sim's step points past the last step
  sim.step = level.steps.length
  return {level, sim, job: 'idle', said: {}, lastPlace: null}
}

const jobOf = (run: HoodRun): HoodJob => run.level.hood!.jobs[0]!
/** the job's step that is open now (-1 when no job is open) */
export const openStep = (run: HoodRun): number => run.job === 'active' ? run.sim.step : -1

/** the person within talking reach, nearest first */
export function personNear(run: HoodRun): HoodPerson | null {
  let best: HoodPerson | null = null, bd = Infinity
  for (const p of run.level.hood!.people) { const d = Math.hypot(p.x - run.sim.x, p.z - run.sim.z); if (d < p.r && d < bd) { bd = d; best = p } }
  return best
}

/** the named place he is in (the nearest whose circle holds him), or null on the street between them */
export function placeAt(level: Level, x: number, z: number): HoodPlace | null {
  let best: HoodPlace | null = null, bd = Infinity
  for (const p of level.hood!.places) { const d = Math.hypot(p.x - x, p.z - z); if (d < p.r && d < bd) { bd = d; best = p } }
  return best
}

/** what a person says now, given how the job stands */
export function lineFor(run: HoodRun, p: HoodPerson): string {
  const j = jobOf(run), step = openStep(run)
  if (p.id === j.giver) return run.job === 'idle' ? j.offerKey : run.job === 'active' ? j.againKey : j.doneKey
  if (p.id === 'kiosk') return run.job === 'active' && step === j.from ? 'hood.say.kiosk.job' : run.job === 'done' ? 'hood.say.kiosk.done' : 'hood.say.kiosk.idle'
  if (p.id === 'mate') return run.job === 'active' && step > j.from + 1 ? 'hood.say.mate.done' : run.job === 'active' ? 'hood.say.mate.wait' : run.job === 'done' ? 'hood.say.mate.done' : 'hood.say.mate.idle'
  return run.job === 'done' ? 'hood.say.neighbour.done' : 'hood.say.neighbour.idle'
}

export function stepHood(run: HoodRun, input: Input, dt = STEP): HoodEvent[] {
  const {level, sim} = run
  stepSim(level, sim, input, dt)
  const out: HoodEvent[] = []
  let spoke = false
  for (const e of sim.events) {
    if (e.k === 'talk') { out.push({k: 'say', who: (e.key.split('.')[2] ?? 'dad') as PersonId, key: e.key}); spoke = true }
    else if (e.k === 'step') out.push({k: 'step', next: e.next})
    else if (e.k === 'pickup') out.push({k: 'pickup', kind: e.kind})
    else if (e.k === 'hit') out.push({k: 'hit'})
  }
  const j = jobOf(run)
  if (run.job === 'active' && sim.step >= j.from + j.steps) { run.job = 'done'; out.push({k: 'job', state: 'done', id: j.id}) }
  // talk: the player pressed it beside somebody who did not already answer through a step
  if (input.act && !spoke) {
    const p = personNear(run)
    if (p && sim.t - (run.said[p.id] ?? -9) > COOLDOWN) {
      run.said[p.id] = sim.t
      const key = lineFor(run, p)
      // the offer is a conversation: the job opens only when the player picks the accept choice (`acceptJob`)
      out.push({k: 'say', who: p.id, key})
    }
  }
  const pl = placeAt(level, sim.x, sim.z)?.id ?? null
  if (pl !== run.lastPlace) { run.lastPlace = pl; out.push({k: 'place', id: pl}) }
  return out
}

/** the accept choice of the giver's offer: the job opens, its first step is the open one. Nothing else opens a job. */
export function acceptJob(run: HoodRun): HoodEvent[] {
  if (run.job !== 'idle') return []
  const j = jobOf(run)
  run.job = 'active'; run.sim.step = j.from
  return [{k: 'job', state: 'start', id: j.id}, {k: 'step', next: run.sim.step}]
}

/**
 * The test's player: walks to Dad and talks, does the job step by step with RUSH's own bot (it reads the traffic's
 * timetable, nothing else), and when the job is done it stands still — roaming has no end to reach.
 */
export function hoodBot(run: HoodRun): Input {
  const {level, sim} = run
  if (run.job === 'done') return IDLE
  if (run.job === 'idle') {
    const dad = level.hood!.people.find(p => p.id === jobOf(run).giver)!
    const d = Math.hypot(dad.x - sim.x, dad.z - sim.z)
    if (d < HOOD.talk * 0.7) return {...IDLE, act: true}
    // the way is the main street: use RUSH's own routing by pointing the bot at a talk step on the giver
    return steer(sim, dad.x, dad.z, false, level)
  }
  return botInput(level, sim)
}
