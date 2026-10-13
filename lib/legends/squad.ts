import {FORMATION_IDS,slotsOf} from '@/lib/clubs/rumble-xi/formations'
import type {FormationId} from '@/lib/clubs/rumble-xi/types'
import {LEGENDS_RULES as R,QUOTA_POS,type QuotaPos} from './config'
import {available} from './discipline'
import {qualityOf} from './ratings'
import {DEFAULT_TACTICS,type Card,type Lineup,type SquadEntry,type Team} from './types'

/**
 * Squads and elevens. Pure. A squad is 17–20 men and the quotas GK 2 · DF 6 · MF 6 · FW 3 hold at all times (§1.2.4); a man
 * counts toward ONE quota, his recorded position (§1.2.11). Anyone fit may stand anywhere on the pitch — out of position he
 * plays below himself (the engine's fit factor), and an outfield man in goal far below.
 */
export function quotaCount(squad:readonly SquadEntry[]):Record<QuotaPos,number>{const n:Record<QuotaPos,number>={GK:0,DF:0,MF:0,FW:0};for(const s of squad)n[s.quota]++;return n}
export function squadError(squad:readonly SquadEntry[]):string|null{
 if(squad.length<R.minSquad)return `A squad needs ${R.minSquad} men.`
 if(squad.length>R.maxSquad)return `A squad holds ${R.maxSquad} at most.`
 if(new Set(squad.map(s=>s.id)).size!==squad.length)return 'A man is in the squad twice.'
 const n=quotaCount(squad),short=QUOTA_POS.filter(p=>n[p]<R.minimums[p])
 return short.length?`The quotas need ${short.map(p=>`${R.minimums[p]} ${p}`).join(', ')}.`:null
}
export const fitFactor=(c:Pick<Card,'pos'>,slot:QuotaPos)=>c.pos===slot?1:slot==='GK'||c.pos==='GK'?0.55:0.88
/** the men a team may field today: fit squad men and any emergency man (§1.5.31–32) */
export function fieldable(t:Team,card:(id:string)=>Card|undefined):Card[]{
 const out:Card[]=[]
 for(const s of t.squad){if(!available(t.status[s.id]))continue;const c=card(s.id);if(c)out.push(c)}
 for(const e of t.emergency)out.push(e.card)
 return out
}
/** the strongest eleven for a formation: the scarcest slots first, a natural man before a stand-in */
export function bestEleven(men:readonly Card[],f:FormationId):{xi:string[];value:number}|null{
 const slots=slotsOf(f);if(men.length<11)return null
 const used=new Set<string>(),xi:string[]=new Array(slots.length)
 const order=slots.map((s,i)=>({s,i,n:men.filter(c=>c.pos===s.family).length})).sort((a,b)=>a.n-b.n||a.i-b.i)
 let value=0
 for(const {s,i} of order){
  const c=[...men].filter(x=>!used.has(x.id)).sort((a,b)=>qualityOf(b.stars)*fitFactor(b,s.family)-qualityOf(a.stars)*fitFactor(a,s.family)||a.id.localeCompare(b.id))[0]
  if(!c)return null;used.add(c.id);xi[i]=c.id;value+=qualityOf(c.stars)*fitFactor(c,s.family)
 }
 return {xi,value}
}
export function bestLineup(men:readonly Card[],prefer?:FormationId,tactics=DEFAULT_TACTICS):Lineup|null{
 const tries=(prefer?[prefer,...FORMATION_IDS.filter(f=>f!==prefer)]:FORMATION_IDS).map(f=>({f,r:bestEleven(men,f)})).filter(x=>x.r)
 if(!tries.length)return null
 const best=prefer&&tries[0]!.f===prefer?tries[0]!:tries.sort((a,b)=>b.r!.value-a.r!.value)[0]!
 const inXi=new Set(best.r!.xi),rest=men.filter(c=>!inXi.has(c.id)).sort((a,b)=>b.stars-a.stars||a.id.localeCompare(b.id))
 const gk=rest.find(c=>c.pos==='GK'),bench=[...(gk?[gk]:[]),...rest.filter(c=>c!==gk)].slice(0,7).map(c=>c.id)
 const lu:Lineup={formation:best.f,xi:best.r!.xi,bench,tactics:{...tactics}}
 return {...lu,captain:captainOf(lu,id=>men.find(m=>m.id===id))}
}
/**
 * The armband (engine 2's hidden edge goes to whoever wears it): the manager's captain when he is in the eleven, else his
 * vice-captain when HE is in the eleven, else the eleven's most-starred man (ties by id, so it never flickers). A snapshot
 * stores the wearer it was taken with, so a match already played never changes.
 */
export function captainOf(l:Pick<Lineup,'xi'|'captain'|'vice'>,card:(id:string)=>Pick<Card,'stars'>|undefined):string|undefined{
 if(l.captain&&l.xi.includes(l.captain))return l.captain
 if(l.vice&&l.xi.includes(l.vice))return l.vice
 return [...l.xi].sort((a,b)=>(card(b)?.stars??0)-(card(a)?.stars??0)||a.localeCompare(b))[0]
}
export function lineupError(l:Lineup,men:readonly Card[]):string|null{
 const ok=new Set(men.map(c=>c.id)),slots=slotsOf(l.formation)
 if(l.xi.length!==slots.length)return `An eleven needs ${slots.length} men.`
 if(new Set([...l.xi,...l.bench]).size!==l.xi.length+l.bench.length)return 'A man can be in one place only.'
 if(l.bench.length>7)return 'Seven on the bench at most.'
 for(const id of [...l.xi,...l.bench])if(!ok.has(id))return 'Every man must be fit and in your squad.'
 return null
}
