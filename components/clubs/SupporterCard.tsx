'use client'
import Link from 'next/link'
import {useEffect,useState} from 'react'
import {readActivity,RUN_GATES} from '@/lib/clubs/activity'
import {readBeen} from '@/lib/fanlife/been'
import {clubHref} from '@/lib/clubs/club-href'
import type {UiLocale} from '@/lib/clubs/locale'

type Copy={kicker:string;title:string;gates:string;rounds:string;been:string;since:string;empty:string;next:string}
type Mine={walked:string[];rounds:number;been:number;since:string}
/** Your card at this club: what this device has done here, as three numbers and a next step. Nothing played → one line, never a zero wall. */
export function SupporterCard({clubId,clubName,initials,pattern,locale,open,names,total,copy}:{clubId:string;clubName:string;initials:string;pattern?:string;locale:UiLocale;open:readonly string[];names:Record<string,string>;total:number;copy:Copy}) {
 const [m,setM]=useState<Mine|null>(null)
 useEffect(()=>{
  const a=readActivity(clubId),walked=RUN_GATES.filter(g=>a[g].completed>0) as string[]
  if(a.xi)walked.push('xi')
  const rounds=RUN_GATES.reduce((n,g)=>n+a[g].completed,0)
  const been=Object.values(readBeen()).filter(r=>r.club===clubId&&r.b).length
  const k=`fan-life:club:${clubId}:since`;let since=''
  try{since=localStorage.getItem(k)||'';if(!since){since=String(new Date().getFullYear());localStorage.setItem(k,since)}}catch{since=String(new Date().getFullYear())}
  setM({walked,rounds,been,since})
 },[clubId])
 if(!m)return <div className="sc-card" aria-hidden="true"/>
 const next=open.find(k=>!m.walked.includes(k))
 const fresh=m.rounds===0&&m.been===0
 return <article className="sc-card" data-testid="supporter-card">
  <header className="mag-band" data-livery={pattern}><span className="mag-badge" data-livery={pattern} aria-hidden="true">{initials}</span><div><p>{copy.kicker}</p><h3>{copy.title.replace('{club}',clubName)}</h3></div><small>{copy.since} <bdi>{m.since}</bdi></small></header>
  {fresh?<p className="sc-empty">{copy.empty}</p>:<dl className="sc-stats"><div><dt>{copy.gates}</dt><dd><bdi>{m.walked.length}/{total}</bdi></dd></div><div><dt>{copy.rounds}</dt><dd><bdi>{m.rounds}</bdi></dd></div><div><dt>{copy.been}</dt><dd><bdi>{m.been}</bdi></dd></div></dl>}
  {next&&<Link className="sc-next min-h-tap" href={clubHref(clubId,next,locale)}>{copy.next} <b>{names[next]??next}</b> →</Link>}
 </article>
}
