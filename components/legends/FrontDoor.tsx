'use client'
import {useState,useTransition,type CSSProperties} from 'react'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {createLegendsCareer,setCareerStatus} from '@/app/all-football/legends/actions'
import {crestFor} from '@/lib/clubs/crest'
import t from '@/messages/legends/en.json'

/** the club roll and the manager's careers — up to three active, any number archived (§1.7.43) */
export type ClubOption={club:string;name:string;ready:boolean;held:boolean;reason:string|null;men:number;primary:string|null;/** the club's own livery (hub: every club wears its colours, rule 98) */paint?:Record<string,string>;initials?:string}
export type CareerRow={id:string;clubName:string;season:number;phase:string;status:'active'|'archived'}
const PHASE:Record<string,string>={draft:'In the draft',window:'Window open',season:'In season',playoff:'Title play-off','season-end':'Season over'}
const Arrow=()=><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
export function Careers({rows,max}:{rows:CareerRow[];max:number}){
 const [err,setErr]=useState<string|null>(null),[busy,start]=useTransition(),router=useRouter()
 const set=(id:string,s:'active'|'archived')=>start(async()=>{setErr(null);const r=await setCareerStatus(id,s);if(!r.ok)setErr(r.error);router.refresh()})
 const active=rows.filter(r=>r.status==='active'),archived=rows.filter(r=>r.status==='archived')
 return <section className="lgm-careers" aria-labelledby="lgm-careers-h">
  <h2 id="lgm-careers-h"><span className="wk-logo sm">Your dynasties</span> <small className="wk-lamp">{active.length}/{max}</small><small className="wk-k wkl-mute"> active</small></h2>
  {active.length?<ul>{active.map(c=><li key={c.id}><Link className="lgm-career min-h-tap" href={`/all-football/legends/career/${c.id}`}><b>{c.clubName}</b><small>Season {c.season} · {PHASE[c.phase]??c.phase}</small><span aria-hidden="true"><Arrow/></span></Link>
   <button type="button" className="lgm-link min-h-tap" disabled={busy} onClick={()=>set(c.id,'archived')}>Archive</button></li>)}</ul>:<p className="lgm-fine">No active career.</p>}
  {archived.length?<details className="wk-fold"><summary className="min-h-tap">The archive · {archived.length}</summary><ul>{archived.map(c=><li key={c.id}><span className="lgm-career"><b>{c.clubName}</b><small>Season {c.season} · archived — nothing is lost</small></span>
   <button type="button" className="lgm-link min-h-tap" disabled={busy||active.length>=max} onClick={()=>set(c.id,'active')}>{active.length>=max?'Restore (archive one first)':'Restore'}</button></li>)}</ul></details>:null}
  {err?<p className="lgm-error" role="alert">{err}</p>:null}
 </section>
}
/** a club on a paper disc: its crest where we hold one, its initials otherwise — never an invented badge */
function Disc({club,name,initials}:{club:string;name:string;initials?:string}){
 const src=crestFor(club)
 // eslint-disable-next-line @next/next/no-img-element -- a crest ships exactly as recorded in the crest register
 return <span className="wkl-lm-disc" aria-hidden="true">{src?<img src={src} alt="" loading="lazy" decoding="async"/>:<b>{initials??name.slice(0,2)}</b>}</span>
}
/** `initial`: a club's home sent the manager here with its club already chosen (the banner, 12.10.2026) — only an open club */
export function ClubRoll({clubs,canStart,full,initial=null,max}:{clubs:ClubOption[];canStart:boolean;full:boolean;initial?:string|null;/** careers a manager may run at once */max?:number}){
 const [pick,setPick]=useState<string|null>(()=>clubs.some(c=>c.club===initial&&c.ready&&!c.held)?initial:null),[err,setErr]=useState<string|null>(null),[busy,start]=useTransition(),router=useRouter()
 const go=()=>{if(!pick)return;setErr(null);start(async()=>{const r=await createLegendsCareer(pick);if(r.ok)router.push(`/all-football/legends/career/${r.id}`);else setErr(r.error)})}
 const cur=clubs.find(c=>c.club===pick)
 return <section className="lgm-roll" aria-labelledby="lgm-roll-h">
  <header className="wkl-lm-rollh">
   <div><p className="wk-banner">{t.rollKicker}</p><h2 id="lgm-roll-h" className="wk-logo red">Choose your club</h2></div>
   <p className="lgm-fine">Only men who played for the club you choose. A club opens when a full draft of seventeen fits its own price list — whatever you pick.</p>
  </header>
  <ul>{clubs.map((c,i)=>{const dis=!c.ready||c.held,on=pick===c.club;return <li key={c.club}><button type="button" className="lgm-club min-h-tap" aria-pressed={on} disabled={dis} onClick={()=>setPick(c.club)} data-livery={c.primary??undefined} style={c.paint as CSSProperties|undefined}>
   <span className="wkl-lm-band" aria-hidden="true"><span className="wkl-lm-no">{String(i+1).padStart(2,'0')}</span><Disc club={c.club} name={c.name} initials={c.initials}/>{on?<span className="wkl-lm-tick"><svg viewBox="0 0 24 24"><path d="M4 12l5 5L20 6"/></svg></span>:null}</span>
   <span className="wkl-lm-card"><b>{c.name}</b>{dis?<small>{c.held?'Not open for new careers':c.reason??'Not ready'}</small>:<><span className="wk-num">{c.men.toLocaleString('en-GB')}</span><small>legends to draft from</small></>}</span>
   <i className="wkl-lm-peel" aria-hidden="true"/></button></li>})}</ul>
  <div className="lgm-actions wkl-lm-go">
   <button type="button" className="lgm-go-big wkl-found min-h-tap" disabled={busy||!cur||!canStart||full} onClick={go} style={cur?.paint as CSSProperties|undefined}>
    <span className="wkl-found-crest" aria-hidden="true">{cur?<Disc club={cur.club} name={cur.name} initials={cur.initials}/>:<span className="wkl-lm-disc wkl-lm-q">?</span>}</span>
    <span className="wkl-found-go"><span>{busy?'The board is meeting…':cur?`Found the ${cur.name} dynasty`:'Choose a club'}</span><Arrow/></span>
   </button>
  </div>
  {max?<p className="wk-k wkl-mute wkl-found-cap">{t.careersCap.replace('{n}',String(max))}</p>:null}
  {full?<p className="lgm-fine">Three careers are active. Archive one to start another.</p>:null}
  {err?<p className="lgm-error" role="alert">{err}</p>:null}
 </section>
}
