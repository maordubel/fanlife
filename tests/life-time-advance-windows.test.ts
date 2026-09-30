import '@/lib/life/content/chapters'

import { describe, expect, it } from 'vitest'

import { actionsNow } from '@/lib/life/world/actions'
import { placementsAt } from '@/lib/life/schedules'
import { scheduleLater } from '@/lib/life/consequence'
import { boundaries, freeTimePlan } from '@/lib/life/world/timeAdvance'
import { at, engineAt, eraWith, live, waitBeat } from './fixtures/freeTimeEra'

/**
 * החלונות — the world is reconciled at every minute it has an opinion about (§20):
 * a timetable row starting, an opportunity opening or closing, a debt falling due.
 */
const kiosk = {
  id: 'crates',
  titleHe: 'ארגזים בקיוסק',
  era: '1991',
  start: at(16),
  expires: at(17, 20),
  location: 'kiosk' as const,
  costs: { minutes: 10 },
  outcomes: [{ id: 'ok', effects: [] }],
}

const ofir = {
  characterId: 'ofir' as const,
  actorId: 'ofir-x',
  location: 'kiosk' as const,
  start: at(17, 35),
  end: at(19),
  behavior: 'wait' as const,
}

describe('boundaries', () => {
  it('names schedule rows, windows and debts between now and the landing', () => {
    const era = eraWith([waitBeat('bus', at(18), { at: 'kiosk', waitingHe: 'ממתין: האוטובוס' })], { opportunities: [kiosk], schedule: [ofir] })
    const engine = engineAt('kiosk', at(17))
    engine.dispatch(...scheduleLater(engine.state, 'debt', 'שילמת.', 10))
    const marks = boundaries(engine.state, era, at(17), at(18))
    expect(marks).toContain(at(17, 20))
    expect(marks).toContain(at(17, 35))
    expect(marks).toContain(at(17, 10))
    expect([...marks].sort((a, b) => a - b)).toEqual(marks)
  })
})

describe('G — an NPC crossing inside the advance is there on landing', () => {
  it('Ofir arrives at 17:35; the wait to 18:00 lands with him in the room', () => {
    const era = eraWith([waitBeat('bus', at(18), { at: 'kiosk', waitingHe: 'ממתין: האוטובוס' })], { schedule: [ofir] })
    const engine = engineAt('kiosk', at(17))
    expect(placementsAt(engine.state, era.schedule, 'kiosk').get('ofir-x')?.visible).toBe(false)
    live(engine, era, freeTimePlan(engine.state, era)!)
    expect(placementsAt(engine.state, era.schedule, 'kiosk').get('ofir-x')?.visible).toBe(true)
  })
})

describe('H — a window he let go closes, and leaves no ghost behind', () => {
  it('the crates window closes at 17:20 inside the wait: missed in the log, gone from the actions', () => {
    const era = eraWith([waitBeat('bus', at(18), { at: 'kiosk', waitingHe: 'ממתין: האוטובוס' })], { opportunities: [kiosk] })
    const engine = engineAt('kiosk', at(17))
    // it is open (the room's minute noticed it at four)
    engine.dispatch({ t: 'opportunity.offered', id: 'crates' })
    expect(actionsNow(engine.state, era).some((action) => action.id === 'opportunity:crates')).toBe(true)
    live(engine, era, freeTimePlan(engine.state, era)!)
    expect(engine.state.opportunities.find((entry) => entry.id === 'crates')?.status).toBe('missed')
    expect(actionsNow(engine.state, era).some((action) => action.id === 'opportunity:crates')).toBe(false)
    expect(freeTimePlan(engine.state, era)).toBeNull()
  })
})

describe('the read-only facts on actionsNow (§12)', () => {
  it('an opportunity knows its room, its length and its end; unknowns are null', () => {
    const era = eraWith([], { opportunities: [kiosk] })
    const engine = engineAt('kiosk', at(16, 30))
    const row = actionsNow(engine.state, era).find((action) => action.id === 'opportunity:crates')
    expect(row).toMatchObject({ location: 'kiosk', durationMinutes: 10, availableUntil: at(17, 20), knownToPlayer: true })
    const noLength = actionsNow(engine.state, eraWith([], { opportunities: [{ ...kiosk, costs: undefined }] })).find((action) => action.id === 'opportunity:crates')
    expect(noLength?.durationMinutes).toBeNull()
  })
})
