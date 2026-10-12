import 'server-only'
import {CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {quotaFor} from '@/lib/clubs/rumble-xi/quota'
import {everyRow,foldName,type Row} from './service'
import {pairKey,readDistinct} from './distinct'
/**
 * Three working lists for the owner (spec §9). None of them changes anything: a recommendation is a suggestion with its reason, never applied.
 *  missing   men with no position on record — the research queue, strongest first
 *  outliers  a price that disagrees with the club's own ranking of strength; the recommendation re-deals the club's ladder by rating
 *  twins     two ids at one club sharing a name or alias — candidates for the merge file, NEVER merged by this code (rule 7)
 */
export type Brief={club:string;clubName:string;id:string;name:string;nameOriginal:string;years:string;price:number;rating:number;wave:boolean;locked:boolean}
const brief=(r:Row):Brief=>({club:r.club,clubName:r.clubName,id:r.id,name:r.name,nameOriginal:r.nameOriginal,years:r.fromYear?`${r.fromYear}${r.toYear&&r.toYear!==r.fromYear?'–'+r.toYear:''}`:'—',price:r.price,rating:r.rating,wave:r.wave,locked:r.locked})
export type Outlier=Brief&{kind:'underpriced'|'overpriced';recommended:number;why:string}
export type Twins={club:string;clubName:string;key:string;members:Brief[]}
export type Distribution={club:string;clubName:string;n:number;have:Record<number,number>;want:Record<number,number>}
export type Reports={missing:Brief[];missingTotal:number;outliers:Outlier[];twins:Twins[];distribution:Distribution[]}
export async function playerReports(clubs:string[]=CORE_CLUB_IDS,limit=150):Promise<Reports>{
 const all=(await everyRow(clubs)).filter(r=>!r.removed&&!r.mergedInto),distinct=await readDistinct()
 const missing=all.filter(r=>!r.positions.length).sort((a,b)=>b.rating-a.rating||a.name.localeCompare(b.name))
 const outliers:Outlier[]=[],twins:Twins[]=[],distribution:Distribution[]=[]
 for(const club of clubs.filter(c=>CORE_CLUB_IDS.includes(c))){
  const rows=all.filter(r=>r.club===club);if(!rows.length)continue
  const have:Record<number,number>={1:0,2:0,3:0,4:0,5:0};for(const r of rows)have[r.price]!+=1
  const q=quotaFor(rows.length).counts as Record<number,number>;distribution.push({club,clubName:rows[0]!.clubName,n:rows.length,have,want:q})
  // re-deal the club's own ladder by rating (ties: the price it has now, then id) — what the prices would be if price followed strength exactly
  const ranked=[...rows].sort((a,b)=>b.rating-a.rating||b.price-a.price||a.id.localeCompare(b.id)),rec=new Map<string,number>();let at=0
  for(const p of [5,4,3,2,1])for(let i=0;i<(q[p]??0);i++){const r=ranked[at++];if(r)rec.set(r.id,p)}
  for(const r of rows){const want=rec.get(r.id)??1,gap=want-r.price
   if(gap>=2&&r.rating>=70)outliers.push({...brief(r),kind:'underpriced',recommended:want,why:`rated ${r.rating}, in the club's top ${ranked.findIndex(x=>x.id===r.id)+1} by score, priced €${r.price}M`})
   if(gap<=-2&&r.price>=4)outliers.push({...brief(r),kind:'overpriced',recommended:want,why:`priced €${r.price}M but ranked ${ranked.findIndex(x=>x.id===r.id)+1} of ${rows.length} by score (${r.rating})`})}
  const by=new Map<string,Row[]>()
  for(const r of rows)for(const n of new Set([r.name,r.nameOriginal,...r.aliases].map(foldName).filter(x=>x.length>=5)))by.set(n,[...(by.get(n)||[]),r])
  const seen=new Set<string>()
  for(const [key,members] of by){const ids=[...new Set(members.map(m=>m.id))].sort();if(ids.length<2)continue;if(ids.every((x,i)=>ids.slice(i+1).every(y=>distinct.has(pairKey(club,x,y)))))continue;const sig=ids.join('|');if(seen.has(sig))continue;seen.add(sig);twins.push({club,clubName:rows[0]!.clubName,key,members:ids.map(i=>brief(members.find(m=>m.id===i)!))})}
 }
 outliers.sort((a,b)=>Math.abs(b.recommended-b.price)-Math.abs(a.recommended-a.price)||b.rating-a.rating)
 return {missing:missing.slice(0,limit).map(brief),missingTotal:missing.length,outliers:outliers.slice(0,limit),twins:twins.slice(0,limit),distribution}
}
