'use client'
import {useEffect,useMemo,useRef,useState,type PointerEvent as ReactPointerEvent} from 'react'
import type {CareerView,SquadView} from '@/lib/legends/view'
import type {Tactics} from '@/lib/legends/types'
import {Stars} from './Brand'
import {LegendCard,money,posName,years} from './LegendCard'
import {LegendShirt} from './Shirts'
import {Portal,Sheet} from './Sheet'
import {familyLabel,nameLabeler} from '@/lib/clubs/display-name'

/**
 * The team sheet (owner, 13.10.2026: "make choosing and arranging the eleven comfortable"). Two ways to do everything, and the
 * second is never a lesser one (WCAG 2.5.7):
 *  · DRAG a man — from the pitch, the bench or the reserves (by his grip) — onto any place; whoever stood there goes where he came from
 *  · TAP a man, then TAP the place: the same move. The tray at the foot of the glass says who is held and what the next tap does,
 *    and carries the armbands: C and V, one tap each
 * Every change is local until Save (one server action, `lineup`); Undo walks back one move at a time. Out of his line a man is
 * marked on the pitch — he plays below himself — so the sheet tells the truth without a number.
 */
type Send=(a:Record<string,unknown>,ok?:string)=>void
const FORMATIONS=['4-3-3','4-4-2','3-5-2'] as const
const APPROACH=[['defensive','Defensive'],['balanced','Balanced'],['attacking','Attacking']] as const
const PRESS=[['low','Sit off'],['medium','Press'],['high','High press']] as const
const TEMPO=[['slow','Patient'],['normal','Normal'],['fast','Fast']] as const
const BENCH=7
export const surname=familyLabel
type Man={id:string;name:string;pos:string;stars:number;fit:boolean;note:string;from:number|null;to:number|null;squad:SquadView|null}
type Place={z:'xi';i:number}|{z:'bench';i:number}|{z:'rest';id?:string}
type Sheet={xi:string[];bench:string[];t:Tactics;cap:string|null;vice:string|null}
const keyOf=(p:Place)=>p.z==='rest'?`rest:${p.id??''}`:`${p.z}:${p.i}`
const parse=(k:string):Place|null=>{const [z,r]=k.split(':');return z==='xi'||z==='bench'?{z,i:Number(r)}:z==='rest'?{z:'rest',...(r?{id:r}:{})}:null}
const pad=(b:readonly string[])=>[...b,...Array(BENCH).fill('')].slice(0,BENCH)
/** the pitch is drawn taller than the formation's own grid so no two shirts touch on a phone: forwards high, keeper low */
const yOn=(y:number)=>6+(y-20)/(84-20)*86

