import {createHash} from 'node:crypto'
import type {AttentionItem} from '@/lib/master/attention'
import {deskHref} from '@/lib/master/attention'

/**
 * The task desk (CRM 1 §7, CRM 2 §4.3, ADR-fanlife-0012). Detectors are deterministic and stateless — the same rules over
 * the same read models the detail screens use — so a task can never claim a number its destination does not show.
 * What a PERSON decides about a task (snooze until, dismiss with a reason) is kept per stable key with the evidence it was
 * decided against. A task is never marked resolved by a click: it is resolved when its detector stops reporting it.
 */
export type TaskArea='system'|'clubs'|'research'|'players'|'games'|'market'|'community'
export type Priority=1|2|3
export type Task={key:string;area:TaskArea;priority:Priority;club:string|null;clubName:string|null;title:string;reason:string;href:string;cta:string;evidence:string}
export type Decision={state:'snoozed'|'dismissed';until:string|null;reason:string;evidence:string;at:string;by:string}
export type TaskFlow={v:1;decisions:Record<string,Decision>}
export type DeskView={open:Task[];snoozed:(Task&{decision:Decision})[];dismissed:(Task&{decision:Decision})[];cleared:{key:string;decision:Decision}[];counts:Record<'blocking'|'decide'|'look'|'snoozed'|'dismissed',number>}

export const EMPTY_FLOW:TaskFlow={v:1,decisions:{}}
export const fingerprint=(...parts:(string|number|null|undefined)[])=>createHash('sha256').update(parts.map(p=>String(p??'')).join('|')).digest('hex').slice(0,16)

const AREA_OF:Record<string,TaskArea>={storage:'system',measurement:'system',runner:'system',activation:'games',gates:'games',profile:'research',changed:'research',findings:'research',blocked:'research',parser:'research',job:'research'}
/** the overview's own rules become tasks; the reason text is the evidence (a changed count is a changed task) */
export function fromAttention(items:readonly AttentionItem[]):Task[]{
 return items.map(a=>({key:a.id,area:AREA_OF[a.id.split(':')[0]!]??'system',priority:a.priority,club:a.club,clubName:a.clubName,title:a.title,reason:a.reason,href:a.href,cta:a.cta,evidence:fingerprint(a.title,a.reason)}))
}

export type PlayerSignals={club:string;clubName:string;missing:number;twins:number;outliers:number}
/** Player Control Center reports as tasks: one per club and kind, counted from the report itself */
export function playerTasks(rows:readonly PlayerSignals[]):Task[]{
 const out:Task[]=[]
 const at=(club:string,q:Record<string,string>)=>deskHref('players',{pc:club,...q})
 for(const r of rows){
  if(r.missing>0)out.push({key:`players:missing:${r.club}`,area:'players',priority:3,club:r.club,clubName:r.clubName,title:`${r.missing} player${r.missing===1?'':'s'} with no recorded position`,reason:'They are dealt into any outfield slot and never in goal. A sourced position makes the XI and the Rumble honest.',href:at(r.club,{status:'missing-position',club:r.club}),cta:'Open the list',evidence:fingerprint(r.missing)})
  if(r.twins>0)out.push({key:`players:twins:${r.club}`,area:'players',priority:2,club:r.club,clubName:r.clubName,title:`${r.twins} possible duplicate${r.twins===1?'':'s'}`,reason:'Two records that may be one man. Compare years and sources, then merge by hand — never automatically.',href:at(r.club,{tab:'merge',club:r.club}),cta:'Compare',evidence:fingerprint(r.twins)})
  if(r.outliers>0)out.push({key:`players:outliers:${r.club}`,area:'players',priority:3,club:r.club,clubName:r.clubName,title:`${r.outliers} price${r.outliers===1?'':'s'} out of line with strength`,reason:'The report suggests a price; nothing changes until you publish it with a reason.',href:at(r.club,{tab:'reports',club:r.club}),cta:'Review prices',evidence:fingerprint(r.outliers)})
 }
 return out
}

