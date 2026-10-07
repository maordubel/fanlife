'use client'
import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {usePathname,useRouter,useSearchParams} from 'next/navigation'
import type {Club,State} from '@/lib/master/types'
import type {LightState} from '@/lib/master/lightState'
import {requestGate} from '@/lib/master/requestGate'
import {overviewCounts} from '@/lib/master/layers'
import type {ClubSummary} from '@/lib/master/summary'
import type {LifeDisplayState} from '@/lib/master/lifeDisplay'
import {MASTER_PRIMARY,MASTER_SECONDARY} from '@/lib/master/theme'
import {Mark} from './Shell'
import {useAdminApi} from './adminApi'
import {ClubFile} from './ClubFile'
import {DataCenter,type RunsRow} from './DataCenter'
import {DisplayControl} from './DisplayControl'

export type {LightState} from '@/lib/master/lightState'
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
 // F21: refresh reads the LIGHT state (no evidence arrays) and, after a club action, only that club's summary;
 // an answer that arrives after a newer request in the same scope is dropped
 const gate=useRef(requestGate()).current
 const refresh=async(clubId?:string)=>{
  const stateOk=gate.start('state'),sumsOk=clubId?gate.watch('summary'):gate.start('summary')
  const [s,su]=await Promise.all([api.get<LightState>('state/light'),clubId?api.get<ClubSummary>(`summary/${clubId}`):api.get<ClubSummary[]>('summary')])
  if(s&&stateOk())setState(s)
  if(su&&sumsOk())setSums(prev=>Array.isArray(su)?su:prev.map(x=>x.id===su.id?su:x))
 }
 const summary=sums.find(s=>s.id===selected),club=state.clubs.find(c=>c.id===selected)
 const blockers=sums.filter(s=>s.control.status==='live'&&!s.activation.allowed).length,pending=sums.reduce((n,s)=>n+s.research.findingsPending+s.research.changedSources,0),failed=state.jobs.filter(j=>j.status==='failed').length,layer=overviewCounts(sums)
 return <div className="admin section cr" id="controls">
  <div className="section-head"><div><p className="eyebrow">FAN LIFE / CONTROL ROOM</p><h1>The editor’s desk.</h1><p className="spaced">Pick a club, see what is missing, collect, decide, build — and know which layer you are touching.</p></div><div className="toolbar"><a className="button secondary" href="/api/master/export">Export control data ↓</a><Link href="/master/test-lab">Test lab ↗</Link></div></div>
  <div className="cr-context"><label>Club<select value={selected} onChange={e=>go({club:e.target.value})}>{sums.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>{summary&&<p className="cr-layers"><span data-layer="research">Research · {summary.research.reviewedSources}/{summary.research.sources} sources · {summary.research.findingsPending} to decide</span><span data-layer="data">Data · {summary.data?`${summary.data.dataPlayable}/13 playable`:'no pack'}</span><span data-layer="publication">Publication · {summary.publication.label} · {summary.control.gatesOn.length} switched on · {summary.publication.openNow} open now</span></p>}</div>
  <nav className="tabs cr-tabs" aria-label="Admin sections">{TABS.map(([k,label])=><button key={k} onClick={()=>go({tab:k})} aria-current={tab===k?'page':undefined} className={`min-h-tap ${tab===k?'active':''}`}>{label}{k==='club'&&summary&&summary.research.findingsPending?` (${summary.research.findingsPending})`:''}</button>)}</nav>
  {api.error?<p role="alert" className="error">{api.error}</p>:null}{api.notice?<p role="status" className="success">{api.notice}</p>:null}
  {tab==='overview'&&<>
   <div className="metrics">
    <article><small>BLOCKING PUBLICATION</small><strong>{blockers}</strong><span>live clubs failing the activation check</span></article>
    <article><small>DECISIONS WAITING</small><strong>{pending}</strong><span>findings + changed sources</span></article>
    <article><small>FAILED RUNS</small><strong>{failed}</strong><span>research jobs to retry</span></article>
   </div>
   {/* F20: three separate facts — compiled data, the owner's gate choice, what visitors can open */}
   <div className="metrics" aria-label="Data and publication">
    <article data-layer="data"><small>DATA READY</small><strong>{layer.dataReady}</strong><span>clubs with at least one gate playable from compiled data</span></article>
    <article data-layer="publication"><small>CHOOSE GATES</small><strong>{layer.chooseGates}</strong><span>playable data, no gate switched on yet</span></article>
    <article data-layer="publication"><small>READY TO PUBLISH</small><strong>{layer.readyToPublish}</strong><span>gates chosen and passing the activation check</span></article>
    <article data-layer="publication"><small>PUBLISHED</small><strong>{layer.published}</strong><span>live and passing the activation check</span></article>
   </div>
   <div className="cr-worlds">{sums.map(s=><button className="min-h-tap world-row" key={s.id} onClick={()=>go({tab:'club',club:s.id})}><Mark club={{...state.clubs.find(c=>c.id===s.id)!,sources:[],findings:[]} as Club}/><span><strong>{s.name}</strong><small>{s.city} · {s.data?`data: ${s.data.dataPlayable} playable (${s.data.full} full)`:'data: no pack'} · {s.control.gatesOn.length} switched on · {s.publication.openNow} open now</small><small data-publish={s.publication.state}>{s.publication.label}</small><small className="cr-next">{s.next[0]||'Nothing urgent.'}</small></span><b>↗</b></button>)}</div>
   <Autopilot api={api} onRan={refresh}/>
   <section className="panel spaced"><p className="eyebrow">A NEW WORLD</p><h2>Add a club</h2><form className="cr-form" onSubmit={async e=>{e.preventDefault();const form=e.currentTarget,data=Object.fromEntries(new FormData(form));if(await api.post('clubs/create',data,'Club research file created. Register it and build a first pack to connect the engine.')){form.reset();await refresh();go({tab:'data',club:String(data.id)})}}}><label>Club name<input name="name" required maxLength={200}/></label><label>Club ID<input name="id" placeholder="your-club" pattern="[a-z][a-z0-9-]{1,60}" required/></label><div className="form-grid"><label>City<input name="city" required/></label><label>Country<input name="country" required/></label></div><label>Monogram<input name="initials" required maxLength={4}/></label><div className="form-grid"><label>Primary<input type="color" name="primary" defaultValue={MASTER_PRIMARY}/></label><label>Secondary<input type="color" name="secondary" defaultValue={MASTER_SECONDARY}/></label></div><p className="muted">Creates the club’s research file and an empty research profile, then opens its Data tab to add sources. The autopilot collects from them on every run; the club becomes playable once a compiled pack exists and you publish it.</p><button className="min-h-tap button" disabled={api.busy}>Create research file ↗</button></form></section>
  </>}
  {tab==='club'&&summary&&club&&<ClubFile key={`${club.id}-${club.version}`} club={club} summary={summary} adapters={adapters} jobs={state.jobs.filter(j=>j.clubId===club.id)} api={api} onChange={()=>refresh(club.id)}/>}
  {tab==='data'&&<DataCenter key={selected} runs={runs} selected={selected} summary={summary} api={api} onChange={refresh}/>}
  {tab==='display'&&<DisplayControl initial={display} api={api}/>}
  {tab==='updates'&&<section className="panel"><p className="eyebrow">THE WORKER → FAN LIFE</p><h2>Keep the original engine moving.</h2><p className="spaced">The workflow detects commits, integrates a candidate and runs checks before opening a pull request. Conflicts stop the update.</p><button className="min-h-tap button" disabled={api.busy} onClick={async()=>{if(await api.post('upstream/check',{},'The Worker checked.'))await refresh()}}>Check The Worker now ↗</button>{state.upstream?<div className="spaced"><h3>{state.upstream.behind?`${state.upstream.behind} new commits`:'Up to date'}</h3><p>Installed <code>{state.upstream.installed.slice(0,12)}</code> · latest <code>{state.upstream.latest.slice(0,12)}</code> · checked {state.upstream.checkedAt}</p><a href={state.upstream.url} target="_blank" rel="noreferrer">Inspect the comparison ↗</a></div>:<p className="empty">No comparison on this server yet.</p>}</section>}
  {tab==='activity'&&<Activity key={selected} club={selected} api={api}/>}
  {api.busy?<div className="busy" role="status">Working…</div>:null}
 </div>
}

