'use client'
import Link from 'next/link'
import {useEffect,useState} from 'react'
import {LAST_CLUB_KEY} from '@/components/clubs/RememberClub'
import {readActivity,RUN_GATES} from '@/lib/clubs/activity'
import {VOTE_KEY} from '@/lib/home/vote'

export type DockCopy={title:string;cont:string;rounds:string;file:string;stand:string;market:string;sources:string;voted:string;vote:string}
/** The hub talks to the rest of the app from what this device already knows: where you were, what you played, whether you voted. Nothing leaves the device. */
export function HubDock({clubs,openIds,locale,copy}:{clubs:{id:string;name:string}[];openIds:string[];locale:string;copy:DockCopy}){
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
 return <nav className="mag-dock" aria-label={copy.title}>
  {last&&<Link className="mag-dock-main min-h-tap" href={`/clubs/${last.id}${lang}`}>{copy.cont.replace('{club}',last.name)} →</Link>}
  <Link className="mag-dock-link min-h-tap" href="/me/file">{copy.file}{s.rounds>0&&<small className="tabular-nums">{copy.rounds.replace('{n}',String(s.rounds))}</small>}</Link>
  <Link className="mag-dock-link min-h-tap" href="/stand">{copy.stand}</Link>
  <Link className="mag-dock-link min-h-tap" href="/market">{copy.market}</Link>
  <a className="mag-dock-link min-h-tap" href="#clubs">{s.voted?copy.voted:copy.vote}</a>
  <Link className="mag-dock-link min-h-tap" href="/sources">{copy.sources}</Link>
 </nav>
}
