'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

import { t } from '@/lib/i18n'
import type { LifeBusEvents } from '@/lib/life/runtime/bus'

const PitchCard = dynamic(() => import('@/components/life/PitchCard').then((m) => m.PitchCard), {
  ssr: false,
})

/**
 * The harness's client half.
 *
 * It mounts the REAL card with a real payload rather than a mock, for the same reason
 * `/qa/life-cutscene` does: a preview built from a copy of the thing proves nothing about
 * the thing. Remounting on `run` is how the yellow probe screenshots the same pitch at
 * three widths without reloading the page.
 */
export function Preview({ pitch }: { pitch: NonNullable<LifeBusEvents['pitch']> }) {
  const [run, setRun] = useState(0)
  return (
    <div className="relative h-dvh w-full bg-ink" data-life="pitch-qa">
      <PitchCard key={run} pitch={pitch} onDone={() => setRun((n) => n + 1)} />
      <p className="pointer-events-none absolute inset-x-0 bottom-1 z-[120] text-center font-mono text-[11px] text-concrete/70">
        {t('life.pitch.qa.note')}
      </p>
    </div>
  )
}
