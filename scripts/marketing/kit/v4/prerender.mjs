/** Social pictures v4 — drawn ahead of time (GitHub Actions: .github/workflows/marketing-pictures.yml).
 *  For every fixed post due in the next hours whose pictures are missing or older than this version:
 *    1. a real screen of the game it markets, in a phone (gates), captured from production at phone size;
 *    2. the feed picture(s) (1080 × 1350; every slide of a carousel) and a story that moves (1080 × 1920 MP4);
 *    3. the files go up as assets of the GitHub release "social-pictures" (free, public, outside the database
 *       quota) and their addresses are written on the post: main.kit.v4 = {ver, png:[…], story}.
 *  The sender (kit/visual.mjs) fetches them; when they are missing it draws the v2 picture as before.
 *  Assets older than five days are deleted on every run (the retention job of this pipeline). */
import {readFileSync, writeFileSync, mkdtempSync, existsSync, readdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {png, story, close} from './render.mjs'
import {capture, phonePage, GATE_ROUTE} from './screens.mjs'
import {clubId} from './assets.mjs'

export const V4_VERSION = '4.0'
const DB = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://afxpjfxwpdjvlmuoawda.supabase.co').replace(/\/$/, '') // Football Master's public address
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const GH = process.env.GITHUB_TOKEN || ''
const REPO = process.env.GITHUB_REPOSITORY || 'maordubel/fanlife'
const TAG = 'social-pictures'
const HOURS = Number(process.env.V4_HOURS || 36)
const LIMIT = Number(process.env.V4_LIMIT || 40)

const rpc = (name, body) => fetch(`${DB}/rest/v1/rpc/${name}`, {method: 'POST', headers: {apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json'}, body: JSON.stringify(body), signal: AbortSignal.timeout(30_000)}).then(r => r.ok ? r.json() : Promise.reject(Error(`${name} ${r.status}`)))
const gh = (p, init = {}) => fetch(p.startsWith('http') ? p : `https://api.github.com/repos/${REPO}${p}`, {...init, headers: {Authorization: `Bearer ${GH}`, Accept: 'application/vnd.github+json', ...(init.headers || {})}, signal: AbortSignal.timeout(60_000)})

async function release() {
  let r = await gh(`/releases/tags/${TAG}`)
  if (r.status === 404) r = await gh('/releases', {method: 'POST', body: JSON.stringify({tag_name: TAG, name: 'Social pictures (automatic)', body: 'Drawn by scripts/marketing/kit/v4/prerender.mjs. Assets are deleted after five days.', prerelease: true})})
  if (!r.ok) throw Error(`release ${r.status}: ${(await r.text()).slice(0, 200)}`)
  return r.json()
}
async function assets(rel) {
  const out = []
  for (let page = 1; page < 30; page++) { const r = await gh(`/releases/${rel.id}/assets?per_page=100&page=${page}`); const a = r.ok ? await r.json() : []; out.push(...a); if (a.length < 100) break }
  return out
}
async function upload(rel, existing, name, buf, type) {
  const old = existing.find(a => a.name === name)
  if (old) await gh(`/releases/assets/${old.id}`, {method: 'DELETE'})
  const r = await gh(rel.upload_url.replace(/\{.*$/, '') + `?name=${encodeURIComponent(name)}`, {method: 'POST', headers: {'Content-Type': type}, body: buf})
  if (!r.ok) throw Error(`upload ${name} ${r.status}: ${(await r.text()).slice(0, 200)}`)
  return (await r.json()).browser_download_url
}


// ── live fills: a post that names a moving target is filled at drawing time, from the real source ───────────────────
/** the open shop's live products (the storefront's own rule: visible, live, a Printify page and a picture) */
async function shopProducts() {
  const r = await fetch(`${DB}/rest/v1/worker_fanlife_files?name=eq.shop%2Fshop.json&select=body`, {headers: {apikey: KEY, Authorization: `Bearer ${KEY}`}, signal: AbortSignal.timeout(30_000)})
  if (!r.ok) return []
  let doc = (await r.json())[0]?.body
  for (let i = 0; i < 2 && typeof doc === 'string'; i++) doc = JSON.parse(doc)
  if (doc?.settings?.open === false) return []
  return (doc?.products || []).filter(p => p.visible && p.status === 'live' && p.printify?.url && p.printify?.images?.length && p.printify?.priceFrom)
}
const money = (c, cur = 'USD') => `${cur === 'EUR' ? '€' : cur === 'GBP' ? '£' : '$'}${(c / 100).toFixed(2).replace(/\.00$/, '')}`
/** a different random product for every shop post of a run; the caption's {product} and {price} are filled with it */
export function pickProduct(list, used, rnd = Math.random) {
  const fresh = list.filter(p => !used.has(p.id)), pool = fresh.length ? fresh : list
  const p = pool[Math.floor(rnd() * pool.length)]
  if (p) used.add(p.id)
  return p
}
export function shopFill(p) {
  const [name, kind] = String(p.title).split(' · ')
  return {data: {title: p.title, image: p.printify.images[0], price: p.printify.priceFrom, currency: p.printify.currency || 'USD', subject: p.subject, kind: p.kind, kicker: `The FAN LIFE shop${kind ? ' · ' + kind : ''}`},
    words: {product: p.title, name, price: money(p.printify.priceFrom, p.printify.currency)}}
}
/** a YouTube film: the first id YouTube itself confirms. The picture is a frame from the film itself (YouTube keeps
 *  three, at about a quarter, half and three quarters: maxres1-3, else hq1-3), never the designed thumbnail. */
export const ytId = u => String(u || '').match(/(?:youtu\.be\/|v=|shorts\/)([\w-]{11})/)?.[1] || null
async function youtube(ids, frame = 2) {
  const k = [1, 2, 3].includes(Number(frame)) ? Number(frame) : 2
  for (const id of [].concat(ids || []).filter(Boolean)) {
    try {
      const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent('https://www.youtube.com/watch?v=' + id)}`, {signal: AbortSignal.timeout(15_000)})
      if (!r.ok) continue
      const max = await fetch(`https://i.ytimg.com/vi/${id}/maxres${k}.jpg`, {method: 'HEAD', signal: AbortSignal.timeout(15_000)})
      return {id, thumb: `https://i.ytimg.com/vi/${id}/${max.ok ? 'maxres' : 'hq'}${k}.jpg`}
    } catch {}
  }
  return null
}
export const fillWords = (s, w) => String(s ?? '').replace(/\{(product|name|price)\}/g, (m, k) => w[k] ?? m)
/** campaigns waiting for a feature: released the first run after the feature's file is on main */
/** the frame campaign also waits for real product mock-ups (the owner's rule: products are shown as the product, never
 *  as a drawing): art/shop/frame-xi-*.jpg, a real Printify mock-up of a personal print */
export const HOLDS = {'frame-xi': 'app/api/shop/personal/route.ts'}
export const HOLD_ART = {'frame-xi': /^frame-xi-.+\.(jpe?g|png)$/}

/** the real screen behind a post: a gate's own game (pressed past its start), LIFE, Legends Manager */
async function screenFor(page, kit, dir) {
  const d = kit.data || {}, id = clubId(d), name = String(d.name || '').toUpperCase()
  const route = kit.t === 'L-GATE' && GATE_ROUTE[name] && id ? `/clubs/${id}/${GATE_ROUTE[name]}`
    : name === 'LEGENDS MANAGER' || d.brand === 'legends' ? '/all-football/legends' : null
  if (!route) return null
  try { const f = path.join(dir, `screen-${id || 'hub'}-${GATE_ROUTE[name] || 'legends'}.png`); writeFileSync(f, await capture(page, route, {play: true})); return f } catch { return null }
}

async function main() {
  if (!DB || !KEY) throw Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing')
  if (!GH) throw Error('GITHUB_TOKEN missing')
  for (const [hold, file] of Object.entries(HOLDS)) if (existsSync(file) && (!HOLD_ART[hold] || readdirSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'art', 'shop')).some(f => HOLD_ART[hold].test(f)))) {
    try { const r = await rpc('worker_marketing_release', {p_hold: hold}); if (r?.n) console.log(`released ${r.n} post(s) held for ${hold}`) } catch (e) { console.log(`::warning title=release ${hold}::${e.message}`) }
  }
  const queue = (await rpc('worker_marketing_v4_queue', {p_hours: HOURS, p_ver: V4_VERSION})).slice(0, LIMIT)
  console.log(`queue: ${queue.length} post(s) without v${V4_VERSION} pictures in the next ${HOURS}h`)
  const rel = await release()
  let existing = await assets(rel)
  // retention: assets older than five days go (the posts they belong to have been sent)
  const cutoff = Date.now() - 5 * 864e5
  for (const a of existing.filter(a => Date.parse(a.created_at) < cutoff)) await gh(`/releases/assets/${a.id}`, {method: 'DELETE'})
  existing = existing.filter(a => Date.parse(a.created_at) >= cutoff)
  if (!queue.length) return

  const {chromium} = await import('playwright')
  const shotBrowser = await chromium.launch()
  const phone = await phonePage(shotBrowser)
  const dir = mkdtempSync(path.join(tmpdir(), 'fl-pre-'))
  let ok = 0, bad = 0, products = null
  const used = new Set()
  for (const post of queue) {
    try {
      const kit = post.kit || {}, slides = Array.isArray(kit.slides) && kit.slides.length ? kit.slides : [kit]
      const urls = [], patch = {}
      for (const [i, s] of slides.entries()) {
        const data = {...(s.data || {})}
        if (s.t === 'L-SHOP' && data.random) {
          products ??= await shopProducts()
          const p = pickProduct(products, used)
          if (!p) throw Error('the shop has no live product')
          const f = shopFill(p)
          Object.assign(data, f.data); s.data = data
          for (const k of ['hook', 'body']) if (post.fill?.[k]) patch[k] = fillWords(post.fill[k], f.words)
        }
        if (s.t === 'L-FILM' && (data.yt || ytId(post.url))) {
          const y = await youtube(data.yt || ytId(post.url), data.frame ?? (post.id % 3) + 1)
          if (!y) throw Error('YouTube does not confirm the film')
          data.thumb = y.thumb; s.data = data; patch.url = `https://youtu.be/${y.id}`
        }
        const screen = await screenFor(phone, s, dir)
        if (screen) data.screen = screen
        const buf = await png(s.t, post.app || 'fanlife', data)
        if (!buf) throw Error(`no v4 layout for ${s.t}`)
        urls.push(await upload(rel, existing, `p${post.id}-${i + 1}-v${V4_VERSION}.png`, buf, 'image/png'))
        if (i === 0) slides[0]._screen = screen
      }
      let storyUrl = null
      if (slides.length === 1 || (Array.isArray(kit.to) && kit.to.includes('story'))) {
        const s = slides[0], data = {...(s.data || {}), ...(s._screen ? {screen: s._screen} : {})}
        const file = await story(s.t, post.app || 'fanlife', data, {seconds: 7, out: path.join(dir, `p${post.id}.mp4`)})
        if (file) storyUrl = await upload(rel, existing, `p${post.id}-story-v${V4_VERSION}.mp4`, readFileSync(file), 'video/mp4')
      }
      if (Object.keys(patch).length) await rpc('worker_marketing_v4_patch', {p_id: post.id, p_patch: patch})
      const r = await rpc('worker_marketing_v4_set', {p_id: post.id, p_v4: {ver: V4_VERSION, png: urls, story: storyUrl}})
      if (!r?.ok) throw Error('post no longer pending')
      ok++; console.log(`ok ${post.id} ${slides[0].t} · ${urls.length} picture(s)${storyUrl ? ' + story' : ''}`)
    } catch (e) { bad++; console.log(`::warning title=v4 picture ${post.id}::${String(e?.message || e).slice(0, 240)}`) }
  }
  await shotBrowser.close(); await close()
  console.log(`done: ${ok} drawn, ${bad} left to the v2 picture`)
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.log(`::error title=v4 pictures::${e.message}`); process.exit(1) })
