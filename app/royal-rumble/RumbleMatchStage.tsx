'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { KitSpec } from '@/lib/kit/spec'
import { surname } from '@/lib/game/roster-search'
import { RUN_MS, type PublicRumbleEvent, type RumbleMatchScript, type RumbleVisualPlayer } from '@/lib/game/royal-rumble-presentation'
import { t } from '@/lib/royal-rumble/i18n'

import { RumbleGoalMoment } from './RumbleGoalMoment'
import { goalPos, RumblePitchFive, screenPos } from './RumblePitchFive'
import { useReducedMotion } from './useReducedMotion'

type EraKit = { seasonLabel: string; spec: KitSpec }
export type MatchStep = 'kickoff' | 'playing' | 'goal' | 'full-time'

/**
 * The match as a show (delta 99). It plays `script` — derived from the server's result — and
 * decides nothing: goals appear exactly where the script has them, the score is the script's.
 * Kickoff → clock runs to each moment → hold → … → 90 → full time. Skip reads `script.final`.
 */
export function RumbleMatchStage({
  script,
  kits,
  bare,
  onStep,
  onGoal,
  onSkip,
  onComplete,
}: {
  script: RumbleMatchScript
  kits: EraKit[]
  bare: boolean
  onStep: (step: MatchStep) => void
  onGoal: (event: PublicRumbleEvent) => void
  onSkip: () => void
  onComplete: () => void
}) {
  const reduced = useReducedMotion()
  const [step, setStep] = useState<MatchStep>('kickoff')
  const [clock, setClock] = useState(0)
  const [score, setScore] = useState({ us: 0, them: 0 })
  const [active, setActive] = useState<{ side: 'us' | 'them'; slug: string } | null>(null)
  const [ball, setBall] = useState<{ x: number; y: number } | null>({ x: 50, y: 50 })
  const [line, setLine] = useState<string>(t('matchLive'))
  const [moment, setMoment] = useState<PublicRumbleEvent | null>(null)
  const timers = useRef<number[]>([])
  const done = useRef(false)
  const finishRef = useRef<(skipped: boolean) => void>(() => undefined)
  const cbs = useRef({ onStep, onGoal, onComplete })
  cbs.current = { onStep, onGoal, onComplete }

  const move = useCallback((next: MatchStep) => {
    setStep(next)
    cbs.current.onStep(next)
  }, [])

  const find = useCallback(
    (side: 'us' | 'them', slug: string): RumbleVisualPlayer | undefined => (side === 'us' ? script.us : script.them).find((p) => p.slug === slug),
    [script],
  )

  useEffect(() => {
    let cancelled = false
    timers.current = []
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timers.current.push(window.setTimeout(resolve, ms))
      })

    async function runClock(from: number, to: number) {
      const ms = (Math.max(0, to - from) / 90) * RUN_MS
      const steps = Math.max(1, Math.round(ms / 120))
      for (let i = 1; i <= steps; i += 1) {
        await wait(ms / steps)
        if (cancelled) return
        setClock(Math.round(from + ((to - from) * i) / steps))
      }
    }

    async function play() {
      move('kickoff')
      await wait(reduced ? 400 : 800)
      if (cancelled) return
      move('playing')
      let at = 0
      for (const event of script.events) {
        await runClock(at, event.minute)
        if (cancelled) return
        at = event.minute
        const shooter = find(event.side, event.playerSlug)
        setActive(shooter ? { side: event.side, slug: shooter.slug } : null)
        setBall(shooter ? screenPos(shooter) : null)
        setLine(event.textHe)
        await wait(520)
        if (cancelled) return
        if (event.type === 'goal') {
          setBall(goalPos(event.side))
          await wait(420)
          if (cancelled) return
          setScore(event.scoreAfter)
          setMoment(event)
          move('goal')
          cbs.current.onGoal(event)
          await wait(2400 - 940)
          if (cancelled) return
          setMoment(null)
          setBall({ x: 50, y: 50 })
          setActive(null)
          move('playing')
        } else {
          const keeper = event.goalkeeperSlug ? find(event.side === 'us' ? 'them' : 'us', event.goalkeeperSlug) : undefined
          const g = goalPos(event.side)
          setBall(keeper ? screenPos(keeper) : { x: event.type === 'miss' ? 88 : 50, y: g.y < 50 ? 6 : 94 })
          await wait(1400 - 520)
          if (cancelled) return
          setBall({ x: 50, y: 50 })
          setActive(null)
        }
        setLine(t('matchLive'))
      }
      await runClock(at, 90)
      if (cancelled) return
      finish(false)
    }

    function finish(skipped: boolean) {
      if (done.current) return
      done.current = true
      setClock(90)
      setScore({ us: script.final.us, them: script.final.them })
      setMoment(null)
      setActive(null)
      setBall(null)
      move('full-time')
      timers.current.push(window.setTimeout(() => cbs.current.onComplete(), skipped ? 500 : 900))
    }
    finishRef.current = finish

    void play()
    return () => {
      cancelled = true
      timers.current.forEach((id) => window.clearTimeout(id))
      timers.current = []
    }
    // one script, one show
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script])

  function skip() {
    if (done.current) return
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current = []
    onSkip()
    finishRef.current(true)
  }

  const scorer = moment ? find(moment.side, moment.playerSlug) : undefined
  const assist = moment?.assistPlayerId ? find(moment.side, moment.assistPlayerId) : undefined
  const pushed = moment && !reduced

  return (
    <div className="relative mx-auto max-w-5xl overflow-hidden border-rule border-ink bg-ink text-paper">
      <div className="relative border-b-rule border-paper/15 px-3 py-3 sm:px-5">
        <div className="absolute inset-y-0 start-0 w-2 bg-red" />
        <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3 ps-2">
          <div>
            {!bare && <p className="font-mono tabular-nums text-[8px] font-black tracking-[0.2em] text-red" dir="ltr">THE WORKER · GATE 09</p>}
            <p className="font-display text-[20px] leading-none sm:text-[26px]">{t('title')}</p>
          </div>
          <div className="border-x-hair border-paper/20 px-4 text-center sm:px-8">
            <p className="font-display text-[42px] leading-none sm:text-[56px]" dir="ltr">{score.us}–{score.them}</p>
          </div>
          <div className="text-end">
            <p className="font-mono tabular-nums text-[8px] font-black tracking-[0.16em] text-paper/45" dir="ltr">MATCH CLOCK</p>
            <p className="font-display text-[24px] leading-none text-red sm:text-[30px]" dir="ltr">{String(clock).padStart(2, '0')}:00</p>
          </div>
        </div>
      </div>

      <div className="relative bg-ink px-2 pb-2 pt-2 sm:px-4">
        <div className={`relative origin-center transition-transform duration-500 ease-out motion-reduce:transition-none ${pushed ? 'scale-[1.04]' : 'scale-100'}`}>
          <RumblePitchFive
            us={script.us}
            them={script.them}
            usCount={5}
            themCount={5}
            kits={kits}
            activeSlug={active}
            ball={ball}
          >
            {moment && scorer && (
              <RumbleGoalMoment
                ours={moment.side === 'us'}
                scorer={surname(scorer.nameHe)}
                assist={assist ? surname(assist.nameHe) : null}
                minute={moment.minute}
                score={moment.scoreAfter}
                line={moment.textHe}
              />
            )}
            {step === 'kickoff' && (
              <div className="absolute inset-0 z-40 grid place-items-center bg-ink/55">
                <p className="border-y-rule border-red px-6 py-2 font-display text-[44px] leading-none text-paper">{t('kickoffWhistle')}</p>
              </div>
            )}
            {step === 'full-time' && (
              <div className="absolute inset-0 z-40 grid place-items-center bg-ink/60">
                <p className="border-y-rule border-red px-6 py-2 text-center font-display text-[38px] leading-none text-paper">{t('fullTime')}</p>
              </div>
            )}
          </RumblePitchFive>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 border-hair border-paper/20 px-2 py-1.5">
            <div className="shrink-0 bg-red px-1.5 py-0.5 font-mono tabular-nums text-[8px] font-black tracking-[0.18em] text-paper" dir="ltr">LIVE</div>
            <p className="min-w-0 flex-1 font-body text-[12px] font-bold leading-snug text-paper sm:text-[13px]">{line}</p>
          </div>
          <button
            type="button"
            onClick={skip}
            disabled={step === 'full-time'}
            className="min-h-tap shrink-0 border-rule border-paper/40 px-3 font-display text-[16px] text-paper disabled:opacity-40"
          >
            {t('skipMatch')}
          </button>
        </div>
      </div>
    </div>
  )
}
