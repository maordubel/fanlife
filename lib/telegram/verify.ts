import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

export type VerifiedTelegramLaunch = { userId: number; authDate: number }
export class TelegramLaunchInvalid extends Error {}

/** Verify Telegram's raw initData, not initDataUnsafe. Does NOT create a Fan Life account/session. */
export function verifyTelegramLaunch(raw: unknown, token: string, now = Math.floor(Date.now() / 1000)): VerifiedTelegramLaunch {
  const invalid = () => { throw new TelegramLaunchInvalid('Invalid Telegram launch. Reopen the app from Telegram.') }
  if (!token || typeof raw !== 'string' || !raw || raw.length > 8192) return invalid()
  const fields = new URLSearchParams(raw)
  const names = [...fields.keys()]
  if (new Set(names).size !== names.length) return invalid()
  const hash = fields.get('hash')
  if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) return invalid()
  fields.delete('hash')
  fields.sort()
  const check = [...fields.entries()].map(([key, value]) => `${key}=${value}`).join('\n')
  const secret = createHmac('sha256', 'WebAppData').update(token).digest()
  const expected = createHmac('sha256', secret).update(check).digest()
  if (!timingSafeEqual(expected, Buffer.from(hash, 'hex'))) return invalid()
  const date = fields.get('auth_date')
  if (!date || !/^\d{1,12}$/.test(date)) return invalid()
  const authDate = Number(date)
  if (authDate > now + 30 || now - authDate > 3600) return invalid()
  let user: unknown
  try { user = JSON.parse(fields.get('user') || '') } catch { return invalid() }
  if (!user || typeof user !== 'object' || Array.isArray(user)) return invalid()
  const id = (user as { id?: unknown }).id
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0) return invalid()
  return { userId: id, authDate }
}
