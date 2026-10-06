import type {ClubData,Readiness} from './contract'
import {gateReadiness} from './gate-data'
import {ratedPool,rumbleReadiness} from './rumble'
import {goalReadiness} from './goal'
import {GATE_THRESHOLDS as T} from './thresholds'

/**
 * Wave C content (gates 3, 4, 5, 8, 9, 11), read from a club's COMPILED data only — i.e. facts that
 * already passed the envelope (approved, checked sources). Nothing is inferred and nothing is padded:
 * a gate opens when the data supports it, and says exactly what is missing when it does not.
 */
export type LineupMatch={id:string;name:string;on:string|null;competition:string;score:string|null;starters:string[];bench:string[];decoys:string[];sources:string[]}
export type KitView={id:string;season:string;type:string;maker:string|null;design:string|null;sponsor?:string|null;colours:string[];sources:string[]}
const str=(v:unknown)=>typeof v==='string'&&v.trim()?v.trim():null
const strs=(v:unknown)=>Array.isArray(v)?v.filter((x):x is string=>typeof x==='string'&&!!x.trim()).map(x=>x.trim()):[]
const obj=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{}

export function lineupMatches(data:ClubData):LineupMatch[] {
 const players=data.players||[]
 return (data.matches||[]).flatMap(f=>{
  const v=obj(f.value),starters=[...new Set(strs(v.lineup))],bench=strs(v.bench)
  if(starters.length!==11)return []
  const decoys=players.filter(p=>!starters.includes(p.value.name)).length
  if(decoys<3)return []
  return [{id:f.id,name:f.value.name,on:str(v.on),competition:str(v.competition)||'',score:str(v.score),starters,bench,decoys:strs(v.decoys).filter(d=>!starters.includes(d)),sources:f.sources}]
 })
}
/** Candidate list for a match: its eleven plus club players who are not in it, in a stable order that does not reveal the answer. */
export function lineupPool(data:ClubData,m:LineupMatch):string[] {
 // the source's own decoys (same season's squad) first; the club roster only tops up
 const decoys=[...new Set([...m.decoys,...(data.players||[]).map(p=>p.value.name)])].filter(n=>!m.starters.includes(n)).slice(0,11)
 return [...new Set([...m.starters,...decoys])].sort((a,b)=>a.localeCompare(b))
}
export function kitViews(data:ClubData):KitView[] {
 return (data.kits||[]).flatMap(f=>{
  const v=obj(f.value),c=obj(v.construction),season=str(v.season)
  if(!season)return []
  const colours=(str(c.colors)||str(v.colors)||'').split(/[\/,]/).map(x=>x.trim().toLowerCase()).filter(Boolean)
  return [{id:f.id,season,type:str(v.type)||'home',maker:str(v.manufacturer),design:str(c.design)||str(v.design),sponsor:str(v.sponsor),colours,sources:f.sources}]
 })
}
export function rivalsOf(data:ClubData){return (data.rivals||[]).filter(r=>r.status==='approved'&&r.confidence>=2)}

/** A kit is only a puzzle when it names enough to ask about: season + maker + design. */
export const buildableKits=(data:ClubData)=>kitViews(data).filter(k=>k.maker&&k.design)
export function waveCReadiness(data:ClubData):Record<string,Readiness> {
 const locked=(why:string):Readiness=>({state:'LOCKED',playable:false,eligible:0,target:0,reasons:[why]})
 const rivals=rivalsOf(data)
 return {
  lineup:gateReadiness(lineupMatches(data).length,T.lineup.target,T.lineup.minimum,T.lineup.unit),
  'kit-builder':gateReadiness(buildableKits(data).length,T['kit-builder'].target,T['kit-builder'].minimum,T['kit-builder'].unit),
  kits:gateReadiness(kitViews(data).length,T.kits.target,T.kits.minimum,T.kits.unit),
  derby:rivals.length?gateReadiness(rivals.length,T.derby.target,T.derby.minimum,T.derby.unit):locked('Human-approved primary rival needed; derby meetings are then read from the club archives.'),
  goal:goalReadiness(data),
  'royal-rumble':(()=>{const r=rumbleReadiness(ratedPool(data));const n=ratedPool(data).length;return r.playable?{state:r.full?'READY':'PARTIAL',playable:true,eligible:n,target:T['royal-rumble'].target,reasons:r.full?[]:['Thin squad data: some positions have few players, so deals repeat sooner.']} as Readiness:locked(`Needs players with documented positions: ${r.short.join(', ')}.`)})(),
 }
}
