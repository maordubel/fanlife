/**
 * Gate 2 · the device's missed questions (TR-R11) — the only source of "Revenge".
 *
 * Revenge is the questions THIS device actually got wrong, for this club, newest first. A question is added when it
 * settles wrong or times out and leaves when it is later answered right; nothing is ever added on the player's
 * behalf. The ids are the bank's own opaque question ids, so a bank that has since been corrected can say which of
 * them it no longer holds (`reviewMissed`) and the screen can explain the gap instead of filling it.
 * Device-local, try/catch around storage, and never a secret: an id says nothing about the answer.
 */
export type MissedItem={id:string;ver:string;at:number}
export type Missed={v:1;items:MissedItem[]}
export const MISSED_MAX=60
export const missedKey=(club:string)=>`fan-life:trivia:missed:v1:${club}`
export const emptyMissed=():Missed=>({v:1,items:[]})

export function addMissed(m:Missed,id:string,ver:string,at:number):Missed{
 const rest=m.items.filter(x=>x.id!==id)
 return {v:1,items:[{id,ver,at},...rest].slice(0,MISSED_MAX)}
}
export const clearMissed=(m:Missed,id:string):Missed=>m.items.some(x=>x.id===id)?{v:1,items:m.items.filter(x=>x.id!==id)}:m
export const idsOf=(m:Missed)=>m.items.map(x=>x.id)
/** apply one settled answer: a miss queues it, a later right answer retires it */
export const settleMissed=(m:Missed,id:string,ver:string,correct:boolean,at:number)=>correct?clearMissed(m,id):addMissed(m,id,ver,at)

export function parseMissed(raw:unknown):Missed{
 if(!raw||typeof raw!=='object')return emptyMissed()
 const items=(raw as {items?:unknown}).items
 if(!Array.isArray(items))return emptyMissed()
 const out:MissedItem[]=[]
 for(const x of items){
  if(!x||typeof x!=='object')continue
  const {id,ver,at}=x as Record<string,unknown>
  if(typeof id==='string'&&id.length<=40&&typeof ver==='string'&&ver.length<=100&&typeof at==='number'&&Number.isFinite(at)&&!out.some(o=>o.id===id))out.push({id,ver,at})
 }
 return {v:1,items:out.slice(0,MISSED_MAX)}
}
export function readMissed(club:string):Missed{
 try{const raw=localStorage.getItem(missedKey(club));return raw?parseMissed(JSON.parse(raw)):emptyMissed()}catch{return emptyMissed()}
}
export function writeMissed(club:string,m:Missed):boolean{
 try{localStorage.setItem(missedKey(club),JSON.stringify(m));return true}catch{return false}
}
