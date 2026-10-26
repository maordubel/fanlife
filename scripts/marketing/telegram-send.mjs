/** DUBEL TEAM social plan → the owner's Telegram. The site claims the due posts; this sends them with the bot token from Actions and reports back. */
const base = (process.env.FAN_LIFE_URL || '').replace(/\/$/, '')
const secret = process.env.CRON_SECRET || ''
const token = process.env.TELEGRAM_BOT_TOKEN || ''
const fail = m => { console.log(`::error title=DUBEL TEAM plan::${m}`); process.exit(1) }
if (!base || secret.length < 32) fail('FAN_LIFE_RESEARCH_URL or FAN_LIFE_CRON_SECRET is missing.')
if (!token) fail('TELEGRAM_BOT_TOKEN is missing in GitHub secrets.')
const site = body => fetch(`${base}/api/master/marketing`, {method: 'POST', headers: {authorization: `Bearer ${secret}`, 'content-type': 'application/json'}, body: JSON.stringify(body), signal: AbortSignal.timeout(40_000)})
const res = await site({action: 'claim'})
if (!res.ok) fail(`site answered ${res.status}: ${(await res.text()).slice(0, 200)}`)
const {posts = []} = await res.json()
console.log(`due: ${posts.length}`)
let bad = 0
/** The kit picture(s) for a post go first; the text that follows carries the hook, caption and link. A picture that
 *  cannot be drawn or is refused never holds the post back — only the text decides whether it was delivered. */
let visualsFor = async () => []
try { ({visualsFor} = await import('./kit/visual.mjs')) } catch (e) { console.log(`::warning title=DUBEL TEAM plan::visuals off — ${String(e?.message || e).slice(0, 160)}`) }
const tg = (method, form) => fetch(`https://api.telegram.org/bot${token}/${method}`, {method: 'POST', body: form, signal: AbortSignal.timeout(60_000)})
  .then(async r => ({status: r.status, ...(await r.json().catch(() => ({})))})).catch(e => ({unknown: true, description: String(e?.name || e)}))
async function sendVisuals(p) {
  const pngs = await visualsFor(p.msg, p.kit || null)
  if (!pngs.length) return
  const form = new FormData()
  form.append('chat_id', p.chat_id)
  form.append('disable_notification', 'true')
  if (pngs.length === 1) {
    form.append('photo', new Blob([pngs[0]], {type: 'image/png'}), 'post.png')
    form.append('caption', '🎨 Ready-made visual — the post follows.')
  } else {
    form.append('media', JSON.stringify(pngs.map((_, i) => ({type: 'photo', media: `attach://s${i}`, ...(i ? {} : {caption: `🎨 Ready-made carousel — ${pngs.length} slides. The post follows.`})}))))
    pngs.forEach((b, i) => form.append(`s${i}`, new Blob([b], {type: 'image/png'}), `slide-${i + 1}.png`))
  }
  const r = await tg(pngs.length === 1 ? 'sendPhoto' : 'sendMediaGroup', form)
  if (!r.ok) console.log(`::warning title=visual ${p.id}::${String(r.description || r.status).split(token).join('[token]').slice(0, 200)}`)
}
for (const p of posts) {
  await sendVisuals(p).catch(() => {})
  const sent = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({chat_id: p.chat_id, text: p.msg, parse_mode: 'HTML', disable_web_page_preview: true}), signal: AbortSignal.timeout(20_000)})
    .then(async r => ({status: r.status, ...(await r.json().catch(() => ({})))})).catch(e => ({unknown: true, description: String(e?.name || e)}))
  const outcome = sent.ok ? 'sent' : sent.unknown || (sent.status >= 500) ? 'unknown' : 'refused'
  const error = sent.ok ? null : String(sent.description || `status ${sent.status}`).split(token).join('[token]').slice(0, 300)
  await site({action: 'report', id: p.id, outcome, error}).catch(() => {})
  if (sent.ok) console.log(`sent post ${p.id}`); else { bad++; console.log(`::warning title=post ${p.id}::${outcome}: ${error}`) }
}
if (bad) process.exit(1)
