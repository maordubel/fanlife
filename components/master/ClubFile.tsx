'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {GATES,type Club,type Finding,type Job,type Source} from '@/lib/master/types'
import type {ClubSummary} from '@/lib/master/summary'
import {ACCESS_TEXT} from '@/lib/clubs/access'
import type {useAdminApi} from './adminApi'
import type {AdapterInfo} from './Admin'

type Api=ReturnType<typeof useAdminApi>
type Page<T>={rows:T[];page:number;pages:number;total:number;version:number}
const SUB=[['summary','Summary'],['research','Research'],['decisions','Decisions'],['publish','Readiness & publish']] as const

/** One club, four layers kept apart: what research collected, what the pack compiles, what is published. */
export function ClubFile({club,summary,adapters,jobs,api,onChange}:{club:Omit<Club,'sources'|'findings'>;summary:ClubSummary;adapters:AdapterInfo[];jobs:Job[];api:Api;onChange:()=>Promise<void>}){
 const [sub,setSub]=useState<typeof SUB[number][0]>('summary')
 return <section className="panel cr-file">
  <div className="section-head"><div><p className="eyebrow">CLUB FILE · v{club.version}</p><h2>{club.name}</h2><p className="muted">{club.city} · {club.country} · {summary.engine.inRegistry?'in registry':'not in registry'} · {summary.engine.hasProvider?'engine provider connected':'no engine provider'}{summary.engine.reviewOnly?' · review-only pack':''}</p></div><Link className="button secondary" href={`/clubs/${club.id}`}>Open the club page ↗</Link></div>
  <nav className="cr-sub" aria-label="Club file sections">{SUB.map(([k,l])=><button key={k} className={`min-h-tap ${sub===k?'active':''}`} aria-current={sub===k?'page':undefined} onClick={()=>setSub(k)}>{l}</button>)}</nav>
  {sub==='summary'&&<Summary s={summary} onGo={setSub}/>}
  {sub==='research'&&<Research club={club} adapters={adapters} jobs={jobs} api={api} onChange={onChange}/>}
  {sub==='decisions'&&<Decisions club={club} api={api} onChange={onChange}/>}
  {sub==='publish'&&<Publish club={club} s={summary} api={api} onChange={onChange}/>}
 </section>
}

function Summary({s,onGo}:{s:ClubSummary;onGo:(k:'research'|'decisions'|'publish')=>void}){
 const st=s.research.staging
 return <div className="cr-three">
  <article><p className="eyebrow">1 · RESEARCH COLLECTED</p><ul><li>{s.research.reviewedSources} of {s.research.sources} sources reviewed{s.research.changedSources?` · ${s.research.changedSources} changed since review`:''}</li><li>{s.research.findingsPending} findings waiting · {s.research.findingsDecided} decided</li><li>Last job: {s.research.lastJob?`${s.research.lastJob.status} · ${s.research.lastJob.adapter} · ${s.research.lastJob.at.slice(0,16).replace('T',' ')}`:'none'}</li><li>Staged package: {st.present?`snapshot ${st.snapshotAsOf} · ${Object.entries(st.counts).map(([k,n])=>`${n} ${k}`).join(', ')} · ${st.approvedForProduction??0} approved`:'none'}</li></ul><button className="min-h-tap" onClick={()=>onGo('decisions')}>Decide evidence ↗</button></article>
  <article><p className="eyebrow">2 · PACK DATA (COMPILER)</p>{s.data?<ul><li>{s.data.full} gates READY · {s.data.dataPlayable} playable</li><li>{s.data.timelineEvents} eligible dated events</li><li>Compiler notes: {s.data.diagnostics.blocker} blocking · {s.data.diagnostics.review} to review · {s.data.diagnostics.info} kept out by design</li></ul>:<p>No compiled pack — the engine cannot load this club.</p>}<p className="muted">Approving a research finding does not change the pack; packs change through a reviewed build.</p></article>
  <article><p className="eyebrow">3 · PUBLISHED</p><ul><li>Status: <b>{s.control.status}</b> · {s.publication.preview?'evaluation preview':'production'}</li><li>{s.publication.openNow} gates open now · {s.control.gatesOn.length} switched on</li><li>Activation: {s.activation.allowed?'allowed':'blocked'}</li></ul>{!s.activation.allowed&&<ul className="muted">{s.activation.reasons.slice(0,4).map(r=><li key={r}>{r}</li>)}</ul>}<button className="min-h-tap" onClick={()=>onGo('publish')}>Readiness & publish ↗</button></article>
  {s.next.length>0&&<article className="cr-wide"><p className="eyebrow">NEXT</p><ol>{s.next.map(n=><li key={n}>{n}</li>)}</ol></article>}
 </div>
}

