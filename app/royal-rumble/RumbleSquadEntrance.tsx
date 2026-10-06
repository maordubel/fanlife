'use client'

import { useEffect, useState } from 'react'

import type { KitSpec } from '@/lib/kit/spec'
import type { RumbleVisualPlayer } from '@/lib/game/royal-rumble-presentation'
import { t } from '@/lib/royal-rumble/i18n'

import { RumblePitchFive } from './RumblePitchFive'
import { useReducedMotion } from './useReducedMotion'

type EraKit = { seasonLabel: string; spec: KitSpec }

/** GK → DF → MF → MF → FW, one at a time: 3–5 s in all */
const ARRIVAL_MS = [520, 580, 640, 640, 700]

/**
 * YOUR entrance (brief §Wave A): the five walk on in slot order, then the fifth lands and
 * the whole five breathes once — "החמישייה שלך". Under reduced motion nobody walks: the
 * five are stamped into formation and the step just holds.
 */
export function RumbleSquadEntrance({
  us,
  kits,
  stage,
  onFive,
  onDone,
}: {
  us: RumbleVisualPlayer[]
  kits: EraKit[]
  stage: 'your-entrance' | 'your-five'
  onFive: () => void
  onDone: () => void
}) {
  const reduced = useReducedMotion()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (reduced) {
      setCount(us.length)
      const timers = [window.setTimeout(onFive, 100), window.setTimeout(onDone, 1300)]
      return () => timers.forEach((id) => window.clearTimeout(id))
    }
    if (count >= us.length) {
      const timers = [window.setTimeout(onFive, 60), window.setTimeout(onDone, 1100)]
      return () => timers.forEach((id) => window.clearTimeout(id))
    }
    const timer = window.setTimeout(() => setCount((value) => value + 1), ARRIVAL_MS[count] ?? 600)
    return () => window.clearTimeout(timer)
    // onFive/onDone are stable enough: the parent only ever moves the step forward
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, reduced, us.length])

  const arrived = us[Math.min(count, us.length) - 1]
  return (
    <div className="relative text-center">
      <p className="font-mono tabular-nums text-[9px] font-black tracking-[0.32em] text-red" dir="ltr">YOUR ENTRANCE</p>
      <h2 className="mt-2 font-display text-[34px] leading-[0.9] sm:text-[56px]">{stage === 'your-five' ? t('entranceFive') : t('entranceKicker')}</h2>
      <p className="mt-1 h-5 font-body text-[12px] font-bold text-paper/80" aria-live="polite">
        {arrived && stage === 'your-entrance' ? `${arrived.position} · ${arrived.nameHe}` : ''}
      </p>
      <div className="mt-2">
        <RumblePitchFive us={us} them={[]} usCount={count} themCount={0} kits={kits} pulse={stage === 'your-five'} />
      </div>
    </div>
  )
}
