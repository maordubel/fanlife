import corrections from '@/content/manual/archive-corrections-2026-11-13.json'
/**
 * Archive corrections (13.11.2026) — a record a person has checked against the publishers and found wrong (a collapsed month, a
 * match that is not the club's, a tiebreak by Wikipedia) is corrected HERE, at compile time, with the reason and the sources in
 * content/manual/archive-corrections-*.json. The delivered files stay as they were delivered, so the next import cannot undo a fix
 * silently and the fix cannot hide what the source said. A row names a record by its raw id or by its club-prefixed id.
 */
type Row={club:string;id:string;set?:Record<string,unknown>;exclude?:boolean;reason:string;sources:string[]}
const ROWS=(corrections as {corrections:Row[]}).corrections
type Rec={id?:unknown;value?:unknown;notes?:unknown}
export function correctMatches<T extends Rec>(clubId:string,matches:T[]|null|undefined):T[]{
 const rows=ROWS.filter(r=>r.club===clubId);if(!rows.length||!matches)return matches??[]
 const byId=new Map(rows.map(r=>[r.id,r]))
 const out:T[]=[]
 for(const m of matches){
  const id=String(m.id??''),r=byId.get(id)??byId.get(`${clubId}:${id}`)??byId.get(id.replace(`${clubId}:`,''))
  if(!r){out.push(m);continue}
  if(r.exclude)continue
  out.push({...m,value:{...(m.value as object),...r.set},notes:`${typeof m.notes==='string'?m.notes+' · ':''}Corrected 13.11.2026: ${r.reason}`})
 }
 return out
}
export function correctPack<T extends Record<string,unknown>>(pack:T,clubId:string):T{
 return Array.isArray(pack.matches)?{...pack,matches:correctMatches(clubId,pack.matches as Rec[])}:pack
}
