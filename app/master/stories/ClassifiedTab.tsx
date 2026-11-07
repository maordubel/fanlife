'use client'
import {useRef,useState,type ReactNode} from 'react'
import {classifiedBanner,type Facts} from '@/lib/stories/banners'
import {DeskBanner} from './desk'
import {api} from './stories-desk'
import css from './studio.module.css'

/** CLASSIFIED (docs/fanlife/65): every FILE in the panel map, its script and panels, and "Produce" — which needs the
 *  owner's own approval click, recorded on the job (who, when, which draft), exactly as the workflow's tick. */
const REPO='https://github.com/maordubel/fanlife/blob/main/'
export function ClassifiedTab({facts,onMade,children}:{facts:Facts;onMade:(id:string)=>Promise<void>;children:ReactNode}){
 const [file,setFile]=useState<string|null>(null),[approved,setApproved]=useState(false),[telegram,setTelegram]=useState(true)
 const [busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[err,setErr]=useState('')
 const key=useRef('')
 const files=facts.classified
 const f=files?.find(x=>x.file===file)??null
 const banner=classifiedBanner(facts,{file,approved})
 const choose=(id:string)=>{setFile(id);setApproved(false);setMsg('');setErr('');key.current=''}
 async function produce(){
  if(!f)return
  setBusy(true);setErr('');setMsg('')
  if(!key.current)key.current=crypto.randomUUID()
  try{const b=await api('/api/master/stories',{method:'POST',body:JSON.stringify({kind:'classified',brief:{file:f.file,approved,script_version:f.script_version,telegram},idempotencyKey:key.current})})
   key.current='';setMsg(`FILE ${f.number} is queued. The worker starts it within about a minute.`);await onMade(b.job.id)}
  catch(e){setErr(e instanceof Error?e.message:'Could not queue the FILE.')}finally{setBusy(false)}
 }
 return <>
  <DeskBanner b={banner}/>
  <div className={css.grid}>
   <section className={`${css.panel} ${css.form}`} aria-labelledby="cl-h">
    <div className={css.bar}><span id="cl-h">CLASSIFIED · produce a FILE</span><span>Approved scripts only</span></div>
    <div className={css.body}>
     {files===null||files===undefined?<p className={css.alert}>Not connected — the episode files could not be read on this server.</p>:
     <ul className={css.fileList}>{files.map(x=><li key={x.file}><button type="button" className={`${css.card} min-h-tap`} aria-pressed={file===x.file} onClick={()=>choose(x.file)}>
      <b>FILE {x.number} · {x.title}</b>
      <span>{x.tone}{x.year?` · ${x.year}`:''} · {x.episode?`script ${x.script_version}`:'no script yet'}{x.minutes?` · about ${x.minutes} min`:''}</span>
      <span>Panels: {x.panels.have} of {x.panels.roles} roles{x.panels.missing.length?` (missing ${x.panels.missing.join(', ')})`:''}</span>
      <span>{x.approved_in_file?'Marked approved in the episode file':'Approval: yours, here'}</span>
     </button></li>)}</ul>}
     {f&&f.episode&&<>
      {f.hook_options?.length?<details><summary>Three opening hooks</summary><ol>{f.hook_options.map((hook,i)=><li key={i}>{hook}</li>)}</ol><small>Opening 1 is used in this script; alternatives are for review.</small></details>:null}
      <p className={css.hint}>Read it first: {f.script?<a href={REPO+f.script} target="_blank" rel="noreferrer">the script ({f.script_version})</a>:'the script'} · <a href={`${REPO}scripts/football-stories/comic/episodes/${f.episode}`} target="_blank" rel="noreferrer">the episode as produced</a>. {f.beats} beats, {f.shorts} Shorts planned.</p>
      <label className={css.check}><input type="checkbox" checked={approved} onChange={e=>setApproved(e.target.checked)}/> I have read and approve this FILE&rsquo;s script ({f.script_version})</label>
      <label className={css.check}><input type="checkbox" checked={telegram} onChange={e=>setTelegram(e.target.checked)}/> Send the DRAFT to my Telegram</label>
      <button type="button" className={`${css.go} min-h-tap`} disabled={busy||banner.run!=='yes'} onClick={()=>void produce()}>{busy?'Queuing…':`Produce FILE ${f.number}`}</button>
      <p className={css.hint}>Nothing is uploaded to YouTube and nothing is published. If the script changes after you approve it, the job stops and asks again.</p>
     </>}
     {err&&<p role="alert" className={css.alert}>{err}</p>}{msg&&<p role="status" className={`${css.alert} ${css.ok}`}>{msg}</p>}
    </div>
   </section>
   {children}
  </div>
 </>
}
