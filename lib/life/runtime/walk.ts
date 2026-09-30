/**
 * ההליכה — how a child crosses a painted room, and why it stopped feeling fake.
 *
 * Maor's note was one sentence and it was the right one: *the movement fakes it.* He named
 * the games this is supposed to feel like — Day of the Tentacle, Sam & Max, Full Throttle,
 * The Curse of Monkey Island, Space Quest IV — and the thing all five of them have that
 * this game did not is not a bigger art budget. It is three specific pieces of craft:
 *
 * **1. You point, and he walks there.** Nobody held a direction key in a LucasArts game.
 * You clicked a place, the character worked out how to reach it, went round the furniture,
 * arrived, and did the thing. Holding a key to steer a boy around a photograph is an
 * arcade control scheme wearing an adventure game's clothes — and on a phone it is worse
 * than that, because a thumbstick over a painting is the least direct way to say "go
 * there" that has ever been invented.
 *
 * **2. His feet do not slide.** The walk cycle in those games advances by DISTANCE COVERED,
 * never by elapsed time. This game advanced it at a fixed 7.5 frames a second regardless of
 * how fast or how large the child was, so at the far end of the pitch — where he is small
 * and covers little ground — his legs ran on the spot. That single line is most of what
 * "the movement fakes it" means.
 *
 * **3. The ground is a ground.** Walking away from the camera has to slow down and shrink
 * at the same rate, or the character reads as zooming rather than receding.
 *
 * This module owns the geometry of all three. It is deliberately free of Phaser and of the
 * scene, so `tests/life-walk.test.ts` can hold it to the arithmetic rather than to a
 * screenshot — and so the same code answers for a room, a terrace and a dirt pitch.
 */

export type Point = { x: number; y: number }

/**
 * Something you have to walk round. An ELLIPSE, not a circle, because the walk band is
 * foreshortened: a bin is as wide as it is deep in the world and about a third as deep as
 * it is wide on screen. A circular blocker round a bin either lets the child clip its side
 * or refuses him a metre of floor above it.
 */
export type Blocker = { x: number; y: number; rx: number; ry: number }

/** The rectangle a walker may stand in: the band, in pixels. */
export type Bounds = { left: number; right: number; top: number; bottom: number }

export function clampToBand(p: Point, bounds: Bounds): Point {
  return {
    x: Math.min(bounds.right, Math.max(bounds.left, p.x)),
    y: Math.min(bounds.bottom, Math.max(bounds.top, p.y)),
  }
}

/**
 * The squash that turns the foreshortened band into a square one.
 *
 * Every distance question in here — how far away is that, which way is shortest, have I
 * arrived — has to be asked in GROUND units rather than in screen pixels, because a
 * hundred pixels sideways and a hundred pixels up the band are very different walks. One
 * number does it: divide y by the band's depth ratio and the maths is Euclidean again.
 */
export const DEPTH = 0.52

export function groundDistance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, (b.y - a.y) / DEPTH)
}

/** Is `p` inside the blocker (with an optional margin, in x units)? */
export function inside(p: Point, blocker: Blocker, margin = 0): boolean {
  const dx = (p.x - blocker.x) / (blocker.rx + margin)
  const dy = (p.y - blocker.y) / (blocker.ry + margin * DEPTH)
  return dx * dx + dy * dy <= 1
}

/**
 * Does the straight walk from `a` to `b` pass through the blocker?
 *
 * Solved in the blocker's own unit-circle space: scale x by 1/rx and y by 1/ry and the
 * ellipse becomes a unit circle, at which point it is the standard closest-point-on-segment
 * test. Cheaper and more exact than sampling the line, which is what the first draft did
 * and which walked a child through the corner of the kiosk counter whenever the samples
 * happened to straddle it.
 */
export function blocked(a: Point, b: Point, blocker: Blocker, margin = 0): boolean {
  const rx = blocker.rx + margin
  const ry = blocker.ry + margin * DEPTH
  if (rx <= 0 || ry <= 0) return false
  const ax = (a.x - blocker.x) / rx
  const ay = (a.y - blocker.y) / ry
  const bx = (b.x - blocker.x) / rx
  const by = (b.y - blocker.y) / ry
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  if (len2 < 1e-9) return ax * ax + ay * ay <= 1
  let t = -(ax * dx + ay * dy) / len2
  t = Math.max(0, Math.min(1, t))
  const cx = ax + dx * t
  const cy = ay + dy * t
  return cx * cx + cy * cy <= 1
}

/**
 * A waypoint that goes AROUND the blocker rather than through it.
 *
 * The rule is the one a person uses: find the point on your path that comes closest to the
 * obstacle, step sideways from the obstacle's centre until you are clear of it, and aim
 * there. Which side you step to is decided by which of the two perpendiculars leaves you
 * with the shorter total walk, so the child goes round the near side of the bin rather than
 * taking a tour of the street.
 *
 * `clear` is how much daylight to leave — a fraction of the blocker's own radius. 1.35 is a
 * shoulder's width and stops the classic bug where the character grazes the obstacle,
 * re-triggers the detour, grazes it again, and shivers against it forever.
 */
