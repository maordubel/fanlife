'use client'
// FAN LIFE: hand-written (listed in HAND in scripts/fanlife/fork-economy.py) — the closet's door to the database, with the privacy calls.

import {
  closetMine,
  have,
  itemUpdate,
  myConnections,
  notifications,
  notificationsRead,
  photoOrder,
  photoRemove,
  displaySet,
  identitySet,
  photoUpload,
  settings,
  unhave,
  wantSet,
} from '@/lib/collector/api'
import type { Result } from '@/lib/collector/types'

/**
 * מה שהארון מבקש מהמסד — מקום אחד, כדי שמתקן הבדיקה (`app/qa/collector`) יוכל להחליף אותו
 * בתשובות מקומיות ולהראות את המסך מלא, בלי מפתחות ובלי רשת. הארון עצמו לא יודע מי ענה לו.
 */
export type ClosetApi = {
  reload: typeof closetMine
  have: typeof have
  unhave: typeof unhave
  wantSet: typeof wantSet
  itemUpdate: typeof itemUpdate
  photoUpload: (itemId: string, file: File) => Promise<Result<{ photos: string[] }>>
  photoRemove: typeof photoRemove
  photoOrder: typeof photoOrder
  settings: typeof settings
  identitySet: typeof identitySet
  displaySet: typeof displaySet
  connections: typeof myConnections
  notifications: typeof notifications
  notificationsRead: typeof notificationsRead
}

export const liveApi: ClosetApi = {
  reload: closetMine,
  have,
  unhave,
  wantSet,
  itemUpdate,
  // the path is an opaque slot from the database — it carries no owner id, so no session lookup
  photoUpload: (itemId, file) => photoUpload('', itemId, file),
  photoRemove,
  photoOrder,
  settings,
  identitySet,
  displaySet,
  connections: myConnections,
  notifications,
  notificationsRead,
}
