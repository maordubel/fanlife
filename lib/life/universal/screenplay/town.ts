/**
 * The town of the second screenplay — which rooms touch which, by which door.
 *
 * The geometry (where a door stands in a room, where a body arrives) is `rooms.ts`; this file
 * only says which door leads to which room, so a chapter is a walk through a place and not a
 * list of cuts. Nothing here is a story: a chapter picks a room and the town supplies the way.
 */
import {ROOMS} from '../rooms'
import type {Cond, DoorUse} from '../types'
import type {Words} from './types'

type Edge = {a: string; da: string; sa: string; b: string; db: string; sb: string}
/**
 * `da` is the door of `a` that leads to `b`, and `sb` is where you arrive in `b`;
 * `db` leads back, arriving at `sa`.
 */
const E = (a: string, da: string, sa: string, b: string, db: string, sb: string): Edge => ({a, da, sa, b, db, sb})

/** The street's east door is the only one that serves several places: which one is the story's business. */
export const EAST_DEFAULT = 'route'

export const EDGES: readonly Edge[] = [
  E('room', 'front', 'fromStreet', 'street', 'home', 'fromHome'),
  E('room', 'east', 'fromKitchen', 'kitchen', 'door', 'fromLiving'),
  E('room', 'south', 'fromBedroom', 'bedroom', 'door', 'fromLiving'),
  E('street', 'west', 'fromWest', 'schoolyard', 'east', 'fromStreet'),
  E('schoolyard', 'school', 'fromClass', 'classroom', 'door', 'fromYard'),
  E('street', 'east', 'fromEast', 'route', 'west', 'fromStreet'),
  E('street', 'east', 'fromEast', 'pitch', 'street', 'fromStreet'),
  E('street', 'east', 'fromEast', 'bus-stop', 'west', 'fromStreet'),
  E('street', 'east', 'fromEast', 'bus-station', 'west', 'fromStreet'),
  E('street', 'east', 'fromEast', 'workshop', 'door', 'fromStreet'),
  E('route', 'east', 'fromGate', 'gate', 'west', 'fromRoute'),
  E('gate', 'turnstile', 'fromInside', 'tunnel', 'back', 'fromGate'),
  E('tunnel', 'light', 'fromTerrace', 'terrace', 'tunnel', 'fromTunnel'),
  E('bus-station', 'bus', 'start', 'away-end', 'out', 'start'),
]

export const LABEL: Record<string, Words> = {
  room: ['The living room', 'הסלון'], bedroom: ['Your room', 'החדר שלך'], kitchen: ['The kitchen', 'המטבח'],
  street: ['The street', 'הרחוב'], schoolyard: ['The schoolyard', 'חצר בית הספר'], classroom: ['The classroom', 'הכיתה'],
  route: ['The road to the ground', 'הדרך אל {ground}'], gate: ['The gate', 'השער'], tunnel: ['The tunnel', 'המנהרה'], terrace: ['The terrace', 'המדרגות'],
  pitch: ['The pitch', 'המגרש בשכונה'], 'bus-stop': ['The bus stop', 'תחנת האוטובוס'], 'bus-station': ['The bus station', 'התחנה המרכזית'],
  workshop: ['The workshop', 'הנגרייה'], 'away-end': ['The away end', 'יציע האורחים'], 'flat-abroad': ['The flat abroad', 'הדירה בחו״ל'],
}

