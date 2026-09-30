'use client'

import { t } from '@/lib/i18n'

/**
 * Error state in the system's own language: the same 2px frame, in red. No spinner.
 *
 * The retry button used to print the retired `wall.paste` string — "הדבק גיליון חדש", "paste a new
 * sheet" — an instruction left over from a daily-sheet mechanic this screen has nothing
 * to do with: nobody pastes anything to retry a crashed page. `error.retry` says what
 * the button actually does.
 */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" className="mx-auto max-w-5xl px-gutter py-16">
      <div className="border-rule border-red p-4">
        <p className="font-sign text-step-2 leading-none text-red">{t('error.sheet')}</p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="mt-stack flex min-h-tap items-center bg-ink px-4 font-body text-step-1 font-extrabold text-sheet transition-transform duration-press ease-stamp active:scale-[.96] motion-reduce:transition-none"
      >
        {t('error.retry')}
      </button>
    </main>
  )
}
