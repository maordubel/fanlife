'use client'

import { useState } from 'react'

import { haptic } from '@/lib/play/haptics'
import { t } from '@/lib/i18n'
import type { AnswerProps } from './types'

/**
 * בחירה / בחר כמה — four options and one tap, or six and three ticks.
 *
 * A multi commits itself when the last of its ticks lands — there is no "lock" button to
 * find — and until then any tick can be taken back. Selection is a tick glyph AND a tint,
 * never colour alone; after grading every right row carries ✓, so a multi shows WHICH
 * three were right.
 */
export function ChoiceList({
  options,
  locked,
  graded,
  struck = [],
  onAnswer,
  pickCount = 1,
}: AnswerProps & { pickCount?: number }) {
  const [picked, setPicked] = useState<string[]>([])
  const multi = pickCount > 1

  function tap(option: string) {
    if (locked || struck.includes(option)) return
    haptic('tap')
    if (!multi) {
      setPicked([option])
      onAnswer(option)
      return
    }
    const next = picked.includes(option)
      ? picked.filter((value) => value !== option)
      : picked.length >= pickCount
        ? picked
        : [...picked, option]
    setPicked(next)
    if (next.length === pickCount) onAnswer(next)
  }

  return (
    <div>
      {multi && (
        <p className="mb-1.5 font-body text-[12px] text-muted" aria-live="polite">
          {t('answers.multi.count', { n: String(picked.length), of: String(pickCount) })}
        </p>
      )}
      <ul className="border-t-rule border-ink">
        {options.map((option) => {
          const isPicked = picked.includes(option)
          const right = graded ? graded.correctAnswers.includes(option) : undefined
          const gone = struck.includes(option)
          return (
            <li key={option}>
              <button
                type="button"
                onClick={() => tap(option)}
                disabled={locked || gone}
                aria-pressed={isPicked}
                className={`flex min-h-tap w-full items-center gap-3 border-b-hair px-1 py-3 text-start transition-transform duration-press active:scale-[.97] disabled:active:scale-100 motion-reduce:transition-none ${
                  right ? 'border-red bg-red/[.12]' : 'border-ink/30'
                } ${isPicked && !graded ? 'bg-red/[.09]' : ''} ${graded && !right && isPicked ? 'opacity-50' : ''} ${
                  gone ? 'opacity-35' : ''
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`grid h-6 w-6 shrink-0 place-items-center border-rule font-sign text-[13px] ${
                    right ? 'border-red bg-red text-sheet' : 'border-ink text-red'
                  }`}
                >
                  {graded ? (right ? '✓' : isPicked ? '✗' : '') : isPicked ? '✓' : ''}
                </span>
                {graded && (
                  <span className="sr-only">
                    {right ? t('trivia.rowCorrect') : isPicked ? t('trivia.rowWrong') : ''}
                  </span>
                )}
                <span className={`font-body text-step-0 leading-snug text-ink ${gone ? 'line-through' : ''}`}>
                  {option}
                </span>
                {gone && <span className="sr-only">{t('answers.struck')}</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
