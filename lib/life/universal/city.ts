/**
 * LIFE, universal — the city seen from above.
 *
 * The rooms of a life are not a list: they are places in one town, and a person learns a town by
 * walking it. This file lays the rooms out as districts of a single map and answers four
 * questions of the life so far — nothing here draws, and nothing here decides the story:
 *
 *  · what has the supporter SEEN (every room he has stood in, in any chapter — the town grows
 *    as the life does);
 *  · what does he KNOW is there (a door of today's chapter leads to it, or today's errand points
 *    at it) without having been;
 *  · how does he get from here to there (a route through doors that are open right now — never
 *    through a locked one, and never past a room where somebody is waiting for him);
 *  · what is there (who stands in it today, what work and what shop, which errand points at it).
 *
 * The layout is fixed; the club's own city is dressed from its id by the shell, so no two clubs
 * walk the same streets, and no club is named here.
 */
import {meets} from './engine'
import {beatFor, nameOf, sceneOf} from './world'
import type {Chapter, DoorUse, LifePack, LifeState, RoomId} from './types'

export type SiteKind = 'home' | 'school' | 'street' | 'work' | 'stadium' | 'bus' | 'abroad' | 'pitch'
export type Site = {id: RoomId; x: number; y: number; kind: SiteKind}

/** The town is 100 wide and 112 tall: home in the south-west, the ground in the north-east. */
export const CITY = {w: 100, h: 112}

export const SITES: Record<RoomId, Site> = {
  bedroom: {id: 'bedroom', x: 12, y: 100, kind: 'home'},
  kitchen: {id: 'kitchen', x: 13, y: 85, kind: 'home'},
  room: {id: 'room', x: 30, y: 95, kind: 'home'},
  street: {id: 'street', x: 50, y: 78, kind: 'street'},
  pitch: {id: 'pitch', x: 74, y: 68, kind: 'pitch'},
  workshop: {id: 'workshop', x: 72, y: 92, kind: 'work'},
  schoolyard: {id: 'schoolyard', x: 30, y: 64, kind: 'school'},
  classroom: {id: 'classroom', x: 13, y: 54, kind: 'school'},
  'bus-stop': {id: 'bus-stop', x: 32, y: 46, kind: 'bus'},
  'bus-station': {id: 'bus-station', x: 46, y: 31, kind: 'bus'},
  route: {id: 'route', x: 60, y: 56, kind: 'street'},
  gate: {id: 'gate', x: 70, y: 40, kind: 'stadium'},
  tunnel: {id: 'tunnel', x: 80, y: 29, kind: 'stadium'},
  terrace: {id: 'terrace', x: 88, y: 16, kind: 'stadium'},
  'away-end': {id: 'away-end', x: 62, y: 15, kind: 'stadium'},
  'flat-abroad': {id: 'flat-abroad', x: 89, y: 104, kind: 'abroad'},
}

/** The town's word for a kind of place, when nobody has named the room. */
export const KIND_LABEL: Record<SiteKind, string> = {home: 'Home', school: 'School', street: 'The street', work: 'Work', stadium: 'The ground', bus: 'The buses', abroad: 'Far from home', pitch: 'The pitch'}

export type Status = 'here' | 'seen' | 'known' | 'hidden'

export type Route = {ok: true; hops: RoomId[]; doors: DoorUse[]; stopsAt: RoomId | null; to: RoomId} | {ok: false; reason: string | null}

/** What a room is called: the chapter's own word for it when a door names it, else the town's word for its kind. */
export function roomName(pack: LifePack, room: RoomId, chapter?: Chapter | null): string {
  const chapters = chapter ? [chapter, ...pack.chapters] : pack.chapters
  for (const c of chapters) { const d = c.doors.find(x => x.to === room); if (d) return d.label }
  const site = SITES[room]
  return site ? KIND_LABEL[site.kind] : room
}

/** Every pair of rooms any chapter joins by a door: the roads of the town. */
export function roads(pack: LifePack): [RoomId, RoomId][] {
  const seen = new Set<string>(), out: [RoomId, RoomId][] = []
  for (const c of pack.chapters) for (const d of c.doors) {
    const key = [d.room, d.to].sort().join('|')
    if (!seen.has(key) && SITES[d.room] && SITES[d.to]) { seen.add(key); out.push([d.room, d.to]) }
  }
  return out
}

/**
 * How he gets from where he stands to `to`, by the doors that are open now. A locked door is not
 * walked through (and says why); a room where somebody is waiting for him is where the walk stops,
 * so that nothing in a day is skipped by looking at a map.
 */
