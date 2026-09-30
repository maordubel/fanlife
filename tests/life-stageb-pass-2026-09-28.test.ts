// the chapter registry first: `prices → chapters → income → prices` is a load cycle that
// only bites when something else reaches `income` before `chapters` (delta 90, reported)
import '@/lib/life/content/chapters'

import { describe, expect, it } from 'vitest'

import { NOTE_BOARDS } from '@/lib/life/content/noteBoards'
import { STORY_CHORES } from '@/lib/life/content/storyChores'
import { DEFAULT_IDENTITY } from '@/lib/life/content/chapter1986'
import { LifeEngine } from '@/lib/life/engine'
import type { LifeEvent } from '@/lib/life/events'
import { boardView, cleanPlacements, gradeOf, resolveCards, settleWith } from '@/lib/life/noteBoards'
import type { DialogueChoice } from '@/lib/life/runtime/bus'
import { SCENE, inEra, sceneIn } from '@/lib/life/world/scenes'
import { STADIUM_ROOMS } from '@/lib/life/world/city2027/stadiumSide'

import { WALK_AWAY, WorldSim } from './fixtures/lifeWorldSim'

/**
 * Stage B implementation pass (27–28.9.2026) — what the pass added to 1990–2000, held.
 *
 *  · the note board (`lib/life/noteBoards.ts`): only what was heard is on the table, the
 *    columns are about HOW he knows, a tampered placement is dropped, and every outcome
 *    writes a persistent `life:` value a later chapter reads;
 *  · the new decisions of the decade each write their `life:` value and are READ later
 *    (1993 seat → Galil bus, Galil seat → 1997 Efi, 1997 night → 1999 corner, 1990 call →
 *    2000 call, 1998 lists → 2000 rumour, 1983 stub → 1999 hug);
 *  · the new scenes end — the Sinai gate of 1996 ends in the room whatever he did there.
 */

const pick =
  (...ids: string[]) =>
  (choices: readonly DialogueChoice[]) =>
    ids.find((id) => choices.some((choice) => choice.id === id && choice.enabled)) ?? choices.find((c) => c.enabled)?.id ?? WALK_AWAY

/** answers boxes in order — one id per box, then the first open answer */
function seq(...ids: string[]) {
  let i = 0
  return (choices: readonly DialogueChoice[]) => {
    const want = ids[i]
    i += 1
    if (want && choices.some((choice) => choice.id === want && choice.enabled)) return want
    return choices.find((c) => c.enabled)?.id ?? WALK_AWAY
  }
}

function stateWith(chapter: string, flags: Record<string, boolean | string>): LifeEngine['state'] {
  const engine = new LifeEngine(DEFAULT_IDENTITY, 1990)
  engine.dispatch({ t: 'year.entered', year: 1990, weekday: 6, minute: 13 * 60 }, { t: 'chapter.entered', chapter })
  const events: LifeEvent[] = Object.entries(flags).map(([flag, value]) => (value === true ? { t: 'flag.raised', flag } : { t: 'flag.set', flag, value }))
  engine.dispatch(...events)
  return engine.state
}

/** everything a sim that did the chore in full would have done */
function handsFull(sim: WorldSim) {
  sim.onMinigame = (id, world) => {
    if (!id.startsWith('chore:story:')) return
    const chore = STORY_CHORES[id.slice('chore:story:'.length)]
    if (!chore) return
    world.engine.dispatch(...chore.finish(chore.shape.target, chore.shape.target))
    world.go(chore.where)
  }
}

