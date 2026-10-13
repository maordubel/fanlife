import 'server-only'
import {readState,storageInfo} from '@/lib/master/store'
import {allSummaries} from '@/lib/master/summary'
import {attention,deskHref} from '@/lib/master/attention'
import {listSuggestions,tally} from '@/lib/home/suggestions'
import {evaluationMode} from '@/lib/master/mode'
import {portalConfigured} from '@/lib/portal/env'
import {buildDesk,decideTask} from './desk'
import {fromAttention,playerTasks,parseTaskAction} from './tasks'
import {playerSignals} from './desk'

/** the overview's inputs, computed the one way the page computes them (so the API re-detects exactly what the screen showed) */
export async function attentionNow(){
 const state=await readState(),storage=storageInfo(),summaries=await allSummaries(state)
 const measurement=evaluationMode()?'evaluation':portalConfigured()?'connected':'not-connected'
 const items=attention(summaries,state.jobs,{storage,measurement,runnerPinned:process.env.CRON_SECRET?null:false})
 // fans' club suggestions (13.10.2026): one task while any are waiting; it is gone only when the list is empty
 const asked=tally(await listSuggestions().catch(()=>[]))
 if(asked.length)items.push({id:'suggest:clubs',priority:3,club:null,clubName:null,title:`${asked.length} club${asked.length===1?'':'s'} suggested by fans`,reason:`Most asked: ${asked[0]!.name} (${asked[0]!.count}).`,href:deskHref('community'),cta:'See suggestions'})
 return {state,summaries,storage,items}
}
export async function deskNow(){const a=await attentionNow();return {...a,desk:await buildDesk(a.items)}}
/** POST crm/task — parse, re-detect, decide */
export async function taskActionNow(raw:unknown,by:string){
 const p=parseTaskAction(raw);if(!p.ok)throw new Error(p.error)
 const a=await attentionNow(),signals=await playerSignals(true)
 const tasks=[...fromAttention(a.items),...(signals?playerTasks(signals):[])]
 await decideTask(p.action,tasks,by)
 return (await buildDesk(a.items)).view
}
