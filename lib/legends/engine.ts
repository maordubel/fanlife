import {hash,rng} from '@/lib/clubs/rumble-rng'
import {slotsOf} from '@/lib/clubs/rumble-xi/formations'
import {clamp,LEGENDS_RULES as R,type QuotaPos} from './config'
import {qualityOf} from './ratings'
import type {Decision,MatchEventRow,MatchOutcome,MatchSnapshot,SideSnapshot,Tactics} from './types'

/**
 * The match engine (rulebook §1.4, §2.5): ONE code path for the quick result and the interactive highlights.
 *  · strength = 80% quality · 15% tactics · 5% conditions — weights of a strength index, never a chance to win
 *  · morale moves strength by up to ±10%; fatigue is cosmetic (0.99–1.01)
 *  · every minute draws from its OWN stream (`seed:minute`), a fixed number of draws whatever happens — so a decision changes
 *    only what comes after it, and the quick sim and an interactive match with no interventions write the same log (M03)
 *  · a live match stops three times: half-time, 65′ and 70′ (engine 3; engine 2 stopped on 45′, 60′, 75′; a match begun on
 *    engine 1 keeps its old stops — at a goal, a red or an injury, or else at half-time and on 75′)
 *  · set pieces (engine 3): corners, dangerous free kicks after a foul, penalties — from a SECOND per-minute stream
 *    (`seed:sp:minute`, eight draws a side whatever happens), so the open-play draws of every minute are those of engine 2
 *  · the dressing room (engine 3): the squad's mood × 2.5% at most, a man's own mood × 2% at most (config `talk`)
 *  · the captain plays 3% above himself (engine 2) — never named on a screen
 *  · three substitutions, an automatic one for an injury included; a man sent off is not replaced
 *  · injuries: one draw per team per match at 5%; minor 70% (1–2 rounds) · moderate 25% (3–5) · severe 5% (6–10)
 * The goal and card rates are calibration constants (§2.5), measured in the Legends Lab, not derived from 80/15/5.
 */
export const RATES={chance:0.104,convert:0.14,yellow:1.7/90,red:0.03/90,rebooked:0.3,etFactor:0.8,penalty:0.76,spread:22,cap:0.9} as const
/** engine 3: open play gives way to set pieces, so its chance rate is lower; the set-piece rates are per side per minute */
export const RATES3={chance:0.079,corner:0.0555,cornerGoal:0.032,freeKick:0.0135,freeKickGoal:0.075,penalty:0.00135,penaltyGoal:0.77} as const
type Man={id:string;name:string;pos:QuotaPos;stars:number;attrs:Record<string,number>;mood?:number}
type Pitch={slot:QuotaPos;man:Man;fresh:boolean}
type SideState={cap:number;talk:number;manTalk:number;snap:SideSnapshot;pitch:(Pitch|null)[];bench:Man[];used:Set<string>;off:Set<string>;subs:number;tactics:Tactics;yellow:Set<string>;played:Set<string>}
export type PauseState={stop:number;minute:number;goals:[number,number];events:MatchEventRow[];pitch:[{slot:QuotaPos;id:string;name:string}[],{slot:QuotaPos;id:string;name:string}[]];bench:[{id:string;name:string;pos:QuotaPos}[],{id:string;name:string;pos:QuotaPos}[]];subsLeft:[number,number];tactics:[Tactics,Tactics]}
export type RunResult={done:true;outcome:MatchOutcome}|{done:false;pause:PauseState}

