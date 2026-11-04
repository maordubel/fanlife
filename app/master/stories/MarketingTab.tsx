'use client'
import {useEffect,useState} from 'react'
import {jobKind,type Job} from '@/lib/stories/jobs'
import {filmTitle} from '@/lib/stories/social'
import {finished,marketingBanner,type Facts} from '@/lib/stories/banners'
import type {PlanPost} from '@/lib/stories/marketing'
import {DeskBanner} from './desk'
import {api} from './stories-desk'
import {SocialPanel} from './SocialPanel'
import css from './studio.module.css'

/**
 * Marketing (owner, 4.11.2026: "marketing video production"): every finished film, Short and Reel in one place, the
 * four platforms and the Telegram packs (SocialPanel, doc 61), and what the social plan has sent today (doc 51 · 61).
 * A cut made only for marketing (a channel trailer) is not built: the Shorts are cut with every film, and that is said.
 */
const KIND_TEXT={film:'Documentary',classified:'CLASSIFIED',vlog:'I WAS THERE'} as const
/** The plan's fixed day (docs/fanlife/61 §2, plan v5) — the shape of a day, not a promise that a post went out. */
const DAY:[string,string,string][]=[
 ['09:00','Stories','Live results of the FAN LIFE clubs (or nothing)'],['10:00','Feed','On this day'],['11:00','Stories','Live: next up'],
 ['13:00','Feed','DUBID · OFFSIDES · a gate of the app'],['14:00','Stories','Story quiz (answer at 17:30)'],['19:00','Feed + TikTok','The club carousel'],
 ['20:00 Wed','Stories','A film from our YouTube channel'],['21:00','Feed','Fri: a new film · other days the evening post'],
]
export function MarketingTab({facts,jobs,onChange}:{facts:Facts;jobs:Job[]|null;onChange:()=>void}){
 const films=finished(jobs)
 const [open,setOpen]=useState<string|null>(null)
 const job=films.find(j=>j.id===open)??null
 return <>
  <DeskBanner b={marketingBanner(facts)}/>
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
     <h3 className={css.h3}>Marketing cuts</h3>
     <p className={css.hint}>Every film is cut into 9:16 Shorts and Reels when it is made — they are listed under each film. A separate cut made only for marketing (a channel trailer from several films) is not built yet.</p>
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
