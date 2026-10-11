'use client'
import {useCallback,useEffect,useState} from 'react'
import {useAdminApi} from './adminApi'

type Status={
 policy:{autoPublish:boolean;paused:boolean;sources:Record<string,{sourceId:string;enabled:boolean;certified:boolean;autoPublish:boolean}>;clubs:Record<string,{autoPublish:boolean}>}
 durable:boolean;runs:{at:string;state:string;counts:Record<string,number>;note:string}[]
 perClub:Record<string,Record<string,number>>
 rows:{id:string;clubId:string;status:string;issues:string[];minute:string|null;scorerAlias:string|null;playedOn:string|null;quote:string;url:string;steps:number}[]
 published:{goalId:string;title:string;clubId:string;state:string;publishedAt:string;source:string|null}[]
 events:{at:string;actor:string;kind:string;goalId:string;detail:string}[];issueText:Record<string,string>
}
const WORD:Record<string,string>={candidate:'Goal found (no move)',sequence_candidate:'Move read',ready_for_review:'Ready for your review',auto_publishable:'Can publish itself',held:'Held',published:'Published',rolled_back:'Rolled back'}

/**
 * Goals automation (spec 11.10.2026): what the daily pass found, why anything is held in plain words, and the switches.
 * Everything defaults to off. Nothing here can publish past a failed check — the server runs the gate again.
 */
export function GoalsAutomation(){
 const api=useAdminApi(),{get}=api,[s,setS]=useState<Status|null>(null),[filter,setFilter]=useState('all'),[open,setOpen]=useState<string|null>(null)
 const load=useCallback(async()=>{const r=await get<Status>('goals/status');if(r)setS(r)},[get])
 useEffect(()=>{void load()},[load])
 const act=async(data:Record<string,unknown>,msg:string)=>{if(await api.post('goals',data,msg))await load()}
 if(!s)return <section className="desk-sub" aria-labelledby="goals-h"><h2 id="goals-h">Goals automation</h2><p className="desk-fine">{api.error||'Loading…'}</p></section>
 const clubs=Object.keys(s.perClub),total=(st:string)=>clubs.reduce((n,c)=>n+(s.perClub[c]![st]??0),0)
 const last=s.runs[0],rows=s.rows.filter(r=>filter==='all'||r.status===filter)
 return <section className="desk-sub" aria-labelledby="goals-h">
  <h2 id="goals-h">Goals automation</h2>
  <p className="desk-fine">Reads the pages the research engine already stored — it makes no requests of its own. A goal becomes playable only if its move is written down with places, quoted from the source, and passes the same checks as the curated goals.</p>
  <ul className="desk-rows">
   <li><span className="desk-stamp">{last?last.state:'never run'}</span><div><b>Last pass</b><p>{last?`${last.at.slice(0,16).replace('T',' ')} · ${last.note}`:'No pass yet.'}</p></div></li>
   <li><span className="desk-stamp">{total('candidate')+total('sequence_candidate')+total('ready_for_review')+total('held')+total('auto_publishable')+total('published')}</span><div><b>Goals found</b><p>{total('ready_for_review')} ready for review · {total('held')} held · {total('published')} published · {total('candidate')} without a move</p></div></li>
   <li data-durable={s.durable}><span className="desk-stamp">{s.durable?'Durable':'Not durable'}</span><div><b>Storage</b><p>{s.durable?'Published goals survive restarts.':'No durable store is connected, so nothing can publish itself. Connect Vercel Blob first.'}</p></div></li>
  </ul>
  <p className="desk-actions">
   <button type="button" className="desk-btn min-h-tap" disabled={api.busy} onClick={()=>act({op:'run'},'Pass finished.')}>Run one safe pass now</button>
   <button type="button" className="desk-btn ghost min-h-tap" disabled={api.busy} onClick={()=>act({op:'pause',on:!s.policy.paused},s.policy.paused?'Resumed.':'Paused.')}>{s.policy.paused?'Resume the pipeline':'Pause the pipeline'}</button>
   <button type="button" className="desk-btn ghost min-h-tap" aria-pressed={s.policy.autoPublish} disabled={api.busy} onClick={()=>act({op:'global',on:!s.policy.autoPublish},'Saved.')}>Automatic publishing: {s.policy.autoPublish?'ON':'off'}</button>
  </p>
  {api.error&&<p role="alert" className="desk-err">{api.error}</p>}{api.notice&&<p role="status" className="desk-fine">{api.notice}</p>}
  <label className="desk-picker">Show<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Everything</option>{Object.entries(WORD).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
  {rows.length===0?<p className="desk-fine">Nothing here yet. Run a pass after a club&apos;s pages were collected.</p>:
   <ul className="desk-rows">{rows.map(r=><li key={r.id}><span className="desk-stamp">{WORD[r.status]??r.status}</span><div>
    <b><bdi>{r.scorerAlias||'Scorer not read'}</bdi> · minute {r.minute??'?'} · {r.playedOn??'date not found'}</b>
    <p>{r.steps} touches read{r.issues.length?` · ${r.issues.map(i=>s.issueText[i]||i).slice(0,2).join(' ')}`:''}</p>
    <p className="desk-actions"><button type="button" className="desk-btn ghost min-h-tap" aria-expanded={open===r.id} onClick={()=>setOpen(open===r.id?null:r.id)}>Source paragraph</button>
     {(r.status==='ready_for_review'||r.status==='auto_publishable')&&<button type="button" className="desk-btn min-h-tap" disabled={api.busy} onClick={()=>act({op:'approve',club:r.clubId,id:r.id},'Published.')}>Approve and publish</button>}
     {r.status!=='published'&&r.status!=='held'&&<button type="button" className="desk-btn ghost min-h-tap" disabled={api.busy} onClick={()=>act({op:'hold',club:r.clubId,id:r.id},'Held.')}>Hold</button>}</p>
    {open===r.id&&<blockquote lang="auto" dir="auto" className="desk-fine">{r.quote}{r.url&&<> — <a href={r.url} target="_blank" rel="noopener noreferrer">source ↗</a></>}</blockquote>}
   </div></li>)}</ul>}
  {s.published.length>0&&<><h3 className="desk-sub-h">Published by the pipeline</h3><ul className="desk-rows">{s.published.map(p=><li key={p.goalId}><span className="desk-stamp">{p.state==='published'?'Live':'Rolled back'}</span><div><b><bdi>{p.title}</bdi></b><p>{p.publishedAt.slice(0,10)}{p.source&&<> · <a href={p.source} target="_blank" rel="noopener noreferrer">source ↗</a></>}</p>
   {p.state==='published'&&<button type="button" className="desk-btn ghost min-h-tap" disabled={api.busy} onClick={()=>act({op:'rollback',id:p.goalId,reason:'owner rollback'},'Rolled back.')}>Roll back</button>}</div></li>)}</ul></>}
  {s.events.length>0&&<details className="desk-more"><summary>Publication log ({s.events.length})</summary><ul className="desk-rows">{s.events.map((e,i)=><li key={i}><span className="desk-stamp">{e.kind}</span><div><p>{e.at.slice(0,16).replace('T',' ')} · {e.actor} · {e.detail}</p></div></li>)}</ul></details>}
 </section>
}
