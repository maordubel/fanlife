import {FORMATIONS} from '@/lib/game/formations'
import type {ClubPlayer} from './contract'
import type {ClubXI} from './xi'
import {fitOf} from '@/lib/xi/roles'
import type {SlotRole} from '@/lib/xi/roles'

/**
 * Gate 1 — the pure rules of the pitch. No React, no storage: the board asks, this answers, and the tests hold it.
 * A man stands in at most one place (a slot or the 12th-man chair); moving him is a swap, never a duplicate.
 */
export const TWELFTH='twelfth'
export type Where=string // a formation slot id, or TWELFTH

export const slotsOf=(xi:ClubXI)=>FORMATIONS[xi.formation]!.slots
export const filledCount=(xi:ClubXI)=>Object.keys(xi.picks).length
export const isComplete=(xi:ClubXI)=>filledCount(xi)===11

export function whereIs(xi:ClubXI,playerId:string):Where|null{
 for(const [slot,id] of Object.entries(xi.picks))if(id===playerId)return slot
 return xi.twelfth===playerId?TWELFTH:null
}
export const occupant=(xi:ClubXI,where:Where):string|null=>where===TWELFTH?(xi.twelfth??null):(xi.picks[where]??null)

function write(xi:ClubXI,where:Where,id:string|null):ClubXI{
 if(where===TWELFTH)return {...xi,twelfth:id}
 const picks={...xi.picks};if(id)picks[where]=id;else delete picks[where]
 return {...xi,picks}
}
/** Put a man somewhere. If he already stands elsewhere the two swap; the captain's armband follows the man. */
export function place(xi:ClubXI,where:Where,playerId:string):ClubXI{
 const from=whereIs(xi,playerId),displaced=occupant(xi,where)
 if(from===where)return xi
 let next=write(xi,where,playerId)
 if(from)next=write(next,from,displaced)
 else if(displaced&&next.captain===displaced&&where!==TWELFTH)next={...next,captain:null}
 if(where===TWELFTH&&next.captain===playerId)next={...next,captain:null}
 return next
}
export function vacate(xi:ClubXI,where:Where):ClubXI{
 const id=occupant(xi,where);if(!id)return xi
 const next=write(xi,where,null)
 return next.captain===id?{...next,captain:null}:next
}
export function swapWhere(xi:ClubXI,a:Where,b:Where):ClubXI{
 if(a===b)return xi
 const ia=occupant(xi,a),ib=occupant(xi,b);if(!ia&&!ib)return xi
 let next=write(write(xi,a,ib),b,ia)
 if(next.captain&&(a===TWELFTH||b===TWELFTH)&&next.twelfth===next.captain)next={...next,captain:null}
 return next
}
export function setCaptain(xi:ClubXI,playerId:string|null):ClubXI{
 if(playerId===null)return {...xi,captain:null}
 return Object.values(xi.picks).includes(playerId)?{...xi,captain:xi.captain===playerId?null:playerId}:xi
}
/** A new formation keeps as many men as it can, by slot id; the rest are dropped (never invented). */
export function changeFormation(xi:ClubXI,formation:string):ClubXI{
 if(!Object.hasOwn(FORMATIONS,formation)||formation===xi.formation)return xi
 const ids=new Set(FORMATIONS[formation]!.slots.map(s=>s.slotId)),picks:Record<string,string>={}
 for(const [slot,id] of Object.entries(xi.picks))if(ids.has(slot))picks[slot]=id
 const kept=new Set(Object.values(picks))
 return {formation,picks,captain:xi.captain&&kept.has(xi.captain)?xi.captain:null,...(xi.twelfth?{twelfth:xi.twelfth}:{})}
}
/** The next empty slot after `from`, wrapping; null when the eleven is full. */
export function nextEmpty(xi:ClubXI,from?:Where):Where|null{
 const slots=slotsOf(xi),start=Math.max(0,slots.findIndex(s=>s.slotId===from))
 for(let i=1;i<=slots.length;i++){const s=slots[(start+i)%slots.length]!;if(!xi.picks[s.slotId])return s.slotId}
 return null
}
export const firstEmpty=(xi:ClubXI)=>slotsOf(xi).find(s=>!xi.picks[s.slotId])?.slotId??null

/** Documented fit first, then unknown, then a different documented position; ties keep the roster's own order. */
export function rankForSlot(players:readonly ClubPlayer[],role:SlotRole|null):ClubPlayer[]{
 if(!role)return [...players]
 const weight={fit:0,unknown:1,other:2} as const
 return players.map((p,i)=>({p,i,w:weight[fitOf(p.positions,role)]})).sort((a,b)=>a.w-b.w||a.i-b.i).map(x=>x.p)
}

export const midYear=(p:Pick<ClubPlayer,'fromYear'|'toYear'>)=>p.fromYear!==null&&p.toYear!==null?Math.round((p.fromYear+p.toYear)/2):(p.fromYear??p.toYear)
/** How the eleven spreads over the decades: { 1990: 3, 2000: 5 } — only men with documented years count. */
export function decadeSpread(xi:ClubXI,byId:ReadonlyMap<string,ClubPlayer>):Record<number,number>{
 const out:Record<number,number>={}
 for(const id of Object.values(xi.picks)){const p=byId.get(id);const y=p?midYear(p):null;if(y===null||y===undefined)continue;const d=Math.floor(y/10)*10;out[d]=(out[d]??0)+1}
 return out
}
/** The eleven in reading order: goal to attack, left to right. */
export function reading(xi:ClubXI):{slotId:string;role:SlotRole;x:number;y:number;id:string|null}[]{
 return [...slotsOf(xi)].sort((a,b)=>b.y-a.y||a.x-b.x).map(s=>({slotId:s.slotId,role:s.role,x:s.x,y:s.y,id:xi.picks[s.slotId]??null}))
}
export function shareText(opts:{club:string;title:string;xi:ClubXI;byId:ReadonlyMap<string,ClubPlayer>;captainWord:string;twelfthWord:string;url?:string}):string{
 const {xi,byId}=opts,name=(id:string|null)=>id?(byId.get(id)?.name??'—'):'—'
 const rows=reading(xi).map(r=>`${r.role} ${name(r.id)}${r.id&&r.id===xi.captain?` (${opts.captainWord})`:''}`)
 const extra=xi.twelfth?[`${opts.twelfthWord}: ${name(xi.twelfth)}`]:[]
 return [`${opts.title} · ${opts.club} · ${xi.formation}`,...rows,...extra,...(opts.url?[opts.url]:[])].join('\n')
}
