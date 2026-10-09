'use client'

import { useEffect, useState } from 'react'

import { fl } from '@/lib/fanlife/copy'
import { portalConfigured } from '@/lib/portal/env'
import { currentAccount, signInWithGoogle, signOut, syncProfile, type Account } from '@/lib/portal/sync'

/**
 * Sign in with Google, for the whole hub. One button; the card stays on the device either way and the account only
 * lets it follow the supporter. Renders nothing when no Supabase project is connected, rather than offer a button
 * that cannot work. The shared project's Site URL belongs to DUBID, so the return trip goes through /auth/callback.
 */
export function GoogleAccount() {
  const [who, setWho] = useState<Account | null>(null)
  const [state, setState] = useState<'loading' | 'out' | 'syncing' | 'synced' | 'failed'>('loading')

  useEffect(() => {
    if (!portalConfigured()) return
    let live = true
    void (async () => {
      const account = await currentAccount()
      if (!live) return
      setWho(account)
      if (account === null) return setState('out')
      setState('syncing')
      const r = await syncProfile()
      if (live) setState(r.state === 'synced' ? 'synced' : 'failed')
    })()
    return () => { live = false }
  }, [])

  if (!portalConfigured() || state === 'loading') return null
  return (
    <section className="mag-card" aria-labelledby="google-account" data-account={state}>
      <h2 id="google-account" className="mag-kicker">{fl('account.title')}</h2>
      {who === null ? (
        <>
          <p className="mag-fine">{fl('account.body')}</p>
          <button type="button" className="mag-card-cta min-h-tap" onClick={() => void signInWithGoogle(`${window.location.pathname}${window.location.search}`)}>{fl('account.signIn')}</button>
        </>
      ) : (
        <>
          <p className="mag-fine" role="status">{state === 'syncing' ? fl('account.syncing') : state === 'failed' ? fl('account.failed') : fl('account.signedIn')}</p>
          <button type="button" className="mag-card-cta min-h-tap" onClick={() => void signOut().then(() => { setWho(null); setState('out') })}>{fl('account.signOut')}</button>
        </>
      )}
    </section>
  )
}
