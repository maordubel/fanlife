import {guard,json,fail} from '../../players/_http'
import {listCoupons,makeCoupon,switchOffCoupon} from '@/lib/album/admin'
export const dynamic='force-dynamic'
/** THE ALBUM coupons for the owner: the list (labels, uses — never a code; only its hash is kept). */
export async function GET(r:Request){
 const g=guard(r);if(g.error)return g.error
 try{return json({coupons:await listCoupons()})}catch(e){return fail(e)}
}
/** {action:'make', code, label, packets, maxUses, endsAt} | {action:'off', id} */
export async function POST(r:Request){
 const g=guard(r,true);if(g.error)return g.error
 const text=await r.text();if(text.length>2048)return json({error:'Request too large.'},400)
 let b:Record<string,unknown>;try{b=JSON.parse(text||'{}')}catch{return json({error:'Invalid JSON.'},400)}
 try{
  if(b.action==='make'){
   const code=String(b.code??'').trim(),label=String(b.label??'').slice(0,80),packets=Math.max(1,Math.min(5,Number(b.packets)||1))
   const maxUses=b.maxUses===null||b.maxUses===''||b.maxUses===undefined?null:Math.max(1,Math.floor(Number(b.maxUses)))
   const endsAt=typeof b.endsAt==='string'&&/^\d{4}-\d{2}-\d{2}/.test(b.endsAt)?new Date(b.endsAt).toISOString():null
   if(!/^[A-Za-z0-9_-]{4,40}$/.test(code))return json({error:'A code is 4 to 40 letters, digits, - or _.'},400)
   const res=await makeCoupon({code,label,packets,maxUses,endsAt});if(!res.ok)return json({error:res.error??'Not saved.'},400)
   return json({coupons:await listCoupons()})
  }
  if(b.action==='off'&&typeof b.id==='string'&&/^[0-9a-f-]{36}$/.test(b.id)){await switchOffCoupon(b.id);return json({coupons:await listCoupons()})}
  return json({error:'Unknown action.'},400)
 }catch(e){return fail(e)}
}
