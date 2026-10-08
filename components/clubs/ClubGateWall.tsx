import Link from 'next/link'
import {SHARED_GATES} from '@/lib/clubs/gates'
import {clubHref} from '@/lib/clubs/club-href'
import type {UiLocale} from '@/lib/clubs/locale'
import type {gameCopy} from '@/lib/clubs/game-copy'
import type {GateState} from './GateTickets'

/**
 * The club's gate wall — The Worker's idea, in the club's own colours: a supporter does not pick a game from a list,
 * they walk in by a gate. Two-plate number (ink first, shifted a constant 3px; club colour on top), an ink foot with the
 * gate's name. All thirteen hang on the wall; a gate the club's archive cannot fill yet wears a SOON stamp and is not a link.
 * Gate 11 is the away end: no club colour at all.
 */
export function ClubGateWall({clubId,states,locale,games,soon,gateWord}:{clubId:string;states:readonly GateState[];locale:UiLocale;games:ReturnType<typeof gameCopy>;soon:string;gateWord:string}) {
 return <ol className="gatewall" data-testid="gate-wall">{SHARED_GATES.map(g=>{
  const s=states.find(x=>x.key===g.key),open=!!(s?.allowed&&s.playable),away=g.key==='derby'
  const inner=<>
   <span className="gp-head"><b>{gateWord}</b><i dir="ltr">{String(g.number).padStart(2,'0')}</i></span>
   <span className="gp-well" aria-hidden="true"><span className="gp-num gp-shift">{g.number}</span><span className="gp-num gp-top">{g.number}</span></span>
   <span className="gp-foot"><b>{games[`gate.${g.key}`]}</b><small>{games[`blurb.${g.key}`]}</small></span>
   {!open&&<span className="gp-soon" aria-hidden="true">{soon}</span>}
  </>
  return <li key={g.key} className="gp-cell">{open
   ?<Link className="gp min-h-tap" data-gate={g.key} data-away={away||undefined} href={clubHref(clubId,g.key,locale)}>{inner}</Link>
   :<div className="gp gp-off" data-gate={g.key} data-away={away||undefined} aria-disabled="true">{inner}</div>}</li>})}</ol>
}
