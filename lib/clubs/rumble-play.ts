import type {Rated} from './rumble'
import type {ShowEvent,ShowPlayer,ShowScript,Side} from './rumble-show'
import {hash,rng} from './rumble-rng'

/**
 * The football itself. `stageMatch` decides WHO scored and WHEN; this layer tells what happened around it — the build-ups that end in
 * a shot, the tackles and interceptions that end the others, corners, offsides, fouls and cards — as passes between named players,
 * so the screen can draw the ball moving from man to man and a commentary can read like a match centre.
 *
 * Pure and deterministic in the seed, built on the server with the script; the browser only plays it. Goals, saves, misses and blocks
 * are the script's own events (each move that ends in one carries its `eventId`); nothing here can add a goal.
 */
export type StepKind='pass'|'long'|'through'|'dribble'|'cross'|'switch'|'back'
export type MoveStep={kind:StepKind;from:string;to:string}
export type EndType='goal'|'save'|'miss'|'block'|'post'|'tackle'|'intercept'|'clear'|'corner'|'offside'|'foul'|'card'
export type Move={id:string;minute:number;side:Side;steps:MoveStep[];end:EndType;/** the opposing man who ended it (tackle, intercept, clear, block, foul, card) */by?:string;keeper?:string;shooter?:string;assist?:string;header?:boolean;eventId?:string;variant:number;score:{us:number;them:number}}
export type PlayLog={moves:Move[];/** match ratings 4.5–10, keyed `side:id` */grades:Record<string,number>}
export type TeamStats={shots:number;onTarget:number;corners:number;fouls:number;booked:number;passes:number;tackles:number;xg:number}
export type StatsAt={us:TeamStats;them:TeamStats;possession:{us:number;them:number}}

export const VARIANTS=3
const depth=(p:Pick<ShowPlayer,'y'>)=>100-p.y
const other=(s:Side):Side=>s==='us'?'them':'us'
const EVENT_END:Record<ShowEvent['type'],EndType>={goal:'goal',save:'save',miss:'miss',block:'block',chance:'post'}
const XG:Partial<Record<EndType,number>>={goal:0.32,save:0.27,post:0.2,block:0.11,miss:0.07}

function kindOf(a:ShowPlayer,b:ShowPlayer,r:()=>number):StepKind{
 if(a.position==='GK')return r()<0.5?'long':'pass'
 const dd=depth(b)-depth(a),wide=a.x<22||a.x>78
 if(wide&&b.x>30&&b.x<70&&depth(b)>=58)return 'cross'
 if(Math.abs(a.x-b.x)>=46)return 'switch'
 if(dd>=24)return 'through'
 if(dd<-4)return 'back'
 return 'pass'
}

/** a run of passes from somewhere deep up to `end` (the man who shoots, or the last receiver), through the men standing between */
function chain(team:ShowPlayer[],endId:string,assistId:string|undefined,passes:number,r:()=>number,from?:string):MoveStep[]{
 const end=team.find(p=>p.id===endId)??team[team.length-1]!
 const startPool=team.filter(p=>p.id!==end.id&&(from?p.id===from:depth(p)<=depth(end)-8||p.position==='GK'))
 const pool=startPool.length?startPool:team.filter(p=>p.id!==end.id)
 const w=pool.map(p=>p.position==='GK'?0.35:p.position==='DF'?1.2:1)
 let t=r()*w.reduce((a,b)=>a+b,0),start=pool[pool.length-1]!
 for(let i=0;i<pool.length;i++){t-=w[i]!;if(t<=0){start=pool[i]!;break}}
 const seq=[start]
 for(let i=1;i<passes;i++){
  const target=depth(start)+(depth(end)-depth(start))*(i/passes),last=seq[seq.length-1]!
  const cands=team.filter(p=>p.id!==end.id&&!seq.slice(-2).some(q=>q.id===p.id))
  let best=cands[0]!,bs=Infinity
  for(const c of cands){const sc=Math.abs(depth(c)-target)+Math.abs(c.x-last.x)*0.35+r()*14;if(sc<bs){bs=sc;best=c}}
  seq.push(best)
 }
 const a=assistId?team.find(p=>p.id===assistId):undefined
 if(a&&a.id!==end.id){if(seq[seq.length-1]!.id===a.id){}else if(seq.length>1&&seq[seq.length-2]!.id!==a.id)seq[seq.length-1]=a;else seq.push(a)}
 if(seq[seq.length-1]!.id===end.id)seq.pop()
 seq.push(end)
 const steps:MoveStep[]=[]
 for(let i=1;i<seq.length;i++)steps.push({kind:kindOf(seq[i-1]!,seq[i]!,r),from:seq[i-1]!.id,to:seq[i]!.id})
 return steps
}
/** the opposing man who is in the way: the one whose own depth best mirrors where the ball has got to */
function inTheWay(them:ShowPlayer[],ball:ShowPlayer,r:()=>number,defenders:boolean):ShowPlayer{
 const want=100-depth(ball),pool=them.filter(p=>p.position!=='GK'&&(!defenders||p.position!=='FW'))
 const scored=pool.map(p=>({p,s:Math.abs(depth(p)-want)+Math.abs(p.x-(100-ball.x))*0.3+r()*10}))
 return scored.sort((a,b)=>a.s-b.s||a.p.id.localeCompare(b.p.id))[0]!.p
}

