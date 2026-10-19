'use client'
import Link from 'next/link'
import {useEffect,useState,type ReactNode} from 'react'
import {LAST_CLUB_KEY} from '@/components/clubs/RememberClub'

export type HeroClub={id:string;name:string;city:string;otd:{title:string;years:number}|null}
export type HeroCopy={kicker:string;cont:string;contSub:string;newK:string;newT:string;otd:string;play:string}
const Arrow=()=><svg className="wkh-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>

/**
 * The hub's first screen (H1). The hub never asks a new fan to choose a club: with nothing remembered on this device it
 * shows the crest row (one tap, straight in); a returning fan gets "Continue at <club>". There is no Daily button until a
 * real approved Daily edition exists for the club — an honest state, not a fake one. The "On this day" line prints only when
 * the club's archive holds an approved event on today's exact calendar day.
 */
export function HubHero({clubs,lang,crests,copy}:{clubs:HeroClub[];lang:string;crests:ReactNode;copy:HeroCopy}){
 const [last,setLast]=useState<string|null>(null)
 useEffect(()=>{try{const v=localStorage.getItem(LAST_CLUB_KEY);setLast(v&&clubs.some(c=>c.id===v)?v:null)}catch{/* storage is a convenience */}},[clubs])
 const c=clubs.find(x=>x.id===last)
 if(!c)return <section className="wkh-hero wkh-hero-new wk-panel" aria-labelledby="hero-h" data-hero="new">
  <p className="wk-k wkh-green">{copy.newK}</p>
  <h2 className="wk-head wkh-hero-h" id="hero-h">{copy.newT}</h2>
  {crests}
 </section>
 return <section className="wkh-hero wk-panel" aria-labelledby="hero-h" data-hero="returning" data-club={c.id}>
  <p className="wk-k wkh-green">{copy.kicker}</p>
  <h2 className="wk-head wkh-hero-h" id="hero-h">{c.name}</h2>
  <p className="wk-small">{copy.contSub.replace('{city}',c.city)}</p>
  {c.otd&&<p className="wkh-otd" data-testid="hub-otd"><span className="wk-k red">{copy.otd.replace('{n}',String(c.otd.years))}</span> <b>{c.otd.title}</b></p>}
  <Link className="wk-btn green wkh-hero-go min-h-tap" href={`/clubs/${c.id}${lang}`}>{copy.cont.replace('{club}',c.name)} <Arrow/></Link>
 </section>
}
