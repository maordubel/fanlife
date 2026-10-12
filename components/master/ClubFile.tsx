'use client'
import {Pipeline} from './Pipeline'
import {Launch} from './Launch'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {GATES,type Club,type Finding,type Job,type Source} from '@/lib/master/types'
import type {ClubSummary} from '@/lib/master/summary'
import {ACCESS_TEXT} from '@/lib/clubs/access'
import type {useAdminApi} from './adminApi'
import type {AdapterInfo} from './Admin'

type Api=ReturnType<typeof useAdminApi>
type Page<T>={rows:T[];page:number;pages:number;total:number;version:number}
const SUB=[['launch','Launch'],['summary','Summary'],['research','Research'],['decisions','Check facts'],['publish','Readiness & publish']] as const

/** One club, four layers kept apart: what research collected, what the pack compiles, what is published. */
export type ClubFileView=typeof SUB[number][0]
/** `view`/`onView` let the Editor's Desk keep the subview in the URL; without them the file keeps its own tabs. */
export function ClubFile({club,summary,adapters,jobs,api,onChange,view,onView}:{club:Omit<Club,'sources'|'findings'>;summary:ClubSummary;adapters:AdapterInfo[];jobs:Job[];api:Api;onChange:()=>Promise<void>;view?:ClubFileView;onView?:(v:ClubFileView)=>void}){
 const [local,setLocal]=useState<ClubFileView>('launch'),sub=view??local,setSub=onView??setLocal
 return <section className="panel cr-file">
  <div className="section-head"><div><p className="eyebrow">CLUB FILE · v{club.version}</p><h2>{club.name}</h2><p className="muted">{club.city} · {club.country} · {summary.engine.inRegistry?'in registry':'not in registry'} · {summary.engine.hasProvider?'engine provider connected':'no engine provider'}{summary.engine.reviewOnly?' · review-only pack':''}</p></div><Link className="button secondary" href={`/clubs/${club.id}`}>Open the club page ↗</Link></div>
  {!onView&&<nav className="cr-sub" aria-label="Club file sections">{SUB.map(([k,l])=><button key={k} className={`min-h-tap ${sub===k?'active':''}`} aria-current={sub===k?'page':undefined} onClick={()=>setSub(k)}>{l}</button>)}</nav>}
  {sub==='launch'&&<Launch clubId={club.id} api={api} onChange={onChange}/>}
  {sub==='summary'&&<Summary s={summary} onGo={setSub}/>}
  {sub==='research'&&<Research club={club} adapters={adapters} jobs={jobs} api={api} onChange={onChange}/>}
  {sub==='decisions'&&<Decisions club={club} api={api} onChange={onChange}/>}
  {sub==='publish'&&<Publish club={club} s={summary} api={api} onChange={onChange}/>}
 </section>
}

