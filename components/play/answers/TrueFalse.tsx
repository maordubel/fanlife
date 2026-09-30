'use client'

import { useState } from 'react'

import { haptic } from '@/lib/play/haptics'
import { t } from '@/lib/i18n'
import type { AnswerProps } from './types'

/**
 * נכון / לא נכון — a statement the archive can stand behind either way. Two plates,
 * one tap. The values are 'true' / 'false'; the words are the catalogue's.
 */
export function TrueFalse({ locked, graded, onAnswer }: AnswerProps) {
  const [picked, setPicked] = useState<string | null>(null)

  function tap(value: 'true' | 'false') {
    if (locked) return
    haptic('tap')
    setPicked(value)
    onAnswer(value)
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {(['true', 'false'] as const).map((value) => {
        const right = graded ? graded.correctAnswers.includes(value) : undefined
        const isPicked = picked === value
        return (
          <button
            key={value}
            type="button"
            onClick={() => tap(value)}
            disabled={locked}
            aria-pressed={isPicked}
            className={`flex min-h-tap min-h-[64px] flex-col items-center justify-center gap-1 border-rule px-3 py-3 transition-transform duration-press active:scale-[.97] disabled:active:scale-100 motion-reduce:transition-none ${
              right ? 'border-red bg-red text-sheet' : isPicked ? 'border-ink bg-ink text-paper' : 'border-ink bg-sheet text-ink'
            } ${graded && !right && isPicked ? 'opacity-60' : ''}`}
          >
            <span aria-hidden="true" className="font-poster text-[26px] leading-none">
              {value === 'true' ? '✓' : '✗'}
            </span>
            <span className="font-display text-step-1 leading-none">
              {t(value === 'true' ? 'answers.tf.true' : 'answers.tf.false')}
            </span>
            {graded && right && <span className="sr-only">{t('trivia.rowCorrect')}</span>}
          </button>
        )
      })}
    </div>
  )
}
