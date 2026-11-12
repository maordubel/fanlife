'use client'
import {useCallback,useEffect,useState} from 'react'
import Link from 'next/link'
import type {ClassifiedFile,Job} from '@/lib/stories/jobs'
import {jobKind} from '@/lib/stories/jobs'
import type {Health} from '@/lib/stories/health'
import type {PitchDay,PitchDesk} from '@/lib/stories/pitches'
import type {SocialLights} from '@/lib/stories/social'
import type {PlanPost} from '@/lib/stories/marketing'
import type {Setting} from '@/lib/stories/autopilot'
import {DESK_TABS,docsBanner,statusBanner,type Banner,type DeskTab,type Facts} from '@/lib/stories/banners'
import {api,JobCard,NewFilm,type Club} from './stories-desk'
import {ClassifiedTab} from './ClassifiedTab'
import {VlogTab} from './VlogTab'
import {MarketingTab} from './MarketingTab'
import {DirectorsTab} from './DirectorsTab'
import {StatusTab} from './StatusTab'
import {IdeasTab} from './IdeasTab'
import {ShortsTab} from './ShortsTab'
import {useRouter} from 'next/navigation'
import css from './studio.module.css'

/**
 * The studio desk (owner, 4.11.2026: "split the studio — documentary production, CLASSIFIED production, VLOG
 * production, marketing video production — each separately, in its own tab, smart and comfortable, with an information
 * banner: when it can be run and when not"). Desk → 05 Studio → `?section=studio&view=docs|classified|vlog|marketing|
 * directors|status`. Every tab opens with its banner (lib/stories/banners.ts — computed from real state only), then
 * its own maker, then its own jobs. One queue and one worker underneath (lib/stories/jobs.ts → kind).
 */
const TAB_TEXT:Record<DeskTab,string>={ideas:'Ideas',shorts:'Animated Shorts',docs:'Documentary',classified:'CLASSIFIED',vlog:'VLOG · I was there',marketing:'Marketing',directors:'Directors',status:'Status'}
export type DeskData={classified:ClassifiedFile[]|null;pitches:PitchDay[]|null;pitchDesk:PitchDesk|null;lights:SocialLights|null;plan:PlanPost[]|null;autopilot?:Setting|null}

export function StoriesDesk({view}:{view:DeskTab}){
 const [jobs,setJobs]=useState<Job[]|null>(null),[clubs,setClubs]=useState<Club[]>([]),[health,setHealth]=useState<Health|null>(null),[error,setError]=useState('')
 const [cleanupPending,setCleanupPending]=useState(0)
 const [desk,setDesk]=useState<DeskData|null>(null),[open,setOpen]=useState<string|null>(null),[now,setNow]=useState(()=>Date.now())
 const load=useCallback(async()=>{try{const b=await api('/api/master/stories');setJobs(b.jobs);setCleanupPending(b.cleanupPending??0);setClubs(b.clubs);setHealth(b.health??null);setError('');setNow(Date.now())}catch(e){setError(e instanceof Error?e.message:'Could not load the studio.')}},[])
 const loadDesk=useCallback(async()=>{try{setDesk(await api('/api/master/stories/desk'))}catch{setDesk(d=>d??{classified:null,pitches:null,pitchDesk:null,lights:null,plan:null,autopilot:null})}},[])
 useEffect(()=>{void load();void loadDesk()},[load,loadDesk])
 const live=(jobs??[]).some(j=>['queued','running','cancel_requested'].includes(j.state))
 // Background tabs do not poll. When the owner returns, refresh immediately; visible active jobs update every 30s.
 useEffect(()=>{
  const refresh=()=>{if(document.visibilityState==='visible'){void load();void loadDesk()}}
  document.addEventListener('visibilitychange',refresh)
  return()=>document.removeEventListener('visibilitychange',refresh)
 },[load,loadDesk])
 useEffect(()=>{const t=setInterval(()=>{if(document.visibilityState==='visible')void load()},live?30000:180000);return()=>clearInterval(t)},[live,load])
 useEffect(()=>{const t=setInterval(()=>{if(document.visibilityState==='visible')void loadDesk()},180000);return()=>clearInterval(t)},[loadDesk])
 const facts:Facts={now,health,jobs,classified:desk?.classified,pitchDesk:desk?.pitchDesk,lights:desk?.lights,plan:desk?.plan}
 const router=useRouter()
 const made=async(id:string,go?:string)=>{setOpen(id);await load();if(go&&go!==view)router.push(`/master/admin?section=studio&view=${go}`,{scroll:false})}
 const list=(k:'film'|'classified'|'vlog'|'promo'|'short',empty:string)=><JobList jobs={jobs} kind={k} open={open} setOpen={setOpen} onChange={load} empty={empty}/>

 return <div className={css.root}>
  <header className={css.mast}><div className={css.wrap}>
   <p className={css.kicker}><a href="/master/admin">FAN LIFE desk</a> · Owner studio</p>
   <h1 className={css.title}>Football Stories</h1>
   <p className={css.slogan}>Football is ninety minutes. Being a supporter is a lifetime.</p>
  </div></header>
  <div className={css.wrap}>
   <nav aria-label="Studio" className={css.tabs}>{DESK_TABS.map(t=><Link key={t} href={`/master/admin?section=studio&view=${t}`} scroll={false} aria-current={view===t?'page':undefined} className={`${css.tab} min-h-tap`}>{TAB_TEXT[t]}{badge(t,jobs,desk)}</Link>)}</nav>
   {cleanupPending>0&&<p role="status" className={css.hint}>{cleanupPending} deleted production(s): storage cleanup is queued or awaiting its final sweep. You can leave this page; cleanup retries automatically.</p>}
   {error&&<p role="alert" className={css.alert}>{error}</p>}
   {view==='ideas'&&<IdeasTab facts={facts} clubs={clubs} onMade={made}/>}
   {view==='shorts'&&<ShortsTab facts={facts} clubs={clubs} jobs={jobs} onChange={load} onMade={made}>{list('short','No animated Short yet. Make the first one above.')}</ShortsTab>}
   {view==='docs'&&<><DeskBanner b={docsBanner(facts)}/><div className={css.grid}><NewFilm clubs={clubs} onMade={made}/>{list('film','No documentaries yet. Make the first one.')}</div></>}
   {view==='classified'&&<ClassifiedTab facts={facts} onMade={made}>{list('classified','No CLASSIFIED FILE produced yet.')}</ClassifiedTab>}
   {view==='vlog'&&<VlogTab facts={facts} clubs={clubs} onMade={made}>{list('vlog','No I WAS THERE episode yet.')}</VlogTab>}
   {view==='marketing'&&<MarketingTab facts={facts} jobs={jobs} onChange={load} onMade={made}>{list('promo','No marketing film yet. Make the first one above.')}</MarketingTab>}
   {view==='directors'&&<DirectorsTab facts={facts} days={desk?.pitches??null} autopilot={desk?desk.autopilot??null:undefined} onChange={async()=>{await loadDesk();await load()}}/>}
   {view==='status'&&<><DeskBanner b={statusBanner(facts)}/><StatusTab facts={facts} jobs={jobs}/></>}
  </div>
 </div>
}

