'use client'

import { useEffect, useState } from 'react'

import type { Say } from '@/lib/life/runtime/sceneDressing'

/**
 * מה הילד אומר — one short line over a kid's head, then gone.
 *
 * No tap, no name, no box to dismiss: it fades after about a second, and it never takes a
 * pointer event, so it can never sit between a thumb and the ball.
 */
export function DressBubble({ say }: { say: (Say & { n: number }) | null }) {
  const [shown, setShown] = useState<(Say & { n: number }) | null>(null)
  const [live, setLive] = useState(false)

  useEffect(() => {
    if (!say) return
    setShown(say)
    setLive(true)
    const hide = window.setTimeout(() => setLive(false), 950)
    return () => window.clearTimeout(hide)
  }, [say])

  if (!shown) return null
  // the card is RTL, so the inline-start edge is the right edge of the glass
  const startPct = Math.min(88, Math.max(4, (1 - shown.x) * 100 - 6))
  return (
    <p
      aria-hidden="true"
      data-life="dress-bubble"
      className={`pointer-events-none absolute z-10 border-rule border-ink bg-sheet px-2 py-1 font-body text-[13px] leading-none text-ink transition-opacity duration-300 motion-reduce:transition-none ${live ? 'opacity-100' : 'opacity-0'}`}
      style={{ insetInlineStart: `${startPct}%`, top: `${Math.max(4, shown.y * 100 - 9)}%` }}
    >
      {shown.text}
    </p>
  )
}
