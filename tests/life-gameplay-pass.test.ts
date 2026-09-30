import { describe, expect, it } from 'vitest'

import { eraFor } from '@/lib/life/content/era'
import { LifeEngine } from '@/lib/life/engine'
import { emptyState } from '@/lib/life/events'
import { livingStage } from '@/lib/life/income'
import { trackAtLeast, trackStageFlag } from '@/lib/life/tracks'
import { actionsNow } from '@/lib/life/world/actions'
import { QUIET_MINUTES, flowMove } from '@/lib/life/world/flow'
import { reconcile } from '@/lib/life/world/milestones'
import type { LifeState } from '@/lib/life/types'

const IDENTITY = { name: 'פוגי', sex: 'boy' as const, birthYear: 1978 }

const state = (chapter: string, year: number, flags: LifeState['flags'] = {}): LifeState => ({
  ...emptyState(IDENTITY, year),
  chapter,
  year,
  age: year - IDENTITY.birthYear,
  flags,
})

describe('gameplay pass — the player always has a legible next move', () => {
  it('starts the first playable mission with one clear discovered action', () => {
    const s = state('a2-alley', 1984)
    const actions = actionsNow(s, eraFor('a2-alley'))
    expect(actions.filter((action) => action.kind === 'story').map((action) => action.titleHe)).toEqual([
      'אמא רוצה משהו.',
    ])
    expect(actions.find((action) => action.primary)?.titleHe).toBe('אמא רוצה משהו.')
  })

  it('reveals the real choice after the errand starts instead of a hidden flag puzzle', () => {
    const s = state('a2-alley', 1984, { 'a2:errand': true })
    const story = actionsNow(s, eraFor('a2-alley')).filter((action) => action.kind === 'story')
    expect(story.map((action) => action.titleHe)).toEqual([
      'לחם מהקיוסק.',
      'הסמטה. לפני שהקבוצות מתמלאות.',
    ])
  })

  it('offers a time jump after one quiet game-minute, never twenty-five minutes of pacing', () => {
    const s = state('a3-hall', 1984, { 'a3:inside': true })
    s.minute = 18 * 60
    const move = flowMove({
      state: s,
      era: eraFor('a3-hall'),
      objectiveHe: null,
      quietFor: QUIET_MINUTES,
      busy: false,
      reachable: 2,
    })
    expect(move?.kind).toBe('pass')
  })

  it('still advances a pure time gate when the room has no targets left', () => {
    const s = state('a3-hall', 1984, { 'a3:inside': true })
    s.minute = 18 * 60
    const move = flowMove({
      state: s,
      era: eraFor('a3-hall'),
      objectiveHe: null,
      quietFor: QUIET_MINUTES,
      busy: false,
      reachable: 0,
    })
    expect(move?.kind).toBe('pass')
  })

  it('restarts the actual day inside a multi-day chapter, not the whole chapter', () => {
    const engine = new LifeEngine(IDENTITY, 1996)
    engine.dispatch(
      { t: 'chapter.entered', chapter: '1996-army' },
      { t: 'day.entered', dayId: 'army-d1', year: 1996, weekday: 0, minute: 8 * 60 },
      { t: 'flag.raised', flag: 'life:kept-from-before' },
      { t: 'day.entered', dayId: 'army-d2', year: 1996, weekday: 1, minute: 9 * 60 },
      { t: 'flag.raised', flag: 'a2:temporary' },
      { t: 'clock.advanced', minutes: 55 },
    )

    expect(engine.restartDay()).toBe(true)
    expect(engine.state.minute).toBe(9 * 60)
    expect(engine.state.flags['life:kept-from-before']).toBe(true)
    expect(engine.state.flags['a2:temporary']).not.toBe(true)
    expect(engine.log().at(-1)?.t).toBe('day.entered')
  })
})

describe('gameplay pass — the written life drives the formal life tracks', () => {
  it('turns the existing mutual partner choice into the partnership track without rewriting the scene', () => {
    const s = state('2011-people', 2011, { 'life:partner': 'melanie' })
    const raised = reconcile(s)
    expect(raised).toContain(trackStageFlag('PARTNERSHIP', 'first'))
    expect(raised).toContain(trackStageFlag('PARTNERSHIP', 'together'))
  })

  it('turns the first adult work commitment into durable WORK', () => {
    const s = state('2000-bridge', 2000, { 'b:commitKind': 'work' })
    expect(reconcile(s)).toContain(trackStageFlag('WORK', 'first-job'))
  })

  it('does not call an intention parenthood, but recognizes an actual child', () => {
    const intent = state('2013-household', 2013, { 'hh:intent': 'yes', 'life:partner': 'dor' })
    expect(reconcile(intent)).not.toContain(trackStageFlag('PARENTHOOD', 'born'))

    const parent = state('2013-household', 2013, { 'life:partner': 'dor', 'life:child': true })
    const raised = reconcile(parent)
    expect(raised).toContain(trackStageFlag('PARENTHOOD', 'born'))

    const folded = { ...parent, flags: { ...parent.flags } }
    for (const flag of raised) folded.flags[flag] = true
    expect(trackAtLeast(folded, 'PARENTHOOD')).toBe(true)
  })
})

describe('gameplay pass — adult money follows the life the player built', () => {
  it('treats the 2013 household decision as an independent household', () => {
    const s = state('2013-household', 2013, { 'hh:home': 'own_place' })
    expect(livingStage(s)).toBe('ownPlace')
    expect(reconcile(s)).toContain('own:home:independent')
  })

  it('treats an existing child as a family immediately, including old saves before reconciliation', () => {
    const s = state('2021-promises', 2021, { 'life:child': true })
    expect(livingStage(s)).toBe('family')
  })
})
