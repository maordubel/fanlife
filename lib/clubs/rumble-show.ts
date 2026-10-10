import {buildPlay} from './rumble-play'
import {SLOTS,BUDGET,type Pos,type Rated,type RumbleCard,type RumbleResult} from './rumble'
/**
 * Gate 9 as a SHOW — the presentation layer of the club Royal Rumble, ported from The Worker's
 * `lib/game/royal-rumble-presentation.ts` (delta 99) for every club.
 *
 * The server owns the match: `play()` decides the score from hidden ratings, and `stageMatch()`
 * — which also runs on the server — dresses that score with WHO scored and WHEN. The browser only
 * ever receives public cards (no rating) and the finished script; nothing here is re-decided.
 *
 * Pure and deterministic in the seed. Text is never built here: events carry a variant index and
 * the client renders it through the club game copy (English UI, no Worker strings).
 */
export type Side='us'|'them'
export type ShowPlayer=RumbleCard&{side:Side;x:number;y:number;/** where he stands (LB, DM, ST …) in an eleven; absent in the classic five */slot?:string}
export type ShowEvent={id:string;type:'goal'|'save'|'chance'|'miss'|'block';minute:number;side:Side;player:string;assist?:string;keeper?:string;other?:string;scoreAfter:{us:number;them:number};variant:number}
export type ShowScript={us:ShowPlayer[];them:ShowPlayer[];events:ShowEvent[];/** the football itself — build-ups, tackles, corners, cards — from `rumble-play` */play?:import('./rumble-play').PlayLog;format?:'five'|'eleven';formation?:string;final:{us:number;them:number;winner:Side|'draw'};motm:{id:string;side:Side;goals:number;assists:number;saves:number};bills:{us:number;them:number}}

export {rng,hash} from './rumble-rng'
import {rng,hash} from './rumble-rng'

/** The one reshuffle a player gets before the first pick: a second deal, its own seed, still fair and replayable. */
export const shuffleSeed=(seed:number)=>(hash(`rumble-shuffle:${seed}`)%2147483647)+1

/** the cheapest five a board allows */
export const cheapestFive=(board:RumbleCard[][])=>board.reduce((s,cards)=>s+(cards.length?Math.min(...cards.map(c=>c.price)):Infinity),0)
/**
 * A board nobody can afford is not a round. Walk the shuffle chain from `seed` to the first deal whose
 * cheapest five fits the budget (bounded; the club's own data decides how often that is needed).
 */
export function affordableSeed(deal:(seed:number)=>RumbleCard[][],seed:number,budget=BUDGET,tries=24):number{
 let s=seed
 for(let i=0;i<tries;i++){if(cheapestFive(deal(s))<=budget)return s;s=shuffleSeed(s)}
 return seed
}

/**
 * Can this card still be afforded? After paying for it, every empty slot left must still be
 * fillable with the cheapest card it was dealt. A faded card is one that would strand the five.
 */
export function canAfford(draft:RumbleCard[][],picks:(string|null)[],slot:number,card:RumbleCard,budget=BUDGET):boolean{
 let spent=0
 for(let i=0;i<draft.length;i++){if(i===slot)continue;const id=picks[i];const c=id?draft[i]!.find(x=>x.id===id):undefined;if(c)spent+=c.price}
 let floor=0
 for(let i=0;i<draft.length;i++){if(i===slot||picks[i])continue;floor+=Math.min(...draft[i]!.map(c=>c.price))}
 return spent+card.price+floor<=budget
}

/**
 * The reel strip for one slot: names that roll past in the window before the reel lands on its
 * card. Built from the cards dealt across the WHOLE board (the machine looks full) in an order
 * fixed by the seed, and it always ends on `card` — the strip cannot lie about where it stops.
 */
export function reelStrip(board:RumbleCard[][],slot:number,reel:number,seed:number,length=9):string[]{
 const pool=board.flat().map(c=>c.name)
 const card=board[slot]?.[reel]
 if(!card)return []
 if(pool.length<2)return [card.name]
 const r=rng(seed^hash(`${slot}:${reel}`)),out:string[]=[]
 let last=card.name
 while(out.length<length-1){const n=pool[Math.floor(r()*pool.length)]!;if(n===last&&pool.some(x=>x!==last))continue;out.push(n);last=n}
 if(out[out.length-1]===card.name&&pool.some(x=>x!==card.name))out[out.length-1]=pool.find(x=>x!==card.name)!
 return [...out,card.name]
}
/** reels stop one after another, left to right: when each one lands, in ms (all zero under reduced motion) */
export const reelStops=(reels:number,reduced:boolean,first=620,gap=300)=>Array.from({length:reels},(_,i)=>reduced?0:first+i*gap)

