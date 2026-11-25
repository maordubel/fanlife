/**
 * LIFE · the hood — save, continue and settings (pure encode/decode; storage is passed in and every touch is guarded).
 * One save per club, namespaced by the club id. A browser without storage (private mode, blocked, full) is never an error:
 * every function answers "nothing saved" and the game plays on.
 */
import type {HoodRun, JobState} from './run'
import type {PlaceId} from './types'
import {newLife} from './story/director'
import {ROUTES, type StoryState} from './story/types'

/** the story's own part of a save: the director's state, and where the open mission stands in the street */
export type StorySave = {state: StoryState; /** the open mission's approach, as `mission/approach` */ plan: string | null; /** the complication's answer, once given */ choice: string | null}
export type HoodSave = {v: 1; name: string; job: JobState; step: number; got: boolean[]; x: number; z: number; t: number; waypoint: PlaceId | null; wear: boolean; /** absent in a save from before the story: such a save starts the story at its beginning */ story?: StorySave}
export type HoodSettings = {sound: boolean; invert: boolean; quality: 'lite' | 'high' | null; reduced: boolean}
export type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export const DEFAULT_SETTINGS: HoodSettings = {sound: true, invert: false, quality: null, reduced: false}
export const saveKey = (clubId: string): string => `fanlife.life.hood.v1.${clubId}`
export const settingsKey = 'fanlife.life.hood.settings.v1'
const PLACES: readonly string[] = ['home', 'kiosk', 'corner', 'school', 'pitch', 'ground']

/** the browser's storage, or null where it is missing or refuses */
export function browserStore(): Store | null {
  try { const s = window.localStorage; s.getItem('x'); return s } catch { return null }
}

const num = (v: unknown, d: number) => typeof v === 'number' && Number.isFinite(v) ? v : d
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const strs = (v: unknown, max = 64) => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, max) : []

/** a stored story, or null when it is not one (a garbled story never breaks the save: the life starts again) */
export function parseStory(v: unknown): StorySave | null {
  if (!isObj(v) || !isObj(v.state)) return null
  const o = v.state, base = newLife()
  if (o.v !== 1) return null
  const flags: StoryState['flags'] = {}
  if (isObj(o.flags)) for (const [k, x] of Object.entries(o.flags)) if (typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean') flags[k] = x
  const bonds: StoryState['bonds'] = {}
  if (isObj(o.bonds)) for (const [k, x] of Object.entries(o.bonds)) if (typeof x === 'number' && Number.isFinite(x)) bonds[k] = x
  const times: StoryState['times'] = {}
  if (isObj(o.times)) for (const [k, x] of Object.entries(o.times)) if (typeof x === 'number' && Number.isFinite(x)) times[k] = Math.max(0, Math.floor(x))
  const open = isObj(o.open) && typeof o.open.id === 'string' && typeof o.open.approach === 'string' ? {id: o.open.id, approach: o.open.approach} : null
  const state: StoryState = {
    v: 1, age: Math.max(6, Math.min(48, Math.floor(num(o.age, base.age)))), week: Math.max(1, Math.floor(num(o.week, 1))), day: Math.max(0, Math.min(6, Math.floor(num(o.day, base.day)))),
    money: Math.max(0, num(o.money, 0)), rep: num(o.rep, 0), flags, bonds, keeps: strs(o.keeps), done: strs(o.done, 256), times, open,
    route: ROUTES.includes(o.route as StoryState['route']) ? o.route as StoryState['route'] : 'family',
  }
  return {state, plan: typeof v.plan === 'string' ? v.plan : null, choice: typeof v.choice === 'string' ? v.choice : null}
}

export function parseSave(raw: string | null): HoodSave | null {
  if (!raw) return null
  try {
    const o = JSON.parse(raw) as Partial<HoodSave>
    if (!o || o.v !== 1 || (o.job !== 'idle' && o.job !== 'active' && o.job !== 'done')) return null
    return {
      v: 1, name: typeof o.name === 'string' ? o.name.slice(0, 14) : '', job: o.job, step: Math.max(0, Math.floor(num(o.step, 0))),
      got: Array.isArray(o.got) ? o.got.map(Boolean).slice(0, 1024) : [], x: num(o.x, 0), z: num(o.z, 0), t: Math.max(0, num(o.t, 0)),
      waypoint: typeof o.waypoint === 'string' && PLACES.includes(o.waypoint) ? o.waypoint as PlaceId : null, wear: o.wear !== false,
      ...(o.story !== undefined ? (() => { const st = parseStory(o.story); return st ? {story: st} : {} })() : {}),
    }
  } catch { return null }
}

export function readSave(store: Store | null, clubId: string): HoodSave | null {
  try { return store ? parseSave(store.getItem(saveKey(clubId))) : null } catch { return null }
}
export function writeSave(store: Store | null, clubId: string, save: HoodSave): boolean {
  try { if (!store) return false; store.setItem(saveKey(clubId), JSON.stringify(save)); return true } catch { return false }
}
export function clearSave(store: Store | null, clubId: string): void { try { store?.removeItem(saveKey(clubId)) } catch { /* nothing to clear */ } }

export function readSettings(store: Store | null): HoodSettings {
  try {
    const o = JSON.parse(store?.getItem(settingsKey) ?? 'null') as Partial<HoodSettings> | null
    if (!o) return {...DEFAULT_SETTINGS}
    return {sound: o.sound !== false, invert: o.invert === true, quality: o.quality === 'lite' || o.quality === 'high' ? o.quality : null, reduced: o.reduced === true}
  } catch { return {...DEFAULT_SETTINGS} }
}
export function writeSettings(store: Store | null, s: HoodSettings): void { try { store?.setItem(settingsKey, JSON.stringify(s)) } catch { /* not saved */ } }

export function snapshot(run: HoodRun, name: string, waypoint: PlaceId | null, wear: boolean, story?: StorySave): HoodSave {
  const {sim} = run
  return {v: 1, name, job: run.job, step: sim.step, got: [...sim.got], x: sim.x, z: sim.z, t: sim.t, waypoint, wear, ...(story ? {story} : {})}
}

/** put a saved life back into a fresh run; a save that no longer fits the level restores only what fits */
export function restore(run: HoodRun, s: HoodSave): void {
  const {sim, level} = run, n = level.steps.length
  run.job = s.job
  const j = level.hood!.jobs[0]
  sim.step = s.job === 'idle' || s.job === 'done' || !j ? n : Math.min(Math.max(s.step, j.from), n - 1)
  sim.got = sim.got.map((_, i) => !!s.got[i])
  const b = level.bounds
  if (s.x >= b.x0 && s.x <= b.x1 && s.z >= b.z0 && s.z <= b.z1) { sim.x = s.x; sim.z = s.z }
  sim.t = s.t
}
