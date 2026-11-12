'use client'
import {useEffect,useRef,useState,type CSSProperties,type ReactNode} from 'react'
import type {Job,Privacy} from '@/lib/stories/jobs'
import {autopilotLine} from '@/lib/stories/autopilot'
import {keysText} from '@/lib/stories/writerKeys'
import {UNUPLOADED_TEXT} from '@/lib/stories/trim'
import type {Health} from '@/lib/stories/health'
import type {Evidence} from '@/lib/stories/catalog'
import {STAGES} from '@/lib/stories/jobs'
import css from './studio.module.css'
import {EditorialRoom,EditorialSteps} from './EditorialRoom'
import {SocialPanel} from './SocialPanel'
import {uploadPictures,validatePictures} from '@/lib/stories/pictureUpload'
import {directorOfOption,DIRECTORS} from '@/lib/stories/directors'

export type Club={id:string;name:string;primary:string;on:string;seasons:{season:string;matches:number}[]}
export const ATHENS=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Athens',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})
export const when=(iso:string|null|undefined)=>iso?`${ATHENS.format(new Date(iso))} Athens`:''
export const mins=(d:number)=>d<1?'30 sec':`${d} min`
const STATE_TEXT:Record<Job['state'],string>={queued:'Waiting for the worker',running:'In production',paused:'Paused',cancel_requested:'Stopping',cancelled:'Cancelled',failed:'Failed',needs_review:'Needs your review',ready:'Ready'}
const STAGE_TEXT:Record<string,string>={research:'Research',script:'Script',voice:'Voice',graphics:'Graphics',edit:'Edit',mix:'Sound',master:'Master',package:'Package',qa:'Checks',done:'Done'}

export async function api(path:string,init?:RequestInit){
 const r=await fetch(path,{cache:'no-store',...init,headers:{'Content-Type':'application/json',...(init?.headers||{})}})
 const b=await r.json().catch(()=>({}))
 if(!r.ok)throw new Error(b.error||`Request failed (${r.status})`)
 return b
}

type Kind='season'|'match'|'tie'|'rivalry'
export type Match={id:string;date:string;season:string;competition:string|null;stage:string|null;home:string;away:string;score:string;outcome:'win'|'draw'|'loss';opponent:string;tags:string[];evidence?:Evidence}
type Opp={name:string;played:number;won:number;drawn:number;lost:number;first:string;last:string;derby:boolean}
const KIND_CARDS:{k:Kind;title:string;line:string}[]=[
 {k:'match',title:'One match',line:'The night itself — the build-up, the minutes that decided it, what it meant.'},
 {k:'tie',title:'A tie or a run',line:'Two legs, a cup run, a week that changed everything — two to eight matches.'},
 {k:'season',title:'A whole season',line:'From the first day to the last, in order.'},
 {k:'rivalry',title:'A rivalry',line:'Every meeting with one opponent, across the years.'},
]
const LENGTHS:Record<Kind,number[]>={match:[2,3,5,7],tie:[3,5,7,10],season:[5,7,10,12,15],rivalry:[5,7,10,12,15]}
const LENGTH0:Record<Kind,number>={match:5,tie:7,season:10,rivalry:10}
const STYLE_CARDS:{k:string;title:string;line:string}[]=[
 {k:'collage',title:'The Weekly collage',line:'Scoreline cards, stats, maps and drawn beats on paper.'},
 {k:'papercut',title:'Paper-cut',line:'The paper-cut scene library from your Drive as the backdrop.'},
 {k:'archive',title:'The archive',line:'Press cuttings, tickets, stamped scores — a warm, grainy grade.'},
 {k:'night',title:'Night broadcast',line:'Floodlights, terraces and rain in moving footage; a cool grade.'},
]
const TONE_CHIPS:[string,string][]=[['auto','Let the story decide'],['triumph','Triumph'],['heartbreak','Heartbreak'],['underdog','Underdog'],['rivalry','Rivalry'],['nostalgia','Nostalgia'],['drama','Drama']]
const FILTERS:[string,string][]=[['rich','Most material'],['big','Big nights'],['final','Finals'],['derby','Derbies'],['europe','Europe'],['','All']]
export const dayOf=(d:string)=>new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})
const TAG_TEXT:Record<string,string>={final:'Final',derby:'Derby',europe:'Europe','big-score':'Big score',penalties:'Penalties','extra-time':'Extra time',goals:'Goals'}

/** Click and make (studio v3): every choice is a card or a chip, in the order a film is decided. Nothing to type unless
 *  the owner opens "More". The server checks each choice against the club's archive again before it queues. */