/** A count on a tab when something there waits for the owner: scripts to choose, an open pitch. */
function badge(t:DeskTab,jobs:Job[]|null,desk:DeskData|null){
 const waiting=(k:string)=>(jobs??[]).filter(j=>jobKind(j)===k&&j.state==='needs_review'&&j.stage==='script').length
 const n=t==='docs'?waiting('film'):t==='shorts'?(jobs??[]).filter(j=>jobKind(j)==='short'&&j.state==='needs_review'&&j.stage==='graphics').length:t==='directors'?(desk?.pitches??[]).flatMap(d=>d.rounds.flatMap(r=>r.pitches)).filter(p=>p.state==='open').length:0
 return n?<span className={css.tabBadge} aria-label={`${n} waiting for you`}>{n}</span>:null
}

const RUN_TEXT={yes:'Can run now',no:'Cannot run now',wait:'Waiting'} as const
const LIGHT_TEXT={yes:'OK',no:'Stops it',wait:'Wait',unknown:'Not connected'} as const
/** The information banner: can it run (one word and one line), what it needs (each with its own light), what it makes and what happens next. */
export function DeskBanner({b}:{b:Banner}){
 return <section className={css.banner} data-run={b.run} aria-label="Can it run now?">
  <p className={css.bannerHead}><b>{RUN_TEXT[b.run]}</b><span>{b.headline}</span></p>
  <ul className={css.needs}>{b.needs.map(n=><li key={n.label} data-light={n.light}><b>{n.label}<i>{LIGHT_TEXT[n.light]}</i></b><span>{n.text}</span></li>)}</ul>
  <details className={css.bannerMore}><summary className="min-h-tap">What it makes · what happens next</summary><p>{b.makes}</p><p>{b.next}</p></details>
 </section>
}

export function JobList({jobs,kind,open,setOpen,onChange,empty}:{jobs:Job[]|null;kind:'film'|'classified'|'vlog'|'promo'|'short';open:string|null;setOpen:(id:string|null)=>void;onChange:()=>void;empty:string}){
 const rows=(jobs??[]).filter(j=>jobKind(j)===kind)
 return <section aria-label="Jobs" className={css.list}>
  {jobs===null?<div className={css.panel}><p className={css.empty}>Loading…</p></div>:rows.length===0?<div className={css.panel}><p className={css.empty}>{empty}</p></div>:
   rows.map(j=><JobCard key={j.id} job={j} open={open===j.id} onOpen={()=>setOpen(open===j.id?null:j.id)} onChange={onChange}/>)}
 </section>
}
