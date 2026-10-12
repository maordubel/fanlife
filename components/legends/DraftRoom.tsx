'use client'
import {useEffect,useMemo,useRef,useState,type MouseEvent} from 'react'
import type {CardView,CareerView} from '@/lib/legends/view'
import type {RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {reelStops} from '@/lib/clubs/rumble-show'
import {ATTR_LABEL,ROLE_ATTRS,type AttrKey} from '@/lib/legends/ratings'
import {firePickFxAt} from '@/components/stage/PickFx'
import {Bulbs,RumbleShirt,useReducedMotion} from '@/components/clubs/rumble/shared'
import {SlotReel} from '@/components/clubs/rumble/RumbleSlotMachine'
import s from '@/components/clubs/rumble/rumble.module.css'
import {Stars} from './Brand'
import {money,posName,years,GAME_VALUES} from './LegendCard'

/**
 * The founding draft as the Royal Rumble's slot machine (owner, 12.10.2026: "the same slot system and graphics as the Royal
 * Rumble; the slots come up one after another by themselves, by line: GK, DF, MF, FW, DF, MF, FW, MF, DF, GK …").
 * Nothing is chosen but the man: the server deals the next line the moment a man is signed, the reels spin, and a TAP on a card
 * signs him (rule 24 — a tap places). The rail shows the whole order, the board below fills line by line, and a locked card
 * says why. Everything is decided on the server; this screen only sends the tap.
 */
type Send=(a:Record<string,unknown>,ok?:string)=>void
const SHORT:Record<string,string>={GK:'GK',DF:'DEF',MF:'MID',FW:'FWD'}
const QUESTION:Record<string,string>={GK:'Who keeps goal?',DF:'Who holds the line?',MF:'Who runs the middle?',FW:'Who scores the goals?'}
const TIER:Record<string,string>={premium:'Premium',mid:'Squad',budget:'Bargain'}
const surname=(n:string)=>{const p=n.trim().split(/\s+/);return p.length>1?p[p.length-1]!:n}
const asCard=(c:Pick<CardView,'id'|'from'|'to'>)=>({id:c.id,fromYear:c.from,toYear:c.to})

export function DraftRoom({v,busy,send,wardrobe}:{v:CareerView;busy:boolean;send:Send;wardrobe:RumbleWardrobe}){
 const d=v.draft!,done=d.picks.length>=d.required&&!d.optionalOpen,reduced=useReducedMotion()
 const offers=d.offers,signature=`${d.slot}:${d.group}:${offers.map(o=>o.id).join(',')}`
 const stops=useMemo(()=>reelStops(offers.length,reduced,520,220),[offers.length,reduced])
 const strips=useMemo(()=>offers.map((o,i)=>{const pool=d.strip.length?d.strip:offers.map(x=>x.name),n=Math.max(6,Math.round((stops[i]||520)/84));return [...Array.from({length:n},(_,k)=>pool[(k*3+i*5)%pool.length]!),o.name]}),[offers,d.strip,stops])
 const [landed,setLanded]=useState<boolean[]>(()=>offers.map(()=>reduced))
 useEffect(()=>{
  if(reduced){setLanded(offers.map(()=>true));return}
  setLanded(offers.map(()=>false))
  const t=stops.map((ms,i)=>window.setTimeout(()=>setLanded(p=>{const n=[...p];n[i]=true;return n}),ms+40))
  return()=>t.forEach(x=>window.clearTimeout(x))
  // a new deal is a new spin
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[signature,reduced])
 const spinning=landed.some(l=>!l)
 // the rail: every slot of the order, signed ones by name, the current one lit
 const order=[...d.picks.map(p=>({pos:p.pos,name:surname(p.name),filled:true})),...d.upcoming.map(p=>({pos:p,name:'',filled:false}))]
 const current=d.picks.length
 const railRef=useRef<HTMLOListElement>(null)
 useEffect(()=>{railRef.current?.querySelector('[aria-current="step"]')?.scrollIntoView({block:'nearest',inline:'center',behavior:reduced?'auto':'smooth'})},[current,reduced])
 const sign=(o:typeof offers[number],e:MouseEvent<HTMLButtonElement>)=>{
  firePickFxAt(e.currentTarget,{label:money(o.price),tone:'red',haptic:o.price>=5?'lock':'tap',big:o.price>=5})
  send({kind:'draft',move:{kind:'pick',id:o.id}},`${o.name} signed for ${money(o.price)}.`)
 }
 const quota=(['GK','DF','MF','FW'] as const).map(p=>({p,have:d.picks.filter(x=>x.pos===p).length,need:v.rules.minimums[p]}))
 return <section className={`${s.game} lgm-draft`} aria-labelledby="lgm-draft-h" data-testid="legends-draft">
  <header className={s.hud}>
   <div className={s.hudCopy}>
    <p className={`${s.mono} ${s.hudKicker}`}>The founding draft · {v.clubName}</p>
    <h2 id="lgm-draft-h" className={s.hudIntro}>{done?'Your seventeen are chosen':d.optionalOpen?'One more, if you want him':`Pick ${Math.min(d.slot,d.required)} of ${d.required}`}</h2>
    <p className={`${s.mono} lgm-draft-quota`}>{quota.map(q=><span key={q.p} data-met={q.have>=q.need||undefined}>{q.p} {q.have}/{q.need}</span>)}</p>
   </div>
   <div className={s.money} data-testid="legends-money">
    <div className={`${s.mono} ${s.moneyTop}`}><span>Budget left</span></div>
    <p className={s.moneyValue} dir="ltr" aria-live="polite">{money(d.left)}</p>
    <p className={`${s.mono} ${s.trail}`}>{d.picks.length<d.required?`≥ ${money(d.minToFinish)} to finish`:`spent ${money(d.spent)}`}</p>
    <div className={s.progress}><i style={{width:`${Math.min(100,d.picks.length/d.required*100)}%`}}/></div>
   </div>
  </header>

  <section className={`${s.rail} lgm-rail`} aria-label="The draft order">
   <div className={`${s.mono} ${s.railHead}`}><span>The order · one line after another</span><span>{d.picks.length}/{d.required}{d.optional?` +${d.optional}`:''}</span></div>
   <ol ref={railRef} className="lgm-rail-slots">{order.map((o,i)=><li key={i} className={s.slot} data-filled={o.filled} aria-current={i===current&&!done?'step':undefined} data-optional={i>=d.required||undefined}>
    <span className={`${s.mono} ${s.slotPos}`}>{String(i+1).padStart(2,'0')} · {SHORT[o.pos]}</span>
    {o.filled?<span className={s.slotName} dir="auto">{o.name}</span>:<span className={s.slotEmpty} aria-hidden="true">{i>=d.required?'+':'?'}</span>}
   </li>)}</ol>
  </section>

  {!done&&d.group&&offers.length?<section className={s.cabinet} data-spinning={spinning} data-testid="legends-machine" aria-busy={spinning}>
   <div className={s.marquee}><Bulbs n={9} className={s.bulbs}/><span className={s.marqueeTitle}>Legends draft</span><Bulbs n={9} className={s.bulbs}/></div>
   <div className={s.pickHead}>
    <span className={s.pickNo} dir="ltr">{String(d.slot).padStart(2,'0')}</span>
    <div className={s.pickText}><p className={`${s.mono} ${s.pickMeta}`}>{d.optionalOpen?'The eighteenth · optional':`Pick ${d.slot} · ${posName(d.group)}`}</p><p className={s.pickQ}>{QUESTION[d.group]}</p></div>
   </div>
   <p className="sr-only" aria-live="polite">{spinning?'The reels are spinning.':`Three ${posName(d.group).toLowerCase()}s on the table.`}</p>
   <div className={s.reels} role="group" aria-label={QUESTION[d.group]}>
    {offers.map((o,i)=><div className={s.reel} key={`${signature}-${o.id}`}>
     {!reduced&&<SlotReel names={strips[i]!} stopAt={stops[i]!} landed={!!landed[i]} reduced={reduced} label={landed[i]?'Landed':'Spinning'}/>}
     <OfferCard o={o} i={i} wardrobe={wardrobe} flip={!!landed[i]&&!reduced} disabled={busy||!!o.locked||!landed[i]} onPick={e=>sign(o,e)}/>
    </div>)}
   </div>
  </section>:null}
  {d.stuck?<p className="lgm-error" role="alert">No line can be dealt for this pick. The owner has been shown why in the control room.</p>:null}

  {!done?<div className={s.chips}>
   <button type="button" className={`${s.chip} min-h-tap`} disabled={busy||spinning||!d.group||d.rerollsLeft<=0} onClick={e=>{firePickFxAt(e.currentTarget,{tone:'ink',haptic:'tap'});send({kind:'draft',move:{kind:'reroll'}},'Three new men on the table.')}} data-testid="legends-reroll"><span>Spin again</span><b>×{d.rerollsLeft}</b></button>
   {d.optionalOpen?<button type="button" className={`${s.chip} min-h-tap`} disabled={busy} onClick={()=>send({kind:'draft',move:{kind:'skip'}},'Seventeen it is.')}><span>Keep seventeen</span></button>:null}
  </div>:null}

  {done||d.optionalOpen?<div className="lgm-confirm">
   <p><b>Spent {money(d.spent)} of €52M.</b> On confirming, the board adds a one-off <b>€8M</b>: your window starts with {money(52-d.spent+8)}.</p>
   {d.canConfirm&&done?<p className="lgm-error" role="alert">{d.canConfirm}</p>:null}
   <button type="button" className={`${s.lock} min-h-tap`} data-ready={!d.canConfirm} disabled={busy||!!d.canConfirm} onClick={e=>{firePickFxAt(e.currentTarget,{label:'Registered',tone:'red',big:true,haptic:'lock'});send({kind:'draft-confirm'},'The squad is registered.')}}><span><small>{d.picks.length} men · {money(d.spent)}</small><strong>Register the squad</strong></span><span aria-hidden="true">→</span></button>
  </div>:null}

  <Board v={v} wardrobe={wardrobe}/>
  <p className="lgm-fine">{GAME_VALUES}</p>
 </section>
}

/** one man on the payline, in the Royal Rumble card: shirt of his years, stars, his line's attributes, the price as bars */
function OfferCard({o,i,wardrobe,flip,disabled,onPick}:{o:NonNullable<CareerView['draft']>['offers'][number];i:number;wardrobe:RumbleWardrobe;flip:boolean;disabled:boolean;onPick:(e:MouseEvent<HTMLButtonElement>)=>void}){
 const attrs=(ROLE_ATTRS[o.pos]??[]).slice(0,3)
 return <div className="lgm-offer">
  <button type="button" className={`${s.card} mag-pick min-h-tap`} data-flip={flip} disabled={disabled} onClick={onPick} data-testid="legends-card" data-tier={o.tier}
   aria-label={o.locked?`${o.name}, ${money(o.price)} — locked: ${o.locked}`:`Sign ${o.name}, ${posName(o.pos)}, ${o.stars} stars, ${money(o.price)}`}>
   <i className={s.cardBand}/>
   <span className={s.cardGhost} aria-hidden="true">{i+1}</span>
   <span className={s.cardBody}>
    <span className={s.cardTop}><span className={`${s.mono} ${s.cardEntry}`}>{TIER[o.tier]??o.tier}</span><span className={s.price} dir="ltr">{money(o.price)}</span></span>
    <span className={s.cardShirt}><RumbleShirt card={asCard(o)} side="us" wardrobe={wardrobe}/></span>
    <span className={s.cardName} dir="auto">{o.name}</span>
    <span className={`${s.mono} ${s.cardYears}`} dir="ltr">{years(o)}</span>
    <span className="lgm-offer-stars"><Stars value={o.stars} size="sm"/></span>
    <span className="lgm-offer-attrs">{attrs.map(k=><span key={k}><small>{ATTR_LABEL[k as AttrKey]}</small><Stars value={o.attrs[k]??o.stars} size="sm"/></span>)}</span>
    <span className={s.bars} aria-hidden="true">{Array.from({length:5},(_,k)=><i key={k} data-on={k<Math.round(o.price)}/>)}</span>
   </span>
  </button>
  {o.locked?<p className="lgm-card-lock" role="note">{o.locked}</p>:null}
 </div>
}

/** the squad board — four lines filling as the order runs; a dashed shirt is a quota still owed */
function Board({v,wardrobe}:{v:CareerView;wardrobe:RumbleWardrobe}){
 const d=v.draft!
 return <section className="lgm-board" aria-labelledby="lgm-board-h">
  <h3 id="lgm-board-h" className={s.mono}>Your squad · {d.picks.length}</h3>
  {(['FW','MF','DF','GK'] as const).map(p=>{const men=d.picks.filter(x=>x.pos===p),owed=Math.max(0,v.rules.minimums[p]-men.length)
   return <div key={p} className="lgm-board-line" data-pos={p}><span className={`${s.mono} lgm-board-pos`}>{SHORT[p]}</span>
    <ol>{men.map(m=><li key={m.id} data-new={m.slot===d.picks.length||undefined}><RumbleShirt card={asCard(m)} side="us" wardrobe={wardrobe}/><b dir="auto">{surname(m.name)}</b><small>{money(m.price)}</small></li>)}
     {Array.from({length:owed},(_,k)=><li key={`o${k}`} data-owed="true" aria-label={`${posName(p)} still to sign`}><i aria-hidden="true"/></li>)}</ol>
   </div>})}
 </section>
}
