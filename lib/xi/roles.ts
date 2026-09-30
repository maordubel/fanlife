/**
 * התפקידים על המגרש — a formation slot's role, and the honest way to match a man to it.
 *
 * ## The whole integrity question of gate 1, written where it is decided
 *
 * A formation slot has a SHAPE. `4-3-3` puts somebody on the right of a back four and
 * somebody else on the left wing, and calling those two slots the same thing would throw
 * away the only reason a formation is worth choosing. So a slot carries a detailed role
 * — `RB`, `CB`, `LB`, `RWB`, `LWB`, `DM`, `CM`, `AM`, `RM`, `LM`, `RW`, `LW`, `ST`.
 *
 * **What the archive holds about a MAN is four buckets and nothing finer.**
 * `lib/game/roster-facets.ts` states it at length and the reason is not laziness: the
 * position comes from ויקיפועל's `תפקיד` field, from a squad sheet, from a recorded XI
 * or from worldfootball, and every one of those speaks in `GK / DF / MF / FW`. Rule 74
 * is the scar — `תפקיד` is a LIST and reading it as a scalar put the club's greatest
 * striker in defence. Nobody is going to repeat that mistake in the other direction by
 * deciding, from a four-letter code, that a man was specifically a RIGHT back.
 *
 * So: **the slot's detailed role is mapped DOWN to the canonical positions it accepts,
 * and fit is computed there.** That direction is honest — "this slot is a defender's
 * slot" is a statement about the FORMATION, which we invented and therefore know
 * everything about. The other direction — "this man was a right back" — would be a
 * statement about a person that no source in this repo makes.
 *
 * Which means the fit answer is coarse on purpose. Every one of the back four accepts
 * exactly the same men, and the screen says so rather than pretending the drawer knows
 * which of them was left-footed. A fit list that sorted the same 200 defenders four
 * different ways would be a lie dressed as a feature.
 *
 * Three of the mappings are wider than one bucket, and each one is a real ambiguity in
 * the sources rather than a convenience:
 *
 *   · **`RWB` / `LWB`** — a wing back is filed as a defender by some sources and as a
 *     midfielder by others, for the same man. Accepting both is what the sources
 *     actually support.
 *   · **`RM` / `LM` / `RW` / `LW`** — a wide player is `MF` in one table and `FW` in the
 *     next, and our own roster carries both spellings for men who played the same job.
 *   · **`AM`** — the same, between `MF` and `FW`, for a number ten.
 *
 * And `GK` accepts only `GK`, in both directions: a keeper is the one position every
 * source agrees on and the one slot nobody else has ever filled.
 *
 * ## A man the archive cannot place is not "unfit"
 *
 * Twenty-five of the roster carry no documented position at all — `תפקיד` empty on
 * ויקיפועל and no role stated in the opening sentence either. Dropping them out of a fit
 * list would be the screen claiming they do not suit the slot, which is a claim about
 * them that nothing supports. They come back as `unknown`, they are shown in their own group, and the
 * "fit only" toggle keeps them: it narrows to what the archive can vouch for PLUS what
 * it cannot speak about, never to a silent verdict on a man.
 */

import type { Position } from '@/lib/game/roster-facets'

export type SlotRole =
  | 'GK'
  | 'RB'
  | 'CB'
  | 'LB'
  | 'RWB'
  | 'LWB'
  | 'DM'
  | 'CM'
  | 'AM'
  | 'RM'
  | 'LM'
  | 'RW'
  | 'LW'
  | 'ST'

/**
 * Which of the four canonical positions each slot role accepts.
 *
 * Read it as "a man filed under any of these is plausible here", never as "a man here
 * was one of these". See the module note: the arrow points from the formation to the
 * archive, because the formation is ours and the archive is somebody's record.
 */
export const ROLE_ACCEPTS: Readonly<Record<SlotRole, readonly Position[]>> = {
  GK: ['GK'],
  RB: ['DF'],
  CB: ['DF'],
  LB: ['DF'],
  // a wing back is filed as a defender by some sources and a midfielder by others
  RWB: ['DF', 'MF'],
  LWB: ['DF', 'MF'],
  DM: ['MF'],
  CM: ['MF'],
  // a number ten is `MF` in one table and `FW` in the next
  AM: ['MF', 'FW'],
  RM: ['MF', 'FW'],
  LM: ['MF', 'FW'],
  RW: ['MF', 'FW'],
  LW: ['MF', 'FW'],
  ST: ['FW'],
}

export const SLOT_ROLES = Object.keys(ROLE_ACCEPTS) as SlotRole[]

export function isSlotRole(value: string): value is SlotRole {
  return Object.prototype.hasOwnProperty.call(ROLE_ACCEPTS, value)
}

/**
 * Where a man sits against a slot.
 *
 * `fit` — a source files him under a position this slot accepts.
 * `other` — a source files him under one it does not.
 * `unknown` — no source files him at all. Not a verdict; the absence of one.
 */
export type Fit = 'fit' | 'other' | 'unknown'

export function fitOf(positions: readonly Position[], role: SlotRole): Fit {
  if (positions.length === 0) return 'unknown'
  const accepts = ROLE_ACCEPTS[role]
  return positions.some((code) => accepts.includes(code)) ? 'fit' : 'other'
}
