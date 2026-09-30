'use client'

import { useEffect, useState } from 'react'

import { SlideSheet } from '@/components/stage/SlideSheet'
import { t, type MessageKey } from '@/lib/i18n'

/**
 * מדריך שלושת הצעדים — gate 13's first-run coach (delta 87, Maor 23.9.2026: "the game
 * is not understood because of the design"). Three short steps, skippable, shown once
 * per device — `localStorage`, wrapped in try/catch (a private window or blocked
 * storage must never crash the gate, rule: browser storage is best-effort only).
 *
 * Kept OUTSIDE `components/archive/ThreadBoard.tsx` on purpose: that file is not in
 * this cluster's edit list (it draws the thread board itself), so the coach is a layer
 * of its own, mounted once from each of the gate's two routes, rather than a change to
 * the board underneath it.
 */

const KEY = 'tw:coach:thread:v1'
const OPEN_EVENT = 'tw:thread-coach-open'

/**
 * A run's own clock keeps ticking under a first-run overlay unless it is told not to
 * (the overlay is a DOM layer, not a pause) — so this fires a plain window event the
 * board's timer effect can listen for, without either file importing the other's
 * client state across the server/client page boundary.
 */
function announce(open: boolean): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: open }))
}

export function useThreadCoachOpen(): boolean {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    function onEvent(event: Event) {
      setOpen(Boolean((event as CustomEvent<boolean>).detail))
    }
    window.addEventListener(OPEN_EVENT, onEvent)
    return () => window.removeEventListener(OPEN_EVENT, onEvent)
  }, [])
  return open
}

function readSeen(): boolean {
  try {
    return window.localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

function writeSeen(): void {
  try {
    window.localStorage.setItem(KEY, '1')
  } catch {
    // best-effort only — a blocked store just means the coach shows again next visit
  }
}

const STEPS: readonly { title: MessageKey; body: MessageKey }[] = [
  { title: 'stage.play.thread.coach.1.title', body: 'stage.play.thread.coach.1.body' },
  { title: 'stage.play.thread.coach.2.title', body: 'stage.play.thread.coach.2.body' },
  { title: 'stage.play.thread.coach.3.title', body: 'stage.play.thread.coach.3.body' },
]

export function ThreadCoach() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!readSeen()) {
      setOpen(true)
      announce(true)
    }
  }, [])

  function dismiss() {
    writeSeen()
    setOpen(false)
    announce(false)
  }

  if (!open) return null
  const current = STEPS[step] ?? STEPS[0] ?? { title: 'stage.play.thread.coach.1.title' as MessageKey, body: 'stage.play.thread.coach.1.body' as MessageKey }
  const last = step === STEPS.length - 1

  return (
    <SlideSheet open onClose={dismiss} title={t('stage.play.thread.step', { n: String(step + 1) })} tone="ink">
      <div className="grid gap-3 pb-2 pt-1">
        <ol className="flex items-center gap-1.5" aria-hidden="true">
          {STEPS.map((_, index) => (
            <li key={index} className={`h-1.5 flex-1 ${index <= step ? 'bg-red' : 'bg-concrete/40'}`} />
          ))}
        </ol>
        <div>
          <h3 className="font-display text-step-1 leading-tight text-paper">{t(current.title)}</h3>
          <p className="mt-1.5 font-body text-[13px] leading-relaxed text-concrete">{t(current.body)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={dismiss}
            className="min-h-tap flex-1 border-rule border-concrete/40 px-3 font-body text-[13px] font-extrabold text-concrete"
          >
            {t('stage.play.thread.coach.skip')}
          </button>
          <button
            type="button"
            onClick={() => (last ? dismiss() : setStep((value) => value + 1))}
            className="min-h-tap flex-1 bg-red px-3 font-display text-step-0 text-sheet"
          >
            {last ? t('stage.play.thread.coach.skip') : t('stage.play.thread.step', { n: String(step + 2) })}
          </button>
        </div>
      </div>
    </SlideSheet>
  )
}
