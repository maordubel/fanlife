'use client'
import Link from 'next/link'
import {useEffect,useMemo,useState,type CSSProperties} from 'react'
import {useRouter} from 'next/navigation'
import {LAST_CLUB_KEY} from '@/components/clubs/RememberClub'
import {Sticker,fold,type IndexClub} from './ClubsIndex'
import {scene,bit} from '@/lib/home/art'

export type PickerCopy={kicker:string;title:string;sub:string;back:string;cont:string;change:string;search:string;all:string;none:string;enter:string;
 moreK:string;surprise:string;surpriseSub:string;allClubs:string;allClubsSub:string;noClub:string;noClubSub:string;soonK:string;soonT:string;vote:string}

const Arrow=()=><svg className="wkh-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
const ink=(c:IndexClub)=>({['--club-primary' as string]:c.primary,['--club-on-primary' as string]:c.on}) as CSSProperties

/**
 * PICK YOUR CLUB (owner, 23.11.2026: "far more choices, and certainly far more beautiful"). The terrace picture carries the
 * question; every open club is a sticker in its own colours, found by country or by typing; a returning fan gets his club
 * first, as a ticket. Under the stickers, three more ways in — a surprise, the whole list, or no club at all — and the
 * clubs next off the press. Phone: three stickers a row, nothing sideways. Desktop: the picture beside the wall of stickers.
 */
