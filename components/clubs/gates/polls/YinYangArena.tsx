'use client'
import {useEffect,useRef,useState} from 'react'
import type {ClubPlayer} from '@/lib/clubs/contract'
import type {RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {intentOf,keySide,swipeSide} from '@/lib/clubs/polls-duel/swipe'
import type {DuelCandidate,DuelView,Side} from '@/lib/clubs/polls-duel/types'
import {Mark,yearsOf} from './DuelFace'
import css from './duel.module.css'

type T=(k:string,v?:Record<string,string|number>)=>string
export type Phase={out:Side|null;enter:Side|null}
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n))
const typing=(el:EventTarget|null)=>{const e=el as HTMLElement|null;return !!e&&(e.tagName==='INPUT'||e.tagName==='TEXTAREA'||e.tagName==='SELECT'||e.isContentEditable)}

/**
 * The arena: two halves around one core, drawn as a yin–yang on a pitch. The chosen name stays on the side it was chosen on;
 * the other half leaves and a new name comes in on that same side. Laid out PHYSICALLY (dir=ltr): right is right in any
 * page direction. One tap, one swipe or one arrow key is exactly one decision — `locked` swallows the rest during a move.
 */
export function YinYangArena({view,byId,wardrobe,contentLocale,t,phase,locked,crowd,live,onChoose,onUndo}:{
 view:DuelView;byId:ReadonlyMap<string,ClubPlayer>;wardrobe:RumbleWardrobe;contentLocale:string;t:T;phase:Phase;locked:boolean
 crowd:{key:string;text:string}|null;live:string;onChoose:(s:Side)=>void;onUndo:()=>void
}){
 const box=useRef<HTMLDivElement>(null),drag=useRef<{id:number;x:number;y:number;at:number;intent:'h'|'v'|null}|null>(null),swallow=useRef(false)
 const [pull,setPull]=useState(0)
 const choose=(s:Side)=>{if(locked)return;onChoose(s)}
 // arrows are physical; ignored while typing or with a modifier so the browser's own shortcuts keep working
 useEffect(()=>{
  const key=(e:KeyboardEvent)=>{
   if(e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||typing(e.target))return
   const s=keySide(e.key);if(!s)return
   e.preventDefault();choose(s)
  }
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)
 })
 const width=()=>box.current?.getBoundingClientRect().width||360
 function down(e:React.PointerEvent){
  if(locked)return
  if(drag.current){drag.current=null;setPull(0);return} // a second finger cancels, never decides
  if(e.pointerType==='mouse'&&e.button!==0)return
  drag.current={id:e.pointerId,x:e.clientX,y:e.clientY,at:performance.now(),intent:null}
 }
 function move(e:React.PointerEvent){
  const d=drag.current;if(!d||d.id!==e.pointerId)return
  const dx=e.clientX-d.x,dy=e.clientY-d.y
  if(!d.intent){d.intent=intentOf(dx,dy);if(d.intent==='h'){try{box.current?.setPointerCapture(e.pointerId)}catch{/* a capture is a nicety */}}}
  if(d.intent==='h')setPull(clamp(dx/(width()*0.45),-1,1))
  else if(d.intent==='v'){drag.current=null;setPull(0)}
 }
 function up(e:React.PointerEvent){
  const d=drag.current;if(!d||d.id!==e.pointerId)return
  drag.current=null;setPull(0)
  if(d.intent!=='h')return
  const side=swipeSide({dx:e.clientX-d.x,dy:e.clientY-d.y,ms:performance.now()-d.at,width:width()})
  if(side){swallow.current=true;window.setTimeout(()=>{swallow.current=false},350);choose(side)}
 }
 const cancel=()=>{drag.current=null;setPull(0)}
 const click=(s:Side)=>{if(swallow.current)return;choose(s)}

 const w=view.winnerSide,shift=(w==='L'?3:w==='R'?-3:0)+pull*4
 const lean=(s:Side)=>Math.abs(pull)<0.12?undefined:(s==='R'?pull>0:pull<0)
 const round=Math.floor((view.cap-1)/10),roundLen=view.cap-round*10,done=clamp(view.decided-round*10,0,roundLen)
 const half=(s:Side,c:DuelCandidate|null)=>{
  if(!c)return <div className={css.half} data-side={s}/>
  const yrs=yearsOf(c,t),isHolder=view.holderId===c.id&&view.decided>0
  return <button key={c.id} type="button" className={`${css.half} min-h-tap`} data-side={s} data-testid={`duel-${s}`} data-id={c.id} data-lean={lean(s)} data-win={isHolder||undefined}
   data-out={phase.out===s||undefined} data-enter={phase.enter===s||undefined}
   aria-label={t('pc.choose',{name:c.title,side:t(`pc.side.${s}`)})} onClick={()=>click(s)}>
   <span className={css.face}>
    <Mark cand={c} byId={byId} wardrobe={wardrobe}/>
    <span className={css.name} lang={contentLocale} dir="auto">{c.title}</span>
    {yrs&&<span className={css.years}>{yrs}</span>}
    {isHolder&&view.streak>=3&&<span className={css.tag}>{view.streak>=5?t('pc.holder.legend'):t('pc.holder.title')} · {t('pc.holder',{n:view.streak})}</span>}
    {isHolder&&view.streak>0&&view.streak<3&&view.decided>1&&<span className={css.tag}>{t('pc.holder',{n:view.streak})}</span>}
    {!isHolder&&view.decided>0&&<span className={css.tag}>{t('pc.new')}</span>}
   </span>
  </button>
 }
 return <div className={css.arenaWrap}>
  <div className={css.top}>
   <span className={css.count} data-testid="duel-count">{t('pc.count',{n:view.index,m:view.cap})}</span>
   <ol className={css.pips} aria-hidden="true">{Array.from({length:roundLen},(_,i)=><li key={i} className={css.pip} data-on={i<done}/>)}</ol>
  </div>
  <div ref={box} className={css.arena} dir="ltr" role="group" aria-label={t('pc.tab.aria')} data-testid="duel-arena" data-winner={w??undefined}
   onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel} onLostPointerCapture={cancel}>
   <svg className={css.field} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <rect x="-10" y="0" width="120" height="100" fill="var(--mag-card)"/>
    <g className={css.fieldMove} style={{transform:`translateX(${shift}px)`}}>
     <path d="M-10,0 H50 C64,16 36,34 50,50 C64,66 36,84 50,100 H-10 Z" fill="var(--club-primary, var(--mag-vermilion))" stroke="var(--mag-ink)" strokeWidth="3" vectorEffect="non-scaling-stroke"/>
    </g>
   </svg>
   <span className={css.halftone} aria-hidden="true"/>
   <span className={`${css.eye} ${css.eyeL}`} aria-hidden="true"/><span className={`${css.eye} ${css.eyeR}`} aria-hidden="true"/>
   {half('L',view.left)}{half('R',view.right)}
   <span className={css.core} aria-hidden="true"><span className={css.vs}>{t('pc.vs')}</span><span className={css.coreN}>{view.index}</span></span>
  </div>
  <div className={css.meta}>
   <p className={css.crowd} data-key={crowd?.key} data-testid="duel-crowd">{crowd?.text??''}</p>
   <button type="button" className={`${css.ghost} min-h-tap`} onClick={onUndo} disabled={!view.canUndo||locked} data-testid="duel-var">{view.decided>0&&!view.canUndo?t('pc.var.spent'):t('pc.var')}</button>
  </div>
  <p className={css.fine}>{t('pc.hint')}</p>
  <p className={css.live} role="status" aria-live="polite" data-testid="duel-live">{live}</p>
 </div>
}
