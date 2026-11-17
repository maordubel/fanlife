'use client'
import Link from 'next/link'
import {useEffect,useRef,useState} from 'react'
import copy from '@/messages/en.pay.json'
import {CHANNEL} from '@/lib/stories/channel'

type Status='open'|'paid'|'fulfilled'|'failed'|'refunded'|'expired'
type Props={id:string;t:string;status:Status;kind:'print-file'|'film';name:string;price:string;email:string|null;preview:string|null;downloaded?:boolean}
const L=copy.live,M=copy.mail
/**
 * THE BUYER'S ORDER, LIVE (17.11.2026). He lands here from Stripe. While the file is being made the page says so plainly (a
 * press at work, three steps, and that the link also goes by email the moment it is ready); its own polling drives the maker,
 * so the file is usually ready before he finishes reading. Then the ready screen, and after the download the thank-you screen
 * with the print tips and the doors back in. Nothing promises a download before the file exists.
 */
export function OrderLive(p:Props){
 const [status,setStatus]=useState<Status>(p.status),[done,setDone]=useState(!!p.downloaded),[slow,setSlow]=useState(false),t0=useRef(Date.now())
 const file=`/api/pay/file/${p.id}?t=${encodeURIComponent(p.t)}`
 useEffect(()=>{
  if(status!=='open'&&status!=='paid')return
  let stop=false,h=0
  const tick=async()=>{
   try{const r=await fetch(`/api/pay/order/${p.id}?t=${encodeURIComponent(p.t)}`,{cache:'no-store'});const j=r.ok?await r.json() as {status?:Status}:{};if(!stop&&j.status&&j.status!==status){setStatus(j.status);return}}catch{}
   if(Date.now()-t0.current>150e3)setSlow(true)
   if(!stop)h=window.setTimeout(tick,status==='open'?2500:3000)}
  h=window.setTimeout(tick,600);return ()=>{stop=true;window.clearTimeout(h)}
 },[status,p.id,p.t])
 const mail=(s:string)=>s.replace('{email}',p.email??'')
 const kinds=M.kinds[p.kind],step=status==='open'?0:status==='paid'?1:2
 const fine=<p className="pol-fine">{copy.number.replace('{id}',p.id)} · {p.price}</p>
 // eslint-disable-next-line @next/next/no-img-element
 const plate=p.preview?<figure className="pol-plate"><img src={p.preview} alt={L.previewAlt} width={600} height={800}/></figure>:null

 if(status==='open'||status==='paid')return <section className="pol pol-making" aria-live="polite">
  <div className="pol-press" aria-hidden="true"><span className="pol-roll"/><span className="pol-sheet"><i/><i/><i/></span><span className="pol-roll pol-roll-b"/></div>
  <div className="pol-body">
   <p className="pol-kicker">{status==='open'?copy.kicker:L.makingKicker}</p>
   <h1 className="pol-h">{status==='open'?L.openH:L.makingH}</h1>
   <p className="pol-p">{status==='open'?L.openP:L.makingP}</p>
   <ol className="pol-steps">{L.steps.map((s,i)=><li key={s} className={i<step?'is-done':i===step?'is-now':''}><span aria-hidden="true">{i<step?'✓':i+1}</span>{s}</li>)}</ol>
   {status==='paid'?<p className="pol-note">{p.email?mail(L.makingMail):L.makingMailNone}</p>:null}
   {slow?<p className="pol-note">{L.slow}</p>:null}
   {fine}
  </div></section>

 if(status==='failed')return <section className="pol"><div className="pol-body"><p className="pol-kicker">{copy.kicker}</p><h1 className="pol-h">{L.failedH}</h1><p className="pol-p">{L.failedP.replace('{id}',p.id)}</p>{fine}</div></section>
 if(status!=='fulfilled')return <section className="pol"><div className="pol-body"><p className="pol-kicker">{copy.kicker}</p><h1 className="pol-h">{p.name}</h1><p className="pol-p">{copy[status]}</p>{fine}</div></section>

 if(!done)return <section className="pol pol-ready">
  {plate}
  <div className="pol-body">
   <p className="pol-kicker pol-stamp">{L.readyKicker}</p>
   <h1 className="pol-h">{L.readyH}</h1>
   <p className="pol-p">{L.readyP}</p>
   <a className="pol-go min-h-tap" href={file} onClick={()=>window.setTimeout(()=>setDone(true),500)}>{L.download} <span aria-hidden="true">↓</span></a>
   {p.email?<p className="pol-note">{mail(L.readyMail)}</p>:null}
   {fine}<p className="pol-fine">{copy.keep}</p>
  </div></section>

 return <section className="pol pol-done">
  {plate}
  <div className="pol-body">
   <p className="pol-kicker pol-stamp">{L.doneKicker}</p>
   <h1 className="pol-h">{L.doneH}</h1>
   <p className="pol-p" role="status">{L.downloading}. {L.doneP} <a href={file}>{L.again}</a></p>
   <h2 className="pol-h2">{kinds.tipsTitle}</h2>
   <ol className="pol-tips">{kinds.tips.map(x=><li key={x}>{x}</li>)}</ol>
   <h2 className="pol-h2">{M.moreTitle}</h2>
   <div className="pol-doors">
    <Link className="pol-door pol-door-red" href="/shop/make"><b>{M.doors[0]!.title}</b><span>{M.doors[0]!.line}</span><em>{M.doors[0]!.cta} →</em></Link>
    <Link className="pol-door pol-door-navy" href="/shop"><b>{M.doors[1]!.title}</b><span>{M.doors[1]!.line}</span><em>{M.doors[1]!.cta} →</em></Link>
    <a className="pol-door pol-door-cyan" href={CHANNEL.url} target="_blank" rel="noopener noreferrer"><b>{M.doors[2]!.title}</b><span>{M.doors[2]!.line}</span><em>{M.doors[2]!.cta} →</em></a>
   </div>
   {fine}<p className="pol-fine">{copy.keep}</p>
  </div></section>
}
