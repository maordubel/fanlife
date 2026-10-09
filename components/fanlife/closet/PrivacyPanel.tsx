'use client'
// FAN LIFE: hand-written (listed in HAND in scripts/fanlife/fork-economy.py) — never regenerated.

import { useState } from 'react'

import { errorLabel, handleLabel } from '@/lib/fanlife/collector/labels'
import type { Closet, CollectorError, IdentityMode, Visibility } from '@/lib/collector/types'
import { SITE_URL } from '@/lib/brand'
import { t, type MessageKey } from '@/lib/fanlife/i18n'

import type { ClosetApi } from '@/components/fanlife/closet/api'

/**
 * Two questions, kept apart because they are two different promises:
 *   1. HOW YOU APPEAR  — a number, a nickname you chose, or nothing at all (anonymous).
 *   2. WHO OPENS YOUR CLOSET — open · by link · private.
 *
 * They are tied together in exactly one place: anonymous. A closet with a link or a public page
 * would put every item under one anonymous face, which is a profile after all — so going anonymous
 * makes the closet private and kills the link in the SAME database call, and asks first.
 * The page never offers "anonymous" next to a shared closet without saying so.
 */
const OPTIONS: { value: Visibility; label: MessageKey; hint: MessageKey }[] = [
  { value: 'public', label: 'collector.privacy.public', hint: 'collector.privacy.public.hint' },
  { value: 'link_only', label: 'collector.privacy.link_only', hint: 'collector.privacy.link_only.hint' },
  { value: 'private', label: 'collector.privacy.private', hint: 'collector.privacy.private.hint' },
]

const MODES: { value: IdentityMode; label: MessageKey; hint: MessageKey }[] = [
  { value: 'number', label: 'collector.identity.number', hint: 'collector.identity.number.hint' },
  { value: 'nickname', label: 'collector.identity.nickname', hint: 'collector.identity.nickname.hint' },
  { value: 'anonymous', label: 'collector.identity.anonymous', hint: 'collector.identity.anonymous.hint' },
]

// Latin letters, digits, Hebrew letters (U+05D0–U+05EA), space, dot, underscore, dash — the database's own set
const NICK_OK = /^[A-Za-z0-9\u05D0-\u05EA _.-]+$/

/** The same three checks the database makes, so a typo is caught before the round trip. */
export function nicknameProblem(raw: string): CollectorError | null {
  const nick = raw.trim().replace(/\s+/g, ' ')
  if (nick.length < 3) return 'nick_short'
  if (nick.length > 20) return 'nick_long'
  if (!NICK_OK.test(nick) || !/[A-Za-z\u05D0-\u05EA]/.test(nick)) return 'nick_chars'
  return null
}

