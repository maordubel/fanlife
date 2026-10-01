import 'server-only'
import manifest from '@/club-packs/zrinjski-mostar/manifest.json'
import anchors from '@/club-packs/zrinjski-mostar/anchors.json'
import sources from '@/club-packs/zrinjski-mostar/sources.json'
import core from '@/club-packs/zrinjski-mostar/core.json'
/** Research import preserves uncertainty; old gate OPEN labels never constitute approval. */
export function zrinjskiPack() {
 return {...core,sources:[...core.sources,...sources.map(s=>({id:s.id,title:s.title,url:s.url,publisher:s.publisher,access:'unknown',checkedAt:null}))],archive:[...core.archive,...anchors.map(a=>({id:`legacy-${a.id}`,value:{name:a.title,on:'date' in a?a.date:null,precision:'date' in a?'day':'year',year:a.year,hint:'Imported research',sport:'football',sensitive:a.type.includes('sensitive')||a.type.includes('support')},sources:a.sourceIds,confidence:1,status:'review',researchedAt:null,approvedAt:null,approvedBy:null,notes:`Imported from ${manifest.identity.id}; year ${a.year}. Original evidence needs review.`}))]}
}
