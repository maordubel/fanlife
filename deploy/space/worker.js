// Cloudflare Worker in front of FAN LIFE and the other Dubel Team apps on Cloud Run (12.11.2026).
// Routes: fanlife, theworker, fuckyou, dubid, offsides, takemeout (.dubelteam.com/*), dubelteam.com/* and www.dubelteam.com/*.
// A host <name>.dubelteam.com is served by the Cloud Run service <name>; fanlife and its club subdomains by fanlife.
// PRIMARY (Cloud Run) answers; if it is down, a GET/HEAD falls back to STANDBY (Vercel) when one is set.
// Switching hosts = changing these two variables in the Worker's settings; no DNS change, no downtime.
// KEY = the service secret FANLIFE_PROXY_KEY (optional).
const DEFAULT_PRIMARY = 'https://fanlife-1041793148354.europe-west1.run.app'
const DEFAULT_STANDBY = ''
const RUN = (name) => `https://${name}-1041793148354.europe-west1.run.app`
export function originFor(host) {
  const h = String(host).toLowerCase()
  if (h === 'fanlife.dubelteam.com' || h.endsWith('.fanlife.dubelteam.com')) return null
  if (h === 'dubelteam.com' || h === 'www.dubelteam.com') return RUN('dubelteam')
  const m = h.match(/^([a-z0-9-]+)\.dubelteam\.com$/)
  return m ? RUN(m[1]) : null
}

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
  return out
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const app = originFor(url.host)
    const primary = app || (env && env.PRIMARY) || DEFAULT_PRIMARY
    const standby = app ? '' : (env && env.STANDBY) || DEFAULT_STANDBY
    const replayable = request.method === 'GET' || request.method === 'HEAD'
    const body = replayable ? undefined : request.body
    try {
      const res = await forward(request, url, primary, env, body)
      if (!standby || !replayable || res.status < 500) return res
    } catch (e) {
      if (!standby || !replayable) return new Response('Restarting — try again in a moment.', { status: 503 })
    }
    return forward(request, url, standby, env, undefined)
  },
}
