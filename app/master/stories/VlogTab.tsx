'use client'
import {useRef,useState,type CSSProperties,type ReactNode} from 'react'
import {VLOG_MINUTES} from '@/lib/stories/jobs'
import {vlogBanner,type Facts} from '@/lib/stories/banners'
import {DeskBanner} from './desk'
import {api,dayOf,MatchPicker,Step,type Club,type Match} from './stories-desk'
import css from './studio.module.css'

/** VLOG · I WAS THERE (docs/fanlife/63): the match from the archive + the owner's Drive footage + a few notes → the
 *  worker surveys the footage, the free writer writes the episode, film.py cuts the film and the reel, Telegram gets both. */
const DRIVE=/drive\.google\.com\/(drive\/(u\/\d+\/)?folders|file\/d)\/[\w-]{10,}|^[\w-]{20,}$/
export function VlogTab({facts,clubs,onMade,children}:{facts:Facts;clubs:Club[];onMade:(id:string)=>Promise<void>;children:ReactNode}){
 const [club,setClub]=useState(''),[picked,setPicked]=useState<Match[]>([]),[drive,setDrive]=useState(''),[notes,setNotes]=useState('')
 const [minutes,setMinutes]=useState(4),[telegram,setTelegram]=useState(true),[busy,setBusy]=useState(false),[err,setErr]=useState(''),[msg,setMsg]=useState('')
 const key=useRef('')
 const c=clubs.find(x=>x.id===club),m=picked[0]
 const driveOk=DRIVE.test(drive.trim())
 const banner=vlogBanner(facts,{match:!!m,drive:driveOk})
 async function make(){
  if(!c||!m)return
  setBusy(true);setErr('');setMsg('')
  if(!key.current)key.current=crypto.randomUUID()
  try{const b=await api('/api/master/stories',{method:'POST',body:JSON.stringify({kind:'vlog',brief:{club_id:c.id,match_id:m.id,drive_folder:drive.trim(),notes,minutes,telegram},idempotencyKey:key.current})})
   key.current='';setMsg('Queued. The worker starts it within a few minutes; the episode takes about an hour.');await onMade(b.job.id)}
  catch(e){setErr(e instanceof Error?e.message:'Could not queue the episode.')}finally{setBusy(false)}
 }
 return <>
  <DeskBanner b={banner}/>
  <div className={css.grid}>
   <section className={`${css.panel} ${css.form}`} aria-labelledby="vlog-h">
    <div className={css.bar}><span id="vlog-h">I WAS THERE · a new episode</span><span>Your footage</span></div>
    <div className={css.body}>
     <Step n={1} title="Which club?">
      <div className={css.tiles}>{clubs.map(x=><button type="button" key={x.id} className={`${css.tile} min-h-tap`} aria-pressed={club===x.id} onClick={()=>{setClub(x.id);setPicked([])}} style={{'--c':x.primary,'--on':x.on} as CSSProperties}><span className={css.sw} aria-hidden/>{x.name}</button>)}</div>
     </Step>
     {c&&<Step n={2} title="Which night were you there?"><MatchPicker club={c} multi={false} picked={picked} setPicked={setPicked}/></Step>}
     {m&&<>
      <Step n={3} title="Your footage">
       <label className={css.lab}>Drive folder link<input value={drive} onChange={e=>setDrive(e.target.value)} placeholder="https://drive.google.com/drive/folders/…" inputMode="url"/>
        <span className={css.hint}>Clips and photos of that night, shared “anyone with the link · viewer”. A single clip’s link works too.</span></label>
       {drive.trim()&&!driveOk&&<p role="alert" className={css.alert}>That does not look like a Drive folder or file link.</p>}
      </Step>
      <Step n={4} title="How long?"><div className={css.chips} role="group" aria-label="Length">{VLOG_MINUTES.map(d=><button type="button" key={d} className={`${css.chip} min-h-tap`} aria-pressed={minutes===d} onClick={()=>setMinutes(d)}>{d} min</button>)}</div></Step>
      <Step n={5} title="Your notes (optional)">
       <label className={css.lab}>What you remember<textarea value={notes} onChange={e=>setNotes(e.target.value)} maxLength={4000} rows={4} placeholder={'We stood behind the goal. It rained all night.\nquote | Speaker | role | the exact words | https://source'}/>
        <span className={css.hint}>Your own lines are the night as you saw it. Quotes and headlines need their source, one per line.</span></label>
       <label className={css.check}><input type="checkbox" checked={telegram} onChange={e=>setTelegram(e.target.checked)}/> Send the reel and the film to my Telegram</label>
      </Step>
      <div className={css.summary} aria-live="polite"><b>{m.home} {m.score} {m.away}</b><span>{dayOf(m.date)} · {minutes} min{driveOk?' · your footage':''}{telegram?' · to Telegram':''}</span></div>
      <button type="button" className={`${css.go} min-h-tap`} disabled={busy||banner.run==='no'||!driveOk} onClick={()=>void make()}>{busy?'Queuing…':'Make the episode'}</button>
     </>}
     {err&&<p role="alert" className={css.alert}>{err}</p>}{msg&&<p role="status" className={`${css.alert} ${css.ok}`}>{msg}</p>}
    </div>
   </section>
   {children}
  </div>
 </>
}
