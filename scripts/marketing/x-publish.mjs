/**
 * FAN LIFE social plan → the business X account (X API v2). docs/fanlife/54-x-publishing.md.
 * Plain ESM, like meta-publish.mjs: the tick (app/api/marketing/tick) loads it at run time, the GitHub backup
 * (telegram-send.mjs) imports it.
 *
 * Switched OFF unless X_AUTOPUBLISH=1 AND the four OAuth 1.0a keys of the business account's own app are set.
 * The keys belong to that account only, so nothing here can speak for a personal profile. Each post is tried ONCE.
 *
 * Cost (pay-per-use since 2026): a post costs about $0.015, a post WITH a link about $0.20. So links are taken
 * out by default and live in the account's bio; X_LINKS=1 puts them back. Plan posts and carousels (up to 4
 * pictures) are published; the first comment becomes a reply. Stories, reels and the morning briefing never are.
 */
import crypto from 'node:crypto'
import {partsOf} from './meta-publish.mjs'

const PUBLISH = new Set(['post', 'carousel'])
const API = 'https://api.x.com/2'

export function xConfig(env = process.env) {
  const t = k => String(env[k] || '').trim()
  const keys = {key: t('X_API_KEY'), secret: t('X_API_SECRET'), token: t('X_ACCESS_TOKEN'), tokenSecret: t('X_ACCESS_SECRET')}
  const apps = String(env.X_APPS || 'fanlife,theworker,dubid,offsides').split(',').map(s => s.trim()).filter(Boolean)
  const ok = keys.key.length >= 10 && keys.secret.length >= 20 && /^\d+-\w+/.test(keys.token) && keys.tokenSecret.length >= 20
  return {on: t('X_AUTOPUBLISH') === '1' && ok, ...keys, apps, links: t('X_LINKS') === '1'}
}

