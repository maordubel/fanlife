import { PITCH } from '@/lib/game/goal-zones'
import type { ReplayPoint } from './envelope'
import type { ReplayAction } from './vocab'

/**
 * התנועה — how the ball flies on the gate-8 board (delta 88).
 *
 * Maor, 24.9.2026: *"שום תנועה, שום אווירה, שום רגש"*. A straight dashed line between two
 * taps is a diagram; a ball that bends, hangs on a cross, skids along a pass and bobbles
 * on a dribble is football. Everything here is geometry in BOARD units (300 × 400, y down,
 * the goal at the top) and pure — the pitch component drives it frame by frame.
 */

export type Pt = { x: number; y: number }

export function toBoard(p: ReplayPoint): Pt {
  return { x: p.x * PITCH.w, y: p.y * PITCH.h }
}

/** How much a verb bends the ball's path, as a share of its length. */
const BEND: Record<ReplayAction, number> = {
  pass: 0.1,
  throughBall: 0.14,
  cross: 0.32,
  dribble: 0.05,
  shot: 0.07,
  header: 0.12,
  save: 0.2,
}

/** The control point of the quadratic curve from a to b — bent to the ball's natural side. */
export function controlPoint(a: Pt, b: Pt, action: ReplayAction): Pt {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  // bend away from the middle of the pitch, so a cross from the wing curls in
  const side = (a.x + b.x) / 2 < PITCH.w / 2 ? -1 : 1
  const k = BEND[action] * len * side
  return { x: mx + (-dy / len) * k, y: my + (dx / len) * k }
}

export function curvePath(a: Pt, b: Pt, action: ReplayAction): string {
  if (action === 'dribble') return dribblePath(a, b)
  const c = controlPoint(a, b, action)
  return `M${r(a.x)} ${r(a.y)} Q${r(c.x)} ${r(c.y)} ${r(b.x)} ${r(b.y)}`
}

/** A carried ball zig-zags a little — the touches of a dribble. */
function dribblePath(a: Pt, b: Pt): string {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const steps = Math.max(2, Math.min(6, Math.round(len / 22)))
  let d = `M${r(a.x)} ${r(a.y)}`
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps
    const w = i === steps ? 0 : (i % 2 ? 1 : -1) * 5
    d += ` L${r(a.x + dx * t + nx * w)} ${r(a.y + dy * t + ny * w)}`
  }
  return d
}

/** A point on the flight at t ∈ [0,1] — the quadratic Bézier, or the dribble's straight line. */
export function pointAt(a: Pt, b: Pt, action: ReplayAction, t: number): Pt {
  if (action === 'dribble') {
    const wobble = Math.sin(t * Math.PI * 5) * 4 * (1 - t)
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy) || 1
    return { x: a.x + dx * t + (-dy / len) * wobble, y: a.y + dy * t + (dx / len) * wobble }
  }
  const c = controlPoint(a, b, action)
  const u = 1 - t
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y }
}

/** How high the ball rides at t — a cross hangs, a pass skids. Board units of lift. */
export function liftAt(action: ReplayAction, t: number, len: number): number {
  const peak = action === 'cross' ? Math.min(34, len * 0.22) : action === 'throughBall' ? Math.min(10, len * 0.06) : action === 'shot' || action === 'header' ? 4 : 0
  return Math.sin(Math.PI * t) * peak
}

/** Flight time in ms: longer balls take longer, and nothing is instant. */
export function flightMs(a: Pt, b: Pt, action: ReplayAction, speed = 1): number {
  const len = Math.hypot(b.x - a.x, b.y - a.y)
  const base = action === 'shot' || action === 'header' ? 260 : action === 'dribble' ? 520 : 340
  return Math.round((base + len * (action === 'cross' ? 3.1 : 2.2)) / speed)
}

export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

/**
 * The camera — a scale about the focus, translated so the focus sits in the middle of the
 * frame and clamped so the frame never shows past the board's own edge. Returned as a
 * fraction of the frame, for `translate(tx%, ty%) scale(s)` with `transform-origin: 0 0`.
 *
 * `view` is the board's visible box (its viewBox), so a focus in board units is placed in
 * the frame's own coordinates.
 */
export function cameraFor(
  focus: Pt,
  scale: number,
  view: { top: number; height: number; width: number },
): { s: number; tx: number; ty: number } {
  const s = Math.max(1, scale)
  const fx = focus.x / view.width
  const fy = (focus.y - view.top) / view.height
  const tx = clamp(0.5 - fx * s, 1 - s, 0)
  const ty = clamp(0.45 - fy * s, 1 - s, 0)
  return { s, tx, ty }
}

/** A push-in that grows as the ball nears the goal line. */
export function pushFor(focus: Pt, max = 1.5): number {
  const near = clamp(1 - focus.y / (PITCH.h * 0.75), 0, 1)
  return 1 + (max - 1) * near * near
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

function r(v: number): number {
  return Math.round(v * 10) / 10
}
