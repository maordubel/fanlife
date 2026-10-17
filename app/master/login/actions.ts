'use server'
import {cookies,headers} from 'next/headers'
import {createHash} from 'node:crypto'
import {fileArea} from '@/lib/master/files'
import {redirect} from 'next/navigation'
import {ADMIN_COOKIE,adminPolicy,configuredKey,cookieOptions,issueToken,keyMatches,safeNext} from '@/lib/master/admin-token'
type Fails=Record<string,{n:number;first:number;until:number}>
const MAX_TRIES=5,WINDOW_MS=15*60_000
const who=()=>createHash('sha256').update((headers().get('x-forwarded-for')||'unknown').split(',')[0]!.trim()).digest('hex').slice(0,16)
const guard=fileArea('admin-guard')
/** Five wrong keys in fifteen minutes from one address lock that address out for fifteen minutes. Best effort: a broken store never locks the owner out. */
const locked=async(id:string)=>{try{const f=await guard.readJson<Fails>('fails.json',{});return (f[id]?.until??0)>Date.now()}catch{return false}}
const record=async(id:string,ok:boolean)=>{try{await guard.update<Fails>('fails.json',{},cur=>{const now=Date.now(),n={...cur};for(const[k,v]of Object.entries(n))if(v.until<now&&now-v.first>WINDOW_MS)delete n[k];if(ok){delete n[id];return n}const c=n[id]&&now-n[id]!.first<WINDOW_MS?n[id]!:{n:0,first:now,until:0};c.n+=1;if(c.n>=MAX_TRIES)c.until=now+WINDOW_MS;n[id]=c;return n})}catch{/* best effort */}}
const env=()=>({FAN_LIFE_ADMIN_KEY:process.env.FAN_LIFE_ADMIN_KEY,NODE_ENV:process.env.NODE_ENV})
/** The owner types the key; the browser keeps only a signed, httpOnly session (audit F01). */
export async function login(_prev:{error:string},form:FormData):Promise<{error:string}>{
 const e=env(),next=safeNext(form.get('next'))
 if(adminPolicy(e)==='closed')return{error:'The owner key is not configured on this server.'}
 if(adminPolicy(e)==='open-dev')redirect(next)
 // a small, constant delay makes guessing slow without telling anything apart
 await new Promise(r=>setTimeout(r,400))
 const id=who()
 if(await locked(id))return{error:'Too many tries. Wait a few minutes and try again.'}
 if(!keyMatches(form.get('key'),configuredKey(e))){await record(id,false);return{error:'That key is not right.'}}
 await record(id,true)
 cookies().set(ADMIN_COOKIE,issueToken(configuredKey(e)),cookieOptions(e))
 redirect(next)
}
export async function logout(){cookies().set(ADMIN_COOKIE,'',{...cookieOptions(env()),maxAge:0});redirect('/master/login')}
