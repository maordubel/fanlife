'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { SheetHead } from '@/components/life/Plate'
import { useDialog } from '@/components/ui/useDialog'
import { t } from '@/lib/i18n'
import { createArmGate, installPointerWatch, isPointerDown, onPointerChange } from '@/lib/life/inputArm'
import type { NoteBoardView } from '@/lib/life/noteBoards'

/**
 * הפתק — the scraps and the pencil columns (`lib/life/noteBoards.ts`).
 *
 * One scrap at a time on top of the pile, the columns under it. The hand does one of two
 * things, and both are the same act: tap a column and the scrap goes there, or pick the
 * scrap up and drop it on one. A scrap already in a column can be taken back with a tap —
 * a boy changes his mind about what he knows, and the screen lets him until he folds the
 * note. There is no "correct" sound and nothing is red while he sorts: the pencil marks,
 * where a board has any, appear only on the folded note, after he has decided.
 *
 * The columns arm like every ballot in the game (`lib/life/inputArm.ts`): the tap that
 * opened the sheet never lands a scrap.
 */

function useArmed(key: string): boolean {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    installPointerWatch()
    const gate = createArmGate()
    if (isPointerDown()) gate.pointerDown()
    gate.reveal()
    setArmed(false)
    let raf = 0
    const tick = () => {
      gate.frame()
      if (gate.armed) setArmed(true)
      else raf = requestAnimationFrame(tick)
    }
    const off = onPointerChange((down) => (down ? gate.pointerDown() : gate.pointerUp()))
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      off()
    }
  }, [key])
  return armed
}

type Verdict = { verdictHe: string } | null

