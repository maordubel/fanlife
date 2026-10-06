import type {ClubData,Fact,Entity,Readiness} from './contract'
import {gateReadiness} from './gate-data'
import {GATE_THRESHOLDS as T} from './thresholds'
import {ZONES,zoneParts} from '@/lib/game/goal-zones'
import {REPLAY_ACTIONS} from '@/lib/game/replay/vocab'

/**
 * Gate 8 — Goal reconstruction, for any club. The Worker's rule carries over unchanged: a goal is
 * rebuilt from what the reporter wrote — who touched it, what the touch was, and the ZONE the words
 * place it in (twenty zones, five across, four deep). Never a pixel, never a coordinate a source did
 * not give. A club opens this gate the moment its approved pack holds one goal with a sourced sequence.
 */
export type GoalAction=(typeof REPLAY_ACTIONS)[number]
export type GoalStep={actor:string|null;side:'club'|'opponent'|'unnamed';action:GoalAction;zone:string;position:string;note:string}
export type ClubGoal={id:string;title:string;subtitle:string;on:string|null;competition:string;opponent:string;score:string;narrative:string;steps:GoalStep[];sources:string[]}
export type GoalTouch={actor:string;action:string;zone:string}
export const MAX_GOAL_TOUCHES=5
const str=(v:unknown)=>typeof v==='string'?v.trim():''
const obj=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{}

function readStep(raw:unknown):GoalStep|null{
 const s=obj(raw),zone=str(s.zone),action=str(s.action)
 if(!ZONES.includes(zone)||!(REPLAY_ACTIONS as readonly string[]).includes(action))return null
 const side=s.side==='opponent'||s.side==='unnamed'?s.side:'club',actor=side==='unnamed'?null:str(s.actor)||null
 if(side!=='unnamed'&&!actor)return null
 return {actor,side,action:action as GoalAction,zone,position:str(s.position),note:str(s.note)}
}
/** Approved goal facts whose every touch reads cleanly. One bad touch drops the goal — never a partial truth. */
export function clubGoals(data:Pick<ClubData,'goals'>):ClubGoal[]{
 return (data.goals||[]).filter((f:Fact<Entity>)=>f.status==='approved'&&f.confidence>=2&&f.sources.length>0).flatMap(f=>{
  const v=obj(f.value),raw=Array.isArray(v.sequence)?v.sequence:[]
  const steps=raw.map(readStep)
  if(!steps.length||steps.length>MAX_GOAL_TOUCHES||steps.some(s=>!s))return []
  return [{id:f.id,title:str(v.name),subtitle:str(v.subtitle),on:str(v.on)||null,competition:str(v.competition),opponent:str(v.opponent),score:str(v.score),narrative:str(v.narrative),steps:steps as GoalStep[],sources:f.sources}]
 })
}
export function goalReadiness(data:Pick<ClubData,'goals'>):Readiness{
 const n=clubGoals(data).length
 return n?gateReadiness(n,T.goal.target,T.goal.minimum,T.goal.unit):{state:'LOCKED',playable:false,eligible:0,target:T.goal.target,reasons:['Needs at least one goal whose report names each touch — who, what, and where on the pitch — with a checked source.']}
}
const mulberry=(seed:number)=>()=>{seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296}
/** Names on the bench for a goal: everyone the report names, plus club players who are not in it. Sorted, so order leaks nothing. */
export function goalPool(data:Pick<ClubData,'players'>,g:ClubGoal,seed:number,size=8):string[]{
 const actors=[...new Set(g.steps.flatMap(s=>s.actor?[s.actor]:[]))]
 const words=new Set(actors.flatMap(a=>a.split(/\s+/)))
 const others=[...new Set((data.players||[]).map(p=>p.value.name).filter(n=>!actors.includes(n)&&!n.split(/\s+/).some(w=>words.has(w))))].sort()
 const r=mulberry(seed+g.id.length*31)
 for(let i=others.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[others[i],others[j]]=[others[j]!,others[i]!]}
 return [...actors,...others.slice(0,Math.max(0,size-actors.length))].sort((a,b)=>a.localeCompare(b))
}
/** What crosses to the client before it commits: the fixture and a room of names. Not the cast, the verbs, the order or the count. */
export function goalDeal(data:Pick<ClubData,'goals'|'players'>,seed:number){
 const goals=clubGoals(data)
 if(!goals.length)return []
 const by=Math.abs(seed)%goals.length
 return [...goals.slice(by),...goals.slice(0,by)].map(g=>({id:g.id,title:g.title,subtitle:g.subtitle,competition:g.competition,opponent:g.opponent,score:g.score,on:g.on,pool:goalPool(data,g,seed)}))
}
const near=(a:string,b:string)=>{const p=zoneParts(a),q=zoneParts(b);return !!p&&!!q&&Math.abs(p.col-q.col)<=1&&Math.abs(p.row-q.row)<=1}
export type GoalStepVerdict={actor:boolean;action:boolean;zone:'exact'|'near'|'miss'}
/** Four points a touch: the man, the verb, and the zone (two for the zone, one for the zone next to it). Extra or missing touches score nothing. */
export function judgeGoal(g:ClubGoal,touches:GoalTouch[]){
 const steps:GoalStepVerdict[]=g.steps.map((t,i)=>{const u=touches[i];if(!u)return {actor:false,action:false,zone:'miss'}
  return {actor:t.actor===null?true:u.actor===t.actor,action:u.action===t.action,zone:u.zone===t.zone?'exact':near(u.zone,t.zone)?'near':'miss'}})
 const points=steps.reduce((n,s)=>n+(s.actor?1:0)+(s.action?1:0)+(s.zone==='exact'?2:s.zone==='near'?1:0),0)
 return {points,max:g.steps.length*4,countRight:touches.length===g.steps.length,steps}
}
/** Wire-safe touches: a name from the pool, a known verb, a real zone, at most five. Anything else is dropped. */
export function cleanTouches(raw:unknown,pool:string[]):GoalTouch[]|null{
 if(!Array.isArray(raw)||raw.length<1||raw.length>MAX_GOAL_TOUCHES)return null
 const out:GoalTouch[]=[]
 for(const t of raw){const o=obj(t),actor=str(o.actor),action=str(o.action),zone=str(o.zone)
  if(!(REPLAY_ACTIONS as readonly string[]).includes(action)||!ZONES.includes(zone)||(actor!==''&&!pool.includes(actor)))return null
  out.push({actor,action,zone})}
 return out
}
