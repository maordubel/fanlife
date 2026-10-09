import Link from 'next/link'
import {SHARED_GATES} from '@/lib/clubs/gates'
import {clubHref} from '@/lib/clubs/club-href'
import type {UiLocale} from '@/lib/clubs/locale'
import type {gameCopy} from '@/lib/clubs/game-copy'
import type {GateState} from './GateTickets'
import {wallNumbers,type Beloved} from '@/lib/clubs/beloved'

/**
 * The club's gate wall — The Worker's idea, in the club's own colours: a supporter does not pick a game from a list,
 * they walk in by a gate. Two-plate number (ink first, shifted a constant 3px; club colour on top), an ink foot with the
 * gate's name. All thirteen hang on the wall; a gate the club's archive cannot fill yet wears a SOON stamp and is not a link.
 * Gate 11 is the away end: no club colour at all.
 */
export function ClubGateWall({clubId,states,locale,games,soon,gateWord,beloved,featuredWord,featureTitle,terraceLine,away}:{clubId:string;states:readonly GateState[];locale:UiLocale;games:ReturnType<typeof gameCopy>;soon:string;gateWord:string;beloved?:Beloved|null;featuredWord?:string;featureTitle?:string;terraceLine?:string;away?:{open:boolean;href:string;name:string;note:string}}) {
 const on=(k:string)=>{const x=states.find(s=>s.key===k);return x?.allowed&&x.playable?1:0}
 const num=wallNumbers(beloved ?? null),big=beloved?SHARED_GATES.find(g=>g.key===beloved.feature):null
 return <ol className="gatewall" data-testid="gate-wall">{beloved&&big&&<li className="gp-cell gp-feature"><Link className="gp gp-big min-h-tap" data-gate={big.key} data-beloved={beloved.number??'shirt'} href={clubHref(clubId,big.key,locale)}>
  <span className="gp-head"><b>★ {featuredWord}</b><i>{beloved.local??beloved.name}</i></span>
  <span className="gp-well" aria-hidden="true">{beloved.number!==null?<><span className="gp-num gp-shift">{beloved.number}</span><span className="gp-num gp-top">{beloved.number}</span></>:<><span className="gp-num gp-shift">★</span><span className="gp-num gp-top">★</span></>}</span>
  <span className="gp-foot"><b>{featureTitle??games[`gate.${big.key}`]}</b><small>{games[`blurb.${big.key}`]}</small>{terraceLine&&<small className="gp-terrace">{terraceLine}</small>}<em>{games.play} →</em></span>
 </Link></li>}{[...SHARED_GATES].filter(g=>!big||g.key!==big.key).sort((a,b)=>(on(b.key)-on(a.key))||num[a.key]-num[b.key]).map(g=>{
  const s=states.find(x=>x.key===g.key),open=!!(s?.allowed&&s.playable),away=g.key==='derby'
  const inner=<>
   <span className="gp-head"><b>{gateWord}</b><i dir="ltr">{String(num[g.key]).padStart(2,'0')}</i></span>
   <span className="gp-well" aria-hidden="true"><span className="gp-num gp-shift">{num[g.key]}</span><span className="gp-num gp-top">{num[g.key]}</span></span>
   <span className="gp-foot"><b>{games[`gate.${g.key}`]}</b><small>{games[`blurb.${g.key}`]}</small></span>
   {!open&&<span className="gp-soon" aria-hidden="true">{soon}</span>}
  </>
  return <li key={g.key} className="gp-cell">{open
   ?<Link className="gp min-h-tap" data-gate={g.key} data-away={away||undefined} href={clubHref(clubId,g.key,locale)}>{inner}</Link>
   :<div className="gp gp-off" data-gate={g.key} data-away={away||undefined} aria-disabled="true">{inner}</div>}</li>})}{away&&<li className="gp-cell">{away.open?<Link className="gp gp-away min-h-tap" data-gate="away-days" href={away.href}>{awayInner(away,gateWord,soon,true)}</Link>:<div className="gp gp-away gp-off" data-gate="away-days" aria-disabled="true">{awayInner(away,gateWord,soon,false)}</div>}</li>}</ol>
}

function awayInner(a:{name:string;note:string},_g:string,soon:string,open:boolean){
 return <>
  <span className="gp-head"><b>AWAY</b><i dir="ltr">✈</i></span>
  <span className="gp-well" aria-hidden="true"><span className="gp-num gp-shift">✈</span><span className="gp-num gp-top">✈</span></span>
  <span className="gp-foot"><b>{a.name}</b><small>{a.note}</small></span>
  {!open&&<span className="gp-soon" aria-hidden="true">{soon}</span>}
 </>
}