/** X counts most emoji and CJK as two characters and every link as 23. Close enough to stay under 280. */
export function weight(s) {
  let n = 0
  for (const w of String(s).split(/(https?:\/\/\S+)/)) {
    if (/^https?:\/\//.test(w)) { n += 23; continue }
    for (const ch of w) n += ch.codePointAt(0) > 0x10ff ? 2 : 1
  }
  return n
}

/** The plan's caption made into one X post: links out unless allowed, at most three hashtags, cut at a line or a
 *  sentence — never mid-word — to fit 280. */
export function tweetText(caption, {links = false, limit = 280} = {}) {
  let lines = String(caption || '').split('\n').map(l => l.trimEnd())
  if (!links) lines = lines.map(l => l.replace(/https?:\/\/\S+/g, '').replace(/\s*👉\s*$/u, '').trimEnd()).filter((l, i, a) => l || (a[i - 1] ?? '') !== '')
  const tags = []
  lines = lines.map(l => l.replace(/(^|\s)#[\p{L}\p{N}_]+/gu, m => { if (tags.length < 3) tags.push(m.trim()); return '' }).trimEnd())
  const body = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  const tail = tags.length ? `\n\n${tags.join(' ')}` : ''
  if (weight(body + tail) <= limit) return body + tail
  // too long: keep whole lines, then whole sentences, then words
  const room = limit - weight(tail) - 1
  let out = ''
  for (const piece of body.split(/(?<=[.!?…])\s+|\n+/)) {
    const next = out ? `${out}${/[.!?…]$/.test(out) ? ' ' : '\n'}${piece}` : piece
    if (weight(next) > room) break
    out = next
  }
  if (!out) out = body.split(/\s+/).reduce((a, w) => weight(`${a} ${w}`) > room - 1 ? a : (a ? `${a} ${w}` : w), '') + '…'
  return (out + tail).trim()
}

/** Why this post is not for X, or null when it is. */
export function skipReason(p, parts, pngs, cfg) {
  if (!cfg.on) return 'off'
  if (p.kind === 'briefing' || p.kit?.data?.briefing === true || /briefing/i.test(String(p.msg).split('\n')[0])) return 'owner briefing'
  if (!PUBLISH.has(parts.format)) return `${parts.format || 'unknown format'} stays a Telegram draft`
  if (!parts.caption) return 'no caption'
  if (!pngs?.length) return 'no picture'
  if (!parts.app) return 'unknown app'
  if (!cfg.apps.includes(parts.app)) return `${parts.app} is not published (X_APPS)`
  return null
}

const pct = s => encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())

/** OAuth 1.0a header. JSON bodies are not part of the signature; only the oauth fields and the query are. */
export function oauthHeader(cfg, method, url, {nonce = crypto.randomBytes(16).toString('hex'), ts = Math.floor(Date.now() / 1000)} = {}) {
  const u = new URL(url)
  const o = {oauth_consumer_key: cfg.key, oauth_nonce: nonce, oauth_signature_method: 'HMAC-SHA1', oauth_timestamp: String(ts), oauth_token: cfg.token, oauth_version: '1.0'}
  const all = [...Object.entries(o), ...u.searchParams.entries()].map(([k, v]) => [pct(k), pct(v)]).sort(([a, x], [b, y]) => a < b ? -1 : a > b ? 1 : x < y ? -1 : 1)
  const base = [method.toUpperCase(), pct(`${u.origin}${u.pathname}`), pct(all.map(([k, v]) => `${k}=${v}`).join('&'))].join('&')
  const sig = crypto.createHmac('sha1', `${pct(cfg.secret)}&${pct(cfg.tokenSecret)}`).update(base).digest('base64')
  return 'OAuth ' + Object.entries({...o, oauth_signature: sig}).map(([k, v]) => `${pct(k)}="${pct(v)}"`).join(', ')
}

const scrub = (s, cfg) => [cfg.secret, cfg.tokenSecret, cfg.token, cfg.key].filter(Boolean).reduce((a, k) => a.split(k).join('[key]'), String(s ?? '')).replace(/\s+/g, ' ').slice(0, 220)

function client(cfg, fetcher) {
  return async (pathname, body) => {
    const url = `${API}/${pathname}`
    const r = await fetcher(url, {method: 'POST', headers: {authorization: oauthHeader(cfg, 'POST', url), 'content-type': 'application/json'}, body: JSON.stringify(body), signal: AbortSignal.timeout(30_000)})
    const j = await r.json().catch(() => ({}))
    if (!r.ok || !j.data) throw new Error(scrub(j.detail || j.title || j.errors?.[0]?.message || `status ${r.status}`, cfg))
    return j.data
  }
}

/** X takes JPEG/PNG up to 5 MB; JPEG keeps a 1080×1920 plan picture well under it. */
async function asJpeg(png) {
  let sharp
  try { sharp = (await import('sharp')).default } catch { try { sharp = (await import('./kit/node_modules/sharp/lib/index.js')).default } catch { return png } }
  return sharp(png).flatten({background: {r: 21, g: 19, b: 18}}).jpeg({quality: 90, mozjpeg: true}).toBuffer()
}

/**
 * Publish one claimed post to X. Returns {x: 'published <id>' | 'skipped: …' | 'refused: …', line}. Never throws.
 */
export async function publishToX(p, pngs, {env = process.env, fetcher = fetch} = {}) {
  const cfg = xConfig(env), parts = partsOf(p.msg)
  const why = skipReason(p, parts, pngs, cfg)
  if (why) return {x: `skipped: ${why}`, line: why === 'off' ? '' : `ℹ️ X: not auto-published (${why}).`}
  const api = client(cfg, fetcher)
  try {
    const ids = []
    for (const png of pngs.slice(0, 4)) {
      const buf = await asJpeg(png).catch(() => png)
      ids.push((await api('media/upload', {media: Buffer.from(buf).toString('base64'), media_category: 'tweet_image'})).id)
    }
    const text = tweetText(parts.caption, {links: cfg.links})
    const post = await api('tweets', {text, media: {media_ids: ids}})
    const reply = parts.comment ? tweetText(parts.comment, {links: cfg.links}) : ''
    if (reply) await api('tweets', {text: reply, reply: {in_reply_to_tweet_id: post.id}}).catch(() => {})
    return {x: `published ${post.id}`, line: '✅ X — published automatically.'}
  } catch (e) {
    const msg = scrub(e?.message || e, cfg)
    return {x: `refused: ${msg}`, line: `⚠️ X refused (${msg.slice(0, 80)}) — post it by hand from the boxes below.`}
  }
}
