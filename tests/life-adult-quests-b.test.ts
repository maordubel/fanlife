import { describe, expect, it } from 'vitest'

import * as C2011 from '@/lib/life/content/chapter2011family'
import * as C2012 from '@/lib/life/content/chapter2012growth'
import * as C2015 from '@/lib/life/content/chapter2015newhall'
import * as C2016 from '@/lib/life/content/chapter2016collapse'
import * as C2018 from '@/lib/life/content/chapter2018return'
import * as C2021 from '@/lib/life/content/chapter2021promises'
import * as C2023 from '@/lib/life/content/chapter2023late'
import * as C2026 from '@/lib/life/content/chapter2026finale'
import { DIALOGUE } from '@/lib/life/content/dialogue'
import { RIDES, RIDE_PREFIX } from '@/lib/life/content/passages'
import type { Conversation } from '@/lib/life/content/script'
import { STORY_CHORES } from '@/lib/life/content/storyChores'
import type { LifeEvent } from '@/lib/life/events'
import type { DialogueChoice } from '@/lib/life/runtime/bus'
import { meets } from '@/lib/life/world/types'
import { SCENE, exitInEra, needsFor, sceneIn, whenFor } from '@/lib/life/world/scenes'
import { eraFor } from '@/lib/life/content/era'
import type { LocationId } from '@/lib/life/types'

import { HAND_VERBS, WALK_AWAY, WorldSim, type Thing } from './fixtures/lifeWorldSim'

/**
 * המבוגר עושה — LIFE 90-E (25.9.2026), `NARRATIVE-QUEST-DESIGN-PASS-v2` §7 Stage D/E, §13, §15.
 *
 * Every adult feature quest this pass converted, walked three ways in the headless world
 * (`fixtures/lifeWorldSim.ts`, the real engine and dialogue runner over the rooms of
 * `scenes.ts`):
 *
 *  · **Golden** — the intended route, and what it proves in the log;
 *  · **Messy** — late, short on money, partial work, a lie, a changed mind: still a life,
 *    never a Game Over, and the dialogue answers what was DONE, not what was said;
 *  · **Confused** — a player who only knows what the room shows him (four temperaments,
 *    the same walker as `life-confused-player`), who still reaches the end.
 *
 * And §11.4 as a detector: no choice in these chapters may claim work (time + skill/proof)
 * unless it is gated on something the hands did, or is named below with the reason it is a
 * conversation and not a claim.
 */

// ------------------------------------------------------------------ helpers ------

const pick =
  (...ids: string[]) =>
  (choices: readonly DialogueChoice[]) =>
    ids.find((id) => choices.some((c) => c.id === id && c.enabled)) ?? choices.find((c) => c.enabled)?.id ?? WALK_AWAY

/** the played scenes: a chore done to `share` of its target, a ride ridden, a football match played */
function playScenes(sim: WorldSim, share: number, answer: (choices: readonly DialogueChoice[]) => string) {
  sim.onMinigame = (id, world) => {
    if (id === 'football') {
      world.engine.dispatch({ t: 'flag.raised', flag: 'played:football' })
      world.go('pitch')
      return
    }
    if (id.startsWith('chore:story:')) {
      const chore = STORY_CHORES[id.slice('chore:story:'.length)]
      if (!chore) return
      const events = chore.finish(Math.round(chore.shape.target * share), chore.shape.target)
      if (events.length) world.engine.dispatch(...events)
      world.go(chore.where)
      return
    }
    if (id.startsWith(RIDE_PREFIX)) {
      const ride = RIDES[id.slice(RIDE_PREFIX.length)]
      if (!ride) return
      for (const stop of ride.stops) {
        world.streak = 0
        if (stop.conversation) world.converse(stop.conversation, answer)
      }
      for (const flag of ride.flags) world.engine.dispatch({ t: 'flag.raised', flag })
      world.go(ride.land.mapId as never)
    }
  }
}

function seed(sim: WorldSim, flags: Record<string, boolean | string | number>, agorot = 0) {
  const events: LifeEvent[] = Object.entries(flags).map(([flag, value]) => ({ t: 'flag.set', flag, value }))
  if (agorot) events.push({ t: 'money.changed', agorot, why: 'test' })
  if (events.length) sim.engine.dispatch(...events)
}

/** out of the room and back in — the way a player re-arms a beat he walked away from */
function reenter(sim: WorldSim, out: string, back: string) {
  expect(sim.exit(out), `exit ${out} from ${sim.location}`).toBe(true)
  expect(sim.exit(back), `exit ${back} from ${sim.location}`).toBe(true)
}

const proofIds = (sim: WorldSim) => (sim.state as unknown as { proofs?: Array<{ proofId: string }> }).proofs?.map((p) => p.proofId) ?? []
const hasProof = (sim: WorldSim, prefix: string) => JSON.stringify(sim.state).includes(prefix)

// ------------------------------------------------------------ the confused walker ------

type Temper = 'first' | 'last' | 'hesitant' | 'hands'

