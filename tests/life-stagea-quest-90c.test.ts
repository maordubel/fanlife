// the chapter registry first: `prices → chapters → income → prices` is a load cycle that
// only bites when something else reaches `income` before `chapters` (delta 90, reported)
import '@/lib/life/content/chapters'

import { describe, expect, it } from 'vitest'

import { eraFor } from '@/lib/life/content/era'
import { GESTURES } from '@/lib/life/content/gestures'
import { RIDES, RIDE_PREFIX } from '@/lib/life/content/passages'
import { STORY_CHORES } from '@/lib/life/content/storyChores'
import { CUTSCENES } from '@/lib/life/cutscenes'
import { CONVERSATIONS_1991 } from '@/lib/life/content/dialogue1991'
import type { DialogueChoice } from '@/lib/life/runtime/bus'
import { nextTimeGate } from '@/lib/life/world/flow'
import type { LifeEvent } from '@/lib/life/events'
import { CHAPTER } from '@/lib/life/content/chapters'
import { GIGS, gigFlag, gigPay, isPaid, offerFlag, offeredIn } from '@/lib/life/gigs'
import { workDoneFlag } from '@/lib/life/workFlags'

import { reconcile } from '@/lib/life/world/milestones'
import { SCENE, inEra, sceneIn } from '@/lib/life/world/scenes'
import { meets } from '@/lib/life/world/types'
import type { LocationId } from '@/lib/life/types'

import { HAND_VERBS, WALK_AWAY, WorldSim, type Thing, type Answer } from './fixtures/lifeWorldSim'

/**
 * שלב א׳ + 1986 + 1991 — Golden / Messy / Confused (design pass v2 §7, §12, §15, §26; delta 90 · 90-C).
 *
 * GOLDEN — the player who does the thing the unit is about, in the order the fiction
 * offers it, and the world answers what he did (not what a sentence claimed).
 * MESSY — refusals, out-of-order visits, a walk-away mid-sentence, a reload in the middle,
 * the cheaper or sadder branch; the unit still ends with a biography and never a wall.
 * CONFUSED — a player who reads only what the room shows him, closes the first box by
 * mistake and answers with the first (or last) thing on offer; he reaches the end.
 *
 * Every walk also holds the flow contract (§12): after each meaningful action the chapter
 * either wants something (an objective), or offers a time gate, or has ended.
 */

type Temper = 'first' | 'last' | 'hesitant' | 'hands'

/** chores are done by hand (all of it for the golden player), rides are ridden */
function hands(sim: WorldSim, share: 'all' | 'half' | 'none' = 'all') {
  sim.onMinigame = (id, world) => {
    if (id.startsWith('chore:story:')) {
      const chore = STORY_CHORES[id.slice('chore:story:'.length)]
      if (!chore) return
      const target = chore.shape.target
      const done = share === 'all' ? target : share === 'half' ? Math.ceil(target / 2) : 0
      const events = chore.finish(done, target)
      if (events.length) world.engine.dispatch(...events)
      world.go(chore.where)
      return
    }
    // a street job from the week's rotation, settled the way ChoreScene settles a full shift
    if (id.startsWith('chore:') && !id.startsWith('chore:story:')) {
      const gig = GIGS.find((g) => g.id === id.slice('chore:'.length))
      if (!gig) return
      world.engine.dispatch(
        { t: 'flag.raised', flag: gigFlag(gig) },
        { t: 'flag.raised', flag: workDoneFlag(world.chapter) },
        { t: 'clock.advanced', minutes: gig.minutes },
        // `gigPay` is in shekels (ChoreScene converts with `shekels()`)
        { t: 'money.changed', agorot: gigPay(gig, world.chapter) * 100, why: gig.labelHe },
      )
      return
    }
    if (id.startsWith(RIDE_PREFIX)) {
      const ride = RIDES[id.slice(RIDE_PREFIX.length)]
      if (!ride) return
      for (const stop of ride.stops) if (stop.conversation) world.converse(stop.conversation, (choices) => choices.find((c) => c.enabled)?.id ?? WALK_AWAY)
      for (const flag of ride.flags) world.engine.dispatch({ t: 'flag.raised', flag })
      world.go(ride.land.mapId as never)
    }
  }
}

/** read to the end, taking the first answer on offer */
const read = (choices: readonly DialogueChoice[]) => choices.find((c) => c.enabled)?.id ?? WALK_AWAY

