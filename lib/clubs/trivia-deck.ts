import 'server-only'
/**
 * Gate 2 · the decks (rulebook TR-R04, R05, R10, R11, R12) — which runs a club's bank can honestly field.
 *
 * The shared engine deals; this file DECIDES what may be dealt and what it is called. A club's bank goes through
 * `sanitizeBank` first, then every mode is checked against the bank it actually has:
 *
 *  · **standard** opens only when a nonrepeating 4+4+4 deck exists (Hall's condition over distinct facts) AND a
 *    dealt deck verifies stage by stage. Otherwise it is blocked by name — `TRIVIA_STAGE_POOL_SHORT`, with the
 *    exact counts — and the gate offers what the bank can really do, labelled for what it is;
 *  · **history** (the narrow mode) is a deck of twelve distinct facts that makes no claim about difficulty;
 *  · **hard**, a **topic** or an **era** has its own deck or it is not offered; fewer than twelve distinct facts is
 *    a SHORT run with its own result category, never padded;
 *  · **revenge** is exactly the questions this device missed that the current bank still holds — retired or
 *    withdrawn ones are named, never swapped for strangers.
 * A deck is deterministic in (mode, seed, cursor): the engine's rotation holds, so the next cursor is a different
 * deck until the eligible cycle is spent.
 */
import {createTriviaEngine,MIXED,ROUND_LENGTH,type RunSpec} from '@/lib/game/trivia-engine'
import {Q_TOPICS,type MasterQuestion,type QTopic} from '@/lib/game/questions/types'
import type {ClubData} from './contract'
import {bandOf,distinctFacts,factsOf,normKey,sanitizeBank,stageCapacity,bankReport,type BankReport,type Dropped} from './trivia-bank'

export const MIN_DECK=3
export const STAGE_NEED=4

export type Category='standard'|'history'|'hard'|'topic'|'era'|'revenge'|'short'
export type ModeId='standard'|'history'|'hard'|'revenge'
export type BlockerCode='TRIVIA_STAGE_POOL_SHORT'|'TRIVIA_DECK_SHORT'|'TRIVIA_REVENGE_SHORT'|'TRIVIA_DECK_UNVERIFIED'
export type Blocker={code:BlockerCode;counts:number[];need:number}
export type Params={mode?:string;topic?:string;era?:string;practice?:boolean}
export type Deal={ids:string[];category:Category;banded:boolean;cursor:number;mode:ModeId;topic:QTopic|null;era:number|null}
export type Dealt=Deal|{blocked:Blocker;mode:ModeId}
export type ModeInfo={id:ModeId;category:Category;available:boolean;size:number;banded:boolean;blocker?:Blocker}
export type Catalog={modes:ModeInfo[];topics:{id:QTopic;facts:number;size:number}[];eras:{decade:number;facts:number;size:number}[];mode:ModeId;defaultMode:ModeId}

type Engine=ReturnType<typeof createTriviaEngine>
export type Bank={engine:Engine;questions:MasterQuestion[];dropped:Dropped[];byId:Map<string,MasterQuestion>;report:BankReport;dropOf:Map<string,string>}
const cache=new Map<string,Bank>()

/** the club's sanitised bank and its engine; one per club + content version */
export function clubBank(club:ClubData):Bank{
 const key=`${club.identity.id}:${club.version}`
 const hit=cache.get(key)
 if(hit)return hit
 const {questions,dropped}=sanitizeBank(club.trivia.questions,club.trivia.pools)
 const byId=new Map(questions.map(q=>[q.id,q] as const))
 const pools=new Map<string,string[]>()
 const poolValues=(id:string|undefined)=>{
  if(!id||!Object.hasOwn(club.trivia.pools,id))return []
  let v=pools.get(id)
  if(!v){const seen=new Set<string>();v=club.trivia.pools[id]!.filter(x=>{const k=normKey(x);if(k===''||seen.has(k))return false;seen.add(k);return true});pools.set(id,v)}
  return v
 }
 const engine=createTriviaEngine({allQuestions:()=>questions,questionById:id=>byId.get(id),poolValues,factById:()=>undefined})
 const bank:Bank={engine,questions,dropped,byId,report:bankReport(questions,dropped),dropOf:new Map(dropped.map(d=>[d.id,d.code]))}
 cache.set(key,bank)
 return bank
}

const topicOf=(v?:string):QTopic|null=>(Q_TOPICS as readonly string[]).includes(v??'')?v as QTopic:null
const eraOf=(v?:string):number|null=>{const n=Number(v);return v&&Number.isInteger(n)&&n>=1800&&n<=2100&&n%10===0?n:null}
const specOf=(topic:QTopic|null,decade:number|null,hard:boolean):RunSpec=>({topic,decade,hard})

