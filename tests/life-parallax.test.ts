import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  NEAR_PLANE,
  NEAR_PLANE_SHIFT,
  PARALLAX,
  parallaxKeys,
  parallaxPlane,
  type ParallaxPlane,
} from '@/lib/life/runtime/art'

/**
 * המישורים — the void under gate seven, and the invariant that keeps it shut (16.9.2026).
 *
 * `bloomfield-outside` rendered as a painting in the top 58% of a phone with the whole
 * cast standing below it on black. It was not the camera, it was not `frameWorld`, and it
 * was not the extension strips: `buildParallax` handed the three planes to `add.image`,
 * which draws a texture at its own pixel size, and no plane on disk is painted at the size
 * of the backdrop it stands in for. `gate7.webp` is 2728×1536 and all three of its planes
 * are 1600×900 — the same picture at 0.586 — so the wall that `scenes.ts` measures every
 * door, actor and hotspot against covered the top-left 58% of the world.
 *
 * It was in the street and on the route too, and nobody saw it there: both rooms carry
 * full-world foreground layers (`streetGround`, `streetFore`) that paint the bottom back
 * in, so the hole landed in the middle of the picture where it reads as shadow. Gate seven
 * has no such layer, which is why the terrace is the room that got reported.
 *
 * Three things are asserted here and the order matters.
 *  1. The GEOMETRY covers the world for any world — arithmetic, no Phaser, no screenshot.
 *  2. The plane FILES share their backdrop's aspect, so sizing them to the world does not
 *     stretch the painting. That is the relationship, not the numbers: a plane redelivered
 *     at 2728×1536 passes unchanged.
 *  3. The SCENE places every plane through that geometry, because a helper nothing calls
 *     is a helper that cannot fail. This is the assertion that fails on the broken state.
 */

const ROOT = join(__dirname, '..')

/** what `build-art.py` recorded about a file it wrote — the sizes, without decoding a WebP */
type Cut = { w: number; h: number }
const MANIFEST = JSON.parse(
  readFileSync(join(ROOT, 'public/life/art/manifest.json'), 'utf8'),
) as Record<string, Record<string, Cut | undefined> | undefined>

/** a missing cut is a failure with a sentence on it, not a `possibly undefined` */
function cut(section: 'backdrops' | 'parallax', key: string): Cut {
  const row = MANIFEST[section]?.[key]
  if (!row) throw new Error(`${key} is not in manifest.json under ${section} — the file was never cut`)
  return row
}

const PLANES: ParallaxPlane[] = ['far', 'mid', 'near']

/** the viewports this has to hold for: a 2016 phone, a tall phone, a laptop, a desk */
const WORLDS: Array<[number, number]> = [
  [2728, 1536], // gate7
  [3936, 1536], // street
  [4616, 1536], // approach
  [1600, 900], // and a world the size of a plane, so the fix is not "multiply by 1.705"
]

describe('מישור מכסה עולם — a plane is sized from the world, never from its own file', () => {
  it('covers the whole painting with FAR and with MID, whatever the world is', () => {
    for (const [W, H] of WORLDS) {
      for (const plane of ['far', 'mid'] as const) {
        const box = parallaxPlane(plane, W, H)
        expect(box.x, `${plane} does not start at the painting's left edge`).toBe(0)
        expect(box.y, `${plane} does not start at the painting's top edge`).toBe(0)
        expect(box.width, `${plane} is ${box.width} wide in a world ${W} wide`).toBe(W)
        expect(box.height, `${plane} is ${box.height} tall in a world ${H} tall`).toBe(H)
      }
    }
  })

  it('stands NEAR on the painting’s floor, larger than the world and pulled left', () => {
    for (const [W, H] of WORLDS) {
      const box = parallaxPlane('near', W, H)
      // larger than the world in BOTH axes — that is what makes it read as nearer
      expect(box.width, 'NEAR is not nearer than the wall').toBeGreaterThan(W)
      expect(box.height, 'NEAR is not nearer than the wall').toBeGreaterThan(H)
      expect(box.width / W).toBeCloseTo(NEAR_PLANE, 10)
      expect(box.height / H).toBeCloseTo(NEAR_PLANE, 10)
      // its foot is the painting's own bottom edge: a foreground grows out of the floor
      expect(box.y + box.height).toBeCloseTo(H, 8)
      // and it is pulled left, off the first door of the game
      expect(box.x).toBeCloseTo(-NEAR_PLANE_SHIFT * W, 8)
      // pulled left AND wide enough that the right-hand edge still clears the world
      expect(box.x + box.width, 'NEAR leaves a gap at the right edge').toBeGreaterThan(W)
    }
  })

  it('never lags vertically, so a plane cannot peel off the extension strips', () => {
    for (const plane of PLANES) {
      const box = parallaxPlane(plane, 2728, 1536)
      expect(box.scroll, `${plane} has an impossible scroll factor`).toBeGreaterThan(0)
    }
    expect(parallaxPlane('far', 1, 1).scroll, 'FAR does not lag the wall').toBeLessThan(1)
    expect(parallaxPlane('mid', 1, 1).scroll, 'MID is not the wall').toBe(1)
    expect(parallaxPlane('near', 1, 1).scroll, 'NEAR does not lead the wall').toBeGreaterThan(1)
    // NEAR's scroll factor and its size are the same number, or it slides against itself
    expect(parallaxPlane('near', 1, 1).scroll).toBeCloseTo(parallaxPlane('near', 1, 1).width, 10)
  })
})

