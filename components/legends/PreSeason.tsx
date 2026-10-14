'use client'
import {useEffect,useState} from 'react'
import type {CareerView} from '@/lib/legends/view'
import {useReducedMotion} from '@/components/clubs/rumble/shared'
import {Stars} from './Brand'
import {posName} from './LegendCard'
import {Sheet} from './Sheet'

type Send=(a:Record<string,unknown>,ok?:string)=>void

/**
 * Pre-season (owner, 14.10.2026): after the eleven is registered the squad goes to the training ground — a short drawn scene,
 * then the report, then the first chance to put men on the transfer list — and only then do the season tickets go on sale.
 * The report is flavour from the career id (nobody's rating changes); the list choice is real.
 */
const DRILLS=['Fitness circuits','Set pieces','Passing patterns','Pressing drills','Finishing','Shape and shift','Crossing and heading','Goalkeeper work']
const NOTES=['sharp','full of running','quiet and busy','the voice of the group','a doubt in the legs','looks ready','asked for extra work','laughing again']
const hash=(s:string)=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}

export function CampSheet({v,busy,send}:{v:CareerView;busy:boolean;send:Send}){
 const reduced=useReducedMotion(),[step,setStep]=useState<0|1|2>(reduced?1:0)
 useEffect(()=>{if(step!==0)return;const t=window.setTimeout(()=>setStep(1),4200);return()=>window.clearTimeout(t)},[step])
 const men=[...v.squad].sort((a,b)=>hash(`${v.id}:camp:${a.id}`)-hash(`${v.id}:camp:${b.id}`)).slice(0,4)
 return <Sheet id="lgm-camp" tone="night" locked wide kicker="Pre-season" title={step===0?'The training camp':step===1?'Camp report':'Who is for sale?'}>
  {step===0?<div className="lgm-camp" data-testid="legends-camp"><div className="lgm-camp-pitch" aria-hidden="true"><i className="c1"/><i className="c2"/><i className="c3"/><i className="ball"/><b className="m1"/><b className="m2"/><b className="m3"/></div>
    <p className="lgm-fine" aria-live="polite">Cones out, balls down. {v.clubName} start the work before the first whistle.</p>
    <p className="lgm-actions"><button type="button" className="lgm-ghost min-h-tap" onClick={()=>setStep(1)}>Skip</button></p></div>
  :step===1?<div className="lgm-camp-report" data-testid="legends-camp-report">
    <p className="lgm-fine">A good week. Nobody was hurt, and nobody’s rating moved — this is the manager’s notebook.</p>
    <ul>{men.map(m=><li key={m.id}><span className="lgm-pos" data-pos={m.pos}>{m.pos}</span><span><b>{m.name}</b><small>{DRILLS[hash(`${v.id}:d:${m.id}`)%DRILLS.length]} — {NOTES[hash(`${v.id}:n:${m.id}`)%NOTES.length]}</small></span></li>)}</ul>
    <p className="lgm-actions"><button type="button" className="lgm-go min-h-tap" onClick={()=>setStep(2)}>Next · the transfer list</button></p></div>
  :<div className="lgm-camp-list" data-testid="legends-camp-list">
    <p className="lgm-fine">Tap a man you would sell. Bids come when a window opens; you can change this any time from his page.</p>
    <ul>{v.squad.map(m=><li key={m.id}><span className="lgm-pos" data-pos={m.pos}>{m.pos}</span><span><b>{m.name}</b><small>{posName(m.pos)}</small></span><Stars value={m.stars} size="sm"/>
     <button type="button" className="lgm-ghost min-h-tap" aria-pressed={m.listed} disabled={busy} onClick={()=>send({kind:'list',card:m.id,listed:!m.listed})}>{m.listed?'Listed ✓':'List'}</button></li>)}</ul>
    <p className="lgm-actions"><button type="button" className="lgm-go lgm-go-big min-h-tap" disabled={busy} onClick={()=>send({kind:'ack'})} data-testid="legends-camp-done">On to the season tickets</button></p></div>}
 </Sheet>
}

/** a newspaper question; the answer's effect is hidden, only its reaction is shown afterwards */
export function PressSheet({v,busy,send}:{v:CareerView;busy:boolean;send:Send}){
 const p=v.press,[picked,setPicked]=useState(false),[note,setNote]=useState<string|null>(null)
 useEffect(()=>{if(picked&&!p){setNote(v.pressLast??'The reporters scribble and leave.');setPicked(false)}},[picked,p,v.pressLast])
 if(note)return <Sheet id="lgm-press-note" tone="paper" kicker="The press" title="Overheard" onClose={()=>setNote(null)}><p data-testid="legends-press-note">{note}</p><p className="lgm-actions"><button type="button" className="lgm-go min-h-tap" onClick={()=>setNote(null)}>Back to the club</button></p></Sheet>
 if(!p)return null
 const pick=(i:number)=>{setPicked(true);send({kind:'press',fixture:p.fixture,q:p.qid,answer:i})}
 return <Sheet id="lgm-press" tone="paper" kicker={p.paper} title="A reporter asks…" onClose={()=>pick(4)}>
  <div className="lgm-press" data-testid="legends-press"><blockquote>{p.head}</blockquote>
   <ol>{p.answers.map((l,i)=><li key={i}><button type="button" className="lgm-ghost min-h-tap" disabled={busy} onClick={()=>pick(i)}>{l}</button></li>)}</ol>
   <p className="lgm-actions"><button type="button" className="lgm-link min-h-tap" disabled={busy} onClick={()=>pick(4)}>No comment</button></p></div>
 </Sheet>
}
