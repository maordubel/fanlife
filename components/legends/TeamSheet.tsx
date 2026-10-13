'use client'
import {useCallback,useEffect,useMemo,useRef,useState,type PointerEvent as RPointerEvent} from 'react'
import type {CareerView,SquadView} from '@/lib/legends/view'
import type {Tactics} from '@/lib/legends/types'
import type {RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {LegendCard,money,posName,years} from './LegendCard'
import {LegendShirt,type Marks} from './Kit'
import {Portal,Sheet} from './Sheet'

/**
 * The team sheet (owner, 13.10.2026: "make choosing and arranging the line-up fast and pleasant on a phone"). Three zones on
 * one screen — the pitch, the bench, the rest of the squad — and one gesture between any two of them: TAP a man, TAP where he
 * goes (a spot, a bench seat, another man: they swap). With a mouse he can simply be dragged; on a touch screen a short hold
 * lifts him. A man's line shows on every spot: a natural fit is drawn solid, a man out of his line dashed with a mark. The
 * armbands are two taps: select the man, press C or V. Nothing scrolls sideways; every name is fitted to its box.
 */
type Send=(a:Record<string,unknown>,ok?:string)=>void
type Loc={z:'xi';i:number}|{z:'bench';i:number}|{z:'res';id:string}
const FORMATIONS=['4-3-3','4-4-2','3-5-2'] as const
const APPROACH=[['defensive','Defensive'],['balanced','Balanced'],['attacking','Attacking']] as const
const PRESS=[['low','Sit off'],['medium','Press'],['high','High press']] as const
const TEMPO=[['slow','Patient'],['normal','Normal'],['fast','Fast']] as const
export const surname=(n:string)=>{const p=n.trim().split(/\s+/);return p.length>1?p[p.length-1]!:n}
/** the formation's 20–84% band, spread over the whole pitch so a shirt and a name never sit on the line in front */
const spreadY=(y:number)=>Math.round((9+(y-20)*82/64)*10)/10,spreadX=(x:number)=>Math.round((11+(x-9)*78/82)*10)/10
type Man={id:string;name:string;pos:string;stars:number;fit:boolean;note:string;from:number|null;to:number|null}
const same=(a:Loc|null,b:Loc)=>!!a&&a.z===b.z&&(a.z==='res'?a.id===(b as {id:string}).id:(a as {i:number}).i===(b as {i:number}).i)
const enc=(l:Loc)=>l.z==='res'?`res:${l.id}`:`${l.z}:${l.i}`
const dec=(s:string|undefined|null):Loc|null=>{if(!s)return null;const [z,r]=[s.slice(0,s.indexOf(':')),s.slice(s.indexOf(':')+1)];return z==='res'?{z,id:r}:z==='xi'||z==='bench'?{z,i:Number(r)}:null}

export function TeamSheet({v,busy,send,wardrobe,marks,register=false,onDone}:{v:CareerView;busy:boolean;send:Send;wardrobe:RumbleWardrobe;marks?:Marks;/** the squad registration after the draft: both armbands asked for, one confirm */register?:boolean;onDone?:()=>void}){
 const init=()=>({xi:v.lineup.xi,bench:v.lineup.bench,t:v.lineup.tactics,cap:v.lineup.captainPick??v.lineup.captain,vice:v.lineup.vice})
 const [st,setSt]=useState(init),{xi,bench,t,cap,vice}=st
 const [sel,setSel]=useState<Loc|null>(null),[card,setCard]=useState<SquadView|null>(null),[note,setNote]=useState<string|null>(null)
 useEffect(()=>{setSt(init());setSel(null)},[v.revision]) // eslint-disable-line react-hooks/exhaustive-deps
 const men=useMemo(()=>{const m=new Map<string,Man>();for(const s of v.squad)m.set(s.id,{id:s.id,name:s.name,pos:s.pos,stars:s.stars,fit:s.fit,from:s.from,to:s.to,note:s.injury?`Injured · ${s.injury}`:s.suspension?`Banned · ${s.suspension}`:''})
  for(const e of v.emergency)m.set(e.id,{id:e.id,name:e.name,pos:e.pos,stars:0,fit:true,from:null,to:null,note:'Emergency cover'});return m},[v.squad,v.emergency])
 const slots=v.lineup.slots
 const reserves=useMemo(()=>[...men.values()].filter(m=>!xi.includes(m.id)&&!bench.includes(m.id)).sort((a,b)=>Number(b.fit)-Number(a.fit)||['GK','DF','MF','FW'].indexOf(a.pos)-['GK','DF','MF','FW'].indexOf(b.pos)||b.stars-a.stars),[men,xi,bench])
 const idAt=(l:Loc)=>l.z==='xi'?xi[l.i]:l.z==='bench'?bench[l.i]:l.id
 const dirty=JSON.stringify([xi,bench,t,cap??null,vice??null])!==JSON.stringify([v.lineup.xi,v.lineup.bench,v.lineup.tactics,v.lineup.captainPick??v.lineup.captain??null,v.lineup.vice??null])
 const armband=cap&&xi.includes(cap)?cap:vice&&xi.includes(vice)?vice:null

 /** move the man at `a` to `b`; whoever stands at `b` takes his place */
 const move=useCallback((a:Loc,b:Loc)=>{
  if(same(a,b)){setSel(null);return}
  setSt(s=>{
   const X=[...s.xi],B=[...s.bench],ida=a.z==='xi'?X[a.i]:a.z==='bench'?B[a.i]:a.id,idb=b.z==='xi'?X[b.i]:b.z==='bench'?B[b.i]:b.id
   if(!ida){return s}
   const m=men.get(ida),o=idb?men.get(idb):undefined
   if((b.z!=='res'&&m&&!m.fit)||(a.z!=='res'&&o&&!o.fit)){setNote(`${(m&&!m.fit?m:o)!.name} is not fit to play.`);return s}
   if(a.z==='xi'&&!idb&&b.z!=='xi'){setNote('The eleven needs a man in that spot — swap him with someone instead.');return s}
   if(a.z==='res'&&b.z==='res')return s
   const put=(l:Loc,id:string|undefined)=>{if(l.z==='xi'){if(id)X[l.i]=id}else if(l.z==='bench'){if(id)B[l.i]=id;else B.splice(l.i,1)}}
   if(b.z==='bench'&&!idb){ // an empty seat: he sits down, nobody comes back
    if(a.z==='bench'){B.splice(a.i,1);B.push(ida)}else B.push(ida)
    if(B.length>7)return s
    setNote(null);return {...s,xi:X,bench:B}
   }
   put(b,ida);put(a,idb)
   setNote(null);return {...s,xi:X,bench:B.filter(Boolean)}
  })
  setSel(null)
 },[men])

 const tap=(l:Loc)=>{
  if(drag.current.moved){drag.current.moved=false;return}
  if(!sel){if(idAt(l))setSel(l);return}
  if(same(sel,l)){setSel(null);return}
  move(sel,l)
 }

 /* drag: a mouse drags at once, a finger after a short hold (so the page still scrolls under a passing thumb) */
 const drag=useRef<{from:Loc|null;x:number;y:number;on:boolean;moved:boolean;timer:number|null;id:number}>({from:null,x:0,y:0,on:false,moved:false,timer:null,id:-1})
 const [ghost,setGhost]=useState<{name:string;x:number;y:number}|null>(null)
 const [over,setOver]=useState<string|null>(null)
 useEffect(()=>{
  const block=(e:TouchEvent)=>{if(drag.current.on)e.preventDefault()}
  document.addEventListener('touchmove',block,{passive:false})
  return()=>document.removeEventListener('touchmove',block)
 },[])
 const down=(l:Loc)=>(e:RPointerEvent<HTMLElement>)=>{
  const id=idAt(l);if(!id||e.button>0)return
  const d=drag.current;d.from=l;d.x=e.clientX;d.y=e.clientY;d.on=false;d.moved=false;d.id=e.pointerId
  if(d.timer)window.clearTimeout(d.timer)
  const lift=()=>{d.on=true;setSel(l);setGhost({name:surname(men.get(id)?.name??''),x:d.x,y:d.y});navigator.vibrate?.(12)}
  if(e.pointerType==='touch')d.timer=window.setTimeout(lift,260)
  const mv=(ev:PointerEvent)=>{if(ev.pointerId!==d.id)return
   const far=Math.hypot(ev.clientX-d.x,ev.clientY-d.y)>8
   if(!d.on){if(far){if(e.pointerType==='touch'){if(d.timer)window.clearTimeout(d.timer);d.timer=null;cleanup();return}lift()}else return}
   d.moved=true;setGhost(g=>g?{...g,x:ev.clientX,y:ev.clientY}:g)
   const t=document.elementFromPoint(ev.clientX,ev.clientY)?.closest<HTMLElement>('[data-drop]');setOver(t?.dataset.drop??null)}
  const up=(ev:PointerEvent)=>{if(ev.pointerId!==d.id)return
   if(d.timer)window.clearTimeout(d.timer);d.timer=null
   if(d.on&&d.moved){const t=document.elementFromPoint(ev.clientX,ev.clientY)?.closest<HTMLElement>('[data-drop]'),to=dec(t?.dataset.drop);if(to&&d.from)move(d.from,to)}
   d.on=false;cleanup()}
  const cleanup=()=>{setGhost(null);setOver(null);window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up)}
  window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up)
 }

 const selId=sel?idAt(sel):undefined,selMan=selId?men.get(selId):undefined
 const setArm=(k:'cap'|'vice',id:string)=>{setSt(s=>k==='cap'?{...s,cap:id,vice:s.vice===id?s.cap:s.vice}:{...s,vice:id,cap:s.cap===id?s.vice:s.cap});setSel(null)}
 const save=()=>send({kind:'lineup',formation:v.lineup.formation,xi,bench,tactics:t,...(cap?{captain:cap}:{}),...(vice&&vice!==cap?{vice}:{}),...(register?{meet:true}:{})},register?'Your eleven is registered. Round 1 is next.':'Team sheet saved.')
 const missing=register&&(!cap||!vice||cap===vice)
 const fitOf=(m:Man|undefined,family:string)=>!m?'empty':m.pos===family?'natural':family==='GK'||m.pos==='GK'?'wrong':'off'
 const shirt=(m:Man,mini=true)=><LegendShirt man={m} club={v.clubId} wardrobe={wardrobe} marks={marks} mini={mini}/>
 const tag=(id:string)=>id===cap?<i className="lgt-arm" data-k="c" aria-label="captain">C</i>:id===vice?<i className="lgt-arm" data-k="v" aria-label="vice-captain">V</i>:null

 return <div className="lgt-team" data-register={register||undefined} data-dragging={ghost?'':undefined}>
  <section className="lgt-panel lgt-pitchpanel" aria-labelledby="lgt-team-h">
   <header className="lgt-teamhead">
    <p className="lgm-kicker" id="lgt-team-h">{register?'Step 2 · your fixed eleven':'The team sheet'}</p>
    <div className="lgt-formations" role="radiogroup" aria-label="Formation">{FORMATIONS.map(x=><button key={x} type="button" role="radio" aria-checked={v.lineup.formation===x} className="min-h-tap" disabled={busy} onClick={()=>send({kind:'auto',formation:x},`${x} — the best fit eleven.`)}>{x}</button>)}</div>
    <button type="button" className="lgt-auto min-h-tap" disabled={busy} onClick={()=>send({kind:'auto',formation:v.lineup.formation},'The best fit eleven.')} data-testid="legends-auto">★ Auto-pick the best XI</button>
   </header>
   <div className="lgt-pitch" role="group" aria-label={`${v.lineup.formation} — tap a man, then where he goes`}>
    <i className="lgt-lines" aria-hidden="true"/>
    {slots.map((s,i)=>{const id=xi[i],m=id?men.get(id):undefined,loc:Loc={z:'xi',i},fit=fitOf(m,s.family),target=selMan&&!same(sel,loc)?(selMan.pos===s.family?'natural':'other'):undefined
     return <button key={s.id} type="button" className="lgt-spot" style={{insetInlineStart:`${spreadX(s.x)}%`,insetBlockStart:`${spreadY(s.y)}%`}} data-drop={enc(loc)} data-fit={fit} data-sel={same(sel,loc)||undefined} data-target={target} data-over={over===enc(loc)||undefined}
      onPointerDown={down(loc)} onClick={()=>tap(loc)} aria-pressed={same(sel,loc)} aria-label={`${s.fine}: ${m?`${m.name}${fit==='natural'?'':', out of position'}${id===armband?', wears the armband':''}`:'empty'}`}>
      {m?<span className="lgt-spot-shirt">{shirt(m)}{tag(m.id)}</span>:<span className="lgt-spot-shirt lgt-spot-empty" aria-hidden="true">+</span>}
      <b className="lgt-spot-name">{m?surname(m.name):'—'}</b>
      <small className="lgt-spot-pos">{s.fine}{fit==='off'||fit==='wrong'?<em aria-hidden="true"> · {m!.pos}</em>:null}</small>
     </button>})}
   </div>
   <p className="lgt-hint" role="status" aria-live="polite">{note??(selMan?<><b>{selMan.name}</b> — tap a spot, a seat or a man to swap. {posName(selMan.pos)}.</>:register?'Tap a man, then tap where he goes. Pick a captain and a vice-captain.':'Tap a man, then tap where he goes — or hold him and drag.')}</p>
   <div className="lgt-selbar" data-on={selMan?'':undefined}>
    {selMan?<>
     <button type="button" className="lgt-armbtn min-h-tap" data-k="c" aria-pressed={selMan.id===cap} onClick={()=>setArm('cap',selMan.id)} data-testid="legends-make-captain"><i className="lgt-arm" data-k="c" aria-hidden="true">C</i>Captain</button>
     <button type="button" className="lgt-armbtn min-h-tap" data-k="v" aria-pressed={selMan.id===vice} onClick={()=>setArm('vice',selMan.id)} data-testid="legends-make-vice"><i className="lgt-arm" data-k="v" aria-hidden="true">V</i>Vice</button>
     {v.squad.some(s=>s.id===selMan.id)?<button type="button" className="lgt-armbtn min-h-tap" onClick={()=>{setCard(v.squad.find(s=>s.id===selMan.id)!);setSel(null)}}>Card</button>:null}
     <button type="button" className="lgt-armbtn min-h-tap" onClick={()=>setSel(null)} aria-label="Cancel the selection">✕</button>
    </>:<dl className="lgt-arms">
     <div><dt><i className="lgt-arm" data-k="c" aria-hidden="true">C</i>Captain</dt><dd>{cap&&men.get(cap)?surname(men.get(cap)!.name):'Not chosen'}</dd></div>
     <div><dt><i className="lgt-arm" data-k="v" aria-hidden="true">V</i>Vice</dt><dd>{vice&&men.get(vice)?surname(men.get(vice)!.name):'Not chosen'}</dd></div>
    </dl>}
   </div>
  </section>

  <section className="lgt-panel" aria-labelledby="lgt-bench-h">
   <p className="lgm-kicker" id="lgt-bench-h">Bench · {bench.length} of 7</p>
   <ul className="lgt-seats">{Array.from({length:7},(_,i)=>{const id=bench[i],m=id?men.get(id):undefined,loc:Loc={z:'bench',i:m?i:bench.length}
    return <li key={i}><button type="button" className="lgt-man" data-drop={enc(loc)} data-empty={!m||undefined} data-sel={m&&same(sel,loc)||undefined} data-over={over===enc(loc)||undefined} disabled={!m&&!sel} onPointerDown={m?down(loc):undefined} onClick={()=>tap(loc)} aria-pressed={!!m&&same(sel,loc)} aria-label={m?`Bench: ${m.name}, ${posName(m.pos)}`:'Empty seat'}>
     {m?<><span className="lgt-man-shirt">{shirt(m)}{tag(m.id)}</span><b>{surname(m.name)}</b><small data-pos={m.pos}>{m.pos}</small></>:<span className="lgt-seat-empty">+</span>}
    </button></li>})}</ul>
  </section>

  {reserves.length?<section className="lgt-panel" aria-labelledby="lgt-res-h">
   <p className="lgm-kicker" id="lgt-res-h">Not in the squad today · {reserves.length}</p>
   <ul className="lgt-seats lgt-reserves">{reserves.map(m=>{const loc:Loc={z:'res',id:m.id}
    return <li key={m.id}><button type="button" className="lgt-man" data-drop={enc(loc)} data-out={!m.fit||undefined} data-sel={same(sel,loc)||undefined} data-over={over===enc(loc)||undefined} onPointerDown={down(loc)} onClick={()=>tap(loc)} aria-pressed={same(sel,loc)} aria-label={`${m.name}, ${posName(m.pos)}${m.note?`, ${m.note}`:''}`}>
     <span className="lgt-man-shirt">{shirt(m)}{tag(m.id)}</span><b>{surname(m.name)}</b><small data-pos={m.pos}>{m.fit?m.pos:m.note}</small>
    </button></li>})}</ul>
  </section>:null}

  {register?null:<details className="lgt-panel lgt-plan"><summary className="min-h-tap">The plan · {APPROACH.find(a=>a[0]===t.approach)?.[1]} · {PRESS.find(a=>a[0]===t.pressing)?.[1]} · {TEMPO.find(a=>a[0]===t.tempo)?.[1]}</summary>
   {([['Approach',APPROACH,'approach'],['Pressing',PRESS,'pressing'],['Tempo',TEMPO,'tempo']] as const).map(([label,opts,k])=><div key={k} className="lgt-seg" role="radiogroup" aria-label={label}><span>{label}</span>{opts.map(([val,l])=><button key={val} type="button" role="radio" aria-checked={t[k]===val} className="min-h-tap" onClick={()=>setSt(s=>({...s,t:{...s.t,[k]:val} as Tactics}))}>{l}</button>)}</div>)}
  </details>}
  {v.lineup.error?<p className="lgm-error" role="alert">{v.lineup.error}</p>:null}

  {register?<Portal><div className="lgt-savebar lgt-savebar-register" role="region" aria-label="Register the eleven">
   <span>{missing?'C + V needed':'Ready'}</span>
   <button type="button" className="lgm-go min-h-tap" disabled={busy||missing} onClick={()=>{save();onDone?.()}} data-testid="legends-register">Register XI ✓</button>
  </div></Portal>:dirty?<Portal><div className="lgt-savebar" data-above-nav="" role="region" aria-label="Unsaved team sheet"><span>Not saved</span><button type="button" className="lgm-link min-h-tap" onClick={()=>{setSt(init());setSel(null)}}>Undo</button><button type="button" className="lgm-go min-h-tap" disabled={busy} onClick={save} data-testid="legends-save-sheet">Save</button></div></Portal>:null}

  {ghost?<Portal><div className="lgt-ghost" style={{insetInlineStart:ghost.x,insetBlockStart:ghost.y}} aria-hidden="true">{ghost.name}</div></Portal>:null}
  {card?<Sheet id="lgm-card" kicker={posName(card.pos)} title={card.name} onClose={()=>setCard(null)}>
   <div className="lgt-cardshirt">{shirt({...card,note:'',fit:card.fit},false)}</div>
   <LegendCard c={card}><p className="lgm-fine">{years(card)} · {card.appsTotal} appearances · {card.goals} goals this season · {card.yellows} yellows · signed for {money(card.paid)}</p>
    {card.sale?<p className="lgm-actions"><button type="button" className="lgm-ghost min-h-tap" disabled={busy} onClick={()=>{send({kind:'sell',card:card.id},`${card.name} sold for ${money(card.sale!.net)}.`);setCard(null)}}>Sell · {money(card.sale.net)}</button></p>:<p className="lgm-fine">Sales happen in a transfer window.</p>}
   </LegendCard>
  </Sheet>:null}
 </div>
}
