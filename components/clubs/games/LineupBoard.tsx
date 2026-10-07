'use client'
import {useState,useTransition} from 'react'
import {recordActivity} from '@/lib/clubs/activity'
import {gradeLineup} from '@/app/clubs/[slug]/[gate]/gate-actions'
import {gameCopy} from '@/lib/clubs/game-copy'
import type {UiLocale} from '@/lib/clubs/locale'
type Item={id:string;title:string;competition:string;on:string|null;pool:string[]}
export function LineupBoard({items,club,version,locale}:{items:Item[];club:string;version:string;locale:UiLocale}) {
 const copy=gameCopy(locale),[n,setN]=useState(0),[picks,setPicks]=useState<string[]>([]),[res,setRes]=useState<Awaited<ReturnType<typeof gradeLineup>>>(null),[err,setErr]=useState(false),[pending,start]=useTransition()
 const m=items[n%items.length]!
 const toggle=(p:string)=>{if(res)return;setPicks(x=>x.includes(p)?x.filter(y=>y!==p):x.length<11?[...x,p]:x)}
 const check=()=>start(async()=>{const r=await gradeLineup(club,version,m.id,picks);setErr(!r);setRes(r);if(r)recordActivity(club,'lineup',`lineup:${version}:${n}:${m.id}`,r.correct)})
 const next=()=>{setN(n+1);setPicks([]);setRes(null);setErr(false)}
 return <section className="game-panel mag-card" data-testid="lineup-board">
  <p className="mag-kicker">{copy.lineupSub}</p>
  <h2 className="mag-h2" style={{fontSize:24,marginBlock:'8px'}}><bdi>{m.title}</bdi></h2>
  <p className="mag-fine"><bdi>{m.competition}</bdi>{m.on?<> · <bdi>{m.on}</bdi></>:null}</p>
  <p className="mag-mono" aria-live="polite">{copy.lineupCount}: {picks.length}/11</p>
  <div className="mag-chips" role="group" aria-label={copy.lineupSub}>{m.pool.map(p=>{const on=picks.includes(p),bad=res?.wrong.includes(p),miss=res?.missed.includes(p);return <button key={p} type="button" className="mag-chip min-h-tap" aria-pressed={on} data-state={bad?'wrong':miss?'missed':on?'on':''} onClick={()=>toggle(p)} style={on?{background:'var(--mag-ink)',color:'var(--mag-paper)'}:miss?{outline:'3px dashed var(--mag-vermilion)'}:undefined}><bdi>{p}</bdi></button>})}</div>
  {err&&<p role="alert">{copy.unavailable}</p>}
  {!res?<button className="mag-cta min-h-tap" type="button" disabled={picks.length!==11||pending} onClick={check}>{copy.lineupCheck}<span>→</span></button>
   :<div aria-live="polite"><p className="mag-bowl" style={{fontSize:28}}>{copy.lineupScore}: {res.correct}/11</p>{res.missed.length>0&&<p>{copy.lineupMiss}: <bdi>{res.missed.join(' · ')}</bdi></p>}<button className="mag-cta red min-h-tap" type="button" onClick={next}>{copy.lineupAgain}<span>→</span></button></div>}
 </section>
}
