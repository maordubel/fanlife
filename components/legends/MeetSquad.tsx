'use client'
import {useState} from 'react'
import type {CareerView,SquadView} from '@/lib/legends/view'
import {Stars} from './Brand'
import {LegendCard,money,posName,years} from './LegendCard'
import {ClubMark,LegendShirt} from './Shirts'
import {Sheet} from './Sheet'
import {TeamSheet,surname} from './TeamSheet'

/**
 * Meet your squad (owner, 13.10.2026) — the page between the board's news and the first matchday. The server holds the step
 * (`cutscene: 'meet-squad'`), so a reload lands here again until the eleven is confirmed. Two steps on one page, never a slide:
 *  1 · the men, line by line — their shirt of their era, their stars, their years
 *  2 · the eleven: formation, the fixed starting eleven, the captain and his vice. Confirm sends ONE `lineup` action with `meet`.
 */
type Send=(a:Record<string,unknown>,ok?:string)=>void
const LINES=['GK','DF','MF','FW'] as const

export function MeetSquad({v,busy,send}:{v:CareerView;busy:boolean;send:Send}){
 const [step,setStep]=useState<1|2>(1),[card,setCard]=useState<SquadView|null>(null)
 const spent=v.squad.reduce((a,s)=>a+s.paid,0),avg=v.squad.reduce((a,s)=>a+s.stars,0)/Math.max(1,v.squad.length)
 return <div className="tl-meet">
  <header className="tl-meet-head">
   <ClubMark club={v.clubId} name={v.clubName} size={64}/>
   <div><p className="lgm-kicker">Registration · season {v.season}</p><h2>Meet your squad</h2><p className="tl-meet-sub">{v.squad.length} men of {v.clubName}, signed for {money(spent)}. Get to know them, then name the eleven who start round 1.</p></div>
   <dl className="tl-meet-facts"><div><dt>Squad</dt><dd>{v.squad.length}</dd></div><div><dt>Average</dt><dd><Stars value={Math.round(avg*4)/4} size="sm"/></dd></div><div><dt>Budget</dt><dd>{money(v.cash)}</dd></div></dl>
  </header>
  <nav className="tl-steps" aria-label="Registration">
   <button type="button" className="min-h-tap" aria-current={step===1?'step':undefined} onClick={()=>setStep(1)}><i>1</i>The men</button>
   <button type="button" className="min-h-tap" aria-current={step===2?'step':undefined} onClick={()=>setStep(2)} data-testid="legends-meet-eleven"><i>2</i>The eleven</button>
  </nav>
  {step===1?<>
   {LINES.map(p=>{const men=v.squad.filter(s=>s.pos===p);return men.length?<section key={p} className="tl-line" aria-labelledby={`tl-line-${p}`}>
    <h3 id={`tl-line-${p}`}><span className="lgm-pos" data-pos={p}>{p}</span>{posName(p)}s <small>{men.length}</small></h3>
    <ul className="tl-mates">{men.map(m=><li key={m.id}><button type="button" className="tl-mate min-h-tap" onClick={()=>setCard(m)} aria-label={`${m.name}, ${posName(m.pos)}, ${years(m)} — his card`}>
     <LegendShirt man={m} className="tl-mate-shirt"/>
     <span className="tl-mate-id"><b>{m.name}</b><small>{years(m)}{m.alt?.length?` · also ${m.alt.join(', ')}`:''}</small></span>
     <span className="tl-mate-rate"><Stars value={m.stars} size="sm"/><small>{money(m.paid)}</small></span>
     {v.lineup.captain===m.id?<i className="tl-arm" data-arm="c" aria-hidden="true">C</i>:v.lineup.vice===m.id?<i className="tl-arm" data-arm="v" aria-hidden="true">V</i>:null}
    </button></li>)}</ul>
   </section>:null})}
   <p className="tl-meet-next"><button type="button" className="lgm-go lgm-go-big min-h-tap" onClick={()=>{setStep(2);window.scrollTo({top:0})}}>Set the eleven →</button></p>
  </>:<TeamSheet v={v} busy={busy} send={send} mode="meet"/>}
  {card?<Sheet id="tl-meet-card" kicker={posName(card.pos)} title={card.name} onClose={()=>setCard(null)}>
   <LegendCard c={card} shirt><p className="lgm-fine">Signed in the draft for {money(card.paid)}.{v.lineup.xi.includes(card.id)?` In the best fit eleven${v.lineup.captain===card.id?' · captain':''}.`:''}</p></LegendCard>
   <p className="lgm-fine">You choose the armbands in step 2 — tap {surname(card.name)} there.</p>
  </Sheet>:null}
 </div>
}
