import { describe, expect, it } from 'vitest'

import { DIALOGUE } from '@/lib/life/content/dialogue'
import { eraFor } from '@/lib/life/content/era'
import { GESTURES, GESTURE_PREFIX } from '@/lib/life/content/gestures'
import { RIDES, RIDE_PREFIX } from '@/lib/life/content/passages'
import type { Effect } from '@/lib/life/content/script'
import { STORY_CHORES, STORY_CHORE_PREFIX } from '@/lib/life/content/storyChores'
import type { DialogueChoice } from '@/lib/life/runtime/bus'
import { ALL_SCENES, sceneIn, type EraTag, type Verb } from '@/lib/life/world/scenes'
import { seedFor } from '@/lib/life/world/worldline'

import { HAND_VERBS, WALK_AWAY, WorldSim, type Thing } from './fixtures/lifeWorldSim'

/**
 * מעבר ג׳ — 2000–2012, 28.9.2026 (`docs/life/IMPLEMENTATION-PASS-PROGRAMMER-2026-09-27.md` §21–§40).
 *
 * Twenty chapters, one question the brief asks of each of them: does the player DO something
 * that costs something, and does the world answer before the card? The instruments are the
 * ones this repo already trusts, pointed at the twenty:
 *
 *   · the confused player (`life-confused-player`) — four temperaments reach an ending;
 *   · the hands (`life-gameplay-density`) — at least two physical verbs per chapter;
 *   · §11.4 (`life-adult-quests-a`) — no choice pays for work it did not perform;
 *   · and, per chapter, the specific thing the brief asked for, by name.
 */

export const PASS_C = [
  '2000-bridge', '2000-team', '2001-terrace', '2002-europe', '2002-desk', '2006-home', '2006-desk',
  '2007-table', '2007-registered', '2007-key', '2009-up', '2010-cup', '2010-teddy', '2010-qualify',
  '2010-friends', '2010-anthem', '2011-people', '2012-cups', '2012-five', '2012-terrace',
] as const

// ------------------------------------------------------------------ the hands ---

const HANDS: ReadonlySet<Verb> = new Set<Verb>(['take', 'enter', 'exit', 'sit', 'play', 'buy', 'hold'])
const PLAYED: ReadonlySet<Effect['e']> = new Set<Effect['e']>(['minigame', 'pitch', 'penalty', 'hoops', 'coin', 'toto', 'shop', 'mechanic'])

function ownEra(era: EraTag | undefined, chapter: string): boolean {
  if (!era) return false
  return Array.isArray(era) ? (era as readonly string[]).includes(chapter) : era === chapter
}

function playedKind(effect: Effect): string {
  if (effect.e !== 'minigame') return effect.e
  const id = effect.id
  if (id.startsWith(`chore:${STORY_CHORE_PREFIX}`)) return `chore:${STORY_CHORES[id.slice(`chore:${STORY_CHORE_PREFIX}`.length)]?.shape.mode ?? '?'}`
  if (id.startsWith('chore:')) return 'job'
  if (id.startsWith(RIDE_PREFIX)) return 'ride'
  if (id.startsWith(GESTURE_PREFIX)) return `gesture:${GESTURES[id.slice(GESTURE_PREFIX.length)]?.verb ?? '?'}`
  return id
}

/** every conversation the chapter's own rooms, people and beats can open (route missions excluded) */
function ownRoots(chapter: string): { verbs: Set<string>; roots: string[] } {
  const verbs = new Set<string>()
  const roots: string[] = []
  for (const base of ALL_SCENES) {
    const room = sceneIn(base, chapter)
    for (const spot of room.hotspots) {
      if (!ownEra(spot.era, chapter)) continue
      if (HANDS.has(spot.verb)) verbs.add(spot.verb)
      roots.push(spot.act)
    }
    for (const actor of room.actors) if (actor.talk && ownEra(actor.era, chapter)) roots.push(actor.talk)
  }
  for (const beat of eraFor(chapter).beats ?? []) for (const action of beat.do) if (action.a === 'talk') roots.push(action.conversation)
  return { verbs, roots }
}

function reachable(roots: readonly string[]): Set<string> {
  const seen = new Set<string>()
  const queue = [...roots]
  while (queue.length) {
    const id = queue.shift() as string
    if (seen.has(id) || !DIALOGUE[id] || id.startsWith('route-')) continue
    seen.add(id)
    for (const branch of DIALOGUE[id]!.branches) {
      for (const effect of [...(branch.then ?? []), ...(branch.choices ?? []).flatMap((choice) => choice.then)]) {
        if (effect.e === 'goto') queue.push(effect.node)
        if (effect.e === 'minigame' && effect.id.startsWith(GESTURE_PREFIX)) queue.push(GESTURES[effect.id.slice(GESTURE_PREFIX.length)]?.next ?? '')
      }
    }
  }
  return seen
}

