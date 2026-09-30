'use client'

import { useId, useState, type ReactNode } from 'react'

import { t } from '@/lib/i18n'
import { useDialog } from '@/components/ui/useDialog'

/**
 * "למה?" — כל פעולה רגישה של מנהל מבקשת סיבה, והסיבה נשמרת עם הפעולה (מפרט §65).
 * `role="dialog"` מעל סרגל הניווט (כלל 33), והאישור כבוי עד שנכתבה סיבה.
 */
export function ReasonDialog({
  title,
  body,
  confirm,
  reason: mode = 'required',
  children,
  onConfirm,
  onClose,
}: {
  title: string
  body?: string
  confirm: string
  /** `none`: a confirmation only, where the database stores no reason; `optional`: asked, not demanded */
  reason?: 'required' | 'optional' | 'none'
  children?: ReactNode
  onConfirm: (reason: string) => void | Promise<void>
  onClose: () => void
}) {
  const ref = useDialog<HTMLDivElement>(onClose)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const id = useId()
  const ready = mode !== 'required' || reason.trim().length >= 3
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/60 p-3 md:items-center" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="z-[60] w-full max-w-md border-plate border-ink bg-sheet p-4"
      >
        <p id={`${id}-title`} className="font-display text-step-2 leading-tight text-ink">
          {title}
        </p>
        {body ? <p className="mt-2 font-body text-step--1 leading-relaxed text-ink">{body}</p> : null}
        {children}
        {mode === 'none' ? null : (
          <label className="mt-3 block font-body text-step--1 font-extrabold text-ink">
            {mode === 'required' ? t('admin.reason.label') : t('admin.reason.optional')}
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              maxLength={500}
              className="mt-1 block w-full border-rule border-ink bg-paper p-2 font-body text-step-0 font-normal text-ink"
            />
          </label>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!ready || busy}
            onClick={async () => {
              setBusy(true)
              try {
                await onConfirm(reason.trim())
              } finally {
                setBusy(false)
              }
            }}
            className="min-h-tap border-rule border-ink bg-red px-4 font-body text-step--1 font-extrabold text-paper disabled:opacity-40"
          >
            {confirm}
          </button>
          <button type="button" onClick={onClose} className="min-h-tap px-3 font-body text-step--1 text-sign underline underline-offset-4">
            {t('admin.reason.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
