import type { ReactNode } from 'react'

/**
 * הגיליון — the unit of content. A new sheet covers yesterday's and the edge stays out.
 * Stack of three at most. Going back is a peel, never a fade.
 */

type SheetProps = {
  /** stable id — the tilt is derived from it */
  id: string
  kicker?: string
  serial?: string
  tone?: 'sheet' | 'red'
  /** 0 = top of the stack */
  depth?: 0 | 1 | 2
  /** absolutely positioned inside a stack, or in normal flow */
  stacked?: boolean
  animate?: boolean
  children: ReactNode
}

/** Deterministic tilt: Math.random would make the sheet twitch on every render. */
export function tiltOf(id: string): string {
  let hash = 0
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) % 800
  return (hash / 100 - 4).toFixed(2)
}

const DEPTH = [
  { z: 3, opacity: 1, offset: 0, scale: 1 },
  { z: 2, opacity: 0.92, offset: 11, scale: 0.985 },
  { z: 1, opacity: 0.8, offset: 21, scale: 0.97 },
] as const

export function PastedSheet({
  id,
  kicker,
  serial,
  tone = 'sheet',
  depth = 0,
  stacked = false,
  animate = false,
  children,
}: SheetProps) {
  const step = DEPTH[depth] ?? DEPTH[0]

  return (
    <article
      className={`torn border-hair border-ink/35 p-4 transition-[transform,opacity] duration-paste ease-stamp ${
        stacked ? 'absolute inset-0' : 'relative'
      } ${tone === 'red' ? 'bg-red text-sheet' : 'bg-sheet text-ink'} ${
        animate ? 'animate-paste-in' : ''
      }`}
      style={{
        zIndex: step.z,
        opacity: step.opacity,
        transform: `translateY(${step.offset}px) scale(${step.scale}) rotate(${tiltOf(id)}deg)`,
      }}
    >
      {(kicker ?? serial) && (
        <div className="flex justify-between font-mono text-[9.5px] tabular-nums tracking-wider opacity-80">
          <span>{kicker}</span>
          <span>{serial}</span>
        </div>
      )}
      {children}
    </article>
  )
}
