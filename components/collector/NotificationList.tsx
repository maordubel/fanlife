'use client'

import { useEffect, useState } from 'react'

import { shirtDateText } from '@/lib/collector/cards'
import { formatPrice, handleLabel } from '@/lib/collector/labels'
import { NOTIFICATION_TEXT, notificationHref } from '@/lib/collector/notify'
import type { CollectorNotification, CollectorShirt, Currency } from '@/lib/collector/types'
import { t, type MessageKey } from '@/lib/i18n'

/**
 * ההתראות — משפט אחד לכל אירוע (מפרט §40), ודלת אחת (`lib/collector/notify.ts`).
 *
 * המשפט קבוע לסוג, והפרטים — איזו חולצה, כמה, מתי, ממי — הם שורה שנייה שנבנית ממה שהמסד שלח.
 * כך אין משפט עם חור באמצע כשאחד השדות חסר, ואין שדה שנכנס למשפט ולא היה שם. מי ששלח הוא
 * תמיד מספר אספן (`collector.handle`): ההתראה לא נושאת שם.
 */
export function NotificationList({
  items,
  shirts,
  now,
}: {
  items: CollectorNotification[]
  shirts: Readonly<Record<string, CollectorShirt>>
  /** the clock the relative times are read against — fixed in the QA harness, `Date.now()` here */
  now?: number
}) {
  // Times are the viewer's clock, zone and ICU — none of which the server shares. They print after
  // the first paint, so a server render and the browser's never disagree about "לפני שעתיים".
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (items.length === 0) {
    return <p className="border-rule border-dashed border-ink/40 p-3 font-body text-step--1 leading-relaxed text-muted">{t('collector.notify.empty')}</p>
  }
  const clock = now ?? Date.now()
  return (
    <ul className="border-t-rule border-ink">
      {items.map((note) => {
        const href = notificationHref(note)
        const body = (
          <>
            <span aria-hidden="true" className={`mt-1.5 block h-2.5 w-2.5 shrink-0 ${note.read ? 'border-hair border-ink/40' : 'bg-red'}`} />
            <span className="min-w-0 flex-1">
              <span className="block font-body text-step--1 font-extrabold leading-snug text-ink">
                {!note.read ? <span className="sr-only">{t('collector.notify.new')} · </span> : null}
                {t(sentence(note))}
              </span>
              {mounted && details(note, shirts).length > 0 ? (
                <span className="mt-0.5 block font-body text-[12px] leading-snug text-muted">
                  {details(note, shirts).map((part, index) => (
                    <span key={index}>
                      {index > 0 ? ' · ' : ''}
                      <bdi>{part}</bdi>
                    </span>
                  ))}
                </span>
              ) : null}
            </span>
            <time dateTime={note.at} className="min-w-[4.5rem] shrink-0 pt-0.5 text-end font-body text-[11px] text-muted">
              {mounted ? relative(note.at, clock) : ''}
            </time>
          </>
        )
        return (
          <li key={note.id} className="border-b-hair border-ink/25">
            {href ? (
              <a href={href} className="flex min-h-tap items-start gap-2.5 px-1 py-2.5 hover:bg-paper">
                {body}
              </a>
            ) : (
              <div className="flex min-h-tap items-start gap-2.5 px-1 py-2.5">{body}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function sentence(note: CollectorNotification): MessageKey {
  if (note.kind === 'COLLECTOR_OFFER_RECEIVED' && note.payload.kind === 'trade') return 'collector.notify.COLLECTOR_OFFER_RECEIVED.trade'
  return NOTIFICATION_TEXT[note.kind]
}

/** the second line — only what the payload actually carries */
function details(note: CollectorNotification, shirts: Readonly<Record<string, CollectorShirt>>): string[] {
  const p = note.payload as CollectorNotification['payload'] & { forSale?: boolean; forTrade?: boolean; reserveMissed?: boolean }
  const out: string[] = []
  if (typeof p.from === 'number') out.push(handleLabel({ handle: p.from, nickname: null }))
  const shirt = p.archiveSlug ? shirts[p.archiveSlug] : undefined
  if (shirt) out.push(`${shirt.variantHe} · ${shirtDateText(shirt)}`)
  if (p.forTrade) out.push(t('collector.notify.trade'))
  if (p.forSale) out.push(t('collector.notify.sale'))
  if (note.kind === 'COLLECTOR_ITEM_REQUESTED' && p.kind === 'trade') out.push(t('collector.notify.trade'))
  if (note.kind === 'COLLECTOR_ITEM_REQUESTED' && p.kind === 'buy') out.push(t('collector.notify.buy'))
  const amount = typeof p.amount === 'number' ? p.amount : typeof p.price === 'number' ? p.price : null
  if (amount !== null) out.push(formatPrice(amount, (p.currency ?? 'ILS') as Currency))
  if (p.startsAt && note.kind !== 'AUCTION_STARTED') out.push(t('collector.notify.startsAt', { when: when(p.startsAt) }))
  if (p.endsAt && (note.kind === 'AUCTION_ENDING' || note.kind === 'AUCTION_STARTED')) out.push(t('collector.notify.endsAt', { when: when(p.endsAt) }))
  if (p.reserveMissed) out.push(t('collector.notify.reserveMissed'))
  if (p.note) out.push(p.note)
  if (p.reason && note.kind === 'ITEM_SUSPENDED') out.push(p.reason)
  return out
}

function when(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
}

function relative(iso: string, now: number): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const minutes = Math.round((then - now) / 60000)
  const format = new Intl.RelativeTimeFormat('he', { numeric: 'auto' })
  if (Math.abs(minutes) < 60) return format.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return format.format(hours, 'hour')
  return format.format(Math.round(hours / 24), 'day')
}
