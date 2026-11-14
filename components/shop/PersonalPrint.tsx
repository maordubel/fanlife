'use client'
import {useEffect,useRef,useState} from 'react'
import copyAll from '@/messages/en.shop.json'
import './personal-print.css'

const copy=copyAll.xiPrint
type Req={club:string;formation:string;picks:Record<string,string>;captain:string|null;twelfth:string|null}
/**
 * "YOUR XI, FRAMED" (owner, 14.11.2026). Offered when a supporter has picked his all-time eleven: the proof of his own print
 * (drawn on the server from his picks), framed print or poster, his name as the manager if he wants it. "Make my print" makes
 * the product at the printer (about 20 s) and opens the FAN LIFE checkout in its own window over this page; the page stays.
 */
export function PersonalPrint({req,className=''}:{req:Req;className?:string}){
 const [on,setOn]=useState(false),[open,setOpen]=useState(false),[product,setProduct]=useState<'framed'|'poster'>('framed'),[manager,setManager]=useState('')
 const [proof,setProof]=useState<string|null>(null),[state,setState]=useState<'idle'|'making'|'ready'|'error'>('idle'),[msg,setMsg]=useState(''),[url,setUrl]=useState<string|null>(null),win=useRef<Window|null>(null)
 useEffect(()=>{fetch('/api/shop/personal').then(r=>r.json()).then(j=>setOn(!!j.open)).catch(()=>{})},[])
 const body=JSON.stringify({...req,manager,product})
 useEffect(()=>{if(!open)return;const t=window.setTimeout(()=>{fetch('/api/shop/personal',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...req,manager,dry:true})}).then(r=>r.json()).then(j=>{if(j.proof)setProof(j.proof);else if(j.error)setMsg(j.error)}).catch(()=>{})},manager?600:0);return ()=>window.clearTimeout(t)
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[open,manager,req.formation,JSON.stringify(req.picks),req.captain,req.twelfth])
 useEffect(()=>{setState('idle');setUrl(null)},[body])
 if(!on)return null
 const go=(u:string)=>{const w=Math.min(520,screen.availWidth-40),h=Math.min(860,screen.availHeight-60),phone=window.matchMedia('(max-width: 760px)').matches
  win.current=phone?window.open(u,'fanlife-checkout'):window.open(u,'fanlife-checkout',`popup=yes,width=${w},height=${h},left=${Math.round((window.screenX||0)+(window.outerWidth-w)/2)},top=${Math.round((window.screenY||0)+60)}`)}
 const make=async()=>{setState('making');setMsg('')
  try{const r=await fetch('/api/shop/personal',{method:'POST',headers:{'content-type':'application/json'},body});const j=await r.json()
   if(!r.ok||!j.url){setState('error');setMsg(j.error||copy.error);return}
   setUrl(j.url);setState('ready');go(j.url)}catch{setState('error');setMsg(copy.error)}}
 return <>
  <button type="button" className={`min-h-tap ${className}`} onClick={()=>setOpen(true)}>{copy.cta} <span aria-hidden="true">→</span></button>
  {open&&<div className="xip z-[95]" role="dialog" aria-modal="true" aria-labelledby="xip-h" onKeyDown={e=>{if(e.key==='Escape')setOpen(false)}}>
   <div className="xip-in">
    <div className="xip-wall" data-product={product}>
     <div className="xip-frame">{/* eslint-disable-next-line @next/next/no-img-element */}
      {proof?<img src={proof} alt="" width={720} height={960}/>:<span className="xip-wait" aria-hidden="true"/>}</div>
     <p className="xip-fine">{copy.proof}</p>
    </div>
    <div className="xip-side">
     <button type="button" className="xip-x min-h-tap" aria-label={copy.back} onClick={()=>setOpen(false)}>✕</button>
     <p className="xip-k">{copy.k}</p>
     <h2 className="xip-h" id="xip-h">{copy.t}</h2>
     <p className="xip-sub">{copy.sub}</p>
     <div className="xip-seg" role="radiogroup" aria-label={copy.t}>{(['framed','poster'] as const).map(k=><button key={k} type="button" role="radio" aria-checked={product===k} className="min-h-tap" onClick={()=>setProduct(k)}>{copy[k]}</button>)}</div>
     <label className="xip-field"><span>{copy.manager}</span><input value={manager} maxLength={22} onChange={e=>setManager(e.target.value)} autoComplete="nickname"/>{manager.trim()?<small>{copy.managerHint.replace('{name}',manager.trim())}</small>:null}</label>
     {state==='ready'&&url
      ?<a className="xip-go min-h-tap" href={url} target="_blank" rel="noopener" onClick={e=>{e.preventDefault();go(url)}}>{copy.open} ↗</a>
      :<button type="button" className="xip-go min-h-tap" disabled={state==='making'||!proof} onClick={make}>{state==='making'?copy.making:<>{copy.make} →</>}</button>}
     {state==='ready'?<p className="xip-ok" role="status">{copy.ready}</p>:null}
     {msg?<p className="xip-err" role="alert">{msg}</p>:null}
     <button type="button" className="xip-back min-h-tap" onClick={()=>setOpen(false)}>{copy.back}</button>
    </div>
   </div>
  </div>}
 </>
}
