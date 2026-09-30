'use client'

import { useEffect, useRef, useState } from 'react'

import { useDialog } from '@/components/ui/useDialog'
import { t } from '@/lib/i18n'
import type { FreeTimeAction, TimeAdvancePlan } from '@/lib/life/world/timeAdvance'
import { actionLineHe, type PlannerCopy } from '@/lib/life/world/timeAdvanceCopy'

/**
 * כרטיס הזמן — the planner (SMART FREE TIME §4 B, §5, §6, §28).
 *
 * Not a calendar and not a dashboard: a punched paper time card from the world of the
 * game. At its centre, the one thing a person actually wants to see — three points on a
 * line: now, when to leave, and the thing itself. Above it the WHY in one sentence (§23),
 * under it what fits in between (§17), and at the foot, pinned, the world-action: "להגיע
 * בזמן לאוסישקין", "לחכות בבית" — never "skip".
 *
 * Phone: a bottom sheet, at most ~76dvh, only the list scrolls, the CTA stays under the
 * thumb. Desktop: the same component as a ~380px card floating at the foot of the glass,
 * the world still visible around it. No slider, no drag required — the handle drag is a
 * shortcut for the close button beside it.
 */
export function FreeTimePlanner({
  plan,
  copy,
  notice,
  onClose,
  onAdvance,
  onAction,
}: {
  plan: TimeAdvancePlan
  copy: PlannerCopy
  /** "המצב השתנה…" when a tap met a stale plan (§19) */
  notice: string | null
  onClose: () => void
  onAdvance: (variant: 'plan' | 'early' | 'let-pass') => void
  onAction: (action: FreeTimeAction) => void
}) {
  const dialogRef = useDialog<HTMLDivElement>(onClose)
  const card = useRef<HTMLDivElement | null>(null)
  const [dy, setDy] = useState(0)
  const start = useRef<number | null>(null)

  // §7: up from below, ~220ms, ease-out — transform only, and nothing under reduced motion
  useEffect(() => {
    const node = card.current
    if (!node || typeof window === 'undefined' || !node.animate) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    node.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], { duration: 220, easing: 'cubic-bezier(.16,1,.3,1)' })
  }, [])

  const blocked = Boolean(copy.blockedHe) || (plan.lapse && plan.alreadyThere)
  const moving = copy.timeline.leave !== null
  // three points, not a scale (§38): the card is not a scheduling tool, and a leave point
  // drawn "to scale" sits on top of the event whenever the walk is short
  const leaveAt = moving ? 0.5 : null

  function down(event: React.PointerEvent) {
    if ((event.target as HTMLElement).closest('button')) return
    start.current = event.clientY
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }
  function move(event: React.PointerEvent) {
    if (start.current === null) return
    setDy(Math.max(0, event.clientY - start.current))
  }
  function up() {
    if (start.current === null) return
    start.current = null
    if (dy > 70) onClose()
    setDy(0)
  }

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={t('life90f.title')}
      data-life="free-time"
      className="absolute inset-0 z-[62] flex flex-col justify-end bg-ink/45 outline-none md:bg-ink/10"
      onClick={onClose}
    >
      <div
        ref={card}
        className="relative flex max-h-[76dvh] w-full flex-col border-t-rule border-ink bg-sheet text-ink md:mb-4 md:ms-4 md:max-h-[72dvh] md:w-[380px] md:border-rule"
        style={dy ? { transform: `translateY(${dy}px)` } : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        {/* the punched edge of a time card: a row of holes along the top, ink on paper */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-[6px] h-[4px]"
          style={{ backgroundImage: 'radial-gradient(circle, rgb(var(--ink)/.35) 1.4px, transparent 1.6px)', backgroundSize: '12px 4px' }}
        />
        <div className="shrink-0 cursor-grab touch-none select-none px-4 pb-1 pt-3" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p dir="ltr" className="text-end font-latin text-[9px] font-bold tracking-[0.2em] text-red">
                {t('life90f.latin')}
              </p>
              <p className="font-display text-step-1 leading-tight">{t('life90f.title')}</p>
            </div>
            <button type="button" onClick={onClose} className="min-h-tap shrink-0 px-2 font-body text-[12px] font-extrabold text-red" data-life="free-time-close">
              {t('stage.close')}
            </button>
          </div>
          <p className="mt-1 font-sign text-[14px] leading-snug" data-life="free-time-why">
            <bdi>{copy.whyHe}</bdi>
          </p>
          {copy.whereHe && <p className="font-body text-[12px] leading-snug text-muted">{copy.whereHe}</p>}
        </div>

        {/* ---- the timeline: the central element (§6) ---- */}
        <div className="shrink-0 px-5 pb-2 pt-3" data-life="free-time-line">
          <div className="relative h-[18px]">
            <span aria-hidden="true" className="absolute inset-x-0 top-[8px] block h-[2px] animate-rule-draw bg-ink motion-reduce:animate-none" style={{ transformOrigin: '100% 50%' }} />
            {/* now — a red stamp that lands */}
            <span aria-hidden="true" className="absolute top-[2px] block h-[14px] w-[14px] animate-land bg-red motion-reduce:animate-none" style={{ insetInlineStart: 0 }} />
            {leaveAt !== null && (
              <span aria-hidden="true" className="absolute top-[2px] block h-[14px] w-[14px] border-rule border-ink bg-sheet" style={{ insetInlineStart: `calc(${leaveAt * 100}% - 7px)` }} />
            )}
            {/* the event — navy, turned: the one diamond on the card */}
            <span aria-hidden="true" className="absolute top-[3px] block h-[12px] w-[12px] rotate-45 bg-sign" style={{ insetInlineEnd: 1 }} />
          </div>
          <div className="relative mt-1 flex justify-between font-mono text-[12px] tabular-nums">
            <span className="flex flex-col items-start">
              <span dir="ltr">{copy.timeline.now}</span>
              <span className="font-body text-[10px] text-muted">{t('life90f.now')}</span>
            </span>
            {copy.timeline.leave && (
              <span className="absolute flex translate-x-1/2 flex-col items-center" style={{ insetInlineStart: `${(leaveAt ?? 0.5) * 100}%` }}>
                <span dir="ltr" className="font-bold text-red">
                  {copy.timeline.leave}
                </span>
                <span className="font-body text-[10px] text-muted">{copy.timeline.leaveLabelHe}</span>
              </span>
            )}
            <span className="flex flex-col items-end">
              <span dir="ltr" className="font-bold text-sign">
                {copy.timeline.event}
              </span>
              <span className="max-w-[9rem] truncate font-body text-[10px] text-muted">
                <bdi>{copy.timeline.eventLabelHe}</bdi>
              </span>
            </span>
          </div>
          <p className="mt-2 font-body text-[13px] leading-snug" data-life="free-time-free">
            <bdi>{copy.freeHe}</bdi>
          </p>
          {copy.routeHe && <p className="font-body text-[12px] leading-snug text-muted">{copy.routeHe}</p>}
          {notice && (
            <p className="mt-1 border-s-rule border-red ps-2 font-sign text-[12px] leading-snug text-red" role="status">
              {notice}
            </p>
          )}
        </div>

        {/* ---- what fits (§17) — the only part that scrolls ---- */}
        {plan.optionalActions.length > 0 && (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t-hair border-ink/30 px-4 pb-2 pt-2">
            <p className="pb-1 font-sign text-[12px] text-muted">{t('life90f.options')}</p>
            <ul className="flex flex-col gap-1.5">
              {plan.optionalActions.map((action) => {
                const line = actionLineHe(action)
                const noFit = action.tier === 'no-fit'
                return (
                  <li key={action.id}>
                    <button
                      type="button"
                      onClick={() => onAction(action)}
                      data-life="free-time-action"
                      data-tier={action.tier}
                      className={`flex min-h-[52px] w-full items-center justify-between gap-3 border-hair px-3 py-2 text-start transition-colors duration-press active:bg-ink active:text-sheet motion-reduce:transition-none ${
                        noFit ? 'border-dashed border-sign' : 'border-ink'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-sign text-[14px] leading-tight">
                          <bdi>{action.titleHe}</bdi>
                        </span>
                        <span className={`block truncate font-body text-[11px] leading-snug ${noFit ? 'text-sign' : action.tier === 'tight' ? 'text-red' : 'text-muted'}`}>
                          <bdi>{[action.rewardHe, line.tierHe].filter(Boolean).join(' · ')}</bdi>
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-[12px] tabular-nums text-ink">{line.minutesHe}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* ---- the CTA, pinned (§28) ---- */}
        <div className="shrink-0 border-t-hair border-ink/30 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
          {!blocked && (
            <button
              type="button"
              onClick={() => onAdvance('plan')}
              data-life="free-time-go"
              className="flex min-h-[52px] w-full flex-col items-center justify-center bg-red px-3 py-1.5 text-sheet transition-colors duration-press active:bg-ink motion-reduce:transition-none"
            >
              <span className="font-sign text-[15px] leading-tight">
                <bdi>{copy.ctaHe}</bdi>
              </span>
              {copy.ctaSubHe && (
                <span className="font-body text-[11px] leading-tight opacity-90">
                  <bdi>{copy.ctaSubHe}</bdi>
                </span>
              )}
            </button>
          )}
          {blocked && copy.blockedHe && (
            <div className="flex min-h-[52px] w-full flex-col items-center justify-center border-rule border-dashed border-ink/50 px-3 py-1.5 text-center" data-life="free-time-blocked" aria-disabled="true">
              <span className="font-sign text-[14px] leading-tight text-muted">
                <bdi>
                  {copy.ctaHe} — {t('life90f.cta.unavailable')}
                </bdi>
              </span>
              <span className="font-body text-[11px] leading-snug text-ink">
                <bdi>{copy.blockedHe}</bdi>
              </span>
            </div>
          )}
          <div className="mt-1.5 flex gap-2">
            {copy.earlyHe && !blocked && (
              <button type="button" onClick={() => onAdvance('early')} data-life="free-time-early" className="min-h-tap flex-1 border-rule border-ink px-2 font-sign text-[13px] active:bg-ink active:text-sheet">
                <bdi>{copy.earlyHe}</bdi>
              </button>
            )}
            {copy.letPassHe && (
              <button
                type="button"
                onClick={() => onAdvance('let-pass')}
                data-life="free-time-let-pass"
                className="flex min-h-tap flex-1 flex-col items-center justify-center border-rule border-dashed border-sign px-2 py-1 text-sign active:bg-sign active:text-sheet"
              >
                <span className="font-sign text-[13px] leading-tight">{copy.letPassHe}</span>
                {copy.letPassSubHe && <span className="font-body text-[10px] leading-tight">{copy.letPassSubHe}</span>}
              </button>
            )}
            <button type="button" onClick={onClose} data-life="free-time-stay" className="min-h-tap flex-1 border-rule border-ink px-2 font-sign text-[13px] active:bg-ink active:text-sheet">
              {t('life90f.cta.free')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
