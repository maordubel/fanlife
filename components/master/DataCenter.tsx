'use client'
import {useEffect,useState} from 'react'
import type {ResearchRun,PlanReport,PlanIssue,ArchiveRun} from '@/lib/research/contract'
import type {ClubSummary} from '@/lib/master/summary'
import type {useAdminApi} from './adminApi'
import {Pipeline} from './Pipeline'

type Listing={collection:string;state:string;pagesRead:number;observedTotalDocuments:number|null;observedTotalPages:number|null;queue:number|null;lastError:string|null}
type SourceRow={providerId:string;publisher:string;reader:string;role:string;origin:string;familyId:string;parser:string|null;plannedParser:string|null;knownLimits:string[];listings:Listing[];documents:number;observations?:number;changed:number;endpoints:{endpoint:string;state:string;status:number;reason:string|null;checkedAt:string}[]}
type Archive={sources:SourceRow[];documents:number;observations?:number;observationsByType?:Record<string,number>;needsParser:number;lastRun:ArchiveRun|null;runs:ArchiveRun[]}
export type RunsRow={clubId:string;hasProfile:boolean;canPlan?:boolean;runs:ResearchRun[];jobs:number;states:Record<string,number>;archive?:Archive|null;profileOrigin?:{repo:boolean;admin:boolean}|null}
type PlanResult={ok:true;run:ResearchRun;report:PlanReport;issues:PlanIssue[];issueKinds:Record<string,number>}|{ok:false;reason:string}
const STATE_TEXT:Record<string,string>={planned:'planned',leased:'in progress',fetched:'fetched',parsed:'parsed',unchanged:'unchanged',failed:'retry later',exhausted:'gave up',blocked:'refused by source','needs-adapter':'kept, needs a parser'}
const LISTING:Record<string,string>={new:'not read yet',running:'reading',partial_budget:'paused at the budget — resumes next run',listed:'listing read to its last page (not a claim of a complete archive)',blocked:'refused — recorded, not bypassed','not-json':'answered with a web page instead of data','schema-changed':'format changed — stopped','retry-later':'temporarily unavailable — retried next run'}
const ROLE:Record<string,string>={results:'results',people:'people','club-history':'club history','fan-culture':'fan culture',items:'items & kits',mixed:'mixed'}
const when=(s?:string|null)=>s?s.slice(0,16).replace('T',' '):'—'

/**
 * The data centre: the no-AI research engine for ONE club at a time (the club picker above).
 * Archive sources (public WordPress REST listings and approved HTML index pages) are collected in small, polite batches
 * that resume from checkpoints; each batch re-exports the staging package, and "Bring into the club file" turns it into
 * unreviewed sources and findings. Nothing here approves, builds a pack or publishes.
 */
