'use client'
import {useCallback,useEffect,useRef} from 'react'
import {WELCOME_KEY} from '@/lib/home/art'

/** The welcome's way in: "Kick off" lowers the screen and lands on "Pick your club"; Skip and Escape only lower it. */
export function WelcomeGo({go,skip}:{go:string;skip:string}){
 const ref=useRef<HTMLButtonElement>(null)
 const close=useCallback((toPicker:boolean)=>{
  const root=document.documentElement
  try{localStorage.setItem(WELCOME_KEY,'1')}catch{/* storage is a convenience */}
  root.setAttribute('data-welcome','out')
  window.setTimeout(()=>{root.removeAttribute('data-welcome');if(toPicker)document.getElementById('pick')?.scrollIntoView({behavior:'smooth',block:'start'})},420)
 },[])
 useEffect(()=>{
  if(document.documentElement.getAttribute('data-welcome')!=='in')return
  ref.current?.focus({preventScroll:true})
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape')close(false)}
  window.addEventListener('keydown',key);return ()=>window.removeEventListener('keydown',key)
 },[close])
 return <div className="wko-go">
  <button ref={ref} type="button" className="wk-btn wko-kick min-h-tap" data-testid="welcome-go" onClick={()=>close(true)}>{go} <svg className="wkh-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
  <button type="button" className="wko-skip min-h-tap" data-testid="welcome-skip" onClick={()=>close(false)}>{skip}</button>
 </div>
}