export function ClubPicker({live,soon,copy,lang}:{live:IndexClub[];soon:IndexClub[];copy:PickerCopy;lang:string}){
 const router=useRouter()
 const [q,setQ]=useState(''),[country,setCountry]=useState(''),[last,setLast]=useState<string|null>(null)
 useEffect(()=>{try{setLast(localStorage.getItem(LAST_CLUB_KEY))}catch{/* no storage */}},[])
 const countries=useMemo(()=>[...new Set(live.map(c=>c.country).filter(Boolean))].sort(),[live])
 const shown=useMemo(()=>{const f=fold(q.trim());return live.filter(c=>(!country||c.country===country)&&(!f||fold(`${c.name} ${c.city} ${c.country} ${c.nick??''}`).includes(f)))},[live,q,country])
 const mine=live.find(c=>c.id===last)
 const terrace=scene('terrace'),scarf=bit('supporter-scarf'),flag=bit('terrace-flag'),ball=bit('vintage-football'),boots=bit('football-boots')
 const surprise=()=>{const pool=shown.length?shown:live;const c=pool[Math.floor(Math.random()*pool.length)];if(c)router.push(c.href)}
 return <section className="wkq" id="pick" aria-labelledby="pick-h" data-testid="club-picker" data-mine={mine?mine.id:undefined} data-few={live.length<=9||undefined}>
  <header className="wkq-head">
   {/* eslint-disable-next-line @next/next/no-img-element -- the owner's picture, cut to two widths by scripts/brand/art-vol2.py */}
   <img className="wkq-pic" src={terrace.src} srcSet={terrace.srcSet} sizes="(min-width: 901px) 34vw, 100vw" alt="" width={960} height={640} loading="lazy" decoding="async"/>
   <div className="wkq-head-t">
    <p className="wk-banner">{copy.kicker}</p>
    <h2 className="wkq-h" id="pick-h">{copy.title}</h2>
    <p className="wkq-sub">{copy.sub.replace('{n}',String(live.length)).replace('{m}',String(soon.length))}</p>
   </div>
   {/* eslint-disable-next-line @next/next/no-img-element -- a cut-out breaking the frame, decoration only */}
   <img className="wkq-scarf" src={scarf.src} srcSet={scarf.srcSet} sizes="150px" alt="" width={320} height={207} loading="lazy" decoding="async"/>
  </header>

  {mine&&<Link className="wkq-mine min-h-tap" href={mine.href} style={ink(mine)} data-testid="picker-mine">
   <span className="wkq-mine-band" data-livery={mine.pattern}><span className="ckp-disc">{mine.crest?/* eslint-disable-next-line @next/next/no-img-element -- a crest ships exactly as recorded */<img src={mine.crest} alt="" width="72" height="72"/>:<b>{mine.initials}</b>}</span></span>
   <span className="wkq-mine-t"><span className="wk-k">{copy.back}</span><b>{mine.name}</b><small>{copy.cont.replace('{club}',mine.name)}</small></span><Arrow/>
  </Link>}

  <div className="wkq-tools" role="search">
   {mine&&<p className="wk-k wkq-change">{copy.change}</p>}
   <div className="wkq-chips" role="group" aria-label={copy.all}>
    <button type="button" className="ckp-chip min-h-tap" aria-pressed={!country} onClick={()=>setCountry('')}>{copy.all} <small>{live.length}</small></button>
    {countries.map(k=><button key={k} type="button" className="ckp-chip min-h-tap" aria-pressed={country===k} onClick={()=>setCountry(country===k?'':k)}>{k} <small>{live.filter(c=>c.country===k).length}</small></button>)}
   </div>
   <label className="ckp-search wkq-search"><span className="sr-only">{copy.search}</span>
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
    <input className="min-h-tap" type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder={copy.search} autoComplete="off"/></label>
  </div>

  {shown.length?<div className="wkq-wall" data-testid="picker-wall">{shown.map(c=><Sticker key={c.id} c={c} n={live.indexOf(c)} enter={copy.enter}/>)}</div>:<p className="ckp-none">{copy.none}</p>}

  <div className="wkq-more" aria-label={copy.moreK}>
   <p className="wk-banner wkq-more-k">{copy.moreK}</p>
   <ul className="wkq-ways">
    <li><button type="button" className="wkq-way min-h-tap" data-way="surprise" data-testid="picker-surprise" onClick={surprise}>
     {/* eslint-disable-next-line @next/next/no-img-element -- a cut-out, decoration only */}
     <img src={ball.src} srcSet={ball.srcSet} sizes="64px" alt="" width={320} height={329} loading="lazy" decoding="async"/><span><b>{copy.surprise}</b><small>{copy.surpriseSub}</small></span><Arrow/></button></li>
    <li><Link className="wkq-way min-h-tap" data-way="all" href={`/clubs${lang}`}>
     {/* eslint-disable-next-line @next/next/no-img-element -- a cut-out, decoration only */}
     <img src={flag.src} srcSet={flag.srcSet} sizes="64px" alt="" width={320} height={282} loading="lazy" decoding="async"/><span><b>{copy.allClubs}</b><small>{copy.allClubsSub}</small></span><Arrow/></Link></li>
    <li><Link className="wkq-way min-h-tap" data-way="none" href={`/our-games${lang}`}>
     {/* eslint-disable-next-line @next/next/no-img-element -- a cut-out, decoration only */}
     <img src={boots.src} srcSet={boots.srcSet} sizes="64px" alt="" width={320} height={225} loading="lazy" decoding="async"/><span><b>{copy.noClub}</b><small>{copy.noClubSub}</small></span><Arrow/></Link></li>
   </ul>
  </div>

  {soon.length>0&&<div className="wkq-soon">
   <p className="wkq-soon-t"><span className="wk-k">{copy.soonK}</span> <b>{copy.soonT.replace('{m}',String(soon.length))}</b></p>
   <ul className="wkq-soon-list">{soon.map(c=><li key={c.id} style={ink(c)} title={c.name}><span className="wkq-soon-disc">{c.crest?/* eslint-disable-next-line @next/next/no-img-element -- a crest ships exactly as recorded */<img src={c.crest} alt="" width="36" height="36" loading="lazy"/>:<b>{c.initials}</b>}</span><span className="wkq-soon-n">{c.name}</span></li>)}</ul>
   <Link className="wk-btn paper min-h-tap wkq-vote" href={`/clubs${lang}`}>{copy.vote} <Arrow/></Link>
  </div>}
 </section>
}