const pick = (id: string) => (choices: readonly DialogueChoice[]) => (choices.some((c) => c.id === id && c.enabled) ? id : WALK_AWAY)
/** the first of these ids the box offers — a player with a plan across several boxes */
const pickAny = (...ids: string[]) => (choices: readonly DialogueChoice[]) => ids.find((id) => choices.some((c) => c.id === id && c.enabled)) ?? WALK_AWAY

function remembered(sim: WorldSim, eventId: string): boolean {
  return sim.engine.log().some((event: LifeEvent) => event.t === 'relationship.memory_added' && (event as { memory: { eventId: string } }).memory.eventId === eventId)
}

/** the room where a person or a thing (by id or by conversation) stands right now */
function whereIs(sim: WorldSim, id: string): LocationId | null {
  if (sim.find(id)) return sim.location
  for (const [loc, base] of Object.entries(SCENE)) {
    const room = sceneIn(base as never, sim.chapter) as { actors: { id: string; talk?: string; when?: never }[]; hotspots: { id: string; act: string; when?: never }[] }
    const actor = room.actors.some((a) => (a.id === id || a.talk === id) && inEra(a as never, sim.chapter) && meets(sim.state, a.when))
    const spot = room.hotspots.some((h) => (h.id === id || h.act === id) && inEra(h as never, sim.chapter) && meets(sim.state, h.when))
    if (actor || spot) return loc as LocationId
  }
  return null
}

/** the runtime's milestone reconciliation (WorldScene runs it every minute; the sim does not) */
function reconcileNow(sim: WorldSim) {
  const raised = reconcile(sim.state)
  if (raised.length) sim.engine.dispatch(...raised.map((flag) => ({ t: 'flag.raised' as const, flag })))
}

/** walk to wherever it is, and press it — the golden player knows the neighbourhood */
function visit(sim: WorldSim, id: string, answer: Answer = read): boolean {
  const room = whereIs(sim, id)
  if (!room) return false
  if (room !== sim.location) sim.go(room)
  return sim.press(id, answer)
}

/** §12: exactly one of — an objective, a time gate, or the chapter closed */
function flowHolds(sim: WorldSim): boolean {
  if (sim.endings.length || sim.state.chapterDone) return true
  const era = eraFor(sim.chapter)
  if (era.objective(sim.state, sim.location, Boolean(sim.state.flags['match:over']))) return true
  return nextTimeGate(sim.state, era) !== null
}

/** the confused walk of `life-confused-player`, condensed: what stands out, then the least-used door */
function confused(chapter: string, temper: Temper, until?: (sim: WorldSim) => boolean, budget = 400) {
  const sim = new WorldSim(chapter)
  hands(sim, temper === 'last' ? 'none' : temper === 'hands' ? 'all' : 'half')
  const asked = new Map<string, number>()
  const answer = (id: string) => (choices: readonly DialogueChoice[]) => {
    const open = choices.filter((choice) => choice.enabled)
    if (!open.length) return WALK_AWAY
    const times = asked.get(id) ?? 0
    asked.set(id, times + 1)
    if (temper === 'hesitant' && times === 0) return WALK_AWAY
    return (temper === 'last' ? open[open.length - 1] : open[0])!.id
  }
  const beatAsked = new Map<string, number>()
  sim.beatAnswer = (choices) => {
    const key = choices.map((c) => c.id).join('|')
    const times = beatAsked.get(key) ?? 0
    beatAsked.set(key, times + 1)
    if (times === 0) return WALK_AWAY
    const open = choices.filter((c) => c.enabled)
    return open.length ? (temper === 'last' ? open[open.length - 1] : open[0])!.id : WALK_AWAY
  }
  const pressed = new Set<string>()
  const walked = new Map<string, number>()
  const key = () => String(Object.values(sim.state.flags).filter(Boolean).length)
  for (let step = 0; step < budget && sim.endings.length === 0 && !(until?.(sim) ?? false); step += 1) {
    const here = sim.location
    let things: Thing[] = sim.things()
    if (temper === 'hands') things = [...things].sort((a, b) => (a.kind === 'spot' && HAND_VERBS.has(a.verb) ? 0 : 1) - (b.kind === 'spot' && HAND_VERBS.has(b.verb) ? 0 : 1))
    const fresh = things.find((t) => t.kind !== 'exit' && !pressed.has(`${here}|${t.id}|${key()}`))
    if (fresh && fresh.kind !== 'exit') {
      pressed.add(`${here}|${fresh.id}|${key()}`)
      sim.press(fresh.id, answer(fresh.act))
      sim.wait(1)
      continue
    }
    const doors = things.filter((t): t is Extract<Thing, { kind: 'exit' }> => t.kind === 'exit' && !t.locked)
    if (doors.length) {
      doors.sort((a, b) => (walked.get(`${here}>${a.to}`) ?? 0) - (walked.get(`${here}>${b.to}`) ?? 0))
      const door = doors[0]!
      walked.set(`${here}>${door.to}`, (walked.get(`${here}>${door.to}`) ?? 0) + 1)
      sim.exit(door.id)
      sim.wait(2)
      continue
    }
    // nothing to do: the flow card, if the chapter offers one, is taken — else time passes
    const gate = nextTimeGate(sim.state, eraFor(chapter))
    if (gate) sim.wait(Math.max(1, gate.minute - sim.state.minute))
    else sim.wait(20)
  }
  return sim
}

