'use client'

import type { KeyboardEvent } from 'react'

import { t } from '@/lib/i18n'
import { isSkipKey } from '@/lib/life/filmPlayback'

/**
 * דלג על הסרטון — the one skip control both films carry (upgrade plan §7).
 *
 * The old controls were 11–12px concrete at 45–60% opacity: present, technically, and
 * invisible to anybody who did not already know they were there. This one is a real
 * button: ink ground, a vermilion hairline, cream type at full strength, never under 15px,
 * a 48px target, a focus ring you can see from the sofa, parked in the bottom start corner
 * clear of the notch and the home bar. On a pointer that can hover, an `Esc` plate says the
 * keyboard works too. Styles are the FILM SKIP block in `app/globals.css`, tokens only.
 *
 * Escape is owned by each film's `useDialog` (it fires wherever focus is inside the
 * dialog). When focus sits ON this button the keydown is handled here and stopped, so the
 * dialog's listener never sees the same press — and both films' `finish` is once-only
 * regardless.
 */
export function skipKeyHandler(onSkip: () => void) {
  return (event: Pick<KeyboardEvent, 'key' | 'preventDefault' | 'stopPropagation'>) => {
    if (!isSkipKey(event)) return
    event.preventDefault()
    event.stopPropagation()
    onSkip()
  }
}

export function FilmSkipButton({ onSkip, 'data-life': dataLife }: { onSkip: () => void; 'data-life'?: string }) {
  const label = t('life.film.skip')
  return (
    <button
      type="button"
      onClick={onSkip}
      onKeyDown={skipKeyHandler(onSkip)}
      aria-label={label}
      aria-keyshortcuts="Escape"
      data-life={dataLife}
      className="film-skip min-h-tap"
    >
      <span aria-hidden="true" className="film-skip-icon">
        ⏭
      </span>
      <span>{label}</span>
      <kbd aria-hidden="true" className="film-skip-key">
        {t('life.leave.key')}
      </kbd>
    </button>
  )
}