function Research({club,adapters,jobs,api,onChange}:{club:Omit<Club,'sources'|'findings'>;adapters:AdapterInfo[];jobs:Job[];api:Api;onChange:()=>Promise<void>}){
 const [adapter,setAdapter]=useState(adapters[0]?.id||'wikipedia'),a=adapters.find(x=>x.id===adapter),available=a?.available[club.id]!==false
 return <div className="cr-two">
  <form className="cr-form" onSubmit={async e=>{e.preventDefault();const data={...Object.fromEntries(new FormData(e.currentTarget)),clubId:club.id,adapter};const job=await api.post<Job>('research/create',data,'Research queued.');if(job){const r=await api.post<{ran:boolean;status?:string}>('research/run',{},'');api.setNotice(r?.status==='failed'?`Job ${job.id.slice(0,8)} for ${club.name} failed — read it below.`:`Job ${job.id.slice(0,8)} for ${club.name} ${r?.status||'queued'}. Review the evidence in Decisions.`);await onChange()}}}>
   <p className="eyebrow">COLLECT</p>
   <fieldset className="cr-choice"><legend>Adapter</legend>{adapters.map(x=><label key={x.id}><input type="radio" name="adapter-pick" checked={adapter===x.id} onChange={()=>setAdapter(x.id)}/>{x.label}<small>{x.capabilities.join(' · ')}{x.available[club.id]===false?' · not available for this club':''}</small></label>)}</fieldset>
   {a?.needsQuery&&<><label>Search phrase<input name="query" defaultValue={`${club.name} ${club.city}`} required/></label><label>Exact English Wikipedia title (optional)<input name="title" placeholder="For ambiguous club names"/></label></>}
   {!a?.needsQuery&&<p className="muted">{available?'Reads the staged package for this club. Statistics arrive as a report, not as facts to approve.':'No staged package for this club — import one and run research:stage first.'}</p>}
   <button className="min-h-tap button" disabled={api.busy||!available}>Run {a?.label||'research'} ↗</button>
  </form>
  <div><p className="eyebrow">JOBS FOR {club.name.toUpperCase()}</p>{!jobs.length&&<p className="empty">No jobs yet.</p>}{[...jobs].reverse().slice(0,12).map(j=><article className="source" key={j.id}><div><strong>{j.adapter||'wikipedia'} · {j.id.slice(0,8)}</strong><span className="badge" data-status={j.status}>{j.status}</span></div><small>{j.createdAt.slice(0,16).replace('T',' ')} UTC · attempt {j.attempts} · {j.query}</small>{j.error&&<p className="error">{j.error}</p>}{j.status==='failed'&&<button className="min-h-tap" onClick={async()=>{if(await api.post('research/retry',{id:j.id},`Job ${j.id.slice(0,8)} requeued.`))await onChange()}}>Retry ↗</button>}</article>)}</div>
 </div>
}