function Summary({s,onGo}:{s:ClubSummary;onGo:(k:'research'|'decisions'|'publish')=>void}){
 const st=s.research.staging
 return <div className="cr-three">
  <article className="cr-wide"><p className="eyebrow">PIPELINE · WHERE THIS CLUB STANDS</p><Pipeline steps={s.pipeline}/></article>
  <article><p className="eyebrow">1 · RESEARCH COLLECTED</p><ul><li>{s.research.reviewedSources} of {s.research.sources} sources reviewed{s.research.changedSources?` · ${s.research.changedSources} changed since review`:''}</li><li>{s.research.findingsPending} findings waiting · {s.research.findingsDecided} decided</li><li>Last job: {s.research.lastJob?`${s.research.lastJob.status} · ${s.research.lastJob.adapter} · ${s.research.lastJob.at.slice(0,16).replace('T',' ')}`:'none'}</li><li>Staged package: {st.present?`snapshot ${st.snapshotAsOf} · ${Object.entries(st.counts).map(([k,n])=>`${n} ${k}`).join(', ')} · ${st.approvedForProduction??0} approved`:'none'}</li></ul><button className="min-h-tap" onClick={()=>onGo('decisions')}>Check facts ↗</button></article>
  <article><p className="eyebrow">2 · PACK DATA (COMPILER)</p>{s.data?<ul><li>{s.data.full} gates READY · {s.data.dataPlayable} playable</li><li>{s.data.timelineEvents} eligible dated events</li><li>Compiler notes: {s.data.diagnostics.blocker} blocking · {s.data.diagnostics.review} to review · {s.data.diagnostics.info} kept out by design</li></ul>:<p>No compiled pack — the engine cannot load this club.</p>}<p className="muted">Approving a research finding does not change the pack; packs change through a reviewed build.</p></article>
  <article><p className="eyebrow">3 · PUBLISHED</p><ul><li>Status: <b>{s.control.status}</b> · {s.publication.preview?'evaluation preview':'production'}</li><li>{s.publication.openNow} gates open now · {s.control.gatesOn.length} switched on</li><li>Activation: {s.activation.allowed?'allowed':'blocked'}</li></ul>{!s.activation.allowed&&<ul className="muted">{s.activation.reasons.slice(0,4).map(r=><li key={r}>{r}</li>)}</ul>}<button className="min-h-tap" onClick={()=>onGo('publish')}>Readiness & publish ↗</button></article>
  {s.next.length>0&&<article className="cr-wide"><p className="eyebrow">NEXT</p><ol>{s.next.map(n=><li key={n}>{n}</li>)}</ol></article>}
 </div>
}

function Research({club,adapters,jobs,api,onChange}:{club:Omit<Club,'sources'|'findings'>;adapters:AdapterInfo[];jobs:Job[];api:Api;onChange:()=>Promise<void>}){
 const [adapter,setAdapter]=useState(adapters[0]?.id||'wikipedia'),a=adapters.find(x=>x.id===adapter),available=a?.available[club.id]!==false
 return <div className="cr-two">
  <form className="cr-form" onSubmit={async e=>{e.preventDefault();const data={...Object.fromEntries(new FormData(e.currentTarget)),clubId:club.id,adapter};const job=await api.post<Job>('research/create',data,'Research queued.');if(job){const r=await api.post<{ran:boolean;status?:string}>('research/run',{id:job.id},'');api.setNotice(r?.status==='failed'?`Job ${job.id.slice(0,8)} for ${club.name} failed — read it below.`:`Job ${job.id.slice(0,8)} for ${club.name} ${r?.status||'queued'}. Review the evidence in Decisions.`);await onChange()}}}>
   <p className="eyebrow">COLLECT</p>
   <fieldset className="cr-choice"><legend>Adapter</legend>{adapters.map(x=><label key={x.id}><input type="radio" name="adapter-pick" checked={adapter===x.id} onChange={()=>setAdapter(x.id)}/>{x.label}<small>{x.capabilities.join(' · ')}{x.available[club.id]===false?' · not available for this club':''}</small></label>)}</fieldset>
   {a?.needsQuery&&<><label>Search phrase<input name="query" defaultValue={`${club.name} ${club.city}`} required/></label><label>Exact English Wikipedia title (optional)<input name="title" placeholder="For ambiguous club names"/></label></>}
   {!a?.needsQuery&&<p className="muted">{available?'Reads the staged package for this club. Statistics arrive as a report, not as facts to approve.':'No staged package for this club — import one and run research:stage first.'}</p>}
   <button className="min-h-tap button" disabled={api.busy||!available}>Run {a?.label||'research'} ↗</button>
  </form>
  <div><p className="eyebrow">JOBS FOR {club.name.toUpperCase()}</p>{!jobs.length&&<p className="empty">No jobs yet.</p>}{[...jobs].reverse().slice(0,12).map(j=><article className="source" key={j.id}><div><strong>{j.adapter||'wikipedia'} · {j.id.slice(0,8)}</strong><span className="badge" data-status={j.status}>{j.status}</span></div><small>{j.createdAt.slice(0,16).replace('T',' ')} UTC · attempt {j.attempts} · {j.query}</small>{j.error&&<p className="error">{j.error}</p>}{j.status==='failed'&&<button className="min-h-tap" onClick={async()=>{if(await api.post('research/retry',{id:j.id},`Job ${j.id.slice(0,8)} requeued.`))await onChange()}}>Retry ↗</button>}</article>)}</div>
 </div>
}

