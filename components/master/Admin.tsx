'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {usePathname,useRouter,useSearchParams} from 'next/navigation'
import type {Club,State} from '@/lib/master/types'
import type {ClubSummary} from '@/lib/master/summary'
import type {LifeDisplayState} from '@/lib/master/lifeDisplay'
import {MASTER_PRIMARY,MASTER_SECONDARY} from '@/lib/master/theme'
import {Mark} from './Shell'
import {useAdminApi} from './adminApi'
import {ClubFile} from './ClubFile'
import {DataCenter,type RunsRow} from './DataCenter'
import {DisplayControl} from './DisplayControl'

/** The admin's light state: clubs without their evidence arrays (those are paged on demand, audit A17). */
export type LightState=Omit<State,'clubs'|'audit'>&{clubs:Omit<Club,'sources'|'findings'>[];auditTail:State['audit']}
export type AdapterInfo={id:string;label:string;needsQuery:boolean;capabilities:string[];available:Record<string,boolean>}
const TABS=[['overview','Overview'],['club','Club file'],['data','Data'],['display','LIFE display'],['updates','Updates'],['activity','Activity']] as const
type Tab=typeof TABS[number][0]

export function Admin({initial,summaries,adapters,runs,display}:{initial:LightState;summaries:ClubSummary[];adapters:AdapterInfo[];runs:RunsRow[];display:LifeDisplayState}){
 const router=useRouter(),path=usePathname(),params=useSearchParams()
 const tab=(TABS.some(([k])=>k===params.get('tab'))?params.get('tab'):'overview') as Tab
 const selected=summaries.some(s=>s.id===params.get('club'))?params.get('club')!:summaries[0]?.id||''
 // tab and club live in the URL so a link, a reload and every screen share one context (handoff §3)
 const go=(next:{tab?:Tab;club?:string})=>{const q=new URLSearchParams(params.toString());if(next.tab)q.set('tab',next.tab);if(next.club)q.set('club',next.club);router.replace(`${path}?${q}#controls`,{scroll:false})}
 useEffect(()=>{if(location.hash==='#display'&&tab!=='display')go({tab:'display'})},[])// eslint-disable-line react-hooks/exhaustive-deps
 const api=useAdminApi(),[state,setState]=useState(initial),[sums,setSums]=useState(summaries)
 const refresh=async()=>{const [s,su]=await Promise.all([api.get<State>('state'),api.get<ClubSummary[]>('summary')]);if(s)setState({...s,clubs:s.clubs.map(({sources:_s,findings:_f,...c})=>c),auditTail:s.audit.slice(-100)} as LightState);if(su)setSums(su)}
 const summary=sums.find(s=>s.id===selected),club=state.clubs.find(c=>c.id===selected)
 const blockers=sums.filter(s=>s.control.status==='live'&&!s.activation.allowed).length,pending=sums.reduce((n,s)=>n+s.research.findingsPending+s.research.changedSources,0),failed=state.jobs.filter(j=>j.status==='failed').length,ready=sums.filter(s=>s.activation.allowed&&s.control.status!=='live').length
 return <div className="admin section cr" id="controls">
  <div className="section-head"><div><p className="eyebrow">FAN LIFE / CONTROL ROOM</p><h1>The editor’s desk.</h1><p className="spaced">Pick a club, see what is missing, collect, decide, build — and know which layer you are touching.</p></div><div className="toolbar"><a className="button secondary" href="/api/master/export">Export control data ↓</a><Link href="/master/test-lab">Test lab ↗</Link></div></div>
  <div className="cr-context"><label>Club<select value={selected} onChange={e=>go({club:e.target.value})}>{sums.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>{summary&&<p className="cr-layers"><span data-layer="research">Research · {summary.research.reviewedSources}/{summary.research.sources} sources · {summary.research.findingsPending} to decide</span><span data-layer="data">Data · {summary.data?`${summary.data.dataPlayable}/13 playable`:'no pack'}</span><span data-layer="publication">Published · {summary.control.status} · {summary.publication.openNow}/13 open now</span></p>}</div>
  <nav className="tabs cr-tabs" aria-label="Admin sections">{TABS.map(([k,label])=><button key={k} onClick={()=>go({tab:k})} aria-current={tab===k?'page':undefined} className={`min-h-tap ${tab===k?'active':''}`}>{label}{k==='club'&&summary&&summary.research.findingsPending?` (${summary.research.findingsPending})`:''}</button>)}</nav>
  {api.error?<p role="alert" className="error">{api.error}</p>:null}{api.notice?<p role="status" className="success">{api.notice}</p>:null}
  {tab==='overview'&&<>
   <div className="metrics">
    <article><small>BLOCKING PUBLICATION</small><strong>{blockers}</strong><span>live clubs failing the activation check</span></article>
    <article><small>DECISIONS WAITING</small><strong>{pending}</strong><span>findings + changed sources</span></article>
    <article><small>FAILED RUNS</small><strong>{failed}</strong><span>research jobs to retry</span></article>
    <article><small>READY TO PUBLISH</small><strong>{ready}</strong><span>pass the activation check, not live yet</span></article>
   </div>
   <div className="cr-worlds">{sums.map(s=><button className="min-h-tap world-row" key={s.id} onClick={()=>go({tab:'club',club:s.id})}><Mark club={{...state.clubs.find(c=>c.id===s.id)!,sources:[],findings:[]} as Club}/><span><strong>{s.name}</strong><small>{s.city} · {s.control.status} · {s.data?`${s.data.full} READY · ${s.data.dataPlayable} playable`:'no pack'} · {s.publication.openNow} open now</small><small className="cr-next">{s.next[0]||'Nothing urgent.'}</small></span><b>↗</b></button>)}</div>
   <section className="panel spaced"><p className="eyebrow">A NEW WORLD</p><h2>Add a club</h2><form className="cr-form" onSubmit={async e=>{e.preventDefault();const form=e.currentTarget,data=Object.fromEntries(new FormData(form));if(await api.post('clubs/create',data,'Club research file created. Register it and build a first pack to connect the engine.')){form.reset();await refresh();go({tab:'club',club:String(data.id)})}}}><label>Club name<input name="name" required maxLength={200}/></label><label>Club ID<input name="id" placeholder="your-club" pattern="[a-z][a-z0-9-]{1,60}" required/></label><div className="form-grid"><label>City<input name="city" required/></label><label>Country<input name="country" required/></label></div><label>Monogram<input name="initials" required maxLength={4}/></label><div className="form-grid"><label>Primary<input type="color" name="primary" defaultValue={MASTER_PRIMARY}/></label><label>Secondary<input type="color" name="secondary" defaultValue={MASTER_SECONDARY}/></label></div><p className="muted">Creates a research file only. The engine reads a club once it is in the registry and has a compiled pack.</p><button className="min-h-tap button" disabled={api.busy}>Create research file ↗</button></form></section>
  </>}
  {tab==='club'&&summary&&club&&<ClubFile key={`${club.id}-${club.version}`} club={club} summary={summary} adapters={adapters} jobs={state.jobs.filter(j=>j.clubId===club.id)} api={api} onChange={refresh}/>}
  {tab==='data'&&<DataCenter runs={runs} selected={selected} api={api}/>}
  {tab==='display'&&<DisplayControl initial={display} api={api}/>}
  {tab==='updates'&&<section className="panel"><p className="eyebrow">THE WORKER → FAN LIFE</p><h2>Keep the original engine moving.</h2><p className="spaced">The workflow detects commits, integrates a candidate and runs checks before opening a pull request. Conflicts stop the update.</p><button className="min-h-tap button" disabled={api.busy} onClick={async()=>{if(await api.post('upstream/check',{},'The Worker checked.'))await refresh()}}>Check The Worker now ↗</button>{state.upstream?<div className="spaced"><h3>{state.upstream.behind?`${state.upstream.behind} new commits`:'Up to date'}</h3><p>Installed <code>{state.upstream.installed.slice(0,12)}</code> · latest <code>{state.upstream.latest.slice(0,12)}</code> · checked {state.upstream.checkedAt}</p><a href={state.upstream.url} target="_blank" rel="noreferrer">Inspect the comparison ↗</a></div>:<p className="empty">No comparison on this server yet.</p>}</section>}
  {tab==='activity'&&<Activity club={selected} api={api}/>}
  {api.busy?<div className="busy" role="status">Working…</div>:null}
 </div>
}

function Activity({club,api}:{club:string;api:ReturnType<typeof useAdminApi>}){
 const [all,setAll]=useState(false),[page,setPage]=useState(1),[data,setData]=useState<{page:number;pages:number;rows:State['audit']}|null>(null)
 useEffect(()=>{void api.get<typeof data>(`audit?page=${page}${all?'':`&club=${club}`}`).then(setData)},[club,all,page])// eslint-disable-line react-hooks/exhaustive-deps
 return <section className="panel"><div className="section-head"><h2>Activity</h2><label className="cr-inline"><input type="checkbox" checked={all} onChange={e=>{setAll(e.target.checked);setPage(1)}}/> All clubs</label></div>
  {!data?.rows.length?<p className="empty">Nothing recorded for this filter yet.</p>:<ol className="cr-log">{data.rows.map((a,i)=><li key={`${a.at}-${i}`}><b>{a.action}</b> <span className="muted">{a.at.slice(0,19).replace('T',' ')} UTC · {a.target} · {a.actor||'legacy entry'}</span>{a.detail&&<p>{a.detail}</p>}{(a.before||a.after)&&<p className="muted">before {a.before||'—'} → after {a.after||'—'}</p>}{a.reason&&<p>Reason: {a.reason}</p>}</li>)}</ol>}
  {data&&data.pages>1&&<nav className="cr-pager"><button className="min-h-tap" disabled={page<=1} onClick={()=>setPage(page-1)}>← Newer</button><span>{page} / {data.pages}</span><button className="min-h-tap" disabled={page>=data.pages} onClick={()=>setPage(page+1)}>Older →</button></nav>}
 </section>
}
