'use client'

import { useEffect, useState } from 'react'

import { fl } from '@/lib/fanlife/copy'
import { enabledProviders, sendEmailCode, signInWith, verifyEmailCode } from '@/lib/portal/sync'

type Step = 'choose' | 'email' | 'code'

/** the marks are drawn in the button's own ink (currentColor): one language with the magazine, no brand hex here */
function GoogleMark() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="wkc-signin-mark"><path fill="currentColor" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3ZM12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1a5.9 5.9 0 0 1-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Zm-5.6-8a6 6 0 0 1 0-3.9V7.5H3.1a10 10 0 0 0 0 9l3.3-2.5ZM12 6c1.5 0 2.8.5 3.9 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5l3.3 2.6A5.9 5.9 0 0 1 12 6Z" /></svg>
}
function FacebookMark() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="wkc-signin-mark"><path fill="currentColor" d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.5 2.9h-2.3v7A10 10 0 0 0 22 12Z" /></svg>
}
function MailMark() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="wkc-signin-mark"><path fill="none" stroke="currentColor" strokeWidth="2" d="M3 6h18v12H3zM3 7l9 6 9-6" /></svg>
}

/**
 * The three doors into an account (owner, 18.11.2026: "easy extra sign-up options — Facebook, e-mail"): Google, Facebook
 * (shown only while the provider is switched on in the shared project) and e-mail with a one-time code — no password,
 * no form beyond the address. `next` is where the person comes back to.
 */
export function SignInChoices({ next, onSignedIn }: { next: string; onSignedIn?: () => void }) {
  const [open, setOpen] = useState({ google: true, facebook: false, email: true })
  const [step, setStep] = useState<Step>('choose')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<'' | 'invalid' | 'limited' | 'failed' | 'badCode' | 'sent'>('')

  useEffect(() => {
    let live = true
    void enabledProviders().then((p) => { if (live) setOpen(p) })
    return () => { live = false }
  }, [])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setNote('')
    const r = await sendEmailCode(email, next)
    setBusy(false)
    if (r === 'sent') { setStep('code'); setNote('sent') } else setNote(r)
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    const ok = await verifyEmailCode(email, code)
    setBusy(false)
    if (ok) onSignedIn?.()
    else setNote('badCode')
  }

  if (step === 'choose') {
    return (
      <div className="wkc-signin" role="group" aria-label={fl('account.choose')}>
        {open.google && <button type="button" className="wk-btn paper block min-h-tap wkc-signin-btn" onClick={() => void signInWith('google', next)}><GoogleMark />{fl('account.signIn')}</button>}
        {open.facebook && <button type="button" className="wk-btn paper block min-h-tap wkc-signin-btn" onClick={() => void signInWith('facebook', next)}><FacebookMark />{fl('account.signInFacebook')}</button>}
        {open.email && <button type="button" className="wk-btn paper block min-h-tap wkc-signin-btn" onClick={() => setStep('email')}><MailMark />{fl('account.signInEmail')}</button>}
      </div>
    )
  }
  if (step === 'email') {
    return (
      <form className="wkc-signin" onSubmit={(e) => void send(e)} noValidate>
        <label className="wk-small wkc-signin-label" htmlFor="signin-email">{fl('account.emailLabel')}</label>
        <input id="signin-email" className="wkc-signin-input min-h-tap" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={fl('account.emailPlaceholder')} />
        {note === 'invalid' && <p className="wk-small" role="alert">{fl('account.emailInvalid')}</p>}
        {note === 'limited' && <p className="wk-small" role="alert">{fl('account.emailLimited')}</p>}
        {note === 'failed' && <p className="wk-small" role="alert">{fl('account.emailFailed')}</p>}
        <button type="submit" className="wk-btn block min-h-tap" disabled={busy}>{busy ? '…' : fl('account.emailSend')}</button>
        <button type="button" className="wk-btn paper block min-h-tap" onClick={() => { setStep('choose'); setNote('') }}>{fl('account.back')}</button>
      </form>
    )
  }
  return (
    <form className="wkc-signin" onSubmit={(e) => void verify(e)}>
      <p className="wk-small" role="status">{fl('account.codeSent', { email: email.trim() })}</p>
      <label className="wk-small wkc-signin-label" htmlFor="signin-code">{fl('account.codeLabel')}</label>
      <input id="signin-code" className="wkc-signin-input wkc-signin-code min-h-tap" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" maxLength={12} value={code} onChange={(e) => setCode(e.target.value)} />
      {note === 'badCode' && <p className="wk-small" role="alert">{fl('account.codeWrong')}</p>}
      <button type="submit" className="wk-btn block min-h-tap" disabled={busy || code.replace(/\s/g, '').length < 6}>{busy ? '…' : fl('account.codeConfirm')}</button>
      <button type="button" className="wk-btn paper block min-h-tap" onClick={() => { setStep('email'); setCode(''); setNote('') }}>{fl('account.codeAgain')}</button>
    </form>
  )
}
