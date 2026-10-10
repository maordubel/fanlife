'use client'
import {useState} from 'react'
import Link from 'next/link'
import {SlideSheet} from '@/components/stage/SlideSheet'
import {clubHref} from '@/lib/clubs/club-href'
import type {UiLocale} from '@/lib/clubs/locale'
import { Badge } from '@/components/clubs/Badge'

export type SwitchClub={id:string;name:string;city:string;initials:string;pattern:string;style:Record<string,string>|undefined}

/**
 * "Pick your club": the one place a visitor leaves this club's world for another, for the market or for their own corner.
 * The list is the clubs that are open; each wears its own livery on a badge and nowhere else.
 */
export function ClubSwitcher({current,clubs,locale,copy}:{current:string;clubs:SwitchClub[];locale:UiLocale;copy:Record<'switch'|'title'|'note'|'here'|'close'|'market'|'me'|'hub',string>}) {
 const [open,setOpen]=useState(false)
 return <>
  <button type="button" className="club-switch min-h-tap" onClick={()=>setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>{copy.switch}<span aria-hidden="true">▾</span></button>
  <SlideSheet open={open} onClose={()=>setOpen(false)} title={copy.title} closeLabel={copy.close}>
   <p className="club-switch-note">{copy.note}</p>
   <ul className="club-switch-list">
    {clubs.map(c=><li key={c.id}>
     <Link href={clubHref(c.id,'',locale)} className="club-switch-row" aria-current={c.id===current?'true':undefined} onClick={()=>setOpen(false)}>
      <Badge club={c} style={c.style}/>
      <span><b>{c.name}</b><small>{c.id===current?copy.here:c.city}</small></span>
     </Link>
    </li>)}
   </ul>
   <div className="club-switch-more">
    <Link href="/#clubs" onClick={()=>setOpen(false)}>{copy.hub}</Link>
    <Link href="/market" onClick={()=>setOpen(false)}>{copy.market}</Link>
    <Link href="/me" onClick={()=>setOpen(false)}>{copy.me}</Link>
   </div>
  </SlideSheet>
 </>
}
