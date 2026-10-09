import 'server-only'
import {createHash} from 'node:crypto'
import identity from '@/content/clubs/hapoel-tel-aviv/club.json'
import {REGISTRY} from '@/lib/master/registry'
import {missingSections,timelineReadiness,type ClubData,type Source} from '../contract'
import {hapoelTimelinePool,hapoelCardSources} from './hapoel-timeline'
import {clubTheme} from '../theme'
import {sharedReadiness} from '../gate-data'
import {pickablePlayers} from '@/lib/archive/player-master'
import {allQuestions,poolValues} from '@/lib/game/question-master'
import {memoryCandidates} from '@/lib/game/memory'
import {BANK} from '@/lib/game/blind-cow/bank'
import {sourceAdder,hapoelMatches,hapoelKits,hapoelGoals,hapoelRivals} from '../feeds/worker-masters'
let cached:ClubData|undefined
/** Finer evidence the Player Master states: a centre-back term in the club's own fine-position list, and the club's foreign-slot record (not a passport). */
function playerDetail(p:{positions:{fine?:{terms:string[]}};foreignSlot:{status:'israeli'|'foreign'|'unknown'}}){
 const centreBack=(p.positions.fine?.terms??[]).some(t=>t.trim().startsWith('בלם')),slot=p.foreignSlot.status
 const detail={...(centreBack?{centreBack:true as const}:{}),...(slot==='foreign'?{foreignSlot:'foreign' as const}:slot==='israeli'?{foreignSlot:'domestic' as const}:{})}
 return Object.keys(detail).length?{detail}:{}
}
/** The scope a Worker fact key already states: `shirt:10@2021/22` is a season, `goal-in:euro` a competition (rulebook BC-R03). */
function clueScope(factKey:string){const season=/@(\d{4}\/\d{2})$/.exec(factKey)?.[1],competition=/^goal-in:(.+)$/.exec(factKey)?.[1];return season||competition?{scope:{...(season?{season}:{}),...(competition?{competition}:{})}}:{}}
/** Existing curated gameplay eligibility carried forward, without re-research or invented approvals. */
export function getHapoelData():ClubData {
 if(cached)return cached
 const club=REGISTRY.find(c=>c.id===identity.id)!,sources=new Map<string,Source>()
 const timeline=hapoelTimelinePool().map(value=>{
  const s=hapoelCardSources.get(value.id)!,sourceId=createHash('sha256').update(`${s.sourceTitle}:${s.sourceUrl}`).digest('hex').slice(0,16)
  sources.set(sourceId,{id:sourceId,title:s.sourceTitle,url:s.sourceUrl,publisher:s.sourceTitle,access:'unknown',checkedAt:null})
  return {id:value.id,value,sources:[sourceId],confidence:Math.min(3,s.confidence) as 2|3,status:'approved' as const,researchedAt:null,approvedAt:null,approvedBy:'legacy-curation',notes:'Existing curated eligibility carried forward. Source access is not newly asserted; no new owner approval is claimed.'}
 })
 const players=pickablePlayers().map(p=>{
  const refs=p.provenance.map(s=>{const id=createHash('sha256').update(JSON.stringify(s)).digest('hex').slice(0,16);sources.set(id,{id,title:s.sourceTitle||s.file,url:s.sourceUrl||null,publisher:s.sourceTitle||s.file,access:'unknown',checkedAt:null});return id})
  return {id:p.id,value:{id:p.id,name:p.displayName,positions:p.positions.codes,fromYear:p.years.from,toYear:p.years.to,aliases:[...p.aliases.he,...p.aliases.latin],...playerDetail(p)},sources:refs,confidence:2 as const,status:'approved' as const,researchedAt:null,approvedAt:null,approvedBy:'legacy-curation',notes:'Existing Player Master eligibility carried forward; current source access and new approvals are not asserted.'}
 })
 const questions=allQuestions().filter(q=>q.sport==='football'&&q.source.confidence>=2),pools:Record<string,string[]>={}
 for(const q of questions)if(q.pool)pools[q.pool]=[...poolValues(q.pool)]
 const trivia={questions,pools},memory=memoryCandidates(),gates=sharedReadiness({players,trivia,memory,timeline})
 const identities=new Set(players.map(p=>p.value.id)),mysteries=BANK.questions.filter(q=>q.eligibleModes.includes('solo')&&q.remaining[q.remaining.length-1]===1&&identities.has(q.targetPlayerId)&&q.clueIds.every(id=>(BANK.clues[id]?.confidence??0)>=2)).map(q=>({id:q.id,value:{id:q.id,targetPlayerId:q.targetPlayerId,clues:q.clueIds.map(id=>{const c=BANK.clues[id]!,ref=createHash('sha256').update(c.sourceRefs.join('|')).digest('hex').slice(0,16);sources.set(ref,{id:ref,title:c.sourceRefs.join('; '),url:null,publisher:'Existing Player / Match Master',access:'unknown',checkedAt:null});return {id:c.id,label:c.labelHe,value:c.valueHe,sources:[ref],type:c.type,family:c.family,facet:c.facet,factKey:c.factKey,...clueScope(c.factKey)}}),remaining:[...q.remaining]},sources:players.find(p=>p.value.id===q.targetPlayerId)!.sources,confidence:2 as const,status:'approved' as const,researchedAt:null,approvedAt:null,approvedBy:'legacy-curation',notes:'Existing eligible solo clues carried forward with their canonical provenance. No new research, approval or asset rights claimed.'}))
 const add=sourceAdder(sources),matches=hapoelMatches(add),kits=hapoelKits(add),goals=hapoelGoals(add),rivals=hapoelRivals(add)
 const readiness=timelineReadiness(timeline.length)
 const theme=clubTheme(club)
 return cached={schemaVersion:1,version:createHash('sha256').update(JSON.stringify({timeline,theme,players,trivia,memory,mysteries,matches,kits,goals,rivals})).digest('hex').slice(0,16),identity:{id:club.id,name:club.name,city:club.city,country:club.country,sport:'football'},locales:{ui:'en',content:'he',supported:['he','en'],direction:'ltr'},theme,...missingSections,players,matches,kits,goals,rivals,trivia,memory,mysteries,archive:[],timeline,gates:{timeline:readiness,...gates},readiness,life:{state:'unavailable',reason:'LIFE is composed by the universal engine from the club pack, the same as every club. The original hand-authored game lives in The Worker.'},sources:[...sources.values()]}
}