export function NewFilm({clubs,onMade}:{clubs:Club[];onMade:(id:string)=>Promise<void>}){
 const [club,setClub]=useState(''),[kind,setKind]=useState<Kind|''>('')
 const [season,setSeason]=useState(''),[picked,setPicked]=useState<Match[]>([]),[opp,setOpp]=useState<Opp|null>(null)
 const [duration,setDuration]=useState(10),[style,setStyle]=useState('collage'),[tone,setTone]=useState('auto')
 const [folder,setFolder]=useState(''),[pictures,setPictures]=useState<File[]>([])
 const [scripts,setScripts]=useState<1|3>(3),[drive,setDrive]=useState(true),[reel,setReel]=useState(false),[privacy,setPrivacy]=useState<Privacy>('private')
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const key=useRef<string>('')
 const more=useRef<HTMLFormElement>(null)
 const c=clubs.find(x=>x.id===club)
 const chooseKind=(k:Kind)=>{setKind(k);setPicked([]);setOpp(null);setDuration(LENGTH0[k]);if(k==='season'&&c&&!season)setSeason(c.seasons[0]?.season||'')}
 const chooseClub=(id:string)=>{setClub(id);setPicked([]);setOpp(null);setSeason(clubs.find(x=>x.id===id)?.seasons[0]?.season||'')}
 const ready=!!c&&!!kind&&(kind==='season'?!!season:kind==='match'?picked.length===1:kind==='tie'?picked.length>=2:!!opp)
 const subject=!c||!kind?'':kind==='season'?`${c.name} · ${season}`:kind==='rivalry'?(opp?`${c.name} v ${opp.name} · ${opp.played} meetings, ${opp.first.slice(0,4)}–${opp.last.slice(0,4)}`:''):
  picked.length?`${picked[0]!.home} ${picked[0]!.score} ${picked[0]!.away}${picked.length>1?` + ${picked.length-1} more`:''} · ${dayOf(picked[0]!.date)}`:''

 async function make(){
  if(!ready||!c||!kind)return
  setError('');setNotice('');
  try{validatePictures(pictures)}catch(e){setError(e instanceof Error?e.message:'Invalid pictures');return}
  setBusy(true)
  if(!key.current)key.current=crypto.randomUUID()
  const d=new FormData(more.current??undefined)
  const local=String(d.get('publish_at')||'')
  const sorted=[...picked].sort((a,b)=>a.date.localeCompare(b.date))
  const brief={club_id:c.id,kind,season:kind==='season'?season:kind==='rivalry'?'1900–2100':sorted[0]?.season,match_ids:sorted.map(m=>m.id),opponent:opp?.name,
   duration,visual_style:style,tone,scripts,drive,drive_folder:folder.trim()||undefined,reel_to_telegram:reel,privacy,publish_at:privacy==='scheduled'&&local?athensToIso(local):undefined,
   topic:d.get('topic')||'',notes:d.get('notes')||'',hold:pictures.length>0||d.get('hold')==='on',voice:d.get('voice')||'auto',crowd:d.get('crowd')||'soft',
   review:d.get('review')==='auto'?'auto':'editorial'}
  try{const b=await api('/api/master/stories',{method:'POST',body:JSON.stringify({brief,idempotencyKey:key.current})});
   await onMade(b.job.id)
   if(pictures.length){
    await uploadPictures(b.job.id,pictures,true,setNotice)
    if(d.get('hold')!=='on')await api(`/api/master/stories/${b.job.id}`,{method:'POST',body:JSON.stringify({action:'resume'})})
   }
   key.current=''
   setPictures([])
   setNotice(d.get('hold')==='on'?'Created and held. Open it, add your pictures, then press Resume.':scripts===3?'Queued. In a few minutes three scripts are waiting for you below — pick one and the film makes itself.':'Queued. The studio starts it within a few minutes.')
   await onMade(b.job.id)}
  catch(err){setError(err instanceof Error?err.message:'Could not queue the film.')}finally{setBusy(false)}
 }

 return <section className={`${css.panel} ${css.form}`} aria-labelledby="new-film">
  <div className={css.bar}><span id="new-film">New film</span><span>Click and make</span></div>
  <div className={css.body}>
   <Step n={1} title="Which club?">
    <div className={css.tiles}>{clubs.map(x=><button type="button" key={x.id} className={`${css.tile} min-h-tap`} aria-pressed={club===x.id} onClick={()=>chooseClub(x.id)} style={{'--c':x.primary,'--on':x.on} as CSSProperties}><span className={css.sw} aria-hidden/>{x.name}<small>{x.seasons.length} seasons</small></button>)}</div>
   </Step>
   {c&&<Step n={2} title="What is the film about?">
    <div className={css.cards}>{KIND_CARDS.map(k=><button type="button" key={k.k} className={`${css.card} min-h-tap`} aria-pressed={kind===k.k} onClick={()=>chooseKind(k.k)}><b>{k.title}</b><span>{k.line}</span></button>)}</div>
   </Step>}
   {c&&kind&&<Step n={3} title={kind==='match'?'Choose the match':kind==='tie'?'Choose the matches':kind==='season'?'Choose the season':'Choose the opponent'}>
    {kind==='season'&&<label className={css.lab}>Season<select value={season} onChange={e=>setSeason(e.target.value)}>{c.seasons.map(s=><option key={s.season} value={s.season}>{s.season} · {s.matches} matches</option>)}</select></label>}
    {(kind==='match'||kind==='tie')&&<MatchPicker club={c} multi={kind==='tie'} picked={picked} setPicked={setPicked}/>}
    {kind==='rivalry'&&<OppPicker club={c} opp={opp} setOpp={setOpp}/>}
   </Step>}
   {ready&&<>
    <Step n={4} title="How long?"><div className={css.chips} role="group" aria-label="Length">{LENGTHS[kind as Kind].map(d=><button type="button" key={d} className={`${css.chip} min-h-tap`} aria-pressed={duration===d} onClick={()=>setDuration(d)}>{mins(d)}</button>)}</div></Step>
    <Step n={5} title="The look"><div className={css.cards}>{STYLE_CARDS.map(x=><button type="button" key={x.k} className={`${css.card} min-h-tap`} aria-pressed={style===x.k} onClick={()=>setStyle(x.k)}><b>{x.title}</b><span>{x.line}</span></button>)}</div></Step>
    <Step n={6} title="The feeling"><div className={css.chips} role="group" aria-label="Tone">{TONE_CHIPS.map(([k,l])=><button type="button" key={k} className={`${css.chip} min-h-tap`} aria-pressed={tone===k} onClick={()=>setTone(k)}>{l}</button>)}</div></Step>
    <Step n={7} title="The script">
     <div className={css.cards}>
      <button type="button" className={`${css.card} min-h-tap`} aria-pressed={scripts===3} onClick={()=>setScripts(3)}><b>Three scripts to choose from</b><span>One per director — {DIRECTORS.map(d=>d.name).join(' · ')}. You pick one; the film makes itself.</span></button>
      <button type="button" className={`${css.card} min-h-tap`} aria-pressed={scripts===1} onClick={()=>setScripts(1)}><b>Straight to the film</b><span>One script, no stop. Fastest.</span></button>
     </div>
    </Step>
    <Step n={8} title="Extras">
     <label className={css.check}><input type="checkbox" checked={drive} onChange={e=>setDrive(e.target.checked)}/> Scan the Google Drive library for this story (its own packs first, then the club&rsquo;s pictures)</label>
    <label className={css.lab}>Drive folder for this story (optional)<input value={folder} onChange={e=>setFolder(e.target.value)} placeholder="https://drive.google.com/drive/folders/…" inputMode="url"/><span className={css.hint}>Every supported image in this folder and its subfolders must appear in the film. Text and Markdown files become your story brief and are checked against the research. A folder can contain only text. Share it as “Anyone with the link”. Leave empty for automatic library matching.</span></label>
     <label className={css.lab}>Your pictures (required in the film)<input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={busy} onChange={e=>setPictures(Array.from(e.target.files??[]))}/><span className={css.hint}>{pictures.length?`${pictures.length} picture(s) selected. `:''}All selected pictures will appear. The film may run longer to give each one time on screen; missing files stop the job.</span></label>
     <p className={css.hint}>Each script searches Wikimedia Commons for relevant public-domain and CC0 photographs. Matches supplement your required pictures; sources and licences are included in the production package.</p>
     <label className={css.check}><input type="checkbox" checked={reel} onChange={e=>setReel(e.target.checked)}/> Send the first Reel to my Telegram when it is done</label>
     <div className={css.lab}>YouTube visibility<div className={css.chips} role="group" aria-label="Visibility">{(['private','unlisted','public','scheduled'] as const).map(p=><button type="button" key={p} className={`${css.chip} min-h-tap`} aria-pressed={privacy===p} onClick={()=>setPrivacy(p)}>{p}</button>)}</div></div>
    </Step>
    <form ref={more} className={css.form} onSubmit={e=>e.preventDefault()}>
     {privacy==='scheduled'&&<label>Publish at (Athens time)<input type="datetime-local" name="publish_at" required/></label>}
     <details className={css.more}><summary>More (optional)</summary>
      <label>A line for the writer<textarea name="topic" maxLength={240} placeholder="e.g. Twelve years of waiting, then five days in May"/></label>
      <label>Quotes and headlines<textarea name="notes" maxLength={6000} rows={4} placeholder={'quote | Speaker | role | the exact words | https://source\npress | Outlet | 2024-03-15 | The headline as printed | https://source'}/><span className={css.hint}>One per line, each with the page you read it on. Quoted word for word.</span></label>
      <label className={css.check}><input type="checkbox" name="hold"/> I will add my own pictures first (the film waits for Resume)</label>
      <div className={css.row}>
       <label>Narrator<select name="voice" defaultValue="auto"><option value="auto">Automatic</option><option value="elevenlabs">ElevenLabs (premium)</option><option value="kokoro">Free British voice</option></select></label>
       <label>Crowd<select name="crowd" defaultValue="soft"><option value="soft">Soft, at the goals</option><option value="off">None</option></select></label>
      </div>
      {scripts===1&&<label>Production review<select name="review" defaultValue="editorial"><option value="editorial">Approve script and scenes</option><option value="auto">Automatic</option></select></label>}
     </details>
    </form>
    <div className={css.summary} aria-live="polite"><b>{subject}</b><span>{mins(duration)} · {STYLE_CARDS.find(x=>x.k===style)?.title} · {TONE_CHIPS.find(x=>x[0]===tone)?.[1]} · {scripts===3?'3 scripts':'1 script'}{folder.trim()?' · your Drive folder':drive?' · Drive scan':''}{reel?' · Reel to Telegram':''} · {privacy}</span></div>
    <button type="button" className={`${css.go} min-h-tap`} disabled={busy} onClick={()=>void make()}>{busy?'Queuing…':'Make it'}</button>
   </>}
   {error&&<p role="alert" className={css.alert}>{error}</p>}{notice&&<p role="status" className={`${css.alert} ${css.ok}`}>{notice}</p>}
  </div>
 </section>
}

