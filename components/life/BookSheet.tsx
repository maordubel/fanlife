'use client'

import { useEffect, useState } from 'react'

import { useDialog } from '@/components/ui/useDialog'
import { t } from '@/lib/i18n'
import type { BookDef } from '@/lib/life/books'
import { SourceNote } from '@/components/ui/SourceNote'

/**
 * לדפדף בחוברת — twenty-four pages of a thing that exists, held the way it is held.
 *
 * Maor scanned his father's championship booklet from 1980/81 — bought the year he was
 * born, kept for forty-five years, creased across the corner where somebody folded it back
 * on itself — and asked for it in the game as an object you can actually read, "styled to
 * feel like reading the original".
 *
 * So this is not a gallery and it is not a PDF viewer. It is a booklet: one page at a
 * time, filling the frame, on the ink ground so nothing on screen competes with the paper.
 * The START of the line turns back and the END of it turns forward — written as logical
 * properties, so the booklet reads the way a Hebrew booklet must and would flip
 * for a Latin-script locale without a second component. That is also why no
 * arrows are drawn on somebody's paper. Swipe works the same way. The counter is small, in the corner, in the typewriter
 * face the rest of the game uses for facts.
 *
 * The caption names the SOURCE and nothing else — the same rule `DocSheet` follows, and
 * the reason a primary document can be shown at all: the game may hold up evidence and say
 * where it came from; the moment it prints an interpretation over the top it has started
 * making a claim (rule 11).
 *
 * Reading is remembered: the page you were on is where it opens next time, because
 * somebody who put a booklet down halfway through does not start again at the cover.
 */
export function BookSheet({
  book,
  page,
  onPage,
  onClose,
}: {
  book: BookDef
  page: number
  onPage: (page: number) => void
  onClose: () => void
}) {
  const [touchX, setTouchX] = useState<number | null>(null)
  const last = book.pages - 1
  const at = Math.min(Math.max(page, 0), last)

  const turn = (by: number) => {
    const next = at + by
    if (next < 0 || next > last) return
    onPage(next)
  }

  // the page-turn keys stay their own listener — ArrowLeft/ArrowRight are not something
  // `useDialog` knows about. Escape is folded onto the hook below instead of kept here,
  // so this sheet gets the same focus-in/Tab-trap/focus-restore every other dialog has.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') turn(1)
      if (event.key === 'ArrowRight') turn(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at, last])

  const dialogRef = useDialog<HTMLDivElement>(onClose)

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label={book.titleHe}
      className="pointer-events-auto absolute inset-0 z-[60] flex flex-col items-center justify-center bg-ink/95 outline-none"
      data-life="book"
      data-book={book.id}
      data-page={String(at + 1)}
      onTouchStart={(e) => setTouchX(e.touches[0]?.clientX ?? null)}
      onTouchEnd={(e) => {
        const start = touchX
        const end = e.changedTouches[0]?.clientX ?? null
        setTouchX(null)
        if (start === null || end === null) return
        const dx = end - start
        if (Math.abs(dx) < 40) return
        // dragging leftwards pulls the next page in, as it does on paper
        turn(dx < 0 ? 1 : -1)
      }}
    >
      <div className="flex w-full items-center justify-between px-4 pt-3">
        <span className="font-mono text-[11px] tabular-nums text-concrete">
          {at + 1} / {book.pages}
        </span>
        <button
          type="button"
          onClick={onClose}
          data-life="book-close"
          className="min-h-tap px-3 font-display text-[13px] uppercase tracking-[0.18em] text-sheet"
        >
          {t('life.finale.close')}
        </button>
      </div>

      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center px-3 py-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${book.root}/${book.file(at)}`}
          alt={`${book.titleHe} — ${at + 1}`}
          className="max-h-full max-w-full object-contain shadow-lamp"
        />
        {/* the two halves that turn the page: no arrows drawn over somebody's paper */}
        <button
          type="button"
          aria-label={t('life.book.back')}
          onClick={() => turn(-1)}
          className="absolute inset-y-0 start-0 w-1/3 cursor-pointer opacity-0"
        />
        <button
          type="button"
          aria-label={t('life.book.next')}
          onClick={() => turn(1)}
          className="absolute inset-y-0 end-0 w-1/3 cursor-pointer opacity-0"
        />
      </div>

      {/* whose copy was scanned is on /credits (spec §0.3, 22.9.2026) */}
      <p className="px-5 pb-[max(14px,env(safe-area-inset-bottom))] pt-1 text-center">
        <SourceNote newTab tone="dark" group="assets" />
      </p>
    </div>
  )
}
