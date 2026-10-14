'use client'
import {useEffect,useState} from 'react'

/**
 * THE GOAL! MOMENT (rule 124) — no sound: sun-rays spin in, a white ring blasts out, the burst slams from nothing with a
 * shake, the word drops from three times its size, dots fly. `wide` is the quiet miss: a navy burst slides in, no rays.
 * About 1.8s; reduced motion gets the still frame. Words come from the game (a fixed shout: "Goal!", "Pair!", "Wide!").
 * The game decides when to move on; `onDone` fires once the moment has played.
 */
const DOTS:[number,number,number,string][]=[[-150,-120,22,'var(--mag-yellow)'],[140,-130,18,'var(--mag-white)'],[-170,40,16,'var(--mag-cyan)'],[160,60,24,'var(--mag-yellow)'],[-60,-170,14,'var(--mag-white)'],[70,160,18,'var(--mag-cyan)'],[-120,150,20,'var(--mag-white)'],[30,-180,16,'var(--mag-yellow)']]
export function GoalFx({word,sub,kind='goal',fixed=false,onDone,ms=1800}:{word:string;sub?:string;kind?:'goal'|'wide'|'cyan';fixed?:boolean;onDone?:()=>void;ms?:number}){
 const [on,setOn]=useState(true)
 useEffect(()=>{const t=setTimeout(()=>{setOn(false);onDone?.()},ms);return ()=>clearTimeout(t)},[ms,onDone])
 if(!on)return null
 return <div className={`wk-fx${kind!=='goal'?` ${kind}`:''}${fixed?' fixed':''}`} role="status" aria-live="assertive">
  <span className="wk-fx-rays"/><span className="wk-fx-ring"/>
  {DOTS.map(([dx,dy,s,c],i)=><i key={i} style={{['--dx' as string]:`${dx}px`,['--dy' as string]:`${dy}px`,['--s' as string]:`${s}px`,['--c' as string]:c}}/>)}
  <span className="wk-fx-boom"><span className="wk-fx-word">{word}{sub&&<small>{sub}</small>}</span></span>
 </div>
}
