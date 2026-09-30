'use client'

import { useEffect, useState } from 'react'

import { DONATION_AMOUNTS_EUR, donateUrl } from '@/lib/collector/donate'
import { t } from '@/lib/i18n'

/**
 * כרטיס ההצלחה — אחרי עסקה שהושלמה בלבד, פעם אחת, ובלי ללחוץ (מפרט §51–§57).
 *
 * "לא עכשיו" נזכר במכשיר הזה (נוחות של צופה אחד, `localStorage`), כדי שהכרטיס לא יחזור על
 * אותה עסקה. אין כאן שום קשר לסכום העסקה, לשוק או להתאמות — הכרטיס לא יודע עליהם כלום.
 */
export function DonationCard({ dealKey }: { dealKey: string }) {
  const storageKey = `the-worker:donate:${dealKey}`
  const [hidden, setHidden] = useState(true)
  useEffect(() => {
    try {
      setHidden(window.localStorage.getItem(storageKey) === 'later')
    } catch {
      setHidden(false)
    }
  }, [storageKey])
  if (hidden) return null
  const later = () => {
    try {
      window.localStorage.setItem(storageKey, 'later')
    } catch {
      // private mode: the card simply closes for this visit
    }
    setHidden(true)
  }
  const other = donateUrl()
  return (
    <section className="border-plate border-ink bg-sheet p-4" aria-labelledby={`donate-${dealKey}`}>
      <p id={`donate-${dealKey}`} className="font-display text-step-2 leading-tight text-ink">
        {t('collector.donate.title')}
      </p>
      <p className="mt-2 max-w-prose font-body text-step--1 leading-relaxed text-ink">{t('collector.donate.body')}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {other
          ? DONATION_AMOUNTS_EUR.map((amount) => (
              <a
                key={amount}
                href={donateUrl(amount) ?? other}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-tap items-center border-rule border-ink bg-red px-4 font-poster text-step-1 text-paper"
              >
                {t('collector.donate.amount', { n: String(amount) })}
              </a>
            ))
          : null}
        {other ? (
          <a
            href={other}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-tap items-center border-rule border-ink px-4 font-body text-step--1 font-extrabold text-ink"
          >
            {t('collector.donate.other')}
          </a>
        ) : null}
        <button type="button" onClick={later} className="min-h-tap px-2 font-body text-step--1 text-sign underline underline-offset-4">
          {t('collector.donate.later')}
        </button>
      </div>
      <p className="mt-3 font-body text-[11.5px] leading-snug text-muted">{t('collector.donate.private')}</p>
    </section>
  )
}
