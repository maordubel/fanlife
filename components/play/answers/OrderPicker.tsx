'use client'

import { useState } from 'react'

import { haptic } from '@/lib/play/haptics'
import { t } from '@/lib/i18n'
import type { AnswerProps } from './types'

/**
 * סדר — tap the items into their slots, earliest first. Any placed item can be taken
 * back by tapping its slot, until the LAST one lands; that tap is the answer.
 *
 * After grading every slot says whether it was right (✓/✗, not colour alone) and the
 * true order is printed beside the player's.
 */
export function OrderPicker({ options, locked, graded, onAnswer }: AnswerProps) {
  const [placed, setPlaced] = useState<string[]>([])
  const bank = options.filter((item) => !placed.includes(item))

  function place(item: string) {
    if (locked) return
    haptic('tap')
    const next = [...placed, item]
    setPlaced(next)
    if (next.length === options.length) onAnswer(next)
  }

  function unplace(index: number) {
    if (locked || placed[index] === undefined) return
    haptic('tap')
    setPlaced(placed.filter((_, at) => at !== index))
  }

  return (
    <div className="grid gap-3">
      <ol className="grid gap-1.5" aria-label={t('answers.order.yours')}>
        {options.map((_, index) => {
          const item = placed[index]
          const truth = graded?.correctAnswers[index]
          const right = graded ? item === truth : undefined
          return (
            <li key={index} className="flex items-stretch gap-2">
              <span
                aria-hidden="true"
                className="grid w-9 shrink-0 place-items-center bg-ink font-poster text-[20px] leading-none text-paper"
              >
                {index + 1}
              </span>
              <button
                type="button"
                onClick={() => unplace(index)}
                disabled={locked || item === undefined}
                className={`flex min-h-tap flex-1 items-center justify-between gap-2 border-rule px-3 py-2 text-start ${
                  item === undefined
                    ? 'border-dashed border-ink/40 text-muted'
                    : right === false
                      ? 'border-ink/60 bg-sheet text-ink'
                      : right
                        ? 'border-red bg-red/[.12] text-ink'
                        : 'border-ink bg-sheet text-ink'
                }`}
              >
                <span className="font-body text-step--1 font-bold leading-snug">
                  {item ?? t('answers.order.empty')}
                </span>
                {graded && item !== undefined && (
                  <span aria-hidden="true" className="font-sign text-[15px] text-red">
                    {right ? '✓' : '✗'}
                  </span>
                )}
                {graded && item !== undefined && (
                  <span className="sr-only">{right ? t('trivia.rowCorrect') : t('trivia.rowWrong')}</span>
                )}
              </button>
            </li>
          )
        })}
      </ol>

      {!graded && bank.length > 0 && (
        <div>
          <p className="mb-1.5 font-body text-[12px] text-muted">{t('answers.order.bank')}</p>
          <div className="flex flex-wrap gap-2">
            {bank.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => place(item)}
                disabled={locked}
                className="min-h-tap border-rule border-ink bg-paper px-3 py-2 text-start font-body text-step--1 font-bold text-ink transition-transform duration-press active:scale-[.97] motion-reduce:transition-none"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      {graded && !graded.correct && (
        <p className="font-body text-step--1 text-ink">
          <span className="font-bold">{t('answers.order.truth')} </span>
          {graded.correctAnswers.join(' ← ')}
        </p>
      )}
    </div>
  )
}