export function Step({n,title,children}:{n:number;title:string;children:ReactNode}){
 return <fieldset className={css.step}><legend><span className={css.num}>{n}</span>{title}</legend>{children}</fieldset>
}

export function MatchPicker({club,multi,picked,setPicked}:{club:Club;multi:boolean;picked:Match[];setPicked:(m:Match[])=>void}){
 const [tag,setTag]=useState('big'),[season,setSeason]=useState(''),[q,setQ]=useState(''),[rows,setRows]=useState<Match[]>([]),[total,setTotal]=useState(0),[err,setErr]=useState(''),[loading,setLoading]=useState(false)
 useEffect(()=>{
  const ctl=new AbortController(),t=setTimeout(()=>{setLoading(true)
   const u=new URLSearchParams({club:club.id,limit:'60',order:tag||season?'big':'new'});if(tag)u.set('tag',tag);if(season)u.set('season',season);if(q.trim())u.set('q',q.trim())
   fetch(`/api/master/stories/catalog?${u}`,{signal:ctl.signal,cache:'no-store'}).then(r=>r.json().then(b=>{if(!r.ok)throw new Error(b.error||'Could not read the archive.');setRows(b.matches);setTotal(b.total);setErr('')}))
    .catch(e=>{if(e.name!=='AbortError')setErr(e.message)}).finally(()=>setLoading(false))},q?250:0)
  return()=>{clearTimeout(t);ctl.abort()}
 },[club.id,tag,season,q])
 const on=(m:Match)=>picked.some(x=>x.id===m.id)
 const toggle=(m:Match)=>{if(!multi)return setPicked(on(m)?[]:[m]);if(on(m))return setPicked(picked.filter(x=>x.id!==m.id));if(picked.length&&picked[0]!.season!==m.season)return setErr('A tie or a run stays inside one season.');if(picked.length>=8)return setErr('At most eight matches.');setErr('');setPicked([...picked,m])}
 return <div>
  <div className={css.chips} role="group" aria-label="Which matches">{FILTERS.map(([k,l])=><button type="button" key={l} className={`${css.chip} min-h-tap`} aria-pressed={tag===k} onClick={()=>setTag(k)}>{l}</button>)}</div>
  <div className={css.row}>
   <label className={css.lab}>Season<select value={season} onChange={e=>setSeason(e.target.value)}><option value="">Every season</option>{club.seasons.map(s=><option key={s.season} value={s.season}>{s.season}</option>)}</select></label>
   <label className={css.lab}>Search<input value={q} onChange={e=>setQ(e.target.value)} placeholder="Opponent, cup, year" type="search"/></label>
  </div>
  {multi&&<p className={css.hint}>{picked.length?`${picked.length} chosen (${picked[0]!.season}) — two to eight, one season.`:'Tap two to eight matches from one season.'}</p>}
  {err&&<p role="alert" className={css.alert}>{err}</p>}
  <ul className={css.matches} aria-busy={loading}>{rows.map(m=><li key={m.id}><button type="button" className={`${css.match} min-h-tap`} aria-pressed={on(m)} onClick={()=>toggle(m)}>
   <span className={css.mDate}>{dayOf(m.date)}<small>{m.competition??''}{m.stage?` · ${m.stage}`:''}</small></span>
   <span className={css.mScore}>{m.home} <b data-o={m.outcome}>{m.score}</b> {m.away}</span>
   {m.tags.length||m.evidence?.level!=='thin'?<span className={css.mTags}>{m.evidence&&m.evidence.level!=='thin'?<EvidenceBadge e={m.evidence}/>:null}{m.tags.filter(t=>TAG_TEXT[t]).map(t=><i key={t}>{TAG_TEXT[t]}</i>)}</span>:null}
  </button></li>)}</ul>
  <p className={css.hint}>{loading?'Reading the archive…':rows.length?`Showing ${rows.length} of ${total}. Narrow it with a season or a search.`:'No match fits. Try All, or another season.'}</p>
 </div>
}

