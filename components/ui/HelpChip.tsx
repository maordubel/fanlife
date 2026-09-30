'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'

import { BuiltByDubel } from '@/components/ui/BuiltByDubel'
import { useDialog } from '@/components/ui/useDialog'
import { CREDITS_PATH } from '@/lib/credits/groups'
import { helpForRoute } from '@/lib/help'
import { t } from '@/lib/i18n'

/**
 * ה"?" — one small square on every gate that says what the gate is before you walk
 * through it.
 *
 * `Screen.tsx` renders this unconditionally; it decides for itself whether it has
 * anything to say. `helpForRoute` looks the current path up in `lib/gates.ts` (the same
 * map the wall itself hangs on) and returns nothing for a route with no gate — the
 * ground, Ussishkin, the black file — so those screens render no chip at all rather
 * than an empty one.
 *
 * **It only ever appears on `chrome={true}` screens, by construction: `Screen` places
 * it right after the sign plate, and that whole block is skipped when `chrome` is
 * false.** That is a deliberate choice, not an oversight — the same one rule 28 already
 * makes for the ad slot and the footer:
 *
 *   · On the five gates that are genuinely a RUN in rule 21's sense — trivia, goal,
 *     the kit game, derby, timeline — `chrome` goes false the instant there is a round
 *     to play, and it is exactly there that "the glass belongs to the run" matters
 *     most: those screens already carry a full HUD (a clock, lives, a combo, a swipe
 *     card), and a floating help button is one more thing fighting a thumb that is
 *     mid-tap. Four of those five already print a one-line rule inline where the round
 *     itself begins (`hate.lede`, `kitgame.rule`, `goal.instruction`) — a sentence, not
 *     a sheet, which is the right size for a screen with no room to spare.
 *   · On the gates that stay `chrome={true}` throughout — the all-time XI, the lineup
 *     board, the kit designer and collection, memory, the ballot, the member book — a
 *     player can leave and come back mid-round with nothing lost, so a sheet that opens
 *     without disturbing the board underneath costs nothing and answers exactly the
 *     question a first-time visitor has standing at the door.
 *   · The trivia WING (`/trivia`) is where this shows up for trivia at all: it is the
 *     one page in that gate that is a genuine "before" — nobody has started a round yet
 *     — so it is where the run's own rules (stages, lives, the clock) get explained.
 */
export function HelpChip({ compact = false }: { compact?: boolean } = {}) {
  const pathname = usePathname()
  const found = helpForRoute(pathname ?? '')
  const [open, setOpen] = useState(false)
  const dialogRef = useDialog<HTMLDivElement>(() => setOpen(false))

  if (!found) return null
  const { gate, help } = found
  const gateLabel = `${t('gate.aria')} ${gate.number} — ${t(gate.title)}`

  return (
    <>
      <div className={compact ? 'flex shrink-0' : 'mt-2 flex justify-end'}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-label={t('help.chip.aria', { gate: gateLabel })}
          className={`flex items-center justify-center border-rule border-ink bg-sheet font-poster leading-none text-ink transition-transform duration-press ease-stamp active:scale-[.92] motion-reduce:transition-none ${
            compact ? 'h-11 w-11 text-[17px]' : 'min-h-tap min-w-tap text-[19px]'
          }`}
        >
          ?
        </button>
      </div>

      {/* One element carries the backdrop, the fixed position AND `role="dialog"` —
          same shape as `RosterSheet` and the kit game's `Reveal` — because the z-[60]
          guard (rule 33, `tests/guards.test.ts`) reads the class list off the exact tag
          that declares the role, not off an ancestor. */}
      {open && (
        <div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label={gateLabel}
          className="fixed inset-0 z-[60] flex flex-col justify-end bg-ink/70 outline-none"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="max-h-[80vh] w-full animate-sheet-in overflow-y-auto border-t-rule border-ink bg-sheet sm:mx-auto sm:max-w-[420px] sm:border-x-rule"
          >
            <div className="sticky top-0 z-10 flex items-baseline justify-between gap-3 border-b-hair border-ink bg-sheet px-4 pb-2 pt-3">
              <p className="font-display text-step-1 leading-tight text-ink">
                <bdi>{gateLabel}</bdi>
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-tap shrink-0 px-2 font-body text-[12px] font-extrabold text-red"
              >
                {t('help.close')}
              </button>
            </div>

            <div className="flex flex-col gap-4 px-4 py-3 pb-3">
              <HelpRow label={t('help.section.what')} text={t(help.whatKey)} />
              <HelpRow label={t('help.section.score')} text={t(help.scoreKey)} />
              <HelpRow label={t('help.section.time')} text={t(help.timeKey)} />
            </div>
            {/* On the phone stage the colophon is not under the field (delta 87), so the
                build credit travels with the one sheet every gate has. */}
            <div className="flex items-center justify-between gap-3 bg-ink px-4 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 md:hidden">
              <Link href={CREDITS_PATH} prefetch={false} className="min-h-tap inline-flex items-center font-body text-[11px] font-bold text-paper underline decoration-red decoration-2 underline-offset-4">
                {t('footer.credits')}
              </Link>
              <BuiltByDubel />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function HelpRow({ label, text }: { label: string; text: string }) {
  return (
    <div className="border-s-rule border-red ps-3">
      <p className="font-body text-[10px] font-extrabold tracking-widest text-red">{label}</p>
      <p className="mt-1 font-body text-[14px] leading-relaxed text-ink">
        <bdi>{text}</bdi>
      </p>
    </div>
  )
}