type SourceInfo={title:string;url:string;reviewed:boolean;changed:boolean;waiting:number}|null
type EvidencePage=Page<Finding|Source>&{sourceInfo?:Record<string,SourceInfo>}
/** the reason a one-click "No" or "Later" carries (rule 92 keeps a reason on every rejection; the owner is not asked to type one) */
const NO_REASON='Rejected by the owner',LATER_REASON='Left for later by the owner'
/**
 * Decisions, one plain question at a time (owner, 12.10.2026): "Is this right?" with the page that said it one line under it,
 * and Yes / No / Later. "Yes to everything from this page" is one click per source — the server approves only the findings whose
 * every cited page is checked and unchanged, and says how many it left.
 */
function Decisions({club,api,onChange}:{club:Omit<Club,'sources'|'findings'>;api:Api;onChange:()=>Promise<void>}){
 const [kind,setKind]=useState<'findings'|'sources'>('findings'),[state,setState]=useState('pending'),[page,setPage]=useState(1),[data,setData]=useState<EvidencePage|null>(null)
 const load=async()=>setData(await api.get<EvidencePage>(`evidence?club=${club.id}&kind=${kind}&state=${state}&page=${page}`))
 useEffect(()=>{void load()},[kind,state,page,club.id])// eslint-disable-line react-hooks/exhaustive-deps
 const decide=async(id:string,decision:'approved'|'rejected'|'deferred',k:'finding'|'source')=>{if(!data)return;const reason=decision==='rejected'?NO_REASON:decision==='deferred'?LATER_REASON:''
  const ok=await api.post('evidence/decide',{clubId:club.id,version:data.version,kind:k,id,decision,reason},decision==='approved'?(k==='source'?'Marked as checked.':'Approved.'):decision==='rejected'?'Rejected.':'Left for later.');if(ok){await load();await onChange()}}
 const allFrom=async(sourceId:string,title:string)=>{if(!data)return;const r=await api.post<{approved:number;left:number}>('evidence/approve-source',{clubId:club.id,version:data.version,sourceId},'');if(r){api.setNotice(`Approved ${r.approved} from “${title}”.${r.left?` ${r.left} still wait: they also cite a page you have not checked.`:''}`);await load();await onChange()}}
 const info=data?.sourceInfo||{}
 const bySource=[...new Set((data?.rows||[]).flatMap(r=>'field' in r?r.sources:[]))].map(id=>[id,info[id]] as const).filter((x):x is readonly [string,NonNullable<SourceInfo>]=>!!x[1]&&!x[1].changed&&x[1].waiting>1)
 return <div className="cr-decisions">
  <div className="cr-filters"><div role="group" aria-label="What to check" className="cr-toggle">{([['findings','Facts'],['sources','Pages']] as const).map(([k,l])=><button key={k} type="button" className="min-h-tap" aria-pressed={kind===k} onClick={()=>{setKind(k);setPage(1)}}>{l}</button>)}</div>
   <label>Show<select value={state} onChange={e=>{setState(e.target.value);setPage(1)}}><option value="pending">Waiting for you</option><option value="decided">Already decided</option><option value="all">Everything</option></select></label><span className="muted">{data?`${data.total} ${kind==='findings'?'fact':'page'}${data.total===1?'':'s'}`:'Loading…'}</span></div>
  <p className="muted">{kind==='findings'?'Each fact was read from a public page. Say Yes if it is right. A Yes does not change a game by itself: the game data is rebuilt from approved facts on the Launch page.':'Open each page and check it is a real, reliable source. A fact can only be approved once every page it comes from is checked.'}</p>
  {state==='pending'&&kind==='findings'&&bySource.length>0&&<div className="cr-allfrom"><p className="eyebrow">FASTER</p>{bySource.map(([id,s])=><p key={id}><button type="button" className="min-h-tap button secondary" disabled={api.busy} onClick={()=>void allFrom(id,s.title)}>Yes to all {s.waiting} from “{s.title}”</button>{!s.reviewed&&<small className="muted"> This also marks the page as checked. <a href={s.url} target="_blank" rel="noreferrer">Open it first ↗</a></small>}</p>)}</div>}
  {data?.rows.length===0&&<p className="empty">{state==='pending'?'Nothing is waiting for you here.':'Nothing here.'}</p>}
  {data?.rows.map(row=>'field' in row?<article className="source cr-q" key={row.id}>
    <p className="cr-q-ask">{row.decision?<span className="badge">{row.decision==='approved'?'Yes':row.decision==='rejected'?'No':'Later'}</span>:null}Is this right? <b>{row.field}</b>: <span dir="auto">{row.value}</span></p>
    <p className="cr-q-from">From: {row.sources.map((id,i)=>{const s=info[id];return <span key={id}>{i>0?' · ':''}{s?<><a href={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a>{s.changed?' (changed — check the new copy under Pages)':s.reviewed?' (checked)':' (not checked yet)'}</>:<code>{id}</code>}</span>})}</p>
    {row.reason&&row.decision!=='approved'&&<p className="muted">Note: {row.reason}</p>}
    {!row.decision&&<div className="cr-decide"><button className="min-h-tap button" disabled={api.busy} onClick={()=>decide(row.id!,'approved','finding')}>Yes</button><button className="min-h-tap button secondary" disabled={api.busy} onClick={()=>decide(row.id!,'rejected','finding')}>No</button><button className="min-h-tap" disabled={api.busy} onClick={()=>decide(row.id!,'deferred','finding')}>Later</button></div>}
   </article>:<article className="source cr-q" key={row.id}>
    <p className="cr-q-ask">{row.incoming?'This page changed. Is the new copy still right?':row.reviewed?'Checked page':'Is this a good source?'} <a href={row.url} target="_blank" rel="noreferrer">{row.title} ↗</a></p>
    <details><summary className="min-h-tap">Read what we collected</summary><p>{row.excerpt}</p>{row.incoming&&<><p className="eyebrow">NEW COPY · {row.incoming.retrievedAt.slice(0,10)}</p><p>{row.incoming.excerpt}</p></>}</details>
    {(!row.reviewed||row.incoming)&&<div className="cr-decide"><button className="min-h-tap button" disabled={api.busy} onClick={()=>decide(row.id,'approved','source')}>{row.incoming?'Yes, use the new copy':'Yes, it is a good source'}</button><button className="min-h-tap button secondary" disabled={api.busy} onClick={()=>decide(row.id,'rejected','source')}>No, remove it</button></div>}
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
  {(s.data?.dataPlayable||0)>0&&<div className="panel spaced"><p className="eyebrow">ONE CLICK</p><p>Open every gate whose compiled data is playable ({s.data!.gates.filter(g=>g.dataPlayable).map(g=>g.number).join(', ')}) and set the club live. The activation check still runs; this is your decision, never the autopilot’s.</p><button type="button" className="min-h-tap button secondary" disabled={api.busy} onClick={async()=>{if(await api.post('clubs/open-playable',{id:club.id,version:club.version,reason:reason||'Opened all playable gates'},`${club.name} is live with every playable gate.`))await onChange()}}>Open all playable gates ↗</button></div>}
 </form>
}
