'use client'

import { useEffect, useState } from 'react'

/**
 * חגיגה — the burst of paper that fires on a right answer and on a strong run.
 *
 * Maor asked for a celebration, and the temptation with a celebration is to reach for a
 * particle library. This is thirty-four `<i>` elements with a CSS animation and no
 * dependency: on a phone that is the difference between a 60fps flourish and a stutter
 * in the middle of the one moment the game is supposed to feel good.
 *
 * It is the press language, not generic confetti: rectangles in the two plate inks and
 * the paper, no rounded corners, no gradients, tumbling on their own axes at different
 * speeds. It cleans itself up after 1.4s so nothing accumulates across a twelve-question
 * run, and it renders NOTHING under `prefers-reduced-motion` — a full-screen shower of
 * moving objects is exactly what that setting exists to prevent.
 */
const TONES = ['bg-red', 'bg-sign', 'bg-paper', 'bg-red', 'bg-ink']

/**
 * והארגז שאין בו ורמיליון — the set gate 8 celebrates with, and why it exists.
 *
 * Vermilion over printed GRASS cannot be made safe: red and green are opposite sides of
 * the wheel, so every partially-covered pixel between them — the tumbling rectangle's own
 * antialiased edge — passes through the yellow hues, and rule 8 has no allowance for an
 * edge. Navy, ink and paper over grass all stay under the scanner's saturation floor or
 * well outside its hue band, so the celebration survives and the pitch stays legal. The
 * same argument gate 11 makes about a whole wing, made about one surface.
 */
export const NO_RED_TONES = ['bg-sign', 'bg-ink', 'bg-paper', 'bg-sign', 'bg-ink']

export function Confetti({
  pieces = 34,
  tones = TONES,
}: {
  pieces?: number
  tones?: readonly string[]
}) {
  const [alive, setAlive] = useState(true)
  const [motionOk, setMotionOk] = useState(false)

  useEffect(() => {
    setMotionOk(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    const done = window.setTimeout(() => setAlive(false), 1400)
    return () => window.clearTimeout(done)
  }, [])

  if (!alive || !motionOk) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden"
    >
      {Array.from({ length: pieces }, (_, index) => {
        // deterministic per index so the shape is stable across a re-render mid-flight
        const drift = ((index * 37) % 100) - 50
        const spin = ((index * 53) % 2 === 0 ? 1 : -1) * (240 + ((index * 29) % 360))
        return (
          <i
            key={index}
            className={`confetti absolute block ${tones[index % tones.length]}`}
            style={{
              insetInlineStart: `${(index * 100) / pieces}%`,
              width: index % 3 === 0 ? 10 : 6,
              height: index % 4 === 0 ? 6 : 14,
              animationDelay: `${(index % 7) * 40}ms`,
              ['--drift' as string]: `${drift}px`,
              ['--spin' as string]: `${spin}deg`,
            }}
          />
        )
      })}
    </div>
  )
}
