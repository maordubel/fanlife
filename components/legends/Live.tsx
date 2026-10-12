'use client'
import {useEffect,useMemo,useState} from 'react'
import type {CareerView,ResultView} from '@/lib/legends/view'
import type {Tactics} from '@/lib/legends/types'
import {Theatre,type TheatreSound} from '@/components/highlights/Theatre'
import {useRumbleSound} from '@/components/clubs/rumble/shared'
import {KitChip,Portal} from './Sheet'

/**
 * The match, LIVE (owner, 12.10.2026: "a live experience — you don't know the result; changes at half-time, on 60′ and 75′").
 * The server plays to the next stop and hands back the moments so far; this screen shows only the part since the last stop,
 * then the touchline: three changes in all, the approach, the press and the tempo. The final whistle comes when the server
 * says so — the score on the screen is never ahead of the pictures.
 */
type Send=(a:Record<string,unknown>,ok?:string)=>void
export type Watch={id:string;from:number}
const APPROACH=[['defensive','Defensive'],['balanced','Balanced'],['attacking','Attacking']] as const
const PRESS=[['low','Sit off'],['medium','Press'],['high','High press']] as const
const TEMPO=[['slow','Patient'],['normal','Normal'],['fast','Fast']] as const
const surname=(n:string)=>{const p=n.trim().split(/\s+/);return p.length>1?p[p.length-1]!:n}

export function LiveMatch({v,busy,send,watch,setWatch}:{v:CareerView;busy:boolean;send:Send;watch:Watch;setWatch:(w:Watch|null)=>void}){
 const snd=useRumbleSound(),L=v.live
 const sound:TheatreSound=n=>snd.play(n==='whistle'?'kickoff':n==='save'?'roar':n,n==='save'?.35:.6)
 const final=!L&&v.last?.id===watch.id?v.last:null
 const [stage,setStage]=useState<'watch'|'break'|'ft'>('watch')
 // a new stop, or the final part, starts a new spell of watching
 useEffect(()=>{setStage('watch')},[L?.minute,final?.id])
 const segment=L?{from:L.prevStop,to:L.minute,outro:false}:{from:watch.from,to:999,outro:true}
 const reel=L?.reel??final?.reel
 const colours=v.colours??{}
 return <Portal><div className="lgm-live z-[60]" role="dialog" aria-modal="true" aria-labelledby="lgm-live-h" data-testid="legends-live">
  <div className="lgm-live-card">
   <header className="lgm-live-head">
    <p className="lgm-kicker"><span className="lgm-onair" aria-hidden="true"/>{L?'Live':'Full time'} · round {v.played+(L?1:0)}</p>
    <h2 id="lgm-live-h" className="sr-only">{L?`${L.home} v ${L.away}, live`:'Full time'}</h2>
    <button type="button" className="lgm-x min-h-tap" onClick={()=>setWatch(null)} aria-label={L?'Leave the match for now':'Close'}>×</button>
   </header>
   {stage!=='ft'&&reel?<Theatre key={`${watch.id}:${segment.from}:${segment.to}`} reel={reel} segment={segment} sound={sound} autoStart onDone={()=>setStage(L?'break':'ft')}/>
    :stage!=='ft'&&L?<FallbackLog L={L} onDone={()=>setStage('break')}/>:null}
   {stage==='break'&&L?<Touchline key={L.minute} L={L} busy={busy} onPlay={d=>{setWatch({...watch,from:L.minute});send({kind:'match-decide',decision:d})}} onFinish={()=>{setWatch({...watch,from:L.minute});send({kind:'match-finish'})}}/>:null}
   {stage==='ft'&&final?<FullTime v={v} r={final} colours={colours} onClose={()=>setWatch(null)}/>:null}
   {stage==='ft'&&!final?<p className="lgm-fine">The result is in.</p>:null}
   <p className="lgm-live-foot"><button type="button" className="lgm-link min-h-tap" onClick={snd.toggle} aria-pressed={!snd.on}>{snd.on?'Sound on':'Sound off'}</button></p>
  </div>
 </div></Portal>
}

function FallbackLog({L,onDone}:{L:NonNullable<CareerView['live']>;onDone:()=>void}){
 useEffect(()=>{const id=window.setTimeout(onDone,1200);return()=>window.clearTimeout(id)},[onDone])
 return <ol className="lgm-log">{L.log.filter(l=>l.minute>L.prevStop&&l.kind!=='kickoff').map((l,i)=><li key={i} data-kind={l.kind} data-mine={l.mine||undefined}><b>{l.minute}′</b> {l.text}</li>)}</ol>
}

