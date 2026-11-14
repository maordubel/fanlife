'use client'
import {useEffect,useRef,useState,type MouseEvent} from 'react'

type Copy={buy:string;opening:string;k:string;t:string;sub:string;reopen:string;close:string;blocked:string;blockedCta:string}
/**
 * THE BRANDED CHECKOUT DOOR (owner, 14.11.2026: "the feeling that we stay on our site, a window inside a window").
 * Printify's checkout refuses to be framed (its frame-ancestors policy), so it cannot live inside our page. Instead the Buy
 * button opens it as a small window over the shop on a desk (a new tab on a phone), while our page stays under it with a
 * FAN LIFE plate: the checkout is open, open it again, back to the shop. When the window closes the plate goes away by itself.
 * A blocked pop-up falls back to a plain link. No script on the page → the button is a plain link (it is an <a>).
 */
export function CheckoutButton({url,copy,className=''}:{url:string;copy:Copy;className?:string}){
 const [state,setState]=useState<'idle'|'opening'|'open'|'blocked'>('idle'),win=useRef<Window|null>(null)
 useEffect(()=>{if(state!=='open')return
  const t=window.setInterval(()=>{if(win.current?.closed){setState('idle');win.current=null}},800)
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setState('idle')}
  window.addEventListener('keydown',key);return ()=>{window.clearInterval(t);window.removeEventListener('keydown',key)}},[state])
 const open=(e:MouseEvent)=>{e.preventDefault();setState('opening')
  const phone=window.matchMedia('(max-width: 760px)').matches,w=Math.min(520,screen.availWidth-40),h=Math.min(860,screen.availHeight-60)
  const left=Math.round((window.screenX||0)+(window.outerWidth-w)/2),top=Math.round((window.screenY||0)+Math.max(20,(window.outerHeight-h)/2))
  const ref=phone?window.open(url,'fanlife-checkout'):window.open(url,'fanlife-checkout',`popup=yes,width=${w},height=${h},left=${left},top=${top}`)
  if(!ref){setState('blocked');return}
  win.current=ref;try{ref.focus()}catch{/* another origin */}
  window.setTimeout(()=>setState('open'),350)}
 return <>
  <a className={`wk-btn min-h-tap wks-buybig ${className}`} href={url} target="_blank" rel="noopener" onClick={open} aria-busy={state==='opening'||undefined}>{state==='opening'?copy.opening:copy.buy} <span aria-hidden="true">↗</span></a>
  {(state==='open'||state==='blocked')&&<div className="wks-checkout" role="dialog" aria-modal="true" aria-labelledby="wks-co-h">
   <div className="wks-checkout-in wk-panel">
    <p className="wk-banner">{copy.k}</p>
    <h2 className="wk-head" id="wks-co-h">{state==='blocked'?copy.blocked:copy.t}</h2>
    {state==='open'&&<p className="wk-small">{copy.sub}</p>}
    <p className="wks-ctas">
     {state==='blocked'?<a className="wk-btn min-h-tap" href={url} target="_blank" rel="noopener" onClick={()=>setState('idle')}>{copy.blockedCta} <span aria-hidden="true">↗</span></a>
      :<button type="button" className="wk-btn min-h-tap" onClick={()=>{if(win.current&&!win.current.closed)win.current.focus();else{win.current=window.open(url,'fanlife-checkout')}}}>{copy.reopen}</button>}
     <button type="button" className="wk-btn paper min-h-tap" onClick={()=>setState('idle')}>{copy.close}</button>
    </p>
   </div>
  </div>}
 </>
}