export function NoteBoardSheet({
  board,
  settle,
  onDone,
}: {
  board: NoteBoardView
  /** what the note says once folded — asked of the life, never computed here */
  settle: (placed: Record<string, string>) => string
  onDone: (placed: Record<string, string>) => void
}) {
  const [placed, setPlaced] = useState<Record<string, string>>({})
  const [verdict, setVerdict] = useState<Verdict>(null)
  const [left, setLeft] = useState<number | null>(board.seconds)
  const [drag, setDrag] = useState<{ x: number; y: number; over: string | null } | null>(null)
  const armed = useArmed(board.id)
  const scrapRef = useRef<HTMLDivElement>(null)
  const start = useRef<{ x: number; y: number } | null>(null)

  const pile = useMemo(() => board.cards.filter((card) => !placed[card.id]), [board.cards, placed])
  const current = pile[0] ?? null

  const fold = (from: Record<string, string>) => {
    if (verdict) return
    setVerdict({ verdictHe: settle(from) })
  }

  // ✕ and Escape: whatever is on the note is what he walks away with (fail-forward, §0.4)
  const dialogRef = useDialog<HTMLDivElement>(() => (verdict ? onDone(placed) : fold(placed)))

  // the visible clock — the brief keeps pressure off unless the chapter earns it, and a board
  // that earns it says so on a bar, not in a sentence
  useEffect(() => {
    if (left === null || verdict) return
    if (left <= 0) {
      fold(placed)
      return
    }
    const id = setTimeout(() => setLeft((s) => (s === null ? null : s - 1)), 1000)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, verdict])

  // the last scrap placed folds the note by itself — nothing to press after the last decision
  useEffect(() => {
    if (!verdict && board.cards.length > 0 && pile.length === 0) {
      const id = setTimeout(() => fold(placed), 450)
      return () => clearTimeout(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pile.length, verdict])

  const place = (column: string) => {
    if (!armed || !current || verdict) return
    setPlaced((prev) => ({ ...prev, [current.id]: column }))
  }
  const takeBack = (card: string) => {
    if (verdict) return
    setPlaced((prev) => {
      const next = { ...prev }
      delete next[card]
      return next
    })
  }

  const columnAt = (x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y)?.closest('[data-col]')
    return el?.getAttribute('data-col') ?? null
  }

  const columnOf = (id: string) => board.columns.find((column) => column.id === id)

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={board.titleHe}
      dir="rtl"
      className="pointer-events-auto absolute inset-0 z-[95] flex flex-col bg-paper text-ink"
      data-life="board"
      data-board={board.id}
      data-armed={armed ? 'true' : 'false'}
    >
      <SheetHead title={board.titleHe} kicker={board.kickerHe} closeLabel={t('lifeB28.board.close')} onClose={() => (verdict ? onDone(placed) : fold(placed))} />

      {left !== null && !verdict && board.seconds ? (
        <div className="h-1.5 w-full bg-concrete/30" aria-hidden="true">
          <div className="h-full bg-red transition-[width] duration-1000 ease-linear motion-reduce:transition-none" style={{ width: `${Math.max(0, (left / board.seconds) * 100)}%` }} />
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4 pt-3">
        <p className="font-body text-[13px] leading-snug text-muted">{board.introHe}</p>

        {!verdict && (
          <div className="relative flex min-h-[132px] items-center justify-center">
            {current ? (
              <div
                ref={scrapRef}
                role="group"
                aria-label={t('lifeB28.board.scrap')}
                data-life="board-scrap"
                data-card={current.id}
                onPointerDown={(e) => {
                  if (!armed) return
                  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
                  start.current = { x: e.clientX, y: e.clientY }
                }}
                onPointerMove={(e) => {
                  const from = start.current
                  if (!from) return
                  // a tap is not a drag: the scrap lifts only once the finger has travelled
                  if (!drag && Math.hypot(e.clientX - from.x, e.clientY - from.y) < 10) return
                  setDrag({ x: e.clientX, y: e.clientY, over: columnAt(e.clientX, e.clientY) })
                }}
                onPointerUp={(e) => {
                  start.current = null
                  if (!drag) return
                  const over = columnAt(e.clientX, e.clientY)
                  setDrag(null)
                  if (over) place(over)
                }}
                onPointerCancel={() => {
                  start.current = null
                  setDrag(null)
                }}
                // the lifted scrap rides ABOVE the finger, so what is under the finger is the column
                style={drag ? { position: 'fixed', left: drag.x - 130, top: drag.y - 124, width: 260, zIndex: 5 } : undefined}
                className={`w-full max-w-[320px] -rotate-1 touch-none select-none border-hair border-ink/30 bg-sheet px-4 pb-3 pt-3 ${drag ? 'rotate-2 opacity-90' : ''}`}
              >
                <p className="font-sign text-[17px] leading-snug text-ink">
                  <bdi>{current.textHe}</bdi>
                </p>
                <p className="mt-2 font-body text-[12px] leading-none text-sign">— <bdi>{current.whoHe}</bdi></p>
                <p className="mt-2 font-mono text-[10px] tabular-nums text-concrete">{t('lifeB28.board.left', { n: String(pile.length) })}</p>
              </div>
            ) : (
              <p className="font-body text-[13px] text-concrete">{t('lifeB28.board.empty')}</p>
            )}
          </div>
        )}

        {verdict && (
          <div className="border-rule border-ink bg-sheet px-4 py-3" data-life="board-verdict">
            <p className="font-sign text-[16px] leading-snug text-ink">{verdict.verdictHe}</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {board.columns.map((column) => {
            const here = board.cards.filter((card) => placed[card.id] === column.id)
            const hot = drag?.over === column.id
            return (
              <div key={column.id} className="relative">
                <button
                  type="button"
                  data-col={column.id}
                  data-life="board-col"
                  disabled={Boolean(verdict) || !current}
                  aria-disabled={!armed}
                  onClick={() => place(column.id)}
                  className={`flex min-h-[64px] w-full flex-col items-start justify-center border-rule px-3 py-2 text-start transition-colors duration-press motion-reduce:transition-none ${
                    hot ? 'border-red bg-red text-sheet' : 'border-ink bg-sheet text-ink active:bg-red active:text-sheet'
                  } disabled:active:bg-sheet disabled:active:text-ink`}
                >
                  <span className="font-display text-[17px] leading-none">{column.labelHe}</span>
                  {column.subHe && <span className={`mt-1 font-body text-[11px] leading-none ${hot ? 'text-sheet' : 'text-muted'}`}>{column.subHe}</span>}
                </button>
                {here.length > 0 && (
                  <ul className="mt-1 flex flex-wrap gap-1.5 ps-2">
                    {here.map((card) => {
                      const wrong = verdict && board.graded && card.fits !== null && card.fits !== column.id
                      const right = verdict && board.graded && card.fits === column.id
                      return (
                        <li key={card.id}>
                          <button
                            type="button"
                            onClick={() => takeBack(card.id)}
                            disabled={Boolean(verdict)}
                            data-life="board-placed"
                            aria-label={t('lifeB28.board.takeBack')}
                            className={`min-h-tap max-w-[260px] border-hair border-ink/40 bg-sheet px-2 py-1 text-start font-body text-[11px] leading-snug ${wrong ? 'text-muted line-through decoration-red decoration-2' : 'text-ink'}`}
                          >
                            <bdi>{card.textHe}</bdi>
                            {right && <span className="ms-1 font-mono text-sign">✓</span>}
                            {wrong && card.fits && (
                              <span className="ms-1 block font-sign text-[11px] not-italic text-red no-underline" style={{ textDecoration: 'none' }}>
                                {t('lifeB28.board.belongs', { col: columnOf(card.fits)?.labelHe ?? '' })}
                              </span>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </div>

        {!verdict && Object.keys(placed).length > 0 && pile.length > 0 && (
          <button type="button" onClick={() => fold(placed)} className="min-h-tap self-start px-1 font-body text-[13px] text-concrete underline underline-offset-4">
            {t('lifeB28.board.enough')}
          </button>
        )}

        {verdict && (
          <button
            type="button"
            onClick={() => onDone(placed)}
            data-life="board-done"
            className="min-h-tap mt-1 border-rule border-ink bg-red px-4 py-3 font-display text-[16px] leading-none text-sheet transition-transform duration-press ease-stamp active:scale-[.98] motion-reduce:transition-none"
          >
            {t('lifeB28.board.fold')}
          </button>
        )}
      </div>
    </div>
  )
}
