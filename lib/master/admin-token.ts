import {createHash,createHmac,timingSafeEqual} from 'node:crypto'
/**
 * The owner key (audit F01, 7.10.2026) — the pure half, so every rule here is tested without a server.
 *
 * There are no accounts yet. The control room opens for whoever knows `FAN_LIFE_ADMIN_KEY`; the
 * browser then holds a signed session cookie, never the key. The signing secret is derived from
 * the key, so changing the key in Vercel signs every open session out.
 *
 * Policy:
 *  · key set (≥ 16 characters)            → `keyed`: only a valid session cookie opens the admin;
 *  · no key, NODE_ENV !== 'production'    → `open-dev`: local development stays open, as before;
 *  · no key (or too short) in production  → `closed`: fail closed, nobody gets in.
 * Evaluation mode (fans can play every gate) never enters this decision.
 */
export const ADMIN_COOKIE='fan-life-admin'
export const ADMIN_SESSION_DAYS=30
export const ADMIN_KEY_MIN=16
const DAY=86400
export type AdminPolicy='keyed'|'open-dev'|'closed'
export type AdminEnv={FAN_LIFE_ADMIN_KEY?:string;NODE_ENV?:string}
/** Who an audit entry says acted. `owner` only ever comes from a verified cookie. */
export type AdminSession={actor:'owner'|'local-developer';role:'owner'|'dev-open'}
export const configuredKey=(env:AdminEnv)=>{const k=(env.FAN_LIFE_ADMIN_KEY||'').trim();return k.length>=ADMIN_KEY_MIN?k:''}
export function adminPolicy(env:AdminEnv):AdminPolicy{if(configuredKey(env))return 'keyed';return env.NODE_ENV==='production'?'closed':'open-dev'}
const signingSecret=(key:string)=>createHmac('sha256',key).update('fan-life-admin-session-v1').digest()
const sign=(key:string,payload:string)=>createHmac('sha256',signingSecret(key)).update(payload).digest('base64url')
/** Constant-time comparison of what was typed against the key; hashing first makes the lengths equal. */
export function keyMatches(input:unknown,key:string){if(typeof input!=='string'||!key)return false;const a=createHash('sha256').update(input).digest(),b=createHash('sha256').update(key).digest();return timingSafeEqual(a,b)&&input.length===key.length}
/** `v1.<issued-at>.<expires>.<hmac>` — seconds since the epoch. */
export function issueToken(key:string,now=Math.floor(Date.now()/1000)){const payload=`v1.${now}.${now+ADMIN_SESSION_DAYS*DAY}`;return `${payload}.${sign(key,payload)}`}
export function verifyToken(token:unknown,key:string,now=Math.floor(Date.now()/1000)):boolean{
 if(!key||typeof token!=='string'||token.length>200)return false
 const m=/^v1\.(\d{1,12})\.(\d{1,12})\.([A-Za-z0-9_-]{43})$/.exec(token);if(!m)return false
 const iat=Number(m[1]),exp=Number(m[2]),want=Buffer.from(sign(key,`v1.${m[1]}.${m[2]}`)),got=Buffer.from(m[3]!)
 if(want.length!==got.length||!timingSafeEqual(want,got))return false
 return iat<=now+60&&exp>now&&exp-iat<=ADMIN_SESSION_DAYS*DAY
}
/** The whole decision, from the environment and the cookie value. */
export function sessionFrom(env:AdminEnv,cookie:string|undefined,now?:number):AdminSession|null{
 const policy=adminPolicy(env)
 if(policy==='open-dev')return{actor:'local-developer',role:'dev-open'}
 if(policy==='closed')return null
 return verifyToken(cookie,configuredKey(env),now)?{actor:'owner',role:'owner'}:null
}
/** Only a same-site path survives as ?next= — never another host, never `//evil`. */
export function safeNext(v:unknown,fallback='/master/admin'){if(typeof v!=='string'||!v.startsWith('/')||v.startsWith('//')||v.includes('\\')||/[\r\n]/.test(v)||v.length>500)return fallback;return v}
export const loginPath=(next:string)=>`/master/login?next=${encodeURIComponent(safeNext(next))}`
export function cookieOptions(env:AdminEnv){return{httpOnly:true,secure:env.NODE_ENV==='production',sameSite:'lax' as const,path:'/',maxAge:ADMIN_SESSION_DAYS*DAY}}
/** Read one cookie out of a raw Cookie header (API routes get a plain Request). */
export function cookieValue(header:string|null,name=ADMIN_COOKIE){if(!header)return undefined;for(const part of header.split(';')){const i=part.indexOf('=');if(i>0&&part.slice(0,i).trim()===name){try{return decodeURIComponent(part.slice(i+1).trim())}catch{return undefined}}}return undefined}
