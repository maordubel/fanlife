import {NextResponse} from 'next/server'
import {adminFromRequest} from '@/lib/master/admin'
import {sameOrigin} from '@/lib/master/request'
import {Refusal} from '@/lib/players/service'
export const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}})
/** Every route: the owner's session first (401), and for writes the request must come from this site (403). */
export function guard(r:Request,write=false){
 const s=adminFromRequest(r);if(!s)return {error:json({error:'Sign in to the control room first.',login:'/master/login'},401)}
 if(write){try{sameOrigin(r)}catch{return {error:json({error:'Cross-site request refused.'},403)}}}
 return {session:s}
}
export function fail(e:unknown){
 if(e instanceof Refusal)return json({error:e.message,detail:e.detail},e.status)
 const msg=String((e as Error)?.message||e);return json({error:/conflict/i.test(msg)?msg:'The player files are unavailable right now. Nothing was saved.'},/conflict/i.test(msg)?409:503)
}
