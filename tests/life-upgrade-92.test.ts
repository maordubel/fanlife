import { describe, expect, it } from 'vitest'

import { chapterFor } from '@/lib/life/content/chapters'
import { eraFor } from '@/lib/life/content/era'
import { apply, emptyState as blankState, LEGACY_FLAG_ALIASES } from '@/lib/life/events'
import { DEFAULT_IDENTITY } from '@/lib/life/content/chapter1986'
import { DIALOGUE } from '@/lib/life/content/dialogue'
import { chosenOutfit, MATCH_RITUALS, PLAIN, ritualFor, ritualOptions, wearEvents } from '@/lib/life/matchRitual'
import type { DialogueChoice } from '@/lib/life/runtime/bus'
import { onSale, outfitFlag, SHIRTS, shirtFlag, wearingAt } from '@/lib/life/shirts'
import { directiveFor } from '@/lib/life/storyDirector'
import type { LifeState, LocationId } from '@/lib/life/types'
import { placeLabel } from '@/lib/life/world/labels'
import { MAP_PLACES } from '@/lib/life/map'
import {
  chapterAfter,
  relocateIfGone,
  sceneAlive,
  USSISHKIN,
  USSISHKIN_DEMOLITION_CHAPTER,
  USSISHKIN_PLACE_FLAG,
} from '@/lib/life/world/placeLifecycle'
import { ALL_SCENES, exitInEra, inEra, sceneIn, whenFor } from '@/lib/life/world/scenes'
import { meets } from '@/lib/life/world/types'
import { closureFor } from '@/lib/life/world/worldline'
import { CHAPTERS } from '@/lib/life/content/chapters'

import { WALK_AWAY, WorldSim } from './fixtures/lifeWorldSim'

/**
 * דלתא 92 — תוכנית השדרוג האינטגרטיבית (27.9.2026).
 *
 * Four shared mechanisms, and each is held here by what a player would notice if it broke:
 *  · the Story Director — A2 is a DILEMMA with two destinations and no arrow;
 *  · Stage A — Efi is not in A2, is met in A3, and gets one recovery in A4;
 *  · the Pre-Match Ritual — owned, existing shirts only; one event; no buff;
 *  · World Lifecycle — after 25.7.2007 no door, goal or map pin can send him into the hall.
 */

function pick(...ids: string[]) {
  return (choices: readonly DialogueChoice[]) => {
    const open = choices.filter((choice) => choice.enabled)
    for (const id of ids) if (open.some((choice) => choice.id === id)) return id
    return open[0]?.id ?? WALK_AWAY
  }
}

function start(chapter: string, answer: ReturnType<typeof pick>, seed: Record<string, boolean | string | number> = {}): WorldSim {
  const sim = new WorldSim(chapter)
  const entries = Object.entries(seed)
  if (entries.length) sim.engine.dispatch(...entries.map(([flag, value]) => ({ t: 'flag.set' as const, flag, value })))
  sim.beatAnswer = answer
  sim.go(sim.location)
  return sim
}

const actorsIn = (sceneId: string, chapter: string) => {
  const base = ALL_SCENES.find((s) => s.id === sceneId)!
  return sceneIn(base, chapter).actors.filter((a) => inEra(a, chapter))
}

const emptyState = () => blankState(DEFAULT_IDENTITY, 1986)
const stateWith = (chapter: string, flags: Record<string, boolean | string | number> = {}): LifeState =>
  ({ ...emptyState(), chapter, flags }) as LifeState

// ================================================================== A2 · staging --

