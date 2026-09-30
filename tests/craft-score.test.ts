import { describe, expect, it } from 'vitest'

import { CRAFT_RECIPES, recipeForLevel } from '@/lib/game/craft/recipes'
import { GRID_H, GRID_W, countPieces, paintedGrid, scoreCraft, stencilNumbers } from '@/lib/game/craft/score'
import { stencilCard, stencilGrid, stencilHoles } from '@/lib/game/craft/stencil'
import type { CraftMark } from '@/lib/game/craft/types'
import { MESSAGES } from '@/lib/i18n'

/**
 * המידה — pure, honest, and the same on a phone and in Node (spec §67).
 */
const shirt = CRAFT_RECIPES['fan-shirt-first']!
const confetti = CRAFT_RECIPES['derby-confetti']!
const banner = CRAFT_RECIPES['gate5-banner']!
const wall = CRAFT_RECIPES['wall-stencil']!

const across = (y: number): CraftMark => ({ kind: 'cut', x: 0, y, points: [[0, y], [1, y]] })
const down = (x: number): CraftMark => ({ kind: 'cut', x, y: 0, points: [[x, 0], [x, 1]] })
const roller = (y: number, width = 0.11): CraftMark => ({ kind: 'stroke', x: 0, y, color: 'red', width, points: [[0, y], [1, y]] })

describe('complete-layout — the shirt', () => {
  it('counts what is there and names the first thing missing', () => {
    expect(scoreCraft(shirt, { marks: [] })).toMatchObject({ measure: 0, done: false, hintHe: 'craft.hint.text' })
    const text: CraftMark = { kind: 'text', x: 0.5, y: 0.3, value: 'הפועל' }
    const stamp: CraftMark = { kind: 'stamp', x: 0.5, y: 0.5, value: 'shield' }
    const stripe: CraftMark = { kind: 'stripe', x: 0.5, y: 0.7 }
    expect(scoreCraft(shirt, { marks: [text] })).toMatchObject({ measure: 1 / 3, done: false, hintHe: 'craft.hint.stamp' })
    expect(scoreCraft(shirt, { marks: [text, stamp] })).toMatchObject({ measure: 2 / 3, done: false, hintHe: 'craft.hint.stripe' })
    const full = scoreCraft(shirt, { marks: [stripe, stamp, text] })
    expect(full.measure).toBe(1)
    expect(full.done).toBe(true)
    expect(full.hintHe).toBeUndefined()
  })
})

describe('piece-count — the confetti rule', () => {
  it('a cut that stops in the middle of the sheet cuts nothing', () => {
    expect(countPieces([])).toBe(1)
    expect(countPieces([{ kind: 'cut', x: 0, y: 0.5, points: [[0, 0.5], [0.5, 0.5]] }])).toBe(1)
    expect(countPieces([{ kind: 'cut', x: 0.3, y: 0.3, points: [[0.3, 0.3], [0.7, 0.7]] }])).toBe(1)
  })

  it('crossing cuts tile the sheet: (h+1)·(v+1)', () => {
    expect(countPieces([across(0.5)])).toBe(2)
    expect(countPieces([across(0.3), across(0.6)])).toBe(3)
    expect(countPieces([across(0.5), down(0.5)])).toBe(4)
    const six = [across(0.14), across(0.28), across(0.42), across(0.56), across(0.7), across(0.84)]
    const four = [down(0.2), down(0.4), down(0.6), down(0.8)]
    expect(countPieces([...six, ...four])).toBe(35)
    // a cut along the very edge of the sheet starts and ends on the same edge: it cuts nothing off
    expect(countPieces([...six, across(0.97)])).toBe(7)
  })

  it('a corner cut adds one, and a cut that returns to the same edge adds nothing', () => {
    expect(countPieces([{ kind: 'cut', x: 0, y: 0.2, points: [[0, 0.2], [0.2, 0]] }])).toBe(2)
    expect(countPieces([{ kind: 'cut', x: 0, y: 0.2, points: [[0, 0.2], [0.5, 0.5], [0, 0.8]] }])).toBe(1)
  })

  it('measures against the minimum and hints until it is met', () => {
    const some = scoreCraft(confetti, { marks: [across(0.5), down(0.5)] })
    expect(some.raw).toBe(4)
    expect(some.measure).toBeCloseTo(4 / 35)
    expect(some.hintHe).toBe('craft.hint.pieces')
    const marks = [0.14, 0.28, 0.42, 0.56, 0.7, 0.84].map(across).concat([0.2, 0.4, 0.6, 0.8].map(down))
    const done = scoreCraft(confetti, { marks })
    expect(done.done).toBe(true)
    expect(done.measure).toBe(1)
  })
})

