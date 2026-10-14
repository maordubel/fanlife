'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'

export type StopItem={kind:'last'|'next';tag:string;text:string;href:string}
/**
 * The Stop Press strip: one line at a time, LAST results and NEXT matches taking turns. The first item is in the server's HTML,
 * so a slow phone, a crawler and reduced motion all see a complete strip; the rotation only adds the others.
 */
export function StopRotator({items,label}:{items:StopItem[];label:string}){
 const [i,setI]=useState(0),[hold,setHold]=useState(false)
 useEffect(()=>{
  if(items.length<2||hold)return
  const calm=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches
  const id=window.setInterval(()=>setI(n=>(n+1)%items.length),calm?7000:4500)
  return()=>window.clearInterval(id)
 },[items.length,hold])
 const it=items[i%items.length]!
 return <div className="mag-stop-in" onPointerEnter={()=>setHold(true)} onPointerLeave={()=>setHold(false)} onFocusCapture={()=>setHold(true)} onBlurCapture={()=>setHold(false)}>
  <b>{label}</b>
  <Link key={i} href={it.href} className="mag-stop-rot" data-kind={it.kind}>
   <em>{it.tag}</em><span dir="auto">{it.text}</span>
  </Link>
  <span className="mag-stop-dots" aria-hidden="true">{items.length>1&&items.map((_,k)=><i key={k} data-on={k===i||undefined}/>)}</span>
 </div>
}
