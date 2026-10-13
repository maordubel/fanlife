'use client'
import {useEffect,useRef,useState} from 'react'
import type {CareerView} from '@/lib/legends/view'
import type {RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {Stars} from './Brand'
import {money,posName,years} from './LegendCard'
import {ClubMark,LegendShirt,type Marks} from './Kit'
import {TeamSheet} from './TeamSheet'
import {Portal} from './Sheet'

/**
 * "Meet your squad" (owner, 13.10.2026): after the board's news and before round 1, the drafted men walk out one line at a
 * time — goalkeepers, defenders, midfielders, forwards — each in the shirt of his own years. Then the manager registers his
 * fixed eleven, the bench and both armbands, and confirms. The server marks it done (`meet`), so it shows once.
 */
type Send=(a:Record<string,unknown>,ok?:string)=>void
const LINES=['GK','DF','MF','FW'] as const

export function MeetSquad({v,busy,send,wardrobe,marks}:{v:CareerView;busy:boolean;send:Send;wardrobe:RumbleWardrobe;marks?:Marks}){
 const [step,setStep]=useState<1|2>(1),top=useRef<HTMLDivElement>(null)
 useEffect(()=>{top.current?.scrollIntoView({block:'start'})},[step])
 let n=0
 return <div className="lgt-meet" ref={top}>
  <header className="lgt-meet-head">
   <ClubMark club={v.clubId} v={v} size={52}/>
   <div><p className="lgm-kicker">Before round 1 · {v.clubName}</p><h2>{step===1?'Meet your squad':'Register your eleven'}</h2></div>
   <ol className="lgt-steps" aria-label="Squad registration"><li aria-current={step===1?'step':undefined}>1 · The men</li><li aria-current={step===2?'step':undefined}>2 · The eleven</li></ol>
  </header>
  {step===1?<>
   <p className="lgt-meet-lede">{v.squad.length} men, every one of them a {v.clubName} man. GK {v.quotas.GK} · DF {v.quotas.DF} · MF {v.quotas.MF} · FW {v.quotas.FW}.</p>
   {LINES.map(p=>{const men=v.squad.filter(s=>s.pos===p);if(!men.length)return null
    return <section key={p} className="lgt-meet-line" aria-labelledby={`lgt-line-${p}`}>
     <h3 id={`lgt-line-${p}`}><span className="lgm-pos" data-pos={p}>{p}</span>{posName(p)}s · {men.length}</h3>
     <ul>{men.map(m=><li key={m.id} className="lgt-mcard" data-pos={p} style={{animationDelay:`${(n++)*70}ms`}}>
      <span className="lgt-mcard-shirt"><LegendShirt man={m} club={v.clubId} wardrobe={wardrobe} marks={marks}/></span>
      <b className="lgt-mcard-name">{m.name}</b>
      <span className="lgt-mcard-meta">{years(m)}</span>
      <span className="lgt-mcard-rate"><Stars value={m.stars} size="sm"/><small>{money(m.paid)}</small></span>
     </li>)}</ul>
    </section>})}
   <Portal><div className="lgt-savebar lgt-savebar-register" role="region" aria-label="Next">
    <span>{v.squad.length} men</span>
    <button type="button" className="lgm-go min-h-tap" onClick={()=>setStep(2)} data-testid="legends-meet-next">Pick the eleven →</button>
   </div></Portal>
  </>:<>
   <p className="lgt-meet-lede">Your eleven for round 1 stays until you change it. The captain wears the armband when he starts; when he does not, the vice-captain does.</p>
   <TeamSheet v={v} busy={busy} send={send} wardrobe={wardrobe} marks={marks} register/>
   <p className="lgm-actions"><button type="button" className="lgm-link min-h-tap" onClick={()=>setStep(1)}>← Back to the men</button></p>
  </>}
 </div>
}
