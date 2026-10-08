import {FORMATIONS,DEFAULT_FORMATION} from '@/lib/game/formations'
import type {ClubPlayer} from './contract'
/** `twelfth` is the 12th man: optional so every save written before the upgrade still reads. */
export type ClubXI={formation:string;picks:Record<string,string>;captain:string|null;twelfth?:string|null}
export const emptyXI=():ClubXI=>({formation:DEFAULT_FORMATION,picks:{},captain:null})
/** Device saves are untrusted; retain only current canonical club IDs and legal slots. */
export function validateXI(raw:unknown,players:readonly ClubPlayer[]):ClubXI {
 if(!raw||typeof raw!=='object')return emptyXI()
 const p=raw as Record<string,unknown>,formation=typeof p.formation==='string'&&Object.hasOwn(FORMATIONS,p.formation)?p.formation:DEFAULT_FORMATION
 const slots=FORMATIONS[formation]!.slots,ids=new Set(players.map(p=>p.id)),seen=new Set<string>(),picks:Record<string,string>={}
 const input=p.picks&&typeof p.picks==='object'?p.picks as Record<string,unknown>:{}
 for(const slot of slots){const id=input[slot.slotId];if(typeof id==='string'&&ids.has(id)&&!seen.has(id)){picks[slot.slotId]=id;seen.add(id)}}
 const twelfth=typeof p.twelfth==='string'&&ids.has(p.twelfth)&&!seen.has(p.twelfth)?p.twelfth:null
 return {formation,picks,captain:typeof p.captain==='string'&&seen.has(p.captain)?p.captain:null,...(twelfth?{twelfth}:{})}
}
export function searchClubPlayers(players:readonly ClubPlayer[],query:string){
 const fold=(s:string)=>s.normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase().replace(/[׳״'"`]/g,'').trim()
 const terms=fold(query).split(/\s+/).filter(Boolean)
 return players.filter(p=>terms.every(t=>[p.name,...p.aliases].some(n=>fold(n).includes(t))))
}
