/**
 * מה נשמר — the small, deterministic form of a thing somebody made (spec §19, §44, §63).
 *
 * The bench works in floats and pointer trails; the save keeps MARKS: three decimals, a
 * simplified polyline per stroke, a cap on points per stroke and on marks per output. The
 * same `CraftOutput` draws the shirt in the wardrobe in 2010 that it drew on the bench in
 * 1993, and a full banner is a few kilobytes, not a picture. `fromOutput` is the other
 * direction: an unknown blob from an old or foreign save comes back as `null`, never as a
 * crash in a wardrobe.
 */

import { CRAFT_SURFACES, type CraftColor, type CraftMark, type CraftMarkKind, type CraftOutput, type CraftOutputData, type CraftRecipe, type CraftSurface } from './types'

export const DEFAULT_MAX_MARKS = 40
export const MAX_POINTS = 12
/** the simplification tolerance, in normalised units — about three pixels on a phone */
export const EPSILON = 0.008

export type Point = readonly [number, number]

const round3 = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000
const roundDeg = (value: number): number => Math.round(((((value + 180) % 360) + 360) % 360) - 180)

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1])
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

/** Ramer–Douglas–Peucker, iterative: keep the points that bend the line by more than `epsilon` */
export function simplify(points: readonly Point[], epsilon: number = EPSILON): Point[] {
  if (points.length <= 2) return [...points]
  const keep = new Array<boolean>(points.length).fill(false)
  keep[0] = true
  keep[points.length - 1] = true
  const stack: [number, number][] = [[0, points.length - 1]]
  while (stack.length > 0) {
    const [first, last] = stack.pop() as [number, number]
    let index = -1
    let max = 0
    const a = points[first] as Point
    const b = points[last] as Point
    for (let i = first + 1; i < last; i++) {
      const d = distanceToSegment(points[i] as Point, a, b)
      if (d > max) {
        max = d
        index = i
      }
    }
    if (max > epsilon && index > 0) {
      keep[index] = true
      stack.push([first, index], [index, last])
    }
  }
  return points.filter((_, i) => keep[i])
}

/** at most `max` points, evenly thinned — the ends always survive */
export function capPoints(points: readonly Point[], max: number = MAX_POINTS): Point[] {
  if (points.length <= max) return [...points]
  const out: Point[] = []
  const step = (points.length - 1) / (max - 1)
  for (let i = 0; i < max; i++) out.push(points[Math.round(i * step)] as Point)
  return out
}

/** one mark, normalised: rounded, simplified, capped — the form the save keeps */
export function normaliseMark(mark: CraftMark, maxPoints: number = MAX_POINTS): CraftMark {
  const out: CraftMark = { kind: mark.kind, x: round3(mark.x), y: round3(mark.y) }
  if (mark.value !== undefined && mark.value !== '') out.value = mark.value
  if (mark.color !== undefined) out.color = mark.color
  if (mark.scale !== undefined && mark.scale !== 1) out.scale = Math.round(Math.max(0.1, Math.min(6, mark.scale)) * 100) / 100
  if (mark.rotate !== undefined && roundDeg(mark.rotate) !== 0) out.rotate = roundDeg(mark.rotate)
  if (mark.width !== undefined) out.width = Math.round(mark.width * 1000) / 1000
  if (mark.points && mark.points.length > 0) {
    const pts = capPoints(simplify(mark.points), maxPoints).map(([x, y]) => [round3(x), round3(y)] as const)
    out.points = pts
    out.x = pts[0]?.[0] ?? out.x
    out.y = pts[0]?.[1] ?? out.y
  }
  return out
}

