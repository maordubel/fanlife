'use client'

import { useEffect, useState } from 'react'

/**
 * התאורה נדלקת — the floodlights coming on.
 *
 * A tower does not fade up. The lamps strike, stutter twice, and then hold, and the
 * wash spreads down the ground a beat behind them because the light has to travel.
 * The four masts fire in sequence, not together, the way a ground actually lights.
 *
 * It runs once, on entry. It is decoration, so it is `aria-hidden`, it never blocks a
 * tap, and `prefers-reduced-motion` is honoured globally in `globals.css` — a viewer
 * who has asked for stillness gets the lights already on rather than a rush of flashes.
 */

const MASTS = [
  { left: '8%', delay: 0 },
  { left: '34%', delay: 220 },
  { left: '62%', delay: 120 },
  { left: '88%', delay: 340 },
]

export function Floodlights({ height = 132 }: { height?: number }) {
  // Mounted client-side so the sequence starts when the screen is actually seen, and
  // so a server-rendered page never ships a half-lit tower.
  const [lit, setLit] = useState(false)
  useEffect(() => setLit(true), [])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden"
      style={{ height }}
    >
      {MASTS.map((mast) => (
        <div
          key={mast.left}
          className="absolute top-0"
          style={{ left: mast.left, transform: 'translateX(-50%)' }}
        >
          {/* the lamp plate */}
          <div
            className={`grid grid-cols-3 gap-[3px] border-hair border-sheet/40 p-[3px] ${
              lit ? 'animate-glow-up' : ''
            }`}
            style={{ animationDelay: `${mast.delay + 600}ms` }}
          >
            {Array.from({ length: 6 }, (_, index) => (
              <i
                key={index}
                className={`block h-[5px] w-[5px] rounded-full bg-sheet ${
                  lit ? 'animate-strike' : 'opacity-[.08]'
                }`}
                style={{ animationDelay: `${mast.delay + index * 55}ms` }}
              />
            ))}
          </div>

          {/* the wash: a cone of light down onto the ground */}
          <div
            className={`mx-auto ${lit ? 'animate-wash' : 'opacity-0'}`}
            style={{
              // Wide, because a cone spreads: the clip path opens from the lamp plate
              // out to the full width at the bottom.
              width: 130,
              height: height - 26,
              transformOrigin: 'top center',
              animationDelay: `${mast.delay + 500}ms`,
              background:
                'linear-gradient(to bottom, rgb(var(--sheet) / .42), rgb(var(--sheet) / 0))',
              clipPath: 'polygon(46% 0%, 54% 0%, 100% 100%, 0% 100%)',
            }}
          />
        </div>
      ))}
    </div>
  )
}
