'use client'
import {useCallback,useEffect,useState,type CSSProperties} from 'react'
import type {Evidence} from '@/lib/stories/catalog'
import {ideasBanner,type Facts} from '@/lib/stories/banners'
import {DeskBanner} from './desk'
import {api,dayOf,type Club} from './stories-desk'
import css from './studio.module.css'

/** IDEAS (owner, 8.11.2026: "the studio should mark the matches it has the most on and recommend producing them").
 *  studio/evidence.py scores what the studio holds about every night — sources, scorers with minutes, the line-up, a
 *  goal described move by move, press, research dossiers, Drive packs, the season's kits — and the best come first.
 *  One tap makes a documentary (three scripts to choose from) or an animated Short on Google Flow. */
type Idea={id:string;club_id:string;date:string;season:string;competition:string|null;stage:string|null;home:string;away:string;score:string;outcome:string;tags:string[];evidence:Evidence;made:string[]}
const FILTER:[string,string][]=[['','All'],['short','Best as a Short'],['documentary','Best as a documentary']]
export function IdeasTab({facts,clubs,onMade}:{facts:Facts;clubs:Club[];onMade:(id:string,view?:string)=>Promise<void>}){
 const [ideas,setIdeas]=useState<Idea[]|null>(null),[club,setClub]=useState(''),[fmt,setFmt]=useState(''),[busy,setBusy]=useState(''),[err,setErr]=useState(''),[msg,setMsg]=useState('')
 const load=useCallback(async()=>{try{setIdeas((await api('/api/master/stories/ideas')).ideas)}catch(e){setErr(e instanceof Error?e.message:'Could not read the ideas.')}},[])
 useEffect(()=>{void load()},[load])
 const rows=(ideas??[]).filter(i=>(!club||i.club_id===club)&&(!fmt||i.evidence.formats.includes(fmt as 'short'|'documentary')))
 async function make(i:Idea,kind:'film'|'short'){
  setBusy(`${i.id}:${kind}`);setErr('');setMsg('')
  try{
   const key=crypto.randomUUID()
   const body=kind==='film'
    ?{kind:'film',brief:{club_id:i.club_id,kind:'match',match_ids:[i.id],season:i.season,duration:5,visual_style:'collage',tone:'auto',scripts:3,review:'auto',drive:true,privacy:'private'},idempotencyKey:key}
    :{kind:'short',brief:{club_id:i.club_id,match_id:i.id,seconds:30},idempotencyKey:key}
   const b=await api('/api/master/stories',{method:'POST',body:JSON.stringify(body)})
   setMsg(kind==='film'?'Queued: three scripts arrive in Documentary within about twenty minutes.':'Queued: the Short’s script and its Google Flow pack arrive in Animated Shorts within a few minutes.')
   await load();await onMade(b.job.id,kind==='film'?'docs':'shorts')
  }catch(e){setErr(e instanceof Error?e.message:'Could not queue it.')}finally{setBusy('')}
 }
 const name=(id:string)=>clubs.find(c=>c.id===id)
 return <>
  <DeskBanner b={ideasBanner(facts,ideas)}/>
  <div className={css.chips} role="group" aria-label="Club"><button type="button" className={`${css.chip} min-h-tap`} aria-pressed={!club} onClick={()=>setClub('')}>Every club</button>
   {clubs.filter(c=>(ideas??[]).some(i=>i.club_id===c.id)).map(c=><button type="button" key={c.id} className={`${css.chip} min-h-tap`} aria-pressed={club===c.id} onClick={()=>setClub(c.id)}>{c.name}</button>)}</div>
  <div className={css.chips} role="group" aria-label="Format">{FILTER.map(([k,l])=><button type="button" key={l} className={`${css.chip} min-h-tap`} aria-pressed={fmt===k} onClick={()=>setFmt(k)}>{l}</button>)}</div>
  {err&&<p role="alert" className={css.alert}>{err}</p>}{msg&&<p role="status" className={`${css.alert} ${css.ok}`}>{msg}</p>}
  {ideas===null?<p className={css.empty}>Reading what the studio holds…</p>:!rows.length?<p className={css.empty}>Nothing fits this filter.</p>:
  <ul className={css.ideas}>{rows.map(i=>{const c=name(i.club_id);return <li key={i.id} className={css.idea}>
   <div className={css.ideaHead} style={{'--c':c?.primary,'--on':c?.on} as CSSProperties}><span>{c?.name??i.club_id}</span><span>{dayOf(i.date)}</span></div>
   <div className={css.ideaBody}>
    <h3>{i.home} {i.score} {i.away}</h3>
    <p>{i.competition??''}{i.stage?` · ${i.stage}`:''}</p>
    <p><i className={css.evidence} data-level={i.evidence.level}>{i.evidence.level==='rich'?'★ Rich record':'Good record'} · {i.evidence.score}/100</i></p>
    <ul className={css.reasons} aria-label="What the studio holds">{i.evidence.has.map(h=><li key={h}>{h}</li>)}</ul>
    {i.made.length?<p className={css.made}>Already made: {[...new Set(i.made)].join(' · ')}</p>:null}
   </div>
   <div className={css.ideaGo}>
    <button type="button" className="min-h-tap" disabled={!!busy||!i.evidence.formats.includes('documentary')} onClick={()=>void make(i,'film')}>{busy===`${i.id}:film`?'Queuing…':'Documentary'}</button>
    <button type="button" className="min-h-tap" disabled={!!busy||!i.evidence.formats.includes('short')} onClick={()=>void make(i,'short')}>{busy===`${i.id}:short`?'Queuing…':'Animated Short'}</button>
   </div>
  </li>})}</ul>}
 </>
}