function confused(chapter: string, temper: Temper, prime?: (sim: WorldSim) => void, budget = 500): { sim: WorldSim; path: string[] } {
  const sim = new WorldSim(chapter)
  prime?.(sim)
  const asked = new Map<string, number>()
  const answerFor = (id: string) => (choices: readonly DialogueChoice[]) => {
    const open = choices.filter((c) => c.enabled)
    if (!open.length) return WALK_AWAY
    const times = asked.get(id) ?? 0
    asked.set(id, times + 1)
    if (temper === 'hesitant' && times === 0) return WALK_AWAY
    return (temper === 'last' ? open[open.length - 1] : open[0])!.id
  }
  playScenes(sim, temper === 'last' ? 0 : temper === 'hands' ? 1 : 0.5, answerFor('ride'))
  const beatAsked = new Map<string, number>()
  sim.beatAnswer = (choices) => {
    const key = choices.map((c) => c.id).join('|')
    const times = beatAsked.get(key) ?? 0
    beatAsked.set(key, times + 1)
    if (times === 0) return WALK_AWAY
    const open = choices.filter((c) => c.enabled)
    if (!open.length) return WALK_AWAY
    return (temper === 'last' ? open[open.length - 1] : open[0])!.id
  }
  const rank = (t: Thing) => (t.kind === 'spot' && HAND_VERBS.has(t.verb) ? 0 : t.kind === 'actor' ? 1 : 2)
  const pressed = new Set<string>()
  const walked = new Map<string, number>()
  const path: string[] = [sim.location]
  const key = () => String(Object.entries(sim.state.flags).filter(([k, v]) => v !== false && !k.startsWith('beat:') && !k.startsWith('own:heard:')).length)
  for (let step = 0; step < budget && sim.endings.length === 0; step += 1) {
    const here = sim.location
    const things = temper === 'hands' ? [...sim.things()].sort((a, b) => rank(a) - rank(b)) : sim.things()
    // a player who walked away from something tries it again when he comes back to the room
    const visit = path.filter((room) => room === here).length
    const fresh = things.find((t) => t.kind !== 'exit' && !pressed.has(`${here}|${t.id}|${key()}|${visit}`))
    if (fresh && fresh.kind !== 'exit') {
      pressed.add(`${here}|${fresh.id}|${key()}|${visit}`)
      sim.press(fresh.id, answerFor(fresh.act))
      if (sim.location !== here) path.push(sim.location)
      sim.wait(1)
      continue
    }
    const doors = things.filter((t): t is Extract<Thing, { kind: 'exit' }> => t.kind === 'exit' && !t.locked)
    // the arrow on the HUD (`era.goal` → `aimForGoal`) is something the game itself teaches
    const toward = doors.find((d) => d.to === firstStep(sim, here))
    if (toward && (walked.get(`${here}>${toward.to}`) ?? 0) < 6) {
      walked.set(`${here}>${toward.to}`, (walked.get(`${here}>${toward.to}`) ?? 0) + 1)
      sim.exit(toward.id)
      path.push(sim.location)
      sim.wait(2)
      continue
    }
    if (doors.length) {
      doors.sort((a, b) => (walked.get(`${here}>${a.to}`) ?? 0) - (walked.get(`${here}>${b.to}`) ?? 0))
      const door = doors[0]!
      walked.set(`${here}>${door.to}`, (walked.get(`${here}>${door.to}`) ?? 0) + 1)
      sim.exit(door.id)
      path.push(sim.location)
      sim.wait(2)
      continue
    }
    sim.wait(20)
  }
  return { sim, path }
}

/** the first room on the shortest open way to where the chapter's arrow points */
function firstStep(sim: WorldSim, from: LocationId): LocationId | null {
  const goal = eraFor(sim.chapter).goal?.(sim.state) ?? null
  if (!goal || goal === from) return null
  const prev = new Map<string, string>([[from, '']])
  const queue: string[] = [from]
  while (queue.length) {
    const room = queue.shift()!
    const base = SCENE[room as keyof typeof SCENE]
    if (!base) continue
    for (const exit of sceneIn(base, sim.chapter).exits) {
      if (!exitInEra(exit, sim.chapter) || !meets(sim.state, whenFor(exit, sim.chapter)) || !meets(sim.state, needsFor(exit, sim.chapter))) continue
      if (prev.has(exit.to)) continue
      prev.set(exit.to, room)
      if (exit.to === goal) {
        let step: string = exit.to
        while (prev.get(step) !== from) step = prev.get(step)!
        return step as LocationId
      }
      queue.push(exit.to)
    }
  }
  return null
}

const TEMPERS: Temper[] = ['first', 'last', 'hesitant', 'hands']

// ================================================================ 2016 ============

