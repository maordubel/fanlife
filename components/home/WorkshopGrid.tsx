'use client'
import Link from 'next/link'
import {useEffect,useState} from 'react'
import {VOTE_KEY} from '@/lib/home/vote'
import {castVote,fetchMine,fetchTally,totalFor,type Tally} from '@/lib/home/vote-sync'
import { Badge } from '@/components/clubs/Badge'

export type ShopClub={id:string;name:string;city:string;initials:string;pattern:string;seed:number;href:string|null}
export type ShopCopy={ballot:string;question:string;kicker:string;count:string;demo:string;note:string;vote:string;voted:string;leading:string;preview:string;shop:string;more:string;less:string;accounts:string;guests:string;base:string;offline:string;tooMany:string}
const FIRST_ROWS = 5

export function WorkshopGrid({clubs,copy}:{clubs:ShopClub[];copy:ShopCopy}){
 const [mine,setMine]=useState<string|null>(null)
 const [tally,setTally]=useState<Tally|null>(null)
 const [msg,setMsg]=useState<string|null>(null)
 const [all,setAll]=useState(false)
 const refresh=async()=>{const [t,m]=await Promise.all([fetchTally(),fetchMine()]);if(t)setTally(t);if(m&&clubs.some(c=>c.id===m)){setMine(m);try{localStorage.setItem(VOTE_KEY,m)}catch{/* a convenience */}}}
 useEffect(()=>{try{const v=localStorage.getItem(VOTE_KEY);setMine(v&&clubs.some(c=>c.id===v)?v:null)}catch{setMine(null)};void refresh()},[clubs])// eslint-disable-line react-hooks/exhaustive-deps
 const [pending,setPending]=useState(false)
 const cast=async(id:string)=>{
  if(pending)return
  setPending(true)
  setMsg(null)
  try{
   const result=await castVote(id)
   if(result!=='ok'){
    setMsg(result==='too_many'?copy.tooMany:copy.offline)
    return
   }
   setMine(id)
   try{localStorage.setItem(VOTE_KEY,id)}catch{/* a convenience */}
   const fresh=await fetchTally()
   if(fresh)setTally(fresh)
  }finally{
   setPending(false)
  }
 }
 const votes=(c:ShopClub)=>totalFor(c.seed,tally,c.id)
 const ranked=[...clubs].sort((a,b)=>votes(b)-votes(a))
 const most=Math.max(1,...clubs.map(votes))
 const acc=clubs.reduce((sum,c)=>sum+(tally?.[c.id]?.account??0),0)
 const gst=clubs.reduce((sum,c)=>sum+(tally?.[c.id]?.guest??0),0)
 const total=acc+gst
 const opening=clubs.reduce((sum,c)=>sum+c.seed,0)
 return <div className="wkh-ballot">
  <div className="wkh-ballot-head">
   <p className="wk-k red">{copy.ballot} · {copy.kicker}</p>
   <h3 className="wk-head wkh-ballot-q">{copy.question}</h3>
   <p className="wk-roundel wkh-ballot-count"><b className="wk-num tabular-nums" aria-live="polite">{tally?total:"—"}</b><span className="wk-k">{copy.count}</span></p>
   <p className="wk-small wk-muted wkh-ballot-note">{copy.demo} {copy.note}</p>
   {tally&&<p className="wk-small wk-muted wkh-ballot-split" data-testid="vote-split">{copy.accounts.replace('{n}',String(acc))} · {copy.guests.replace('{n}',String(gst))} · {copy.base.replace('{n}',String(opening))}</p>}
   {msg&&<p className="wk-small wkh-ballot-msg" role="status">{msg}</p>}
  </div>
  <ol className="wkh-votes">{ranked.map((c,i)=>{
   const on=mine===c.id,lead=i===0
   const body=<>
    <Badge club={c}/>
    <span className="wkh-vname-t"><b><bdi>{c.name}</bdi></b><small><bdi>{c.city}</bdi></small></span></>
   return <li key={c.id} className={`wkh-vrow${lead?' is-lead':''}${on?' is-mine':''}${i>=FIRST_ROWS&&!all?' is-more':''}`} data-club={c.id} data-club-tile="workshop">
    <span className="wkh-vrank" aria-hidden="true">{i+1}</span>
    <button type="button" className="mag-shop-vote min-h-tap" disabled={pending} aria-pressed={on} onClick={()=>void cast(c.id)} aria-label={`${on?copy.voted:copy.vote}: ${c.name}`}>
     <span>{on?'✓':copy.vote}</span>
    </button>
    <span className="wkh-vname">
     {c.href?<Link className="wkh-vlink" href={c.href}>{body}</Link>:<span className="wkh-vlink" role="group" aria-label={`${c.name} — ${copy.shop}`}>{body}</span>}
     <span className="wkh-tally" aria-hidden="true"><i style={{inlineSize:`${Math.round(votes(c)/most*100)}%`}}/></span>
    </span>
    <b className="wkh-vcount wk-num tabular-nums">{votes(c)}</b>
   </li>})}</ol>
  {clubs.length>FIRST_ROWS&&<button type="button" className="wk-seeall wkh-more min-h-tap" aria-expanded={all} onClick={()=>setAll(a=>!a)}>
   <span>{(all?copy.less:copy.more).replace('{n}',String(clubs.length))}</span><svg className={`wkh-arrow wkh-chev${all?' up':''}`} viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
  </button>}
 </div>
}
