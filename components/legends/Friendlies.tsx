'use client'
import {useEffect,useState,useTransition} from 'react'
import Link from 'next/link'
import {answerFriendly,cancelFriendly,inviteFriendly,myFriendlies} from '@/app/all-football/legends/actions'
import type {FriendlyView} from '@/lib/legends/friendly'
import t from '@/messages/legends/en.json'

/** friendlies between real managers (§1.7.38–40): locked elevens, played once on the server, nothing in either season changes */
const STATUS:Record<FriendlyView['status'],string>={sent:'Waiting for an answer',completed:'Played',declined:'Declined',cancelled:'Cancelled',expired:'Expired'}
const when=(iso:string)=>new Date(iso).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'})
export function FriendlyResult({f}:{f:FriendlyView}){
 return <div className="lgm-result">
  <p className="lgm-fixture"><span>{f.home.name}</span><b>{f.goals?`${f.goals[0]} – ${f.goals[1]}`:'v'}</b><span>{f.away?.name??'?'}</span></p>
  <p className="lgm-fine">A friendly — nothing in either season changes.</p>
  {f.log.length?<ol className="lgm-log">{f.log.map((l,i)=><li key={i} data-side={l.side} data-kind={l.kind}><b>{l.minute}′</b> {l.kind==='goal'?'Goal — ':l.kind==='red'?'Red card — ':'Change — '}{l.text}</li>)}</ol>:null}
  {f.goals?<div className="lgm-two">{[f.home,f.away!].map((s,i)=><div key={i}><p className="lgm-kicker">{s.name} · {s.formation}</p><p className="lgm-fine">{s.xi?.join(' · ')}</p></div>)}</div>:null}
 </div>
}
export function CareerFriendlies({careerId,ready}:{careerId:string;ready:boolean}){
 const [list,setList]=useState<FriendlyView[]|null>(null),[link,setLink]=useState<string|null>(null),[note,setNote]=useState<string|null>(null),[busy,start]=useTransition()
 const load=()=>start(async()=>{const r=await myFriendlies(careerId);if(r.ok)setList(r.list);else setNote(r.error)})
 useEffect(load,[careerId]) // eslint-disable-line react-hooks/exhaustive-deps
 const invite=()=>start(async()=>{setNote(null);const r=await inviteFriendly(careerId);if(r.ok){setLink(`${location.origin}${r.link}`);load()}else setNote(r.error)})
 const share=async()=>{if(!link)return;try{if(navigator.share){await navigator.share({title:'A Legends Manager friendly',text:'Bring your legends. My eleven is locked in.',url:link});return}}catch{/* closed */}try{await navigator.clipboard.writeText(link);setNote('Link copied.')}catch{/* shown below */}}
 return <div className="lgm-grid">
  <section className="lgm-panel"><p className="lgm-kicker">Challenge another manager</p>
   <p>Send a link. Your eleven is locked into the invitation now; they answer with one of their own careers whenever suits them. The match is played once, on the server, and both of you see the same result.</p>
   {!ready?<p className="lgm-error" role="alert">Set a legal eleven first.</p>:null}
   <p className="lgm-actions"><button type="button" className="lgm-go min-h-tap" disabled={busy||!ready} onClick={invite}>{busy?'Locking…':'Lock my eleven and make a link'}</button></p>
   {link?<div className="lgm-linkbox"><label>Your link — it works once<input readOnly value={link} onFocus={e=>e.currentTarget.select()}/></label><button type="button" className="lgm-ghost min-h-tap" onClick={share}>Share</button></div>:null}
   {note?<p className="lgm-live" role="status">{note}</p>:null}
  </section>
  <section className="lgm-panel"><p className="lgm-kicker">Your friendlies</p>
   {!list?<p className="lgm-fine">Loading…</p>:!list.length?<p className="lgm-fine">None yet.</p>:<ul className="lgm-friendlies">{list.map(f=><li key={f.id}>
    <p><b>{STATUS[f.status]}</b> · {f.role==='inviter'?'you invited':'you answered'}</p>
    {f.status==='completed'?<FriendlyResult f={f}/>:<p className="lgm-fine">{f.home.name}{f.status==='sent'?` · expires ${when(f.expiresAt)}`:''}</p>}
    {f.status==='sent'&&f.role==='inviter'?<button type="button" className="lgm-ghost min-h-tap" disabled={busy} onClick={()=>start(async()=>{const r=await cancelFriendly(f.id);if(!r.ok)setNote(r.error);load()})}>Cancel</button>:null}
   </li>)}</ul>}
  </section>
 </div>
}
export function AnswerFriendly({initial,token,careers}:{initial:FriendlyView;token:string;careers:{id:string;clubName:string;season:number}[]}){
 const [f,setF]=useState(initial),[pick,setPick]=useState(careers[0]?.id??''),[err,setErr]=useState<string|null>(null),[busy,start]=useTransition()
 const answer=(careerId:string|null)=>start(async()=>{setErr(null);const r=await answerFriendly(f.id,token,careerId);if(r.ok)setF(r.view);else setErr(r.error)})
 if(f.status==='completed')return <section className="lgm-panel"><p className="lgm-kicker">Full time · friendly</p><FriendlyResult f={f}/><p className="lgm-actions"><Link className="lgm-go min-h-tap" href="/all-football/legends">Back to Legends Manager</Link></p></section>
 if(f.status!=='sent')return <section className="lgm-panel"><p className="lgm-kicker">Friendly</p><h2>This invitation is {f.status}.</h2></section>
 return <section className="lgm-panel wkl-invite">
  <div className="wkl-ticket">
   <div className="wkl-ticket-main">
    <p className="wk-k red">{t.admitOne}</p>
    <p className="lgm-kicker">An invitation · expires {when(f.expiresAt)}</p>
    <h2>{f.home.name} want a friendly</h2>
   </div>
   <div className="wkl-ticket-stub" aria-hidden="true"><small>{t.theirEleven}</small><b className="wk-lamp">?</b><span className="wk-stamp">{t.sealed}</span></div>
  </div>
  <p>Their eleven is locked; you see it after the match. Answer with one of your own careers — your club’s legends only. Nothing in either season changes.</p>
  {careers.length?<><label className="lgm-select">Your career<select className="min-h-tap" value={pick} onChange={e=>setPick(e.target.value)}>{careers.map(c=><option key={c.id} value={c.id}>{c.clubName} · season {c.season}</option>)}</select></label>
   <p className="lgm-actions"><button type="button" className="lgm-go min-h-tap" disabled={busy||!pick} onClick={()=>answer(pick)}>{busy?'Playing…':'Lock my eleven and play'}</button><button type="button" className="lgm-ghost min-h-tap" disabled={busy} onClick={()=>answer(null)}>Decline</button></p></>
  :<p className="lgm-actions"><Link className="lgm-go min-h-tap" href="/all-football/legends">Start a career first, then open this link again</Link></p>}
  {err?<p className="lgm-error" role="alert">{err}</p>:null}
 </section>
}
