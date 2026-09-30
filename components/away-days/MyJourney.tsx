'use client'

import { useMemo, useState } from 'react'

import { SlideSheet } from '@/components/stage/SlideSheet'
import { myJourney, isBeen, type BeenLedger } from '@/lib/away-days/been'
import type { JourneyData } from '@/lib/away-days/journey'
import { SITE_URL } from '@/lib/brand'
import { t } from '@/lib/i18n'
import { formatDate } from './VisitCard'

/**
 * המסע שלי עם הפועל — the supporter's own count (spec §30): countries, grounds, matches,
 * over the PUBLIC journey only, and a share line that says it in one sentence.
 * Sharing is the system's own way out (Web Share, WhatsApp, copy) — no new channel.
 */
export function shareLine(n: { countries: number; stadiums: number; matches: number }): string {
  return t('away89.share.line', { countries: String(n.countries), stadiums: String(n.stadiums), matches: String(n.matches) })
}

export function MyJourney({
  open,
  onClose,
  data,
  ledger,
  onVisit,
}: {
  open: boolean
  onClose: () => void
  data: JourneyData
  ledger: BeenLedger
  /** jump the journey to a ticked visit */
  onVisit?: (visitId: string) => void
}) {
  const sum = useMemo(() => myJourney(data, ledger), [data, ledger])
  const ticked = useMemo(() => data.visits.filter((v) => isBeen(ledger, v.id)), [data, ledger])
  const [note, setNote] = useState<string | null>(null)
  const url = `${SITE_URL}/away-days?from=share`
  const text = shareLine(sum)

  async function share() {
    setNote(null)
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ text, url })
        return
      }
    } catch {
      return // the sheet was dismissed — nothing to say
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank', 'noopener,noreferrer')
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`)
      setNote(t('away89.share.copied'))
    } catch {
      setNote(t('away89.share.copyFailed'))
    }
  }

  const stats = [
    { n: sum.countries, label: t('away89.mine.countries') },
    { n: sum.stadiums, label: t('away89.mine.stadiums') },
    { n: sum.matches, label: t('away89.mine.matches') },
  ]

  return (
    <SlideSheet open={open} onClose={onClose} title={t('away89.mine.title')} latin="MY AWAY DAYS" size="auto">
      <div>
        <div className="grid grid-cols-3 border-rule border-ink bg-sheet">
          {stats.map((s, i) => (
            <div key={s.label} className={`px-2 py-2.5 text-center ${i > 0 ? 'border-s border-ink/20' : ''}`}>
              <p className="relative font-poster text-[46px] leading-none tabular-nums">
                <span aria-hidden="true" className="plate-shift absolute inset-0 text-concrete">
                  {s.n}
                </span>
                <span className="plate-top relative text-red">{s.n}</span>
              </p>
              <p className="mt-1 font-sign text-[13px] text-ink">{s.label}</p>
            </div>
          ))}
        </div>
        {sum.matches === 0 ? (
          <p className="mt-3 font-body text-[13px] leading-snug text-muted">{t('away89.mine.empty')}</p>
        ) : (
          <>
            {sum.first !== null && sum.last !== null && (
              <p className="mt-2 font-body text-[12px] text-muted">
                {sum.first === sum.last ? t('away89.mine.oneYear', { y: String(sum.first) }) : t('away89.mine.span', { from: String(sum.first), to: String(sum.last) })}
              </p>
            )}
            <p className="mt-2 border-s-plate border-red bg-paper px-2.5 py-2 font-body text-[13px] font-extrabold leading-snug text-ink">{text}</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => void share()}
                className="flex min-h-tap flex-1 items-center justify-center bg-red px-3 font-body text-step--1 font-extrabold text-paper transition-transform duration-press ease-stamp active:scale-[.97] motion-reduce:transition-none"
              >
                {t('away89.share.cta')}
              </button>
              <button
                type="button"
                onClick={() => void copy()}
                className="min-h-tap shrink-0 border-hair border-ink/40 bg-paper px-3 font-body text-[12px] font-extrabold text-ink"
              >
                {t('away89.share.copy')}
              </button>
            </div>
            {note && (
              <p className="mt-1.5 font-body text-[11.5px] text-muted" role="status">
                {note}
              </p>
            )}
            <p className="mt-3 font-sign text-[13px] text-sign" data-away="journey-count">
              {t('away89.mine.ticked', { n: String(ticked.length), total: String(data.visits.length) })}
            </p>
            <ul className="mt-1.5 max-h-[34dvh] divide-y divide-ink/10 overflow-y-auto border-y border-ink/15">
              {ticked.map((v) => {
                const venue = data.venues[v.venueId]
                return (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => onVisit?.(v.id)}
                      className="flex min-h-tap w-full items-center justify-between gap-2 px-1 text-start font-body text-[12.5px] text-ink"
                    >
                      <span className="min-w-0 truncate">
                        <span aria-hidden="true" className="me-1.5 text-red">✓</span>
                        {v.opponentHe} <span className="text-muted">· {venue?.cityHe}</span>
                      </span>
                      <span dir="ltr" className="shrink-0 font-mono text-[11px] tabular-nums text-muted">
                        {formatDate(v.playedOn)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    </SlideSheet>
  )
}
