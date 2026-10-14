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
/** the coupon's scissors and its card roundel (decorative) */
function Scissors() {
  return <span className="wk-scissors" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="6" cy="7" r="3" /><circle cx="6" cy="17" r="3" /><path d="M8.5 8.5L20 18M8.5 15.5L20 6" /></svg></span>
}
function Roundel() {
  return <span className="wk-roundel wkc-account-badge" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 6h18v12H3zM7 10h5M7 14h8" /></svg></span>
}

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
      <section className="wk-coupon wkc-account" aria-labelledby="google-account" data-account="preview">
        <Scissors />
        <div className="wkc-account-in">
          <Roundel />
          <div><h2 id="google-account" className="wk-head">{fl('account.title')}</h2><p className="wk-small">{fl('account.evalNote')}</p></div>
        </div>
      </section>
    )
  }
  return (
    <section className="wk-coupon wkc-account" aria-labelledby="google-account" data-account={state} aria-busy={state === 'checking' || state === 'syncing' || state === 'signing-out'}>
      <Scissors />
      <div className="wkc-account-in">
      <Roundel />
      <div className="wkc-account-body">
      <h2 id="google-account" className="wk-head">{fl('account.title')}</h2>
      {state === 'checking' ? (
        <p className="wk-small" role="status">{fl('account.checking')}</p>
      ) : who === null ? (
        <>
          <p className="wk-small">{fl('account.body')}</p>
          {note === 'authFailed' ? <p className="wk-small" role="alert">{fl('account.authFailed')}</p> : null}
          {note === 'signedOut' ? <p className="wk-small" role="status">{fl('account.signOutDone')}</p> : null}
          <button type="button" className="wk-btn paper block min-h-tap" disabled={state === 'signing-out'} onClick={() => void signInWithGoogle(comeBackTo())}>{fl('account.signIn')}</button>
        </>
      ) : (
        <>
          <p className="wk-small"><b>{fl('account.signedInAs', { who: who.displayName ?? who.email ?? '—' })}</b></p>
          <p className="wk-small" role="status">{state === 'syncing' ? fl('account.syncing') : state === 'failed' ? fl('account.failed') : state === 'signing-out' ? '…' : fl('account.syncDone')}</p>
          {note === 'signOutFailed' ? <p className="wk-small" role="alert">{fl('account.signOutFailed')}</p> : null}
          {state === 'failed' ? <button type="button" className="wk-btn paper block min-h-tap" onClick={() => void sync()}>{fl('account.retry')}</button> : null}
          <button type="button" className="wk-btn paper block min-h-tap" disabled={state === 'signing-out' || state === 'syncing'} onClick={() => void leave()}>{fl('account.signOut')}</button>
        </>
      )}
      </div>
      </div>
    </section>
  )
}
