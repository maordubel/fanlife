/**
 * בדיקת שערי־זמן — for every chapter, does the day ever have a next step that is waiting
 * on nothing but the clock?
 *
 * The pass-time card can only exist where the answer is yes. Where it is no, a player who
 * is stuck is stuck on a REQUIREMENT — something to click, someone to talk to — and the
 * honest answer is a hint, not a jump. This prints both lists so the distinction stops
 * being a guess.
 */
import { ERA_KEYS, eraFor } from '../../lib/life/content/era'
import { emptyState } from '../../lib/life/events'
import { nextTimeGate } from '../../lib/life/world/flow'
import type { LifeState } from '../../lib/life/types'

const identity = { name: 'פוגי', sex: 'boy', birthYear: 1978 } as const

for (const key of ERA_KEYS) {
  const era = eraFor(key)
  const base: LifeState = { ...emptyState(identity, 1986), chapter: key }
  const gates = new Set<string>()
  for (let minute = 6 * 60; minute < 24 * 60; minute += 5) {
    const gate = nextTimeGate({ ...base, minute }, era)
    if (gate) gates.add(`${gate.beatId}@${gate.minute}`)
  }
  const beats = (era.beats ?? []).length
  console.log(`${key.padEnd(16)} beats=${String(beats).padStart(3)}  time-gates=${gates.size ? [...gates].join(' ') : '—'}`)
}
