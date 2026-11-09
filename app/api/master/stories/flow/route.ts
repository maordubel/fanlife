import {flowDone,flowQueue,flowUrls,panelNeeds,ticketOk} from '@/lib/stories/flowOperator'
import {body,fail,json,limited} from '@/lib/stories/http'
export const dynamic='force-dynamic'
export const runtime='nodejs'

/**
 * The Flow operator's door (docs/fanlife/70-flow-operator.md). Called from the Google Flow tab on the owner's computer,
 * so it answers that origin only, and only with the run's ticket — never the studio login, never the cron secret.
 *   {ticket,op:'queue'}                → what to make: waiting Shorts/promos and CLASSIFIED panels, with their prompts
 *   {ticket,op:'urls',id|file,names}   → signed upload urls for those slots / panels (private bucket)
 *   {ticket,op:'done',id,files}        → record what landed; a full set queues the edit
 */
const ORIGIN='https://labs.google'
const cors=(r:Response)=>{r.headers.set('Access-Control-Allow-Origin',ORIGIN);r.headers.set('Vary','Origin');return r}
export function OPTIONS(){
 return cors(new Response(null,{status:204,headers:{'Access-Control-Allow-Methods':'POST','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'}}))
}
export async function POST(r:Request){
 const o=r.headers.get('origin')
 if(o&&o!==ORIGIN)return json({error:'Not this origin.'},403)
 if(limited('flow-operator',120,60_000))return cors(json({error:'Too many requests.'},429))
 try{
  const b=await body(r) as Record<string,unknown>
  if(!await ticketOk(b.ticket))return cors(json({error:'No valid ticket.'},401))
  if(b.op==='queue')return cors(json(await flowQueue(panelNeeds())))
  if(b.op==='urls')return cors(json(await flowUrls(b)))
  if(b.op==='done')return cors(json(await flowDone(b)))
  return cors(json({error:'Unknown op.'},400))
 }catch(e){return cors(fail(e))}
}
