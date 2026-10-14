'use client'
import {useState,type ReactNode} from 'react'
import Link from 'next/link'
import {SlideSheet} from '@/components/stage/SlideSheet'
import {livery} from '@/lib/club-livery'
import {ENABLED_LOCALES} from '@/lib/clubs/locale'
import { Badge } from '@/components/clubs/Badge'

export type PlayHeaderProps={
 clubId:string;clubName:string;title:string;locale:string
 /** the gate's one-sentence rules — what the "?" opens */
 help:string
 copy:{back:string;help:string;close:string;fanlife:string;language:string}
 langLinks:{l:string;label:string;href:string}[]
 /** a score, a counter, a timer — whatever the board wants in the corner; printed on split-flap lamps */
 aside?:ReactNode
 /** the gate's printed number ("02") and its word ("Gate"), for the tag beside the name */
 gateNo?:string;gateWord?:string
}

/**
 * The play header — THE WEEKLY's scoreboard (rule 124): one dark bar once a round is on the glass — leave (✕), the
 * club's crest, the gate's name in the masthead face, the gate's number, a "?" — instead of the full masthead, which
 * on a 390×844 phone is most of the first screen. On a desktop the same bar is the red masthead strip of the spread.
 * The masthead stays for the reading gates (`GateHead`). Targets are ≥44px, the sheet traps focus and closes on
 * Escape (`useDialog`), and nothing here animates.
 */
export function PlayHeader({clubId,clubName,title,locale,help,copy,langLinks,aside,gateNo,gateWord}:PlayHeaderProps){
 const [open,setOpen]=useState(false),lv=livery(clubId),langs=langLinks.filter(x=>ENABLED_LOCALES.includes(x.l as 'en'))
 return <header className="wk-hud wga-hud" data-testid="play-header">
  <Link className="wga-hud-back" href={`/clubs/${clubId}?lang=${locale}`} aria-label={`${copy.back}: ${clubName}`}>
   <svg className="wga-hud-x" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
   <svg className="wga-hud-chev" viewBox="0 0 24 24" aria-hidden="true"><path d={locale==='he'?'M9 5l7 7-7 7':'M15 5l-7 7 7 7'}/></svg>
  </Link>
  <div className="wga-hud-title">
   {lv&&<Badge club={lv}/>}
   <div className="wga-hud-words">
    <p className="wga-hud-kicker"><bdi>{clubName}</bdi>{gateNo&&<span className="wga-hud-kgate"> · {gateWord} <bdi>{gateNo}</bdi></span>}</p>
    <h1 className="wga-hud-name" data-long={title.length>13||undefined}><bdi>{title}</bdi></h1>
   </div>
   {gateNo&&<span className="wga-hud-gate" aria-hidden="true">{gateWord} {gateNo}</span>}
  </div>
  {aside&&<div className="wga-hud-aside">{aside}</div>}
  <Link className="wga-hud-mark" href="/" aria-label={copy.fanlife}>{/* eslint-disable-next-line @next/next/no-img-element -- 28px mark, shipped as measured */}<img src="/brand/fanlife/logo-mono.webp" alt="" width={28} height={28}/></Link>
  <button type="button" className="wga-hud-help min-h-tap" aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(true)}><span aria-hidden="true">?</span><span className="sr-only">{copy.help}</span></button>
  <SlideSheet open={open} onClose={()=>setOpen(false)} title={copy.help} closeLabel={copy.close}>
   <p className="mag-playhead-rules">{help}</p>
   {langs.length>1&&<nav aria-label={copy.language} className="mag-playhead-langs">{langs.map(x=><Link key={x.l} className="mag-chip min-h-tap" aria-current={x.l===locale?'true':undefined} href={x.href} hrefLang={x.l}>{x.label}</Link>)}</nav>}
  </SlideSheet>
 </header>
}
