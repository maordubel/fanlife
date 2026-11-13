// FAN LIFE's front door on Cloud Run (or a Space), behind a Cloudflare Worker (deploy/space/worker.js).
// HF routes by Host, so the Worker must send the Space's own host; it puts the visitor's host in X-Fanlife-Host.
// This front door gives that host back to Next (tenant hosts, metadata, server-action origin checks all read Host).
import http from 'node:http'
import net from 'node:net'
import zlib from 'node:zlib'
import { pathToFileURL } from 'node:url'
const UP = { host: '127.0.0.1', port: 3000 }
const KEY = process.env.FANLIFE_PROXY_KEY || ''
// A missing file is never cached: next.config gives /brand, /fonts, /ads a day-to-a-month max-age even on a 404, and the
// first Cloud Run bundle (11.11.2026) left browsers holding those 404s. One browser-cache clear per visitor drops them;
// the cookie name is the round, so a later round can clear again.
export const CLEAR = 'fl_cache_20261112'
export function fix(req, status, h) {
  if (status >= 400) h['cache-control'] = 'no-store'
  const page = req.method === 'GET' && String(req.headers.accept || '').includes('text/html')
  if (page && status < 400 && !String(req.headers.cookie || '').includes(`${CLEAR}=1`)) {
    h['clear-site-data'] = '"cache"'
    const own = h['set-cookie'] ? [].concat(h['set-cookie']) : []
    h['set-cookie'] = [...own, `${CLEAR}=1; Max-Age=31536000; Path=/; Secure; SameSite=Lax`]
  }
  return h
}
// ── The page shelf (13.11.2026) ──────────────────────────────────────────────────────────────────────────────────────
// Every public page is rendered on request and one render costs seconds of the instance's one CPU: sixteen at once took
// 80 s each, and a visitor's page plus the links Next prefetches is such a burst. A public page is the same for every
// visitor (the server reads the host, the path and ?lang — never a visitor's cookie), so a rendered page is kept on a
// shelf and answered from it: fresh for a minute, then still answered at once while one render refreshes it behind
// (rules 104, 105). Never the desk, an API, a signed page, a non-GET, the owner's own session, or a page that set a cookie.
export const FRESH_MS = 60_000
export const STALE_MS = 12 * 3600_000
const MAX_ENTRIES = 400
const MAX_BODY = 3 * 1024 * 1024
const NEVER = /^\/(api|master|_next|qa|auth|studio-cancel|final-whistle-render)(\/|$)/
const NOISE = /^(utm_[a-z]+|fbclid|gclid|mc_[a-z]+|ref)$/i
const RSC_HEADERS = ['rsc', 'next-router-prefetch', 'next-router-state-tree', 'next-url']
/** The shelf key of a request, or null when it must always reach the server. */
export function shelfKey(req) {
  if (req.method !== 'GET' || req.headers.range || req.headers.authorization) return null
  const cookie = String(req.headers.cookie || '')
  if (cookie.includes('fan-life-admin=') || cookie.includes('fan-life-tester=')) return null
  let u
  try { u = new URL(req.url || '/', 'http://x') } catch { return null }
  if (NEVER.test(u.pathname) || /\.[a-zA-Z0-9]+$/.test(u.pathname)) return null
  for (const k of [...u.searchParams.keys()]) if (NOISE.test(k)) u.searchParams.delete(k)
  u.searchParams.sort()
  const kind = req.headers.rsc ? 'rsc' : String(req.headers.accept || '').includes('text/html') ? 'html' : 'other'
  if (kind === 'other') return null
  return [String(req.headers['x-fanlife-host'] || req.headers.host || ''), u.pathname, u.searchParams.toString(), kind, ...RSC_HEADERS.map((h) => String(req.headers[h] || ''))].join('\n')
}
/** May this answer go on the shelf? */
export function shelvable(status, h, bytes) {
  const type = String(h['content-type'] || '')
  return status === 200 && !h['set-cookie'] && bytes <= MAX_BODY && (type.includes('text/html') || type.includes('text/x-component'))
}
export function makeShelf(now = () => Date.now()) {
  const m = new Map()
  return {
    size: () => m.size,
    get(key) {
      const e = m.get(key)
      if (!e) return null
      const age = now() - e.at
      if (age > STALE_MS) { m.delete(key); return null }
      m.delete(key); m.set(key, e) // most recently used last
      return { ...e, state: age <= FRESH_MS ? 'hit' : 'stale' }
    },
    put(key, status, headers, body) {
      m.delete(key)
      // kept twice: as rendered, and packed for every visitor whose browser (or edge) takes gzip
      m.set(key, { status, headers, body, gz: zlib.gzipSync(body, { level: 6 }), at: now() })
      while (m.size > MAX_ENTRIES) m.delete(m.keys().next().value)
    },
  }
}
const shelf = makeShelf()
const renewing = new Set()
const HOP = ['content-length', 'content-encoding', 'transfer-encoding', 'connection', 'keep-alive']
const clean = (h) => { const o = { ...h }; for (const k of HOP) delete o[k]; return o }
function upstream(req) {
  const headers = { ...req.headers }
  const want = headers['x-fanlife-host']
  if (want && (!KEY || headers['x-fanlife-key'] === KEY)) {
    headers.host = want
    headers['x-forwarded-host'] = want
    headers['x-forwarded-proto'] = 'https'
  }
  delete headers['x-fanlife-key']
  return headers
}
/** One render behind a stale answer: at most one per page at a time, and a failure leaves the shelf as it was. */
function renew(key, req) {
  if (renewing.has(key)) return
  renewing.add(key)
  const done = () => renewing.delete(key)
  const headers = { ...upstream(req), 'accept-encoding': 'identity' }
  delete headers['if-none-match']; delete headers['if-modified-since']
  const up = http.request({ ...UP, method: 'GET', path: req.url, headers }, (r) => {
    const parts = []; let n = 0
    r.on('data', (c) => { n += c.length; if (n <= MAX_BODY) parts.push(c) })
    r.on('end', () => { if (shelvable(r.statusCode || 0, r.headers, n)) shelf.put(key, 200, clean(r.headers), Buffer.concat(parts)); done() })
    r.on('error', done)
  })
  up.setTimeout(180_000, () => up.destroy())
  up.on('error', done)
  up.end()
}
const server = http.createServer((req, res) => {
  const key = shelfKey(req)
  const kept = key ? shelf.get(key) : null
  if (key && kept) {
    if (kept.state === 'stale') renew(key, req)
    const gz = /\bgzip\b/.test(String(req.headers['accept-encoding'] || '')), out = gz ? kept.gz : kept.body
    res.writeHead(kept.status, fix(req, kept.status, { ...kept.headers, ...(gz ? { 'content-encoding': 'gzip' } : {}), vary: 'Accept-Encoding', 'content-length': String(out.length), 'x-fanlife-shelf': kept.state }))
    res.end(out)
    return
  }
  const headers = upstream(req)
  if (key) { headers['accept-encoding'] = 'identity'; delete headers['if-none-match']; delete headers['if-modified-since'] }
  const up = http.request({ ...UP, method: req.method, path: req.url, headers }, (r) => {
    const status = r.statusCode || 502
    res.writeHead(status, fix(req, status, key ? { ...r.headers, 'x-fanlife-shelf': 'miss' } : { ...r.headers }))
    if (key && status === 200) {
      // the first visitor still gets the page as it streams; the same bytes go on the shelf when it ends whole
      const parts = []; let n = 0
      r.on('data', (c) => { n += c.length; if (n <= MAX_BODY) parts.push(c) })
      r.on('end', () => { if (shelvable(status, r.headers, n)) shelf.put(key, 200, clean(r.headers), Buffer.concat(parts)) })
    }
    r.pipe(res)
  })
  up.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end('starting') })
  req.pipe(up)
})
// open the door only once Next answers, so the platform's startup probe never routes a visitor to a cold server
const ready = () => new Promise((ok) => {
  const s = net.connect(UP.port, UP.host, () => { s.end(); ok(true) })
  s.on('error', () => ok(false))
})
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
for (let i = 0; i < 600 && !(await ready()); i++) await new Promise((r) => setTimeout(r, 100))
server.listen(Number(process.env.PORT) || 7860, '0.0.0.0')
}