describe('2016 · the crisis — verify, commit, deliver, return with the count', () => {
  function toDeliveries(answer: (choices: readonly DialogueChoice[]) => string, repeat: string) {
    const sim = new WorldSim('2016-crisis')
    sim.beatAnswer = answer
    reenter(sim, 'out', 'kiosk')
    expect(sim.state.flags['p:info']).toBe('checking')
    return { sim, repeat }
  }

  it('Golden — two sources, only the fact passed on, three parcels by hand (one re-routed), proof earned', () => {
    const { sim } = toDeliveries(pick('verify', 'ask', 'three', 'keep', 'exact'), 'fact')
    // the fact cannot be passed on before both sources are seen
    sim.press('p-repeat', 'fact')
    expect(sim.state.flags['p:info']).toBe('checking')
    sim.press('p-src-doc', 'go')
    sim.press('p-src-news', 'go')
    sim.press('p-repeat', 'fact')
    expect(sim.state.flags['life:crisis:repeat']).toBe('verified')
    expect(sim.state.flags['p:src:rumour']).toBeFalsy()
    reenter(sim, 'out', 'pitch')
    expect(sim.state.flags['p:till']).toBeTruthy()
    reenter(sim, 'back', 'community')
    expect(sim.state.flags['p:commit']).toBe(3)
    // no work was claimed by the commitment itself
    expect(hasProof(sim, 'crisis_delivery')).toBe(false)
    sim.exit('out')
    sim.press('p-drop-a', 'carry') // the complication: Shlomo is at his daughter's, over the café
    expect(sim.state.flags['p:a-moved']).toBe(true)
    sim.exit('pitch')
    sim.press('p-drop-b', 'go')
    sim.exit('back')
    sim.exit('centre')
    sim.press('p-drop-a2', 'go')
    sim.press('p-drop-c', 'go')
    expect(sim.state.flags['p:n3']).toBe(true)
    sim.exit('home')
    sim.exit('community') // Matuki asks by himself: nothing left in the hands
    expect(sim.state.flags['p:deliver']).toBe(true)
    expect(sim.state.flags['life:crisis:handed']).toBe(3)
    expect(hasProof(sim, 'crisis_delivery:2016-crisis:three')).toBe(true)
    sim.wait(20)
    expect(sim.endings.length).toBe(1)
  })

  it('Messy — the rumour passed on, one parcel left with a neighbour, one delivered, and a lie the log answers', () => {
    const { sim } = toDeliveries(pick('verify', 'take', 'three', 'out', 'all'), 'rumour')
    sim.press('p-src-rumour', 'go')
    sim.press('p-repeat', 'rumour')
    expect(sim.state.flags['life:crisis:repeat']).toBe('rumour')
    reenter(sim, 'out', 'pitch')
    reenter(sim, 'back', 'community')
    sim.exit('out')
    sim.press('p-drop-a', 'neighbor')
    sim.exit('pitch')
    sim.press('p-drop-b', 'go')
    sim.exit('back')
    sim.exit('community')
    // two parcels still out (c) — Matuki does not ask by himself; the player returns early
    expect(sim.state.flags['p:deliver']).toBeFalsy()
    const honesty = sim.state.personality.honesty
    sim.press('p-report', 'all')
    expect(sim.state.flags['p:deliver']).toBe(true)
    expect(sim.state.flags['life:crisis:handed']).toBe(1)
    expect(sim.state.flags['p:claimed']).toBe('all')
    expect(sim.state.personality.honesty).toBeLessThan(honesty)
    expect(hasProof(sim, 'crisis_delivery')).toBe(false)
    sim.wait(20)
    expect(sim.endings.length).toBe(1)
  })

  it('Messy — committed to one and never came back: Matuki phones at nine, and the evening still ends', () => {
    const sim = new WorldSim('2016-crisis')
    sim.beatAnswer = pick('pause', 'leave', 'one', 'compute', 'exact')
    reenter(sim, 'out', 'kiosk')
    reenter(sim, 'out', 'pitch')
    reenter(sim, 'back', 'community')
    expect(sim.state.flags['p:commit']).toBe(1)
    sim.exit('out')
    sim.wait(60 * 5)
    expect(sim.state.flags['p:deliver']).toBe(true)
    expect(sim.state.flags['life:crisis:handed']).toBe(0)
    sim.wait(20)
    expect(sim.endings.length).toBe(1)
  })

  for (const temper of TEMPERS) {
    it(`Confused · ${temper} — reaches the end of the evening`, () => {
      const { sim, path } = confused('2016-crisis', temper)
      expect(sim.endings.length, `${path.slice(-12).join(' → ')}\n${sim.trace.slice(0,40).join(' | ')}`).toBe(1)
    })
  }

  it('2018 remembers what the 2016 log proves', () => {
    const lines = (flags: Record<string, string | number>) => {
      const sim = new WorldSim('2018-return')
      seed(sim, flags)
      const branch = DIALOGUE['r-back']!.branches.find((b) => meets(sim.state, b.when))
      return branch!.lines.map((l) => l.text).join(' ')
    }
    expect(lines({ 'life:crisis:handed': 3 })).toContain('שלמה')
    expect(lines({ 'life:crisis:repeat': 'rumour' })).toContain('אין קבוצה')
    expect(lines({})).not.toContain('שלמה')
  })
})

// ================================================================ 2023 ============

describe('2023 · the tournament — squad, a dropout, the bag, who sits out, the match', () => {
  function start(answer: (choices: readonly DialogueChoice[]) => string, share = 1) {
    const sim = new WorldSim('2023-tournament')
    sim.beatAnswer = answer
    playScenes(sim, share, answer)
    reenter(sim, 'back', 'pitch')
    return sim
  }

  it('Golden — plays, invites, replaces the dropout, packs the bag, sits out first, plays: the rotation is proven after it happened', () => {
    const sim = start(pick('play', 'roma', 'caption', 'concrete'))
    expect(sim.state.flags['z:tournament']).toBe('player')
    expect(hasProof(sim, 'accepted_rotation')).toBe(false)
    sim.press('z-phone', 'go')
    sim.wait(2)
    expect(sim.state.flags['z:sub']).toBe('roma')
    sim.press('z-bag', 'collect')
    expect(sim.state.flags['z:kit']).toBe('full')
    sim.press('z-lineup', 'me')
    expect(sim.state.flags['played:football']).toBe(true)
    expect(sim.state.flags['z:after']).toBe(true)
    expect(hasProof(sim, 'accepted_rotation:2023-tournament:tournament')).toBe(true)
    sim.wait(5)
    expect(sim.state.flags['z:derby']).toBeTruthy()
    sim.exit('back')
    sim.exit('community')
    expect(sim.endings.length).toBe(1)
  })

  it('Golden (a parent) — the son comes in for the dropout, and stands on the pitch', () => {
    const sim = new WorldSim('2023-tournament')
    seed(sim, { 'life:child': true })
    const answer = pick('play', 'child', 'caption', 'observer')
    sim.beatAnswer = answer
    playScenes(sim, 1, answer)
    reenter(sim, 'back', 'pitch')
    sim.press('z-phone', 'go')
    sim.wait(2)
    expect(sim.state.flags['z:sub']).toBe('child')
    sim.press('z-bag', 'collect')
    sim.press('z-lineup', 'ofir')
    expect(sim.state.flags['life:tournament:sub']).toBe('child')
    expect(hasProof(sim, 'accepted_rotation')).toBe(false)
  })

  it('Messy — coaches from the line, plays four, the bag left shut: no football, no rotation proof, the evening goes on', () => {
    const sim = start(pick('support', 'short', 'boundary', 'observer'), 0)
    sim.press('z-phone', 'go')
    sim.wait(2)
    expect(sim.state.flags['z:sub']).toBe('short')
    sim.press('z-bag', 'as-is')
    expect(sim.state.flags['z:kit']).toBe('none')
    sim.press('z-lineup', 'coach')
    expect(sim.state.flags['played:football']).toBeFalsy()
    expect(sim.state.flags['z:after']).toBe(true)
    expect(hasProof(sim, 'accepted_rotation')).toBe(false)
    sim.wait(5)
    sim.exit('back')
    sim.exit('community')
    expect(sim.endings.length).toBe(1)
  })

  it('Messy — only comes for the after: the tournament is skipped, the derby still comes', () => {
    const sim = start(pick('social', 'share', 'question'))
    expect(sim.things().some((t) => t.id === 'z-phone')).toBe(false)
    sim.wait(5)
    expect(sim.state.flags['z:derby']).toBeTruthy()
  })

  for (const temper of TEMPERS) {
    it(`Confused · ${temper} — reaches the meeting`, () => {
      const { sim, path } = confused('2023-tournament', temper)
      expect(sim.endings.length, `${path.slice(-12).join(' → ')}\n${sim.trace.slice(0,40).join(' | ')}`).toBe(1)
    })
  }
})

