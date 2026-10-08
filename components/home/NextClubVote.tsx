'use client'
import {useEffect,useState} from 'react'
import {VOTE_KEY} from '@/lib/home/vote'

export type VoteClub={id:string;name:string;city:string;initials:string;pattern:string;seed:number}
export type VoteCopy={kicker:string;title:string;note:string;count:string;leading:string;you:string;cta:string;change:string;voted:string;demo:string}

/** The hub's ballot for the next club to open. One vote per device, kept on the device; the seed is the first 33 (see lib/home/vote.ts). */
export function NextClubVote({clubs,total,copy}:{clubs:VoteClub[];total:number;copy:VoteCopy}){
 const [mine,setMine]=useState<string|null>(null)
 useEffect(()=>{try{const v=localStorage.getItem(VOTE_KEY);setMine(v&&clubs.some(c=>c.id===v)?v:null)}catch{setMine(null)}},[clubs])
 const cast=(id:string)=>{setMine(id);try{localStorage.setItem(VOTE_KEY,id)}catch{/* a convenience */}}
 const votes=(c:VoteClub)=>c.seed+(mine===c.id?1:0)
 const sorted=[...clubs].sort((a,b)=>votes(b)-votes(a)||clubs.indexOf(a)-clubs.indexOf(b))
 const all=total+(mine?1:0),top=Math.max(1,...sorted.map(votes))
 const me=clubs.find(c=>c.id===mine)
 return <div className="mag-vote">
  <div className="mag-vote-head">
   <p className="mag-kicker">{copy.kicker}</p>
   <h2 className="mag-h2" id="vote-h">{copy.title}</h2>
   <p>{copy.note}</p>
   {sorted[0]&&<p className="mag-vote-lead"><span className="mag-badge" data-livery={sorted[0].pattern} aria-hidden="true">{sorted[0].initials}</span><span><small>{copy.leading}</small><b><bdi>{sorted[0].name}</bdi></b></span></p>}
   <p className="mag-vote-count" aria-live="polite"><b className="tabular-nums">{all}</b> {copy.count}{me&&<> · <span>{copy.you.replace('{club}',me.name)}</span></>}</p>
  </div>
  <ol className="mag-vote-list">{sorted.map((c,i)=>{
   const n=votes(c),on=mine===c.id
   return <li key={c.id} className={`mag-vote-row${on?' is-mine':''}${i===0?' is-lead':''}`}>
    <span className="mag-vote-rank tabular-nums" aria-hidden="true">{String(i+1).padStart(2,'0')}</span>
    <span className="mag-vote-name"><b><bdi>{c.name}</bdi></b><small><bdi>{c.city}</bdi></small>
     <span className="mag-vote-bar" aria-hidden="true"><i style={{inlineSize:`${Math.round(n*100/top)}%`}}/></span></span>
    <span className="mag-vote-n tabular-nums">{n}</span>
    <button type="button" className="mag-chip min-h-tap mag-vote-btn" aria-pressed={on} onClick={()=>cast(c.id)} aria-label={`${on?copy.voted:mine?copy.change:copy.cta}: ${c.name}`}>{on?copy.voted:mine?copy.change:copy.cta}</button>
   </li>})}</ol>
  <p className="mag-fine">{copy.demo}</p>
 </div>
}
