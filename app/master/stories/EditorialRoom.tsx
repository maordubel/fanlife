'use client'

import {useEffect,useState} from 'react'
import type {Draft,Review,ReviewAction,Scene} from '@/lib/stories/editorial'
import type {Job} from '@/lib/stories/jobs'
import css from './studio.module.css'

type Act=(request:ReviewAction)=>Promise<void>
const button=`${css.btn} min-h-tap`
const primary=`${button} ${css.btnRed}`
const presets=['Shorter','More tension','More emotion','More football']
const steps=['Define story','Approve script','Approve scenes and pictures','Produce and check']

export function EditorialSteps({job}:{job:Job}){
 const step=job.state==='needs_review'&&job.stage==='script'?1:job.state==='needs_review'&&job.stage==='edit'?2:
  job.stage==='done'||job.editorialRequest?.action==='editorial_plan'&&job.editorialRequest.approved?3:
  job.editorial?.scenes?.length?2:job.editorial?.drafts.length?1:0
 return <ol className={css.stages} aria-label="Production stations">{steps.map((name,i)=>
  <li key={name} aria-current={i===step?'step':undefined} data-on={i===step||undefined} data-done={i<step||undefined}>{i+1}. {name}</li>
 )}</ol>
}

export function EditorialRoom({job,urls,busy,act}:{job:Job;urls:Record<string,string>;busy:boolean;act:Act}){
 const review=job.editorial
 const [selection,setSelection]=useState<number|null>(null)
 const [parts,setParts]=useState<Record<'opening'|'body'|'ending',number|null>>({opening:null,body:null,ending:null})
 if(job.state!=='needs_review'||!review)return null
 if(job.stage==='edit'&&review.scenes&&review.plan)return <SceneReview key={review.plan} review={review} urls={urls} busy={busy} act={act}/>
 if(job.stage!=='script')return null
 const draft=review.drafts.find(d=>d.option===selection)??review.drafts.find(d=>d.option===review.suggestion?.option)??review.drafts.at(-1)
 if(!draft)return null
 return <section className={css.choice} aria-label="Script approval">
  <h3 className={css.h3}>2. Read and approve the script</h3>
  <p className={css.hint}>The film waits here. Choose the story you want to tell, then read its full narration.</p>
  <Issues review={review}/>
  {review.gaps?.length?<details><summary>Research gaps and unresolved evidence</summary><ul>{review.gaps.map((g,i)=><li key={i}>{g}</li>)}</ul></details>:null}
  {review.drafts.length>1?<div className={css.options}>{review.drafts.map(d=>{
   const words=d.chapters.flatMap(c=>c.beats).reduce((n,b)=>n+b.text.trim().split(/\s+/).length,0)
   const angles:Record<number,string>={1:'The Broadcaster · what changed on the pitch',2:'The Terrace · what it meant in the stands',3:'The Trailer Cut · what keeps the viewer watching',4:'Combined draft'}
   return <article key={d.option} className={css.option}>
    <p className={css.kicker2}>{d.angle||angles[d.option]||'Your reviewed draft'}</p>
    <h4>{d.title}</h4><p>{d.chapters[0]?.beats[0]?.text}</p>
    <p className={css.meta}>About {(words/145).toFixed(1)} min · {words} words</p>
    <ol className={css.chapters}>{d.chapters.map((c,i)=><li key={i}>{c.title}</li>)}</ol>
    <button type="button" className={button} aria-pressed={draft.option===d.option} onClick={()=>setSelection(d.option)}>Read this draft</button>
   </article>
  })}</div>:null}
  {review.drafts.length>1?<details><summary>Combine the directors’ drafts</summary>
   {(['opening','body','ending'] as const).map(part=><label key={part}>{part} <select value={parts[part]??draft.option}
    onChange={e=>setParts(p=>({...p,[part]:Number(e.target.value)}))}>{review.drafts.map(d=><option key={d.option} value={d.option}>{d.title}</option>)}</select></label>)}
   <button type="button" className={button} disabled={busy} onClick={()=>void act({action:'editorial_combine',opening:parts.opening??draft.option,body:parts.body??draft.option,ending:parts.ending??draft.option})}>Prepare combined draft</button>
  </details>:null}
  <DraftReview key={draft.revision} jobId={job.id} draft={draft} review={review} busy={busy} act={act}/>
 </section>
}

function Issues({review}:{review:Review}){
 return review.issues?.length?<ul role="alert" className={css.alert}>{review.issues.map((x,i)=><li key={i}>{x}</li>)}</ul>:null
}

