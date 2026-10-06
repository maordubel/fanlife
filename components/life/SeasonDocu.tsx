'use client'

import { useEffect, useRef, useState } from 'react'
import { t } from '@/lib/i18n'

/**
 * A7's documentary cut: the season as three beats, then two rows of a table trading
 * places. It prints no score, no points and no date (rule 11); the swap is the picture.
 * Skippable, instant under reduced motion.
 */
export function SeasonDocu({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const done = useRef(false)
  const finish = () => {
    if (done.current) return
    done.current = true
    onDone()
  }
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      finish()
      return
    }
    const timers = [
      window.setTimeout(() => setStep(1), 1500),
      window.setTimeout(() => setStep(2), 3000),
      window.setTimeout(() => setStep(3), 4600),
      window.setTimeout(() => setStep(4), 6600),
      window.setTimeout(finish, 9000),
    ]
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
  const swapped = step >= 4
  const rows = [
    { key: 'haifa', top: swapped ? 1 : 0 },
    { key: 'hapoel', top: swapped ? 0 : 1 },
  ]
  return (
    <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-ink text-sheet" data-life="season-docu" role="dialog" aria-label={t('life98a.docu.title')}>
      <p className="font-mono tabular-nums text-[12px] tracking-[0.3em] text-sheet/70">{t('life98a.docu.kicker')}</p>
      <h2 className="mt-1 font-display text-3xl">{t('life98a.docu.title')}</h2>
      <ol className="mt-5 flex w-[86vw] max-w-[420px] flex-col gap-2 text-[15px]">
        {(['life98a.docu.s1', 'life98a.docu.s2', 'life98a.docu.s3'] as const).map((k, i) => (
          <li key={k} className="border-b border-sheet/25 pb-1" style={{ opacity: step > i ? 1 : 0.12, transition: 'opacity 700ms' }}>
            {t(k)}
          </li>
        ))}
      </ol>
      <div className="relative mt-6 h-[96px] w-[86vw] max-w-[420px]" style={{ opacity: step >= 3 ? 1 : 0, transition: 'opacity 700ms' }}>
        {rows.map((r) => (
          <div
            key={r.key}
            className={`absolute inset-x-0 h-[44px] border px-3 leading-[44px] ${r.key === 'hapoel' ? 'border-red bg-red text-sheet' : 'border-sheet/60 text-sheet'}`}
            style={{ transform: `translateY(${r.top * 52}px)`, transition: 'transform 1400ms cubic-bezier(.6,0,.2,1)' }}
          >
            {r.key === 'hapoel' ? t('life98a.docu.hapoel') : t('life98a.docu.haifa')}
          </div>
        ))}
      </div>
      <p className="mt-2 max-w-[86vw] text-center text-[13px] text-sheet/75" style={{ opacity: step >= 3 ? 1 : 0, transition: 'opacity 700ms' }}>{t('life98a.docu.table')}</p>
      <button type="button" onClick={finish} className="mt-5 min-h-tap min-w-[44px] border border-sheet px-5 font-sign text-sheet" data-life="season-docu-go">
        {swapped ? t('life98a.docu.next') : t('life98a.docu.skip')}
      </button>
    </div>
  )
}