/** the fixed shape on a vertical pitch, attacking UP: GK · DF · MF · MF · FW */
export const PITCH_SLOTS:readonly {position:Pos;x:number;y:number}[]=[{position:'GK',x:50,y:84},{position:'DF',x:50,y:65},{position:'MF',x:34,y:43},{position:'MF',x:66,y:43},{position:'FW',x:50,y:20}]
export function lineUp(cards:RumbleCard[],side:Side):ShowPlayer[]{
 const pool=[...cards],out:ShowPlayer[]=[]
 for(const s of PITCH_SLOTS){const at=pool.findIndex(c=>c.position===s.position);const c=at>=0?pool.splice(at,1)[0]!:pool.shift();if(c)out.push({id:c.id,name:c.name,position:s.position,price:c.price,fromYear:c.fromYear,toYear:c.toYear,side,x:s.x,y:s.y})}
 return out
}
/** where a man stands on screen: ours attack up from the bottom half, theirs down from the top */
export function screenPos(p:Pick<ShowPlayer,'x'|'y'|'side'>):{x:number;y:number}{const x=50+(p.x-50)*1.5,depth=45+p.y*0.56;return p.side==='us'?{x,y:depth}:{x:100-x,y:100-depth}}
/** eleven a side: the same idea, spread so twenty-two fit a half-pitch each — a little narrower, a deeper half */
export function screenPosXI(p:Pick<ShowPlayer,'x'|'y'|'side'>):{x:number;y:number}{const x=50+(p.x-50)*0.92,depth=54+(p.y-20)*0.62;return p.side==='us'?{x,y:depth}:{x:100-x,y:100-depth}}
export const screenPosFor=(p:Pick<ShowPlayer,'x'|'y'|'side'>,eleven:boolean)=>eleven?screenPosXI(p):screenPos(p)
export const goalPos=(side:Side)=>side==='us'?{x:50,y:1.5}:{x:50,y:98.5}

const SCORE_WEIGHT:Record<Pos,number>={FW:5,MF:3,DF:1.2,GK:0}
const strip=(r:Rated):RumbleCard=>({id:r.id,name:r.name,position:r.position,price:r.price,fromYear:r.fromYear,toYear:r.toYear})
export const VARIANTS=3

/**
 * Server side: the scoreline `play()` decided, told as a match. Scorers are drawn by position and
 * (hidden) rating from the side that scored; nobody but an outfield player ever scores; minutes are
 * strictly increasing and never on top of each other; goal events equal the score exactly.
 */
