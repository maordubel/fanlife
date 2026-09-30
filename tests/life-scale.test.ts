import { describe, expect, it } from 'vitest'

import { DEFAULT_HEIGHT_M, bodySize, heightOf } from '@/lib/life/world/heights'
import { ALL_SCENES } from '@/lib/life/world/scenes'
import { AMBIENT_1986, AMBIENT_1990 } from '@/lib/life/content/ambient1986'

/**
 * הפרופורציות — the fault Maor found in a screenshot on 6.9.2026, and the system that
 * makes it impossible rather than fixed.
 *
 * He asked one question about the kiosk: does the man standing in the shop look normal
 * next to Rafi and next to Pogi. Measured off the running game, that customer was 87
 * centimetres tall — and a sweep of every room found thirty-four bodies outside any height
 * a person comes in, down to a 68-centimetre basketball player.
 *
 * The cause was that `size` was a hand-typed fraction of the frame, per actor, per room.
 * It is now derived: the room declares a metre, `heights.ts` says how tall the person is,
 * and nothing in between is typed. These tests hold that shut.
 */

/** the tallest and shortest a person in this game may be */
const FLOOR = 1.15
const CEILING = 1.98

describe('המטר — every room knows how big a metre is', () => {
  it('declares one, and it is a fraction of a frame rather than a guess', () => {
    for (const scene of ALL_SCENES) {
      expect(scene.metre, `${scene.id} has no metre`).toBeGreaterThan(0.05)
      expect(scene.metre, `${scene.id} metre is impossible`).toBeLessThan(0.5)
    }
  })

  it('agrees with the player it was derived from', () => {
    // The metre is the player's drawn height over his real height, so a child of about
    // 1.2–1.8 metres has to come back out of it. A room whose metre drifts fails here
    // before anybody sees a giant in it.
    for (const scene of ALL_SCENES) {
      const player = scene.size.near / scene.metre
      expect(player, `${scene.id}: the player would be ${player.toFixed(2)} m`).toBeGreaterThan(1.1)
      expect(player, `${scene.id}: the player would be ${player.toFixed(2)} m`).toBeLessThan(2.0)
    }
  })

  it('the kiosk metre matches the counter it was measured against in September', () => {
    // 1.05 m of counter measured off the painting gave 0.315; the player-derived metre
    // gives 0.3154. Two independent measurements of the same room, and they agree.
    const kiosk = ALL_SCENES.find((scene) => scene.id === 'kiosk')
    expect(kiosk?.metre).toBeCloseTo(0.315, 2)
  })
})

describe('הגבהים — a body is as tall as the person is', () => {
  it('knows the cast, and falls back to an adult', () => {
    expect(heightOf('oldMan')).toBeCloseTo(1.7, 2)
    expect(heightOf('pogi')).toBeCloseTo(1.3, 2)
    expect(heightOf('hooperRed-dribble')).toBeCloseTo(1.95, 2)
    expect(heightOf('somebody-nobody-declared')).toBe(DEFAULT_HEIGHT_M)
  })

  it('reads the longest prefix, so a grown-up version is not shadowed by the child', () => {
    expect(heightOf('kobi90-lean')).toBeCloseTo(heightOf('kobi90'), 3)
    expect(heightOf('amit90')).toBeGreaterThan(heightOf('amit'))
    expect(heightOf('ofir90')).toBeGreaterThan(heightOf('ofir'))
  })

  it('sits people down without turning them into children', () => {
    const standing = heightOf('keren90')
    const sitting = heightOf('keren90-sit')
    expect(sitting).toBeLessThan(standing)
    expect(sitting).toBeGreaterThan(standing * 0.7)
  })

  it('every figure any room draws is a plausible human height', () => {
    const figures = new Set<string>()
    for (const scene of ALL_SCENES) for (const actor of scene.actors) figures.add(actor.figure)
    for (const walker of [...AMBIENT_1986, ...AMBIENT_1990]) figures.add(walker.figure)
    for (const figure of figures) {
      const height = heightOf(figure)
      const seated = /-(sit|sitA|sitB|chair|kneel|crouch|bent)/.test(figure)
      expect(height, `${figure} is ${height} m`).toBeGreaterThan(seated ? FLOOR * 0.7 : FLOOR)
      expect(height, `${figure} is ${height} m`).toBeLessThan(CEILING)
    }
  })
})

describe('הגודל על המסך — the metre and the height, and nothing else', () => {
  it('draws a person at metre × height at the near line', () => {
    // taper 1 means no perspective: the near line is the whole room
    expect(bodySize('oldMan', 0.3154, 1, 1)).toBeCloseTo(0.3154 * 1.7, 3)
    expect(bodySize('pogi', 0.3154, 1, 1)).toBeCloseTo(0.3154 * 1.3, 3)
  })

  it('shrinks with depth by the room\'s own taper, and never inverts it', () => {
    const near = bodySize('adultA1', 0.22, 1, 0.64)
    const far = bodySize('adultA1', 0.22, 0, 0.64)
    expect(far).toBeLessThan(near)
    expect(far / near).toBeCloseTo(0.64, 2)
  })

  it('puts the man in the kiosk and Rafi within a hand of each other', () => {
    // The actual fault, as a number: the customer was 0.87 m and Rafi 1.70 m in the same
    // shop. They now differ by the four centimetres between two men.
    const rafi = bodySize('oldMan', 0.3154, 1, 0.9)
    const customer = bodySize('adultA5', 0.3154, 1, 0.9)
    expect(Math.abs(customer / rafi - 1)).toBeLessThan(0.06)
  })
})