const TEMPERS: Temper[] = ['first', 'last', 'hesitant', 'hands']

/** a golden/messy player reads every box a beat opens (the confused one is built separately) */
function make(chapter: string, log?: readonly LifeEvent[]) {
  const sim = new WorldSim(chapter, log)
  sim.beatAnswer = read
  return sim
}

// ============================================================================ A1 · 1983 ==
describe('A1 · 1983 — two gestures, a child’s reaction, never a count', () => {
  it('golden: every gesture is one reach — no tap counting, no counted captions', () => {
    for (const gesture of Object.values(GESTURES)) {
      expect(gesture.taps, gesture.id).toBe(1)
      expect(gesture.tapHe ?? [], gesture.id).toEqual([])
    }
  })
  it('messy: left alone, each resolves by itself into the same next conversation', () => {
    for (const gesture of Object.values(GESTURES)) {
      expect(gesture.autoMs).toBeGreaterThan(2000)
      expect(gesture.ignored.length, `${gesture.id} ignored leaves nothing`).toBeGreaterThan(0)
      expect(gesture.next).toBeTruthy()
    }
  })
  it('confused: both outcomes of the grip are remembered distinctly (held / caught)', () => {
    const grip = GESTURES['grip-1983']!
    const value = (list: typeof grip.done) => list.find((e) => e.e === 'flagValue' && 'flag' in e && e.flag === 'life:a1:grip') as { value: string } | undefined
    expect(value(grip.done)?.value).toBe('held')
    expect(value(grip.ignored)?.value).toBe('caught')
  })
})

// ============================================================================ A2 · 1984 ==
describe('A2 · 1984 — the promise, the bread, the teams', () => {
  it('golden: names "before five", keeps it, plays, and the flat answers', () => {
    const sim = make('a2-alley')
    hands(sim)
    visit(sim, 'rachel-a2', pick('five'))
    expect(eraFor('a2-alley').objective(sim.state, 'home', false)).toContain('לפני חמש')
    sim.go('kiosk')
    visit(sim, 'rafi-a2', read)
    expect(sim.state.flags['a2:bread']).toBe(true)
    // (pass 28.9.2026) the loaf is in his hand at the pitch: it goes on the wall, meets the ball
    visit(sim, 'alley-a2', pick('wall'))
    expect(sim.state.flags['a2:played']).toBe(true)
    expect(flowHolds(sim)).toBe(true)
    sim.go('home')
    expect(sim.endings).toEqual(['played'])
    expect(sim.state.flags['life:a2:home']).toBe('truth')
  })
  it('messy: "after the game", football first, and the bread never bought — still an evening', () => {
    const sim = make('a2-alley')
    visit(sim, 'rachel-a2', pick('after'))
    visit(sim, 'alley-a2', pick('play'))
    const reloaded = sim.reload()
    // closes the evening's box by mistake at the door — the evening is NOT marked done
    reloaded.go('home')
    expect(reloaded.endings).toEqual([])
    reloaded.beatAnswer = read
    reloaded.go('street')
    reloaded.go('home')
    expect(reloaded.endings).toEqual(['played'])
  })
  for (const temper of TEMPERS) {
    it(`confused · ${temper}: reaches an ending`, () => {
      expect(confused('a2-alley', temper).endings.length).toBeGreaterThan(0)
    })
  }
})

