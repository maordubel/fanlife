'use client'
import Link from 'next/link'
import {useEffect,useState} from 'react'
import {VOTE_KEY,SEED_TOTAL} from '@/lib/home/vote'
import {castVote,fetchMine,fetchTally,totalFor,type Tally} from '@/lib/home/vote-sync'
import { Badge } from '@/components/clubs/Badge'

export type ShopClub={id:string;name:string;city:string;initials:string;pattern:string;seed:number;href:string|null}
export type ShopCopy={ballot:string;question:string;kicker:string;count:string;demo:string;note:string;vote:string;voted:string;leading:string;preview:string;shop:string;more:string;less:string;accounts:string;guests:string;base:string;offline:string;tooMany:string}
/** How many lines the ballot prints before "show all" (a phone shows four of them — app/weekly/hub.css). The leaders come first, so this is the part that matters. */
const PHONE_FIRST=6

/**
 * The clubs still being built, as THE WEEKLY's ballot paper (rule 124): one line per club — a box to mark, the name, a tally
 * bar, the count. The vote lives on each line (owner, 8.10.2026: no separate ballot section). Order is fixed by the early
 * count so a line never jumps under a thumb; the leader is marked. One vote per device.
 * The numbers are the demo seed from lib/home/vote.ts until a real store exists.
 */
export function WorkshopGrid({clubs,copy}:{clubs:ShopClub[];copy:ShopCopy}){
 const [mine,setMine]=useState<string|null>(null)
 const [server,setServer]=useState<string|null>(null)
 const [tally,setTally]=useState<Tally|null>(null)
 const [msg,setMsg]=useState<string|null>(null)
 const [all,setAll]=useState(false)
 const refresh=async()=>{const [t,m]=await Promise.all([fetchTally(),fetchMine()]);if(t)setTally(t);if(m&&clubs.some(c=>c.id===m)){setServer(m);setMine(m);try{localStorage.setItem(VOTE_KEY,m)}catch{/* a convenience */}}}
 useEffect(()=>{try{const v=localStorage.getItem(VOTE_KEY);setMine(v&&clubs.some(c=>c.id===v)?v:null)}catch{setMine(null)};void refresh()},[clubs])// eslint-disable-line react-hooks/exhaustive-deps
 const cast=async(id:string)=>{
  setMine(id);setMsg(null)
  try{localStorage.setItem(VOTE_KEY,id)}catch{/* a convenience */}
  const r=await castVote(id)
  if(r==='ok'){setServer(id);await refresh()}
  else setMsg(r==='too_many'?copy.tooMany:copy.offline)
 }
 // until the server confirms, the tap is shown at once: +1 for the new club, -1 for the one it leaves
 const delta=(c:ShopClub)=>tally&&mine!==server?(mine===c.id?1:0)-(server===c.id?1:0):(!tally&&mine===c.id?1:0)
 const votes=(c:ShopClub)=>totalFor(c.seed,tally,c.id,delta(c))
 const top=clubs.reduce((b,c)=>votes(c)>votes(b)?c:b,clubs[0]!)
 const most=Math.max(1,...clubs.map(votes))
 const acc=tally?Object.values(tally).reduce((a,r)=>a+r.account,0):0,gst=tally?Object.values(tally).reduce((a,r)=>a+r.guest,0):0
 const total=clubs.reduce((a,c)=>a+votes(c),0)
 return <div className="wkh-ballot" data-all={all||undefined}>
  <div className="wkh-ballot-head">
   <p className="wk-k red">{copy.ballot} · {copy.kicker}</p>
   <h3 className="wk-head wkh-ballot-q">{copy.question}</h3>
   <p className="wk-roundel wkh-ballot-count"><b className="wk-num tabular-nums" aria-live="polite">{total}</b><span className="wk-k">{copy.count}</span></p>
   <p className="wk-small wk-muted wkh-ballot-note">{copy.demo} {copy.note}</p>
   {tally&&<p className="wk-small wk-muted wkh-ballot-split" data-testid="vote-split">{copy.accounts.replace('{n}',String(acc))} · {copy.guests.replace('{n}',String(gst))} · {copy.base.replace('{n}',String(SEED_TOTAL))}</p>}
   {msg&&<p className="wk-small wkh-ballot-msg" role="status">{msg}</p>}
  </div>
  <ol className="wkh-votes">{clubs.map((c,i)=>{
   const on=mine===c.id,lead=top.id===c.id
   const body=<>
    <Badge club={c}/>
    <span className="wkh-vname-t"><b><bdi>{c.name}</bdi></b><small><bdi>{c.city}</bdi></small></span></>
   return <li key={c.id} className={`wkh-vrow${lead?' is-lead':''}${on?' is-mine':''}${i>=PHONE_FIRST&&!all?' is-more':''}`} data-club={c.id} data-club-tile="workshop">
    {lead&&<span className="wk-tag red wkh-lead">{copy.leading}</span>}
    <button type="button" className="mag-shop-vote min-h-tap" aria-pressed={on} onClick={()=>void cast(c.id)} aria-label={`${on?copy.voted:copy.vote}: ${c.name}`}>
     <span>{on?`✓ ${copy.voted}`:copy.vote}</span>
    </button>
    <span className="wkh-vname">
     {c.href?<Link className="wkh-vlink" href={c.href}>{body}</Link>:<span className="wkh-vlink" role="group" aria-label={`${c.name} — ${copy.shop}`}>{body}</span>}
     <span className="wkh-tally" aria-hidden="true"><i style={{inlineSize:`${Math.round(votes(c)/most*100)}%`}}/></span>
    </span>
    <b className="wkh-vcount wk-num tabular-nums">{votes(c)}</b>
   </li>})}</ol>
  {clubs.length>4&&<button type="button" className={`wk-seeall wkh-more min-h-tap${clubs.length>PHONE_FIRST?'':' wkh-m-only'}`} aria-expanded={all} onClick={()=>setAll(a=>!a)}>
   <span>{(all?copy.less:copy.more).replace('{n}',String(clubs.length))}</span><svg className={`wkh-arrow wkh-chev${all?' up':''}`} viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
  </button>}
 </div>
}
