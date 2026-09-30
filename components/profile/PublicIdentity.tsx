'use client'

import { useEffect, useState } from 'react'

import { t } from '@/lib/i18n'
import { syncPublicIdentity } from '@/lib/portal/public-sync'
import { NAME_MAX } from '@/lib/game/member'
import {
  cleanNickname,
  defaultPref,
  publicIdentity,
  readPref,
  setMode,
  writePref,
  type PublicMode,
  type PublicPref,
} from '@/lib/profile/identity'

/**
 * איך רואים אותך ביציע — the explicit anonymity toggle (ONE RED WORLD §35).
 *
 * The choice is written to the device first and always; with an account it syncs through
 * `worker_public_identity_set`, newest edit winning on both sides. The preview prints exactly
 * the label a stand or a group card would print — `publicIdentity()`, the same function they
 * call — so what you see here cannot differ from what they show. Nothing on this plate reads
 * the account's email or id; that stays on the account plate under "הפרטים".
 */
export function PublicIdentity() {
  const [pref, setPref] = useState<PublicPref>(defaultPref)
  const [draftMode, setDraftMode] = useState<PublicMode>('anonymous')
  const [draftNick, setDraftNick] = useState('')
  const [note, setNote] = useState<'saved' | 'need' | null>(null)

  useEffect(() => {
    const local = readPref()
    setPref(local)
    setDraftMode(local.mode)
    setDraftNick(local.nickname)
    let live = true
    void syncPublicIdentity().then((settled) => {
      if (!live || !settled) return
      setPref(settled)
      setDraftMode(settled.mode)
      setDraftNick(settled.nickname)
    })
    return () => {
      live = false
    }
  }, [])

  const preview = publicIdentity({ ...pref, mode: draftMode, nickname: cleanNickname(draftNick) })

  function save() {
    if (draftMode === 'nickname' && cleanNickname(draftNick) === '') {
      setNote('need')
      return
    }
    const next = setMode(pref, draftMode, draftNick)
    writePref(next)
    setPref(next)
    setNote('saved')
    void syncPublicIdentity().then((settled) => {
      if (settled) setPref(settled)
    })
  }

  const options: { id: PublicMode; label: string }[] = [
    { id: 'anonymous', label: t('personal.public.anon') },
    { id: 'nickname', label: t('personal.public.nickname') },
  ]

  return (
    <section aria-labelledby="public-identity-title" data-personal="public-identity" className="border-rule border-ink bg-sheet p-3 md:p-4">
      <h2 id="public-identity-title" className="font-display text-step-2 leading-none text-ink">
        {t('personal.public.title')}
      </h2>
      <p className="mt-2 max-w-prose font-body text-[12.5px] leading-snug text-muted">{t('personal.public.lede')}</p>

      <div role="radiogroup" aria-labelledby="public-identity-title" className="mt-3 grid grid-cols-2 border-rule border-ink">
        {options.map((option) => {
          const on = draftMode === option.id
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={on}
              data-mode={option.id}
              onClick={() => {
                setDraftMode(option.id)
                setNote(null)
              }}
              className={`min-h-tap px-3 font-body text-[14px] font-extrabold ${on ? 'bg-ink text-paper' : 'bg-paper text-ink'}`}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      {draftMode === 'nickname' && (
        <label className="mt-3 block">
          <span className="font-body text-[12px] font-extrabold text-ink">{t('personal.public.nicknameLabel')}</span>
          <input
            type="text"
            value={draftNick}
            maxLength={NAME_MAX}
            placeholder={t('personal.public.nicknamePlaceholder')}
            onChange={(event) => {
              setDraftNick(event.target.value)
              setNote(null)
            }}
            className="mt-1 block min-h-tap w-full border-rule border-ink bg-paper px-3 font-body text-[16px] text-ink"
          />
        </label>
      )}

      <p className="mt-3 flex flex-wrap items-baseline gap-x-2 border-t-hair border-ink/30 pt-2">
        <span className="font-body text-[12px] text-muted">{t('personal.public.preview')}</span>
        <span data-personal="public-label" className="font-display text-[24px] leading-none text-red">
          <bdi>{preview.label}</bdi>
        </span>
      </p>
      <p className="mt-1 font-body text-[11.5px] leading-snug text-muted">
        {pref.no === null ? t('personal.public.noNumber') : t('personal.public.hasNumber')}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          className="min-h-tap border-rule border-ink bg-red px-5 font-body text-[14px] font-extrabold text-paper transition-transform duration-press ease-stamp active:scale-[.98] motion-reduce:transition-none"
        >
          {t('personal.public.save')}
        </button>
        <p role="status" className="font-body text-[12.5px] font-bold text-ink">
          {note === 'saved' ? t('personal.public.saved') : note === 'need' ? t('personal.public.needNickname') : ''}
        </p>
      </div>
    </section>
  )
}
