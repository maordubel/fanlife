'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { markSeen, useMarketAlerts } from '@/lib/fanlife/alerts'
import { NOTIFICATION_TEXT, notificationHref } from '@/lib/fanlife/collector/notify'
import { h } from '@/lib/fanlife/hub/copy'
import { t } from '@/lib/fanlife/i18n'

/**
 * The popup for a new market alert: a card at the edge of the glass, above the tab bar, that says what happened
 * in one sentence and opens it in one tap. Mounted once, in the root layout. Never over a game run, the control room or the QA pages.
 */
export function MarketAlerts() {
  const { fresh } = useMarketAlerts()
  const path = usePathname() || '/'
  const quiet = /^\/(master|qa)(\/|$)/.test(path) || /\/(play|life)(\/|$)/.test(path) || path.startsWith('/market/c/')
  const head = quiet ? undefined : fresh[0]
  const timerRef = useRef<number | null>(null)
  useEffect(() => {
    if (!head) return
    timerRef.current = window.setTimeout(() => markSeen([head.id]), 12_000)
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [head])
  if (!head) return null
  const href = notificationHref(head) ?? '/closet'
  const more = fresh.length - 1
  return (
    <div className="fl-alert" role="status" aria-live="polite" data-market-alert="">
      <Link href={href} className="fl-alert-body" onClick={() => markSeen([head.id])}>
        <span className="fl-alert-kicker">{h('hub.alert.kicker')}{more > 0 ? ` · ${h('hub.alert.more', { n: more })}` : ''}</span>
        <span className="fl-alert-text">{t(NOTIFICATION_TEXT[head.kind])}</span>
      </Link>
      <button type="button" className="fl-alert-x min-h-tap" onClick={() => markSeen(fresh.map((n) => n.id))} aria-label={h('hub.alert.dismiss')}>×</button>
    </div>
  )
}
