import Link from 'next/link'
import type {CSSProperties,ReactNode} from 'react'
import type {Club} from '@/lib/master/types'
import {MASTER_PRIMARY} from '@/lib/master/theme'
import {clubTheme,themeStyle,type ClubTheme} from '@/lib/clubs/theme'
import {localeDirection,type UiLocale} from '@/lib/clubs/locale'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'

export function Shell({children,club,theme,locale='en'}:{children:ReactNode;club?:Club;theme?:ClubTheme;locale?:UiLocale}) {
 const copy=locale==='he'?he:en
 const identity=theme||(club?clubTheme(club):undefined)
 return <div className={`fl${identity?' club-theme':''}`} data-club={club?.id} data-pattern={identity?.pattern} dir={localeDirection(locale)} lang={locale} style={identity?themeStyle(identity,locale):{'--club':MASTER_PRIMARY} as CSSProperties}>
  <a className="sr-only focus:not-sr-only" href="#main">{copy.skip}</a>
  <header><Link href="/" className="wordmark"><b>FL<span>✦</span></b><span>FAN LIFE<small>{copy.tagline}</small></span></Link><nav><Link href="/#clubs">{copy.clubs}</Link><Link href="/#gates">{copy.gates}</Link><Link href="/master/core">{copy.data}</Link><Link href="/master/admin">{copy.admin}</Link></nav><small className="edition">EST. 2026<br/>{copy.edition}</small></header>
  <div className="evaluation">{copy.evaluation}<span>{copy.evaluationNote}</span><Link href="/master/test-lab">{copy.test}</Link></div>
  {children}
  <footer><strong>FAN LIFE</strong><p>{copy.footer}</p><div>Built by DUBEL<br/><Link href="/credits">{copy.credits}</Link><br/><Link href="/master/admin">{copy.administration}</Link></div></footer>
 </div>
}
export function Mark({club,theme}:{club:Club;theme?:ClubTheme}) {
 const identity=theme||clubTheme(club)
 return <span className="club-mark" style={{background:identity.primary,color:identity.onPrimary}} aria-label={`${club.name} · ${club.initials}`}>{club.initials}<small>FAN LIFE</small></span>
}
