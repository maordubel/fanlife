/** Social pictures v4 — drawn ahead of time (GitHub Actions: .github/workflows/marketing-pictures.yml).
 *  For every fixed post due in the next hours whose pictures are missing or older than this version:
 *    1. a real screen of the game it markets, in a phone (gates), captured from production at phone size;
 *    2. the feed picture(s) (1080 × 1350; every slide of a carousel) and a story that moves (1080 × 1920 MP4);
 *    3. the files go up as assets of the GitHub release "social-pictures" (free, public, outside the database
 *       quota) and their addresses are written on the post: main.kit.v4 = {ver, png:[…], story}.
 *  The sender (kit/visual.mjs) fetches them; when they are missing it draws the v2 picture as before.
 *  Assets older than five days are deleted on every run (the retention job of this pipeline). */
import {readFileSync, writeFileSync, mkdtempSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {png, story, close} from './render.mjs'
import {capture, phonePage, GATE_ROUTE} from './screens.mjs'
import {clubId} from './assets.mjs'

export const V4_VERSION = '4.0'
const DB = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
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
  let ok = 0, bad = 0
  for (const post of queue) {
    try {
      const kit = post.kit || {}, slides = Array.isArray(kit.slides) && kit.slides.length ? kit.slides : [kit]
      const urls = []
      for (const [i, s] of slides.entries()) {
        const data = {...(s.data || {})}
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
      const r = await rpc('worker_marketing_v4_set', {p_id: post.id, p_v4: {ver: V4_VERSION, png: urls, story: storyUrl}})
      if (!r?.ok) throw Error('post no longer pending')
      ok++; console.log(`ok ${post.id} ${slides[0].t} · ${urls.length} picture(s)${storyUrl ? ' + story' : ''}`)
    } catch (e) { bad++; console.log(`::warning title=v4 picture ${post.id}::${String(e?.message || e).slice(0, 240)}`) }
  }
  await shotBrowser.close(); await close()
  console.log(`done: ${ok} drawn, ${bad} left to the v2 picture`)
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.log(`::error title=v4 pictures::${e.message}`); process.exit(1) })
