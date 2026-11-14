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
let storyFor = async () => null
try { ({visualsFor, storyFor} = await import('./kit/visual.mjs')) } catch (e) { console.log(`::warning title=DUBEL TEAM plan::visuals off — ${String(e?.message || e).slice(0, 160)}`) }
const tg = (method, form) => fetch(`https://api.telegram.org/bot${token}/${method}`, {method: 'POST', body: form, signal: AbortSignal.timeout(60_000)})
  .then(async r => ({status: r.status, ...(await r.json().catch(() => ({})))})).catch(e => ({unknown: true, description: String(e?.name || e)}))
let publishToMeta = async () => ({line: ''})
try { ({publishToMeta} = await import('./meta-publish.mjs')) } catch (e) { console.log(`::warning title=DUBEL TEAM plan::Meta publisher off — ${String(e?.message || e).slice(0, 160)}`) }
let publishToX = async () => ({line: ''})
try { ({publishToX} = await import('./x-publish.mjs')) } catch (e) { console.log(`::warning title=DUBEL TEAM plan::X publisher off — ${String(e?.message || e).slice(0, 160)}`) }
async function sendVisuals(p, pngs) {
  const brief = p.kit?.data?.briefing === true
  if (!pngs.length) return
  const form = new FormData()
  form.append('chat_id', p.chat_id)
  form.append('disable_notification', 'true')
  if (pngs.length === 1) {
    form.append('photo', new Blob([pngs[0]], {type: 'image/png'}), 'post.png')
    form.append('caption', brief ? '☀️ Morning briefing — today at a glance. Details follow.' : '🎨 Ready-made visual — the post follows.')
  } else {
    form.append('media', JSON.stringify(pngs.map((_, i) => ({type: 'photo', media: `attach://s${i}`, ...(i ? {} : {caption: brief ? '☀️ Morning briefing — today at a glance. Details follow.' : `🎨 Ready-made carousel — ${pngs.length} slides. The post follows.`})}))))
    pngs.forEach((b, i) => form.append(`s${i}`, new Blob([b], {type: 'image/png'}), `slide-${i + 1}.png`))
  }
  const r = await tg(pngs.length === 1 ? 'sendPhoto' : 'sendMediaGroup', form)
  if (!r.ok) console.log(`::warning title=visual ${p.id}::${String(r.description || r.status).split(token).join('[token]').slice(0, 200)}`)
}
for (const p of posts) {
  const pngs = await visualsFor(p.msg, p.kit || null).catch(() => [])
  const meta = await publishToMeta(p, pngs).catch(() => ({line: ''}))
  // plan v5: published on both, nothing left for the owner's hands → one quiet line, no pictures
  const quiet = !(Array.isArray(p.kit?.to) && p.kit.to.includes('tiktok')) && String(meta.facebook || '').startsWith('published') && String(meta.instagram || '').startsWith('published')
  if (!quiet) await sendVisuals(p, pngs).catch(() => {})
  // v4: the story that moves, ready for Instagram, Facebook and TikTok stories
  const mp4 = await storyFor(p.kit || null).catch(() => null)
  if (mp4) { const f = new FormData(); f.append('chat_id', p.chat_id); f.append('disable_notification', 'true'); f.append('supports_streaming', 'true'); f.append('video', new Blob([mp4], {type: 'video/mp4'}), 'story.mp4'); f.append('caption', '🎬 Story that moves — post it to Instagram, Facebook and TikTok stories.'); await tg('sendVideo', f).catch(() => {}) }
  if (meta.facebook) console.log(`meta ${p.id}: facebook ${meta.facebook} · instagram ${meta.instagram}`)
  const x = await publishToX(p, pngs).catch(() => ({line: ''}))
  if (x.x) console.log(`x ${p.id}: ${x.x}`)
  const tiktok = Array.isArray(p.kit?.to) && p.kit.to.includes('tiktok') ? '📱 <b>TikTok</b>: post these slides as a photo carousel (Photo mode); caption and tags from the box below.' : ''
  const head = [meta.line, x.line, tiktok].filter(Boolean).join('\n')
  const sent = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({chat_id: p.chat_id, text: quiet ? `✅ <b>Published</b> · Facebook + Instagram${meta.story ? ' stories' : ''} · post ${p.id}` : head ? `${head}\n${p.msg}` : p.msg, parse_mode: 'HTML', disable_web_page_preview: true, disable_notification: quiet}), signal: AbortSignal.timeout(20_000)})
    .then(async r => ({status: r.status, ...(await r.json().catch(() => ({})))})).catch(e => ({unknown: true, description: String(e?.name || e)}))
  const outcome = sent.ok ? 'sent' : sent.unknown || (sent.status >= 500) ? 'unknown' : 'refused'
  const error = sent.ok ? null : String(sent.description || `status ${sent.status}`).split(token).join('[token]').slice(0, 300)
  await site({action: 'report', id: p.id, outcome, error, published: {facebook: meta.facebook || null, instagram: meta.instagram || null, x: x.x || null}}).catch(() => {})
  if (sent.ok) console.log(`sent post ${p.id}`); else { bad++; console.log(`::warning title=post ${p.id}::${outcome}: ${error}`) }
}
if (bad) process.exit(1)
