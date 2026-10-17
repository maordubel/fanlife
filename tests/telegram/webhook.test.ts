import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/telegram/webhook/route'

const secret = 'synthetic-webhook-secret-1234567890'
const preview = 'https://fanlife-git-codex-telegram-mini-ap-1047ba-dubel-team-s-projects.vercel.app/telegram'
const update = { update_id: 1, message: { text: '/start', chat: { id: 123, type: 'private' }, from: { is_bot: false } } }
function request(body: unknown = update, header = secret) {
  return new Request('https://example.test/api/telegram/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': header }, body: JSON.stringify(body) })
}
beforeEach(() => { vi.stubEnv('TELEGRAM_WEBHOOK_SECRET', secret); vi.stubEnv('TELEGRAM_APP_URL', preview) })
afterEach(() => vi.unstubAllEnvs())
describe('Telegram welcome webhook', () => {
  it('returns a welcome and native app button only to the originating private chat', async () => {
    const response = await POST(request())
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.method).toBe('sendPhoto')
    expect(body.chat_id).toBe(123)
    expect(body.caption).toContain('FanLife.DubelTeam.com')
    expect(body.photo).toBe(new URL('/api/telegram/welcome-card?v=2',preview).href)
    expect(body.reply_markup.inline_keyboard[0][0].web_app.url).toBe(preview)
    expect(body.reply_markup.inline_keyboard[1][0].web_app.url).toBe(preview+'?choose=1')
    expect(JSON.stringify(body)).not.toContain(secret)
  })
  it('refuses unauthenticated or unconfigured requests', async () => {
    expect((await POST(request(update, 'wrong'))).status).toBe(403)
    vi.stubEnv('TELEGRAM_WEBHOOK_SECRET', '')
    expect((await POST(request())).status).toBe(503)
  })
  it('ignores group messages, unrelated text, edits and malformed chat IDs', async () => {
    for (const body of [
      { ...update, message: { ...update.message, chat: { id: -123, type: 'group' } } },
      { ...update, message: { ...update.message, text: 'hello' } },
      { update_id: 2, edited_message: update.message },
      { ...update, message: { ...update.message, chat: { id: '123', type: 'private' } } },
      null,
    ]) expect(await (await POST(request(body))).json()).toEqual({ ok: true })
  })
  it('supports addressed commands and help without interpolating user input', async () => {
    const body = await (await POST(request({ ...update, message: { ...update.message, text: '/start@FanLife_appbot unsafe-input' } }))).json()
    expect(body.method).toBe('sendPhoto')
    expect(body.caption).not.toContain('unsafe-input')
  })
  it('keeps help available as text with the same working launch buttons',async()=>{
    const body=await (await POST(request({...update,message:{...update.message,text:'/help'}}))).json()
    expect(body.method).toBe('sendMessage')
    expect(body.text).toContain('/start')
    expect(body.reply_markup.inline_keyboard[0][0].web_app.url).toBe(preview)
  })
  it('rejects untrusted app URLs', async () => {
    vi.stubEnv('TELEGRAM_APP_URL', 'https://attacker.test/telegram')
    expect((await POST(request())).status).toBe(503)
  })
  it('bounds request bodies', async () => {
    expect((await POST(request({ text: 'a'.repeat(17000) }))).status).toBe(413)
  })
})
