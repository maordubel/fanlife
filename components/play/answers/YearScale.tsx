'use client'

import { useState } from 'react'

import { haptic } from '@/lib/play/haptics'
import { t } from '@/lib/i18n'
import type { AnswerProps } from './types'

/**
 * ציר השנים — up to six years or seasons on one line, earliest first (the reading
 * direction: in Hebrew, time runs from the right). One tap is the answer. The options
 * are dealt already in order, so the scale itself teaches where the others sit.
 */
export function YearScale({ options, locked, graded, struck = [], onAnswer }: AnswerProps) {
  const [picked, setPicked] = useState<string | null>(null)

  function tap(value: string) {
    if (locked || struck.includes(value)) return
    haptic('tap')
    setPicked(value)
    onAnswer(value)
  }

  return (
    <div className="relative pt-2" role="group" aria-label={t('answers.year.label')}>
      <div aria-hidden="true" className="absolute inset-x-2 top-[34px] h-[3px] bg-ink" />
      <ol className="relative grid grid-cols-3 gap-2 min-[400px]:grid-cols-6">
        {options.map((value) => {
          const right = graded ? graded.correctAnswers.includes(value) : undefined
          const isPicked = picked === value
          const gone = struck.includes(value)
          return (
            <li key={value}>
              <button
                type="button"
                onClick={() => tap(value)}
                disabled={locked || gone}
                aria-pressed={isPicked}
                className={`flex min-h-tap w-full flex-col items-center justify-center border-rule px-1 py-2 transition-transform duration-press active:scale-[.96] disabled:active:scale-100 motion-reduce:transition-none ${
                  right ? 'border-red bg-red text-sheet' : isPicked ? 'border-ink bg-ink text-paper' : 'border-ink bg-sheet text-ink'
                } ${gone ? 'opacity-35' : ''}`}
              >
                <span className={`font-poster text-[19px] leading-none ${gone ? 'line-through' : ''}`}>
                  <bdi dir="ltr">{value}</bdi>
                </span>
                {graded && right && <span className="sr-only">{t('trivia.rowCorrect')}</span>}
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
