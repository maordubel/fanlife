import { describe, expect, it } from 'vitest'

import { EMPTY_BENCH, HISTORY, reduceBench, type Bench, type BenchAction } from '@/lib/game/craft/bench'
import type { CraftMark } from '@/lib/game/craft/types'

/**
 * בטל · שוב · מהתחלה — the bench's memory, driven without a browser (spec §65).
 */
const mark = (n: number): CraftMark => ({ kind: 'stamp', x: n / 10, y: 0.5, value: 'shield' })
const run = (actions: BenchAction[], from: Bench = EMPTY_BENCH): Bench => actions.reduce(reduceBench, from)

describe('undo / redo', () => {
  it('undo walks back one mark at a time, redo walks forward again', () => {
    const three = run([
      { type: 'add', mark: mark(1), select: false },
      { type: 'add', mark: mark(2), select: false },
      { type: 'add', mark: mark(3), select: true },
    ])
    expect(three.marks.map((m) => m.x)).toEqual([0.1, 0.2, 0.3])
    expect(three.selected).toBe(2)
    const two = reduceBench(three, { type: 'undo' })
    expect(two.marks.map((m) => m.x)).toEqual([0.1, 0.2])
    expect(two.selected).toBeNull()
    expect(two.future.length).toBe(1)
    const one = reduceBench(two, { type: 'undo' })
    expect(one.marks.map((m) => m.x)).toEqual([0.1])
    const back = reduceBench(reduceBench(one, { type: 'redo' }), { type: 'redo' })
    expect(back.marks.map((m) => m.x)).toEqual([0.1, 0.2, 0.3])
    expect(back.future).toEqual([])
  })

  it('a new mark after an undo throws the future away', () => {
    const bench = run([
      { type: 'add', mark: mark(1), select: false },
      { type: 'add', mark: mark(2), select: false },
      { type: 'undo' },
      { type: 'add', mark: mark(9), select: false },
    ])
    expect(bench.marks.map((m) => m.x)).toEqual([0.1, 0.9])
    expect(bench.future).toEqual([])
    expect(reduceBench(bench, { type: 'redo' })).toBe(bench)
  })

  it('undo on an empty bench is a no-op, and so is redo with no future', () => {
    expect(reduceBench(EMPTY_BENCH, { type: 'undo' })).toBe(EMPTY_BENCH)
    expect(reduceBench(EMPTY_BENCH, { type: 'redo' })).toBe(EMPTY_BENCH)
  })

  it('move, remove and reset are steps that can be undone', () => {
    const placed = run([{ type: 'add', mark: mark(1), select: true }])
    const moved = reduceBench(placed, { type: 'replace', index: 0, mark: { ...mark(1), x: 0.7 } })
    expect(moved.marks[0]?.x).toBe(0.7)
    expect(reduceBench(moved, { type: 'undo' }).marks[0]?.x).toBe(0.1)
    const removed = reduceBench(moved, { type: 'remove', index: 0 })
    expect(removed.marks).toEqual([])
    expect(removed.selected).toBeNull()
    expect(reduceBench(removed, { type: 'undo' }).marks[0]?.x).toBe(0.7)
    const reset = reduceBench(moved, { type: 'reset' })
    expect(reset.marks).toEqual([])
    expect(reduceBench(reset, { type: 'undo' }).marks.length).toBe(1)
    // reset with nothing on the bench changes nothing
    expect(reduceBench(EMPTY_BENCH, { type: 'reset' })).toBe(EMPTY_BENCH)
  })

  it('never edits a mark that is not there', () => {
    const one = run([{ type: 'add', mark: mark(1), select: false }])
    expect(reduceBench(one, { type: 'replace', index: 4, mark: mark(2) })).toBe(one)
    expect(reduceBench(one, { type: 'remove', index: 4 })).toBe(one)
  })

  it('keeps a bounded history', () => {
    const many = run(Array.from({ length: HISTORY + 20 }, (_, i) => ({ type: 'add', mark: mark(i % 10), select: false }) as BenchAction))
    expect(many.past.length).toBeLessThanOrEqual(HISTORY)
    expect(many.marks.length).toBe(HISTORY + 20)
  })
})
