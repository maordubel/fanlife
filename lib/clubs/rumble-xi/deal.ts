import {fits,strip,type Pos,type Rated,type RumbleCard} from '../rumble'
import {floorOf,withFeatured} from '../rumble-economy'
import {hash,rng} from '../rumble-rng'
import {countFamily,slotsOf} from './formations'
import {PRICE_SCHEME,XI_BUDGET,XI_OFFERS,type FormationId} from './types'

const FAMILIES:Pos[]=['GK','DF','MF','FW']
const shuffled=<T,>(a:readonly T[],r:()=>number)=>{const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[x[i],x[j]]=[x[j]!,x[i]!]}return x}

/**
 * The deck of a family: a FIXED order of every man who can stand there (positioned men, and the "free" men of no recorded position, each
 * given to one outfield family by his id). A board reads the deck from where the round points, so consecutive rounds walk through the
 * whole archive without repeating a man until the deck has been round — every man gets his turn, and the same round is the same board.
 */
export function decksOf(pool:readonly Rated[],key:string):Record<Pos,Rated[]>{
 const by={GK:[],DF:[],MF:[],FW:[]} as Record<Pos,Rated[]>
 for(const x of [...pool].sort((a,b)=>a.id.localeCompare(b.id)))by[x.free?(['DF','MF','FW'] as const)[hash(x.id)%3]!:x.position].push(x)
 for(const p of FAMILIES)by[p]=shuffled(by[p],rng(hash(`deck|${key}|${p}|${PRICE_SCHEME}`)))
 return by
}

/**
 * The opponent is COMMITTED from his own pool, the seed and the rules alone — never from what the player picks. Per slot: the strongest of
 * three seeded men that still leaves the other slots fillable inside the budget. His prices are his club's; his budget is €35M, like yours.
 */
export function dealRivalXI(pool:readonly Rated[],f:FormationId,seed:number,budget:number=XI_BUDGET):Rated[]|null{
 const r=rng(seed>>>0),taken=new Set<string>(),out:Rated[]=[],slots=slotsOf(f)
 let money=budget
 for(let i=0;i<slots.length;i++){
  const pos=slots[i]!.family,left=pool.filter(x=>fits(x,pos)&&!taken.has(x.id)),options=shuffled(left,r).slice(0,3)
  if(!options.length)return null
  const floor=slots.slice(i+1).reduce((t,s,j,rest)=>{const free=pool.filter(x=>fits(x,s.family)&&!taken.has(x.id)).map(x=>x.price).sort((a,b)=>a-b);return t+(free[rest.slice(0,j).filter(q=>q.family===s.family).length]??1)},0)
  const ok=options.filter(o=>o.price+floor<=money).sort((a,b)=>b.rating-a.rating||a.price-b.price)
  const best=ok[0]??[...left].sort((a,b)=>a.price-b.price||b.rating-a.rating)[0]!
  taken.add(best.id);out.push(best);money-=best.price
 }
 return out
}

/** per slot, up to three men of its family read from the deck at the round's place, never repeating a man, never one the rival fields (own-club rival) */
export function dealDraftXI(pool:readonly Rated[],f:FormationId,roundSeed:number,rival:readonly Rated[],same:boolean,key:string,attempt=0):RumbleCard[][]|null{
 const decks=decksOf(pool,key),banned=same?new Set(rival.map(c=>c.id)):new Set<string>(),slots=slotsOf(f),taken=new Set<string>()
 const used:Record<Pos,number>={GK:0,DF:0,MF:0,FW:0}
 const board:RumbleCard[][]=slots.map(()=>[])
 for(const p of FAMILIES){
  const n=countFamily(f,p);if(!n)continue
  const avail=decks[p].filter(x=>!banned.has(x.id))
  const per=Math.min(XI_OFFERS,Math.floor(avail.length/n));if(per<1)return null
  const start=(((roundSeed>>>0)%1000003)*n*XI_OFFERS+attempt*n*XI_OFFERS)%avail.length
  const take:Rated[]=[]
  for(let k=0;take.length<per*n&&k<avail.length;k++){const x=avail[(start+k)%avail.length]!;if(!taken.has(x.id)){taken.add(x.id);take.push(x)}}
  if(take.length<per*n)return null
  slots.forEach((sl,i)=>{if(sl.family===p){const j=used[p]++;board[i]=take.slice(j*per,(j+1)*per).map(strip)}})
 }
 return board
}

/**
 * The round: the rival first (independent of the player), then a board read from the decks, then the rulebook's guarantee — one €5M man
 * the player can really buy, with a complete squad still possible inside €35M around him. If a try fails the next try reads further
 * along the deck; if none works the club is NOT READY (null) — prices and the budget are never touched.
 */
export function dealXI(homePool:readonly Rated[],awayPool:readonly Rated[],f:FormationId,roundSeed:number,same:boolean,key='club',tries=40):{seed:number;rival:Rated[];draft:RumbleCard[][];attempt:number}|null{
 const rival=dealRivalXI(awayPool,f,hash(`${key}|${roundSeed}|${f}|rival`));if(!rival)return null
 const banned=same?new Set(rival.map(c=>c.id)):new Set<string>(),icons=homePool.filter(x=>x.price===5&&!banned.has(x.id)).sort((a,b)=>a.id.localeCompare(b.id))
 for(let attempt=0;attempt<tries;attempt++){
  const draft=dealDraftXI(homePool,f,roundSeed,rival,same,key,attempt);if(!draft)return null
  const inBoard=new Set(draft.flat().map(c=>c.id)),r=rng(hash(`${key}|${roundSeed}|${attempt}|icon`))
  const k=icons.length?((roundSeed>>>0)+attempt)%icons.length:0,rotated=[...icons.slice(k),...icons.slice(0,k)].filter(x=>!inBoard.has(x.id))
  const cards=homePool.filter(x=>!inBoard.has(x.id)&&!banned.has(x.id))
  const pick=withFeatured(draft,[...rotated,...cards.filter(c=>c.price!==5)],(c,i)=>fits(c,slots(f)[i]!.family),r,XI_BUDGET,true)
  if(pick&&floorOf(pick)<=XI_BUDGET)return {seed:roundSeed,rival,draft:pick,attempt}
 }
 return null
}
const slots=(f:FormationId)=>slotsOf(f)