/** How much the studio holds about a night (studio/evidence.py), as one badge: the reasons are its title. */
export function EvidenceBadge({e}:{e:Evidence}){
 return <i className={css.evidence} data-level={e.level} title={e.has.join(' · ')}>{e.level==='rich'?'★ Rich record':'Good record'}</i>
}

function OppPicker({club,opp,setOpp}:{club:Club;opp:Opp|null;setOpp:(o:Opp)=>void}){
 const [rows,setRows]=useState<Opp[]>([]),[q,setQ]=useState(''),[err,setErr]=useState('')
 useEffect(()=>{fetch(`/api/master/stories/catalog?club=${club.id}&limit=1`,{cache:'no-store'}).then(r=>r.json().then(b=>{if(!r.ok)throw new Error(b.error||'Could not read the archive.');setRows(b.opponents)})).catch(e=>setErr(e.message))},[club.id])
 const f=q.trim().toLowerCase()
 const list=rows.filter(o=>!f||o.name.toLowerCase().includes(f)).sort((a,b)=>Number(b.derby)-Number(a.derby)||b.played-a.played).slice(0,30)
 return <div>
  <label className={css.lab}>Search<input value={q} onChange={e=>setQ(e.target.value)} placeholder="Opponent" type="search"/></label>
  {err&&<p role="alert" className={css.alert}>{err}</p>}
  <ul className={css.matches}>{list.map(o=><li key={o.name}><button type="button" className={`${css.match} min-h-tap`} aria-pressed={opp?.name===o.name} onClick={()=>setOpp(o)}>
   <span className={css.mScore}>{o.name}{o.derby?<i className={css.derby}>Derby</i>:null}</span>
   <span className={css.mDate}>{o.played} meetings · {o.won}W {o.drawn}D {o.lost}L<small>{o.first.slice(0,4)}–{o.last.slice(0,4)}</small></span>
  </button></li>)}</ul>
 </div>
}

