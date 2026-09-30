/**
 * אזורי המגרש — the grid שחזור השער is played on.
 *
 * The first version asked for a PIXEL: tap the exact spot the ball went, graded on a
 * distance tolerance. That was the wrong ask twice over. A match report says "מ-40 מטר
 * ליד שער 7", never a coordinate, so a pixel target invents a precision the source does
 * not have; and on a phone a fingertip covers about 44px, so the player was being graded
 * on aim rather than on knowledge.
 *
 * So the pitch is twenty zones — five columns across, four bands of depth — off the Goal
 * Rebuild handoff. A tap can no longer be nearly right by accident, and "you had the
 * depth, not the side" becomes something the game can actually SAY.
 *
 * Pure and client-safe: `lib/game/goal.ts` reads the archive and is server-only.
 */

export const COLS = ['A', 'B', 'C', 'D', 'E'] as const
export const ROWS = [1, 2, 3, 4] as const
export type ZoneId = string

/** Every zone, reading order: the row nearest the goal first. */
export const ZONES: ZoneId[] = ROWS.flatMap((row) => COLS.map((col) => `${col}${row}`))

export function isZone(id: string): boolean {
  return ZONES.includes(id)
}

/** Column index 0..4 and depth index 0..3, or null for anything malformed. */
export function zoneParts(id: ZoneId): { col: number; row: number } | null {
  const col = COLS.indexOf(id[0] as (typeof COLS)[number])
  const row = Number(id.slice(1)) - 1
  if (col < 0 || !Number.isInteger(row) || row < 0 || row > 3) return null
  return { col, row }
}

/**
 * Geometry of the handoff pitch: a 300×400 box holding ONE HALF of a football pitch,
 * zones 55×82 from (13,12). `top` is the viewBox's own min-y — the board carries forty
 * units of air above the goal line so the net, and the tap target over it, are a place a
 * finger and a keyboard can both reach. Nothing below y=0 moved when that was added:
 * every coordinate in this file and in `GoalPitch.tsx` still means what it meant.
 */
export const PITCH = {
  w: 300,
  h: 400,
  x0: 13,
  y0: 12,
  cw: 55,
  ch: 82,
  /** viewBox min-y — the air behind the goal */
  top: -40,
  /** the chalk: touchlines, the goal line, and the halfway line at the foot of the board */
  left: 12,
  right: 288,
  goalY: 12,
  halfY: 388,
} as const

/**
 * What the drawing is a drawing OF — the Laws' recommended pitch, in metres.
 *
 * This is the only place a metre becomes a pixel, and it exists because an uncertainty
 * envelope is a claim in METRES ("the source pins him to the penalty area, which is
 * 40.3m by 16.5m") and the board is a diagram with two different scales on its two axes:
 * 276 units carry 68 metres across, 376 units carry 52.5 metres of depth. An envelope
 * written in normalised units would silently mean something different on each axis.
 */
export const PITCH_METRES = { wide: 68, deep: 52.5 } as const

/** Units per metre, per axis. Derived, never typed: move a chalk line and this follows. */
export const UNITS_PER_METRE = {
  x: (PITCH.right - PITCH.left) / PITCH_METRES.wide,
  y: (PITCH.halfY - PITCH.goalY) / PITCH_METRES.deep,
} as const

/**
 * The three places on this board that the LAWS define rather than a reporter does.
 *
 * A zone centre is the best anchor for a touch described in words. It is the WRONG
 * anchor for a touch described by a place the laws draw on every pitch on earth: "נקודת
 * הפנדל" is not "somewhere in zone C1", it is a painted spot, and quantising it to a
 * 55×82 cell would throw away precision the source actually has — the opposite of the
 * mistake this gate's envelopes exist to stop.
 */
export const LANDMARKS = {
  /** eleven metres out, dead centre — drawn on the board at (150, 57) */
  penaltySpot: { x: 150, y: PITCH.goalY + 11 * UNITS_PER_METRE.y },
  /** a keeper parrying stands on his line */
  goalLine: { x: 150, y: PITCH.goalY },
  /** inside the net: where a ball that scored ended up */
  goalMouth: { x: 150, y: 4 },
} as const

export type LandmarkId = keyof typeof LANDMARKS

export function zoneRect(id: ZoneId): { x: number; y: number; w: number; h: number } | null {
  const parts = zoneParts(id)
  if (!parts) return null
  return {
    x: PITCH.x0 + parts.col * PITCH.cw,
    y: PITCH.y0 + parts.row * PITCH.ch,
    w: PITCH.cw,
    h: PITCH.ch,
  }
}