describe('2023 · the quiet — protected as a vignette', () => {
  it('"not now" costs nothing and pays nothing — a flag and a line, and the evening goes on', () => {
    const choice = DIALOGUE['z-aid']!.branches[0]!.choices!.find((c) => c.id === 'not-now')!
    expect(choice.then.map((e) => e.e).sort()).toEqual(['flag', 'flagValue', 'toast'])
  })
  it('no score, no stat for grief: nothing in the memorial message raises a skill, a proof or a relationship', () => {
    for (const choice of DIALOGUE['z-aid']!.branches[0]!.choices!) {
      expect(choice.then.some((e) => ['skill', 'proof', 'heard', 'rel', 'personality', 'redheart', 'minigame'].includes(e.e)), choice.id).toBe(false)
    }
  })
  for (const temper of TEMPERS) {
    it(`Confused · ${temper} — reaches the end`, () => {
      const { sim } = confused('2023-quiet', temper)
      expect(sim.endings.length).toBe(1)
    })
  }
})

// ================================================================ 2026 ============

type Path = { name: string; flags: Record<string, boolean | string | number>; agorot: number }
const PATHS: Path[] = [
  { name: 'ordinary', flags: {}, agorot: 400_000 },
  { name: 'owner', flags: { 'own:route:OWNER:entry': true, 'own:route:OWNER:practice': true }, agorot: 600_000 },
  { name: 'founder', flags: { 'own:route:USSISHKIN_FOUNDER:entry': true, 'own:route:USSISHKIN_FOUNDER:practice': true }, agorot: 400_000 },
  { name: 'leader', flags: { 'own:route:ULTRAS:entry': true, 'own:route:ULTRAS:practice': true }, agorot: 400_000 },
  { name: 'journalist', flags: { 'own:route:JOURNALIST:entry': true }, agorot: 400_000 },
  { name: 'abroad', flags: { 'life:abroad': true, 'life:finale:reunionOffered': true, 'life:distance': true }, agorot: 400_000 },
  { name: 'armchair', flags: { 'life:armchair': true }, agorot: 150_000 },
  { name: 'parent', flags: { 'life:child': true, 'life:partner': 'dor' }, agorot: 600_000 },
  { name: 'broke', flags: {}, agorot: 0 },
]

/** the plan, walked with the hands: money at the kiosk, the pace in the street, the ticket office, the snag, Dad */
function planFor(path: Path, answer: (choices: readonly DialogueChoice[]) => string, route: string) {
  const sim = new WorldSim('2026-plan')
  seed(sim, path.flags, path.agorot)
  sim.beatAnswer = answer
  reenter(sim, 'out', 'kiosk')
  expect(sim.state.flags['f:money'], `${path.name}: budget`).toBeTruthy()
  sim.exit('out')
  sim.press('f-pace-seen', 'go')
  if (sim.state.flags['f:funding'] !== 'preparation') {
    sim.exit('centre')
    sim.exit('tickets')
    if (sim.find('f-call-child')) sim.press('f-call-child', 'go')
    sim.press('f-counter', answer)
    sim.press('f-routes', route)
    sim.wait(2)
    expect(sim.state.flags['f:sheet'], `${path.name}: the plan exists`).toBe(true)
    sim.exit('back')
    sim.exit('home')
  }
  sim.exit('home')
  expect(sim.endings.length, `${path.name}: shown to Dad`).toBe(1)
  return sim
}

function finaleAfter(plan: WorldSim, answer: (choices: readonly DialogueChoice[]) => string) {
  const sim = new WorldSim('2026-finale')
  const carried = Object.fromEntries(Object.entries(plan.state.flags).filter(([k]) => k.startsWith('life:') || k.startsWith('own:')))
  seed(sim, carried as Record<string, boolean | string | number>)
  sim.beatAnswer = answer
  playScenes(sim, 1, answer)
  reenter(sim, 'back', 'busStation')
  for (let guard = 0; guard < 12 && !sim.endings.length; guard += 1) {
    const here = sim.location
    const next = { 'bus-station': 'flight', 'port-europe': 'bus', 'arena-out': 'in', 'arena-seats': 'out' }[here as string]
    if (!next || !sim.exit(next)) break
  }
  return sim
}

