'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { HaveWantBar } from '@/components/fanlife/collector/HaveWantBar'
import { ShirtThumb } from '@/components/fanlife/ShirtThumb'
import { shirtSignals } from '@/lib/collector/api'
import type { ShirtSignal } from '@/lib/collector/types'
import { fl } from '@/lib/fanlife/copy'
import { shirtDateText } from '@/lib/fanlife/collector/cards'
import type { FanShirt } from '@/lib/fanlife/catalog'

/**
 * One club's shirts in the archive, and the archive's own "I have it / I'm looking for it" — The
 * Worker's gate-5 archive bar (HaveWantBar) on every club's shirt. A tap opens the shirt; the bar
 * writes to the same closet the closet, the market and the auction read.
 */
export function ShirtShelf({ shirts, focus }: { shirts: FanShirt[]; focus: string | null }) {
  const [open, setOpen] = useState<string | null>(shirts.some((s) => s.slug === focus) ? focus : null)
  const [signals, setSignals] = useState<Record<string, ShirtSignal>>({})
  useEffect(() => {
    let alive = true
    const slugs = shirts.map((s) => s.slug)
    void (async () => {
      for (let i = 0; i < slugs.length; i += 200) {
        const rows = await shirtSignals(slugs.slice(i, i + 200))
        if (alive) setSignals((prev) => ({ ...prev, ...rows }))
      }
    })()
    return () => { alive = false }
  }, [shirts])
  const shirt = shirts.find((s) => s.slug === open)
  return (
    <>
      <ul className="fl-shirt-grid">
        {shirts.map((s) => {
          const sig = signals[s.slug]
          return (
            <li key={s.slug} id={s.slug} data-focus={s.slug === open || undefined}>
              <button type="button" className="fl-shirt-open min-h-tap" onClick={() => setOpen(s.slug === open ? null : s.slug)} aria-expanded={s.slug === open}>
                <ShirtThumb shirt={s} />
                <b>{shirtDateText(s)}</b>
                <small>{s.variantHe}{sig?.youHave ? ` · ${fl('shirts.hold')}` : ''}</small>
              </button>
            </li>
          )
        })}
      </ul>
      {shirt ? (
        <section className="fl-shirt-sheet" aria-label={`${shirt.clubName} · ${shirtDateText(shirt)}`}>
          <div className="fl-shirt-sheet-pic"><ShirtThumb shirt={shirt} /></div>
          <div>
            <p className="mag-kicker">{shirt.clubName}</p>
            <h3>{shirtDateText(shirt)} · {shirt.variantHe}</h3>
            <HaveWantBar slug={shirt.slug} kitId={shirt.kitId} dateLabel={shirtDateText(shirt)} variantHe={shirt.variant === 'home' ? null : shirt.variantHe} signal={signals[shirt.slug]} onSignal={(next) => setSignals((p) => ({ ...p, [shirt.slug]: next }))} />
            <p className="fl-shirt-links"><Link href={`/market?slug=${encodeURIComponent(shirt.slug)}`}>{fl('shirts.market')} →</Link></p>
          </div>
        </section>
      ) : null}
    </>
  )
}
