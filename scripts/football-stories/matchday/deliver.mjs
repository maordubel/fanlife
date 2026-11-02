/**
 * I WAS THERE → the owner's Telegram. Sends one delivery file from `matchday/deliveries/`: the video (the reel's
 * publish cut, ≤ 49 MB, from the `matchday-publish` branch), then each copy-paste message. The chat is the one linked
 * in the control room (the Final Whistle link); the bot token lives in Actions. A delivery is sent once: the workflow
 * only runs for a delivery file that changed in the push.
 *
 *   node scripts/football-stories/matchday/deliver.mjs <delivery.json>
 */
import {readFileSync} from 'node:fs'

const base = (process.env.FAN_LIFE_URL || '').replace(/\/$/, '')
const secret = process.env.CRON_SECRET || ''
const token = process.env.TELEGRAM_BOT_TOKEN || ''
const fail = m => { console.log(`::error title=I WAS THERE delivery::${m}`); process.exit(1) }
if (!base || secret.length < 32) fail('FAN_LIFE_RESEARCH_URL or FAN_LIFE_CRON_SECRET is missing.')
if (!token) fail('TELEGRAM_BOT_TOKEN is missing in GitHub secrets.')
const d = JSON.parse(readFileSync(process.argv[2], 'utf8'))

const ping = await fetch(`${base}/api/master/final-whistle/ping`, {method: 'POST', headers: {authorization: `Bearer ${secret}`}}).then(r => r.json()).catch(() => ({}))
if (!ping.chatId) fail('No Telegram chat is linked. Control room → Operations → Final Whistle → Link Telegram.')
const clean = s => String(s).split(token).join('[token]').slice(0, 300)
const tg = async (method, body) => {
  const init = body instanceof FormData ? {method: 'POST', body} : {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)}
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {...init, signal: AbortSignal.timeout(180_000)})
  return r.json().catch(() => ({ok: false, description: `HTTP ${r.status}`}))
}

if (d.video) {
  const v = await fetch(d.video.url, {signal: AbortSignal.timeout(120_000)})
  if (!v.ok) fail(`could not fetch the video (${v.status})`)
  const bytes = Buffer.from(await v.arrayBuffer())
  if (bytes.length > 49 * 1024 * 1024) fail(`the video is ${Math.round(bytes.length / 1048576)} MB — the bot sends up to 49 MB`)
  const form = new FormData()
  form.append('chat_id', String(ping.chatId))
  form.append('video', new Blob([bytes], {type: 'video/mp4'}), d.video.name || 'reel.mp4')
  form.append('supports_streaming', 'true')
  if (d.video.width) { form.append('width', String(d.video.width)); form.append('height', String(d.video.height)) }
  if (d.video.caption) { form.append('caption', d.video.caption); form.append('parse_mode', 'HTML') }
  const r = await tg('sendVideo', form)
  if (!r.ok) fail(`Telegram refused the video: ${clean(r.description)}`)
  console.log(`video sent (${Math.round(bytes.length / 1048576)} MB)`)
}
for (const [i, text] of (d.messages || []).entries()) {
  const r = await tg('sendMessage', {chat_id: ping.chatId, text, parse_mode: 'HTML', disable_web_page_preview: true})
  if (!r.ok) fail(`Telegram refused message ${i + 1}: ${clean(r.description)}`)
  console.log(`message ${i + 1} sent`)
}
