'use client'
import {useEffect,useMemo,useState,type MouseEvent} from 'react'
import type {GameCopy} from '@/lib/clubs/game-copy'
import type {RumbleCard} from '@/lib/clubs/rumble'
import {reelStrip,reelStops} from '@/lib/clubs/rumble-show'
import type {RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {Bulbs,RumbleShirt,money,posName,posShort,tr,years} from './shared'
import s from './rumble.module.css'

/**
 * The casino reveal (port of the Worker's `RoyalRumbleSlotReveal`, spec §47): every time a slot opens,
 * three reels roll the names of the whole board past a payline, stop left to right, and each one flips
 * over into its card. The strip always ends on the card it covers — the machine cannot land on a lie.
 * Under reduced motion there is no spin: the cards simply are.
 */
const STEP_MS=60

function Reel({names,stopAt,landed,reduced,label}:{names:string[];stopAt:number;landed:boolean;reduced:boolean;label:string}){
 const [go,setGo]=useState(false)
 useEffect(()=>{if(reduced)return;const id=window.requestAnimationFrame(()=>setGo(true));return()=>window.cancelAnimationFrame(id)},[reduced])
 const travel=`translateY(calc(-${names.length-1} * var(--rr-row-h)))`
 return <div className={s.reelCover} data-landed={landed||reduced} aria-hidden="true">
  <span className={`${s.mono} ${s.reelLabel}`}>{label}</span>
  <div className={s.reelWindow}>
   <i className={s.reelPayline}/>
   <div className={s.reelStrip} style={{transform:go?travel:'translateY(0)',transition:go?`transform ${stopAt}ms cubic-bezier(.15,.6,.25,1.06)`:'none'}}>
    {names.map((n,i)=><span key={i} dir="auto">{n}</span>)}
   </div>
  </div>
 </div>
}

export function RumbleCardButton({card,index,selected,disabled,blocked,flip,onPick,copy,wardrobe}:{card:RumbleCard;index:number;selected:boolean;disabled:boolean;blocked:boolean;flip:boolean;onPick:(e:MouseEvent<HTMLButtonElement>)=>void;copy:GameCopy;wardrobe:RumbleWardrobe}){
 const aria=blocked?tr(copy,'rr.cardBlocked',{name:card.name,price:money(card.price)}):tr(copy,'rr.cardAria',{name:card.name,position:posName(copy,card.position),price:money(card.price)})
 return <button type="button" className={`${s.card} mag-pick min-h-tap`} data-flip={flip} aria-pressed={selected} disabled={disabled} aria-label={aria} onClick={onPick} data-testid="rumble-card">
  <i className={s.cardBand}/>
  <span className={s.cardGhost} aria-hidden="true">{index+1}</span>
  <span className={s.cardBody}>
   <span className={s.cardTop}>
    <span><span className={`${s.mono} ${s.cardEntry}`} style={{display:'block'}}>{tr(copy,'rr.entry',{n:String(index+1).padStart(2,'0')})}</span><span className={`${s.mono} ${s.cardPos}`}>{posShort(copy,card.position)}</span></span>
    <span className={s.price} dir="ltr">{money(card.price)}</span>
   </span>
   {card.price===5&&<span className={`${s.mono} ${s.legendTag}`}>{tr(copy,'rr.legend')}</span>}
   <span className={s.cardShirt}><RumbleShirt card={card} side="us" wardrobe={wardrobe}/></span>
   <span className={s.cardName} dir="auto">{card.name}</span>
   <span><span className={s.cardYearsLabel}>{tr(copy,'rr.years')}</span><span className={`${s.mono} ${s.cardYears}`} dir="ltr">{years(copy,card)}</span></span>
   <span className={s.bars} aria-hidden="true">{Array.from({length:5},(_,i)=><i key={i} data-on={i<card.price}/>)}</span>
  </span>
  {selected&&<span className={`${s.mono} ${s.inFive}`}>{tr(copy,'rr.inFive')}</span>}
 </button>
}

export function RumbleSlotMachine({board,slot,seed,picks,canPick,onPick,copy,wardrobe,reduced,signature}:{board:RumbleCard[][];slot:number;seed:number;picks:(string|null)[];canPick:(card:RumbleCard)=>boolean;onPick:(card:RumbleCard,e:MouseEvent<HTMLButtonElement>)=>void;copy:GameCopy;wardrobe:RumbleWardrobe;reduced:boolean;signature:string}){
 const cards=useMemo(()=>board[slot]??[],[board,slot])
 const stops=useMemo(()=>reelStops(cards.length,reduced,420,180),[cards.length,reduced])
 const strips=useMemo(()=>cards.map((_,i)=>reelStrip(board,slot,i,seed,Math.max(6,Math.round((stops[i]||420)/STEP_MS/1.4)))),[board,slot,seed,cards,stops])
 const [landed,setLanded]=useState<boolean[]>(()=>cards.map(()=>reduced))
 useEffect(()=>{
  if(reduced){setLanded(cards.map(()=>true));return}
  setLanded(cards.map(()=>false))
  const timers=stops.map((ms,i)=>window.setTimeout(()=>setLanded(prev=>{const next=[...prev];next[i]=true;return next}),ms+40))
  return()=>timers.forEach(t=>window.clearTimeout(t))
  // a new signature is a new spin
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[signature,reduced])
 const spinning=landed.some(l=>!l)
 const card=cards[0]
 return <section className={s.cabinet} data-spinning={spinning} data-testid="rumble-machine" aria-busy={spinning}>
  <div className={s.marquee}><Bulbs n={9} className={s.bulbs}/><span className={s.marqueeTitle}>{tr(copy,'gate.royal-rumble')}</span><Bulbs n={9} className={s.bulbs}/></div>
  <div className={s.pickHead}>
   <span className={s.pickNo} dir="ltr">{String(slot+1).padStart(2,'0')}</span>
   <div className={s.pickText}><p className={`${s.mono} ${s.pickMeta}`}>{tr(copy,'rr.pick',{n:slot+1})} · {card?posShort(copy,card.position):''}</p><p className={s.pickQ}>{card?tr(copy,'rr.question',{position:posName(copy,card.position)}):''}</p></div>
  </div>
  <p className="sr-only" aria-live="polite">{spinning?tr(copy,'rr.reels'):''}</p>
  <div className={s.reels} role="group" aria-label={card?tr(copy,'rr.question',{position:posName(copy,card.position)}):undefined}>
   {cards.map((c,i)=><div className={s.reel} key={`${signature}-${c.id}`}>
    {!reduced&&<Reel names={strips[i]!} stopAt={stops[i]!} landed={!!landed[i]} reduced={reduced} label={landed[i]?tr(copy,'rr.landed'):tr(copy,'rr.spinning')}/>}
    <RumbleCardButton card={c} index={i} selected={picks[slot]===c.id} disabled={!canPick(c)||!landed[i]} blocked={!canPick(c)} flip={!!landed[i]&&!reduced} onPick={e=>onPick(c,e)} copy={copy} wardrobe={wardrobe}/>
   </div>)}
  </div>
 </section>
}