// =============================================================== A3 · the second house ==
describe('A3 · first Ussishkin — the name, the ball at his feet, and "בוא נלך"', () => {
  function inside(answerUsher = 'name') {
    const sim = make('a3-hall')
    visit(sim, 'efi-a3', read)
    sim.go('ussishkin-outside')
    visit(sim, 'a3-queue', pick(answerUsher))
    expect(sim.state.flags['entry:granted']).toBe(true)
    sim.go('ussishkin-hall')
    expect(sim.state.flags['a3:inside']).toBe(true)
    return sim
  }
  it('golden: the ball reaches him, his body answers, and the evening ends on HIS words', () => {
    const sim = inside()
    // the world hands him the ball — it is on the list the moment he is in
    expect(sim.find('a3-ball')).toBeDefined()
    visit(sim, 'a3-ball', pick('bounce'))
    expect(sim.state.flags['life:a3:ball']).toBe('bounced')
    // Efi points him up at the stand; he finds a step there
    visit(sim, 'efi-a3-hall', read)
    visit(sim, 'a3-step', read)
    reconcileNow(sim)
    sim.wait(5)
    // seeing the place no longer ends it for him
    expect(sim.state.flags['a3:ready']).toBe(true)
    expect(sim.endings).toEqual([])
    expect(eraFor('a3-hall').objective(sim.state, 'ussishkin-hall', false)).toContain('בוא נלך')
    visit(sim, 'efi-a3-hall', pick('go'))
    expect(sim.endings).toEqual(['hall'])
  })
  it('messy: a shy boy who holds the ball, says "עוד קצת", reloads — the lights still go off on an evening', () => {
    const sim = inside('quiet')
    visit(sim, 'a3-ball', pick('hold'))
    visit(sim, 'efi-a3-hall', read)
    visit(sim, 'efi-a3-hall', pick('stay'))
    const again = sim.reload()
    expect(again.endings).toEqual([])
    // the lights go off; he closes that box by mistake — the evening is NOT lost with it
    again.wait(60 * 5)
    expect(again.endings).toEqual([])
    expect(again.state.flags['a3:done']).toBeFalsy()
    again.beatAnswer = read
    again.wait(1)
    expect(again.endings).toEqual(['hall'])
  })
  for (const temper of TEMPERS) {
    it(`confused · ${temper}: reaches an ending`, () => {
      expect(confused('a3-hall', temper).endings.length).toBeGreaterThan(0)
    })
  }
})

