import merges from '@/content/manual/rumble-merges.json'

/** one man, one card: records of one club that are the same man (content/manual/rumble-merges.json, found by scripts/rumble/find-merges.ts, editable by hand) */
type M={keep:string;drop:string;why:string}
const doc=merges as unknown as Record<string,M[]>
export const mergesFor=(club:string):readonly M[]=>doc[club]??[]

/**
 * The same fold Royal Rumble draws its cards from, for any reader of a club's men (the Question Forge, the Blind Cow
 * forge): a record the merge list drops becomes part of the one it keeps — the shorter, famous name prints, every name
 * either record carried is an alias, the years span both. A man is never asked about twice, and never lost because two
 * of his records shared a name.
 */
export function foldMerged<P extends {id:string;name:string;aliases:string[];positions:string[];fromYear:number|null;toYear:number|null}>(club:string,players:readonly P[]):P[]{
 const ms=mergesFor(club);if(!ms.length)return [...players]
 const byId=new Map(players.map(p=>[p.id,p])),dropped=new Set<string>()
 for(const m of ms){const d=byId.get(m.drop),k=byId.get(m.keep);if(d&&k&&!dropped.has(k.id))dropped.add(d.id)}
 const out:P[]=[]
 for(const p of players){
  if(dropped.has(p.id))continue
  const mine=ms.filter(m=>m.keep===p.id).map(m=>byId.get(m.drop)).filter((x):x is P=>!!x&&dropped.has(x.id))
  if(!mine.length){out.push(p);continue}
  const all=[p,...mine],names=all.map(x=>x.name).sort((a,b)=>a.length-b.length),from=all.map(x=>x.fromYear).filter((x):x is number=>x!==null),to=all.map(x=>x.toYear).filter((x):x is number=>x!==null)
  out.push({...p,name:names[0]!,aliases:[...new Set(all.flatMap(x=>[x.name,...x.aliases]))].filter(n=>n!==names[0]),positions:[...new Set(all.flatMap(x=>x.positions))],fromYear:from.length?Math.min(...from):null,toYear:to.length?Math.max(...to):null})
 }
 return out
}
