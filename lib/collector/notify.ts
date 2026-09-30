import type { MessageKey } from '@/lib/i18n'

import type { CollectorNotification, NotificationKind } from './types'

/**
 * התראה — משפט אחד ודלת אחת (מפרט §40, §69).
 *
 * כל סוג ב-`NotificationKind` מקבל משפט משלו, וכתוב במלואו (כלל 32: מפתח שנבנה בזמן ריצה הוא מפתח
 * שאף בדיקה לא רואה). הקישור נגזר מהתוכן ולא מהסוג, בסדר קבוע: מה שנשלח למנהלים הולך לניהול,
 * שיחה הולכת לשיחה (אבל התראת מכירה פומבית — ללוט, גם כשיש לה שיחה), מכירה פומבית ללוט, עותק לעמוד העותק. התראה בלי אף אחד מהם — בלי קישור, ולא
 * קישור לדף הבית שמעמיד פנים שהוא תשובה.
 */
export const NOTIFICATION_TEXT: Record<NotificationKind, MessageKey> = {
  COLLECTOR_WANT_MATCHED: 'collector.notify.COLLECTOR_WANT_MATCHED',
  COLLECTOR_ITEM_REQUESTED: 'collector.notify.COLLECTOR_ITEM_REQUESTED',
  COLLECTOR_REQUEST_ACCEPTED: 'collector.notify.COLLECTOR_REQUEST_ACCEPTED',
  COLLECTOR_REQUEST_DECLINED: 'collector.notify.COLLECTOR_REQUEST_DECLINED',
  COLLECTOR_MESSAGE: 'collector.notify.COLLECTOR_MESSAGE',
  COLLECTOR_OFFER_RECEIVED: 'collector.notify.COLLECTOR_OFFER_RECEIVED',
  COLLECTOR_OFFER_ACCEPTED: 'collector.notify.COLLECTOR_OFFER_ACCEPTED',
  COLLECTOR_OFFER_DECLINED: 'collector.notify.COLLECTOR_OFFER_DECLINED',
  CONNECTION_COMPLETED: 'collector.notify.CONNECTION_COMPLETED',
  CONNECTION_CANCELLED: 'collector.notify.CONNECTION_CANCELLED',
  AUCTION_SUBMITTED: 'collector.notify.AUCTION_SUBMITTED',
  AUCTION_APPROVED: 'collector.notify.AUCTION_APPROVED',
  AUCTION_REJECTED: 'collector.notify.AUCTION_REJECTED',
  AUCTION_SCHEDULED: 'collector.notify.AUCTION_SCHEDULED',
  AUCTION_STARTED: 'collector.notify.AUCTION_STARTED',
  AUCTION_OUTBID: 'collector.notify.AUCTION_OUTBID',
  AUCTION_ENDING: 'collector.notify.AUCTION_ENDING',
  AUCTION_WON: 'collector.notify.AUCTION_WON',
  AUCTION_SOLD: 'collector.notify.AUCTION_SOLD',
  AUCTION_UNSOLD: 'collector.notify.AUCTION_UNSOLD',
  AUCTION_CANCELLED: 'collector.notify.AUCTION_CANCELLED',
  ITEM_SUSPENDED: 'collector.notify.ITEM_SUSPENDED',
  REPORT_RECEIVED: 'collector.notify.REPORT_RECEIVED',
}

/** The kinds only an administrator is ever sent. */
export const ADMIN_KINDS: ReadonlySet<NotificationKind> = new Set<NotificationKind>(['AUCTION_SUBMITTED', 'REPORT_RECEIVED'])

const UUID = /^[0-9a-f-]{36}$/i
const safe = (id: string | undefined): string | null => (id && UUID.test(id) ? id : null)

export function notificationHref(note: Pick<CollectorNotification, 'kind' | 'payload'>): string | null {
  if (ADMIN_KINDS.has(note.kind)) return '/kits/admin'
  const connection = safe(note.payload.connectionId)
  const lot = safe(note.payload.lotId)
  // a won or sold lot opens on the lot — the amount and the way into the conversation are there
  if (lot && note.kind.startsWith('AUCTION_')) return `/kits/auction/${lot}`
  if (connection) return `/kits/market/c/${connection}`
  if (lot) return `/kits/auction/${lot}`
  const item = safe(note.payload.itemId)
  if (item) return `/kits/market/item/${item}`
  return null
}
