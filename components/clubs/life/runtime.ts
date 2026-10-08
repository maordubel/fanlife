/**
 * The shell's side of the voxel play runtime (`public/life/voxel/play.js`).
 *
 * The runtime draws and walks; it decides nothing about the story. This file turns "what the
 * world looks like right now" (`sceneOf`) into the plain object the runtime is given, and types
 * the handful of things the runtime says back.
 */
import type {Chapter, LifePack, LifeState, Look, RoomId} from '@/lib/life/universal/types'
import {heroLook, sceneOf, type Scene} from '@/lib/life/universal/world'

export type PlayTarget = {kind: 'actor' | 'spot' | 'exit'; id: string; locked?: boolean} | null
export type PlayEvent =
  | {type: 'ready'; quality?: string}
  | {type: 'entered'; room: string; issues: string[]}
  | {type: 'target'; target: PlayTarget}
  | {type: 'act'; kind: 'actor' | 'spot'; id: string}
  | {type: 'exit'; id: string}
  | {type: 'locked'; id: string}
  | {type: 'tap'; kind: string}
  | {type: 'step'; surface: string}
  | {type: 'arrived'; id: string}
  | {type: 'error'; message: string}

type PlayActor = {id: string; x: number; z: number; yaw?: number; sit?: boolean; seat?: number; y?: number; head?: number; reach?: number; look: Look; talk: boolean; mark: boolean; follow: boolean}
type PlaySpot = {id: string; x: number; z: number; y?: number}
type PlayExit = {id: string; x: number; z: number; w: number; d: number; dir: string; locked: boolean}
export type PlayPeople = {actors: PlayActor[]; spots: PlaySpot[]; exits: PlayExit[]; player: Look}
export type PlayConfig = PlayPeople & {
  room: string; club: string; time: 'day' | 'night'; floorY: number; walk: [number, number, number, number]; viewH?: number; surface: string; reveal?: boolean; weather?: 'rain' | null; mood?: string
  spawn: {x: number; z: number; yaw?: number}; frame: {top: number; bottom: number}; blocks?: number[][]; clear?: number[][]; frozen?: boolean
}

export type PlayRuntime = {
  on(fn: (e: PlayEvent) => void): void
  enter(cfg: PlayConfig): boolean
  update(next: PlayPeople): boolean
  axis(x: number, y: number): void
  run(on: boolean): void
  act(): boolean
  freeze(on: boolean): void
  /** the black cover between rooms: the shell can lift it (a transition that hung) or lower it; the block engine may not have it */
  veil?(on: boolean): void
  focus(id: string | null): void
  emote(mood: string | null, hold?: number): void
  project(kind: 'actor' | 'spot' | 'exit', id: string): {x: number; y: number} | null
  frame(f: {top: number; bottom: number}): void
  where(): {room: string; x: number; z: number; target: PlayTarget; frozen: boolean; moving: boolean} | null
}

export function people(pack: LifePack, chapter: Chapter, state: LifeState, room: RoomId): {scene: Scene; play: PlayPeople} {
  const scene = sceneOf(pack, chapter, state, room)
  return {
    scene,
    play: {
      player: heroLook(pack, chapter, state),
      actors: scene.actors.map(a => ({
        id: a.id, x: a.slot.x, z: a.slot.z, yaw: a.slot.yaw, sit: !!a.slot.sit, seat: a.slot.sit?.seat, y: a.slot.sit?.y, head: a.slot.head, reach: a.slot.reach,
        look: a.look, talk: !!a.talk, mark: a.mark, follow: a.follow,
      })),
      spots: scene.spots.map(s => ({id: s.id, x: s.geo.x, z: s.geo.z, y: s.geo.y})),
      exits: scene.doors.map(d => ({id: d.id, x: d.geo.x, z: d.geo.z, w: d.geo.w, d: d.geo.d, dir: d.geo.dir, locked: d.locked})),
    },
  }
}

export function roomConfig(pack: LifePack, chapter: Chapter, state: LifeState, frame: {top: number; bottom: number}, at?: {x: number; z: number; yaw?: number}): {scene: Scene; config: PlayConfig} | null {
  const room = state.room
  const geo = room ? pack.rooms[room] : undefined
  if (!room || !geo) return null
  const {scene, play} = people(pack, chapter, state, room)
  const spawn = at ?? geo.spawns[state.spawn] ?? Object.values(geo.spawns)[0] ?? {x: (geo.walk[0] + geo.walk[2]) / 2, z: (geo.walk[1] + geo.walk[3]) / 2}
  return {
    scene,
    config: {...play, room, club: pack.clubId, time: state.time, floorY: geo.floorY, walk: geo.walk, viewH: geo.viewH, surface: geo.surface, spawn, frame, blocks: geo.blocks, clear: geo.clear, frozen: true},
  }
}
