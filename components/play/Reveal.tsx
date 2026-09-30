'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * הפעימה — a reveal that finishes by itself, can always be skipped, and can always be
 * cancelled. One file, because gates 6 and 7 both have one and they are the same thing.
 *
 * The brief draws the line that matters here and it is not about milliseconds:
 * *"timed mechanics are allowed when time itself is gameplay; passive transition waiting
 * is not"*. Gate 6's pair fusion and gate 7's vote reaction are both the second kind —
 * a moment the screen holds so the player can read what just happened — so both of them
 * owe the player three things, and two gates writing those three things twice is how
 * they end up with two different answers to "can I tap through this?".
 *
 *  · **It ends on its own.** Nobody presses "next" to leave a confirmation.
 *  · **A tap ends it now.** `skip()` fires the same `onDone` the timer would have.
 *  · **It can be called off.** `cancel()` stops the clock and fires NOTHING — which is
 *    what "שיניתי את דעתי" needs: the reaction stays open, the advance does not happen,
 *    and the player is back where they were rather than one question further on.
 *
 * **Under `prefers-reduced-motion` there is no animation frame at all** (rule 21). The
 * beat still elapses — it is pacing, not decoration, and a fusion plate that vanished
 * instantly would be a memory nobody got to read — but `progress` holds at 1 and the
 * bar below renders nothing, so no pixel moves.
 *
 * `onDone` is held in a ref rather than listed as a dependency: the callers pass an
 * inline arrow, and a fresh function identity on every render would restart the beat on
 * every render, which is a timer that never fires.
 */
export function useReveal({
  ms,
  onDone,
  active,
}: {
  ms: number
  onDone: () => void
  /** the reveal runs while this is true; flipping it off cancels silently */
  active: boolean
}): {
  /** 1 at the start, 0 at the end — what the bar draws. Held at 1 under reduced motion. */
  progress: number
  running: boolean
  /** end it now and fire `onDone` */
  skip: () => void
  /** stop the clock and fire nothing */
  cancel: () => void
} {
  const done = useRef(onDone)
  done.current = onDone

  const [progress, setProgress] = useState(1)
  const [running, setRunning] = useState(false)
  const timer = useRef<number | null>(null)
  const frame = useRef<number | null>(null)

  const stop = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    if (frame.current !== null) window.cancelAnimationFrame(frame.current)
    timer.current = null
    frame.current = null
    setRunning(false)
  }, [])

  useEffect(() => {
    if (!active) {
      stop()
      setProgress(1)
      return
    }

    setRunning(true)
    setProgress(1)
    const still =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const startedAt = Date.now()
    timer.current = window.setTimeout(() => {
      stop()
      done.current()
    }, ms)

    if (!still) {
      const tick = () => {
        const left = Math.max(0, 1 - (Date.now() - startedAt) / ms)
        setProgress(left)
        if (left > 0) frame.current = window.requestAnimationFrame(tick)
      }
      frame.current = window.requestAnimationFrame(tick)
    }

    return stop
  }, [active, ms, stop])

  const skip = useCallback(() => {
    stop()
    done.current()
  }, [stop])

  return { progress, running, skip, cancel: stop }
}

/**
 * The line that drains while a reveal is running.
 *
 * Deliberately a rule rather than a ring or a number: a countdown a player can READ is a
 * countdown they wait for, and this one exists to be felt at the edge of the eye. It is
 * `aria-hidden` for the same reason — a screen reader being told "43% remaining" eleven
 * times a second is worse than not being told, and the control that ends the beat is a
 * real button beside it.
 */
export function RevealBar({ progress, tone = 'red' }: { progress: number; tone?: 'red' | 'sheet' }) {
  return (
    <div aria-hidden="true" className="h-[3px] w-full bg-ink/15 motion-reduce:hidden">
      <div
        className={`h-full ${tone === 'red' ? 'bg-red' : 'bg-sheet'}`}
        style={{ inlineSize: `${Math.round(progress * 100)}%` }}
      />
    </div>
  )
}
