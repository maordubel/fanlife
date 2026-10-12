'use client'
import {useState,useTransition} from 'react'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {createLegendsCareer,setCareerStatus} from '@/app/all-football/legends/actions'

/** the club roll and the manager's careers — up to three active, any number archived (§1.7.43) */
export type ClubOption={club:string;name:string;ready:boolean;held:boolean;reason:string|null;men:number;primary:string|null}
export type CareerRow={id:string;clubName:string;season:number;phase:string;status:'active'|'archived'}
const PHASE:Record<string,string>={draft:'In the draft',window:'Window open',season:'In season',playoff:'Title play-off','season-end':'Season over'}
export function Careers({rows,max}:{rows:CareerRow[];max:number}){
 const [err,setErr]=useState<string|null>(null),[busy,start]=useTransition(),router=useRouter()
 const set=(id:string,s:'active'|'archived')=>start(async()=>{setErr(null);const r=await setCareerStatus(id,s);if(!r.ok)setErr(r.error);router.refresh()})
 const active=rows.filter(r=>r.status==='active'),archived=rows.filter(r=>r.status==='archived')
 return <section className="lgm-careers" aria-labelledby="lgm-careers-h">
  <h2 id="lgm-careers-h">Your dynasties <small>{active.length}/{max} active</small></h2>
  {active.length?<ul>{active.map(c=><li key={c.id}><Link className="lgm-career min-h-tap" href={`/all-football/legends/career/${c.id}`}><b>{c.clubName}</b><small>Season {c.season} · {PHASE[c.phase]??c.phase}</small><span aria-hidden="true">→</span></Link>
   <button type="button" className="lgm-link min-h-tap" disabled={busy} onClick={()=>set(c.id,'archived')}>Archive</button></li>)}</ul>:<p className="lgm-fine">No active career.</p>}
  {archived.length?<details><summary className="min-h-tap">The archive · {archived.length}</summary><ul>{archived.map(c=><li key={c.id}><span className="lgm-career"><b>{c.clubName}</b><small>Season {c.season} · archived — nothing is lost</small></span>
   <button type="button" className="lgm-link min-h-tap" disabled={busy||active.length>=max} onClick={()=>set(c.id,'active')}>{active.length>=max?'Restore (archive one first)':'Restore'}</button></li>)}</ul></details>:null}
  {err?<p className="lgm-error" role="alert">{err}</p>:null}
 </section>
}
export function ClubRoll({clubs,canStart,full}:{clubs:ClubOption[];canStart:boolean;full:boolean}){
 const [pick,setPick]=useState<string|null>(null),[err,setErr]=useState<string|null>(null),[busy,start]=useTransition(),router=useRouter()
 const go=()=>{if(!pick)return;setErr(null);start(async()=>{const r=await createLegendsCareer(pick);if(r.ok)router.push(`/all-football/legends/career/${r.id}`);else setErr(r.error)})}
 const cur=clubs.find(c=>c.club===pick)
 return <section className="lgm-roll" aria-labelledby="lgm-roll-h">
  <h2 id="lgm-roll-h">Choose your club</h2>
  <p className="lgm-fine">Only men who played for the club you choose. A club opens when a full draft of seventeen fits its own price list — whatever you pick.</p>
  <ul>{clubs.map(c=>{const dis=!c.ready||c.held;return <li key={c.club}><button type="button" className="lgm-club min-h-tap" aria-pressed={pick===c.club} disabled={dis} onClick={()=>setPick(c.club)} data-livery={c.primary??undefined}>
   <b>{c.name}</b><small>{dis?(c.held?'Not open for new careers':c.reason??'Not ready'):`${c.men.toLocaleString('en-GB')} legends to draft from`}</small></button></li>})}</ul>
  <p className="lgm-actions"><button type="button" className="lgm-go lgm-go-big min-h-tap" disabled={busy||!cur||!canStart||full} onClick={go}>{busy?'The board is meeting…':cur?`Found the ${cur.name} dynasty`:'Choose a club'}</button></p>
  {full?<p className="lgm-fine">Three careers are active. Archive one to start another.</p>:null}
  {err?<p className="lgm-error" role="alert">{err}</p>:null}
 </section>
}
