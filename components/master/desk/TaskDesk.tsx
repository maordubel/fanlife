'use client'
import Link from 'next/link'
import {useMemo,useState} from 'react'
import type {DeskView,Task,TaskArea,Decision} from '@/lib/master/crm/tasks'

type Tab='now'|'blocking'|'snoozed'|'dismissed'|'cleared'
const AREA:Record<TaskArea,string>={system:'System',clubs:'Clubs',research:'Research',players:'Players',games:'Games',market:'Market',community:'Community'}
const STAMP=['','Fix first','To do','When you have time'] as const
/** one click to put a task off: the reason is one of these (the server keeps a reason on every decision; the owner is not asked to type one) */
const PRESETS={snooze:['Not now','I am on it','Waiting for someone'],dismiss:['Not important','Already handled','This is fine as it is']} as const
const when=(iso:string|null)=>iso?new Date(iso).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):''

/**
 * The task desk (CRM 1 §5.1): the first screen of the control room answers "what needs me?" in one look. Counts come from
 * the detectors' own answer — never a total typed somewhere. Each row opens the one screen that resolves it; snoozing and
 * dismissing ask for a reason, and a dismissal holds only while the evidence is unchanged.
 */
export function TaskDesk({initial,scope,players}:{initial:DeskView;scope:string|null;players:'ok'|'unavailable'}){
 const [view,setView]=useState(initial),[tab,setTab]=useState<Tab>('now'),[area,setArea]=useState<TaskArea|'all'>('all')
 const [all,setAll]=useState(false),[busy,setBusy]=useState<string|null>(null),[err,setErr]=useState<string|null>(null),[asking,setAsking]=useState<{key:string;op:'snooze'|'dismiss'}|null>(null)
 const scoped=<T extends {club:string|null}>(xs:T[])=>scope?xs.filter(t=>t.club===scope||t.club===null):xs
 const rows=useMemo(()=>{
  const base:(Task&{decision?:Decision})[]=tab==='snoozed'?view.snoozed:tab==='dismissed'?view.dismissed:tab==='blocking'?view.open.filter(t=>t.priority===1):tab==='now'?view.open:[]
  return scoped(base).filter(t=>area==='all'||t.area===area)
 },[view,tab,area,scope])
 // 'worth a look' can run long: the first five show, the rest wait behind one button (blocking and decisions always show)
 const LOOK=5,looks=rows.filter(t=>t.priority===3),hidden=tab==='now'&&!all?Math.max(0,looks.length-LOOK):0
 const shown=hidden?rows.filter(t=>t.priority!==3||looks.indexOf(t)<LOOK):rows // eslint-disable-line react-hooks/exhaustive-deps
 const areas=useMemo(()=>[...new Set(scoped(view.open).map(t=>t.area))].sort(),[view,scope]) // eslint-disable-line react-hooks/exhaustive-deps
 const act=async(body:Record<string,unknown>)=>{
  setBusy(String(body.key));setErr(null)
  try{const r=await fetch('/api/master/crm/task',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'The decision was not saved.');setView(d as DeskView);setAsking(null)}
  catch(e){setErr(e instanceof Error?e.message:'The decision was not saved.')}finally{setBusy(null)}
 }
 const c=view.counts
 const TABS:[Tab,string,number][]=[['now','To do',scoped(view.open).length],['blocking','Fix first',scoped(view.open).filter(t=>t.priority===1).length],['snoozed','Later',scoped(view.snoozed).length],['dismissed','Not important',scoped(view.dismissed).length],['cleared','Done',view.cleared.length]]
 return <section className="crm-desk" aria-labelledby="desk-tasks-h">
  <h2 id="desk-tasks-h" className="sr-only">Tasks</h2>
  <dl className="crm-strip">
   <div data-tone="hot"><dt>Fix first</dt><dd>{c.blocking}</dd></div>
   <div data-tone="navy"><dt>To do</dt><dd>{c.decide}</dd></div>
   <div><dt>When you have time</dt><dd>{c.look}</dd></div>
   <div data-tone="muted"><dt>Later</dt><dd>{c.snoozed}</dd></div>
  </dl>
  {players==='unavailable'?<p className="desk-state desk-state-slim" data-state="unconnected"><b>Player reports unavailable.</b> Player tasks are not shown — that is not the same as none.</p>:null}
  <div className="crm-filters">
   <div role="tablist" aria-label="Which tasks">{TABS.map(([k,l,n])=><button key={k} role="tab" type="button" aria-selected={tab===k} className="pcc-chip min-h-tap" onClick={()=>setTab(k)}>{l}<span className="crm-n">{n}</span></button>)}</div>
   {tab!=='cleared'&&areas.length>1?<label className="crm-area">Area <select value={area} onChange={e=>setArea(e.target.value as TaskArea|'all')}><option value="all">All areas</option>{areas.map(a=><option key={a} value={a}>{AREA[a]}</option>)}</select></label>:null}
  </div>
  {err?<p role="alert" className="desk-state" data-state="error">{err}</p>:null}
  {tab==='cleared'?(view.cleared.length?<ol className="crm-cleared">{view.cleared.map(x=><li key={x.key}><span className="desk-stamp" data-ok>Done</span><span><b>{x.key}</b><small>Fixed: its check no longer finds the problem. You had put it {x.decision.state==='snoozed'?'off until later':'aside'} on {when(x.decision.at)}: “{x.decision.reason}”.</small></span></li>)}</ol>:<p className="desk-state" data-state="empty">Nothing here yet. A task moves here by itself once the problem is fixed.</p>):
  rows.length===0?<div className="desk-state" data-state="ok"><b>{tab==='now'?'All done. Nothing needs you right now.':tab==='blocking'?'Nothing urgent.':'Nothing here.'}</b></div>:
  <><ol className="crm-tasks">{shown.map(t=><li key={t.key} data-priority={t.priority}>
   <span className="desk-stamp">{STAMP[t.priority]}</span>
   <div className="crm-task-body">
    <p className="crm-task-meta"><span>{AREA[t.area]}</span>{t.clubName?<><span aria-hidden="true">·</span><bdi>{t.clubName}</bdi></>:<><span aria-hidden="true">·</span>Whole app</>}{t.decision?<><span aria-hidden="true">·</span>{t.decision.state==='snoozed'?`until ${when(t.decision.until)}`:`set aside ${when(t.decision.at)}`}</>:null}</p>
    <h3>{t.title}</h3><p>{t.reason}</p>
    {t.decision?<p className="crm-why">Your note: “{t.decision.reason}”</p>:null}
    {asking?.key===t.key?<TaskAsk op={asking.op} busy={busy===t.key} onCancel={()=>setAsking(null)} onSend={(reason,days)=>act({op:asking.op,key:t.key,reason,days})}/>:null}
   </div>
   <div className="crm-task-act">
    <Link className="desk-btn min-h-tap" href={t.href}>{t.cta} →</Link>
    {t.decision?<button type="button" className="desk-btn ghost min-h-tap" disabled={busy===t.key} onClick={()=>act({op:'restore',key:t.key})}>Bring it back</button>:
     t.priority!==1||t.area!=='system'?<span className="crm-later"><button type="button" className="pcc-link min-h-tap" onClick={()=>setAsking({key:t.key,op:'snooze'})}>Later</button><button type="button" className="pcc-link min-h-tap" onClick={()=>setAsking({key:t.key,op:'dismiss'})}>Not important</button></span>:null}
   </div>
  </li>)}</ol>{hidden?<p className="crm-more"><button type="button" className="desk-btn ghost" onClick={()=>setAll(true)}>Show {hidden} more worth a look</button></p>:null}</>}
 </section>
}

