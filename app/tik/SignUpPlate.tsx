'use client'

import { useState } from 'react'

import { Num } from '@/components/ui/Num'
import { portalConfigured } from '@/lib/portal/env'
import { forgetDevice } from '@/lib/profile/summary'
import { t } from '@/lib/i18n'

/**
 * לשמור את הכרטיס — the one place this product asks for anything.
 *
 * Maor asked for a personal area that makes people want to register. The temptation is
 * to build the usual machine: put a mode behind a login, make a rank unlock something,
 * make a streak hurt when it breaks. All of that works and all of it is on this
 * project's banned list — no energy, no timers, no daily-login pressure — because the
 * game is supposed to be the reason to come back.
 *
 * So the plate does the honest version, which happens to be the stronger one here:
 * **it states what you have and where it lives.** Everything on the card above is real,
 * it took real evenings, and it is sitting in one browser's local storage. Clear your
 * history, change your phone, open it on a laptop, and it is gone. That sentence is
 * true, it is the actual reason an account exists, and it does not require taking
 * anything away from anybody to be persuasive.
 *
 * **The form is wired, not decorative.** With `NEXT_PUBLIC_WEB3FORMS_KEY` set — the same
 * service dubelteam.com's own forms post to — the address goes to a real inbox and the
 * plate confirms it. Without the key it falls back to a prepared mail, which works on
 * every device and needs no service at all. What it never does is pretend: if there is
 * nowhere to send an address, the plate says registration is not open yet rather than
 * collecting one into a `console.log`.
 *
 * The reset lives here too, under the sign-up rather than in a settings menu, because
 * this is the screen that explains what is stored — and a screen that explains what it
 * keeps should be the screen that lets you take it back.
 *
 * **Once accounts exist, the waiting list is gone (21.9.2026).** With Supabase keys set,
 * `AccountPlate` above is the save — Google, one button, the only auth this product has —
 * and a second plate collecting e-mail addresses for "when registration opens" would be
 * a promise about a door that is already open (brief §20: no second auth stack, no e-mail
 * issue). The plate then says only what lives on this device, and keeps the reset.
 */

const FORM_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_KEY ?? ''

type State = 'idle' | 'sending' | 'done' | 'failed'

export function SignUpPlate({
  figures,
  collections,
}: {
  figures: { correct: number; plays: number; days: number; streak: number; gates: number }
  collections: number
}) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [wiped, setWiped] = useState(false)

  const worthKeeping = figures.plays > 0 || collections > 0
  const accounts = portalConfigured()

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (FORM_KEY === '' || email.trim() === '') return
    setState('sending')
    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: FORM_KEY,
          subject: t('member.signupSubject'),
          email: email.trim(),
          // The figures go with it because they are the reason the person asked, and
          // because a waiting list that cannot tell a first-time visitor from somebody
          // with forty evenings in it is a list nobody can act on.
          rounds: figures.plays,
          days: figures.days,
          gates: figures.gates,
        }),
      })
      setState(response.ok ? 'done' : 'failed')
    } catch {
      setState('failed')
    }
  }

  return (
    <section className="mt-stack border-plate border-red bg-sheet" aria-labelledby="member-signup">
      <div className="bg-red px-4 py-2.5">
        <h2 id="member-signup" className="font-display text-step-2 leading-none text-paper">
          {accounts ? t('tik.card.deviceTitle') : t('member.signup')}
        </h2>
      </div>

      <div className="p-4">
        {worthKeeping && (
          <p className="font-body text-step-0 leading-relaxed text-ink">
            <Num className="font-poster text-[20px] text-red">{figures.correct}</Num>{' '}
            {t('member.correct')}
            {' · '}
            <Num className="font-poster text-[20px] text-red">{figures.days}</Num>{' '}
            {t('member.days')}
            {collections > 0 && (
              <>
                {' · '}
                <Num className="font-poster text-[20px] text-red">{collections}</Num>{' '}
                {t('member.collections')}
              </>
            )}
          </p>
        )}
        <p className={`${worthKeeping ? 'mt-2' : ''} max-w-prose font-body text-step--1 leading-relaxed text-muted`}>
          {accounts ? t('tik.card.deviceLede') : t('member.signupLede')}
        </p>

        {accounts ? null : FORM_KEY === '' ? (
          <p className="mt-3 border-s-rule border-red ps-3 font-body text-step--1 leading-relaxed text-ink">
            {t('member.signupSoon')}
          </p>
        ) : state === 'done' ? (
          <p
            role="status"
            className="mt-3 border-s-rule border-red ps-3 font-body text-step-0 leading-relaxed text-ink"
          >
            {t('member.signupThanks')}
          </p>
        ) : (
          <form onSubmit={submit} className="mt-3">
            <label
              htmlFor="member-email"
              className="font-body text-[11px] font-extrabold tracking-wide text-muted"
            >
              {t('member.email')}
            </label>
            <div className="mt-1 flex items-stretch gap-2">
              <input
                id="member-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                inputMode="email"
                autoComplete="email"
                dir="ltr"
                className="min-h-tap w-full border-hair border-ink bg-paper px-3 font-body text-step-0 text-ink outline-none"
              />
              <button
                type="submit"
                disabled={state === 'sending'}
                className="min-h-tap shrink-0 border-rule border-ink bg-ink px-4 font-body text-step--1 font-extrabold text-paper disabled:opacity-50"
              >
                {t('member.signupCta')}
              </button>
            </div>
            <p className="mt-1 font-body text-[10.5px] leading-snug text-muted">
              {t('member.emailHint')}
            </p>
            {state === 'failed' && (
              <p role="alert" className="mt-2 font-body text-[11.5px] text-red">
                {t('member.signupSoon')}
              </p>
            )}
          </form>
        )}

        <div className="mt-5 border-t-hair border-ink/25 pt-3">
          {wiped ? (
            <p role="status" className="font-body text-[11.5px] text-muted">
              {t('member.resetDone')}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => {
                // eslint-disable-next-line no-alert -- a destructive, irreversible wipe
                // of somebody's own record is exactly the case a native confirm is for:
                // it cannot be missed, it cannot be styled away, and it works with no
                // JavaScript state of its own.
                if (window.confirm(t('member.resetConfirm'))) {
                  forgetDevice()
                  setWiped(true)
                }
              }}
              className="min-h-tap font-body text-[11.5px] font-extrabold text-sign underline decoration-2 underline-offset-4"
            >
              {t('member.reset')}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
