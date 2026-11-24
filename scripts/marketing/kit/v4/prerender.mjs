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
import {capture, phonePage, GATE_ROUTE, SITE} from './screens.mjs'
import {clubId, REPO as REPO_ROOT} from './assets.mjs'
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'

export const V4_VERSION = '4.0'
/** the asset folders a picture is drawn from (kits, stickers, crests, the kit itself): when any of them changes on main,
 *  every pending picture in the window is drawn again (owner, 24.11.2026: always the newest files before publishing) */
export const ASSET_DIRS = ['public/album', 'public/club-kits', 'public/crests', 'public/brand', 'scripts/marketing/kit']
function assetStamp() {
  try { return createHash('sha1').update(execFileSync('git', ['rev-parse', ...ASSET_DIRS.map(d => `HEAD:${d}`)], {cwd: REPO_ROOT, stdio: ['ignore', 'pipe', 'ignore']})).digest('hex').slice(0, 8) } catch { return 'local' }
}
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
let shopDocP = null
function shopDoc() {
  shopDocP ??= fetch(`${DB}/rest/v1/worker_fanlife_files?name=eq.shop%2Fshop.json&select=body`, {headers: {apikey: KEY, Authorization: `Bearer ${KEY}`}, signal: AbortSignal.timeout(30_000)})
    .then(async r => { if (!r.ok) return null; let doc = (await r.json())[0]?.body; for (let i = 0; i < 2 && typeof doc === 'string'; i++) doc = JSON.parse(doc); return doc || null }).catch(() => null)
  return shopDocP
}
async function shopProducts() {
  const doc = await shopDoc()
  if (!doc || doc?.settings?.open === false) return []
  return (doc?.products || []).filter(p => p.visible && p.status === 'live' && p.printify?.url && p.printify?.images?.length && p.printify?.priceFrom)
}
/** a post can ask for one club's products (data.subject); with none on the shelf it falls back to the whole shop */
export const ofSubject = (list, subject) => { const own = subject ? list.filter(p => p.subject === subject) : []; return own.length ? own : list }
const DAY = new Intl.DateTimeFormat('en-GB', {timeZone: 'Europe/Athens', weekday: 'short', day: 'numeric', month: 'short'})
/** the sale a post announces: the one running now, else the next to start within ten days (the shop's own settings) */
export function saleNow(sales, now = Date.now()) {
  const live = (sales || []).filter(x => x?.on && Date.parse(x.until) > now && Date.parse(x.starts) < now + 10 * 864e5)
    .sort((a, b) => Date.parse(a.starts) - Date.parse(b.starts))
  const s = live.find(x => Date.parse(x.starts) <= now) || live[0]
  if (!s) return null
  const started = Date.parse(s.starts) <= now, left = Date.parse(s.until) - now
  return {label: s.label, percent: s.percent, phase: !started ? 'soon' : left < 864e5 ? 'last' : 'on',
    ends: DAY.format(new Date(started ? Date.parse(s.until) : Date.parse(s.starts))).replace(',', ''), scope: s.scope}
}
/** a club's films from its YouTube playlist (the public feed; no key): full films before Shorts */
export async function playlistFilms(list) {
  try {
    const r = await fetch(`https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(list)}`, {signal: AbortSignal.timeout(20_000)})
    if (!r.ok) return []
    const xml = await r.text(), seen = new Set(), out = []
    for (const m of xml.matchAll(/<yt:videoId>([\w-]{11})<\/yt:videoId>[\s\S]*?<title>([^<]+)<\/title>/g)) if (!seen.has(m[1])) { seen.add(m[1]); out.push({id: m[1], title: m[2].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, '’')}) }
    const isShort = f => /#shorts?\b/i.test(f.title)
    return [...out.filter(f => !isShort(f)), ...out.filter(isShort)]
  } catch { return [] }
}
const money = (c, cur = 'USD') => `${cur === 'EUR' ? '€' : cur === 'GBP' ? '£' : '$'}${(c / 100).toFixed(2).replace(/\.00$/, '')}`
/** a different random product for every shop post of a run; the caption's {product} and {price} are filled with it */
export function pickProduct(list, used, rnd = Math.random) {
  const fresh = list.filter(p => !used.has(p.id)), pool = fresh.length ? fresh : list
  const p = pool[Math.floor(rnd() * pool.length)]
  if (p) used.add(p.id)
  return p
}
/** the product's own pictures: a real scene (a person, a room) or a studio shot cut clean out of its background */
const label = u => (String(u).match(/camera_label=([^&]+)/)?.[1] || 'front').toLowerCase()
export function pickArt(images, turn = 0) {
  const imgs = (images || []).filter(u => !/size-chart/.test(label(u)))
  const scene = imgs.find(u => /person|lifestyle|context|hanging/.test(label(u)))
  const studio = imgs.find(u => /^folded/.test(label(u))) || imgs.find(u => /^front/.test(label(u))) || imgs.find(u => /^back/.test(label(u))) || imgs[0]
  const detail = imgs.find(u => /close/.test(label(u))) || null
  return {scene: scene || null, studio, detail}
}
/** the studio background (white or near white, flat) flooded away from the edges; null if the product would go with it */
export async function cutOut(buf) {
  const sharp = (await import('sharp')).default
  const {data, info} = await sharp(buf).ensureAlpha().raw().toBuffer({resolveWithObject: true})
  const {width: w, height: h} = info, bg = new Uint8Array(w * h), q = new Int32Array(w * h)
  const pale = i => { const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2]; return Math.min(r, g, b) >= 226 && Math.max(r, g, b) - Math.min(r, g, b) < 16 }
  let head = 0, tail = 0
  const seed = i => { if (!bg[i] && pale(i)) { bg[i] = 1; q[tail++] = i } }
  for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x) }
  for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1) }
  while (head < tail) { const i = q[head++], x = i % w; if (x > 0) seed(i - 1); if (x < w - 1) seed(i + 1); if (i >= w) seed(i - w); if (i < w * (h - 1)) seed(i + w) }
  const gone = tail / (w * h)
  if (gone < .2 || gone > .9) return null // no studio background, or the product itself was pale and went with it
  // a pale product (a white mug, a white tee) on a pale background has no edge to cut along: refuse rather than chew it
  let edge = 0, paleEdge = 0
  for (let i = w; i < w * (h - 1); i++) {
    if (bg[i]) continue
    const x = i % w
    if ((x > 0 && bg[i - 1]) || (x < w - 1 && bg[i + 1]) || bg[i - w] || bg[i + w]) {
      edge++; const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2]
      if (Math.min(r, g, b) >= 236) paleEdge++
    }
  }
  if (!edge || paleEdge / edge > .3) return null
  // then the soft studio shadow that rings the product goes too (light grey, flat, touching the background)
  const shade = i => { const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2]; return Math.min(r, g, b) >= 190 && Math.max(r, g, b) - Math.min(r, g, b) < 14 }
  head = 0; tail = 0
  for (let i = 0; i < w * h; i++) if (bg[i]) q[tail++] = i
  while (head < tail) { const i = q[head++], x = i % w; for (const n of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) if (n >= 0 && n < w * h && !bg[n] && shade(n)) { bg[n] = 1; q[tail++] = n } }
  for (let i = 0; i < w * h; i++) if (bg[i]) data[i * 4 + 3] = 0
  return sharp(data, {raw: {width: w, height: h, channels: 4}}).trim({threshold: 1}).png().toBuffer()
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
export const fillWords = (s, w) => String(s ?? '').replace(/\{(product|name|price|title|percent|ends)\}/g, (m, k) => w[k] ?? m)
/** campaigns waiting for a feature: released the first run after the feature's file is on main */
/** the frame campaign also waits for real product mock-ups (the owner's rule: products are shown as the product, never
 *  as a drawing): art/shop/frame-xi-*.jpg, a real Printify mock-up of a personal print */
