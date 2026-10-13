'use client'
import {useEffect,useState} from 'react'
import {Emblem} from './Brand'
import {Portal} from './Sheet'

/**
 * The entrance to LEGENDS MANAGER (owner, 13.10.2026: "a beautiful reveal board, at the entrance to the feature too").
 * Night falls, the floodlights come up, the badge rises out of the dark with a sweep of light across the leather and the crown,
 * dust drifts in the beams, and the line "the hall of fame is open" is printed under it. About 3.4 seconds, once a session,
 * a tap or a key ends it, and under reduced motion it is a short fade. It plays OVER the page, never instead of it (rule 30):
 * the front door is complete underneath, so a crawler and a slow phone reach it either way. Portalled to <body>
 * (rule 112 §5), because the page wrapper is a stacking context that would put the hero above a fixed overlay.
 */
const KEY='fanlife.legends.reveal.v1'
export function LegendsReveal(){
 const [on,setOn]=useState(false),[out,setOut]=useState(false)
 useEffect(()=>{
  let seen=false;try{seen=sessionStorage.getItem(KEY)==='1'}catch{}
  if(seen)return
  setOn(true)
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false
  const t=window.setTimeout(()=>close(),reduced?900:3400)
  return()=>window.clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[])
 // the seen-flag is written when the reveal ENDS, not when it is chosen (rule 30: strict mode would read its own flag)
 const close=()=>{try{sessionStorage.setItem(KEY,'1')}catch{};setOut(true);window.setTimeout(()=>setOn(false),420)}
 useEffect(()=>{if(!on)return;const k=(e:KeyboardEvent)=>{if(e.key==='Escape'||e.key==='Enter'||e.key===' ')close()};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k)
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[on])
 if(!on)return null
 return <Portal><div className="lgm-reveal z-[60]" data-out={out||undefined} onClick={close} data-testid="legends-reveal">
  <i className="lgm-reveal-beam" data-side="a" aria-hidden="true"/><i className="lgm-reveal-beam" data-side="b" aria-hidden="true"/>
  <span className="lgm-reveal-dust" aria-hidden="true">{Array.from({length:18},(_,i)=><i key={i} style={{insetInlineStart:`${(i*53)%100}%`,animationDelay:`${(i%6)*0.18}s`}}/>)}</span>
  <span className="lgm-reveal-badge"><Emblem size={340} label="Legends Manager" eager/><i className="lgm-reveal-shine" aria-hidden="true"/></span>
  <span className="lgm-reveal-line">The hall of fame is open</span>
  <button type="button" className="lgm-reveal-skip min-h-tap" onClick={e=>{e.stopPropagation();close()}}>Enter</button>
 </div></Portal>
}
