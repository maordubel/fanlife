import 'server-only'

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

/**
 * The solo / daily run lives in a SEALED cookie (AES-256-GCM): the question id inside it
 * leads to the answer, so it is encrypted, not just signed, and any edit makes it fail
 * to open. No database is needed for solo and daily (they must work without Supabase).
 *
 * The key: `BLIND_COW_KEY`, else derived from `SUPABASE_SERVICE_ROLE_KEY` (a secret the
 * deploy already holds and that never reaches a browser), else a development constant —
 * the house pattern of `lib/kit/unlock.ts`. Solo is not competitive; the duel is graded
 * by the database and does not rest on this key at all.
 */
function key(): Buffer {
  const secret = process.env.BLIND_COW_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'blind-cow-local-development'
  return createHash('sha256').update(`worker-blind-cow-run|${secret}`).digest()
}

export function seal(value: unknown): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url')
}

export function open<T>(token: string | null | undefined): T | null {
  if (!token || token.length > 3800) return null
  try {
    const raw = Buffer.from(token, 'base64url')
    if (raw.length < 29) return null
    const decipher = createDecipheriv('aes-256-gcm', key(), raw.subarray(0, 12))
    decipher.setAuthTag(raw.subarray(12, 28))
    const text = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8')
    return JSON.parse(text) as T
  } catch {
    return null
  }
}