/** The path of the collector's closet as another person opens it — the token only when it is needed. Never for an anonymous collector. */
export function closetPath(profile: Closet['profile']): string | null {
  if (profile.visibility === 'private' || profile.identityMode === 'anonymous') return null
  const base = `/closet/${profile.handle}`
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
  const profile = closet.profile
  const current: IdentityMode = profile.identityMode ?? 'number'
  const [mode, setMode] = useState<IdentityMode>(current)
  const [nick, setNick] = useState(profile.nickname ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<CollectorError | null>(null)
  const [note, setNote] = useState<MessageKey | null>(null)
  const [confirming, setConfirming] = useState(false)
  const anonymous = current === 'anonymous'
  const path = closetPath(profile)
  const link = path ? `${SITE_URL}${path}` : null

  const draftNick = nick.trim().replace(/\s+/g, ' ')
  const who =
    mode === 'anonymous'
      ? handleLabel({ handle: null, nickname: null, anonymous: true })
      : mode === 'nickname'
        ? draftNick || t('collector.identity.nickname.field')
        : handleLabel({ handle: profile.handle, nickname: null })
  const problem = mode === 'nickname' && nick.length > 0 ? nicknameProblem(nick) : null
  const changed = mode !== current || (mode === 'nickname' && draftNick !== (profile.nickname ?? ''))

  async function save(confirm = false) {
    if (busy) return
    if (mode === 'nickname') {
      const early = nicknameProblem(nick)
      if (early) {
        setError(early)
        return
      }
    }
    setBusy(true)
    setError(null)
    setNote(null)
    const out = await api.identitySet(mode, mode === 'nickname' ? draftNick : null, confirm)
    setBusy(false)
    if (!out.ok) {
      if (out.error === 'confirm_private') {
        setConfirming(true)
        return
      }
      setConfirming(false)
      setError(out.error)
      return
    }
    setConfirming(false)
    onChange({
      ...profile,
      identityMode: out.identityMode,
      nickname: out.nickname,
      showNickname: out.identityMode === 'nickname',
      visibility: out.visibility as Visibility,
      shareToken: out.shareToken,
    })
    setNote('collector.identity.saved')
  }

  async function visibility(next: Visibility) {
    if (busy || anonymous) return
    setBusy(true)
    setError(null)
    setNote(null)
    const out = await api.settings({ visibility: next })
    setBusy(false)
    if (!out.ok) {
      setError(out.error)
      return
    }
    onChange({ ...profile, visibility: out.visibility as Visibility, showNickname: out.showNickname, shareToken: out.shareToken })
    setNote('collector.privacy.saved')
  }

  async function rotate() {
    if (busy) return
    setBusy(true)
    setError(null)
    const out = await api.settings({ rotateToken: true })
    setBusy(false)
    if (!out.ok) {
      setError(out.error)
      return
    }
    onChange({ ...profile, visibility: out.visibility as Visibility, shareToken: out.shareToken })
    setNote('collector.privacy.rotated')
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
    <div className="space-y-4">
      {/* ── 1 · how you appear ── */}
      <section aria-labelledby="identity-title" className="border-plate border-ink bg-sheet">
        <h2 id="identity-title" className="bg-ink px-3 py-2 font-display text-step-1 leading-none text-paper">
          {t('collector.identity.title')}
        </h2>
        <div className="space-y-3 p-3">
          <p className="font-body text-[12px] leading-snug text-muted">{t('collector.identity.intro')}</p>

          <fieldset disabled={busy}>
            <legend className="sr-only">{t('collector.identity.title')}</legend>
            <div className="grid gap-1.5">
              {MODES.map((option) => {
                const on = mode === option.value
                return (
                  <label
                    key={option.value}
                    className={`flex min-h-tap cursor-pointer items-start gap-2.5 border-rule px-3 py-2 ${on ? 'border-ink bg-paper' : 'border-ink/25 bg-sheet'}`}
                  >
                    <input
                      type="radio"
                      name="identity-mode"
                      value={option.value}
                      checked={on}
                      onChange={() => {
                        setMode(option.value)
                        setError(null)
                        setNote(null)
                      }}
                      className="mt-1 h-5 w-5 shrink-0 accent-red"
                    />
                    <span className="min-w-0">
                      <span className="block font-body text-step--1 font-extrabold text-ink">{t(option.label)}</span>
                      <span className="block font-body text-[11.5px] leading-snug text-muted">
                        {option.value === 'number'
                          ? t(option.hint, { handle: handleLabel({ handle: profile.handle, nickname: null }) })
                          : t(option.hint)}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          {mode === 'nickname' ? (
            <label className="block">
              <span className="font-body text-step--1 font-extrabold text-ink">{t('collector.identity.nickname.field')}</span>
              <input
                type="text"
                value={nick}
                maxLength={24}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                disabled={busy}
                aria-invalid={problem ? true : undefined}
                aria-describedby="nick-rules"
                onChange={(event) => {
                  setNick(event.target.value)
                  setError(null)
                  setNote(null)
                }}
                className={`mt-1 block min-h-tap w-full border-rule bg-paper px-3 font-body text-step-0 text-ink ${problem ? 'border-red' : 'border-ink'}`}
              />
              <span id="nick-rules" className={`mt-1 block font-body text-[11.5px] leading-snug ${problem ? 'font-bold text-red' : 'text-muted'}`}>
                {problem ? errorLabel(problem) : t('collector.identity.nickname.rules')}
              </span>
            </label>
          ) : null}

          {mode === 'anonymous' || anonymous ? (
            <p className="font-body text-[11.5px] leading-snug text-muted">{t('collector.identity.anonymous.extra')}</p>
          ) : null}

          {/* what another collector sees, with the choice applied */}
          <div className="border-hair border-dashed border-ink/50 bg-paper p-3" aria-live="polite">
            <p className="font-body text-[11px] font-extrabold tracking-wide text-muted">{t('collector.identity.sample')}</p>
            <p className="mt-1 font-display text-step-1 leading-tight text-ink">{t('collector.identity.sample.line', { who })}</p>
            <p className="mt-0.5 font-body text-[11.5px] leading-snug text-muted">{t('collector.identity.sample.sub')}</p>
          </div>

          <button
            type="button"
            onClick={() => void save()}
            disabled={busy || !changed || Boolean(problem) || (mode === 'nickname' && !draftNick)}
            className="min-h-tap w-full border-rule border-ink bg-ink px-3 font-body text-step--1 font-extrabold text-paper disabled:opacity-40"
          >
            {t('collector.identity.save')}
          </button>

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

      {/* ── 2 · who opens your closet ── */}
      <section aria-labelledby="privacy-title" className="border-plate border-ink bg-sheet">
        <h2 id="privacy-title" className="bg-ink px-3 py-2 font-display text-step-1 leading-none text-paper">
          {t('collector.privacy.title')}
        </h2>
        <div className="space-y-3 p-3">
          <fieldset disabled={busy || anonymous}>
            <legend className="sr-only">{t('collector.privacy.title')}</legend>
            <div className="grid gap-1.5">
              {OPTIONS.map((option) => {
                const on = profile.visibility === option.value
                return (
                  <label
                    key={option.value}
                    className={`flex min-h-tap items-start gap-2.5 border-rule px-3 py-2 ${anonymous ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'} ${on ? 'border-ink bg-paper' : 'border-ink/25 bg-sheet'}`}
                  >
                    <input
                      type="radio"
                      name="closet-visibility"
                      value={option.value}
                      checked={on}
                      onChange={() => void visibility(option.value)}
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
          <p className="font-body text-[11.5px] leading-snug text-muted">{anonymous ? t('collector.privacy.locked') : t('collector.privacy.consequence')}</p>

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
                    onClick={() => void rotate()}
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
        </div>
      </section>

      {confirming ? (
        <div role="dialog" aria-modal="true" aria-labelledby="anon-title" className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/60 p-3 sm:items-center">
          <div className="w-full max-w-sm border-plate border-ink bg-paper p-4">
            <h3 id="anon-title" className="font-display text-step-2 leading-none text-ink">
              {t('collector.identity.confirm.title')}
            </h3>
            <p className="mt-2 font-body text-step-0 leading-snug text-ink">{t('collector.identity.confirm.body')}</p>
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={() => void save(true)}
                disabled={busy}
                className="min-h-tap border-rule border-ink bg-ink px-3 font-body text-step--1 font-extrabold text-paper disabled:opacity-50"
              >
                {t('collector.identity.confirm.yes')}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="min-h-tap border-rule border-ink bg-paper px-3 font-body text-step--1 font-extrabold text-ink"
              >
                {t('collector.identity.confirm.no')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
