import type {SlotRole} from '@/lib/xi/roles'

export type PitchSlot = {
  slotId: SlotId
  /** GK · CB · LB · RB · CM · LW · ST … shown under the slot */
  roleHe: string
  /**
   * The slot's detailed role, as a code — what the FORMATION asks of this position and
   * nothing about any player. Gate 1's scouting drawer maps it DOWN to the four canonical
   * positions (`lib/xi/roles.ts`).
   */
  role: SlotRole
  /** percentages, origin at the defensive end */
  x: number
  y: number
}

type SlotId = string

export type Formation = { name: string; slots: PitchSlot[] }

const gk = (y = 94): PitchSlot => ({ slotId: 'GK', roleHe: 'שוער', role: 'GK', x: 50, y })

/**
 * Spread a row around the centre with a fixed gap, narrowing only when a wide row
 * would push a chip past the touchline.
 */
const MAX_GAP = 19
const USABLE = 70

type RowSlot = [roleHe: string, role: SlotRole]

function row(prefix: string, roles: RowSlot[], y: number): PitchSlot[] {
  const count = roles.length
  const gap = count === 1 ? 0 : Math.min(MAX_GAP, USABLE / (count - 1))
  const start = 50 - (gap * (count - 1)) / 2
  return roles.map(([roleHe, role], index) => ({
    slotId: `${prefix}${index + 1}`,
    roleHe,
    role,
    x: Math.round(start + gap * index),
    y,
  }))
}

/*
 * The row order is the pitch's own: index 0 sits at the lowest inline-start, which in
 * an RTL layout is the RIGHT of the screen — so `מגן ימני` leads a back four and the
 * codes follow the same order.
 */
export const FORMATIONS: Record<string, Formation> = {
  '4-4-2': {
    name: '4-4-2',
    slots: [
      gk(),
      ...row('D', [['מגן ימני', 'RB'], ['בלם', 'CB'], ['בלם', 'CB'], ['מגן שמאלי', 'LB']], 72),
      ...row('M', [['כנף ימני', 'RM'], ['קשר', 'CM'], ['קשר', 'CM'], ['כנף שמאלי', 'LM']], 45),
      ...row('F', [['חלוץ', 'ST'], ['חלוץ', 'ST']], 18),
    ],
  },
  '4-3-3': {
    name: '4-3-3',
    slots: [
      gk(),
      ...row('D', [['מגן ימני', 'RB'], ['בלם', 'CB'], ['בלם', 'CB'], ['מגן שמאלי', 'LB']], 72),
      ...row('M', [['קשר', 'CM'], ['קשר', 'CM'], ['קשר', 'CM']], 47),
      ...row('F', [['כנף ימני', 'RW'], ['חלוץ מרכזי', 'ST'], ['כנף שמאלי', 'LW']], 18),
    ],
  },
  '4-2-3-1': {
    name: '4-2-3-1',
    slots: [
      gk(),
      ...row('D', [['מגן ימני', 'RB'], ['בלם', 'CB'], ['בלם', 'CB'], ['מגן שמאלי', 'LB']], 74),
      ...row('H', [['קשר הגנתי', 'DM'], ['קשר הגנתי', 'DM']], 55),
      ...row('M', [['כנף ימני', 'RW'], ['קשר התקפי', 'AM'], ['כנף שמאלי', 'LW']], 34),
      ...row('F', [['חלוץ', 'ST']], 14),
    ],
  },
  '3-5-2': {
    name: '3-5-2',
    slots: [
      gk(),
      ...row('D', [['בלם', 'CB'], ['בלם', 'CB'], ['בלם', 'CB']], 74),
      ...row(
        'M',
        [['מגן כנף', 'RWB'], ['קשר', 'CM'], ['קשר', 'CM'], ['קשר', 'CM'], ['מגן כנף', 'LWB']],
        46,
      ),
      ...row('F', [['חלוץ', 'ST'], ['חלוץ', 'ST']], 16),
    ],
  },
}

export const DEFAULT_FORMATION = '4-4-2'

