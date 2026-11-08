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
 const [scenesApproved,setScenesApproved]=useState(false),[panels,setPanels]=useState<Record<string,string>>({})
 const [busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[err,setErr]=useState('')
 const key=useRef('')
 const files=facts.classified
 const f=files?.find(x=>x.file===file)??null
 const banner=classifiedBanner(facts,{file,approved})
 const choose=(id:string)=>{setFile(id);setApproved(false);setScenesApproved(false);setPanels({});setMsg('');setErr('');key.current=''}
 async function produce(){
  if(!f)return
  setBusy(true);setErr('');setMsg('')
  if(!key.current)key.current=crypto.randomUUID()
  try{const b=await api('/api/master/stories',{method:'POST',body:JSON.stringify({kind:'classified',brief:{file:f.file,approved,script_version:f.script_version,telegram,scenes_approved:scenesApproved,panel_overrides:panels},idempotencyKey:key.current})})
   key.current='';setMsg(`FILE ${f.number} is queued. The worker starts it within a few minutes.`);await onMade(b.job.id)}
  catch(e){setErr(e instanceof Error?e.message:'Could not queue the FILE.')}finally{setBusy(false)}
 }
 async function writeFile(brief:{file?:string;topic:string;tone:string;notes?:string}){
  setBusy(true);setErr('');setMsg('')
  try{const b=await api('/api/master/stories',{method:'POST',body:JSON.stringify({kind:'casefile',brief,idempotencyKey:crypto.randomUUID()})})
   setMsg('The writers\u2019 room is on it: research, script, episode — about fifteen minutes. Claude then makes its panels in Google Flow; you read it and approve it here.');await onMade(b.job.id)}
  catch(e){setErr(e instanceof Error?e.message:'Could not start the writers\u2019 room.')}finally{setBusy(false)}
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
      {f.scenes?.length?<details>
       <summary>Review structure and pictures · {f.scenes.length} scenes</summary>
       {f.scenes.map((scene,i)=>{
        const picture=f.pictures?.find(p=>p.id===(panels[scene.id]??scene.panel))
        return <article key={scene.id} className={css.option}>
         <h4>{i+1}. {scene.chapter}</h4><p>{scene.text||'Unvoiced scene'}</p>
         {picture?<img className={css.sheet} src={picture.thumbnail} alt={picture.name} loading="lazy" referrerPolicy="no-referrer"/>:null}
         <p className={css.meta}>{scene.seconds.toFixed(1)} s estimated · {scene.camera||'Hold'} · {picture?.label||scene.panel}</p>
         <p>{f.sources?.filter(s=>scene.sourceIds.includes(s.id)).map(s=><a key={s.id} href={s.url} target="_blank" rel="noreferrer">{s.title} </a>)}</p>
         {f.pictures?.length?<label>Replace picture <select value={panels[scene.id]??''} onChange={e=>{
          const choice=e.target.value;setScenesApproved(false)
          setPanels(prev=>{const next={...prev};if(choice)next[scene.id]=choice;else delete next[scene.id];return next})
         }}><option value="">Scripted picture</option>{f.pictures.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>:null}
        </article>
       })}
       <label className={css.check}><input type="checkbox" checked={scenesApproved} onChange={e=>setScenesApproved(e.target.checked)}/> I approve this order and picture selection</label>
      </details>:null}
      <label className={css.check}><input type="checkbox" checked={telegram} onChange={e=>setTelegram(e.target.checked)}/> Send the DRAFT to my Telegram</label>
      <button type="button" className={`${css.go} min-h-tap`} disabled={busy||banner.run!=='yes'||!!f.scenes?.length&&!scenesApproved} onClick={()=>void produce()}>{busy?'Queuing…':`Produce FILE ${f.number}`}</button>
      <p className={css.hint}>Nothing is uploaded to YouTube and nothing is published. If the script changes after you approve it, the job stops and asks again.</p>
     </>}
     {f&&<button type="button" className={`${css.chip} min-h-tap`} disabled={busy} onClick={()=>void writeFile({file:f.file,topic:`${f.title}: ${f.hook_options?.[0]??f.title}`,tone:f.tone})}>Rewrite FILE {f.number} in the writers&rsquo; room</button>}
     {err&&<p role="alert" className={css.alert}>{err}</p>}{msg&&<p role="status" className={`${css.alert} ${css.ok}`}>{msg}</p>}
    </div>
   </section>
   <WritersRoom busy={busy} onWrite={writeFile}/>
   {children}
  </div>
 </>
}


/** The writers' room (owner, 8.11.2026: "full automation"): a story in a sentence → the studio researches it (every fact
 *  tied to its page), writes the FILE by docs/fanlife/classified/WRITERS-ROOM.md, saves it, and Claude makes its panels
 *  in Google Flow. The FILE then waits here for the owner's approval like any other. */
function WritersRoom({busy,onWrite}:{busy:boolean;onWrite:(b:{topic:string;tone:string;notes?:string})=>Promise<void>}){
 const [topic,setTopic]=useState(''),[tone,setTone]=useState('LAUGH'),[notes,setNotes]=useState('')
 return <section className={`${css.panel} ${css.form}`} aria-labelledby="wr-h">
  <div className={css.bar}><span id="wr-h">Writers&rsquo; room · a new FILE</span><span>Automatic</span></div>
  <div className={css.body}>
   <label className={css.lab}>The story, in a sentence or two<textarea value={topic} onChange={e=>setTopic(e.target.value)} rows={3} maxLength={400} placeholder="In 1981 Barcelona's top scorer Quini was kidnapped the day after scoring twice — and the league played on."/></label>
   <div className={css.chips} role="group" aria-label="Tab">{['LAUGH','WAR','HEART'].map(t=><button type="button" key={t} className={`${css.chip} min-h-tap`} aria-pressed={tone===t} onClick={()=>setTone(t)}>{t}</button>)}</div>
   <label className={css.lab}>What you know (optional)<textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} maxLength={4000} placeholder="Names, dates, a link — the research checks it."/></label>
   <button type="button" className={`${css.go} min-h-tap`} disabled={busy||topic.trim().length<12} onClick={()=>void onWrite({topic,tone,notes})}>Write the FILE</button>
   <p className={css.hint}>Research, a 5–7 minute script with its cold open, chapters, versions and sources, the episode and its panel prompts — then Claude makes the panels in Google Flow on your computer. Nothing is produced until you approve it.</p>
  </div>
 </section>
}
