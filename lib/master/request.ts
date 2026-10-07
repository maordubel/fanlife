import 'server-only'
import {timingSafeEqual} from 'node:crypto'
import {evaluationMode} from './mode'
/** CSRF guard: the browser's Origin (or Sec-Fetch-Site: same-origin) must be this host (as served, incl. a preview URL) or the configured site URL. */
export function sameOrigin(r:Request){const origin=r.headers.get('origin')
 // some browsers omit Origin on a same-origin POST; Sec-Fetch-Site is set by the browser and cannot be forged by a page
 if(!origin){if(r.headers.get('sec-fetch-site')==='same-origin')return;throw new Error('Use the application origin for this operation.')}
 const host=r.headers.get('x-forwarded-host')||r.headers.get('host'),proto=r.headers.get('x-forwarded-proto')||new URL(r.url).protocol.replace(':','')
 const allowed=new Set([new URL(r.url).origin,...(host?[`${proto}://${host}`]:[]),...(process.env.NEXT_PUBLIC_SITE_URL?[new URL(process.env.NEXT_PUBLIC_SITE_URL).origin]:[])])
 if(!allowed.has(origin))throw new Error('Use the application origin for this operation.')}
/** The fans' preview (every gate playable without an account). It is NOT an admin check — see `lib/master/admin.ts` (audit F01). */
export function requireOpenEvaluation(){if(!evaluationMode())throw new Error('This release is available in open local evaluation only.')}
export function cronAuthorized(r:Request){const secret=process.env.CRON_SECRET||'',a=Buffer.from(r.headers.get('authorization')||''),b=Buffer.from(`Bearer ${secret}`);return secret.length>=32&&a.length===b.length&&timingSafeEqual(a,b)}
export function text(v:unknown,name:string,max=200){if(typeof v!=='string'||!v.trim()||v.length>max)throw new Error(`${name} is required (maximum ${max} characters).`);return v.trim()}
export function slug(v:unknown){const s=text(v,'Club ID',61);if(!/^[a-z][a-z0-9-]{1,60}$/.test(s))throw new Error('Use lowercase letters, digits and hyphens.');return s}
export function color(v:unknown){const s=text(v,'Colour',7);if(!/^#[0-9a-f]{6}$/i.test(s))throw new Error('Use a six-digit hexadecimal colour.');return s}
