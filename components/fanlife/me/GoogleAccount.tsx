'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { fl } from '@/lib/fanlife/copy'
import { evaluationMode } from '@/lib/master/mode'
import { portalConfigured } from '@/lib/portal/env'
import { currentAccount, signInWithGoogle, signOut, syncProfile, watchAccount, type Account } from '@/lib/portal/sync'

type State = 'checking' | 'out' | 'syncing' | 'synced' | 'failed' | 'signing-out'

/** Where to come back to: this page, without the `auth=failed` flag a previous attempt left on it. */
function comeBackTo(): string {
  const url = new URL(window.location.href)
  url.searchParams.delete('auth')
  return `${url.pathname}${url.search}`
}

/**
 * Sign in with Google, for the whole hub. The card stays on the device either way; the account only lets it follow the
 * supporter. Renders nothing when no Supabase project is connected. In a preview (no real sign-in) it says so instead
 * of offering a button that does nothing. `onChange` fires when the signed-in state or the card behind it changed, so
 * the page around it can re-read the device.
 */
export function GoogleAccount({ onChange }: { onChange?: () => void }) {
  const [who, setWho] = useState<Account | null>(null)
  const [state, setState] = useState<State>('checking')
  const [note, setNote] = useState<'none' | 'authFailed' | 'signOutFailed' | 'signedOut'>('none')
  const busy = useRef(false)
  const changed = useRef(onChange)
  changed.current = onChange

  const sync = useCallback(async (): Promise<void> => {
    setState('syncing')
    const r = await syncProfile()
    setState(r.state === 'synced' ? 'synced' : 'failed')
    changed.current?.()
  }, [])

  const refresh = useCallback(async (): Promise<void> => {
    const account = await currentAccount()
    setWho(account)
    if (account === null) return setState('out')
    await sync()
  }, [sync])

  useEffect(() => {
    if (!portalConfigured() || evaluationMode()) return
    if (new URLSearchParams(window.location.search).get('auth') === 'failed') setNote('authFailed')
    let live = true
    void (async () => {
      const account = await currentAccount()
      if (!live) return
      setWho(account)
      if (account === null) return setState('out')
      await sync()
    })()
    const stop = watchAccount(() => { if (live && !busy.current) void refresh() })
    return () => { live = false; stop() }
  }, [refresh, sync])

  async function leave(): Promise<void> {
    if (busy.current) return
    busy.current = true
    setState('signing-out')
    setNote('none')
    const ok = await signOut()
    busy.current = false
    if (!ok) {
      setState(who ? 'synced' : 'out')
      return setNote('signOutFailed')
    }
    setWho(null)
    setState('out')
    setNote('signedOut')
    changed.current?.()
  }

  if (!portalConfigured()) return null
  if (evaluationMode()) {
    return (
      <section className="mag-card" aria-labelledby="google-account" data-account="preview">
        <h2 id="google-account" className="mag-kicker">{fl('account.title')}</h2>
        <p className="mag-fine">{fl('account.evalNote')}</p>
      </section>
    )
  }
  return (
    <section className="mag-card" aria-labelledby="google-account" data-account={state} aria-busy={state === 'checking' || state === 'syncing' || state === 'signing-out'}>
      <h2 id="google-account" className="mag-kicker">{fl('account.title')}</h2>
      {state === 'checking' ? (
        <p className="mag-fine" role="status">{fl('account.checking')}</p>
      ) : who === null ? (
        <>
          <p className="mag-fine">{fl('account.body')}</p>
          {note === 'authFailed' ? <p className="mag-fine" role="alert">{fl('account.authFailed')}</p> : null}
          {note === 'signedOut' ? <p className="mag-fine" role="status">{fl('account.signOutDone')}</p> : null}
          <button type="button" className="mag-card-cta min-h-tap" disabled={state === 'signing-out'} onClick={() => void signInWithGoogle(comeBackTo())}>{fl('account.signIn')}</button>
        </>
      ) : (
        <>
          <p className="mag-fine"><b>{fl('account.signedInAs', { who: who.displayName ?? who.email ?? '—' })}</b></p>
          <p className="mag-fine" role="status">{state === 'syncing' ? fl('account.syncing') : state === 'failed' ? fl('account.failed') : state === 'signing-out' ? '…' : fl('account.syncDone')}</p>
          {note === 'signOutFailed' ? <p className="mag-fine" role="alert">{fl('account.signOutFailed')}</p> : null}
          {state === 'failed' ? <button type="button" className="mag-card-cta min-h-tap" onClick={() => void sync()}>{fl('account.retry')}</button> : null}
          <button type="button" className="mag-card-cta min-h-tap" disabled={state === 'signing-out' || state === 'syncing'} onClick={() => void leave()}>{fl('account.signOut')}</button>
        </>
      )}
    </section>
  )
}