export function routeTo(pack: LifePack, chapter: Chapter, state: LifeState, to: RoomId): Route {
  const from = state.room
  if (!from || from === to) return {ok: false, reason: null}
  const open = chapter.doors.filter(d => meets(state, d.when))
  const prev = new Map<RoomId, {via: DoorUse; from: RoomId}>(), queue: RoomId[] = [from], seen = new Set<RoomId>([from])
  let blocked: string | null = null
  while (queue.length) {
    const here = queue.shift()!
    for (const d of open) {
      if (d.room !== here || seen.has(d.to)) continue
      if (!meets(state, d.needs)) { if (d.to === to || !blocked) blocked = d.blocked ?? null; continue }
      seen.add(d.to); prev.set(d.to, {via: d, from: here}); queue.push(d.to)
    }
  }
  if (!prev.has(to)) return {ok: false, reason: blocked}
  const chain: DoorUse[] = []
  for (let at: RoomId = to; at !== from;) { const p = prev.get(at)!; chain.unshift(p.via); at = p.from }
  // somebody waiting in a room along the way: the walk ends there
  const cut = chain.findIndex((d, i) => i < chain.length - 1 && !!beatFor(chapter, state, d.to))
  const doors = cut >= 0 ? chain.slice(0, cut + 1) : chain
  const last = doors[doors.length - 1]!
  return {ok: true, hops: doors.map(d => d.to), doors, stopsAt: cut >= 0 ? last.to : null, to: last.to}
}

export type Presence = {id: string; name: string; met: boolean}
export type Offer = {id: string; label: string; kind: 'job' | 'shop' | 'rest'}

export type Place = Site & {
  name: string
  status: Status
  goal: boolean
  /** today's errand, in its own words, when it points here */
  errand: string | null
  people: Presence[]
  offers: Offer[]
  route: Route
}

export type City = {
  places: Place[]
  roads: [RoomId, RoomId][]
  explored: number
  total: number
  met: number
  people: number
}

export function cityOf(pack: LifePack, chapter: Chapter, state: LifeState): City {
  const objective = chapter.objectives.find(o => !meets(state, o.done)) ?? null
  const adjacent = new Set(chapter.doors.filter(d => d.room === state.room && meets(state, d.when)).map(d => d.to))
  const seen = new Set(state.seen)
  // the places today is made of: anything a door, a person or an errand of this chapter touches
  const today = new Set<RoomId>([chapter.start.room, ...chapter.cast.map(p => p.room), ...chapter.spots.map(s => s.room), ...chapter.doors.flatMap(d => [d.room, d.to])])
  const places = Object.values(SITES).filter(s => pack.rooms[s.id]).map((s): Place => {
    const here = state.room === s.id
    const known = adjacent.has(s.id) || objective?.room === s.id
    const status: Status = here ? 'here' : seen.has(s.id) ? 'seen' : known ? 'known' : 'hidden'
    const scene = today.has(s.id) ? sceneOf(pack, chapter, state, s.id) : null
    const offers: Offer[] = (scene?.spots ?? []).flatMap((sp): Offer[] =>
      sp.id.startsWith('job-') ? [{id: sp.id, label: sp.label, kind: 'job'}]
        : sp.id === 'hatch' ? [{id: sp.id, label: sp.label, kind: 'shop'}]
          : sp.id.startsWith('rest-') ? [{id: sp.id, label: sp.label, kind: 'rest'}] : [])
    return {
      ...s,
      name: roomName(pack, s.id, chapter),
      status,
      goal: objective?.room === s.id,
      errand: objective?.room === s.id ? objective.t : null,
      // a face is shown only to somebody who has met it
      people: status === 'hidden' || status === 'known' ? [] : (scene?.actors ?? []).map(a => ({id: a.id, name: nameOf(pack, chapter, a.id), met: state.met.includes(a.id)})),
      offers: status === 'hidden' || status === 'known' ? [] : offers,
      route: here ? {ok: false, reason: null} : routeTo(pack, chapter, state, s.id),
    }
  })
  const cast = new Set(pack.chapters.flatMap(c => c.cast.map(p => p.who)))
  return {
    places, roads: roads(pack),
    explored: places.filter(p => p.status === 'here' || p.status === 'seen').length, total: places.length,
    met: state.met.filter(w => cast.has(w)).length, people: cast.size,
  }
}

/** The night the club wrote down, as the map shows it: the whole thing once the life has reached it, a rumour before. */
export function centrepiece(pack: LifePack, state: LifeState): {chapter: Chapter; reached: boolean; done: boolean} | null {
  const at = pack.chapters.findIndex(c => c.centrepiece)
  if (at < 0) return null
  const chapter = pack.chapters[at]!, now = pack.chapters.findIndex(c => c.id === state.chapter)
  return {chapter, reached: now >= at || !!state.done[chapter.id], done: !!state.done[chapter.id]}
}
