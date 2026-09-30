'use client'

import { useState } from 'react'

import { HistoricalCutscene } from '@/components/life/HistoricalCutscene'
import type { CutsceneCard, CutsceneOutcome, HistoricalCutscene as Def } from '@/lib/life/cutscenes'

/**
 * The client half. Renders the real component with real config and shows what it reported.
 *
 * The outcome line is the whole reason this page exists: the three ways a cutscene can end
 * are the three things the chapter branches on, and the only way to see them without a
 * network failure to hand is to press the buttons and read what came back.
 */
export function Preview({ scene, card }: { scene: Def; card: CutsceneCard }) {
  const [outcome, setOutcome] = useState<CutsceneOutcome | null>(null)
  const [run, setRun] = useState(0)

  return (
    <div className="relative h-full w-full bg-ink">
      {outcome === null ? (
        <HistoricalCutscene key={run} scene={scene} card={card} onDone={setOutcome} />
      ) : (
        <div dir="rtl" className="flex h-full flex-col items-center justify-center gap-6 text-center">
          <p className="font-body text-[13px] text-concrete/60">הסרט נסגר. מה שהוא דיווח:</p>
          <p className="font-mono text-[22px] tabular-nums text-red">{outcome}</p>
          <p className="max-w-md px-gutter font-body text-[11px] leading-relaxed text-concrete/50">
            {outcome === 'watched'
              ? 'המשחק ירים את הדגל השני, ישמור את הזיכרון, ויחזיר את השחקן ליציע החוגג.'
              : outcome === 'skipped'
                ? 'אותו דבר בלי הדגל השני — מי שדילג לא נשלח לצפות בגרסה ארוכה יותר.'
                : 'הסרט לא זמין, ולכן המשחק משחק את תשעים הדקות בעצמו — הנפילה לאחור היא המשחק.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setOutcome(null)
              setRun((n) => n + 1)
            }}
            className="flex min-h-tap items-center border-hair border-concrete/40 px-5 font-body text-[13px] text-sheet"
          >
            שוב
          </button>
        </div>
      )}
    </div>
  )
}
