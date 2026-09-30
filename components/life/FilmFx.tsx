'use client'

import { useEffect, useState } from 'react'

/**
 * אפקטים של פילם — four small things a camera does, as overlays the shell can stack.
 *
 * None of them is a scene. They sit over whatever is on the glass and change how it is
 * SEEN: the grain of stock over a title, the bars of a wide frame closing in on a cut, a
 * light leak sweeping across a year change, a flash frame on a goal. Each is one
 * element and one keyframe, and every one of them respects `prefers-reduced-motion`.
 */

/**
 * film grain, jittering; `opacity` is the whole tuning knob. `code` draws the same grain
 * without the stock image (a browser-made noise tile, `.film-grain-code`) — for a screen
 * that must be whole with every image request failing (the opening documentary, §43).
 */
export function Grain({ opacity = 0.18, code = false }: { opacity?: number; code?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`film-grain ${code ? 'film-grain-code' : ''} pointer-events-none absolute inset-0`}
      style={{ opacity }}
    />
  )
}

/** two black bars closing the frame to widescreen — `height` as a fraction of the glass */
export function Letterbox({ height = 0.11, ms = 500 }: { height?: number; ms?: number }) {
  const bar = `${height * 100}%`
  const anim = `bars-in ${ms}ms var(--ease-stamp) both`
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-[2] bg-ink motion-reduce:animate-none"
        style={{ height: bar, transformOrigin: 'top', animation: anim }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-ink motion-reduce:animate-none"
        style={{ height: bar, transformOrigin: 'bottom', animation: anim }}
      />
    </>
  )
}

/** a light leak sweeping across the frame once */
export function Leak({ index = 1, ms = 1400, delay = 200 }: { index?: 1 | 2 | 3; ms?: number; delay?: number }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[3] bg-cover bg-center mix-blend-screen motion-reduce:hidden"
      style={{
        backgroundImage: `url(/life/art/fxLeak${index}.webp)`,
        animation: `leak-sweep ${ms}ms ease-in-out ${delay}ms both`,
        opacity: 0,
      }}
    />
  )
}

/** one frame of white or red, then gone — a goal, a whistle, a door slamming */
export function Flash({ tone, nonce }: { tone: 'white' | 'red'; nonce: number }) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (!nonce) return
    setOn(true)
    const id = window.setTimeout(() => setOn(false), 260)
    return () => window.clearTimeout(id)
  }, [nonce])
  if (!on) return null
  return (
    <div
      key={nonce}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-[35] ${tone === 'red' ? 'bg-red' : 'bg-sheet'} motion-reduce:hidden`}
      style={{ animation: 'flash-frame 240ms ease-out both' }}
    />
  )
}

/**
 * מונה השנים — the digits of a year rolling to the next, like a counter on a camera.
 * Each digit that changes drops in from above; the ones that do not stay put.
 */
export function YearRoll({ from, to, delay = 350 }: { from: number | null; to: number; delay?: number }) {
  const [shown, setShown] = useState(from ?? to)
  useEffect(() => {
    if (from === null || from === to) {
      setShown(to)
      return
    }
    const id = window.setTimeout(() => setShown(to), delay)
    return () => window.clearTimeout(id)
  }, [from, to, delay])
  const digits = String(shown).split('')
  const fromDigits = String(from ?? to).split('')
  return (
    <span className="inline-flex overflow-hidden" dir="ltr" aria-label={String(to)}>
      {digits.map((d, i) => {
        const moved = shown === to && from !== null && fromDigits[i] !== d
        return (
          <span
            key={`${i}-${d}`}
            className="inline-block"
            style={moved ? { animation: `digit-roll 520ms var(--ease-stamp) ${i * 60}ms both` } : undefined}
          >
            {d}
          </span>
        )
      })}
    </span>
  )
}
