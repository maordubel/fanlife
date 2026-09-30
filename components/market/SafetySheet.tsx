'use client'

import { useState } from 'react'

import { useDialog } from '@/components/ui/useDialog'
import { block, report } from '@/lib/collector/api'
import { errorLabel, handleLabel } from '@/lib/collector/labels'
import type { CollectorLabel } from '@/lib/collector/types'
import { t, type MessageKey } from '@/lib/i18n'

type Reason = 'scam' | 'fake' | 'abuse' | 'spam' | 'other'

const REASONS: { value: Reason; key: MessageKey }[] = [
  { value: 'scam', key: 'market.report.reason.scam' },
  { value: 'fake', key: 'market.report.reason.fake' },
  { value: 'abuse', key: 'market.report.reason.abuse' },
  { value: 'spam', key: 'market.report.reason.spam' },
  { value: 'other', key: 'market.report.reason.other' },
]

/**
 * דווח · חסום (מפרט §21) — a sheet from the foot of the screen, above the tab bar (rule 33). A
 * report goes to the team with the connection or the copy it is about; a block is by collector
 * number and closes every open conversation between the two (`worker_block_set`).
 */
export function SafetySheet({
  mode,
  who,
  target,
  onClose,
  onDone,
}: {
  mode: 'report' | 'block'
  who: CollectorLabel
  target: { connectionId?: string; itemId?: string; lotId?: string }
  onClose: () => void
  onDone?: (mode: 'report' | 'block') => void
}) {
  const ref = useDialog<HTMLDivElement>(onClose)
  const [reason, setReason] = useState<Reason>('scam')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const name = handleLabel(who)
  const titleId = `safety-${mode}`

  const submit = async () => {
    setBusy(true)
    setError(null)
    const out =
      mode === 'report'
        ? await report({
            reason,
            details: details.trim() || undefined,
            connectionId: target.connectionId,
            itemId: target.connectionId ? undefined : target.itemId,
            lotId: target.connectionId || target.itemId ? undefined : target.lotId,
          })
        : await block(who.handle, true)
    setBusy(false)
    if (!out.ok) {
      setError(errorLabel(out.error))
      return
    }
    setDone(mode === 'report' ? t('market.report.sent') : t('market.block.done', { who: name }))
    onDone?.(mode)
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      className="fixed inset-0 z-[60] flex flex-col items-center bg-ink/60 outline-none"
    >
      <button type="button" aria-label={t('market.dialog.close')} className="min-h-tap w-full flex-1" onClick={onClose} />
      <div className="max-h-[88dvh] w-full max-w-md animate-sheet-in overflow-y-auto overscroll-contain border-plate border-ink bg-sheet p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:mb-[12vh]">
        <p id={titleId} className="font-display text-step-2 leading-tight text-ink">
          {mode === 'report' ? t('market.report.title') : t('market.block.title', { who: name })}
        </p>
        {done ? (
          <p role="status" className="mt-3 font-body text-step--1 leading-relaxed text-ink">
            {done}
          </p>
        ) : mode === 'report' ? (
          <>
            <fieldset className="mt-3">
              <legend className="font-body text-step--1 font-extrabold text-ink">{t('market.report.reason')}</legend>
              <div className="mt-1.5 flex flex-col gap-1">
                {REASONS.map((row) => (
                  <label key={row.value} className="flex min-h-tap cursor-pointer items-center gap-3 border-hair border-ink/30 bg-paper px-3 font-body text-step--1 text-ink">
                    <input
                      type="radio"
                      name="market-report-reason"
                      value={row.value}
                      checked={reason === row.value}
                      onChange={() => setReason(row.value)}
                      className="h-4 w-4 accent-red"
                    />
                    {t(row.key)}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="mt-3 block font-body text-step--1 font-extrabold text-ink">
              {t('market.report.details')}
              <textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                maxLength={1000}
                rows={3}
                className="mt-1 block w-full border-rule border-ink bg-paper p-2 font-body text-step--1 font-normal text-ink"
              />
            </label>
          </>
        ) : (
          <p className="mt-3 font-body text-step--1 leading-relaxed text-ink">{t('market.block.body')}</p>
        )}
        {error ? (
          <p role="alert" className="mt-3 font-body text-step--1 font-bold text-red">
            {error}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {done ? null : (
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy}
              className="min-h-tap border-rule border-ink bg-red px-4 font-body text-step--1 font-extrabold text-paper disabled:opacity-60"
            >
              {mode === 'report' ? t('market.report.send') : t('market.block.confirm')}
            </button>
          )}
          <button type="button" onClick={onClose} className="min-h-tap px-3 font-body text-step--1 font-extrabold text-sign underline underline-offset-4">
            {done ? t('market.dialog.close') : t('market.dialog.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}

/** The two quiet links that open the sheet — on a listing and on a conversation. */
export function SafetyLinks({ onReport, onBlock }: { onReport: () => void; onBlock: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4">
      <button type="button" onClick={onReport} className="min-h-tap font-body text-[12.5px] font-extrabold text-sign underline underline-offset-4">
        {t('market.report.cta')}
      </button>
      <button type="button" onClick={onBlock} className="min-h-tap font-body text-[12.5px] font-extrabold text-sign underline underline-offset-4">
        {t('market.block.cta')}
      </button>
    </div>
  )
}