/** A datetime-local value read as Athens wall-clock time → an ISO string with Athens' offset on that date. */
function athensToIso(local:string){
 const [d,t]=local.split('T');const guess=new Date(`${d}T${t}:00Z`)
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Athens',timeZoneName:'longOffset'}).formatToParts(guess)
 const off=(parts.find(p=>p.type==='timeZoneName')?.value||'GMT+02:00').replace('GMT','')||'+00:00'
 return `${d}T${t}:00${off}`
}

export function JobCard({job,open,onOpen,onChange}:{job:Job;open:boolean;onOpen:()=>void;onChange:()=>void}){
 const [err,setErr]=useState(''),[busy,setBusy]=useState(false)
 const b=job.brief
 const title=(job.youtube?.title as string)||job.editorial?.drafts.find(d=>d.option===0)?.title||b.topic||`${b.club_name} · ${b.season}`
 const act=async(body:Record<string,unknown>)=>{setErr('');setBusy(true);try{await api(`/api/master/stories/${job.id}`,{method:'POST',body:JSON.stringify(body)});onChange()}catch(e){setErr(e instanceof Error?e.message:'Failed')}finally{setBusy(false)}}
 const remove=async()=>{
  if(!confirm('Permanently delete this production, its scripts, uploads, video and working caches? This cannot be undone. Original Drive files and already published videos stay online. Storage cleanup continues automatically in the background.'))return
  setErr('');setBusy(true)
  try{await api(`/api/master/stories/${job.id}`,{method:'DELETE'});onChange()}catch(e){setErr(e instanceof Error?e.message:'Deletion failed')}finally{setBusy(false)}
 }
 const si=job.stage?STAGES.indexOf(job.stage):-1
 return <article className={`${css.panel} ${css.job}`}>
  <div className={css.body}>
   <div className={css.jobHead}><div><h2 className={css.jobTitle}>{title}</h2>
    <p className={css.meta}>{b.club_name} · {b.season} · {mins(b.duration)} · {b.privacy}{b.publish_at?` ${when(b.publish_at)}`:''} · queued {when(job.createdAt)}</p></div>
    <span className={`${css.state} ${css['s_'+job.state]}`}>{STATE_TEXT[job.state]}</span></div>
   {['running','queued','paused','cancel_requested'].includes(job.state)&&<>
    <div className={css.track} role="progressbar" aria-valuenow={Math.round(job.progress*100)} aria-valuemin={0} aria-valuemax={100}><div className={css.fill} style={{width:`${Math.round(job.progress*100)}%`}}/></div>
    <p className={css.meta}>{job.state==='queued'&&job.notBefore?`Waiting for Google's free writer — starts again by itself at ${new Date(job.notBefore).toLocaleString('en-GB',{weekday:'short',hour:'2-digit',minute:'2-digit'})}. Nothing is wrong with the film.`:job.message}</p>
    <ol className={css.stages}>{STAGES.filter(s=>s!=='done').map((s,i)=><li key={s} data-on={i===si||undefined} data-done={i<si||undefined}>{STAGE_TEXT[s]}</li>)}</ol></>}
   {job.autopilot&&<p className={css.meta} role="status"><b>{autopilotLine(job.autopilot)}</b>{job.autopilot.state==='producing'||job.autopilot.state==='window'?' · the Telegram message carries the Cancel publishing link':''}</p>}
   {job.trim?.reason==='unuploaded'&&<p className={css.alert} role="status">This film&rsquo;s {UNUPLOADED_TEXT}. Its record, captions, pictures and upload pack are kept.</p>}
   {job.error&&<p className={css.alert} role="alert"><b>[{job.error.code}]</b> {job.error.message} {job.error.retryable?'— safe to retry.':'— fix the cause before retrying.'}</p>}
   {b.review==='editorial'?<><EditorialSteps job={job}/>{job.state==='needs_review'?<p className={css.alert}>{job.message}</p>:null}</>:
    job.state==='needs_review'&&job.stage==='script'&&job.options?.length?<ScriptChoice job={job} busy={busy} pick={n=>act({action:'choose_script',option:n})}/>:
    job.state==='needs_review'&&job.stage==='script'?<p className={css.alert}>The script is written and waiting for you. Open the film to read it, then approve.</p>:null}
   <div className={css.actions}>
    {['queued','running'].includes(job.state)&&<button className={`${css.btn} min-h-tap`} disabled={busy} onClick={()=>act({action:'pause'})}>Pause</button>}
    {job.state==='paused'&&<button className={`${css.btn} min-h-tap`} disabled={busy} onClick={()=>act({action:'resume'})}>Resume</button>}
    {(['failed','cancelled'].includes(job.state)||(job.state==='queued'&&!!job.notBefore))&&<button className={`${css.btn} min-h-tap`} disabled={busy} onClick={()=>act({action:'retry'})}>{job.state==='queued'?'Try now':'Retry'}</button>}
    {job.state==='failed'&&job.error?.code==='SCRIPT_INVALID'&&!['classified','vlog','promo'].includes(job.kind??'')?<button className={`${css.btn} ${css.btnRed} min-h-tap`} disabled={busy} onClick={()=>act({action:'retry_editorial'})}>Retry in editing room</button>:null}
    {b.review!=='editorial'&&job.state==='needs_review'&&job.stage==='script'&&!job.options?.length&&<button className={`${css.btn} min-h-tap ${css.btnRed}`} disabled={busy} onClick={()=>act({action:'approve_script'})}>Approve script</button>}
    {!['cancelled','cancel_requested'].includes(job.state)&&job.upload.state!=='done'&&<button className={`${css.btn} min-h-tap`} disabled={busy} onClick={()=>{if(confirm('Cancel this film?'))void act({action:'cancel'})}}>Cancel</button>}
    <button className={`${css.btn} min-h-tap`} disabled={busy} onClick={()=>void remove()}>Delete production</button>
    <button className={`${css.btn} min-h-tap ${b.review==='editorial'&&job.state==='needs_review'?css.btnRed:''}`} onClick={onOpen} aria-expanded={open}>{open?'Close':b.review==='editorial'&&job.state==='needs_review'?'Open editing room':'Open'}</button>
   </div>
   {err&&<p role="alert" className={css.alert}>{err}</p>}
   {open&&<Detail job={job} act={act} busy={busy} onChange={onChange}/>}
  </div>
 </article>
}

