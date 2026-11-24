/**
 * The owner's cookie, verified in the middleware (Edge runtime: Web Crypto, no `node:crypto`). The same rules as
 * `admin-token.ts` — the signing secret is HMAC(key, 'fan-life-admin-session-v1'), the token `v1.<iat>.<exp>.<hmac>` —
 * so a cookie the control room issued opens LIFE and nothing else does.
 */
import {ADMIN_COOKIE, ADMIN_SESSION_DAYS, adminPolicy, configuredKey, type AdminEnv} from './admin-token-pure'

const enc = new TextEncoder()
const b64url = (buf: ArrayBuffer) => {
  let s = ''
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
async function hmac(key: BufferSource, data: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey('raw', key, {name: 'HMAC', hash: 'SHA-256'}, false, ['sign'])
  return crypto.subtle.sign('HMAC', k, enc.encode(data))
}

export async function ownerFromCookie(env: AdminEnv, cookie: string | undefined, now = Math.floor(Date.now() / 1000)): Promise<boolean> {
  const policy = adminPolicy(env)
  if (policy === 'open-dev') return true
  if (policy === 'closed') return false
  const key = configuredKey(env)
  if (!cookie || cookie.length > 200) return false
  const m = /^v1\.(\d{1,12})\.(\d{1,12})\.([A-Za-z0-9_-]{43})$/.exec(cookie)
  if (!m) return false
  const iat = Number(m[1]), exp = Number(m[2])
  if (!(iat <= now + 60 && exp > now && exp - iat <= ADMIN_SESSION_DAYS * 86400)) return false
  const secret = await hmac(enc.encode(key) as Uint8Array<ArrayBuffer>, 'fan-life-admin-session-v1')
  const want = b64url(await hmac(secret, `v1.${m[1]}.${m[2]}`))
  if (want.length !== m[3]!.length) return false
  let diff = 0
  for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ m[3]!.charCodeAt(i)
  return diff === 0
}
export {ADMIN_COOKIE}
