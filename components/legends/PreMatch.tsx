'use client'
import type {CareerView} from '@/lib/legends/view'
import {Stars} from './Brand'
import {Sheet} from './Sheet'
import {ClubMark} from './Shirts'

/**
 * Before the whistle (owner, 14.10.2026): Kick off → the eleven to confirm or change → the dressing room → "Send them to the pitch!"
 * → this card: both crests and names as a VS, the ground, the city, the country. The ground's name appears only where a sourced
 * club world names it; a play-off is on neutral ground and says so. Nothing here is a number the manager is not meant to see.
 */
const surname=(n:string)=>{const p=n.trim().split(/\s+/);return p.length>1?p[p.length-1]!:n}

export function LineupConfirm({v,onConfirm,onEdit,onClose}:{v:CareerView;onConfirm:()=>void;onEdit:()=>void;onClose:()=>void}){
 const by=new Map(v.squad.map(s=>[s.id,s])),xi=v.lineup.xi.map(id=>by.get(id)).filter((x):x is NonNullable<typeof x>=>!!x)
 const lines=(['GK','DF','MF','FW'] as const).map(p=>({p,men:xi.filter(m=>m.pos===p)})).filter(l=>l.men.length)
 const bench=v.lineup.bench.map(id=>by.get(id)).filter((x):x is NonNullable<typeof x>=>!!x)
 return <Sheet id="lgm-confirm" tone="paper" kicker={`Team sheet · ${v.lineup.formation}`} title="Is this your eleven?" onClose={onClose}>
  <div className="lgm-pm" data-testid="legends-lineup-confirm">
   <ol className="lgm-pm-lines">{lines.map(l=><li key={l.p}><span className="wk-k">{l.p}</span><span>{l.men.map(m=><b key={m.id} data-captain={v.lineup.armband===m.id||undefined}>{surname(m.name)}{v.lineup.armband===m.id?' ©':''}</b>)}</span></li>)}</ol>
   <p className="lgm-fine">Bench: {bench.map(b=>surname(b.name)).join(', ')||'—'}</p>
   <p className="lgm-actions"><button type="button" className="lgm-go lgm-go-big min-h-tap" onClick={onConfirm} data-testid="legends-lineup-ok">Confirm the eleven</button><button type="button" className="lgm-ghost min-h-tap" onClick={onEdit}>Change it</button></p>
  </div>
 </Sheet>
}

export function VsCard({v,onGo,onClose}:{v:CareerView;onGo:()=>void;onClose:()=>void}){
 const n=v.next;if(!n)return null
 const venue=n.playoff?null:v.venues?.[n.home]
 const where=n.playoff?'Neutral ground':[venue?.city,venue?.country].filter(Boolean).join(' · ')
 return <Sheet id="lgm-vs" tone="night" locked kicker={n.playoff?'Title play-off':`Round ${n.round} of ${v.rounds}`} title="Out to the pitch">
  <div className="lgm-vs" data-testid="legends-vs">
   <div className="lgm-vs-sides">
    <div className="lgm-vs-side"><ClubMark club={n.home} name={n.homeName} size={84}/><b>{n.homeName}</b></div>
    <span className="lgm-vs-v" aria-hidden="true">VS</span>
    <div className="lgm-vs-side"><ClubMark club={n.away} name={n.awayName} size={84}/><b>{n.awayName}</b></div>
   </div>
   <p className="lgm-vs-where"><b>{venue?.stadium??(n.playoff?'':`${n.homeName} ground`)}</b><span>{where}</span></p>
   <p className="lgm-fine">Their eleven <Stars value={n.opponent.stars} size="sm"/></p>
   <p className="lgm-actions"><button type="button" className="lgm-go lgm-go-big min-h-tap" onClick={onGo} data-testid="legends-vs-go">Send them to the pitch!</button><button type="button" className="lgm-link min-h-tap" onClick={onClose}>Not yet</button></p>
  </div>
 </Sheet>
}
