'use client'
import Link from 'next/link'
import {useEffect,useState} from 'react'
import {VOTE_KEY,SEED_TOTAL} from '@/lib/home/vote'

export type ShopClub={id:string;name:string;city:string;initials:string;pattern:string;seed:number;href:string|null}
export type ShopCopy={kicker:string;count:string;demo:string;vote:string;voted:string;leading:string;preview:string;shop:string;more:string;less:string}
/** How many workshop tiles a phone shows before "show all". The leaders come first, so this is the part that matters. */
const PHONE_FIRST=6

/**
 * The clubs still being built, as tiles inside the club grid. The vote lives in each tile (owner, 8.10.2026: no separate ballot).
 * Order is fixed by the early count so a tile never jumps under a thumb; the leader is marked live. One vote per device.
 * The numbers are the demo seed from lib/home/vote.ts until a real store exists.
 */
export function WorkshopGrid({clubs,copy}:{clubs:ShopClub[];copy:ShopCopy}){
 const [mine,setMine]=useState<string|null>(null)
 const [all,setAll]=useState(false)
 useEffect(()=>{try{const v=localStorage.getItem(VOTE_KEY);setMine(v&&clubs.some(c=>c.id===v)?v:null)}catch{setMine(null)}},[clubs])
 const cast=(id:string)=>{setMine(id);try{localStorage.setItem(VOTE_KEY,id)}catch{/* a convenience */}}
 const votes=(c:ShopClub)=>c.seed+(mine===c.id?1:0)
 const top=clubs.reduce((b,c)=>votes(c)>votes(b)?c:b,clubs[0]!)
 const total=SEED_TOTAL+(mine?1:0)
 return <>
  <div className="mag-shop-label">
   <p className="mag-kicker">{copy.kicker}</p>
   <p className="mag-shop-count"><b className="tabular-nums" aria-live="polite">{total}</b> {copy.count}</p>
   <p className="mag-fine">{copy.demo}</p>
  </div>
  {clubs.map((c,i)=>{
   const on=mine===c.id,lead=top.id===c.id
   const body=<>
    <span className="mag-badge" data-livery={c.pattern} aria-hidden="true">{c.initials}</span>
    <span className="mag-shop-name"><b><bdi>{c.name}</bdi></b><small><bdi>{c.city}</bdi></small></span></>
   return <div key={c.id} className={`mag-shop${lead?' is-lead':''}${on?' is-mine':''}${i>=PHONE_FIRST&&!all?' is-more':''}`} data-club={c.id}>
    {lead&&<span className="mag-tile-state mag-lead-flag">{copy.leading}</span>}
    {c.href?<Link className="mag-tile is-shop" href={c.href}>{body}</Link>:<div className="mag-tile is-shop" role="group" aria-label={`${c.name} — ${copy.shop}`}>{body}</div>}
    <button type="button" className="mag-shop-vote min-h-tap" aria-pressed={on} onClick={()=>cast(c.id)} aria-label={`${on?copy.voted:copy.vote}: ${c.name}`}>
     <span>{on?`✓ ${copy.voted}`:copy.vote}</span><b className="tabular-nums">{votes(c)}</b>
    </button>
   </div>})}
  {clubs.length>PHONE_FIRST&&<button type="button" className="mag-more min-h-tap" aria-expanded={all} onClick={()=>setAll(a=>!a)}>{(all?copy.less:copy.more).replace('{n}',String(clubs.length))}</button>}
 </>
}
