'use client'

import { ObjectMark } from '@/components/memory/ObjectMark'
import { RevealBar, useReveal } from '@/components/play/Reveal'
import { Num } from '@/components/ui/Num'
import { FUSION_MS, numericFace } from '@/lib/game/memory-run'
import type { MemoryPair } from '@/lib/game/memory'
import { t } from '@/lib/i18n'

/**
 * מיזוג הזוג — the two faces becoming one memory.
 *
 * This is the single beat the whole gate is built around, and the reason it exists is a
 * sentence from the brief: *"a pair is not merely identical cards; it connects two faces
 * of one memory."* A board that removes a matched pair has thrown away the only moment
 * where it can say what the pair MEANT — which, in this game, is a real fact out of the
 * archive. So the two faces come together and the plate prints the joined line.
 *
 * Nothing on it is invented. `a` is the thing (a trophy, a maker, a moment, a candidate),
 * `b` is the date or the count that pins it down, and `kind` names which of those it is.
 * The screen joins them with a separator; it never writes a sentence about them, because
 * a sentence would be a claim nobody sourced (rule 11).
 *
 * **PERFECT RECALL is a counted thing**, not praise: no miss since the previous pair was
 * closed. `lib/game/memory-run.ts` decides it and this only prints it.
 *
 * It closes itself after one short beat and a tap anywhere closes it now (`useReveal` —
 * the same beat gate 7's vote reaction runs on). It is `role="status"` rather than a
 * dialog: nothing here has to be answered and nothing is trapped, so stealing focus
 * would take the keyboard away from a board the player is in the middle of. It still
 * sits above the tab bar, because it covers the glass.
 */
export function FusionPlate({
  pair,
  perfect,
  onDone,
}: {
  pair: MemoryPair
  perfect: boolean
  onDone: () => void
}) {
  const { progress, skip } = useReveal({ ms: FUSION_MS, onDone, active: true })

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/85 px-gutter"
    >
      <button
        type="button"
        onClick={skip}
        aria-label={t('memory.fusion.skip')}
        className="absolute inset-0 min-h-tap w-full"
      />

      <div className="pointer-events-none relative w-full max-w-[420px] animate-slam border-plate border-sheet bg-sheet">
        <p className="border-b-hair border-ink/25 bg-ink px-3 py-1.5 font-body text-[9px] font-extrabold tracking-[0.2em] text-red">
          {t('memory.fusion.kicker')}
        </p>

        {/* the two faces, still separate, on the way in */}
        <div className="flex items-stretch border-b-hair border-ink/25">
          <p className="min-w-0 flex-1 px-3 py-2 text-center font-sign text-[14px] font-bold leading-tight text-ink">
            <Face value={pair.a} />
          </p>
          <span aria-hidden="true" className="w-px bg-ink/25" />
          <p className="min-w-0 flex-1 px-3 py-2 text-center font-sign text-[14px] font-bold leading-tight text-ink">
            <Face value={pair.b} />
          </p>
        </div>

        {/* and the memory they become */}
        <div className="flex items-start gap-3 p-3.5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center border-rule border-red bg-red text-sheet">
            <ObjectMark object={pair.object} className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <p className="font-body text-[8.5px] font-extrabold tracking-[0.18em] text-muted">
              {t('memory.fusion.label')}
            </p>
            <p className="mt-0.5 font-display text-step-1 leading-tight text-ink">
              <Face value={pair.a} />
            </p>
            <p className="mt-0.5 font-sign text-[15px] font-bold leading-tight text-red">
              <Face value={pair.b} />
            </p>
            <p className="mt-1 font-body text-[11px] leading-snug text-muted">{pair.kind}</p>
            {pair.factHe && (
              <p data-memory="fact" className="mt-1.5 font-body text-[12px] leading-snug text-ink">
                {pair.factHe}
              </p>
            )}
          </div>
        </div>

        {perfect && (
          <p className="animate-stamp-in border-t-hair border-ink/25 bg-red px-3 py-1.5 text-center font-body text-[10px] font-extrabold tracking-[0.16em] text-sheet">
            {t('memory.fusion.perfect')}
          </p>
        )}

        <RevealBar progress={progress} />
      </div>
    </div>
  )
}

/** A face, isolated LTR when it is a pure figure. See `numericFace`. */
function Face({ value }: { value: string }) {
  return numericFace(value) ? <Num>{value}</Num> : <>{value}</>
}