describe('הפתק — the note board', () => {
  it('puts on the table only what this life heard', () => {
    const board = NOTE_BOARDS['notebook-1990']!
    const cold = stateWith('1990', {})
    expect(resolveCards(board, cold).map((card) => card.id)).toEqual(['ours'])
    expect(boardView(board, cold)).toBeNull()
    const heard = stateWith('1990', { 'math:kobi': true, 'knows:radio': true, 'net:heard': true, 'net:known': 'יבנה מובילה.', 'uc:heard': true, 'rumor:last': 'נתניה השוותה!' })
    const ids = resolveCards(board, heard).map((card) => card.id)
    expect(ids).toEqual(['ours', 'table', 'radio-home', 'yavne', 'kids', 'gates'])
    expect(boardView(board, heard)?.graded).toBe(true)
  })

  it('drops a placement of a scrap that is not on the table, or into a column that does not exist', () => {
    const board = NOTE_BOARDS['notebook-1990']!
    const state = stateWith('1990', { 'math:kobi': true, 'uc:heard': true })
    const cards = resolveCards(board, state)
    expect(cleanPlacements(board, cards, { ours: 'known', amit: 'rumour', gates: 'nowhere', table: 'known' })).toEqual({ ours: 'known', table: 'known' })
  })

  it('1990 — an honest note with two firm sources plants the journalist seed; the rumour that came true stays a rumour', () => {
    const board = NOTE_BOARDS['notebook-1990']!
    const state = stateWith('1990', { 'math:kobi': true, 'knows:radio': true, 'uc:heard': true })
    const cards = resolveCards(board, state)
    const honest = Object.fromEntries(cards.map((card) => [card.id, card.fits!]))
    expect(honest['gates']).toBe('rumour')
    const clean = settleWith(board, honest, state)
    expect(clean.events).toContainEqual({ t: 'flag.set', flag: 'life:1990:notebook', value: 'clean' })
    expect(clean.events).toContainEqual({ t: 'flag.raised', flag: 'life:journalist:seed' })
    expect(clean.after).toBe('net-note-kobi-1990')
    const wrong = settleWith(board, { ...honest, gates: 'known', ours: 'rumour', table: 'rumour' }, state)
    expect(wrong.events).toContainEqual({ t: 'flag.set', flag: 'life:1990:notebook', value: 'mixed' })
    expect(settleWith(board, {}, state).events).toContainEqual({ t: 'flag.set', flag: 'life:1990:notebook', value: 'blank' })
    expect(gradeOf(cards, honest).right).toBe(cards.length)
  })

  it('1995 — the lawyer\'s theory written as a fact is what the chapter keeps', () => {
    const board = NOTE_BOARDS['court-1995']!
    const state = stateWith('1995-sinai', { 's2:v:paper': true, 's2:v:freddy': true, 's2:v:fan': true })
    const out = settleWith(board, { table: 'fact', cover: 'fact', go: 'feeling', europe: 'claim' }, state)
    expect(out.events).toContainEqual({ t: 'flag.set', flag: 'life:sinai:ledger', value: 'certain' })
    expect(out.after).toBe('s2-court')
  })

  it('1998 — Soko\'s lists grade nothing and remember where the accusations went', () => {
    const board = NOTE_BOARDS['lists-1998']!
    const state = stateWith('1998-laces', { 'l1:inside': true, 'm98:laces': true })
    expect(boardView(board, state)?.graded).toBe(false)
    const flag = (placed: Record<string, string>) => settleWith(board, placed, state).events.find((e) => e.t === 'flag.set' && e.flag === 'life:laces:lists')
    expect(flag({ bought: 'know', pager: 'know' })).toMatchObject({ value: 'certain' })
    expect(flag({ bought: 'heard', pager: 'invent' })).toMatchObject({ value: 'strict' })
    expect(flag({ bought: 'know', pager: 'heard' })).toMatchObject({ value: 'torn' })
    expect(settleWith(board, {}, state).events).toContainEqual({ t: 'laces.marked', response: 'organizer' })
  })
})

