import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  arrivalEase,
  blocked,
  clampToBand,
  DEPTH,
  detour,
  groundDistance,
  inside,
  nextWaypoint,
  STRIDE_PER_HEIGHT,
  strideAdvance,
  type Blocker,
} from '@/lib/life/runtime/walk'
import { ALL_SCENES } from '@/lib/life/world/scenes'

const ROOT = join(__dirname, '..')

/**
 * ההליכה — the pass that came from one sentence of Maor's: *the movement fakes it*, and
 * the dirt pitch is where it fakes it worst.
 *
 * He named the games it is supposed to feel like — Day of the Tentacle, Sam & Max, Full
 * Throttle, The Curse of Monkey Island, Space Quest IV — and what those five share is not
 * an art budget. It is that you POINT and the character walks there, that his feet do not
 * slide, and that the floor behaves like a floor. This file holds the arithmetic of all
 * three, because a screenshot cannot tell you whether a planted foot stayed planted.
 */
describe('הרגליים — a walk cycle belongs to the floor, not to the clock', () => {
  it('advances one full cycle per stride length of ground, at any size', () => {
    // The bug this replaces: `stride += (delta / 1000) * 7.5`. Frames per second, so a
    // child at the far end of a band — half the size, half the ground covered — moved his
    // legs exactly as fast as one standing at the front. That is foot-sliding, and it is
    // most of what "the movement fakes it" means.
    const frames = 8
    for (const height of [80, 160, 320]) {
      const cycle = height * STRIDE_PER_HEIGHT
      expect(strideAdvance(cycle, height, frames)).toBeCloseTo(frames, 6)
      expect(strideAdvance(cycle / 2, height, frames)).toBeCloseTo(frames / 2, 6)
    }
  })

  it('is scale-invariant — the same walk looks the same at both ends of a band', () => {
    // Two walkers covering the same fraction of their own height must be on the same frame.
    const near = strideAdvance(300 * 0.21, 300, 8)
    const far = strideAdvance(100 * 0.21, 100, 8)
    expect(near).toBeCloseTo(far, 6)
  })

  it('never advances on a figure with no size, and never runs backwards', () => {
    expect(strideAdvance(50, 0, 8)).toBe(0)
    expect(strideAdvance(50, 160, 0)).toBe(0)
    expect(strideAdvance(0, 160, 8)).toBe(0)
  })
})

describe('הקרקע — distance is measured on the ground, never in pixels', () => {
  it('counts a step up the band as further than the pixels suggest', () => {
    // A band is foreshortened: a hundred pixels away from the camera is a longer walk than
    // a hundred pixels across it. Every arrival test in the scene asks this question, and
    // asking it in raw pixels is why a child used to stop short of things above him and
    // overshoot things beside him.
    const across = groundDistance({ x: 0, y: 0 }, { x: 100, y: 0 })
    const into = groundDistance({ x: 0, y: 0 }, { x: 0, y: 100 })
    expect(across).toBeCloseTo(100, 6)
    expect(into).toBeCloseTo(100 / DEPTH, 6)
    expect(into).toBeGreaterThan(across)
  })

  it('keeps a walker inside the floor', () => {
    const bounds = { left: 10, right: 90, top: 200, bottom: 300 }
    expect(clampToBand({ x: -50, y: 500 }, bounds)).toEqual({ x: 10, y: 300 })
    expect(clampToBand({ x: 500, y: 0 }, bounds)).toEqual({ x: 90, y: 200 })
    expect(clampToBand({ x: 50, y: 250 }, bounds)).toEqual({ x: 50, y: 250 })
  })
})

