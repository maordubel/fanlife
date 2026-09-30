/**
 * שדרוג החוויה — 5.9.2026: the checklist grows as the world shows it; a price booked
 * now lands later and survives a reload; a person met says so once; Stage A hands over
 * to Stage B on every legal path (a regression check, not a new feature).
 */
import { describe, expect, it } from 'vitest'

import { CHECKLIST_CHAPTERS, CHECKLISTS, checklistFor, nextStep } from '@/lib/life/checklist'
import { CHAPTERS, CHAPTER, nextPlayable } from '@/lib/life/content/chapters'
import { DEFAULT_IDENTITY } from '@/lib/life/content/chapter1986'
import { DIALOGUE } from '@/lib/life/content/dialogue'
import { DEVELOPMENT_ANCHOR } from '@/lib/life/anchors'
import { dueConsequences, scheduleLater, shownEvent } from '@/lib/life/consequence'
import { LifeEngine } from '@/lib/life/engine'
import { fold, type LifeEvent } from '@/lib/life/events'
import { LifeBus } from '@/lib/life/runtime/bus'
import { DialogueRunner } from '@/lib/life/runtime/dialogue'

const identity = DEFAULT_IDENTITY

function engineIn(chapter: string, year: number, minute: number, flags: string[] = []): LifeEngine {
  const engine = new LifeEngine(identity, 1986)
  engine.dispatch(
    { t: 'flag.raised', flag: 'prologue:done' },
    { t: 'chapter.entered', chapter: '1986' },
    { t: 'year.entered', year, weekday: 6, minute },
    { t: 'chapter.entered', chapter },
    ...flags.map((flag) => ({ t: 'flag.raised', flag }) as LifeEvent),
  )
  return engine
}

describe('the discovered checklist', () => {
  it('has a list for every playable chapter', () => {
    for (const chapter of CHAPTERS) {
      if (!chapter.playable) continue
      expect(CHECKLIST_CHAPTERS, chapter.id).toContain(chapter.id)
      expect(CHECKLISTS[chapter.id]!.length, chapter.id).toBeGreaterThan(0)
    }
  })

  it('1986: steps appear only after the world shows them, and tick when done', () => {
    const engine = engineIn('1986', 1986, 14 * 60)
    // (Director V3 §11) the key is not a step any more — the day opens on the father
    let list = checklistFor(engine.state)
    expect(list.map((s) => s.id)).toEqual(['dad'])
    expect(nextStep(engine.state)?.id).toBe('dad')
    engine.dispatch({ t: 'flag.raised', flag: 'knows:match' }, { t: 'flag.raised', flag: 'kobi:left' })
    list = checklistFor(engine.state)
    expect(list.map((s) => s.id)).toEqual(['dad', 'east', 'gate'])
    expect(list.filter((s) => s.done).map((s) => s.id)).toEqual(['dad'])
    // the match and the search are not on the list until the gate and the goal
    expect(list.some((s) => s.id === 'kobi')).toBe(false)
    engine.dispatch({ t: 'flag.raised', flag: 'entry:granted' }, { t: 'flag.raised', flag: 'saw:goal' }, { t: 'flag.raised', flag: 'match:over' })
    list = checklistFor(engine.state)
    expect(list.map((s) => s.id)).toEqual(['dad', 'east', 'gate', 'match', 'kobi'])
    expect(nextStep(engine.state)?.id).toBe('kobi')
    engine.dispatch({ t: 'flag.raised', flag: 'found:kobi' })
    expect(nextStep(engine.state)).toBeNull()
  })

  it('1999: the route first, the ground only once a route is chosen', () => {
    const engine = engineIn('1999-cup', 1999, 14 * 60)
    expect(checklistFor(engine.state).map((s) => s.id)).toEqual(['route'])
    engine.dispatch({ t: 'flag.raised', flag: 'c99:route' })
    expect(checklistFor(engine.state).map((s) => `${s.id}${s.done ? '✓' : ''}`)).toEqual(['route✓', 'ground'])
  })
})

