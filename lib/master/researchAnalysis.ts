import type {ClubSummary} from './summary'
import {SHARED_GATES} from '@/lib/clubs/gates'

/** Pure read-model for the Research analysis screen: no server imports, so the client component and the tests share it. */
export type ResearchRow={
 id:string;name:string;version:number;percent:number;gateCount:number;playable:number;open:number
 canOpen:{number:number;label:string}[];nearest:{number:number;label:string;eligible:number;target:number}|null
 collected:string;canMerge:boolean;stage:'live'|'ready'|'building'|'collecting'|'blocked';stageLabel:string
}
const label=(n:number)=>SHARED_GATES.find(g=>g.number===n)?.name??`Gate ${n}`

export function researchRows(sums:readonly ClubSummary[]):ResearchRow[]{
 return sums.map(s=>{
  const gates=s.data?.gates??[],n=SHARED_GATES.length
  // each gate counts by how much of its target is eligible, capped at 1: the universe (13 gates) is known, so a percentage is honest
  const percent=Math.round(100*gates.reduce((t,g)=>t+(g.target>0?Math.min(1,g.eligible/g.target):0),0)/n)
  const canOpen=gates.filter(g=>g.dataPlayable&&!g.openNow).map(g=>({number:g.number,label:label(g.number)}))
  const near=gates.filter(g=>!g.dataPlayable&&g.target>0).sort((a,b)=>b.eligible/b.target-a.eligible/a.target)[0]
  const a=s.archive,st=s.research.staging
  const collected=!a.profile?'No research profile yet.':`${a.documents} documents collected${a.needsParser?`, ${a.needsParser} still need a parser`:''}${a.blocked?`, ${a.blocked} source${a.blocked>1?'s':''} refused`:''}${a.lastRun?` · last run ${a.lastRun.at.slice(0,10)}`:' · never collected'}.`
  const waiting=st.present&&!st.approvedForProduction
  const canMerge=waiting||s.research.sources===0&&a.documents>0
  const stage:ResearchRow['stage']=s.control.status==='live'?'live':canOpen.length?'ready':gates.some(g=>g.dataPlayable)?'building':a.documents>0?'building':a.blocked&&!a.documents?'blocked':'collecting'
  const text={live:'Live',ready:'Gates can open',building:'Building data',collecting:'Collecting',blocked:'Source blocked'}[stage]
  return {id:s.id,name:s.name,version:s.control.version,percent,gateCount:n,playable:gates.filter(g=>g.dataPlayable).length,open:gates.filter(g=>g.openNow).length,
   canOpen,nearest:near?{number:near.number,label:label(near.number),eligible:near.eligible,target:near.target}:null,collected,canMerge,stage,stageLabel:text}
 }).sort((x,y)=>y.percent-x.percent||x.name.localeCompare(y.name))
}
