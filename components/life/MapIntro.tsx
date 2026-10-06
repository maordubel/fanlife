'use client'

import { useEffect, useRef, useState } from 'react'
import { t } from '@/lib/i18n'

/**
 * The game-start map: a schematic of south Tel Aviv, Pugi's home lit on it and the ground
 * far to the side, then the house "opens" and the atmosphere takes over. Drawn, not
 * measured — it states no street name, date or fact (rule 11); the year on the kicker is
 * the prologue's own, from the master timeline. Skippable, instant under reduced motion.
 */
export function MapIntro({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const done = useRef(false)
  const finish = () => {
    if (done.current) return
    done.current = true
    onDone()
  }
  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      finish()
      return
    }
    const timers = [window.setTimeout(() => setStep(1), 1600), window.setTimeout(() => setStep(2), 3600), window.setTimeout(finish, 6200)]
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter') finish()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      timers.forEach(window.clearTimeout)
      window.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-ink text-sheet" data-life="map-intro" role="dialog" aria-label={t('life98a.map.title')}>
      <p className="font-mono tabular-nums text-[12px] tracking-[0.3em] text-sheet/70">{t('life98a.map.kicker')}</p>
      <h2 className="mt-1 font-display text-3xl">{t('life98a.map.title')}</h2>
      <svg viewBox="0 0 320 320" className="mt-4 h-[52dvh] max-h-[420px] w-[86vw] max-w-[420px]" aria-hidden="true">
        <rect x="8" y="8" width="304" height="304" fill="none" stroke="currentColor" strokeOpacity="0.25" />
        {/* the grid of streets */}
        {[60, 120, 180, 240].map((v) => (
          <g key={v} stroke="currentColor" strokeOpacity="0.22" strokeWidth="2">
            <line x1="8" y1={v} x2="312" y2={v + (v % 120 === 0 ? 14 : -10)} />
            <line x1={v + 10} y1="8" x2={v - 14} y2="312" />
          </g>
        ))}
        {/* the road east, drawn once the day has a direction */}
        <path
          d="M 96 226 C 150 200, 190 150, 250 96"
          fill="none"
          className="stroke-red"
          strokeWidth="3"
          strokeDasharray="6 7"
          style={{ opacity: step >= 1 ? 1 : 0, transition: 'opacity 900ms' }}
        />
        {/* the ground */}
        <g style={{ opacity: step >= 1 ? 1 : 0.15, transition: 'opacity 900ms' }}>
          <rect x="236" y="80" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="3" />
        </g>
        {/* home — the one lit window */}
        <g>
          <rect x="82" y="212" width="28" height="28" fill="currentColor" fillOpacity={step >= 2 ? 0.95 : 0.35} style={{ transition: 'fill-opacity 900ms' }} />
          <rect x="90" y="220" width="12" height="12" className="fill-red" style={{ opacity: step >= 2 ? 1 : 0, transition: 'opacity 700ms' }} />
        </g>
      </svg>
      <div className="mt-2 flex w-[86vw] max-w-[420px] justify-between text-[13px]">
        <span className="text-sheet/80">{t('life98a.map.home')}</span>
        <span className="text-sheet/80">{t('life98a.map.ground')}</span>
      </div>
      <p className="mt-4 min-h-[3rem] max-w-[86vw] text-center text-[15px]">{step >= 2 ? t('life98a.map.line2') : t('life98a.map.line1')}</p>
      <button type="button" onClick={finish} className="mt-4 min-h-tap min-w-[44px] border border-sheet px-5 font-sign text-sheet" data-life="map-intro-go">
        {step >= 2 ? t('life98a.map.go') : t('life98a.map.skip')}
      </button>
    </div>
  )
}