function DraftReview({jobId,draft,review,busy,act}:{jobId:string;draft:Draft;review:Review;busy:boolean;act:Act}){
 const key=`fanlife-script-v1:${jobId}:${draft.revision}`
 const [edits,setEdits]=useState<Record<string,string>>({})
 const [loaded,setLoaded]=useState(false)
 const [notes,setNotes]=useState<Record<string,string>>({})
 const [removed,setRemoved]=useState<string[]>([])
 useEffect(()=>{
  try{const saved=JSON.parse(localStorage.getItem(key)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))setEdits(saved)}catch{}
  setLoaded(true)
 },[key])
 useEffect(()=>{if(loaded){try{localStorage.setItem(key,JSON.stringify(edits))}catch{}}},[edits,key,loaded])
 const edit=(id:string,text:string)=>setEdits(prev=>({...prev,[id]:text}))
 return <div>
  <h4>{draft.title}</h4>
  {draft.chapters.map((c,ci)=><details key={ci} open={ci===0||undefined}>
   <summary>{ci+1}. {c.title}</summary>
   {c.beats.map((b,bi)=>{
    const proposal=review.suggestion?.option===draft.option&&review.suggestion.beat===b.id?review.suggestion:null
    return <article key={b.id} className={css.option}>
     <label>Paragraph {bi+1}<textarea rows={4} lang="en" maxLength={3000} value={edits[b.id]??b.text} onChange={e=>edit(b.id,e.target.value)}/></label>
     <label className={css.check}><input type="checkbox" checked={removed.includes(b.id)} onChange={e=>setRemoved(ids=>e.target.checked?[...ids,b.id]:ids.filter(id=>id!==b.id))}/> Remove this paragraph</label>
     <details><summary>Show sources</summary>{b.evidence.length?<ul>{b.evidence.map(f=><li key={f.id}><b>{f.status}</b> · {f.summary} {f.links.map((link,i)=><a key={link} href={link} target="_blank" rel="noreferrer">Source {i+1} </a>)}</li>)}</ul>:<p>Atmosphere or connective narration. No source attached.</p>}</details>
     <details><summary>Rewrite this paragraph</summary>
      <label>Instruction in Hebrew or English<input dir="auto" maxLength={600} value={notes[b.id]??''} onChange={e=>setNotes(n=>({...n,[b.id]:e.target.value}))}/></label>
      <div className={css.actions}>{presets.map(p=><button key={p} type="button" className={button} onClick={()=>setNotes(n=>({...n,[b.id]:p}))}>{p}</button>)}
       <button type="button" className={button} disabled={busy||!notes[b.id]?.trim()} onClick={()=>void act({action:'editorial_rewrite',option:draft.option,revision:draft.revision,beat:b.id,instruction:notes[b.id]})}>Suggest rewrite</button>
      </div>
     </details>
     {proposal?<div><p><b>Before</b> {proposal.before}</p><p><b>After</b> {proposal.after}</p>
      <button type="button" className={button} onClick={()=>edit(b.id,proposal.after)}>Use this rewrite</button>
      <button type="button" className={button} onClick={()=>edit(b.id,b.text)}>Keep original</button>
     </div>:null}
    </article>
   })}
  </details>)}
  <p className={css.hint}>Text edits save on this device. Approval sends the chosen version for fact checks and scene planning.</p>
  <button type="button" className={primary} disabled={busy||Object.values(edits).some(x=>!x.trim())} onClick={()=>void act({action:'editorial_script',option:draft.option,revision:draft.revision,edits,removed})}>Approve script and prepare scenes</button>
 </div>
}

function SceneReview({review,urls,busy,act}:{review:Review;urls:Record<string,string>;busy:boolean;act:Act}){
 const original=review.scenes??[]
 const [order,setOrder]=useState(()=>original.map(s=>s.id))
 const [images,setImages]=useState<Record<string,string>>({})
 const byId=new Map(original.map(s=>[s.id,s]))
 const move=(i:number,by:number)=>setOrder(prev=>{const next=[...prev];[next[i],next[i+by]]=[next[i+by],next[i]];return next})
 const dirty=Object.keys(images).length>0||order.some((id,i)=>id!==original[i]?.id)
 const selected=new Set(original.filter(s=>s.required&&s.image).map(s=>s.image))
 const submit=(approved:boolean)=>void act({action:'editorial_plan',revision:review.plan!,order,images,approved})
 return <section className={css.choice} aria-label="Scene and picture approval">
  <h3 className={css.h3}>3. Review scenes and pictures</h3>
  <p className={css.hint}>{selected.size} required pictures assigned. All timings come from the narration plan.</p>
  <Issues review={review}/>
  {order.map((id,i)=>{
   const scene=byId.get(id)!
   const canMove=(other?:Scene)=>scene.visual==='illustration'&&!scene.text&&other?.chapter===scene.chapter
   return <article key={id} className={css.option}>
    <h4>{i+1}. {scene.chapter}</h4><p>{scene.text||'Unvoiced scene'}</p>
    {scene.preview&&urls[scene.preview]?<img className={css.sheet} src={urls[scene.preview]} alt={scene.source||scene.label||'Scene picture'} loading="lazy"/>:null}
    <p className={css.meta}>{scene.seconds.toFixed(1)} s · {scene.visual} · {scene.movement}</p>
    <p>{scene.label}{scene.source?` · ${scene.source}`:''}{scene.required?' · Required picture':''}</p>
    {scene.alternatives?.length?<label>Replace picture <select value={images[id]??''} onChange={e=>{
     const choice=e.target.value
     setImages(previous=>{const next={...previous};if(choice)next[id]=choice;else delete next[id];return next})
    }}><option value="">Current picture</option>{scene.alternatives.map(a=><option key={a} value={a}>{a.split('/').at(-1)}</option>)}</select></label>:null}
    <div className={css.actions}>
     {canMove(byId.get(order[i-1]))?<button type="button" className={button} onClick={()=>move(i,-1)}>Move up</button>:null}
     {canMove(byId.get(order[i+1]))?<button type="button" className={button} onClick={()=>move(i,1)}>Move down</button>:null}
    </div>
   </article>
  })}
  <div className={css.actions}>
   <button type="button" className={button} disabled={busy} onClick={()=>void act({action:'editorial_back'})}>Back to edit narration</button>
   {dirty||review.issues?.length?<button type="button" className={primary} disabled={busy} onClick={()=>submit(false)}>Refresh scene preview</button>:
    <button type="button" className={primary} disabled={busy} onClick={()=>submit(true)}>Approve this board and produce</button>}
  </div>
 </section>
}
