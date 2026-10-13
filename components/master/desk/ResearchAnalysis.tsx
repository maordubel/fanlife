'use client'
import Link from 'next/link'
import {useState} from 'react'
import type {ClubSummary} from '@/lib/master/summary'
import {researchRows,type ResearchRow} from '@/lib/master/researchAnalysis'
import type {useAdminApi} from '../adminApi'

type Api=ReturnType<typeof useAdminApi>

/**
 * Research analysis: every club on one screen — how far its data has come, which gates could open now, and a
 * one-click merge of newly collected material into the club file (as UNREVIEWED rows; nothing is approved here).
 */
export function ResearchAnalysis({sums,api,href,onChange}:{sums:ClubSummary[];api:Api;href:(club:string)=>string;onChange:()=>Promise<void>}){
 const rows=researchRows(sums),[running,setRunning]=useState<string|null>(null),waiting=rows.filter(r=>r.canMerge)
 const merge=async(r:ResearchRow)=>{
  const job=await api.post<{id:string}>('research/create',{clubId:r.id,adapter:'package'},`${r.name}: queued.`)
  if(!job?.id)return false
  const out=await api.post<{ran:boolean;status?:string;reason?:string}>('research/run',{id:job.id},`${r.name}: merged into the club file as unreviewed rows. Nothing was approved.`)
  if(out&&(!out.ran||out.status==='failed')){api.setError(`${r.name}: not merged — ${out.reason||'the job failed; retry it from the club file'}.`);return false}
  return !!out
 }
 const open=async(r:ResearchRow)=>{if(!window.confirm(`Open ${r.canOpen.length} gate(s) for ${r.name} to visitors? Every gate with playable data will be switched on.`))return;await api.post('clubs/open-playable',{id:r.id,version:r.version,reason:'Opened from Research analysis'},`${r.name}: gates opened.`);await onChange()}
 const one=async(r:ResearchRow)=>{setRunning(r.id);await merge(r);setRunning(null);await onChange()}
 const all=async()=>{for(const r of waiting){setRunning(r.id);if(!await merge(r))break}setRunning(null);await onChange()}
 return <section className="panel" aria-labelledby="ra-h">
  <div className="section-head"><div><p className="eyebrow">RESEARCH ANALYSIS</p><h2 id="ra-h">Where every club stands</h2>
   <p className="muted">Progress counts the thirteen gates against their data targets. Merging brings newly collected material into the club file for your review; it never approves, builds or publishes.</p></div>
   <button type="button" className="min-h-tap button" disabled={api.busy||!waiting.length} onClick={()=>void all()}>{waiting.length?`Merge new data for ${waiting.length} club${waiting.length>1?'s':''}`:'Nothing new to merge'}</button></div>
  <div className="ra-list">{rows.map(r=><article key={r.id} className="ra-row" data-state={r.stage}>
   <header><h3><Link href={href(r.id)}><bdi>{r.name}</bdi></Link></h3><span className="ra-stage">{r.stageLabel}</span></header>
   <div className="ra-bar" role="img" aria-label={`${r.percent}% of gate data ready`}><i style={{inlineSize:`${r.percent}%`}}/></div>
   <p className="ra-num"><b>{r.percent}%</b> data ready · {r.playable} of {r.gateCount} gates playable · {r.open} open now</p>
   <p className="muted">{r.collected}</p>
   {r.canOpen.length>0&&<p className="ra-open"><b>Can open now:</b> {r.canOpen.map(g=>`${g.number} ${g.label}`).join(' · ')}</p>}
   {r.nearest&&<p className="muted"><b>Closest to opening:</b> gate {r.nearest.number} {r.nearest.label} — {r.nearest.eligible} of {r.nearest.target} needed</p>}
   <div className="ra-actions">
    {r.canOpen.length>0&&<button type="button" className="min-h-tap button" disabled={api.busy} onClick={()=>void open(r)}>Open {r.canOpen.length} gate{r.canOpen.length>1?'s':''}</button>}
    {r.canMerge&&<button type="button" className="min-h-tap button secondary" disabled={api.busy} onClick={()=>void one(r)}>{running===r.id?'Merging…':'Merge new data'}</button>}
    <Link className="min-h-tap button secondary" href={href(r.id)}>Sources & collection</Link>
   </div>
  </article>)}</div>
 </section>
}
