import 'server-only'
import {readState,storageInfo} from '@/lib/master/store'
import {refreshMigrationState} from '@/lib/master/durable'
import type {State} from '@/lib/master/types'
import {allSummaries} from '@/lib/master/summary'
import {attention,deskHref} from '@/lib/master/attention'
import {listSuggestions,tally} from '@/lib/home/suggestions'
import {evaluationMode} from '@/lib/master/mode'
import {portalConfigured} from '@/lib/portal/env'
import {buildDesk,decideTask} from './desk'
import {fromAttention,playerTasks,parseTaskAction} from './tasks'
import {playerSignals} from './desk'
import {readPreviewFile} from '@/lib/research/staged/preview'
import {stagedClubIds} from '@/lib/research/staged/pack'

/** the overview's inputs, computed the one way the page computes them (so the API re-detects exactly what the screen showed) */
export async function attentionNow(currentState?:State){
 const state=currentState??await readState(),storage=storageInfo()
 const [summaries,suggestions]=await Promise.all([allSummaries(state),listSuggestions().catch(()=>[])])
 const measurement=evaluationMode()?'evaluation':portalConfigured()?'connected':'not-connected'
 const items=attention(summaries,state.jobs,{storage,measurement,runnerPinned:process.env.CRON_SECRET?null:false})
 // fans' club suggestions (13.10.2026): one task while any are waiting; it is gone only when the list is empty
 const asked=tally(suggestions)
 if(asked.length)items.push({id:'suggest:clubs',priority:3,club:null,clubName:null,title:`${asked.length} club${asked.length===1?'':'s'} suggested by fans`,reason:`Most asked: ${asked[0]!.name} (${asked[0]!.count}).`,href:deskHref('community'),cta:'See suggestions'})
 // the research desk (10.11.2026): new clubs whose staged material opens gates on the owner's yes — one task while any wait
 const waiting=stagedWaiting(summaries)
 if(waiting.length)items.push({id:'research:staged',priority:2,club:null,clubName:null,title:`${waiting.length} new club${waiting.length===1?'':'s'} wait for your yes`,reason:waiting.slice(0,3).map(w=>`${w.name} (${w.gates} gate${w.gates===1?'':'s'})`).join(', ')+(waiting.length>3?` and ${waiting.length-3} more`:'')+'.',href:deskHref('research'),cta:'Open the research desk'})
 return {state,summaries,storage,items}
}
/** Staged clubs whose preview opens more gates than they play now (lib/research/staged/preview — the daily file, no compile here). */
function stagedWaiting(summaries:Awaited<ReturnType<typeof allSummaries>>){
 const f=readPreviewFile();if(!f)return []
 return stagedClubIds().map(id=>{const p=f.clubs[id],s=summaries.find(x=>x.id===id);if(!p||!s)return null;const now=s.data?.dataPlayable??0,could=p.all.gates.filter(g=>g.playable).length;return could>now&&s.control.status!=='live'?{id,name:s.name,gates:could-now}:null})
  .filter((x):x is {id:string;name:string;gates:number}=>!!x).sort((a,b)=>b.gates-a.gates||a.name.localeCompare(b.name))
}
export async function deskNow(state?:State){
 await refreshMigrationState()
 const attention=attentionNow(state)
 const [inputs,desk]=await Promise.all([attention,buildDesk(attention.then(a=>a.items))])
 return {...inputs,desk}
}
/** POST crm/task — parse, re-detect, decide */
export async function taskActionNow(raw:unknown,by:string){
 const p=parseTaskAction(raw);if(!p.ok)throw new Error(p.error)
 const a=await attentionNow(),signals=await playerSignals(true)
 const tasks=[...fromAttention(a.items),...(signals?playerTasks(signals):[])]
 await decideTask(p.action,tasks,by)
 return (await buildDesk(a.items)).view
}
