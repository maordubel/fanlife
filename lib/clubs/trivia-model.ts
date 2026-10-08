/**
 * Gate 2 · the Quiz Stand's rules, pure and client-safe (no archive, no answers).
 *
 * The loop itself is `lib/game/session.ts` (three stages, three lamps, a combo, a clock) — this file only decides
 * how that loop meets a CLUB's round: a short bank has fewer questions than a full twelve, so a stage break only
 * exists where there are enough questions for stages, the denominator is always the real count, and what the
 * report says about a run is read from the run's own log — never invented (rule 11).
 */
import type {QTopic,QType} from '@/lib/game/questions/types'
import {HINT_COST,RUN_LENGTH,STAGE_CAPS,STAGE_LENGTH,STAGE_SECONDS,stageCap,stageOf} from '@/lib/game/session'
import {tierFor,type Tier} from '@/lib/game/trivia-report'

/** a round is STAGED (three stages of four, a card between them) only when it is a full twelve; anything shorter is one stage */
export const MIN_ROUND=3
export const staged=(count:number)=>count>=RUN_LENGTH
/** which stage a question belongs to; a short round is one stage */
export const stageIndex=(index:number,count:number)=>staged(count)?Math.min(2,stageOf(index)):0
export const stageCount=(count:number)=>staged(count)?3:1
/** seconds per question; a short round runs on the first stage's clock — it is one stage, and says so */
export const secondsOf=(index:number,count:number)=>staged(count)?STAGE_SECONDS[stageIndex(index,count)]!:STAGE_SECONDS[0]
/** the stage's combo cap; a short round holds the first stage's ×2 */
export const capOf=(index:number,count:number)=>staged(count)?stageCap(index):STAGE_CAPS[0]
/** a stage card shows before the first question of stage 2 and 3 — and only in a staged round */
export const breakBefore=(index:number,count:number)=>staged(count)&&index>0&&index<count&&index%STAGE_LENGTH===0
/** how many questions a run asks at most: never more than the session's twelve */
export const askedOf=(count:number)=>Math.min(count,RUN_LENGTH)
export {HINT_COST}

/** how long the verdict plate stays before the next question: long enough to read the explanation, never a wait */
export const ADVANCE_MIN=1400
export const ADVANCE_MAX=6000
export const advanceMs=(explanation:string,source:boolean)=>Math.min(ADVANCE_MAX,Math.round(ADVANCE_MIN+Math.max(0,explanation.length)*22+(source?400:0)))

export type PaceMode='auto'|'tap'
export const PACE_KEY='fan-life:trivia:pace:v1'

/** the one line a run gets after an answer — a copy key plus a variant for the plain hit and miss */
export type Reaction={key:'timeout'|'deep'|'fast'|'fire'|'onit'|'hit'|'miss';variant:number}
export const HIT_LINES=3,MISS_LINES=3
export function reactionFor(entry:{correct:boolean;timeout:boolean;hinted:boolean;difficulty:number;elapsed:number},streak:number,index:number):Reaction{
 if(!entry.correct)return entry.timeout?{key:'timeout',variant:0}:{key:'miss',variant:index%MISS_LINES}
 if(entry.difficulty>=5)return {key:'deep',variant:0}
 if(!entry.hinted&&entry.elapsed>0&&entry.elapsed<=3)return {key:'fast',variant:0}
 if(streak>=5)return {key:'fire',variant:0}
 if(streak>=3)return {key:'onit',variant:0}
 return {key:'hit',variant:index%HIT_LINES}
}
export const streakCall=(streak:number):'tq.call.2'|'tq.call.3'|'tq.call.4'|'tq.call.many'|null=>streak===2?'tq.call.2':streak===3?'tq.call.3':streak===4?'tq.call.4':streak>=5?'tq.call.many':null
export function trailingStreak(log:readonly {correct:boolean}[]):number{let n=0;for(let i=log.length-1;i>=0&&log[i]!.correct;i--)n++;return n}

