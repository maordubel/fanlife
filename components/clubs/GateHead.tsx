import {ENABLED_LOCALES} from '@/lib/clubs/locale'
import Link from 'next/link'
import {livery} from '@/lib/club-livery'
import { Badge } from '@/components/clubs/Badge'
import {PinToggle} from '@/components/fanlife/Pins'

export type GateHeadProps={clubId:string;clubName:string;hubLabel:string;gateNo:string;gateNoLabel:string;title:string;state?:string;stateLabel?:string;locale:string;langLinks:{l:string;label:string;href:string}[];/** the route and name a Pin toggle pins (switch `pins`) */pin?:{href:string;label:string}}

/**
 * The masthead of one gate — THE WEEKLY (rule 124): a red plate printed in halftone, the gate's name in the masthead
 * face, its number on a roundel like a magazine's price, the club's crest. Shared by every club gate that is read rather
 * than played, so the whole wing reads as one printed issue. The FAN LIFE mark stays in its nav (mono on a club page).
 */
export function GateHead({clubId,clubName,hubLabel,gateNo,gateNoLabel,title,state,stateLabel,locale,langLinks,pin}:GateHeadProps){
 const lv=livery(clubId)
 return <header className="wga-mast" data-sig-layout={lv?.layout}>
  <nav className="wga-mast-nav"><div className="wga-mast-navl"><Link className="wga-mast-brand min-h-tap" href="/" aria-label="FAN LIFE">{/* eslint-disable-next-line @next/next/no-img-element -- 64px mark, shipped as measured */}<img src="/brand/fanlife/logo-mono.webp" alt="" width={28} height={28}/><span>FAN LIFE</span></Link><Link className="wga-mast-club min-h-tap" href={`/clubs/${clubId}?lang=${locale}`}>{hubLabel} · <bdi>{clubName}</bdi> ↗</Link></div><div className="wga-mast-langs">{langLinks.filter(x=>ENABLED_LOCALES.includes(x.l as 'en')).length>1&&langLinks.map(x=><Link key={x.l} className="min-h-tap" aria-current={x.l===locale?'true':undefined} href={x.href} hrefLang={x.l}>{x.label}</Link>)}</div></nav>
  <div className="wga-mast-plate wk-redplate" data-n={gateNo}>
   <span className="wk-speed" aria-hidden="true"/>
   <div className="wga-mast-row">
    {lv&&<Badge club={lv}/>}
    <div className="wga-mast-words">
     <p className="wga-mast-kicker">{gateNoLabel} <bdi>{gateNo}</bdi> · <bdi>{clubName}</bdi></p>
     <h1 className="wga-mast-title wk-logo" data-text={title}><bdi>{title}</bdi></h1>
    </div>
   </div>
   <span className="wga-mast-no wk-roundel" aria-hidden="true"><small>{gateNoLabel}</small><b>{gateNo}</b></span>
  </div>
  {pin&&<div className="wkp-under"><PinToggle href={pin.href} label={pin.label} locale={locale}/></div>}
  {state&&<span className="wga-mast-stamp wk-stamp" data-state={state} role="status">{stateLabel}</span>}
 </header>
}
