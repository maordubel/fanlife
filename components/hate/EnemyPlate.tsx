'use client'

import type { Enemy } from '@/lib/game/hate-run'
import { t, type MessageKey } from '@/lib/i18n'

/**
 * שטר האויב — one enemy, printed as a wanted bill.
 *
 * The bill is the whole game. A name in a list is an administrative record; a name
 * screen-printed at 40px over a halftone with the charge under it and a fact stamped
 * across the foot is an accusation, and an accusation is something you can have a
 * feeling about. Every plate carries a real charge from a real source — the terrace's
 * anger is old and specific, and specificity is what makes it land.
 *
 * This plate is drawn entirely for gate 11's own night ground (rule 8, the marked
 * block at the foot of `app/globals.css`) — `bg-hate-*`/`text-hate-*` tokens, never
 * the shell's `sheet`/`paper`/`ink` or the press layer's `--n-*`/`--p-*`. The field's
 * own litho dot grid (`.hate-dots`) is drawn once behind the whole screen in
 * `HateHill.tsx`, not per plate — an opaque card already hides it, so repeating it
 * here would only cost paint.
 *
 * `state` drives the press: `live` waits to be picked, `won` takes the deep-red
 * over-print, `out` is cancelled with a stamp, desaturated and drained of colour.
 * `holder` marks the plate currently pinned on the hill while it is still `live` —
 * the deep-red plate with the streak tag; a challenger, or either plate before the
 * first pick, stays on the plain dark field.
 */
export function EnemyPlate({
  enemy,
  state = 'live',
  holder = false,
  onPick,
  compact = false,
  dense = false,
}: {
  enemy: Enemy
  state?: 'live' | 'won' | 'out'
  /** the plate currently pinned on the hill — only meaningful while `state` is `live` */
  holder?: boolean
  onPick?: (el: HTMLButtonElement) => void
  compact?: boolean
  /**
   * The run variant. Two full plates plus the arena furniture came to ~950px on a
   * 390×844 phone, which means the second name is below the fold — and a head to head
   * you have to scroll to see is not a head to head. `dense` keeps every element,
   * including the charge, and only takes the air out.
   */
  dense?: boolean
}) {
  const out = state === 'out'
  const won = state === 'won'
  const category = `hate.cat.${enemy.category}` as MessageKey
  const sport = `hate.sport.${enemy.sport}` as MessageKey

  // Card, header strip and charge chip each follow the same three-way split: cancelled
  // (out), the deep-red over-print (won), the holder's plate while still live, or the
  // plain field everyone else — challenger, and either plate before the first pick —
  // stands on.
  const cardTone = out
    ? 'border-hate-ink/20 bg-hate-field opacity-45 grayscale'
    : won
      ? 'border-hate-red-light bg-hate-red-deep'
      : holder
        ? 'border-hate-red-light bg-hate-card active:scale-[.985]'
        : 'border-hate-ink/35 bg-hate-field active:scale-[.985]'

  const headerTone = out
    ? 'bg-hate-ink/10'
    : won
      ? 'bg-hate-field/55'
      : holder
        ? 'bg-hate-red-deep'
        : 'bg-hate-ink/10'

  const chargeTone =
    state === 'live'
      ? 'border-hate-red-light text-hate-red-light'
      : won
        ? 'border-hate-ink/55 text-hate-ink'
        : 'border-hate-ink/40 text-hate-ink'

  const dimTone = won ? 'text-hate-ink/75' : 'text-hate-muted'

  return (
    <button
      type="button"
      disabled={state !== 'live' || !onPick}
      onClick={(event) => onPick?.(event.currentTarget)}
      aria-label={`${t('hate.tap')} ${enemy.nameHe}`}
      className={`group relative block min-h-tap w-full overflow-hidden border-rule text-start transition-all duration-press ease-stamp motion-reduce:transition-none ${cardTone}`}
    >
      <div
        className={`relative flex items-baseline justify-between gap-2 border-b-hair border-hate-ink/20 text-hate-ink ${headerTone} ${dense ? 'px-2.5 py-1' : 'px-3 py-1.5'}`}
      >
        <span className="font-display text-[12px] leading-none">{t(category)}</span>
        <span className="font-latin text-[8px] font-bold tracking-[0.18em] text-hate-muted" dir="ltr">
          {enemy.latin}
        </span>
      </div>

      <div className={`relative ${dense ? 'px-2.5 pb-1 pt-1' : 'px-3 pb-3 pt-2.5'}`}>
        <div className="flex items-baseline justify-between gap-2">
          <h3
            className={`font-poster leading-[0.82] text-hate-ink ${compact ? 'text-[30px]' : dense ? 'text-[24px] sm:text-[34px]' : 'text-[38px] sm:text-[46px]'}`}
          >
            {enemy.nameHe}
          </h3>
          <span className={`shrink-0 font-body text-[10px] tracking-wide ${dimTone}`}>{t(sport)}</span>
        </div>

        <p className={`mt-0.5 font-mono text-[10.5px] tabular-nums ${dimTone}`}>
          <bdi>{enemy.eraHe}</bdi>
        </p>

        {!compact && (
          <p
            className={`max-w-[46ch] font-body leading-snug text-hate-ink ${
              dense ? 'mt-1 line-clamp-2 text-[12px]' : 'mt-2 text-step--1 leading-relaxed'
            }`}
          >
            {enemy.chargeHe}
          </p>
        )}

        {/* rule 18 §1: a row with no real citation arrives with no key fact — the plate
            then prints the charge and the era, and nothing that reads as a record */}
        {enemy.keyFactHe !== '' && (
          <div
            className={`inline-block border-hair px-2 py-1 font-body font-extrabold ${
              dense ? 'mt-1 text-[10px]' : 'mt-2.5 text-[10.5px]'
            } ${chargeTone}`}
          >
            {enemy.keyFactHe}
          </div>
        )}
      </div>

      {out && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <span className="rotate-[-9deg] border-[3px] border-hate-ink/75 px-4 py-1 font-poster text-[30px] leading-none text-hate-ink/75">
            {t('hate.out')}
          </span>
        </span>
      )}
    </button>
  )
}
