'use client'
import Link from 'next/link'
import {useEffect,useState} from 'react'
import {readActivity,RUN_GATES,type Activity} from '@/lib/clubs/activity'
import {clubHref} from '@/lib/clubs/club-href'
import type {UiLocale} from '@/lib/clubs/locale'

/** "Your rounds": what this device has played at this club, as stamps that open the game again. Nothing played → one line. */
export function ClubRounds({clubId,locale,names,none}:{clubId:string;locale:UiLocale;names:Record<string,string>;none:string}) {
 const [a,setA]=useState<Activity|null>(null)
 useEffect(()=>{setA(readActivity(clubId))},[clubId])
 const played=a?RUN_GATES.filter(g=>a[g].completed>0).sort((x,y)=>a[y].completed-a[x].completed).slice(0,4):[]
 if(!a)return <p className="mag-fine" aria-hidden="true">&nbsp;</p>
 if(!played.length)return <p className="mag-fine" data-testid="rounds-none">{none}</p>
 return <ul className="club-rounds" data-testid="rounds">{played.map(g=><li key={g}><Link href={clubHref(clubId,g,locale)}><b>{a[g].completed}</b><span>{names[g]??g}</span></Link></li>)}</ul>
}
