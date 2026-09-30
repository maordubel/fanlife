'use client'

import { useEffect, useState } from 'react'

import { dealToto, gradeToto } from '@/app/life/totoActions'
import { TOTO_LENGTH } from '@/lib/life/toto'
import { t } from '@/lib/i18n'
import type { TriviaQuestion } from '@/lib/game/trivia'
import type { LifeBusEvents } from '@/lib/life/runtime/bus'

/**
 * שליחת טוטו — five questions about the club, two shekels a right answer.
 *
 * Maor asked for this in one sentence and it contained the whole design: "בפועל — קופץ
 * שאלון טרוויה שקיים לנו גם ככה באתר". So nothing here is a new quiz. The questions come
 * from the site's own bank through a server action, WITHOUT their answers, and they are
 * graded on the server against the seed — the same authority גשר 2 has, because a Toto
 * slip you can read the results off is not a Toto slip.
 *
 * It is also the one way of earning money in this world that pays for something other
 * than time: the child is paid for knowing his club. That is the joke and it is also the
 * truest thing in the game.
 */
export function TotoCard({
  toto,
  perAnswer,
  onDone,
}: {
  toto: NonNullable<LifeBusEvents['toto']>
  perAnswer: number
  /** how the slip was handed in — the ledger decides what it is worth (`activities.ts`) */
  onDone: (result: { hits: number; asked: number }) => void
}) {
  const [questions, setQuestions] = useState<TriviaQuestion[] | null>(null)
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string[]>([])
  const [verdict, setVerdict] = useState<{ right: boolean; answers: string[] } | null>(null)
  const [hits, setHits] = useState(0)

  useEffect(() => {
    let live = true
    void dealToto(toto.seed, toto.window ?? null).then((rows) => {
      if (live) setQuestions(rows)
    })
    return () => {
      live = false
    }
  }, [toto.seed, toto.window])

  const question = questions?.[index] ?? null
  const need = question?.pickCount ?? 1
  const ready = picked.length === need

  async function submit() {
    if (!question || !ready || verdict) return
    const graded = await gradeToto(toto.seed, index, need === 1 ? (picked[0] as string) : picked, toto.window ?? null)
    if (!graded) return
    setVerdict({ right: graded.correct, answers: graded.correctAnswers })
    if (graded.correct) setHits((n) => n + 1)
  }

  function next() {
    setVerdict(null)
    setPicked([])
    if (questions && index + 1 < questions.length) setIndex(index + 1)
    else onDone({ hits, asked: TOTO_LENGTH })
  }

  function toggle(option: string) {
    if (verdict) return
    setPicked((current) =>
      current.includes(option)
        ? current.filter((value) => value !== option)
        : need === 1
          ? [option]
          : current.length < need
            ? [...current, option]
            : current,
    )
  }

  return (
    <div
      dir="rtl"
      className="absolute inset-0 z-[95] flex flex-col bg-ink px-5 py-6 text-end"
      data-life="toto-card"
    >
      <p className="font-display text-[13px] uppercase tracking-[0.22em] text-red">{t('life.toto.kicker')}</p>
      <h2 className="mt-1 font-display text-[20px] leading-tight text-sheet">{t('life.toto.title')}</h2>
      <p className="mt-1 font-body text-[13px] text-concrete">
        {toto.top ? t('life.toto.subTop', { n: String(toto.top) }) : t('life.toto.sub', { n: String(perAnswer) })}
      </p>

      {!questions && <p className="mt-8 font-body text-[14px] text-concrete">{t('life.toto.loading')}</p>}

      {questions && question && (
        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <p className="font-mono text-[11px] tabular-nums text-concrete">
            {t('life.toto.progress', { i: String(index + 1), n: String(questions.length) })}
          </p>

          {question.quoteHe && (
            <blockquote className="mt-3 border-e-rule border-red pe-3 font-body text-[14px] leading-relaxed text-sheet/90">
              {question.quoteHe}
              {question.quoteByHe && <span className="block pt-1 text-[12px] text-concrete">{question.quoteByHe}</span>}
            </blockquote>
          )}

          <p className="mt-3 font-body text-[16px] leading-snug text-sheet">{question.prompt}</p>

          <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
            {question.options.map((option) => {
              const on = picked.includes(option)
              const right = verdict?.answers.includes(option) ?? false
              const tone = verdict
                ? right
                  ? 'border-red bg-red text-sheet'
                  : on
                    ? 'border-concrete/60 text-concrete line-through'
                    : 'border-concrete/25 text-concrete'
                : on
                  ? 'border-red bg-red text-sheet'
                  : 'border-concrete/40 text-sheet'
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggle(option)}
                  className={`min-h-tap w-full border-rule px-3 py-2.5 text-start font-body text-[14px] leading-snug transition-transform duration-press ease-stamp active:scale-[.99] motion-reduce:transition-none ${tone}`}
                >
                  <bdi>{option}</bdi>
                </button>
              )
            })}
          </div>

          {verdict && (
            <p className={`mt-3 font-body text-[13px] ${verdict.right ? 'text-red' : 'text-concrete'}`}>
              {verdict.right ? t('life.toto.right') : t('life.toto.wrong', { a: verdict.answers.join(' · ') })}
            </p>
          )}

          <div className="mt-4 flex gap-3">
            {!verdict ? (
              <>
                <button
                  type="button"
                  disabled={!ready}
                  onClick={() => void submit()}
                  className="min-h-tap flex-1 border-rule border-red bg-red px-4 py-3 font-display text-[15px] leading-none text-sheet disabled:border-concrete/40 disabled:bg-transparent disabled:text-concrete"
                >
                  {t('life.toto.pick')}
                </button>
                <button
                  type="button"
                  onClick={() => onDone({ hits, asked: TOTO_LENGTH })}
                  className="min-h-tap px-4 py-3 font-body text-[13px] text-concrete underline underline-offset-4"
                >
                  {t('life.toto.away')}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={next}
                className="min-h-tap flex-1 border-rule border-red bg-red px-4 py-3 font-display text-[15px] leading-none text-sheet"
              >
                {index + 1 < questions.length ? t('life.toto.next') : t('life.toto.done')}
              </button>
            )}
          </div>
        </div>
      )}

      {questions && questions.length === 0 && (
        <button
          type="button"
          onClick={() => onDone({ hits: 0, asked: TOTO_LENGTH })}
          className="min-h-tap mt-6 border-rule border-red bg-red px-4 py-3 font-display text-[15px] text-sheet"
        >
          {t('life.toto.away')}
        </button>
      )}

      <p className="mt-3 font-mono text-[12px] tabular-nums text-concrete">
        {toto.top
          ? t('life.toto.totalTop', { hits: String(hits), n: String(TOTO_LENGTH) })
          : t('life.toto.total', { hits: String(hits), n: String(TOTO_LENGTH), sum: String(hits * perAnswer) })}
      </p>
    </div>
  )
}
