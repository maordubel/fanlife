'use client'
import {useEffect,useMemo,useState} from 'react'
import type {CareerView,SquadView} from '@/lib/legends/view'
import type {Tactics} from '@/lib/legends/types'
import {Stars} from './Brand'
import {LegendCard,money,posName} from './LegendCard'
import {Portal,Sheet} from './Sheet'

/**
 * The team sheet, click by click (owner, 12.10.2026): tap a shirt on the pitch and the men who could wear it rise in a sheet —
 * natural men first, then by stars; one more tap puts him there. The armband is one tap in the same sheet. Nothing is
 * scrolled for: the pitch is the page, the squad list is a drawer.
 */
type Send=(a:Record<string,unknown>,ok?:string)=>void
const FORMATIONS=['4-3-3','4-4-2','3-5-2'] as const
const APPROACH=[['defensive','Defensive'],['balanced','Balanced'],['attacking','Attacking']] as const
const PRESS=[['low','Sit off'],['medium','Press'],['high','High press']] as const
const TEMPO=[['slow','Patient'],['normal','Normal'],['fast','Fast']] as const
const surname=(n:string)=>{const p=n.trim().split(/\s+/);return p.length>1?p[p.length-1]!:n}
type Man={id:string;name:string;pos:string;stars:number;fit:boolean;note:string}

