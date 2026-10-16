import {createHmac, timingSafeEqual} from 'node:crypto'

/** A render link is valid for one job and a few minutes, signed with the scheduler's secret — it is not a login. */
export const RENDER_TTL_MS = 15 * 60_000
const mac = (secret: string, jobId: string, exp: number) => createHmac('sha256', secret).update(`${jobId}.${exp}`).digest('hex')

export function signRender(secret: string, jobId: string, now: number): {exp: number; sig: string} {
  if (secret.length < 32) throw new Error('The scheduler secret is not set.')
  const exp = now + RENDER_TTL_MS
  return {exp, sig: mac(secret, jobId, exp)}
}
export function verifyRender(secret: string, jobId: string, exp: number, sig: string, now: number): boolean {
  if (secret.length < 32 || !Number.isFinite(exp) || exp < now || exp > now + RENDER_TTL_MS + 60_000) return false
  const a = Buffer.from(mac(secret, jobId, exp)), b = Buffer.from(sig)
  return a.length === b.length && timingSafeEqual(a, b)
}
