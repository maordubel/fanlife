import {sameClub} from '../../../lib/fixtures/names'
import type {ProviderMatch} from './types'
import type {Corroboration} from './corroborate'
/**
 * ProviderMatch (+ optional second publisher) → a wave-file fact in the same envelope as core.json.
 * Approval is earned, not asserted: two independent publishers that agree on date, teams and score →
 * `approved` / confidence 3 (the compiler's own automated-approval rule then re-checks it). One publisher →
 * `review` / confidence 2, which the gates ignore until someone corroborates it.
 * The club's own side is whichever team matches the club by exact normalised name; if neither does the
 * match is skipped (no guessing which side "we" are).
 */
const slug=(s:string)=>s.normalize('NFD').replace(/\p{M}+/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
export type WaveSource={id:string;title:string;url:string;publisher:string;access:'available';checkedAt:string}
export function toWaveFact(m:ProviderMatch,clubNames:string[],second:Corroboration|null,today:string,clubId:string){
 const homeUs=clubNames.some(n=>sameClub(n,m.home)),awayUs=clubNames.some(n=>sameClub(n,m.away))
 if(homeUs===awayUs||!m.score)return null
 const side=homeUs?'home':'away',lineup=m.lineup?(side==='home'?m.lineup.home:m.lineup.away):[],bench=m.lineup?(side==='home'?m.lineup.homeBench:m.lineup.awayBench):[]
 const id=`a-m-${m.on}-${slug(m.home)}-${slug(m.away)}`
 const src:WaveSource[]=[{id:`a-src-${m.provider}-${m.providerId}`,title:`${m.publisher}: ${m.home} ${m.score.home}-${m.score.away} ${m.away}, ${m.on}`,url:m.url,publisher:m.publisher,access:'available',checkedAt:today}]
 if(second)src.push({id:`a-src-tsdb-${slug(second.url.split('/').pop()||'')}`,title:second.title,url:second.url,publisher:second.publisher,access:'available',checkedAt:today})
 const approved=src.length>=2&&new Set(src.map(s=>s.publisher.toLowerCase())).size>=2
 const ours=m.goals.filter(g=>g.team===side&&!g.own).map(g=>({name:g.name,minute:g.minute}))
 return {sources:src,fact:{id,value:{name:`${m.home} ${m.score.home}-${m.score.away} ${m.away}`,on:m.on,competition:m.competition,score:`${m.score.home}-${m.score.away}`,venue:m.venue,scorers:ours,lineup,bench},sources:src.map(s=>s.id),researchedAt:today,parserCertainty:'high' as const,conflictFree:true,notes:approved?'Date, teams and score agree across two publishers; lineup and scorers from the primary report.':'One publisher only; awaiting corroboration.',confidence:approved?3:2,status:approved?'approved' as const:'review' as const,approvedAt:approved?today:null,approvedBy:approved?`automated:cross-source-review-${clubId}-auto`:null}}
}
export function buildWave(rows:{m:ProviderMatch;second:Corroboration|null}[],clubNames:string[],clubId:string,today:string){
 const sources=new Map<string,WaveSource>(),matches:ReturnType<typeof toWaveFact> extends infer T?NonNullable<T>['fact'][]:never=[]
 for(const r of rows){const w=toWaveFact(r.m,clubNames,r.second,today,clubId);if(!w)continue;for(const s of w.sources)sources.set(s.id,s);matches.push(w.fact)}
 matches.sort((x,y)=>String(y.value.on).localeCompare(String(x.value.on)))
 return {sources:[...sources.values()],matches,kits:[],rivals:[]}
}
