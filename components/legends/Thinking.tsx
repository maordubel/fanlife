'use client'
import {useEffect,useState} from 'react'
import {Portal} from './Sheet'

/**
 * A percentage whenever the system is thinking (owner, 14.10.2026). The server cannot report progress, so the figure is an honest
 * estimate: it climbs quickly, slows towards 90% and holds there until the answer arrives, then jumps to 100% and leaves. A
 * wait under 450ms shows nothing at all — a flash of a loader is worse than none.
 */
export function Thinking({active,label='Thinking'}:{active:boolean;label?:string}){
 const [on,setOn]=useState(false),[pct,setPct]=useState(0)
 useEffect(()=>{
  if(!active){
   if(!on)return
   setPct(100);const t=window.setTimeout(()=>{setOn(false);setPct(0)},260);return()=>window.clearTimeout(t)
  }
  const show=window.setTimeout(()=>{setOn(true);setPct(8)},450)
  return()=>window.clearTimeout(show)
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[active])
 useEffect(()=>{
  if(!on||!active)return
  const t=window.setInterval(()=>setPct(p=>p>=90?p:p+Math.max(1,Math.round((90-p)/9))),140)
  return()=>window.clearInterval(t)
 },[on,active])
 if(!on)return null
 return <Portal><div className="lgm-think z-[70]" role="status" aria-live="polite" aria-label={`${label} ${pct}%`}>
  <div className="lgm-think-card"><p className="lgm-kicker">{label}…</p><b className="lgm-think-n" dir="ltr">{pct}%</b><span className="lgm-think-bar" aria-hidden="true"><i style={{inlineSize:`${pct}%`}}/></span></div>
 </div></Portal>
}