describe('העקיפה — going round the furniture rather than through it', () => {
  const bin: Blocker = { x: 100, y: 100, rx: 20, ry: 20 * DEPTH }

  it('knows when a walk passes through something', () => {
    expect(blocked({ x: 0, y: 100 }, { x: 200, y: 100 }, bin)).toBe(true)
    // …and when it comfortably does not
    expect(blocked({ x: 0, y: 0 }, { x: 200, y: 0 }, bin)).toBe(false)
    // a walk that stops short of it is not blocked by it
    expect(blocked({ x: 0, y: 100 }, { x: 60, y: 100 }, bin)).toBe(false)
  })

  it('respects the walker own width as a margin', () => {
    const grazing = { x: 0, y: 100 - 20 * DEPTH - 4 }
    const past = { x: 200, y: 100 - 20 * DEPTH - 4 }
    expect(blocked(grazing, past, bin)).toBe(false)
    expect(blocked(grazing, past, bin, 12)).toBe(true)
  })

  it('produces a waypoint that is genuinely clear of the obstacle', () => {
    const a = { x: 0, y: 100 }
    const b = { x: 200, y: 100 }
    const way = detour(a, b, bin)
    expect(inside(way, bin)).toBe(false)
    // and it is beside the bin rather than beyond it — a detour that overshoots is a walker
    // taking a tour of the room
    expect(Math.abs(way.x - bin.x)).toBeLessThan(bin.rx * 1.5)
  })

  it('picks the shorter way round', () => {
    // Walking from below the bin, the way past should stay below it.
    const a = { x: 0, y: 130 }
    const b = { x: 200, y: 130 }
    const way = detour(a, b, bin)
    expect(way.y).toBeGreaterThan(bin.y)
  })

  it('steers straight at the target when nothing is in the way', () => {
    const to = { x: 300, y: 400 }
    expect(nextWaypoint({ x: 0, y: 0 }, to, [])).toEqual(to)
  })

  it('walks a walker who is standing inside something straight back out', () => {
    const stuck = { x: 104, y: 101 }
    const way = nextWaypoint(stuck, { x: 400, y: 100 }, [bin])
    expect(inside(way, bin)).toBe(false)
  })

  it('never treats the destination itself as an obstacle', () => {
    // The bug a real playthrough found, and it hung the whole feature: the place you stand
    // to talk to somebody is BESIDE them, which is inside their own footprint — so the walk
    // was blocked by its own destination and the child circled his father forever.
    const beside = { x: bin.x + 8, y: bin.y }
    expect(inside(beside, bin)).toBe(true)
    expect(nextWaypoint({ x: 0, y: 100 }, beside, [bin])).toEqual(beside)
  })

  it('detours around the first obstacle only, and recovers next frame', () => {
    // Chaining detours makes a walk wander. One at a time, recomputed every frame, is both
    // simpler and better behaved — and it is what recovers instantly when the obstacle is a
    // person who has since moved.
    const second: Blocker = { x: 300, y: 100, rx: 20, ry: 20 * DEPTH }
    const way = nextWaypoint({ x: 0, y: 100 }, { x: 400, y: 100 }, [bin, second])
    expect(inside(way, bin)).toBe(false)
  })
})

describe('ההאטה — arriving is a deceleration, not a stop', () => {
  it('is full speed until the last stretch, and never zero inside it', () => {
    expect(arrivalEase(500, 100)).toBe(1)
    expect(arrivalEase(100, 100)).toBe(1)
    expect(arrivalEase(50, 100)).toBeGreaterThan(0.35)
    expect(arrivalEase(50, 100)).toBeLessThan(1)
    // A walker that reaches zero speed before it reaches the target never arrives.
    expect(arrivalEase(0, 100)).toBeCloseTo(0.35, 6)
  })
})

/**
 * The third piece of craft, and the one Maor could see: the floor has to behave like a
 * floor. A walk band is a ground plane, and a ground plane's near-to-far scale ratio is
 * decided by where the camera is — 1.3× for a room, up to about 1.8× for a corridor seen
 * down its own axis. The dirt pitch shipped at 2.31×, which is not perspective, it is a
 * dolly zoom, and crossing that yard read as being pushed towards the camera.
 */
describe('הרצפה — every walk band is a plausible ground plane', () => {
  it('never ramps a figure by more than a camera could', () => {
    for (const scene of ALL_SCENES) {
      const ratio = scene.size.near / scene.size.far
      expect(ratio, `${scene.id} ramps ${ratio.toFixed(2)}×`).toBeGreaterThan(1.05)
      expect(ratio, `${scene.id} ramps ${ratio.toFixed(2)}×`).toBeLessThanOrEqual(1.8)
    }
  })

  it('gives every band real depth to walk in', () => {
    for (const scene of ALL_SCENES) {
      const depth = scene.band.near - scene.band.far
      expect(depth, `${scene.id} band is ${depth.toFixed(3)} deep`).toBeGreaterThan(0.09)
      expect(scene.band.near, `${scene.id} band runs off the bottom`).toBeLessThanOrEqual(1)
    }
  })
})

/**
 * …and the layer that makes all of it reachable with a thumb. Asserted against the source,
 * because the alternative is a Phaser instance in a unit test — and what these guard is
 * that the behaviour EXISTS, which is exactly the class of thing that gets quietly dropped
 * in a later refactor.
 */