export function zoneCenter(id: ZoneId): { x: number; y: number } | null {
  const rect = zoneRect(id)
  return rect ? { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 } : null
}

export type Grade = 'hit' | 'near' | 'miss'

/**
 * How a placement scores.
 *
 * `near` is the honest middle the old tolerance was groping for: one zone out is not
 * knowing the move, but it is not ignorance either — "העומק נכון, הצד לא" is a real
 * thing to be told, and it costs points without costing a life. Diagonals count as near
 * too; a diagonal neighbour is still touching the right square.
 */
export function gradeZone(picked: ZoneId | undefined, truth: ZoneId): Grade {
  if (!picked) return 'miss'
  if (picked === truth) return 'hit'
  const a = zoneParts(picked)
  const b = zoneParts(truth)
  if (!a || !b) return 'miss'
  return Math.abs(a.col - b.col) <= 1 && Math.abs(a.row - b.row) <= 1 ? 'near' : 'miss'
}

/** Why a placement missed, as a message key — the verdict has to say something real. */
export function reasonKey(picked: ZoneId | undefined, truth: ZoneId): string {
  if (!picked) return 'goal.reason.unplaced'
  if (picked === truth) return 'goal.reason.exact'
  const a = zoneParts(picked)
  const b = zoneParts(truth)
  if (!a || !b) return 'goal.reason.far'
  if (a.row === b.row) return 'goal.reason.depthRight'
  if (a.col === b.col) return 'goal.reason.sideRight'
  return gradeZone(picked, truth) === 'near' ? 'goal.reason.close' : 'goal.reason.far'
}

/** Three goals to a run, so a run is three whole moves and not twelve loose taps. */
export const GOALS_PER_RUN = 3

/**
 * How long a rebuilt move may be.
 *
 * Two, because continuity is a relation BETWEEN touches and a one-touch move has none to
 * measure. Five, because the longest move the archive describes is four and a ceiling
 * that is never reached is not a ceiling — one over the longest record leaves room to be
 * wrong in the direction a supporter is actually wrong in.
 *
 * They live beside the pitch rather than in `lib/game/goal.ts` because the builder is a
 * client component and that module is `server-only`: the touch COUNT is not a secret,
 * only which count is right is.
 */
export const MIN_TOUCHES = 2
export const MAX_TOUCHES = 5
/**
 * Seconds for a whole MOVE, tightening per stage.
 *
 * These were 34/27/21 when a touch was one tap on a zone. A touch is now four decisions
 * — who, what, from where, to where — and a move is up to five of them, so the old clock
 * would have been a dexterity test wearing a history game's clothes. The clock still
 * exists, and it still whistles on whatever is on the pitch, because rule 21 is right
 * that a round with no clock stops being a round; it is simply long enough to let the
 * player think about the only thing this gate is testing.
 */
export const GOAL_SECONDS = [100, 85, 70] as const

/**
 * A normalised board point → the zone index a challenge carries (0–19 the grid, row-major
 * from the goal; 20 the mouth). The inverse of the comparison's `zonePoint`, so both
 * routes draw on the same twenty squares (ONE RED WORLD §44).
 */
export function zoneIndexAt(point: { x: number; y: number }): number {
  const px = point.x * PITCH.w
  const py = point.y * PITCH.h
  if (py < PITCH.y0) return 20
  const col = Math.min(COLS.length - 1, Math.max(0, Math.floor((px - PITCH.x0) / PITCH.cw)))
  const row = Math.min(ROWS.length - 1, Math.max(0, Math.floor((py - PITCH.y0) / PITCH.ch)))
  return row * COLS.length + col
}

/** A zone index → its centre on the share card's scale: 0–100 across, 0 (goal line) to 100 down. */
export function zoneCentre100(index: number): { x: number; y: number } {
  if (index >= 20) return { x: 50, y: 2 }
  const col = index % COLS.length
  const row = Math.floor(index / COLS.length)
  const x = PITCH.x0 + col * PITCH.cw + PITCH.cw / 2
  const y = PITCH.y0 + row * PITCH.ch + PITCH.ch / 2
  return {
    x: Math.round(((x - PITCH.left) / (PITCH.right - PITCH.left)) * 100),
    y: Math.round(((y - PITCH.goalY) / (PITCH.halfY - PITCH.goalY)) * 100),
  }
}
