import { NextResponse } from 'next/server'
import { TelegramLaunchInvalid, verifyTelegramLaunch } from '@/lib/telegram/verify'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

/** Public launch proof endpoint: no credentials/session cookies or private profile data are returned. */
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return reply({ error: 'Origin refused.' }, 403)
  if (!request.headers.get('content-type')?.startsWith('application/json')) return reply({ error: 'JSON required.' }, 415)
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  if (!token) return reply({ error: 'Telegram verification is not configured. Public games are still available.' }, 503)
  try {
    // Bound the stream before JSON parsing, including bodies without Content-Length.
    const reader = request.body?.getReader()
    if (!reader) return reply({ error: 'Invalid request.' }, 400)
    let size = 0
    const chunks: Uint8Array[] = []
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 16384) { await reader.cancel(); return reply({ error: 'Request too large.' }, 413) }
      chunks.push(value)
    }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { initData?: unknown }
    verifyTelegramLaunch(body?.initData, token)
    // Deliberately do not return Telegram's name, phone, username or ID to the public UI.
    return reply({ ok: true, accountLinked: false })
  } catch (error) {
    return reply({ error: error instanceof TelegramLaunchInvalid ? error.message : 'Invalid request.' }, 401)
  }
}
