'use client'

import { useState, type CSSProperties } from 'react'

import { MiniGame } from '@/components/clubs/life/MiniGame'
import styles from '@/components/clubs/life/life.module.css'
import type { PlayResult } from '@/lib/life/universal/types'

/** The client half: the real MiniGame for one job, and the verdict it handed back. */
export function Preview({ style, club, id, age, ids, scope, people }: { style: CSSProperties; club: string; id: string; age: number; ids: string[]; scope: 'short' | 'full'; people: string[] }) {
  const [result, setResult] = useState<PlayResult | null>(null)
  const [run, setRun] = useState(0)
  return (
    <div dir="ltr" className={styles.life} style={{ ...style, minBlockSize: '100dvh', display: 'grid', alignContent: 'start', justifyItems: 'center', gap: 12, padding: 12 }}>
      <nav className="flex flex-wrap gap-1 text-[11px]">
        {ids.map((j) => <a key={j} href={`?club=${club}&id=${j}&age=${age}`} data-qa-job={j} className={j === id ? 'underline' : ''}>{j}</a>)}
      </nav>
      {result ? (
        <p data-qa-result={result}>Result: {result} · <button type="button" className="min-h-tap" onClick={() => { setResult(null); setRun((n) => n + 1) }}>again</button></p>
      ) : (
        <div style={{ position: 'relative', inlineSize: 'min(100%, 26rem)' }}>
          <MiniGame key={run} game="carry" id={id} age={age} scope={scope} people={people} amount={8} copy={{}} reduced={false} cue={() => {}} onDone={setResult} />
        </div>
      )}
    </div>
  )
}
