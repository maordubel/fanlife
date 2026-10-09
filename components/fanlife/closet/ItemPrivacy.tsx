'use client'
// FAN LIFE: hand-written (not in the fork map) — what an item shows, and the one reminder before it goes public.

import { useState } from 'react'

import { errorLabel } from '@/lib/fanlife/collector/labels'
import type { CollectorError, OwnerItem } from '@/lib/collector/types'
import { t } from '@/lib/fanlife/i18n'

import type { ClosetApi } from '@/components/fanlife/closet/api'

/**
 * "Show in my closet" — the closet shows a SELECTION the collector chose. A copy open for sale or
 * swap is in the market regardless; this switch is for the ones that are only on display.
 * Below it, once, the reminder of how the listing appears: no new privacy form per upload.
 */
export function ItemPrivacy({ item, api, publishing, editable }: { item: OwnerItem; api: ClosetApi; publishing: boolean; editable: boolean }) {
  const [on, setOn] = useState(Boolean(item.inDisplay))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<CollectorError | null>(null)

  async function toggle() {
    if (busy || !editable) return
    setBusy(true)
    setError(null)
    const out = await api.displaySet([item.id], !on)
    setBusy(false)
    if (!out.ok) {
      setError(out.error)
      return
    }
    setOn(out.on)
  }

  return (
    <div className="mt-3 space-y-2 border-t-hair border-ink/30 pt-3">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={busy || !editable}
        onClick={() => void toggle()}
        className={`flex min-h-tap w-full items-center gap-3 border-rule px-3 py-2 text-start disabled:opacity-60 ${on ? 'border-ink bg-paper' : 'border-ink/30 bg-sheet'}`}
      >
        <span aria-hidden="true" className={`flex h-6 w-6 shrink-0 items-center justify-center border-rule font-body text-[14px] font-black ${on ? 'border-ink bg-ink text-paper' : 'border-ink'}`}>
          {on ? '✓' : ''}
        </span>
        <span className="min-w-0">
          <span className="block font-body text-step--1 font-extrabold text-ink">{on ? t('collector.display.on') : t('collector.display.off')}</span>
          <span className="block font-body text-[11.5px] leading-snug text-muted">{t('collector.display.hint')}</span>
        </span>
      </button>
      {error ? (
        <p role="alert" className="font-body text-step--1 font-bold text-red">
          {errorLabel(error)}
        </p>
      ) : null}
      {publishing ? (
        <div className="border-hair border-dashed border-ink/50 bg-paper p-3">
          <p className="font-body text-[11px] font-extrabold tracking-wide text-muted">{t('collector.reminder.title')}</p>
          <p className="mt-1 font-body text-[12px] leading-snug text-ink">{t('collector.reminder.body')}</p>
          <a href="/closet#identity-title" className="mt-1 inline-flex min-h-tap items-center font-body text-step--1 font-extrabold text-sign underline underline-offset-4">
            {t('collector.reminder.link')}
          </a>
        </div>
      ) : null}
    </div>
  )
}
