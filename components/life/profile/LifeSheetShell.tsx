'use client'

import { Component, useRef, type ReactNode } from 'react'

import { t } from '@/lib/i18n'
import { useDialog } from '@/components/ui/useDialog'

import css from './personal.module.css'

/**
 * הקליפה של התיק ושל "אני" — one dossier, two halves (delta 90-H, spec §55).
 *
 * Full-screen over the stopped world, never a small box in the middle of it (§4). It owns
 * exactly what every page of the dossier shares: the dialog contract (`useDialog` — focus
 * in, Tab trapped, Escape answers), the red spine across the top that stays put while the
 * pages under it change (§39), the header (title, the one quiet sentence, a way back when
 * you are inside a page, the other half of the dossier, and "לסגור"), the safe areas, and
 * the swipe between the two halves on a phone.
 *
 * **Escape and back are one gesture.** Inside a page it goes back to the overview; on the
 * overview it closes the dossier — "לא לסגור הכול בבת אחת" (§67). The caller decides by
 * what it passes as `onBack`.
 *
 * **"לסגור" is a literal, load-bearing label.** The LIFE browser harness
 * (`scripts/life/playthrough.mjs`, `closeCards`) closes the sheet the bedroom bag opens by
 * a `[role="dialog"] button` with exactly that text. It is the same key the old card used.
 */
export function LifeSheetShell({
  title,
  subtitle,
  label,
  onClose,
  onBack,
  backHe,
  other,
  turn,
  onSwipe,
  children,
  wide = false,
  dataLife,
}: {
  title: string
  subtitle?: string | null
  /** the dialog's accessible name */
  label: string
  onClose: () => void
  /** inside a page: back to the overview. Absent on the overview. */
  onBack?: (() => void) | null
  /** the name of where back goes — `‹ אני` */
  backHe?: string | null
  /** the other half of the dossier: its name and how to get there */
  other?: { labelHe: string; onGo: () => void; dataLife: string } | null
  /** which way the page arrived — the turn animation's direction */
  turn?: 'next' | 'back' | null
  /** a horizontal swipe on the overview: 'next' (finger moves toward the end) or 'back' */
  onSwipe?: ((dir: 'next' | 'back') => void) | null
  children: ReactNode
  /** the bag's collage may be a little wider on a desktop than the identity column (§42) */
  wide?: boolean
  dataLife: string
}) {
  const dialogRef = useDialog<HTMLDivElement>(() => (onBack ? onBack() : onClose()))
  const start = useRef<{ x: number; y: number; id: number } | null>(null)

  const onPointerDown = (event: React.PointerEvent) => {
    if (!onSwipe || event.pointerType === 'mouse') return
    // a rail that scrolls sideways owns its own gesture
    if ((event.target as HTMLElement).closest('[data-own-swipe]')) return
    start.current = { x: event.clientX, y: event.clientY, id: event.pointerId }
  }
  const onPointerUp = (event: React.PointerEvent) => {
    const from = start.current
    start.current = null
    if (!from || !onSwipe || from.id !== event.pointerId) return
    const dx = event.clientX - from.x
    const dy = event.clientY - from.y
    if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.6) return
    // RTL: the next half lies to the left, so a finger travelling left turns to it
    onSwipe(dx < 0 ? 'next' : 'back')
  }

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      dir="rtl"
      data-life={dataLife}
      className={`${css.root} pointer-events-auto absolute inset-0 z-[60] flex flex-col bg-ink outline-none`}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (start.current = null)}
    >
      {/* the spine — one red rule across the dossier, the same on both halves */}
      <div aria-hidden="true" className={`${css.spine} h-[6px] w-full shrink-0 bg-red`} style={{ marginTop: 'env(safe-area-inset-top)' }} />
      <div className={`mx-auto flex min-h-0 w-full flex-1 flex-col ${wide ? 'md:max-w-[1000px]' : 'md:max-w-[880px]'}`}>
        <header className="flex shrink-0 items-start gap-2 px-4 pb-2 pt-2.5 md:px-6 md:pt-5">
          <div className="min-w-0 flex-1">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                data-life="sheet-back"
                className="-ms-2 flex min-h-tap items-center gap-1 px-2 font-mono tabular-nums text-[11px] uppercase tracking-[0.14em] text-concrete transition-colors duration-press active:text-red motion-reduce:transition-none"
              >
                <span aria-hidden="true" className="text-[15px] leading-none">›</span>
                <bdi>{backHe}</bdi>
              </button>
            ) : null}
            <h2 className={`font-display leading-none text-sheet ${onBack ? 'text-[22px]' : 'text-[26px] md:text-[34px]'}`}>
              <bdi>{title}</bdi>
            </h2>
            {subtitle ? (
              <p className="mt-1.5 font-body text-[12px] leading-snug text-concrete md:text-[13px]">
                <bdi>{subtitle}</bdi>
              </p>
            ) : null}
          </div>
          {other && !onBack ? (
            <button
              type="button"
              onClick={other.onGo}
              data-life={other.dataLife}
              className="group flex min-h-tap shrink-0 items-center"
            >
              <span className="flex h-[34px] items-center gap-1.5 border-hair border-concrete/40 px-2.5 font-sign text-[12px] leading-none text-sheet transition-colors duration-press group-active:border-red group-active:bg-red motion-reduce:transition-none">
                <bdi>{other.labelHe}</bdi>
                <span aria-hidden="true" className="text-red group-active:text-sheet">‹</span>
              </span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            data-life="sheet-close"
            className="group flex min-h-tap shrink-0 items-center"
          >
            <span className="flex h-[34px] items-center border-hair border-concrete/50 px-3 font-body text-[11px] text-sheet transition-colors duration-press group-active:bg-red motion-reduce:transition-none">
              {t('life.profile.close')}
            </span>
          </button>
        </header>
        <div
          key={`${title}:${turn ?? ''}`}
          className={`flex min-h-0 flex-1 flex-col ${turn === 'next' ? css.turnNext : turn === 'back' ? css.turnBack : css.sheetIn}`}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * "החלק הזה בתיק לא נפתח כרגע." (§62) — one broken reading must not take the whole
 * dossier down with it. Logs in development only.
 */
export class SectionBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    if (process.env.NODE_ENV !== 'production') console.warn('[life/personal] a section failed to open', error)
  }
  render() {
    if (this.state.failed) {
      return (
        <p className="px-4 py-6 font-body text-[13px] leading-relaxed text-concrete">
          <bdi>{t('life90h.fallback')}</bdi>
        </p>
      )
    }
    return this.props.children
  }
}
