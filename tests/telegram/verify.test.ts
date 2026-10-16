import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { TelegramLaunchInvalid, verifyTelegramLaunch } from '@/lib/telegram/verify'

const token = 'test-only-placeholder-not-a-real-bot-token'
const now = 1800000000
function signed(overrides: Record<string, string> = {}) {
  const fields = new URLSearchParams({ user: JSON.stringify({ id: 123456789, first_name: 'Private name' }), auth_date: String(now), query_id: 'test', ...overrides })
  fields.sort()
  const secret = createHmac('sha256', 'WebAppData').update(token).digest()
  const hash = createHmac('sha256', secret).update([...fields].map(([key, value]) => `${key}=${value}`).join('\n')).digest('hex')
  fields.set('hash', hash)
  return fields.toString()
}

describe('Telegram launch verification', () => {
  it('accepts a current, correctly signed launch and returns no public name', () => {
    expect(verifyTelegramLaunch(signed(), token, now)).toEqual({ userId: 123456789, authDate: now })
  })
  it('supports the additional signed fields without trusting their content', () => {
    expect(verifyTelegramLaunch(signed({ signature: 'example', start_param: 'hapoel-tel-aviv__xi' }), token, now).userId).toBe(123456789)
  })
  it('accepts 52-bit Telegram IDs safely', () => {
    expect(verifyTelegramLaunch(signed({ user: JSON.stringify({ id: 4503599627370495 }) }), token, now).userId).toBe(4503599627370495)
  })
  it.each([
    ['forged', () => signed().replace('query_id=test', 'query_id=forged')],
    ['duplicate key', () => signed() + '&user=%7B%22id%22%3A999%7D'],
    ['missing hash', () => 'auth_date=' + now],
    ['malformed hash', () => signed().replace(/hash=[^&]+/, 'hash=00')],
    ['expired', () => signed({ auth_date: String(now - 3601) })],
    ['future', () => signed({ auth_date: String(now + 31) })],
    ['bad date', () => signed({ auth_date: 'yesterday' })],
    ['no user', () => signed({ user: '' })],
    ['array user', () => signed({ user: '[]' })],
    ['string ID', () => signed({ user: '{"id":"123"}' })],
    ['negative ID', () => signed({ user: '{"id":-1}' })],
    ['unsafe ID', () => signed({ user: '{"id":9007199254740992}' })],
    ['oversized body', () => 'x'.repeat(8193)],
  ])('rejects %s', (_name, raw) => {
    expect(() => verifyTelegramLaunch(raw(), token, now)).toThrow(TelegramLaunchInvalid)
  })
  it('fails closed with a missing or different server token', () => {
    expect(() => verifyTelegramLaunch(signed(), '', now)).toThrow(TelegramLaunchInvalid)
    expect(() => verifyTelegramLaunch(signed(), 'another-test-token', now)).toThrow(TelegramLaunchInvalid)
  })
})