const fitOf=(man:Man,slot:QuotaPos)=>man.pos===slot?1:slot==='GK'||man.pos==='GK'?0.55:0.88
const attr=(m:Man,k:string)=>m.attrs[k]??m.stars
function strength(s:SideState,minute:number,home:boolean|null,opp:SideState):{S:number;A:number;D:number}{
 let q=0,nat=0,a=0,an=0,d=0,dn=0
 for(const p of s.pitch){if(!p)continue
  const fat=p.fresh?1.01:1.01-0.02*Math.min(1,minute/90),k=(p.man.id===s.snap.captain?s.cap:1)*(s.manTalk?1+s.manTalk*clamp(p.man.mood??0,R.talk.min,R.talk.max):1)
  q+=qualityOf(p.man.stars)*fitOf(p.man,p.slot)*fat*k;if(fitOf(p.man,p.slot)===1)nat++
  if(p.slot==='FW'||p.slot==='MF'){const w=p.slot==='FW'?2:1;a+=w*k*qualityOf((attr(p.man,'finishing')+attr(p.man,'shooting')+attr(p.man,'passing'))/3);an+=w}
  if(p.slot==='DF'||p.slot==='GK'){const v=p.slot==='GK'?(attr(p.man,'reflexes')+attr(p.man,'handling'))/2:(attr(p.man,'tackling')+attr(p.man,'marking'))/2;d+=k*qualityOf(v);dn++}
 }
 const Q=q/11,mine=s.tactics,theirs=opp.tactics
 let T=50+30*clamp((nat/11-0.8)/0.2,-1,1)
 if(mine.approach==='defensive'&&theirs.approach==='attacking')T+=8
 if(mine.approach==='attacking'&&theirs.approach==='balanced')T+=3
 if(mine.pressing==='high')T+=4;if(mine.pressing==='low'&&theirs.tempo==='fast')T+=3
 const C=home===null?55:home?65:45
 const base=R.matchWeights.quality*Q+R.matchWeights.tactics*clamp(T,0,100)+R.matchWeights.conditions*C
 return {S:base*clamp(s.snap.morale,R.moraleMin,R.moraleMax)*s.talk,A:an?a/an:45,D:dn?d/dn:45}
}
const APPROACH={defensive:{own:0.85,opp:0.85},balanced:{own:1,opp:1},attacking:{own:1.15,opp:1.08}} as const
const TEMPO={slow:0.88,normal:1,fast:1.12} as const
const PRESS={low:0.8,medium:1,high:1.3} as const
function pick<T>(xs:readonly T[],w:(x:T)=>number,r:number):T|null{const ws=xs.map(w),t=ws.reduce((a,b)=>a+b,0);if(t<=0)return null;let x=r*t;for(let i=0;i<xs.length;i++){x-=ws[i]!;if(x<0)return xs[i]!}return xs[xs.length-1]??null}

function sideState(snap:SideSnapshot,cap:number,v3:boolean):SideState{
 const slots=slotsOf(snap.formation),talk=v3?1+R.talk.teamEffect*clamp(snap.mood??0,R.talk.min,R.talk.max):1
 return {cap,talk,manTalk:v3?R.talk.manEffect:0,snap,pitch:snap.xi.map((m,i)=>({slot:slots[i]!.family,man:m,fresh:false})),bench:[...snap.bench],used:new Set(),off:new Set(),subs:0,tactics:{...snap.tactics},yellow:new Set(),played:new Set(snap.xi.map(m=>m.id))}
}
/** the decision a manager may make at a stop, checked against the pitch as it stands */
export function checkDecision(p:PauseState,side:0|1,d:Decision):string|null{
 const subs=d.subs??[],on=new Set(p.pitch[side].map(x=>x.id)),bench=new Set(p.bench[side].map(x=>x.id))
 if(subs.length>p.subsLeft[side])return `${p.subsLeft[side]} substitution${p.subsLeft[side]===1?'':'s'} left.`
 const outs=new Set<string>(),ins=new Set<string>()
 for(const s of subs){
  if(!on.has(s.out))return 'Only a man on the pitch can come off.'
  if(!bench.has(s.in))return 'Only a man on the bench can come on.'
  if(outs.has(s.out)||ins.has(s.in))return 'One change per man.'
  outs.add(s.out);ins.add(s.in)
 }
 return null
}

/** engine 4's stops, in order: half-time, the minutes the manager asked for, and the silent hand-over at 89′ */
export const stopsV4=(snap:Pick<MatchSnapshot,'stops'>):number[]=>[...new Set([...R.touchlineStopsV4,...(snap.stops??[])])].sort((a,b)=>a-b)
export const maxStopsOf=(snap:Pick<MatchSnapshot,'engine'>)=>snap.engine==='legends-engine-4'?R.maxInterventionWindowsV4:R.maxInterventionWindows

