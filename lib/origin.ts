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
