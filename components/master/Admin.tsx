'use client'
import {useEffect,useRef,useState,type ReactNode} from 'react'
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
import {ClubFile,type ClubFileView} from './ClubFile'
import {DataCenter,type RunsRow} from './DataCenter'
import {DisplayControl} from './DisplayControl'
import {deskHref,type AttentionItem} from '@/lib/master/attention'
import type {StorageRow,Integration} from '@/lib/master/storageMap'
import {SCHEDULES,githubActions} from '@/lib/master/schedules'

export type {LightState} from '@/lib/master/lightState'
export type AdapterInfo={id:string;label:string;needsQuery:boolean;capabilities:string[];available:Record<string,boolean>}

export type DeskSection='overview'|'clubs'|'data'|'audience'|'operations'|'settings'
export type DeskOps={storage:StorageRow[];integrations:Integration[];release:{commit:string|null;branch:string|null;env:string;evaluation:boolean}}
const CLUB_VIEWS=[['launch','Launch'],['summary','Summary'],['decisions','Evidence'],['research','Research'],['publish','Readiness'],['history','History']] as const
type ClubView=typeof CLUB_VIEWS[number][0]
// the URL words (plan §3) ↔ the club file's own tab names
const VIEW_IN:Record<string,ClubView>={launch:'launch',summary:'summary',evidence:'decisions',research:'research',readiness:'publish',history:'history'}
const VIEW_OUT:Record<ClubView,string>={launch:'launch',summary:'summary',decisions:'evidence',research:'research',publish:'readiness',history:'history'}

/**
 * The Editor's Desk (plan §3–§9): one control room in six sections. Section, club and subview live in the URL, so a
 * reload, a bookmark and Back keep the context; the old `?tab=` links are mapped on the server. Global sections show
 * all clubs; a club is a scope you enter and leave on purpose.
 */
