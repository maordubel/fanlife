'use client'
import Link from 'next/link'
import {useState} from 'react'
import {useAdminApi} from '../adminApi'
import {deskHref} from '@/lib/master/attention'
import {gateName,stepText,type Desk,type DeskClub,type DeskGate} from '@/lib/research/desk-model'
import type {GateKey} from '@/lib/clubs/gates'

type Api=ReturnType<typeof useAdminApi>
const MARK:Record<DeskGate['state'],string>={open:'Open to fans',ready:'Ready to open',soon:'Opens on your approval',closed:'Needs research'}

/** Thirteen holes, one per gate: punched = open to fans, ringed = ready, dashed = opens on a yes, faint = needs research. */
function Punch({club}:{club:DeskClub}){
 const n=(s:DeskGate['state'])=>club.gates.filter(g=>g.state===s).length
 return <ol className="rdesk-punch" aria-label={`${club.name}: ${n('open')} open, ${n('ready')} ready, ${n('soon')} open on your approval, ${n('closed')} need research`}>
  {club.gates.map(g=><li key={g.key} data-g={g.state} title={`${g.number} ${g.name} — ${MARK[g.state]}${g.target?` (${g.eligible}/${g.target})`:''}`}><span aria-hidden="true">{g.number}</span></li>)}
 </ol>
}
const Gates=({keys}:{keys:GateKey[]})=><ul className="rdesk-tags">{keys.map(k=><li key={k}>{gateName(k)}</li>)}</ul>

function Slip({club,api,onSkip}:{club:DeskClub;api:Api;onSkip:()=>void}){
 const s=club.step,[other,setOther]=useState('')
 const approve=(b:{id:string;hash:string;title:string})=>api.post('research/desk/decide',{op:'approve',clubId:club.id,batchId:b.id,hash:b.hash},`${club.name}: approved — ${b.title}.`)
 const rival=(name:string|null)=>api.post('research/desk/decide',{op:'rival',clubId:club.id,rival:name},name?`${club.name}: ${name} is the rival. The derby gate reads their meetings.`:`${club.name}: no rival for now.`)
 const open=async(gates:number[])=>{if(!window.confirm(`Open ${club.name} to fans with ${gates.length} gate${gates.length===1?'':'s'}? The games open at once; the crest, hub, LIFE, Rumble and the shared features follow by themselves within about an hour. You can switch any gate off later in Clubs.`))return;await api.post('clubs/open-playable',{id:club.id,version:club.version,reason:'Opened from the research desk'},`${club.name} is open to fans.`)}
 return <article className="rdesk-slip" data-kind={s.kind} aria-labelledby={`slip-${club.id}`}>
  <header><p className="rdesk-slip-kick">{s.kind==='open'?'Ready to open':s.kind==='rival'?'One question':s.kind==='opening'?(s.state==='failed'?'Opening stopped':'Opening'):'Waiting for your yes'}</p>
   <h3 id={`slip-${club.id}`}><bdi>{club.name}</bdi><small>{club.country}</small></h3></header>
  <Punch club={club}/>
  <p className="rdesk-say">{stepText(club)}</p>
  {s.kind==='approve'&&<>
   {s.opens.length>0&&<Gates keys={s.opens}/>}
   <p className="desk-fine">{s.batch.detail}{s.batch.held?` ${s.batch.held} more are held back because a source marks a conflict — they stay in review.`:''}</p>
   <details className="rdesk-see"><summary className="min-h-tap">See five of them</summary>
    <ul>{s.batch.sample.map(x=><li key={x.label}><bdi>{x.label}</bdi>{x.url&&<> · <a href={x.url} target="_blank" rel="noreferrer">source ↗</a></>}</li>)}</ul></details>
   <p className="desk-actions"><button type="button" className="desk-btn min-h-tap rdesk-yes" disabled={api.busy} onClick={()=>void approve(s.batch)}>Yes — approve {s.batch.count}</button>
    <button type="button" className="desk-btn ghost min-h-tap" disabled={api.busy} onClick={onSkip}>Not now</button></p>
  </>}
  {s.kind==='changed'&&<p className="desk-actions"><button type="button" className="desk-btn min-h-tap rdesk-yes" disabled={api.busy} onClick={()=>void approve(s.batch)}>Approve the new version</button>
   <button type="button" className="desk-btn ghost min-h-tap" disabled={api.busy} onClick={()=>void api.post('research/desk/decide',{op:'undo',clubId:club.id,batchId:s.batch.id},`${club.name}: approval withdrawn.`)}>Withdraw my yes</button></p>}
  {s.kind==='rival'&&<>
   <ul className="rdesk-rivals">{s.candidates.map(c=><li key={c.name}><button type="button" className="min-h-tap" disabled={api.busy} onClick={()=>void rival(c.name)}><b><bdi>{c.name}</bdi></b><small>{c.meetings} meetings on record</small></button></li>)}</ul>
   {s.others.length>0&&<p className="rdesk-other"><label>Someone else<select className="min-h-tap" value={other} onChange={e=>setOther(e.target.value)}><option value="">Choose…</option>{s.others.map(o=><option key={o} value={o}>{o}</option>)}</select></label>
    <button type="button" className="desk-btn min-h-tap" disabled={api.busy||!other} onClick={()=>void rival(other)}>Make it the rival</button></p>}
   <p className="desk-fine">The list is the clubs {club.name} met most in its own records — the choice is yours. </p>
   <p className="desk-actions"><button type="button" className="desk-btn ghost min-h-tap" disabled={api.busy} onClick={onSkip}>Not now</button></p>
  </>}
  {s.kind==='open'&&<p className="desk-actions"><button type="button" className="desk-btn min-h-tap rdesk-yes" disabled={api.busy} onClick={()=>void open(s.gates)}>{club.status==='live'?`Switch on ${s.gates.length} gate${s.gates.length===1?'':'s'}`:`Open ${club.name} to fans`}</button>
   <Link className="desk-btn ghost min-h-tap" href={`/clubs/${club.id}`} target="_blank">Preview the club ↗</Link></p>}
  {s.kind==='opening'&&<p className="desk-actions">{s.state==='failed'&&<button type="button" className="desk-btn min-h-tap rdesk-yes" disabled={api.busy} onClick={()=>void api.post('research/desk/decide',{op:'retry-opening',clubId:club.id},`${club.name}: the opening runs again within the hour.`)}>Try again</button>}
   {s.pr&&<a className="desk-btn ghost min-h-tap" href={`https://github.com/maordubel/fanlife/pull/${s.pr}`} target="_blank" rel="noreferrer">What changed ↗</a>}
   <Link className="desk-btn ghost min-h-tap" href={`/clubs/${club.id}`} target="_blank">See the club ↗</Link></p>}
 </article>
}

