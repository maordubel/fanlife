'use client'
import {useEffect,useRef,useState,type ReactNode} from 'react'
import {jobKind,type Job} from '@/lib/stories/jobs'
import {filmTitle} from '@/lib/stories/social'
import {finished,marketingBanner,type Facts} from '@/lib/stories/banners'
import type {PlanPost} from '@/lib/stories/marketing'
import {DeskBanner} from './desk'
import {api} from './stories-desk'
import {SocialPanel} from './SocialPanel'
import {PROMO_SUBJECTS,PROMO_SECONDS,type PromoAbout} from '@/lib/stories/promo'
import css from './studio.module.css'

/**
 * Marketing (owner, 4.11.2026: "marketing video production"): every finished film, Short and Reel in one place, the
 * four platforms and the Telegram packs (SocialPanel, doc 61), and what the social plan has sent today (doc 51 · 61).
 * Marketing films (owner, 8.11.2026): a 20–30 s vertical cartoon about a FAN LIFE feature, the channel, a finished film
 * or the owner's own words — written only from that subject's facts (lib/stories/promo.ts), produced with one click.
 */
const KIND_TEXT={film:'Documentary',classified:'CLASSIFIED',vlog:'I WAS THERE',promo:'Marketing film',short:'Animated Short'} as const
/** The plan's fixed day (docs/fanlife/61 §2, plan v5) — the shape of a day, not a promise that a post went out. */
const DAY:[string,string,string][]=[
 ['09:00','Stories','Live results of the FAN LIFE clubs (or nothing)'],['10:00','Feed','On this day'],['11:00','Stories','Live: next up'],
 ['13:00','Feed','DUBID · OFFSIDES · a gate of the app'],['14:00','Stories','Story quiz (answer at 17:30)'],['19:00','Feed + TikTok','The club carousel'],
 ['20:00 Wed','Stories','A film from our YouTube channel'],['21:00','Feed','Fri: a new film · other days the evening post'],
]
export function MarketingTab({facts,jobs,onChange,onMade,children}:{facts:Facts;jobs:Job[]|null;onChange:()=>void;onMade:(id:string)=>Promise<void>;children?:ReactNode}){
 const films=finished(jobs).filter(j=>jobKind(j)!=='promo')
 const [open,setOpen]=useState<string|null>(null)
 const job=films.find(j=>j.id===open)??null
 return <>
  <DeskBanner b={marketingBanner(facts)}/>
  <div className={css.grid}><NewPromo films={films} onMade={onMade}/>{children}</div>
  <div className={css.grid}>
   <section className={css.panel} aria-labelledby="mk-films">
    <div className={css.bar}><span id="mk-films">Finished films</span><span>{films.length}</span></div>
    <div className={css.body}>
     {jobs===null?<p className={css.empty}>Loading…</p>:films.length===0?<p className={css.empty}>No finished film yet.</p>:
      <ul className={css.fileList}>{films.map(j=><li key={j.id}><button type="button" className={`${css.card} min-h-tap`} aria-pressed={open===j.id} onClick={()=>setOpen(open===j.id?null:j.id)}>
       <b>{filmTitle(j)}</b>
       <span>{KIND_TEXT[jobKind(j)]} · {j.brief.club_name} · {j.artefacts?.shorts?.length??0} Short(s) · {j.upload.state==='done'?'on YouTube':'not on YouTube yet'}</span>
       <span>{(j.social?.posts??[]).length?`${j.social!.posts.length} post(s) planned or sent`:'No posts planned'}</span>
      </button></li>)}</ul>}
     <h3 className={css.h3}>Shorts and Reels</h3>
     <p className={css.hint}>Every film is also cut into its own animated 9:16 Shorts when it is made — they are listed under each film. Marketing films are made in the panel above.</p>
    </div>
   </section>
   <section className={css.list}>
    {job?<FilmMarketing key={job.id} job={job} onChange={onChange}/>:<div className={css.panel}><p className={css.empty}>Open a film to post it.</p></div>}
    <Plan posts={facts.plan}/>
   </section>
  </div>
 </>
}

function FilmMarketing({job,onChange}:{job:Job;onChange:()=>void}){
 const [urls,setUrls]=useState<Record<string,string>>({}),[err,setErr]=useState('')
 useEffect(()=>{void api(`/api/master/stories/${job.id}`).then(b=>setUrls(b.urls||{})).catch(e=>setErr(e instanceof Error?e.message:'Could not read the film.'))},[job.id])
 const shorts=job.artefacts?.shorts??[]
 return <article className={css.panel}><div className={css.body}>
  <h2 className={css.jobTitle}>{filmTitle(job)}</h2>
  {err&&<p role="alert" className={css.alert}>{err}</p>}
  <h3 className={css.h3}>Shorts and Reels</h3>
  {shorts.length?<div className={css.shorts}>{shorts.map((x,i)=><figure key={x.path}>{urls[x.path]?<video src={urls[x.path]} controls preload="metadata" playsInline/>:null}
   <figcaption><b>{x.hook}</b> · {Math.round(x.seconds)} s{urls[x.path]?<> · <a href={urls[x.path]} download={`short-${i+1}.mp4`}>Download</a></>:null}</figcaption></figure>)}</div>:<p className={css.hint}>This film has no Shorts.</p>}
  <SocialPanel job={job}/>
  <button type="button" className={`${css.btn} min-h-tap`} onClick={onChange}>Refresh</button>
 </div></article>
}

