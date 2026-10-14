'use client'
import {useEffect} from 'react'
import {PickFxLayer,firePickFx,firePickFxAt} from '@/components/stage/PickFx'

/**
 * The Worker's print hit, lent to every club game. One listener for the whole surface: a tap on any game
 * control fires rays + a stamp ring from the fingertip, and a graded answer fires a ✓ or ✗ plate. Boards
 * never import this — they only expose `data-verdict`, so a new game gets the feel for free.
 */
const CONTROL='.game-option,.memory-card,.xi-slot,.mag-chip,.mag-cta,.game-button,.mag-pick'
/**
 * THE GOAL! MOMENT (rule 124), for every game at once: a graded answer erupts over the glass — rays, ring, burst, the
 * word, flying dots — and clears itself in 1.8s; a miss is the quiet navy "Wide!". A board can name its own shout with
 * `data-shout` ("Pair!", "Called it!") and a line under it with `data-shout-sub`; `data-shout="off"` keeps the old ✓/✗.
 * No sound. Pointer events pass through, so nothing waits for it; reduced motion gets the still frame.
 */
const DOTS:[number,number,number,string][]=[[-150,-120,22,'var(--mag-yellow)'],[140,-130,18,'var(--mag-white)'],[-170,40,16,'var(--mag-cyan)'],[160,60,24,'var(--mag-yellow)'],[-60,-170,14,'var(--mag-white)'],[70,160,18,'var(--mag-cyan)'],[-120,150,20,'var(--mag-white)'],[30,-180,16,'var(--mag-yellow)']]
let live:HTMLElement|null=null
function goalMoment(word:string,sub:string|undefined,ok:boolean){
 if(typeof document==='undefined')return
 live?.remove()
 const host=document.querySelector('.club-surface')??document.body
 const fx=document.createElement('div');fx.className=`wk-fx fixed${ok?'':' wide'}`;fx.setAttribute('role','status');fx.setAttribute('aria-live','assertive')
 for(const c of ['wk-fx-rays','wk-fx-ring']){const s=document.createElement('span');s.className=c;fx.appendChild(s)}
 for(const [dx,dy,sz,col] of DOTS){const i=document.createElement('i');i.style.setProperty('--dx',`${dx}px`);i.style.setProperty('--dy',`${dy}px`);i.style.setProperty('--s',`${sz}px`);i.style.setProperty('--c',col);fx.appendChild(i)}
 const boom=document.createElement('span');boom.className='wk-fx-boom'
 const w=document.createElement('span');w.className='wk-fx-word';w.textContent=word
 if(sub){const sm=document.createElement('small');sm.textContent=sub;w.appendChild(sm)}
 boom.appendChild(w);fx.appendChild(boom);host.appendChild(fx);live=fx
 window.setTimeout(()=>{fx.remove();if(live===fx)live=null},1800)
}
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
    const v=n.getAttribute('data-verdict'),ok=v!=='wrong' // a closing screen's verdict (memory: flawless|sharp|solid|lit) is a finish, not a miss
    if(n.getAttribute('data-shout')==='off'){firePickFxAt(n,{label:ok?'✓':'✗',tone:ok?'red':'ink',big:true,haptic:ok?'lock':'miss'});return}
    goalMoment(n.getAttribute('data-shout')||(ok?'Goal!':'Wide!'),n.getAttribute('data-shout-sub')||undefined,ok)
   })
  })
  document.addEventListener('click',onClick)
  mo.observe(document.body,{childList:true,subtree:true})
  return()=>{document.removeEventListener('click',onClick);mo.disconnect()}
 },[])
 return <PickFxLayer/>
}
