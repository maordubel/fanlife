// Cloudflare Worker in front of FAN LIFE. Route: fanlife.dubelteam.com/*.
// PRIMARY (Cloud Run) answers; if it is down, a GET/HEAD falls back to STANDBY (Vercel) when one is set.
// Switching hosts = changing these two variables in the Worker's settings; no DNS change, no downtime.
// KEY = the service secret FANLIFE_PROXY_KEY (optional).
const DEFAULT_PRIMARY = 'https://fanlife-1041793148354.europe-west1.run.app'
const DEFAULT_STANDBY = ''
const CLEAR = 'fl_cache_20261112'

async function forward(request, url, base, env, body) {
  const target = new URL(url.pathname + url.search, base)
  const headers = new Headers(request.headers)
  headers.set('x-fanlife-host', url.host)
  if (env && env.KEY) headers.set('x-fanlife-key', env.KEY)
  const init = { method: request.method, headers, redirect: 'manual' }
  if (body !== undefined) init.body = body
  // static files are cached at the edge, so they never reach the server twice; an error is never cached
  const isStatic = !url.pathname.startsWith('/api/') &&
    (url.pathname.startsWith('/_next/static/') || /\.(webp|png|jpg|jpeg|svg|woff2|mp4|webm|glb|mp3|ogg)$/.test(url.pathname))
  if (isStatic) init.cf = { cacheEverything: true, cacheTtlByStatus: { '200-299': 86400, '300-599': 0 } }
  const res = await fetch(target, init)
  const out = new Response(res.body, res)
  const loc = out.headers.get('location')
  if (loc && loc.startsWith(base)) out.headers.set('location', loc.replace(base, `https://${url.host}`))
  // a missing file is never cached: next.config gives /brand, /fonts, /ads a day-to-a-month max-age even on a 404,
  // and the first Cloud Run bundle (11.11.2026) left browsers holding those 404s
  if (out.status >= 400) out.headers.set('cache-control', 'no-store')
  // one browser-cache clear per visitor, to drop the 404s cached on 11-12.11.2026; the cookie name is the round
  const page = request.method === 'GET' && (request.headers.get('accept') || '').includes('text/html')
  if (page && out.status < 400 && !(request.headers.get('cookie') || '').includes(`${CLEAR}=1`)) {
    out.headers.set('clear-site-data', '"cache"')
    out.headers.append('set-cookie', `${CLEAR}=1; Max-Age=31536000; Path=/; Secure; SameSite=Lax`)
  }
  return out
}

export default {
  async fetch(request, env) {
    const primary = (env && env.PRIMARY) || DEFAULT_PRIMARY
    const standby = (env && env.STANDBY) || DEFAULT_STANDBY
    const url = new URL(request.url)
    const replayable = request.method === 'GET' || request.method === 'HEAD'
    const body = replayable ? undefined : request.body
    try {
      const res = await forward(request, url, primary, env, body)
      if (!standby || !replayable || res.status < 500) return res
    } catch (e) {
      if (!standby || !replayable) return new Response('FAN LIFE is restarting — try again in a moment.', { status: 503 })
    }
    return forward(request, url, standby, env, undefined)
  },
}
