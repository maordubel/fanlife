import { hashSeed } from '@/lib/voice/hash'

/**
 * The wire — how a challenge becomes a URL segment and back. Client-safe, no deps.
 *
 * base64url over a small ASCII JSON object. Not a secret (gate 10's secret is sealed on
 * the server BEFORE it reaches this layer); a compact, URL-safe container whose every
 * field is re-validated on the way in (`resolve.ts`).
 */

const B36_5 = 36 ** 5

/** A short opaque hash of an entity id — 5 base36 characters, same on every runtime. */
export function entityHash(id: string): string {
  return (hashSeed(`worker-entity|${id}`) % B36_5).toString(36).padStart(5, '0')
}

/** A run fingerprint — 6 base36 characters over the ids a deal produced, in order. */
export function fingerprintOf(ids: readonly string[]): string {
  return (hashSeed(`worker-run|${ids.join('\u0001')}`) % 36 ** 6).toString(36).padStart(6, '0')
}

export function bitsOf(marks: readonly boolean[]): string {
  let n = 0
  marks.forEach((mark, i) => {
    if (mark) n += 2 ** i
  })
  return n.toString(36)
}

export function marksOf(bits: string, length: number): boolean[] | null {
  if (!/^[0-9a-z]{1,8}$/.test(bits)) return null
  const n = parseInt(bits, 36)
  if (!Number.isSafeInteger(n) || n < 0 || n >= 2 ** length) return null
  return Array.from({ length }, (_, i) => Math.floor(n / 2 ** i) % 2 === 1)
}

function toBase64Url(text: string): string {
  const b64 =
    typeof btoa === 'function' ? btoa(text) : Buffer.from(text, 'binary').toString('base64')
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(code: string): string | null {
  if (!/^[A-Za-z0-9_-]{4,1600}$/.test(code)) return null
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (code.length % 4)) % 4)
  try {
    return typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary')
  } catch {
    return null
  }
}

export function packJson(value: unknown): string {
  const json = JSON.stringify(value)
  // the wire is ASCII by construction; a non-ASCII character here is a bug upstream
  if (!/^[\x20-\x7e]*$/.test(json)) throw new Error('challenge wire must be ASCII')
  return toBase64Url(json)
}

export function unpackJson(code: string): unknown {
  const text = fromBase64Url(code)
  if (text === null || !/^[\x20-\x7e]*$/.test(text)) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

/** Days since 1970-01-01 (UTC). */
export function dayNumber(now: number = Date.now()): number {
  return Math.floor(now / 86_400_000)
}
