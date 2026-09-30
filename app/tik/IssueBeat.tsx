'use client'

import { RevealBar, useReveal } from '@/components/play/Reveal'
import { Badge } from '@/components/ui/Badge'
import { Num } from '@/components/ui/Num'
import { useDialog } from '@/components/ui/useDialog'
import type { WorkerCardState } from '@/lib/profile/card'
import { t } from '@/lib/i18n'

import { dayLabel, fanSinceLabel, homeGateLabel } from './cardView'

/** How long the beat holds before it closes itself. The brief's ceiling is ~1.2 s. */
export const ISSUE_MS = 1200

/**
 * ההנפקה — the one-time beat when a card is saved for the first time.
 *
 * The prototype's ceremony ran 2.25 s behind a sign-up modal and ended on a button. This
 * is the same moment with the three things the brief asks of every beat (rule 78): it
 * ends on its own in 1.2 s, a tap anywhere ends it now, and Escape closes it. It is keyed
 * on `book.card.issuedOn` — the FIRST save of the card, on this device or any other —
 * and never on signing in: an account adds nothing to the card, so it cannot be the
 * moment the card is issued.
 *
 * Under `prefers-reduced-motion` nothing moves: the title, the ticket and the stamp are
 * simply there from the first frame (`motion-reduce:animate-none` — the stamp's delay
 * would otherwise hide it), the draining bar is not drawn, and the beat still holds long
 * enough to be read.
 */
export function IssueBeat({ state, onDone }: { state: WorkerCardState; onDone: () => void }) {
  const dialog = useDialog<HTMLDivElement>(onDone)
  const { progress, skip } = useReveal({ ms: ISSUE_MS, onDone, active: true })
  const meta = [homeGateLabel(state.declared.homeGate), fanSinceLabel(state.declared.fanSince)].filter(
    (part): part is string => part !== null,
  )

  return (
    <div
      ref={dialog}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="issue-title"
      data-issue="beat"
      onClick={skip}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/95 px-gutter"
    >
      <div className="w-full max-w-[380px]">
        <p dir="ltr" className="text-center font-latin text-[9px] font-bold tracking-[0.28em] text-red">
          THE WORKER · WORKER CARD
        </p>
        <h2 id="issue-title" className="mt-1.5 animate-title-rise text-center motion-reduce:animate-none font-display text-step-4 leading-none text-paper">
          {t('tik.issue.title')}
        </h2>

        <div className="relative mt-5 animate-ticket-in border-plate border-paper bg-sheet motion-reduce:animate-none">
          <div className="flex items-center justify-between gap-3 bg-ink px-3 py-1.5">
            <Badge size={26} />
            <p dir="ltr" className="font-mono text-[13px] font-bold tabular-nums text-paper">
              {state.tik}
            </p>
          </div>
          <div className="flex items-end justify-between gap-3 px-3.5 pb-6 pt-2.5">
            <div className="min-w-0">
              <p className="break-words font-display text-[28px] leading-[0.95] text-ink">
                {state.nameHe !== '' ? <bdi>{state.nameHe}</bdi> : t('tik.card.noName')}
              </p>
              {meta.length > 0 && (
                <p className="mt-1.5 font-body text-[12px] text-muted">
                  <bdi>{meta.join(' · ')}</bdi>
                </p>
              )}
            </div>
            <p className="shrink-0 font-poster text-[56px] leading-none text-red">
              <Num>{state.number}</Num>
            </p>
          </div>
          {/* the stamp, landing a beat after the ticket */}
          <div
            aria-hidden="true"
            style={{ animationDelay: '420ms' }}
            className="absolute inset-x-0 -bottom-4 mx-auto w-fit -rotate-[4deg] animate-land border-stamp border-red bg-sheet/90 px-2.5 py-0.5 font-sign text-[15px] font-bold text-red motion-reduce:animate-none"
          >
            {t('tik.issue.stamp')}
          </div>
        </div>

        <p className="mt-6 text-center font-body text-[12px] text-concrete">
          {t('tik.issue.on', { date: dayLabel(state.issuedOn) })}
        </p>
        <div className="mt-3">
          <RevealBar progress={progress} tone="sheet" />
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            skip()
          }}
          className="mx-auto mt-3 flex min-h-tap items-center px-4 font-body text-[12px] font-extrabold text-paper underline decoration-2 underline-offset-4"
        >
          {t('tik.issue.skip')}
        </button>
        <p role="status" className="sr-only">
          {t('tik.issue.sr', { tik: state.tik })}
        </p>
      </div>
    </div>
  )
}
