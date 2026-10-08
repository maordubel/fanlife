import 'server-only'
import {randomInt} from 'node:crypto'
import type {ClubData} from './contract'
import {createSoloEngine,newRun,type RunState} from '@/lib/game/blind-cow/solo-engine'
import {weightedTimeMs} from '@/lib/game/blind-cow/scoring'
export type MysteryView={rid:string;status:RunState['status'];shown:number;total:number;wrong:number;tried:string[];startedAt:number;serverNow:number;clues:{n:number;label:string;value:string}[];result?:{playerId:string;name:string;rawElapsedMs:number;weightedTimeMs:number;sources:{id:string;title:string;url:string|null}[]}}
/** One existing solo state machine, injected with this club's eligible question/player pool. */
export function clubMystery(data:ClubData){
 const players=new Map((data.players||[]).map(f=>[f.value.id,f])),pool=data.mysteries.filter(f=>f.status==='approved'&&f.confidence>=2&&players.has(f.value.targetPlayerId)&&f.value.clues.length>=4),byId=new Map(pool.map(f=>[f.id,f]))
 const question=(id:string)=>{const q=byId.get(id)?.value;return q?{id,version:1,targetPlayerId:q.targetPlayerId,clueIds:q.clues.map(c=>c.id)}:null}
 const engine=createSoloEngine({questionById:question,isPlayerId:id=>players.has(id)})
 function start(now:number,recent:string[]=[]){const fresh=pool.filter(q=>!recent.includes(q.id)),from=fresh.length?fresh:pool;if(!from.length)return null;return newRun('solo',question(from[randomInt(from.length)]!.id)!,now,{recent})}
 /** A DETERMINISTIC deal (daily / challenge): the mystery at `index` of the pool, never random. Additive — `start` is unchanged. */
 function startAt(now:number,index:number){const q=pool[index];return q?newRun('solo',question(q.id)!,now,{recent:[]}):null}
 function valid(s:RunState):boolean{return !!s&&s.v===1&&typeof s.rid==='string'&&/^[0-9a-f]{12}$/.test(s.rid)&&s.mode==='solo'&&s.qv===1&&!!question(s.qid)&&['playing','solved','gave_up'].includes(s.status)&&Number.isSafeInteger(s.started)&&s.started>0&&Number.isInteger(s.shown)&&s.shown>=1&&s.shown<=question(s.qid)!.clueIds.length&&Number.isInteger(s.wrong)&&s.wrong>=0&&Array.isArray(s.tried)&&s.tried.length<=30&&s.tried.every(id=>players.has(id))&&Array.isArray(s.recent)&&s.recent.length<=40&&s.recent.every(id=>typeof id==='string')&&s.sv===1&&((s.status==='playing'&&s.finished===null)||(s.status!=='playing'&&Number.isSafeInteger(s.finished)&&s.finished!==null&&s.finished>=s.started))}
 function view(s:RunState,now=Date.now()):MysteryView|null{
  if(!valid(s))return null
  const q=byId.get(s.qid)!.value,v:MysteryView={rid:s.rid,status:s.status,shown:s.shown,total:q.clues.length,wrong:s.wrong,tried:s.tried,startedAt:s.started,serverNow:now,clues:q.clues.slice(0,s.status==='playing'?s.shown:q.clues.length).map(({label,value},i)=>({n:i+1,label,value}))}
  if(s.status!=='playing'&&s.finished!==null){const f=players.get(q.targetPlayerId)!,rawElapsedMs=s.finished-s.started,refs=[...new Set([...f.sources,...q.clues.flatMap(c=>c.sources)])];v.result={playerId:f.value.id,name:f.value.name,rawElapsedMs,weightedTimeMs:weightedTimeMs({rawElapsedMs,hintsUsed:s.shown,wrongGuesses:s.wrong},s.sv),sources:refs.map(id=>data.sources.find(s=>s.id===id)).filter((s):s is ClubData['sources'][number]=>!!s).map(({id,title,url})=>({id,title,url}))}}
  return v
 }
 return {...engine,start,startAt,valid,view,poolSize:pool.length}
}
