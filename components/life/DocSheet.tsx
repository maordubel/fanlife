'use client'

import { useDialog } from '@/components/ui/useDialog'
import { artUrl } from '@/lib/life/runtime/art'
import { t } from '@/lib/i18n'

/**
 * להחזיק נייר — the one screen that shows something nobody on this project drew.
 *
 * A ticket kept for forty years; a page of מעריב ספורט printed the morning before the
 * match. They are held up over the world at the size of the thing itself, on the ink
 * ground so nothing competes with them, and put down with a press anywhere.
 *
 * The caption underneath names the SOURCE, never the meaning. A game may show a player a
 * primary document and it may tell them where it came from; the moment it starts printing
 * a gloss across the top of one it has stopped showing evidence and started making a
 * claim, and rule 11 is exactly the line between those two things.
 */
export function DocSheet({
  art,
  captionHe,
  onClose,
}: {
  art: string
  captionHe: string | null
  onClose: () => void
}) {
  // Escape closes it too. A screen with exactly one way out is a screen somebody will get
  // stuck on — the robot that plays every chapter did, for two hundred moves, on 6.9.2026.
  // `useDialog` is what listens now: the same hook every other sheet in the game uses, so
  // this one also gets its focus moved in on open and given back to the caller on close —
  // the button is already a native focus target, so nothing extra is needed for that half.
  const dialogRef = useDialog<HTMLButtonElement>(onClose)

  return (
    <button
      ref={dialogRef}
      type="button"
      role="dialog"
      aria-modal="true"
      aria-label={captionHe ?? t('life.doc.title')}
      onClick={onClose}
      className="pointer-events-auto absolute inset-0 z-[60] flex min-h-tap flex-col items-center justify-center gap-3 bg-ink/95 p-3 outline-none"
      data-life="doc"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={artUrl(art)} alt={captionHe ?? ''} className="max-h-[82%] max-w-full object-contain" />
      {captionHe && (
        <span className="max-w-prose text-center font-body text-[11px] leading-snug text-concrete">
          <bdi>{captionHe}</bdi>
        </span>
      )}
    </button>
  )
}