export function buildPlay(script:ShowScript,usCards:readonly Rated[],themCards:readonly Rated[],seed:number):PlayLog{
 const r=rng((seed^hash('rumble-play'))>>>0),eleven=script.format==='eleven'
 const team=(s:Side)=>s==='us'?script.us:script.them
 const moves:Move[]=[]
 const used:number[]=script.events.map(e=>e.minute)
 for(const e of script.events){
  const t=team(e.side),shooter=t.find(p=>p.id===e.player)!,passes=2+Math.floor(r()*(eleven?4:3))
  const steps=chain(t,e.player,e.assist,passes,r)
  if(r()<0.28&&shooter.position!=='GK')steps.push({kind:'dribble',from:shooter.id,to:shooter.id})
  const last=steps[steps.length-1]
  const header=last?.kind==='cross'&&r()<0.6
  const end=EVENT_END[e.type]
  moves.push({id:`m-${e.id}`,minute:e.minute,side:e.side,steps,end,shooter:e.player,...(e.assist?{assist:e.assist}:{}),...(header?{header}:{}),...(e.keeper?{keeper:e.keeper}:{}),...(end==='block'&&e.other?{by:e.other}:{}),eventId:e.id,variant:e.variant,score:{us:0,them:0}})
 }
 // the rest of the match: attacks that stop short
 const fillers=eleven?16:7,share=Math.min(0.62,Math.max(0.38,0.5+(usCards.reduce((s,c)=>s+c.rating,0)/Math.max(1,usCards.length)-themCards.reduce((s,c)=>s+c.rating,0)/Math.max(1,themCards.length))/160))
 const free=()=>{for(let g=0;g<200;g++){const m=1+Math.floor(r()*89);if(used.every(u=>Math.abs(u-m)>=2)){used.push(m);return m}}const m=Math.min(90,Math.max(...used)+1);used.push(m);return m}
 const KINDS:[EndType,number][]=[['tackle',.22],['intercept',.18],['clear',.15],['corner',.14],['offside',.1],['foul',.13],['card',.08]]
 for(let i=0;i<fillers;i++){
  const side:Side=r()<share?'us':'them',t=team(side),def=team(other(side))
  let x=r()*KINDS.reduce((s,k)=>s+k[1],0),end:EndType='clear'
  for(const [k,w] of KINDS){x-=w;if(x<=0){end=k;break}}
  const forward=t.filter(p=>p.position!=='GK'&&depth(p)>=52),receiver=forward[Math.floor(r()*forward.length)]??t[t.length-1]!
  const steps=chain(t,receiver.id,undefined,2+Math.floor(r()*(eleven?4:3)),r)
  const by=inTheWay(def,receiver,r,end!=='offside').id
  moves.push({id:`m-f${i}`,minute:free(),side,steps,end,...(end==='offside'?{}:{by}),shooter:receiver.id,variant:Math.floor(r()*VARIANTS),score:{us:0,them:0}})
 }
 moves.sort((a,b)=>a.minute-b.minute||a.id.localeCompare(b.id))
 const sc={us:0,them:0}
 for(const m of moves){if(m.end==='goal')sc[m.side]+=1;m.score={...sc}}
 return {moves,grades:grade(script,moves,usCards,themCards,seed)}
}

