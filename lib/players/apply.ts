import type {ClubData,ClubPlayer,Fact} from '@/lib/clubs/contract'
import {overrideOf,hasOverrides,getSnapshot} from './effective'
const revisionOf=()=>getSnapshot().revision
const uniq=<T,>(a:T[])=>[...new Set(a)]
/**
 * The owner's published overrides laid over a club's archive, once, where the club is loaded — so every game, page and report reads the same men.
 *  · a removed man leaves `players`
 *  · a MERGED man (a duplicate record the owner declared to be another man) leaves `players` too, and what he knew travels to the man he is: his names become
 *    aliases (so a scorer named after the duplicate is found under the one man), his years widen the keeper's, his positions join the keeper's, his sources join
 *  · a set position list replaces the archive's (an empty list = explicitly unknown), applied after the merge
 * Price and rating are read at the pool (lib/clubs/rumble.ts) from the same snapshot, so five-a-side and the eleven can never disagree.
 */
export function withPlayerOverrides(id:string,data:ClubData):ClubData{
 // a fresh top level and a fresh `gates` every time: the readiness pass writes into `gates`, and a base that an earlier load froze must stay untouched
 const copy={...data,gates:{...data.gates}}
 if(!data.players||!hasOverrides(id))return copy
 const dupOf=new Map<string,string[]>()
 for(const f of data.players){const m=overrideOf(id,f.id)?.mergedInto;if(m)dupOf.set(m,[...(dupOf.get(m)||[]),f.id])}
 const byId=new Map(data.players.map(f=>[f.id,f]))
 const players:Fact<ClubPlayer>[]=[]
 for(const f of data.players){
  const o=overrideOf(id,f.id)
  if(o?.removed||(o?.mergedInto&&byId.has(o.mergedInto)))continue
  let v=f.value,sources=f.sources,confidence=f.confidence
  const drops=(dupOf.get(f.id)||[]).map(d=>byId.get(d)).filter((x):x is Fact<ClubPlayer>=>!!x)
  if(drops.length){
   const all=[v,...drops.map(d=>d.value)],froms=all.map(x=>x.fromYear).filter((x):x is number=>x!==null),tos=all.map(x=>x.toYear).filter((x):x is number=>x!==null)
   v={...v,aliases:uniq([...v.aliases,...drops.flatMap(d=>[d.value.name,...d.value.aliases])]).filter(a=>a!==v.name),positions:uniq(all.flatMap(x=>x.positions)),fromYear:froms.length?Math.min(...froms):null,toYear:tos.length?Math.max(...tos):null,career:v.career??drops.find(d=>d.value.career)?.value.career}
   sources=uniq([...sources,...drops.flatMap(d=>d.sources)]);confidence=Math.max(confidence,...drops.map(d=>d.confidence)) as typeof confidence
  }
  if(o?.positions)v={...v,positions:o.positions}
  players.push(v===f.value&&sources===f.sources?f:{...f,value:v,sources,confidence})
 }
 return {...copy,players,version:`${data.version}+p${revisionOf()}`}
}
