/**
 * המידה — how far a piece of work is from "done", 0..1, and nothing else (spec §67).
 *
 * Pure TypeScript, no DOM: the bench asks it on every "מוכן", the tests ask it on fixtures,
 * and a settlement may ask it again on a saved output and get the same number. There is no
 * arcade score; `measure` is progress toward the recipe's target (1 = done) and `hintHe` is
 * the one thing still missing, as a message key the bench prints under the button.
 *
 * The four targets and how each is measured — honestly, on a small grid:
 *
 *  · **complete-layout** — every required kind of mark is on the surface. measure =
 *    present / required.
 *  · **piece-count** — a cut counts when it CROSSES the sheet: both ends within `EDGE` of
 *    an edge. Side-to-side cuts (h) and top-to-bottom cuts (v) tile the sheet into
 *    (h+1)·(v+1) pieces; a cut between two adjacent edges clips a corner and adds one. A cut
 *    that stops in the middle of the sheet cuts nothing — the strip is still attached.
 *    measure = pieces / min.
 *  · **coverage** — paint strokes and stencil letters are rasterised onto a 64×32 grid over
 *    the whole surface; measure = covered cells / cells / min.
 *  · **stencil-coverage** — the placed card's holes are the mask. covered = sprayed mask
 *    cells / mask cells; overspray = sprayed cells OUTSIDE the card / all sprayed cells.
 *    raw = covered − overspray (a careless can loses what a careful one keeps);
 *    measure = raw / min. No card placed → 0, and the hint says to place it.
 */

import type { MessageKey } from '@/lib/i18n'

import { stencilCard, stencilGrid, stencilHoles, type Rect } from './stencil'
import { SURFACE_BOX, type CraftMark, type CraftOutput, type CraftRecipe, type CraftTarget } from './types'

export type CraftScore = {
  /** progress toward the target, 0..1 — 1 is done */
  measure: number
  done: boolean
  /** the one thing still missing, as a key the bench prints; absent when done */
  hintHe?: MessageKey
  /** the target's own number before it is divided by the minimum — pieces, or a fraction covered */
  raw: number
}

export const GRID_W = 64
export const GRID_H = 32
/** how close to an edge a cut's end must land to count as reaching it (normalised) */
export const EDGE = 0.06

const unit = (value: number): number => (Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0)

/** the aspect ratio of a surface's box — height over width, so a round brush is round */
export function aspectOf(recipe: Pick<CraftRecipe, 'surface'>): number {
  const box = SURFACE_BOX[recipe.surface]
  return box.h / box.w
}

/* ------------------------------------------------------------------ rasterising */

/** a 64×32 bitmap over the unit square; index = row * GRID_W + col */
export type Grid = Uint8Array

export const emptyGrid = (): Grid => new Uint8Array(GRID_W * GRID_H)

/** paint a disc of radius `r` (in x-units; y is corrected by `aspect`) at (x, y) */
function disc(grid: Grid, x: number, y: number, r: number, aspect: number): void {
  const ry = r / aspect
  const c0 = Math.max(0, Math.floor((x - r) * GRID_W))
  const c1 = Math.min(GRID_W - 1, Math.ceil((x + r) * GRID_W))
  const r0 = Math.max(0, Math.floor((y - ry) * GRID_H))
  const r1 = Math.min(GRID_H - 1, Math.ceil((y + ry) * GRID_H))
  for (let row = r0; row <= r1; row++) {
    const cy = (row + 0.5) / GRID_H
    for (let col = c0; col <= c1; col++) {
      const cx = (col + 0.5) / GRID_W
      const dx = (cx - x) / r
      const dy = (cy - y) / ry
      if (dx * dx + dy * dy <= 1) grid[row * GRID_W + col] = 1
    }
  }
}

/** a polyline of width `w` (fraction of the surface's width), round caps, walked in half-cell steps */
export function rasteriseStroke(grid: Grid, mark: CraftMark, aspect: number): void {
  const r = Math.max(0.004, (mark.width ?? 0.05) / 2)
  const pts = mark.points && mark.points.length > 0 ? mark.points : [[mark.x, mark.y] as const]
  const step = 0.5 / GRID_W
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i] as readonly [number, number]
    disc(grid, a[0], a[1], r, aspect)
    const b = pts[i + 1]
    if (!b) continue
    const len = Math.hypot(b[0] - a[0], (b[1] - a[1]) / aspect)
    const n = Math.ceil(len / step)
    for (let k = 1; k < n; k++) {
      const t = k / n
      disc(grid, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, r, aspect)
    }
  }
}

function fillRect(grid: Grid, rect: Rect): void {
  const c0 = Math.max(0, Math.floor(rect.x * GRID_W))
  const c1 = Math.min(GRID_W - 1, Math.ceil((rect.x + rect.w) * GRID_W) - 1)
  const r0 = Math.max(0, Math.floor(rect.y * GRID_H))
  const r1 = Math.min(GRID_H - 1, Math.ceil((rect.y + rect.h) * GRID_H) - 1)
  for (let row = r0; row <= r1; row++) for (let col = c0; col <= c1; col++) grid[row * GRID_W + col] = 1
}

const count = (grid: Grid): number => grid.reduce((sum, cell) => sum + cell, 0)

/* ------------------------------------------------------------------ the targets */

function layout(target: Extract<CraftTarget, { type: 'complete-layout' }>, marks: readonly CraftMark[]): CraftScore {
  const present = target.required.filter((kind) => marks.some((mark) => mark.kind === kind))
  const missing = target.required.find((kind) => !present.includes(kind))
  const measure = target.required.length === 0 ? 1 : unit(present.length / target.required.length)
  const out: CraftScore = { measure, done: missing === undefined, raw: present.length }
  if (missing) out.hintHe = `craft.hint.${missing}` as MessageKey
  return out
}

