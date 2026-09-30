import { describe, expect, it } from 'vitest'

import { RIDES, RIDE_PREFIX } from '@/lib/life/content/passages'
import { STORY_CHORES } from '@/lib/life/content/storyChores'
import type { DialogueChoice } from '@/lib/life/runtime/bus'

import { seedFor } from '@/lib/life/world/worldline'

import { HAND_VERBS, WALK_AWAY, WorldSim, type Thing } from './fixtures/lifeWorldSim'

/** Stage C chapters (delta 90) are played with the flags every life carries into them */
const SEEDED: ReadonlySet<string> = new Set(['2002-europe', '2006-home', '2007-table', '2007-registered', '2007-key', '2009-up', '2010-cup', '2010-teddy'])

/**
 * שחקן מבולבל — Director V3 §14 (`life-confused-player`).
 *
 * A player who does not know the history: he goes to what stands out in the room, he
 * closes the first box every beat opens at him by mistake, he never uses the debug panel,
 * and he does not hunt for hidden hotspots — only what is on the list of things the room
 * offers right now. He has to reach the end of the chapter without a softlock.
 *
 * `npm run life:play` drives the browser; this drives the same data headless
 * (`fixtures/lifeWorldSim.ts`), so the question can be asked for every chapter V3 rebuilt
 * and for every way he might answer. Four temperaments: he takes the first answer, he
 * takes the last, he walks away from every box once before he answers it — and (25.9.2026)
 * he goes for whatever the room offers his HANDS first, which is the player the V3 pass
 * was built for and the one whose verbs are counted.
 *
 * The same walks measure Director V3 §13: A — the longest run of answers picked with
 * nothing done in between (≤ 2 in every playable moment), B — the distinct physical verbs
 * the chapter asked of him (≥ 2 besides walking).
 */

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

/** the scenes the sim does not play: a chore is half done (or not at all), a ride is ridden to the end */
function playMinigames(sim: WorldSim, temper: Temper) {
  sim.onMinigame = (id, world) => {
    if (id.startsWith(`chore:story:`)) {
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
        // every stop is a hand on the dashboard (or the case of a radio) before it speaks
        world.streak = 0
        if (stop.conversation) world.converse(stop.conversation, answerFor(temper === 'hesitant' ? 'first' : temper, asked, stop.conversation))
      }
      for (const flag of ride.flags) world.engine.dispatch({ t: 'flag.raised', flag })
      world.go(ride.land.mapId as never)
    }
  }
}

/** what stands out in the room first: people and things in the order the room lists them — or, for the hands, the things */
function standsOut(things: readonly Thing[], temper: Temper): Thing[] {
  if (temper !== 'hands') return [...things]
  const rank = (thing: Thing) => (thing.kind === 'spot' && HAND_VERBS.has(thing.verb) ? 0 : thing.kind === 'actor' ? 1 : 2)
  return [...things].sort((a, b) => rank(a) - rank(b))
}

/** walk the day like somebody reading only what the room shows him */
function play(chapter: string, temper: Temper, budget = 400): { sim: WorldSim; path: string[] } {
  const sim = new WorldSim(chapter)
  // an adult arrives with what every life before him has raised (`seedFor` on the empty
  // worldline — e.g. `life:knows:hall` from 2004): the sim starts a chapter cold, a life never does
  if (SEEDED.has(chapter)) {
    const seed = Object.keys(seedFor(chapter, { id: 'minimal', labelHe: '', flags: {} }))
    if (seed.length) sim.engine.dispatch(...seed.map((flag) => ({ t: 'flag.raised' as const, flag })))
  }
  playMinigames(sim, temper)
  const asked = new Map<string, number>()
  // the first box a beat opens at him he closes by mistake; the next time it comes back he
  // answers it the way he answers everything (a beat left undone is armed again, rule 42)
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
      // walking up to something and reading it is not free: the clock runs while he does
      sim.wait(1)
      continue
    }
    // then the door he has used least — a person who is lost tries the other door
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
    // nothing to do and nowhere to go: time passes, the way it does when a player waits
    sim.wait(20)
  }
  return { sim, path }
}

