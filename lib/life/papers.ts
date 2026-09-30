import { KM, MAP_PLACE, MAP_PLACES, project, type MapPlaceDef, type MapPlaceId } from './map'
import type { MechanicLevel } from '../mechanics/types'

/**
 * סיבוב העיתונים — the paper round as a plan, not a walk (21.9.2026).
 *
 * The boy is handed a bundle at the kiosk and a list of doors. The order is his: the round
 * is scored as the shortest way round the same doors over the way he chose, so the whole
 * skill is looking at the city before leaving (`organization`). Nothing here is new
 * geography — the doors are the map's own places (`map.ts`), at their real coordinates,
 * only those of the life's own time and never the ones off the edge of the map.
 *
 * Pure: the sheet (`components/life/mechanics/LifePapers.tsx`) draws it and the ledger
 * pays it through `settleActivity`, like every other activity.
 */

/** where every round starts and ends — Rafi's counter */
export const PAPERS_FROM: MapPlaceId = 'kiosk'

/** how many doors a round is, by age: a child carries fewer papers */
export const PAPERS_STOPS: Record<MechanicLevel, number> = { child: 4, teen: 5, adult: 6 }

export type PaperStop = { id: MapPlaceId; labelHe: string; subHe: string; x: number; y: number }

const stopOf = (place: MapPlaceDef): PaperStop => ({ id: place.id, labelHe: place.labelHe, subHe: place.subHe, ...project(place.lat, place.lon) })

function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** the doors of this round: places of the life's own time, on the map, off the save's seed */
export function paperStops(year: number, level: MechanicLevel, seed: number): PaperStop[] {
  const pool = MAP_PLACES.filter((place) => !place.offMap && place.fromYear <= year && place.id !== PAPERS_FROM)
  const ranked = [...pool].sort((a, b) => hash(`${seed}|${a.id}`) - hash(`${seed}|${b.id}`))
  return ranked.slice(0, Math.min(PAPERS_STOPS[level], ranked.length)).map(stopOf)
}

export const paperStart = (): PaperStop => stopOf(MAP_PLACE[PAPERS_FROM] as MapPlaceDef)

const gap = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)

/** the length of a round in map units: out from the kiosk, door by door, and back */
export function roundLength(order: readonly PaperStop[], start: PaperStop = paperStart()): number {
  let total = 0
  let at: { x: number; y: number } = start
  for (const stop of order) {
    total += gap(at, stop)
    at = stop
  }
  return total + gap(at, start)
}

/** the shortest round over the same doors — every order, which for six doors is 720 */
export function shortestRound(stops: readonly PaperStop[], start: PaperStop = paperStart()): number {
  let best = Number.POSITIVE_INFINITY
  const walk = (left: PaperStop[], taken: PaperStop[]) => {
    if (left.length === 0) {
      best = Math.min(best, roundLength(taken, start))
      return
    }
    for (let i = 0; i < left.length; i += 1) walk([...left.slice(0, i), ...left.slice(i + 1)], [...taken, left[i] as PaperStop])
  }
  walk([...stops], [])
  return best
}

/** 0..1 — the shortest way round over the way he went; a round that skipped a door is not a round */
export function routeScore(order: readonly PaperStop[], stops: readonly PaperStop[]): number {
  if (order.length !== stops.length || stops.length === 0) return 0
  const ids = new Set(order.map((stop) => stop.id))
  if (stops.some((stop) => !ids.has(stop.id))) return 0
  const mine = roundLength(order)
  return mine > 0 ? Math.max(0, Math.min(1, shortestRound(stops) / mine)) : 0
}

/** metres, for the line on the sheet — the map's own scale */
export const metres = (units: number) => Math.round((units / KM) * 1000)
