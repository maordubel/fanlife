'use client'

import { RevealBar, useReveal } from '@/components/play/Reveal'
import { Num } from '@/components/ui/Num'
import { STAGE_CAPS, STAGE_SECONDS } from '@/lib/game/session'
import { t, type MessageKey } from '@/lib/i18n'

/**
 * כרטיס השלב, שאפשר לדלג עליו — the card between stages, as a `useReveal` beat.
 *
 * The shared `StageCard` held the glass for 1,250 ms with no way through it. The brief
 * is explicit that a transition is not gameplay (§10), so this one ends on its own, ends
 * NOW on a tap anywhere, and says the stage's three rules in one line: questions, clock,
 * and the combo cap. Under reduced motion nothing moves; the beat still elapses.
 */
export function StageBreak({ stage, practice, onDone }: { stage: number; practice: boolean; onDone: () => void }) {
  const { progress, skip } = useReveal({ ms: 1300, onDone, active: true })
  const seconds = STAGE_SECONDS[stage] ?? 11
  const cap = STAGE_CAPS[stage] ?? 4

  return (
    <button
      type="button"
      onClick={skip}
      className="fixed inset-0 z-[60] flex min-h-tap flex-col items-center justify-center overflow-hidden bg-ink px-gutter text-center"
      aria-label={t('trivia.stage.skip')}
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-30">
        <span className="rays absolute inset-x-0 top-1/2 mx-auto block h-[900px] w-[900px] -translate-y-1/2" />
      </span>
      <span className="relative font-latin text-[11px] font-bold tracking-[0.3em] text-red" dir="ltr">
        STAGE {stage + 1} / 3
      </span>
      <span className="relative mt-2 font-poster text-[110px] leading-none text-paper">
        <Num>{stage + 1}</Num>
      </span>
      <span className="relative mt-1 font-display text-step-2 leading-tight text-paper">
        {t(`trivia.stage.${stage + 1}` as MessageKey)}
      </span>
      <span className="relative mt-2 max-w-[32ch] font-body text-step-0 leading-relaxed text-concrete">
        {practice
          ? t('trivia.stage.rulePractice', { cap: String(cap) })
          : t('trivia.stage.rule', { seconds: String(seconds), cap: String(cap) })}
      </span>
      <span className="relative mt-5 w-40">
        <RevealBar progress={progress} tone="sheet" />
      </span>
      <span className="relative mt-2 font-body text-[12px] text-concrete">{t('trivia.stage.tap')}</span>
    </button>
  )
}
