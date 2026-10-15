'use client'
import {useState,useTransition,type CSSProperties} from 'react'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {claimGuestCareers,createLegendsCareer,deleteCareer,setCareerStatus} from '@/app/all-football/legends/actions'
import {crestFor} from '@/lib/clubs/crest'
import t from '@/messages/legends/en.json'
import {Sheet} from './Sheet'
import {Thinking} from './Thinking'

/** the club roll and the manager's careers — up to three active, any number archived (§1.7.43) */
export type ClubOption={club:string;name:string;ready:boolean;held:boolean;reason:string|null;men:number;primary:string|null;/** the club's own livery (hub: every club wears its colours, rule 98) */paint?:Record<string,string>;initials?:string}
export type CareerRow={id:string;clubName:string;season:number;phase:string;status:'active'|'archived';name?:string;enteredAt?:string}
/** "last entered 3 h ago" — small, plain, never a clock the manager has to read */
function ago(iso?:string):string{
 if(!iso)return ''
 const m=Math.max(0,Math.round((Date.now()-Date.parse(iso))/60000))
 if(m<2)return 'last entered just now'
 if(m<60)return `last entered ${m} min ago`
 if(m<1440)return `last entered ${Math.round(m/60)} h ago`
 const d=Math.round(m/1440);return `last entered ${d} day${d===1?'':'s'} ago`
}
const PHASE:Record<string,string>={draft:'In the draft',window:'Window open',season:'In season',playoff:'Title play-off','season-end':'Season over'}
const Arrow=()=><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
/** F05: saves played here before signing in — one explicit tap moves them under the account (more than the cap are put away, never deleted) */
export function ClaimBanner({count}:{count:number}){
 const [msg,setMsg]=useState<string|null>(null),[busy,start]=useTransition(),router=useRouter()
 const go=()=>start(async()=>{setMsg(null);const r=await claimGuestCareers();if(!r.ok)setMsg(r.error);else{setMsg(r.archived?`${r.moved} saves moved to your account; ${r.archived} put away in the archive.`:`${r.moved} saves moved to your account.`);router.refresh()}})
 return <section className="wk-panel wk-lift wkl-claim" aria-label="Saves from before you signed in" data-testid="legends-claim">
  <p className="wk-cap white"><b>{count} {count===1?'save':'saves'} from before you signed in.</b> Move {count===1?'it':'them'} to your account to play on any device.</p>
  <button type="button" className="wk-btn red block min-h-tap" disabled={busy} onClick={go}>Move to my account</button>
  {msg?<p className="wk-cap yellow" role="status">{msg}</p>:null}
 </section>
}
export function Careers({rows,max}:{rows:CareerRow[];max:number}){
 const [err,setErr]=useState<string|null>(null),[busy,start]=useTransition(),router=useRouter()
 const set=(id:string,s:'active'|'archived')=>start(async()=>{setErr(null);const r=await setCareerStatus(id,s);if(!r.ok)setErr(r.error);router.refresh()})
 const [sure,setSure]=useState<string|null>(null)
 const del=(id:string)=>start(async()=>{setErr(null);const r=await deleteCareer(id);if(!r.ok)setErr(r.error);setSure(null);router.refresh()})
 const active=rows.filter(r=>r.status==='active'),archived=rows.filter(r=>r.status==='archived')
 return <section className="lgm-careers" aria-labelledby="lgm-careers-h">
  <h2 id="lgm-careers-h"><span className="wk-logo sm">Your dynasties</span> <small className="wk-lamp">{active.length}/{max}</small><small className="wk-k wkl-mute"> active</small></h2>
  {active.length?<ul>{active.map(c=><li key={c.id}><Link className="lgm-career min-h-tap" href={`/all-football/legends/career/${c.id}`}><b>{c.name??c.clubName}</b><small>Season {c.season} · {PHASE[c.phase]??c.phase} · {ago(c.enteredAt)}</small><span aria-hidden="true"><Arrow/></span></Link>
   <button type="button" className="lgm-link min-h-tap" disabled={busy} onClick={()=>set(c.id,'archived')} title="Moves it to the archive — nothing is lost, you can bring it back">Put away</button></li>)}</ul>:<p className="lgm-fine">No active career.</p>}
  {archived.length?<details className="wk-fold"><summary className="min-h-tap">The archive · {archived.length} <small className="wk-k wkl-mute">(put-away saves)</small></summary><ul>{archived.map(c=><li key={c.id}><span className="lgm-career"><b>{c.name??c.clubName}</b><small>Season {c.season} · put away — nothing is lost · {ago(c.enteredAt)}</small></span>
   <button type="button" className="lgm-link min-h-tap" disabled={busy||active.length>=max} onClick={()=>set(c.id,'active')}>{active.length>=max?'Bring back (put one away first)':'Bring back'}</button>
   {sure===c.id?<span className="lgm-sure" role="group" aria-label="Delete for good?"><span>Delete for good?</span><button type="button" className="lgm-link min-h-tap" disabled={busy} onClick={()=>del(c.id)}>Yes, delete</button><button type="button" className="lgm-link min-h-tap" onClick={()=>setSure(null)}>No</button></span>:<button type="button" className="lgm-link min-h-tap" disabled={busy} onClick={()=>setSure(c.id)}>Delete</button>}</li>)}</ul></details>:null}
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
 const avail=clubs.filter(c=>c.ready&&!c.held),poolMax=avail.length,MIN=4
 // the league: every ready club by default; fewer asks which clubs (owner, 14.10.2026)
 const [size,setSize]=useState<number|null>(null),[chosen,setChosen]=useState<string[]|null>(null),[picker,setPicker]=useState(false)
 const n=size??poolMax,others=avail.filter(c=>c.club!==pick)
 const change=(to:number)=>{
  const next=Math.max(MIN,Math.min(poolMax,to));setSize(next===poolMax?null:next)
  if(next===poolMax){setChosen(null);return}
  const keep=(chosen??others.map(c=>c.club)).filter(c=>c!==pick).slice(0,next-1);setChosen(keep);setPicker(true)
 }
 const toggle=(club:string)=>setChosen(cur=>{const list=cur??[];return list.includes(club)?list.filter(c=>c!==club):list.length<n-1?[...list,club]:list})
 const go=()=>{if(!pick)return;setErr(null);start(async()=>{const r=await createLegendsCareer(pick,size===null?undefined:{clubs:(chosen??[]).filter(c=>c!==pick)});if(r.ok)router.push(`/all-football/legends/career/${r.id}`);else setErr(r.error)})}
 const cur=clubs.find(c=>c.club===pick)
 return <section className="lgm-roll" aria-labelledby="lgm-roll-h">
  <header className="wkl-lm-rollh">
   <div><p className="wk-banner">{t.rollKicker}</p><h2 id="lgm-roll-h" className="wk-logo red">Choose your club</h2></div>
   <p className="lgm-fine">Only men who played for the club you choose. A club opens when a full draft of seventeen fits its own price list — whatever you pick.</p>
  </header>
  <ul>{clubs.map((c,i)=>{const dis=!c.ready||c.held,on=pick===c.club;return <li key={c.club}><button type="button" className="lgm-club min-h-tap" aria-pressed={on} disabled={dis} onClick={()=>{setPick(c.club);setSize(null);setChosen(null)}} data-livery={c.primary??undefined} style={c.paint as CSSProperties|undefined}>
   <span className="wkl-lm-band" aria-hidden="true"><span className="wkl-lm-no">{String(i+1).padStart(2,'0')}</span><Disc club={c.club} name={c.name} initials={c.initials}/>{on?<span className="wkl-lm-tick"><svg viewBox="0 0 24 24"><path d="M4 12l5 5L20 6"/></svg></span>:null}</span>
   <span className="wkl-lm-card"><b>{c.name}</b>{dis?<small>{c.held?'Not open for new careers':c.reason??'Not ready'}</small>:<><span className="wk-num">{c.men.toLocaleString('en-GB')}</span><small>legends to draft from</small></>}</span>
   <i className="wkl-lm-peel" aria-hidden="true"/></button></li>})}</ul>
  {cur&&poolMax>=MIN?<div className="lgm-setup" data-testid="legends-league-setup">
   <div className="lgm-setup-row"><span className="wk-k">Clubs in your league</span>
    <span className="lgm-step"><button type="button" aria-label="Fewer clubs" disabled={n<=MIN} onClick={()=>change(n-1)}>−</button><b dir="ltr">{n}</b><button type="button" aria-label="More clubs" disabled={n>=poolMax} onClick={()=>change(n+1)}>+</button></span></div>
   <p className="lgm-fine">{size===null?`Everyone: all ${poolMax} ready clubs play.`:`${n} clubs — ${(chosen??[]).length+1===n?'your picks are set.':'choose who joins.'}`}{size!==null?<> <button type="button" className="lgm-link min-h-tap" onClick={()=>setPicker(true)}>Choose the clubs</button></>:null}</p>
  </div>:null}
  {picker&&cur?<Sheet id="lgm-pick" tone="paper" locked kicker={`${n} clubs`} title="Choose the clubs in your league">
   <ul className="lgm-pickclubs">
    <li><label data-on><input type="checkbox" checked disabled/><b>{cur.name}</b><small>your club</small></label></li>
    {others.map(c=>{const on=(chosen??[]).includes(c.club);return <li key={c.club}><label data-on={on||undefined}><input type="checkbox" checked={on} disabled={!on&&(chosen??[]).length>=n-1} onChange={()=>toggle(c.club)}/><b>{c.name}</b></label></li>})}
   </ul>
   <p className="lgm-fine">{(chosen??[]).length+1} of {n} chosen.</p>
   <p className="lgm-actions"><button type="button" className="lgm-go lgm-go-big min-h-tap" disabled={(chosen??[]).length+1!==n} onClick={()=>setPicker(false)}>Done</button><button type="button" className="lgm-link min-h-tap" onClick={()=>{setSize(null);setChosen(null);setPicker(false)}}>Everyone plays</button></p>
  </Sheet>:null}
  <Thinking active={busy} label="Founding your club"/>
  <div className="lgm-actions wkl-lm-go">
   <button type="button" className="lgm-go-big wkl-found min-h-tap" disabled={busy||!cur||!canStart||full||(size!==null&&(chosen??[]).length+1!==n)} onClick={go} style={cur?.paint as CSSProperties|undefined}>
    <span className="wkl-found-crest" aria-hidden="true">{cur?<Disc club={cur.club} name={cur.name} initials={cur.initials}/>:<span className="wkl-lm-disc wkl-lm-q">?</span>}</span>
    <span className="wkl-found-go"><span>{busy?'The board is meeting…':cur?`Found the ${cur.name} dynasty`:'Choose a club'}</span><Arrow/></span>
   </button>
  </div>
  {max?<p className="wk-k wkl-mute wkl-found-cap">{t.careersCap.replace('{n}',String(max))}</p>:null}
  {full?<p className="lgm-fine">Three careers are active. Archive one to start another.</p>:null}
  {err?<p className="lgm-error" role="alert">{err}</p>:null}
 </section>
}