/** Three scripts, one per director (docs/fanlife/66 §5): who wrote it, what it opens with, how it is built. One click
 *  makes the film. A film made from a pitch lists the pitching director first. */
function ScriptChoice({job,busy,pick}:{job:Job;busy:boolean;pick:(n:number)=>Promise<void>}){
 return <div className={css.choice}>
  <h3 className={css.h3}>Pick the script</h3>
  <p className={css.hint}>Three directors, the same facts, three different films. Pick one and the film makes itself — voice, pictures, edit, checks.</p>
  <div className={css.options}>{job.options!.map(o=><article key={o.n} className={css.option}>
   {(()=>{const d=directorOfOption(o);return <><p className={css.kicker2}>{d?.name??o.angle} · {o.words} words{job.brief.lead_director&&d?.id===job.brief.lead_director?' · his pitch':''}</p>{d&&<p className={css.tagline}>{d.tagline}</p>}</>})()}
   <h4>{o.title}</h4>
   <p className={css.hook}>&ldquo;{o.hook}&rdquo;</p>
   {o.hook_options?.length?<details><summary>Three opening hooks</summary><ol>{o.hook_options.map((h,i)=><li key={i}>{h.text}</li>)}</ol><small>Opening 1 is used in this script; alternatives are for review.</small></details>:null}
   <p className={css.opening}>{o.opening}</p>
   <ol className={css.chapters}>{o.chapters.map(c=><li key={c}>{c}</li>)}</ol>
   <button type="button" className={`${css.btn} ${css.btnRed} min-h-tap`} disabled={busy} onClick={()=>void pick(o.n)}>Make this one</button>
  </article>)}</div>
 </div>
}

