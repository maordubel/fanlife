'use client'
import pay from '@/messages/en.pay.json'
import {useEffect,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import copyAll from '@/messages/en.shop.json'
import './personal-print.css'

type Product='framed'|'poster'|'tee'
type Kind='xi'|'shirts'|'legends'|'first'|'away'
type Copy=typeof copyAll.xiPrint
const LOOKS=['touchline','archive','night','kits','dream'] as const
type Look=(typeof LOOKS)[number]
type Req=Record<string,unknown>
/**
 * "YOUR XI, FRAMED" (owner, 14.11.2026). Offered when a supporter has picked his all-time eleven: the proof of his own print
 * (drawn on the server from his picks), framed print or poster, his name as the manager if he wants it. "Make my print" makes
 * the product at the printer (about two minutes) and opens the FAN LIFE checkout in its own window over this page; the page stays.
 */
export function PersonalPrint({req,kind='xi',className=''}:{req:Req;kind?:Kind;className?:string}){
 const xi=kind==='xi',sv=copyAll.souvenir,copy:Copy=xi?copyAll.xiPrint:{...copyAll.xiPrint,...sv.common,...sv[kind as Exclude<Kind,'xi'>]}
 const endpoint=xi?'/api/shop/personal':'/api/shop/personal/souvenir',products:Product[]=xi?['framed','poster','tee']:['framed','poster']
 const [line,setLine]=useState(''),[note,setNote]=useState(''),[age,setAge]=useState(''),[gate,setGate]=useState('')
 const [on,setOn]=useState(false),[open,setOpen]=useState(false),[product,setProduct]=useState<Product>('framed'),[template,setTemplate]=useState<Look>('touchline'),[manager,setManager]=useState('')
 const [proof,setProof]=useState<string|null>(null),[state,setState]=useState<'idle'|'making'|'ready'|'error'>('idle'),[msg,setMsg]=useState(''),[url,setUrl]=useState<string|null>(null),win=useRef<Window|null>(null)
 useEffect(()=>{fetch('/api/shop/personal').then(r=>r.json()).then(j=>setOn(!!j.open)).catch(()=>{})},[])
 // our own product beside the printed one (16.11.2026): the full-size file, paid with our Stripe — shown only when payments are open
 const [file,setFile]=useState<{cents:number;currency:string}|null>(null),[paying,setPaying]=useState(false),[email,setEmail]=useState('')
 useEffect(()=>{fetch('/api/pay/checkout').then(r=>r.json()).then((j:{items?:{kind:string;cents:number;currency:string}[]})=>{const f=j.items?.find(i=>i.kind==='print-file');if(f)setFile({cents:f.cents,currency:f.currency})}).catch(()=>{})},[])
 const buyFile=async()=>{if(!proof)return;const u=new URL(proof,location.origin),s=u.searchParams.get('s'),sig=u.searchParams.get('sig');if(!s||!sig)return;setPaying(true);setMsg('')
  try{const r=await fetch('/api/pay/checkout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({kind:'print-file',s,sig,back:location.pathname,...(email.trim()?{email:email.trim()}:{})})});const j=await r.json()
   if(j.url){location.href=j.url;return}setMsg(j.error||copy.error)}catch{setMsg(copy.error)}setPaying(false)}
 const mine=xi?{manager,template}:{kind,who:manager,line,note,age:age?Number(age):null,gate},body=JSON.stringify({...req,...mine,product})
 useEffect(()=>{if(!open)return;const t=window.setTimeout(()=>{fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...req,...mine,product,dry:true})}).then(r=>r.json()).then(j=>{if(j.proof){setProof(j.proof);setMsg('')}else if(j.error)setMsg(j.error)}).catch(()=>{})},manager||line||note||age||gate?600:0);return ()=>window.clearTimeout(t)
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[open,body])
 useEffect(()=>{setState('idle');setUrl(null)},[body])
 if(!on)return null
 const go=(u:string)=>{const w=Math.min(520,screen.availWidth-40),h=Math.min(860,screen.availHeight-60),phone=window.matchMedia('(max-width: 760px)').matches
  win.current=phone?window.open(u,'fanlife-checkout'):window.open(u,'fanlife-checkout',`popup=yes,width=${w},height=${h},left=${Math.round((window.screenX||0)+(window.outerWidth-w)/2)},top=${Math.round((window.screenY||0)+60)}`)}
 // the printer takes about two minutes: if the line drops on the way (a proxy's limit) or the print is still being made, the
 // same request is asked again — it answers "pending" while the press runs and the link once it is ready (16.11.2026)
 const make=async()=>{setState('making');setMsg('')
  for(let i=0;i<30;i++){let j:{url?:string;error?:string;pending?:boolean}|null=null,ok=false
   try{const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body});ok=r.ok;j=JSON.parse((await r.text()).trim()||'null')}catch{j=null}
   if(j?.url){setUrl(j.url);setState('ready');go(j.url);return}
   if(j?.error&&!j.pending&&(!ok||i>0||!/time/i.test(j.error))){setState('error');setMsg(j.error||copy.error);return}
   await new Promise(r=>setTimeout(r,8000))}
  setState('error');setMsg(copy.error)}
 return <>
  <button type="button" className={`min-h-tap ${className}`} onClick={()=>setOpen(true)}>{copy.cta} <span aria-hidden="true">→</span></button>
  {open&&createPortal(<div className="xip z-[95]" role="dialog" aria-modal="true" aria-labelledby="xip-h" onKeyDown={e=>{if(e.key==='Escape')setOpen(false)}}>
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
     <div className="xip-seg" role="radiogroup" aria-label={copy.t} style={{gridTemplateColumns:`repeat(${products.length},minmax(0,1fr))`}}>{products.map(k=><button key={k} type="button" role="radio" aria-checked={product===k} className="min-h-tap" onClick={()=>setProduct(k)}>{copy[k]}</button>)}</div>
     {!xi?null:product==='tee'?<p className="xip-sub">{copy.teeNote}</p>
      :<div className="xip-looks" role="radiogroup" aria-label={copy.look}><span className="xip-k">{copy.look}</span>{LOOKS.map(k=><button key={k} type="button" role="radio" aria-checked={template===k} className="min-h-tap" onClick={()=>setTemplate(k)}>{copy.looks[k]}</button>)}</div>}
     <label className="xip-field"><span>{copy.manager}</span><input value={manager} maxLength={22} onChange={e=>setManager(e.target.value)} autoComplete="nickname"/>{manager.trim()?<small>{copy.managerHint.replace('{name}',manager.trim())}</small>:null}</label>
     {kind==='shirts'?<label className="xip-field"><span>{sv.shirts.note}</span><input value={note} maxLength={28} onChange={e=>setNote(e.target.value)}/></label>:null}
     {kind==='first'?<div className="xip-two"><label className="xip-field"><span>{sv.first.age}</span><input inputMode="numeric" value={age} maxLength={2} onChange={e=>setAge(e.target.value.replace(/\D/g,''))}/></label><label className="xip-field"><span>{sv.first.gate}</span><input value={gate} maxLength={6} onChange={e=>setGate(e.target.value)}/></label></div>:null}
     {xi?null:<label className="xip-field"><span>{sv.common.line}</span><input value={line} maxLength={90} onChange={e=>setLine(e.target.value)}/></label>}
     {state==='ready'&&url
      ?<a className="xip-go min-h-tap" href={url} target="_blank" rel="noopener" onClick={e=>{e.preventDefault();go(url)}}>{copy.open} ↗</a>
      :<button type="button" className="xip-go min-h-tap" disabled={state==='making'||!proof} onClick={make}>{state==='making'?copy.making:<>{copy.make} →</>}</button>}
     {state==='ready'?<p className="xip-ok" role="status">{copy.ready}</p>:null}
     {file&&product!=='tee'&&proof?<div className="xip-file"><label className="xip-field"><span>{pay.emailLabel}</span><input type="email" inputMode="email" autoComplete="email" value={email} maxLength={120} onChange={e=>setEmail(e.target.value)}/><small>{pay.emailNote}</small></label><button type="button" className="xip-file-b min-h-tap" disabled={paying} onClick={buyFile}>{pay.buyFile.replace('{price}',new Intl.NumberFormat('en',{style:'currency',currency:file.currency.toUpperCase()}).format(file.cents/100))}</button><small>{pay.buyFileNote}</small></div>:null}
     {msg?<p className="xip-err" role="alert">{msg}</p>:null}
     <button type="button" className="xip-back min-h-tap" onClick={()=>setOpen(false)}>{copy.back}</button>
    </div>
   </div>
  </div>,document.body)}
 </>
}
