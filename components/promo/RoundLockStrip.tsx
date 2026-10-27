'use client'
import {useEffect,useState} from 'react'
import {goHref} from '@/lib/ecosystem/links'
import {busy,occupied,snooze,snoozed} from '@/lib/universe/attention'
type C={id:string;label:string;closesAt:string;href:string}
const pad=(n:number)=>String(n).padStart(2,'0')
const fmt=(ms:number)=>{const s=Math.max(0,Math.floor(ms/1000)),h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h>0?`${pad(h)}:${pad(m)}:${pad(s%60)}`:`${pad(m)}:${pad(s%60)}`}
/** Connected Football §11: hidden over a game or a dialog, while another discovery unit is up, and when DUBID is snoozed.
 *  DUBID's round-lock timer for Israeli visitors: a small pill above the bottom bar, the server's clock (not the phone's), gone at the lock; dismissed for the round on tap. */
export function RoundLockStrip(){
 const [c,setC]=useState<C|null>(null),[off,setOff]=useState(0),[now,setNow]=useState(0)
 useEffect(()=>{
  let dead=false
  const load=()=>fetch('/api/promo/countdown',{cache:'no-store'}).then(r=>r.json()).then(d=>{if(dead)return;const x=(d.countdowns?.[0]??null) as C|null;let hid=snoozed('dubid');try{hid=hid||(!!x&&sessionStorage.getItem('fl.lock.'+x.id)==='1')}catch{/* optional */}setC(hid?null:x);setOff(Number(d.now)-Date.now())}).catch(()=>{})
  load();const t=setInterval(load,5*60_000);const v=()=>{if(!document.hidden)load()};document.addEventListener('visibilitychange',v)
  return()=>{dead=true;clearInterval(t);document.removeEventListener('visibilitychange',v)}
 },[])
 const [quiet,setQuiet]=useState(false)
 useEffect(()=>{if(!c)return;const tick=()=>{setNow(Date.now());setQuiet(busy()||occupied('round-lock'))};tick();const t=setInterval(tick,1000);return()=>clearInterval(t)},[c])
 if(!c||!now||quiet)return null
 const left=Date.parse(c.closesAt)-(now+off)
 if(left<=0)return null
 return <div role="timer" data-discovery-unit="round-lock" data-family="dubid" style={{position:'fixed',insetInline:12,bottom:'calc(var(--app-bottom, 0px) + 10px)',zIndex:40,display:'flex',alignItems:'center',gap:10,justifyContent:'center',padding:'8px 12px',background:'var(--mag-ink)',color:'var(--mag-paper)',font:'800 14px var(--mag-body, system-ui)',maxWidth:420,marginInline:'auto'}}>
  <a href={goHref(c.href,'round-lock')??c.href} target="_blank" rel="noopener" style={{color:'inherit',textDecoration:'none',display:'flex',gap:8,alignItems:'center'}}><span>DUBID · {c.label}</span><b style={{fontVariantNumeric:'tabular-nums',direction:'ltr'}}>{fmt(left)}</b></a>
  <button type="button" className="min-h-tap" aria-label="Close" onClick={()=>{try{sessionStorage.setItem('fl.lock.'+c.id,'1')}catch{/* optional */}snooze('dubid');setC(null)}} style={{background:'none',border:0,color:'inherit',font:'inherit',cursor:'pointer',minWidth:44,minHeight:44}}>×</button>
 </div>
}
