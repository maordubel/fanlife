/**
 * LIFE, universal — what the world looks like right now, and how a conversation runs.
 *
 * `sceneOf` answers one question for the shell: in this room, at this moment of this life, who
 * is standing where, what can be touched, and which doors lead out. `Runner` plays one
 * conversation. Both are pure; the simulator in the tests uses them as they are.
 */
import {eventsOf, meets, type Directive} from './engine'
import type {Beat, Branch, Chapter, Choice, DoorGeo, LifeEvent, LifePack, LifeState, Line, Look, Objective, RoomId, Slot, SpotGeo, Talk, Tx, Verb} from './types'

export type SceneActor = {id: string; name: string; slot: Slot; look: Look; talk: string | null; follow: boolean; mark: boolean}
export type SceneSpot = {id: string; geo: SpotGeo; talk: string; verb: Verb; label: Tx}
export type SceneDoor = {id: string; geo: DoorGeo; to: RoomId; spawn: string; label: Tx; locked: boolean; blocked: Tx | null; time: 'day' | 'night' | null}
export type Scene = {room: RoomId; actors: SceneActor[]; spots: SceneSpot[]; doors: SceneDoor[]}

/** Which look the supporter has at this age, in what he is wearing today. */
export function heroLook(pack: LifePack, chapter: Chapter, state: LifeState): Look {
  const stage = chapter.age < 13 ? 'child' : chapter.age < 20 ? 'teen' : chapter.age < 60 ? 'adult' : 'elder'
  const base = pack.hero.looks[stage]
  const shirt = state.wear === 'shirt' || state.wear === 'both', scarf = state.wear === 'scarf' || state.wear === 'both'
  return {...base, kit: shirt || base.kit, scarf: scarf || base.scarf}
}

export function sceneOf(pack: LifePack, chapter: Chapter, state: LifeState, room: RoomId): Scene {
  const geo = pack.rooms[room]
  const seen = new Set<string>()
  const actors: SceneActor[] = []
  if (geo) for (const p of chapter.cast) {
    // a person is in one place: the first placement that holds is where he is.
    // Somebody who walks WITH the supporter is wherever the supporter is, so a `follow` placement
    // speaks only for its own room and is passed over everywhere else.
    if (seen.has(p.who) || (p.follow && p.room !== room) || !meets(state, p.when)) continue
    seen.add(p.who)
    if (p.room !== room) continue
    const slot = geo.slots[p.slot], member = pack.cast[p.who]
    if (!slot || !member) continue
    actors.push({id: p.who, name: nameOf(pack, chapter, p.who), slot, look: {...member.look, ...p.look}, talk: p.talk ?? null, follow: !!p.follow, mark: p.mark !== false && !!p.talk})
  }
  const spots: SceneSpot[] = []
  if (geo) for (const s of chapter.spots) {
    if (s.room !== room || !meets(state, s.when)) continue
    const g = geo.spots[s.spot]
    if (g) spots.push({id: s.id, geo: g, talk: s.talk, verb: s.verb, label: s.label})
  }
  const doors: SceneDoor[] = []
  if (geo) for (const d of chapter.doors) {
    if (d.room !== room || !meets(state, d.when)) continue
    const g = geo.doors[d.door]
    if (g) doors.push({id: d.id, geo: g, to: d.to, spawn: d.spawn, label: d.label, locked: !meets(state, d.needs), blocked: d.blocked ?? null, time: d.time ?? null})
  }
  return {room, actors, spots, doors}
}

/** What the dialogue box calls somebody today: the chapter's word for a walk-on, else the pack's name for the role. */
export const nameOf = (pack: Pick<LifePack, 'cast'>, chapter: Chapter, who: string): string => chapter.names?.[who] ?? pack.cast[who]?.name ?? who

/** The first thing not yet done. Null when the chapter has nothing left to ask (it is ending). */
export const objectiveOf = (chapter: Chapter, state: LifeState): Objective | null => chapter.objectives.find(o => !meets(state, o.done)) ?? null

