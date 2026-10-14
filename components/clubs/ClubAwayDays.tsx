'use client'
import dynamic from 'next/dynamic'
import {useCallback,useEffect,useMemo,useRef,useState,type ReactNode} from 'react'
import {firePickFxAt} from '@/components/stage/PickFx'
import {haversineKm} from '@/lib/away-days/distance'
import {useBeen} from '@/components/away-days/useBeen'
import type {Camera,MapMarker} from '@/components/away-days/AwayDaysMap'
import type {VenueLite} from '@/lib/away-days/journey'
import {bySeason,countryName,totalKm,visitKey,type ClubAwayData,type ClubStadium,type ClubVisit} from '@/lib/away-days/club'

const Globe=dynamic(()=>import('@/components/away-days/AwayDaysMap'),{ssr:false,loading:()=><div className="cad-map-load" role="status"/>})
type Copy={kicker:string;title:string;lede:string;back:string;matches:string;abroad:string;grounds:string;countries:string;km:string;all:string;onlyAbroad:string;home:string;away:string;neutral:string;domestic:string;been:string;beenOn:string;attendance:string;leg:string;pens:string;selected:string;clear:string;mapLabel:string;youVisited:string;scorers:string;source:string;modeJourney:string;modeExplore:string;start:string;startLine:string;next:string;prev:string;play:string;pause:string;end:string;endLine:string;first:string;again:string;farthest:string;bigWin:string;heavy:string;progress:string;winWord:string;drawWord:string;lossWord:string;totalKm:string;fromTo:string;chapter:string;speed:string;jump:string;unplaced:string;nights?:string;road?:string;roadSub?:string;nextDecade?:string;showStop?:string;keys?:string;keyStep?:string;keyDecade?:string;whole?:string;won?:string;drew?:string;lost?:string;atHome?:string;nightsAway?:string}
const lite=(s:ClubStadium,locale:'en'|'he'):VenueLite=>({id:s.id,nameHe:s.name,nameLatin:s.name,cityHe:s.city??'',cityLatin:s.city,countryHe:countryName(s.countryCode,locale),countryCode:s.countryCode,lat:s.lat,lng:s.lng})
const fmtDay=(iso:string,locale:'en'|'he')=>{try{return new Intl.DateTimeFormat(locale==='he'?'he-IL':'en-GB',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(`${iso}T00:00:00Z`))}catch{return iso.slice(5)}}
const decadeOf=(v:ClubVisit)=>Math.floor(Number(v.playedOn.slice(0,4))/10)*10

/**
 * One night away as a ticket stub (THE WEEKLY, rule 124): the stop's number as on the map, the date on the stub, the
 * opponent and the ground, the score in the club's box and "I was there". Facts only from UEFA's record.
 */