/** stage by stage: the right difficulty band, no fact twice, no prompt twice (TR-R04, TR-R05) */
export function verifyDeck(bank:Bank,ids:readonly string[],opts:{banded:boolean;hard?:boolean}):boolean{
 const facts=new Set<string>(),prompts=new Set<string>()
 for(let i=0;i<ids.length;i++){
  const q=bank.byId.get(ids[i]!)
  if(!q)return false
  if(opts.banded&&bandOf(q.difficulty,!!opts.hard)!==Math.floor(i/STAGE_NEED))return false
  if(prompts.has(`${q.type}|${normKey(q.prompt)}|${normKey(q.quoteHe??'')}`)&&q.type!=='order'&&q.type!=='match')return false
  prompts.add(`${q.type}|${normKey(q.prompt)}|${normKey(q.quoteHe??'')}`)
  for(const f of factsOf(q)){if(facts.has(f))return false;facts.add(f)}
 }
 return new Set(ids).size===ids.length
}

const answerOf=(bank:Bank,id:string)=>bank.byId.get(id)?.answer
/** a date-check deck needs both answers in it; a run of twelve "true" teaches nothing */
function mixedAnswers(bank:Bank,ids:readonly string[]){
 if(!ids.length||!ids.every(id=>bank.byId.get(id)?.type==='tf'))return true
 const t=ids.filter(id=>answerOf(bank,id)==='true').length
 return t>=Math.min(3,Math.floor(ids.length/3))&&ids.length-t>=Math.min(3,Math.floor(ids.length/3))
}

const LAPS=8
function attempt(bank:Bank,spec:RunSpec,seed:number,cursor:number,opts:{banded:boolean;hard?:boolean;full:boolean}):{ids:string[];cursor:number}|null{
 for(let lap=0;lap<LAPS;lap++){
  const ids=bank.engine.dealSeededRun(spec,seed,cursor+lap).ids
  if(opts.full&&ids.length!==ROUND_LENGTH)continue
  if(ids.length<MIN_DECK)return null
  if(!verifyDeck(bank,ids,opts)||!mixedAnswers(bank,ids))continue
  return {ids,cursor:cursor+lap}
 }
 return null
}

const factCount=(bank:Bank,spec:RunSpec)=>distinctFacts(bank.engine.eligible(spec))

/** what this club's bank can field, for the start card: every mode with its size, banding and — if shut — its blocker */
export function modeCatalog(bank:Bank,seed:number,cursor:number,want?:{mode?:string;topic?:string;era?:string}):Catalog{
 const std=stageCapacity(bank.questions,false,STAGE_NEED),hard=stageCapacity(bank.questions,true,STAGE_NEED)
 const stdDeal=std.ok?attempt(bank,MIXED,seed,cursor,{banded:true,full:true}):null
 const hardDeal=hard.ok?attempt(bank,specOf(null,null,true),seed,cursor,{banded:true,hard:true,full:true}):null
 const blocker=(c:{counts:readonly number[]},unverified:boolean):Blocker=>({code:unverified?'TRIVIA_DECK_UNVERIFIED':'TRIVIA_STAGE_POOL_SHORT',counts:[...c.counts],need:STAGE_NEED})
 const facts=distinctFacts(bank.questions)
 const narrowSize=Math.min(ROUND_LENGTH,facts)
 const modes:ModeInfo[]=[
  {id:'standard',category:'standard',available:!!stdDeal,size:stdDeal?ROUND_LENGTH:0,banded:true,...(stdDeal?{}:{blocker:blocker(std,std.ok)})},
  {id:'hard',category:'hard',available:!!hardDeal,size:hardDeal?ROUND_LENGTH:0,banded:true,...(hardDeal?{}:{blocker:blocker(hard,hard.ok)})},
  // the narrow mode exists only where standard cannot honestly open: it is the truthful name for what the bank is
  {id:'history',category:narrowSize<ROUND_LENGTH?'short':'history',available:!stdDeal&&narrowSize>=MIN_DECK,size:!stdDeal?narrowSize:0,banded:false,
   ...(!stdDeal&&narrowSize<MIN_DECK?{blocker:{code:'TRIVIA_DECK_SHORT' as const,counts:[facts],need:MIN_DECK}}:{})}
 ]
 const topics:Catalog['topics']=[]
 for(const id of Q_TOPICS){
  const spec=specOf(id,null,false),f=factCount(bank,spec)
  const got=f>=MIN_DECK?attempt(bank,spec,seed,cursor,{banded:false,full:false}):null
  if(got)topics.push({id,facts:f,size:got.ids.length})
 }
 const eras:Catalog['eras']=[]
 const t=topicOf(want?.topic)
 const decades=new Set<number>()
 for(const q of bank.questions)for(const d of q.decades)decades.add(d)
 for(const decade of [...decades].sort((a,b)=>a-b)){
  const spec=specOf(t,decade,false),f=factCount(bank,spec)
  const got=f>=MIN_DECK?attempt(bank,spec,seed,cursor,{banded:false,full:false}):null
  if(got)eras.push({decade,facts:f,size:got.ids.length})
 }
 const first=modes.find(m=>m.id!=='hard'&&m.available)
 const defaultMode:ModeId=first?.id??'standard'
 const asked=want?.mode as ModeId|undefined
 const mode=asked&&modes.some(m=>m.id===asked&&m.available)?asked:defaultMode
 return {modes,topics,eras,mode,defaultMode}
}