describe('consequences — now, and later, and after a reload', () => {
  it('books a later line and delivers it on the minute, once', () => {
    const engine = engineIn('1999-cup', 1999, 14 * 60)
    engine.dispatch(...scheduleLater(engine.state, 'c99:alone', 'אולי כבר לא יחכו לך בשער.', 50))
    expect(dueConsequences(engine.state)).toEqual([])
    engine.dispatch({ t: 'clock.advanced', minutes: 49 })
    expect(dueConsequences(engine.state)).toEqual([])
    engine.dispatch({ t: 'clock.advanced', minutes: 1 })
    const due = dueConsequences(engine.state)
    expect(due).toHaveLength(1)
    expect(due[0]!.text).toBe('אולי כבר לא יחכו לך בשער.')
    engine.dispatch(shownEvent(due[0]!.flag))
    expect(dueConsequences(engine.state)).toEqual([])
    // booking the same id twice is one booking
    expect(scheduleLater(engine.state, 'c99:alone', 'x', 5)).toEqual([])
  })

  it('survives a reload: folding the log again finds the same debt', () => {
    const engine = engineIn('1999-cup', 1999, 14 * 60)
    engine.dispatch(...scheduleLater(engine.state, 'c99:alone', 'אולי כבר לא יחכו לך בשער.', 30), { t: 'clock.advanced', minutes: 31 })
    const replayed = fold(identity, 1986, engine.log())
    expect(dueConsequences(replayed)).toHaveLength(1)
    expect(replayed.flags['later:c99:alone']).toBe(`${14 * 60 + 30}|אולי כבר לא יחכו לך בשער.`)
  })

  it('the 1999 "see you there" choice says its price now and books the worry', () => {
    const engine = engineIn('1999-cup', 1999, 14 * 60)
    const bus = new LifeBus()
    const toasts: string[] = []
    bus.on('toast', (t) => {
      if (t) toasts.push(`${t.kickerHe ?? ''}|${t.text}`)
    })
    const dialogue = new DialogueRunner(engine, bus, { travel: () => undefined, minigame: () => undefined, ending: () => undefined, onOpen: () => undefined }, DEVELOPMENT_ANCHOR, {})
    expect(DIALOGUE['kobi-cup99']).toBeDefined()
    dialogue.start('kobi-cup99')
    for (let i = 0; i < 6; i += 1) dialogue.advance()
    dialogue.choose('other')
    expect(toasts.some((t) => t.startsWith('תוצאה|אבא נסע בלעדיך'))).toBe(true)
    expect(engine.state.flags['later:c99:alone']).toBeDefined()
    engine.dispatch({ t: 'clock.advanced', minutes: 50 })
    expect(dueConsequences(engine.state)[0]?.text).toBe('אולי כבר לא יחכו לך בשער.')
  })
})

