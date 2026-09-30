'use client'

import { useEffect, useRef, useState } from 'react'

import { timeLabel } from '@/lib/life/clock'
import { t } from '@/lib/i18n'

export type AdvanceCut = {
  fromMinute: number
  toMinute: number
  fromHe: string
  toHe: string
  walked: boolean
  /** "יוצאים." / "הזמן עובר לאט." — his age's word for it */
  lineHe: string
  /** the day, as the HUD prints it — the era in one line */
  dateHe: string
}

/**
 * הזמן עובר — the advance, lived for two seconds (SMART FREE TIME §7, §4 C).
 *
 *   17:06 · הקיוסק  →  יוצאים.  →  17:21 · אוסישקין
 *
 * Not a loading spinner and not a dry change of number: the time stamp of where he was,
 * the clock running forward while one short word in his voice says what the minutes were
 * (a boy "הולכים", a soldier "זזים"), and the stamp of where he is now. The world does the
 * real work underneath — the room is rebuilt behind this plate — so the plate is the fade.
 * It is not state (§34): closing the tab mid-cut loses nothing.
 *
 * Reduced motion: fade → the landing stamp → fade, no running clock.
 */
export function TimeAdvanceTransition({ cut, onDone }: { cut: AdvanceCut; onDone: () => void }) {
  const reduced = useRef(typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches))
  const [phase, setPhase] = useState<'from' | 'pass' | 'to' | 'out'>(reduced.current ? 'to' : 'from')
  const [clock, setClock] = useState(reduced.current ? cut.toMinute : cut.fromMinute)
  const done = useRef(onDone)
  done.current = onDone

  useEffect(() => {
    const timers: number[] = []
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms))
    let frame = 0
    if (reduced.current) {
      at(1100, () => setPhase('out'))
      at(1500, () => done.current())
    } else {
      at(520, () => {
        setPhase('pass')
        const start = performance.now()
        const run = (now: number) => {
          const k = Math.min(1, (now - start) / 900)
          // ease-out: the minutes run fast, then settle on the one he arrives at
          setClock(Math.round(cut.fromMinute + (cut.toMinute - cut.fromMinute) * (1 - (1 - k) ** 3)))
          if (k < 1) frame = requestAnimationFrame(run)
        }
        frame = requestAnimationFrame(run)
      })
      at(1520, () => setPhase('to'))
      at(2200, () => setPhase('out'))
      at(2520, () => done.current())
    }
    return () => {
      timers.forEach((id) => window.clearTimeout(id))
      cancelAnimationFrame(frame)
    }
  }, [cut.fromMinute, cut.toMinute])

  const place = phase === 'from' ? cut.fromHe : phase === 'pass' ? null : cut.toHe
  return (
    <div
      className={`absolute inset-0 z-[70] flex flex-col items-center justify-center bg-ink text-sheet transition-opacity duration-peel motion-reduce:duration-plate ${phase === 'out' ? 'opacity-0' : 'opacity-100'}`}
      data-life="time-advance"
      role="status"
      aria-live="polite"
      aria-label={t('life90f.transition')}
    >
      <p className="font-body text-[11px] tracking-wide text-concrete">
        <bdi>{cut.dateHe}</bdi>
      </p>
      {/* the clock stamp: two plates, a hair out of register, like everything printed here */}
      <div className="relative mt-2">
        <span aria-hidden="true" className="absolute inset-0 translate-x-[3px] translate-y-[2px] font-poster text-[64px] leading-none tabular-nums text-red opacity-80" dir="ltr">
          {timeLabel(clock)}
        </span>
        <span className="relative font-poster text-[64px] leading-none tabular-nums text-sheet" dir="ltr">
          {timeLabel(clock)}
        </span>
      </div>
      <p key={phase} className={`mt-3 min-h-[1.5em] font-sign text-[17px] ${phase === 'pass' ? 'text-concrete' : 'text-sheet'} animate-sheet-in motion-reduce:animate-none`}>
        <bdi>{place ?? cut.lineHe}</bdi>
      </p>
    </div>
  )
}
