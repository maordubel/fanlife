'use server'
import {cookies} from 'next/headers'
import {redirect} from 'next/navigation'
import {ADMIN_COOKIE,adminPolicy,configuredKey,cookieOptions,issueToken,keyMatches,safeNext} from '@/lib/master/admin-token'
const env=()=>({FAN_LIFE_ADMIN_KEY:process.env.FAN_LIFE_ADMIN_KEY,NODE_ENV:process.env.NODE_ENV})
/** The owner types the key; the browser keeps only a signed, httpOnly session (audit F01). */
export async function login(_prev:{error:string},form:FormData):Promise<{error:string}>{
 const e=env(),next=safeNext(form.get('next'))
 if(adminPolicy(e)==='closed')return{error:'The owner key is not configured on this server.'}
 if(adminPolicy(e)==='open-dev')redirect(next)
 // a small, constant delay makes guessing slow without telling anything apart
 await new Promise(r=>setTimeout(r,400))
 if(!keyMatches(form.get('key'),configuredKey(e)))return{error:'That key is not right.'}
 cookies().set(ADMIN_COOKIE,issueToken(configuredKey(e)),cookieOptions(e))
 redirect(next)
}
export async function logout(){cookies().set(ADMIN_COOKIE,'',{...cookieOptions(env()),maxAge:0});redirect('/master/login')}