// ====================================================================== A4 · the shirt ==
describe('A4 · the shirt — the tin, the wallet on the table, the counter', () => {
  it('golden: tin, the wallet seen and kept, earns the rest, counts it on the counter', () => {
    const sim = make('a4-shirt')
    hands(sim)
    sim.beatAnswer = pick('take')
    // the tin is the decision the chapter opens with (no hunt)
    sim.converse('tin-a4', pick('take'))
    expect(sim.state.flags['a4:tin']).toBeTruthy()
    sim.beatAnswer = pick('keep')
    sim.go('home')
    // the family wallet is VISIBLE: it happened to him on the way through the flat
    expect(sim.state.flags['a4:wallet-seen']).toBe(true)
    expect(sim.state.flags['a4:kept']).toBe(true)
    visit(sim, 'kobi-a4', pick('almost'))
    // (delta 93) his father gives nothing at home now — he only knows
    expect(sim.state.flags['a4:kobi-knows']).toBe(true)
    sim.go('kiosk')
    visit(sim, 'rafi-a4', pick('work'))
    sim.go('kiosk')
    if (sim.find('bottles-a4')) {
      visit(sim, 'bottles-a4', pick('collect'))
      sim.go('kiosk')
      visit(sim, 'rafi-a4', read)
    }
    if (sim.state.agorot < 3000 && !sim.state.flags['a4:favour']) visit(sim, 'rafi-a4', pick('favour'))
    /*
     * 12 in the tin + 2 in the pocket + the crates + the bottles + the run upstairs. The last
     * shekel is the week's street job (`gigs.ts` rotation, one paid job a chapter): the
     * shirt is "about six afternoons away" by design, and the afternoon shows him where.
     */
    if (sim.state.agorot < 3000) {
      for (const gig of GIGS) if (isPaid(gig) && offeredIn('a4-shirt', sim.state.rng.seed).has(gig.id)) sim.engine.dispatch({ t: 'flag.raised', flag: offerFlag(gig) })
      sim.go('street')
      const job = sim.things().find((t) => t.kind === 'spot' && GIGS.some((g) => isPaid(g) && t.id.includes(g.id)))
      expect(job, `a paid street job in ${sim.things().map((t) => t.id).join(',')}`).toBeDefined()
      sim.press(job!.id, read)
      sim.go('kiosk')
    }
    const before = sim.state.agorot
    expect(before).toBeGreaterThanOrEqual(3000)
    visit(sim, 'rafi-a4', pick('buy'))
    // (delta 93) the counting was his; his father walked in and paid — and the money stayed
    expect(sim.state.flags['a4:ready-to-buy']).toBe(true)
    expect(sim.trace).toContain('cue:kobi-a4-kiosk:enter')
    expect(sim.trace).toContain('cue:kobi-a4-kiosk:approach')
    expect(sim.state.flags['a4:kobi-gifted-shirt']).toBe(true)
    expect(sim.state.flags['own:shirt85']).toBe(true)
    expect(sim.state.agorot, 'the thirty is still his').toBe(before)
    expect(remembered(sim, 'first-shirt-gift-1985')).toBe(true)
    expect(sim.state.proofs.some((row) => row.kind === 'gift_received' && row.proofId.startsWith('first_shirt_gift:'))).toBe(true)
    expect(sim.endings).toEqual(['shirt'])
  })
  it('the gift is never a rescue: short of thirty there is no counter, and seven o’clock closes it', () => {
    const sim = make('a4-shirt')
    hands(sim, 'none')
    sim.converse('tin-a4', pick('take'))
    sim.beatAnswer = pick('keep')
    sim.go('home')
    sim.go('kiosk')
    visit(sim, 'rafi-a4', read)
    expect(sim.state.agorot).toBeLessThan(3000)
    expect(sim.state.flags['a4:ready-to-buy']).toBeFalsy()
    for (let i = 0; i < 12 && !sim.endings.length; i++) sim.wait(60)
    expect(sim.state.flags['a4:kobi-gifted-shirt']).toBeFalsy()
    expect(sim.endings).toEqual(['notYet'])
  })
  it('the tin on his mother’s table is not paid back by his father the same day', () => {
    const sim = make('a4-shirt')
    sim.converse('tin-a4', pick('take'))
    sim.beatAnswer = pick('give')
    sim.go('home')
    expect(sim.endings).toEqual(['gave'])
    expect(sim.state.flags['a4:kobi-gifted-shirt']).toBeFalsy()
    expect(sim.state.flags['own:shirt85']).toBeFalsy()
  })
  it('more than thirty: the exact balance is kept', () => {
    const sim = make('a4-shirt')
    sim.converse('tin-a4', pick('take'))
    sim.beatAnswer = pick('keep')
    sim.go('home')
    sim.engine.dispatch({ t: 'money.changed', agorot: 4370 - sim.state.agorot, why: 'test' })
    sim.go('kiosk')
    visit(sim, 'rafi-a4', pick('buy'))
    expect(sim.state.flags['own:shirt85']).toBe(true)
    expect(sim.state.agorot).toBe(4370)
  })
  it('messy: the tin goes on his mother’s table — a different summer, not a worse one', () => {
    const sim = make('a4-shirt')
    sim.converse('tin-a4', pick('take'))
    sim.beatAnswer = pick('give')
    sim.go('home')
    expect(sim.endings).toEqual(['gave'])
  })
  it('messy: walking away from the wallet once does not hide it — she is still at the table', () => {
    const sim = make('a4-shirt')
    sim.converse('tin-a4', pick('take'))
    sim.beatAnswer = WALK_AWAY
    sim.go('home')
    expect(sim.find('rachel-a4')).toBeDefined()
    visit(sim, 'rachel-a4', pick('give'))
    expect(sim.endings).toEqual(['gave'])
  })
  for (const temper of TEMPERS) {
    it(`confused · ${temper}: reaches an ending`, () => {
      expect(confused('a4-shirt', temper).endings.length).toBeGreaterThan(0)
    })
  }
})

// ============================================================== A5 · in the shirt ==
describe('A5 · first match in the shirt — short, a payoff', () => {
  it('golden: dressed, Kobi reacts, the turnstile, the iron, the first push', () => {
    const sim = make('a5-first')
    sim.converse('shirt-a5', (choices) => choices.find((c) => c.enabled)?.id ?? WALK_AWAY)
    sim.go('home')
    visit(sim, 'kobi-a5', read)
    expect(sim.location).toBe('bloomfield-outside')
    visit(sim, 'a5-turnstile', read)
    expect(sim.location).toBe('bloomfield-tunnel')
    visit(sim, 'a5-iron', pick('shout'))
    expect(sim.endings).toEqual(['there'])
  })
  for (const temper of TEMPERS) {
    it(`confused · ${temper}: reaches an ending`, () => {
      expect(confused('a5-first', temper).endings.length).toBeGreaterThan(0)
    })
  }
})

