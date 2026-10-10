import type {Pos,Rated,RumbleResult} from '../rumble'
import {rng} from '../rumble-show'
import {XI_BUDGET,type FormationId} from './types'
import {slotsOf} from './formations'
import {cost} from './pool'
import {dealDraftXI,dealRivalXI} from './deal'

/**
 * Eleven against eleven. Not a sum of ratings: each side has an ATTACK, a MIDFIELD and a DEFENCE built from the men standing in
 * those lines, and a side's chances come from its attack against the other's midfield and defence. The score is a deterministic
 * draw from the seed; the stronger eleven is favoured, never certain. Hidden ratings never leave the server.
 */
export type Lines={attack:number;midfield:number;defence:number}
const mean=(xs:number[])=>xs.length?xs.reduce((t,x)=>t+x,0)/xs.length:60

export function linesOf(cards:readonly Rated[],f:FormationId):Lines{
 const slots=slotsOf(f),by=(fam:Pos)=>cards.filter((_,i)=>slots[i]?.family===fam).map(c=>c.rating)
 const gk=by('GK'),df=by('DF'),mf=by('MF'),fw=by('FW')
 // wide defenders (fine LB/RB/WB) add to the attack a little; a holding midfielder (DM) to the defence a little
 const wide=cards.filter((_,i)=>['LB','RB','LWB','RWB'].includes(slots[i]?.fine??'')).map(c=>c.rating),dm=cards.filter((_,i)=>slots[i]?.fine==='DM').map(c=>c.rating)
 return {
  attack:0.58*mean(fw)+0.32*mean(mf)+0.1*mean(wide.length?wide:df),
  midfield:0.7*mean(mf)+0.15*mean(fw)+0.15*mean(df),
  defence:0.3*mean(gk)+0.5*mean(df)+0.12*mean(mf)+0.08*mean(dm.length?dm:mf),
 }
}
const BASE=1.3,SCALE=16
export const lambdas=(a:Lines,b:Lines)=>{
 const tilt=(a.midfield-b.midfield)/60
 return {
  a:BASE*Math.exp(((a.attack-0.6*b.defence-0.4*b.midfield)+30*tilt)/SCALE),
  b:BASE*Math.exp(((b.attack-0.6*a.defence-0.4*a.midfield)-30*tilt)/SCALE),
 }
}
const poisson=(l:number,r:()=>number)=>{const L=Math.exp(-l);let k=0,p=1;do{k++;p*=r()}while(p>L&&k<12);return k-1}

export function settleXI(you:readonly Rated[],rival:readonly Rated[],f:FormationId,seed:number,rivalClub?:string):RumbleResult{
 const r=rng((seed^0x51ed270b)>>>0),A=linesOf(you,f),B=linesOf(rival,f),l=lambdas(A,B)
 const goals:[number,number]=[Math.min(7,poisson(l.a,r)),Math.min(7,poisson(l.b,r))]
 const power=(c:readonly Rated[])=>c.reduce((t,x)=>t+x.rating,0)
 return {you:{cards:[...you],power:power(you),cost:cost(you)},rival:{cards:[...rival],power:power(rival),...(rivalClub?{club:rivalClub}:{})},verdict:goals[0]>goals[1]?'win':goals[0]<goals[1]?'loss':'draw',goals}
}

/** Everything the server checks before a ball is kicked: the board the seed deals, one man per slot, one man once, €35M. */
export function playXI(home:readonly Rated[],away:readonly Rated[],f:FormationId,seed:number,same:boolean,picks:readonly string[],rivalClub?:string):RumbleResult|null{
 const slots=slotsOf(f)
 if(picks.length!==slots.length||new Set(picks).size!==picks.length)return null
 const rival=dealRivalXI(away,f,seed);if(!rival)return null
 const draft=dealDraftXI(home,f,seed,rival,same);if(!draft)return null
 const chosen:Rated[]=[]
 for(let i=0;i<slots.length;i++){const offered=draft[i]!.find(c=>c.id===picks[i]);const full=offered&&home.find(x=>x.id===offered.id);if(!full)return null;chosen.push(full)}
 if(cost(chosen)>XI_BUDGET)return null
 return settleXI(chosen,rival,f,seed,rivalClub)
}
