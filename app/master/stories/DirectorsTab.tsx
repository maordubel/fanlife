'use client'
import {useRef,useState} from 'react'
import {DIRECTORS,HOUSE_SOUL,type Director} from '@/lib/stories/directors'
import type {Pitch,PitchDay} from '@/lib/stories/pitches'
import {PREVIEW_HOUR,type Setting} from '@/lib/stories/autopilot'
import {directorsBanner,type Facts} from '@/lib/stories/banners'
import {DeskBanner} from './desk'
import {api} from './stories-desk'
import css from './studio.module.css'

/**
 * The three directors (docs/fanlife/66 §5) and what each wants to make next (studio/pitch.py). Above them, the house
 * soul they all share (studio/soul.py). "Make this film" produces the whole documentary in one click, written by the
 * pitching director; "Pass" sets the pitch aside. "Ask for new pitches" is a request the listener picks up.
 */
const KIND_TEXT={match:'One match',tie:'A tie or a run',season:'A whole season',rivalry:'A rivalry'} as const
type Dated=Pitch&{date:string}
export function DirectorsTab({facts,days,autopilot,onChange}:{facts:Facts;days:PitchDay[]|null;autopilot?:Setting|null;onChange:()=>Promise<void>}){
 const [busy,setBusy]=useState(false),[err,setErr]=useState(''),[msg,setMsg]=useState('')
 const all:Dated[]=(days??[]).flatMap(d=>d.rounds.slice().reverse().flatMap(r=>r.pitches.map(p=>({...p,date:d.date}))))
 async function ask(){
  setBusy(true);setErr('');setMsg('')
  try{await api('/api/master/stories/pitches',{method:'POST',body:JSON.stringify({action:'request'})});setMsg('Asked. The listener starts the round within about a minute; the pitches arrive here a few minutes later.');await onChange()}
  catch(e){setErr(e instanceof Error?e.message:'Could not ask.')}finally{setBusy(false)}
 }
 return <>
  <DeskBanner b={directorsBanner(facts)}/>
  <section className={`${css.panel} ${css.soul}`} aria-labelledby="soul-h">
   <div className={css.bar}><span id="soul-h">The house soul</span><span>Every director shares it</span></div>
   <div className={css.body}>
    <p className={css.soulWho}>{HOUSE_SOUL.who}</p>
    <div className={css.soulCols}>
     <div><h3 className={css.h3}>What football is to us</h3><ul className={css.soulList}>{HOUSE_SOUL.feels.map(x=><li key={x}>{x}</li>)}</ul></div>
     <div><h3 className={css.h3}>What we demand</h3><ul className={css.soulList}>{HOUSE_SOUL.demands.map(x=><li key={x}>{x}</li>)}</ul></div>
    </div>
   </div>
  </section>
  <AutopilotSwitch setting={autopilot} onChange={onChange}/>
  <div className={css.actions}>
   <button type="button" className={`${css.btn} ${css.btnRed} min-h-tap`} disabled={busy} onClick={()=>void ask()}>{busy?'Asking…':'Ask for new pitches'}</button>
  </div>
  {err&&<p role="alert" className={css.alert}>{err}</p>}{msg&&<p role="status" className={`${css.alert} ${css.ok}`}>{msg}</p>}
  {days===null&&<p className={css.alert}>Not connected — the pitches could not be read.</p>}
  <div className={css.directors}>{DIRECTORS.map(d=><DirectorCard key={d.id} d={d} pitches={all.filter(p=>p.director===d.id)} onChange={onChange}/>)}</div>
 </>
}

function DirectorCard({d,pitches,onChange}:{d:Director;pitches:Dated[];onChange:()=>Promise<void>}){
 const latest=pitches.find(p=>p.state==='open')??null
 const earlier=pitches.filter(p=>p!==latest).slice(0,8)
 return <article className={`${css.panel} ${css.director}`} aria-labelledby={`dir-${d.id}`}>
  <div className={css.bar}><span id={`dir-${d.id}`}>{d.name}</span><span>Director</span></div>
  <div className={css.body}>
   <p className={css.tagline}>{d.tagline}</p>
   <p className={css.facet}>{d.owner_facet}</p>
   <p className={css.hint}>Likes to pitch: {d.pitch_taste}.</p>
   {latest?<PitchCard p={latest} onChange={onChange}/>:<p className={css.hint}>No open pitch. Ask for a new round, or wait for the morning one.</p>}
   {earlier.length?<details className={css.more}><summary>Earlier pitches</summary><ul className={css.checks}>{earlier.map(p=><li key={p.id}><b>{p.state==='made'?'Made':p.state==='passed'?'Passed':'Open'}</b> {p.title} — {p.club_name} · {p.date}</li>)}</ul></details>:null}
  </div>
 </article>
}

