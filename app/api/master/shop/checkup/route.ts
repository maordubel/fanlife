import {NextResponse} from 'next/server'
import {adminOrCron} from '@/lib/master/admin'
import {sameOrigin} from '@/lib/master/request'
import {shopCheckup} from '@/lib/shop/checkup'
export const dynamic='force-dynamic'
export const maxDuration=120
const json=(d:unknown,s=200)=>NextResponse.json(d,{status:s,headers:{'Cache-Control':'no-store'}})
/** The shop's hourly check-up: the scheduler (Bearer CRON_SECRET, GitHub Actions) or the signed-in desk ("Check now"). */
export async function POST(r:Request){
 const who=adminOrCron(r);if(!who)return json({error:'Sign in to the control room first.',login:'/master/login'},401)
 if(who.role!=='cron'){try{sameOrigin(r)}catch{return json({error:'Cross-site request refused.'},403)}}
 try{return json({health:await shopCheckup(who.role==='cron'?'autopilot':'owner')})}catch(e){return json({error:String((e as Error)?.message||e).slice(0,400)},500)}
}
