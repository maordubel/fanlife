import type {ClubData,Fact,Entity} from './contract'
import type {MemoryCandidate} from '@/lib/game/memory-engine'
import {createHash} from 'node:crypto'

/**
 * Review D04: every club's Memory used to be "date memory" only (moment ↔ day), while The Worker's has seven relations.
 * The relations below are read from records the pack ALREADY approves, each pair one fact with its own sources:
 *   · trophy-season — an honour and one season it was won (a board never holds the same honour twice: the solver's
 *     one-face rule, ME-R02, is what keeps "Scottish Cup ↔ 1988/89" unambiguous);
 *   · goal-year     — a documented goal and its year;
 *   · maker-span    — a kit maker and the unbroken run of seasons the home shirt was his;
 *   · moment-year   — a European night and the YEAR of its recorded day (not a season: a season would be a convention
 *                     laid over the date — August 2020 finals, June qualifiers — and the record states a day, not a season).
 * Nothing is computed that the record does not state; a fact below confidence 2 or not approved is not dealt.
 * Each type is capped by a stable hash so the solver searches a bounded pool and the selection never moves between builds.
 */
const CAP=240
const ok=(f:Fact<unknown>)=>f.status==='approved'&&f.confidence>=2&&f.sources.length>0
const rank=(s:string)=>createHash('sha256').update(s).digest('hex')
const cap=(xs:MemoryCandidate[])=>xs.length<=CAP?xs:[...xs].sort((a,b)=>rank(a.pair).localeCompare(rank(b.pair))).slice(0,CAP)
/** "1892-93" / "1892/93" → "1892/93"; "1892" stays */
export const seasonLabel=(s:string)=>{const m=/^(\d{4})\s*[-/–]\s*(\d{2,4})$/.exec(s.trim());return m?`${m[1]}/${m[2]!.slice(-2)}`:s.trim()}
/** the year a season ends in — 1892/93 → 1893 */
const seasonEnd=(s:string)=>{const m=/^(\d{4})(?:\/(\d{2}))?/.exec(s);if(!m)return null;const a=Number(m[1]);if(!m[2])return a;const b=Number(m[2]);return Math.floor(a/100)*100+b+(b<a%100?100:0)}
const EURO=/\b(UEFA|European|Champions League|Europa|Cup Winners|Fairs|Conference League|Intertoto)\b/i
type V=Record<string,unknown>
const str=(v:unknown)=>typeof v==='string'&&v.trim()?v.trim():null

export function memoryPairs(data:ClubData):MemoryCandidate[]{
 const out:MemoryCandidate[]=[]
 // honours: one pair per (honour, season)
 const trophies:MemoryCandidate[]=[]
 for(const f of (data.trophies||[]) as Fact<Entity&V>[]){
  if(!ok(f))continue
  const name=str(f.value.name),seasons=Array.isArray(f.value.seasons)?f.value.seasons:[]
  if(!name)continue
  for(const s of seasons){const label=typeof s==='string'?seasonLabel(s):null;if(!label||!/^\d{4}/.test(label))continue
   trophies.push({pair:`trophy:${f.id}:${label}`,type:'trophy-season',fact:null,a:name,b:label,kind:'Honour / season',object:'trophy',answer:'season',year:seasonEnd(label),sources:[...f.sources]})}
 }
 out.push(...cap(trophies))
 // documented goals: the title and its year
 const goals:MemoryCandidate[]=[]
 for(const f of (data.goals||[]) as Fact<Entity&V>[]){
  const name=str(f.value.name),on=str(f.value.on)
  if(!ok(f)||!name||!on||!/^\d{4}-\d{2}-\d{2}$/.test(on)||/\b(18|19|20)\d{2}\b/.test(name))continue
  goals.push({pair:`goal:${f.id}`,type:'goal-year',fact:str(f.value.narrative)?.split(/(?<=[.!?])\s/)[0]?.slice(0,120)??null,a:name,b:on.slice(0,4),kind:'Goal / year',object:'goal',answer:'season',year:Number(on.slice(0,4)),sources:[...f.sources]})
 }
 out.push(...cap(goals))
 // kit makers: unbroken runs of the HOME shirt
 const home=((data.kits||[]) as Fact<Entity&V>[]).filter(f=>ok(f)&&f.value.type==='home'&&str(f.value.manufacturer)&&/^\d{4}/.test(String(f.value.season??'')))
  .map(f=>({f,season:seasonLabel(String(f.value.season)),maker:str(f.value.manufacturer)!})).sort((a,b)=>a.season.localeCompare(b.season))
 const spans:MemoryCandidate[]=[]
 for(let i=0;i<home.length;){
  let j=i;while(j+1<home.length&&home[j+1]!.maker===home[i]!.maker)j++
  const first=home[i]!.season,last=home[j]!.season,span=first===last?first:`${first}–${last}`
  spans.push({pair:`kit:${home[i]!.maker}:${first}`,type:'maker-span',fact:null,a:home[i]!.maker,b:span,kind:'Kit maker / seasons',object:'shirt',answer:'season',year:seasonEnd(last),sources:[...new Set(home.slice(i,j+1).flatMap(x=>x.f.sources))]})
  i=j+1
 }
 out.push(...cap(spans))
 // European nights: the match and its season (its archive entry, when the archive projects it, has the same id)
 const ties:MemoryCandidate[]=[]
 for(const f of (data.matches||[]) as Fact<Entity&V>[]){
  const name=str(f.value.name),on=str(f.value.on),comp=str(f.value.competition)
  if(!ok(f)||!name||!on||!comp||!EURO.test(comp)||!/^\d{4}-\d{2}-\d{2}$/.test(on))continue
  if(/\b(18|19|20)\d{2}\b/.test(name))continue
  ties.push({pair:`euro:${f.id}`,type:'moment-year',fact:`${name} — ${comp}, ${on}.`,a:name,b:on.slice(0,4),kind:'European night / year',object:'ticket',answer:'season',year:Number(on.slice(0,4)),sources:[...f.sources],entry:f.id})
 }
 out.push(...cap(ties))
 return out
}

/** adds the relations above to the club's own memory pool; The Worker (Hapoel) keeps its curated pool as it is */
export function withMemoryPairs(data:ClubData):ClubData{
 if(data.identity.id==='hapoel-tel-aviv')return data
 const have=new Set(data.memory.map(c=>c.pair)),extra=memoryPairs(data).filter(c=>!have.has(c.pair))
 return extra.length?{...data,memory:[...data.memory,...extra]}:data
}
