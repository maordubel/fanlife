import {ENABLED_LOCALES} from '@/lib/clubs/locale'
import Link from 'next/link'
import {livery} from '@/lib/club-livery'
import { Badge } from '@/components/clubs/Badge'

export type GateHeadProps={clubId:string;clubName:string;hubLabel:string;gateNo:string;gateNoLabel:string;title:string;state?:string;stateLabel?:string;locale:string;langLinks:{l:string;label:string;href:string}[]}

/** The masthead of one gate — shared by every club game page so the whole wing reads as one printed issue. */
export function GateHead({clubId,clubName,hubLabel,gateNo,gateNoLabel,title,state,stateLabel,locale,langLinks}:GateHeadProps){
 const lv=livery(clubId)
 return <header className="mag-gamehead" data-sig-layout={lv?.layout}>
  <nav className="mag-gamenav"><div className="mag-gamenav-l"><Link className="mag-gamebrand min-h-tap" href="/" aria-label="FAN LIFE">{/* eslint-disable-next-line @next/next/no-img-element -- 64px mark, shipped as measured */}<img src="/brand/fanlife/logo-mono.webp" alt="" width={28} height={28}/><span>FAN <i>LIFE</i></span></Link><Link className="min-h-tap" href={`/clubs/${clubId}?lang=${locale}`}>{hubLabel} · <bdi>{clubName}</bdi> ↗</Link></div><div>{langLinks.filter(x=>ENABLED_LOCALES.includes(x.l as 'en')).length>1&&langLinks.map(x=><Link key={x.l} className="min-h-tap" aria-current={x.l===locale?'true':undefined} href={x.href} hrefLang={x.l}>{x.label}</Link>)}</div></nav>
  <div className="mag-gamehead-row" data-n={gateNo}>{lv&&<Badge club={lv}/>}<div><p className="mag-kicker">{gateNoLabel} <bdi>{gateNo}</bdi> · <bdi>{clubName}</bdi></p><h1 className="mag-editorial" data-text={title}>{title}</h1></div></div>
  {state&&<span className="mag-gate-stamp" data-state={state} role="status">{stateLabel}</span>}
  <span className="mag-band" data-livery={lv?.pattern} aria-hidden="true"/>
 </header>
}