/** Who stands where when the scene does not say: the first free one of the room's preferred slots. */
export const SLOT_PREF: Record<string, string[]> = {
  room: ['sofa', 'rug', 'window', 'stool', 'byDoor', 'sofaEnd'], bedroom: ['byDoor', 'byDesk', 'rug', 'bed'],
  kitchen: ['table', 'counter', 'tableEnd', 'fridge'], 'flat-abroad': ['visitor', 'bed'],
  classroom: ['teacher', 'front', 'back'], schoolyard: ['friend', 'rival', 'bench', 'hoop'],
  street: ['customer', 'corner', 'wall', 'kerb', 'shutter', 'doorstep', 'kiosk'], pitch: ['friend', 'captain', 'elder', 'goal'],
  route: ['seller', 'lamp', 'corner'], gate: ['steward', 'wait', 'fence', 'far'], tunnel: ['wall', 'ahead'],
  terrace: ['fence', 'left', 'right', 'steward'], 'away-end': ['fence', 'left', 'steward'],
  'bus-stop': ['wait', 'stranger', 'bench'], 'bus-station': ['friend', 'driver', 'pillar', 'far'], workshop: ['boss', 'mate', 'bench'],
}
/** A role has a place of its own where the room has one for it. */
export const ROLE_SLOT: Record<string, Record<string, string>> = {
  street: {kiosk: 'kiosk', seller: 'kiosk'}, route: {seller: 'seller'}, gate: {steward: 'steward'}, classroom: {teacher: 'teacher'},
  workshop: {boss: 'boss', mate: 'mate'}, 'bus-station': {driver: 'driver'}, schoolyard: {friend: 'friend', rival: 'rival'}, pitch: {captain: 'captain', elder: 'elder', friend: 'friend'},
  room: {dad: 'sofa', mum: 'byDoor'}, kitchen: {mum: 'counter', dad: 'table'}, bedroom: {mum: 'byDoor', dad: 'byDoor'},
}
export const SPOT_PREF: Record<string, string[]> = {
  room: ['table', 'tv', 'frame', 'photos', 'lamp'], bedroom: ['desk', 'box', 'wardrobe', 'ball', 'flag', 'window'],
  kitchen: ['table', 'radio', 'drawer', 'fridge', 'shelf', 'window'], 'flat-abroad': ['laptop', 'phone', 'window', 'boxes', 'bed', 'stove', 'banner'],
  classroom: ['board', 'desk', 'teacherDesk', 'window'], schoolyard: ['ball', 'wall', 'bench'], street: ['crates', 'window', 'graffiti', 'bin', 'car'],
  pitch: ['ball', 'jackets', 'wall'], route: ['sign', 'flags'], gate: ['board', 'flag'], tunnel: ['sign'], terrace: ['banner', 'pitch'],
  'away-end': ['pitch'], 'bus-stop': ['sign'], 'bus-station': ['board', 'bench'], workshop: ['tools', 'radio', 'banner', 'cans', 'ladder'],
}

const adjacency = (() => {
  const m = new Map<string, Set<string>>()
  const link = (x: string, y: string) => { if (!m.has(x)) m.set(x, new Set()); m.get(x)!.add(y) }
  for (const e of EDGES) { link(e.a, e.b); link(e.b, e.a) }
  return m
})()

/** The rooms between two rooms, both ends included; null when the town does not join them (a cut is needed). */
export function pathRooms(from: string, to: string): string[] | null {
  if (from === to) return [from]
  const prev = new Map<string, string>([[from, '']]), queue = [from]
  while (queue.length) {
    const here = queue.shift()!
    for (const next of adjacency.get(here) ?? []) {
      if (prev.has(next)) continue
      prev.set(next, here)
      if (next === to) { const out = [to]; for (let at = to; prev.get(at); at = prev.get(at)!) out.unshift(prev.get(at)!); return out }
      queue.push(next)
    }
  }
  return null
}

export const inTown = (room: string) => adjacency.has(room)

/** The doors of a chapter: every edge whose two rooms the chapter uses, and the street's east door by what the story points it at. */
export function townDoors(rooms: ReadonlySet<string>, east: {dest: string; when: Cond}[], label: (room: string) => string): DoorUse[] {
  const out: DoorUse[] = []
  const none = (): Cond => ({none: east.map(x => x.when)})
  const door = (id: string, room: string, d: string, to: string, spawn: string, when?: Cond) => {
    if (!ROOMS[room]?.doors[d]) throw new Error(`TOWN_DOOR:${room}.${d}`)
    if (!ROOMS[to]?.spawns[spawn]) throw new Error(`TOWN_SPAWN:${to}.${spawn}`)
    out.push({id, room, door: d, to, spawn, label: label(to), ...(when ? {when} : {})})
  }
  for (const e of EDGES) {
    if (!rooms.has(e.a) || !rooms.has(e.b)) continue
    const toward = e.a === 'street' && e.da === 'east' ? east.filter(x => x.dest === e.b) : null
    // the way out of the east door: down the road by default, to a place of the story's choosing while a scene points there
    if (toward) {
      if (e.b === EAST_DEFAULT && east.length) door(`${e.a}-${e.b}`, e.a, e.da, e.b, e.sb, none())
      else if (e.b === EAST_DEFAULT) door(`${e.a}-${e.b}`, e.a, e.da, e.b, e.sb)
      else if (toward.length) door(`${e.a}-${e.b}`, e.a, e.da, e.b, e.sb, {any: toward.map(x => x.when)})
    } else door(`${e.a}-${e.b}`, e.a, e.da, e.b, e.sb)
    door(`${e.b}-${e.a}`, e.b, e.db, e.a, e.sa)
  }
  return out
}