/** a coarse fingerprint of "has anything changed since I last pressed this" */
function stateKey(sim: WorldSim): string {
  // flags only: the clock moves on every step, and a changed minute is not a changed room
  return String(Object.entries(sim.state.flags).filter(([key, value]) => value !== false && !key.startsWith('beat:') && !key.startsWith('own:heard:')).length)
}

/**
 * Every chapter of 1983–2000 that is played as beats and rooms, which is every one the V3
 * pass converted (Stage A's six days, and Stage B from the cup of 1993 to the double of
 * 2000). 1986, 1990 and 1991 are held separately below: their matches are directed by the
 * scene class (the final, the transistor network, the derby), which this sim does not play.
 */
const CHAPTERS_V3 = [
  'a2-alley', 'a3-hall', 'a4-shirt', 'a5-first', 'a6-radio', 'a7-week',
  '1993-cup', '1993-galil', '1995-sinai', '1996-army', '1997-basket', '1998-laces',
  '1999-basket', '1999-cup', '2000-title', '2000-double',
  // (delta 90, LIFE 90-D) the adult feature quests of Stage C: the head count of 2002, Liron's
  // day and the dismantling of 2006, the founding of 2007–2009, the double of 2010
  '2002-europe', '2006-home', '2007-table', '2007-registered', '2007-key', '2009-up', '2010-cup', '2010-teddy',
]
const TEMPERS: Temper[] = ['first', 'last', 'hesitant', 'hands']

describe('a player who does not know the history still reaches the end of the chapter', () => {
  for (const chapter of CHAPTERS_V3) {
    for (const temper of TEMPERS) {
      it(`${chapter} · ${temper}`, () => {
        const { sim, path } = play(chapter, temper)
        expect(sim.endings.length, `${chapter}/${temper} never ended — last rooms: ${path.slice(-12).join(' → ')} · last steps: ${sim.trace.slice(process.env.LIFE_TRACE ? -80 : -16).join(' | ')}`).toBeGreaterThan(0)
      })
    }
  }

  it('1996 goes through every day of the winter for the hesitant player', () => {
    const { sim } = play('1996-army', 'hesitant')
    for (const day of ['life:army:d2', 'life:army:d3', 'life:army:d4', 'life:army:d5']) expect(sim.state.flags[day], day).toBe(true)
  })

  /**
   * The three chapters whose climax is played by the scene class: the sim walks them as far
   * as the world takes him — through the door of the ground or the hall — and that part
   * must never stick, for any temperament.
   */
  const SCRIPTED: Record<string, string> = { '1986': 'entry:granted', '1990': 'entry:granted', '1991': 'spot:asked' }
  for (const [chapter, flag] of Object.entries(SCRIPTED)) {
    for (const temper of TEMPERS) {
      it(`${chapter} · ${temper}: reaches ${flag} (the scene class plays the rest)`, () => {
        const { sim, path } = play(chapter, temper)
        expect(sim.state.flags[flag], `${chapter}/${temper} — last rooms: ${path.slice(-12).join(' → ')}`).toBe(true)
      })
    }
  }
})

/**
 * Director V3 §13 A and B, on the same walks. A playable moment is what happens between two
 * things the player does: a box opened by a beat, and the one it leads to, count as one run
 * of answers until he walks through a door, walks up to somebody, or picks something up —
 * or until a card cuts to another day.
 */
describe('V3 §13 A — no more than two answers in a row, whoever plays it', () => {
  for (const chapter of [...CHAPTERS_V3, '1986', '1990', '1991']) {
    it(`${chapter}: the longest dialogue streak is at most 2, whoever plays it`, () => {
      const rows = TEMPERS.map((temper) => {
        const { sim } = play(chapter, temper)
        return { temper, streak: sim.maxStreak, at: sim.trace.slice(Math.max(0, sim.streakAt - 4), sim.streakAt + 1).join(' | ') }
      })
      for (const row of rows) expect(row.streak, `${chapter}/${row.temper}: ${row.at}`).toBeLessThanOrEqual(2)
    })

    // (§13 B, the verbs, is counted on what the rooms offer — `life-gameplay-density`: a
    // confused walk is the wrong instrument for it, because he leaves by the first door)
  }
})
