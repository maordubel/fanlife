/**
 * FINAL WHISTLE delivery check (Actions → "Final Whistle · send test"). Asks the site which chat is linked, asks Telegram who that
 * chat is and what the webhook says, sends one short message to it, and prints the answers as annotations. Nothing secret is printed.
 */
const base = (process.env.FAN_LIFE_URL || '').replace(/\/$/, '')
const secret = process.env.CRON_SECRET || ''
const token = process.env.TELEGRAM_BOT_TOKEN || ''
const note = m => console.log(`::notice title=Final Whistle test::${m}`)
const fail = m => { console.log(`::error title=Final Whistle test::${m}`); process.exit(1) }
if (!base || secret.length < 32) fail('FAN_LIFE_RESEARCH_URL or FAN_LIFE_CRON_SECRET is missing.')
if (!token) fail('TELEGRAM_BOT_TOKEN is missing in GitHub secrets.')
const tg = async (method, body) => { const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body ?? {}), signal: AbortSignal.timeout(20_000)}); return r.json().catch(() => ({ok: false, description: `HTTP ${r.status}`})) }
const ping = await fetch(`${base}/api/master/final-whistle/ping`, {method: 'POST', headers: {authorization: `Bearer ${secret}`}}).then(r => r.json())
if (!ping.chatId) fail('No Telegram chat is linked yet. Control room → Operations → Final Whistle → Link Telegram.')
const me = await tg('getMe')
note(`bot: @${me.result?.username ?? '?'}`)
const chat = await tg('getChat', {chat_id: ping.chatId})
note(chat.ok ? `linked chat: ${chat.result.type}, name "${[chat.result.first_name, chat.result.last_name].filter(Boolean).join(' ')}", username ${chat.result.username ? '@' + chat.result.username : '(none)'}` : `getChat failed: ${chat.description}`)
const hook = await tg('getWebhookInfo')
note(`webhook: ${hook.result?.url ? 'set' : 'not set'}, pending ${hook.result?.pending_update_count ?? '?'}${hook.result?.last_error_message ? `, last error: ${hook.result.last_error_message}` : ''}`)
const sent = await tg('sendMessage', {chat_id: ping.chatId, text: 'FINAL WHISTLE · test\nIf you can read this, result cards will arrive in this chat.\n\nFanLife.DubelTeam.com'})
if (!sent.ok) fail(`Telegram refused the message: ${sent.description}`)
note(`sent, message ${sent.result.message_id}`)
