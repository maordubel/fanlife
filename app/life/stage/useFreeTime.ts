'use client'

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'

import { t } from '@/lib/i18n'
import type { loadLife } from '@/lib/life/engine'
import type { LifeAudio } from '@/lib/life/runtime/audio'
import type { LifeBus } from '@/lib/life/runtime/bus'
import type { LifeRuntime } from '@/lib/life/runtime/game'
import { EARLY_SUFFIX, FREE_TIME_TIMING, LET_PASS_SUFFIX, type FreeTimeAction, type TimeAdvancePlan } from '@/lib/life/world/timeAdvance'
import { plannerCopy, transitionLineHe, type PlannerCopy } from '@/lib/life/world/timeAdvanceCopy'
import type { AdvanceCut } from '@/components/life/TimeAdvanceTransition'

/**
 * זמן פנוי, מצד המעטפת — the pacing and the asking, and nothing else (SMART FREE TIME §30).
 *
 * The world detects free time the minute it exists and puts the plan on the bus. What a
 * PERSON should see, and when, is decided here, in real seconds: the chip joins the glass
 * after ~3 s of the room being quiet (never over a conversation, a film, a card, a tutorial
 * or the first seconds of a room), and the planner opens by itself only when nothing that
 * fits is on offer, the plan can actually be carried out, and ~10 s have gone by without a
 * touch. It opens at most once per plan by itself; the chip stays for the rest.
 *
 * This hook never moves the clock. The planner's buttons become `runtime.advanceTime(id)`
 * — the world re-plans at the tap and refuses a stale plan (§19) — or the systems that
 * already own a side action: a host's conversation, the map's walk, the album.
 */
export function useFreeTime({
  plan,
  covered,
  runtime,
  engineRef,
  busRef,
  audio,
  dateHe,
}: {
  plan: TimeAdvancePlan | null
  /** anything on the glass that is not the room: a conversation, a card, a sheet, a film */
  covered: boolean
  runtime: MutableRefObject<LifeRuntime | null>
  engineRef: MutableRefObject<Awaited<ReturnType<typeof loadLife>> | null>
  busRef: MutableRefObject<LifeBus | null>
  audio: MutableRefObject<LifeAudio | null>
  dateHe: string
}) {
  const [chipFor, setChipFor] = useState<string | null>(null)
  const [open, setOpen] = useState<{ plan: TimeAdvancePlan; copy: PlannerCopy } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [cut, setCut] = useState<AdvanceCut | null>(null)
  const expanded = useRef(new Set<string>())
  const lastTouch = useRef(Date.now())

  const planId = plan?.id ?? null

  // the invitation: a few quiet seconds after the plan first appears (or the glass clears)
  useEffect(() => {
    if (!planId || covered || cut) {
      if (!planId) setChipFor(null)
      return
    }
    if (chipFor === planId) return
    const timer = window.setTimeout(() => setChipFor(planId), FREE_TIME_TIMING.chipAfterMs)
    return () => window.clearTimeout(timer)
  }, [planId, covered, cut, chipFor])

  // "not progressing" is a person not touching anything — not a world clock
  useEffect(() => {
    const touch = () => {
      lastTouch.current = Date.now()
    }
    window.addEventListener('pointerdown', touch, { passive: true })
    window.addEventListener('keydown', touch)
    return () => {
      window.removeEventListener('pointerdown', touch)
      window.removeEventListener('keydown', touch)
    }
  }, [])

  const openPlanner = useCallback(() => {
    const current = runtime.current
    const engine = engineRef.current
    if (!current || !engine) return
    // read fresh, never the copy the chip was drawn from (§19)
    const fresh = current.freeTime()
    if (!fresh) {
      setChipFor(null)
      return
    }
    current.pause(true)
    audio.current?.play('page', { bus: 'ui', level: 0.45 })
    setNotice(null)
    setOpen({ plan: fresh, copy: plannerCopy(fresh, engine.state) })
  }, [runtime, engineRef, audio])

  // the planner opens by itself only when there is nothing better to do, and only once
  useEffect(() => {
    if (!plan || chipFor !== plan.id || covered || open || cut) return
    if (expanded.current.has(plan.id)) return
    const fits = plan.optionalActions.some((row) => row.tier === 'safe' || row.tier === 'tight')
    if (fits || !plan.safe) return
    const timer = window.setInterval(() => {
      if (Date.now() - lastTouch.current < FREE_TIME_TIMING.expandAfterMs) return
      expanded.current.add(plan.id)
      window.clearInterval(timer)
      openPlanner()
    }, 1000)
    return () => window.clearInterval(timer)
  }, [plan, chipFor, covered, open, cut, openPlanner])

  const close = useCallback(() => {
    setOpen(null)
    setNotice(null)
    runtime.current?.pause(false)
  }, [runtime])

  const advance = useCallback(
    (variant: 'plan' | 'early' | 'let-pass') => {
      const current = runtime.current
      const engine = engineRef.current
      if (!current || !engine || !open) return
      const suffix = variant === 'early' ? EARLY_SUFFIX : variant === 'let-pass' ? LET_PASS_SUFFIX : ''
      const result = current.advanceTime(`${open.plan.id}${suffix}`)
      if (!result.ok) {
        // the day moved under the card: show the plan as it is now, and say so (§19)
        const fresh = current.freeTime()
        if (!fresh) {
          setOpen(null)
          current.pause(false)
          busRef.current?.emit('toast', { text: t('life90f.changed'), tone: 'plain' })
          return
        }
        setOpen({ plan: fresh, copy: plannerCopy(fresh, engine.state) })
        setNotice(t('life90f.changed'))
        return
      }
      setOpen(null)
      setNotice(null)
      setChipFor(null)
      audio.current?.play('tick', { bus: 'ui', level: 0.5 })
      setCut({
        fromMinute: result.fromMinute,
        toMinute: result.toMinute,
        fromHe: result.fromHe,
        toHe: result.toHe,
        walked: result.walked,
        // a walk from one room of the flat to the next is still waiting at home, not leaving
        lineHe: transitionLineHe(engine.state, result.walked && !open.plan.atHome),
        dateHe,
      })
    },
    [runtime, engineRef, busRef, audio, open, dateHe],
  )

  const act = useCallback(
    (action: FreeTimeAction) => {
      const current = runtime.current
      if (!current) return
      setOpen(null)
      setNotice(null)
      const start = action.start
      if (start.kind === 'sheet') {
        // the album stops the world like every sheet; nothing is spent while it is open
        busRef.current?.emit('album', { open: true })
        return
      }
      current.pause(false)
      if (start.kind === 'talk') {
        current.talk(start.act)
        return
      }
      const here = engineRef.current?.state.location
      // the map's own walk, the map's own minutes — the job is asked for in the room
      if (start.to !== here) current.goTo(start.to)
    },
    [runtime, busRef, engineRef],
  )

  const endCut = useCallback(() => {
    audio.current?.play('stamp', { bus: 'ui', level: 0.4 })
    setCut(null)
  }, [audio])

  const chip = plan && chipFor === plan.id && !covered && !open && !cut && engineRef.current ? plannerCopy(plan, engineRef.current.state) : null

  return {
    chip: chip ? { label: chip.chipHe, late: plan?.late ?? false } : null,
    openPlanner,
    planner: open ? { ...open, notice } : null,
    close,
    advance,
    act,
    cut,
    endCut,
  }
}