export function TeamSheet({v,busy,send}:{v:CareerView;busy:boolean;send:Send}){
 const [xi,setXi]=useState(v.lineup.xi),[bench,setBench]=useState(v.lineup.bench),[t,setT]=useState(v.lineup.tactics),[cap,setCap]=useState(v.lineup.captain)
 const [pick,setPick]=useState<{kind:'xi';i:number}|{kind:'bench';i:number}|null>(null),[card,setCard]=useState<SquadView|null>(null),[drawer,setDrawer]=useState(false)
 useEffect(()=>{setXi(v.lineup.xi);setBench(v.lineup.bench);setT(v.lineup.tactics);setCap(v.lineup.captain)},[v.revision,v.lineup])
 const men=useMemo(()=>{const m=new Map<string,Man>();for(const s of v.squad)m.set(s.id,{id:s.id,name:s.name,pos:s.pos,stars:s.stars,fit:s.fit,note:s.injury?`Injured · ${s.injury}`:s.suspension?`Banned · ${s.suspension}`:''})
  for(const e of v.emergency)m.set(e.id,{id:e.id,name:e.name,pos:e.pos,stars:0,fit:true,note:'Emergency cover'});return m},[v.squad,v.emergency])
 const dirty=JSON.stringify([xi,bench,t,cap])!==JSON.stringify([v.lineup.xi,v.lineup.bench,v.lineup.tactics,v.lineup.captain])
 const slots=v.lineup.slots,captain=cap&&xi.includes(cap)?cap:null
 const putXi=(i:number,id:string)=>{const next=[...xi],was=next.indexOf(id);if(was>=0)next[was]=next[i]!;else{const b=bench.indexOf(id);if(b>=0){const nb=[...bench];nb[b]=next[i]!;setBench(nb.filter(Boolean))}}next[i]=id;setXi(next);setPick(null)}
 const putBench=(i:number,id:string|null)=>{const nb=[...bench];if(id===null)nb.splice(i,1);else{const was=nb.indexOf(id);if(was>=0)nb.splice(was,1);nb.splice(Math.min(i,nb.length),0,id)}setBench(nb.slice(0,7));setPick(null)}
 const cands=(family:string|null)=>[...men.values()].filter(m=>m.fit).sort((a,b)=>Number(b.pos===family)-Number(a.pos===family)||b.stars-a.stars||a.name.localeCompare(b.name))
 const slot=pick?.kind==='xi'?slots[pick.i]:null,occupant=pick?.kind==='xi'?xi[pick.i]:pick?.kind==='bench'?bench[pick.i]:undefined
 return <div className="lgm-team">
  <section className="lgm-panel lgm-team-pitch" aria-labelledby="lgm-team-h">
   <header className="lgm-team-top"><p className="lgm-kicker" id="lgm-team-h">The team sheet</p>
    <div className="lgm-seg" role="radiogroup" aria-label="Formation">{FORMATIONS.map(x=><button key={x} type="button" role="radio" aria-checked={v.lineup.formation===x} className="min-h-tap" disabled={busy} onClick={()=>send({kind:'auto',formation:x},`${x} — the best fit eleven.`)}>{x}</button>)}</div>
   </header>
   <div className="lgm-pitch" role="group" aria-label={`${v.lineup.formation} — tap a position`}>
    {slots.map((s,i)=>{const m=men.get(xi[i]??''),off=m&&m.pos!==s.family
     return <button key={s.id} type="button" className="lgm-spot min-h-tap" style={{insetInlineStart:`${s.x}%`,insetBlockStart:`${s.y}%`}} data-off={off||undefined} onClick={()=>setPick({kind:'xi',i})} aria-label={`${s.fine}: ${m?m.name:'empty'}${captain===m?.id?', captain':''}`}>
      {captain&&captain===m?.id?<i className="lgm-armband" aria-hidden="true">C</i>:null}<small>{s.fine}</small><b>{m?surname(m.name):'—'}</b>{m&&m.stars?<Stars value={m.stars} size="sm"/>:null}</button>})}
   </div>
   <div className="lgm-benchrow" role="group" aria-label="The bench"><span>Bench</span>{Array.from({length:7},(_,i)=>{const m=men.get(bench[i]??'');return <button key={i} type="button" className="min-h-tap" data-empty={!m||undefined} onClick={()=>setPick({kind:'bench',i:m?i:bench.length})}>{m?<><small>{m.pos}</small>{surname(m.name)}</>:'+'}</button>})}</div>
   {v.lineup.error?<p className="lgm-error" role="alert">{v.lineup.error}</p>:null}
  </section>
  <section className="lgm-panel lgm-team-plan" aria-label="The plan">
   {([['Approach',APPROACH,'approach'],['Pressing',PRESS,'pressing'],['Tempo',TEMPO,'tempo']] as const).map(([label,opts,k])=><div key={k} className="lgm-seg" role="radiogroup" aria-label={label}><span>{label}</span>{opts.map(([val,l])=><button key={val} type="button" role="radio" aria-checked={t[k]===val} className="min-h-tap" onClick={()=>setT({...t,[k]:val} as Tactics)}>{l}</button>)}</div>)}
   <p className="lgm-actions"><button type="button" className="lgm-ghost min-h-tap" disabled={busy} onClick={()=>send({kind:'auto',formation:v.lineup.formation},'The best fit eleven.')}>Best fit eleven</button><button type="button" className="lgm-ghost min-h-tap" onClick={()=>setDrawer(true)}>The squad · {v.squad.length}</button></p>
  </section>
  {dirty?<Portal><div className="lgm-savebar z-[60]" role="region" aria-label="Unsaved team sheet"><span>Changes not saved</span><button type="button" className="lgm-link min-h-tap" onClick={()=>{setXi(v.lineup.xi);setBench(v.lineup.bench);setT(v.lineup.tactics);setCap(v.lineup.captain)}}>Undo</button><button type="button" className="lgm-go min-h-tap" disabled={busy} onClick={()=>send({kind:'lineup',formation:v.lineup.formation,xi,bench,tactics:t,...(captain?{captain}:{})},'Team sheet saved.')} data-testid="legends-save-sheet">Save</button></div></Portal>:null}

  {pick?<Sheet id="lgm-pick" kicker={pick.kind==='xi'?`${v.lineup.formation} · ${posName(slot!.family)}`:'The bench'} title={pick.kind==='xi'?`Who plays ${slot!.fine}?`:'Who sits on the bench?'} onClose={()=>setPick(null)}>
   {pick.kind==='xi'&&occupant?<p className="lgm-actions">{captain===occupant?<span className="lgm-capnote"><i className="lgm-armband" aria-hidden="true">C</i> {men.get(occupant)?.name} wears the armband</span>:<button type="button" className="lgm-go min-h-tap" onClick={()=>{setCap(occupant);setPick(null)}} data-testid="legends-make-captain"><i className="lgm-armband" aria-hidden="true">C</i> Make {surname(men.get(occupant)?.name??'')} captain</button>}</p>:null}
   {pick.kind==='bench'&&occupant?<p className="lgm-actions"><button type="button" className="lgm-ghost min-h-tap" onClick={()=>putBench(pick.i,null)}>Take {surname(men.get(occupant)?.name??'')} off the bench</button></p>:null}
   <ul className="lgm-cands">{cands(slot?.family??null).filter(m=>pick.kind==='xi'||!xi.includes(m.id)).map(m=><li key={m.id}>
    <button type="button" className="lgm-cand min-h-tap" aria-pressed={m.id===occupant} data-natural={(slot&&m.pos===slot.family)||undefined} onClick={()=>pick.kind==='xi'?putXi(pick.i,m.id):putBench(pick.i,m.id)}>
     <span className="lgm-pos" data-pos={m.pos}>{m.pos}</span><b>{m.name}</b>{m.stars?<Stars value={m.stars} size="sm"/>:null}<small>{xi.includes(m.id)?(m.id===captain?'XI · captain':'XI'):bench.includes(m.id)?'Bench':m.note}</small>
    </button></li>)}</ul>
   {slot?<p className="lgm-fine">A man out of his line plays below himself.</p>:null}
  </Sheet>:null}

  {drawer?<Sheet id="lgm-squad" kicker={`GK ${v.quotas.GK} · DF ${v.quotas.DF} · MF ${v.quotas.MF} · FW ${v.quotas.FW}`} title={`The squad · ${v.squad.length}`} onClose={()=>setDrawer(false)}>
   <ul className="lgm-cands">{v.squad.map(s=><li key={s.id}><button type="button" className="lgm-cand min-h-tap" data-out={!s.fit||undefined} onClick={()=>{setDrawer(false);setCard(s)}}><span className="lgm-pos" data-pos={s.pos}>{s.pos}</span><b>{s.name}</b><Stars value={s.stars} size="sm"/><small>{s.injury?`Injured · ${s.injury}`:s.suspension?`Banned · ${s.suspension}`:`${s.appsTotal} apps · ${s.goals} goals`}</small></button></li>)}</ul>
   {v.emergency.length?<p className="lgm-fine">Emergency cover from the archive: {v.emergency.map(e=>`${e.name} (${e.pos}, match ${e.games+1} of 3)`).join(', ')}.</p>:null}
  </Sheet>:null}
  {card?<Sheet id="lgm-card" kicker={posName(card.pos)} title={card.name} onClose={()=>setCard(null)}>
   <LegendCard c={card}><p className="lgm-fine">{card.appsTotal} appearances · {card.goals} goals this season · {card.yellows} yellows · signed for {money(card.paid)}</p>
    {card.sale?<p className="lgm-actions"><button type="button" className="lgm-ghost min-h-tap" disabled={busy} onClick={()=>{send({kind:'sell',card:card.id},`${card.name} sold for ${money(card.sale!.net)}.`);setCard(null)}}>Sell · {money(card.sale.net)}</button></p>:<p className="lgm-fine">Sales happen in a transfer window.</p>}
   </LegendCard>
  </Sheet>:null}
 </div>
}
