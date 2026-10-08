import {wallAvailability,type WallCandidate} from './wall-engine'
import {blackFileMode,type BinaryRow,type DatedItem} from './blackfile-engine'

/**
 * Gate 11 is THREE separate experiences with their own opening predicates (rulebook §2.4, §13). An approved rival
 * opens the archive and nothing else: the wall needs ten approved opinion candidates and the Black File needs a
 * verifiable binary item or an unambiguous dated pair. This file says which is open, and with exactly what.
 */

export type RivalRole = 'primary' | 'secondary' | 'contextual'
export type Rival = { id: string; name: string; aliases: string[]; role: RivalRole; type: string | null; period: string | null; note: string | null }

const ROLE_ORDER: Record<RivalRole, number> = { primary: 0, secondary: 1, contextual: 2 }

type RivalFact = { id: string; value: unknown }

/**
 * DE-R01 — a club can have several rivalries; none is assumed to be "the" derby. The role comes from the approved
 * record; a record that states none is contextual — we do not promote a rival to primary because it is first.
 */
export function rivalList(facts: readonly RivalFact[]): Rival[] {
  const out: Rival[] = []
  const seen = new Set<string>()
  for (const f of facts) {
    const v = (f.value ?? {}) as Record<string, unknown>
    const name = typeof v.name === 'string' ? v.name.trim() : ''
    if (!name || seen.has(name.toLocaleLowerCase())) continue
    seen.add(name.toLocaleLowerCase())
    const role: RivalRole = v.role === 'primary' || v.role === 'secondary' || v.role === 'contextual' ? v.role : 'contextual'
    out.push({
      id: f.id,
      name,
      aliases: Array.isArray(v.aliases) ? v.aliases.filter((a): a is string => typeof a === 'string' && a.trim() !== '') : [],
      role,
      type: typeof v.type === 'string' && v.type ? v.type : null,
      period: typeof v.period === 'string' && v.period ? v.period : null,
      note: typeof v.note === 'string' && v.note ? v.note : null,
    })
  }
  return out.sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.name.localeCompare(b.name))
}

export type ModeKey = 'meetings' | 'wall' | 'blackfile'
export type ModeState = 'locked' | 'limited' | 'open'
export type ModeInfo = {
  key: ModeKey
  state: ModeState
  /** exact counts the screen prints: have / need */
  have: number
  need: number
  /** a second count (Black File: order pairs) */
  have2?: number
  need2?: number
  /** the §16.5 blocker code behind a locked or limited mode */
  blocker: string | null
}

export type ModeInput = {
  rivals: number
  meetings: number
  wall: readonly WallCandidate[]
  binary: readonly BinaryRow[]
  items: readonly DatedItem[]
}

export function rivalryModes(input: ModeInput): ModeInfo[] {
  const wall = wallAvailability(input.wall)
  const file = blackFileMode(input.binary, input.items)
  return [
    // the archive is a reading mode: one approved rival opens it; with no meetings it is an introduction only
    { key: 'meetings', state: input.rivals >= 1 ? (input.meetings > 0 ? 'open' : 'limited') : 'locked', have: input.meetings, need: 1, blocker: input.rivals >= 1 ? null : 'RIVAL_NOT_APPROVED' },
    { key: 'wall', state: wall.playable ? 'open' : 'locked', have: wall.have, need: wall.need, blocker: wall.blocker },
    { key: 'blackfile', state: file.state === 'full' ? 'open' : file.state === 'limited' ? 'limited' : 'locked', have: file.binary, need: 1, have2: file.pairs, need2: 4, blocker: file.state === 'full' ? null : file.blocker },
  ]
}

export function modeFrom(raw: unknown): ModeKey {
  return raw === 'wall' || raw === 'blackfile' ? raw : 'meetings'
}
