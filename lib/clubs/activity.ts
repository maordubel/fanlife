/** Evaluation-only device state. Server-resolved club IDs scope every storage key. */
export type Activity={trivia:{completed:number;best:number};memory:{completed:number;best:number};polls:{completed:number;best:number};'blind-cow':{completed:number;best:number};xi:boolean;recent:string[]}
const blank=():Activity=>({trivia:{completed:0,best:0},memory:{completed:0,best:0},polls:{completed:0,best:0},'blind-cow':{completed:0,best:0},xi:false,recent:[]})
export const activityKey=(club:string)=>`fan-life:club:${club}:activity:v1`
export const xiKey=(club:string)=>`fan-life:club:${club}:xi:v1`
export function readActivity(club:string):Activity {
 try{const raw=localStorage.getItem(activityKey(club));if(!raw||raw.length>30000)return blank();const p=JSON.parse(raw) as Activity
  if(!p||!Array.isArray(p.recent)||p.recent.length>100||p.recent.some(s=>typeof s!=='string'||s.length>150)||typeof p.xi!=='boolean'||[p.trivia?.completed,p.trivia?.best,p.memory?.completed,p.memory?.best].some(n=>!Number.isSafeInteger(n)||n<0))return blank()
  const counters={...p};for(const gate of ['polls','blind-cow'] as const){const row=p[gate];counters[gate]=row&&[row.completed,row.best].every(n=>Number.isSafeInteger(n)&&n>=0)?row:{completed:0,best:0}}return counters
 }catch{return blank()}
}
export function recordActivity(club:string,gate:'trivia'|'memory'|'polls'|'blind-cow'|'xi',run:string,score=0):boolean {
 try{const p=readActivity(club);if(gate==='xi')p.xi=true;else if(!p.recent.includes(run)){p[gate].completed++;p[gate].best=Math.max(p[gate].best,Math.max(0,Math.floor(score)));p.recent=[run,...p.recent].slice(0,100)}localStorage.setItem(activityKey(club),JSON.stringify(p));return true}catch{return false}
}

export const pollKey=(club:string)=>`fan-life:club:${club}:polls:v1`
