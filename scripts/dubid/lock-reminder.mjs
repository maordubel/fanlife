/** DUBID round-lock reminder: when the site says a message is due (12 hours before the lock), send it to the linked Telegram chat and confirm. */
const base = (process.env.FAN_LIFE_URL || '').replace(/\/$/, '')
const secret = process.env.CRON_SECRET || ''
const token = process.env.TELEGRAM_BOT_TOKEN || ''
const fail = m => { console.log(`::error title=DUBID reminder::${m}`); process.exit(1) }
if (!base || secret.length < 32) fail('FAN_LIFE_RESEARCH_URL or FAN_LIFE_CRON_SECRET is missing.')
const h = {authorization: `Bearer ${secret}`}
const res = await fetch(`${base}/api/master/dubid-lock`, {headers: h, signal: AbortSignal.timeout(30_000)})
if (!res.ok) fail(`site answered ${res.status}`)
const due = await res.json()
console.log(JSON.stringify({due: due.due, reason: due.reason, stamp: due.stamp}))
if (!due.due) process.exit(0)
if (!token) fail('TELEGRAM_BOT_TOKEN is missing in GitHub secrets.')
const when = new Intl.DateTimeFormat('he-IL', {timeZone: 'Asia/Jerusalem', weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: false}).format(new Date(due.lockAt))
const text = `⏳ DUBID · מחזור ${due.number}\nהמחזור ננעל בעוד ${due.hours} שעות — ${when}.\nהשעון כבר רץ בראש האפליקציה.\n\ndubid.dubelteam.com`
const sent = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({chat_id: due.chatId, text}), signal: AbortSignal.timeout(20_000)}).then(r => r.json()).catch(e => ({ok: false, description: String(e)}))
if (!sent.ok) fail(`Telegram refused the message: ${sent.description}`)
const ok = await fetch(`${base}/api/master/dubid-lock`, {method: 'POST', headers: {...h, 'content-type': 'application/json'}, body: JSON.stringify({stamp: due.stamp})})
console.log(`::notice title=DUBID reminder::sent for ${due.stamp}; confirmed ${ok.status}`)