export function physical(chapter: string): Set<string> {
  const { verbs, roots } = ownRoots(chapter)
  const out = new Set<string>(verbs)
  for (const id of reachable(roots)) {
    for (const branch of DIALOGUE[id]!.branches) {
      for (const effect of [...(branch.then ?? []), ...(branch.choices ?? []).flatMap((choice) => choice.then)]) {
        if (PLAYED.has(effect.e)) {
          const kind = playedKind(effect)
          if (kind !== 'job') out.add(kind)
        }
      }
    }
  }
  for (const beat of eraFor(chapter).beats ?? []) for (const action of beat.do) if (action.a === 'match') out.add('match')
  return out
}

// ----------------------------------------------------------------- §11.4 ---

const PERFORMED: ReadonlySet<Effect['e']> = new Set<Effect['e']>(['minigame', 'travel', 'pitch', 'penalty', 'hoops', 'shop', 'mechanic'])

function claimsWork(then: readonly Effect[]): boolean {
  const minutes = then.reduce((sum, effect) => sum + (effect.e === 'time' ? effect.minutes : 0), 0)
  const energy = then.reduce((sum, effect) => sum + (effect.e === 'energy' ? effect.delta : 0), 0)
  const pays = then.some((effect) => effect.e === 'skill' || effect.e === 'proof' || (effect.e === 'rel' && effect.axis === 'trust' && effect.delta > 0))
  const performed = then.some((effect) => PERFORMED.has(effect.e) || (effect.e === 'money' && effect.agorot < 0))
  return pays && (minutes >= 20 || energy <= -5) && !performed
}

function claims(chapter: string): string[] {
  const out: string[] = []
  for (const id of reachable(ownRoots(chapter).roots)) {
    for (const branch of DIALOGUE[id]!.branches) for (const choice of branch.choices ?? []) if (!choice.when && claimsWork(choice.then)) out.push(`${id}/${choice.id}`)
  }
  return out.sort()
}

// --------------------------------------------------------- the confused player ---

type Temper = 'first' | 'last' | 'hesitant' | 'hands'

function answerFor(temper: Temper, asked: Map<string, number>, id: string) {
  return (choices: readonly DialogueChoice[]) => {
    const open = choices.filter((choice) => choice.enabled)
    if (!open.length) return WALK_AWAY
    const times = asked.get(id) ?? 0
    asked.set(id, times + 1)
    if (temper === 'hesitant' && times === 0) return WALK_AWAY
    return (temper === 'last' ? open[open.length - 1] : open[0])!.id
  }
}

function playMinigames(sim: WorldSim, temper: Temper) {
  sim.onMinigame = (id, world) => {
    if (id.startsWith('chore:story:')) {
      const chore = STORY_CHORES[id.slice('chore:story:'.length)]
      if (!chore) return
      const done = temper === 'last' ? 0 : temper === 'hands' ? chore.shape.target : Math.ceil(chore.shape.target / 2)
      const events = chore.finish(done, chore.shape.target)
      if (events.length) world.engine.dispatch(...events)
      world.go(chore.where)
      return
    }
    if (id.startsWith(RIDE_PREFIX)) {
      const ride = RIDES[id.slice(RIDE_PREFIX.length)]
      if (!ride) return
      const asked = new Map<string, number>()
      for (const stop of ride.stops) {
        world.streak = 0
        if (stop.conversation) world.converse(stop.conversation, answerFor(temper === 'hesitant' ? 'first' : temper, asked, stop.conversation))
      }
      for (const flag of ride.flags) world.engine.dispatch({ t: 'flag.raised', flag })
      world.go(ride.land.mapId as never)
    }
  }
}

function standsOut(things: readonly Thing[], temper: Temper): Thing[] {
  if (temper !== 'hands') return [...things]
  const rank = (thing: Thing) => (thing.kind === 'spot' && HAND_VERBS.has(thing.verb) ? 0 : thing.kind === 'actor' ? 1 : 2)
  return [...things].sort((a, b) => rank(a) - rank(b))
}

function stateKey(sim: WorldSim): string {
  return String(Object.entries(sim.state.flags).filter(([key, value]) => value !== false && !key.startsWith('beat:') && !key.startsWith('own:heard:')).length)
}

/** the flags a chapter's own `when` asks for, raised — a window only opens for a life that earned it */
const ENTRY: Partial<Record<(typeof PASS_C)[number], Record<string, string | true>>> = {
  '2000-team': { 'life:team': true },
  '2001-terrace': { 'life:terrace:exploring': true },
  '2002-desk': { 'own:route:JOURNALIST:entry': true },
  '2006-desk': { 'life:desk': true },
  '2010-friends': { 'life:international': true },
  '2012-terrace': { 'own:route:ULTRAS:entry': true, 'life:terrace:role': 'active' },
}