function Activity({club,api}:{club:string;api:ReturnType<typeof useAdminApi>}){
 // keyed by club in the parent, so a new club starts on page 1 (F21); a late answer for an old filter is dropped
 const [all,setAll]=useState(false),[page,setPage]=useState(1),[data,setData]=useState<{page:number;pages:number;rows:State['audit']}|null>(null)
 useEffect(()=>{let live=true;void api.get<typeof data>(`audit?page=${page}${all?'':`&club=${club}`}`).then(d=>{if(live)setData(d)});return()=>{live=false}},[club,all,page])// eslint-disable-line react-hooks/exhaustive-deps
 return <section className="panel"><div className="section-head"><h2>Activity</h2><label className="cr-inline"><input type="checkbox" checked={all} onChange={e=>{setAll(e.target.checked);setPage(1)}}/> All clubs</label></div>
  {!data?.rows.length?<p className="empty">Nothing recorded for this filter yet.</p>:<ol className="cr-log">{data.rows.map((a,i)=><li key={`${a.at}-${i}`}><b>{a.action}</b> <span className="muted">{a.at.slice(0,19).replace('T',' ')} UTC · {a.target} · {a.actor||'legacy entry'}{a.role&&a.role!==a.actor?` (${a.role})`:''}</span>{a.detail&&<p>{a.detail}</p>}{(a.before||a.after)&&<p className="muted">before {a.before||'—'} → after {a.after||'—'}</p>}{a.reason&&<p>Reason: {a.reason}</p>}</li>)}</ol>}
  {data&&data.pages>1&&<nav className="cr-pager"><button className="min-h-tap" disabled={page<=1} onClick={()=>setPage(page-1)}>← Newer</button><span>{page} / {data.pages}</span><button className="min-h-tap" disabled={page>=data.pages} onClick={()=>setPage(page+1)}>Older →</button></nav>}
 </section>
}

