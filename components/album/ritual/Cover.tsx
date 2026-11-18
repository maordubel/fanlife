'use client'
import {useState} from 'react'
import {albumSound} from '../sound'
import {livery} from '../Sticker'
import type {WingInfo} from '@/lib/album/view'
import {RetroFront} from './RetroFront'

/**
 * The album's cover (18.11.2026): a stiff board in the club's cloth, the title pressed into it, the FAN LIFE roundel
 * stamped on, the owner's name written on the label. Opening it is a gesture: the board swings open on its spine with
 * its weight, the endpaper shows, the book is there. Once per visit; afterwards the album opens straight away.
 */
export function Cover({w,name,total,chips,onOpen}:{w:WingInfo;name?:string;total:number;chips:string[];onOpen:()=>void}){
 const [open,setOpen]=useState(false)
 const go=()=>{if(open)return;setOpen(true);albumSound.cover();setTimeout(()=>albumSound.page(),420);setTimeout(onOpen,1100)}
 return <div className="rk-cover-stage" style={livery(w)} data-open={open||undefined}>
  <div className="rk-endpaper" aria-hidden="true"><span className="rk-endpaper-logo"/></div>
  <button type="button" className="rk-cover min-h-tap" onClick={go} aria-label="Open the album">
   <span className="rk-cover-face rk-cover-retro"><RetroFront kind="cover" wing={w.name} total={total} chips={chips} owner={name}/>
    <span className="rk-cover-open">Open ›</span></span>
   <span className="rk-cover-inside" aria-hidden="true"/>
  </button>
 </div>
}
