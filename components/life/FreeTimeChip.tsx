'use client'

import { t } from '@/lib/i18n'

/**
 * ◷ זמן פנוי · 43 דק׳ — the invitation, not the interruption (SMART FREE TIME §4 A, §30).
 *
 * The world knows at once that the day is waiting on the clock; the player is told only
 * after a few quiet seconds, and only by this: a small card-stock tab at the foot of the
 * glass, in the place the old "ממתין" cloth sat, so it says the same thing the cloth said —
 * nothing is broken — and adds "and here is what you can do about it". It does not blink,
 * it does not cover the room, and it goes away the moment the window does. A tap opens
 * the planner. The target is the full 48px the brand asks for even where the plate is
 * smaller.
 */
export function FreeTimeChip({ label, late, onOpen }: { label: string; late: boolean; onOpen: () => void }) {
  return (
    <div
      className="pointer-events-none absolute inset-x-2.5 z-30 flex justify-center"
      style={{ bottom: 'calc(132px + env(safe-area-inset-bottom))' }}
    >
      <button
        type="button"
        onClick={onOpen}
        data-life="free-time-chip"
        aria-label={`${label} — ${t('life90f.chip.aria')}`}
        className="group pointer-events-auto flex min-h-tap items-center"
      >
        <span
          className={`relative flex items-center gap-2 border-rule px-3 py-1.5 transition-colors duration-press motion-reduce:transition-none ${
            late ? 'border-ink bg-red text-sheet' : 'border-ink bg-sheet text-ink group-active:bg-red group-active:text-sheet'
          }`}
        >
          <span aria-hidden="true" className="pointer-events-none absolute inset-[2px] border-hair border-current opacity-30" />
          {/* the punched corner of a time card — a red tick, never a spinner */}
          <span aria-hidden="true" className={`relative font-mono text-[14px] leading-none tabular-nums ${late ? 'text-sheet' : 'text-red'}`}>
            ◷
          </span>
          <span className="relative font-sign text-[13px] leading-none">
            <bdi>{label}</bdi>
          </span>
        </span>
      </button>
    </div>
  )
}