/** the touchline at a stop: tap a man on the pitch, then a man on the bench — a change; tap a chip — the plan */
function Touchline({L,busy,onPlay,onFinish}:{L:NonNullable<CareerView['live']>;busy:boolean;onPlay:(d:{tactics:Tactics;subs?:{out:string;in:string}[]})=>void;onFinish:()=>void}){
 const [t,setT]=useState<Tactics>(L.tactics),[subs,setSubs]=useState<{out:string;in:string}[]>([]),[out,setOut]=useState<string|null>(null)
 const used=new Set(subs.flatMap(s=>[s.out,s.in])),left=L.subsLeft-subs.length
 const dirty=subs.length>0||JSON.stringify(t)!==JSON.stringify(L.tactics)
 const name=(id:string)=>L.pitch.find(p=>p.id===id)?.name??L.bench.find(b=>b.id===id)?.name??'—'
 const title=L.minute===45?'Half-time':`${L.minute}′ · the touchline`
 const last=L.stopsLeft<=1
 const lines=useMemo(()=>['GK','DF','MF','FW'].map(p=>({p,men:L.pitch.filter(m=>m.slot===p)})).filter(x=>x.men.length),[L.pitch])
 useEffect(()=>{document.getElementById('lgm-break-h')?.scrollIntoView({block:'start',behavior:'smooth'})},[])
 return <section className="lgm-break" aria-labelledby="lgm-break-h">
  <header className="lgm-break-head"><h3 id="lgm-break-h">{title}</h3><p className="lgm-break-score"><span>{L.home}</span><b>{L.goals[0]} – {L.goals[1]}</b><span>{L.away}</span></p></header>
  <div className="lgm-break-grid">
   <div>
    <p className="lgm-break-step">{left<=0?'Three changes made.':out?`${surname(name(out))} off — who comes on?`:`Changes · ${left} left — tap a man to take off`}</p>
    <div className="lgm-break-pitch" role="group" aria-label="On the pitch">{lines.map(l=><div key={l.p} className="lgm-break-line"><span>{l.p}</span>{l.men.map(m=><button key={m.id} type="button" className="min-h-tap" aria-pressed={out===m.id} disabled={used.has(m.id)||left<=0} onClick={()=>setOut(out===m.id?null:m.id)}>{surname(m.name)}</button>)}</div>)}</div>
    {out?<div className="lgm-break-bench" role="group" aria-label="The bench">{L.bench.filter(b=>!used.has(b.id)).map(b=><button key={b.id} type="button" className="min-h-tap" onClick={()=>{setSubs([...subs,{out,in:b.id}]);setOut(null)}}><small>{b.pos}</small> {b.name}</button>)}{!L.bench.some(b=>!used.has(b.id))?<p className="lgm-fine">Nobody left on the bench.</p>:null}</div>:null}
    {subs.length?<ul className="lgm-break-subs">{subs.map(s=><li key={s.out}><b>↑ {surname(name(s.in))}</b> <span>↓ {surname(name(s.out))}</span><button type="button" className="lgm-link min-h-tap" onClick={()=>setSubs(subs.filter(x=>x!==s))}>undo</button></li>)}</ul>:null}
   </div>
   <div className="lgm-break-plan">
    {([['Approach',APPROACH,'approach'],['Pressing',PRESS,'pressing'],['Tempo',TEMPO,'tempo']] as const).map(([label,opts,k])=><div key={k} className="lgm-seg" role="radiogroup" aria-label={label}><span>{label}</span>{opts.map(([val,l])=><button key={val} type="button" role="radio" aria-checked={t[k]===val} className="min-h-tap" onClick={()=>setT({...t,[k]:val} as Tactics)}>{l}</button>)}</div>)}
   </div>
  </div>
  <p className="lgm-break-go">
   <button type="button" className="lgm-go lgm-go-big min-h-tap" disabled={busy} onClick={()=>onPlay({tactics:t,...(subs.length?{subs}:{})})} data-testid="legends-play-on">{busy?'…':dirty?`${subs.length?`${subs.length} change${subs.length===1?'':'s'} · `:''}play on`:last?'Play on to the whistle':'Play on'}</button>
   {!last?<button type="button" className="lgm-ghost min-h-tap" disabled={busy||dirty} onClick={onFinish}>No more changes · to the whistle</button>:null}
  </p>
 </section>
}

function FullTime({v,r,colours,onClose}:{v:CareerView;r:ResultView;colours:NonNullable<CareerView['colours']>;onClose:()=>void}){
 const others=v.results.filter(x=>x.round===r.round&&x.id!==r.id),place=v.table.findIndex(x=>x.mine)+1
 const goals=r.log.filter(l=>l.kind==='goal'),home=v.table.find(x=>x.name===r.home)?.club,away=v.table.find(x=>x.name===r.away)?.club
 return <section className="lgm-ft" aria-label="Full time">
  <p className="lgm-ft-score"><span><KitChip c={home?colours[home]:undefined} size={28}/>{r.home}</span><b>{r.goals[0]} – {r.goals[1]}</b><span>{r.away}<KitChip c={away?colours[away]:undefined} size={28}/></span></p>
  {r.pens?<p className="lgm-fine">{r.pens[0]}–{r.pens[1]} on penalties</p>:null}
  {goals.length?<ol className="lgm-ft-goals">{goals.map((g,i)=><li key={i} data-side={g.side??undefined} data-mine={g.mine||undefined}><b>{g.minute}′</b> {g.text.replace(/^Goal — /,'')}</li>)}</ol>:null}
  {others.length?<div className="lgm-ft-others"><p className="lgm-kicker">Round {r.round} · elsewhere</p><ul>{others.map(o=><li key={o.id}><span>{o.home}</span><b>{o.goals[0]}–{o.goals[1]}</b><span>{o.away}</span></li>)}</ul></div>:null}
  {place&&v.phase!=='season-end'?<p className="lgm-ft-place">{v.clubName} are <b>{place}{place===1?'st':place===2?'nd':place===3?'rd':'th'}</b> of {v.table.length}.</p>:null}
  <p className="lgm-actions"><button type="button" className="lgm-go min-h-tap" onClick={onClose} data-testid="legends-ft-continue">Continue</button></p>
 </section>
}
