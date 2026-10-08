'use client'
import {useEffect,useRef,useState,type ReactNode} from 'react'
import {useDragSource} from '@/components/stage/useDrag'
import css from './lineup.module.css'

export const splitName=(name:string)=>{const p=name.trim().split(/\s+/);return p.length>1?{family:p[p.length-1]!,given:p.slice(0,-1).join(' ')}:{family:name.trim(),given:''}}

/** a mouse on a wide screen may drag any way; a thumb on a rail may only lift a shirt UP (sideways is the rail's own scroll) */
function useFreeDrag(){
 const [free,setFree]=useState(false)
 useEffect(()=>{try{const q=window.matchMedia('(min-width: 901px) and (pointer: fine)');const u=()=>setFree(q.matches);u();q.addEventListener('change',u);return()=>q.removeEventListener('change',u)}catch{/* a drag that cannot be detected is the safe one */}},[])
 return free
}

export type RackLabels={taken:string;aria:(name:string,taken:boolean)=>string}

function Locker({name,taken,held,shirt,labels,onPick,onDrop}:{name:string;taken:boolean;held:boolean;shirt:ReactNode;labels:RackLabels;onPick:(name:string,from:Element|null)=>void;onDrop:(zone:string,name:string)=>void}){
 const ref=useRef<HTMLSpanElement|null>(null),free=useFreeDrag()
 // a man already on the board is not draggable from here — his own shirt on the board is
 const drag=useDragSource({payload:`locker:${name}`,axis:free?'any':'up',disabled:taken,onDrop:(zone)=>onDrop(zone,name)})
 const {family,given}=splitName(name)
 return <li className={css.locker}>
  <button type="button" {...drag} className={`min-h-tap ${css.door}`} data-locker={name} data-taken={taken} data-held={held} aria-label={labels.aria(name,taken)} onClick={()=>onPick(name,ref.current)}>
   <span className={css.hook} aria-hidden="true"/>
   <span ref={ref} className={css.doorShirt}>{shirt}</span>
   <span className={css.doorFamily} dir="auto">{family}</span>
   <span className={css.doorGiven} dir="auto">{taken?labels.taken:(given||' ')}</span>
  </button>
 </li>
}

/** The locker wall: every man of the night hangs on his own peg, in the same shirt. A man on the board stays hung (dimmed) so the rack never reflows. */
export function LockerRack({pool,taken,held,shirtOf,labels,contentLocale,onPick,onDrop,listLabel,grid}:{pool:readonly string[];taken:ReadonlySet<string>;held?:string|null;shirtOf:(name:string)=>ReactNode;labels:RackLabels;contentLocale:string;onPick:(name:string,from:Element|null)=>void;onDrop:(zone:string,name:string)=>void;listLabel:string;grid?:boolean}){
 return <ul className={grid?css.grid:css.racks} lang={contentLocale} aria-label={listLabel} data-testid={grid?'lineup-all':'lineup-rack'}>
  {pool.map(n=><Locker key={n} name={n} taken={taken.has(n)} held={held===n} shirt={shirtOf(n)} labels={labels} onPick={onPick} onDrop={onDrop}/>)}
 </ul>
}
