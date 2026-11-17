'use client'
import type {PlayLog} from '@/lib/clubs/rumble-play'
import s from './rumble.module.css'

/**
 * Momentum (17.11.2026 — brought over from LEGENDS MANAGER's match board, owner: "everything you learned, in the Royal Rumble,
 * as it fits"): who had the game, five minutes at a time, read from the moves the server staged. Above the line your side,
 * below theirs; goals weigh most, then shots on target, the post, the rest, a corner a little. Only up to `minute`.
 */
const W:Partial<Record<string,number>>={goal:3,save:1.4,post:1.2,miss:.7,block:.6,corner:.4}
export function RumbleMomentum({play,minute=90,us,them,label}:{play:PlayLog;minute?:number;us:string;them:string;label:string}){
 const bars:number[]=[]
 for(let a=0;a<90;a+=5){let v=0;for(const m of play.moves)if(m.minute>a&&m.minute<=a+5&&m.minute<=minute)v+=(m.side==='us'?1:-1)*(W[m.end]??0);bars.push(v)}
 const max=Math.max(3,...bars.map(Math.abs))
 return <figure className={s.momentum} aria-label={label} data-testid="rumble-momentum">
  <svg viewBox="0 0 108 40" preserveAspectRatio="none" aria-hidden="true">
   <line x1="0" y1="20" x2="108" y2="20"/><line className={s.momentumHt} x1="54" y1="2" x2="54" y2="38"/>
   {bars.map((v,i)=>v?<rect key={i} data-side={v>0?'us':'them'} x={i*6+.8} width="4.4" y={v>0?20-18*v/max:20} height={18*Math.abs(v)/max}/>:null)}
  </svg>
  <figcaption><span dir="auto">{us}</span><span>{label}</span><span dir="auto">{them}</span></figcaption>
 </figure>
}
/** the same five bands LEGENDS MANAGER colours a match rating in */
export const gradeBand=(g:number)=>g>=8?'great':g>=7?'good':g>=6.3?'ok':g>=5.6?'low':'poor'