export const HOLDS = {'frame-xi': 'app/api/shop/personal/route.ts'}
export const HOLD_ART = {'frame-xi': /^frame-xi-.+\.(jpe?g|png)$/}

/** the 30-day plan's own screens: the club's home, its Royal Rumble, the market (a listing post has its own photo) */
const PLAN_SCREEN = {'L-CLUB': id => `/clubs/${id}`, 'L-RUMBLE': id => `/clubs/${id}/royal-rumble`, 'L-MARKET': () => '/market'}
/** the real screen behind a post: a gate's own game (pressed past its start), LIFE, Legends Manager */
async function screenFor(page, kit, dir) {
  const d = kit.data || {}, id = clubId(d), name = String(d.name || '').toUpperCase()
  const route = kit.t === 'L-GATE' && GATE_ROUTE[name] && id ? `/clubs/${id}/${GATE_ROUTE[name]}`
    : name === 'LEGENDS MANAGER' || d.brand === 'legends' ? '/all-football/legends'
    : PLAN_SCREEN[kit.t] && (id || kit.t === 'L-MARKET') ? PLAN_SCREEN[kit.t](id) : null
  if (!route || d.noScreen || (kit.t === 'L-MARKET' && (d.image || d.photo))) return null
  try { const f = path.join(dir, `screen-${route.replace(/\W+/g, '-')}.png`); writeFileSync(f, await capture(page, route, {play: kit.t !== 'L-CLUB' && kit.t !== 'L-MARKET'})); return f } catch { return null }
}

