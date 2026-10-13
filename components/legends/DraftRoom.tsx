'use client'
import {useEffect,useMemo,useRef,useState,type MouseEvent} from 'react'
import type {CardView,CareerView} from '@/lib/legends/view'
import type {RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {reelStops} from '@/lib/clubs/rumble-show'
import {LEGENDS_RULES} from '@/lib/legends/config'
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
 *
 * Speed (owner, 13.10.2026: "it is very slow until each slot loads"): the reels start spinning THE MOMENT the tap lands, while
 * the server is still answering, and land quickly once the next three arrive — the wait is the spin, not a pause before it. A
 * tap on a spinning reel lands all three at once. Under reduced motion there are no reels at all.
 */
type Send=(a:Record<string,unknown>,ok?:string)=>void
type Offer=NonNullable<CareerView['draft']>['offers'][number]
const SHORT:Record<string,string>={GK:'GK',DF:'DEF',MF:'MID',FW:'FWD'}
const QUESTION:Record<string,string>={GK:'Who keeps goal?',DF:'Who holds the line?',MF:'Who runs the middle?',FW:'Who scores the goals?'}
const TIER:Record<string,string>={premium:'Premium',mid:'Squad',budget:'Bargain'}
const SPINS=LEGENDS_RULES.rerollsPerDraft
const surname=(n:string)=>{const p=n.trim().split(/\s+/);return p.length>1?p[p.length-1]!:n}
const asCard=(c:Pick<CardView,'id'|'from'|'to'>)=>({id:c.id,fromYear:c.from,toYear:c.to})
const tenths=(n:number)=>Math.round(n*10)/10

export function DraftRoom({v,busy,send,wardrobe}:{v:CareerView;busy:boolean;send:Send;wardrobe:RumbleWardrobe}){
 const d=v.draft!,done=d.picks.length>=d.required&&!d.optionalOpen,reduced=useReducedMotion()
 const offers=d.offers,signature=`${d.slot}:${d.group}:${offers.map(o=>o.id).join(',')}`
 // a tap was sent and the next three are not here yet: the reels already spin
 const [pending,setPending]=useState(false)
 const seen=useRef(signature),warm=useRef(false)
 if(seen.current!==signature){seen.current=signature;warm.current=true}
 // the first deal of a visit lands at an easy pace; a deal the manager is waiting for lands fast — the reels have been turning
 const stops=useMemo(()=>warm.current?reelStops(offers.length,reduced,240,120):reelStops(offers.length,reduced,420,150),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [signature,reduced])
 const pool=d.strip.length?d.strip:offers.map(x=>x.name)
 const strips=useMemo(()=>offers.map((o,i)=>{const n=Math.max(5,Math.round((stops[i]||300)/70));return [...Array.from({length:n},(_,k)=>pool[(k*3+i*5)%pool.length]!),o.name]}),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [signature,stops])
 const [landed,setLanded]=useState<boolean[]>(()=>offers.map(()=>reduced))
 useEffect(()=>{
  setPending(false)
  if(reduced){setLanded(offers.map(()=>true));return}
  setLanded(offers.map(()=>false))
  const t=stops.map((ms,i)=>window.setTimeout(()=>setLanded(p=>{const n=[...p];n[i]=true;return n}),ms+30))
  return()=>t.forEach(x=>window.clearTimeout(x))
  // a new deal is a new spin
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[signature,reduced])
 // the server refused (or answered with the same deal): stop spinning
 useEffect(()=>{if(!busy)setPending(false)},[busy])
 const spinning=pending||landed.some(l=>!l)
 const landAll=()=>{if(!pending&&landed.some(l=>!l))setLanded(offers.map(()=>true))}
 // the rail: every slot of the order, signed ones by name, the current one lit
 const order=[...d.picks.map(p=>({pos:p.pos,name:surname(p.name),filled:true})),...d.upcoming.map(p=>({pos:p,name:'',filled:false}))]
 const current=d.picks.length
 const railRef=useRef<HTMLOListElement>(null)
 useEffect(()=>{railRef.current?.querySelector('[aria-current="step"]')?.scrollIntoView({block:'nearest',inline:'center',behavior:reduced?'auto':'smooth'})},[current,reduced])
 const sign=(o:Offer,e:MouseEvent<HTMLButtonElement>)=>{
  firePickFxAt(e.currentTarget,{label:money(o.price),tone:'red',haptic:o.price>=5?'lock':'tap',big:o.price>=5})
  if(!reduced)setPending(true)
  send({kind:'draft',move:{kind:'pick',id:o.id}},`${o.name} signed for ${money(o.price)}.`)
 }
 const reroll=(e:MouseEvent<HTMLButtonElement>)=>{
  firePickFxAt(e.currentTarget,{tone:'ink',haptic:'tap'})
  if(!reduced)setPending(true)
  send({kind:'draft',move:{kind:'reroll'}},'Three new men on the table.')
 }
 const quota=(['GK','DF','MF','FW'] as const).map(p=>({p,have:d.picks.filter(x=>x.pos===p).length,need:v.rules.minimums[p]}))
 const spent=SPINS-d.rerollsLeft
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
   <div className={`${s.reels} lgm-reels`} role="group" aria-label={QUESTION[d.group]} onClick={e=>{if((e.target as HTMLElement).closest('[data-landed="false"]'))landAll()}}>
    {offers.map((o,i)=><div className={s.reel} key={`${signature}-${o.id}`}>
     {pending?<LoopReel names={pool} i={i}/>:!reduced&&<SlotReel names={strips[i]!} stopAt={stops[i]!} landed={!!landed[i]} reduced={reduced} label={landed[i]?'Landed':'Spinning'}/>}
     <OfferCard o={o} i={i} left={d.left} wardrobe={wardrobe} flip={!!landed[i]&&!reduced&&!pending} disabled={busy||pending||!!o.locked||!landed[i]} onPick={e=>sign(o,e)}/>
    </div>)}
   </div>
  </section>:null}
  {d.stuck?<p className="lgm-error" role="alert">No line can be dealt for this pick. The owner has been shown why in the control room.</p>:null}

  {!done?<div className={`${s.chips} lgm-draft-chips`}>
   <button type="button" className={`${s.chip} min-h-tap lgm-spin`} disabled={busy||spinning||!d.group||d.rerollsLeft<=0} onClick={reroll} data-testid="legends-reroll"
    aria-label={`Spin again — ${d.rerollsLeft} of ${SPINS} spins left`}>
    <span>Spin again</span>
    <span className="lgm-spin-count"><span className="lgm-spin-pips" aria-hidden="true">{Array.from({length:SPINS},(_,k)=><i key={k} data-used={k<spent||undefined}/>)}</span><b dir="ltr">{d.rerollsLeft}/{SPINS}</b></span>
   </button>
   {d.optionalOpen?<button type="button" className={`${s.chip} min-h-tap`} disabled={busy} onClick={()=>send({kind:'draft',move:{kind:'skip'}},'Seventeen it is.')}><span>Keep seventeen</span></button>:null}
  </div>:null}

  {done||d.optionalOpen?<div className="lgm-confirm">
   <p><b>Spent {money(d.spent)} of €{LEGENDS_RULES.initialDraftBudgetM}M.</b> On confirming, the board adds a one-off <b>€{LEGENDS_RULES.firstBoardGrantM}M</b>: your window starts with {money(tenths(LEGENDS_RULES.initialDraftBudgetM-d.spent+LEGENDS_RULES.firstBoardGrantM))}.</p>
   {d.canConfirm&&done?<p className="lgm-error" role="alert">{d.canConfirm}</p>:null}
   <button type="button" className={`${s.lock} min-h-tap lgm-register`} data-ready={!d.canConfirm} disabled={busy||!!d.canConfirm} onClick={e=>{firePickFxAt(e.currentTarget,{label:'Registered',tone:'red',big:true,haptic:'lock'});send({kind:'draft-confirm'},'The squad is registered.')}}><span><small>{d.picks.length} men · {money(d.spent)}</small><strong>Register the squad</strong></span><span aria-hidden="true">→</span></button>
  </div>:null}

  <Board v={v} wardrobe={wardrobe}/>
  <p className="lgm-fine">{GAME_VALUES}</p>
 </section>
}

/** while the server answers: the line's names roll past the payline, round and round, until the next three arrive */
function LoopReel({names,i}:{names:string[];i:number}){
 const rows=useMemo(()=>{const n=Math.min(8,Math.max(4,names.length)),pick=Array.from({length:n},(_,k)=>names[(k*5+i*3)%names.length]!);return [...pick,...pick]},[names,i])
 return <div className={`${s.reelCover} lgm-loop`} aria-hidden="true">
  <span className={`${s.mono} ${s.reelLabel}`}>Spinning</span>
  <div className={s.reelWindow}>
   <i className={s.reelPayline}/>
   <div className={`${s.reelStrip} lgm-loop-strip`} style={{['--lgm-loop-rows' as string]:String(rows.length/2),animationDelay:`${-i*90}ms`}}>{rows.map((n,k)=><span key={k} dir="auto">{n}</span>)}</div>
  </div>
 </div>
}

/** a lock in eight strokes — drawn here, no icon font */
const Lock=()=><svg className="lgm-lockicon" viewBox="0 0 12 14" aria-hidden="true"><path d="M3 6V4.2a3 3 0 0 1 6 0V6" fill="none" stroke="currentColor" strokeWidth="1.8"/><rect x="1" y="6" width="10" height="7.5" fill="currentColor"/></svg>

/** one man on the payline, in the Royal Rumble card: shirt of his years, stars, his line's attributes, the price as bars */
function OfferCard({o,i,left,wardrobe,flip,disabled,onPick}:{o:Offer;i:number;left:number;wardrobe:RumbleWardrobe;flip:boolean;disabled:boolean;onPick:(e:MouseEvent<HTMLButtonElement>)=>void}){
 const attrs=(ROLE_ATTRS[o.pos]??[]).slice(0,3)
 return <div className="lgm-offer">
  <button type="button" className={`${s.card} mag-pick min-h-tap`} data-flip={flip} disabled={disabled} onClick={onPick} data-testid="legends-card" data-tier={o.tier} data-locked={o.locked?'true':undefined}
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
  {o.locked?<Short o={o} left={left}/>:null}
 </div>
}
/**
 * Why a man cannot be signed, in a glance (owner, 13.10.2026: "graphically and briefly"): a lock, how far short you are, and
 * a bar — the budget you have against his price. When the money is there but the seventeen would not fit, the chip says so in
 * three words; the server's full reason stays the card's accessible name and the chip's title.
 */
function Short({o,left}:{o:Offer;left:number}){
 const gap=tenths(o.price-left),money_=gap>0,pct=Math.max(0,Math.min(100,left/o.price*100))
 return <p className="lgm-short" role="note" title={o.locked??undefined} data-kind={money_?'money':'quota'}>
  <span className="lgm-short-chip"><Lock/><b dir="ltr">{money_?`${money(gap)} short`:'17 won’t fit'}</b></span>
  {money_?<span className="lgm-short-bar" aria-hidden="true"><i style={{inlineSize:`${pct}%`}}/></span>:null}
  <span className="sr-only">{o.locked}</span>
 </p>
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