describe('A2 — the dilemma is staged in the world, not in one room', () => {
  it('no Efi anywhere in A2', () => {
    for (const scene of ALL_SCENES) {
      for (const actor of actorsIn(scene.id, 'a2-alley')) expect(actor.figure === 'efi' || actor.talk === 'efi-a2', `${scene.id}/${actor.id}`).toBe(false)
    }
  })

  it('the kiosk is Rafi\'s; Ofir and Amit are on the pitch', () => {
    const kiosk = actorsIn('kiosk', 'a2-alley').map((a) => a.id)
    expect(kiosk).toContain('rafi-a2')
    expect(kiosk.some((id) => id.startsWith('ofir') || id.startsWith('amit'))).toBe(false)
    const pitch = actorsIn('pitch', 'a2-alley').map((a) => a.id)
    expect(pitch).toEqual(expect.arrayContaining(['ofir-a2', 'amit-a2']))
  })

  it('the director says DILEMMA: the kiosk and the pitch, at the same weight', () => {
    const d = directiveFor({ state: stateWith('a2-alley', { 'life:a:d2': true }), scene: 'home' as LocationId })
    expect(d?.mode).toBe('DILEMMA')
    expect(d?.destinations?.map((x) => x.to)).toEqual(['kiosk', 'pitch'])
    // no right answer: every destination carries a reason, none carries a rank
    for (const dest of d?.destinations ?? []) expect(dest.reasonHe.length).toBeGreaterThan(0)
  })

  it('once one reason is gone it is no longer a dilemma', () => {
    const bread = directiveFor({ state: stateWith('a2-alley', { 'life:a:d2': true, 'a2:errand': true, 'a2:bread': true }), scene: 'kiosk' as LocationId })
    expect(bread?.mode).not.toBe('DILEMMA')
    const full = directiveFor({ state: stateWith('a2-alley', { 'life:a:d2': true, 'a2:full': true }), scene: 'street' as LocationId })
    expect(full?.mode).not.toBe('DILEMMA')
  })

  it('kiosk-first: bread, then the alley in time', () => {
    const sim = start('a2-alley', pick('ok', 'play'))
    sim.press('rachel-a2', pick('ok'))
    sim.go('kiosk')
    sim.press('bread-a2', pick())
    expect(sim.state.flags['a2:bread']).toBe(true)
    sim.go('pitch')
    expect(sim.press('ofir-a2', pick('play'))).toBe(true)
    expect(sim.state.flags['a2:played']).toBe(true)
    sim.go('home')
    expect(sim.endings).toEqual(['played'])
  })

  it('pitch-first: the game, and the bread missed is a consequence at home', () => {
    const sim = start('a2-alley', pick('five', 'play'))
    sim.press('rachel-a2', pick('five'))
    sim.go('pitch')
    sim.press('ofir-a2', pick('play'))
    sim.go('home')
    expect(sim.endings).toEqual(['played'])
    expect(sim.state.flags['a2:bread']).toBeFalsy()
  })

  it('miss football: the teams fill on the clock, and the day still ends', () => {
    const sim = start('a2-alley', pick('ok'))
    sim.press('rachel-a2', pick('ok'))
    for (let i = 0; i < 6 && !sim.state.flags['a2:full']; i += 1) sim.wait(10)
    expect(sim.state.flags['a2:full']).toBe(true)
    sim.go('pitch')
    sim.press('ofir-a2', pick())
    expect(sim.endings).toEqual(['late'])
  })
})

// ======================================================= A3 / A4 · Efi, with recovery --