/** the whole output: every mark normalised, the oldest kept when there are too many */
export function toOutput(recipe: CraftRecipe, marks: readonly CraftMark[], base?: CraftColor, measure?: number): CraftOutput {
  const max = recipe.constraints?.maxMarks ?? DEFAULT_MAX_MARKS
  const out: CraftOutput = {
    recipeId: recipe.id,
    surface: recipe.surface,
    marks: marks.slice(0, max).map((mark) => normaliseMark(mark)),
  }
  if (base) out.base = base
  if (measure !== undefined) out.measure = round3(measure)
  return out
}

/**
 * `CraftOutput` as the result's `output.data` — the same object, with every `undefined`
 * dropped so it is JSON by construction. A save never sees a hole, and the type says so.
 */
export function toOutputData(output: CraftOutput): CraftOutputData {
  const data: Record<string, unknown> = { recipeId: output.recipeId, surface: output.surface, marks: output.marks.map(plainMark) }
  if (output.base !== undefined) data.base = output.base
  if (output.measure !== undefined) data.measure = output.measure
  return data as CraftOutputData
}

function plainMark(mark: CraftMark): Record<string, unknown> {
  const out: Record<string, unknown> = { kind: mark.kind, x: mark.x, y: mark.y }
  if (mark.value !== undefined) out.value = mark.value
  if (mark.color !== undefined) out.color = mark.color
  if (mark.scale !== undefined) out.scale = mark.scale
  if (mark.rotate !== undefined) out.rotate = mark.rotate
  if (mark.width !== undefined) out.width = mark.width
  if (mark.points !== undefined) out.points = mark.points.map(([x, y]) => [x, y])
  return out
}

const KINDS: ReadonlySet<string> = new Set<CraftMarkKind>(['text', 'stamp', 'stripe', 'shape', 'stroke', 'spray', 'cut', 'stencil'])
const COLORS: ReadonlySet<string> = new Set<CraftColor>(['red', 'ink', 'sheet', 'concrete', 'sign'])

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isUnit = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1

function readMark(value: unknown): CraftMark | null {
  if (!isRecord(value)) return null
  const { kind, x, y } = value
  if (typeof kind !== 'string' || !KINDS.has(kind) || !isUnit(x) || !isUnit(y)) return null
  const out: CraftMark = { kind: kind as CraftMarkKind, x, y }
  if (typeof value.value === 'string') out.value = value.value.slice(0, 40)
  if (typeof value.color === 'string' && COLORS.has(value.color)) out.color = value.color as CraftColor
  if (typeof value.scale === 'number' && Number.isFinite(value.scale)) out.scale = Math.max(0.1, Math.min(6, value.scale))
  if (typeof value.rotate === 'number' && Number.isFinite(value.rotate)) out.rotate = roundDeg(value.rotate)
  if (typeof value.width === 'number' && Number.isFinite(value.width)) out.width = Math.max(0, Math.min(1, value.width))
  if (Array.isArray(value.points)) {
    const pts: Point[] = []
    for (const p of value.points) {
      if (Array.isArray(p) && isUnit(p[0]) && isUnit(p[1])) pts.push([p[0], p[1]])
    }
    if (pts.length > 0) out.points = pts.slice(0, MAX_POINTS * 4)
  }
  return out
}

/** a saved blob back into an output — `null` for anything that is not one (an old save, a foreign key) */
export function fromOutput(value: unknown): CraftOutput | null {
  if (!isRecord(value)) return null
  const { recipeId, surface, marks } = value
  if (typeof recipeId !== 'string' || recipeId === '') return null
  if (typeof surface !== 'string' || !(CRAFT_SURFACES as readonly string[]).includes(surface)) return null
  if (!Array.isArray(marks)) return null
  const out: CraftOutput = {
    recipeId,
    surface: surface as CraftSurface,
    marks: marks.map(readMark).filter((mark): mark is CraftMark => mark !== null).slice(0, DEFAULT_MAX_MARKS * 2),
  }
  if (typeof value.base === 'string' && COLORS.has(value.base)) out.base = value.base as CraftColor
  if (isUnit(value.measure)) out.measure = value.measure
  return out
}
