'use client'

import { useState } from 'react'

import { haptic } from '@/lib/play/haptics'
import { t } from '@/lib/i18n'
import type { AnswerProps } from './types'

/**
 * התאמות — pick an item in the first column, then its partner. A pair can be UNDONE by
 * tapping it again, until the last one lands (the prototype could not un-pair); the last
 * pairing is the answer, sent aligned to `left`.
 */
export function PairMatcher({ options, left = [], locked, graded, onAnswer }: AnswerProps & { left?: string[] }) {
  // the first unpaired item starts selected, so the first tap on the other column pairs
  const [active, setActive] = useState<string | null>(left[0] ?? null)
  const [pairs, setPairs] = useState<Record<string, string>>({})
  const used = new Set(Object.values(pairs))

  function pickLeft(item: string) {
    if (locked) return
    haptic('tap')
    if (pairs[item] !== undefined) {
      const next = { ...pairs }
      delete next[item]
      setPairs(next)
      setActive(item)
      return
    }
    setActive(active === item ? null : item)
  }

  function pickRight(value: string) {
    if (locked || active === null || used.has(value)) return
    haptic('tap')
    const next = { ...pairs, [active]: value }
    setPairs(next)
    setActive(left.find((item) => next[item] === undefined) ?? null)
    if (left.every((item) => next[item] !== undefined)) onAnswer(left.map((item) => next[item] as string))
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <ul className="grid content-start gap-1.5" aria-label={t('answers.match.left')}>
        {left.map((item, index) => {
          const mine = pairs[item]
          const truth = graded?.correctAnswers[index]
          const right = graded ? mine === truth : undefined
          return (
            <li key={item}>
              <button
                type="button"
                onClick={() => pickLeft(item)}
                disabled={locked}
                aria-pressed={active === item}
                className={`flex min-h-tap w-full flex-col items-start justify-center border-rule px-2.5 py-2 text-start transition-transform duration-press active:scale-[.97] motion-reduce:transition-none ${
                  active === item ? 'border-red bg-red/[.09]' : right ? 'border-red bg-red/[.12]' : 'border-ink bg-sheet'
                }`}
              >
                <span className="font-body text-step--1 font-bold leading-snug text-ink">{item}</span>
                {mine !== undefined && (
                  <span className="mt-0.5 font-body text-[12px] leading-tight text-red">
                    <span aria-hidden="true">{graded ? (right ? '✓ ' : '✗ ') : '↔ '}</span>
                    <bdi>{mine}</bdi>
                  </span>
                )}
                {graded && !right && truth !== undefined && (
                  <span className="mt-0.5 font-body text-[12px] leading-tight text-muted">
                    {t('answers.match.was')} <bdi>{truth}</bdi>
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
      <ul className="grid content-start gap-1.5" aria-label={t('answers.match.right')}>
        {options.map((value) => (
          <li key={value}>
            <button
              type="button"
              onClick={() => pickRight(value)}
              disabled={locked || used.has(value) || active === null}
              className={`flex min-h-tap w-full items-center justify-center border-rule px-2 py-2 text-center font-poster text-[17px] leading-tight transition-transform duration-press active:scale-[.97] motion-reduce:transition-none ${
                used.has(value) ? 'border-ink/30 bg-paper text-muted' : 'border-ink bg-sheet text-ink'
              }`}
            >
              <bdi>{value}</bdi>
            </button>
          </li>
        ))}
      </ul>
      {!graded && (
        <p className="col-span-2 font-body text-[12px] text-muted">{t('answers.match.help')}</p>
      )}
    </div>
  )
}