describe('היחס — every plane is the aspect of the painting it stands in for', () => {
  it('ships all three planes for every room in PARALLAX', () => {
    for (const art of PARALLAX) {
      expect(cut('backdrops', art).w, `${art} is in PARALLAX and has no painting`).toBeGreaterThan(0)
      const keys = parallaxKeys(art)
      for (const key of [keys.far, keys.mid, keys.near]) {
        expect(cut('parallax', key).w, `${key}.webp is missing`).toBeGreaterThan(0)
      }
    }
  })

  /**
   * The relationship, not the number. Sizing a plane to the world stretches it, and a
   * stretch is only invisible while the plane and the painting are the same shape — so
   * what is guarded is `plane.w / plane.h === flat.w / flat.h`, at whatever pixel size
   * the next delivery happens to arrive in. A tenth of a per cent is the rounding the
   * current cuts already carry (gate7 is 1.7760 against its planes' 1.7778).
   */
  it('matches the flat painting’s aspect, so the stretch to the world is invisible', () => {
    for (const art of PARALLAX) {
      const flat = cut('backdrops', art)
      const want = flat.w / flat.h
      const keys = parallaxKeys(art)
      for (const key of [keys.far, keys.mid, keys.near]) {
        const plane = cut('parallax', key)
        const got = plane.w / plane.h
        expect(
          Math.abs(got - want) / want,
          `${key} is ${plane.w}×${plane.h} (${got.toFixed(4)}) against ${art} ${flat.w}×${flat.h} (${want.toFixed(4)}) — sizing it to the world would stretch the painting`,
        ).toBeLessThan(0.005)
      }
    }
  })
})

describe('הסצנה משתמשת בגאומטריה — the helper is the one the scene calls', () => {
  const world = readFileSync(join(ROOT, 'lib/life/runtime/scenes/WorldScene.ts'), 'utf8')
  const build = world.slice(
    world.indexOf('private buildParallax('),
    world.indexOf('private buildExtensions('),
  )

  it('has a buildParallax to look at', () => {
    expect(build.length, 'buildParallax was renamed or removed').toBeGreaterThan(200)
  })

  /**
   * This is the guard that would have caught it. The broken version read
   * `this.add.image(0, 0, key).setOrigin(0, 0)` and then nothing — the texture's own
   * size, 1600×900, dropped into a 2728×1536 world.
   */
  it('sizes every plane it adds, and sizes it from parallaxPlane', () => {
    const added = build.match(/this\.add\.image\(/g) ?? []
    const sized = build.match(/setDisplaySize\(/g) ?? []
    expect(added.length, 'buildParallax adds no image').toBeGreaterThan(0)
    expect(sized.length, 'a plane is added without a display size — it will be drawn at its file size').toBe(added.length)
    expect(build, 'buildParallax does not go through parallaxPlane').toContain('parallaxPlane(')
  })

  /**
   * `setScale` is how the near plane used to be made 1.16× — of its own texture, which is
   * a different thing to 1.16× of the world and is the same bug wearing the other method's
   * name. Nothing in here may scale a plane.
   */
  it('never scales a plane off its own texture', () => {
    expect(build).not.toMatch(/\.setScale\(/)
  })

  /** and the numbers live in one place, so the plane and its speed cannot drift apart */
  it('takes the near plane’s size and speed from the same constant', () => {
    expect(build, 'a raw 1.16 is back in the scene').not.toMatch(/1\.16/)
    expect(build, 'a raw 0.075 is back in the scene').not.toMatch(/0\.075/)
  })
})