describe('הצבעה — the point-and-click layer is wired, on every input', () => {
  const world = readFileSync(join(ROOT, 'lib/life/runtime/scenes/WorldScene.ts'), 'utf8')

  it('listens to the pointer at all', () => {
    expect(world).toContain("this.input.on('pointerdown'")
    expect(world).toContain('pointer.worldX')
  })

  it('walks to a target and only then acts on it', () => {
    // The two halves of the grammar. `standPoint` is what stops him arriving INSIDE the
    // person he came to talk to, and the arrival firing `act()` is what makes a tap on
    // Kobi mean "go and talk to Kobi" rather than "talk to Kobi from across the street".
    expect(world).toContain('private standPoint(')
    expect(world).toMatch(/arrived\s*=\s*this\.goal\.then/)
    expect(world).toMatch(/if \(arrived\) \{[\s\S]{0,120}this\.act\(\)/)
  })

  it('can never leave a walk running forever', () => {
    // A steering behaviour can get stuck where a path search would have failed loudly: a
    // destination in a corner behind two obstacles, an actor who stepped into the last gap.
    // Watching the distance and giving up is what makes that a moment rather than a hang.
    expect(world).toContain('private stalled(')
    expect(world).toMatch(/this\.goalStalled > 1500/)
    expect(world).toMatch(/this\.stalled\(left, delta, reach\)/)
  })

  it('lets a key or a stick take the wheel back instantly', () => {
    expect(world).toMatch(/if \(manual && this\.goal\) this\.clearGoal\(\)/)
  })

  it('drives the walk cycle by ground covered', () => {
    expect(world).toContain('strideAdvance(')
    // the old bug, in the exact shape it had
    expect(/stride \+= \(delta \/ 1000\)/.test(world), 'the walk cycle is back on a timer').toBe(false)
  })

  it('turns to face whatever it walked over to', () => {
    // A child who crosses the room to his father and then talks with his back to him is
    // the tell that arriving was a distance check rather than a meeting — and it is the
    // one frame the player stares at, because the box that opens next freezes the world.
    expect(world).toContain('private turnTo(')
    expect(world).toMatch(/if \(arrived\) \{\s*this\.turnTo\(arrived\)/)
  })

  it('refuses a pointer that is not on the painting', () => {
    // הקנבס גדול מהתמונה. On a tall phone the camera's viewport shrinks to the picture
    // and the canvas stays the whole box, so there is a strip of live canvas under the
    // picture where the console lives. Phaser answers `worldX` for a pointer anywhere on
    // that canvas, so without this guard a thumb on the A button came back as a plausible
    // place in the room and the child walked to it.
    expect(world).toContain('private onPicture(')
    expect(world).toMatch(/if \(!this\.onPicture\(pointer\.x, pointer\.y\)\) return/)
    expect(world).toMatch(/if \(!this\.onPicture\(canvasX, canvasY\)\) return/)
  })

  it('converts a client point through the canvas, not through the camera', () => {
    // The bug this guards was right on a desktop and wrong on every phone: scaling the
    // client offset by `cam.width / rect.width` squashes the whole world into the top of
    // the glass whenever the picture is shorter than the canvas. The conversion has to go
    // through the canvas's own space first, and only then subtract the viewport origin.
    expect(world).toMatch(/\* this\.scale\.width/)
    expect(world).toMatch(/\* this\.scale\.height/)
    expect(world).toMatch(/canvasX - cam\.x/)
    expect(world).toMatch(/canvasY - cam\.y/)
    expect(
      /rect\.width\) \* cam\.width/.test(world),
      'the client conversion is back on the camera size',
    ).toBe(false)
  })

  it('keeps the joystick off the painting', () => {
    // None of the games Maor named put a stick over the picture. Half the lower painting
    // was an invisible drag pad, so a thumb landing on a person standing there steered
    // instead of pointing — and on a phone that is most of the screen.
    const deck = readFileSync(join(ROOT, 'components/life/ControlDeck.tsx'), 'utf8')
    expect(/absolute bottom-0 start-0 z-10 w-1\/2/.test(deck), 'the picture is a joystick again').toBe(
      false,
    )
    expect(deck).not.toContain('onWorldTap')
  })

  it('never teleports anybody', () => {
    // `setPosition` on the player appears twice and both are legitimate: the spawn, and the
    // per-frame integration of velocity. A third would be somebody solving a movement
    // problem by moving the child, which is the one thing a point-and-click may not do.
    const sets = [...world.matchAll(/this\.player\.setPosition\(/g)].length
    expect(sets).toBeLessThanOrEqual(2)
  })
})
