// A small static server for the Dubel Team sites that are files, not servers (DUBID, OFFSIDES, TakeMeOut,
// dubelteam.com) on Cloud Run (12.11.2026, after Vercel paused the account). It does what their vercel.json /
// _redirects did: clean URLs, rewrites, a single-page fallback, headers, and Vercel-style /api/<name> handlers.
// Configuration is /app/site.json (written by the deploy workflow); the files are /app/site.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.pdf': 'application/pdf', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm',
}

export function load(dir) {
  const cfg = JSON.parse(fs.readFileSync(path.join(dir, 'site.json'), 'utf8'))
  return {
    root: path.join(dir, cfg.root || 'site'),
    spa: Boolean(cfg.spa),
    cleanUrls: cfg.cleanUrls !== false,
    notFound: cfg.notFound || null,
    rewrites: (cfg.rewrites || []).map((r) => ({ re: new RegExp(r.source), dest: r.destination })),
    redirects: (cfg.redirects || []).map((r) => ({ re: new RegExp(r.source), dest: r.destination, status: r.status || 301 })),
    headers: (cfg.headers || []).map((h) => ({ re: new RegExp(h.source), set: h.headers })),
    api: cfg.api || {},
    dir,
  }
}

/** Resolve a request path to a file inside root, or null. Never leaves root. */
export function resolveFile(site, pathname) {
  let p
  try { p = decodeURIComponent(pathname) } catch { return null }
  if (p.includes('\0')) return null
  const tries = [p]
  if (p.endsWith('/')) tries.push(p + 'index.html')
  else if (site.cleanUrls && !path.extname(p)) tries.push(p + '.html', p + '/index.html')
  for (const t of tries) {
    const full = path.normalize(path.join(site.root, t))
    if (full !== site.root && !full.startsWith(site.root + path.sep)) return null
    try { if (fs.statSync(full).isFile()) return full } catch {}
  }
  return null
}

function rewrite(site, pathname, search) {
  for (const r of site.rewrites) {
    const m = pathname.match(r.re)
    if (m) {
      let d = r.dest
      m.slice(1).forEach((g, i) => { d = d.split('$' + (i + 1)).join(g ?? '') })
      if (m.groups) for (const [k, v] of Object.entries(m.groups)) d = d.split(':' + k).join(v ?? '')
      const u = new URL(d, 'http://x')
      for (const [k, v] of new URLSearchParams(search)) if (!u.searchParams.has(k)) u.searchParams.set(k, v)
      return { pathname: u.pathname, search: u.search }
    }
  }
  return null
}

function cacheFor(file) {
  if (file.endsWith('.html')) return 'no-cache'
  if (/[\\/]assets[\\/]/.test(file) || /[.-][0-9a-f]{8,}\./i.test(path.basename(file))) return 'public, max-age=31536000, immutable'
  return 'public, max-age=3600'
}

async function api(site, name, req, res, url) {
  const file = site.api[name]
  if (!file) return false
  const mod = await import(pathToFileURL(path.join(site.dir, file)).href)
  const handler = mod.default || mod.handler
  req.query = Object.fromEntries(url.searchParams)
  res.status = (c) => { res.statusCode = c; return res }
  res.json = (o) => { res.setHeader('content-type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); return res }
  res.send = (b) => { if (b !== undefined && typeof b === 'object' && !Buffer.isBuffer(b)) return res.json(b); res.end(b); return res }
  res.redirect = (a, b) => { const [code, to] = typeof a === 'number' ? [a, b] : [302, a]; res.statusCode = code; res.setHeader('location', to); res.end(); return res }
  await handler(req, res)
  return true
}

export function makeServer(site) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost')
      for (const h of site.headers) if (h.re.test(url.pathname)) for (const [k, v] of Object.entries(h.set)) res.setHeader(k, v)
      if (url.pathname === '/healthz') { res.setHeader('content-type', 'text/plain'); return res.end('ok') }
      for (const r of site.redirects) if (r.re.test(url.pathname)) { res.statusCode = r.status; res.setHeader('location', url.pathname.replace(r.re, r.dest) + url.search); return res.end() }
      let { pathname, search } = url
      const rw = resolveFile(site, pathname) ? null : rewrite(site, pathname, search)
      if (rw) ({ pathname, search } = rw)
      if (pathname.startsWith('/api/')) {
        const u = new URL(pathname + search, 'http://localhost')
        if (await api(site, pathname.slice(5).replace(/\/$/, ''), req, res, u)) return
      }
      let file = resolveFile(site, pathname)
      let status = 200
      if (!file && site.spa && req.method === 'GET' && !path.extname(pathname)) file = path.join(site.root, 'index.html')
      if (!file && site.notFound) { file = path.join(site.root, site.notFound); status = 404 }
      if (!file || !fs.existsSync(file)) { res.statusCode = 404; res.setHeader('cache-control', 'no-store'); return res.end('Not found') }
      res.statusCode = status
      if (!res.getHeader('content-type')) res.setHeader('content-type', MIME[path.extname(file).toLowerCase()] || 'application/octet-stream')
      if (!res.getHeader('cache-control')) res.setHeader('cache-control', status === 200 ? cacheFor(file) : 'no-store')
      res.setHeader('x-content-type-options', 'nosniff')
      if (req.method === 'HEAD') return res.end()
      fs.createReadStream(file).pipe(res)
    } catch (e) {
      console.error(e)
      if (!res.headersSent) { res.statusCode = 500; res.setHeader('cache-control', 'no-store') }
      res.end('Server error')
    }
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const site = load(process.env.SITE_DIR || '/app')
  makeServer(site).listen(Number(process.env.PORT) || 8080, '0.0.0.0')
}
