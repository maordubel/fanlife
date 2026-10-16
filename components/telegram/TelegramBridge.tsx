'use client'

import Script from 'next/script'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { telegramInternalHref, telegramInvite, telegramStartHref } from '@/lib/telegram/routes'
import { telegramLaunchMode } from '@/lib/telegram/connection'
import type { TelegramWebApp } from '@/types/telegram'
import { rememberTelegramVisit } from '@/lib/telegram/memory'

type Status = 'loading' | 'preview' | 'verifying' | 'verified' | 'guest' | 'unavailable'

/** Only mounted under /telegram. The site and its existing games have no SDK overhead. */
export function TelegramBridge() {
  const router = useRouter(), pathname = usePathname()
  const [ready, setReady] = useState(false), [status, setStatus] = useState<Status>('loading')
  const [app, setApp] = useState<TelegramWebApp | null>(null)
  const [homeMessage, setHomeMessage] = useState('')

  useEffect(() => {
    const game = /^\/telegram\/([a-z0-9-]+)\/([a-z0-9-]+)$/.exec(pathname)
    if (game) { try { rememberTelegramVisit(window.localStorage, game[1]!, game[2]!) } catch {} }
  }, [pathname])

  useEffect(() => {
    if (!ready) return
    const sdk = window.Telegram?.WebApp
    const mode = telegramLaunchMode(sdk)
    if (!sdk || mode === 'unavailable') { setStatus('unavailable'); return }
    if (mode === 'preview') { setStatus('preview'); return }
    setApp(sdk)
    sdk.ready(); sdk.expand()
    if (mode === 'guest') { setStatus('guest'); return }
    const controller = new AbortController()
    setStatus('verifying')
    const timeout = window.setTimeout(() => { controller.abort(); setStatus('guest') }, 10000)
    void fetch('/api/telegram/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: sdk.initData }), signal: controller.signal })
      .then(async response => { const body = await response.json(); if (!controller.signal.aborted) setStatus(response.ok && body.ok === true ? 'verified' : 'guest') })
      .catch(() => { if (!controller.signal.aborted) setStatus('guest') })
      .finally(() => window.clearTimeout(timeout))
    // start_param is only a public navigation hint; the destination still enforces club/gate access on the server.
    const start = sdk.initDataUnsafe?.start_param || new URLSearchParams(window.location.search).get('tgWebAppStartParam')
    const href = telegramStartHref(start)
    if (href && window.location.pathname === '/telegram') router.replace(href)
    return () => { window.clearTimeout(timeout); controller.abort() }
  }, [ready, router])

  useEffect(() => {
    if (!app) return
    const root = document.documentElement
    root.dataset.telegram = 'true'
    const inset = () => {
      for (const side of ['top', 'right', 'bottom', 'left'] as const) {
        const pixels = Math.max(0, app.safeAreaInset?.[side] || 0) + Math.max(0, app.contentSafeAreaInset?.[side] || 0)
        root.style.setProperty(`--fl-tg-${side}`, `${pixels}px`)
      }
    }
    inset(); app.onEvent('safeAreaChanged', inset); app.onEvent('contentSafeAreaChanged', inset)
    return () => {
      delete root.dataset.telegram
      for (const side of ['top', 'right', 'bottom', 'left']) root.style.removeProperty(`--fl-tg-${side}`)
      app.offEvent('safeAreaChanged', inset); app.offEvent('contentSafeAreaChanged', inset)
    }
  }, [app])

  useEffect(() => {
    if (!app) return
    const match = /^\/telegram\/([a-z0-9-]+)\//.exec(pathname)
    const back = () => router.push(match ? `/telegram?club=${match[1]}` : '/telegram')
    if (match) app.BackButton.show(); else app.BackButton.hide()
    app.BackButton.onClick(back)
    if (app.isVersionAtLeast('6.2')) {
      if (match) app.enableClosingConfirmation(); else app.disableClosingConfirmation()
    }
    if (app.isVersionAtLeast('7.7')) {
      if (match) app.disableVerticalSwipes(); else app.enableVerticalSwipes()
    }
    return () => {
      app.BackButton.offClick(back); app.BackButton.hide()
      if (app.isVersionAtLeast('6.2')) app.disableClosingConfirmation()
      if (app.isVersionAtLeast('7.7')) app.enableVerticalSwipes()
    }
  }, [app, pathname, router])

  useEffect(() => {
    const navigate = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return
      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin) return
      const href = telegramInternalHref(url)
      if (href) { event.preventDefault(); event.stopPropagation(); router.push(href) }
    }
    document.addEventListener('click', navigate, true)
    return () => document.removeEventListener('click', navigate, true)
  }, [router])

  const match = /^\/telegram\/([a-z0-9-]+)\/([a-z0-9-]+)/.exec(pathname)
  const invite = match ? telegramInvite(match[1]!, match[2]!) : null
  const share = invite ? `https://t.me/share/url?${new URLSearchParams({ url: invite, text: 'Your club. Your call. Play FAN LIFE.' })}` : null
  const labels: Record<Status, string> = {
    loading: 'Getting ready…', preview: 'Play as a guest',
    verifying: 'Connecting…', verified: 'Connected to Telegram',
    guest: 'Play as a guest', unavailable: 'Play as a guest',
  }
  return <>
    {/* Same cache ID as the root's early script; also supports client navigation from the website. */}
    <Script id="fanlife-telegram-sdk" src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" onReady={() => setReady(true)} onError={() => setStatus('unavailable')} />
    <nav className="tg-bridge" aria-label="Telegram app navigation">
      <Link href="/telegram" className="tg-home">FAN LIFE</Link>
      <p role="status" data-testid="telegram-status">{labels[status]}</p>
      {app?.isVersionAtLeast('8.0') && <div className="tg-tools">
        {app.requestFullscreen && <button className="min-h-tap" onClick={() => { try { app.requestFullscreen?.() } catch {} }}>Full screen</button>}
        {app.addToHomeScreen && <button className="min-h-tap" onClick={() => {
          try {
            if (app.checkHomeScreenStatus) app.checkHomeScreenStatus(value => {
              if (value === 'added') setHomeMessage('Already on your home screen')
              else if (value === 'unsupported') setHomeMessage('Home screen shortcuts are not supported here')
              else app.addToHomeScreen?.()
            })
            else app.addToHomeScreen?.()
          } catch { setHomeMessage('Use the Telegram menu to add a shortcut') }
        }}>Add to home screen</button>}
        {homeMessage && <span role="status">{homeMessage}</span>}
      </div>}
      {share && <a href={share} target="_blank" rel="noopener noreferrer" onClick={event => { if (app) { event.preventDefault(); app.openTelegramLink(share) } }}>Invite a friend ↗</a>}
    </nav>
  </>
}
