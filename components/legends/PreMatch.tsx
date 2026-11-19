'use client'
import type {CareerView} from '@/lib/legends/view'
import {Stars} from './Brand'
import {Sheet} from './Sheet'
import {ClubMark} from './Shirts'
import {familyLabel} from '@/lib/clubs/display-name'

/**
 * Before the whistle (owner, 14.10.2026: the eleven to confirm or change, the dressing room, "Send them to the pitch!").
 * 19.11.2026 — the flow is one screen shorter: Kick off → THIS card (both crests as a VS, the ground, the city, and the eleven
 * to confirm or change, all on one sheet) → the dressing room → the match. With no talk to give, the card's button kicks off.
 * The eleven is read line by line from the SLOTS of the formation, not from each man's own line — a 3-5-2 shows three, five, two. The ground's name appears only where a sourced
 * club world names it; a play-off is on neutral ground and says so. Nothing here is a number the manager is not meant to see.
 */
const surname=familyLabel

export function VsCard({v,onGo,onEdit,onClose,talk}:{v:CareerView;onGo:()=>void;onEdit:()=>void;onClose:()=>void;/** a word in the dressing room comes first */talk:boolean}){
 const n=v.next;if(!n)return null
 const venue=n.playoff?null:v.venues?.[n.home]
 const where=n.playoff?'Neutral ground':[venue?.city,venue?.country].filter(Boolean).join(' · ')
 const by=new Map(v.squad.map(s=>[s.id,s]))
 const placed=v.lineup.xi.map((id,i)=>({man:by.get(id),line:v.lineup.slots[i]?.family??by.get(id)?.pos??'MF'})).filter((x):x is {man:NonNullable<typeof x.man>;line:string}=>!!x.man)
 const lines=(['GK','DF','MF','FW'] as const).map(p=>({p,men:placed.filter(x=>x.line===p).map(x=>x.man)})).filter(l=>l.men.length)
 const bench=v.lineup.bench.map(id=>by.get(id)).filter((x):x is NonNullable<typeof x>=>!!x)
 return <Sheet id="lgm-vs" tone="night" kicker={n.playoff?'Title play-off':`Round ${n.round} of ${v.rounds} · ${n.atHome?'home':'away'}`} title="Matchday" onClose={onClose}>
  <div className="lgm-vs" data-testid="legends-vs">
   <div className="lgm-vs-sides">
    <div className="lgm-vs-side"><ClubMark club={n.home} name={n.homeName} size={72}/><b>{n.homeName}</b></div>
    <span className="lgm-vs-v" aria-hidden="true">VS</span>
    <div className="lgm-vs-side"><ClubMark club={n.away} name={n.awayName} size={72}/><b>{n.awayName}</b></div>
   </div>
   <p className="lgm-vs-where"><b>{venue?.stadium??(n.playoff?'':`${n.homeName} ground`)}</b><span>{where}</span></p>
   <div className="lgm-vs-xi" data-testid="legends-lineup-confirm">
    <p className="lgm-vs-xi-h"><span>Your eleven · {v.lineup.formation}</span><span>Theirs <Stars value={n.opponent.stars} size="sm"/></span></p>
    <ol className="lgm-pm-lines">{lines.map(l=><li key={l.p}><span className="wk-k">{l.p}</span><span>{l.men.map(m=><b key={m.id} data-captain={v.lineup.armband===m.id||undefined}>{surname(m.name)}{v.lineup.armband===m.id?' ©':''}</b>)}</span></li>)}</ol>
    <p className="lgm-fine">Bench: {bench.map(b=>surname(b.name)).join(', ')||'—'}</p>
   </div>
   <p className="lgm-actions"><button type="button" className="lgm-go lgm-go-big min-h-tap" onClick={onGo} data-testid="legends-vs-go">{talk?'To the dressing room':'Send them to the pitch!'}</button><button type="button" className="lgm-ghost min-h-tap" onClick={onEdit} data-testid="legends-vs-edit">Change the eleven</button></p>
  </div>
 </Sheet>
}
