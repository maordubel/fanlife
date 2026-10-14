'use client'
import {useEffect,useRef,useState} from 'react'
import {usePathname,useSearchParams} from 'next/navigation'

/**
 * The tap answers at once (performance audit, 11.10.2026: "clicks sometimes feel unresponsive").
 * Most pages render on the server, so between the tap and the next page there was nothing on screen at all. A same-site link
 * tap now raises a thin bar at the top edge in the same frame; it drops when the address changes (or after 12 s, or on Back).
 * Decorative only — the page itself announces where you are. Off-site links, new tabs, downloads and same-page anchors are left alone.
 */
export function NavPulse(){
 const [busy,setBusy]=useState(false)
 const path=usePathname(),query=useSearchParams()?.toString()
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null)
 const tapped=useRef<HTMLAnchorElement|null>(null)
 useEffect(()=>{setBusy(false);tapped.current?.removeAttribute('data-tapped');tapped.current=null},[path,query])
 useEffect(()=>{
  const stop=()=>{setBusy(false);if(timer.current)clearTimeout(timer.current);tapped.current?.removeAttribute('data-tapped');tapped.current=null}
  const onClick=(e:MouseEvent)=>{
   if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return
   const a=(e.target as Element|null)?.closest?.('a[href]') as HTMLAnchorElement|null
   if(!a||a.target&&a.target!=='_self'||a.hasAttribute('download'))return
   const url=new URL(a.href,location.href)
   if(url.origin!==location.origin)return
   if(url.pathname===location.pathname&&url.search===location.search)return // a hash or the same page: nothing loads
   tapped.current?.removeAttribute('data-tapped');a.setAttribute('data-tapped','');tapped.current=a
   setBusy(true);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(stop,12_000)
  }
  document.addEventListener('click',onClick,true);window.addEventListener('popstate',stop)
  return ()=>{document.removeEventListener('click',onClick,true);window.removeEventListener('popstate',stop);if(timer.current)clearTimeout(timer.current)}
 },[])
 return <><div className="nav-pulse" data-busy={busy?'true':'false'} aria-hidden="true"/><div className="nav-wait" data-busy={busy?'true':'false'} aria-hidden="true"><span>Going to press…</span></div></>
}
