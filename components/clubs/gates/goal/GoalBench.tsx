'use client'
import {useEffect,useState,type ReactNode} from 'react'
import {useDragSource} from '@/components/stage/useDrag'
import {REPLAY_ACTIONS,type ReplayAction} from '@/lib/game/replay/vocab'
import css from './goal.module.css'

const splitName=(name:string)=>{const p=name.trim().split(/\s+/);return p.length>1?{family:p[p.length-1]!,given:p.slice(0,-1).join(' ')}:{family:name.trim(),given:''}}

/** a mouse on a wide screen may drag any way; a thumb on a row may only lift a shirt UP (sideways is the row's own scroll) */
function useFreeDrag(){
 const [free,setFree]=useState(false)
 useEffect(()=>{try{const q=window.matchMedia('(min-width: 901px) and (pointer: fine)');const u=()=>setFree(q.matches);u();q.addEventListener('change',u);return()=>q.removeEventListener('change',u)}catch{/* a drag that cannot be detected is the safe one */}},[])
 return free
}

function Peg({name,label,sub,selected,disabled,shirt,aria,onPick,onDrop}:{name:string;label:string;sub:string;selected:boolean;disabled:boolean;shirt:ReactNode;aria:string;onPick:(name:string)=>void;onDrop:(zone:string,name:string)=>void}){
 const free=useFreeDrag()
 const drag=useDragSource({payload:`bench:${name}`,axis:free?'any':'up',disabled,onDrop:zone=>onDrop(zone,name)})
 return <li className={css.peg}>
  <button type="button" {...drag} className={`min-h-tap ${css.door}`} data-actor={name} data-selected={selected} aria-pressed={selected} aria-label={aria} disabled={disabled} onClick={()=>onPick(name)}>
   <span className={css.doorShirt}>{shirt}</span>
   <span className={css.doorFamily} dir="auto">{label}</span>
   <span className={css.doorGiven} dir="auto">{sub||' '}</span>
  </button>
 </li>
}

/** WHO: the room of names for this goal, in the shirt of the night — plus the report's "unnamed" man. */
export function GoalBench({pool,selected,disabled,shirtOf,unnamedShirt,unnamed,ariaOf,listLabel,contentLocale,onPick,onDrop}:{pool:readonly string[];selected:string|null;disabled:boolean;shirtOf:(name:string)=>ReactNode;unnamedShirt:ReactNode;unnamed:string;ariaOf:(name:string)=>string;listLabel:string;contentLocale:string;onPick:(name:string)=>void;onDrop:(zone:string,name:string)=>void}){
 return <ul className={css.bench} lang={contentLocale} aria-label={listLabel} data-testid="goal-bench">
  {pool.map(n=>{const {family,given}=splitName(n);return <Peg key={n} name={n} label={family} sub={given} selected={selected===n} disabled={disabled} shirt={shirtOf(n)} aria={ariaOf(n)} onPick={onPick} onDrop={onDrop}/>})}
  <Peg name="" label={unnamed} sub="" selected={selected===''} disabled={disabled} shirt={unnamedShirt} aria={ariaOf('')} onPick={onPick} onDrop={onDrop}/>
 </ul>
}

/** WHAT: the seven verbs a touch can be. */
export function VerbRow({value,label,onPick,disabled,listLabel}:{value:ReplayAction|null;label:(a:ReplayAction)=>string;onPick:(a:ReplayAction)=>void;disabled?:boolean;listLabel:string}){
 return <div className={css.verbs} role="group" aria-label={listLabel} data-testid="goal-verbs">
  {REPLAY_ACTIONS.map(a=><button key={a} type="button" className={`min-h-tap ${css.verb}`} data-verb={a} aria-pressed={value===a} disabled={disabled} onClick={()=>onPick(a)}>{label(a)}</button>)}
 </div>
}