describe('coverage — the banner on a 64×32 grid', () => {
  it('an empty cloth is zero, one roller stroke is about its own width', () => {
    expect(scoreCraft(banner, { marks: [] }).raw).toBe(0)
    const one = scoreCraft(banner, { marks: [roller(0.5)] })
    // the box is 480×180: a 0.11-wide brush is 0.11 × (480/180) ≈ 0.29 of the height
    expect(one.raw).toBeGreaterThan(0.2)
    expect(one.raw).toBeLessThan(0.4)
    expect(one.done).toBe(false)
    expect(one.hintHe).toBe('craft.hint.coverage')
  })

  it('rolls to the target with a few strokes, and a stencil counts as paint', () => {
    const strokes = [0.1, 0.3, 0.5, 0.7, 0.9].map((y) => roller(y))
    const done = scoreCraft(banner, { marks: strokes })
    expect(done.raw).toBeGreaterThanOrEqual(0.78)
    expect(done.done).toBe(true)
    expect(done.measure).toBe(1)
    const grid = paintedGrid(banner, [{ kind: 'stencil', x: 0.5, y: 0.5, value: 'הפועל' }])
    expect(grid.reduce((sum, c) => sum + c, 0)).toBeGreaterThan(0)
    expect(grid.length).toBe(GRID_W * GRID_H)
  })

  it('a child rolls wider, so the same strokes cover more', () => {
    const child = recipeForLevel(banner, 'child')
    const marks = [0.25, 0.75].map((y) => roller(y, 0.11 * (child.constraints?.brush ?? 1)))
    expect(scoreCraft(child, { marks }).raw).toBeGreaterThan(scoreCraft(banner, { marks: [0.25, 0.75].map((y) => roller(y)) }).raw)
  })
})

describe('stencil-coverage — the wall', () => {
  const card: CraftMark = { kind: 'stencil', x: 0.5, y: 0.5, value: 'הפועל', scale: 1 }
  const grid = stencilGrid('הפועל')
  const box = stencilCard(grid, 0.5, 0.5, 1, 300 / 480)

  it('has letters with holes in them, laid right to left', () => {
    expect(grid.rows).toBe(7)
    expect(grid.cells.length).toBeGreaterThan(40)
    expect(stencilHoles(grid, box).every((r) => r.x >= box.x && r.x + r.w <= box.x + box.w + 1e-9)).toBe(true)
    // ה is first: its cells are the rightmost columns
    const rightmost = Math.max(...grid.cells.map(([c]) => c))
    expect(rightmost).toBe(grid.cols - 1)
  })

  it('no card → nothing, and the hint says to place it', () => {
    expect(scoreCraft(wall, { marks: [] })).toMatchObject({ measure: 0, done: false, hintHe: 'craft.hint.place' })
    expect(stencilNumbers(wall, [{ kind: 'spray', x: 0.5, y: 0.5, width: 0.2, points: [[0, 0.5], [1, 0.5]] }]).placed).toBe(false)
  })

  it('spray through the holes covers; spray outside the card is overspray and costs', () => {
    const inside: CraftMark[] = []
    for (let y = box.y + 0.02; y < box.y + box.h; y += 0.04) inside.push({ kind: 'spray', x: box.x, y, width: 0.06, points: [[box.x + 0.01, y], [box.x + box.w - 0.01, y]] })
    const careful = stencilNumbers(wall, [card, ...inside])
    expect(careful.covered).toBeGreaterThan(0.9)
    expect(careful.overspray).toBeLessThan(0.2)
    const done = scoreCraft(wall, { marks: [card, ...inside] })
    expect(done.done).toBe(true)
    expect(done.measure).toBe(1)

    const wild: CraftMark[] = [{ kind: 'spray', x: 0, y: 0.1, width: 0.3, points: [[0, 0.1], [1, 0.1]] }, { kind: 'spray', x: 0, y: 0.9, width: 0.3, points: [[0, 0.9], [1, 0.9]] }]
    const messy = stencilNumbers(wall, [card, ...inside, ...wild])
    expect(messy.overspray).toBeGreaterThan(careful.overspray)
    const penalised = scoreCraft(wall, { marks: [card, ...inside, ...wild] })
    expect(penalised.measure).toBeLessThan(done.measure)
  })

  it('a half-sprayed card is not done and says so', () => {
    const half: CraftMark = { kind: 'spray', x: box.x, y: box.y + box.h * 0.25, width: box.h * 0.4, points: [[box.x, box.y + box.h * 0.25], [box.x + box.w, box.y + box.h * 0.25]] }
    const out = scoreCraft(wall, { marks: [card, half] })
    expect(out.done).toBe(false)
    expect(out.hintHe).toBe('craft.hint.spraymore')
  })
})

describe('every hint the score can print exists in the catalogue', () => {
  it('has a message for each key', () => {
    const keys = ['text', 'stamp', 'stripe', 'stencil', 'shape', 'stroke', 'spray', 'cut', 'pieces', 'coverage', 'place', 'spraymore', 'overspray']
    for (const key of keys) expect(`craft.hint.${key}` in MESSAGES, key).toBe(true)
  })
})
