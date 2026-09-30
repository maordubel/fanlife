'use client'

import { useEffect, useState } from 'react'

/**
 * הפיצוץ — the points that fly off a right answer.
 *
 * Pure feedback and entirely disposable: a number that leaps up, plus the house's two
 * plates. It is the cheapest possible thing to build and it is most of what separates "a
 * form graded correctly" from "a game you just scored in".
 *
 * **It prints on an ink plate now, and it does not fade.** Both changes are rule 8, found
 * by playing gate 8 through in a browser rather than loading its first screen: the burst
 * floats over whatever the gate is, gate 8's gate is printed GRASS, and vermilion over
 * green cannot be made safe. Red and green are opposite sides of the wheel, so every
 * partially-covered pixel between them — the glyph's own antialiased edge, and every
 * frame of an opacity fade — passes through the yellow hues on the way across. The
 * measurement was 1,868 yellow pixels in one frame of a 900ms fade.
 *
 * So the number sits on an opaque ink plate (the vermilion's edge now dissolves into ink,
 * which is a red-black and safe) and the animation moves it without ever making it
 * translucent. A stamp does not fade anyway; it lands, and then it is gone. The two other
 * gates that use this print on cream, where neither problem existed — they get the plate
 * because one burst is better than two (rule 59), and because a number on a plate is more
 * of this brand than a number floating on paper.
 *
 * Because it no longer ends at zero opacity it has to LEAVE, so it takes itself off after
 * its own 900ms rather than relying on whichever gate mounted it to remember. A plate that
 * hung on the glass until the next goal was dealt would have covered the reveal it is
 * celebrating for nine seconds.
 *
 * Respects `prefers-reduced-motion` — the number still appears, it just stops moving.
 */
export function Burst({ points, combo }: { points: number; combo: number }) {
  const [alive, setAlive] = useState(true)
  useEffect(() => {
    const done = window.setTimeout(() => setAlive(false), 900)
    return () => window.clearTimeout(done)
  }, [])
  if (!alive) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
    >
      <span className="animate-burst motion-reduce:animate-none">
        <span className="block border-plate border-ink bg-ink px-4 py-1.5">
          {/* Printed twice, navy under and vermilion over, misregistered by the house 3px.
              A drop-shadow would have been one line — and a shadow, which this brand does
              not have. The two-plate version is also simply more correct: the dark edge is
              two inks overlapping, not a light source. */}
          <span className="relative block font-poster text-[72px] leading-none">
            <span className="plate-shift absolute inset-0 text-sign">+{points}</span>
            <span className="plate-top relative text-red">+{points}</span>
          </span>
          {combo > 1 && (
            <span className="block text-center font-poster text-[26px] leading-none text-paper">
              ×{combo}
            </span>
          )}
        </span>
      </span>
    </div>
  )
}