function grade(script:ShowScript,moves:Move[],usCards:readonly Rated[],themCards:readonly Rated[],seed:number):Record<string,number>{
 const r=rng((seed^hash('grades'))>>>0),g:Record<string,number>={}
 const bump=(k:string,d:number)=>{g[k]=(g[k]??0)+d}
 const rated=new Map<string,number>([...usCards.map(c=>['us:'+c.id,c.rating] as const),...themCards.map(c=>['them:'+c.id,c.rating] as const)])
 for(const p of [...script.us,...script.them]){const k=p.side+':'+p.id;g[k]=6+((rated.get(k)??76)-76)/22+(r()-0.5)*0.8}
 for(const m of moves){
  const own=(id?:string)=>id?m.side+':'+id:'',opp=(id?:string)=>id?other(m.side)+':'+id:''
  if(m.end==='goal'){bump(own(m.shooter),1.15);if(m.assist)bump(own(m.assist),0.7);if(m.keeper)bump(opp(m.keeper),-0.35)}
  if(m.end==='save'&&m.keeper)bump(opp(m.keeper),0.35)
  if(m.end==='block'&&m.by)bump(opp(m.by),0.3)
  if((m.end==='tackle'||m.end==='intercept'||m.end==='clear')&&m.by)bump(opp(m.by),0.22)
  if(m.end==='offside')bump(own(m.shooter),-0.1)
  if(m.end==='miss')bump(own(m.shooter),-0.12)
  if(m.end==='card'&&m.by)bump(opp(m.by),-0.5)
  if(m.end==='foul'&&m.by)bump(opp(m.by),-0.15)
 }
 const final=script.final
 for(const [s,conceded] of [['us',final.them],['them',final.us]] as const){const gk=(s==='us'?script.us:script.them).find(p=>p.position==='GK');if(gk)bump(s+':'+gk.id,conceded===0?0.6:-0.2*conceded)}
 for(const k of Object.keys(g))g[k]=Math.round(Math.min(10,Math.max(4.5,g[k]!))*10)/10
 return g
}

const zero=():TeamStats=>({shots:0,onTarget:0,corners:0,fouls:0,booked:0,passes:0,tackles:0,xg:0})
/** the match centre's numbers as they stand at `minute` (inclusive) — the same function draws the live panel and the half-time and full-time cards */
export function statsAt(log:PlayLog,minute:number):StatsAt{
 const s={us:zero(),them:zero()}
 for(const m of log.moves){
  if(m.minute>minute)break
  const mine=s[m.side],theirs=s[other(m.side)]
  mine.passes+=m.steps.filter(x=>x.kind!=='dribble').length
  if(m.end==='goal'||m.end==='save'||m.end==='miss'||m.end==='block'||m.end==='post'){mine.shots+=1;mine.xg+=XG[m.end]??0;if(m.end==='goal'||m.end==='save')mine.onTarget+=1}
  if(m.end==='corner')mine.corners+=1
  if(m.end==='foul'||m.end==='card'){theirs.fouls+=1;if(m.end==='card')theirs.booked+=1}
  if(m.end==='tackle'||m.end==='intercept')theirs.tackles+=1
 }
 const a=s.us.passes+s.us.shots*2+s.us.corners,b=s.them.passes+s.them.shots*2+s.them.corners,total=a+b
 const us=total?Math.round((a/total)*100):50
 for(const t of [s.us,s.them])t.xg=Math.round(t.xg*100)/100
 return {...s,possession:{us,them:100-us}}
}