export function TeamSheet({v,busy,send,mode='sheet'}:{v:CareerView;busy:boolean;send:Send;mode?:'sheet'|'meet'}){
 const saved=():Sheet=>({xi:[...v.lineup.xi],bench:pad(v.lineup.bench),t:v.lineup.tactics,cap:v.lineup.captain,vice:v.lineup.vice})
 const [s,setS]=useState<Sheet>(saved),[past,setPast]=useState<Sheet[]>([])
 const [sel,setSel]=useState<Place|null>(null),[card,setCard]=useState<SquadView|null>(null)
 useEffect(()=>{setS(saved());setPast([]);setSel(null)},[v.revision]) // eslint-disable-line react-hooks/exhaustive-deps
 const men=useMemo(()=>{const m=new Map<string,Man>()
  for(const q of v.squad)m.set(q.id,{id:q.id,name:q.name,pos:q.pos,stars:q.stars,fit:q.fit,from:q.from,to:q.to,squad:q,note:q.injury?`Injured · ${q.injury} round${q.injury===1?'':'s'}`:q.suspension?`Banned · ${q.suspension} match${q.suspension===1?'':'es'}`:''})
  for(const e of v.emergency)m.set(e.id,{id:e.id,name:e.name,pos:e.pos,stars:0,fit:true,from:null,to:null,squad:null,note:'Emergency cover'})
  return m},[v.squad,v.emergency])
 const slots=v.lineup.slots
 const surname=useMemo(()=>nameLabeler([...men.values()].map(m=>m.name)),[men])
 const change=(next:Sheet)=>{setPast(p=>[...p.slice(-30),s]);setS(next)}
 const at=(p:Place)=>p.z==='xi'?s.xi[p.i]||'':p.z==='bench'?s.bench[p.i]||'':p.id??''
 /** one move: the man at `from` goes to `to`; whoever stood at `to` goes back where he came from (or to the reserves) */
 const move=(from:Place,to:Place)=>{
  if(keyOf(from)===keyOf(to))return
  const a=at(from),b=to.z==='rest'?'':at(to);if(!a)return
  if(to.z==='xi'||to.z==='bench'){const m=men.get(a);if(m&&!m.fit)return}
  const xi=[...s.xi],bench=[...s.bench]
  const put=(p:Place,id:string)=>{if(p.z==='xi')xi[p.i]=id;else if(p.z==='bench')bench[p.i]=id}
  put(from,b);put(to,a)
  // a reserve who comes on pushes the man he replaces to the reserves; nobody stands in two places
  change({...s,xi,bench})
 }
 const tap=(p:Place)=>{
  const id=at(p)
  if(!sel){if(id&&(p.z!=='rest'||men.get(id)?.fit))setSel(p);return}
  if(keyOf(sel)===keyOf(p)){setSel(null);return}
  if(sel.z==='rest'&&p.z==='rest'){setSel(id&&men.get(id)?.fit?p:null);return}
  move(sel,p);setSel(null)
 }
 // ── drag: pointer events, a ghost under the finger, the place under the finger lights up; a short move is a tap
 const drag=useRef<{from:Place;id:string;x:number;y:number;on:boolean}|null>(null),swallow=useRef(false)
 const [ghost,setGhost]=useState<{id:string;x:number;y:number}|null>(null),[over,setOver]=useState<string|null>(null)
 const dropAt=(x:number,y:number)=>(document.elementFromPoint(x,y)?.closest('[data-drop]') as HTMLElement|null)?.dataset.drop??null
 const grab=(e:ReactPointerEvent,from:Place)=>{const id=at(from);if(!id||e.button!==0||busy)return;if(from.z==='rest'&&!men.get(id)?.fit)return
  drag.current={from,id,x:e.clientX,y:e.clientY,on:false};(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)}
 const drift=(e:ReactPointerEvent)=>{const d=drag.current;if(!d)return
  if(!d.on&&Math.hypot(e.clientX-d.x,e.clientY-d.y)<8)return
  d.on=true;setGhost({id:d.id,x:e.clientX,y:e.clientY});setOver(dropAt(e.clientX,e.clientY))}
 const drop=(e:ReactPointerEvent)=>{const d=drag.current;drag.current=null;if(!d||!d.on){setGhost(null);return}
  swallow.current=true;setTimeout(()=>{swallow.current=false},0)
  const k=dropAt(e.clientX,e.clientY),to=k?parse(k):null;setGhost(null);setOver(null);setSel(null)
  if(to)move(d.from,to)}
 const cancel=()=>{drag.current=null;setGhost(null);setOver(null)}
 const handlers=(p:Place)=>({onPointerDown:(e:ReactPointerEvent)=>grab(e,p),onPointerMove:drift,onPointerUp:drop,onPointerCancel:cancel,onClick:()=>{if(!swallow.current)tap(p)}})

 const inXi=new Set(s.xi.filter(Boolean)),onBench=new Set(s.bench.filter(Boolean))
 const reserves=[...men.values()].filter(m=>!inXi.has(m.id)&&!onBench.has(m.id)).sort((a,b)=>Number(b.fit)-Number(a.fit)||'GKDFMFFW'.indexOf(a.pos)-'GKDFMFFW'.indexOf(b.pos)||b.stars-a.stars||a.name.localeCompare(b.name))
 const armband=s.cap&&inXi.has(s.cap)?s.cap:s.vice&&inXi.has(s.vice)?s.vice:null
 const held=sel?men.get(at(sel)):undefined,heldSlot=sel?.z==='xi'?slots[sel.i]:null
 const setArm=(which:'cap'|'vice',id:string)=>{if(which==='cap')change({...s,cap:id,vice:s.vice===id?s.cap:s.vice});else change({...s,vice:id,cap:s.cap===id?s.vice:s.cap});setSel(null)}
 const full=s.xi.every(Boolean),dirty=JSON.stringify(s)!==JSON.stringify(saved())
 const missing=slots.length-s.xi.filter(Boolean).length
 const payload=()=>({kind:'lineup',formation:v.lineup.formation,xi:s.xi,bench:s.bench.filter(Boolean),tactics:s.t,...(s.cap?{captain:s.cap}:{}),...(s.vice&&s.vice!==s.cap?{vice:s.vice}:{})})
 const save=()=>send(payload(),'Team sheet saved.'),confirm=()=>send({...payload(),meet:true},'The eleven is set. To matchday.')
 const offLine=(i:number)=>{const m=men.get(s.xi[i]??'');return !!m&&m.pos!==slots[i]!.family}
 const offCount=slots.filter((_,i)=>offLine(i)).length

 return <div className="tl-sheet" data-mode={mode}>
  <section className="tl-pitchcol" aria-labelledby="tl-pitch-h">
   <header className="tl-pitchhead">
    <div><p className="lgm-kicker" id="tl-pitch-h">{mode==='meet'?'Step 2 · your eleven':'The team sheet'}</p><p className="tl-how">Drag a man onto a place, or tap him and then tap the place.</p></div>
    <div className="tl-seg" role="radiogroup" aria-label="Formation — picks the best fit eleven for it">{FORMATIONS.map(x=><button key={x} type="button" role="radio" className="min-h-tap" aria-checked={v.lineup.formation===x} disabled={busy} onClick={()=>send({kind:'auto',formation:x},`${x} — the best fit eleven.`)}>{x}</button>)}</div>
   </header>
   <div className="tl-pitch" role="group" aria-label={`${v.lineup.formation} — the eleven`}>
    <svg className="tl-lines" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true"><rect x="3" y="3" width="94" height="134"/><line x1="3" y1="70" x2="97" y2="70"/><circle cx="50" cy="70" r="12"/><rect x="24" y="3" width="52" height="20"/><rect x="24" y="117" width="52" height="20"/><rect x="38" y="3" width="24" height="7"/><rect x="38" y="130" width="24" height="7"/></svg>
    {slots.map((sl,i)=>{const id=s.xi[i]||'',m=men.get(id),k=keyOf({z:'xi',i}),off=offLine(i),isSel=sel&&keyOf(sel)===k,fit=held&&!heldSlot?held.pos===sl.family:false
     return <button key={sl.id} type="button" className="tl-spot min-h-tap" data-drop={k} data-over={over===k||undefined} data-sel={isSel||undefined} data-off={off||undefined} data-empty={!m||undefined} data-hint={sel&&!isSel?(fit?'natural':'any'):undefined}
      style={{insetInlineStart:`clamp(34px, ${sl.x}%, calc(100% - 34px))`,insetBlockStart:`${yOn(sl.y)}%`}} {...handlers({z:'xi',i})}
      aria-pressed={isSel||false} aria-label={`${sl.fine}: ${m?`${m.name}, ${posName(m.pos)}${off?', out of his line':''}${s.cap===id?', captain':s.vice===id?', vice-captain':''}`:'empty'}`}>
      <span className="tl-disc">{m?<LegendShirt man={m}/>:<i className="tl-plus" aria-hidden="true">+</i>}
       {m&&s.cap===id?<i className="tl-arm" data-arm="c" data-wearing={armband===id||undefined} aria-hidden="true">C</i>:m&&s.vice===id?<i className="tl-arm" data-arm="v" data-wearing={armband===id||undefined} aria-hidden="true">V</i>:null}
       {off?<i className="tl-off" aria-hidden="true">{m!.pos}</i>:null}</span>
      <small>{sl.fine}</small><b>{m?surname(m.name):'Empty'}</b></button>})}
   </div>
   <p className="tl-legend" aria-hidden="true"><span><i className="tl-arm" data-arm="c">C</i> captain</span><span><i className="tl-arm" data-arm="v">V</i> vice — wears it when the captain is not in the eleven</span><span><i className="tl-off">DF</i> out of his line</span></p>
   {v.lineup.error&&!dirty?<p className="lgm-error" role="alert">{v.lineup.error} <button type="button" className="lgm-link min-h-tap" disabled={busy} onClick={()=>send({kind:'auto',formation:v.lineup.formation},'The best fit eleven.')}>Pick the best fit eleven</button></p>:null}
   {offCount?<p className="tl-warn" role="note">{offCount} man{offCount===1?'':'s'} out of his line — {offCount===1?'he plays':'they play'} below {offCount===1?'himself':'themselves'}.</p>:null}
   {s.cap&&!inXi.has(s.cap)?<p className="tl-warn" role="note">{men.get(s.cap)?.name} is not in the eleven — {s.vice&&inXi.has(s.vice)?`${men.get(s.vice)?.name} wears the armband.`:'the eleven’s best man wears the armband.'}</p>:null}
  </section>

  <section className="tl-side" aria-label="Bench and reserves">
   <div className="tl-block"><p className="lgm-kicker">The bench · {onBench.size} of {BENCH}</p>
    <ol className="tl-bench">{s.bench.map((id,i)=>{const m=men.get(id),k=keyOf({z:'bench',i}),isSel=sel&&keyOf(sel)===k
     return <li key={i}><button type="button" className="tl-chip min-h-tap" data-drop={k} data-over={over===k||undefined} data-sel={isSel||undefined} data-empty={!m||undefined} {...handlers({z:'bench',i})} aria-pressed={isSel||false} aria-label={m?`Bench ${i+1}: ${m.name}, ${posName(m.pos)}`:`Bench ${i+1}: empty`}>
      {m?<><span className="lgm-pos" data-pos={m.pos}>{m.pos}</span><b>{surname(m.name)}</b>{s.cap===id?<i className="tl-arm" data-arm="c" aria-hidden="true">C</i>:s.vice===id?<i className="tl-arm" data-arm="v" aria-hidden="true">V</i>:null}</>:<span className="tl-chip-empty">+ bench</span>}</button></li>})}</ol>
   </div>
   <div className="tl-block"><p className="lgm-kicker">Not in the matchday squad · {reserves.length}</p>
    <ul className="tl-rest" data-drop="rest:" data-over={over==='rest:'||undefined}>
     {reserves.length?reserves.map(m=>{const k=keyOf({z:'rest',id:m.id}),isSel=sel&&keyOf(sel)===k,h=handlers({z:'rest',id:m.id})
      return <li key={m.id} data-out={!m.fit||undefined} data-natural={heldSlot&&m.pos===heldSlot.family?true:undefined}>
       <span className="tl-grip" aria-hidden="true" onPointerDown={h.onPointerDown} onPointerMove={h.onPointerMove} onPointerUp={h.onPointerUp} onPointerCancel={h.onPointerCancel}>⋮⋮</span>
       <button type="button" className="tl-row min-h-tap" disabled={!m.fit} data-sel={isSel||undefined} aria-pressed={isSel||false} onClick={h.onClick}>
        <span className="lgm-pos" data-pos={m.pos}>{m.pos}</span><b>{m.name}</b>{m.stars?<Stars value={m.stars} size="sm"/>:null}<small>{m.note||(s.cap===m.id?'Captain':s.vice===m.id?'Vice-captain':years(m))}</small></button>
       {m.squad?<button type="button" className="tl-info min-h-tap" aria-label={`${m.name} — his card`} onClick={()=>setCard(m.squad)}>i</button>:null}</li>}):<li className="tl-none">Every fit man is in the eleven or on the bench.</li>}
    </ul>
   </div>
   <div className="tl-block tl-plan"><p className="lgm-kicker">The plan</p>
    {([['Approach',APPROACH,'approach'],['Pressing',PRESS,'pressing'],['Tempo',TEMPO,'tempo']] as const).map(([label,opts,k])=><div key={k} className="tl-seg tl-seg-label" role="radiogroup" aria-label={label}><span>{label}</span>{opts.map(([val,l])=><button key={val} type="button" role="radio" className="min-h-tap" aria-checked={s.t[k]===val} onClick={()=>change({...s,t:{...s.t,[k]:val} as Tactics})}>{l}</button>)}</div>)}
    <p className="tl-tools"><button type="button" className="lgm-ghost min-h-tap" disabled={busy} onClick={()=>send({kind:'auto',formation:v.lineup.formation},'The best fit eleven.')}>Auto · best fit</button></p>
   </div>
  </section>

  {held||mode==='meet'||dirty?<Portal><div className="tl-tray z-[60]" role="region" aria-label="Team sheet tray" data-mode={mode}>
   {held?<div className="tl-held" aria-live="polite">
    <span className="tl-held-who"><span className="lgm-pos" data-pos={held.pos}>{held.pos}</span><b>{held.name}</b><small>{heldSlot?`${heldSlot.fine}${held.pos!==heldSlot.family?' · out of his line':''} — tap another place to swap`:'Now tap a place on the pitch or the bench'}</small></span>
    <span className="tl-held-do">
     {held.squad?<><button type="button" className="tl-armbtn min-h-tap" data-arm="c" aria-pressed={s.cap===held.id} onClick={()=>setArm('cap',held.id)} data-testid="legends-make-captain"><i aria-hidden="true">C</i> Captain</button>
     <button type="button" className="tl-armbtn min-h-tap" data-arm="v" aria-pressed={s.vice===held.id} onClick={()=>setArm('vice',held.id)} data-testid="legends-make-vice"><i aria-hidden="true">V</i> Vice</button></>:null}
     {sel?.z!=='rest'?<button type="button" className="tl-traybtn min-h-tap" onClick={()=>{move(sel!,{z:'rest'});setSel(null)}}>Out</button>:null}
     <button type="button" className="tl-traybtn min-h-tap" onClick={()=>setSel(null)} aria-label="Let go">✕</button></span>
   </div>:null}
   {mode==='meet'||dirty?<div className="tl-save">
    <span className="tl-save-note">{!full?`${missing} place${missing===1?'':'s'} empty`:mode==='meet'?(dirty?'Your eleven — not saved yet':'Your eleven'):'Changes not saved'}</span>
    <button type="button" className="tl-traybtn min-h-tap" disabled={!past.length} onClick={()=>{setS(past[past.length-1]!);setPast(past.slice(0,-1));setSel(null)}}>Undo</button>
    {dirty?<button type="button" className="tl-traybtn min-h-tap" onClick={()=>{setS(saved());setPast([]);setSel(null)}}>Reset</button>:null}
    {mode==='meet'?<button type="button" className="lgm-go min-h-tap" disabled={busy||!full} onClick={confirm} data-testid="legends-meet-confirm">Confirm · to matchday</button>
     :<button type="button" className="lgm-go min-h-tap" disabled={busy||!full} onClick={save} data-testid="legends-save-sheet">Save</button>}
   </div>:null}
  </div></Portal>:null}
  {ghost?<Portal><div className="tl-ghost" style={{insetInlineStart:ghost.x,insetBlockStart:ghost.y}} aria-hidden="true"><span className="tl-disc">{men.get(ghost.id)?<LegendShirt man={men.get(ghost.id)!}/>:null}</span><b>{surname(men.get(ghost.id)?.name??'')}</b></div></Portal>:null}

  {card?<Sheet id="lgm-card" kicker={posName(card.pos)} title={card.name} onClose={()=>setCard(null)}>
   <LegendCard c={card} shirt><p className="lgm-fine">{card.appsTotal} appearances · {card.goals} goals this season · {card.yellows} yellows · signed for {money(card.paid)}</p>
    <p className="lgm-actions"><button type="button" className="lgm-ghost min-h-tap" disabled={busy} aria-pressed={card.listed} onClick={()=>send({kind:'list',card:card.id,listed:!card.listed},card.listed?`${card.name} is off the transfer list.`:`${card.name} is on the transfer list. Bids come when a window opens.`)} data-testid="legends-list">{card.listed?'Take off the transfer list':'Put on the transfer list'}</button></p>
    {card.sale?<p className="lgm-actions"><button type="button" className="lgm-ghost min-h-tap" disabled={busy} onClick={()=>{send({kind:'sell',card:card.id},`${card.name} sold for ${money(card.sale!.net)}.`);setCard(null)}}>Sell · {money(card.sale.net)}</button></p>:<p className="lgm-fine">Sales happen in a transfer window.</p>}
   </LegendCard>
  </Sheet>:null}
 </div>
}
