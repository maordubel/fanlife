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
 return <span className="lgm-bd-reel" data-spinning={spinning||undefined}><b>{shown}</b></span>
}
export function BudgetDraw({budget,busy,onPull,onOpen}:{budget:number|null;busy:boolean;onPull:()=>void;onOpen:()=>void}){
 const reduced=useReducedMotion(),[pulled,setPulled]=useState(false),[settled,setSettled]=useState(false)
 const drawn=budget!==null,spinning=pulled&&!settled
 const timer=useRef<number>()
 useEffect(()=>{
  if(!pulled||!drawn){setSettled(false);return}
  timer.current=window.setTimeout(()=>setSettled(true),reduced?0:900)
  return()=>window.clearTimeout(timer.current)
 },[pulled,drawn,reduced])
 const text=(budget??LEGENDS_RULES.initialDraftBudgetM).toFixed(1),[whole,tenth]=text.split('.') as [string,string]
 const pull=()=>{if(pulled||busy)return;setPulled(true);onPull()}
 return <section className="lgm-bd" aria-labelledby="lgm-bd-h" data-testid="legends-budget-draw">
  <p className="lgm-kicker">The board meets</p>
  <h2 id="lgm-bd-h">Draw your budget</h2>
  <p className="lgm-fine">The board never gives less than €{LEGENDS_RULES.initialDraftBudgetM-2}M and never more than €{LEGENDS_RULES.initialDraftBudgetM}M. Pull the lever.</p>
  <div className="lgm-bd-machine" data-pulled={pulled||undefined}>
   <div className="lgm-bd-window" role="img" aria-label={settled?`Budget drawn: €${text} million`:'The budget reels'} aria-live="polite">
    <span className="lgm-bd-eur" aria-hidden="true">€</span>
    <Reel value={whole[0]!} spinning={spinning} delay={0}/><Reel value={whole[1]!} spinning={spinning} delay={reduced?0:260}/>
    <span className="lgm-bd-dot" aria-hidden="true">.</span>
    <Reel value={tenth} spinning={spinning} delay={reduced?0:520}/><span className="lgm-bd-eur" aria-hidden="true">M</span>
   </div>
   <button type="button" className="lgm-bd-lever min-h-tap" onClick={pull} disabled={pulled||busy} aria-label="Pull the lever"><i aria-hidden="true"/><span>{pulled?'Drawing…':'Pull'}</span></button>
  </div>
  {settled?<p className="lgm-actions"><button type="button" className="lgm-go lgm-go-big min-h-tap" onClick={onOpen} data-testid="legends-budget-open">Open the draft with €{text}M</button></p>:null}
 </section>
}