export type LogEntry={id:string;type:QType;topic:QTopic;difficulty:number;correct:boolean;hinted:boolean;timeout:boolean;elapsed:number}
export type Report={
 tier:Tier;bestStreak:number;hardest:number|null
 byTopic:{topic:QTopic;right:number;asked:number}[];byType:{type:QType;right:number;asked:number}[]
 strongest:QTopic|null;weakest:QTopic|null;timeouts:number;hinted:number
}
/** What a run says about itself. `weakest` needs at least one miss and strictly more misses than hits in that topic. */
export function reportOf(log:readonly LogEntry[],count:number,lives:number):Report{
 const topics=new Map<QTopic,{right:number;asked:number}>(),types=new Map<QType,{right:number;asked:number}>()
 let streak=0,best=0,hardest:number|null=null,timeouts=0,hinted=0,right=0
 for(const e of log){
  const t=topics.get(e.topic)??{right:0,asked:0};topics.set(e.topic,{right:t.right+(e.correct?1:0),asked:t.asked+1})
  const y=types.get(e.type)??{right:0,asked:0};types.set(e.type,{right:y.right+(e.correct?1:0),asked:y.asked+1})
  streak=e.correct?streak+1:0;best=Math.max(best,streak)
  if(e.correct){right++;hardest=Math.max(hardest??0,e.difficulty)}
  if(e.timeout)timeouts++
  if(e.hinted)hinted++
 }
 const byTopic=[...topics.entries()].map(([topic,v])=>({topic,...v})).sort((a,b)=>a.topic.localeCompare(b.topic))
 const strongest=[...byTopic].filter(t=>t.right>0).sort((a,b)=>b.right/b.asked-a.right/a.asked||b.asked-a.asked||a.topic.localeCompare(b.topic))[0]?.topic??null
 const weakest=[...byTopic].filter(t=>t.asked-t.right>t.right).sort((a,b)=>(b.asked-b.right)-(a.asked-a.right)||a.topic.localeCompare(b.topic))[0]?.topic??null
 return {tier:tierFor(right,Math.max(1,askedOf(count)),lives),bestStreak:best,hardest,byTopic,byType:[...types.entries()].map(([type,v])=>({type,...v})).sort((a,b)=>a.type.localeCompare(b.type)),strongest,weakest,timeouts,hinted}
}

/** the next-challenge doors a finished run offers: the weak topic when there is one and it can field a round, then a harder mix */
export type Next={kind:'weak';topic:QTopic}|{kind:'hard'}|{kind:'mix'}
export function nextChallenges(input:{report:Report;share:number;hard:boolean;topic:string|undefined;available:readonly QTopic[];hardOpen:boolean}):Next[]{
 const out:Next[]=[]
 if(input.report.weakest&&input.report.weakest!==input.topic&&input.available.includes(input.report.weakest))out.push({kind:'weak',topic:input.report.weakest})
 if(input.share>=0.75&&!input.hard&&input.hardOpen)out.push({kind:'hard'})
 if(input.topic||input.hard)out.push({kind:'mix'})
 return out.slice(0,2)
}

/** the challenge as a URL: the same mode and filters, the next slice of the same deck */
export function roundQuery(input:{seed:number;cursor:number;lang:string;mode?:string;topic?:string;era?:string;go?:boolean;practice?:boolean}):string{
 return new URLSearchParams({seed:String(input.seed),r:String(input.cursor),lang:input.lang,...(input.mode?{mode:input.mode}:{}),...(input.topic?{topic:input.topic}:{}),...(input.era?{era:input.era}:{}),...(input.go?{go:'1'}:{}),...(input.practice?{practice:'1'}:{})}).toString()
}

/**
 * The run's identity for the ticket: one attempt, one id. The mode, the filters and practice are all IN it — a
 * practice run and a standard run of one deck are two attempts and never share a result bucket (TR-R10).
 */
export const runKey=(input:{version:string;seed:number;cursor:number;mode?:string;topic?:string;era?:string;practice?:boolean})=>`trivia:${input.version}:${input.seed}:${input.cursor}:${input.mode||''}:${input.topic||''}:${input.era||''}${input.practice?':practice':''}`
/** a practice attempt is on the ticket as played but carries no score: it ran with free hints and no clock */
export const reportedScore=(score:number,practice:boolean)=>practice?0:Math.max(0,Math.floor(score))
