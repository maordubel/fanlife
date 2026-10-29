/**
 * LIFE, universal — the GPS: where to go next, so nobody has to ask.
 *
 * GTA never makes a player wonder which way the job is: a light stands on it, and a line on the map runs to it.
 * Here the light is one beacon in the room (the runtime draws it) and the line is one button that walks him there.
 *
 * The goal is the job the episode is asking for now (a main one before a side job). When the jobs are open together
 * (two things before kick-off, either order), the one in THIS room wins, then the nearest by doors. In its room the
 * goal is the person or the thing the job is done at; anywhere else it is the next door on the way there. A job
 * whose room cannot be reached through open doors right now has no goal — the light never points at a locked door.
 */
import {meets} from './engine'
import type {Chapter, LifeState, Objective, RoomId} from './types'
import type {Scene} from './world'

export type Goal = {kind: 'actor' | 'spot' | 'exit'; id: string; /** the room the job is in */ room: RoomId; /** the job */ objective: Objective; /** false when the goal is the way there */ here: boolean}

/** the next door from `from` towards `to` through doors that are open now, and how many doors away it is */
export function wayTo(chapter: Chapter, state: LifeState, from: RoomId, to: RoomId): {door: string; hops: number} | null {
  if (from === to) return null
  const doors = chapter.doors.filter(d => meets(state, d.when) && meets(state, d.needs))
  const seen = new Set<string>([from]), queue: {room: string; first: string | null; hops: number}[] = [{room: from, first: null, hops: 0}]
  while (queue.length) {
    const cur = queue.shift()!
    if (cur.room === to && cur.first) return {door: cur.first, hops: cur.hops}
    for (const d of doors) if (d.room === cur.room && !seen.has(d.to)) { seen.add(d.to); queue.push({room: d.to, first: cur.first ?? d.id, hops: cur.hops + 1}) }
  }
  return null
}

export function goalOf(chapter: Chapter, state: LifeState, scene: Scene | null): Goal | null {
  const here = state.room
  if (!here || !scene || scene.room !== here) return null
  const side = new Set(chapter.side ?? [])
  const open = chapter.objectives.filter(o => !meets(state, o.done))
  if (!open.length) return null
  const mains = open.filter(o => !side.has(o.id))
  const first = mains[0] ?? open[0]!
  // jobs open together: the one in this room, else the nearest
  const pool = first.hub ? (mains.length ? mains : open).filter(o => o.hub === first.hub) : [first]
  const ranked = pool
    .filter(o => o.room)
    .map(o => ({o, hops: o.room === here ? 0 : wayTo(chapter, state, here, o.room!)?.hops ?? Infinity}))
    .sort((a, b) => a.hops - b.hops)
  const pick = ranked[0]
  if (!pick || pick.hops === Infinity) return null
  const o = pick.o
  if (o.room === here) {
    if (!o.at) return null
    const there = o.at.kind === 'actor' ? scene.actors.some(a => a.id === o.at!.id) : scene.spots.some(s => s.id === o.at!.id)
    return there ? {kind: o.at.kind, id: o.at.id, room: o.room, objective: o, here: true} : null
  }
  const way = wayTo(chapter, state, here, o.room!)
  if (!way || !scene.doors.some(d => d.id === way.door && !d.locked)) return null
  return {kind: 'exit', id: way.door, room: o.room!, objective: o, here: false}
}
