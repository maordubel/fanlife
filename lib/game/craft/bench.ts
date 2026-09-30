/**
 * הזיכרון של הסדנה — the bench's marks and their history, as a pure reducer (spec §65).
 *
 * Undo is mandatory and redo is wanted, so the history is the state: `past` and `future`
 * are whole mark lists (marks are small and few), a change commits the present into the
 * past and empties the future, undo and redo walk between them. Kept out of React so the
 * tests can drive the whole life of a bench — add, move, undo, redo, reset — without a DOM.
 */

import type { CraftMark } from './types'

export type Bench = {
  past: readonly (readonly CraftMark[])[]
  marks: readonly CraftMark[]
  future: readonly (readonly CraftMark[])[]
  selected: number | null
}

export type BenchAction =
  | { type: 'add'; mark: CraftMark; select: boolean }
  | { type: 'replace'; index: number; mark: CraftMark }
  | { type: 'remove'; index: number }
  | { type: 'select'; index: number | null }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'reset' }

/** how many steps back a thumb can go — enough for a whole banner, bounded so a save-less tab cannot grow */
export const HISTORY = 60

export const EMPTY_BENCH: Bench = { past: [], marks: [], future: [], selected: null }

function commit(bench: Bench, marks: readonly CraftMark[], selected: number | null): Bench {
  return { past: [...bench.past.slice(-(HISTORY - 1)), bench.marks], marks, future: [], selected }
}

export function reduceBench(bench: Bench, action: BenchAction): Bench {
  switch (action.type) {
    case 'add':
      return commit(bench, [...bench.marks, action.mark], action.select ? bench.marks.length : bench.selected)
    case 'replace': {
      if (!bench.marks[action.index]) return bench
      const marks = bench.marks.map((mark, i) => (i === action.index ? action.mark : mark))
      return commit(bench, marks, bench.selected)
    }
    case 'remove':
      if (!bench.marks[action.index]) return bench
      return commit(
        bench,
        bench.marks.filter((_, i) => i !== action.index),
        null,
      )
    case 'select':
      return bench.selected === action.index ? bench : { ...bench, selected: action.index }
    case 'undo': {
      const previous = bench.past[bench.past.length - 1]
      if (!previous) return bench
      return { past: bench.past.slice(0, -1), marks: previous, future: [bench.marks, ...bench.future], selected: null }
    }
    case 'redo': {
      const next = bench.future[0]
      if (!next) return bench
      return { past: [...bench.past, bench.marks], marks: next, future: bench.future.slice(1), selected: null }
    }
    case 'reset':
      return bench.marks.length === 0 ? bench : commit(bench, [], null)
  }
}
