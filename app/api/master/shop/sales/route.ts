import {NextResponse} from 'next/server'
import {adminOrCron} from '@/lib/master/admin'
import {sameOrigin} from '@/lib/master/request'
import {applySales} from '@/lib/shop/saleRun'
export const dynamic='force-dynamic'
export const maxDuration=120
const json=(d:unknown,s=200)=>NextResponse.json(d,{status:s,headers:{'Cache-Control':'no-store'}})
/** Prices follow the sales: as many products as fit in ~90 seconds. The desk's "Apply now" and the hourly job call it until nothing is pending. */
export async function POST(r:Request){
 const who=adminOrCron(r);if(!who)return json({error:'Sign in to the control room first.',login:'/master/login'},401)
 if(who.role!=='cron'){try{sameOrigin(r)}catch{return json({error:'Cross-site request refused.'},403)}}
 const by=who.role==='cron'?'autopilot':'owner',t0=Date.now();let done=0,pending=0;const errors:string[]=[]
 try{
  do{const r=await applySales(by,who.role==='cron'?6:4);done+=r.done;pending=r.pending;errors.push(...r.errors);if(!r.done)break}while(pending>0&&Date.now()-t0<(who.role==='cron'?80e3:30e3))
  return json({done,pending,errors:errors.slice(0,8)})
 }catch(e){return json({error:String((e as Error)?.message||e).slice(0,400)},500)}
}