export function DataCenter({runs,selected,summary,api,onChange}:{runs:RunsRow[];selected:string;summary?:ClubSummary;api:ReturnType<typeof useAdminApi>;onChange?:()=>Promise<void>}){
 const [rows,setRows]=useState(runs),[result,setResult]=useState<PlanResult|null>(null),[adding,setAdding]=useState(false)
 const row=rows.find(r=>r.clubId===selected),arc=row?.archive
 const refresh=async()=>{const fresh=await api.get<RunsRow[]>('research/runs');if(fresh)setRows(fresh);await onChange?.()}
 useEffect(()=>{void api.get<RunsRow[]>('research/runs').then(f=>{if(f)setRows(f)})},[selected])// eslint-disable-line react-hooks/exhaustive-deps
 const collect=async(providerId?:string)=>{const r=await api.post<{run:ArchiveRun}>('archive/collect',{clubId:selected,providerId,maxRequests:providerId?5:10},'Collection batch finished.');if(r){const c=r.run.counts;api.setNotice(`${r.run.providers.join(', ')}: ${c.requests} requests · ${c.documentsRead} documents read (${c.newDocuments} new, ${c.changedDocuments} changed) · ${c.recordsExtracted} records extracted · ${LISTING[r.run.state]||r.run.state}. Staging re-exported.`);await refresh()}}
 const plan=async()=>{const r=await api.post<PlanResult>('research/plan',{clubId:selected},'Plan built.');if(r){setResult(r);if(!r.ok)api.setError(r.reason);await refresh()}}
 return <section className="panel cr-data">
  <div className="section-head"><div><p className="eyebrow">DATA CENTRE · NO AI · {selected.toUpperCase()}</p><h2>Research this club</h2><p className="muted">Public sources only, read politely in small batches that resume where they stopped. A refusal is recorded, never bypassed. Collected documents are not facts: nothing is extracted until a parser is tested on stored pages, and nothing is approved here.</p></div></div>
  {summary&&<><p className="eyebrow">PIPELINE</p><Pipeline steps={summary.pipeline}/></>}
  <div className="dc-actions spaced">
   <button className="min-h-tap button" disabled={api.busy||!arc?.sources.length} onClick={()=>collect()}>Collect from every source (10 requests) ↗</button>
   <button className="min-h-tap button secondary" disabled={api.busy||!arc?.sources.length} onClick={async()=>{if(await api.post('archive/export',{clubId:selected},'Staging package re-exported (nothing approved).'))await refresh()}}>Re-export staging</button>
   <button className="min-h-tap button secondary" disabled={api.busy} onClick={async()=>{if(await api.post('research/create',{clubId:selected,adapter:'package'},'Queued: the staged package goes to the club file as unreviewed rows.')){await api.post('research/run',{},'Processed.')}}}>Bring into the club file</button>
   <button className="min-h-tap button secondary" disabled={api.busy} onClick={async()=>{const r=await api.post<{steps:{clubId:string;error?:string}[]}>('pipeline/run',{clubId:selected},'Pipeline ran for this club.');if(r){await refresh();const e=r.steps.find(x=>x.error);if(e)api.setError(e.error!)}}}>Run the whole pipeline now</button>
  </div>
  <p className="muted">Collection also runs on GitHub every Tuesday, from a network that can reach the sources, and on demand: <a href="https://github.com/maordubel/fanlife/actions/workflows/archive-collect.yml" target="_blank" rel="noreferrer">Archive collect → Run workflow ↗</a>. Its results land in <code>research-data/</code> and show here after the next deploy.</p>
  {!row?.hasProfile&&<p className="empty">No research profile for this club yet. Add its first source below — the profile is created with it.</p>}
  {arc&&<>
   <p className="muted">{arc.documents} documents kept · {arc.observations||0} candidates extracted{arc.observationsByType&&Object.keys(arc.observationsByType).length?` (${Object.entries(arc.observationsByType).map(([k,n])=>`${n} ${k}`).join(', ')})`:''} · {arc.needsParser} waiting for a parser · last run {arc.lastRun?`${when(arc.lastRun.finishedAt)} UTC · ${LISTING[arc.lastRun.state]||arc.lastRun.state}`:'never'}{row?.profileOrigin?` · profile from ${[row.profileOrigin.repo&&'the repository',row.profileOrigin.admin&&'the control room'].filter(Boolean).join(' + ')}`:''}</p>
   <div className="cr-sources">{arc.sources.map(s=><article key={s.providerId} className="cr-source">
    <header><div><h3>{s.publisher}</h3><p className="muted">{s.reader==='wordpress-rest'?'WordPress REST':'HTML index'} · {ROLE[s.role]||s.role} · <a href={s.origin} target="_blank" rel="noreferrer">{s.origin.replace('https://','')}</a> · family {s.familyId}</p></div><button className="min-h-tap button secondary" disabled={api.busy} onClick={()=>collect(s.providerId)}>Collect next batch</button></header>
    <ul className="cr-listings">{s.listings.map(l=><li key={l.collection} data-state={l.state}><b>{l.collection==='html'?'pages':l.collection}</b> · {LISTING[l.state]||l.state}{l.collection==='html'?(l.queue!==null?` · ${l.queue} queued`:''):` · ${l.pagesRead}${l.observedTotalPages?` / ${l.observedTotalPages}`:''} pages${l.observedTotalDocuments!==null?` · site reports ${l.observedTotalDocuments} documents`:''}`}{l.lastError&&<small>{l.lastError}</small>}</li>)}</ul>
    <p>{s.documents} documents{s.changed?` · ${s.changed} changed since first read`:''} · parser: {s.parser?<><b>{s.parser}</b> · {s.observations||0} candidates read (unreviewed)</>:<>none yet{s.plannedParser?` (${s.plannedParser} planned)`:''} — nothing extracted</>}</p>
    {s.endpoints.some(e=>e.state!=='ok')&&<ul className="cr-log">{s.endpoints.filter(e=>e.state!=='ok').slice(0,4).map(e=><li key={e.endpoint}><b>{e.state}</b> {e.status?`HTTP ${e.status}`:''} · <code>{e.endpoint.slice(0,80)}</code><p className="muted">{e.reason} · {when(e.checkedAt)} UTC</p></li>)}</ul>}
    {s.knownLimits.length>0&&<details><summary>Known limits of this source</summary><ul>{s.knownLimits.map(t=><li key={t}>{t}</li>)}</ul></details>}
    {row?.profileOrigin?.admin&&<RemoveSource club={selected} id={s.providerId} api={api} onDone={refresh}/>}
   </article>)}</div>
   {arc.runs.length>0&&<details className="spaced"><summary>Last collection runs</summary><ol className="cr-log">{arc.runs.map(r=><li key={r.id}><b>{LISTING[r.state]||r.state}</b> <span className="muted">{when(r.finishedAt)} UTC · {r.providers.join(', ')}</span><p>{r.counts.requests} requests · {r.counts.documentsRead} documents read ({r.counts.newDocuments} new, {r.counts.changedDocuments} changed) · {r.counts.blockedEndpoints} refused · {r.counts.recordsExtracted} records extracted</p>{r.diagnostics.filter(d=>d.code!=='NEEDS_PARSER').slice(0,3).map((d,i)=><p key={i} className="muted">{d.code}: {d.message}</p>)}</li>)}</ol></details>}
  </>}
  <div className="spaced">{adding?<AddSource club={selected} api={api} onDone={async()=>{setAdding(false);await refresh()}}/>:<button className="min-h-tap button secondary" onClick={()=>setAdding(true)}>+ Add a source for {selected}</button>}</div>
  <details className="spaced" open={!!row?.canPlan}><summary>Match pages (planned from a staged package)</summary>
   {row?.canPlan?<>
    <p className="muted">{row.jobs} jobs · {Object.entries(row.states).map(([k,n])=>`${n} ${STATE_TEXT[k]||k}`).join(' · ')||'no jobs yet'} · last: {row.runs[0]?`${row.runs[0].kind} · ${row.runs[0].state} · ${when(row.runs[0].createdAt)}`:'never'}</p>
    <div className="dc-actions"><button className="min-h-tap button secondary" disabled={api.busy} onClick={plan}>Build the plan (offline)</button><button className="min-h-tap button secondary" disabled={api.busy} onClick={async()=>{const r=await api.post<ResearchRun>('research/fetch',{clubId:selected,max:3},'Fetch batch finished.');if(r){api.setNotice(`Fetch batch for ${selected}: ${Object.entries(r.counts).filter(([,n])=>n).map(([k,n])=>`${n} ${k}`).join(' · ')||'nothing due'}.`);await refresh()}}}>Fetch 3 planned pages now</button></div>
    {result?.ok&&<div className="cr-plan">
     <p><b>{result.run.counts.added}</b> new jobs · {result.run.counts.known} already known · {result.run.counts.desired} wanted in total</p>
     <dl>{Object.entries(result.report.stats).filter(([,v])=>v!==null).map(([k,v])=><div key={k}><dt>{k.replace(/([A-Z])/g,' $1').toLowerCase()}</dt><dd>{String(v)}</dd></div>)}</dl>
     <p className="eyebrow">ISSUES FOR REVIEW</p><p>{Object.entries(result.issueKinds).map(([k,n])=>`${n} ${k.replace(/_/g,' ')}`).join(' · ')||'none'}</p>
     <p className="muted">{result.report.limits.join(' ')}</p>
    </div>}
   </>:<p className="muted">Match-page planning needs a staged results package and a match-page source in the repository profile (Panathinaikos has one).</p>}
  </details>
 </section>
}

