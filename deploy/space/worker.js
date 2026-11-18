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
  // FAN LIFE INSIGHT (17.11.2026): the place the edge resolved, so the server never needs the address itself
  const cf = request.cf || {}
  if (cf.country) headers.set('x-fanlife-geo-country', String(cf.country))
  if (cf.region) headers.set('x-fanlife-geo-region', encodeURIComponent(String(cf.region)))
  if (cf.city) headers.set('x-fanlife-geo-city', encodeURIComponent(String(cf.city)))
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

// ── The edge copy and the boot screen (18.11.2026: "the first load is terribly slow — speed it up, and give an entry
// screen that opens fast and shows it is loading, nicely, in the site's atmosphere") ──────────────────────────────────
// A cold Cloud Run instance needs seconds before it answers (min-instances 0 keeps it free). A public page is the same
// for every visitor (the front door's shelf already relies on this), so the edge keeps a copy of each FAN LIFE page:
// fresh for a minute, then still answered at once while one request refreshes it behind. When there is no copy yet and
// the server has not answered within BOOT_AFTER_MS, the visitor gets the boot screen at once; it waits for the page and
// then shows it. Never: a non-GET, an API, the desk, auth, a signed-in owner/tester, a file, a page that sets a cookie.
export const EDGE_FRESH_S = 60
export const EDGE_KEEP_S = 7 * 86400
export const BOOT_AFTER_MS = 1200
const NEVER = /^\/(api|master|_next|qa|auth|studio-cancel|final-whistle-render|desk|control)(\/|$)/
const NOISE = /^(utm_[a-z]+|fbclid|gclid|mc_[a-z]+|ref)$/i
export function edgeKey(request) {
  if (request.method !== 'GET' || request.headers.get('range') || request.headers.get('authorization')) return null
  const url = new URL(request.url)
  if (!(url.host === 'fanlife.dubelteam.com' || url.host.endsWith('.fanlife.dubelteam.com'))) return null
  if (!String(request.headers.get('accept') || '').includes('text/html') || request.headers.get('rsc')) return null
  const cookie = String(request.headers.get('cookie') || '')
  if (cookie.includes('fan-life-admin=') || cookie.includes('fan-life-tester=')) return null
  if (NEVER.test(url.pathname) || /\.[a-zA-Z0-9]+$/.test(url.pathname)) return null
  for (const k of [...url.searchParams.keys()]) if (NOISE.test(k)) url.searchParams.delete(k)
  url.searchParams.sort()
  return `https://edge-copy.fanlife/${url.host}${url.pathname}?${url.searchParams.toString()}`
}
// the only cookies a public page may carry are per-visitor one-offs: the anonymous tester id the evaluation build hands a
// new visitor and the proxy's one-time cache-clear marker (fl_cache_<round>, with its Clear-Site-Data). The edge keeps
// the page without them; the visitor whose request refreshed it still gets theirs
const ANON_COOKIE = /^(fan-life-tester|fl_cache_\d+)=/
function setCookies(res) {
  if (typeof res.headers.getSetCookie === 'function') return res.headers.getSetCookie()
  const one = res.headers.get('set-cookie')
  return one ? [one] : []
}
const storable = (res) => res.status === 200 && setCookies(res).every((c) => ANON_COOKIE.test(c)) && String(res.headers.get('content-type') || '').includes('text/html')
async function keep(cache, key, res) {
  if (!cache || !storable(res)) return
  const h = new Headers(res.headers)
  h.set('cache-control', `public, max-age=${EDGE_KEEP_S}`)
  h.set('x-edge-stored', String(Date.now()))
  h.delete('x-fanlife-shelf'); h.delete('content-encoding'); h.delete('content-length'); h.delete('set-cookie'); h.delete('clear-site-data')
  await cache.put(key, new Response(await res.arrayBuffer(), { status: 200, headers: h }))
}
function served(res, state) {
  const out = new Response(res.body, res)
  out.headers.set('cache-control', 'private, no-cache, no-store, max-age=0, must-revalidate')
  out.headers.set('x-fanlife-edge', state)
  out.headers.delete('x-edge-stored')
  return out
}
/** The boot screen: one small page, no script library, the magazine's own colours and type; it fetches the real page
 * (the edge marks that fetch so it is never answered with this screen) and, once the page is ready (now kept at the
 * edge), reloads into it; a short `fl_boot` cookie makes sure that reload waits for the server instead of booting again. */
