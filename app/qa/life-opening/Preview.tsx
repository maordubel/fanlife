'use client'

import { useState } from 'react'

import { Opening } from '@/components/life/Opening'
import type { HistoricalAnchor } from '@/lib/life/anchors'

/**
 * The client half: the opening needs a handler, and a server component may not pass one.
 * `force` is the QA switch (`?path=documentary` / `?path=film`); without it this is the
 * game's own decision — film first, documentary when the film cannot or motion is reduced.
 */
export function Preview({ anchor, force }: { anchor: HistoricalAnchor; force?: 'film' | 'documentary' }) {
  const [run, setRun] = useState(0)
  const [over, setOver] = useState(false)
  if (over) {
    return (
      <div dir="rtl" data-qa="opening-over" className="flex h-full flex-col items-center justify-center gap-5 bg-ink text-center">
        <p className="font-body text-[13px] text-concrete/60">הפתיח נגמר. במשחק, מכאן מתחיל הפרולוג.</p>
        <button
          type="button"
          onClick={() => {
            setOver(false)
            setRun((n) => n + 1)
          }}
          className="flex min-h-tap items-center border-hair border-concrete/40 px-5 font-body text-[13px] text-sheet"
        >
          שוב
        </button>
      </div>
    )
  }
  return <Opening key={run} anchor={anchor} force={force} onDone={() => setOver(true)} />
}