// ============================================================== A6 · radio winter ==
describe('A6 · radio winter — persistence, not a timer', () => {
  function tuned() {
    const sim = make('a6-radio')
    hands(sim)
    sim.converse('radio-a6', pick('on'))
    return sim
  }
  function toDeath(sim: WorldSim, beatAnswer: WorldSim['beatAnswer']) {
    sim.beatAnswer = beatAnswer
    if (sim.location !== 'kitchen') sim.go('kitchen')
    const gate = nextTimeGate(sim.state, eraFor('a6-radio'))
    expect(gate, 'waiting for the radio to die is a flow card, not a walk').not.toBeNull()
    sim.wait(Math.max(1, at1535() - sim.state.minute))
    expect(sim.state.flags['a6:radio-dead']).toBe(true)
  }
  const at1535 = () => 15 * 60 + 36
  it('golden: the radio dies, he takes the torch batteries, and keeps listening on purpose', () => {
    const sim = tuned()
    toDeath(sim, pickAny('batteries', 'listen-on', 'stay'))
    expect(sim.state.flags['a6:revived']).toBe(true)
    expect(sim.state.flags['a6:listen-on']).toBe(true)
    sim.wait(1)
    expect(sim.endings).toEqual(['heard'])
    // (pass 28.9.2026) the winter closes on the wet father at the door, and the life keeps it
    expect(sim.state.flags['life:a6:after']).toBe('stayed')
  })
  it('messy: he runs it through the rain to Liron and holds the wire', () => {
    const sim = tuned()
    toDeath(sim, pick('carry'))
    expect(sim.state.flags['a6:carried']).toBe(true)
    expect(eraFor('a6-radio').goal?.(sim.state)).toBe('street')
    sim.go('street')
    visit(sim, 'liron-a6', pick('hold'))
    sim.beatAnswer = pick('ask')
    sim.wait(1)
    expect(sim.endings).toEqual(['liron'])
    expect(sim.state.flags['life:a6:after']).toBe('asked')
  })
  it('messy: switching it off ends the thought at once — no hour of rain to wait out', () => {
    const sim = tuned()
    toDeath(sim, pickAny('leave', 'away'))
    expect(sim.endings).toEqual(['quiet'])
    expect(sim.state.flags['life:a6:after']).toBe('away')
  })
  it('messy: walked away from the dead radio, the question waits on the counter', () => {
    const sim = tuned()
    toDeath(sim, WALK_AWAY)
    expect(sim.find('radio-a6-dead')).toBeDefined()
    visit(sim, 'radio-a6-dead', (choices) => (choices.some((c) => c.id === 'batteries') ? 'batteries' : 'listen-on'))
    expect(sim.state.flags['a6:revived']).toBe(true)
  })
  for (const temper of TEMPERS) {
    it(`confused · ${temper}: reaches an ending`, () => {
      expect(confused('a6-radio', temper).endings.length).toBeGreaterThan(0)
    })
  }
})

// ============================================================= A7 · the week before ==
describe('A7 · the week before — three sources, and silence is an ending', () => {
  it('golden: home first — the radio tells him, and "לא לשאול" ends the week there and then', () => {
    const sim = make('a7-week')
    sim.go('home')
    visit(sim, 'kobi-a7', pick('quiet'))
    expect(sim.state.flags['a7:heard-radio']).toBe(true)
    expect(sim.endings).toEqual(['silent'])
    expect(sim.state.flags['life:a7:silent']).toBe(true)
  })
  it('messy: the page, Ofir, the gap under the fence — then he asks and is refused', () => {
    const sim = make('a7-week')
    visit(sim, 'amit-a7', read)
    visit(sim, 'ofir-a7', pick('me-too'))
    expect(sim.state.flags['a7:knows-gap']).toBe(true)
    sim.go('bloomfield-outside')
    visit(sim, 'a7-gap', read)
    sim.go('home')
    visit(sim, 'kobi-a7', pick('ask'))
    expect(sim.endings).toEqual(['refused'])
    expect(sim.state.flags['life:a7:refused']).toBe(true)
  })
  for (const temper of TEMPERS) {
    it(`confused · ${temper}: reaches an ending`, () => {
      expect(confused('a7-week', temper).endings.length).toBeGreaterThan(0)
    })
  }
})