export function Admin({initial,summaries,adapters,runs,display,storage,section,view,club:scope,attention,ops,audience,gaps}:{initial:LightState;summaries:ClubSummary[];adapters:AdapterInfo[];runs:RunsRow[];display:LifeDisplayState;storage?:{kind:string;durable:boolean;note:string;error?:string};section:DeskSection;view:string|null;club:string|null;attention:AttentionItem[];ops:DeskOps;audience?:ReactNode;gaps?:ReactNode}){
 const router=useRouter(),path=usePathname(),params=useSearchParams()
 const go=(next:Record<string,string|null>)=>{const q=new URLSearchParams(params.toString());q.delete('tab');for(const [k,v] of Object.entries(next)){if(v)q.set(k,v);else q.delete(k)}router.push(`${path}?${q}`,{scroll:false})}
 const api=useAdminApi(),[state,setState]=useState(initial),[sums,setSums]=useState(summaries)
 useEffect(()=>{setSums(summaries)},[summaries])
 useEffect(()=>{setState(initial)},[initial])
 useEffect(()=>{if(section==='operations'&&view)document.getElementById(view)?.scrollIntoView({block:'start'})},[section,view])
 // F21: refresh reads the LIGHT state (no evidence arrays) and, after a club action, only that club's summary;
 // an answer that arrives after a newer request in the same scope is dropped
 const gate=useRef(requestGate()).current
 const refresh=async(clubId?:string)=>{
  const stateOk=gate.start('state'),sumsOk=clubId?gate.watch('summary'):gate.start('summary')
  const [s,su]=await Promise.all([api.get<LightState>('state/light'),clubId?api.get<ClubSummary>(`summary/${clubId}`):api.get<ClubSummary[]>('summary')])
  if(s&&stateOk())setState(s)
  if(su&&sumsOk())setSums(prev=>Array.isArray(su)?su:prev.map(x=>x.id===su.id?su:x))
 }
 const summary=scope?sums.find(s=>s.id===scope):undefined,club=scope?state.clubs.find(c=>c.id===scope):undefined
 const layer=overviewCounts(sums)
 const status=<>{storage&&!storage.durable&&section!=='overview'&&section!=='operations'?<p role="alert" className="desk-state desk-state-slim" data-state="error"><b>{storage.error?'Storage is refusing reads':'Changes here are temporary'}</b> · <Link href={deskHref('operations',{view:'storage'})}>Storage map →</Link></p>:null}
  {api.error?<p role="alert" className="desk-state" data-state="error">{api.error}</p>:null}{api.notice?<p role="status" className="desk-state" data-state="ok">{api.notice}</p>:null}</>
 return <div className="admin cr desk-content">
  {status}
  {section==='overview'&&<>
   <header className="desk-head"><p className="desk-kicker">Overview</p><h1 className="desk-h1">What needs your attention</h1></header>
   {attention.length===0?<div className="desk-state" data-state="ok"><b>Nothing waiting.</b> No blocker, decision, failed run or storage problem.</div>:
   <ol className="desk-inbox">{attention.map(a=><li key={a.id} data-priority={a.priority}><span className="desk-stamp">{a.priority===1?'Blocking':a.priority===2?'To decide':'Worth a look'}</span><div><p className="desk-inbox-club">{a.clubName?<bdi>{a.clubName}</bdi>:'Whole application'}</p><h2>{a.title}</h2><p>{a.reason}</p></div><Link className="desk-btn" href={a.href}>{a.cta} →</Link></li>)}</ol>}
   <section className="desk-sub" aria-labelledby="layers-h"><h2 id="layers-h">Clubs by layer</h2>
    <dl className="desk-stats">
     <div><dt>Data ready</dt><dd>{layer.dataReady}</dd><small>at least one gate playable from compiled data</small></div>
     <div><dt>Choose gates</dt><dd>{layer.chooseGates}</dd><small>playable, nothing switched on</small></div>
     <div><dt>Ready to publish</dt><dd>{layer.readyToPublish}</dd><small>gates chosen, activation passes</small></div>
     <div><dt>Published</dt><dd>{layer.published}</dd><small>live and passing activation</small></div>
    </dl>
    <p className="desk-actions"><Link className="desk-btn" href={deskHref('clubs')}>All clubs →</Link><Link className="desk-btn ghost" href={deskHref('clubs',{view:'new'})}>+ Add a club</Link></p>
   </section>
  </>}

  {section==='clubs'&&view==='new'&&<AddClub api={api} onMade={async id=>{await refresh();go({section:'data',club:id,view:null})}}/>}
  {section==='clubs'&&view!=='new'&&!summary&&<>
   <header className="desk-head"><p className="desk-kicker">Clubs</p><h1 className="desk-h1">Every club, every layer</h1><p className="desk-actions"><Link className="desk-btn" href={deskHref('clubs',{view:'new'})}>+ Add a club</Link></p></header>
   <ul className="desk-clubs">{sums.map(s=><li key={s.id}><Link href={deskHref('clubs',{club:s.id})} style={{['--club-primary' as string]:s.primary}}><Mark club={{...state.clubs.find(c=>c.id===s.id)!,sources:[],findings:[]} as Club}/><span><b><bdi>{s.name}</bdi></b><small>{s.city} · {s.data?`${s.data.dataPlayable}/13 playable`:'no compiled pack'} · {s.control.gatesOn.length} switched on · {s.publication.openNow} open now</small><small data-publish={s.publication.state}>{s.publication.label}{s.research.findingsPending?` · ${s.research.findingsPending} to decide`:''}</small></span><b aria-hidden="true">→</b></Link></li>)}</ul>
   {gaps}
  </>}
  {section==='clubs'&&summary&&club&&<>
   <header className="desk-head"><p className="desk-kicker">Club workspace</p><h1 className="desk-h1"><bdi>{summary.name}</bdi></h1>
    <p className="cr-layers"><span data-layer="research">Research · {summary.research.reviewedSources}/{summary.research.sources} sources · {summary.research.findingsPending} to decide</span><span data-layer="data">Data · {summary.data?`${summary.data.dataPlayable}/13 playable`:'no pack'}</span><span data-layer="publication">Publication · {summary.publication.label} · {summary.publication.openNow} open now</span></p>
    {summary.next[0]&&<p className="desk-next"><b>Next:</b> {summary.next[0]}</p>}
   </header>
   <nav className="desk-tabs" aria-label="Club workspace">{CLUB_VIEWS.map(([k,l])=>{const v=VIEW_IN[view||'launch']||'launch';return <button key={k} type="button" className="min-h-tap" aria-current={v===k?'page':undefined} onClick={()=>go({view:VIEW_OUT[k]})}>{l}{k==='decisions'&&summary.research.findingsPending?` (${summary.research.findingsPending})`:''}</button>})}</nav>
   {(VIEW_IN[view||'launch']||'launch')==='history'?<Activity key={club.id} club={club.id} api={api}/>:
    <ClubFile key={`${club.id}-${club.version}`} club={club} summary={summary} adapters={adapters} jobs={state.jobs.filter(j=>j.clubId===club.id)} api={api} onChange={()=>refresh(club.id)} view={(VIEW_IN[view||'launch']||'launch') as ClubFileView} onView={v=>go({view:VIEW_OUT[v]})}/>}
   <p className="desk-actions"><Link className="desk-btn ghost" href={`/master/core?club=${club.id}`}>Compiler diagnostics ↗</Link><Link className="desk-btn ghost" href={deskHref('data',{club:club.id})}>Sources & collection →</Link><Link className="desk-btn ghost" href={`/clubs/${club.id}`}>Club page ↗</Link></p>
  </>}

  {section==='data'&&<>
   <header className="desk-head"><p className="desk-kicker">Data</p><h1 className="desk-h1">{summary?<>Sources for <bdi>{summary.name}</bdi></>:'Sources and collection'}</h1>
    <label className="desk-picker">Club<select value={scope||''} onChange={e=>go({club:e.target.value||null})}><option value="">Choose a club…</option>{sums.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
   </header>
   {summary?<DataCenter key={scope} runs={runs} selected={scope!} summary={summary} api={api} onChange={refresh}/>:
    <ul className="desk-clubs">{sums.map(s=><li key={s.id}><Link href={deskHref('data',{club:s.id})}><span><b><bdi>{s.name}</bdi></b><small>{s.archive.sources} archive sources · {s.archive.documents} documents · {s.archive.needsParser} need a parser · {s.archive.blocked} refused{s.archive.lastRun?` · last run ${s.archive.lastRun.state} ${s.archive.lastRun.at.slice(0,10)}`:' · never collected here'}</small></span><b aria-hidden="true">→</b></Link></li>)}</ul>}
   <Autopilot api={api} onRan={refresh}/>
  </>}

  {section==='audience'&&audience}

  {section==='operations'&&<>
   <header className="desk-head"><p className="desk-kicker">Operations</p><h1 className="desk-h1">Is the application running reliably?</h1></header>
   <section className="desk-sub" id="storage" aria-labelledby="st-h"><h2 id="st-h">Storage map</h2><ul className="desk-rows">{ops.storage.map(r=><li key={r.what} data-durable={r.durable}><span className="desk-stamp">{r.durable==='yes'?'Kept':r.durable==='committed'?'Committed':r.durable==='no'?'Temporary':'Unknown'}</span><div><b>{r.what}</b><small>{r.where}</small><p>{r.note}</p></div></li>)}</ul></section>
   <section className="desk-sub" id="schedules" aria-labelledby="sc-h"><h2 id="sc-h">Schedules</h2><p className="desk-fine">Read from the workflow files. Run or pause them on GitHub → Actions.</p><ul className="desk-rows">{SCHEDULES.map(s=><li key={s.workflow}><span className="desk-stamp">{s.utc}</span><div><b>{s.name}</b><p>{s.what}</p>{s.needs&&<small>Needs: {s.needs}</small>}</div><a className="desk-btn ghost" href={githubActions(s.workflow)} target="_blank" rel="noreferrer">Open ↗</a></li>)}</ul></section>
   <section className="desk-sub" aria-labelledby="in-h"><h2 id="in-h">Integrations</h2><p className="desk-fine">Presence only — values are never shown.</p><ul className="desk-rows">{ops.integrations.map(i=><li key={i.name} data-durable={i.present?'yes':'no'}><span className="desk-stamp">{i.present?'Set':'Missing'}</span><div><b>{i.name}</b><p>{i.note}</p></div></li>)}</ul></section>
   <section className="desk-sub" aria-labelledby="rel-h"><h2 id="rel-h">Release</h2><p>Environment <b>{ops.release.env}</b>{ops.release.commit?<> · commit <code>{ops.release.commit}</code>{ops.release.branch?<> on <code>{ops.release.branch}</code></>:null}</>:null} · evaluation mode <b>{ops.release.evaluation?'on':'off'}</b></p><p className="desk-actions"><a className="desk-btn ghost" href="/api/master/export">Export control data ↓</a><Link className="desk-btn ghost" href="/master/test-lab">Test lab ↗</Link></p><p className="desk-fine">The control export is not a full application backup: research data lives in the repository, and the evaluation database is not included.</p></section>
   <section className="panel spaced"><p className="eyebrow">THE WORKER → FAN LIFE</p><h2>Upstream updates</h2><p className="spaced">The workflow detects commits, integrates a candidate and runs checks before opening a pull request. Conflicts stop the update.</p><button className="min-h-tap button" disabled={api.busy} onClick={async()=>{if(await api.post('upstream/check',{},'The Worker checked.'))await refresh()}}>Check The Worker now ↗</button>{state.upstream?<div className="spaced"><h3>{state.upstream.behind?`${state.upstream.behind} new commits`:'Up to date'}</h3><p>Installed <code>{state.upstream.installed.slice(0,12)}</code> · latest <code>{state.upstream.latest.slice(0,12)}</code> · checked {state.upstream.checkedAt}</p><a href={state.upstream.url} target="_blank" rel="noreferrer">Inspect the comparison ↗</a></div>:<p className="empty">No comparison on this server yet.</p>}</section>
   <Activity key="all" club={null} api={api}/>
  </>}

  {section==='settings'&&<>
   <header className="desk-head"><p className="desk-kicker">Settings</p><h1 className="desk-h1">What the application does</h1></header>
   <section className="desk-sub" aria-labelledby="gen-h"><h2 id="gen-h">General</h2><ul className="desk-rows"><li><span className="desk-stamp">Fixed</span><div><b>Control-room language</b><p>English. Evidence and names keep their original language and direction.</p></div></li><li><span className="desk-stamp">Fixed</span><div><b>Times</b><p>Stored and shown in UTC.</p></div></li><li><span className="desk-stamp">Per club</span><div><b>Gates and publication</b><p>Switched on in each club’s workspace → Readiness, behind the activation check.</p></div><Link className="desk-btn ghost" href={deskHref('clubs')}>Clubs →</Link></li></ul></section>
   <DisplayControl initial={display} api={api}/>
   <section className="desk-sub" aria-labelledby="acc-h"><h2 id="acc-h">Access</h2><p>One owner identity, signed in with the owner key. The session lasts 30 days on this browser; changing the key on Vercel signs everyone out.</p></section>
  </>}
  {api.busy?<div className="busy" role="status">Working…</div>:null}
 </div>
}

function AddClub({api,onMade}:{api:ReturnType<typeof useAdminApi>;onMade:(id:string)=>Promise<void>}){
 const STAGES:[string,string][]=[['Identity','here, now'],['Sources','Data, after creating'],['Research file','created with the club'],['Collection','Data · or the weekly run'],['Review','Club workspace · Evidence'],['Build candidate','ask Claude — no build runner yet'],['Readiness','Club workspace · Readiness'],['Publish','Club workspace · Readiness']]
 return <section className="desk-panel" aria-labelledby="add-h"><p className="desk-kicker">Clubs</p><h1 id="add-h" className="desk-h1">Add a club</h1>
  <ol className="desk-stages">{STAGES.map(([s,w],i)=><li key={s} data-here={i===0||undefined}><b>{s}</b><small>{w}</small></li>)}</ol>
  <form className="cr-form" onSubmit={async e=>{e.preventDefault();const form=e.currentTarget,data=Object.fromEntries(new FormData(form));if(await api.post('clubs/create',data,'Club research file created. Add its sources next.')){form.reset();await onMade(String(data.id))}}}>
   <label>Club name<input name="name" required maxLength={200}/></label><label>Club ID<input name="id" placeholder="your-club" pattern="[a-z][a-z0-9-]{1,60}" required autoCapitalize="none" autoCorrect="off"/></label>
   <div className="form-grid"><label>City<input name="city" required/></label><label>Country<input name="country" required/></label></div>
   <label>Monogram<input name="initials" required maxLength={4}/></label>
   <div className="form-grid"><label>Primary<input type="color" name="primary" defaultValue={MASTER_PRIMARY}/></label><label>Secondary<input type="color" name="secondary" defaultValue={MASTER_SECONDARY}/></label></div>
   <p className="desk-fine">Creates the club’s research file and an empty research profile, then opens its sources. Nothing is public: a club becomes playable only after a compiled pack exists and you publish it.</p>
   <button className="min-h-tap button" disabled={api.busy}>Create research file →</button>
  </form>
 </section>
}

function Activity({club,api}:{club:string|null;api:ReturnType<typeof useAdminApi>}){
 // keyed by club in the parent, so a new club starts on page 1 (F21); a late answer for an old filter is dropped
 const [all,setAll]=useState(club===null),[page,setPage]=useState(1),[data,setData]=useState<{page:number;pages:number;rows:State['audit']}|null>(null)
 useEffect(()=>{let live=true;void api.get<typeof data>(`audit?page=${page}${all?'':`&club=${club}`}`).then(d=>{if(live)setData(d)});return()=>{live=false}},[club,all,page])// eslint-disable-line react-hooks/exhaustive-deps
 return <section className="panel"><div className="section-head"><h2>Activity</h2>{club&&<label className="cr-inline"><input type="checkbox" checked={all} onChange={e=>{setAll(e.target.checked);setPage(1)}}/> All clubs</label>}</div>
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
