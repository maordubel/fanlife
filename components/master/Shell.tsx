import Link from 'next/link'
import type {CSSProperties,ReactNode} from 'react'
import type {Club} from '@/lib/master/types'
import {MASTER_PRIMARY} from '@/lib/master/theme'
import {clubTheme,rivalBans,themeStyle,type ClubTheme} from '@/lib/clubs/theme'
import {localeDirection,type UiLocale} from '@/lib/clubs/locale'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'

const ICON={fill:'none',stroke:'currentColor',strokeWidth:2.5,'aria-hidden':true} as const

/**
 * The magazine's cover furniture: sticky masthead bar, the STOP PRESS strip, the credit footer
 * and the phone tab bar. Every page of the site is wrapped in this (CLAUDE.md rule 91), so a
 * screen can be new but it cannot be off-brand.
 */
export function Shell({children,club,theme,locale='en',stop}:{children:ReactNode;club?:Club;theme?:ClubTheme;locale?:UiLocale;stop?:ReactNode}) {
 const copy=locale==='he'?he:en
 const identity=theme||(club?clubTheme(club):undefined)
 return <div className={`fl mag${identity?' club-theme':''}`} data-club={club?.id} data-pattern={identity?.pattern} data-rival-no={identity?rivalBans(identity).join(' ')||undefined:undefined} dir={localeDirection(locale)} lang={locale} style={identity?themeStyle(identity,locale):{'--club':MASTER_PRIMARY} as CSSProperties}>
  <a className="sr-only focus:not-sr-only" href="#main">{copy.skip}</a>
  <div className="mag-top"><div className="mag-top-in">
   <Link href="/" className="mag-logo" aria-label="FAN LIFE">FAN<b>LIFE</b></Link>
   <nav className="mag-nav" aria-label={copy.primaryNav}><Link href="/#clubs">{copy.clubs}</Link><Link href="/#archive">{copy.tabArchive}</Link><Link href="/#gates">{copy.gates}</Link><Link href="/master/core">{copy.data}</Link><Link href="/master/admin">{copy.admin}</Link></nav>
  </div></div>
  <div className="mag-stop">{stop===undefined?<div className="mag-stop-in"><b>{copy.stopPress}</b><span>{copy.evaluation} · {copy.evaluationNote}</span></div>:stop}</div>
  {children}
  <footer className="mag-foot"><div className="mag-printbar" aria-hidden="true"><i/><i/><i/><i/><i/><i/><u>+</u></div><div className="mag-foot-in">
   <div className="mag-mono">FAN LIFE · {copy.issue}<br/>{copy.footer}<br/>{copy.printed}</div>
   <div className="mag-barcode" aria-hidden="true"/>
   <div className="mag-mono"><Link className="mag-credit" href="/credits">{copy.credits}</Link><br/><Link className="mag-credit" href="/master/admin">{copy.administration}</Link></div>
   <a className="mag-credit" href="https://DubelTeam.com" target="_blank" rel="noopener noreferrer" aria-label={copy.creditAria}>{copy.credit} ↗</a>
  </div></footer>
  <nav className="mag-tabbar" aria-label={copy.primaryNav}>
   <Link href="/"><svg width="22" height="22" viewBox="0 0 24 24" {...ICON}><path d="M3 11l9-7 9 7v9H3z"/></svg>{copy.home}</Link>
   <Link href="/#clubs"><svg width="22" height="22" viewBox="0 0 24 24" {...ICON}><circle cx="12" cy="12" r="9"/><path d="M12 8l4 3-1.5 5h-5L8 11z"/></svg>{copy.tabClubs}</Link>
   <Link href="/#archive"><svg width="22" height="22" viewBox="0 0 24 24" {...ICON}><rect x="3" y="5" width="18" height="16"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>{copy.tabArchive}</Link>
   <Link href="/#gates"><svg width="22" height="22" viewBox="0 0 24 24" {...ICON}><rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/></svg>{copy.tabGames}</Link>
  </nav>
 </div>
}
export function Mark({club,theme}:{club:Club;theme?:ClubTheme}) {
 const identity=theme||clubTheme(club)
 return <span className="club-mark" style={{background:identity.primary,color:identity.onPrimary}} aria-label={`${club.name} · ${club.initials}`}>{club.initials}<small>FAN LIFE</small></span>
}
