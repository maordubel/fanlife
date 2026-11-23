/**
 * LIFE · the hood — the district map as geometry drawn from the real level (pure), the waypoint and the HUD's targets.
 * Map space is world space with the ground at the top (−z is up), so a drawing needs no flip: x → x, z → y.
 */
import type {Level} from '@/lib/life/rush/level'
import {stepTarget} from '@/lib/life/rush/sim'
import {openStep, type HoodRun} from './run'
import type {PlaceId, PersonId} from './types'

export type Rect = {x: number; y: number; w: number; h: number}
export type MapPlace = {id: PlaceId; key: string; descKey: string; x: number; y: number; r: number; /** a person here is offering a job, or the job's next step is here */ job: boolean}
export type DistrictModel = {
  bounds: Rect
  /** the roads (the level's walkable union) */
  streets: Rect[]
  /** building blocks between the roads, deterministic from the seed */
  blocks: (Rect & {tone: 0 | 1 | 2})[]
  /** the small green: the pitch */
  pitch: Rect
  /** the ground's footprint at the top of the main street */
  ground: Rect
  places: MapPlace[]
  kiosk: Rect
}

const rect = (x0: number, x1: number, z0: number, z1: number): Rect => ({x: x0, y: z0, w: x1 - x0, h: z1 - z0})

/** which place a person gives or takes a job in, by id */
const PERSON_PLACE: Record<PersonId, PlaceId | null> = {dad: 'home', mate: 'corner', kiosk: 'kiosk', neighbour: null}

/** where the job's next stop is: a place id, or null */
export function jobPlaces(run: Pick<HoodRun, 'job' | 'sim' | 'level'>): Set<PlaceId> {
  const out = new Set<PlaceId>(), h = run.level.hood!
  if (run.job === 'idle') out.add(PERSON_PLACE[h.jobs[0]!.giver]!)
  else if (run.job === 'active') {
    const s = run.level.steps[run.sim.step]
    if (s) { const near = h.places.map(p => [p, Math.hypot(p.x - s.x, p.z - s.z)] as const).sort((a, b) => a[1] - b[1])[0]; if (near) out.add(near[0].id) }
  }
  return out
}

export function districtModel(level: Level, run?: Pick<HoodRun, 'job' | 'sim' | 'level'>): DistrictModel {
  const h = level.hood!, b = level.bounds, {walk, half, side} = level
  const jobs = run ? jobPlaces(run) : new Set<PlaceId>()
  const streets = level.areas.map(a => rect(a.x0, a.x1, a.z0, a.z1))
  // blocks: in each band between two cross streets, one block either side of the main street, trimmed by the seed
  const cz = [...level.crossings].sort((p, q) => q - p)  // from the home end (large z) to the ground end
  const edges = [b.z1 - 2, ...cz.flatMap(z => [z + 8.4, z - 8.4]), b.z0 + 36]
  const blocks: DistrictModel['blocks'] = []
  let n = (level.seed * 2654435761) >>> 0
  const rnd = () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296 }
  for (let i = 0; i + 1 < edges.length; i += 2) {
    const zTop = edges[i + 1]!, zBot = edges[i]!   // zTop < zBot
    if (zBot - zTop < 6) continue
    for (const sd of [-1, 1]) {
      const x0 = walk + 1.5, x1 = side - 2
      // two or three buildings per side per band, a lane's gap between them
      const cuts = 2 + Math.floor(rnd() * 2), span = (zBot - zTop) / cuts
      for (let k = 0; k < cuts; k++) {
        const w = (x1 - x0) * (0.55 + rnd() * 0.4), z0 = zTop + k * span + 1.2, z1 = zTop + (k + 1) * span - 1.2
        if (z1 - z0 < 4) continue
        const xa = sd === 1 ? x0 : -x0 - w
        blocks.push({...rect(xa, xa + w, z0, z1), tone: (Math.floor(rnd() * 3) % 3) as 0 | 1 | 2})
      }
    }
  }
  // the blocks must not sit on the named places
  const clear = blocks.filter(bl => !h.places.some(p => p.id !== 'ground' && p.id !== 'home' && p.x > bl.x - 3 && p.x < bl.x + bl.w + 3 && p.z > bl.y - 3 && p.z < bl.y + bl.h + 3))
  const pitch = rect(h.pitch.x - h.pitch.w / 2, h.pitch.x + h.pitch.w / 2, h.pitch.z - h.pitch.d / 2, h.pitch.z + h.pitch.d / 2)
  const ground = rect(-half - 12, half + 12, b.z0 - 14, b.z0 + 24)
  const k = level.blocks[0]
  return {
    bounds: rect(b.x0, b.x1, b.z0 - 16, b.z1),
    streets, blocks: clear, pitch, ground,
    places: h.places.map(p => ({id: p.id, key: p.key, descKey: `${p.key}.desc`, x: p.x, y: p.z, r: p.r, job: jobs.has(p.id)})),
    kiosk: k ? rect(k.x0, k.x1, k.z0, k.z1) : rect(0, 0, 0, 0),
  }
}

/** the place nearest a map point within `tol` metres (the tap on a map) */
export function placeNear(m: DistrictModel, x: number, y: number, tol: number): MapPlace | null {
  let best: MapPlace | null = null, bd = Infinity
  for (const p of m.places) { const d = Math.hypot(p.x - x, p.y - y); if (d < tol && d < bd) { bd = d; best = p } }
  return best
}

export type Target = {x: number; z: number; kind: 'waypoint' | 'step'}
/** what the HUD arrow points to: the player's waypoint first, else the open step of the job, else nothing */
export function hudTarget(run: HoodRun, waypoint: PlaceId | null): Target | null {
  if (waypoint) { const p = run.level.hood!.places.find(q => q.id === waypoint); if (p) return {x: p.x, z: p.z, kind: 'waypoint'} }
  if (openStep(run) >= 0) { const t = stepTarget(run.level, run.sim); if (t) return {x: t.x, z: t.z, kind: 'step'} }
  return null
}
export const metresTo = (run: Pick<HoodRun, 'sim'>, t: {x: number; z: number}): number => Math.round(Math.hypot(t.x - run.sim.x, t.z - run.sim.z))

/** the minimap's ring: how far through the job (when one is open) or how far down the street to the ground */
export function ringProgress(run: HoodRun): number {
  const h = run.level.hood!, j = h.jobs[0]!
  if (run.job === 'done') return 1
  if (run.job === 'active') return Math.max(0, Math.min(1, (run.sim.step - j.from) / j.steps))
  const b = run.level.bounds
  return Math.max(0, Math.min(1, (run.level.start.z - run.sim.z) / (run.level.start.z - b.z0)))
}
