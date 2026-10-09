'use client'
import {useCallback,useEffect,useState} from 'react'

/**
 * The walk in: two gate leaves in the club's colour swing open over a home page that is already rendered beneath
 * (a shared link, a crawler and a slow phone reach it either way). Once per session per club; a tap, Escape or its
 * own end dismisses it; off under prefers-reduced-motion. The seen-flag is written when it ENDS (as The Worker's does).
 */
const HOLD_MS=2400
export function ClubEntrance({clubId,name,tap}:{clubId:string;name:string;tap:string}) {
 const key=`fanlife:entrance:${clubId}`
 const [open,setOpen]=useState(false)
 useEffect(()=>{try{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;if(window.sessionStorage.getItem(key))return}catch{}setOpen(true)},[key])
 const end=useCallback(()=>{setOpen(false);try{window.sessionStorage.setItem(key,'1')}catch{}},[key])
 useEffect(()=>{if(!open)return;const t=window.setTimeout(end,HOLD_MS),k=(e:KeyboardEvent)=>{if(e.key==='Escape')end()};window.addEventListener('keydown',k);return()=>{window.clearTimeout(t);window.removeEventListener('keydown',k)}},[open,end])
 if(!open)return null
 return <button type="button" className="club-entrance min-h-tap" data-club-entrance={clubId} aria-label={tap} onClick={end}>
  <span className="ce-leaf ce-l mag-band" aria-hidden="true"/><span className="ce-leaf ce-r mag-band" aria-hidden="true"/>
  <span className="ce-name"><b>{name}</b><small>{tap}</small></span>
 </button>
}
