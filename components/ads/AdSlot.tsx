'use client'

import { useEffect, useRef, useState } from 'react'

import { ADSENSE_CLIENT, type AdPlacement } from '@/lib/ads'
import { t } from '@/lib/i18n'

/**
 * יחידת פרסום — one AdSense unit, and the furniture that stops it doing damage.
 *
 * Four things this does that a pasted AdSense snippet does not:
 *
 * 1. **It reserves its height before the script answers.** An ad that arrives late into
 *    a zero-height box shoves everything under it down — and on a phone that means the
 *    button a thumb was already moving toward is somewhere else by the time it lands.
 *    The box is the ad's height from the first paint, empty or full.
 *
 * 2. **And it gives that height back when the answer is "nothing".** AdSense marks an
 *    unsold slot `data-ad-status="unfilled"` and leaves the box empty. Reserving space
 *    for an ad that is coming is layout hygiene; holding 280px of labelled emptiness
 *    open forever is just a hole in the page — and on the result screen that hole sat
 *    between the score and the share button. Once the network has answered, the slot
 *    either has an ad in it or it is gone. Both readings of rule 28 are satisfied:
 *    nothing reflows while the answer is pending, and nothing is reserved after it.
 *
 * 3. **It is labelled.** A block of unmarked commercial content inside a page about a
 *    football club's history is the kind of thing that makes a reader distrust the page
 *    around it. One small line in the press voice, and the unit is honest furniture.
 *
 * 4. **It is framed like everything else here.** An ad in a default browser box on a
 *    screenprinted sheet reads as damage. It gets the same ink rule, the same cream
 *    ground and the same zero radius as every other plate, so it sits inside the design
 *    instead of on top of it.
 *
 * The `useRef` guard matters in development: React 18 runs effects twice under Strict
 * Mode, and pushing the same slot to AdSense twice throws "already have ads in them".
 */

/** How long the box waits for the network before it decides nothing is coming. */
const VERDICT_MS = 4000

export function AdSlot({ placement }: { placement: AdPlacement }) {
  const pushed = useRef(false)
  const unit = useRef<HTMLModElement>(null)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    if (pushed.current) return
    pushed.current = true
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] }
      w.adsbygoogle = w.adsbygoogle || []
      w.adsbygoogle.push({})
    } catch {
      // a blocked or failed ad is a smaller problem than a thrown render
    }

    // Unfilled, blocked, or never loaded at all — all three look the same to the page,
    // and all three mean the same thing: take the space back.
    const timer = window.setTimeout(() => {
      const el = unit.current
      if (!el) return setGone(true)
      const filled = el.dataset.adStatus === 'filled' && el.getBoundingClientRect().height > 8
      if (!filled) setGone(true)
    }, VERDICT_MS)

    return () => window.clearTimeout(timer)
  }, [])

  if (gone) return null

  const height = placement === 'result' ? 'min-h-[280px]' : 'min-h-[130px]'

  return (
    <aside
      aria-label={t('ad.label')}
      className={`mt-stack border-rule border-ink bg-sheet ${height}`}
    >
      <p className="border-b-hair border-ink/30 px-3 py-1 font-body text-[10px] tracking-widest text-muted">
        {t('ad.label')}
      </p>
      <ins
        ref={unit}
        className="adsbygoogle block"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  )
}
