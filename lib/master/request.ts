import 'server-only'
import {timingSafeEqual} from 'node:crypto'
import {evaluationMode} from './mode'
export function sameOrigin(r:Request){const origin=process.env.NEXT_PUBLIC_SITE_URL?new URL(process.env.NEXT_PUBLIC_SITE_URL).origin:new URL(r.url).origin;if(r.headers.get('origin')!==origin)throw new Error('Use the application origin for this operation.')}
export function requireOpenEvaluation(){if(!evaluationMode())throw new Error('This release is available in open local evaluation only.')}
export function cronAuthorized(r:Request){const secret=process.env.CRON_SECRET||'',a=Buffer.from(r.headers.get('authorization')||''),b=Buffer.from(`Bearer ${secret}`);return secret.length>=32&&a.length===b.length&&timingSafeEqual(a,b)}
export function text(v:unknown,name:string,max=200){if(typeof v!=='string'||!v.trim()||v.length>max)throw new Error(`${name} is required (maximum ${max} characters).`);return v.trim()}
export function slug(v:unknown){const s=text(v,'Club ID',61);if(!/^[a-z][a-z0-9-]{1,60}$/.test(s))throw new Error('Use lowercase letters, digits and hyphens.');return s}
export function color(v:unknown){const s=text(v,'Colour',7);if(!/^#[0-9a-f]{6}$/i.test(s))throw new Error('Use a six-digit hexadecimal colour.');return s}
