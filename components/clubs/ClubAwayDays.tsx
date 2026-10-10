'use client'
import dynamic from 'next/dynamic'
import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import {firePickFxAt} from '@/components/stage/PickFx'
import {haversineKm} from '@/lib/away-days/distance'
import {useBeen} from '@/components/away-days/useBeen'
import type {Camera,MapMarker} from '@/components/away-days/AwayDaysMap'
import type {VenueLite} from '@/lib/away-days/journey'
import {bySeason,countryName,totalKm,visitKey,type ClubAwayData,type ClubStadium,type ClubVisit} from '@/lib/away-days/club'

const Map=dynamic(()=>import('@/components/away-days/AwayDaysMap'),{ssr:false,loading:()=><div className="cad-map-load" role="status"/>})
type Copy={kicker:string;title:string;lede:string;back:string;matches:string;abroad:string;grounds:string;countries:string;km:string;all:string;onlyAbroad:string;home:string;away:string;neutral:string;domestic:string;been:string;beenOn:string;attendance:string;leg:string;pens:string;selected:string;clear:string;mapLabel:string;youVisited:string;scorers:string;source:string;modeJourney:string;modeExplore:string;start:string;startLine:string;next:string;prev:string;play:string;pause:string;end:string;endLine:string;first:string;again:string;farthest:string;bigWin:string;heavy:string;progress:string;winWord:string;drawWord:string;lossWord:string;totalKm:string;fromTo:string}
const lite=(s:ClubStadium,locale:'en'|'he'):VenueLite=>({id:s.id,nameHe:s.name,nameLatin:s.name,cityHe:s.city??'',cityLatin:s.city,countryHe:countryName(s.countryCode,locale),countryCode:s.countryCode,lat:s.lat,lng:s.lng})