async function main() {
  if (!DB || !KEY) throw Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing')
  if (!GH) throw Error('GITHUB_TOKEN missing')
  for (const [hold, file] of Object.entries(HOLDS)) if (existsSync(file) && (!HOLD_ART[hold] || readdirSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'art', 'shop')).some(f => HOLD_ART[hold].test(f)))) {
    try { const r = await rpc('worker_marketing_release', {p_hold: hold}); if (r?.n) console.log(`released ${r.n} post(s) held for ${hold}`) } catch (e) { console.log(`::warning title=release ${hold}::${e.message}`) }
  }
  // a new club's opening campaign waits for the club itself: released the first run its page answers to the public
  try {
    for (const h of (await rpc('worker_marketing_holds', {})).filter(h => /^open:[a-z0-9-]+$/.test(h))) {
      const page = await fetch(`${SITE}/clubs/${h.slice(5)}`, {redirect: 'manual', signal: AbortSignal.timeout(30_000)}).catch(() => null)
      if (page?.status !== 200) { console.log(`${h}: the club is not open yet`); continue }
      const r = await rpc('worker_marketing_open_release', {p_hold: h}); console.log(`${h}: opened — ${r?.n ?? 0} post(s) released, opening night ${r?.launch ?? '—'}`)
    }
  } catch (e) { console.log(`::warning title=opening campaigns::${e.message}`) }
  const VER = `${V4_VERSION}+${assetStamp()}`, RUN = Date.now().toString(36)
  // pictures from other asset files, or due within 6 h and drawn more than 8 h ago, are drawn again from the newest files
  const queue = (await rpc('worker_marketing_v4_due', {p_hours: HOURS, p_ver: VER, p_fresh_hours: 6, p_age_hours: 8})).slice(0, LIMIT)
  console.log(`queue: ${queue.length} post(s) to draw (assets ${VER}) in the next ${HOURS}h`)
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
        if (s.t === 'L-SALE') {
          const now = saleNow((await shopDoc())?.settings?.sales)
          if (!now && data.needsSale) throw Error('no sale running or coming — the post waits for the v2 fallback')
          if (now) Object.assign(data, {label: now.label, percent: now.percent, phase: now.phase, ends: now.ends})
          products ??= await shopProducts()
          const p = pickProduct(ofSubject(products, data.subject), used)
          if (p) { const a = pickArt(p.printify.images, post.id); if (a.scene) data.photo = a.scene; else if (a.studio) data.card = a.studio; data.title = p.title }
          s.data = data
          const w = {percent: String(data.percent || ''), ends: data.ends || '', product: p?.title || '', name: String(p?.title || '').split(' · ')[0]}
          for (const k of ['hook', 'body']) if (post.fill?.[k]) patch[k] = fillWords(post.fill[k], w)
        }
        if ((s.t === 'L-FILM' || s.t === 'L-YT') && data.playlist) {
          let films = await playlistFilms(data.playlist)
          if (data.match) films = films.filter(f => f.title.includes(data.match)) // one episode by its title (Fairy Tales)
          if (!films.length) throw Error(data.match ? `no public film titled “${data.match}” yet` : 'the playlist feed is empty')
          if (s.t === 'L-FILM') {
            // a club's film is a documentary: no Short, and no Fairy Tale unless the post asked for one by its title
            const tale = x => /Good (Morning|Night)|Καλημέρα|Καληνύχτα|בוקר טוב|לילה טוב|Fairy Tale|Παραμύθι|אגדת/i.test(x.title)
            const long = films.filter(x => !/#shorts?\b/i.test(x.title) && (data.match || !tale(x))), pool = long.length ? long : films, f = pool[post.id % pool.length]
            data.yt = f.id; data.title ||= f.title.replace(/\s*#\w+/g, '').replace(/\s*[☀🌙⚽💤][\s\S]*$/u, '').trim()
            for (const k of ['hook', 'body']) if (post.fill?.[k]) patch[k] = fillWords(post.fill[k], {title: data.title})
          } else {
            const pick = films.slice(0, 6), out = []
            for (let k = 0; k < pick.length && out.length < 3; k++) { const y = await youtube(pick[(post.id + k) % pick.length].id, (k % 3) + 1); if (y && !out.includes(y.thumb)) out.push(y.thumb) }
            if (!out.length) throw Error('no film frame confirmed')
            data.thumbs = out
          }
          s.data = data
        }
        if (s.t === 'L-SHOP' && data.random) {
          products ??= await shopProducts()
          const p = pickProduct(ofSubject(products, data.subject), used)
          if (!p) throw Error('the shop has no live product')
          const f = shopFill(p)
          Object.assign(data, f.data)
          const a = pickArt(p.printify.images, post.id)
          if (a.scene) data.photo = a.scene
          else if (a.studio) {
            const r = await fetch(a.studio, {signal: AbortSignal.timeout(30_000)})
            const cut = r.ok ? await cutOut(Buffer.from(await r.arrayBuffer())) : null
            if (cut) { const file = path.join(dir, `cut-${post.id}.png`); writeFileSync(file, cut); data.cut = file; if (a.detail) data.detail = a.detail }
            else data.card = a.studio // the studio shot as it is, on a card on the stage
          }
          data.stage = post.id; s.data = data
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
        urls.push(await upload(rel, existing, `p${post.id}-${i + 1}-v${VER}-${RUN}.png`, buf, 'image/png'))
        if (i === 0) slides[0]._screen = screen
      }
      let storyUrl = null
      if (slides.length === 1 || (Array.isArray(kit.to) && kit.to.includes('story'))) {
        const s = slides[0], data = {...(s.data || {}), ...(s._screen ? {screen: s._screen} : {})}
        const file = await story(s.t, post.app || 'fanlife', data, {seconds: 7, out: path.join(dir, `p${post.id}.mp4`)})
        if (file) storyUrl = await upload(rel, existing, `p${post.id}-story-v${VER}-${RUN}.mp4`, readFileSync(file), 'video/mp4')
      }
      if (Object.keys(patch).length) await rpc('worker_marketing_v4_patch', {p_id: post.id, p_patch: patch})
      const r = await rpc('worker_marketing_v4_set', {p_id: post.id, p_v4: {ver: VER, at: new Date().toISOString(), png: urls, story: storyUrl}})
      if (!r?.ok) throw Error('post no longer pending')
      ok++; console.log(`ok ${post.id} ${slides[0].t} · ${urls.length} picture(s)${storyUrl ? ' + story' : ''}`)
    } catch (e) { bad++; console.log(`::warning title=v4 picture ${post.id}::${String(e?.message || e).slice(0, 240)}`) }
  }
  await shotBrowser.close(); await close()
  console.log(`done: ${ok} drawn, ${bad} left to the v2 picture`)
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.log(`::error title=v4 pictures::${e.message}`); process.exit(1) })
