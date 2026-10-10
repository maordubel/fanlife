'use client'
import { evaluationMode } from '@/lib/master/mode'

import { useEffect, useState } from 'react'

import { portalConfigured } from '@/lib/portal/env'
import { currentAccount, signInWithGoogle, signOut, syncProfile, type Account } from '@/lib/portal/sync'
import { t } from '@/lib/i18n'

/**
 * החשבון — one button, and the sentence that explains what it is for.
 *
 * `SignUpPlate` below it makes the argument: this card lives in one browser, and clearing
 * your history loses it. This plate is the answer to that argument now that there is
 * somewhere for the card to go. It is deliberately the smallest thing that can be true —
 * sign in, sign out, and one line saying what happened — because the product does not
 * have accounts and is not getting them. It has a card, and this is how the card follows
 * a person between a phone and a laptop.
 *
 * **It renders nothing at all when there are no keys**, which is the state this repo
 * builds and tests in. A plate offering a sign-in that cannot work would be exactly the
 * lie `SignUpPlate` already refuses to tell about the mailing list ("if there is nowhere
 * to send an address, the plate says registration is not open yet rather than collecting
 * one into a `console.log`"). Same rule, same shape.
 *
 * The sync runs once on mount when somebody is signed in, and its failure is a line of
 * text rather than an exception: the device's card is authoritative and untouched either
 * way (`lib/portal/sync.ts`).
 */
export function AccountPlate() {
  const [account, setAccount] = useState<Account | null>(null)
  const [state, setState] = useState<'loading' | 'out' | 'syncing' | 'synced' | 'failed'>('loading')

  useEffect(() => {
    if (!portalConfigured()) return
    let live = true
    void (async () => {
      const who = await currentAccount()
      if (!live) return
      setAccount(who)
      if (who === null) {
        setState('out')
        return
      }
      setState('syncing')
      const result = await syncProfile()
      if (!live) return
      setState(result.state === 'synced' ? 'synced' : 'failed')
    })()
    return () => {
      live = false
    }
  }, [])

  if (evaluationMode()) return <p dir="ltr" lang="en" className="mt-stack border-plate border-ink p-4">Open local evaluation · Your profile syncs to this test server. No registration needed.</p>
  if (!portalConfigured()) return null

  return (
    <section className="mt-stack border-plate border-ink bg-sheet" aria-labelledby="member-account">
      <div className="bg-ink px-4 py-2.5">
        <h2 id="member-account" className="font-display text-step-2 leading-none text-paper">
          {t('account.title')}
        </h2>
      </div>

      <div className="p-4">
        {account === null ? (
          <>
            <p className="max-w-prose font-body text-step-0 leading-relaxed text-ink">
              {t('account.lede')}
            </p>
            <button
              type="button"
              disabled={state === 'loading'}
              onClick={() => void signInWithGoogle('/tik')}
              className="mt-3 min-h-tap border-rule border-ink bg-red px-4 font-body text-step--1 font-extrabold text-paper disabled:opacity-50"
            >
              {t('account.signIn')}
            </button>
          </>
        ) : (
          <>
            <p className="font-body text-step-0 leading-relaxed text-ink">
              {t('account.signedInAs', { who: account.displayName ?? account.email ?? '' })}
            </p>
            <p role="status" className="mt-1 font-body text-[11.5px] leading-snug text-muted">
              {state === 'syncing'
                ? t('account.syncing')
                : state === 'failed'
                  ? t('account.failed')
                  : t('account.synced')}
            </p>
            <button
              type="button"
              onClick={() => {
                void signOut().then((ok) => {
                  if (!ok) return setState('failed')
                  setAccount(null)
                  setState('out')
                })
              }}
              className="mt-3 min-h-tap font-body text-[11.5px] font-extrabold text-sign underline decoration-2 underline-offset-4"
            >
              {t('account.signOut')}
            </button>
          </>
        )}
      </div>
    </section>
  )
}