/** AWAY DAYS for one club — the globe, the grounds it has played on in Europe, and every tie by season. */
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
 const num=(n:number)=>n.toLocaleString(locale==='he'?'he-IL':'en-GB')
 const sideLabel=(v:ClubVisit)=>v.side==='HOME'?copy.home:v.side==='AWAY'?copy.away:v.side==='NEUTRAL'?copy.neutral:copy.domestic
 return <div className="cad">
  <ul className="cad-stats" aria-label={copy.title}>
   <li><b>{data.counts.matches}</b><small>{copy.matches}</small></li>
   <li><b>{data.counts.abroad}</b><small>{copy.abroad}</small></li>
   <li><b>{data.counts.grounds}</b><small>{copy.grounds}</small></li>
   <li><b>{data.counts.countries}</b><small>{copy.countries}</small></li>
   <li><b dir="ltr">{num(totalKm(data))}</b><small>{copy.km}</small></li>
  </ul>
  <div className="cad-map" role="group" aria-label={copy.mapLabel}>
   <Map markers={markers} route={[]} leg={null} focus={focus} interactive onMarker={id=>setSel(s=>s===id?null:id)}/>
  </div>
  <div className="cad-bar">
   <div role="group" aria-label={copy.title} className="cad-chips">
    <button type="button" className="cad-chip min-h-tap" aria-pressed={abroad} onClick={()=>setAbroad(true)}>{copy.onlyAbroad}</button>
    <button type="button" className="cad-chip min-h-tap" aria-pressed={!abroad} onClick={()=>setAbroad(false)}>{copy.all}</button>
   </div>
   {sel&&<button type="button" className="cad-chip min-h-tap" onClick={()=>setSel(null)}>{copy.selected.replace('{name}',st[sel]!.name)} · {copy.clear}</button>}
   {mine>0&&<p className="cad-mine">{copy.youVisited.replace('{n}',String(mine))}</p>}
  </div>
  {bySeason(list).map(g=><section key={g.season} className="cad-season" aria-label={g.season}>
   <h2>{g.season}<small>{g.visits[0]!.competition}</small></h2>
   <ol>{g.visits.map(v=>{const s=st[v.venueId]!,been=ledger[visitKey(v)]?.b===true
    return <li key={v.id} className="cad-visit" data-side={v.side} data-result={v.result}>
     <div className="cad-vhead"><span className="cad-date" dir="ltr">{v.playedOn}</span><span className="cad-stage">{[v.competition,v.stage,v.leg?copy.leg.replace('{n}',String(v.leg)):null].filter(Boolean).join(' · ')}</span></div>
     <div className="cad-vmain"><span className="cad-opp"><bdi>{v.opponent}</bdi></span><b className="cad-score" dir="ltr">{v.scoreFor}–{v.scoreAgainst}</b><span className="cad-res" aria-label={v.result}>{v.result}</span></div>
     <button type="button" className="cad-ground min-h-tap" onClick={()=>setSel(x=>x===s.id?null:s.id)}><span>{sideLabel(v)}</span> <bdi>{s.name}</bdi>, <bdi>{s.city}</bdi> · {countryName(s.countryCode,locale)}</button>
     {v.penalties&&<p className="cad-note">{copy.pens.replace('{a}',String(v.penalties.for)).replace('{b}',String(v.penalties.against))}</p>}
     {v.scorers.filter(g=>g.forClub).length>0&&<p className="cad-note">{copy.scorers}: {v.scorers.filter(g=>g.forClub).map(g=>`${g.name}${g.minute!=null?` ${g.minute}'`:''}${g.penalty?' (p)':''}${g.ownGoal?' (og)':''}`).join(', ')}</p>}
     {v.attendance!=null&&<p className="cad-note">{copy.attendance}: {num(v.attendance)}</p>}
     <button type="button" className="cad-been min-h-tap" aria-pressed={been} onClick={()=>toggle(visitKey(v))}>{been?copy.beenOn:copy.been}</button>
    </li>})}</ol>
  </section>)}
  <p className="cad-source">{copy.source}</p>
 </div>
}

const zoomFor=(km:number)=>km>4000?1.35:km>1800?1.8:km>600?2.4:3
type LL=[number,number]

/** The story: Mostar, then every ground abroad in the order it happened — the camera flies, the road draws itself, the card tells the night. */
function Journey({data,locale,copy}:{data:ClubAwayData;locale:'en'|'he';copy:Copy}) {
 const {ledger,toggle}=useBeen()
 const st=useMemo(()=>Object.fromEntries(data.stadiums.map(s=>[s.id,s])),[data])
 const trip=useMemo(()=>data.visits.filter(v=>v.physicallyAbroad),[data])
 const total=trip.length
 const origin=st[data.origin]!
 const [index,setIndex]=useState(-1),[arrived,setArrived]=useState(-1),[playing,setPlaying]=useState(false)
 const card=useRef<HTMLDivElement>(null)
 const go=useCallback((n:number)=>setIndex(Math.max(-1,Math.min(total,n))),[total])
 const at=(s:ClubStadium):LL=>[s.lng,s.lat]
 const km=(a:ClubStadium,b:ClubStadium)=>haversineKm({latitude:a.lat,longitude:a.lng},{latitude:b.lat,longitude:b.lng})
 const from=index<=0?origin:st[trip[index-1]!.venueId]!
 const cur=index>=0&&index<total?trip[index]!:null,to=cur?st[cur.venueId]!:origin
 const legKm=cur?km(from,to):0,same=cur?from.id===to.id:false
 const focus:Camera=useMemo(()=>index<0?{lng:origin.lng,lat:origin.lat,zoom:2.2}:index>=total?{lng:20,lat:48,zoom:1.5}:{lng:to.lng,lat:to.lat,zoom:zoomFor(legKm)},[index,total,origin,to,legKm])
 const route=useMemo(()=>{const r:[LL,LL][]=[];for(let i=0;i<Math.min(index,total);i++){const a=i===0?origin:st[trip[i-1]!.venueId]!,b=st[trip[i]!.venueId]!;if(a.id!==b.id)r.push([at(a),at(b)])}return r},[index,total,trip,st,origin])
 const markers:MapMarker[]=useMemo(()=>{const o:MapMarker[]=[{venue:lite(origin,locale),state:'origin',label:index<0?origin.city?.toUpperCase():undefined}];const seen=new Set<string>();for(let i=0;i<Math.min(index,total);i++)seen.add(trip[i]!.venueId);for(const id of seen)if(id!==cur?.venueId&&id!==origin.id)o.push({venue:lite(st[id]!,locale),state:'past'});if(cur)o.push({venue:lite(to,locale),state:'active',label:to.city?.toUpperCase()});return o},[index,total,trip,st,origin,cur,to,locale])
 const onArrive=useCallback(()=>setArrived(index),[index])
 useEffect(()=>{if(arrived<0||arrived>=total||!card.current)return;firePickFxAt(card.current,{label:to.city??'',tone:'red',big:arrived===0||arrived===total-1,haptic:'tap'})},[arrived,total,to.city])
 // autoplay: after a stop has been read for a few seconds, fly on
 useEffect(()=>{if(!playing||arrived!==index)return;if(index>=total){setPlaying(false);return};const t=setTimeout(()=>go(index+1),index<0?1800:4200);return()=>clearTimeout(t)},[playing,arrived,index,total,go])
 useEffect(()=>{const k=(e:KeyboardEvent)=>{const t=e.target as HTMLElement|null;if(t&&/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName))return;if(e.key==='ArrowRight'||e.key==='ArrowDown'){e.preventDefault();go(index+(locale==='he'?-1:1))}else if(e.key==='ArrowLeft'||e.key==='ArrowUp'){e.preventDefault();go(index+(locale==='he'?1:-1))}};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k)},[index,go,locale])
 const sw=useRef<number|null>(null)
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
 return <div className="cad cad-journey">
  <div className="cad-jbar">
   <p className="cad-prog" aria-live="polite">{index<0?copy.start:index>=total?copy.end:copy.progress.replace('{n}',String(index+1)).replace('{t}',String(total))}</p>
   <div className="cad-jbtns">
    <button type="button" className="cad-chip min-h-tap" disabled={index<0} onClick={()=>{setPlaying(false);go(index-1)}}>{copy.prev}</button>
    <button type="button" className="cad-chip min-h-tap" aria-pressed={playing} onClick={()=>{if(index>=total)go(-1);setPlaying(p=>!p)}}>{playing?copy.pause:copy.play}</button>
    <button type="button" className="cad-chip min-h-tap" disabled={index>=total} onClick={()=>{setPlaying(false);go(index+1)}}>{copy.next}</button>
   </div>
  </div>
  <div className="cad-map" role="group" aria-label={copy.mapLabel}>
   <Map markers={markers} route={route} leg={cur&&!same?[at(from),at(to)]:null} focus={focus} interactive={false} onArrive={onArrive}/>
   {cur&&<div key={index} className="cad-cap" aria-hidden="true"><b dir="ltr">{year} · {same?to.city:`${from.city} → ${to.city}`}{!same&&` · ${num(Math.round(legKm/10)*10)} KM`}</b><span>{to.name}</span></div>}
   <div className="cad-run" aria-hidden="true"><b dir="ltr">{num(sofar.km)}</b><small>KM</small><b dir="ltr">{sofar.countries}</b><small>{copy.countries}</small></div>
  </div>
  <div ref={card} className="cad-dock" onPointerDown={e=>{sw.current=e.clientX}} onPointerUp={e=>{const s=sw.current;sw.current=null;if(s==null)return;const dx=e.clientX-s;if(Math.abs(dx)>48){setPlaying(false);go(index+((dx>0)===(locale==='he')?1:-1))}}} aria-live="polite">
   {index<0&&<div className="cad-card cad-intro"><small>{origin.city} · {origin.name}</small><h2>{copy.startLine.replace('{n}',String(total)).replace('{y}',String(new Date(trip[0]!.playedOn).getFullYear()))}</h2><p>{copy.first}: <bdi>{st[trip[0]!.venueId]!.city}</bdi>, {trip[0]!.playedOn.slice(0,4)}</p></div>}
   {cur&&<div key={cur.id} className="cad-card cad-stop" data-result={cur.result}>
    <small>{[cur.competition,cur.stage,cur.leg?copy.leg.replace('{n}',String(cur.leg)):null].filter(Boolean).join(' · ')} · <bdi dir="ltr">{cur.playedOn}</bdi></small>
    <div className="cad-big"><span className="cad-bigopp"><bdi>{cur.opponent}</bdi></span><b className="cad-bigscore" dir="ltr"><i>{cur.scoreFor}</i>–<i>{cur.scoreAgainst}</i></b></div>
    <p className="cad-verdict" data-result={cur.result}>{word}{cur.penalties?` · ${copy.pens.replace('{a}',String(cur.penalties.for)).replace('{b}',String(cur.penalties.against))}`:''}</p>
    {tags.length>0&&<ul className="cad-tags">{tags.map(t=><li key={t}>{t}</li>)}</ul>}
    {cur.scorers.some(g=>g.forClub)&&<p className="cad-note">{copy.scorers}: {cur.scorers.filter(g=>g.forClub).map(g=>`${g.name}${g.minute!=null?` ${g.minute}'`:''}${g.penalty?' (p)':''}${g.ownGoal?' (og)':''}`).join(', ')}</p>}
    {cur.attendance!=null&&<p className="cad-note">{copy.attendance}: {num(cur.attendance)}</p>}
    <button type="button" className="cad-been min-h-tap" aria-pressed={ledger[visitKey(cur)]?.b===true} onClick={()=>toggle(visitKey(cur))}>{ledger[visitKey(cur)]?.b?copy.beenOn:copy.been}</button>
   </div>}
   {index>=total&&<div className="cad-card cad-intro"><small>{copy.end}</small><h2>{copy.endLine.replace('{k}',num(totalKm(data))).replace('{c}',String(new Set(trip.map(v=>st[v.venueId]!.countryCode)).size)).replace('{n}',String(total))}</h2><p>{copy.totalKm.replace('{w}',String(trip.filter(v=>v.result==='W').length))}</p></div>}
  </div>
  <div className="cad-dots" aria-hidden="true">{trip.map((v,i)=><i key={v.id} data-r={v.result} data-on={i===index||undefined} data-done={i<index||undefined}/>)}</div>
 </div>
}

/** AWAY DAYS: the journey first, the explorer one tap away. */
export function ClubAwayDays({data,locale,copy}:{data:ClubAwayData;locale:'en'|'he';copy:Copy}) {
 const [mode,setMode]=useState<'journey'|'explore'>('journey')
 return <>
  <div role="tablist" aria-label={copy.title} className="cad-modes">
   {(['journey','explore'] as const).map(m=><button key={m} role="tab" type="button" aria-selected={mode===m} className="cad-chip min-h-tap" aria-pressed={mode===m} onClick={()=>setMode(m)}>{m==='journey'?copy.modeJourney:copy.modeExplore}</button>)}
  </div>
  {mode==='journey'?<Journey data={data} locale={locale} copy={copy}/>:<Explore data={data} locale={locale} copy={copy}/>}
 </>
}
