import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * מפתח הפתיחה — the proof that a shirt was built in Gate 4, which is what opens it in Gate 5.
 *
 * The collection lives on the device (`lib/kit/collection.ts`), so the device could always claim
 * a shirt. What it cannot do is produce this: an HMAC over the kit id and whether its DNA opened,
 * signed by the server when the shirt was graded. Gate 5 serves a shirt's spec only for a token
 * that verifies, so the /kits page itself carries no answer to a shirt nobody built (brief §15–16).
 *
 * Production MUST set `KIT_UNLOCK_KEY` (a private Vercel secret); the fallback keeps local and
 * test builds deterministic and is public, like the Royal Rumble key it follows.
 *
 * The same signature signs hint receipts, so the server counts the hints it gave rather than the
 * number the client reports. Known limit, written down rather than hidden: without an account
 * there is no server state, so a receipt can be withheld; the penalty is max(receipts, claim).
 */

function key(): string {
  return process.env.KIT_UNLOCK_KEY ?? 'kit-unlock-local-development'
}

export function kitSign(payload: string, length = 20): string {
  return createHmac('sha256', key()).update(payload).digest('hex').slice(0, length)
}

function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

export function signKitUnlock(kitId: string, dna: boolean): string {
  const flag = dna ? '1' : '0'
  return `${kitId}.${flag}.${kitSign(`unlock|${kitId}|${flag}`)}`
}

export function verifyKitUnlock(token: string): { kitId: string; dna: boolean } | null {
  if (typeof token !== 'string' || token.length > 80) return null
  const match = /^(kit-\d{4}-\d{2}-(?:home|away|third))\.([01])\.([0-9a-f]{20})$/.exec(token)
  if (!match) return null
  const [, kitId, flag, sig] = match as unknown as [string, string, string, string]
  return same(sig, kitSign(`unlock|${kitId}|${flag}`)) ? { kitId, dna: flag === '1' } : null
}

export function hintReceipt(seed: number, cursor: number, index: number, kind: string): string {
  return kitSign(`hint|${seed}|${cursor}|${index}|${kind}`, 16)
}

export function verifyHintReceipt(seed: number, cursor: number, index: number, kind: string, receipt: string): boolean {
  return typeof receipt === 'string' && same(receipt, hintReceipt(seed, cursor, index, kind))
}