describe('Efi — met in A3, recovered in A4', () => {
  it('A3 is on every life now', () => {
    expect(chapterFor('a3-hall')?.when ?? []).toEqual([])
  })

  it('A3: asking about the ball meets him and teaches the hall', () => {
    const sim = start('a3-hall', pick('ball'))
    sim.press('efi-a3-stranger', pick('ball'))
    expect(sim.state.flags['life:efi:met']).toBe(true)
    expect(sim.state.flags['life:knows:hall']).toBe(true)
  })

  it('A3: "not now" defers, closes the evening on the street, and locks nothing', () => {
    const sim = start('a3-hall', pick('not-now'))
    sim.press('efi-a3-stranger', pick('not-now'))
    expect(sim.state.flags['life:efi:deferred']).toBe(true)
    expect(sim.state.flags['life:efi:met']).toBeFalsy()
    sim.wait(5)
    expect(sim.endings).toEqual(['street'])
  })

  it('A4: the deferred boy meets Efi by the kiosk — and a second no holds without a softlock', () => {
    const yes = start('a4-shirt', pick(), { 'life:efi:deferred': true })
    yes.go('street')
    expect(yes.find('efi-a4')).toBeDefined()
    yes.press('efi-a4', pick('where'))
    expect(yes.state.flags['life:efi:met']).toBe(true)
    expect(yes.state.flags['life:knows:hall']).toBe(true)
    expect(yes.find('efi-a4')).toBeUndefined()

    const no = start('a4-shirt', pick(), { 'life:efi:deferred': true })
    no.go('street')
    no.press('efi-a4', pick('no'))
    expect(no.state.flags['life:efi:declined']).toBe(true)
    expect(no.find('efi-a4')).toBeUndefined()
    // the chapter's own spine is untouched by the answer
    expect(no.state.flags['life:efi:met']).toBeFalsy()
  })

  it('an old log that answered Efi in A2 is read as having met him', () => {
    expect(LEGACY_FLAG_ALIASES['life:a2:efi']).toBe('life:efi:met')
    const state = apply(emptyState(), { t: 'flag.raised', flag: 'life:a2:efi' })
    expect(state.flags['life:efi:met']).toBe(true)
  })
})

// ============================================================== Pre-Match Ritual --

describe('Pre-Match Ritual — the same wardrobe, before the match', () => {
  const first = SHIRTS.find((s) => onSale('a5-first').some((x) => x.id === s.id))!

  it('asks nothing of a life with no shirt', () => {
    expect(ritualFor(stateWith('1986'), '1986')).toBeNull()
  })

  it('offers owned shirts that already existed — never a later season', () => {
    const later = SHIRTS.find((s) => !onSale('1986').some((x) => x.id === s.id))!
    const state = stateWith('1986', { [shirtFlag(first.id)]: true, [shirtFlag(later.id)]: true })
    const ids = ritualOptions(state, '1986').map((s) => s.id)
    expect(ids).toContain(first.id)
    expect(ids).not.toContain(later.id)
    expect(ritualFor(state, '1986')).not.toBeNull()
  })

  it('a choice is one flag and nothing else — no luck, no love, no buff', () => {
    const state = stateWith('1986', { [shirtFlag(first.id)]: true })
    const events = wearEvents(state, '1986', first.id)
    expect(events).toEqual([{ t: 'flag.set', flag: outfitFlag('1986'), value: first.id }])
    // a forged pick is refused
    expect(wearEvents(state, '1986', 'not-a-shirt')).toEqual([])
  })

  it('the day named after the shirt does not take "no shirt"', () => {
    const state = stateWith('a5-first', { [shirtFlag(first.id)]: true })
    expect(MATCH_RITUALS['a5-first']?.allowPlain).toBe(false)
    expect(wearEvents(state, 'a5-first', PLAIN)).toEqual([])
  })

  it('what he chose is what he wore', () => {
    const state = stateWith('1986', { [shirtFlag(first.id)]: true, [outfitFlag('1986')]: first.id })
    expect(chosenOutfit(state, '1986')).toMatchObject({ id: first.id })
    expect(wearingAt(state, [], '1986')?.id).toBe(first.id)
    const plain = stateWith('1986', { [shirtFlag(first.id)]: true, [outfitFlag('1986')]: PLAIN })
    expect(wearingAt(plain, [{ t: 'flag.raised', flag: shirtFlag(first.id) }], '1986')).toBeNull()
  })

  it('the director puts the wardrobe before everything else, once', () => {
    const state = stateWith('1986', { [shirtFlag(first.id)]: true })
    expect(directiveFor({ state, scene: 'bedroom' as LocationId })?.mode).toBe('PRE_MATCH')
    const chosen = stateWith('1986', { [shirtFlag(first.id)]: true, [outfitFlag('1986')]: first.id })
    expect(directiveFor({ state: chosen, scene: 'bedroom' as LocationId })?.mode).not.toBe('PRE_MATCH')
  })

  it('every ritual chapter is a real chapter', () => {
    for (const id of Object.keys(MATCH_RITUALS)) expect(chapterFor(id), id).not.toBeNull()
  })
})