function Plan({posts}:{posts:PlanPost[]|null|undefined}){
 return <section className={css.panel} aria-labelledby="mk-plan">
  <div className={css.bar}><span id="mk-plan">The social plan</span><span>Runs by itself</span></div>
  <div className={css.body}>
   <p className={css.hint}>The page&rsquo;s daily plan (plan v5, Athens time) posts from the database on its own; the films are added from here.</p>
   <h3 className={css.h3}>Sent today</h3>
   {posts===null||posts===undefined?<p className={css.alert}>Not connected — the plan&rsquo;s database could not be asked.</p>:posts.length===0?<p className={css.hint}>Nothing sent yet today.</p>:
    <ul className={css.checks}>{posts.map(p=><li key={p.at+p.url}><b>{p.at}</b> {p.label??''} — {p.hook??''}</li>)}</ul>}
   <details className={css.more}><summary>The shape of a day</summary><ul className={css.checks}>{DAY.map(([t,w,x])=><li key={t+x}><b>{t}</b> {w} · {x}</li>)}</ul></details>
  </div>
 </section>
}

/** One click to a marketing film: what it is about, how long, an optional angle — the writer says only the subject's facts. */
function NewPromo({films,onMade}:{films:Job[];onMade:(id:string)=>Promise<void>}){
 const [about,setAbout]=useState<PromoAbout>('feature'),[subject,setSubject]=useState(PROMO_SUBJECTS[0]!.id)
 const [film,setFilm]=useState(''),[facts,setFacts]=useState(''),[label,setLabel]=useState(''),[angle,setAngle]=useState('')
 const [seconds,setSeconds]=useState<number>(30),[telegram,setTelegram]=useState(true)
 const [busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[err,setErr]=useState('')
 const key=useRef('')
 async function make(){
  setBusy(true);setErr('');setMsg('')
  if(!key.current)key.current=crypto.randomUUID()
  const brief=about==='feature'?{about,subject}:about==='film'?{about,subject:film}:about==='free'?{about,facts,label}:{about}
  try{const b=await api('/api/master/stories',{method:'POST',body:JSON.stringify({kind:'promo',brief:{...brief,seconds,angle,telegram},idempotencyKey:key.current})})
   key.current='';setMsg('Queued. The worker starts it within a few minutes; a marketing film takes about ten.');await onMade(b.job.id)}
  catch(e){setErr(e instanceof Error?e.message:'Could not queue the marketing film.')}finally{setBusy(false)}
 }
 const ready=about==='feature'||about==='channel'||(about==='film'&&!!film)||(about==='free'&&facts.trim().length>=40)
 return <section className={css.panel} aria-labelledby="mk-new">
  <div className={css.bar}><span id="mk-new">Make a marketing film</span><span>20–30 s · 9:16 cartoon</span></div>
  <div className={css.body}>
   <fieldset className={css.lab}><legend>About</legend>
    {([['feature','A FAN LIFE feature'],['channel','Our YouTube channel'],['film','A film we made'],['free','My own words']] as const).map(([v,t])=>
     <label key={v} className="min-h-tap"><input type="radio" name="promo-about" checked={about===v} onChange={()=>setAbout(v)}/> {t}</label>)}
   </fieldset>
   {about==='feature'&&<label className={css.lab}>Feature<select value={subject} onChange={e=>setSubject(e.target.value)}>{PROMO_SUBJECTS.map(f=><option key={f.id} value={f.id}>{f.label}</option>)}</select></label>}
   {about==='film'&&<label className={css.lab}>Film<select value={film} onChange={e=>setFilm(e.target.value)}><option value="">Choose a finished film…</option>{films.map(j=><option key={j.id} value={j.id}>{filmTitle(j)}</option>)}</select></label>}
   {about==='free'&&<><label className={css.lab}>Name (for the list)<input value={label} maxLength={80} onChange={e=>setLabel(e.target.value)}/></label>
    <label className={css.lab}>What the film may say — the promo says only this<textarea rows={5} value={facts} maxLength={2400} onChange={e=>setFacts(e.target.value)}/></label></>}
   <label className={css.lab}>Angle (optional — e.g. “aim it at Celtic fans”, Hebrew is fine)<input value={angle} maxLength={400} onChange={e=>setAngle(e.target.value)}/></label>
   <fieldset className={css.lab}><legend>Length</legend>{PROMO_SECONDS.map(n=><label key={n} className="min-h-tap"><input type="radio" name="promo-len" checked={seconds===n} onChange={()=>setSeconds(n)}/> {n} s</label>)}</fieldset>
   <label className={css.check}><input type="checkbox" checked={telegram} onChange={e=>setTelegram(e.target.checked)}/> Send it to my Telegram when it is ready</label>
   <button type="button" className={`${css.btn} ${css.btnRed} min-h-tap`} disabled={busy||!ready} onClick={()=>void make()}>Make the marketing film</button>
   {msg&&<p role="status" className={css.hint}>{msg}</p>}
   {err&&<p role="alert" className={css.alert}>{err}</p>}
  </div>
 </section>
}
