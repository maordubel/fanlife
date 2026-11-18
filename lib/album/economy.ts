/**
 * THE ALBUM — the economy as the database plays it (supabase/migrations/20261118120000_worker_album.sql), mirrored here so
 * it can be measured before anyone collects (pure, seeded). One envelope a day of two DIFFERENT stickers; every fifth envelope
 * without a new sticker forces one (pity); five days in a week earn a pick; five spare copies buy a missing sticker.
 */
export type EconomyRules={size:number;perEnvelope:number;starter:number;pityAfter:number;pickDays:number;tradeFor:number;daysPerWeek:number}
export const RULES:EconomyRules={size:36,perEnvelope:2,starter:3,pityAfter:4,pickDays:5,tradeFor:5,daysPerWeek:7}
const rng=(seed:number)=>()=>{seed=(seed+0x6d2b79f5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296}

/** days until the wing is complete for a fan who opens every envelope and spends picks and spares as soon as he can */
export function daysToComplete(seed:number,r:EconomyRules=RULES,maxDays=400):number{
 const rand=rng(seed),copies=new Array<number>(r.size).fill(0),have=()=>copies.filter(c=>c>0).length
 const missing=()=>copies.map((c,i)=>c?-1:i).filter(i=>i>=0)
 const envelope=(force:boolean)=>{const picked=new Set<number>();let fresh=false
  if(force){const m=missing();if(m.length)picked.add(m[Math.floor(rand()*m.length)]!)}
  while(picked.size<Math.min(r.perEnvelope,r.size))picked.add(Math.floor(rand()*r.size))
  for(const i of picked){if(!copies[i])fresh=true;copies[i]!++}
  return fresh}
 for(let i=0;i<r.starter;i++)envelope(true)
 let pity=0,picks=0,weekDays=0
 for(let day=1;day<=maxDays;day++){
  const playing=(day-1)%7<r.daysPerWeek
  if(playing){const fresh=envelope(pity>=r.pityAfter&&have()<r.size);pity=fresh?0:Math.min(pity+1,10);weekDays++}
  if(day%7===0){if(weekDays>=r.pickDays)picks++;weekDays=0}
  while(picks>0&&have()<r.size){const m=missing();copies[m[0]!]=1;picks--}
  let spare=copies.reduce((n,c)=>n+Math.max(0,c-1),0)
  while(spare>=r.tradeFor&&have()<r.size){let need=r.tradeFor;for(let i=0;i<r.size&&need;i++)while(copies[i]!>1&&need){copies[i]!--;need--}copies[missing()[0]!]=1;spare-=r.tradeFor}
  if(have()===r.size)return day
 }
 return maxDays
}
export function median(xs:number[]){const s=[...xs].sort((a,b)=>a-b);return s[Math.floor(s.length/2)]!}