export const beatFlag = (id: string) => `beat:${id}`
/** The beat that is waiting in this room, if any. A beat plays once per chapter. */
export const beatFor = (chapter: Chapter, state: LifeState, room: RoomId): Beat | null =>
  chapter.beats.find(b => b.room === room && state.flags[beatFlag(b.id)] === undefined && meets(state, b.when)) ?? null

export const talkOf = (chapter: Chapter, id: string): Talk | null => chapter.talks.find(t => t.id === id) ?? null
export const branchOf = (talk: Talk, state: LifeState): Branch | null => talk.branches.find(b => meets(state, b.when)) ?? null
/** A choice the life does not qualify for is not offered. */
export const choicesOf = (branch: Branch, state: LifeState): Choice[] => (branch.choices ?? []).filter(c => meets(state, c.when))

export type DoorResult = {ok: true; events: LifeEvent[]} | {ok: false; blocked: Tx | null}
export function throughDoor(door: {to: RoomId; spawn: string; time?: 'day' | 'night' | null; locked?: boolean; blocked?: Tx | null}, state: LifeState): DoorResult {
  if (door.locked) return {ok: false, blocked: door.blocked ?? null}
  return {ok: true, events: [{t: 'moved', room: door.to, spawn: door.spawn, time: door.time ?? state.time}]}
}

/* ───────────── one conversation ───────────── */

export type RunnerView = {talk: string; lines: Line[]; index: number; choices: Choice[]; done: boolean}

/**
 * Plays a conversation line by line. Leaving is always allowed and applies NOTHING — so a box
 * closed by mistake costs the player a sentence, never a day (the rule the Hapoel LIFE learned
 * the hard way). Effects are applied when a branch runs out of lines, or when a choice is taken.
 */
export class Runner {
  private branch: Branch | null = null
  private talk: Talk | null = null
  private i = 0
  /** what the log has to gain and the screen has to do once the box closes */
  events: LifeEvent[] = []
  directives: Directive[] = []
  /** the conversation to pick up once the directives have played out */
  resume: string | null = null

  constructor(private readonly chapter: Chapter, private state: LifeState, private readonly applyNow: (events: LifeEvent[]) => LifeState) {}

  start(id: string): RunnerView | null {
    const talk = talkOf(this.chapter, id)
    const branch = talk && branchOf(talk, this.state)
    if (!talk || !branch) return null
    this.talk = talk; this.branch = branch; this.i = 0
    return this.view()
  }

  view(): RunnerView {
    const b = this.branch!, last = this.i >= b.lines.length - 1
    return {talk: this.talk!.id, lines: b.lines, index: Math.min(this.i, Math.max(0, b.lines.length - 1)), choices: last ? choicesOf(b, this.state) : [], done: false}
  }

  private settle(effects: readonly import('./types').Effect[] | undefined) {
    const {events, directives} = eventsOf(effects, this.state)
    if (events.length) { this.state = this.applyNow(events); this.events.push(...events) }
    this.directives.push(...directives)
  }

  /** Next line; at the end of a branch with no choices, its effects apply and it chains or closes. */
  advance(): RunnerView {
    const b = this.branch!
    if (this.i < b.lines.length - 1) { this.i++; return this.view() }
    if (choicesOf(b, this.state).length) return this.view()
    this.settle(b.then)
    return this.chain(b.next)
  }

  choose(id: string): RunnerView {
    const b = this.branch!, c = choicesOf(b, this.state).find(x => x.id === id)
    if (!c) return this.view()
    // a branch that asks a question is answered by the choice alone; its own `then` is for branches that end by themselves
    this.settle(c.then)
    return this.chain(c.next ?? b.next)
  }

  private chain(next: string | undefined): RunnerView {
    // a cut, a game, a card or an ending closes the box: the screen has something to do before anybody
    // speaks again. What was going to be said next is kept, and said when the screen is done.
    const halts = this.directives.some(d => d.d !== 'sound')
    if (next && halts) this.resume = next
    else if (next) { const v = this.start(next); if (v) return v }
    return {talk: this.talk!.id, lines: [], index: 0, choices: [], done: true}
  }
}