export function bootPage(path) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#15130f"><title>FAN LIFE — warming up the terrace</title><link rel="icon" href="/brand/fanlife/logo-96.png"><style>
html,body{margin:0;block-size:100%;background:#15130f;color:#fffbf2;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
body{display:grid;place-items:center;overflow:hidden;background-image:radial-gradient(rgb(255 251 242/.08) 1.4px,transparent 1.7px);background-size:8px 8px}
.b{display:grid;justify-items:center;gap:18px;padding:24px;text-align:center}
.s{position:relative;inline-size:min(58vw,240px);aspect-ratio:1;display:grid;place-items:center}
.r{position:absolute;inset:0;background:#e8412c;clip-path:polygon(50% 0,61% 18%,79% 7%,78% 28%,98% 30%,86% 47%,100% 62%,80% 68%,85% 89%,64% 83%,50% 100%,36% 83%,15% 89%,20% 68%,0 62%,14% 47%,2% 30%,22% 28%,21% 7%,39% 18%);animation:spin 9s linear infinite;filter:drop-shadow(6px 6px 0 #000)}
.l{position:relative;inline-size:70%;aspect-ratio:1;border-radius:50%;background:#fffbf2 url(/brand/fanlife/logo-192.webp) center/cover;box-shadow:0 0 0 4px #15130f;animation:hop .8s cubic-bezier(.3,.7,.4,1) infinite alternate}
h1{margin:0;font-size:clamp(34px,10vw,56px);line-height:1;font-weight:900;font-style:italic;text-transform:uppercase;letter-spacing:-.02em;color:#fffbf2;-webkit-text-stroke:3px #000;paint-order:stroke fill;text-shadow:4px 4px 0 #000;transform:rotate(-3deg)}
p{margin:0;max-inline-size:28ch;font-size:15px;line-height:1.4;color:rgb(255 251 242/.82)}
.k{display:flex;gap:8px}.k i{inline-size:22px;block-size:30px;border:3px solid #000;background:#fffbf2;box-shadow:3px 3px 0 #000;animation:lamp 1.05s steps(1) infinite}.k i:nth-child(2){animation-delay:.35s}.k i:nth-child(3){animation-delay:.7s}
.t{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#2fb36a;font-weight:800}
@keyframes spin{to{transform:rotate(360deg)}}@keyframes hop{from{transform:translateY(6px) rotate(-4deg)}to{transform:translateY(-10px) rotate(4deg)}}@keyframes lamp{0%,100%{background:#fffbf2}33%{background:#e8412c}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style></head><body><main class="b" role="status" aria-live="polite"><div class="s"><div class="r"></div><div class="l"></div></div><h1>Kick-off soon</h1><div class="k"><i></i><i></i><i></i></div><p id="m">The stadium lights are coming on. Your page is on its way.</p><span class="t">FAN LIFE · Football. Forever.</span></main><script>
(function(){var lines=["The stadium lights are coming on. Your page is on its way.","Unrolling the scarves…","Counting the crowd at the turnstiles…","Polishing the trophy cabinet…","Almost there — teams are in the tunnel."],i=0,m=document.getElementById("m");var t=setInterval(function(){i=(i+1)%lines.length;m.textContent=lines[i]},2600);
function go(n){fetch(${JSON.stringify(path)},{headers:{accept:"text/html","x-fanlife-boot":"1"},credentials:"include",cache:"no-store"}).then(function(r){if(!r.ok&&n<3)throw 0;return r.text()}).then(function(){clearInterval(t);document.cookie="fl_boot=1; max-age=20; path=/; samesite=lax";location.reload()}).catch(function(){n<3?setTimeout(function(){go(n+1)},1500):(document.cookie="fl_boot=1; max-age=20; path=/; samesite=lax",location.reload())})}go(0)})();
</script></body></html>`
}

// A visitor with a session (signed in, or holding the evaluation build's tester id) may be rendered pages of their own,
// so the edge never answers them from the copy and never keeps what they were sent; they still get the boot screen.
const SESSION = /(?:^|;\s*)(sb-[a-z0-9]+-auth-token(?:\.\d+)?|fan-life-tester)=/
const personal = (request) => SESSION.test(String(request.headers.get('cookie') || ''))
async function edgeFetch(request, url, primary, env, ctx) {
  const key = edgeKey(request)
  const own = personal(request)
  const cache = typeof caches !== 'undefined' ? caches.default : null
  if (!key || !cache) return null
  const waitUntil = (p) => { if (ctx && ctx.waitUntil) ctx.waitUntil(p.catch(() => {})); else p.catch(() => {}) }
  // the visitor's copy streams at once; the edge's own copy is read behind it
  const refresh = () => forward(request, url, primary, env, undefined).then((res) => { if (!own && storable(res)) waitUntil(keep(cache, key, res.clone())); return res })
  const hit = own ? null : await cache.match(key)
  if (hit) {
    const age = (Date.now() - Number(hit.headers.get('x-edge-stored') || 0)) / 1000
    if (age > EDGE_FRESH_S) waitUntil(refresh())
    return served(hit, age > EDGE_FRESH_S ? 'stale' : 'fresh')
  }
  const live = refresh()
  // the boot screen's own fetch, or a page that answers quickly: wait for the server
  if (request.headers.get('x-fanlife-boot') || /(?:^|;\s*)fl_boot=1/.test(String(request.headers.get('cookie') || ''))) return served(await live, 'miss')
  const slow = new Promise((ok) => setTimeout(() => ok(null), BOOT_AFTER_MS))
  const first = await Promise.race([live, slow])
  if (first) return served(first, 'miss')
  waitUntil(live)
  return new Response(bootPage(url.pathname + url.search), { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-fanlife-edge': 'boot' } })
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const app = originFor(url.host)
    const primary = app || (env && env.PRIMARY) || DEFAULT_PRIMARY
    const standby = app ? '' : (env && env.STANDBY) || DEFAULT_STANDBY
    const replayable = request.method === 'GET' || request.method === 'HEAD'
    const body = replayable ? undefined : request.body
    try {
      if (!app && replayable) {
        const edge = await edgeFetch(request, url, primary, env, ctx)
        if (edge) return edge
      }
      const res = await forward(request, url, primary, env, body)
      if (!standby || !replayable || res.status < 500) return res
    } catch (e) {
      if (!standby || !replayable) return new Response('Restarting — try again in a moment.', { status: 503 })
    }
    return forward(request, url, standby, env, undefined)
  },
}
