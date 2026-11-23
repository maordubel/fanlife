/**
 * LIFE · the hood — the kit bag as a model (pure): what he carries now, read from the run, plus the fixed starter slots.
 * The UI prints it; nothing here changes the run.
 */
import type {HoodRun} from './run'

export type BagId = 'scarf' | 'ticket' | 'pass' | 'bag' | 'batteries' | 'dads-scarf'
export type BagState = 'owned' | 'carried' | 'locked' | 'empty'
export type BagItem = {id: BagId; nameKey: string; descKey: string; state: BagState; count: number; wearable: boolean; worn: boolean}
export type Carry = {batteries: number; dadsScarf: boolean}

/** what he is carrying for the job right now; once the job is done it has been handed over */
export function carryOf(run: Pick<HoodRun, 'job' | 'sim' | 'level'>): Carry {
  if (run.job !== 'active') return {batteries: 0, dadsScarf: false}
  const j = run.level.hood!.jobs[0]!
  const got = run.level.pickups.reduce((n, p, i) => n + (p.kind === 'battery' && run.sim.got[i] ? 1 : 0), 0)
  return {batteries: got, dadsScarf: run.sim.step >= j.from + 2}
}

const slot = (id: BagId, state: BagState, o: Partial<BagItem> = {}): BagItem => ({id, nameKey: `hood.bag.${id === 'dads-scarf' ? 'dads' : id}`, descKey: `hood.bag.${id === 'dads-scarf' ? 'dads' : id}.d`, state, count: 1, wearable: false, worn: false, ...o})

/** the four starter slots first (a scarf he owns, a ticket slot that is empty, a pass that is locked, a bag), then what he carries */
export function bagOf(carry: Carry, wearing: boolean): BagItem[] {
  const out: BagItem[] = [slot('scarf', 'owned', {wearable: true, worn: wearing}), slot('ticket', 'empty'), slot('pass', 'locked'), slot('bag', 'owned')]
  if (carry.batteries > 0) out.push(slot('batteries', 'carried', {count: carry.batteries}))
  if (carry.dadsScarf) out.push(slot('dads-scarf', 'carried'))
  return out
}
