import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHmac } from 'node:crypto'
import { POST } from '@/app/api/telegram/verify/route'

afterEach(() => vi.unstubAllEnvs())
const request = (body = '{}', origin = 'https://fanlife.dubelteam.com', contentType = 'application/json') => new Request('https://fanlife.dubelteam.com/api/telegram/verify', {
  method: 'POST', headers: { Origin: origin, 'Content-Type': contentType }, body,
})

describe('Telegram launch proof API', () => {
  it('rejects cross-origin requests before verification', async () => {
    expect((await POST(request('{}', 'https://untrusted.example'))).status).toBe(403)
  })
  it('requires JSON', async () => {
    expect((await POST(request('{}', 'https://fanlife.dubelteam.com', 'text/plain'))).status).toBe(415)
  })
  it('does not pretend the bot is configured when the token is missing', async () => {
    vi.stubEnv('TELEGRAM_BOT_TOKEN', '')
    const response = await POST(request())
    expect(response.status).toBe(503)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })
  it('bounds streamed bodies with no Content-Length', async () => {
    vi.stubEnv('TELEGRAM_BOT_TOKEN', 'test-placeholder-only')
    expect((await POST(request('x'.repeat(17000)))).status).toBe(413)
  })
  it('rejects forged identity without emitting a session or private ID', async () => {
    vi.stubEnv('TELEGRAM_BOT_TOKEN', 'test-placeholder-only')
    const response = await POST(request('{"initData":"user=forged"}'))
    expect(response.status).toBe(401)
    expect(response.headers.get('set-cookie')).toBeNull()
    expect(await response.text()).not.toContain('test-placeholder-only')
  })
  it('returns only connection status for a valid launch, not a Fan Life login', async () => {
    const token = 'test-placeholder-only'
    vi.stubEnv('TELEGRAM_BOT_TOKEN', token)
    const fields = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000)), user: '{"id":123,"first_name":"Do not publish"}' })
    fields.sort()
    const secret = createHmac('sha256', 'WebAppData').update(token).digest()
    fields.set('hash', createHmac('sha256', secret).update([...fields].map(([k, v]) => `${k}=${v}`).join('\n')).digest('hex'))
    const response = await POST(request(JSON.stringify({ initData: fields.toString() })))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, accountLinked: false })
    expect(response.headers.get('set-cookie')).toBeNull()
  })
})
