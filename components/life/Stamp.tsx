'use client'

import type { LifeBusEvents } from '@/lib/life/runtime/bus'
import { artUrl } from '@/lib/life/runtime/art'

type Toast = NonNullable<LifeBusEvents['toast']>

/**
 * חותמת — the thing that pops up while you play.
 *
 * Two shapes, one language. A plain sentence is a STRIP: a line of print on the sheet
 * (or on red, when the world wants you to look), pasted in from above and gone in two
 * and a half seconds. A sentence WITH a thing — a ticket handed over, a scarf put in
 * the box, three hundred agorot folded in four — is a TICKET: the object itself on a
 * cream plate with a perforated edge, a kicker over it in the sign face, and the
 * sentence under it. The object is drawn at the size a hand would hold it, tilted the
 * way a thing lands on a table, because a popup in this game is never a notification —
 * it is something arriving.
 *
 * No rounded corners, no shadows, tokens only (brand §7). The perforation is a dashed
 * hairline, which is what a perforation is.
 */
export function Stamp({ toast }: { toast: Toast }) {
  const red = toast.tone === 'red'
  if (!toast.art) {
    return (
      <div className="pointer-events-none absolute inset-x-0 top-[calc(104px+env(safe-area-inset-top))] z-30 flex justify-center px-gutter">
        <div
          className={`animate-ticket-in border-hair px-3.5 py-2 ${red ? 'border-red bg-red' : 'border-ink bg-sheet'}`}
          data-life="toast"
        >
          {toast.kickerHe && (
            <span className={`mb-1.5 block w-fit px-1.5 py-0.5 font-sign text-[10px] leading-none ${red ? 'bg-sheet text-red' : 'bg-red text-sheet'}`} data-life="toast-kicker">
              <bdi>{toast.kickerHe}</bdi>
            </span>
          )}
          <p className={`font-body text-[13px] leading-none ${red ? 'text-sheet' : 'text-ink'}`}>
            <bdi>{toast.text}</bdi>
          </p>
        </div>
      </div>
    )
  }
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[calc(96px+env(safe-area-inset-top))] z-30 flex justify-center px-gutter">
      <div className="animate-ticket-in flex items-stretch border-rule border-ink bg-sheet" data-life="toast">
        <div className="relative flex w-[72px] shrink-0 items-center justify-center border-e-hair border-dashed border-ink/50 bg-sheet p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={artUrl(toast.art)}
            alt=""
            aria-hidden="true"
            className="animate-land max-h-[56px] w-auto max-w-[56px] object-contain"
          />
        </div>
        <div className="flex flex-col justify-center gap-1 px-3 py-2">
          {toast.kickerHe && (
            <span className={`self-start px-1.5 py-0.5 font-sign text-[10px] leading-none ${red ? 'bg-red text-sheet' : 'bg-ink text-sheet'}`}>
              <bdi>{toast.kickerHe}</bdi>
            </span>
          )}
          <p className="font-body text-[13px] leading-snug text-ink">
            <bdi>{toast.text}</bdi>
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * כרטיס-מקום — the small plate that names a room the moment you step into it.
 * Sign face on ink, a red rule that draws itself, and gone before you have read it
 * twice. The HUD says where you are all day; this is the door closing behind you.
 */
export function PlaceCard({ titleHe, subHe }: { titleHe: string; subHe?: string | null }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[calc(140px+env(safe-area-inset-top))] z-30 flex justify-center px-gutter">
      <div className="animate-plate-in border-hair border-sheet/30 bg-ink/90 px-4 py-2.5 text-center" data-life="place-card">
        <p className="font-sign text-[15px] font-bold leading-none text-sheet">
          <bdi>{titleHe}</bdi>
        </p>
        <span className="mx-auto mt-2 block h-[2px] w-10 origin-center animate-rule-draw bg-red" aria-hidden="true" />
        {subHe && (
          <p className="mt-1.5 font-body text-[11px] leading-none text-sheet/70">
            <bdi>{subHe}</bdi>
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * כרטיס-כותרת — over black, the way a film names a year.
 * The title rises out of the ink; a red rule draws itself under it; the second line
 * arrives a beat later in the sign face. Nothing else on screen.
 */
export function TitleCard({ titleHe, subHe }: { titleHe: string; subHe: string | null }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center bg-ink px-gutter" data-life="title-card">
      <div className="animate-title-rise text-center">
        <p className="font-display text-[34px] font-black leading-none text-sheet">
          <bdi>{titleHe}</bdi>
        </p>
      </div>
      <span className="mt-4 block h-[3px] w-16 origin-center animate-rule-draw bg-red" aria-hidden="true" />
      {subHe && (
        <p className="mt-4 animate-title-sub font-sign text-[14px] leading-snug text-sheet/75">
          <bdi>{subHe}</bdi>
        </p>
      )}
    </div>
  )
}
