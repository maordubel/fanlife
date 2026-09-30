'use client'

import { useRef, useState, type ReactNode } from 'react'

import { useDialog } from '@/components/ui/useDialog'
import { t } from '@/lib/i18n'

/**
 * חלון סלייד — the one bottom sheet every gate uses on a phone (delta 87).
 *
 * Maor, 23.9.2026: no page scroll where it can be avoided, slide windows wherever
 * possible. So what used to be stacked under the field — the rules, the bench, the
 * shortlist, the share row, the report link — slides up over it instead, and slides
 * back down with a flick of the handle.
 *
 * One element carries the backdrop, the fixed position AND `role="dialog"` at z-[60]
 * (rule 33, `tests/guards.test.ts`). Inside, the sheet may scroll — a sheet is a
 * drawer, the page under it still does not move.
 */
export function SlideSheet({
  open,
  onClose,
  title,
  latin,
  children,
  size = 'auto',
  footer,
  tone = 'sheet',
}: {
  open: boolean
  onClose: () => void
  title: string
  latin?: string
  children: ReactNode
  /** auto — as tall as the content (max 88dvh); half — 56dvh; full — 92dvh */
  size?: 'auto' | 'half' | 'full'
  /** pinned under the scrolling body — the sheet's one action */
  footer?: ReactNode
  tone?: 'sheet' | 'ink'
}) {
  if (!open) return null
  return (
    <SheetBody onClose={onClose} title={title} latin={latin} size={size} footer={footer} tone={tone}>
      {children}
    </SheetBody>
  )
}

function SheetBody({
  onClose,
  title,
  latin,
  children,
  size,
  footer,
  tone,
}: {
  onClose: () => void
  title: string
  latin?: string
  children: ReactNode
  size: 'auto' | 'half' | 'full'
  footer?: ReactNode
  tone: 'sheet' | 'ink'
}) {
  const ref = useDialog<HTMLDivElement>(onClose)
  const [dy, setDy] = useState(0)
  const start = useRef<number | null>(null)

  const height = size === 'full' ? 'h-[92dvh]' : size === 'half' ? 'h-[56dvh]' : 'max-h-[88dvh]'
  const night = tone === 'ink'

  function down(event: React.PointerEvent) {
    // a press on the close button (or any control in the header) is a click, not a drag —
    // capturing the pointer here swallowed the mouse click on "סגור" (delta 88)
    if ((event.target as HTMLElement).closest('button, a, input')) return
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
    if (dy > 80) onClose()
    setDy(0)
  }

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[60] flex flex-col justify-end bg-ink/70 outline-none"
      onClick={onClose}
    >
      <div
        className={`${height} flex w-full animate-fx-sheet-up flex-col border-t-rule ${
          night ? 'border-red bg-ink text-paper' : 'border-ink bg-sheet text-ink'
        } sm:mx-auto sm:max-w-[480px] sm:border-x-rule`}
        style={dy ? { transform: `translateY(${dy}px)`, transition: 'none' } : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="shrink-0 cursor-grab touch-none select-none px-4 pb-2 pt-2"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        >
          <span aria-hidden="true" className={`mx-auto block h-[5px] w-12 ${night ? 'bg-concrete/60' : 'bg-ink/35'}`} />
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              {latin && (
                <p dir="ltr" className="text-end font-latin text-[9px] font-bold tracking-[0.2em] text-red">
                  {latin}
                </p>
              )}
              <p className={`font-display text-step-1 leading-tight ${night ? 'text-paper' : 'text-ink'}`}>{title}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="min-h-tap shrink-0 px-2 font-body text-[12px] font-extrabold text-red"
            >
              {t('stage.close')}
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3">{children}</div>
        {footer && (
          <div
            className={`shrink-0 border-t-hair px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 ${
              night ? 'border-concrete/30' : 'border-ink/30'
            }`}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