describe('2026 · the plan — budget, party, tickets, a route for Kobi, a snag, and only then Dad', () => {
  it('Golden — two tickets, the slow road that costs money, the café when the room is late: Kobi reads the plan', () => {
    const answer = pick('two', 'cafe', 'family', 'together', 'let', 'arm', 'present', 'father')
    // two seats (3,600) and the taxi and the room (450) — the slow road costs real money
    const plan = planFor({ name: 'ordinary+', flags: {}, agorot: 420_000 }, answer, 'rest')
    expect(plan.state.flags[C2026.ROUTE]).toBe('rest')
    expect(plan.state.flags[C2026.SNAG]).toBe('cafe')
    expect(plan.state.flags[C2026.PARTY]).toBe('two')
    expect(plan.opened).toContain('f-snag')
    const finale = finaleAfter(plan, answer)
    expect(finale.endings).toEqual(['together'])
    expect(finale.state.flags[C2026.PACE]).toBe('arm')
    expect(finale.state.flags['f:led']).toBe(true)
  })

  it('Dad is not shown a plan that does not exist: entering home before the ticket office starts nothing', () => {
    const sim = new WorldSim('2026-plan')
    seed(sim, {}, 400_000)
    sim.beatAnswer = pick('two')
    reenter(sim, 'out', 'kiosk')
    sim.exit('out')
    sim.exit('home')
    expect(sim.opened).not.toContain('f-plan')
    expect(sim.endings.length).toBe(0)
  })

  it('Messy — the fast road and "we will make it": the day tests it, the bench costs the bus, Kobi remembers', () => {
    const answer = pick('share', 'two', 'hurry', 'family', 'together', 'take', 'stop', 'object', 'father')
    const plan = planFor(PATHS[0]!, answer, 'fast')
    expect(plan.state.flags[C2026.SNAG]).toBe('hurry')
    const finale = finaleAfter(plan, answer)
    expect(finale.state.flags[C2026.PACE]).toBe('stopped')
    expect(finale.state.flags['life:finale:late']).toBe(true)
    expect(finale.endings.length).toBe(1)
    expect(finale.opened).toContain('f-back')
  })

  it('Messy — no money: the counter will not hold seats, the plan waits, and "not yet" is a whole ending', () => {
    const answer = pick('prepare', 'later', 'family', 'together', 'let', 'arm', 'present', 'father')
    const plan = planFor(PATHS.find((p) => p.name === 'broke')!, answer, 'fast')
    expect(plan.endings).toEqual(['saving'])
    const finale = finaleAfter(plan, answer)
    expect(finale.endings.length).toBe(1)
  })

  for (const path of PATHS) {
    it(`every life finishes the finale · ${path.name}`, () => {
      const answer = pick('three', 'two', 'share', 'reunion', 'photo', 'delegate', 'dad', 'ofir', 'taxi', 'cafe', 'assist', 'later', 'now', 'together', 'wait', 'child', 'let', 'stop', 'object', 'father', 'mine')
      const plan = planFor(path, answer, 'train')
      const finale = finaleAfter(plan, answer)
      expect(finale.endings.length, `${path.name}: ${finale.trace.slice(-8).join(' | ')}`).toBe(1)
    })
  }

  it('life paths change the snag, not just its words (§8 combination rule)', () => {
    const snagOf = (path: Path) => planFor(path, pick('reunion', 'two', 'share', 'delegate', 'meeting', 'dad', 'ofir', 'photo', 'assist', 'later'), 'train').state.flags[C2026.SNAG]
    expect(snagOf(PATHS.find((p) => p.name === 'owner')!)).toBe('delegated')
    expect(snagOf(PATHS.find((p) => p.name === 'journalist')!)).toBe('declined_press')
    expect(snagOf(PATHS.find((p) => p.name === 'leader')!)).toBe('handed')
    expect(snagOf(PATHS.find((p) => p.name === 'abroad')!)).toBe('photo')
    expect(snagOf(PATHS.find((p) => p.name === 'ordinary')!)).toBe('assist')
  })

  it('1983 ↔ 2026 in the mechanics: the tickets bought at the counter are in Pugi\'s pocket, and Kobi asks for them', () => {
    const lines = (flags: Record<string, string>) => {
      const sim = new WorldSim('2026-finale')
      seed(sim, flags)
      return DIALOGUE['f-road']!.branches.find((b) => meets(sim.state, b.when))!.lines.map((l) => l.text).join(' ')
    }
    expect(lines({ [C2026.TICKETS]: 'two' })).toContain('הכרטיסים אצלך?')
    // two places, one ticket sent to him — or no tickets bought: the screenplay's words
    expect(lines({ [C2026.TICKETS]: 'reunion' })).toContain('יש לי את הכרטיסים')
    expect(lines({})).toContain('יש לי את הכרטיסים')
  })

  it('the child remembers his Saturday of 2021 when asked about Botevgrad', () => {
    const lines = (saturday: string | null) => {
      const sim = new WorldSim('2026-plan')
      seed(sim, { 'life:child': true, 'f:funding': 'self_three', ...(saturday ? { 'life:saturday': saturday } : {}) })
      return DIALOGUE['f-child']!.branches.find((b) => meets(sim.state, b.when))!.lines.map((l) => l.text).join(' ')
    }
    expect(lines('stayed')).toContain('פנדלים')
    expect(lines('missed')).toContain('בטוח')
    expect(lines(null)).not.toMatch(/פנדלים|גדר|בטוח/)
  })

  for (const chapter of ['2026-plan', '2026-finale']) {
    for (const temper of TEMPERS) {
      it(`Confused · ${chapter} · ${temper} — reaches the end`, () => {
        const { sim, path } = confused(chapter, temper, (s) => seed(s, {}, 400_000))
        expect(sim.endings.length, `${path.slice(-12).join(' → ')}\n${sim.trace.slice(0,40).join(' | ')}`).toBe(1)
      })
    }
  }
})

