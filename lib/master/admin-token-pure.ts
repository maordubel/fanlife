/** The half of the owner-key policy with no Node imports, so the Edge middleware can read it too (see admin-token.ts). */
export const ADMIN_COOKIE='fan-life-admin'
export const ADMIN_SESSION_DAYS=30
export const ADMIN_KEY_MIN=16
export type AdminPolicy='keyed'|'open-dev'|'closed'
export type AdminEnv={FAN_LIFE_ADMIN_KEY?:string;NODE_ENV?:string}
export const normalizeKey=(v:string)=>{let k=v.normalize('NFKC').trim();const q=k.match(/^(["'“”‘’])(.*)(["'“”‘’])$/s);if(q)k=q[2]!.trim();return k}
export const configuredKey=(env:AdminEnv)=>{const k=normalizeKey(env.FAN_LIFE_ADMIN_KEY||'');return k.length>=ADMIN_KEY_MIN?k:''}
export function adminPolicy(env:AdminEnv):AdminPolicy{if(configuredKey(env))return 'keyed';return env.NODE_ENV==='production'?'closed':'open-dev'}
