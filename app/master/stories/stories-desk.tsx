'use client'
import {useCallback,useEffect,useMemo,useRef,useState,type FormEvent} from 'react'
import type {Job,Privacy} from '@/lib/stories/jobs'
import {DURATIONS,STAGES} from '@/lib/stories/jobs'
import css from './studio.module.css'

type Club={id:string;name:string}
const ATHENS=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Athens',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})
const when=(iso:string|null|undefined)=>iso?`${ATHENS.format(new Date(iso))} Athens`:''
const mins=(d:number)=>d<1?'30 sec':`${d} min`
const STATE_TEXT:Record<Job['state'],string>={queued:'Waiting for the worker',running:'In production',paused:'Paused',cancel_requested:'Stopping',cancelled:'Cancelled',failed:'Failed',needs_review:'Needs your review',ready:'Ready'}
const STAGE_TEXT:Record<string,string>={research:'Research',script:'Script',voice:'Voice',graphics:'Graphics',edit:'Edit',mix:'Sound',master:'Master',package:'Package',qa:'Checks',done:'Done'}

async function api(path:string,init?:RequestInit){
 const r=await fetch(path,{cache:'no-store',...init,headers:{'Content-Type':'application/json',...(init?.headers||{})}})
 const b=await r.json().catch(()=>({}))
 if(!r.ok)throw new Error(b.error||`Request failed (${r.status})`)
 return b
}

