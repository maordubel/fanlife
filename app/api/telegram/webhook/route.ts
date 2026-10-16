import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

/** Telegram executes sendMessage from the webhook response; no outbound credential is needed here. */
export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim()
  if (!secret || !/^[A-Za-z0-9_-]{32,256}$/.test(secret)) return reply({ ok: false }, 503)
  const supplied = request.headers.get('x-telegram-bot-api-secret-token') || ''
  if (Buffer.byteLength(supplied) !== Buffer.byteLength(secret) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(secret))) return reply({ ok: false }, 403)
  if (!request.headers.get('content-type')?.startsWith('application/json')) return reply({ ok: false }, 415)
  try {
    const reader = request.body?.getReader()
    if (!reader) return reply({ ok: false }, 400)
    const chunks: Uint8Array[] = []
    let size = 0
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 16384) { await reader.cancel(); return reply({ ok: false }, 413) }
      chunks.push(value)
    }
    const update = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    const message = update?.message
    // FINAL WHISTLE: the owner links his chat with a one-time code issued by the control room (`/link CODE`)
    if (Number.isSafeInteger(update?.update_id) && message?.chat?.type === 'private' && Number.isSafeInteger(message.chat.id) && message.chat.id > 0 && message?.from?.is_bot !== true && typeof message?.text === 'string' && /^\/link(?:@\w+)?(?:\s|$)/i.test(message.text)) {
      const {redeemLink} = await import('@/lib/final-whistle/link')
      const text = await redeemLink(message.text, message.chat.id, new Date()).catch(() => 'Linking is not available right now. Try again in a minute.')
      return text ? reply({method: 'sendMessage', chat_id: message.chat.id, text}) : reply({ok: true})
    }
    if (!Number.isSafeInteger(update?.update_id) || message?.chat?.type !== 'private' || !Number.isSafeInteger(message.chat.id) || message.chat.id <= 0 || message?.from?.is_bot === true || typeof message?.text !== 'string' || !/^\/(?:start|help)(?:@FanLife_appbot)?(?:\s|$)/i.test(message.text)) return reply({ ok: true })
    const appUrl = new URL(process.env.TELEGRAM_APP_URL || 'https://fanlife.dubelteam.com/telegram')
    const allowedHosts = ['fanlife.dubelteam.com', 'fanlife-git-codex-telegram-mini-ap-1047ba-dubel-team-s-projects.vercel.app']
    if (appUrl.protocol !== 'https:' || !allowedHosts.includes(appUrl.hostname) || appUrl.port || appUrl.username || appUrl.password || appUrl.pathname !== '/telegram' || appUrl.search || appUrl.hash) return reply({ ok: false }, 503)
    return reply({
      method: 'sendMessage',
      chat_id: message.chat.id,
      text: 'FOOTBALL IS NINETY MINUTES.\nBEING A SUPPORTER IS A LIFETIME.\n\nWelcome to FAN LIFE.\nPick your club. Test your knowledge. Build your all-time XI. Have your say.\n\nYour club. Your call.\n\nFanLife.DubelTeam.com',
      reply_markup: { inline_keyboard: [[{ text: '⚽ Open FanLife', web_app: { url: appUrl.href } }]] },
    })
  } catch { return reply({ ok: false }, 400) }
}