function TaskAsk({op,busy,onCancel,onSend}:{op:'snooze'|'dismiss';busy:boolean;onCancel:()=>void;onSend:(reason:string,days?:number)=>void}){
 const [reason,setReason]=useState(''),[days,setDays]=useState(7)
 return <form className="crm-ask" onSubmit={e=>{e.preventDefault();onSend(reason,op==='snooze'?days:undefined)}}>
  <p>{op==='snooze'?'Hide it for a while. It comes back by itself.':'Hide it. It comes back only if something changes.'}</p>
  {op==='snooze'?<fieldset><legend className="sr-only">For how long</legend>{[1,3,7,30].map(d=><label key={d} className="pcc-chip" data-on={days===d||undefined}><input type="radio" name="days" className="sr-only" checked={days===d} onChange={()=>setDays(d)}/>{d===1?'1 day':`${d} days`}</label>)}</fieldset>:null}
  <p className="desk-actions">{PRESETS[op].map(r=><button key={r} type="button" className="desk-btn min-h-tap" disabled={busy} onClick={()=>onSend(r,op==='snooze'?days:undefined)}>{r}</button>)}</p>
  <label className="crm-reason">Or write your own <input value={reason} onChange={e=>setReason(e.target.value)} maxLength={300}/></label>
  <p className="desk-actions"><button className="desk-btn ghost min-h-tap" disabled={busy||!reason.trim()}>{busy?'Saving…':'Save'}</button><button type="button" className="desk-btn ghost min-h-tap" onClick={onCancel}>Cancel</button></p>
 </form>
}
