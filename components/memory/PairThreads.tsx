'use client'

import { threadGeometry } from '@/lib/game/memory-run'
import type { MemoryCard } from '@/lib/game/memory'

/**
 * החוטים — the thread between the two cards of every locked pair (v3).
 *
 * An SVG laid over the grid in GRID UNITS (`threadGeometry`): the viewBox is cols × rows,
 * the grid's own shape, so the lines land on the cards at every width without measuring
 * a single element. `vector-effect` keeps the stroke one width however the box stretches.
 * Decoration for the eye only — `aria-hidden`; the pairs themselves are announced by the
 * cards and the shelf.
 */
export function PairThreads({
  cards,
  done,
  cols,
}: {
  cards: readonly MemoryCard[]
  done: readonly string[]
  cols: number
}) {
  const rows = Math.ceil(cards.length / cols)
  const threads = threadGeometry(cards, done, cols)
  if (threads.length === 0) return null
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute inset-1.5 h-[calc(100%-0.75rem)] w-[calc(100%-0.75rem)]"
      viewBox={`0 0 ${cols} ${rows}`}
      preserveAspectRatio="none"
    >
      {threads.map((thread) => (
        <g key={thread.pair} className="text-sheet">
          <line
            x1={thread.x1}
            y1={thread.y1}
            x2={thread.x2}
            y2={thread.y2}
            stroke="currentColor"
            strokeWidth={3}
            strokeDasharray="6 4"
            vectorEffect="non-scaling-stroke"
            opacity={0.9}
          />
          <circle cx={thread.x1} cy={thread.y1} r={0.06} fill="currentColor" />
          <circle cx={thread.x2} cy={thread.y2} r={0.06} fill="currentColor" />
        </g>
      ))}
    </svg>
  )
}