export function run(snap:MatchSnapshot,decisions:readonly Decision[],interactive:boolean,mySide:0|1=0):RunResult{
 const v2=snap.engine!=='legends-engine-1',v4=snap.engine==='legends-engine-4',v3=snap.engine==='legends-engine-3'||v4,cap=v2?R.captainBoost:1,stopList:readonly number[]=v4?stopsV4(snap):v3?R.touchlineStopsV3:R.touchlineStops,maxStops=v4?R.maxInterventionWindowsV4:R.maxInterventionWindows
 const S:[SideState,SideState]=[sideState(snap.sides[0],cap,v3),sideState(snap.sides[1],cap,v3)],events:MatchEventRow[]=[],goals:[number,number]=[0,0]
 const push=(e:Omit<MatchEventRow,'seq'>)=>events.push({...e,seq:events.length})
 const yellows:[Record<string,number>,Record<string,number>]=[{},{}],reds:MatchOutcome['reds']=[{},{}],injuries:MatchOutcome['injuries']=[{},{}],scorers:MatchOutcome['scorers']=[{},{}]
 push({minute:0,kind:'kickoff',side:null})
 // one injury draw per team per match (§2.7), from its own stream
 const plan=[0,1].map(side=>{const r=rng(hash(`${snap.seed}:injury:${side}`)),hit=r()<R.injuryPerTeamMatch,minute=1+Math.floor(r()*89),who=r(),sev=r(),len=r()
  const kind:'minor'|'moderate'|'severe'=sev<R.injurySeverity.minor?'minor':sev<R.injurySeverity.minor+R.injurySeverity.moderate?'moderate':'severe'
  const [lo,hi]=R.injuryRounds[kind];return hit?{minute,who,kind,rounds:lo+Math.floor(len*(hi-lo+1))}:null})
 const stops:number[]=[];let stopIdx=0,lastStop=-99
 const apply=(side:0|1,d:Decision,minute:number)=>{
  const s=S[side]
  if(d.tactics&&JSON.stringify(d.tactics)!==JSON.stringify(s.tactics)){s.tactics={...d.tactics};push({minute,kind:'tactic',side,detail:`${d.tactics.approach}·${d.tactics.pressing}·${d.tactics.tempo}`})}
  for(const sub of d.subs??[]){
   if(s.subs>=R.maxSubs)break
   const i=s.pitch.findIndex(p=>p?.man.id===sub.out),b=s.bench.find(m=>m.id===sub.in)
   if(i<0||!b||s.used.has(b.id))continue
   push({minute,kind:'sub',side,player:b.id,other:sub.out});s.pitch[i]={slot:s.pitch[i]!.slot,man:b,fresh:true};s.used.add(b.id);s.bench=s.bench.filter(m=>m.id!==b.id);s.played.add(b.id);s.subs++
  }
 }
 const pauseState=(minute:number):PauseState=>({stop:stopIdx,minute,goals:[...goals] as [number,number],events:[...events],
  pitch:[0,1].map(i=>S[i]!.pitch.flatMap(p=>p?[{slot:p.slot,id:p.man.id,name:p.man.name}]:[])) as PauseState['pitch'],
  bench:[0,1].map(i=>S[i]!.bench.map(m=>({id:m.id,name:m.name,pos:m.pos}))) as PauseState['bench'],
  subsLeft:[R.maxSubs-S[0].subs,R.maxSubs-S[1].subs],tactics:[{...S[0].tactics},{...S[1].tactics}]})
 const end=(pens:[number,number]|null):RunResult=>({done:true,outcome:{goals,pens,events,stops,played:[[...S[0].played],[...S[1].played]],yellows,reds,injuries,scorers}})
 /**
  * engine 3 — one side's set pieces in one minute, eight draws whatever happens: a corner (headed home now and then, the taker
  * the assist), a dangerous free kick after a foul (the opponents' press makes more of them), a penalty (scored, or saved by the
  * keeper — `other` — or missed). Every event is an existing kind with `detail`, so a reel needs no new kind.
  */
 const setPiece=(side:0|1,me:SideState,them:SideState,a:{S:number;A:number},b:{S:number;D:number},tilt:number,y:number[],m:number,et:boolean):boolean=>{
  const men=me.pitch.filter((p):p is Pitch=>!!p),keeper=them.pitch.find(p=>p?.slot==='GK')?.man,et8=et?RATES.etFactor:1
  const att=Math.exp(clamp((a.A-b.D)/22,-0.8,0.8)),goal=(scorer:Man,assist:Man|null,detail:string)=>{goals[side]++;scorers[side][scorer.id]=(scorers[side][scorer.id]??0)+1;push({minute:m,kind:'goal',side,player:scorer.id,...(assist?{other:assist.id}:{}),detail})}
  const taker=(w:(p:Pitch)=>number,r:number)=>pick(men.filter(p=>p.slot!=='GK'),w,r)?.man??null
  let sig=false
  if(y[0]!<RATES3.corner*Math.exp(tilt*0.5)*APPROACH[me.tactics.approach].own*et8){
   const kick=taker(p=>({GK:0,DF:0.4,MF:3,FW:1})[p.slot]*attr(p.man,'passing'),y[6]!),head=pick(men.filter(p=>p.man.id!==kick?.id),p=>({GK:0,DF:3,MF:1,FW:3})[p.slot]*Math.pow(attr(p.man,'heading')/3,2),y[7]!)?.man
   if(head&&y[1]!<RATES3.cornerGoal*att){goal(head,kick,'corner');sig=true}else if(head)push({minute:m,kind:'chance',side,player:head.id,detail:'corner'})
  }
  if(y[2]!<RATES3.freeKick*PRESS[them.tactics.pressing]*Math.exp(tilt*0.5)*et8){
   const kick=taker(p=>({GK:0,DF:0.5,MF:3,FW:2})[p.slot]*Math.pow((attr(p.man,'shooting')+attr(p.man,'passing'))/6,2),y[6]!)
   if(kick&&y[3]!<RATES3.freeKickGoal*att){goal(kick,null,'free-kick');sig=true}else if(kick)push({minute:m,kind:'chance',side,player:kick.id,detail:'free-kick'})
  }
  if(y[4]!<RATES3.penalty*Math.exp(tilt)*PRESS[them.tactics.pressing]*et8){
   const kick=taker(p=>({GK:0,DF:0.3,MF:2,FW:4})[p.slot]*Math.pow(attr(p.man,'finishing')/3,3),y[7]!)
   if(kick&&y[5]!<RATES3.penaltyGoal+0.02*(3-(keeper?.stars??3))){goal(kick,null,'penalty');sig=true}
   else if(kick)push({minute:m,kind:'chance',side,player:kick.id,detail:'penalty',...(keeper&&y[5]!<0.92?{other:keeper.id}:{})})
  }
  return sig
 }
 const minuteOf=(m:number)=>{
  const r=rng(hash(`${snap.seed}:${m}`)),et=m>90,sp=v3?rng(hash(`${snap.seed}:sp:${m}`)):null
  let significant=false
  for(const side of [0,1] as const){
   const me=S[side],them=S[side?0:1],home=snap.knockout?null:snap.sides[side].home
   const x=[r(),r(),r(),r(),r(),r(),r(),r()]
   const a=strength(me,m,home,them),b=strength(them,m,snap.knockout?null:snap.sides[side?0:1].home,me)
   const tilt=clamp((a.S-b.S)/RATES.spread,-RATES.cap,RATES.cap)
   const pChance=(v3?RATES3.chance:RATES.chance)*Math.exp(tilt)*APPROACH[me.tactics.approach].own*APPROACH[them.tactics.approach].opp*TEMPO[me.tactics.tempo]*(et?RATES.etFactor:1)
   if(x[0]!<pChance){
    const conv=RATES.convert*Math.exp(clamp((a.A-b.D)/22,-0.8,0.8))
    const shooters=me.pitch.filter((p):p is Pitch=>!!p)
    const scorer=pick(shooters,p=>({GK:0,DF:1,MF:3,FW:6})[p.slot]*Math.pow(attr(p.man,'finishing')/3,2),x[2]!)
    if(scorer&&x[1]!<conv){
     const mates=shooters.filter(p=>p.man.id!==scorer.man.id),assist=x[3]!<0.7?pick(mates,p=>({GK:0.2,DF:2,MF:4,FW:3})[p.slot]*attr(p.man,'passing'),x[4]!):null
     goals[side]++;scorers[side][scorer.man.id]=(scorers[side][scorer.man.id]??0)+1
     push({minute:m,kind:'goal',side,player:scorer.man.id,other:assist?.man.id});significant=true
    }else if(scorer)push({minute:m,kind:'chance',side,player:scorer.man.id})
   }
   if(sp&&setPiece(side,me,them,a,b,tilt,[sp(),sp(),sp(),sp(),sp(),sp(),sp(),sp()],m,et))significant=true
   if(x[5]!<RATES.yellow*PRESS[me.tactics.pressing]){
    const men=me.pitch.filter((p):p is Pitch=>!!p),p=pick(men,q=>({GK:0.3,DF:1.5,MF:1.2,FW:0.8})[q.slot]*(me.yellow.has(q.man.id)?RATES.rebooked:1),x[6]!)
    if(p){const id=p.man.id;yellows[side][id]=(yellows[side][id]??0)+1
     if(me.yellow.has(id)){push({minute:m,kind:'red',side,player:id,detail:'second-yellow'});reds[side][id]={second:true,length:1};me.pitch[me.pitch.indexOf(p)]=null;me.off.add(id);significant=true}
     else{me.yellow.add(id);push({minute:m,kind:'yellow',side,player:id})}}
   }else if(x[7]!<RATES.red){
    const men=me.pitch.filter((p):p is Pitch=>!!p),p=pick(men,q=>({GK:0.2,DF:1.6,MF:1.1,FW:0.7})[q.slot],(x[6]!*7919)%1)
    if(p){const len=x[6]!<0.6?1:x[6]!<0.9?2:3;push({minute:m,kind:'red',side,player:p.man.id,n:len});reds[side][p.man.id]={second:false,length:len};me.pitch[me.pitch.indexOf(p)]=null;me.off.add(p.man.id);significant=true}
   }
   const inj=plan[side];if(inj&&inj.minute===m){
    const men=me.pitch.filter((p):p is Pitch=>!!p),p=pick(men,q=>q.slot==='GK'?0.4:1,inj.who)
    if(p&&!injuries[side][p.man.id]){injuries[side][p.man.id]={kind:inj.kind,rounds:inj.rounds};push({minute:m,kind:'injury',side,player:p.man.id,detail:inj.kind,n:inj.rounds});significant=true
     // the default policy (both modes): an injured man is replaced by the best man on the bench for his slot, if a change is left
     const i=me.pitch.indexOf(p),b=[...me.bench].sort((u,v)=>Number(v.pos===p.slot)-Number(u.pos===p.slot)||v.stars-u.stars)[0]
     if(b&&me.subs<R.maxSubs){push({minute:m,kind:'sub',side,player:b.id,other:p.man.id});me.pitch[i]={slot:p.slot,man:b,fresh:true};me.used.add(b.id);me.bench=me.bench.filter(z=>z.id!==b.id);me.played.add(b.id);me.subs++}
     else me.pitch[i]=null
    }
   }
  }
  return significant
 }
 const stopAt=(m:number,significant:boolean)=>{
  if(!interactive||stops.length>=maxStops||m>=90)return false
  if(v2)return stopList.includes(m)
  if(significant&&m-lastStop>=8)return true
  if(m===45&&!stops.some(s=>s>=35))return true
  if(m===75&&!stops.some(s=>s>=65))return true
  return false
 }
 for(let m=1;m<=90;m++){
  const sig=minuteOf(m)
  if(m===45)push({minute:45,kind:'half-time',side:null})
  if(stopAt(m,sig)){
   stops.push(m);lastStop=m
   const d=decisions[stopIdx];if(!d)return {done:false,pause:pauseState(m)}
   apply(mySide,d,m);stopIdx++
  }
 }
 push({minute:90,kind:'full-time',side:null})
 if(snap.knockout&&goals[0]===goals[1]){
  if(snap.decider!=='penalties'){push({minute:90,kind:'extra-time',side:null});for(let m=91;m<=120;m++)minuteOf(m)}
  if(goals[0]===goals[1]){
   const r=rng(hash(`${snap.seed}:penalties`)),p:[number,number]=[0,0],gk=[0,1].map(i=>S[i]!.pitch.find(x=>x?.slot==='GK')?.man.stars??2)
   for(let k=0;k<20;k++){for(const side of [0,1] as const)if(r()<RATES.penalty+0.02*(3-gk[side?0:1]!))p[side]++
    if(k>=4&&p[0]!==p[1])break}
   if(p[0]===p[1])p[r()<0.5?0:1]++
   push({minute:120,kind:'penalties',side:p[0]>p[1]?0:1,detail:`${p[0]}-${p[1]}`})
   return end(p)
  }
 }
 return end(null)
}