/** the deck for a request — or the blocker, by name, with the counts that caused it */
export function dealMode(bank:Bank,params:Params,seed:number,cursor:number,missed:readonly string[]=[]):Dealt{
 const topic=topicOf(params.topic),decade=eraOf(params.era)
 if(params.mode==='revenge'){
  const ids:string[]=[],facts=new Set<string>()
  for(const id of missed){
   const q=bank.byId.get(id)
   if(!q||ids.includes(id))continue
   const f=factsOf(q)
   if(f.some(x=>facts.has(x)))continue
   f.forEach(x=>facts.add(x));ids.push(id)
   if(ids.length>=ROUND_LENGTH)break
  }
  if(ids.length<MIN_DECK)return {mode:'revenge',blocked:{code:'TRIVIA_REVENGE_SHORT',counts:[ids.length],need:MIN_DECK}}
  ids.sort((a,b)=>bank.byId.get(a)!.difficulty-bank.byId.get(b)!.difficulty)
  return {ids,category:ids.length<ROUND_LENGTH?'short':'revenge',banded:false,cursor,mode:'revenge',topic:null,era:null}
 }
 const filtered=topic!==null||decade!==null
 const hard=params.mode==='hard'
 if(filtered||params.mode==='history'){
  const spec=specOf(topic,decade,hard&&filtered)
  const f=factCount(bank,spec)
  if(f<MIN_DECK)return {mode:'history',blocked:{code:'TRIVIA_DECK_SHORT',counts:[f],need:MIN_DECK}}
  const got=attempt(bank,spec,seed,cursor,{banded:false,full:false})
  if(!got)return {mode:'history',blocked:{code:'TRIVIA_DECK_UNVERIFIED',counts:[f],need:MIN_DECK}}
  const short=got.ids.length<ROUND_LENGTH
  return {ids:got.ids,category:short?'short':topic?'topic':decade?'era':'history',banded:false,cursor:got.cursor,mode:'history',topic,era:decade}
 }
 const std=stageCapacity(bank.questions,hard,STAGE_NEED)
 const mode:ModeId=hard?'hard':'standard'
 if(!std.ok)return {mode,blocked:{code:'TRIVIA_STAGE_POOL_SHORT',counts:std.counts,need:STAGE_NEED}}
 const got=attempt(bank,specOf(null,null,hard),seed,cursor,{banded:true,hard,full:true})
 if(!got)return {mode,blocked:{code:'TRIVIA_DECK_UNVERIFIED',counts:std.counts,need:STAGE_NEED}}
 return {ids:got.ids,category:hard?'hard':'standard',banded:true,cursor:got.cursor,mode,topic:null,era:null}
}

/** which of the ids a device remembers as missed this bank still holds, and why each other one is gone (TR-R11) */
export function reviewMissed(bank:Bank,ids:readonly string[]):{playable:string[];removed:{id:string;reason:'retired'|'withdrawn'}[];merged:number}{
 const playable:string[]=[],removed:{id:string;reason:'retired'|'withdrawn'}[]=[],facts=new Set<string>()
 let merged=0
 for(const id of ids){
  const q=bank.byId.get(id)
  if(!q){removed.push({id,reason:bank.dropOf.has(id)?'withdrawn':'retired'});continue}
  const f=factsOf(q)
  if(f.some(x=>facts.has(x))){merged++;continue}
  f.forEach(x=>facts.add(x));playable.push(id)
 }
 return {playable,removed,merged}
}

/** a result's category, said once: the label a share and a ticket carry so unlike runs never share a bucket (TR-R10) */
export const categoryOf=(deal:Pick<Deal,'category'>,practice:boolean)=>practice?'practice':deal.category
