/**
 * מטריצת השיחה השנייה — Batch 0 of design pass v2 (§25): every conversation the world lets
 * a player open AGAIN while a mandatory next step is open, and what he hears when he does.
 *
 * It walks every chapter the way `life-confused-player` does (four temperaments over the
 * real `DialogueRunner` in `lifeWorldSim.ts`), and at every step it asks, for every person
 * and thing in the room, "if he pressed this now, would it be a repeat — and what would it
 * say?" (`spokenNow`). The answer is a row: chapter, conversation, branch, who, the live
 * graph's main step, what the game said on 25.9.2026 before the resolver (`today`, the
 * generic pool), and what it says now.
 *
 * `scripts/life/followup-matrix.ts` writes it to `tests/fixtures/life-followup-matrix.json`;
 * `tests/life-dialogue-followups.test.ts` regenerates it and holds the live answers to the
 * Definition of Done (§20.8).
 */
import { CHAPTERS } from '@/lib/life/content/chapters'
import { eraFor } from '@/lib/life/content/era'
import { RIDES, RIDE_PREFIX } from '@/lib/life/content/passages'
import { STORY_CHORES } from '@/lib/life/content/storyChores'
import type { DialogueChoice } from '@/lib/life/runtime/bus'
import { spokenNow } from '@/lib/life/runtime/dialogue'
import { legacyRepeatLine, speakerIdOf } from '@/lib/life/world/followUp'
import { liveGraph } from '@/lib/life/world/graph'

import { WALK_AWAY, WorldSim } from './lifeWorldSim'

export type MatrixRow = {
  chapter: string
  conversation: string
  branch: number
  /** the person being talked to, as the content spells him; null for a thing */
  who: string | null
  whoId: string | null
  /** the live graph's main story step when he could press it */
  step: string
  stepHe: string
  /** what a repeat said before the resolver: the generic pool */
  today: string
  /** what it says now: follow-up id(s) and class(es) seen for this row, sorted */
  now: string[]
}

type Temper = 'first' | 'last' | 'hesitant'
const TEMPERS: Temper[] = ['first', 'last', 'hesitant']

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
      const done = temper === 'last' ? 0 : chore.shape.target
      const events = chore.finish(done, chore.shape.target)
      if (events.length) world.engine.dispatch(...events)
      world.go(chore.where)
      return
    }
    if (id.startsWith(RIDE_PREFIX)) {
      const ride = RIDES[id.slice(RIDE_PREFIX.length)]
      if (!ride) return
      const asked = new Map<string, number>()
      for (const stop of ride.stops) if (stop.conversation) world.converse(stop.conversation, answerFor('first', asked, stop.conversation))
      for (const flag of ride.flags) world.engine.dispatch({ t: 'flag.raised', flag })
      world.go(ride.land.mapId as never)
    }
  }
}

const stateKey = (sim: WorldSim) =>
  String(Object.entries(sim.state.flags).filter(([key, value]) => value !== false && !key.startsWith('beat:') && !key.startsWith('own:heard:') && !key.startsWith('fu:')).length)

/** scan the room: every thing that would be a repeat if pressed now, while a main step is open */
function scan(sim: WorldSim, rows: Map<string, MatrixRow>) {
  const state = sim.state
  const graph = liveGraph(state, eraFor(sim.chapter))
  if (!graph.mainStep) return
  const stepHe = graph.story.find((item) => item.id === graph.mainStep)?.textHe ?? ''
  for (const thing of sim.things()) {
    if (thing.kind === 'exit') continue
    const spoken = spokenNow(state, thing.act)
    if (!spoken?.repeat || !spoken.pick) continue
    const who = spoken.pick.lines.find((line) => line.who && line.who !== 'פוגי')?.who ?? null
    const key = `${sim.chapter}|${thing.act}|${spoken.branchIndex}|${graph.mainStep}`
    const tag = `${spoken.pick.cls}:${spoken.pick.id}`
    const row = rows.get(key)
    if (row) {
      if (!row.now.includes(tag)) row.now = [...row.now, tag].sort()
      continue
    }
    rows.set(key, {
      chapter: sim.chapter,
      conversation: thing.act,
      branch: spoken.branchIndex,
      who,
      whoId: speakerIdOf(who),
      step: graph.mainStep,
      stepHe,
      today: legacyRepeatLine(thing.act),
      now: [tag],
    })
  }
}

function walk(chapter: string, temper: Temper, rows: Map<string, MatrixRow>, budget = 400) {
  const sim = new WorldSim(chapter)
  playMinigames(sim, temper)
  const asked = new Map<string, number>()
  const beatAsked = new Map<string, number>()
  sim.beatAnswer = (choices) => {
    const key = choices.map((choice) => choice.id).join('|')
    const times = beatAsked.get(key) ?? 0
    beatAsked.set(key, times + 1)
    if (times === 0 && temper === 'hesitant') return WALK_AWAY
    const open = choices.filter((choice) => choice.enabled)
    if (!open.length) return WALK_AWAY
    return (temper === 'last' ? open[open.length - 1] : open[0])!.id
  }
  const pressed = new Set<string>()
  const walked = new Map<string, number>()
  for (let step = 0; step < budget && sim.endings.length === 0; step += 1) {
    scan(sim, rows)
    const here = sim.location
    const things = sim.things()
    const fresh = things.find((thing) => thing.kind !== 'exit' && !pressed.has(`${here}|${thing.id}|${stateKey(sim)}`))
    if (fresh && fresh.kind !== 'exit') {
      pressed.add(`${here}|${fresh.id}|${stateKey(sim)}`)
      sim.press(fresh.id, answerFor(temper, asked, fresh.act))
      sim.wait(1)
      continue
    }
    const doors = things.filter((thing): thing is Extract<typeof thing, { kind: 'exit' }> => thing.kind === 'exit' && !thing.locked)
    if (doors.length) {
      doors.sort((a, b) => (walked.get(`${here}>${a.to}`) ?? 0) - (walked.get(`${here}>${b.to}`) ?? 0))
      const door = doors[0]!
      walked.set(`${here}>${door.to}`, (walked.get(`${here}>${door.to}`) ?? 0) + 1)
      sim.exit(door.id)
      sim.wait(2)
      continue
    }
    sim.wait(20)
  }
}

export function buildMatrix(chapters: readonly string[] = CHAPTERS.map((chapter) => chapter.id)): MatrixRow[] {
  const rows = new Map<string, MatrixRow>()
  for (const chapter of chapters) {
    for (const temper of TEMPERS) {
      try {
        walk(chapter, temper, rows)
      } catch (error) {
        // a chapter the sim cannot open (a scene-class day) is simply not in the matrix
        if (!(error instanceof Error && /no chapter/.test(error.message))) throw error
      }
    }
  }
  const order = new Map(chapters.map((id, index) => [id, index]))
  return [...rows.values()].sort(
    (a, b) =>
      (order.get(a.chapter) ?? 0) - (order.get(b.chapter) ?? 0) ||
      a.conversation.localeCompare(b.conversation) ||
      a.branch - b.branch ||
      a.step.localeCompare(b.step),
  )
}