function RemoveSource({club,id,api,onDone}:{club:string;id:string;api:ReturnType<typeof useAdminApi>;onDone:()=>Promise<void>}){
 return <button className="min-h-tap" disabled={api.busy} onClick={async()=>{if(await api.post('archive/source/remove',{clubId:club,providerId:id},'Source removed from the control-room profile.'))await onDone()}}>Remove this source</button>
}

/** A new source is validated on the server (strict, field-named errors); images are never downloaded. */
function AddSource({club,api,onDone}:{club:string;api:ReturnType<typeof useAdminApi>;onDone:()=>Promise<void>}){
 const [reader,setReader]=useState<'wordpress-rest'|'html'>('wordpress-rest')
 return <form className="cr-form panel" onSubmit={async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget)) as Record<string,string>
  const source={providerId:f.providerId,familyId:f.familyId||f.providerId,publisher:f.publisher,reader,origin:f.origin,role:f.role,locale:f.locale||'en',collections:reader==='wordpress-rest'?[f.posts&&'posts',f.pages&&'pages'].filter(Boolean):undefined,seeds:f.seeds,follow:f.follow||undefined,allowedPathPrefixes:f.prefixes,parserId:f.parserId||null,budget:{maxRequests:Number(f.maxRequests)||10},knownLimits:f.limits}
  if(await api.post('archive/source/save',{clubId:club,source},`Source saved for ${club}. Collect a first batch to check it.`))await onDone()}}>
  <p className="eyebrow">NEW SOURCE · {club.toUpperCase()}</p>
  <div className="cr-choice" role="radiogroup" aria-label="How the source is read"><label><input type="radio" checked={reader==='wordpress-rest'} onChange={()=>setReader('wordpress-rest')}/> WordPress site (public REST listing)</label><label><input type="radio" checked={reader==='html'} onChange={()=>setReader('html')}/> Web pages from approved index pages</label></div>
  <div className="form-grid"><label>Publisher<input name="publisher" required maxLength={200} placeholder="The Celtic Wiki"/></label><label>Source id<input name="providerId" required pattern="[a-z][a-z0-9-]{1,60}" placeholder="thecelticwiki"/></label></div>
  <div className="form-grid"><label>Site address<input name="origin" required placeholder="https://www.example.com" pattern="https://[^/]+"/></label><label>Source family (same owner = same family)<input name="familyId" pattern="[a-z][a-z0-9-]{1,60}" placeholder="thecelticwiki-editorial"/></label></div>
  <div className="form-grid"><label>What it is good for<select name="role" defaultValue="mixed">{Object.entries(ROLE).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label>Language<input name="locale" defaultValue="en" maxLength={20}/></label></div>
  {reader==='wordpress-rest'?<div className="cr-choice"><label><input type="checkbox" name="posts" value="1"/> posts</label><label><input type="checkbox" name="pages" value="1" defaultChecked/> pages</label></div>
   :<><label>Approved index pages (one path per line)<textarea name="seeds" required rows={3} placeholder={'/history/\n/seasons/'}/></label><label>Links that may be followed from them (pattern, optional)<input name="follow" placeholder="^/seasons/[0-9-]+/$"/></label></>}
  <label>Allowed path prefixes (one per line; empty = the index pages)<textarea name="prefixes" rows={2}/></label>
  <div className="form-grid"><label>Requests per batch<input name="maxRequests" type="number" min={1} max={200} defaultValue={10}/></label><label>Planned parser id (optional)<input name="parserId" placeholder="celticwiki-football-v1"/></label></div>
  <label>Known limits (one per line)<textarea name="limits" rows={2}/></label>
  <p className="muted">Public, free sources only. A source that refuses us stays refused. Images are never downloaded.</p>
  <div className="dc-actions"><button className="min-h-tap button" disabled={api.busy}>Save source</button><button type="button" className="min-h-tap button secondary" onClick={()=>onDone()}>Cancel</button></div>
 </form>
}