export function StoriesDesk(){
 const [jobs,setJobs]=useState<Job[]>([]),[clubs,setClubs]=useState<Club[]>([]),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const [busy,setBusy]=useState(false),[open,setOpen]=useState<string|null>(null)
 const [duration,setDuration]=useState(12),[privacy,setPrivacy]=useState<Privacy>('private')
 const key=useRef<string>('')
 const load=useCallback(async()=>{try{const b=await api('/api/master/stories');setJobs(b.jobs);setClubs(b.clubs);setError('')}catch(e){setError(e instanceof Error?e.message:'Could not load the studio.')}},[])
 useEffect(()=>{void load()},[load])
 const live=jobs.some(j=>['queued','running','cancel_requested'].includes(j.state))
 useEffect(()=>{if(!live)return;const t=setInterval(()=>void load(),15000);return()=>clearInterval(t)},[live,load])

 async function create(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setError('');setNotice('');setBusy(true)
  if(!key.current)key.current=crypto.randomUUID()
  const d=new FormData(e.currentTarget)
  const local=String(d.get('publish_at')||'')
  const brief={club_id:d.get('club_id'),season:d.get('season'),topic:d.get('topic'),duration,visual_style:d.get('visual_style'),voice:d.get('voice'),review:d.get('review'),privacy,
   publish_at:privacy==='scheduled'&&local?athensToIso(local):undefined,
   focus_from:d.get('focus_from')||undefined,focus_to:d.get('focus_to')||undefined,notes:d.get('notes')||'',hold:d.get('hold')==='on'}
  try{const b=await api('/api/master/stories',{method:'POST',body:JSON.stringify({brief,idempotencyKey:key.current})});key.current='';setNotice(b.job.state==='paused'?`Created and held: ${b.job.brief.club_name} ${b.job.brief.season}. Open it, add your pictures, then press Resume.`:`Queued: ${b.job.brief.club_name} ${b.job.brief.season}. The worker picks it up within about ten minutes.`);setOpen(b.job.id);await load()}
  catch(err){setError(err instanceof Error?err.message:'Could not queue the film.')}finally{setBusy(false)}
 }

 return <main className={css.root}>
  <header className={css.mast}><div className={css.wrap}>
   <p className={css.kicker}><a href="/master/admin">FAN LIFE desk</a> · Owner studio</p>
   <h1 className={css.title}>Football Stories</h1>
   <p className={css.slogan}>Football is ninety minutes. Being a supporter is a lifetime.</p>
  </div></header>
  <div className={css.wrap}><div className={css.grid}>
   <section className={`${css.panel} ${css.form}`} aria-labelledby="new-film">
    <div className={css.bar}><span id="new-film">New film</span><span>Owner only</span></div>
    <form className={css.body} onSubmit={create}>
     <label>Club<select name="club_id" required defaultValue="hapoel-tel-aviv">{clubs.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
     <div className={css.row}>
      <label>Season<input name="season" required pattern="\d{4}/\d{2}" placeholder="1999/00" defaultValue="1999/00" inputMode="numeric"/></label>
      <label>Visual<select name="visual_style" defaultValue="collage"><option value="collage">Collage · The Weekly</option><option value="papercut" disabled>Paper stop-motion — not in the renderer yet</option><option value="mixed" disabled>Mixed — not in the renderer yet</option></select></label>
     </div>
     <label>Story or angle<textarea name="topic" maxLength={240} placeholder="e.g. The double: twelve years of waiting, then five days in May"/><span className={css.hint}>Optional. The film follows the season&rsquo;s archive in order either way.</span></label>
     <div className={css.row}>
      <label>Focus from<input type="date" name="focus_from"/></label>
      <label>Focus to<input type="date" name="focus_to"/></label>
     </div>
     <span className={css.hint}>Optional. One tie or one run instead of the whole season — e.g. both legs of a European tie. Leave empty for the season.</span>
     <label>Quotes and headlines<textarea name="notes" maxLength={6000} rows={4} placeholder={'quote | Speaker | role | the exact words | https://source\npress | Outlet | 2024-03-15 | The headline as printed | https://source'}/><span className={css.hint}>Optional, one per line, each with the page you read it on. Quoted word for word on screen, never changed. Lines in any other shape are refused.</span></label>
     <label className={css.check}><input type="checkbox" name="hold"/> I will add my own pictures first (the film waits until I press Resume)</label>
     <label>Length<div className={css.chips} role="group" aria-label="Length">{DURATIONS.filter(d=>[0.5,1,2,3,5,7,10,12,15,20,25].includes(d)).map(d=><button type="button" key={d} className={`${css.chip} min-h-tap`} aria-pressed={duration===d} onClick={()=>setDuration(d)}>{mins(d)}</button>)}</div><span className={css.hint}>12 minutes is the default documentary length. Any whole minute from 7 to 25 is accepted.</span></label>
     <div className={css.row}>
      <label>Narrator<select name="voice" defaultValue="auto"><option value="auto">Automatic</option><option value="elevenlabs">ElevenLabs (premium)</option><option value="kokoro">Free British voice</option></select><span className={css.hint}>Automatic uses ElevenLabs when its key is set, else the free voice.</span></label>
      <label>Script review<select name="review" defaultValue="auto"><option value="auto">Automatic</option><option value="script">Stop for my approval</option></select></label>
     </div>
     <label>YouTube visibility<div className={css.chips} role="group" aria-label="Visibility">{(['private','unlisted','public','scheduled'] as const).map(p=><button type="button" key={p} className={`${css.chip} min-h-tap`} aria-pressed={privacy===p} onClick={()=>setPrivacy(p)}>{p}</button>)}</div>
      <span className={css.hint}>Applied when the film is uploaded. Every film is checked before it leaves the studio.</span></label>
     {privacy==='scheduled'&&<label>Publish at (Athens time)<input type="datetime-local" name="publish_at" required/></label>}
     <button className={`${css.go} min-h-tap`} disabled={busy}>{busy?'Queuing…':'Make the film'}</button>
     {error&&<p role="alert" className={css.alert}>{error}</p>}{notice&&<p role="status" className={`${css.alert} ${css.ok}`}>{notice}</p>}
    </form>
   </section>
   <section aria-label="Films" className={css.list}>
    {jobs.length===0?<div className={css.panel}><p className={css.empty}>No films yet. Queue the first one.</p></div>:jobs.map(j=><JobCard key={j.id} job={j} open={open===j.id} onOpen={()=>setOpen(open===j.id?null:j.id)} onChange={load}/>)}
   </section>
  </div></div>
 </main>
}

/** A datetime-local value read as Athens wall-clock time → an ISO string with Athens' offset on that date. */
function athensToIso(local:string){
 const [d,t]=local.split('T');const guess=new Date(`${d}T${t}:00Z`)
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Athens',timeZoneName:'longOffset'}).formatToParts(guess)
 const off=(parts.find(p=>p.type==='timeZoneName')?.value||'GMT+02:00').replace('GMT','')||'+00:00'
 return `${d}T${t}:00${off}`
}

function JobCard({job,open,onOpen,onChange}:{job:Job;open:boolean;onOpen:()=>void;onChange:()=>void}){
 const [err,setErr]=useState(''),[busy,setBusy]=useState(false)
 const b=job.brief
 const act=async(body:Record<string,unknown>)=>{setErr('');setBusy(true);try{await api(`/api/master/stories/${job.id}`,{method:'POST',body:JSON.stringify(body)});onChange()}catch(e){setErr(e instanceof Error?e.message:'Failed')}finally{setBusy(false)}}
 const si=job.stage?STAGES.indexOf(job.stage):-1
 return <article className={`${css.panel} ${css.job}`}>
  <div className={css.body}>
   <div className={css.jobHead}><div><h2 className={css.jobTitle}>{(job.youtube?.title as string)||`${b.club_name} · ${b.season}`}</h2>
    <p className={css.meta}>{b.club_name} · {b.season} · {mins(b.duration)} · {b.privacy}{b.publish_at?` ${when(b.publish_at)}`:''} · queued {when(job.createdAt)}</p></div>
    <span className={`${css.state} ${css['s_'+job.state]}`}>{STATE_TEXT[job.state]}</span></div>
   {['running','queued','paused','cancel_requested'].includes(job.state)&&<>
    <div className={css.track} role="progressbar" aria-valuenow={Math.round(job.progress*100)} aria-valuemin={0} aria-valuemax={100}><div className={css.fill} style={{width:`${Math.round(job.progress*100)}%`}}/></div>
    <p className={css.meta}>{job.message}</p>
    <ol className={css.stages}>{STAGES.filter(s=>s!=='done').map((s,i)=><li key={s} data-on={i===si||undefined} data-done={i<si||undefined}>{STAGE_TEXT[s]}</li>)}</ol></>}
   {job.error&&<p className={css.alert} role="alert"><b>[{job.error.code}]</b> {job.error.message} {job.error.retryable?'— safe to retry.':'— fix the cause before retrying.'}</p>}
   {job.state==='needs_review'&&job.stage==='script'&&<p className={css.alert}>The script is written and waiting for you. Open the film to read it, then approve.</p>}
   <div className={css.actions}>
    {['queued','running'].includes(job.state)&&<button className={`${css.btn} min-h-tap`} disabled={busy} onClick={()=>act({action:'pause'})}>Pause</button>}
    {job.state==='paused'&&<button className={`${css.btn} min-h-tap`} disabled={busy} onClick={()=>act({action:'resume'})}>Resume</button>}
    {['failed','cancelled'].includes(job.state)&&<button className={`${css.btn} min-h-tap`} disabled={busy} onClick={()=>act({action:'retry'})}>Retry</button>}
    {job.state==='needs_review'&&job.stage==='script'&&<button className={`${css.btn} min-h-tap ${css.btnRed}`} disabled={busy} onClick={()=>act({action:'approve_script'})}>Approve script</button>}
    {!['cancelled','cancel_requested'].includes(job.state)&&job.upload.state!=='done'&&<button className={`${css.btn} min-h-tap`} disabled={busy} onClick={()=>{if(confirm('Cancel this film?'))void act({action:'cancel'})}}>Cancel</button>}
    <button className={`${css.btn} min-h-tap`} onClick={onOpen} aria-expanded={open}>{open?'Close':'Open'}</button>
   </div>
   {err&&<p role="alert" className={css.alert}>{err}</p>}
   {open&&<Detail job={job} act={act} busy={busy}/>}
  </div>
 </article>
}

function Detail({job,act,busy}:{job:Job;act:(b:Record<string,unknown>)=>Promise<void>;busy:boolean}){
 const [urls,setUrls]=useState<Record<string,string>>({}),[script,setScript]=useState<string>('')
 const [vid,setVid]=useState(''),[vis,setVis]=useState<Privacy>(job.brief.privacy),[dl,setDl]=useState('')
 const a=job.artefacts
 useEffect(()=>{void api(`/api/master/stories/${job.id}`).then(b=>setUrls(b.urls||{})).catch(()=>{})},[job.id,job.updatedAt])
 useEffect(()=>{const su=a?.package?urls[a.package.path]:undefined;if(job.stage==='script'&&su)void fetch(su).then(r=>r.text()).then(t=>{try{const s=JSON.parse(t);setScript(s.chapters.map((c:{title:string;beats:{narration:string}[]})=>`${c.title.toUpperCase()}\n`+c.beats.map(b=>b.narration).join('\n')).join('\n\n'))}catch{setScript(t)}})},[a,urls,job.stage])
 const yt=job.youtube as null|{title:string;description:string;tags:string[];category:string;chapters:{time:string;title:string}[];synthetic_media:{altered_or_synthetic:boolean;reason:string};title_candidates:{title:string;angle:string}[];shorts:{hook:string;idea:string}[]}
 const u=(p?:{path:string}|null)=>p?urls[p.path]:undefined
 async function downloadMaster(){
  setDl('Fetching the master…')
  try{const b=await api(`/api/master/stories/${job.id}?master=1`);const parts:Blob[]=[]
   for(const [i,c] of (a?.master?.chunks||[]).entries()){setDl(`Part ${i+1} of ${a!.master!.chunks.length}…`);const r=await fetch(b.urls[c.path]);if(!r.ok)throw new Error('A part could not be read');parts.push(await r.blob())}
   const blob=new Blob(parts,{type:'video/mp4'});const href=URL.createObjectURL(blob);const x=document.createElement('a');x.href=href;x.download=`${(yt?.title||'fanlife-film').replace(/[^\w-]+/g,'-').slice(0,80)}.mp4`;x.click();setTimeout(()=>URL.revokeObjectURL(href),60000);setDl(`Downloaded ${(blob.size/1e6).toFixed(0)} MB`)}
  catch(e){setDl(e instanceof Error?e.message:'Download failed')}
 }
 return <div>
  {['queued','paused'].includes(job.state)&&<Pictures job={job} act={act} busy={busy}/>}
  {job.brief.art?.length&&!['queued','paused'].includes(job.state)?<p className={css.meta}>Your pictures: {job.brief.art.map(x=>x.name+(x.illustrated?' (illustration)':'')).join(', ')}</p>:null}
  {script&&<><h3 className={css.h3}>Script for review</h3><div className={css.pre}>{script}</div></>}
  {u(a?.preview)&&<><h3 className={css.h3}>Preview</h3><video className={css.video} src={u(a?.preview)} controls preload="metadata" playsInline>{u(a?.captions?.vtt)&&<track kind="captions" srcLang="en" label="English" src={u(a?.captions?.vtt)} default/>}</video></>}
  {a?.thumbnails?.length?<><h3 className={css.h3}>Thumbnails</h3><div className={css.thumbs}>{a.thumbnails.map(t=>u(t)&&<img key={t.path} src={u(t)} alt="Thumbnail option"/>)}</div></>:null}
  {job.qa&&<><h3 className={css.h3}>Checks</h3><ul className={css.checks}>{job.qa.checks.map(c=><li key={c.name}>{c.ok?'✓':'✗'} <b>{c.name}</b> — {c.detail}</li>)}</ul>
   {job.qa.rights?.length?<p className={css.alert}>Rights gaps: {job.qa.rights.join('; ')}</p>:null}
   {job.qa.cannot_prove?.length?<details><summary className={css.meta}>What the checks cannot prove</summary><ul>{job.qa.cannot_prove.map(x=><li key={x}>{x}</li>)}</ul></details>:null}</>}
  {a?.shorts?.length?<><h3 className={css.h3}>Shorts</h3><div className={css.shorts}>{a.shorts.map((x,i)=>u(x)&&<figure key={x.path}><video src={u(x)} controls preload="metadata" playsInline/><figcaption><b>{x.hook}</b> · {Math.round(x.seconds)} s · <a href={u(x)} download={`short-${i+1}.mp4`}>Download</a></figcaption></figure>)}</div></>:null}
  {u(a?.contact)&&<><h3 className={css.h3}>Every shot</h3><img className={css.sheet} src={u(a?.contact)} alt="One frame from every shot"/></>}
  {yt&&<><h3 className={css.h3}>YouTube package</h3>
   <p><b>{yt.title}</b> · {yt.category} · altered/synthetic disclosure: <b>{yt.synthetic_media.altered_or_synthetic?'Yes':'No'}</b></p><p className={css.meta}>{yt.synthetic_media.reason}</p>
   <details><summary className={css.meta}>Ten title concepts</summary><ol>{yt.title_candidates.map(t=><li key={t.title}>{t.title} <small>({t.angle})</small></li>)}</ol></details>
   <details><summary className={css.meta}>Description</summary><div className={css.pre}>{yt.description}</div></details>
   <p className={css.meta}>Tags: {yt.tags.join(', ')}</p>
   <details><summary className={css.meta}>Shorts ideas</summary><ul>{yt.shorts.map(s=><li key={s.hook}><b>{s.hook}</b> — {s.idea}</li>)}</ul></details></>}
  {yt&&a?.master&&<PublishKit yt={yt} job={job}/>}
  {a?.master&&<><h3 className={css.h3}>Files</h3><div className={css.actions}>
   <button className={`${css.btn} min-h-tap`} onClick={()=>void downloadMaster()}>Download master ({(a.master.bytes/1e6).toFixed(0)} MB)</button>
   {u(a.package)&&<a className={`${css.btn} min-h-tap`} href={u(a.package)}>Package (zip)</a>}
   {u(a.captions?.srt)&&<a className={`${css.btn} min-h-tap`} href={u(a.captions?.srt)}>Captions (SRT)</a>}</div>{dl&&<p className={css.meta} role="status">{dl}</p>}</>}
  {a?.master&&<><h3 className={css.h3}>YouTube upload</h3>
   <p className={css.meta}>Upload state: {job.upload.state}{job.upload.videoId?` · video ${job.upload.videoId} (${job.upload.visibility})`:''}{job.upload.note?` · ${job.upload.note}`:''}</p>
   <p style={{fontSize:14}}>The film is uploaded through YouTube Studio (not the API: YouTube locks API uploads from unaudited projects to private forever). Mark the upload as started, upload in Studio with the package above, then record the video id YouTube Studio shows.</p>
   <div className={css.actions}>
    {job.upload.state==='none'&&<button className={`${css.btn} min-h-tap ${css.btnRed}`} disabled={busy} onClick={()=>act({action:'upload_started'})}>Mark upload started</button>}
    {(job.upload.state==='in_progress'||job.upload.state==='uncertain')&&<button className={`${css.btn} min-h-tap`} disabled={busy} onClick={()=>{if(confirm('Only reset after checking YouTube Studio shows no upload of this film.'))void act({action:'upload_reset'})}}>Reset after checking Studio</button>}
   </div>
   {job.upload.state!=='done'&&job.upload.state!=='none'&&<form className={css.row} onSubmit={e=>{e.preventDefault();void act({action:'upload_done',videoId:vid.trim(),visibility:vis})}} style={{marginTop:10}}>
    <label className={css.meta}>Video id<input value={vid} onChange={e=>setVid(e.target.value)} pattern="[A-Za-z0-9_-]{11}" required placeholder="11 characters" className={css.input}/></label>
    <label className={css.meta}>Visibility in Studio<select value={vis} onChange={e=>setVis(e.target.value as Privacy)} className={css.input}>{(['private','unlisted','public','scheduled'] as const).map(p=><option key={p}>{p}</option>)}</select></label>
    <button className={`${css.btn} min-h-tap`} disabled={busy}>Record</button></form>}</>}
  <h3 className={css.h3}>Log</h3><div className={css.log}>{job.log.slice().reverse().map((l,i)=><div key={i}>{when(l.at)} — {l.text}</div>)}</div>
 </div>
}

/** The owner's pictures for this film, before it starts. Uploaded straight to private storage; then named in the brief. */
function Pictures({job,act,busy}:{job:Job;act:(b:Record<string,unknown>)=>Promise<void>;busy:boolean}){
 const [msg,setMsg]=useState(''),[illustrated,setIllustrated]=useState(true),[up,setUp]=useState(false)
 const art=job.brief.art??[]
 const clean=(n:string)=>n.toLowerCase().replace(/\.jpeg$/,'.jpg').replace(/[^a-z0-9._-]+/g,'-').replace(/^-+/,'').slice(-64)
 async function send(files:FileList|null){
  if(!files?.length)return
  const list=[...files].filter(f=>/\.(png|jpe?g|webp)$/i.test(f.name)&&f.size<=45*1024*1024)
  if(!list.length){setMsg('PNG, JPG or WebP, at most 45 MB each.');return}
  setUp(true);setMsg('Asking for upload links…')
  try{
   const names=list.map(f=>clean(f.name))
   const {urls}=await api(`/api/master/stories/${job.id}/art`,{method:'POST',body:JSON.stringify({names})})
   for(const [i,f] of list.entries()){const n=names[i]!;setMsg(`Uploading ${i+1} of ${list.length}: ${n}`);const r=await fetch(urls[n],{method:'PUT',body:f,headers:{'Content-Type':f.type||'application/octet-stream','x-upsert':'true'}});if(!r.ok)throw new Error(`${n} was refused (${r.status})`)}
   await act({action:'art_added',files:names.map(name=>({name,illustrated}))})
   setMsg(`${list.length} picture(s) added. Press Resume when everything is in.`)
  }catch(e){setMsg(e instanceof Error?e.message:'Upload failed')}finally{setUp(false)}
 }
 return <div className={css.pics}>
  <h3 className={css.h3}>Your pictures</h3>
  <p style={{fontSize:14}}>Name each file after what it shows (<i>el-kaabi-header.png</i>) — the writer reads the name. Blur any personal details (a name or ID on a ticket, a real newspaper&rsquo;s masthead) before uploading.</p>
  <label className={css.check}><input type="checkbox" checked={illustrated} onChange={e=>setIllustrated(e.target.checked)}/> These look like photographs or documents (the film marks them ILLUSTRATION and the upload says so)</label>
  <input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={busy||up} onChange={e=>void send(e.target.files)} className={css.input}/>
  {art.length?<p className={css.meta}>In the brief: {art.map(x=>x.name+(x.illustrated?' (illustration)':'')).join(', ')}</p>:null}
  {msg&&<p className={css.meta} role="status">{msg}</p>}
 </div>
}

type Yt={title:string;description:string;tags:string[];category:string;synthetic_media:{altered_or_synthetic:boolean;reason:string};shorts:{hook:string;idea:string}[]}
/** Everything YouTube Studio asks, in the order it asks it, each with a copy button. */
function PublishKit({yt,job}:{yt:Yt;job:Job}){
 const [copied,setCopied]=useState('')
 const copy=async(k:string,v:string)=>{try{await navigator.clipboard.writeText(v);setCopied(k);setTimeout(()=>setCopied(''),1600)}catch{setCopied('')}}
 const tags=yt.tags.join(', ')
 const rows:[string,string,string][]=[
  ['title','Title',yt.title],
  ['desc','Description',yt.description],
  ['tags','Tags',tags],
 ]
 const steps=[
  'Upload the master in YouTube Studio → Create → Upload videos.',
  'Paste the title and the description below.',
  'Thumbnail: the first of the three above (or whichever reads best on a phone).',
  'Playlist: “Seasons We Never Forget”.',
  'Audience: “No, it’s not made for kids”.',
  `Show more → Altered content: ${yt.synthetic_media.altered_or_synthetic?'YES':'No'} — ${yt.synthetic_media.reason}`,
  'Tags: paste the line below. Language English, captions: upload the SRT (with timing).',
  'Video elements → End screen: “Import from video” (a published film), Card: the club’s previous film at the halfway point.',
  `Visibility: ${job.brief.privacy}${job.brief.publish_at?` (${job.brief.publish_at})`:''} → Save, then record the video id below.`,
  'Shorts: upload each Short as its own video, hook as its title, #Shorts #football in the description, link to the film in the first comment.',
 ]
 return <><h3 className={css.h3}>Publish kit</h3>
  <ol className={css.steps}>{steps.map(x=><li key={x}>{x}</li>)}</ol>
  <div className={css.kit}>{rows.map(([k,label,v])=><div key={k}><div className={css.kitHead}><b>{label}</b> <span className={css.meta}>{v.length} chars</span><button type="button" className={`${css.btn} min-h-tap`} onClick={()=>void copy(k,v)}>{copied===k?'Copied':'Copy'}</button></div><div className={css.pre}>{v}</div></div>)}</div>
 </>
}
