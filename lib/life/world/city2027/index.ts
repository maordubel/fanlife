/**
 * העיר — the places added on 27.9.2026 (the backgrounds pack and the approved folder).
 *
 * Maor: *"כדי להרחיב את חווית השחקן ולהרגיש שהוא באמת מטייל בעיר."* Every area file here
 * exports its rooms and the doors INTO them from rooms that already exist (`CityExit`),
 * so no area has to edit `scenes.ts` to be reachable — the loop at the foot of `SCENES`
 * adds each door to its room, in the painting of the year it carries (the `STAGED` idiom).
 */
import type { ExitDef, SceneDef } from '../scenes'
import type { LocationId } from '../../types'

import { EUROPE_EXITS, EUROPE_ROOMS } from './europe2010'
import { JAFFA_EXITS, JAFFA_ROOMS } from './jaffa'
import { STADIUM_EXITS, STADIUM_ROOMS } from './stadiumSide'

/**
 * a door into a new place, from a room that already exists. `onPaint` places the same door
 * on a repaint of that room, keyed by the repaint's art (`null` — not on that painting).
 */
export type CityExit = {
  from: LocationId
  exit: ExitDef
  onPaint?: Record<string, (Pick<ExitDef, 'x' | 'y' | 'w' | 'h'> & { light?: ExitDef['light'] }) | null>
}

export const CITY_ROOMS: readonly SceneDef[] = [...EUROPE_ROOMS, ...JAFFA_ROOMS, ...STADIUM_ROOMS]
export const CITY_EXITS: readonly CityExit[] = [...EUROPE_EXITS, ...JAFFA_EXITS, ...STADIUM_EXITS]
