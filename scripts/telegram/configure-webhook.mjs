/** Owner-run activation only; never invoked by a build or deployment. */
const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim()
const rawUrl = process.env.TELEGRAM_APP_URL?.trim()
const allowed = ['fanlife.dubelteam.com', 'fanlife-git-codex-telegram-mini-ap-1047ba-dubel-team-s-projects.vercel.app']
async function api(method, body) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) })
    const data = await response.json()
    if (!response.ok || !data.ok) throw new Error()
    return data.result
  } catch { throw new Error(`Telegram ${method} failed; inspect configuration privately.`) }
}
try {
  if (!token || !secret || !/^[A-Za-z0-9_-]{32,256}$/.test(secret) || !rawUrl) throw new Error('Set TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET and TELEGRAM_APP_URL securely first.')
  const app = new URL(rawUrl)
  if (app.protocol !== 'https:' || !allowed.includes(app.hostname) || app.port || app.username || app.password || app.pathname !== '/telegram' || app.search || app.hash) throw new Error('Use the exact approved production or test /telegram URL.')
  const webhook = new URL('/api/telegram/webhook', app)
  const me = await api('getMe', {})
  if (me.username?.toLowerCase() !== 'fanlife_appbot') throw new Error('Wrong bot; nothing changed.')
  // Probe authentic delivery before redirecting the real bot. Empty update sends no message.
  let probe
  try {
    probe = await fetch(webhook, { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': secret }, body: '{}', signal: AbortSignal.timeout(15000) })
  } catch { throw new Error('Webhook is not publicly reachable; nothing changed.') }
  if (!probe.ok || (await probe.json()).ok !== true) throw new Error('Deploy matching webhook configuration first; nothing changed.')
  const existing = await api('getWebhookInfo', {})
  if (existing.url && existing.url !== webhook.href) throw new Error('Another webhook is already connected. Review it before replacing; nothing changed.')
  await api('setWebhook', { url: webhook.href, secret_token: secret, allowed_updates: ['message'], drop_pending_updates: false })
  console.log('Welcome webhook connected. Send /start to @FanLife_appbot and test Open FanLife.')
} catch (error) {
  // Never print native fetch exceptions: they can contain the bot credential in a URL.
  const message = error instanceof Error ? error.message : 'Configuration failed.'
  console.error(token && message.includes(token) ? 'Configuration failed.' : message)
  process.exitCode = 1
}
