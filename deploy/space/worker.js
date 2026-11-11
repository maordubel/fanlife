// Cloudflare Worker in front of the FAN LIFE Space. Routes: fanlife.dubelteam.com/* (and club hosts when certified).
// SPACE = the Cloud Run service URL (variable; falls back to DEFAULT_SPACE); KEY = the service secret FANLIFE_PROXY_KEY.
const DEFAULT_SPACE = 'https://fanlife-fanlife.hf.space'

export default {
  async fetch(request, env) {
    const space = (env && env.SPACE) || DEFAULT_SPACE
    const url = new URL(request.url)
    const target = new URL(url.pathname + url.search, space)
    const headers = new Headers(request.headers)
    headers.set('x-fanlife-host', url.host)
    if (env && env.KEY) headers.set('x-fanlife-key', env.KEY)
    const init = { method: request.method, headers, redirect: 'manual' }
    if (!['GET', 'HEAD'].includes(request.method)) init.body = request.body
    // static files are cached at the edge, so they never reach the Space twice; an error is never cached
    const isStatic = !url.pathname.startsWith('/api/') &&
      (url.pathname.startsWith('/_next/static/') || /\.(webp|png|jpg|jpeg|svg|woff2|mp4|webm|glb|mp3|ogg)$/.test(url.pathname))
    if (isStatic) init.cf = { cacheEverything: true, cacheTtlByStatus: { '200-299': 86400, '300-599': 0 } }
    const res = await fetch(target, init)
    const out = new Response(res.body, res)
    const loc = out.headers.get('location')
    if (loc && loc.startsWith(space)) out.headers.set('location', loc.replace(space, `https://${url.host}`))
    return out
  },
}
