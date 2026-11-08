'use client'
import {useRef,useState,type CSSProperties,type ReactNode} from 'react'
import {SHORT_SECONDS,flowFiles,jobKind,type Job} from '@/lib/stories/jobs'
import {shortsBanner,type Facts} from '@/lib/stories/banners'
import {DeskBanner} from './desk'
import {api,dayOf,MatchPicker,Step,type Club,type Match} from './stories-desk'
import css from './studio.module.css'

/** ANIMATED SHORTS on Google Flow (owner, 8.11.2026). The studio writes the Short from the match's record and hands over
 *  everything Flow needs — the character sheets, one clip prompt per line, the stills, the credits — in order, each with
 *  a copy button. The clips go back into their slots here; "Edit the Short" voices, cuts, captions and mixes them. Flow
 *  has no API, so the studio never spends its credits by itself. */
export function ShortsTab({facts,clubs,jobs,onChange,onMade,children}:{facts:Facts;clubs:Club[];jobs:Job[]|null;onChange:()=>Promise<void>|void;onMade:(id:string)=>Promise<void>;children:ReactNode}){
 const [club,setClub]=useState(''),[picked,setPicked]=useState<Match[]>([]),[seconds,setSeconds]=useState(30),[angle,setAngle]=useState('')
 const [busy,setBusy]=useState(false),[err,setErr]=useState(''),[msg,setMsg]=useState('')
 const key=useRef('')
 const c=clubs.find(x=>x.id===club),m=picked[0]
 const waiting=(jobs??[]).filter(j=>jobKind(j)==='short'&&j.flow&&['needs_review','failed','paused'].includes(j.state)&&j.stage!=='done')
 async function make(){
  if(!c||!m)return
  setBusy(true);setErr('');setMsg('')
  if(!key.current)key.current=crypto.randomUUID()
  try{const b=await api('/api/master/stories',{method:'POST',body:JSON.stringify({kind:'short',brief:{club_id:c.id,match_id:m.id,seconds,angle},idempotencyKey:key.current})})
   key.current='';setMsg('Queued. The script and the Flow pack arrive here within a few minutes.');await onMade(b.job.id)}
  catch(e){setErr(e instanceof Error?e.message:'Could not queue the Short.')}finally{setBusy(false)}
 }
 return <>
  <DeskBanner b={shortsBanner(facts)}/>
  {waiting.map(j=><FlowPanel key={j.id} job={j} onChange={onChange}/>)}
  <div className={css.grid}>
   <section className={`${css.panel} ${css.form}`} aria-labelledby="short-h">
    <div className={css.bar}><span id="short-h">Animated Short · a new one</span><span>Google Flow</span></div>
    <div className={css.body}>
     <Step n={1} title="Which club?">
      <div className={css.tiles}>{clubs.map(x=><button type="button" key={x.id} className={`${css.tile} min-h-tap`} aria-pressed={club===x.id} onClick={()=>{setClub(x.id);setPicked([])}} style={{'--c':x.primary,'--on':x.on} as CSSProperties}><span className={css.sw} aria-hidden/>{x.name}</button>)}</div>
     </Step>
     {c&&<Step n={2} title="Which night?"><MatchPicker club={c} multi={false} picked={picked} setPicked={setPicked}/></Step>}
     {m&&<>
      <Step n={3} title="How long?"><div className={css.chips} role="group" aria-label="Length">{SHORT_SECONDS.map(d=><button type="button" key={d} className={`${css.chip} min-h-tap`} aria-pressed={seconds===d} onClick={()=>setSeconds(d)}>{d} s</button>)}</div></Step>
      <Step n={4} title="Your angle (optional)">
       <label className={css.lab}>What should it be about?<textarea value={angle} onChange={e=>setAngle(e.target.value)} maxLength={400} rows={3} placeholder="The keeper who saved two penalties"/>
        <span className={css.hint}>The Short still says only what the match record holds.</span></label>
      </Step>
      <div className={css.summary} aria-live="polite"><b>{m.home} {m.score} {m.away}</b><span>{dayOf(m.date)} · {seconds} s · about 6 clips · about 108 Flow credits</span></div>
      <button type="button" className={`${css.go} min-h-tap`} disabled={busy||shortsBanner(facts).run==='no'} onClick={()=>void make()}>{busy?'Queuing…':'Write the Short'}</button>
     </>}
     {err&&<p role="alert" className={css.alert}>{err}</p>}{msg&&<p role="status" className={`${css.alert} ${css.ok}`}>{msg}</p>}
    </div>
   </section>
   {children}
  </div>
 </>
}

function Copy({text}:{text:string}){
 const [done,setDone]=useState(false)
 return <button type="button" className={`${css.copy} min-h-tap`} onClick={()=>void navigator.clipboard.writeText(text).then(()=>{setDone(true);setTimeout(()=>setDone(false),1500)})}>{done?'Copied':'Copy'}</button>
}

