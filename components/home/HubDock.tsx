'use client'
import Link from 'next/link'
import {useEffect,useState} from 'react'
import {LAST_CLUB_KEY} from '@/components/clubs/RememberClub'
import {readActivity,RUN_GATES} from '@/lib/clubs/activity'
import {VOTE_KEY} from '@/lib/home/vote'
import {Icon} from '@/components/weekly/Icon'

export type DockCopy={title:string;kept:string;cont:string;rounds:string;file:string;fileSub:string;stand:string;standSub:string;market:string;marketSub:string;sources:string;sourcesSub:string;voted:string;vote:string;voteSub:string}
const Arrow=()=><svg className="wkh-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>

/**
 * The hub talks to the rest of the app from what this device already knows: where you were, what you played, whether you
 * voted. Nothing leaves the device. Two parts of THE WEEKLY's front page (rule 124): `continue` is the cut-out coupon under
 * the contents ("Continue at <club>"), `links` is "Your world" — a contents list, never the sideways strip it used to be.
 */
export function HubDock({part,clubs,openIds,locale,copy}:{part:'continue'|'links';clubs:{id:string;name:string}[];openIds:string[];locale:string;copy:DockCopy}){
 const [s,setS]=useState<{last:string|null;rounds:number;voted:boolean}>({last:null,rounds:0,voted:false})
 useEffect(()=>{
  try{
   const last=localStorage.getItem(LAST_CLUB_KEY)
   const rounds=openIds.reduce((n,id)=>{const a=readActivity(id);return n+RUN_GATES.reduce((m,g)=>m+a[g].completed,0)},0)
   setS({last:last&&clubs.some(c=>c.id===last)?last:null,rounds,voted:!!localStorage.getItem(VOTE_KEY)})
  }catch{/* storage is a convenience */}
 },[clubs,openIds])
 const lang=locale==='en'?'':`?lang=${locale}`
 const last=clubs.find(c=>c.id===s.last)
 if(part==='continue')return last?<Link className="wkh-cont min-h-tap" href={`/clubs/${last.id}${lang}`}>
  <span className="wk-scissors" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="6" cy="7" r="3"/><circle cx="6" cy="17" r="3"/><path d="M8.5 8.5L20 18M8.5 15.5L20 6"/></svg></span>
  <span className="wk-roundel wkh-cont-go" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z"/></svg></span>
  <span className="wkh-cont-t"><span className="wk-k wkh-green">{copy.title} · {copy.kept}</span><b className="wk-head">{copy.cont.replace('{club}',last.name)}</b></span><Arrow/>
 </Link>:null
 const rows:{href:string;icon:string;title:string;sub:string;anchor?:boolean}[]=[
  {href:'/me/file',icon:'file',title:copy.file,sub:s.rounds>0?copy.rounds.replace('{n}',String(s.rounds)):copy.fileSub},
  {href:'/stand',icon:'flag',title:copy.stand,sub:copy.standSub},
  {href:'/market',icon:'shirt',title:copy.market,sub:copy.marketSub},
  {href:'#suggest',icon:'vote',title:s.voted?copy.voted:copy.vote,sub:copy.voteSub,anchor:true},
  {href:'/sources',icon:'sources',title:copy.sources,sub:copy.sourcesSub},
 ]
 return <nav className="wkh-world" aria-labelledby="wkh-world-h">
  <p className="wk-k wkh-green">{copy.kept}</p>
  <h2 className="wk-head wkh-world-h" id="wkh-world-h">{copy.title}</h2>
  <ul className="wk-contents wkh-world-list">{rows.map(r=>{
   const inner=<><span className="no"><Icon name={r.icon} size={20}/></span><span className="t"><b>{r.title}</b><small className={r.icon==='file'&&s.rounds>0?'tabular-nums':undefined}>{r.sub}</small></span><span aria-hidden="true">→</span></>
   return <li key={r.href}>{r.anchor?<a className="min-h-tap" href={r.href}>{inner}</a>:<Link className="min-h-tap" href={r.href}>{inner}</Link>}</li>
  })}</ul>
 </nav>
}