describe('a person met says so once', () => {
  it('the first warm exchange with Michel raises life:met:michel and one "הכרת" line; the second does not — and a parent is never "met"', () => {
    const engine = engineIn('1999-cup', 1999, 14 * 60)
    const bus = new LifeBus()
    const toasts: string[] = []
    bus.on('toast', (t) => {
      if (t?.kickerHe === 'הכרת') toasts.push(t.text)
    })
    const dialogue = new DialogueRunner(engine, bus, { travel: () => undefined, minigame: () => undefined, ending: () => undefined, onOpen: () => undefined }, DEVELOPMENT_ANCHOR, {})
    dialogue.start('kobi-cup99')
    for (let i = 0; i < 6; i += 1) dialogue.advance()
    dialogue.choose('with-kobi')
    expect(engine.state.flags['life:met:kobi']).toBeUndefined()
    expect(toasts).toEqual([])
    // Michel's minibus, on a fresh afternoon at Gate 5: the first warm word with him is an introduction, once
    const fresh = engineIn('1999-cup', 1999, 14 * 60)
    fresh.dispatch({ t: 'money.changed', agorot: 3000, why: 'test' }, { t: 'gate.moved', to: 'gate5', reason: 'friends', year: 1996 })
    const bus2 = new LifeBus()
    const toasts2: string[] = []
    bus2.on('toast', (t) => {
      if (t?.kickerHe === 'הכרת') toasts2.push(t.text)
    })
    const ofir = new DialogueRunner(fresh, bus2, { travel: () => undefined, minigame: () => undefined, ending: () => undefined, onOpen: () => undefined }, DEVELOPMENT_ANCHOR, {})
    expect(DIALOGUE['michel-cup99']).toBeDefined()
    ofir.start('michel-cup99')
    for (let i = 0; i < 8; i += 1) ofir.advance()
    ofir.choose('go')
    expect(fresh.state.flags['life:met:michel']).toBe(true)
    expect(toasts2).toEqual(['הכרת את מישל בר־כליפא.'])
    ofir.start('michel-cup99')
    for (let i = 0; i < 8; i += 1) ofir.advance()
    expect(toasts2).toHaveLength(1)
    // the friends from the alley are never "met"
    const alley = engineIn('1999-cup', 1999, 14 * 60)
    alley.dispatch({ t: 'money.changed', agorot: 3000, why: 'test' })
    const bus3 = new LifeBus()
    const toasts3: string[] = []
    bus3.on('toast', (t) => {
      if (t?.kickerHe === 'הכרת') toasts3.push(t.text)
    })
    const runner3 = new DialogueRunner(alley, bus3, { travel: () => undefined, minigame: () => undefined, ending: () => undefined, onOpen: () => undefined }, DEVELOPMENT_ANCHOR, {})
    runner3.start('ofir-cup99')
    for (let i = 0; i < 8; i += 1) runner3.advance()
    runner3.choose('go')
    expect(toasts3).toEqual([])
  })

  it('the met flag is a person flag: it survives the next day', () => {
    const engine = engineIn('1999-cup', 1999, 14 * 60, ['life:met:kobi'])
    engine.dispatch({ t: 'day.entered', dayId: 'x', year: 1999, weekday: 0, minute: 9 * 60 })
    expect(engine.state.flags['life:met:kobi']).toBe(true)
  })
})

describe('Stage A → Stage B (regression only)', () => {
  it('the last Stage A day hands over to 1986, and 1986 to 1990, by the registry', () => {
    const a7 = CHAPTER['a7-week']!
    expect(a7.stage).toBe('A')
    expect(a7.next).toBe('1986')
    expect(nextPlayable('1986')?.id).toBe('1990')
    expect(CHAPTER['1990']!.stage).toBe('B')
  })

  it('a save that finished 1986 folds into 1990 with the person intact and the day reset', () => {
    const engine = new LifeEngine(identity, 1986)
    engine.dispatch(
      { t: 'flag.raised', flag: 'prologue:done' },
      { t: 'chapter.entered', chapter: '1986' },
      { t: 'flag.raised', flag: 'life:met:kobi' },
      { t: 'money.changed', agorot: 500, why: 'x' },
      { t: 'chapter.completed', chapter: '1986' },
      { t: 'year.entered', year: 1990, weekday: 6, minute: 14 * 60 },
      { t: 'chapter.entered', chapter: '1990' },
    )
    const replayed = fold(identity, 1986, engine.log())
    expect(replayed.chapter).toBe('1990')
    expect(replayed.year).toBe(1990)
    // ARNAK, 16.9.2026 — Maor: "הארנק לא מתאפס בסיום משימה אלא ממשיך איתך."
    // This line asserted the opposite until that decision, and it is changed rather than
    // deleted: the pocket surviving a transition IS the design, and a guard on a design
    // decision is what stops it drifting back in a refactor. See `lib/life/events.ts`.
    expect(replayed.agorot).toBe(500)
    expect(replayed.flags['life:met:kobi']).toBe(true)
    expect(replayed.flags['prologue:done']).toBe(true)
  })
})
