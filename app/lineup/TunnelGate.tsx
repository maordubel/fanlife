'use client'

import { t } from '@/lib/i18n'
import { useDialog } from '@/components/ui/useDialog'

/**
 * המנהרה — the last thing between a team sheet and the referee's hand.
 *
 * It is a decision moment, not a confirmation dialog. The difference is what the second
 * button does: "החלפה אחרונה" is not "cancel", it is the manager walking back into the
 * room for the one name that has been bothering him, and the board says so when it
 * reopens. Nothing is locked behind it — the eleven can still be rearranged freely —
 * because a mechanic that traps a player into a sheet he has already decided is wrong
 * would be charging him for a moment that is supposed to be his.
 *
 * `role="dialog"` at `z-[60]`, over the tab bar's `z-50` (rule 33), and wired to
 * `useDialog` so Escape closes it, Tab cannot leave it, and focus comes back to the
 * button that opened it.
 */
export function TunnelGate({
  onSend,
  onLastSwitch,
  pending,
}: {
  onSend: () => void
  onLastSwitch: () => void
  pending: boolean
}) {
  const dialogRef = useDialog<HTMLDivElement>(onLastSwitch)
  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-[60] flex flex-col justify-end bg-ink/70 outline-none"
      role="dialog"
      aria-modal="true"
      aria-label={t('lineup.tunnel.title')}
    >
      <div className="animate-sheet-in border-t-rule border-ink bg-sheet">
        {/* the mouth of the tunnel: ink, and the light at the end of it is the pitch */}
        <div className="bg-ink px-4 py-5">
          <p className="font-body text-[10px] font-extrabold tracking-widest text-concrete">
            {t('lineup.room.eyebrow')}
          </p>
          <p className="mt-1 font-display text-step-2 leading-tight text-paper">
            {t('lineup.tunnel.title')}
          </p>
        </div>
        <p className="px-4 pt-3 font-body text-step--1 leading-relaxed text-muted">
          {t('lineup.tunnel.body')}
        </p>
        <div className="grid gap-2 p-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={onSend}
            disabled={pending}
            className="flex min-h-tap items-center justify-center bg-red px-4 font-body text-step-0 font-extrabold text-paper transition-transform duration-press ease-stamp active:scale-[.96] disabled:opacity-40 motion-reduce:transition-none"
          >
            {pending ? t('state.loading') : t('lineup.tunnel.go')}
          </button>
          <button
            type="button"
            onClick={onLastSwitch}
            className="flex min-h-tap items-center justify-center border-rule border-ink bg-sheet px-4 font-body text-step-0 font-extrabold text-ink transition-transform duration-press ease-stamp active:scale-[.96] motion-reduce:transition-none"
          >
            {t('lineup.tunnel.back')}
          </button>
        </div>
      </div>
    </div>
  )
}
