'use client'
import {useEffect,useRef,useState} from 'react'
import {useReducedMotion} from '@/components/clubs/rumble/shared'
import {LEGENDS_RULES} from '@/lib/legends/config'

/**
 * The opening slot machine (owner, 14.10.2026): the manager pulls the lever and the board's budget is drawn — never more than the
 * standard €52M and never more than €2M under it. The draw itself is the server's (`budget-draw`); this screen spins three
 * reels while the answer travels, lands them on the drawn figure one by one, and waits for the manager to open the draft.
 */
const DIGITS='0123456789'
function Reel({value,spinning,delay}:{value:string;spinning:boolean;delay:number}){
 const [shown,setShown]=useState(value)
 useEffect(()=>{
  if(!spinning){const t=window.setTimeout(()=>setShown(value),delay);return()=>window.clearTimeout(t)}
  const t=window.setInterval(()=>setShown(DIGITS[Math.floor(Math.random()*10)]!),70)
  return()=>window.clearInterval(t)
 },[spinning,value,delay])
 return <span className="lgm-slot-reel" data-spinning={spinning||undefined}><b>{shown}</b></span>
}
/**
 * 18.11.2026 (owner: "the lever is not clear"): its own class family (it had shared `.lgm-bd` with the match board, whose dark
 * styling landed on it), a lever you can see and pull — tap it or drag the knob down — a big button under it that does the
 * same, a nudge arrow until it is pulled, and the range bar that shows where the draw landed between the floor and the top.
 */
export function BudgetDraw({budget,busy,onPull,onOpen}:{budget:number|null;busy:boolean;onPull:()=>void;onOpen:()=>void}){
 const reduced=useReducedMotion(),[pulled,setPulled]=useState(false),[settled,setSettled]=useState(false),[drag,setDrag]=useState(0)
 const drawn=budget!==null,spinning=pulled&&!settled
 const timer=useRef<number>(),from=useRef<number|null>(null)
 useEffect(()=>{
  if(!pulled||!drawn){setSettled(false);return}
  timer.current=window.setTimeout(()=>setSettled(true),reduced?0:1100)
  return()=>window.clearTimeout(timer.current)
 },[pulled,drawn,reduced])
 const top=LEGENDS_RULES.initialDraftBudgetM,floor=top-2
 const text=(budget??top).toFixed(1),[whole,tenth]=text.split('.') as [string,string]
 const pull=()=>{if(pulled||busy)return;setPulled(true);setDrag(0);onPull()}
 const at=settled&&budget!==null?Math.max(0,Math.min(1,(budget-floor)/(top-floor))):null
 return <section className="lgm-slot" aria-labelledby="lgm-slot-h" data-testid="legends-budget-draw" data-state={settled?'done':pulled?'spinning':'ready'}>
  <header className="lgm-slot-head">
   <p className="lgm-kicker">Step 1 of 2 · The board meets</p>
   <h2 id="lgm-slot-h">Draw your budget</h2>
   <p className="lgm-slot-rule">Between <b>€{floor}M</b> and <b>€{top}M</b>. Pull the lever to find out.</p>
  </header>
  <div className="lgm-slot-machine" data-pulled={pulled||undefined}>
   <div className="lgm-slot-window" role="img" aria-label={settled?`Budget drawn: €${text} million`:'The budget reels'} aria-live="polite">
    <span className="lgm-slot-sym" aria-hidden="true">€</span>
    <Reel value={whole[0]!} spinning={spinning} delay={0}/><Reel value={whole[1]!} spinning={spinning} delay={reduced?0:300}/>
    <span className="lgm-slot-sym lgm-slot-dot" aria-hidden="true">.</span>
    <Reel value={tenth} spinning={spinning} delay={reduced?0:600}/><span className="lgm-slot-sym" aria-hidden="true">M</span>
   </div>
   <button type="button" className="lgm-slot-lever" onClick={pull} disabled={pulled||busy} aria-label="Pull the lever"
    style={{['--pull' as string]:pulled?1:drag}}
    onPointerDown={e=>{if(pulled||busy)return;from.current=e.clientY;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)}}
    onPointerMove={e=>{if(from.current===null)return;setDrag(Math.max(0,Math.min(1,(e.clientY-from.current)/90)))}}
    onPointerUp={()=>{const d=drag;from.current=null;if(d>.55)pull();else setDrag(0)}}
    onPointerCancel={()=>{from.current=null;setDrag(0)}}>
    <span className="lgm-slot-track" aria-hidden="true"/><span className="lgm-slot-stick" aria-hidden="true"><i/></span>
    {!pulled?<span className="lgm-slot-hint" aria-hidden="true">↓</span>:null}
   </button>
  </div>
  {at!==null?<div className="lgm-slot-range" aria-hidden="true"><span>€{floor}M</span><div><u style={{insetInlineStart:`${at*100}%`}}/></div><span>€{top}M</span></div>:null}
  {settled
   ?<p className="lgm-slot-cta"><button type="button" className="lgm-go lgm-go-big min-h-tap" onClick={onOpen} data-testid="legends-budget-open">Step 2 · Draft your squad with €{text}M</button></p>
   :<p className="lgm-slot-cta"><button type="button" className="lgm-slot-pull min-h-tap" onClick={pull} disabled={pulled||busy}>{pulled?'The reels are turning…':'Pull the lever'}</button></p>}
 </section>
}