export function play(chapter: string, temper: Temper, extra: Record<string, string | true> = {}, budget = 400): { sim: WorldSim; path: string[] } {
  const sim = new WorldSim(chapter)
  const seed = Object.keys(seedFor(chapter, { id: 'minimal', labelHe: '', flags: {} }))
  if (seed.length) sim.engine.dispatch(...seed.map((flag) => ({ t: 'flag.raised' as const, flag })))
  const entry = { ...(ENTRY[chapter as (typeof PASS_C)[number]] ?? {}), ...extra }
  for (const [flag, value] of Object.entries(entry)) {
    sim.engine.dispatch(value === true ? { t: 'flag.raised', flag } : { t: 'flag.set', flag, value })
  }
  playMinigames(sim, temper)
  const asked = new Map<string, number>()
  const beatAsked = new Map<string, number>()
  sim.beatAnswer = (choices) => {
    const key = choices.map((choice) => choice.id).join('|')
    const times = beatAsked.get(key) ?? 0
    beatAsked.set(key, times + 1)
    if (times === 0) return WALK_AWAY
    const open = choices.filter((choice) => choice.enabled)
    if (!open.length) return WALK_AWAY
    return (temper === 'last' ? open[open.length - 1] : open[0])!.id
  }
  const pressed = new Set<string>()
  const walked = new Map<string, number>()
  const path: string[] = [sim.location]
  for (let step = 0; step < budget && sim.endings.length === 0; step += 1) {
    const here = sim.location
    const things = standsOut(sim.things(), temper)
    const fresh = things.find((thing) => thing.kind !== 'exit' && !pressed.has(`${here}|${thing.id}|${stateKey(sim)}`))
    if (fresh && fresh.kind !== 'exit') {
      pressed.add(`${here}|${fresh.id}|${stateKey(sim)}`)
      sim.press(fresh.id, answerFor(temper, asked, fresh.act))
      if (sim.location !== here) path.push(sim.location)
      sim.wait(1)
      continue
    }
    const doors = things.filter((thing): thing is Extract<Thing, { kind: 'exit' }> => thing.kind === 'exit' && !thing.locked)
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

const TEMPERS: Temper[] = ['first', 'last', 'hesitant', 'hands']

// ======================================================================== suites ===

describe('pass C · every chapter 2000–2012 ends for a player who does not know the history', () => {
  for (const chapter of PASS_C) {
    for (const temper of TEMPERS) {
      it(`${chapter} · ${temper}`, () => {
        const { sim, path } = play(chapter, temper)
        expect(sim.endings.length, `${chapter}/${temper} never ended — ${path.slice(-10).join(' → ')} · ${sim.trace.slice(-14).join(' | ')}`).toBeGreaterThan(0)
      })
    }
  }
})

describe('pass C · the hands — at least two physical verbs in every chapter', () => {
  for (const chapter of PASS_C) {
    it(chapter, () => {
      expect([...physical(chapter)].sort(), chapter).toSatisfy((verbs: string[]) => verbs.length >= 2)
    })
  }
})

/**
 * What is left is DIALOGUE AS THE DEED — naming a team together, listening to a plan, splitting the
 * beds with somebody, a list said aloud at the door, keeping a promise that the choice itself IS,
 * writing a summary, an agenda in a meeting, a hand given on the terrace. Converting these into a
 * chore would be filler (the owner: "a chapter that passes tests but is boring fails"). Named here,
 * so a NEW one fails. 2002-europe/2006-home match `tests/life-adult-quests-a.test.ts`'s LEFT.
 */
const LEFT: Record<string, string[]> = {
  '2000-team': ['y-name/crew', 'y-name/together', 'y-train/listen'],
  '2002-europe': ['e-beds/one', 'e-beds/split'],
  '2006-home': ['h-door/list', 'h-door/photo', 'h-oli/roster'],
  '2010-friends': ['i-banner/group'],
  '2010-anthem': ['c10-callback/kept', 'c10-lyon-away/stay', 'c10-lyon-away/write', 'c10-lyon/stay', 'c10-lyon/write'],
  '2012-five': ['n-meeting/agenda', 'n-meeting/hand', 'n-mentor/ask', 'n-mentor/five', 'q-shirts/hand'],
  '2012-terrace': ['t-hand/trust', 't-hand/trust'],
}

describe('pass C · §11.4 — no open choice pays for work it did not perform', () => {
  for (const chapter of PASS_C) {
    it(chapter, () => {
      expect(claims(chapter)).toEqual([...(LEFT[chapter] ?? [])].sort())
    })
  }
})
