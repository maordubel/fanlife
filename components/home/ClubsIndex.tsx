'use client'
import Link from 'next/link'
import {useEffect,useMemo,useState,type CSSProperties} from 'react'
import {LAST_CLUB_KEY} from '@/components/clubs/RememberClub'

/**
 * THE CLUBS' chooser (18.11.2026): the stickers, a search that reads names, cities and nicknames, A–Z or by country.
 * Your last club is lifted to the top as "your club". Filters are chips that wrap — never a sideways rail (rule 124).
 */
export type IndexClub={id:string;name:string;city:string;country:string;nick:string|null;crest:string|null;initials:string;primary:string;on:string;pattern:string;href:string;live:boolean}
type Copy={kicker:string;title:string;note:string;stamp:string;search:string;all:string;az:string;byCountry:string;none:string;soon:string;soonNote:string;vote:string;enter:string;back:string}

const fold=(s:string)=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()
const ink=(c:IndexClub)=>({['--club-primary' as string]:c.primary,['--club-on-primary' as string]:c.on}) as CSSProperties
const TILT=[-1.2,0.8,-0.5,1.1,-0.9,0.4,1.3,-0.7]

function Sticker({c,n,mine,enter}:{c:IndexClub;n:number;mine?:boolean;enter:string}){
 return <Link className="ckp-stk min-h-tap" href={c.href} style={{...ink(c),['--r' as string]:`${TILT[n%TILT.length]}deg`}} data-mine={mine||undefined}>
  <span className="ckp-band" data-livery={c.pattern}>
   <span className="ckp-no" aria-hidden="true">{String(n+1).padStart(2,'0')}</span>
   <span className="ckp-disc">{c.crest?/* eslint-disable-next-line @next/next/no-img-element -- a crest ships exactly as recorded */<img src={c.crest} alt="" width="72" height="72" loading="lazy"/>:<b>{c.initials}</b>}</span>
  </span>
  <span className="ckp-nm"><b>{c.name}</b><small>{c.city} · {c.country}</small>{c.nick&&<em>“{c.nick}”</em>}</span>
  <span className="ckp-go" aria-hidden="true">{enter} →</span>
  <svg className="ckp-peel" viewBox="0 0 22 22" aria-hidden="true"><path className="a" d="M22 0 L22 22 L0 22 Z"/><path className="b" d="M22 0 L0 22 L1 1 Z"/></svg>
 </Link>
}

export function ClubsIndex({live,soon,copy}:{live:IndexClub[];soon:IndexClub[];copy:Copy}){
 const [q,setQ]=useState(''),[mode,setMode]=useState<'az'|'country'>('az'),[country,setCountry]=useState<string>(''),[last,setLast]=useState<string|null>(null)
 useEffect(()=>{try{setLast(localStorage.getItem(LAST_CLUB_KEY))}catch{/* no storage */}},[])
 const countries=useMemo(()=>[...new Set(live.map(c=>c.country))].sort(),[live])
 const shown=useMemo(()=>{const f=fold(q.trim());return live.filter(c=>(!country||c.country===country)&&(!f||fold(`${c.name} ${c.city} ${c.country} ${c.nick??''}`).includes(f)))},[live,q,country])
 const mine=live.find(c=>c.id===last)
 const groups=mode==='country'?countries.map(k=>[k,shown.filter(c=>c.country===k)] as const).filter(([,v])=>v.length):[['',shown] as const]
 return <>
  <header className="ckp-mast wk-panel wk-greenplate">
   <span className="wk-speed ckp-speed" aria-hidden="true"/>
   <p className="wk-banner">{copy.kicker}</p>
   <h1 className="wk-logo ckp-title">{copy.title}</h1>
   <p className="ckp-note">{copy.note}</p>
   <span className="wk-stamp ckp-stamp">{copy.stamp}</span>
  </header>

  {mine&&<section className="ckp-mine" aria-label={copy.back.replace('{club}',mine.name)}>
   <p className="wk-k">{copy.back.replace('{club}',mine.name)}</p>
   <div className="ckp-grid ckp-grid-one"><Sticker c={mine} n={live.indexOf(mine)} mine enter={copy.enter}/></div>
  </section>}

  <div className="ckp-tools" role="search">
   <label className="ckp-search"><span className="sr-only">{copy.search}</span>
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
    <input className="min-h-tap" type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder={copy.search} autoComplete="off"/></label>
   <div className="ckp-seg" role="group" aria-label={copy.az}>
    <button type="button" className="min-h-tap" aria-pressed={mode==='az'} onClick={()=>setMode('az')}>{copy.az}</button>
    <button type="button" className="min-h-tap" aria-pressed={mode==='country'} onClick={()=>setMode('country')}>{copy.byCountry}</button>
   </div>
   <div className="ckp-chips" role="group" aria-label={copy.byCountry}>
    <button type="button" className="ckp-chip min-h-tap" aria-pressed={!country} onClick={()=>setCountry('')}>{copy.all}</button>
    {countries.map(k=><button key={k} type="button" className="ckp-chip min-h-tap" aria-pressed={country===k} onClick={()=>setCountry(country===k?'':k)}>{k}</button>)}
   </div>
  </div>

  {shown.length?groups.map(([k,v])=><section key={k||'all'} className="ckp-group" aria-label={k||copy.title}>
   {k&&<h2 className="ckp-country">{k}<small>{v.length}</small></h2>}
   <div className="ckp-grid">{v.map(c=><Sticker key={c.id} c={c} n={live.indexOf(c)} enter={copy.enter}/>)}</div>
  </section>):<p className="ckp-none">{copy.none}</p>}

  {soon.length>0&&<section className="ckp-soon" aria-labelledby="ckp-soon-h">
   <h2 className="ckp-country" id="ckp-soon-h">{copy.soon}<small>{soon.length}</small></h2>
   <p className="ckp-note">{copy.soonNote}</p>
   <ul className="ckp-soon-list">{soon.map(c=><li key={c.id} style={ink(c)}><span className="ckp-soon-disc">{c.crest?/* eslint-disable-next-line @next/next/no-img-element -- a crest ships exactly as recorded */<img src={c.crest} alt="" width="36" height="36" loading="lazy"/>:c.initials}</span><span><b>{c.name}</b><small>{c.city}</small></span></li>)}</ul>
   <Link className="wk-btn paper min-h-tap ckp-vote" href="/#suggest">{copy.vote}</Link>
  </section>}
 </>
}
