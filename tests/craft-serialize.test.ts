import { describe, expect, it } from 'vitest'

import { CRAFT_RECIPES } from '@/lib/game/craft/recipes'
import { scoreCraft } from '@/lib/game/craft/score'
import { EPSILON, MAX_POINTS, capPoints, fromOutput, normaliseMark, simplify, toOutput, toOutputData, type Point } from '@/lib/game/craft/serialize'
import type { CraftMark } from '@/lib/game/craft/types'

/**
 * מה נשמר — small, deterministic, and readable back (spec §19, §44, §63).
 */
const banner = CRAFT_RECIPES['gate5-banner']!

/** a hand-drawn roller stroke: a wavy line with pointer jitter, ~80 samples */
function handStroke(y: number, seed: number): CraftMark {
  const points: [number, number][] = []
  for (let i = 0; i <= 80; i++) {
    const x = 0.02 + (0.96 * i) / 80
    const jitter = Math.sin(i * 1.7 + seed) * 0.004 + Math.cos(i * 0.3 + seed) * 0.012
    points.push([x, Math.max(0, Math.min(1, y + jitter))])
  }
  return { kind: 'stroke', x: points[0]![0], y: points[0]![1], color: 'red', width: 0.11, points }
}

describe('simplify — Ramer–Douglas–Peucker', () => {
  it('keeps a straight line as its two ends', () => {
    const line: Point[] = Array.from({ length: 50 }, (_, i) => [i / 49, 0.5 + (i / 49) * 0.2])
    expect(simplify(line)).toEqual([line[0], line[49]])
  })

  it('keeps the corner of an L', () => {
    const l: Point[] = [
      ...Array.from({ length: 20 }, (_, i): Point => [i / 19, 0]),
      ...Array.from({ length: 20 }, (_, i): Point => [1, i / 19]),
    ]
    const out = simplify(l)
    expect(out.length).toBe(3)
    expect(out[1]).toEqual([1, 0])
  })

  it('never drops an end and never exceeds the input', () => {
    const mark = handStroke(0.5, 1)
    const out = simplify(mark.points!, EPSILON)
    expect(out[0]).toEqual(mark.points![0])
    expect(out[out.length - 1]).toEqual(mark.points![mark.points!.length - 1])
    expect(out.length).toBeLessThan(mark.points!.length)
  })

  it('caps evenly and keeps the ends', () => {
    const pts: Point[] = Array.from({ length: 101 }, (_, i) => [i / 100, 0])
    const out = capPoints(pts, 5)
    expect(out).toEqual([
      [0, 0],
      [0.25, 0],
      [0.5, 0],
      [0.75, 0],
      [1, 0],
    ])
  })
})

describe('normaliseMark', () => {
  it('rounds to three decimals, clamps to the surface, drops defaults', () => {
    const mark = normaliseMark({ kind: 'text', x: 1.4, y: -0.2, value: 'הפועל', color: 'ink', scale: 1, rotate: 360 })
    expect(mark).toEqual({ kind: 'text', x: 1, y: 0, value: 'הפועל', color: 'ink' })
    expect(normaliseMark({ kind: 'stamp', x: 0.33333, y: 0.66666, scale: 1.234567, rotate: 190 })).toEqual({ kind: 'stamp', x: 0.333, y: 0.667, scale: 1.23, rotate: -170 })
  })

  it('simplifies and caps a stroke, and moves x/y onto its first point', () => {
    const mark = normaliseMark(handStroke(0.4, 3))
    expect(mark.points!.length).toBeLessThanOrEqual(MAX_POINTS)
    expect(mark.x).toBe(mark.points![0]![0])
    for (const [x, y] of mark.points!) {
      expect(x).toBe(Math.round(x * 1000) / 1000)
      expect(y).toBe(Math.round(y * 1000) / 1000)
    }
  })
})

describe('toOutput / fromOutput', () => {
  it('a full banner is small — under 4KB of JSON — and still meets its target', () => {
    const marks: CraftMark[] = []
    for (let i = 0; i < 16; i++) marks.push(handStroke(0.06 + i * 0.058, i))
    marks.push({ kind: 'stencil', x: 0.5, y: 0.5, value: 'הפועל', color: 'sheet', scale: 1.2 })
    const output = toOutput(banner, marks, 'sheet', scoreCraft(banner, { marks }).measure)
    const json = JSON.stringify(toOutputData(output))
    expect(new TextEncoder().encode(json).length).toBeLessThanOrEqual(4096)
    expect(output.marks.length).toBeLessThanOrEqual(banner.constraints!.maxMarks!)
    // the normalised marks still paint the banner: the target survives the simplification
    expect(scoreCraft(banner, output).done).toBe(true)
    expect(output.measure).toBe(1)
  })

  it('caps the marks at the recipe maximum, keeping the earliest', () => {
    const marks = Array.from({ length: 60 }, (_, i) => handStroke(i / 60, i))
    const output = toOutput(banner, marks)
    expect(output.marks.length).toBe(banner.constraints!.maxMarks)
    expect(output.marks[0]!.y).toBeLessThan(0.02)
    expect(output.marks[output.marks.length - 1]!.y).toBeLessThan(0.45)
  })

  it('is deterministic and round-trips through JSON', () => {
    const marks = [handStroke(0.3, 7), { kind: 'text', x: 0.5, y: 0.3, value: 'HAPOEL', color: 'ink', scale: 0.8 } as CraftMark]
    const a = toOutput(CRAFT_RECIPES['fan-shirt-first']!, marks, 'red', 0.5)
    const b = toOutput(CRAFT_RECIPES['fan-shirt-first']!, marks, 'red', 0.5)
    expect(a).toEqual(b)
    const back = fromOutput(JSON.parse(JSON.stringify(toOutputData(a))))
    expect(back).toEqual(a)
  })

  it('refuses what is not an output, and drops what is not a mark', () => {
    expect(fromOutput(null)).toBeNull()
    expect(fromOutput('banner')).toBeNull()
    expect(fromOutput({ recipeId: 'x', surface: 'moon', marks: [] })).toBeNull()
    expect(fromOutput({ recipeId: 'x', surface: 'wall', marks: 'no' })).toBeNull()
    const out = fromOutput({
      recipeId: 'x',
      surface: 'wall',
      base: 'gold',
      marks: [{ kind: 'spray', x: 0.5, y: 0.5, color: 'gold', points: [[0.1, 0.2], [2, 2], 'p'] }, { kind: 'laser', x: 0, y: 0 }, 7],
    })
    expect(out).toEqual({ recipeId: 'x', surface: 'wall', marks: [{ kind: 'spray', x: 0.5, y: 0.5, points: [[0.1, 0.2]] }] })
  })

  it('toOutputData has no undefined anywhere — JSON by construction', () => {
    const data = toOutputData(toOutput(banner, [handStroke(0.5, 1)], 'sheet'))
    const walk = (value: unknown): void => {
      expect(value).not.toBeUndefined()
      if (Array.isArray(value)) value.forEach(walk)
      else if (value && typeof value === 'object') Object.values(value).forEach(walk)
    }
    walk(data)
  })
})
