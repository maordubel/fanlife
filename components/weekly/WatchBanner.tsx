import {Plate} from '@/components/weekly/Plate'
import {CHANNEL} from '@/lib/stories/channel'

type Copy={watchKicker:string;watchShout:string;watchHead:string;watchText:string;watchCta:string;watchSub:string;watchNew:string}

/**
 * The YouTube channel as a page of the weekly (owner, 9.11.2026: "a beautiful designed banner for our YouTube page on
 * the home page, in the bottom menu and on every club's home"). The TV listings box: a navy screen with a comic plate
 * and the big play roundel, the shout, two doors (watch · subscribe). Every colour is a token, so on a club page the
 * rival lock re-points it (rule 95/124); the play mark is drawn, never a platform logo.
 */
export function WatchBanner({copy,club,ink='red'}:{copy:Copy;club?:string;ink?:'red'|'club'}){
 const q=`utm_source=fanlife&utm_medium=banner${club?`&utm_campaign=${encodeURIComponent(club)}`:''}`
 return <section className="wkt" aria-labelledby={`wkt-h${club?`-${club}`:''}`} data-watch="">
  <div className="wk-panel shadow wkt-in">
   <a className="wkt-screen wk-navyplate" href={`${CHANNEL.url}?${q}`} target="_blank" rel="noopener" aria-label={copy.watchCta}>
    <span className="wk-speed" aria-hidden="true"/>
    <Plate art="fans" ink={ink==='club'?'club':'red'} className="wkt-art"/>
    <span className={`wkt-play${ink==='club'?' club':''}`} aria-hidden="true"><svg viewBox="0 0 40 40" width="40" height="40"><path d="M14 9l17 11-17 11z"/></svg></span>
    <span className="wkt-tag wk-k" aria-hidden="true">{copy.watchNew}</span>
   </a>
   <div className="wkt-txt">
    <p className="wk-k wkt-kicker">{copy.watchKicker}</p>
    <p className="wk-shout wkt-shout" aria-hidden="true" dir="ltr">{copy.watchShout}</p>
    <h2 className="wk-head wkt-head" id={`wkt-h${club?`-${club}`:''}`}>{copy.watchHead}</h2>
    <p className="wkt-line">{copy.watchText}</p>
    <div className="wkt-doors">
     <a className={`wk-btn ${ink==='club'?'wkt-club':'red'} min-h-tap`} href={`${CHANNEL.url}?${q}`} target="_blank" rel="noopener">{copy.watchCta}</a>
     <a className="wk-btn paper min-h-tap" href={`${CHANNEL.url}?sub_confirmation=1&${q}`} target="_blank" rel="noopener">{copy.watchSub}</a>
    </div>
    <p className="wk-k wkt-handle" dir="ltr">{CHANNEL.handle}</p>
   </div>
  </div>
 </section>
}
