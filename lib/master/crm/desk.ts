import 'server-only'
import {fileArea} from '@/lib/master/files'
import {playerReports} from '@/lib/players/reports'
import type {AttentionItem} from '@/lib/master/attention'
import {applyTaskAction,deskView,EMPTY_FLOW,fromAttention,playerTasks,type DeskView,type PlayerSignals,type Task,type TaskAction,type TaskFlow} from './tasks'

/** the task desk's server side: every detector, the decisions file, and one action at a time (ADR-fanlife-0012) */
const area=fileArea('crm')
const FLOW='tasks.json'
type Cache={at:number;v:PlayerSignals[]}
const g=globalThis as typeof globalThis&{crmPlayerSignals?:Cache}

/** Player Control Center reports, per club — cached a minute (the reports read every man of every club) */
export async function playerSignals(fresh=false):Promise<PlayerSignals[]|null>{
 if(!fresh&&g.crmPlayerSignals&&Date.now()-g.crmPlayerSignals.at<60_000)return g.crmPlayerSignals.v
 try{
  const r=await playerReports(undefined,100_000)
  const by=new Map<string,PlayerSignals>()
  const at=(club:string,clubName:string)=>by.get(club)??by.set(club,{club,clubName,missing:0,twins:0,outliers:0}).get(club)!
  for(const d of r.distribution)at(d.club,d.clubName)
  for(const m of r.missing)at(m.club,m.clubName).missing++
  for(const t of r.twins)at(t.club,t.clubName).twins++
  for(const o of r.outliers)at(o.club,o.clubName).outliers++
  const v=[...by.values()].sort((a,b)=>a.clubName.localeCompare(b.clubName))
  g.crmPlayerSignals={at:Date.now(),v};return v
 }catch{return null}
}

export const readFlow=async(fresh=false):Promise<TaskFlow>=>{try{const r=await area.read(FLOW,fresh);if(!r)return EMPTY_FLOW;const v=JSON.parse(r.text) as TaskFlow;return v?.v===1&&v.decisions?v:EMPTY_FLOW}catch{return EMPTY_FLOW}}

export type Desk={view:DeskView;players:'ok'|'unavailable';storage:ReturnType<typeof area.kind>}
export async function buildDesk(attention:readonly AttentionItem[],now=new Date()):Promise<Desk>{
 const [signals,flow]=await Promise.all([playerSignals(),readFlow()])
 const tasks:Task[]=[...fromAttention(attention),...(signals?playerTasks(signals):[])]
 return {view:deskView(tasks,flow,now),players:signals?'ok':'unavailable',storage:area.kind()}
}

/** one decision; the evidence is re-detected on the server — the browser never says what it saw */
export async function decideTask(action:TaskAction,tasks:readonly Task[],by:string,now=new Date()):Promise<TaskFlow>{
 const t=tasks.find(x=>x.key===action.key)
 return area.update<TaskFlow>(FLOW,EMPTY_FLOW,cur=>applyTaskAction(cur?.v===1?cur:EMPTY_FLOW,action,t?t.evidence:null,now,by))
}
