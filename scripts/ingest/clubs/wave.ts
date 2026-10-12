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
 const second2=src.length>=2&&new Set(src.map(s=>s.publisher.toLowerCase())).size>=2
 // Owner decision, chat 2026-10-10: UEFA is sufficient for its own competitions — date, teams, score, scorers and elevens.
 // The eleven rides on UEFA's own record whether or not a second publisher also confirms the result: before 12.10.2026 a
 // corroborated UEFA match LOST its eleven (more evidence, less data), so a refreshed pull would have emptied gate 3.
 const uefa=m.provider==='uefa',ownerUefa=uefa&&!second2
 const approved=second2||ownerUefa
 const ours=m.goals.filter(g=>g.team===side&&!g.own).map(g=>({name:g.name,minute:g.minute}))
 // Approval is per FIELD (audit A04): the second publisher confirms date, teams and score only. The eleven and the
 // scorers come from the primary report alone, so they travel as `primaryOnly` claims the gates never read —
 // a corroborated result is not a corroborated line-up.
 return {sources:src,fact:{id,value:{name:`${m.home} ${m.score.home}-${m.score.away} ${m.away}`,on:m.on,competition:m.competition,score:`${m.score.home}-${m.score.away}`,venue:m.venue,...(uefa?{lineup,bench,scorers:ours}:{}),primaryOnly:{source:src[0]!.id,scorers:ours,lineup,bench}},sources:src.map(s=>s.id),researchedAt:today,parserCertainty:'high' as const,conflictFree:true,notes:ownerUefa?'UEFA match record (date, teams, score, scorers, starting elevens). Approved by the owner on 2026-10-10: UEFA is sufficient for its own competitions.':uefa&&approved?'Date, teams and score agree across two publishers; the eleven and the scorers are UEFA\'s own record (owner, 2026-10-10: UEFA is sufficient for its own competitions).':approved?'Date, teams and score agree across two publishers. Line-up and scorers are held as primary-only claims until a second publisher states them.':'One publisher only; awaiting corroboration.',confidence:second2?3:2,status:approved?'approved' as const:'review' as const,approvedAt:approved?today:null,approvedBy:ownerUefa?'Maor Harel (owner, chat 2026-10-10: UEFA is sufficient for its own competitions)':approved?`automated:cross-source-review-${clubId}-auto`:null}}
}
export function buildWave(rows:{m:ProviderMatch;second:Corroboration|null}[],clubNames:string[],clubId:string,today:string){
 const sources=new Map<string,WaveSource>(),matches:NonNullable<ReturnType<typeof toWaveFact>>['fact'][]=[]
 for(const r of rows){const w=toWaveFact(r.m,clubNames,r.second,today,clubId);if(!w)continue;for(const s of w.sources)sources.set(s.id,s);matches.push(w.fact)}
 matches.sort((x,y)=>String(y.value.on).localeCompare(String(x.value.on)))
 return {sources:[...sources.values()],matches,kits:[],rivals:[]}
}
type WaveFile={sources:WaveSource[];matches:NonNullable<ReturnType<typeof toWaveFact>>['fact'][];kits:unknown[];rivals:unknown[]}
const eleven=(f:{value:Record<string,unknown>})=>Array.isArray(f.value.lineup)&&(f.value.lineup as unknown[]).length===11
/**
 * A scheduled pull reads only the newest `--max` matches, so it must ADD to the committed wave, never replace it: the run of
 * 12.10.2026 would have cut AEK from 269 matches to 80 (and Celtic from 400). Rules: a match the fresh pull did not read is
 * kept; a fresh read replaces the committed one unless it is worse — it lost its approval, or it lost an eleven the committed
 * read of the SAME match had (a refused line-up request is not evidence that there was no eleven). Sources are the union of
 * what the kept matches cite. Pure; tested in tests/ingest/club-wave.test.ts.
 */
export function mergeAutoWave(prev:Partial<WaveFile>|null|undefined,fresh:WaveFile):WaveFile{
 const old=new Map((prev?.matches||[]).map(f=>[f.id,f])),out=new Map(old)
 for(const f of fresh.matches){
  const p=old.get(f.id)
  if(!p){out.set(f.id,f);continue}
  if(p.status==='approved'&&f.status!=='approved')continue
  out.set(f.id,eleven(p as never)&&!eleven(f as never)?{...f,value:{...f.value,lineup:(p.value as Record<string,unknown>).lineup,bench:(p.value as Record<string,unknown>).bench,scorers:(p.value as Record<string,unknown>).scorers} as typeof f.value,sources:[...new Set([...p.sources,...f.sources])]}:f)
 }
 const matches=[...out.values()].sort((x,y)=>String(y.value.on).localeCompare(String(x.value.on)))
 const cited=new Set(matches.flatMap(f=>f.sources)),src=new Map<string,WaveSource>()
 for(const s of [...(prev?.sources||[]),...fresh.sources])if(cited.has(s.id))src.set(s.id,s)
 return {sources:[...src.values()],matches,kits:fresh.kits.length?fresh.kits:(prev?.kits||[]),rivals:fresh.rivals.length?fresh.rivals:(prev?.rivals||[])}
}
