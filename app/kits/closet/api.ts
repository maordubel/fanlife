'use client'

import {
  closetMine,
  have,
  itemUpdate,
  myConnections,
  notifications,
  notificationsRead,
  photoOrder,
  photoRemove,
  photoUpload,
  settings,
  unhave,
  wantSet,
} from '@/lib/collector/api'
import type { Result } from '@/lib/collector/types'
import { sessionUserId } from '@/lib/portal/sync'

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
  // the storage path starts with the owner's id, and only the session knows it (`<you>/<item>/…`)
  async photoUpload(itemId, file) {
    const userId = await sessionUserId()
    if (!userId) return { ok: false, error: 'auth_required' }
    return photoUpload(userId, itemId, file)
  },
  photoRemove,
  photoOrder,
  settings,
  connections: myConnections,
  notifications,
  notificationsRead,
}