/** One Short waiting for its Flow files: the steps, every prompt with a copy button, and a slot per file. */
function FlowPanel({job,onChange}:{job:Job;onChange:()=>Promise<void>|void}){
 const p=job.flow!
 const have=new Set((job.brief.art??[]).map(a=>a.name))
 const [busy,setBusy]=useState(''),[err,setErr]=useState('')
 const missing=flowFiles(p).filter(n=>!have.has(n))
 async function upload(slot:string,file:File){
  const want=slot.endsWith('.mp4')?/\.mp4$/i:/\.(jpe?g|png|webp)$/i
  if(!want.test(file.name))return setErr(slot.endsWith('.mp4')?'This slot takes the MP4 Flow made.':'This slot takes a JPG, PNG or WebP picture.')
  if(file.size>45*1024*1024)return setErr('At most 45 MB a file.')
  const name=slot.endsWith('.mp4')?slot:slot.replace(/\.\w+$/,'.'+(file.name.split('.').pop()!.toLowerCase().replace('jpeg','jpg')))
  if(!flowFiles(p).includes(name))return setErr(`Save the still as ${slot}.`)
  setBusy(slot);setErr('')
  try{
   const {urls}=await api(`/api/master/stories/${job.id}/art`,{method:'POST',body:JSON.stringify({names:[name]})})
   const r=await fetch(urls[name],{method:'PUT',body:file,headers:{'Content-Type':file.type||'application/octet-stream','x-upsert':'true'}})
   if(!r.ok)throw new Error(`${file.name} did not upload — try again.`)
   await api(`/api/master/stories/${job.id}`,{method:'POST',body:JSON.stringify({action:'flow_added',files:[name]})})
   await onChange()
  }catch(e){setErr(e instanceof Error?e.message:'The upload failed.')}finally{setBusy('')}
 }
 async function edit(){
  setBusy('edit');setErr('')
  try{await api(`/api/master/stories/${job.id}`,{method:'POST',body:JSON.stringify({action:'flow_ready'})});await onChange()}
  catch(e){setErr(e instanceof Error?e.message:'Could not start the edit.')}finally{setBusy('')}
 }
 const Slot=({file,title,prompt,extra}:{file:string;title:string;prompt:string;extra?:string})=><div className={css.slot} data-have={have.has(file)}>
  <div className={css.slotHead}><span>{title}</span><Copy text={prompt}/></div>
  {extra&&<p className={css.hint}>{extra}</p>}
  <pre className={css.prompt}>{prompt}</pre>
  <label className={css.file}>{have.has(file)?`✓ ${file} uploaded — replace:`:`Upload ${file}:`} <input type="file" accept={file.endsWith('.mp4')?'video/mp4':'image/*'} disabled={!!busy} onChange={e=>{const f=e.target.files?.[0];if(f)void upload(file,f);e.target.value=''}}/></label>
  {busy===file&&<p role="status" className={css.hint}>Uploading…</p>}
 </div>
 return <section className={`${css.panel}`} aria-label={`Flow pack: ${p.title}`} style={{marginBottom:18}}>
  <div className={css.bar}><span>Make in Google Flow · {p.title}</span><span>{p.clips.length} clips · {p.credits} credits</span></div>
  <div className={`${css.body} ${css.flow}`}>
   <p><b>The narration:</b> {p.narration}</p>
   <ol>{p.steps.map(s=><li key={s}>{s}</li>)}</ol>
   <h3>1 · Characters (free)</h3>
   {p.characters.map(c=><div key={c.id} className={css.slot}><div className={css.slotHead}><span>{c.id} — {c.role}</span><Copy text={c.prompt}/></div><pre className={css.prompt}>{c.prompt}</pre></div>)}
   <h3>2 · Clips (18 credits each)</h3>
   {p.clips.map(c=><Slot key={c.file} file={c.file} title={`${c.file} · line ${c.beat+1}`} prompt={c.prompt} extra={c.ingredients?.length?`Ingredients: ${c.ingredients.join(', ')}`:undefined}/>)}
   {p.stills.length?<><h3>3 · Stills (free)</h3>{p.stills.map(c=><Slot key={c.file} file={c.file} title={`${c.file} · line ${c.beat+1}`} prompt={c.prompt}/>)}</>:null}
   {err&&<p role="alert" className={css.alert}>{err}</p>}
   <button type="button" className={`${css.go} min-h-tap`} disabled={!!busy||missing.length>0} onClick={()=>void edit()}>{busy==='edit'?'Starting…':missing.length?`${missing.length} file(s) to go`:'Edit the Short'}</button>
  </div>
 </section>
}
