'use client'
import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react'
import type {GameCopy} from '@/lib/clubs/game-copy'
import {goalPos,screenPosFor,type ShowEvent,type ShowPlayer,type ShowScript,type Side} from '@/lib/clubs/rumble-show'
import type {RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {Bulbs,RumbleShirt,money,posShort,shortName,tr,type Sfx} from './shared'
import s from './rumble.module.css'

/* ---------------------------------------------------------------- the pitch both fives stand on (port of RumblePitchFive) */

function Token({p,shown,active,pulse,wardrobe,copy,dense,carrier}:{p:ShowPlayer;shown:boolean;active:boolean;pulse:boolean;wardrobe:RumbleWardrobe;copy:GameCopy;dense:boolean;carrier?:boolean}){
 const at=screenPosFor(p,dense)
 return <div className={s.token} style={{insetInlineStart:`${at.x}%`,insetBlockStart:`${at.y}%`}} data-shown={shown} data-active={active} data-carrier={carrier||undefined} data-pulse={pulse} data-side={p.side} data-dense={dense||undefined} data-testid={`rumble-token-${p.side}`}>
  <div className={s.tokenBody}>
   <span className={s.tokenShirt}><RumbleShirt card={p} side={p.side} wardrobe={wardrobe}/></span>
   <span className={s.tokenName} dir="auto">{shortName(p.name)}</span>
   <span className={`${s.mono} ${s.tokenPos}`}>{p.slot?tr(copy,`rr.fines.${p.slot}`):posShort(copy,p.position)}</span>
  </div>
 </div>
}

export function RumblePitch({us,them,usCount,themCount,wardrobe,copy,active,ball,pulse=false,children,trail}:{us:ShowPlayer[];them:ShowPlayer[];usCount:number;themCount:number;wardrobe:RumbleWardrobe;copy:GameCopy;active?:{side:Side;id:string}|null;ball?:{x:number;y:number}|null;pulse?:boolean;children?:ReactNode;/** the last few touches, drawn as the ball's path */trail?:{x:number;y:number;side:Side}[]}){
 const dense=us.length>6
 return <div className={s.pitch} data-testid="rumble-pitch" data-dense={dense||undefined}>
  {['half','circle','box-top','box-bottom','goal-top','goal-bottom'].map(l=><i key={l} data-line={l}/>)}
  {us.map((p,i)=><Token key={`us-${p.id}`} p={p} shown={i<usCount} active={active?.side==='us'&&active.id===p.id} pulse={pulse} wardrobe={wardrobe} copy={copy} dense={dense}/>)}
  {them.map((p,i)=><Token key={`them-${p.id}`} p={p} shown={i<themCount} active={active?.side==='them'&&active.id===p.id} pulse={false} wardrobe={wardrobe} copy={copy} dense={dense}/>)}
  {trail&&trail.length>1&&<svg className={s.ballPath} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points={trail.map(t=>`${t.x},${t.y}`).join(' ')} data-side={trail[trail.length-1]!.side}/></svg>}
  {ball&&<span className={s.ball} style={{insetInlineStart:`${ball.x}%`,insetBlockStart:`${ball.y}%`}} aria-hidden="true"/>}
  {children}
 </div>
}

/* ---------------------------------------------------------------- your entrance, theirs, head to head */

const ARRIVAL_MS=[520,580,640,640,700]
export type RevealStep='entrance'|'five'|'opponent'|'h2h'
/**
 * GK → DF → MF → MF → FW walk on one at a time, the five breathes once, then theirs (300 ms each),
 * then both bills under one VS. The opponent was fixed before the first pick: nothing here reacts.
 * Reduced motion: everyone is stamped into place and each step simply holds.
 */
export function RumbleReveal({script,step,onStep,onDone,wardrobe,copy,reduced}:{script:ShowScript;step:RevealStep;onStep:(s:RevealStep)=>void;onDone:()=>void;wardrobe:RumbleWardrobe;copy:GameCopy;reduced:boolean}){
 const [usCount,setUs]=useState(reduced?script.us.length:0),[themCount,setThem]=useState(reduced?script.them.length:0)
 useEffect(()=>{
  const t:number[]=[],at=(ms:number,f:()=>void)=>t.push(window.setTimeout(f,ms))
  if(step==='entrance'){
   if(reduced){setUs(script.us.length);at(900,()=>onStep('five'))}
   else if(usCount<script.us.length)at(script.us.length>6?230:(ARRIVAL_MS[usCount]??600),()=>setUs(n=>n+1))
   else at(80,()=>onStep('five'))
  }else if(step==='five')at(reduced?900:1000,()=>onStep('opponent'))
  else if(step==='opponent'){
   if(reduced){setThem(script.them.length);at(900,()=>onStep('h2h'))}
   else if(themCount<script.them.length)at(script.them.length>6?150:300,()=>setThem(n=>n+1))
   else at(500,()=>onStep('h2h'))
  }else at(reduced?1400:1800,onDone)
  return()=>t.forEach(id=>window.clearTimeout(id))
  // the parent only ever moves the step forward
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[step,usCount,themCount,reduced])
 const ours=step==='entrance'||step==='five'
 const arrived=script.us[Math.min(usCount,script.us.length)-1]
 return <section className={s.stage} data-testid="rumble-reveal" data-step={step}>
  <div className={s.showGrid}>
   <div className={s.showHead}>
    <p className={`${s.mono} ${s.stageKicker}`}>{tr(copy,ours?'rr.entranceKicker':step==='opponent'?'rr.opponentKicker':'rr.h2h')}</p>
    <h2 className={s.stageTitle}>{tr(copy,step==='five'?'rr.entranceFive':ours?'rr.entranceTitle':step==='opponent'?'rr.opponentTitle':'rr.h2h')}</h2>
    <p className={s.stageLine} aria-live="polite">{step==='entrance'&&arrived?<><span className={s.mono}>{posShort(copy,arrived.position)}</span> · <bdi>{arrived.name}</bdi></>:''}</p>
    <Bulbs n={15} className={`${s.bulbs} ${s.stageBulbs}`}/>
   </div>
   <div className={s.showPitch}><RumblePitch us={script.us} them={ours?[]:script.them} usCount={usCount} themCount={themCount} wardrobe={wardrobe} copy={copy} pulse={step==='five'}/></div>
   <div className={s.showSide}>{step==='h2h'&&<div className={s.bills}><p dir="ltr">{money(script.bills.us)}</p><span className={s.vs}>{tr(copy,'rr.vs')}</span><p dir="ltr">{money(script.bills.them)}</p></div>}</div>
  </div>
 </section>
}

/* ---------------------------------------------------------------- shared helpers of the match screens */

export const findPlayer=(script:ShowScript,side:Side,id:string|undefined)=>id?(side==='us'?script.us:script.them).find(p=>p.id===id):undefined
export function eventLine(copy:GameCopy,script:ShowScript,e:ShowEvent):string{
 const def:Side=e.side==='us'?'them':'us',name=(id?:string,side:Side=e.side)=>{const p=findPlayer(script,side,id);return p?shortName(p.name):''}
 return tr(copy,`rr.${e.type}.${e.variant}`,{name:name(e.player),keeper:name(e.keeper,def),other:name(e.other,def)})
}
