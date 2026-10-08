import 'server-only'
import type {ClubPlayer,Fact,Source,Diagnostic} from './contract'
/** Optional finer evidence from a pack; anything that is not exactly the documented shape is dropped, never guessed. */
function detailOf(raw:unknown):{detail?:NonNullable<ClubPlayer['detail']>}{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return {}
 const r=raw as Record<string,unknown>,d:NonNullable<ClubPlayer['detail']>={}
 if(r.centreBack===true)d.centreBack=true
 if(r.foreignSlot==='foreign'||r.foreignSlot==='domestic')d.foreignSlot=r.foreignSlot
 return Object.keys(d).length?{detail:d}:{}
}
/** Small reviewed pack input. Canonical IDs and approval envelopes are never inferred from names. */
export function compilePlayers(raw:unknown,clubId:string,sources:Source[],diagnostics:Diagnostic[]):Fact<ClubPlayer>[]|null {
 if(raw===undefined||raw===null)return null
 if(!Array.isArray(raw)){diagnostics.push({record:'players',code:'PLAYERS_INVALID',message:'Player section must be an array.'});return null}
 const out:Fact<ClubPlayer>[]=[],seen=new Set<string>(),duplicates=new Set<string>()
 const date=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v?v:null
 const year=(v:unknown)=>v===null||v===undefined?null:Number.isInteger(v)&&Number(v)>=1800&&Number(v)<=2100?Number(v):NaN
 for(const input of raw){
  if(!input||typeof input!=='object')continue
  const f=input as Record<string,unknown>,v=(f.value&&typeof f.value==='object'?f.value:{}) as Record<string,unknown>,id=typeof f.id==='string'?f.id.trim():''
  if(seen.has(id)){duplicates.add(id);continue}seen.add(id)
  const refs=Array.isArray(f.sources)&&f.sources.every(s=>typeof s==='string')?f.sources as string[]:[]
  const cited=refs.map(id=>sources.find(s=>s.id===id)),positions=Array.isArray(v.positions)?v.positions:[],from=year(v.fromYear),to=year(v.toYear)
  const sourceOK=refs.length&&cited.every(s=>s?.access==='available'&&s.checkedAt)
  const approvalOK=f.status==='approved'&&(f.confidence===2||f.confidence===3)&&date(f.researchedAt)&&date(f.approvedAt)&&typeof f.approvedBy==='string'&&f.approvedBy.trim()
  const automatic=typeof f.approvedBy==='string'&&f.approvedBy.startsWith('automated:')
  const automaticOK=!automatic||(new Set(cited.map(s=>s?.publisher.toLowerCase())).size>=2&&f.confidence===3&&f.parserCertainty==='high'&&f.conflictFree===true&&v.sensitive===false)
  if(!/^[a-z0-9][a-z0-9_-]{0,100}$/.test(id)||typeof v.name!=='string'||!v.name.trim()||v.sport!=='football'||!Array.isArray(v.positions)||positions.some(p=>!['GK','DF','MF','FW'].includes(String(p)))||Number.isNaN(from)||Number.isNaN(to)||(from!==null&&to!==null&&from>to)||!sourceOK||!approvalOK||!automaticOK){diagnostics.push({record:id,code:'PLAYER_INELIGIBLE',message:'Player requires valid identity/football fields, referenced checked sources and a complete eligible approval.'});continue}
  out.push({id:`${clubId}:${id}`,value:{id:`${clubId}:${id}`,name:v.name.trim(),positions:[...new Set(positions)] as ClubPlayer['positions'],fromYear:from,toYear:to,aliases:Array.isArray(v.aliases)?v.aliases.filter((s):s is string=>typeof s==='string'):[],...detailOf(v.detail)},sources:refs,confidence:f.confidence as 2|3,status:'approved',researchedAt:date(f.researchedAt),approvedAt:date(f.approvedAt),approvedBy:String(f.approvedBy),notes:typeof f.notes==='string'?f.notes:''})
 }
 for(const id of duplicates)diagnostics.push({record:id,code:'PLAYER_CONFLICT',message:'Duplicate player ID quarantined.'})
 return out.filter(f=>!duplicates.has(f.id.slice(clubId.length+1)))
}
