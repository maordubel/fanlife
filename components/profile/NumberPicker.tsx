'use client'

import { Num } from '@/components/ui/Num'

/** Every number a shirt can carry — 1 to 99, the same list gate 7 asks from. */
export const SHIRT_NUMBERS: readonly number[] = Array.from({ length: 99 }, (_, index) => index + 1)

/**
 * המספר שלך — the 1–99 grid, one component for the two screens that write `book.number`.
 *
 * Gate 7's ballot asks "which number would you wear" and gate 10's card prints the
 * number on its back, and both land in the SAME field of the member book. Until
 * 21.9.2026 they asked in two different ways: the ballot offered every number a squad
 * can carry, and the card offered five (7/9/10/11/17) — so a supporter who voted for 23
 * saw a card that could not print it. One grid now, and the caller decides only where it
 * sits (`className` carries the layout: columns, height, scrolling).
 *
 * The choice is never shown by colour alone: the picked number is filled AND carries a
 * rule under its figure, and `aria-pressed` says it to a screen reader.
 */
export function NumberPicker({
  value,
  onPick,
  label,
  className = '',
  numbers = SHIRT_NUMBERS,
}: {
  value: number | null
  onPick: (n: number) => void
  /** the grid's accessible name */
  label: string
  /** layout only — grid columns, max height, overflow */
  className?: string
  numbers?: readonly number[]
}) {
  return (
    <ol aria-label={label} className={className}>
      {numbers.map((n) => {
        const on = value === n
        return (
          <li key={n}>
            <button
              type="button"
              onClick={() => onPick(n)}
              aria-pressed={on}
              className={`relative flex min-h-tap w-full items-center justify-center border-hair font-poster text-[22px] leading-none transition-transform duration-press ease-stamp active:scale-[.94] motion-reduce:transition-none ${
                on ? 'border-red bg-red text-sheet' : 'border-ink/40 bg-paper text-ink'
              }`}
            >
              <Num>{String(n)}</Num>
              {on && <span aria-hidden="true" className="absolute inset-x-2 bottom-1 h-[2px] bg-sheet" />}
            </button>
          </li>
        )
      })}
    </ol>
  )
}