/** The scheduled pipeline, visible: when it last ran, what it did, and a button to run it now. */
function Autopilot({api,onRan}:{api:ReturnType<typeof useAdminApi>;onRan:()=>Promise<void>}){
 const [runs,setRuns]=useState<State['audit']|null>(null)
 const load=()=>api.get<State['audit']>('pipeline/runs').then(setRuns)
 useEffect(()=>{void load()},[])// eslint-disable-line react-hooks/exhaustive-deps
 return <section className="panel spaced"><p className="eyebrow">AUTOPILOT</p><h2>Research runs by itself</h2>
  <p>On every scheduled run, for every club with sources: collect a small polite batch → re-export staging → bring changed packages into the club file as unreviewed rows → fetch planned match pages → process queued jobs. It stops at your review; it never approves, builds a pack or publishes.</p>
  <button className="min-h-tap button" disabled={api.busy} onClick={async()=>{if(await api.post('pipeline/run',{},'Pipeline ran for every club with sources.')){await load();await onRan()}}}>Run the pipeline now ↗</button>
  {runs&&(runs.length?<ol className="cr-log spaced">{runs.slice(0,5).map((a,i)=><li key={i}><b>{a.at.slice(0,16).replace('T',' ')} UTC</b> <span className="muted">{a.actor}</span><p>{a.detail}</p></li>)}</ol>:<p className="empty">The autopilot has not run on this server yet.</p>)}
 </section>
}