export type StageCfg={us:ShowPlayer[];them:ShowPlayer[];/** how many events (goals included) the match shows */total:(goals:number)=>number;gap:number;format:'five'|'eleven';formation?:string}
export function stageMatch(result:RumbleResult,seed:number):ShowScript{
 const usCards=result.you.cards,themCards=result.rival.cards
 return stageWith(result,seed,{us:lineUp(usCards.map(strip),'us'),them:lineUp(themCards.map(strip),'them'),total:g=>Math.max(5,Math.min(9,g+3)),gap:5,format:'five'})
}
/** The scoreline `result` decided, told as a match, for any shape: scorers weighted by line and hidden rating, minutes strictly increasing, goal events equal the score. */
export function stageWith(result:RumbleResult,seed:number,cfg:StageCfg):ShowScript{
 const usCards=result.you.cards,themCards=result.rival.cards,{us,them}=cfg
 const r=rng((seed^hash([...usCards,...themCards].map(c=>c.id).join('|')+result.goals.join(':')))>>>0)
 const rating=(side:Side,id:string)=>(side==='us'?usCards:themCards).find(c=>c.id===id)?.rating??50
 const pickWeighted=(side:Side,exclude?:string)=>{const pool=(side==='us'?us:them).filter(p=>p.position!=='GK'&&p.id!==exclude);const w=pool.map(p=>SCORE_WEIGHT[p.position]*(0.5+rating(side,p.id)/100));const total=w.reduce((s,x)=>s+x,0);let t=r()*total;for(let i=0;i<pool.length;i++){t-=w[i]!;if(t<=0)return pool[i]!}return pool[pool.length-1]!}
 type Draft={minute:number;side:Side;type:ShowEvent['type']}
 const goals:Draft[]=[...Array.from({length:result.goals[0]},()=>'us' as const),...Array.from({length:result.goals[1]},()=>'them' as const)].map(side=>({side,type:'goal' as const,minute:0}))
 // shuffle the order the goals came in, then lay minutes on them
 for(let i=goals.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[goals[i],goals[j]]=[goals[j]!,goals[i]!]}
 const taken:number[]=[]
 const freeMinute=(gap:number)=>{for(let guard=0;guard<200;guard++){const m=3+Math.floor(r()*85);if(taken.every(t=>Math.abs(t-m)>=gap)){taken.push(m);return m}}const m=Math.min(89,Math.max(...taken,0)+1);taken.push(m);return m}
 const goalMinutes=goals.map(()=>freeMinute(3)).sort((a,b)=>a-b)
 goals.forEach((g,i)=>{g.minute=goalMinutes[i]!})
 const kinds:ShowEvent['type'][]=['save','chance','miss','block','save']
 const total=cfg.total(goals.length),drafts:Draft[]=[...goals]
 while(drafts.length<total)drafts.push({minute:freeMinute(cfg.gap),side:r()<0.5?'us':'them',type:kinds[Math.floor(r()*kinds.length)]!})
 drafts.sort((a,b)=>a.minute-b.minute)
 const score={us:0,them:0},goalsBy=new Map<string,number>(),assistsBy=new Map<string,number>(),saves=new Map<string,number>()
 const bump=(m:Map<string,number>,k:string)=>m.set(k,(m.get(k)||0)+1)
 const events:ShowEvent[]=drafts.map((d,i)=>{
  const defenders=d.side==='us'?them:us,keeper=defenders.find(p=>p.position==='GK')??defenders[0]!,variant=Math.floor(r()*VARIANTS)
  if(d.type==='goal'){
   const scorer=pickWeighted(d.side),assist=r()<0.6?pickWeighted(d.side,scorer.id):undefined
   score[d.side]+=1;bump(goalsBy,d.side+scorer.id);if(assist)bump(assistsBy,d.side+assist.id)
   return {id:`g${i}`,type:'goal',minute:d.minute,side:d.side,player:scorer.id,...(assist?{assist:assist.id}:{}),keeper:keeper.id,scoreAfter:{...score},variant}
  }
  const shooter=pickWeighted(d.side),blocker=defenders.find(p=>p.position==='DF')??keeper
  if(d.type==='save')bump(saves,keeper.side+keeper.id)
  return {id:`e${i}`,type:d.type,minute:d.minute,side:d.side,player:shooter.id,keeper:keeper.id,other:blocker.id,scoreAfter:{...score},variant}
 })
 const final={us:result.goals[0],them:result.goals[1],winner:(result.verdict==='win'?'us':result.verdict==='loss'?'them':'draw') as Side|'draw'}
 const merit=(p:ShowPlayer)=>(goalsBy.get(p.side+p.id)||0)*3+(assistsBy.get(p.side+p.id)||0)*1.5+(saves.get(p.side+p.id)||0)*1.2
 const pool=[...us,...them].filter(p=>final.winner==='draw'||p.side===final.winner)
 const mvp=[...pool].sort((a,b)=>merit(b)-merit(a)||hash(a.id+seed)-hash(b.id+seed))[0]!
 const script:ShowScript={us,them,events,format:cfg.format,...(cfg.formation?{formation:cfg.formation}:{}),final,motm:{id:mvp.id,side:mvp.side,goals:goalsBy.get(mvp.side+mvp.id)||0,assists:assistsBy.get(mvp.side+mvp.id)||0,saves:saves.get(mvp.side+mvp.id)||0},bills:{us:result.you.cost,them:themCards.reduce((s,c)=>s+c.price,0)}}
 return {...script,play:buildPlay(script,usCards,themCards,seed)}
}
export const SLOT_COUNT=SLOTS.length
