import 'server-only'
import type {ClubMystery,ClubPlayer,Diagnostic,Entity,Fact,Source} from './contract'
const date=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v?v:null
const ID=/^[a-z0-9][a-z0-9_-]{0,100}$/
type Raw=Record<string,unknown>
const obj=(v:unknown):Raw=>v&&typeof v==='object'&&!Array.isArray(v)?v as Raw:{}
/** Same envelope rules as players: checked sources, complete approval, automated approval needs two publishers. */
function envelope(f:Raw,sources:Source[],valueOK:boolean,sensitive:boolean):{refs:string[]}|null {
 const refs=Array.isArray(f.sources)&&f.sources.every(s=>typeof s==='string')?f.sources as string[]:[]
 const cited=refs.map(id=>sources.find(s=>s.id===id))
 if(!refs.length||!cited.every(s=>s?.access==='available'&&s.checkedAt)||!valueOK)return null
 if(f.status!=='approved'||!(f.confidence===2||f.confidence===3)||!date(f.researchedAt)||!date(f.approvedAt)||typeof f.approvedBy!=='string'||!f.approvedBy.trim())return null
 if(f.approvedBy.startsWith('automated:')&&!(new Set(cited.map(s=>s!.publisher.toLowerCase())).size>=2&&f.confidence===3&&f.parserCertainty==='high'&&f.conflictFree===true&&!sensitive))return null
 return {refs}
}
export function compileMysteries(raw:unknown,clubId:string,sources:Source[],players:Fact<ClubPlayer>[]|null,diagnostics:Diagnostic[]):Fact<ClubMystery>[] {
 if(!Array.isArray(raw))return []
 const known=new Set((players||[]).map(p=>p.value.id)),out:Fact<ClubMystery>[]=[],seen=new Set<string>()
 for(const input of raw){
  const f=obj(input),v=obj(f.value),id=typeof f.id==='string'?f.id.trim():'',target=`${clubId}:${String(v.targetPlayerId||'')}`
  const clues=(Array.isArray(v.clues)?v.clues:[]).map(obj)
  const cluesOK=clues.length>=4&&clues.every(c=>typeof c.id==='string'&&typeof c.label==='string'&&typeof c.value==='string'&&c.value.trim()&&Array.isArray(c.sources)&&c.sources.length&&c.sources.every((s:unknown)=>typeof s==='string'&&sources.some(x=>x.id===s&&x.access==='available'&&x.checkedAt)))
  const ok=ID.test(id)&&!seen.has(id)&&known.has(target)&&cluesOK&&new Set(clues.map(c=>c.id)).size===clues.length
  const env=ok?envelope(f,sources,true,false):null
  if(!ok||!env){diagnostics.push({record:id,code:'MYSTERY_INELIGIBLE',message:'Mystery needs a known player, four sourced clues and a complete approval.'});continue}
  seen.add(id)
  out.push({id:`${clubId}:${id}`,value:{id:`${clubId}:${id}`,targetPlayerId:target,clues:clues.map(c=>({id:`${clubId}:${id}:${c.id}`,label:String(c.label),value:String(c.value),sources:c.sources as string[]}))},sources:env.refs,confidence:f.confidence as 2|3,status:'approved',researchedAt:date(f.researchedAt),approvedAt:date(f.approvedAt),approvedBy:String(f.approvedBy),notes:typeof f.notes==='string'?f.notes:''})
 }
 return out
}
/** Sections whose undeclared records are treated as sensitive (A15). Facts about fixtures, kits, seasons stay factual. */
export const SENSITIVE_BY_DEFAULT=new Set(['rivals','culture','places'])
export const ENTITY_SECTIONS=['rivals','competitions','seasons','matches','trophies','kits','goals','stadiums','places','culture'] as const
/** Entity sections: null = not researched, [] = known empty. Facts keep their own sources and status. */
export function compileEntities(raw:unknown,section:string,clubId:string,sources:Source[],diagnostics:Diagnostic[]):Fact<Entity>[]|null {
 if(raw===undefined||raw===null)return null
 if(!Array.isArray(raw)){diagnostics.push({record:section,code:'SECTION_INVALID',message:'Section must be an array.'});return null}
 const out:Fact<Entity>[]=[],seen=new Set<string>()
 for(const input of raw){
  const f=obj(input),v=obj(f.value),id=typeof f.id==='string'?f.id.trim():''
  // explicit `sensitive:true` always needs a person; an UNDECLARED flag counts as sensitive in the sections where
  // the claim is about people, rivalry or culture (they decide tone, not just facts) — automated approval stops there
  const sensitive=v.sensitive===true||(v.sensitive!==false&&SENSITIVE_BY_DEFAULT.has(section))
  const env=envelope(f,sources,ID.test(id)&&!seen.has(id)&&typeof v.name==='string'&&!!v.name.trim(),sensitive)
  if(!env){diagnostics.push({record:`${section}:${id}`,code:'ENTITY_INELIGIBLE',message:'Entity needs unique id, name, checked sources and a complete approval.'});continue}
  seen.add(id)
  out.push({id:`${clubId}:${id}`,value:{...v,id:`${clubId}:${id}`,name:String(v.name).trim()} as Entity,sources:env.refs,confidence:f.confidence as 2|3,status:'approved',researchedAt:date(f.researchedAt),approvedAt:date(f.approvedAt),approvedBy:String(f.approvedBy),notes:typeof f.notes==='string'?f.notes:''})
 }
 return out
}
