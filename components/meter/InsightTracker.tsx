'use client'
import {useEffect,useRef} from 'react'
import {usePathname,useSearchParams} from 'next/navigation'
import {portalConfigured} from '@/lib/portal/env'
import {sourceOf,type InsightHit} from '@/lib/analytics/insight'

/**
 * FAN LIFE INSIGHT in the browser (17.11.2026). Every page view, every click on a link or a button, and on leaving a
 * page: the time spent on it and how far down it was read. One queue, sent with `sendBeacon` to /api/insight.
 *
 * Its own random id (`fanlife.insight.v1`), never the portal's device id: the ballots are keyed on that one, and the
 * two must never travel together. A session is one visit: 30 minutes of quiet starts a new one. Nothing is sent when
 * the browser asks not to be tracked (Global Privacy Control / Do Not Track), in the control room, or in the
 * Telegram app's preview.
 */
const ENDPOINT='/api/insight',FLUSH_MS=4000,IDLE_MS=30*60_000
const KEY='fanlife.insight.v1',SKEY='fanlife.insight.session'
const hex=(n:number)=>Array.from(crypto.getRandomValues(new Uint8Array(n)),b=>b.toString(16).padStart(2,'0')).join('')
function ids():{device:string;session:string;fresh:boolean}|null{
 try{
  let device=localStorage.getItem(KEY);if(!device||!/^[0-9a-f-]{8,64}$/.test(device)){device=crypto.randomUUID();localStorage.setItem(KEY,device)}
  const now=Date.now(),raw=JSON.parse(localStorage.getItem(SKEY)||'null') as {id:string;at:number}|null
  const fresh=!raw||now-raw.at>IDLE_MS||!/^[0-9a-f]{16}$/.test(raw.id)
  const session=fresh?hex(8):raw!.id
  localStorage.setItem(SKEY,JSON.stringify({id:session,at:now}))
  return {device,session,fresh}
 }catch{return null}
}
const off=(path:string)=>{
 const nav=navigator as Navigator&{globalPrivacyControl?:boolean}
 return nav.globalPrivacyControl===true||nav.doNotTrack==='1'||path.startsWith('/master')||path.startsWith('/qa')||path.startsWith('/telegram')||path.startsWith('/studio-cancel')
}
/** what a click pressed, in words: its own data-insight label, its aria-label, its text, else where it leads */
function labelOf(el:Element):string|null{
 const own=el.closest('[data-insight]')?.getAttribute('data-insight');if(own)return own.slice(0,80)
 const aria=el.getAttribute('aria-label');const text=(el.textContent||'').replace(/\s+/g,' ').trim()
 const href=el instanceof HTMLAnchorElement?el.getAttribute('href'):null
 const words=(aria||text).slice(0,60)
 const to=href?href.startsWith('http')?(()=>{try{return new URL(href).host}catch{return href}})():href.split('?')[0]:null
 return (words&&to?`${words} → ${to}`:words||to||null)?.slice(0,80)??null
}

