'use client'
import {useEffect} from 'react'
import {PickFxLayer,firePickFx,firePickFxAt} from '@/components/stage/PickFx'

/**
 * The Worker's print hit, lent to every club game. One listener for the whole surface: a tap on any game
 * control fires rays + a stamp ring from the fingertip, and a graded answer fires a ✓ or ✗ plate. Boards
 * never import this — they only expose `data-verdict`, so a new game gets the feel for free.
 */
const CONTROL='.game-option,.memory-card,.xi-slot,.mag-chip,.mag-cta,.game-button,.mag-pick'
export function PlayFx(){
 useEffect(()=>{
  const onClick=(e:MouseEvent)=>{
   const el=(e.target as Element|null)?.closest(CONTROL) as HTMLButtonElement|null
   if(!el||el.disabled||el.getAttribute('aria-disabled')==='true')return
   const big=el.matches('.mag-cta,.game-button')
   firePickFx(e.clientX||el.getBoundingClientRect().left+20,e.clientY||el.getBoundingClientRect().top+20,{tone:big?'red':'ink',big,haptic:'tap'})
  }
  const seen=new WeakSet<Element>()
  const mo=new MutationObserver(()=>{
   document.querySelectorAll('[data-verdict]').forEach(n=>{
    if(seen.has(n))return;seen.add(n)
    const ok=n.getAttribute('data-verdict')==='right'
    firePickFxAt(n,{label:ok?'✓':'✗',tone:ok?'red':'ink',big:true,haptic:ok?'lock':'miss'})
   })
  })
  document.addEventListener('click',onClick)
  mo.observe(document.body,{childList:true,subtree:true})
  return()=>{document.removeEventListener('click',onClick);mo.disconnect()}
 },[])
 return <PickFxLayer/>
}
