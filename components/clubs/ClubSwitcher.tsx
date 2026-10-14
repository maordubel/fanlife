'use client'
import {useState} from 'react'
import Link from 'next/link'
import {SlideSheet} from '@/components/stage/SlideSheet'
import {clubHref} from '@/lib/clubs/club-href'
import type {UiLocale} from '@/lib/clubs/locale'
import { Badge } from '@/components/clubs/Badge'
import {Icon} from '@/components/weekly/Icon'

export type SwitchClub={id:string;name:string;city:string;initials:string;pattern:string;style:Record<string,string>|undefined;/** printed in one ink on this page: its colour is this club's rival's (rule 95) */rival?:boolean}

/**
 * THE WEEKLY's club button (rule 124): the crest and the name of the club you are in; a tap opens "Top Teams" — every open
 * club as a sticker in a grid that wraps (never a sideways list), plus the market, your corner and the front page.
 */
export function ClubSwitcher({current,clubs,locale,copy}:{current:string;clubs:SwitchClub[];locale:UiLocale;copy:Record<'switch'|'title'|'note'|'here'|'close'|'market'|'me'|'hub',string>}) {
 const [open,setOpen]=useState(false),here=clubs.find(c=>c.id===current)
 return <>
  <button type="button" className="wk-club-btn club-switch min-h-tap" onClick={()=>setOpen(true)} aria-haspopup="dialog" aria-expanded={open} aria-label={`${copy.switch} — ${here?.name??''}`}>
   {here&&<Badge club={here} style={here.style}/>}<span>{here?.name??copy.switch}</span><Icon name="chev" size={18}/>
  </button>
  <SlideSheet open={open} onClose={()=>setOpen(false)} title={copy.title} closeLabel={copy.close}>
   <p className="club-switch-note">{copy.note}</p>
   <ul className="club-switch-list wk-crests">
    {clubs.map(c=><li key={c.id} style={{display:'contents'}}>
     <Link href={clubHref(c.id,'',locale)} className="wk-crest club-switch-row" aria-current={c.id===current?'true':undefined} data-rival={c.rival||undefined} onClick={()=>setOpen(false)}>
      <Badge club={c} style={c.style}/>
      <span style={{minWidth:0}}><b>{c.name}</b><small>{c.id===current?copy.here:c.city}</small></span>
     </Link>
    </li>)}
   </ul>
   <div className="club-switch-more">
    <Link className="wk-seeall" href="/#clubs" onClick={()=>setOpen(false)}>{copy.hub}<span aria-hidden="true">→</span></Link>
    <Link className="wk-btn paper" href="/market" onClick={()=>setOpen(false)}>{copy.market}</Link>
    <Link className="wk-btn paper" href="/me" onClick={()=>setOpen(false)}>{copy.me}</Link>
   </div>
  </SlideSheet>
 </>
}
