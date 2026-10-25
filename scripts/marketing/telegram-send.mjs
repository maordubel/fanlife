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
for (const p of posts) {
  const sent = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({chat_id: p.chat_id, text: p.msg, parse_mode: 'HTML', disable_web_page_preview: true}), signal: AbortSignal.timeout(20_000)})
    .then(async r => ({status: r.status, ...(await r.json().catch(() => ({})))})).catch(e => ({unknown: true, description: String(e?.name || e)}))
  const outcome = sent.ok ? 'sent' : sent.unknown || (sent.status >= 500) ? 'unknown' : 'refused'
  const error = sent.ok ? null : String(sent.description || `status ${sent.status}`).split(token).join('[token]').slice(0, 300)
  await site({action: 'report', id: p.id, outcome, error}).catch(() => {})
  if (sent.ok) console.log(`sent post ${p.id}`); else { bad++; console.log(`::warning title=post ${p.id}::${outcome}: ${error}`) }
}
if (bad) process.exit(1)
