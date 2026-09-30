'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { FAST_ROW_MS } from '@/lib/game/lineup-sheet'

/**
 * הריצה המהירה — the reveal's one timer, and it only ever runs because a button asked.
 *
 * The walk moves on taps (`TeamSheet`); this is the brief's "short accelerated sequence"
 * for the player who wants to watch the sheet fill itself: `FAST_ROW_MS` a row (≤250ms,
 * `tests/lineup.test.ts`), stopped by `stop()` — any tap on the reveal calls it — by
 * reaching the end, or by unmounting. It never starts on its own.
 */
export function useFastWalk({ step, atEnd }: { step: () => void; atEnd: boolean }): {
  running: boolean
  start: () => void
  stop: () => void
} {
  const [running, setRunning] = useState(false)
  const timer = useRef<number | null>(null)
  const next = useRef(step)
  next.current = step

  const stop = useCallback(() => {
    if (timer.current !== null) window.clearInterval(timer.current)
    timer.current = null
    setRunning(false)
  }, [])

  const start = useCallback(() => {
    if (timer.current !== null) return
    setRunning(true)
    timer.current = window.setInterval(() => next.current(), FAST_ROW_MS)
  }, [])

  useEffect(() => {
    if (atEnd) stop()
  }, [atEnd, stop])

  useEffect(() => stop, [stop])

  return { running, start, stop }
}
