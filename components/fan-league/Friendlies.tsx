'use client'
import {useEffect,useState,useTransition} from 'react'
import Link from 'next/link'
import {answerFriendlyAction,cancelFriendlyAction,inviteFriendlyAction,myFriendliesAction} from '@/app/all-football/fan-league/actions'
import type {FriendlyView} from '@/lib/fan-league/friendly'

const STATUS:Record<FriendlyView['status'],string>={sent:'Waiting for an answer',completed:'Played',declined:'Declined',cancelled:'Cancelled',expired:'Expired'}

export function FriendlyResult({f}:{f:FriendlyView}){
 return <div className="flg-score">
  <p className="flg-score-line"><span>{f.home.name}</span><b>{f.goals?`${f.goals[0]} – ${f.goals[1]}`:'v'}</b><span>{f.away?.name??'?'}</span></p>
  <p className="flg-fine">{f.home.decade}s side{f.away?` against a ${f.away.decade}s side`:''} · a friendly — nothing in either season changes.</p>
  {f.goals&&f.goalsLog.length?<ol className="flg-goals">{f.goalsLog.map((g,i)=><li key={i} data-side={g.side}><b>{g.minute}′</b> {g.scorer}{g.assist?<small> · assist {g.assist}</small>:null}</li>)}</ol>:f.goals?<p className="flg-fine">No goals.</p>:null}
  {f.goals?<div className="flg-compare">{[f.home,f.away!].map((s,i)=><div key={i}><p className="af-label">{s.name} · {s.formation}</p><p className="flg-fine">{s.xi?.join(' · ')}</p></div>)}</div>:null}
 </div>
}

/** the Friendlies tab inside a career: send a challenge (your eleven is locked into it now) and see what came of the others */
export function CareerFriendlies({careerId,xiError}:{careerId:string;xiError:string|null}){
 const [list,setList]=useState<FriendlyView[]|null>(null),[link,setLink]=useState<string|null>(null),[err,setErr]=useState<string|null>(null),[busy,start]=useTransition()
 const load=()=>start(async()=>{const r=await myFriendliesAction(careerId);if(r.ok)setList(r.list);else setErr(r.error)})
 useEffect(load,[careerId])
 const invite=()=>start(async()=>{setErr(null);const r=await inviteFriendlyAction(careerId);if(r.ok){setLink(`${location.origin}${r.link}`);load()}else setErr(r.error)})
 const share=async()=>{if(!link)return;try{if(navigator.share){await navigator.share({title:'A FAN LEAGUE friendly',text:'Bring your club. My eleven is locked in.',url:link});return}}catch{/* closed */}try{await navigator.clipboard.writeText(link);setErr('Link copied.')}catch{/* shown below */}}
 return <div className="flg-today">
  <section className="flg-card"><p className="af-label">Challenge another manager</p>
   <p>Send a link. Your current eleven is locked into the invitation now; they answer with one of their own careers, from their own club, whenever suits them. The match is played once, on the server.</p>
   <p className="flg-fine">The result never touches either league: no points, no money, no window.</p>
   {xiError?<p className="flg-error" role="alert">Pick your eleven first: {xiError}</p>:null}
   <p className="flg-actions"><button type="button" className="flg-go min-h-tap" disabled={busy||!!xiError} onClick={invite}>{busy?'Locking…':'Lock my eleven and make a link'}</button></p>
   {link?<div className="flg-link-box"><label>Your link (it works once — keep it)<input readOnly value={link} onFocus={e=>e.currentTarget.select()}/></label><button type="button" className="flg-ghost min-h-tap" onClick={share}>Share</button></div>:null}
   {err?<p className="flg-live" role="status">{err}</p>:null}
  </section>
  <section className="flg-card"><p className="af-label">Your friendlies</p>
   {!list?<p className="flg-fine">Loading…</p>:!list.length?<p className="flg-fine">None yet.</p>:<ul className="flg-friendlies">{list.map(f=><li key={f.id}>
    <p><b>{STATUS[f.status]}</b> · {f.role==='inviter'?'you invited':'you answered'}</p>
    {f.status==='completed'?<FriendlyResult f={f}/>:<p className="flg-fine">{f.home.name} ({f.home.decade}s){f.status==='sent'?` · expires ${new Date(f.expiresAt).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'})}`:''}</p>}
    {f.status==='sent'&&f.role==='inviter'?<button type="button" className="flg-ghost min-h-tap" disabled={busy} onClick={()=>start(async()=>{const r=await cancelFriendlyAction(f.id);if(!r.ok)setErr(r.error);load()})}>Cancel</button>:null}
   </li>)}</ul>}
  </section>
 </div>
}

/** the invitation page: pick one of your careers to answer with, or decline */
export function AnswerFriendly({initial,token,careers}:{initial:FriendlyView;token:string;careers:{id:string;clubName:string;decade:number}[]}){
 const [f,setF]=useState(initial),[pick,setPick]=useState(careers[0]?.id??''),[err,setErr]=useState<string|null>(null),[busy,start]=useTransition()
 const answer=(careerId:string|null)=>start(async()=>{setErr(null);const r=await answerFriendlyAction(f.id,token,careerId);if(r.ok)setF(r.view);else setErr(r.error)})
 if(f.status==='completed')return <section className="flg-card"><p className="af-label">Full time · friendly</p><FriendlyResult f={f}/><p><Link className="flg-go min-h-tap" href="/all-football/fan-league">Back to FAN LEAGUE</Link></p></section>
 if(f.status!=='sent')return <section className="flg-card"><p className="af-label">Friendly</p><h2>This invitation is {f.status}.</h2></section>
 return <section className="flg-card">
  <p className="af-label">An invitation · expires {new Date(f.expiresAt).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'})}</p>
  <h2>{f.home.name} want a friendly</h2>
  <p>A manager is bringing a {f.home.decade}s {f.home.name} side. Their eleven is locked; you will see it after the match. Answer with one of your own careers — your club’s men only.</p>
  <p className="flg-fine">Nothing in either season changes.</p>
  {careers.length?<><label className="flg-controls">Your career <select value={pick} onChange={e=>setPick(e.target.value)}>{careers.map(c=><option key={c.id} value={c.id}>{c.clubName} · {c.decade}s</option>)}</select></label>
   <p className="flg-actions"><button type="button" className="flg-go min-h-tap" disabled={busy||!pick} onClick={()=>answer(pick)}>{busy?'Playing…':'Lock my eleven and play'}</button><button type="button" className="flg-ghost min-h-tap" disabled={busy} onClick={()=>answer(null)}>Decline</button></p></>
  :<p><Link className="flg-go min-h-tap" href="/all-football/fan-league">Start a career first, then open this link again</Link></p>}
  {err?<p className="flg-error" role="alert">{err}</p>:null}
 </section>
}
