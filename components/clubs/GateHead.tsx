import {ENABLED_LOCALES} from '@/lib/clubs/locale'
import Link from 'next/link'
import {livery} from '@/lib/club-livery'

export type GateHeadProps={clubId:string;clubName:string;hubLabel:string;gateNo:string;gateNoLabel:string;title:string;state?:string;stateLabel?:string;locale:string;langLinks:{l:string;label:string;href:string}[]}

/** The masthead of one gate — shared by every club game page so the whole wing reads as one printed issue. */
export function GateHead({clubId,clubName,hubLabel,gateNo,gateNoLabel,title,state,stateLabel,locale,langLinks}:GateHeadProps){
 const lv=livery(clubId)
 return <header className="mag-gamehead" data-sig-layout={lv?.layout}>
  <nav className="mag-gamenav"><Link className="min-h-tap" href={`/clubs/${clubId}?lang=${locale}`}>{hubLabel} · <bdi>{clubName}</bdi> ↗</Link><div>{langLinks.filter(x=>ENABLED_LOCALES.includes(x.l as 'en')).length>1&&langLinks.map(x=><Link key={x.l} className="min-h-tap" aria-current={x.l===locale?'true':undefined} href={x.href} hrefLang={x.l}>{x.label}</Link>)}</div></nav>
  <div className="mag-gamehead-row" data-n={gateNo}>{lv&&<span className="mag-badge" data-livery={lv.pattern} aria-hidden="true">{lv.initials}</span>}<div><p className="mag-kicker">{gateNoLabel} <bdi>{gateNo}</bdi> · <bdi>{clubName}</bdi></p><h1 className="mag-editorial" data-text={title}>{title}</h1></div></div>
  {state&&<span className="mag-gate-stamp" data-state={state} role="status">{stateLabel}</span>}
  <span className="mag-band" data-livery={lv?.pattern} aria-hidden="true"/>
 </header>
}