function Decisions({club,api}:{club:DeskClub;api:Api}){
 const done=club.batches.filter(b=>b.state!=='waiting')
 if(!done.length&&!club.rival.chosen)return null
 return <details className="rdesk-decided"><summary className="min-h-tap">Your decisions ({done.length+(club.rival.chosen?1:0)})</summary><ul>
  {done.map(b=><li key={b.id}><span>{b.state==='changed'?'Changed since your yes — ':'Approved — '}{b.title}</span><button type="button" className="desk-btn ghost min-h-tap" disabled={api.busy} onClick={()=>void api.post('research/desk/decide',{op:'undo',clubId:club.id,batchId:b.id},`${club.name}: approval withdrawn.`)}>Undo</button></li>)}
  {club.rival.chosen&&<li><span>Rival — <bdi>{club.rival.chosen}</bdi></span><button type="button" className="desk-btn ghost min-h-tap" disabled={api.busy} onClick={()=>void api.post('research/desk/decide',{op:'rival',clubId:club.id,rival:null},`${club.name}: rival cleared.`)}>Undo</button></li>}
 </ul></details>
}

export function ResearchDeskView({desk}:{desk:Desk}){
 const api=useAdminApi(),[skipped,setSkipped]=useState<Set<string>>(new Set())
 const waiting=desk.waiting.filter(c=>!skipped.has(c.id)),later=desk.waiting.filter(c=>skipped.has(c.id))
 const skip=(id:string)=>setSkipped(new Set([...skipped,id]))
 return <div className="desk-content rdesk" data-testid="research-desk">
  <header className="desk-head rdesk-head">
   <p className="desk-kicker">Research · the scouting board</p>
   <h1 className="desk-h1">New clubs, one yes at a time</h1>
   <p className="desk-fine">Collection runs every morning by itself. What it brings back waits here for you — each card says what a yes opens before you press it. Nothing reaches fans until you open the club.</p>
   <dl className="rdesk-index">
    <div data-hot={desk.kpis.waiting>0||undefined}><dt>On your desk</dt><dd>{desk.kpis.waiting}</dd></div>
    <div><dt>New clubs in line</dt><dd>{desk.kpis.inLine}</dd></div>
    <div><dt>Gates they can open</dt><dd>{desk.kpis.couldOpen}</dd></div>
    <div><dt>Gates open to fans</dt><dd>{desk.kpis.gatesOpen}</dd></div>
   </dl>
  </header>
  <p className="sr-only" aria-live="polite">{api.notice}</p>
  {api.notice&&<p className="desk-state" data-state="ok" role="status">{api.notice}</p>}
  {api.error&&<p className="desk-state" data-state="error" role="alert">{api.error}</p>}
  <div className="rdesk-grid">
   <section className="rdesk-desk" aria-labelledby="rd-desk-h">
    <h2 id="rd-desk-h">On your desk</h2>
    {waiting.length?<div className="rdesk-slips">{waiting.map(c=><Slip key={c.id} club={c} api={api} onSkip={()=>skip(c.id)}/>)}</div>
     :<p className="desk-state" data-state="empty">{later.length?`You set ${later.length} aside for now.`:'Nothing waits for you. The morning run will bring the next batch here.'}</p>}
    {later.length>0&&<p className="desk-actions"><button type="button" className="desk-btn ghost min-h-tap" onClick={()=>setSkipped(new Set())}>Show the {later.length} set aside</button></p>}
   </section>
   <section className="rdesk-line" aria-labelledby="rd-line-h">
    <h2 id="rd-line-h">The line — new clubs</h2>
    <p className="rdesk-legend" aria-hidden="true"><i data-g="open"/>Open<i data-g="ready"/>Ready<i data-g="soon"/>On your yes<i data-g="closed"/>Needs research</p>
    <ol className="rdesk-rows">{desk.line.map(c=><li key={c.id} className="rdesk-row">
     <div className="rdesk-row-head"><h3><bdi>{c.name}</bdi></h3><span className="desk-stamp" data-ok={c.status==='live'||undefined}>{c.status==='live'?'Open':`${c.playable}/13 playable · ${c.potential} possible`}</span></div>
     <Punch club={c}/>
     <p className="rdesk-row-say">{c.collection.uefaMatches} UEFA ties · {c.collection.historyMatches} league results on file{c.collection.alarm?<><br/><b>{c.collection.alarm}</b></>:null}</p>
     {c.step.kind==='opening'&&<p className="rdesk-row-say"><b>{stepText(c)}</b></p>}
     <Decisions club={c} api={api}/>
    </li>)}</ol>
   </section>
  </div>
  <section className="desk-sub rdesk-open" aria-labelledby="rd-open-h">
   <h2 id="rd-open-h">Open clubs — what would make them better</h2>
   <ol className="rdesk-rows rdesk-open-rows">{desk.open.map(c=><li key={c.id} className="rdesk-row">
    <div className="rdesk-row-head"><h3><Link href={deskHref('clubs',{club:c.id})}><bdi>{c.name}</bdi></Link></h3><span className="desk-stamp" data-ok={c.gates.every(g=>g.state==='open')||undefined}>{c.openNow}/13 open</span></div>
    <Punch club={c}/>
    {c.improve.length?<ul className="rdesk-improve">{c.improve.slice(0,3).map(g=><li key={g.key}><b>{g.number} {g.name}</b> <span>{g.eligible}/{g.target}</span> — {g.what} <em data-auto={g.auto||undefined}>{g.auto?'Grows by itself':'Needs a new source'}</em></li>)}</ul>:<p className="rdesk-row-say">Every gate is full.</p>}
   </li>)}</ol>
  </section>
  {desk.health.length>0&&<section className="desk-sub" aria-labelledby="rd-health-h"><h2 id="rd-health-h">Collection health</h2><ul className="rdesk-health">{desk.health.map(t=><li key={t}>{t}</li>)}</ul></section>}
  <details className="desk-more rdesk-how"><summary className="min-h-tap">How this works</summary><ol>
   <li><b>Every morning</b> the pull reads UEFA (newest ties, 30 older ones it does not hold yet, and positions for 20 it does) and measures every club.</li>
   <li><b>Your yes</b> on a card promotes exactly that material, as it stood when you saw it. If it changes later, it waits for a new yes. Anything a source marks as a conflict stays out.</li>
   <li><b>The rival</b> is your choice from the clubs a club met most; it opens the derby gate.</li>
   <li><b>Open</b> switches on every gate that can be played, and the club appears for fans. Undo any decision from the line.</li>
  </ol></details>
 </div>
}
