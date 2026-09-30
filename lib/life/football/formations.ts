/**
 * המערך — three shapes, written once, as data.
 *
 * A formation here is eleven anchors in normalised pitch space, not eleven positions in
 * metres: `x` runs 0 at your own goal line to 1 at theirs, `z` runs -0.5 to 0.5 across.
 * That is what lets the same table serve both sides, both halves and both directions
 * through one multiplication in `anchorFor`, and it is why adding 3-5-2 costs six numbers
 * rather than a new code path.
 *
 * The shapes are the ones the brief asks for and the ones Israeli football of the period
 * actually played. 4-4-2 is the 1980s default and it is what `content/manual/lineups.json`
 * records for 24.5.1986, so it is the default here too.
 */
import type { Formation, FormationId, PlayerRole, Vec2 } from './types'
import { HALF_LENGTH, HALF_WIDTH } from './pitch'
import type { Direction } from './types'

const FOUR_FOUR_TWO: Formation = {
  id: '4-4-2',
  slots: [
    { role: 'GK', x: 0.04, z: 0 },
    { role: 'FB', x: 0.2, z: -0.34 },
    { role: 'CB', x: 0.16, z: -0.12 },
    { role: 'CB', x: 0.16, z: 0.12 },
    { role: 'FB', x: 0.2, z: 0.34 },
    { role: 'WM', x: 0.46, z: -0.36 },
    { role: 'CM', x: 0.42, z: -0.12 },
    { role: 'CM', x: 0.42, z: 0.12 },
    { role: 'WM', x: 0.46, z: 0.36 },
    { role: 'ST', x: 0.68, z: -0.1 },
    { role: 'ST', x: 0.68, z: 0.1 },
  ],
}

const FOUR_THREE_THREE: Formation = {
  id: '4-3-3',
  slots: [
    { role: 'GK', x: 0.04, z: 0 },
    { role: 'FB', x: 0.22, z: -0.34 },
    { role: 'CB', x: 0.16, z: -0.12 },
    { role: 'CB', x: 0.16, z: 0.12 },
    { role: 'FB', x: 0.22, z: 0.34 },
    { role: 'DM', x: 0.34, z: 0 },
    { role: 'CM', x: 0.46, z: -0.18 },
    { role: 'CM', x: 0.46, z: 0.18 },
    { role: 'W', x: 0.7, z: -0.34 },
    { role: 'ST', x: 0.74, z: 0 },
    { role: 'W', x: 0.7, z: 0.34 },
  ],
}

const THREE_FIVE_TWO: Formation = {
  id: '3-5-2',
  slots: [
    { role: 'GK', x: 0.04, z: 0 },
    { role: 'CB', x: 0.16, z: -0.2 },
    { role: 'CB', x: 0.14, z: 0 },
    { role: 'CB', x: 0.16, z: 0.2 },
    { role: 'WM', x: 0.44, z: -0.42 },
    { role: 'CM', x: 0.38, z: -0.16 },
    { role: 'DM', x: 0.32, z: 0 },
    { role: 'CM', x: 0.38, z: 0.16 },
    { role: 'WM', x: 0.44, z: 0.42 },
    { role: 'ST', x: 0.68, z: -0.1 },
    { role: 'ST', x: 0.68, z: 0.1 },
  ],
}

export const FORMATIONS: Record<FormationId, Formation> = {
  '4-4-2': FOUR_FOUR_TWO,
  '4-3-3': FOUR_THREE_THREE,
  '3-5-2': THREE_FIVE_TWO,
}

export const FORMATION_IDS: readonly FormationId[] = ['4-4-2', '4-3-3', '3-5-2']

/**
 * A slot's home position in metres, for a side attacking in `direction`.
 *
 * `x: 0` is that side's own goal line whichever way it is playing, which is the whole
 * point of storing the shape normalised.
 */
export function anchorFor(slot: { x: number; z: number }, direction: Direction): Vec2 {
  return {
    x: (-HALF_LENGTH + slot.x * (HALF_LENGTH * 2)) * direction,
    z: slot.z * (HALF_WIDTH * 2) * direction,
  }
}

/** Roles that are expected to arrive in the box rather than hold the line. */
export function isAttacking(role: PlayerRole): boolean {
  return role === 'ST' || role === 'W' || role === 'AM'
}

export function isDefending(role: PlayerRole): boolean {
  return role === 'CB' || role === 'FB' || role === 'GK'
}
