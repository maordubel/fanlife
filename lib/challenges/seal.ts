import 'server-only'

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

/**
 * החותם — gate 10's man, sealed for a challenge link (§44: no spoiler in the URL).
 *
 * The same construction as `lib/game/blind-cow/token.ts` (AES-256-GCM, any edit fails to
 * open) under a key DERIVED FOR THIS PURPOSE ONLY — a different label over the same
 * deploy secret — so a challenge seal can never be replayed as a run cookie and a run
 * cookie can never be read as a challenge. The link says "the same man" without saying
 * who; only this server can open it.
 */
function key(): Buffer {
  const secret = process.env.BLIND_COW_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'blind-cow-local-development'
  return createHash('sha256').update(`worker-challenge-seal|${secret}`).digest()
}

export type SealedQuestion = { q: string; qv: number }

export function sealQuestion(value: SealedQuestion): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const body = Buffer.concat([cipher.update(JSON.stringify({ k: 'bc', ...value }), 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url')
}

export function openQuestion(token: string | null | undefined): SealedQuestion | null {
  if (!token || token.length > 400) return null
  try {
    const raw = Buffer.from(token, 'base64url')
    if (raw.length < 29) return null
    const decipher = createDecipheriv('aes-256-gcm', key(), raw.subarray(0, 12))
    decipher.setAuthTag(raw.subarray(12, 28))
    const text = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8')
    const value = JSON.parse(text) as { k?: unknown; q?: unknown; qv?: unknown }
    if (value.k !== 'bc' || typeof value.q !== 'string' || typeof value.qv !== 'number') return null
    return { q: value.q, qv: value.qv }
  } catch {
    return null
  }
}
