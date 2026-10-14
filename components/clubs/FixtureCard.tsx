import Link from 'next/link'
import type {ReactNode} from 'react'
import {clubHref} from '@/lib/clubs/club-href'
import {wearLivery} from '@/lib/club-livery'
import {localizedDate,type UiLocale} from '@/lib/clubs/locale'

export type Fx={opponent:string;kickoff:string;competition?:string|null}
/** A match ticket (rule 98): the body on paper, a torn stub in the club's own colour. */
export function MatchTicket({kicker,title,meta,children,stub,style,labelledBy}:{kicker:ReactNode;title:ReactNode;meta?:ReactNode;children?:ReactNode;stub:{small:string;big:string};style?:React.CSSProperties;labelledBy?:string}){
 return <article className="wk-ticket wkk-ticket" style={style} aria-labelledby={labelledBy}>
  <span className="wkk-ticket-notch" aria-hidden="true"/>
  <div className="wkk-ticket-body">
   <p className="wk-tag ink wkk-ticket-tag">{kicker}</p>
   <h3 className="wk-head wkk-ticket-h" id={labelledBy}>{title}</h3>
   {meta}
   {children}
  </div>
  <span className="wk-ticket-stub wkk-ticket-stub" aria-hidden="true"><small>{stub.small}</small><b className="wk-num">{stub.big}</b></span>
 </article>
}
/** The next confirmed match, or nothing: the caller decides what stands in when there is none. */
export function FixtureCard({clubId,clubName,fx,lv,locale,copy}:{clubId:string;clubName:string;fx:Fx;lv:Parameters<typeof wearLivery>[0]&{pattern:string};locale:UiLocale;copy:{kicker:string;vs:string;cta:string;kick?:string}}) {
 const day=fx.kickoff.slice(0,10),short=localizedDate(day,locale).split(' ').slice(0,2).join(' ')
 return <section className="wkk-next" id="next">
  <MatchTicket labelledBy="next-h" style={wearLivery(lv)} kicker={copy.kicker} title={<><span>{clubName}</span> <span className="wkk-v">{copy.vs}</span> <bdi>{fx.opponent}</bdi></>}
   meta={<p className="wk-k muted wkk-ticket-meta"><time dateTime={fx.kickoff}>{localizedDate(day,locale)}</time>{fx.competition?` · ${fx.competition}`:''}</p>}
   stub={{small:copy.kick??copy.kicker,big:short}}>
   <Link className="wk-btn red wkk-ticket-cta min-h-tap" href={`${clubHref(clubId,'meetings',locale)}${locale==='en'?'?':'&'}vs=${encodeURIComponent(fx.opponent)}`}>{copy.cta}<span aria-hidden="true">→</span></Link>
  </MatchTicket>
 </section>
}
