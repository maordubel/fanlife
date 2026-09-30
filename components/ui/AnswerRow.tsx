'use client'

import { t } from '@/lib/i18n'

/**
 * שורת תשובה. Picking marks the row with red at 9% — never green/red on the answer.
 * The feedback is the stamp.
 *
 * After grading, `correct` marks which rows were right. On a multi-select that is not
 * optional politeness: three of six were right and the player has to be able to see
 * WHICH three, or the question taught them nothing. The mark is a rule and a tick, not
 * a colour, so it survives a colour-blind reader and a monochrome screenshot.
 *
 * The ✓/✗ itself is `aria-hidden` — a glyph, not a word — and used to have no echo at
 * all, so a graded row read as just its own text with no verdict attached. The `sr-only`
 * span beside it says the same thing `aria-pressed` cannot: `aria-pressed` reports
 * whether THIS row was picked, not whether picking it was right.
 */
export function AnswerRow({
  letter,
  text,
  picked,
  correct,
  onPick,
}: {
  letter: string
  text: string
  picked: boolean
  /** undefined before grading; after it, whether this row is one of the right answers */
  correct?: boolean
  onPick: () => void
}) {
  const graded = correct !== undefined
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={picked}
      disabled={graded}
      className={`flex min-h-tap w-full items-center gap-3 border-b-hair px-1 py-3.5 text-start transition-transform duration-press active:scale-[.96] disabled:active:scale-100 motion-reduce:transition-none ${
        graded && correct ? 'border-red bg-red/[.12]' : 'border-ink/30'
      } ${picked && !graded ? 'bg-red/[.09]' : ''} ${graded && !correct && picked ? 'opacity-45' : ''}`}
    >
      <span
        className={`grid h-6 w-6 place-items-center border-rule font-sign ${
          graded && correct ? 'border-red bg-red text-sheet' : 'border-ink text-red'
        }`}
        aria-hidden="true"
      >
        {graded ? (correct ? '✓' : picked ? '✗' : '') : picked ? '✗' : ''}
      </span>
      {graded && (
        <span className="sr-only">
          {correct ? t('trivia.rowCorrect') : picked ? t('trivia.rowWrong') : ''}
        </span>
      )}
      <span className="w-4 font-body text-[11px] text-muted">{letter}</span>
      {/* Answers are Hebrew prose, not figures. They were set in the mono face at
          step-1 — a typewriter face at heading size, which is why they read badly and
          overflowed on a phone. Body face, one step down, normal weight. */}
      <span className="font-body text-step-0 leading-snug text-ink">{text}</span>
    </button>
  )
}
