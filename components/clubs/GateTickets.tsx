import Link from 'next/link'
import {SHARED_GATES,type GateKey} from '@/lib/clubs/gates'
import {clubHref} from '@/lib/clubs/club-href'
import type {UiLocale} from '@/lib/clubs/locale'
import type {gameCopy} from '@/lib/clubs/game-copy'

export type GateState={key:GateKey;allowed:boolean;playable:boolean}

/** A gate is a ticket to its own end of the ground: the stub in the club's livery, the gate's number, ADMIT ONE. */
export function GateTickets({clubId,states,keys,locale,games,pattern,closedNote,feature=0}:{clubId:string;states:readonly GateState[];keys:readonly GateKey[];locale:UiLocale;games:ReturnType<typeof gameCopy>;pattern?:string;closedNote:string;feature?:number}) {
 const rows=keys.map(k=>({g:SHARED_GATES.find(g=>g.key===k)!,s:states.find(s=>s.key===k)})).filter(r=>r.g)
 return <div className="mag-tickets" data-testid="shared-gates">{rows.map(({g,s},i)=>s?.allowed&&s.playable
  ?<Link key={g.key} data-gate={g.key} className={`mag-ticket${i<feature?' feature':''}`} href={clubHref(clubId,g.key,locale)}><span className="mag-ticket-stub mag-band" data-livery={pattern}><span className="mag-ticket-no"><small>{games.ticketGate}</small><b>{String(g.number).padStart(2,'0')}</b></span></span><span className="mag-ticket-body"><b>{games[`gate.${g.key}`]}</b><small>{games[`blurb.${g.key}`]}</small><s>{games.ticketAdmit} · {games.play} →</s></span></Link>
  :<div key={g.key} data-gate={g.key} className="mag-ticket mag-gate-off" aria-disabled="true"><span className="mag-ticket-stub"><span className="mag-ticket-no"><small>{games.ticketGate}</small><b>{String(g.number).padStart(2,'0')}</b></span></span><span className="mag-ticket-body"><b>{games[`gate.${g.key}`]}</b><small>{games[`blurb.${g.key}`]}</small><s className="mag-ticket-soon">{closedNote}</s></span></div>)}</div>
}