// ============================================================ 2015 · 2021 ============

describe('2015 · "this time I checked" has a check behind it', () => {
  it('lead is grey until the sign at the drive-in is read; the other two are always open', () => {
    const lead = DIALOGUE['nr-route']!.branches[0]!.choices!.find((c) => c.id === 'lead')!
    expect(lead.when).toEqual({ flag: 'nr:checked' })
  })
  for (const temper of TEMPERS) {
    it(`Confused · ${temper} — reaches the end`, () => {
      const { sim } = confused('2015-newhall', temper)
      expect(sim.endings.length).toBe(1)
    })
  }
})

describe('2021 · sorting the box is done with the hands', () => {
  for (const [share, proof] of [[1, true], [0.5, false]] as const) {
    it(`sorted ${share * 100}% → provenance proof ${proof}`, () => {
      const sim = new WorldSim('2021-losses')
      const answer = pick('archive', 'stay', 'ask')
      sim.beatAnswer = answer
      playScenes(sim, share, answer)
      reenter(sim, 'street', 'home')
      expect(sim.state.flags['r:sortdone']).toBe(true)
      expect(hasProof(sim, 'provenance_review')).toBe(proof)
    })
  }
  for (const temper of TEMPERS) {
    it(`Confused · ${temper} — reaches the end`, () => {
      const { sim } = confused('2021-losses', temper)
      expect(sim.endings.length).toBe(1)
    })
  }
})

// ================================================================ 2018 · R02 ========

describe('2018 · the new Bloomfield — the way is read on the sign, and Dad leads the part he still knows', () => {
  function toGround(answer: (choices: readonly DialogueChoice[]) => string) {
    const sim = new WorldSim('2018-return')
    sim.beatAnswer = answer
    reenter(sim, 'out', 'kiosk') // Ofir: "we are back"
    for (let i = 0; i < 6 && sim.location !== 'bloomfield-outside'; i += 1) sim.wait(2)
    expect(sim.location).toBe('bloomfield-outside')
    return sim
  }
  it('Golden — reads the sign, follows it to the gate, lets Kobi lead inside: the navigation proof is earned on the sign', () => {
    const sim = toGround(pick('together', 'sign'))
    expect(sim.state.flags['r:find']).toBe('reading')
    expect(hasProof(sim, 'navigation')).toBe(false)
    expect(sim.press('r-sign', 'sign')).toBe(true)
    expect(hasProof(sim, 'navigation:2018-return:bloomfield')).toBe(true)
    expect(sim.endings).toEqual(['found'])
  })
  it('Messy — follows habit to the left: a fence, the long way round, the same ending and no proof', () => {
    const sim = toGround(pick('together', 'habit'))
    sim.press('r-sign', 'habit')
    expect(sim.state.flags['r:find']).toBe('habit')
    expect(hasProof(sim, 'navigation')).toBe(false)
    expect(sim.endings).toEqual(['found'])
  })
  for (const temper of TEMPERS) {
    it(`Confused · ${temper} — reaches the end`, () => {
      const { sim, path } = confused('2018-return', temper)
      expect(sim.endings.length, path.slice(-14).join(' → ')).toBe(1)
    })
  }
})

// ================================================================ 2012 · N02–N04 ===

describe('2012 · five years — the introduction, the pages, the meeting and the credits happen in the room', () => {
  function toGate(answer: (choices: readonly DialogueChoice[]) => string) {
    const sim = new WorldSim('2012-five')
    sim.beatAnswer = answer
    reenter(sim, 'home', 'centre') // Allenby: five years, and who remembers which beginning
    sim.wait(2)
    expect(sim.state.flags['n:five']).toBeTruthy()
    expect(sim.exit('bloomfield')).toBe(true)
    expect(sim.exit('gate5')).toBe(true)
    return sim
  }

  it('Golden — five minutes with the volunteer, both pages read, the missing clause asked, a line for everyone', () => {
    const sim = toGate(pick('mentor', 'five', 'read', 'loss', 'credit'))
    expect(hasProof(sim, 'mentored:2012-five:volunteer')).toBe(true)
    expect(sim.state.flags['n:gov']).toBe('reading')
    // the question is not a sentence before the pages
    expect(sim.find('n-ask')).toBeUndefined()
    expect(hasProof(sim, 'read_document')).toBe(false)
    sim.press('n-page-vote', 'go')
    sim.press('n-page-money', 'go')
    expect(sim.press('n-ask', 'loss')).toBe(true)
    expect(sim.state.flags['n:own']).toBe(true)
    expect(hasProof(sim, 'read_document:2012-five:offer')).toBe(true)
    sim.wait(3) // the evening jumps to the rehearsal room
    expect(sim.location).toBe('rehearsal')
    expect(sim.state.flags['n:credit']).toBe('writing')
    expect(hasProof(sim, 'culture_delivery')).toBe(false)
    for (const who of ['n-cr-gur', 'n-cr-yonatan', 'n-cr-melamed', 'n-cr-neta']) expect(sim.press(who, 'go'), who).toBe(true)
    expect(sim.state.flags['n:cr:brother']).toBe(true) // the cables, named from Gur's word and Yonatan's
    sim.press('n-cr-door', 'go')
    expect(sim.state.flags['n:credit']).toBe('full')
    expect(hasProof(sim, 'culture_delivery:2012-five:evening')).toBe(true)
    expect(sim.endings).toEqual(['credit'])
  })

  it('Messy — tells the whole beginning, lets the meeting shout, pins half a page: a real evening, no proofs claimed', () => {
    const sim = toGate(pick('mentor', 'story', 'work', 'floor', 'credit'))
    expect(hasProof(sim, 'mentored')).toBe(false)
    sim.wait(2) // the meeting he took opens by itself
    expect(sim.state.flags['n:gov']).toBe('loud')
    expect(hasProof(sim, 'community_work')).toBe(false)
    sim.wait(3)
    expect(sim.location).toBe('rehearsal')
    sim.press('n-cr-neta', 'go')
    sim.press('n-cr-door', 'go')
    expect(sim.state.flags['n:credit']).toBe('partial')
    expect(hasProof(sim, 'culture_delivery')).toBe(false)
    expect(sim.endings).toEqual(['credit'])
  })

  it('Golden (the meeting) — a minute for the shout, back to the three lines: the meeting proof is earned where it happened', () => {
    const sim = toGate(pick('afar', 'work', 'agenda', 'listen'))
    sim.wait(2)
    expect(sim.state.flags['n:gov']).toBe('ran')
    expect(hasProof(sim, 'community_work:2012-five:meeting')).toBe(true)
  })

  for (const temper of TEMPERS) {
    it(`Confused · ${temper} — reaches the end`, () => {
      const { sim, path } = confused('2012-five', temper)
      expect(sim.endings.length, path.slice(-14).join(' → ')).toBe(1)
    })
  }
})

