/**
 * Football Stories → Facebook, Instagram, X and TikTok (owner, 4.11.2026: "full automation").
 * Run by .github/workflows/stories-social.yml every 10 minutes. docs/fanlife/61-stories-social-publishing.md.
 *
 * The studio (Desk → Studio → a finished film → Social) stores each post on its job. This runner:
 *   1. tells the studio which platforms it can publish to (yes/no only — never a token) and asks for the due posts;
 *   2. claims each one ONCE (a claimed post is never published twice, whatever happens next);
 *   3. publishes it when automatic publishing is on (repository variable STORIES_SOCIAL_AUTOPUBLISH = 1) AND that
 *      platform's secrets are set — otherwise sends the owner a ready copy-paste pack on Telegram (caption in one copy
 *      box, first comment in a second, the file attached), and marks the post `manual`;
 *   4. reports the result. A refusal is reported, not retried, and the pack goes to Telegram so it can go up by hand.
 * Plain Node 22 (fetch, crypto): no install step. The Meta Graph helper is the social plan's own (meta-publish.mjs).
 */
import {createHmac, randomBytes} from 'node:crypto'
import {pathToFileURL} from 'node:url'
import {graph} from '../../marketing/meta-publish.mjs'

const NAME = {facebook: 'Facebook', instagram: 'Instagram', x: 'X', tiktok: 'TikTok'}
const wait = ms => new Promise(r => setTimeout(r, ms))
const ATHENS = new Intl.DateTimeFormat('en-GB', {timeZone: 'Europe/Athens', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'})
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function config(env = process.env) {
  const s = k => String(env[k] || '').trim()
  const version = /^v\d+\.\d+$/.test(s('META_GRAPH_VERSION')) ? s('META_GRAPH_VERSION') : 'v23.0'
  return {
    autopublish: s('STORIES_SOCIAL_AUTOPUBLISH') === '1',
    telegram: s('TELEGRAM_BOT_TOKEN'),
    meta: {page: /^\d+$/.test(s('META_PAGE_ID')) ? s('META_PAGE_ID') : '', token: s('META_PAGE_TOKEN'), ig: /^\d+$/.test(s('META_IG_USER_ID')) ? s('META_IG_USER_ID') : '', version},
    x: {key: s('X_API_KEY'), secret: s('X_API_SECRET'), token: s('X_ACCESS_TOKEN'), tokenSecret: s('X_ACCESS_SECRET')},
    tiktok: {token: s('TIKTOK_ACCESS_TOKEN'), clientKey: s('TIKTOK_CLIENT_KEY'), clientSecret: s('TIKTOK_CLIENT_SECRET'), refresh: s('TIKTOK_REFRESH_TOKEN'), privacy: s('TIKTOK_PRIVACY')},
  }
}
/** Which platforms have their secrets — booleans only, the only thing that leaves this runner. */
export function lights(cfg) {
  const meta = !!cfg.meta.page && cfg.meta.token.length > 40
  return {
    autopublish: cfg.autopublish, telegram: !!cfg.telegram,
    facebook: meta, instagram: meta && !!cfg.meta.ig,
    x: !!(cfg.x.key && cfg.x.secret && cfg.x.token && cfg.x.tokenSecret),
    tiktok: !!cfg.tiktok.token || !!(cfg.tiktok.refresh && cfg.tiktok.clientKey && cfg.tiktok.clientSecret),
  }
}
/** Every secret value is cut out of anything that is logged or reported. */
export function redactor(cfg) {
  const secrets = [cfg.telegram, cfg.meta.token, cfg.x.key, cfg.x.secret, cfg.x.token, cfg.x.tokenSecret, cfg.tiktok.token, cfg.tiktok.clientSecret, cfg.tiktok.refresh].filter(v => v && v.length >= 8)
  return v => { let s = String(v?.message ?? v ?? ''); for (const x of secrets) s = s.split(x).join('[secret]'); return s.replace(/\s+/g, ' ').slice(0, 300) }
}

// ── X: OAuth 1.0a user context (RFC 5849, HMAC-SHA1) ─────────────────────────────────────────────────────────────
const pct = s => encodeURIComponent(String(s)).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())
/** The Authorization header for one request. `form` = url-encoded body params (signed); JSON and multipart bodies are not. */
export function oauth1(method, url, creds, form = {}, nonce = randomBytes(16).toString('hex'), timestamp = Math.floor(Date.now() / 1000)) {
  const u = new URL(url)
  const oauth = {oauth_consumer_key: creds.key, oauth_nonce: nonce, oauth_signature_method: 'HMAC-SHA1', oauth_timestamp: String(timestamp), oauth_token: creds.token, oauth_version: '1.0'}
  const pairs = [...Object.entries(oauth), ...Object.entries(form), ...u.searchParams.entries()].map(([k, v]) => [pct(k), pct(v)])
  pairs.sort((a, b) => a[0] === b[0] ? (a[1] < b[1] ? -1 : 1) : (a[0] < b[0] ? -1 : 1))
  const base = [method.toUpperCase(), pct(u.origin + u.pathname), pct(pairs.map(([k, v]) => `${k}=${v}`).join('&'))].join('&')
  const signature = createHmac('sha1', `${pct(creds.secret)}&${pct(creds.tokenSecret)}`).update(base).digest('base64')
  return 'OAuth ' + Object.entries({...oauth, oauth_signature: signature}).map(([k, v]) => `${pct(k)}="${pct(v)}"`).join(', ')
}
const X_API = 'https://api.x.com/2'
async function xCall(cfg, method, path, {json, form} = {}) {
  const url = `${X_API}${path}`
  const headers = {authorization: oauth1(method, url, cfg.x)}
  let body
  if (json) { headers['content-type'] = 'application/json'; body = JSON.stringify(json) }
  else if (form) body = form
  const r = await fetch(url, {method, headers, body, signal: AbortSignal.timeout(120_000)})
  const j = await r.json().catch(() => ({}))
  if (!r.ok || j.errors?.length && !j.data) throw new Error(`X ${path.split('?')[0]}: ${j.detail || j.title || j.errors?.[0]?.message || `status ${r.status}`}`)
  return j
}
async function xUpload(cfg, bytes, video) {
  const init = await xCall(cfg, 'POST', '/media/upload/initialize', {json: {media_type: video ? 'video/mp4' : 'image/jpeg', total_bytes: bytes.length, media_category: video ? 'tweet_video' : 'tweet_image'}})
  const id = init.data?.id
  if (!id) throw new Error('X did not open an upload')
  const CHUNK = 4 * 1024 * 1024
  for (let i = 0, seg = 0; i < bytes.length; i += CHUNK, seg++) {
    const f = new FormData()
    f.append('segment_index', String(seg))
    f.append('media', new Blob([bytes.subarray(i, i + CHUNK)]), 'chunk')
    await xCall(cfg, 'POST', `/media/upload/${id}/append`, {form: f})
  }
  let info = (await xCall(cfg, 'POST', `/media/upload/${id}/finalize`)).data?.processing_info
  for (let n = 0; info && info.state !== 'succeeded' && n < 40; n++) {
    if (info.state === 'failed') throw new Error(`X could not process the ${video ? 'video' : 'picture'}`)
    await wait(Math.min(15, Math.max(2, info.check_after_secs || 5)) * 1000)
    info = (await xCall(cfg, 'GET', `/media/upload?command=STATUS&media_id=${id}`)).data?.processing_info
  }
  if (info && info.state !== 'succeeded') throw new Error('X was still processing the video after ten minutes')
  return id
}
async function publishX(cfg, post, media, bytes) {
  const ids = bytes ? [await xUpload(cfg, bytes, media.kind === 'short')] : []
  const tweet = (await xCall(cfg, 'POST', '/tweets', {json: {text: post.caption, ...(ids.length ? {media: {media_ids: ids}} : {})}})).data
  let note = ''
  if (post.comment) await xCall(cfg, 'POST', '/tweets', {json: {text: post.comment, reply: {in_reply_to_tweet_id: tweet.id}}}).catch(e => { note = ' · the first reply was refused — add it by hand' })
  return {result: `post ${tweet.id}${note}`, url: `https://x.com/i/web/status/${tweet.id}`}
}

// ── Facebook and Instagram (Meta Graph API, the Page's own token) ───────────────────────────────────────────────
async function rupload(url, token, bytes) {
  const r = await fetch(url, {method: 'POST', headers: {authorization: `OAuth ${token}`, offset: '0', file_size: String(bytes.length), 'content-type': 'application/octet-stream'}, body: bytes, signal: AbortSignal.timeout(600_000)})
  const j = await r.json().catch(() => ({}))
  if (!r.ok || j.success === false || j.error) throw new Error(`upload refused: ${j.error?.message || j.debug_info?.message || `status ${r.status}`}`)
  return j
}
async function publishFacebook(cfg, post, film, media, bytes) {
  const api = graph({version: cfg.meta.version, token: cfg.meta.token})
  const page = cfg.meta.page
  let id, url, note = ''
  if (media?.kind === 'short') {
    // Reels: start → upload the bytes (rupload.facebook.com) → finish and publish
    const start = await api(`${page}/video_reels`, {upload_phase: 'start'})
    await rupload(start.upload_url || `https://rupload.facebook.com/video-upload/${cfg.meta.version}/${start.video_id}`, cfg.meta.token, bytes)
    const done = await api(`${page}/video_reels`, {upload_phase: 'finish', video_id: start.video_id, video_state: 'PUBLISHED', description: post.caption})
    if (done.success === false) throw new Error('Facebook did not accept the Reel')
    id = start.video_id
    for (let i = 0; i < 30; i++) {
      const s = await api(id, {fields: 'status'}, {method: 'GET'}).catch(() => null)
      const st = s?.status
      if (st?.video_status === 'error' || st?.processing_phase?.status === 'error') throw new Error('Facebook could not process the Reel')
      if (st?.video_status === 'ready' || st?.publishing_phase?.status === 'complete') break
      await wait(8000)
    }
    url = `https://www.facebook.com/reel/${id}`
  } else if (/^https:\/\/youtu\.be\//.test(film.link)) {
    // a link post: Facebook draws the YouTube preview itself
    id = (await api(`${page}/feed`, {message: post.caption, link: film.link})).id
    url = `https://www.facebook.com/${id}`
  } else if (bytes) {
    const form = new FormData()
    form.append('source', new Blob([bytes], {type: 'image/jpeg'}), media?.name || 'thumbnail.jpg')
    form.append('message', post.caption)
    const r = await api(`${page}/photos`, {}, {form})
    id = r.post_id || r.id
    url = `https://www.facebook.com/${id}`
  } else {
    id = (await api(`${page}/feed`, {message: post.caption})).id
    url = `https://www.facebook.com/${id}`
  }
  if (post.comment) await api(`${id}/comments`, {message: post.comment}).catch(() => { note = ' · the first comment was refused — add it by hand' })
  return {result: `${media?.kind === 'short' ? 'reel' : 'post'} ${id}${note}`, url}
}
async function publishInstagram(cfg, post, film, media, bytes) {
  const api = graph({version: cfg.meta.version, token: cfg.meta.token})
  const ig = cfg.meta.ig
  let creation
  if (media?.kind === 'short') {
    // resumable upload: the bytes go straight to Meta, no public URL needed
    const c = await api(`${ig}/media`, {media_type: 'REELS', upload_type: 'resumable', caption: post.caption, share_to_feed: 'true'})
    creation = c.id
    await rupload(c.uri || `https://rupload.facebook.com/ig-api-upload/${cfg.meta.version}/${creation}`, cfg.meta.token, bytes)
  } else {
    if (!media?.url) throw new Error('Instagram needs a picture and none was handed over')
    creation = (await api(`${ig}/media`, {image_url: media.url, caption: post.caption})).id
  }
  let ok = false
  for (let i = 0; i < 45; i++) {
    const s = await api(creation, {fields: 'status_code,status'}, {method: 'GET'}).catch(() => ({}))
    if (s.status_code === 'FINISHED') { ok = true; break }
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error(`Instagram could not process the file (${String(s.status || s.status_code).slice(0, 120)})`)
    await wait(8000)
  }
  if (!ok) throw new Error('Instagram was still processing after six minutes')
  const id = (await api(`${ig}/media_publish`, {creation_id: creation})).id
  let note = ''
  if (post.comment) await api(`${id}/comments`, {message: post.comment}).catch(() => { note = ' · the first comment was refused — add it by hand' })
  const link = await api(id, {fields: 'permalink'}, {method: 'GET'}).catch(() => ({}))
  return {result: `${media?.kind === 'short' ? 'reel' : 'post'} ${id}${note}`, url: link.permalink || null}
}

// ── TikTok (Content Posting API, direct post) ──────────────────────────────────────────────────────────────────
const TT = 'https://open.tiktokapis.com/v2'
async function tiktokToken(cfg) {
  if (cfg.tiktok.refresh && cfg.tiktok.clientKey && cfg.tiktok.clientSecret) {
    const r = await fetch(`${TT}/oauth/token/`, {method: 'POST', headers: {'content-type': 'application/x-www-form-urlencoded'}, signal: AbortSignal.timeout(30_000),
      body: new URLSearchParams({client_key: cfg.tiktok.clientKey, client_secret: cfg.tiktok.clientSecret, grant_type: 'refresh_token', refresh_token: cfg.tiktok.refresh})})
    const j = await r.json().catch(() => ({}))
    if (j.access_token) return j.access_token
    if (!cfg.tiktok.token) throw new Error(`TikTok refused the refresh token: ${j.error_description || j.error || r.status}`)
  }
  return cfg.tiktok.token
}
async function tt(token, path, body) {
  const r = await fetch(`${TT}${path}`, {method: 'POST', headers: {authorization: `Bearer ${token}`, 'content-type': 'application/json; charset=UTF-8'}, body: JSON.stringify(body ?? {}), signal: AbortSignal.timeout(60_000)})
  const j = await r.json().catch(() => ({}))
  if (!r.ok || (j.error?.code && j.error.code !== 'ok')) throw new Error(`TikTok ${path}: ${j.error?.message || j.error?.code || `status ${r.status}`}`)
  return j.data || {}
}
/** TikTok's chunk rule: one chunk up to 64 MB; beyond that 10 MB chunks and the last one takes the remainder. */
export function tiktokChunks(size) {
  const MAX = 64 * 1024 * 1024, CH = 10 * 1024 * 1024
  if (size <= MAX) return {chunk: size, count: 1}
  return {chunk: CH, count: Math.floor(size / CH)}
}
async function publishTikTok(cfg, post, film, media, bytes) {
  if (media?.kind !== 'short' || !bytes) throw new Error('TikTok takes a video: this post has no Short')
  const token = await tiktokToken(cfg)
  const creator = await tt(token, '/post/publish/creator_info/query/')
  const options = creator.privacy_level_options || []
  const privacy = [cfg.tiktok.privacy, 'PUBLIC_TO_EVERYONE', 'SELF_ONLY'].find(p => p && options.includes(p)) || options[0]
  if (!privacy) throw new Error('TikTok offered no privacy level for this account')
  const {chunk, count} = tiktokChunks(bytes.length)
  const init = await tt(token, '/post/publish/video/init/', {
    post_info: {title: post.caption, privacy_level: privacy, disable_comment: false, disable_duet: false, disable_stitch: false, brand_content_toggle: false, brand_organic_toggle: false, is_aigc: film.synthetic === true},
    source_info: {source: 'FILE_UPLOAD', video_size: bytes.length, chunk_size: chunk, total_chunk_count: count},
  })
  for (let i = 0; i < count; i++) {
    const a = i * chunk, b = i === count - 1 ? bytes.length : a + chunk
    const r = await fetch(init.upload_url, {method: 'PUT', headers: {'content-type': 'video/mp4', 'content-length': String(b - a), 'content-range': `bytes ${a}-${b - 1}/${bytes.length}`}, body: bytes.subarray(a, b), signal: AbortSignal.timeout(600_000)})
    if (!r.ok && r.status !== 206) throw new Error(`TikTok refused part ${i + 1} of the video (${r.status})`)
  }
  for (let n = 0; n < 40; n++) {
    const s = await tt(token, '/post/publish/status/fetch/', {publish_id: init.publish_id})
    if (s.status === 'PUBLISH_COMPLETE') {
      const vid = (s.publicaly_available_post_id || s.publicly_available_post_id || [])[0]
      return {result: `video ${vid || init.publish_id} · ${privacy === 'PUBLIC_TO_EVERYONE' ? 'public' : `privacy ${privacy}`} · first comment: paste it by hand (TikTok has no comment API)`, url: null, comment: true}
    }
    if (s.status === 'FAILED') throw new Error(`TikTok could not publish the video (${s.fail_reason || 'no reason given'})`)
    await wait(8000)
  }
  return {result: `uploaded ${init.publish_id} · TikTok is still processing — check the app · first comment by hand`, url: null, comment: true}
}

const PUBLISH = {facebook: publishFacebook, instagram: publishInstagram, x: publishX, tiktok: publishTikTok}

// ── Telegram: the owner's ready copy-paste pack (marketing rule 127: caption in a copy box, link in the first comment) ──
export function packMessage(post, film, reason) {
  const label = post.platform === 'tiktok' ? 'TikTok video' : post.media?.kind === 'short' ? (post.platform === 'x' ? 'Post with video' : 'Reel') : 'Post'
  const steps = {
    facebook: 'Facebook → the Page → Create → Reel (or Post) → attach the file above → paste the caption → publish → paste the first comment under it.',
    instagram: 'Instagram → + → Reel (or Post) → the file above → paste the caption → Share → paste the first comment under it.',
    x: 'X → Post → attach the file above → paste the caption → Post → reply to it with the first comment.',
    tiktok: 'TikTok → + → Upload → the file above → paste the caption → turn on "AI-generated content" if the film says so → Post → paste the first comment.',
  }[post.platform]
  return [
    `📌 ${label} · <b>FOOTBALL STORIES</b> · ${NAME[post.platform]}`,
    `🕒 ${esc(ATHENS.format(new Date(post.dueAt)))} Athens · <b>${esc(film.title)}</b>`,
    reason ? `ℹ️ ${esc(reason)}` : '',
    '',
    `<b>Caption</b> — tap to copy:`,
    `<pre>${esc(post.caption)}</pre>`,
    post.comment ? `<b>First comment</b> — tap to copy:\n<pre>${esc(post.comment)}</pre>` : '',
    `▶ ${steps}`,
  ].filter(x => x !== '').join('\n').slice(0, 4090)
}
async function telegram(cfg, method, body) {
  const r = await fetch(`https://api.telegram.org/bot${cfg.telegram}/${method}`, {method: 'POST', body, ...(typeof body === 'string' ? {headers: {'content-type': 'application/json'}} : {}), signal: AbortSignal.timeout(180_000)})
    .then(async x => ({status: x.status, ...(await x.json().catch(() => ({})))})).catch(e => ({ok: false, description: String(e?.name || e)}))
  return r
}
async function sendPack(cfg, chat, post, film, media, bytes, reason) {
  if (!cfg.telegram || !chat) return {ok: false, error: 'Telegram is not linked (TELEGRAM_BOT_TOKEN or the Final Whistle chat)'}
  if (bytes && bytes.length <= 49 * 1024 * 1024) {
    const f = new FormData()
    f.append('chat_id', String(chat))
    f.append('disable_notification', 'true')
    const video = media?.kind === 'short'
    f.append('caption', `🎬 ${NAME[post.platform]} · the file for the post below`)
    if (video) { f.append('supports_streaming', 'true'); f.append('video', new Blob([bytes], {type: 'video/mp4'}), media.name || 'short.mp4') }
    else f.append('photo', new Blob([bytes], {type: 'image/jpeg'}), media?.name || 'thumbnail.jpg')
    const r = await telegram(cfg, video ? 'sendVideo' : 'sendPhoto', f)
    if (!r.ok) reason = `${reason ? reason + ' · ' : ''}the file did not attach — download it from the studio`
  } else if (bytes) reason = `${reason ? reason + ' · ' : ''}the file is over Telegram's 50 MB — download it from the studio`
  const m = await telegram(cfg, 'sendMessage', JSON.stringify({chat_id: chat, text: packMessage(post, film, reason), parse_mode: 'HTML', disable_web_page_preview: true}))
  return m.ok ? {ok: true} : {ok: false, error: `Telegram refused the pack (${m.description || m.status})`}
}

// ── the round ──────────────────────────────────────────────────────────────────────────────────────────────────
export async function main(env = process.env) {
  const base = (env.STORIES_URL || env.FAN_LIFE_RESEARCH_URL || 'https://fanlife.dubelteam.com').replace(/\/$/, '')
  const secret = env.FAN_LIFE_CRON_SECRET || ''
  if (secret.length < 32) { console.log('::warning title=Football Stories social::FAN_LIFE_CRON_SECRET is not set — nothing can be read.'); return 0 }
  const cfg = config(env), L = lights(cfg), redact = redactor(cfg)
  const worker = `social-${String(env.GITHUB_RUN_ID || 'local').slice(0, 40)}`
  const door = async (op, body = {}) => {
    const r = await fetch(`${base}/api/master/stories/worker`, {method: 'POST', headers: {authorization: `Bearer ${secret}`, 'content-type': 'application/json'}, body: JSON.stringify({op, worker, ...body}), signal: AbortSignal.timeout(60_000)})
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw Object.assign(new Error(`${op}: ${j.error || r.status}`), {status: r.status})
    return j
  }
  console.log(`lights: ${Object.entries(L).map(([k, v]) => `${k}=${v ? 'yes' : 'no'}`).join(' ')}`)
  const {posts = []} = await door('social_due', {lights: L})
  console.log(`due: ${posts.length}`)
  if (!posts.length) return 0
  let chat = null
  if (cfg.telegram) chat = await fetch(`${base}/api/master/final-whistle/ping`, {method: 'POST', headers: {authorization: `Bearer ${secret}`, 'content-type': 'application/json'}, body: '{}', signal: AbortSignal.timeout(30_000)})
    .then(r => r.json()).then(j => j.chatId || null).catch(() => null)
  let bad = 0
  for (const d of posts) {
    let claimed
    try { claimed = await door('social_claim', {id: d.jobId, post: d.postId}) } catch (e) { console.log(`skip ${d.postId}: ${redact(e)}`); continue }
    const {post, film, media} = claimed
    let bytes = null, out = {state: 'failed', result: null, error: null, url: null}
    try {
      if (media?.url) {
        const r = await fetch(media.url, {signal: AbortSignal.timeout(300_000)})
        if (!r.ok) throw new Error(`the file could not be read from storage (${r.status})`)
        bytes = Buffer.from(await r.arrayBuffer())
      } else if (media) throw new Error('the file is no longer in storage')
      const live = cfg.autopublish && L[post.platform]
      if (live) {
        try {
          const p = await PUBLISH[post.platform](cfg, post, film, media, bytes)
          out = {state: 'sent', result: p.result, error: null, url: p.url}
          if (p.comment && post.comment && cfg.telegram && chat)
            await telegram(cfg, 'sendMessage', JSON.stringify({chat_id: chat, parse_mode: 'HTML', disable_web_page_preview: true, text: `✅ Published on ${NAME[post.platform]} · <b>${esc(film.title)}</b>\nPaste the first comment under it:\n<pre>${esc(post.comment)}</pre>`}))
          else if (cfg.telegram && chat)
            await telegram(cfg, 'sendMessage', JSON.stringify({chat_id: chat, disable_web_page_preview: true, disable_notification: true, text: `✅ Published on ${NAME[post.platform]} · ${film.title}${p.url ? `\n${p.url}` : ''}`}))
        } catch (e) {
          const why = redact(e)
          const tg = await sendPack(cfg, chat, post, film, media, bytes, `${NAME[post.platform]} refused it: ${why} — post it by hand`)
          out = {state: 'failed', result: tg.ok ? 'ready pack sent to Telegram' : null, error: why, url: null}
        }
      } else {
        const reason = !cfg.autopublish ? 'Automatic publishing is off (STORIES_SOCIAL_AUTOPUBLISH)' : `${NAME[post.platform]} is not connected yet`
        const tg = await sendPack(cfg, chat, post, film, media, bytes, reason)
        out = tg.ok ? {state: 'manual', result: `${reason} — ready pack sent to Telegram`, error: null, url: null} : {state: 'failed', result: null, error: tg.error, url: null}
      }
    } catch (e) { out = {state: 'failed', result: null, error: redact(e), url: null} }
    if (out.state === 'failed') bad++
    console.log(`${d.postId} (${post.platform}): ${out.state}${out.error ? ` — ${out.error}` : ''}`)
    await door('social_result', {id: d.jobId, post: d.postId, ...out}).catch(e => console.log(`::warning title=${d.postId}::result not recorded — ${redact(e)}`))
  }
  if (bad) console.log(`::warning title=Football Stories social::${bad} post(s) did not go out — see the studio and your Telegram.`)
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(c => process.exit(c)).catch(e => { console.log(`::error title=Football Stories social::${String(e?.message || e).slice(0, 300)}`); process.exit(1) })
}
