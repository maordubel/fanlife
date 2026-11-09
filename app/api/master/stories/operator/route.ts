import {OPERATOR_TICKET_FILE,ticketOk} from '@/lib/stories/flowOperator'
import {operatorAct,operatorCreate,operatorJob,operatorJobs} from '@/lib/stories/operator'
import {body,fail,json,limited,sameOrigin} from '@/lib/stories/http'
export const dynamic='force-dynamic'
export const runtime='nodejs'

/**
 * The studio operator's door (docs/fanlife/70-flow-operator.md §Studio operator). Called from the site's own tab on the
 * owner's computer with the run's ticket — same origin only, never the studio login, never the cron secret. No delete.
 *   {ticket,op:'jobs'}                 → one line per job
 *   {ticket,op:'job',id,master?}       → the job and signed links to its files
 *   {ticket,op:'create',kind,brief,key}→ queue a job (same checks as the desk)
 *   {ticket,op:'act',id,action}        → an owner action (approve a script, record an upload …)
 */
export async function POST(r:Request){
 if(!sameOrigin(r))return json({error:'Invalid request origin.'},403)
 if(limited('studio-operator',90,60_000))return json({error:'Too many requests.'},429)
 try{
  const b=await body(r,60_000) as Record<string,unknown>
  if(!await ticketOk(b.ticket)&&!await ticketOk(b.ticket,Date.now(),OPERATOR_TICKET_FILE))return json({error:'No valid ticket.'},401)
  if(b.op==='jobs')return json(await operatorJobs())
  if(b.op==='job')return json(await operatorJob(b))
  if(b.op==='create'){
   if(limited('studio-operator-create',12,10*60_000))return json({error:'Too many jobs queued in a short time.'},429)
   const out=await operatorCreate(b as never);return json(out,out.created?201:200)
  }
  if(b.op==='act')return json(await operatorAct(b))
  return json({error:'Unknown op.'},400)
 }catch(e){return fail(e)}
}