function Detail({job,act,busy,onChange}:{job:Job;act:(b:Record<string,unknown>)=>Promise<void>;busy:boolean;onChange:()=>void}){
 const [urls,setUrls]=useState<Record<string,string>>({}),[script,setScript]=useState<string>('')
 const [vid,setVid]=useState(''),[vis,setVis]=useState<Privacy>(job.brief.privacy),[dl,setDl]=useState('')
 const a=job.artefacts
 useEffect(()=>{void api(`/api/master/stories/${job.id}`).then(b=>setUrls(b.urls||{})).catch(()=>{})},[job.id,job.updatedAt])
 useEffect(()=>{const su=a?.package?urls[a.package.path]:undefined;if(job.stage==='script'&&su)void fetch(su).then(r=>r.text()).then(t=>{try{const s=JSON.parse(t);setScript(s.chapters.map((c:{title:string;beats:{narration:string}[]})=>`${c.title.toUpperCase()}\n`+c.beats.map(b=>b.narration).join('\n')).join('\n\n'))}catch{setScript(t)}})},[a,urls,job.stage])
 const raw=job.youtube as null|{title:string;description:string;tags:string[];category:string;chapters:{time:string;title:string}[];synthetic_media:{altered_or_synthetic:boolean;reason:string};title_candidates:{title:string;angle:string}[];shorts:{hook:string;idea:string}[]}
 // a package of another shape (an older CLASSIFIED or vlog job) is not drawn as one rather than breaking the card
 const yt=raw&&typeof raw.title==='string'&&raw.synthetic_media&&Array.isArray(raw.title_candidates)&&Array.isArray(raw.tags)&&Array.isArray(raw.shorts)?raw:null
 const u=(p?:{path:string}|null)=>p?urls[p.path]:undefined
 async function downloadMaster(){
  setDl('Fetching the master…')
  try{const b=await api(`/api/master/stories/${job.id}?master=1`);const parts:Blob[]=[]
   for(const [i,c] of (a?.master?.chunks||[]).entries()){setDl(`Part ${i+1} of ${a!.master!.chunks.length}…`);const r=await fetch(b.urls[c.path]);if(!r.ok)throw new Error('A part could not be read');parts.push(await r.blob())}
   const blob=new Blob(parts,{type:'video/mp4'});const href=URL.createObjectURL(blob);const x=document.createElement('a');x.href=href;x.download=`${(yt?.title||'fanlife-film').replace(/[^\w-]+/g,'-').slice(0,80)}.mp4`;x.click();setTimeout(()=>URL.revokeObjectURL(href),60000);setDl(`Downloaded ${(blob.size/1e6).toFixed(0)} MB`)}
  catch(e){setDl(e instanceof Error?e.message:'Download failed')}
 }
 return <div>
  {job.brief.review==='editorial'?<EditorialRoom job={job} urls={urls} busy={busy} act={act}/>:null}
  {(['queued','paused'].includes(job.state)||job.state==='needs_review'&&job.stage==='edit'&&job.brief.review==='editorial')&&!['classified','vlog','promo'].includes(job.kind??'')&&<Pictures job={job} onChange={onChange} busy={busy}/>}
  {job.brief.art?.length&&!['queued','paused'].includes(job.state)?<p className={css.meta}>Your pictures: {job.brief.art.map(x=>(x.originalName||x.name)+(x.illustrated?' (illustration)':'')).join(', ')}</p>:null}
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
  {a?.master&&<SocialPanel job={job}/>}
  {a?.master&&job.trim&&<><h3 className={css.h3}>Files</h3><p className={css.meta}>{job.trim.reason==='unuploaded'?`The film's ${UNUPLOADED_TEXT}.`:'The big files were removed after the YouTube upload.'}</p></>}
  {a?.master&&!job.trim&&<><h3 className={css.h3}>Files</h3><div className={css.actions}>
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
function Pictures({job,onChange,busy}:{job:Job;onChange:()=>void;busy:boolean}){
 const [msg,setMsg]=useState(''),[illustrated,setIllustrated]=useState(true),[up,setUp]=useState(false)
 const art=job.brief.art??[]
 async function send(files:FileList|null){
  if(!files?.length)return
  const list=Array.from(files)
  try{validatePictures(list)}catch(e){setMsg(e instanceof Error?e.message:'Invalid pictures');return}
  setUp(true);setMsg('Preparing your pictures…')
  try{
   if(job.state==='queued')await api(`/api/master/stories/${job.id}`,{method:'POST',body:JSON.stringify({action:'pause'})})
   await uploadPictures(job.id,list,illustrated,setMsg)
   setMsg(`${list.length} required picture(s) added. Press Resume when everything is in.`)
  }catch(e){setMsg(e instanceof Error?e.message:'Upload failed')}finally{setUp(false);onChange()}
 }
 return <div className={css.pics}>
  <h3 className={css.h3}>Your pictures</h3>
  <p style={{fontSize:14}}>Every picture you add must appear in the film. Descriptive names help place it in the right scene (<i>el-kaabi-header.png</i>). Blur any personal details (a name or ID on a ticket, a real newspaper&rsquo;s masthead) before uploading.</p>
  <label className={css.check}><input type="checkbox" checked={illustrated} onChange={e=>setIllustrated(e.target.checked)}/> These look like photographs or documents (the film marks them ILLUSTRATION and the upload says so)</label>
  <input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={busy||up} onChange={e=>void send(e.target.files)} className={css.input}/>
  {art.length?<p className={css.meta}>In the brief: {art.map(x=>(x.originalName||x.name)+(x.illustrated?' (illustration)':'')).join(', ')}</p>:null}
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

/** Can the studio make a film right now? Three lights, each with the one thing to do when it is off. */
export function HealthStrip({h}:{h:Health}){
 const w=h.writer
 const rows:[string,boolean|null,string][]=[
  ['Studio worker',h.listener.ok,h.listener.ok?'Listening — a new film starts within a few minutes':h.listener.at?`Last seen ${when(h.listener.at)} — it restarts by itself; GitHub → Actions → "Football Stories · listener" → Run workflow starts it now`:'Not started yet — GitHub → Actions → "Football Stories · listener" → Run workflow'],
  ['Script writer',w?w.ok:null,!w?'Checked by the worker on its next round':w.provider==='none'?'No key: add GEMINI_API_KEY in GitHub → Settings → Secrets → Actions':w.keys?.length?`${keysText(w.keys)}${w.ok&&w.model?` · ${w.model}`:''} · checked ${when(w.keys[0]!.at)}`:w.ok?`${w.provider==='gemini'?'Gemini':w.provider} key works${w.model?` · ${w.model}`:''}`:`The ${w.provider} key was refused${w.note?` (${w.note})`:''} — paste it again in GitHub → Settings → Secrets → Actions`],
  ['Film storage',h.storage.ok,h.storage.ok?'Private bucket ready':h.storage.note||'Storage is not ready'],
  ['Narrator',true,'Kokoro George · names from the lexicon (Take B, 4.11.2026)'],
 ]
 return <ul className={css.health} aria-label="Studio status">{rows.map(([k,ok,text])=><li key={k} data-ok={ok===null?'wait':ok?'yes':'no'}><b>{k}</b><span>{text}</span></li>)}</ul>
}