type Side = 'top' | 'bottom' | 'start' | 'end' | null

function sideOf(p: readonly [number, number]): Side {
  if (p[1] <= EDGE) return 'top'
  if (p[1] >= 1 - EDGE) return 'bottom'
  if (p[0] <= EDGE) return 'start'
  if (p[0] >= 1 - EDGE) return 'end'
  return null
}

/** the rule in the file comment: crossing cuts tile, corner cuts add one, a cut in the middle cuts nothing */
export function countPieces(marks: readonly CraftMark[]): number {
  let across = 0
  let down = 0
  let corners = 0
  for (const mark of marks) {
    if (mark.kind !== 'cut' || !mark.points || mark.points.length < 2) continue
    const a = sideOf(mark.points[0] as readonly [number, number])
    const b = sideOf(mark.points[mark.points.length - 1] as readonly [number, number])
    if (a === null || b === null || a === b) continue
    const pair = new Set([a, b])
    if (pair.has('start') && pair.has('end')) across += 1
    else if (pair.has('top') && pair.has('bottom')) down += 1
    else corners += 1
  }
  return (across + 1) * (down + 1) + corners
}

function pieces(target: Extract<CraftTarget, { type: 'piece-count' }>, marks: readonly CraftMark[]): CraftScore {
  const n = countPieces(marks)
  const measure = unit(n / Math.max(1, target.min))
  const out: CraftScore = { measure, done: n >= target.min, raw: n }
  if (!out.done) out.hintHe = 'craft.hint.pieces'
  return out
}

/** the grid of everything painted — strokes as brushes, stencil letters as their holes */
export function paintedGrid(recipe: Pick<CraftRecipe, 'surface' | 'stencilText'>, marks: readonly CraftMark[]): Grid {
  const grid = emptyGrid()
  const aspect = aspectOf(recipe)
  for (const mark of marks) {
    if (mark.kind === 'stroke' || mark.kind === 'spray') rasteriseStroke(grid, mark, aspect)
    else if (mark.kind === 'stencil') {
      const word = stencilGrid(mark.value ?? recipe.stencilText ?? '')
      for (const hole of stencilHoles(word, stencilCard(word, mark.x, mark.y, mark.scale ?? 1, aspect))) fillRect(grid, hole)
    }
  }
  return grid
}

function coverage(target: Extract<CraftTarget, { type: 'coverage' }>, recipe: CraftRecipe, marks: readonly CraftMark[]): CraftScore {
  const covered = count(paintedGrid(recipe, marks)) / (GRID_W * GRID_H)
  const measure = unit(covered / Math.max(0.01, target.min))
  const out: CraftScore = { measure, done: covered >= target.min - 1e-9, raw: covered }
  if (!out.done) out.hintHe = 'craft.hint.coverage'
  return out
}

/** the three numbers of a stencil job, for the bench's own hint and for the tests */
export function stencilNumbers(recipe: CraftRecipe, marks: readonly CraftMark[]): { covered: number; overspray: number; placed: boolean } {
  const card = marks.find((mark) => mark.kind === 'stencil')
  if (!card) return { covered: 0, overspray: 0, placed: false }
  const aspect = aspectOf(recipe)
  const word = stencilGrid(card.value ?? recipe.stencilText ?? '')
  const box = stencilCard(word, card.x, card.y, card.scale ?? 1, aspect)
  const mask = emptyGrid()
  for (const hole of stencilHoles(word, box)) fillRect(mask, hole)
  const cardGrid = emptyGrid()
  fillRect(cardGrid, box)
  const sprayed = emptyGrid()
  const aspectOfBox = aspect
  for (const mark of marks) if (mark.kind === 'spray' || mark.kind === 'stroke') rasteriseStroke(sprayed, mark, aspectOfBox)
  let maskCells = 0
  let hit = 0
  let outside = 0
  let total = 0
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) {
      maskCells += 1
      if (sprayed[i]) hit += 1
    }
    if (sprayed[i]) {
      total += 1
      if (!cardGrid[i]) outside += 1
    }
  }
  return {
    covered: maskCells === 0 ? 0 : hit / maskCells,
    overspray: total === 0 ? 0 : outside / total,
    placed: true,
  }
}

function stencil(target: Extract<CraftTarget, { type: 'stencil-coverage' }>, recipe: CraftRecipe, marks: readonly CraftMark[]): CraftScore {
  const n = stencilNumbers(recipe, marks)
  if (!n.placed) return { measure: 0, done: false, raw: 0, hintHe: 'craft.hint.place' }
  const penalty = recipe.constraints?.overspray ? n.overspray : 0
  const raw = unit(n.covered - penalty)
  const measure = unit(raw / Math.max(0.01, target.min))
  const out: CraftScore = { measure, done: raw >= target.min - 1e-9, raw }
  if (!out.done) out.hintHe = penalty > 0.25 ? 'craft.hint.overspray' : 'craft.hint.spraymore'
  return out
}

/** the one entry point: a recipe, an output (or the bench's live marks), a measure */
export function scoreCraft(recipe: CraftRecipe, output: Pick<CraftOutput, 'marks'>): CraftScore {
  const marks = output.marks
  const target = recipe.target
  switch (target.type) {
    case 'complete-layout':
      return layout(target, marks)
    case 'piece-count':
      return pieces(target, marks)
    case 'coverage':
      return coverage(target, recipe, marks)
    case 'stencil-coverage':
      return stencil(target, recipe, marks)
  }
}
