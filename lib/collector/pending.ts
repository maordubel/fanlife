'use client'

/**
 * כוונה שמחכה לחשבון — "יש לי" או "הלוואי" של אורח, עד שהוא מתחבר (מפרט §44).
 *
 * אורח שלוחץ "יש לי" שומע "מעולה. שמור אותה בארון שלך." ונשלח להתחבר; מה שהוא סימן נזכר כאן,
 * בלשונית הזאת בלבד (`sessionStorage`), ונכנס לארון האמיתי בשרת ברגע שהארון נפתח אחרי ההתחברות.
 * **זה לא האוסף** — האוסף נשמר רק בחשבון (מפרט §78: "אוסף אמיתי נשמר רק ב-localStorage" הוא
 * כישלון). זו רשימת המתנה של שעה, שנמחקת כשהיא מוגשת או כשהיא מתיישנת.
 *
 * ולא האוסף של המשחק: `lib/kit/collection.ts` הוא מה שהרכבת בשער 4 (UNLOCKED_IN_GAME), וכאן
 * זה מה שתלוי אצלך בבית (OWNED_IN_REAL_LIFE). הקובץ הזה לא נוגע בו ולא קורא ממנו.
 */

const KEY = 'the-worker:collector:pending'
const TTL_MS = 60 * 60 * 1000
const MAX = 24

export type PendingIntent = { slug: string; kitId: string | null; action: 'have' | 'want'; at: number }

function read(): PendingIntent[] {
  try {
    const raw = window.sessionStorage.getItem(KEY)
    if (!raw) return []
    const rows: unknown = JSON.parse(raw)
    if (!Array.isArray(rows)) return []
    const now = Date.now()
    return rows.filter(
      (row): row is PendingIntent =>
        typeof row === 'object' &&
        row !== null &&
        typeof (row as PendingIntent).slug === 'string' &&
        /^[a-z0-9][a-z0-9-]{2,63}$/.test((row as PendingIntent).slug) &&
        ((row as PendingIntent).action === 'have' || (row as PendingIntent).action === 'want') &&
        typeof (row as PendingIntent).at === 'number' &&
        now - (row as PendingIntent).at < TTL_MS,
    )
  } catch {
    return []
  }
}

/** The last word per shirt wins: "הלוואי" and then "יש לי" on the same shirt is "יש לי". */
export function rememberIntent(intent: Omit<PendingIntent, 'at'>): void {
  try {
    const rows = read().filter((row) => row.slug !== intent.slug)
    rows.push({ ...intent, at: Date.now() })
    window.sessionStorage.setItem(KEY, JSON.stringify(rows.slice(-MAX)))
  } catch {
    // private mode: the tap is simply asked again after signing in
  }
}

export function pendingIntents(): PendingIntent[] {
  return typeof window === 'undefined' ? [] : read()
}

export function clearIntents(slugs?: readonly string[]): void {
  try {
    if (!slugs) window.sessionStorage.removeItem(KEY)
    else window.sessionStorage.setItem(KEY, JSON.stringify(read().filter((row) => !slugs.includes(row.slug))))
  } catch {
    // nothing to clear
  }
}
