'use client'
import {useEffect,useState} from 'react'
import copyAll from '@/messages/en.shop.json'
import {PersonalPrint} from './PersonalPrint'

const copy=copyAll.souvenir.first
type M={id:string;on:string;name:string;comp:string|null}
/**
 * "MY FIRST MATCH" (owner, 15.11.2026): the supporter finds the day in the club's own record — a year, then the match — and frames
 * it as a ticket stub with his age, his gate and his line. Shown only while the shop's personal prints are open.
 */
export function FirstMatchPrint({club}:{club:string}){
 const [on,setOn]=useState(false),[years,setYears]=useState<number[]>([]),[year,setYear]=useState(''),[list,setList]=useState<M[]|null>(null),[match,setMatch]=useState('')
 useEffect(()=>{fetch('/api/shop/personal').then(r=>r.json()).then(j=>setOn(!!j.open)).catch(()=>{})},[])
 useEffect(()=>{if(!on)return;fetch(`/api/shop/personal/souvenir?club=${encodeURIComponent(club)}`).then(r=>r.json()).then(j=>setYears(j.years||[])).catch(()=>{})},[on,club])
 useEffect(()=>{setList(null);setMatch('');if(!year)return;fetch(`/api/shop/personal/souvenir?club=${encodeURIComponent(club)}&year=${year}`).then(r=>r.json()).then(j=>setList(j.matches||[])).catch(()=>setList([]))},[club,year])
 if(!on||!years.length)return null
 return <section className="wk-panel shadow fmp" aria-labelledby="fmp-h">
  <h2 id="fmp-h" className="wk-head red">{copy.pick}</h2>
  <p className="fmp-sub">{copy.choose}</p>
  <div className="fmp-row">
   <label className="fmp-f"><span className="wk-k">{copy.year}</span><select className="min-h-tap" value={year} onChange={e=>setYear(e.target.value)}><option value="">—</option>{years.map(y=><option key={y} value={y}>{y}</option>)}</select></label>
   <label className="fmp-f fmp-wide"><span className="wk-k">{copy.match}</span><select className="min-h-tap" value={match} disabled={!list?.length} onChange={e=>setMatch(e.target.value)}><option value="">—</option>{(list||[]).map(m=><option key={m.id} value={m.id}>{m.on.split('-').reverse().join('.')} · {m.name}</option>)}</select></label>
  </div>
  {list&&!list.length?<p className="fmp-sub">{copy.none}</p>:null}
  {match?<PersonalPrint kind="first" req={{club,match}} className="wk-btn fmp-go"/>:null}
 </section>
}
