'use client'
import {useState,type ReactNode} from 'react'
import Link from 'next/link'
import {SlideSheet} from '@/components/stage/SlideSheet'
import {livery} from '@/lib/club-livery'
import {ENABLED_LOCALES} from '@/lib/clubs/locale'

export type PlayHeaderProps={
 clubId:string;clubName:string;title:string;locale:string
 /** the gate's one-sentence rules — what the "?" opens */
 help:string
 copy:{back:string;help:string;close:string;fanlife:string;language:string}
 langLinks:{l:string;label:string;href:string}[]
 /** a score, a counter, a timer — whatever the board wants in the corner */
 aside?:ReactNode
}

/**
 * The play header (Wave 0, 8.10.2026): one 52px row once a round is on the glass — back to the club,
 * the club's badge, the gate's name, a "?" — instead of the full masthead, which on a 390×844 phone is
 * most of the first screen. The masthead stays for the reading gates (`GateHead`).
 * Targets are ≥44px, the sheet traps focus and closes on Escape (`useDialog`), and nothing here animates.
 */
export function PlayHeader({clubId,clubName,title,locale,help,copy,langLinks,aside}:PlayHeaderProps){
 const [open,setOpen]=useState(false),lv=livery(clubId),langs=langLinks.filter(x=>ENABLED_LOCALES.includes(x.l as 'en'))
 return <header className="mag-playhead" data-testid="play-header">
  <Link className="mag-playhead-back" href={`/clubs/${clubId}?lang=${locale}`} aria-label={`${copy.back}: ${clubName}`}><span aria-hidden="true">{locale==='he'?'→':'←'}</span><span className="mag-playhead-backtext">{copy.back}</span></Link>
  <div className="mag-playhead-title">{lv&&<span className="mag-badge" data-livery={lv.pattern} aria-hidden="true">{lv.initials}</span>}<div><p className="mag-playhead-kicker"><bdi>{clubName}</bdi></p><h1><bdi>{title}</bdi></h1></div></div>
  {aside&&<div className="mag-playhead-aside">{aside}</div>}
  <Link className="mag-playhead-mark" href="/" aria-label={copy.fanlife}>{/* eslint-disable-next-line @next/next/no-img-element -- 28px mark, shipped as measured */}<img src="/brand/fanlife/logo-mono.webp" alt="" width={28} height={28}/></Link>
  <button type="button" className="mag-playhead-help" aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(true)}><span aria-hidden="true">?</span><span className="sr-only">{copy.help}</span></button>
  <SlideSheet open={open} onClose={()=>setOpen(false)} title={copy.help} closeLabel={copy.close}>
   <p className="mag-playhead-rules">{help}</p>
   {langs.length>1&&<nav aria-label={copy.language} className="mag-playhead-langs">{langs.map(x=><Link key={x.l} className="mag-chip min-h-tap" aria-current={x.l===locale?'true':undefined} href={x.href} hrefLang={x.l}>{x.label}</Link>)}</nav>}
  </SlideSheet>
 </header>
}