describe('the decade reads what it wrote', () => {
  it('1993-cup — the seat on the ride is a decision with a cost, and the side gate is not a bus', () => {
    const sim = new WorldSim('1993-cup')
    sim.converse('ride-1993', pick('efi'))
    expect(sim.state.flags['life:1993:seat']).toBe('efi')
    const side = new WorldSim('1993-cup')
    side.engine.dispatch({ t: 'flag.raised', flag: 'in:sideGate' })
    side.converse('ride-1993', pick('efi'))
    expect(side.state.flags['life:1993:seat']).toBe('ofir')
  })

  it('1993-galil — after the horn: two problems before the bus, the third rides home unsolved, and April\'s seat is kept in May', () => {
    const sim = new WorldSim('1993-galil')
    sim.engine.dispatch({ t: 'flag.set', flag: 'life:1993:seat', value: 'efi' })
    sim.converse('g4-empties', seq('move', 'efi', 'kid'))
    expect(sim.state.flags['g4:p:efi']).toBe(true)
    expect(sim.state.flags['g4:p:kid']).toBe(true)
    expect(sim.state.flags['g4:p:gear']).toBeFalsy()
    // Efi kept the window for him — the NPC acts first
    expect(sim.state.flags['life:galil:seat']).toBe('efi')
    const other = new WorldSim('1993-galil')
    other.converse('g4-empties', seq('stay', 'gear', 'kid', 'shachor'))
    expect(other.state.flags['g4:p:efi']).toBeFalsy()
    expect(other.state.flags['life:galil:seat']).toBe('shachor')
  })

  it('1997 — Efi stands at the corner, and what he did after the loss is a proof and a value 1999 reads', () => {
    const room = sceneIn(SCENE['ussishkin-outside'], '1997-basket')
    expect(room.actors.some((actor) => actor.id === 'efi-hall97' && inEra(actor, '1997-basket'))).toBe(true)
    const sim = new WorldSim('1997-basket')
    sim.engine.dispatch({ t: 'flag.set', flag: 'life:galil:seat', value: 'efi' })
    sim.converse('efi-hall-97', pick())
    expect(sim.state.flags['h1:kept-spot']).toBe(true)
    sim.converse('h1-chain', pick('stay', 'efi'))
    expect(sim.state.flags['life:hall:1997']).toBe('stayed')
    expect(sim.state.flags['life:hall:walked']).toBe('efi')
    expect(sim.state.proofs.some((proof) => proof.kind === 'community_help')).toBe(true)
    const seed = new WorldSim('1999-basket')
    seed.engine.dispatch({ t: 'flag.set', flag: 'life:hall:1997', value: 'stayed' })
    seed.converse('seed-corner', WALK_AWAY)
    expect(seed.opened).toContain('seed-corner')
  })

  it('1999-cup — the stub from 1983 is only on offer to the boy who took it, and his father finds it in the hug', () => {
    const cold = new WorldSim('1999-cup')
    cold.converse('c99-box', pick('stub'))
    expect(cold.state.flags['c99:carry']).toBe('none')
    const sim = new WorldSim('1999-cup')
    sim.engine.dispatch({ t: 'flag.raised', flag: 'own:stub-1983' })
    sim.converse('c99-box', pick('stub'))
    expect(sim.state.flags['c99:carry']).toBe('stub')
    sim.converse('c99-kobi-hug', pick())
    expect(sim.state.flags['life:cup99:stub']).toBe(true)
    expect(sim.endings).toContain('together')
  })

  it('2000-title — the call home from a stranger\'s phone remembers who called first in 1990', () => {
    const sim = new WorldSim('2000-title')
    sim.engine.dispatch({ t: 'flag.set', flag: 'life:1990:called', value: 'first' })
    sim.converse('t-call', pick('call'))
    expect(sim.state.flags['life:title:call']).toBe('home')
    expect(sim.state.relationshipMemory.some((m) => m.characterId === 'rachel' && m.eventId === 'called-home-2000')).toBe(true)
  })

  it('1996 — a Saturday swapped in winter is called in at the kiosk in spring', () => {
    const sim = new WorldSim('1996-army')
    sim.engine.dispatch({ t: 'flag.raised', flag: 'life:swap:yaron' }, { t: 'flag.raised', flag: 'life:army:d5' })
    sim.converse('a5-kiosk', pick('repay'))
    expect(sim.state.flags['life:swap:repaid']).toBe(true)
    expect(sim.endings).toContain('home')
  })

  it('1990 — the payphone under the stand stands in the undercroft only after the whistle', () => {
    const room = STADIUM_ROOMS.find((r) => r.id === 'undercroft')!
    const phone = room.hotspots.find((spot) => spot.id === 'uc-phone')
    expect(phone?.act).toBe('uc-phone-1990')
    expect(phone?.when).toBeDefined()
  })
})

describe('1995 — the gate of spring 1996 ends in the room, whatever he did at it', () => {
  for (const act of ['s3-banner', 's3-watch', 'seven-gate96'] as const) {
    it(act, () => {
      const sim = new WorldSim('1995-sinai')
      handsFull(sim)
      sim.engine.dispatch({ t: 'flag.raised', flag: 'life:sinai:d2' }, { t: 'flag.raised', flag: 's2:done' }, { t: 'flag.raised', flag: 's2:poster' }, { t: 'flag.raised', flag: 'life:poster:wall' })
      sim.go('bedroom')
      sim.wait(1)
      expect(sim.location).toBe('bloomfield-outside')
      sim.beatAnswer = pick('around')
      sim.press(act, pick('paint', 'stand'))
      sim.wait(2)
      expect(['painted', 'watched', 'defended']).toContain(sim.state.flags['life:sinai:gate'])
      for (let i = 0; i < 20 && sim.endings.length === 0; i += 1) {
        sim.beatAnswer = pick('hold', 'memory', 'broken')
        sim.wait(15)
      }
      expect(sim.endings.length).toBeGreaterThan(0)
    })
  }
})
