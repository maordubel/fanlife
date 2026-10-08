'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import type {LaunchView} from '@/lib/master/launch'
import type {useAdminApi} from './adminApi'
type Api=ReturnType<typeof useAdminApi>

/**
 * LAUNCH — one club, five steps, top to bottom (owner, 8.10.2026: "easy to run research, see what it returned, what can
 * open and what is missing, and one button to open the club for play"). Each step says what it does before you press it.
 * Nothing is approved, built or opened unless the owner presses the button.
 */
const MARK={done:'✓',todo:'•',none:'–'} as const
export function Launch({clubId,api,onChange}:{clubId:string;api:Api;onChange:()=>Promise<void>}){
 const [v,setV]=useState<LaunchView|null>(null),[skip,setSkip]=useState<Set<string>>(new Set()),[showAll,setShowAll]=useState(false)
 const load=async()=>{const r=await api.get<LaunchView>(`launch?club=${clubId}`);if(r)setV(r)}
 useEffect(()=>{void load()},[clubId])// eslint-disable-line react-hooks/exhaustive-deps
 const after=async()=>{await load();await onChange()}
 if(!v)return <p className="desk-fine" aria-live="polite">Loading the launch view…</p>
 const chosen=v.players.pending.filter(p=>!skip.has(p.id)),shown=showAll?v.players.pending:v.players.pending.slice(0,12)
 const playable=v.gates.filter(g=>g.playable),closed=v.gates.filter(g=>!g.playable)
 return <div className="launch" data-testid="launch">
  <ol className="launch-steps" aria-label="Steps">
   <li data-step={v.steps.research}><span>{MARK[v.steps.research]}</span>1 Research</li>
   <li data-step={v.steps.approve}><span>{MARK[v.steps.approve]}</span>2 Approve</li>
   <li data-step={v.steps.build}><span>{MARK[v.steps.build]}</span>3 Build</li>
   <li data-step={v.steps.open}><span>{MARK[v.steps.open]}</span>4 Open</li>
  </ol>

  <section className="desk-sub launch-step" aria-labelledby="l1"><h2 id="l1">1 · Research</h2>
   <p>{v.research.lastRun?<>Last collection <b>{v.research.lastRun.at.slice(0,16).replace('T',' ')}</b> ({v.research.lastRun.state}, {v.research.lastRun.requests} requests).</>:'Not collected from this server yet.'} {v.research.documents} documents kept from {v.research.sources} sources{v.research.needsParser?`; ${v.research.needsParser} wait for a parser and give nothing yet`:''}.</p>
   {v.research.report.length>0&&<ul className="launch-report">{v.research.report.map(r=><li key={r}>{r}</li>)}</ul>}
   <button className="desk-btn min-h-tap" disabled={api.busy} onClick={async()=>{if(await api.post('pipeline/run',{clubId},'Research ran: collected a small batch and brought new rows here for your approval.'))await after()}}>Run research now</button>
   <p className="desk-fine">Collects a small batch politely (robots.txt, rate limits), then brings what it read into this page. It never approves or opens anything.</p>
  </section>

  <section className="desk-sub launch-step" aria-labelledby="l2"><h2 id="l2">2 · What came back — approve it</h2>
   {v.players.pending.length===0?<p>{v.players.approved?`${v.players.approved} players approved. Nothing new waiting.`:'No players waiting. Research has not read any player pages for this club yet.'}</p>:<>
    <p><b>{v.players.pending.length} players</b> read from the sources below — names exactly as the source writes them{v.players.pending.some(p=>p.years)?'':', no positions or years yet'}. Untick anyone who is wrong.</p>
    <ul className="launch-people">{shown.map(p=><li key={p.id}><label><input type="checkbox" checked={!skip.has(p.id)} onChange={e=>{const n=new Set(skip);e.target.checked?n.delete(p.id):n.add(p.id);setSkip(n)}}/><bdi>{p.name}</bdi>{p.years&&<small>{p.years}</small>}</label>{p.sourceUrl&&<a href={p.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Source for ${p.name}`}>source ↗</a>}</li>)}</ul>
    {v.players.pending.length>12&&<button className="desk-btn ghost min-h-tap" onClick={()=>setShowAll(!showAll)}>{showAll?'Show fewer':`Show all ${v.players.pending.length}`}</button>}
    {v.sourcesToReview.length>0&&<p className="desk-fine">Approving also records that you reviewed: {v.sourcesToReview.map((s,i)=><span key={s.id}>{i?', ':''}<a href={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a></span>)}.</p>}
    <button className="desk-btn min-h-tap" disabled={api.busy||!chosen.length} onClick={async()=>{if(await api.post('launch/approve-players',{clubId,version:v.version,ids:chosen.map(p=>p.id)},`${chosen.length} players approved.`)){setSkip(new Set());await after()}}}>Approve {chosen.length} players</button>
   </>}
   {(v.players.approved>0||v.players.rejected>0)&&<p className="desk-fine">{v.players.approved} approved · {v.players.rejected} rejected. Individual decisions: <Link href={`/master/admin?section=clubs&club=${clubId}&view=evidence`}>Evidence</Link>.</p>}
  </section>

  <section className="desk-sub launch-step" aria-labelledby="l3"><h2 id="l3">3 · Build game data</h2>
   {v.pack.kind==='repository'?<p>This club plays from its reviewed repository pack — it is already built.</p>:<>
    <p>{v.pack.kind==='desk'?<>Built {v.pack.builtAt!.slice(0,16).replace('T',' ')} with <b>{v.pack.players}</b> players.{v.pack.stale?' Your approvals changed since — build again.':' Up to date.'}</>:'Not built yet.'}</p>
    <button className="desk-btn min-h-tap" disabled={api.busy||v.players.approved===0||(v.pack.kind==='desk'&&!v.pack.stale)} onClick={async()=>{const r=await api.post<LaunchView>('launch/build',{clubId},'Game data built. The list below shows what it opens.');if(r){setV(r);await onChange()}}}>{v.pack.kind==='desk'?'Rebuild game data':'Build game data'}</button>
    <p className="desk-fine">Turns your approved rows into the club’s game data. The same checks as every club decide what is playable — nothing is opened yet.</p>
   </>}
  </section>

  <section className="desk-sub launch-step" aria-labelledby="l4"><h2 id="l4">4 · What can open, what is missing</h2>
   {playable.length>0?<ul className="launch-gates" data-kind="open">{playable.map(g=><li key={g.number}><b>{g.number}. {g.name}</b> <span>{g.openNow?'open to players':g.state==='READY'?'ready':'short round'}</span><small>{g.eligible}{g.target?` / ${g.target}`:''}</small></li>)}</ul>:<p>No game has enough data yet.</p>}
   <details className="launch-missing"><summary>{closed.length} games still need data — what each one needs</summary><ul>{closed.map(g=><li key={g.number}><b>{g.number}. {g.name}</b> — {g.missing||'more data'}<br/><small>How: {g.how}</small></li>)}</ul></details>
   <div className="launch-open">
    {v.canOpen.length>0?<><button className="desk-btn min-h-tap" disabled={api.busy} onClick={async()=>{if(await api.post('clubs/open-playable',{id:clubId,version:v.version,reason:'Opened from Launch'},`${v.name} is open to players.`))await after()}}>Open {v.name} to players · {v.canOpen.length} game{v.canOpen.length===1?'':'s'}</button><p className="desk-fine">Sets the club live with every playable game switched on. You can pause it any time in Readiness.</p></>
     :playable.length&&playable.every(g=>g.openNow)?<p>Open to players. <a href={`/clubs/${clubId}`} target="_blank" rel="noreferrer">See the club page ↗</a></p>:null}
   </div>
  </section>

  <section className="desk-sub launch-step" aria-labelledby="l5"><h2 id="l5">LIFE</h2><p>{v.life.text}</p></section>
 </div>
}