// ================================================================ World Lifecycle --

describe('World Lifecycle — after 25.7.2007 the hall is gone', () => {
  const after = CHAPTERS.filter((c) => chapterAfter(c.id, USSISHKIN_DEMOLITION_CHAPTER)).map((c) => c.id)

  it('before: the door exists; in the demolition chapter: until Beat 7; after: never', () => {
    const allenby = ALL_SCENES.find((s) => s.id === 'allenby')!
    const door = allenby.exits.find((e) => e.to === 'ussishkin-outside')!
    expect(exitInEra(door, '1991')).toBe(true)
    const before = stateWith(USSISHKIN_DEMOLITION_CHAPTER, { 'life:knows:hall': true })
    expect(meets(before, whenFor(door, USSISHKIN_DEMOLITION_CHAPTER))).toBe(true)
    const gone = stateWith(USSISHKIN_DEMOLITION_CHAPTER, { 'life:knows:hall': true, [USSISHKIN_PLACE_FLAG]: 'demolished' })
    expect(meets(gone, whenFor(door, USSISHKIN_DEMOLITION_CHAPTER))).toBe(false)
    for (const chapter of after) expect(exitInEra(door, chapter), chapter).toBe(false)
  })

  it('no chapter after the demolition can reach, aim at, or be directed into the hall', () => {
    for (const chapter of after) {
      const closure = closureFor(chapter, { 'life:knows:hall': true })
      for (const room of USSISHKIN.scenes) expect(closure.rooms.has(room), `${chapter} reaches ${room}`).toBe(false)
      const flags = Object.fromEntries([...closure.flags].map((f) => [f, true]))
      const state = stateWith(chapter, { ...flags, 'life:knows:hall': true })
      const goal = eraFor(chapter).goal?.(state) ?? null
      if (goal) expect(sceneAlive(state, goal), `${chapter} goal → ${goal}`).toBe(true)
      for (const dest of directiveFor({ state, scene: 'allenby' as LocationId })?.destinations ?? []) {
        expect(USSISHKIN.scenes.includes(dest.to), `${chapter} director → ${dest.to}`).toBe(false)
      }
    }
  })

  it('the pin stays, and says what it is now', () => {
    const pin = MAP_PLACES.find((p) => p.id === 'ussishkin')!
    const state = stateWith(after[0]!, { 'life:knows:hall': true })
    expect(placeLabel(pin, state).labelHe).toBe('אוסישקין הי"ד')
    expect(placeLabel(pin, stateWith('1991', { 'life:knows:hall': true })).labelHe).not.toBe('אוסישקין הי"ד')
  })

  it('a save standing inside is moved out once, with a line — never the scene again', () => {
    const state = stateWith(after[0]!, {})
    expect(relocateIfGone(state, 'ussishkin-hall')).toEqual({ to: 'allenby', noticeHe: 'המקום הזה כבר איננו.' })
    expect(relocateIfGone(stateWith('1991'), 'ussishkin-hall')).toBeNull()
  })

  it('the demolition gives nothing: no money, no skill, no proof, no Red Heart in the choice', () => {
    const choices = DIALOGUE['u-loss']!.branches.flatMap((b) => b.choices ?? [])
    expect(choices.length).toBeGreaterThanOrEqual(5)
    for (const choice of choices) {
      for (const effect of choice.then ?? []) {
        expect(['money', 'skill', 'proof', 'redheart', 'wellbeing'].includes(effect.e), `${choice.id}: ${effect.e}`).toBe(false)
      }
    }
  })
})