function Decisions({club,api,onChange}:{club:Omit<Club,'sources'|'findings'>;api:Api;onChange:()=>Promise<void>}){
 const [kind,setKind]=useState<'findings'|'sources'>('findings'),[state,setState]=useState('pending'),[page,setPage]=useState(1),[data,setData]=useState<Page<Finding|Source>|null>(null),[reason,setReason]=useState<Record<string,string>>({})
 const load=async()=>setData(await api.get<Page<Finding|Source>>(`evidence?club=${club.id}&kind=${kind}&state=${state}&page=${page}`))
 useEffect(()=>{void load()},[kind,state,page,club.id])// eslint-disable-line react-hooks/exhaustive-deps
 const decide=async(id:string,decision:'approved'|'rejected'|'deferred',k:'finding'|'source')=>{if(!data)return;const ok=await api.post('evidence/decide',{clubId:club.id,version:data.version,kind:k,id,decision,reason:reason[id]||''},`${k==='source'?'Source':'Finding'} ${decision}.`);if(ok){await load();await onChange()}}
 return <div>
  <div className="cr-filters"><label>Show<select value={kind} onChange={e=>{setKind(e.target.value as 'findings');setPage(1)}}><option value="findings">Findings</option><option value="sources">Sources</option></select></label><label>State<select value={state} onChange={e=>{setState(e.target.value);setPage(1)}}><option value="pending">Waiting</option><option value="decided">Decided</option><option value="all">All</option></select></label><span className="muted">{data?`${data.total} rows`:'Loading…'}</span></div>
  <p className="muted">A research decision records what you checked. It does not put a fact into a game — that needs a pack build that passes the compiler.</p>
  {data?.rows.length===0&&<p className="empty">Nothing here.</p>}
  {data?.rows.map(row=>'field' in row?<article className="source" key={row.id}>
    <div><strong>{row.field}</strong><span className="badge">{row.decision||'waiting'}</span></div><p>{row.value}</p><small>Sources: {row.sources.join(', ')}</small>
    {row.reason&&<p className="muted">Reason: {row.reason}</p>}
    {!row.decision&&<div className="cr-decide"><input aria-label="Reason (needed to reject or defer)" placeholder="Reason (needed to reject or defer)" value={reason[row.id!]||''} onChange={e=>setReason({...reason,[row.id!]:e.target.value})}/><button className="min-h-tap" onClick={()=>decide(row.id!,'approved','finding')}>Approve</button><button className="min-h-tap" onClick={()=>decide(row.id!,'deferred','finding')}>Defer</button><button className="min-h-tap" onClick={()=>decide(row.id!,'rejected','finding')}>Reject</button></div>}
   </article>:<article className="source" key={row.id}>
    <div><a href={row.url} target="_blank" rel="noreferrer">{row.title} ↗</a><span className="badge">{row.incoming?'changed since review':row.reviewed?'reviewed':'unreviewed'}</span></div>
    <details><summary>Read collected evidence</summary><p>{row.excerpt}</p>{row.incoming&&<><p className="eyebrow">NEW SNAPSHOT · {row.incoming.retrievedAt.slice(0,10)}</p><p>{row.incoming.excerpt}</p></>}</details>
    {(!row.reviewed||row.incoming)&&<div className="cr-decide"><input aria-label="Reason (needed to reject)" placeholder="Reason (needed to reject)" value={reason[row.id]||''} onChange={e=>setReason({...reason,[row.id]:e.target.value})}/><button className="min-h-tap" onClick={()=>decide(row.id,'approved','source')}>{row.incoming?'Accept the new snapshot':'I reviewed this source'}</button><button className="min-h-tap" onClick={()=>decide(row.id,'rejected','source')}>Reject</button></div>}
   </article>)}
  {data&&data.pages>1&&<nav className="cr-pager"><button className="min-h-tap" disabled={page<=1} onClick={()=>setPage(page-1)}>←</button><span>{page} / {data.pages}</span><button className="min-h-tap" disabled={page>=data.pages} onClick={()=>setPage(page+1)}>→</button></nav>}
 </div>
}

function Publish({club,s,api,onChange}:{club:Omit<Club,'sources'|'findings'>;s:ClubSummary;api:Api;onChange:()=>Promise<void>}){
 const [gates,setGates]=useState(club.gates),[status,setStatus]=useState(club.status),[reason,setReason]=useState('')
 return <form className="cr-form" onSubmit={async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget));if(await api.post('clubs/update',{...f,id:club.id,version:club.version,gates,status,reason},`${club.name} saved.`))await onChange()}}>
  <div className="cr-gate-list">{GATES.map(([n,name])=>{const g=s.data?.gates.find(x=>x.number===n);return <label key={n} className="cr-gate" data-state={g?.state||'NONE'}><input type="checkbox" checked={gates.includes(n)} onChange={e=>setGates(e.target.checked?[...gates,n]:gates.filter(x=>x!==n))}/><span><b>{n}. {name}</b><small>Data: {g?`${g.state} · ${g.eligible}${g.target?` / ${g.target}`:''}`:'no pack'} · Now: {g?(g.openNow?'open':ACCESS_TEXT[g.access]):'closed'}</small>{g&&!g.full&&g.reason&&<small className="muted">{g.reason}</small>}</span></label>})}</div>
  <div className="form-grid"><label>Display name<input name="name" defaultValue={club.name} required/></label><label>Status<select value={status} onChange={e=>setStatus(e.target.value as Club['status'])}>{['research','review','live','paused'].map(x=><option key={x}>{x}</option>)}</select></label></div>
  <div className="form-grid"><label>Primary colour<input type="color" name="primary" defaultValue={club.primary}/></label><label>Secondary colour<input type="color" name="secondary" defaultValue={club.secondary}/></label></div>
  <label>Reason for this change (kept in the activity log)<input value={reason} onChange={e=>setReason(e.target.value)} maxLength={500}/></label>
  {status==='live'&&!s.activation.allowed&&<div className="error" role="alert"><p>Going live is blocked until:</p><ul>{s.activation.reasons.map(r=><li key={r}>{r}</li>)}</ul></div>}
  <p className="muted">A gate switch says you WANT it open. It cannot make data playable — the compiler decides that.</p>
  <button className="min-h-tap button" disabled={api.busy}>Save {club.name} ↗</button>
 </form>
}
