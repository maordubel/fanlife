import 'server-only'
import {createHash} from 'node:crypto'
import identity from '@/content/clubs/hapoel-tel-aviv/club.json'
import {REGISTRY} from '@/lib/master/registry'
import {missingSections,timelineReadiness,type ClubData,type Source} from '../contract'
import {hapoelTimelinePool,hapoelCardSources} from './hapoel-timeline'
import {clubTheme} from '../theme'
let cached:ClubData|undefined
/** Existing curated gameplay eligibility carried forward, without re-research or invented approvals. */
export function getHapoelData():ClubData {
 if(cached)return cached
 const club=REGISTRY.find(c=>c.id===identity.id)!,sources=new Map<string,Source>()
 const timeline=hapoelTimelinePool().map(value=>{
  const s=hapoelCardSources.get(value.id)!,sourceId=createHash('sha256').update(`${s.sourceTitle}:${s.sourceUrl}`).digest('hex').slice(0,16)
  sources.set(sourceId,{id:sourceId,title:s.sourceTitle,url:s.sourceUrl,publisher:s.sourceTitle,access:'unknown',checkedAt:null})
  return {id:value.id,value,sources:[sourceId],confidence:Math.min(3,s.confidence) as 2|3,status:'approved' as const,researchedAt:null,approvedAt:null,approvedBy:'legacy-curation',notes:'Existing curated eligibility carried forward. Source access is not newly asserted; no new owner approval is claimed.'}
 })
 const readiness=timelineReadiness(timeline.length)
 const theme=clubTheme(club)
 return cached={schemaVersion:1,version:createHash('sha256').update(JSON.stringify({timeline,theme})).digest('hex').slice(0,16),identity:{id:club.id,name:club.name,city:club.city,country:club.country,sport:'football'},locales:{ui:'en',content:'he',supported:['he','en'],direction:'ltr'},theme,...missingSections,archive:[],timeline,gates:{timeline:readiness},readiness,life:{state:'legacy',reason:'Original hand-authored Hapoel LIFE preserved; not migrated in M1.'},sources:[...sources.values()]}
}