export function InsightTracker(){
 const pathname=usePathname()||'/',search=useSearchParams()
 const queue=useRef<InsightHit[]>([]),timer=useRef<number|null>(null),page=useRef<{path:string;at:number;scroll:number}|null>(null)
 const enabled=typeof window!=='undefined'&&portalConfigured()

 const flush=(beacon:boolean)=>{
  if(timer.current){clearTimeout(timer.current);timer.current=null}
  const hits=queue.current.splice(0,queue.current.length);if(!hits.length)return
  const id=ids();if(!id)return
  const body=JSON.stringify({device:id.device,session:id.session,screen:Math.round(window.screen?.width||window.innerWidth||0),hits})
  try{
   if(beacon&&typeof navigator.sendBeacon==='function'&&navigator.sendBeacon(ENDPOINT,new Blob([body],{type:'application/json'})))return
   void fetch(ENDPOINT,{method:'POST',body,keepalive:true,headers:{'content-type':'application/json'}}).catch(()=>{})
  }catch{/* measurement never breaks a page */}
 }
 const push=(h:InsightHit,now=false)=>{
  queue.current.push(h)
  if(now||queue.current.length>=25){flush(false);return}
  if(!timer.current)timer.current=window.setTimeout(()=>flush(false),FLUSH_MS)
 }
 const leave=(beacon:boolean)=>{
  const p=page.current;if(!p)return
  page.current=null
  push({kind:'leave',path:p.path,dwell:Date.now()-p.at,scroll:p.scroll})
  flush(beacon)
 }

 // a page view on every route (path + query), with where the visit came from on its landing
 useEffect(()=>{
  if(!enabled||off(pathname))return
  const q=search?.toString(),path=(pathname+(q?`?${q}`:'')).slice(0,160)
  if(page.current&&page.current.path!==path)leave(false)
  const id=ids();if(!id)return
  const view:InsightHit={kind:'view',path,title:document.title.slice(0,120)}
  if(id.fresh){
   const ref=(()=>{try{return document.referrer?new URL(document.referrer).host.toLowerCase().replace(/^www\./,''):''}catch{return ''}})()
   const own=location.host.toLowerCase().replace(/^www\./,'')
   const utm=search?.get('utm_source')?.toLowerCase()||undefined
   if(ref&&ref!==own)view.ref=ref
   view.source=sourceOf(ref||undefined,utm,own)
   const medium=search?.get('utm_medium');if(medium)view.medium=medium.toLowerCase()
   const campaign=search?.get('utm_campaign');if(campaign)view.campaign=campaign.toLowerCase()
  }
  page.current={path,at:Date.now(),scroll:0}
  push(view)
 // eslint-disable-next-line react-hooks/exhaustive-deps -- one view per route
 },[pathname,search?.toString()])

 useEffect(()=>{
  if(!enabled)return
  const onScroll=()=>{const p=page.current;if(!p)return;const d=document.documentElement,max=Math.max(1,d.scrollHeight-window.innerHeight)
   p.scroll=Math.max(p.scroll,Math.min(100,Math.round(window.scrollY/max*100)))}
  const onClick=(ev:MouseEvent)=>{
   const p=page.current;if(!p)return
   const el=(ev.target as Element|null)?.closest?.('a,button,[role=button],[role=tab],summary,[data-insight]');if(!el)return
   const target=labelOf(el);if(!target)return
   push({kind:'click',path:p.path,target})
  }
  const onHide=()=>{if(document.visibilityState==='hidden')leave(true);else if(!page.current&&!off(location.pathname)){page.current={path:(location.pathname+location.search).slice(0,160),at:Date.now(),scroll:0}}}
  const onPageHide=()=>leave(true)
  window.addEventListener('scroll',onScroll,{passive:true})
  document.addEventListener('click',onClick,{capture:true})
  document.addEventListener('visibilitychange',onHide)
  window.addEventListener('pagehide',onPageHide)
  return()=>{window.removeEventListener('scroll',onScroll);document.removeEventListener('click',onClick,{capture:true});document.removeEventListener('visibilitychange',onHide);window.removeEventListener('pagehide',onPageHide)}
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[enabled])
 return null
}

/** a named moment from anywhere in the app ("shop_checkout", "trivia_finished"…) — the same queue */
export function insightEvent(name:string,value?:number){
 try{
  if(typeof window==='undefined')return
  const id=ids();if(!id)return
  const body=JSON.stringify({device:id.device,session:id.session,screen:Math.round(window.screen?.width||0),hits:[{kind:'event',path:location.pathname.slice(0,160),target:name.slice(0,80),...(value!==undefined?{value}:{})}]})
  void fetch(ENDPOINT,{method:'POST',body,keepalive:true,headers:{'content-type':'application/json'}}).catch(()=>{})
 }catch{/* never breaks a page */}
}
