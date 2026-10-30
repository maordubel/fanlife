import Link from 'next/link'
import type {CSSProperties,ReactNode} from 'react'
import type {Club} from '@/lib/master/types'
import {MASTER_PRIMARY} from '@/lib/master/theme'
import {clubTheme,rivalBans,themeStyle,type ClubTheme} from '@/lib/clubs/theme'
import {localeDirection,type UiLocale} from '@/lib/clubs/locale'
import {TabBar} from './TabBar'
import {evaluationMode} from '@/lib/master/mode'
import {readState} from '@/lib/master/store'
import {Contents} from '@/components/weekly/Contents'
import {hubSections,menuApps,menuClubs,menuCopy,menuCorner,menuFanLife} from '@/lib/weekly/menu'
import {featuresOf} from '@/lib/features'
import {isOwner} from '@/lib/features-server'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'

/**
 * The magazine's cover furniture: sticky masthead bar, the STOP PRESS strip, the credit footer
 * and the phone tab bar. The FAN LIFE seal (Maor's logo, 7.10.2026) sits in the masthead and the
 * footer — in grey on a club's page, where its colours could be that club's rival's. Every page of the site is wrapped in this (CLAUDE.md rule 91), so a
 * screen can be new but it cannot be off-brand.
 */
export function Shell({children,club,theme,locale='en',stop}:{children:ReactNode;club?:Club;theme?:ClubTheme;locale?:UiLocale;stop?:ReactNode}) {
 const copy=locale==='he'?he:en
 const identity=theme||(club?clubTheme(club):undefined)
 return <div className={`fl mag${identity?' club-theme':''}`} data-club={club?.id} data-pattern={identity?.pattern} data-rival-no={identity?rivalBans(identity).join(' ')||undefined:undefined} dir={localeDirection(locale)} lang={locale} style={identity?themeStyle(identity,locale):{'--club':MASTER_PRIMARY} as CSSProperties}>
  <div className="mag-top"><div className="mag-top-in">
   <Link href="/" className="mag-logo" aria-label="FAN LIFE"><img className="mag-seal-logo" src={identity?'/brand/fanlife/logo-mono.webp':'/brand/fanlife/logo-96.png'} alt="" width={40} height={40}/>Fan <b>Life</b></Link>
   <nav className="mag-nav" aria-label={copy.primaryNav}><Link href="/#clubs">{copy.clubs}</Link><Link href="/our-games">{copy.tabOurGames}</Link><Link href="/market">{copy.tabMarket}</Link><Link href="/me">{copy.corner}</Link></nav>
   <HubMenu locale={locale} current={club?.id??null} theme={identity}/>
  </div></div>
  {stop!==undefined?<div className="mag-stop">{stop}</div>:evaluationMode()?<div className="mag-stop"><div className="mag-stop-in"><b>{copy.stopPress}</b><span>{copy.evaluation} · {copy.evaluationNote}</span></div></div>:null}
  {children}
  <footer className="mag-foot"><div className="mag-printbar" aria-hidden="true"><i/><i/><i/><i/><i/><i/><u>+</u></div><div className="mag-foot-in">
   <div className="mag-mono">FAN LIFE · {copy.issue}<br/>{copy.footer}<br/>{copy.printed}</div>
   <img className="mag-foot-logo" src={identity?'/brand/fanlife/logo-mono.webp':'/brand/fanlife/logo-192.png'} alt="FAN LIFE — Football. Forever." width={96} height={96} loading="lazy"/>
   <div className="mag-barcode" aria-hidden="true"/>
   <div className="mag-mono"><Link className="mag-credit" href="/sources">{copy.credits}</Link><br/><Link className="mag-credit" href="/master/admin">{copy.administration}</Link></div>
   <nav className="mag-mono mag-foot-legal" aria-label="FAN LIFE"><Link className="mag-credit" href="/about">About</Link> · <Link className="mag-credit" href="/privacy">Privacy</Link> · <Link className="mag-credit" href="/terms">Terms</Link> · <Link className="mag-credit" href="/contact">Contact</Link> · <a className="mag-credit" href="https://www.dubelteam.com/games.html">More games ↗</a></nav>
   <a className="mag-credit" href="https://DubelTeam.com" target="_blank" rel="noopener noreferrer" aria-label={copy.creditAria}>{copy.credit} ↗</a>
  </div></footer>
  <TabBar locale={locale}/>
 </div>
}
export {Mark} from './Mark'

/** THE WEEKLY's menu in the masthead (rule 124): the contents page — the paper, your corner, every club. */
async function HubMenu({locale,current,theme}:{locale:UiLocale;current:string|null;theme?:ClubTheme}) {
 const t=menuCopy(locale),state=await readState().catch(()=>null),pins=featuresOf(state).pins||isOwner()
 return <Contents tone="paper" rivalNo={theme?rivalBans(theme).join(' ')||undefined:undefined} paint={theme?themeStyle(theme,locale) as Record<string,string>:undefined}
  copy={{menu:t.wkMenu,title:t.wkContents,kicker:t.wkKickerHub,close:t.wkClose,corner:t.wkCorner,clubs:t.wkClubs,fanlife:t.wkFanLife,section:t.wkPaper,apps:t.pinApps}} pins={pins} locale={locale} apps={menuApps(locale,current)}
  sections={hubSections(locale)} corner={menuCorner(locale)} clubs={menuClubs(state?.clubs??[],current,locale,theme)} fanlife={menuFanLife(locale)}/>
}
