'use client'
import Link from 'next/link'
import {useEffect,useState,useSyncExternalStore} from 'react'
import {Icon} from '@/components/weekly/Icon'
import {addPin,isPinned,pinHref,pinsEnabled,readPins,removePin,setPinsEnabled,subscribeEnabled,subscribePins,writePins,type Pin} from '@/lib/fanlife/pins'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'

/**
 * Pinned shortcuts (owner audit 27.10.2026 §5.5) — places the fan chose himself. Deliberately NOT a discovery unit:
 * no data-discovery-unit, no snooze, no attention policy; they show whenever they exist and the switch is open.
 */
const NONE:Pin[]=[]
const copyOf=(locale:string)=>locale==='he'?he:en
const fill=(s:string,label:string)=>s.replace('{label}',label)

export function usePins():Pin[]{return useSyncExternalStore(subscribePins,readPins,()=>NONE)}
export function usePinsOn():boolean{return useSyncExternalStore(subscribeEnabled,pinsEnabled,()=>false)}

/** The page's server answer to door('pins'), handed to every pin surface on the page. Rendered by the menu. */
export function PinsSwitch({on}:{on:boolean}){useEffect(()=>{setPinsEnabled(on)},[on]);return null}

/** The toggle where a thing lives. Third pin → an inline question: which one to swap out (never a browser dialog). */
export function PinToggle({href,label,locale='en',tone='paper',compact=false}:{href:string;label:string;locale?:string;tone?:'paper'|'ink';compact?:boolean}){
 const on=usePinsOn(),pins=usePins(),[ask,setAsk]=useState(false),t=copyOf(locale)
 if(!on)return null
 const pinned=isPinned(pins,href)
 const press=()=>{
  if(pinned){writePins(removePin(pins,href));setAsk(false);return}
  const r=addPin(pins,href,label)
  if(r.ok){writePins(r.pins);setAsk(false)}else if(r.reason==='full')setAsk(true)
 }
 const swap=(out:string)=>{const r=addPin(pins,href,label,{replace:out});if(r.ok)writePins(r.pins);setAsk(false)}
 return <span className="wkp-toggle" data-tone={tone} data-compact={compact||undefined}>
  <button type="button" className="wkp-btn min-h-tap" aria-pressed={pinned} onClick={press} aria-label={fill(pinned?t.pinUnpinAria:t.pinPinAria,label)} data-pin-toggle={href}>
   <Icon name="pin" size={18}/><span className="wkp-btn-t">{pinned?t.pinPinned:t.pinPin}</span>
  </button>
  {ask&&!pinned&&<span className="wkp-ask" role="group" aria-label={fill(t.pinFull,label)}>
   <span className="wkp-ask-q">{fill(t.pinFull,label)}</span>
   {pins.map(p=><button key={p.href} type="button" className="wkp-ask-b min-h-tap" onClick={()=>swap(p.href)}>{fill(t.pinSwap,p.label)}</button>)}
   <button type="button" className="wkp-ask-b keep min-h-tap" onClick={()=>setAsk(false)}>{t.pinKeep}</button>
  </span>}
 </span>
}

/** "Your shortcuts": in the menu (with the empty line) and as a strip on the hub and a club home (silent when empty). */
export function PinsRow({locale='en',where,onPick}:{locale?:string;where:'menu'|'hub'|'club';onPick?:()=>void}){
 const on=usePinsOn(),pins=usePins(),t=copyOf(locale)
 if(!on)return null
 if(!pins.length&&where!=='menu')return null
 return <section className="wkp-row" data-where={where} data-pins={pins.length} aria-label={t.pinShortcuts}>
  <h3 className="wkp-h"><Icon name="pin" size={18}/>{t.pinShortcuts}<small>{t.pinYours}</small></h3>
  {pins.length
   ?<ul className="wkp-list">{pins.map(p=><li key={p.href}>
     <Link className="wkp-pin min-h-tap" href={pinHref(p,locale)} onClick={onPick} data-pin-kind={p.kind}><b>{p.label}</b><span aria-hidden="true">→</span></Link>
     <button type="button" className="wkp-x min-h-tap" aria-label={fill(t.pinUnpinAria,p.label)} onClick={()=>writePins(removePin(pins,p.href))}><Icon name="close" size={18}/></button>
    </li>)}</ul>
   :<p className="wkp-empty">{t.pinEmpty}</p>}
 </section>
}
