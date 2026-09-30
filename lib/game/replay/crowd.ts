'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * הקהל של שער 8 — the ground, heard (delta 88).
 *
 * Only the owner's own ground recording plays here — the `crowd-real-*` cuts that THE
 * WORKER LIFE and the Royal Rumble already ship (`lib/life/runtime/audio.ts`: "three
 * recordings, and nothing else"; the synthesised whistles and kicks stay silent). A bed of
 * the real murmur that swells with the move, the build as the ball gets into the box, the
 * roar on the goal, the groan on a move that was nothing like it.
 *
 * · **Nothing plays before a finger touches the glass** (autoplay policy, and manners).
 * · **Muted is remembered** per browser (`the-worker:goal:sound`), and the mute chip is
 *   on the HUD at all times. Storage can throw (a private window) — then the choice lasts
 *   for the page, and the page still works.
 * · **A hidden tab is a silent tab** — the bed pauses on `visibilitychange`.
 */

const SRC = {
  bed: '/life/sfx/crowd-real-murmur.m4a',
  build: '/life/sfx/crowd-real-build.m4a',
  goal: '/life/sfx/crowd-real-goal.m4a',
  miss: '/life/sfx/crowd-real-miss.m4a',
  after: '/life/sfx/crowd-real-after.m4a',
  final: '/life/sfx/crowd-real-final.m4a',
} as const

export type CrowdCue = Exclude<keyof typeof SRC, 'bed'>

const STORE = 'the-worker:goal:sound'

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(STORE) === 'off'
  } catch {
    return false
  }
}

function writeMuted(muted: boolean) {
  try {
    window.localStorage.setItem(STORE, muted ? 'off' : 'on')
  } catch {
    // a private window: the choice lasts for this page
  }
}

/**
 * `enabled: false` inside THE WORKER LIFE — the life runs its own ground (`lib/life/runtime/
 * audio.ts`), and two crowds at once is one too many.
 */
export function useCrowd(enabled = true) {
  const [muted, setMuted] = useState(false)
  const unlocked = useRef(false)
  const bed = useRef<HTMLAudioElement | null>(null)
  const level = useRef(0.16)
  const mutedRef = useRef(false)
  const fade = useRef<number | null>(null)

  useEffect(() => {
    const stored = readMuted()
    setMuted(stored)
    mutedRef.current = stored
  }, [])

  const ramp = useCallback((to: number, ms = 700) => {
    const audio = bed.current
    if (!audio) return
    if (fade.current !== null) window.clearInterval(fade.current)
    const from = audio.volume
    const start = Date.now()
    fade.current = window.setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / ms)
      audio.volume = Math.max(0, Math.min(1, from + (to - from) * t))
      if (t >= 1 && fade.current !== null) {
        window.clearInterval(fade.current)
        fade.current = null
      }
    }, 50)
  }, [])

  const startBed = useCallback(() => {
    if (mutedRef.current || !unlocked.current) return
    if (!bed.current) {
      const audio = new Audio(SRC.bed)
      audio.loop = true
      audio.volume = 0
      bed.current = audio
    }
    void bed.current.play().catch(() => undefined)
    ramp(level.current, 900)
  }, [ramp])

  useEffect(() => {
    if (!enabled) return
    const unlock = () => {
      if (unlocked.current) return
      unlocked.current = true
      startBed()
    }
    const hide = () => {
      if (document.hidden) bed.current?.pause()
      else if (!mutedRef.current && unlocked.current) void bed.current?.play().catch(() => undefined)
    }
    window.addEventListener('pointerdown', unlock, { capture: true, passive: true })
    window.addEventListener('keydown', unlock, { capture: true })
    document.addEventListener('visibilitychange', hide)
    return () => {
      window.removeEventListener('pointerdown', unlock, { capture: true })
      window.removeEventListener('keydown', unlock, { capture: true })
      document.removeEventListener('visibilitychange', hide)
      if (fade.current !== null) window.clearInterval(fade.current)
      bed.current?.pause()
      bed.current = null
    }
  }, [enabled, startBed])

  /** The bed's loudness, 0..1 of tension. */
  const swell = useCallback(
    (tension: number) => {
      level.current = 0.14 + Math.max(0, Math.min(1, tension)) * 0.36
      if (!mutedRef.current) ramp(level.current)
    },
    [ramp],
  )

  const cue = useCallback((key: CrowdCue, volume = 0.8) => {
    if (!enabled || mutedRef.current || !unlocked.current) return
    const audio = new Audio(SRC[key])
    audio.volume = volume
    void audio.play().catch(() => undefined)
  }, [enabled])

  const toggle = useCallback(() => {
    const next = !mutedRef.current
    mutedRef.current = next
    setMuted(next)
    writeMuted(next)
    if (next) bed.current?.pause()
    else if (enabled) {
      unlocked.current = true
      startBed()
    }
  }, [enabled, startBed])

  return { muted, toggle, swell, cue }
}
