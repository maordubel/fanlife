// Cloudflare Worker in front of the FAN LIFE Space. Routes: fanlife.dubelteam.com/* (and club hosts when certified).
// SPACE = https://<user>-fanlife.hf.space ; KEY = the same value as the Space secret FANLIFE_PROXY_KEY.
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const target = new URL(url.pathname + url.search, env.SPACE)
    const headers = new Headers(request.headers)
    headers.set('x-fanlife-host', url.host)
    if (env.KEY) headers.set('x-fanlife-key', env.KEY)
    const init = { method: request.method, headers, redirect: 'manual' }
    if (!['GET', 'HEAD'].includes(request.method)) init.body = request.body
    // static files are cached at the edge, so they never reach the Space twice
    const isStatic = url.pathname.startsWith('/_next/static/') || /\.(webp|png|jpg|svg|woff2|mp4|webm|glb|mp3|ogg|json)$/.test(url.pathname)
    if (isStatic) init.cf = { cacheEverything: true, cacheTtl: 86400 }
    const res = await fetch(target, init)
    const out = new Response(res.body, res)
    const loc = out.headers.get('location')
    if (loc && loc.startsWith(env.SPACE)) out.headers.set('location', loc.replace(env.SPACE, `https://${url.host}`))
    return out
  },
}
