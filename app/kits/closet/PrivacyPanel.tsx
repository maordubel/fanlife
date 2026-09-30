'use client'

import { useState } from 'react'

import { errorLabel, handleLabel } from '@/lib/collector/labels'
import type { Closet, CollectorError, Visibility } from '@/lib/collector/types'
import { SITE_URL } from '@/lib/brand'
import { t, type MessageKey } from '@/lib/i18n'

import type { ClosetApi } from './api'

/**
 * מי רואה את הארון (מפרט §19–§20): פתוח · בקישור · פרטי, כינוי או "אספן #N", והחלפת הקישור.
 *
 * כל אפשרות אומרת במשפט אחד מה היא עושה. "פרטי" אומר גם מה הוא לא עושה — עותק שנפתח בשוק
 * נשאר בשוק — כי אספן שבחר "פרטי" ואז מצא את החולצה שלו ברשימה ירגיש שהמערכת שיקרה לו.
 */
const OPTIONS: { value: Visibility; label: MessageKey; hint: MessageKey }[] = [
  { value: 'public', label: 'collector.privacy.public', hint: 'collector.privacy.public.hint' },
  { value: 'link_only', label: 'collector.privacy.link_only', hint: 'collector.privacy.link_only.hint' },
  { value: 'private', label: 'collector.privacy.private', hint: 'collector.privacy.private.hint' },
]

/** The path of the collector's closet as another person opens it — the token only when it is needed. */
export function closetPath(profile: Closet['profile']): string | null {
  if (profile.visibility === 'private') return null
  const base = `/kits/closet/${profile.handle}`
  return profile.visibility === 'link_only' ? `${base}?t=${encodeURIComponent(profile.shareToken)}` : base
}

export function PrivacyPanel({
  closet,
  api,
  onChange,
}: {
  closet: Closet
  api: ClosetApi
  onChange: (profile: Closet['profile']) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<CollectorError | null>(null)
  const [note, setNote] = useState<MessageKey | null>(null)
  const profile = closet.profile
  const path = closetPath(profile)
  const link = path ? `${SITE_URL}${path}` : null

  async function apply(patch: { visibility?: Visibility; showNickname?: boolean; rotateToken?: boolean }, done: MessageKey) {
    if (busy) return
    setBusy(true)
    setError(null)
    setNote(null)
    const out = await api.settings(patch)
    setBusy(false)
    if (!out.ok) {
      setError(out.error)
      return
    }
    onChange({ ...profile, visibility: out.visibility as Visibility, showNickname: out.showNickname, shareToken: out.shareToken })
    setNote(done)
  }

  async function copy() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setNote('collector.privacy.copied')
    } catch {
      setNote('share.failed')
    }
  }

  return (
    <section aria-labelledby="privacy-title" className="border-plate border-ink bg-sheet">
      <h2 id="privacy-title" className="bg-ink px-3 py-2 font-display text-step-1 leading-none text-paper">
        {t('collector.privacy.title')}
      </h2>
      <div className="space-y-3 p-3">
        <fieldset disabled={busy}>
          <legend className="sr-only">{t('collector.privacy.title')}</legend>
          <div className="grid gap-1.5">
            {OPTIONS.map((option) => {
              const on = profile.visibility === option.value
              return (
                <label
                  key={option.value}
                  className={`flex min-h-tap cursor-pointer items-start gap-2.5 border-rule px-3 py-2 ${on ? 'border-ink bg-paper' : 'border-ink/25 bg-sheet'}`}
                >
                  <input
                    type="radio"
                    name="closet-visibility"
                    value={option.value}
                    checked={on}
                    onChange={() => void apply({ visibility: option.value }, 'collector.privacy.saved')}
                    className="mt-1 h-5 w-5 shrink-0 accent-red"
                  />
                  <span className="min-w-0">
                    <span className="block font-body text-step--1 font-extrabold text-ink">{t(option.label)}</span>
                    <span className="block font-body text-[11.5px] leading-snug text-muted">{t(option.hint)}</span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <label className="flex min-h-tap cursor-pointer items-start gap-2.5 border-t-hair border-ink/30 pt-3">
          <input
            type="checkbox"
            checked={profile.showNickname}
            disabled={busy}
            onChange={(event) => void apply({ showNickname: event.target.checked }, 'collector.privacy.saved')}
            className="mt-1 h-5 w-5 shrink-0 accent-red"
          />
          <span className="min-w-0">
            <span className="block font-body text-step--1 font-extrabold text-ink">{t('collector.privacy.nickname')}</span>
            <span className="block font-body text-[11.5px] leading-snug text-muted">
              {t('collector.privacy.nickname.hint', { handle: handleLabel({ handle: profile.handle, nickname: null }) })}
            </span>
          </span>
        </label>

        <div className="border-t-hair border-ink/30 pt-3">
          <p className="font-body text-[11px] font-extrabold tracking-wide text-muted">{t('collector.privacy.link')}</p>
          {link ? (
            <>
              <p className="mt-1 break-all border-hair border-ink/30 bg-paper px-2 py-1.5 font-mono text-[11.5px] tabular-nums text-ink" dir="ltr">
                {link}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => void copy()} className="min-h-tap border-rule border-ink bg-paper px-2 font-body text-step--1 font-extrabold text-ink">
                  {t('collector.privacy.copy')}
                </button>
                <button
                  type="button"
                  onClick={() => void apply({ rotateToken: true }, 'collector.privacy.rotated')}
                  disabled={busy || profile.visibility !== 'link_only'}
                  className="min-h-tap border-rule border-ink/40 bg-sheet px-2 font-body text-step--1 font-extrabold text-ink disabled:opacity-40"
                >
                  {t('collector.privacy.rotate')}
                </button>
              </div>
            </>
          ) : (
            <p className="mt-1 font-body text-[12px] leading-snug text-muted">{t('collector.privacy.none')}</p>
          )}
        </div>

        {error ? (
          <p role="alert" className="font-body text-step--1 font-bold text-red">
            {errorLabel(error)}
          </p>
        ) : note ? (
          <p role="status" className="font-body text-step--1 font-bold text-sign">
            {t(note)}
          </p>
        ) : null}
      </div>
    </section>
  )
}
