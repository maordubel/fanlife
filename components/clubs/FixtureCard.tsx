import Link from 'next/link'
import {Dye} from '@/components/master/Dye'
import {clubHref} from '@/lib/clubs/club-href'
import {wearLivery} from '@/lib/club-livery'
import type {UiLocale} from '@/lib/clubs/locale'

export type Fx={opponent:string;kickoff:string;competition?:string|null}
/** The next confirmed match, or nothing: the caller decides what stands in when there is none. */
export function FixtureCard({clubId,clubName,fx,lv,locale,copy}:{clubId:string;clubName:string;fx:Fx;lv:Parameters<typeof wearLivery>[0]&{pattern:string};locale:UiLocale;copy:{kicker:string;vs:string;cta:string}}) {
 return <section className="mag-section mag-homefixture" id="next"><Dye art="boot-ball-ticket" className="mag-homeprop"/><div><div className="mag-head"><div><p className="mag-kicker">{copy.kicker}</p></div></div><article className="mag-fixture" style={wearLivery(lv)}><span className="mag-band" data-livery={lv.pattern} aria-hidden="true"/><div className="mag-fixture-body"><h3><span>{clubName}</span> {copy.vs} {fx.opponent}</h3><p className="mag-fixture-meta"><time dateTime={fx.kickoff}>{fx.kickoff.slice(0,10)}</time>{fx.competition?` · ${fx.competition}`:''}</p><Link className="mag-cta red" href={`${clubHref(clubId,'meetings',locale)}${locale==='en'?'?':'&'}vs=${encodeURIComponent(fx.opponent)}`}>{copy.cta}<span aria-hidden="true">→</span></Link></div></article></div></section>
}
