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
export type H2H={played:number;won:number;drawn:number;lost:number;form:('W'|'D'|'L')[]}
export function FixtureCard({clubId,clubName,fx,lv,locale,copy,h2h}:{clubId:string;clubName:string;fx:Fx;lv:Parameters<typeof wearLivery>[0]&{pattern:string};locale:UiLocale;copy:{kicker:string;vs:string;cta:string;kick?:string;h2h?:{met:string;won:string;drawn:string;lost:string;first:string}};h2h?:H2H|null}) {
 const day=fx.kickoff.slice(0,10),short=localizedDate(day,locale).split(' ').slice(0,2).join(' ')
 return <section className="wkk-next" id="next">
  <MatchTicket labelledBy="next-h" style={wearLivery(lv)} kicker={copy.kicker} title={<><span>{clubName}</span> <span className="wkk-v">{copy.vs}</span> <bdi>{fx.opponent}</bdi></>}
   meta={<p className="wk-k muted wkk-ticket-meta"><time dateTime={fx.kickoff}>{localizedDate(day,locale)}</time>{fx.competition?` · ${fx.competition}`:''}</p>}
   stub={{small:copy.kick??copy.kicker,big:short}}>
   {copy.h2h&&<p className="wkk-ticket-h2h" data-testid="fixture-h2h">{h2h&&h2h.played>0?<>
    <b>{copy.h2h.met.replace('{n}',String(h2h.played))}</b>
    <span className="wkk-h2h-tally"><span>{h2h.won} {copy.h2h.won}</span><span>{h2h.drawn} {copy.h2h.drawn}</span><span>{h2h.lost} {copy.h2h.lost}</span></span>
    <span className="wkk-h2h-form" aria-hidden="true">{h2h.form.map((r,i)=><i key={i} data-r={r}>{r}</i>)}</span></>
    :<b>{copy.h2h.first}</b>}</p>}
   <Link className="wk-btn red wkk-ticket-cta min-h-tap" href={`${clubHref(clubId,'meetings',locale)}${locale==='en'?'?':'&'}vs=${encodeURIComponent(fx.opponent)}`}>{copy.cta}<span aria-hidden="true">→</span></Link>
  </MatchTicket>
 </section>
}
