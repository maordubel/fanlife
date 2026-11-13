/**
 * One night, one record (12.11.2026).
 *
 * A club's pack is assembled from many deliveries — its own archive, the history wave, UEFA's feed, the league feed, a
 * staged package — and two of them often carry the SAME match under different ids ("Olympiacos 3-1 Arsenal" from the history
 * wave and "Olympiacos 3-1 Arsenal" from UEFA). Every surface then counted it twice: the archive listed it twice, trivia and
 * memory could deal it twice, and a scoresheet one record held never reached the other.
 *
 * A club plays one match a day. So two records on the same day whose scores hold the same two numbers are one match: the best
 * record is kept (approved, then the curated id over a feed's `a-m-` id, then a full eleven, then scorers, then more sources)
 * and the others lend it what it lacks — the eleven, the bench, the scorers, their sources. Nothing is invented and nothing
 * is overwritten: a field the kept record states stays as it is. Two records of one day with DIFFERENT scores are not merged
 * (that is a conflict for a person to read, not for this pass to settle).
 *
 * Pure: takes the raw pack, returns a new one, and lists what it folded so the compiler can report it.
 */
type Raw=Record<string,unknown>
const arr=(v:unknown):Raw[]=>Array.isArray(v)?v as Raw[]:[]
const obj=(v:unknown):Raw=>v&&typeof v==='object'&&!Array.isArray(v)?v as Raw:{}
const goalsKey=(v:Raw)=>{
 const s=typeof v.score==='string'?v.score:''
 const m=/(\d{1,2})\s*[-–:]\s*(\d{1,2})/.exec(s)
 if(m)return [Number(m[1]),Number(m[2])].sort((a,b)=>a-b).join('-')
 if(Number.isFinite(v.homeGoals)&&Number.isFinite(v.awayGoals))return [Number(v.homeGoals),Number(v.awayGoals)].sort((a,b)=>a-b).join('-')
 return null
}
const day=(v:Raw)=>typeof v.on==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v.on)?v.on:null
const rank=(f:Raw)=>{
 const v=obj(f.value),id=String(f.id||'')
 // the curated id outranks a feed's richer copy (questions, goals and links already point at it, and the feed's eleven is borrowed
 // anyway); the season-history feed (`h-`, scripts/ingest/clubs/history-scotland.ts) ranks below the match feeds
 return [f.status==='approved'?1:0,/^h-/.test(id)?0:/^(a-m-|ea-match-)/.test(id)?1:2,arr(v.lineup).length===11?1:0,arr(v.scorers).length?1:0,arr(f.sources).length]
}
const better=(a:Raw,b:Raw)=>{const x=rank(a),y=rank(b);for(let i=0;i<x.length;i++)if(x[i]!==y[i])return x[i]!>y[i]!;return String(a.id)<String(b.id)}

export type Folded={kept:string;folded:string[];on:string}
export function oneNightPerMatch<T extends Raw>(pack:T):{pack:T;folded:Folded[]}{
 const matches=arr(pack.matches);if(matches.length<2)return {pack,folded:[]}
 const groups=new Map<string,Raw[]>()
 for(const f of matches){
  const v=obj(f.value),d=day(v),g=goalsKey(v);if(!d||!g)continue
  const k=`${d}|${g}`;(groups.get(k)??groups.set(k,[]).get(k)!).push(f)
 }
 const drop=new Set<Raw>(),replace=new Map<Raw,Raw>(),folded:Folded[]=[]
 for(const [k,list] of groups){
  if(list.length<2)continue
  const best=list.reduce((a,b)=>better(a,b)?a:b)
  const rest=list.filter(f=>f!==best)
  let v={...obj(best.value)}
  const srcs=new Set(arr(best.sources).map(String))
  for(const f of rest){
   drop.add(f)
   // only an approved record may lend: a review row's eleven would reach a gate through the back door
   if(f.status!=='approved')continue
   const w=obj(f.value)
   if(arr(v.lineup).length!==11&&arr(w.lineup).length===11){v={...v,lineup:w.lineup,...(arr(v.bench).length?{}:{bench:w.bench??[]})};for(const s of arr(f.sources))srcs.add(String(s))}
   if(!arr(v.scorers).length&&arr(w.scorers).length){v={...v,scorers:w.scorers};for(const s of arr(f.sources))srcs.add(String(s))}
   if(!v.venue&&typeof w.venue==='string'&&w.venue)v={...v,venue:w.venue}
  }
  replace.set(best,{...best,value:v,sources:[...srcs]})
  folded.push({kept:String(best.id),folded:rest.map(f=>String(f.id)),on:k.split('|')[0]!})
 }
 if(!folded.length)return {pack,folded}
 return {pack:{...pack,matches:matches.filter(f=>!drop.has(f)).map(f=>replace.get(f)??f)},folded}
}
