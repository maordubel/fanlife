import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {memoryStore, useDurableStore} from '@/lib/master/durable'
import {POST} from '@/app/api/telegram/webhook/route'
import {issueLinkCode} from '@/lib/final-whistle/link'
import {getDestination} from '@/lib/final-whistle/service'

const secret = 'synthetic-webhook-secret-1234567890'
const send = (text: string, chat = {id: 777, type: 'private'}) => POST(new Request('https://example.test/api/telegram/webhook', {method: 'POST', headers: {'content-type': 'application/json', 'x-telegram-bot-api-secret-token': secret}, body: JSON.stringify({update_id: 2, message: {text, chat, from: {is_bot: false}}})}))
beforeEach(() => { vi.stubEnv('TELEGRAM_WEBHOOK_SECRET', secret); useDurableStore(memoryStore()) })
afterEach(() => { vi.unstubAllEnvs(); useDurableStore(null) })

describe('/link through the welcome webhook', () => {
  it('links the private chat that sends the right code and answers in the chat', async () => {
    const {code} = await issueLinkCode(new Date())
    const body = await (await send(`/link ${code}`)).json()
    expect(body).toMatchObject({method: 'sendMessage', chat_id: 777})
    expect(body.text).toMatch(/^Linked/)
    expect((await getDestination())?.chatId).toBe('777')
  })
  it('a wrong code links nothing; a group chat is ignored', async () => {
    await issueLinkCode(new Date())
    expect((await (await send('/link NOPE2345')).json()).text).toMatch(/not valid/)
    expect(await (await send('/link NOPE2345', {id: -5, type: 'group'})).json()).toEqual({ok: true})
    expect(await getDestination()).toBeNull()
  })
})
