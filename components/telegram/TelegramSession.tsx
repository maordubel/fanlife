'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import { telegramSessionActive, telegramSurface, TELEGRAM_SESSION_KEY } from '@/lib/telegram/session'
import { telegramLaunchMode } from '@/lib/telegram/connection'
const TelegramBridge = dynamic(() => import('./TelegramBridge').then(module => module.TelegramBridge))

/** Lives in the root layout so native controls survive canonical pages and router/server-action navigation. */
export function TelegramSession({ entry }: { entry: boolean }) {
  const pathname = usePathname()
  const [active, setActive] = useState(entry)
  useEffect(() => {
    let remembered = false
    try { remembered = window.sessionStorage.getItem(TELEGRAM_SESSION_KEY) === '1' } catch {}
    const mode = telegramLaunchMode(window.Telegram?.WebApp)
    const enabled = telegramSessionActive(pathname, entry, remembered, mode)
    if (enabled) { try { window.sessionStorage.setItem(TELEGRAM_SESSION_KEY, '1') } catch {} }
    setActive(enabled)
  }, [entry, pathname])
  useEffect(() => {
    if (!active || !telegramSurface(pathname)) return
    document.documentElement.dataset.telegramSession = 'true'
    return () => { delete document.documentElement.dataset.telegramSession }
  }, [active, pathname])
  return active && telegramSurface(pathname) ? <TelegramBridge /> : null
}
