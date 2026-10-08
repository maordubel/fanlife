import 'server-only'
import {randomInt} from 'node:crypto'
import type {ClubData} from './contract'
import {createSoloEngine,newRun,type RunState} from '@/lib/game/blind-cow/solo-engine'
import {evaluate,tally,weighted,SUPPORTED_SCORING,type Evaluation} from './mystery-rules'
export type RevealClue={n:number;label:string;value:string;/** the source titles behind this one clue (BC-R14) */sources:{id:string;title:string;url:string|null}[];/** scope a reader needs to read it correctly: the season, the competition */caveat:string|null;/** candidates still fitting after this clue, when the bank computed it */remaining:number|null}
export type MysteryView={rid:string;status:RunState['status'];shown:number;total:number;wrong:number;tried:string[];startedAt:number;serverNow:number;/** 'unique' = one intended answer proven; 'exploration' = uniqueness unproven, labelled (BC-R07) */kind:'unique'|'exploration';/** how many candidates the archive says still fit after the last clue, null when unknown */candidates:number|null;clues:{n:number;label:string;value:string}[];result?:{playerId:string;name:string;rawElapsedMs:number;weightedTimeMs:number;sources:{id:string;title:string;url:string|null}[];reveal:RevealClue[];/** the one honest sentence about how far uniqueness is proven */coverage:'unique-in-archive'|'few-candidates'|'unproven'}}
/** The sealed-state authority is available: production needs a real key (a development constant would let anyone read the answer). */
export const runtimeHealthy=()=>process.env.NODE_ENV!=='production'||!!(process.env.BLIND_COW_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY)
const evalCache=new WeakMap<object,Map<string,Evaluation>>()
/** Every approved mystery's verdict, computed once per compiled club (BC-R04..R08). */
function evaluations(data:ClubData){
 const hit=evalCache.get(data.mysteries);if(hit)return hit
 const players=new Map((data.players||[]).map(f=>[f.value.id,f])),out=new Map<string,Evaluation>(),runtime=runtimeHealthy()
 for(const f of data.mysteries){
  const p=players.get(f.value.targetPlayerId);if(f.status!=='approved'||f.confidence<2||!p||f.value.clues.length<4)continue
  out.set(f.id,evaluate({id:f.id,clues:f.value.clues,remaining:f.value.remaining},{id:p.value.id,name:p.value.name,aliases:p.value.aliases??[]},{runtime,scoringVersion:SUPPORTED_SCORING}))
 }
 evalCache.set(data.mysteries,out);return out
}
/** One existing solo state machine, injected with this club's eligible question/player pool — now filtered by the clue rules. */
export function clubMystery(data:ClubData){
 const players=new Map((data.players||[]).map(f=>[f.value.id,f])),evals=evaluations(data)
 const pool=data.mysteries.filter(f=>evals.get(f.id)?.practice.ok),byId=new Map(pool.map(f=>[f.id,f]))
 /** daily and duel deal ONLY from mysteries that prove they narrow to one (BC-R06) */
 const competitive=pool.filter(f=>evals.get(f.id)?.competitive.ok),unique=pool.filter(f=>evals.get(f.id)?.practice.kind==='unique')
 const question=(id:string)=>{const q=byId.get(id)?.value;return q?{id,version:1,targetPlayerId:q.targetPlayerId,clueIds:q.clues.map(c=>c.id)}:null}
 const engine=createSoloEngine({questionById:question,isPlayerId:id=>players.has(id)})
 /** practice prefers a proven-unique puzzle; an exploration is dealt only when nothing proven is left to play */
 function start(now:number,recent:string[]=[]){const base=unique.length?unique:pool,fresh=base.filter(q=>!recent.includes(q.id)),from=fresh.length?fresh:base;if(!from.length)return null;return newRun('solo',question(from[randomInt(from.length)]!.id)!,now,{recent})}
 /** A DETERMINISTIC deal (daily / challenge): the competitive mystery at `index`, never random, never a mystery that cannot prove itself. */
 function startAt(now:number,index:number){const q=competitive[index];return q?newRun('solo',question(q.id)!,now,{recent:[]}):null}
 const knownStatus=(s:RunState)=>['playing','solved','gave_up','timeout'].includes(s.status)
 function valid(s:RunState):boolean{return !!s&&s.v===1&&typeof s.rid==='string'&&/^[0-9a-f]{12}$/.test(s.rid)&&s.mode==='solo'&&s.qv===1&&!!question(s.qid)&&knownStatus(s)&&Number.isSafeInteger(s.started)&&s.started>0&&Number.isInteger(s.shown)&&s.shown>=1&&s.shown<=question(s.qid)!.clueIds.length&&Number.isInteger(s.wrong)&&s.wrong>=0&&Array.isArray(s.tried)&&s.tried.length<=30&&s.tried.every(id=>players.has(id))&&Array.isArray(s.recent)&&s.recent.length<=40&&s.recent.every(id=>typeof id==='string')&&s.sv===SUPPORTED_SCORING&&((s.status==='playing'&&s.finished===null)||(s.status!=='playing'&&Number.isSafeInteger(s.finished)&&s.finished!==null&&s.finished>=s.started))}
 /** a run sealed under a scoring version this code cannot honour (BC-R10) — told apart from a plain stale/tampered one */
 const unsupportedVersion=(s:RunState)=>!!s&&typeof s==='object'&&typeof s.sv==='number'&&s.sv!==SUPPORTED_SCORING
 const sourceOf=(id:string)=>data.sources.find(s=>s.id===id)
 const pub=(refs:string[])=>refs.map(sourceOf).filter((s):s is ClubData['sources'][number]=>!!s).map(({id,title,url})=>({id,title,url}))
 function view(s:RunState,now=Date.now()):MysteryView|null{
  if(!valid(s))return null
  const f=byId.get(s.qid)!,q=f.value,ev=evals.get(f.id)!,v:MysteryView={rid:s.rid,status:s.status,shown:s.shown,total:q.clues.length,wrong:s.wrong,tried:s.tried,startedAt:s.started,serverNow:now,kind:ev.practice.kind==='unique'?'unique':'exploration',candidates:ev.finalCandidates,clues:q.clues.slice(0,s.status==='playing'?s.shown:q.clues.length).map(({label,value},i)=>({n:i+1,label,value}))}
  if(s.status!=='playing'&&s.finished!==null){
   const t=players.get(q.targetPlayerId)!,rawElapsedMs=s.finished-s.started,refs=[...new Set([...t.sources,...q.clues.flatMap(c=>c.sources)])]
   const reveal:RevealClue[]=q.clues.map((c,i)=>({n:i+1,label:c.label,value:c.value,sources:pub(c.sources),caveat:[c.scope?.season?`season ${c.scope.season}`:'',c.scope?.competition?`scope: ${c.scope.competition}`:''].filter(Boolean).join(' · ')||null,remaining:ev.ladder[i]?.remaining??null}))
   v.result={playerId:t.value.id,name:t.value.name,rawElapsedMs,weightedTimeMs:weighted({rawElapsedMs,cluesShown:s.shown,wrongGuesses:s.wrong},s.sv)!,sources:pub(refs),reveal,coverage:ev.finalCandidates===1?'unique-in-archive':ev.finalCandidates!==null?'few-candidates':'unproven'}
  }
  return v
 }
 /** what each mode needs and how many mysteries clear it — the lobby prints it, the admin reads it */
 const modes=()=>{const all=[...evals.values()];return {practice:tally(all,'practice'),competitive:tally(all,'competitive')}}
 return {...engine,start,startAt,valid,unsupportedVersion,view,poolSize:pool.length,competitiveSize:competitive.length,uniqueSize:unique.length,evaluations:evals,modes}
}

/** ADMIN ONLY (names the targets): the whole narrowing ladder of a club's mysteries and why each mode is open or blocked — rulebook §12 "Archive/admin". */
export function mysteryReport(data:ClubData){
 const game=clubMystery(data),names=new Map((data.players||[]).map(f=>[f.value.id,f.value.name]))
 return {club:data.identity.id,version:data.version,modes:game.modes(),sizes:{practice:game.poolSize,unique:game.uniqueSize,competitive:game.competitiveSize,approved:data.mysteries.length},
  mysteries:data.mysteries.map(f=>({id:f.id,target:names.get(f.value.targetPlayerId)??f.value.targetPlayerId,evaluation:game.evaluations.get(f.id)??null}))}
}
