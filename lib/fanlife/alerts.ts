'use client'
/**
 * Market alerts: one poller for the whole site. It reads the signed-in collector's unread notifications
 * (worker_notifications) and tells two things — the number on the Market tab and the newest unseen alert
 * for the popup. "Seen" (popup shown) is kept on the device; "read" stays the closet's own act.
 * Nothing runs for a guest, and nothing runs while the tab is hidden.
 */
import { useSyncExternalStore } from 'react'
import { notifications } from '@/lib/collector/api'
import type { CollectorNotification } from '@/lib/collector/types'
import { portalConfigured } from '@/lib/portal/env'
import { sessionUserId } from '@/lib/portal/sync'

export type AlertsState = { unread: number; fresh: CollectorNotification[] }
const EMPTY: AlertsState = { unread: 0, fresh: [] }
const SEEN_KEY = 'fanlife.alerts.seen.v1'
const EVERY_MS = 45_000

let state: AlertsState = EMPTY
const subs = new Set<() => void>()
let timer: number | null = null

function seen(): string[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}
export function markSeen(ids: string[]) {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify([...new Set([...seen(), ...ids])].slice(-100)))
  } catch {
    /* private mode: the popup may show again, which is the safe direction */
  }
  state = { ...state, fresh: state.fresh.filter((n) => !ids.includes(n.id)) }
  subs.forEach((f) => f())
}

async function poll() {
  if (document.visibilityState !== 'visible' || !portalConfigured()) return
  if ((await sessionUserId()) === null) {
    if (state !== EMPTY) {
      state = EMPTY
      subs.forEach((f) => f())
    }
    return
  }
  const out = await notifications(20)
  if (!out.ok) return
  const done = new Set(seen())
  const unread = out.items.filter((n) => !n.read)
  state = { unread: out.unread, fresh: unread.filter((n) => !done.has(n.id)).slice(0, 5) }
  subs.forEach((f) => f())
}

function start() {
  if (timer !== null) return
  void poll()
  timer = window.setInterval(() => void poll(), EVERY_MS)
  document.addEventListener('visibilitychange', onVisible)
}
function onVisible() {
  if (document.visibilityState === 'visible') void poll()
}
function stop() {
  if (timer !== null) window.clearInterval(timer)
  timer = null
  document.removeEventListener('visibilitychange', onVisible)
}

function subscribe(cb: () => void) {
  subs.add(cb)
  start()
  return () => {
    subs.delete(cb)
    if (subs.size === 0) stop()
  }
}
export function useMarketAlerts(): AlertsState {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY)
}
/** refresh now — after the person acts (reads, answers) so the badge does not lag */
export const refreshAlerts = () => void poll()