// =================================================================== A8 · 24.5.1986 ==
describe('A8 · 1986 — the week before is remembered three ways, and the day is his', () => {
  function morning(flag: string | null) {
    const def = CHAPTER['1986']!
    // a life that lived A7 one way, crossing into 24.5.1986 — entry reads the life flags
    // exactly as the real bridge does
    const pre: LifeEvent[] = flag ? [{ t: 'flag.raised', flag }] : []
    const seed = make('1986', [...pre, { t: 'year.entered', year: def.year, weekday: def.weekday, minute: def.minute }, { t: 'chapter.entered', chapter: '1986' }])
    const entry = def.entry?.(seed.state) ?? []
    if (entry.length) seed.engine.dispatch(...entry)
    seed.go('home')
    return seed
  }
  it('golden: "נראה" is not "לא" — the maybe runs out that morning', () => {
    const sim = morning('life:a7:promised')
    visit(sim, 'kobi-morning', read)
    expect(remembered(sim, 'maybe-ran-out-1986')).toBe(true)
  })
  it('messy: the boy who never asked hears his father notice the silence — and can ask now', () => {
    const sim = morning('life:a7:silent')
    visit(sim, 'kobi-morning', pick('leave'))
    expect(remembered(sim, 'still-did-not-ask-1986')).toBe(true)
    const again = morning('life:a7:silent')
    const offered: string[] = []
    visit(again, 'kobi-morning', (choices) => {
      offered.push(...choices.map((c) => c.id))
      return offered.includes('promise') ? 'promise' : 'ask'
    })
    // "ask" goes straight to the refusal scene — the promise to wait is on the table
    expect(offered).toContain('promise')
    expect(again.state.flags['asked:ticket']).toBe(true)
  })
  it('golden: the refusal is the refusal', () => {
    const sim = morning('life:a7:refused')
    expect(sim.state.flags['asked:ticket']).toBe(true)
    expect(remembered(sim, 'maybe-ran-out-1986')).toBe(false)
  })
  it('the main flow never asks for the drawer key, and no objective names it', () => {
    const era = eraFor('1986')
    for (const flags of [{}, { 'knows:match': true }, { 'kobi:left': true }]) {
      const line = era.objective({ flags } as never, 'bedroom', false) ?? ''
      expect(line).not.toMatch(/מפתח|מגירה/)
    }
  })
  for (const temper of TEMPERS) {
    it(`confused · ${temper}: gets into Bloomfield (the director plays the rest)`, () => {
      const sim = confused('1986', temper, (s) => Boolean(s.state.flags['entry:granted']), 1500)
      expect(sim.state.flags['entry:granted']).toBe(true)
    })
  }
  it('the payoff is the verified film, and it hands him "למצוא את אבא"', () => {
    expect(eraFor('1986').cutscene).toBe('1986-championship')
    expect(CUTSCENES['1986-championship']!.nextObjectiveHe).toBe('למצוא את אבא.')
  })
})

// ========================================================================== 1990 ==
describe('1990 — the benchmark stays: no film before the information race', () => {
  it('opens no archive film by itself', () => {
    expect(eraFor('1990').cutscene).toBeNull()
    expect(eraFor('1990').beats ?? []).toEqual([])
  })
})

// ========================================================================== 1991 ==
describe('1991 — homework → permission (or not asking) → the evening, never waiting for a spawn', () => {
  function afterSchool(caught = false) {
    const sim = make('1991')
    hands(sim)
    if (caught) {
      sim.press('note-1991', pick('now'))
    }
    sim.wait(50)
    sim.press('teacher-1991', read)
    expect(sim.state.flags['school:done']).toBe(true)
    return sim
  }
  it('golden: the page done by ten, then ONE card to three o’clock, a yes, and one card to the evening', () => {
    const sim = afterSchool()
    expect(sim.state.flags['hw:given']).toBe(true)
    sim.go('bedroom')
    sim.press('desk-1991', pick('work'))
    expect(sim.state.flags['hw:done']).toBe(true)
    expect(flowHolds(sim)).toBe(true)
    // Rachel is the only future gate: the flow offers the afternoon instead of a walk
    const gate = nextTimeGate(sim.state, eraFor('1991'))
    expect(gate?.beatId).toBe('era:1991:rachel')
    sim.wait(gate!.minute - sim.state.minute)
    sim.go('home')
    sim.press('rachel-1991', pick('ask'))
    expect(sim.state.flags['permission:yes']).toBe(true)
    const evening = nextTimeGate(sim.state, eraFor('1991'))
    expect(evening?.beatId).toBe('era:1991:evening')
    expect(flowHolds(sim)).toBe(true)
  })
  it('messy: caught with the note, fakes the page, lies, is refused — and leaves a note', () => {
    const sim = afterSchool(true)
    // the teacher SAID page forty-one: it is set (the fix), so the desk has something on it
    expect(sim.state.flags['hw:given']).toBe(true)
    sim.go('bedroom')
    sim.press('desk-1991', pick('fake'))
    sim.wait(Math.max(0, 15 * 60 - sim.state.minute))
    sim.go('home')
    sim.press('rachel-1991', pick('push'))
    expect(sim.state.flags['permission:no']).toBe(true)
    // a refusal is a decision still to make — no card jumps over it
    expect(nextTimeGate(sim.state, eraFor('1991'))).toBeNull()
    sim.go('kitchen')
    sim.press('pad-1991', pick('note'))
    expect(sim.state.flags['sneak:ready']).toBe(true)
    expect(nextTimeGate(sim.state, eraFor('1991'))?.beatId).toBe('era:1991:evening')
  })
  it('messy: the intentional non-request — he never asks, writes a line and goes', () => {
    const sim = afterSchool()
    sim.go('bedroom')
    sim.press('desk-1991', pick('work'))
    sim.wait(Math.max(0, 15 * 60 - sim.state.minute) + 5)
    sim.go('kitchen')
    sim.press('pad-1991', pick('note-unasked'))
    expect(sim.state.flags['sneak:unasked']).toBe(true)
    expect(sim.state.flags['sneak:ready']).toBe(true)
  })
  it('messy: he chooses to stay in — the night comes to the radio, one card away', () => {
    const sim = afterSchool()
    sim.go('bedroom')
    sim.press('desk-1991', pick('fake'))
    sim.wait(Math.max(0, 15 * 60 - sim.state.minute) + 5)
    sim.go('home')
    sim.press('rachel-1991', pick('push'))
    sim.go('kitchen')
    sim.press('pad-1991', pick('stay'))
    expect(nextTimeGate(sim.state, eraFor('1991'))?.beatId).toBe('era:1991:radio')
  })
  for (const temper of TEMPERS) {
    it(`confused · ${temper}: reaches the evening — the hall, or the radio at home`, () => {
      // a boy who wanders reaches the evening either way: in the hall asked to hold a
      // step, or at home by the radio (the "stay in" branch) — and the night then ends
      const sim = confused('1991', temper, (s) => Boolean(s.state.flags['spot:asked']) || s.endings.length > 0, 1500)
      expect(Boolean(sim.state.flags['spot:asked']) || sim.endings.length > 0, sim.trace.slice(-30).join(' ')).toBe(true)
    })
  }
})

