'use client'
import Link from 'next/link'
import {useEffect,useState} from 'react'
import {readActivity,roundsOf,RUN_GATES} from '@/lib/clubs/activity'
import {readBeen} from '@/lib/fanlife/been'
import {clubHref} from '@/lib/clubs/club-href'
import type {UiLocale} from '@/lib/clubs/locale'
import { Badge } from '@/components/clubs/Badge'

type Copy={kicker:string;title:string;gates:string;rounds:string;been:string;since:string;empty:string;next:string}
type Mine={walked:string[];rounds:number;been:number;since:string}
function readMine(clubId:string):Mine{
 const a=readActivity(clubId),walked=RUN_GATES.filter(g=>a[g].completed>0) as string[]
 if(a.xi)walked.push('xi')
 const rounds=roundsOf(a)
 const been=Object.values(readBeen()).filter(r=>r.club===clubId&&r.b).length
 const k=`fan-life:club:${clubId}:since`;let since=''
 try{since=localStorage.getItem(k)||'';if(!since){since=String(new Date().getFullYear());localStorage.setItem(k,since)}}catch{since=String(new Date().getFullYear())}
 return {walked,rounds,been,since}
}
/**
 * Your card at this club (THE WEEKLY's supporter card): a stripe header in the club's colours with the crest, then what this
 * device has done here as big numbers. Nothing played → one line, never a zero wall. `next` off when the page carries the
 * coupon instead.
 */
export function SupporterCard({clubId,clubName,initials,pattern,locale,open,names,total,copy,next:showNext=true}:{clubId:string;clubName:string;initials:string;pattern?:string;locale:UiLocale;open:readonly string[];names:Record<string,string>;total:number;copy:Copy;next?:boolean}) {
 const [m,setM]=useState<Mine|null>(null)
 useEffect(()=>{setM(readMine(clubId))},[clubId])
 if(!m)return <div className="wk-panel wk-lift wkk-card wkk-card-ph" aria-hidden="true"/>
 const next=open.find(k=>!m.walked.includes(k))
 const fresh=m.rounds===0&&m.been===0
 return <article className="wk-panel wk-lift wkk-card" data-testid="supporter-card">
  <header className="wk-stripes wkk-card-head">
   <span className="wkk-card-crest"><Badge club={{id:clubId,pattern,initials,name:clubName}}/></span>
   <div><p className="wk-k">{copy.kicker}</p><h3 className="wk-logo sm">{copy.title.replace('{club}',clubName)}</h3></div>
  </header>
  {fresh?<p className="wkk-card-empty">{copy.empty}</p>:<dl className="wkk-card-stats">
   <div><dd className="wk-num red" dir="ltr">{m.walked.length}</dd><dt>{copy.gates} <bdi dir="ltr">/ {total}</bdi></dt></div>
   <div><dd className="wk-num" dir="ltr">{m.rounds}</dd><dt>{copy.rounds}</dt></div>
   <div><dd className="wk-num" dir="ltr">{m.been}</dd><dt>{copy.been}</dt></div>
   <div><dd className="wk-num" dir="ltr">{m.since}</dd><dt>{copy.since}</dt></div>
  </dl>}
  {fresh&&<p className="wkk-card-since wk-k muted">{copy.since} <bdi>{m.since}</bdi></p>}
  {showNext&&next&&<Link className="wkk-card-next min-h-tap" href={clubHref(clubId,next,locale)}>{copy.next} <b>{names[next]??next}</b><span aria-hidden="true">→</span></Link>}
 </article>
}

/**
 * The carry-on coupon: the next gate this device has not walked yet, torn off the page. Played before → "carry on";
 * nothing yet → "start here". Every gate walked → no coupon.
 */
export function CarryOn({clubId,locale,open,names,copy}:{clubId:string;locale:UiLocale;open:readonly string[];names:Record<string,string>;copy:{carry:string;start:string;next:string}}){
 const [m,setM]=useState<Mine|null>(null)
 useEffect(()=>{setM(readMine(clubId))},[clubId])
 if(!m)return <div className="wkk-coupon-ph" aria-hidden="true"/>
 const next=open.find(k=>!m.walked.includes(k))
 if(!next)return null
 return <Link className="wk-coupon wkk-coupon min-h-tap" href={clubHref(clubId,next,locale)} data-testid="carry-on">
  <span className="wk-scissors" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="6" cy="7" r="3"/><circle cx="6" cy="17" r="3"/><path d="M8.5 8.5L20 18M8.5 15.5L20 6"/></svg></span>
  <span className="wk-roundel wkk-coupon-go" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z"/></svg></span>
  <span className="wkk-coupon-t"><span className="wk-k cyan">{m.rounds>0||m.walked.length>0?copy.carry:copy.start}</span><b className="wk-head">{copy.next} {names[next]??next}</b></span>
  <span className="wkk-coupon-arrow" aria-hidden="true">→</span>
 </Link>
}

/** One line under a gate's cover: what this device has done there (best, played, not yet). Nothing on the server render. */
export function GateMark({club,gate,copy}:{club:string;gate:string;copy:{best:string;played:string;fresh:string;xi:string}}){
 const [t,setT]=useState<string|null>(null)
 useEffect(()=>{
  const a=readActivity(club)
  if(gate==='xi'){setT(a.xi?copy.xi:copy.fresh);return}
  const row=(RUN_GATES as readonly string[]).includes(gate)?a[gate as (typeof RUN_GATES)[number]]:null
  if(!row){setT(null);return}
  if(row.completed===0){setT(copy.fresh);return}
  const scored=gate==='trivia'||gate==='memory'||gate==='lineup'||gate==='timeline'
  setT(scored&&row.best>0?`${copy.best} ${row.best} · ${copy.played.replace('{n}',String(row.completed))}`:copy.played.replace('{n}',String(row.completed)))
 },[club,gate,copy.best,copy.played,copy.fresh,copy.xi])
 return <span className="wk-k cyan wkk-mark">{t??' '}</span>
}
