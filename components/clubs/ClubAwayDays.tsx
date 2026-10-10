'use client'
import dynamic from 'next/dynamic'
import {useMemo,useState} from 'react'
import {useBeen} from '@/components/away-days/useBeen'
import type {Camera,MapMarker} from '@/components/away-days/AwayDaysMap'
import type {VenueLite} from '@/lib/away-days/journey'
import {bySeason,countryName,totalKm,visitKey,type ClubAwayData,type ClubStadium,type ClubVisit} from '@/lib/away-days/club'

const Map=dynamic(()=>import('@/components/away-days/AwayDaysMap'),{ssr:false,loading:()=><div className="cad-map-load" role="status"/>})
type Copy={kicker:string;title:string;lede:string;back:string;matches:string;abroad:string;grounds:string;countries:string;km:string;all:string;onlyAbroad:string;home:string;away:string;neutral:string;domestic:string;been:string;beenOn:string;attendance:string;leg:string;pens:string;selected:string;clear:string;mapLabel:string;youVisited:string;scorers:string;source:string}
const lite=(s:ClubStadium,locale:'en'|'he'):VenueLite=>({id:s.id,nameHe:s.name,nameLatin:s.name,cityHe:s.city??'',cityLatin:s.city,countryHe:countryName(s.countryCode,locale),countryCode:s.countryCode,lat:s.lat,lng:s.lng})

/** AWAY DAYS for one club — the globe, the grounds it has played on in Europe, and every tie by season. */
export function ClubAwayDays({data,locale,copy}:{data:ClubAwayData;locale:'en'|'he';copy:Copy}) {
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
