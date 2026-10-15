import 'server-only'
import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto'
import {cookies} from 'next/headers'
import {createClient} from '@/lib/supabase/server'

/**
 * Who is playing (FL-07/09). A signed-in fan is their account (`u:<id>`); anyone else is a device key in a signed, httpOnly
 * cookie (`d:<random>`), so a career can be played without an account and is still never anyone else's. The browser never names
 * an owner — the server reads it here on every request. Only a hash of the key is ever written to storage.
 */
const COOKIE='legends-device'
function secret():string|null{
 const k=process.env.LEGENDS_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.FAN_LIFE_ADMIN_KEY
 if(k&&k.length>=16)return k
 return process.env.NODE_ENV==='production'?null:'legends-development-key'
}
const sign=(v:string,k:string)=>createHmac('sha256',k).update(`legends-device:${v}`).digest('base64url').slice(0,32)
export function verifyDevice(raw:string|undefined,k:string|null=secret()):string|null{
 if(!raw||!k)return null
 const [v,mac]=raw.split('.');if(!v||!mac||!/^[A-Za-z0-9_-]{22}$/.test(v))return null
 const a=Buffer.from(mac),b=Buffer.from(sign(v,k));return a.length===b.length&&timingSafeEqual(a,b)?v:null
}
export const ownerHash=(key:string)=>createHash('sha256').update(`legends-owner:${key}`).digest('hex').slice(0,32)

async function account():Promise<string|null>{
 if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)return null
 try{const {data}=await createClient().auth.getUser();const u=data.user as {id:string;is_anonymous?:boolean}|null;return u&&!u.is_anonymous?`u:${u.id}`:null}catch{return null}
}
/** the viewer's owner hash; `create` (server actions only — a page cannot set a cookie) mints a device key when there is none */
export async function viewer(create=false):Promise<string|null>{
 const acc=await account();if(acc)return ownerHash(acc)
 const k=secret(),jar=cookies(),dev=verifyDevice(jar.get(COOKIE)?.value,k)
 if(dev)return ownerHash(`d:${dev}`)
 if(!create||!k)return null
 const v=randomBytes(16).toString('base64url')
 jar.set(COOKIE,`${v}.${sign(v,k)}`,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:60*60*24*730})
 return ownerHash(`d:${v}`)
}

/** both keys, read by the server only: the signed-in account's owner hash and the verified device cookie's owner hash (F05) */
export async function claimKeys():Promise<{account:string;device:string}|null>{
 const acc=await account();if(!acc)return null
 const dev=verifyDevice(cookies().get(COOKIE)?.value,secret());if(!dev)return null
 return {account:ownerHash(acc),device:ownerHash(`d:${dev}`)}
}