function PitchCard({p,onChange}:{p:Dated;onChange:()=>Promise<void>}){
 const [busy,setBusy]=useState(false),[err,setErr]=useState('')
 const key=useRef('')
 const event=p.kind==='rivalry'?`${p.club_name} v ${p.opponent} · ${p.season}`:`${p.club_name} · ${KIND_TEXT[p.kind]} · ${p.season}`
 async function act(action:'make'|'pass'){
  setBusy(true);setErr('')
  if(action==='make'&&!key.current)key.current=crypto.randomUUID()
  try{await api('/api/master/stories/pitches',{method:'POST',body:JSON.stringify({action,date:p.date,id:p.id,idempotencyKey:action==='make'?key.current:undefined})});key.current='';await onChange()}
  catch(e){setErr(e instanceof Error?e.message:'Failed')}finally{setBusy(false)}
 }
 return <div className={css.pitch}>
  <p className={css.kicker2}>His pitch · {p.date}</p>
  <h4>{p.title}</h4>
  <p className={css.meta}>{event}</p>
  <p className={css.hook}>{p.logline}</p>
  {p.cold_open&&<p className={css.opening}><b>Cold open.</b> {p.cold_open}</p>}
  <ol className={css.chapters}>{p.acts.map((a,i)=><li key={i}>{a}</li>)}</ol>
  {p.why&&<p className={css.hint}>Why now: {p.why}</p>}
  <div className={css.actions}>
   <button type="button" className={`${css.btn} ${css.btnRed} min-h-tap`} disabled={busy} onClick={()=>void act('make')}>Make this film</button>
   <button type="button" className={`${css.btn} min-h-tap`} disabled={busy} onClick={()=>void act('pass')}>Pass</button>
  </div>
  {err&&<p role="alert" className={css.alert}>{err}</p>}
 </div>
}

/** THE switch of the autopilot (lib/stories/autopilotStore.ts): one on/off, one line saying what it does. Off until the
 *  owner turns it on; `undefined` = still loading, `null` = the switch could not be read (shown as such, never as off). */
function AutopilotSwitch({setting,onChange}:{setting?:Setting|null;onChange:()=>Promise<void>}){
 const [busy,setBusy]=useState(false),[err,setErr]=useState('')
 const on=setting?.on===true
 async function flip(){
  if(!on&&!confirm(`Turn the autopilot on? Every day it picks one pitch, makes the film and sends it to your Telegram at ${PREVIEW_HOUR}:00 Athens; two hours later it goes on unless you tap Cancel publishing.`))return
  setBusy(true);setErr('')
  try{await api('/api/master/stories/pitches',{method:'POST',body:JSON.stringify({action:'autopilot',on:!on})});await onChange()}
  catch(e){setErr(e instanceof Error?e.message:'Could not change the switch.')}finally{setBusy(false)}
 }
 return <section className={css.panel} aria-labelledby="auto-h">
  <div className={css.bar}><span id="auto-h">Autopilot</span><span>{setting===undefined?'…':setting===null?'Not connected':on?'On':'Off'}</span></div>
  <div className={css.body}>
   <p>One film a day by itself: the best pitch is picked, the film is made, and at {PREVIEW_HOUR}:00 Athens it reaches your Telegram with a <b>Cancel publishing</b> link — two hours later it is published unless you cancel.</p>
   <div className={css.actions}>
    <button type="button" role="switch" aria-checked={on} className={`${css.btn} ${on?'':css.btnRed} min-h-tap`} disabled={busy||!setting} onClick={()=>void flip()}>{busy?'Saving…':on?'Turn the autopilot off':'Turn the autopilot on'}</button>
   </div>
   <p className={css.hint}>{on?'On. Turning it off stops every pick, preview and publishing at once; a film already made stays in the studio.':'Off. Nothing is picked, sent or published by itself.'} The last step runs in the browser on your computer: once the two hours pass, the operator uploads the film to YouTube and Telegram sends you the link. The computer and the Claude app must be on; otherwise the film waits a day, then it is yours to upload.</p>
   {err&&<p role="alert" className={css.alert}>{err}</p>}
  </div>
 </section>
}