// ================================================================ 2021 · L09 =======

describe('2021 · his Saturday — two times on two sheets, one body (L09, colliding obligations)', () => {
  function start(answer: (choices: readonly DialogueChoice[]) => string) {
    const sim = new WorldSim('2021-promises')
    seed(sim, { 'life:child': true })
    sim.beatAnswer = answer
    reenter(sim, 'street', 'home') // pr-first, then the promise by the fridge
    sim.wait(2)
    expect(sim.state.flags['pr:promise']).toBeTruthy()
    reenter(sim, 'street', 'pitch') // he asks
    return sim
  }
  const walkTo = (sim: WorldSim, ...doors: string[]) => {
    for (const door of doors) expect(sim.exit(door), `exit ${door} from ${sim.location}`).toBe(true)
  }

  it('Golden — checks both sheets, splits, leaves at 18:15 as agreed, reaches the whistle: the proof is written at the fence', () => {
    const sim = start(pick('exit', 'meet', 'check', 'split', 'leave'))
    expect(sim.state.flags['pr:ask']).toBe('checking')
    // the commitment claims nothing
    expect(hasProof(sim, 'child_event')).toBe(false)
    walkTo(sim, 'back', 'home')
    expect(sim.press('pr-his', 'go')).toBe(true)
    walkTo(sim, 'street', 'kiosk')
    expect(sim.press('pr-ours', 'go')).toBe(true)
    walkTo(sim, 'out', 'pitch') // back to him with both times — he asks by himself
    expect(sim.state.flags['pr:ask']).toBe('split')
    walkTo(sim, 'back', 'school') // Saturday, in the yard of 1991
    expect(sim.state.flags['pr:sat']).toBe('run')
    expect(sim.state.flags['life:saturday']).toBe('half')
    expect(hasProof(sim, 'child_event:2021-promises:saturday')).toBe(true)
    expect(sim.state.flags['pr:scarf']).toBeFalsy()
    walkTo(sim, 'street', 'route', 'ground')
    expect(sim.state.flags['pr:scarf']).toBe(true)
    expect(sim.state.flags['pr:sat']).toBe('both')
    sim.wait(5)
    expect(sim.endings).toEqual(['his'])
  })

  it('Golden (adapt) — the split meets penalties at 18:15; staying for his is the second decision, and Bloomfield waits', () => {
    const sim = start(pick('exit', 'meet', 'check', 'split', 'stay'))
    walkTo(sim, 'back', 'home')
    sim.press('pr-his', 'go')
    walkTo(sim, 'street', 'kiosk')
    sim.press('pr-ours', 'go')
    walkTo(sim, 'out', 'pitch', 'back', 'school')
    expect(sim.state.flags['life:saturday']).toBe('stayed')
    expect(sim.state.flags['pr:scarf']).toBe(true)
    sim.wait(5)
    expect(sim.endings).toEqual(['his'])
  })

  it('the split is not a sentence before both sheets are read', () => {
    const split = DIALOGUE['pr-answer']!.branches[0]!.choices!.find((c) => c.id === 'split')!
    const sim = start(pick('exit', 'meet', 'check'))
    walkTo(sim, 'back', 'home')
    sim.press('pr-his', 'go')
    expect(meets(sim.state, split.when)).toBe(false)
    // and the way back to him is not lit until he has an answer
    walkTo(sim, 'street', 'pitch')
    expect(sim.find('pr-back')).toBeUndefined()
  })

  it('Messy — "I will be there", and never went: the Saturday passes, the sheet on the fridge says so, and the life still closes', () => {
    const sim = start(pick('exit', 'meet', 'go'))
    expect(sim.state.flags['pr:ask']).toBe('go')
    walkTo(sim, 'back', 'home')
    for (let hour = 0; hour < 5 && !sim.state.flags['pr:scarf']; hour += 1) sim.wait(60)
    expect(sim.state.flags['life:saturday']).toBe('missed')
    expect(hasProof(sim, 'child_event')).toBe(false)
    sim.wait(5)
    expect(sim.endings).toEqual(['waited'])
  })

  it('Messy — "not this time", said to his face: an honest no is a whole ending, with no proof', () => {
    const sim = start(pick('exit', 'meet', 'miss'))
    expect(sim.state.flags['life:saturday']).toBe('told')
    sim.wait(5)
    expect(sim.endings).toEqual(['his'])
    expect(hasProof(sim, 'child_event')).toBe(false)
  })

  for (const temper of TEMPERS) {
    it(`Confused · ${temper} · with a child — reaches the end`, () => {
      const { sim, path } = confused('2021-promises', temper, (s) => seed(s, { 'life:child': true }))
      expect(sim.endings.length, path.slice(-14).join(' → ')).toBe(1)
    })
  }
})