export function detour(a: Point, b: Point, blocker: Blocker, clear = 1.35): Point {
  const rx = Math.max(1e-6, blocker.rx)
  const ry = Math.max(1e-6, blocker.ry)
  // in circle space
  const ax = (a.x - blocker.x) / rx
  const ay = (a.y - blocker.y) / ry
  const bx = (b.x - blocker.x) / rx
  const by = (b.y - blocker.y) / ry
  let dx = bx - ax
  let dy = by - ay
  const len = Math.hypot(dx, dy)
  if (len < 1e-9) {
    dx = 1
    dy = 0
  } else {
    dx /= len
    dy /= len
  }
  // the two ways past: perpendicular to the path, either hand
  const options: Point[] = [
    { x: -dy * clear, y: dx * clear },
    { x: dy * clear, y: -dx * clear },
  ]
  let best = options[0] as Point
  let bestCost = Infinity
  for (const option of options) {
    const cost = Math.hypot(option.x - ax, option.y - ay) + Math.hypot(bx - option.x, by - option.y)
    if (cost < bestCost) {
      bestCost = cost
      best = option
    }
  }
  return { x: blocker.x + best.x * rx, y: blocker.y + best.y * ry }
}

/**
 * Where to steer RIGHT NOW to get from `from` towards `to`.
 *
 * Deliberately not A*. The walkable area in this game is one rectangle with a handful of
 * objects standing in it — a bin, a planter, a counter, a parked car — and a full graph
 * search over that is a paragraph of code solving a problem nobody has. What a person
 * actually does is walk at the destination, notice the bin, step round the bin, and carry
 * on; recomputed every frame, that behaviour is indistinguishable from a path and it
 * recovers instantly when the obstacle is a person who has since moved.
 *
 * Only the FIRST blocker in the way earns a detour. Chaining them makes the walk wander,
 * and the next frame will find the second one from a better angle anyway.
 */
export function nextWaypoint(from: Point, to: Point, blockers: readonly Blocker[], margin = 0): Point {
  for (const blocker of blockers) {
    /**
     * מה שהלכת אליו הוא לא מכשול.
     *
     * The bug this line exists for took a real playthrough to find, and it hangs the whole
     * point-and-click layer: the place you stand to TALK to somebody is beside them, and
     * "beside them" is inside their own footprint. So the walk was blocked by its own
     * destination — the child circled his father forever and the conversation never
     * opened. It generalises: a hotspot on a table, a door behind a parked car, anything
     * whose stand-point falls inside an obstacle. An obstacle you are walking INTO cannot
     * be walked around, so it is not an obstacle.
     */
    if (inside(to, blocker, margin)) continue
    // Standing inside one — pushed there by a scene change, or by an actor who walked into
    // us — means the way out is straight out, not round.
    if (inside(from, blocker, margin)) {
      const dx = from.x - blocker.x || 1
      const dy = from.y - blocker.y
      const len = Math.hypot(dx, dy / DEPTH) || 1
      return { x: blocker.x + (dx / len) * blocker.rx * 1.6, y: blocker.y + (dy / len) * blocker.ry * 1.6 }
    }
    if (blocked(from, to, blocker, margin)) return detour(from, to, blocker)
  }
  return to
}

/**
 * How many animation frames one movement advances the walk cycle by.
 *
 * The number this replaces was `(delta / 1000) * 7.5` — frames per SECOND — and it is the
 * reason the child's feet slid. A walk cycle is a fact about the ground: a person's stride
 * is about 0.42 of their height, and an eight-frame cycle is two strides, so the whole
 * cycle covers roughly 0.84 of a body height of floor. Divide the ground actually covered
 * by that, multiply by the frame count, and the foot that is planted stays planted no
 * matter how fast, how small or how far away the walker is.
 *
 * `height` is the figure's DISPLAY height, so this is automatically correct at both ends of
 * a walk band without the scene knowing anything about it.
 */
export const STRIDE_PER_HEIGHT = 0.84

export function strideAdvance(moved: number, height: number, frames: number): number {
  if (height <= 0 || frames <= 0) return 0
  return (moved / (height * STRIDE_PER_HEIGHT)) * frames
}

/**
 * How fast to walk when you are nearly there.
 *
 * Arriving at full speed and stopping dead is the other half of "the movement fakes it":
 * a person slows into a destination. It also cures the shiver — a walker at full speed
 * overshoots its own arrival radius, turns round, overshoots again. Linear from `slow`
 * down to `floor`, never zero, so the last inch is still walked rather than teleported.
 */
export function arrivalEase(distance: number, slow: number, floor = 0.35): number {
  if (distance >= slow) return 1
  return floor + (1 - floor) * Math.max(0, distance / Math.max(1e-6, slow))
}
