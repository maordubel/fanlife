import {NextResponse} from 'next/server'
import {adminFromRequest} from '@/lib/master/admin'
import {sameOrigin} from '@/lib/master/request'
import {readPromo,savePromo} from '@/lib/promo/store'
import {PromoInvalid} from '@/lib/promo/rules'
export const dynamic='force-dynamic'
const json=(d:unknown,s=200)=>NextResponse.json(d,{status:s,headers:{'Cache-Control':'no-store'}})
export async function GET(r:Request){
 if(!adminFromRequest(r))return json({error:'Sign in to the control room first.',login:'/master/login'},401)
 return json(await readPromo())
}
export async function PUT(r:Request){
 const s=adminFromRequest(r);if(!s)return json({error:'Sign in to the control room first.',login:'/master/login'},401)
 try{sameOrigin(r)}catch{return json({error:'Cross-site request refused.'},403)}
 try{
  const body=await r.json() as {doc?:unknown;what?:string}
  return json(await savePromo(body.doc,s.role==='owner'?'owner':'admin',body.what||'Edited advertising'))
 }catch(e){
  if(e instanceof PromoInvalid)return json({error:e.message},422)
  const m=String((e as Error)?.message||e);return json({error:/conflict/i.test(m)?m:'The advertising file is unavailable right now. Nothing was saved.'},/conflict/i.test(m)?409:503)
 }
}
