/**
 * Links the owner's Telegram chat (spec §11.1) without a terminal: run from Actions → "Final Whistle · link Telegram".
 * The owner opens the bot, taps Start, and taps "Share my number". Only the person whose OWN contact carries the expected number,
 * in a private chat, is linked. The chat id goes to the private store through the site; the phone number is only compared.
 */
import {callTelegram, judgeContact} from '../../lib/final-whistle/telegram.ts'

const token = process.env.TELEGRAM_BOT_TOKEN || ''
const phone = process.env.FINAL_WHISTLE_OWNER_PHONE || ''
const base = (process.env.FAN_LIFE_URL || '').replace(/\/$/, '')
const secret = process.env.CRON_SECRET || ''
if (!token) { console.error('TELEGRAM_BOT_TOKEN is not set in GitHub secrets.'); process.exit(1) }
if (phone.replace(/\D/g, '').length < 8) { console.error('FINAL_WHISTLE_OWNER_PHONE is not set in GitHub secrets.'); process.exit(1) }
if (!base || secret.length < 32) { console.error('FAN_LIFE_URL or the scheduler secret is missing.'); process.exit(1) }

const deadline = Date.now() + 4.5 * 60_000
let offset = 0
console.log('Waiting up to 4 minutes: open the bot, tap Start, then tap “Share my number”.')
while (Date.now() < deadline) {
  const u = await callTelegram(token, 'getUpdates', {offset, timeout: 20, allowed_updates: ['message']}, fetch, 30_000)
  if (!u.ok) { console.error(/409|Conflict/i.test(u.error) ? 'The bot has a webhook set, so updates cannot be read this way.' : `Telegram: ${u.error}`); process.exit(1) }
  for (const up of u.result ?? []) {
    offset = up.update_id + 1
    const m = up.message
    if (!m || m.chat?.type !== 'private') continue
    if (m.contact) {
      const j = judgeContact(m, phone)
      if (!j.ok) { await callTelegram(token, 'sendMessage', {chat_id: m.chat.id, text: 'That did not match, so nothing was linked.', reply_markup: {remove_keyboard: true}}); console.log('rejected:', j.why); continue }
      const r = await fetch(`${base}/api/master/final-whistle/link`, {method: 'POST', headers: {authorization: `Bearer ${secret}`, 'content-type': 'application/json'}, body: JSON.stringify({chatId: j.chatId})})
      await callTelegram(token, 'sendMessage', {chat_id: m.chat.id, text: r.ok ? 'Linked. Final Whistle will send results here.' : 'Could not save the link. Try again.', reply_markup: {remove_keyboard: true}})
      console.log(r.ok ? 'LINKED' : `save failed (${r.status})`)
      process.exit(r.ok ? 0 : 1)
    }
    if ((m.text ?? '').startsWith('/start')) {
      await callTelegram(token, 'sendMessage', {chat_id: m.chat.id, text: 'To link this chat, tap the button to share your own number.', reply_markup: {keyboard: [[{text: 'Share my number', request_contact: true}]], resize_keyboard: true, one_time_keyboard: true}})
    }
  }
}
console.error('Timed out — run it again and finish within four minutes.')
process.exit(1)