function Stub({v,s,n,locale,copy,been,onBeen,current,onShow,onGround,side}:{v:ClubVisit;s:ClubStadium;n?:number;locale:'en'|'he';copy:Copy;been:boolean;onBeen:()=>void;current?:boolean;onShow?:()=>void;onGround?:()=>void;side?:string}){
 const num=(x:number)=>x.toLocaleString(locale==='he'?'he-IL':'en-GB')
 const word=v.result==='W'?copy.winWord:v.result==='D'?copy.drawWord:copy.lossWord
 const date=<><b className="wk-num" dir="ltr">{v.playedOn.slice(0,4)}</b><small className="wk-k"><bdi>{fmtDay(v.playedOn,locale)}</bdi></small></>
 const ground=<>{side&&<span className="wk-k">{side} </span>}<bdi>{s.name}</bdi>{s.city?<>, <bdi>{s.city}</bdi></>:null} · {countryName(s.countryCode,locale)}</>
 return <li className="wkk-stub" data-result={v.result} data-side={v.side} aria-current={current?'step':undefined}>
  {n!==undefined&&<span className="wk-roundel wkk-stub-no" dir="ltr" aria-hidden="true">{n}</span>}
  {onShow?<button type="button" className="wkk-stub-date min-h-tap" onClick={onShow} aria-label={`${copy.showStop??''} ${n??''} · ${v.opponent} · ${v.playedOn}`.trim()}>{date}</button>:<span className="wkk-stub-date">{date}</span>}
  <div className="wkk-stub-body">
   <b className="wk-head"><bdi>{v.opponent}</bdi></b>
   {onGround?<button type="button" className="wkk-stub-ground min-h-tap" onClick={onGround}>{ground}</button>:<p className="wkk-stub-ground">{ground}</p>}
   <p className="wk-k wkk-stub-comp">{[v.competition,v.stage,v.leg?copy.leg.replace('{n}',String(v.leg)):null].filter(Boolean).join(' · ')}</p>
   {v.penalties&&<p className="wkk-stub-note">{copy.pens.replace('{a}',String(v.penalties.for)).replace('{b}',String(v.penalties.against))}</p>}
   {v.scorers.some(g=>g.forClub)&&<p className="wkk-stub-note">{copy.scorers}: {v.scorers.filter(g=>g.forClub).map(g=>`${g.name}${g.minute!=null?` ${g.minute}'`:''}${g.penalty?' (p)':''}${g.ownGoal?' (og)':''}`).join(', ')}</p>}
   {v.attendance!=null&&<p className="wkk-stub-note">{copy.attendance}: {num(v.attendance)}</p>}
  </div>
  <div className="wkk-stub-score">
   <b className="wk-num" dir="ltr">{v.scoreFor}–{v.scoreAgainst}</b>
   <span className="wkk-stub-word">{word}</span>
   <button type="button" className="wkk-been min-h-tap" aria-pressed={been} onClick={onBeen}>{been?copy.beenOn:copy.been}</button>
  </div>
 </li>
}

/** The whole road in four numbers. */
function Whole({data,copy,locale}:{data:ClubAwayData;copy:Copy;locale:'en'|'he'}){
 const num=(n:number)=>n.toLocaleString(locale==='he'?'he-IL':'en-GB')
 return <div className="wk-panel wk-lift wkk-whole">
  <p className="wk-k muted">{copy.whole??copy.title}</p>
  <ul aria-label={copy.title}>
   <li><b className="wk-num">{data.counts.matches}</b><small className="wk-k">{copy.matches}</small></li>
   <li><b className="wk-num">{data.counts.abroad}</b><small className="wk-k">{copy.abroad}</small></li>
   <li><b className="wk-num">{data.counts.grounds}</b><small className="wk-k">{copy.grounds}</small></li>
   <li><b className="wk-num">{data.counts.countries}</b><small className="wk-k">{copy.countries}</small></li>
   <li className="wide"><b className="wk-num" dir="ltr">{num(totalKm(data))}</b><small className="wk-k">{copy.km}</small></li>
  </ul>
 </div>
}

/** AWAY DAYS for one club — the explorer: the globe, the grounds it has played on in Europe, and every tie by season. */
function Explore({data,locale,copy}:{data:ClubAwayData;locale:'en'|'he';copy:Copy}) {
 const {ledger,toggle}=useBeen()
 const [abroad,setAbroad]=useState(true),[sel,setSel]=useState<string|null>(null)
 const st=useMemo(()=>Object.fromEntries(data.stadiums.map(s=>[s.id,s])),[data])
 const shown=useMemo(()=>data.visits.filter(v=>!abroad||v.physicallyAbroad),[data,abroad])
 const counts=useMemo(()=>{const c:Record<string,number>={};for(const v of data.visits)c[v.venueId]=(c[v.venueId]??0)+1;return c},[data])
 const markers:MapMarker[]=useMemo(()=>data.stadiums.filter(s=>s.id===data.origin||!abroad||data.visits.some(v=>v.venueId===s.id&&v.physicallyAbroad)).map(s=>({venue:lite(s,locale),state:s.id===sel?'active':s.id===data.origin?'origin':'idle',count:counts[s.id]})),[data,abroad,sel,counts,locale])
 const origin=st[data.origin]!,focusAt=sel?st[sel]!:origin
 const focus:Camera=useMemo(()=>({lng:focusAt.lng,lat:focusAt.lat,zoom:sel?3.4:2.3}),[focusAt,sel])
 const list=sel?shown.filter(v=>v.venueId===sel):shown
 const mine=data.visits.filter(v=>ledger[visitKey(v)]?.b).length
 const sideLabel=(v:ClubVisit)=>v.side==='HOME'?copy.home:v.side==='AWAY'?copy.away:v.side==='NEUTRAL'?copy.neutral:copy.domestic
 return <div className="cad wkk-explore">
  <div className="wkk-explore-top">
   <div className="wk-panel wkk-mapframe">
    <div className="cad-map wkk-map" role="group" aria-label={copy.mapLabel}>
     <Globe markers={markers} route={[]} leg={null} focus={focus} interactive onMarker={id=>setSel(s=>s===id?null:id)}/>
    </div>
   </div>
   <div className="wkk-explore-side">
    <div className="wk-seg wkk-explore-seg" role="group" aria-label={copy.title}>
     <button type="button" className="min-h-tap" aria-pressed={abroad} onClick={()=>setAbroad(true)}>{copy.onlyAbroad}</button>
     <button type="button" className="min-h-tap" aria-pressed={!abroad} onClick={()=>setAbroad(false)}>{copy.all}</button>
    </div>
    {sel&&<button type="button" className="wk-applied wkk-explore-sel min-h-tap" onClick={()=>setSel(null)}>{copy.selected.replace('{name}',st[sel]!.name)} · {copy.clear} <i aria-hidden="true">×</i></button>}
    {mine>0&&<p className="wk-stamp wkk-mine">{copy.youVisited.replace('{n}',String(mine))}</p>}
    <Whole data={data} copy={copy} locale={locale}/>
   </div>
  </div>
  {bySeason(list).map(g=><section key={g.season} className="wkk-roadsec" aria-label={g.season}>
   <h2 className="wkk-season-bar"><bdi className="wk-num">{g.season}</bdi><small className="wk-k wkk-season-n">{g.visits[0]!.competition}</small></h2>
   <ol className="wkk-stubs">{g.visits.map(v=>{const s=st[v.venueId]!
    return <Stub key={v.id} v={v} s={s} locale={locale} copy={copy} side={sideLabel(v)} been={ledger[visitKey(v)]?.b===true} onBeen={()=>toggle(visitKey(v))} onGround={()=>setSel(x=>x===s.id?null:s.id)}/>})}</ol>
  </section>)}
  <p className="wkk-source">{copy.source}</p>
 </div>
}

const zoomFor=(km:number)=>km>4000?1.35:km>1800?1.8:km>600?2.4:3
type LL=[number,number]

/**
 * The story: the home ground, then every ground abroad in the order it happened — the camera flies, the road draws
 * itself. The journey is read as a travel log: a decade at a time (a 4×2 grid of decades, never a sideways scroller),
 * its nights as stacked ticket stubs numbered as on the map. "Play the road" flies on by itself; ← → step on a keyboard.
 */
function Journey({data,locale,copy,head}:{data:ClubAwayData;locale:'en'|'he';copy:Copy;head?:ReactNode}) {
 const {ledger,toggle}=useBeen()
 const st=useMemo(()=>Object.fromEntries(data.stadiums.map(s=>[s.id,s])),[data])
 const trip=useMemo(()=>data.visits.filter(v=>v.physicallyAbroad),[data])
 const total=trip.length
 const origin=st[data.origin]!
 const [index,setIndex]=useState(-1),[arrived,setArrived]=useState(-1),[playing,setPlaying]=useState(false),[fast,setFast]=useState(1)
 const card=useRef<HTMLDivElement>(null),listTop=useRef<HTMLElement>(null)
 const go=useCallback((n:number)=>setIndex(Math.max(-1,Math.min(total,n))),[total])
 const at=(s:ClubStadium):LL=>[s.lng,s.lat]
 const km=(a:ClubStadium,b:ClubStadium)=>haversineKm({latitude:a.lat,longitude:a.lng},{latitude:b.lat,longitude:b.lng})
 const from=index<=0?origin:st[trip[index-1]!.venueId]!
 const cur=index>=0&&index<total?trip[index]!:null,to=cur?st[cur.venueId]!:origin
 const legKm=cur?km(from,to):0,same=cur?from.id===to.id:false
 const decades=useMemo(()=>{const m=new Map<number,{decade:number;first:number;n:number}>();trip.forEach((v,i)=>{const d=decadeOf(v);const x=m.get(d);if(x)x.n++;else m.set(d,{decade:d,first:i,n:1})});return [...m.values()]},[trip])
 // the decade the log is open at: the stop's own, or the first one before the road starts
 const decade=cur?decadeOf(cur):index>=total?(decades[decades.length-1]?.decade??0):(decades[0]?.decade??0)
 const inDecade=useMemo(()=>trip.map((v,i)=>({v,i})).filter(x=>decadeOf(x.v)===decade),[trip,decade])
 const focus:Camera=useMemo(()=>index<0?{lng:origin.lng,lat:origin.lat,zoom:2.2}:index>=total?{lng:20,lat:48,zoom:1.5}:{lng:to.lng,lat:to.lat,zoom:zoomFor(legKm)},[index,total,origin,to,legKm])
 const route=useMemo(()=>{const r:[LL,LL][]=[];for(let i=0;i<Math.min(index,total);i++){const a=i===0?origin:st[trip[i-1]!.venueId]!,b=st[trip[i]!.venueId]!;if(a.id!==b.id)r.push([at(a),at(b)])}return r},[index,total,trip,st,origin])
 const markers:MapMarker[]=useMemo(()=>{
  const o:MapMarker[]=[{venue:lite(origin,locale),state:'origin',label:index<0?origin.city?.toUpperCase():undefined}]
  const nums=new Map<string,number[]>();for(const {v,i} of inDecade)if(v.venueId!==origin.id)nums.set(v.venueId,[...(nums.get(v.venueId)??[]),i+1])
  const seen=new Set<string>();for(let i=0;i<Math.min(index,total);i++)seen.add(trip[i]!.venueId)
  for(const id of seen)if(id!==cur?.venueId&&id!==origin.id&&!nums.has(id))o.push({venue:lite(st[id]!,locale),state:'past'})
  for(const [id,ns] of nums)if(id!==cur?.venueId)o.push({venue:lite(st[id]!,locale),state:ns.some(n=>n-1<index)?'past':'idle',num:ns.join('·')})
  if(cur)o.push({venue:lite(to,locale),state:'active',label:to.city?.toUpperCase(),num:nums.get(cur.venueId)?.join('·')})
  return o},[index,total,trip,st,origin,cur,to,locale,inDecade])
 const onArrive=useCallback(()=>setArrived(index),[index])
 useEffect(()=>{if(arrived<0||arrived>=total||!card.current)return;firePickFxAt(card.current,{label:to.city??'',tone:'red',big:arrived===0||arrived===total-1,haptic:'tap'})},[arrived,total,to.city])
 // autoplay: after a stop has been read for a few seconds, fly on
 useEffect(()=>{if(!playing||arrived!==index)return;if(index>=total){setPlaying(false);return};const t=setTimeout(()=>go(index+1),(index<0?1800:4200)/fast);return()=>clearTimeout(t)},[playing,arrived,index,total,go,fast])
 // a keyboard: ← → a stop, 1–9 a decade
 useEffect(()=>{const k=(e:KeyboardEvent)=>{const t=e.target as HTMLElement|null;if(t&&/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName))return;if(e.metaKey||e.ctrlKey||e.altKey)return
  if(e.key==='ArrowRight'||e.key==='ArrowDown'){e.preventDefault();setPlaying(false);go(index+(locale==='he'?-1:1))}
  else if(e.key==='ArrowLeft'||e.key==='ArrowUp'){e.preventDefault();setPlaying(false);go(index+(locale==='he'?1:-1))}
  else if(/^[1-9]$/.test(e.key)){const d=decades[Number(e.key)-1];if(d){setPlaying(false);go(d.first)}}}
  window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k)},[index,go,locale,decades])
 // running totals as the road grows
 const sofar=useMemo(()=>{let k=0,c=new Set<string>(),w=0;for(let i=0;i<Math.min(index+1,total);i++){const a=i===0?origin:st[trip[i-1]!.venueId]!,b=st[trip[i]!.venueId]!;k+=km(a,b);c.add(b.countryCode);if(trip[i]!.result==='W')w++}return {km:Math.round(k/100)*100,countries:c.size,wins:w}},[index,total,trip,st,origin])
 const num=(n:number)=>n.toLocaleString(locale==='he'?'he-IL':'en-GB')
 // facts computed from the record, never written by hand
 const far=useMemo(()=>trip.reduce((b,v)=>km(origin,st[v.venueId]!)>km(origin,st[b.venueId]!)?v:b,trip[0]!),[trip,st,origin])
 const margin=(v:ClubVisit)=>v.scoreFor-v.scoreAgainst
 const bigWin=useMemo(()=>trip.filter(v=>v.result==='W').reduce((b,v)=>margin(v)>margin(b)?v:b,trip.find(v=>v.result==='W')!),[trip])
 const visitNo=cur?trip.slice(0,index+1).filter(v=>v.venueId===cur.venueId).length:0
 const tags=cur?[index===0?copy.first:null,visitNo>1?copy.again.replace('{n}',String(visitNo)):null,cur.id===far.id?copy.farthest:null,cur.id===bigWin?.id?copy.bigWin:null,margin(cur)<=-4?copy.heavy:null].filter(Boolean) as string[]:[]
 const word=cur?(cur.result==='W'?copy.winWord:cur.result==='D'?copy.drawWord:copy.lossWord):''
 const year=cur?Number(cur.playedOn.slice(0,4)):0
 const chapter=cur&&(index===0||decadeOf(trip[index-1]!)!==decadeOf(cur))?`${decade}s`:null
 const dec={w:inDecade.filter(x=>x.v.result==='W').length,d:inDecade.filter(x=>x.v.result==='D').length,l:inDecade.filter(x=>x.v.result==='L').length,c:new Set(inDecade.map(x=>st[x.v.venueId]!.countryCode)).size}
 const nextDec=decades[decades.findIndex(d=>d.decade===decade)+1]
 const firstStop=trip[0]?st[trip[0].venueId]:null
 // on a phone the decade's log is below the fold, so the jump brings it up; a desktop keeps the map in view
 const jump=(n:number)=>{setPlaying(false);go(n);if(window.matchMedia('(max-width: 900px)').matches)listTop.current?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}
 return <div className="cad cad-journey wkk-road">
  <div className="wkk-road-lead">
   {head}
   <div className="wk-panel wk-lift wkk-mapframe">
    <div className="wkk-mapbar" aria-hidden="true">
     {index<0?<span className="wk-lamp">{copy.start}</span>:index>=total?<span className="wk-lamp">{copy.end}</span>:<><span className="wk-lamp">{decade}s</span><span className="wk-lamp">{copy.nights?.replace('{n}',String(inDecade.length))??inDecade.length}</span><span className="wk-lamp">{dec.c} {copy.countries}</span></>}
    </div>
    <div className="cad-map wkk-map" role="group" aria-label={copy.mapLabel}>
     <Globe markers={markers} route={route} leg={cur&&!same?[at(from),at(to)]:null} focus={focus} interactive={false} onArrive={onArrive}/>
     {cur&&<div key={index} className="cad-cap wkk-mapcap" aria-hidden="true"><b dir="ltr">{year} · {same?to.city:`${from.city} → ${to.city}`}{!same&&` · ${num(Math.round(legKm/10)*10)} KM`}</b><span>{to.name}</span></div>}
     <div className="cad-run wkk-maprun" aria-hidden="true"><b dir="ltr">{num(sofar.km)}</b><small>KM</small><b dir="ltr">{sofar.countries}</b><small>{copy.countries}</small></div>
    </div>
    {data.counts.unplaced>0&&<p className="wk-cap white wkk-unplaced">{copy.unplaced.replace('{n}',String(data.counts.unplaced))}</p>}
   </div>
  </div>

  <aside className="wkk-road-side">
   <div className="wk-ticket wkk-ticket wkk-startticket">
    <div className="wkk-ticket-body">
     <p className="wk-k muted">{copy.start}</p>
     <p className="wk-head wkk-start-city">{origin.city}</p>
     <p className="wk-k">{origin.name}</p>
     <p className="wk-head red wkk-start-line">{firstStop?copy.startLine.replace('{n}',String(total)).replace('{y}',String(new Date(trip[0]!.playedOn).getFullYear())):copy.start}</p>
    </div>
    {firstStop&&<span className="wk-ticket-stub wkk-ticket-stub"><small>{copy.first}</small><b className="wk-head">{firstStop.city}</b><b className="wk-num" dir="ltr">{trip[0]!.playedOn.slice(0,4)}</b></span>}
   </div>

   <div className="wkk-playrow">
    <button type="button" className="wk-btn red lg wkk-play min-h-tap" aria-pressed={playing} onClick={()=>{if(index>=total)go(-1);setPlaying(p=>!p)}}>{playing?copy.pause:copy.play}</button>
    <button type="button" className="wk-btn paper lg wkk-speed min-h-tap" aria-label={copy.speed} onClick={()=>setFast(f=>f===1?2:f===2?4:1)}>{fast}×</button>
   </div>
   <p className="cad-prog wkk-prog wk-k" aria-live="polite">{index<0?copy.start:index>=total?copy.end:copy.progress.replace('{n}',String(index+1)).replace('{t}',String(total))}</p>

   <div ref={card} className="wkk-now" aria-live="polite">
    {cur&&<div key={cur.id} className="wk-panel wk-lift wkk-nowcard" data-result={cur.result}>
     {chapter&&<p className="wk-logo red sm wk-tilt wkk-chapter">{copy.chapter.replace('{d}',chapter)}</p>}
     <p className="wk-k muted">{[cur.competition,cur.stage,cur.leg?copy.leg.replace('{n}',String(cur.leg)):null].filter(Boolean).join(' · ')} · <bdi dir="ltr">{cur.playedOn}</bdi></p>
     <div className="wkk-now-big"><b className="wk-head"><bdi>{cur.opponent}</bdi></b><b className="wk-num wkk-now-score" dir="ltr"><i>{cur.scoreFor}</i>–<i>{cur.scoreAgainst}</i></b></div>
     <p className="wk-k red">{word}{cur.penalties?` · ${copy.pens.replace('{a}',String(cur.penalties.for)).replace('{b}',String(cur.penalties.against))}`:''}</p>
     {tags.length>0&&<ul className="wkk-now-tags">{tags.map(t=><li key={t} className="wk-tag ink">{t}</li>)}</ul>}
    </div>}
    {index>=total&&<div className="wk-panel wk-lift wkk-nowcard"><p className="wk-k muted">{copy.end}</p><p className="wk-head">{copy.endLine.replace('{k}',num(totalKm(data))).replace('{c}',String(new Set(trip.map(v=>st[v.venueId]!.countryCode)).size)).replace('{n}',String(total))}</p><p>{copy.totalKm.replace('{w}',String(trip.filter(v=>v.result==='W').length))}</p></div>}
   </div>

   {decades.length>1&&<div className="wkk-decades">
    <p className="wk-logo red sm wk-tilt wkk-decades-h">{copy.jump}</p>
    <div className="wkk-decgrid" role="group" aria-label={copy.jump}>{decades.map(d=><button key={d.decade} type="button" className="min-h-tap" aria-pressed={decade===d.decade} onClick={()=>jump(d.first)}><b className="wk-head">{d.decade}s</b><small className="wk-num">{d.n}</small></button>)}</div>
   </div>}
   <Whole data={data} copy={copy} locale={locale}/>
   {copy.keys&&<div className="wk-keys wkk-keys"><p className="wk-k muted">{copy.keys}</p><p><span className="wk-kbd">←</span> <span className="wk-kbd">→</span> {copy.keyStep}</p><p><span className="wk-kbd">1</span>–<span className="wk-kbd">{Math.min(9,decades.length)}</span> {copy.keyDecade}</p></div>}
  </aside>

  <section className="wkk-roadsec wkk-roadlist" ref={listTop} aria-labelledby="road-h">
   <div className="wkk-sechead wkk-road-head">
    <div><p className="wk-banner">{copy.road}</p><h2 id="road-h" className="wk-logo red wk-tilt">{copy.chapter.replace('{d}',`${decade}s`)}</h2></div>
    <div className="wkk-road-tags">
     {dec.w>0&&<span className="wk-tag red">{copy.won?.replace('{n}',String(dec.w))}</span>}
     {dec.d>0&&<span className="wk-tag">{copy.drew?.replace('{n}',String(dec.d))}</span>}
     {dec.l>0&&<span className="wk-tag ink">{copy.lost?.replace('{n}',String(dec.l))}</span>}
     <span className="wk-tag">{dec.c} {copy.countries}</span>
    </div>
   </div>
   <ol className="wkk-stubs">{inDecade.map(({v,i})=><Stub key={v.id} v={v} s={st[v.venueId]!} n={i+1} locale={locale} copy={copy} current={i===index} been={ledger[visitKey(v)]?.b===true} onBeen={()=>toggle(visitKey(v))} onShow={()=>{setPlaying(false);go(i)}}/>)}</ol>
   {nextDec&&<button type="button" className="wk-seeall wkk-nextdec min-h-tap" onClick={()=>jump(nextDec.first)}><span>{copy.nextDecade?.replace('{d}',`${nextDec.decade}s`).replace('{n}',String(nextDec.n))}</span><span aria-hidden="true">→</span></button>}
   <p className="wkk-source">{copy.source}</p>
  </section>
 </div>
}

/** AWAY DAYS: the journey first, the explorer one tap away. */
export function ClubAwayDays({data,locale,copy,head}:{data:ClubAwayData;locale:'en'|'he';copy:Copy;head?:ReactNode}) {
 const [mode,setMode]=useState<'journey'|'explore'>('journey')
 return <>
  <div role="tablist" aria-label={copy.title} className="wk-seg wkk-modes">
   {(['journey','explore'] as const).map(m=><button key={m} role="tab" type="button" aria-selected={mode===m} className="min-h-tap" onClick={()=>setMode(m)}>{m==='journey'?copy.modeJourney:copy.modeExplore}</button>)}
  </div>
  {mode==='journey'?<Journey data={data} locale={locale} copy={copy} head={head}/>:<Explore data={data} locale={locale} copy={copy}/>}
 </>
}