describe('1991 — no omniscient friend (§20.3, the RESTART NOTE leak)', () => {
  it('Ofir, told nothing, asks about the kitchen — and the "no" is never in his mouth', () => {
    const ofir = CONVERSATIONS_1991.find((c) => c.id === 'ofir-afternoon-1991')!
    const refused = ofir.branches.find((b) => JSON.stringify(b.when ?? {}).includes('permission:no'))!
    expect(refused.lines[0]!.who).toBe('אופיר')
    expect(refused.lines[0]!.text.trim().endsWith('?')).toBe(true)
    for (const line of refused.lines) {
      if (line.who === 'אופיר') expect(line.text, 'Ofir states what only the flat knows').not.toMatch(/אמרה לא|לא בא\?|לא נותנת/)
      // and the boy does not blurt it here either: it is told once, as `91-ofir-told-no`
      if (line.who === 'פוגי') expect(line.text).not.toMatch(/אמרה לא/)
    }
  })
})

describe('1991 — the door remembers HOW he went (the morning callback reads it)', () => {
  const night = (flags: string[]) => {
    const sim = make('1991')
    sim.engine.dispatch(...flags.map((flag) => ({ t: 'flag.raised' as const, flag })), { t: 'clock.advanced', minutes: 22 * 60 - sim.state.minute })
    sim.go('home')
    return sim
  }
  const cases: [string, string[], string, string][] = [
    ['the unasked note, kept', ['uss:arrived', 'sneak:ready', 'sneak:unasked', 'curfew:kept', 'derby:over'], 'wall', 'left-a-note-1991'],
    ['the unasked note, broken', ['uss:arrived', 'sneak:ready', 'sneak:unasked', 'curfew:broken', 'derby:over'], 'hall', 'broke-his-own-note-1991'],
    ['after a "no", kept', ['asked:mum', 'permission:no', 'uss:arrived', 'sneak:ready', 'curfew:kept', 'derby:over'], 'wall', 'went-anyway-1991'],
    ['after a "no", broken', ['asked:mum', 'permission:no', 'uss:arrived', 'sneak:ready', 'curfew:broken', 'derby:over'], 'hall', 'came-home-late-1991'],
    ['with a yes, kept', ['asked:mum', 'permission:yes', 'uss:arrived', 'curfew:kept', 'derby:over'], 'wall', 'came-home-on-time-1991'],
  ]
  for (const [name, flags, ending, memory] of cases) {
    it(name, () => {
      const sim = night(flags)
      expect(visit(sim, 'rachel-1991', read)).toBe(true)
      expect(sim.endings).toEqual([ending])
      expect(remembered(sim, memory), memory).toBe(true)
    })
  }
})
