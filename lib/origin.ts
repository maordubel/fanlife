import {SITE_URL} from '@/lib/brand'

/**
 * The origins this app is really served on. Behind a proxy (Cloudflare → Cloud Run since 11.11.2026) `request.url` is
 * the container's own address, never the public one, so a check against it alone refuses every browser. The public
 * origin is the configured site URL and the host the proxy forwarded; `request.url` stays for local runs and tests.
 */
export function servedOrigins(r:Request):Set<string>{
 const out=new Set<string>()
 const add=(v:string|null|undefined)=>{if(!v)return;try{out.add(new URL(v).origin)}catch{/* not a URL */}}
 add(r.url);add(SITE_URL);add(process.env.NEXT_PUBLIC_SITE_URL)
 const host=(r.headers.get('x-forwarded-host')||r.headers.get('host')||'').split(',')[0]!.trim()
 const proto=(r.headers.get('x-forwarded-proto')||'').split(',')[0]!.trim()||new URL(r.url).protocol.replace(':','')
 if(host)add(`${proto}://${host}`)
 return out
}
/** Is the browser's Origin one of ours? */
export const ownOrigin=(r:Request):boolean=>{const o=r.headers.get('origin');return !!o&&servedOrigins(r).has(o)}

/**
 * The public origin to send a visitor back to (an auth redirect, a 302): the host the proxy forwarded, then the
 * configured site URL. Never `request.url` alone behind the proxy — that is `localhost:3000`, and a redirect there is
 * an error page on the visitor's phone (the Google sign-in, 18.11.2026). `request.url` is used only for a local run.
 */
export function publicOrigin(r:Request):string{
 const host=(r.headers.get('x-forwarded-host')||r.headers.get('x-fanlife-host')||r.headers.get('host')||'').split(',')[0]!.trim()
 const proto=(r.headers.get('x-forwarded-proto')||'').split(',')[0]!.trim()||'https'
 const local=(h:string)=>/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?$/.test(h)
 if(host&&!local(host))return `${proto}://${host}`
 try{const u=new URL(r.url);if(!local(u.host)||!process.env.NEXT_PUBLIC_SITE_URL)return u.origin}catch{/* fall through */}
 return new URL(process.env.NEXT_PUBLIC_SITE_URL||SITE_URL).origin
}
