import type {Rec} from './rules'
/**
 * Review pack: the part of a research package that fits the club-pack contract WITHOUT being promoted.
 * Every fact is `review`, confidence 1, approvedAt/approvedBy null — the compiler keeps review facts out of every
 * game. Sections the contract cannot hold honestly (players without ids, matches without lineups, honours with
 * open classification) are left undefined = "not researched"; they stay in staging until a person reviews them.
 */
export function buildReviewPack(club:string,s:Record<string,Rec[]>,contentLocale:'en'|'he'='he'){
 const https=(u:unknown)=>{try{return new URL(String(u)).protocol==='https:'}catch{return false}}
 const used=new Set((s.timeline||[]).flatMap(t=>t.sourceIds||[]))
 const sources=(s.sources||[]).filter(x=>used.has(x.id)&&https(x.url)).map(x=>({id:x.id,title:String(x.title),url:x.url,publisher:x.sourceFamilyId||x.publisher,access:x.access,checkedAt:x.checkedAt}))
 const ok=new Set(sources.map(x=>x.id))
 const archive=(s.timeline||[]).filter(t=>(t.sourceIds||[]).length&&t.sourceIds.every((i:string)=>ok.has(i))).map(t=>({id:String(t.id).replace(/^research_timeline-research_/,'t-'),value:{name:t.titleHe,on:t.precision==='day'?t.on:null,precision:t.precision==='day'?'day':'year',year:t.year??(t.on?+String(t.on).slice(0,4):null),hint:t.summaryHe||'',sport:'football',sensitive:true},sources:t.sourceIds,confidence:1,status:'review',researchedAt:'2026-10-06',approvedAt:null,approvedBy:null,parserCertainty:'high',conflictFree:false,notes:'Research material, not approved. Needs a human review and an independent second source.'}))
 return {schemaVersion:1,clubId:club,contentLocale,sources,archive}
}