// ====================================================== §11.4 anti-pattern ============

/**
 * A choice that passes time AND grants a skill or a proof, with no played scene and no
 * condition on something done, is the old shape: *"the sentence claims the quest was
 * performed"*. Every one left in these chapters is named here with the reason it is a
 * conversation (the words ARE the act) or a vignette — or as a known debt for the owner.
 */
const ALLOWED: Record<string, string> = {
  'hh-diary/calendar': 'vignette — an agreement between two people is said, not performed',
  'hh-first/evening': 'vignette — the first evening with a baby is not a challenge (§11.12)',
  'hh-first/grandparents': 'vignette — asking Kobi and Rachel for help is the act',
  'p-till/ask': 'dialogue-native — asking for consent and waiting for the answer',
  'p-amit/review': 'vignette — sitting over the till with Amit, a year after',
  'r-back/successor': 'dialogue-native — the talk with the successor is the act',
  'r-indoors/personal': 'vignette — an evening of his own, outside football',
  'r-young/ask': 'dialogue-native — asking and listening',
  'pr-first/exit': 'vignette — the child\'s first match; the time is the match',
  'pr-first/home': 'vignette — watching at home first',
  'pr-promise/meet': 'vignette — keeping an evening',
  'z-grow/question': 'dialogue-native — a question asked in a meeting',
  // R02 (90-E) — played: opened only by reading the new sign at the gate (`r-sign`); the time is the walk it leads
  'r-find/sign': 'played — the way read on the sign, then walked',
  // N02–N04 (90-E) — dialogue-native: the conversation IS the act, in front of the people it is with
  'n-mentor/five': 'dialogue-native — the introduction is the talk with the volunteer standing there',
  'n-mentor/ask': 'dialogue-native — same: asking and listening',
  'n-meeting/agenda': 'dialogue-native — running a meeting is speech, on the stairs, with twelve people',
  // known debts (listed for the owner in the 90-E report, not hidden)
  'pr-promise/do': 'vignette — he is at home by the fridge, on time, in front of the person; the kept evening is the scene itself',
  // L09 (90-E) — played: opened only by `pr-saturday`, in the schoolyard he walked to after committing
  'pr-saturday/stay': 'played — standing at the fence in the schoolyard; the time is his match',
  'pr-saturday/off': 'played — same',
  'pr-saturday/peek': 'played — same',
  'z-euro/travel': 'COMPRESSED — 2025 is a commitment (real money); the performed trip is 2026',
}

describe('§11.4 — no choice claims work it did not perform (2011–2026, this file set)', () => {
  const modules = [C2011, C2012, C2015, C2016, C2018, C2021, C2023, C2026] as const
  const claims: string[] = []
  const seen = new Set<string>()
  for (const mod of modules) {
    for (const [name, value] of Object.entries(mod)) {
      if (!name.startsWith('CONVERSATIONS')) continue
      for (const conversation of value as Conversation[]) {
        for (const branch of conversation.branches) {
          for (const choice of branch.choices ?? []) {
            const key = `${conversation.id}/${choice.id}`
            if (seen.has(key)) continue
            seen.add(key)
            const minutes = choice.then.reduce((sum, e) => sum + (e.e === 'time' ? e.minutes : 0), 0)
            const rewards = choice.then.some((e) => e.e === 'skill' || e.e === 'proof')
            const played = choice.then.some((e) => e.e === 'minigame')
            const gated = JSON.stringify(choice.when ?? {}).includes('"flag"')
            if (minutes >= 20 && rewards && !played && !gated) claims.push(key)
          }
        }
      }
    }
  }

  it('every remaining claim is named, with its reason', () => {
    expect(claims.filter((key) => !(key in ALLOWED))).toEqual([])
  })
  it('the named list has no stale rows', () => {
    expect(Object.keys(ALLOWED).filter((key) => !claims.includes(key))).toEqual([])
  })
  it('the converted quests are gone from the list for good', () => {
    for (const key of ['p-deliver/three', 'p-deliver/one', 'p-news/verify', 'z-role/play', 'f-money/prepare', 'r-indoors/archive', 'pr-scarf/go', 'pr-scarf/split', 'n-five/mentor', 'n-own/read', 'n-own/work', 'n-room/credit', 'r-signs/together']) expect(claims, key).not.toContain(key)
  })
  it('the 2016 commitment raises no time, skill or proof — the parcels do', () => {
    const three = DIALOGUE['p-deliver']!.branches[0]!.choices!.find((c) => c.id === 'three')!
    expect(three.then.some((e) => ['time', 'skill', 'proof', 'heard', 'energy'].includes(e.e))).toBe(false)
  })
  it('ending cards of the converted chapters do not invent effort the log cannot prove', () => {
    // the crisis cards speak of the table and the evening, never of deliveries
    for (const card of Object.values(C2016.ENDINGS_CRISIS)) expect(card.bodyHe).not.toMatch(/מסיר|חבילה/)
    // the tournament cards speak of the meeting that closes the chapter, not of the match
    for (const card of Object.values(C2023.ENDINGS_TOURNAMENT)) expect(card.bodyHe).not.toMatch(/חילוף|גול|ניצח/)
  })
  void proofIds
})