/**
 * Sort detected tasks against the decisions. A snooze lasts until its date; a dismissal lasts while the EVIDENCE is the
 * same — a new number under the same key is a new problem and comes back. A decision whose key is no longer detected
 * is "cleared by a re-check" (the only way a task resolves).
 */
export function deskView(tasks:readonly Task[],flow:TaskFlow,now:Date):DeskView{
 const open:Task[]=[],snoozed:DeskView['snoozed']=[],dismissed:DeskView['dismissed']=[]
 const seen=new Set<string>()
 for(const t of tasks){
  seen.add(t.key)
  const d=flow.decisions[t.key]
  if(d?.state==='snoozed'&&d.until&&new Date(d.until).getTime()>now.getTime())snoozed.push({...t,decision:d})
  else if(d?.state==='dismissed'&&d.evidence===t.evidence)dismissed.push({...t,decision:d})
  else open.push(t)
 }
 const order=(a:Task,b:Task)=>a.priority-b.priority||(a.clubName||'').localeCompare(b.clubName||'')||a.key.localeCompare(b.key)
 open.sort(order);snoozed.sort(order);dismissed.sort(order)
 const cleared=Object.entries(flow.decisions).filter(([k])=>!seen.has(k)).map(([key,decision])=>({key,decision})).sort((a,b)=>b.decision.at.localeCompare(a.decision.at))
 return {open,snoozed,dismissed,cleared,counts:{blocking:open.filter(t=>t.priority===1).length,decide:open.filter(t=>t.priority===2).length,look:open.filter(t=>t.priority===3).length,snoozed:snoozed.length,dismissed:dismissed.length}}
}

export type TaskAction={op:'snooze';key:string;days:number;reason:string}|{op:'dismiss';key:string;reason:string}|{op:'restore';key:string}
export function parseTaskAction(raw:unknown):{ok:true;action:TaskAction}|{ok:false;error:string}{
 if(!raw||typeof raw!=='object')return {ok:false,error:'An action is required.'}
 const b=raw as Record<string,unknown>,key=typeof b.key==='string'&&/^[a-z][a-z-]*:[a-zA-Z0-9:._~-]{0,160}$|^[a-z]+$/.test(b.key)?b.key:null
 if(!key)return {ok:false,error:'Unknown task.'}
 const reason=typeof b.reason==='string'?b.reason.trim().slice(0,300):''
 if(b.op==='restore')return {ok:true,action:{op:'restore',key}}
 if(b.op==='dismiss'){if(!reason)return {ok:false,error:'Say why this can wait — a dismissal without a reason is not kept.'};return {ok:true,action:{op:'dismiss',key,reason}}}
 if(b.op==='snooze'){const days=Number(b.days);if(![1,3,7,30].includes(days))return {ok:false,error:'Snooze for 1, 3, 7 or 30 days.'};if(!reason)return {ok:false,error:'Say why this can wait.'};return {ok:true,action:{op:'snooze',key,days,reason}}}
 return {ok:false,error:'Unknown action.'}
}
/** apply one action to the flow. `evidence` is the task's current fingerprint — required: you decide about what you saw */
export function applyTaskAction(flow:TaskFlow,a:TaskAction,evidence:string|null,now:Date,by:string):TaskFlow{
 const decisions={...flow.decisions}
 if(a.op==='restore')delete decisions[a.key]
 else{
  if(evidence===null)throw new Error('This task is no longer reported — nothing to decide. The list was refreshed.')
  decisions[a.key]={state:a.op==='snooze'?'snoozed':'dismissed',until:a.op==='snooze'?new Date(now.getTime()+a.days*86_400_000).toISOString():null,reason:a.reason,evidence,at:now.toISOString(),by}
 }
 // a decision is kept 90 days as a record, then goes
 for(const [k,d] of Object.entries(decisions))if(now.getTime()-new Date(d.at).getTime()>90*86_400_000)delete decisions[k]
 return {v:1,decisions}
}
