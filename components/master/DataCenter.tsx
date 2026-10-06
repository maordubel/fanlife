'use client'
import {useState} from 'react'
import type {ResearchRun,PlanReport,PlanIssue} from '@/lib/research/contract'
import type {useAdminApi} from './adminApi'

export type RunsRow={clubId:string;hasProfile:boolean;runs:ResearchRun[];jobs:number;states:Record<string,number>}
type PlanResult={ok:true;run:ResearchRun;report:PlanReport;issues:PlanIssue[];issueKinds:Record<string,number>}|{ok:false;reason:string}
const STATE_TEXT:Record<string,string>={planned:'planned',leased:'in progress',fetched:'fetched',parsed:'parsed',unchanged:'unchanged',failed:'retry later',exhausted:'gave up',blocked:'refused by source','needs-adapter':'kept, needs a parser'}

/**
 * The data centre: the no-AI research engine. Plan is offline (profile + staged bundle → jobs); fetching runs in the
 * worker (`npm run research:run`, or the scheduled task), never inside this request. Counts are what happened —
 * collected, refused, kept for a parser — never "complete".
 */
export function DataCenter({runs,selected,api}:{runs:RunsRow[];selected:string;api:ReturnType<typeof useAdminApi>}){
 const [rows,setRows]=useState(runs),[result,setResult]=useState<PlanResult|null>(null)
 const row=rows.find(r=>r.clubId===selected)
 const plan=async()=>{const r=await api.post<PlanResult>('research/plan',{clubId:selected},'Plan built.');if(r){setResult(r);if(!r.ok)api.setError(r.reason);const fresh=await api.get<RunsRow[]>('research/runs');if(fresh)setRows(fresh)}}
 return <section className="panel cr-data">
  <div className="section-head"><div><p className="eyebrow">DATA CENTRE · NO AI</p><h2>Sources, plans and runs</h2><p className="muted">Known sources, declared parsers, explicit rules. A plan never approves anything; a fetch never claims completeness.</p></div></div>
  <div className="cr-two">
   <div>
    <p className="eyebrow">CLUBS WITH A RESEARCH PROFILE</p>
    {rows.length===0&&<p className="empty">No research profiles yet. Add research-profiles/&lt;club&gt;.json.</p>}
    <ul className="cr-runs">{rows.map(r=><li key={r.clubId} data-selected={r.clubId===selected||undefined}><b>{r.clubId}</b> · {r.jobs} jobs<small>{Object.entries(r.states).map(([k,n])=>`${n} ${STATE_TEXT[k]||k}`).join(' · ')||'no jobs yet'}</small><small>Last run: {r.runs[0]?`${r.runs[0].kind} · ${r.runs[0].state} · ${r.runs[0].createdAt.slice(0,16).replace('T',' ')}`:'never'}</small></li>)}</ul>
   </div>
   <div>
    <p className="eyebrow">PLAN FOR {selected.toUpperCase()}</p>
    {row?.hasProfile?<button className="min-h-tap button" disabled={api.busy} onClick={plan}>Build the plan (offline) ↗</button>:<p className="empty">This club has no research profile yet — it cannot be planned. The profile names its trusted sources, paths and rate limits.</p>}
    {row?.hasProfile&&<button className="min-h-tap button secondary" disabled={api.busy} onClick={async()=>{const r=await api.post<ResearchRun>('research/fetch',{clubId:selected,max:3},'Fetch batch finished.');if(r){api.setNotice(`Fetch batch for ${selected}: ${Object.entries(r.counts).filter(([,n])=>n).map(([k,n])=>`${n} ${k}`).join(' · ')||'nothing due'}.`);const fresh=await api.get<RunsRow[]>('research/runs');if(fresh)setRows(fresh)}}}>Fetch a small batch now (3 pages) ↗</button>}
    <p className="muted">The scheduled research task also fetches up to 3 due pages per club on every run, politely (robots.txt, rate limits, conditional requests). Pages without a tested parser are kept as snapshots and parsed later without a new request.</p>
    {result?.ok&&<div className="cr-plan">
     <p><b>{result.run.counts.added}</b> new jobs · {result.run.counts.known} already known · {result.run.counts.desired} wanted in total</p>
     <dl>{Object.entries(result.report.stats).filter(([,v])=>v!==null).map(([k,v])=><div key={k}><dt>{k.replace(/([A-Z])/g,' $1').toLowerCase()}</dt><dd>{String(v)}</dd></div>)}</dl>
     <p className="eyebrow">ISSUES FOR REVIEW</p><p>{Object.entries(result.issueKinds).map(([k,n])=>`${n} ${k.replace(/_/g,' ')}`).join(' · ')||'none'}</p>
     <p className="eyebrow">GATES THIS PLAN AIMS AT</p><ul>{result.report.readiness.map(r=><li key={r.gate}>{r.gate}: {r.status.replace(/_/g,' ')}{r.approvedCandidateCount!==null?` · ${r.approvedCandidateCount} approved candidates`:''} (target {r.target})</li>)}</ul>
     <p className="muted">{result.report.limits.join(' ')}</p>
    </div>}
   </div>
  </div>
 </section>
}
