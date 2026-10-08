/**
 * Gate 6 · the deck solver (ME-R01..R04, R11) — pure, client-safe, no archive.
 *
 * A Memory board is only a game when no two cards read the same and every pair can be understood from its two faces.
 * The shared engine (`lib/game/memory-engine.ts`) enforces that GREEDILY: it walks the shuffled pool and keeps a
 * pair if neither of its faces was seen. That hides a viable deck (a pair skipped early for a face that a better set
 * would not have used) and it overstates capacity (it counts pairs, not boards). Here the choice is a small bounded
 * search over whole boards, so the face rule, the type cap and the recognisability floor hold TOGETHER:
 *
 *  · ME-R02  no two faces of a dealt board read alike (`normFace`), across both sides of every pair;
 *  · ME-R03  a full six-pair board holds at least three recognisable relations and — where the pool allows — no more
 *            than three of one type; when the pool cannot, the board is LABELLED narrow (or "date memory" when every
 *            pair is a dated event) instead of being called varied;
 *  · ME-R04  bounded depth-first search (`SEARCH_BUDGET` nodes) with feasibility bounds, deterministic in the order
 *            the seed gives the pool;
 *  · ME-R11  a decade theme is the same search over only the facts of that decade — nothing is added to reach six.
 *
 * Consecutive boards of one seed are disjoint (a lap), exactly like the rotation everywhere else: board k is solved on
 * the pool minus the pairs boards 0..k-1 used, and when the lap is exhausted the seed is folded with the lap number.
 */
import type {MemoryCandidate} from '@/lib/game/memory-engine'
import {KIND_CAP,MEMORY_PAIR_TYPES,MEMORY_VALUE,RECOGNISABLE_MIN,pairStrength,themeOf,themedOrder,type MemoryPairType} from '@/lib/game/memory-quality'
import {rng,shuffle} from '@/lib/game/random'
import {cycleSeed} from '@/lib/rotation/deck'

/** the rules revision a recorded result belongs to — a new numeric score is a new revision, never an edit */
export const MEMORY_RULES='memory-rules-v2'
export const MEMORY_SCORE_VERSION=2
export type MemSize=2|4|6
/** largest first: the default is the biggest board the pool can honestly field */
export const MEM_SIZES:readonly MemSize[]=[6,4,2]
/** a face longer than this cannot be read on a phone card; the pair is kept out of the pool, not shortened */
export const MAX_FACE_CHARS=100
/** depth-first node budget per board; a search that hits it proves nothing and is reported as such */
export const SEARCH_BUDGET=40_000
/** a lap never walks further than this many boards when a cursor is far out */
const MAX_LAPS=64

export type Cand=MemoryCandidate&{theme:string;value:1|2|3}
export type PoolStats={candidates:number;valid:number;excluded:{relation:number;faceLong:number;duplicateId:number};types:Partial<Record<MemoryPairType,number>>;recognisable:number;dateOnly:boolean}
export type MemoryBlockerCode='MEMORY_AMBIGUOUS_FACE'|'MEMORY_POOL_SHORT'|'MEMORY_RECOGNISABLE_SHORT'|'MEMORY_THEME_SHORT'
export type MemoryBlocker={code:MemoryBlockerCode;size:MemSize;need:number;have:number;theme?:string;budget?:boolean}
export type BoardLabel='mixed'|'date'|'narrow'
export type Board={pairs:Cand[];narrow:boolean;label:BoardLabel}

/** the recognisable relations a board of this size must hold (ME-R03: three of six; half of four; none asked of two) */
export const minRecognisable=(size:MemSize)=>size>=6?RECOGNISABLE_MIN:size>=4?2:0
/** the most pairs of one relation type a balanced board holds */
export const typeCap=(_size:MemSize)=>KIND_CAP

/** a face as the eye reads it: case, accents, spacing and punctuation do not make two faces different */
export function normFace(face:string):string{
 return face.normalize('NFKC').toLowerCase().replace(/[֑-ׇ̀-ͯ]/g,'').replace(/[\s'"`´’‘“”״׳.,;:!?()[\]{}\-–—/\\|·•]+/g,' ').trim()
}

/** why a candidate cannot be on a card at all, or null */
export function candidateIssue(c:MemoryCandidate):'relation'|'faceLong'|null{
 if(pairStrength(c)===0)return 'relation'
 if(c.a.length>MAX_FACE_CHARS||c.b.length>MAX_FACE_CHARS)return 'faceLong'
 if(normFace(c.a)===''||normFace(c.b)===''||normFace(c.a)===normFace(c.b))return 'relation'
 return null
}

/** the pool the solver works on: valid relations only, one row per pair id, with the theme and the recognisability attached */
export function usablePool(candidates:readonly MemoryCandidate[]):{pool:Cand[];stats:PoolStats}{
 const pool:Cand[]=[],seen=new Set<string>(),excluded={relation:0,faceLong:0,duplicateId:0},types:Partial<Record<MemoryPairType,number>>={}
 for(const c of candidates){
  const issue=candidateIssue(c)
  if(issue){excluded[issue]+=1;continue}
  if(seen.has(c.pair)){excluded.duplicateId+=1;continue}
  seen.add(c.pair)
  pool.push({...c,theme:themeOf(c.year),value:MEMORY_VALUE[c.type]})
  types[c.type]=(types[c.type]??0)+1
 }
 const recognisable=pool.filter(c=>c.value>=2).length
 return {pool,stats:{candidates:candidates.length,valid:pool.length,excluded,types,recognisable,dateOnly:pool.length>0&&pool.every(c=>c.type==='moment-date')}}
}

export type DeckProblem='size'|'duplicate-pair'|'weak-relation'|'ambiguous-face'|'recognisable-short'
export type DeckReport={problems:DeckProblem[];narrow:boolean;recognisable:number;maxOfOneType:number;label:BoardLabel}
/**
 * The validator every dealt board passes — the solver's own output, a theme's board and the server's final check
 * before anything is sent. `problems` are hard failures; `narrow` is the honest flag for a board whose type mix is
 * thinner than the target (more than `typeCap` of one type), and `label` is what the screen must call it.
 */
export function deckReport(deck:readonly MemoryCandidate[],size:MemSize):DeckReport{
 const problems:DeckProblem[]=[]
 if(deck.length!==size)problems.push('size')
 if(new Set(deck.map(c=>c.pair)).size!==deck.length)problems.push('duplicate-pair')
 if(deck.some(c=>pairStrength(c)===0||candidateIssue(c)!==null))problems.push('weak-relation')
 const faces=deck.flatMap(c=>[normFace(c.a),normFace(c.b)])
 if(new Set(faces).size!==faces.length)problems.push('ambiguous-face')
 const recognisable=deck.filter(c=>MEMORY_VALUE[c.type]>=2).length
 if(recognisable<minRecognisable(size))problems.push('recognisable-short')
 const counts=new Map<MemoryPairType,number>()
 for(const c of deck)counts.set(c.type,(counts.get(c.type)??0)+1)
 const maxOfOneType=Math.max(0,...counts.values())
 const narrow=maxOfOneType>typeCap(size)||(deck.length>=4&&counts.size===1)
 const label:BoardLabel=deck.length>0&&deck.every(c=>c.type==='moment-date')?'date':narrow?'narrow':'mixed'
 return {problems,narrow,recognisable,maxOfOneType,label}
}

type Found={deck:Cand[]|null;nodes:number;budgetHit:boolean}
/**
 * One board by bounded depth-first search over `ordered`: the first set (in that order) of `size` pairs whose faces are
 * all different, which holds at least `minRec` recognisable relations and at most `cap` of any one type. Two bounds
 * prune it before it can explode: how many more pairs the type caps still allow, and how many recognisable pairs are
 * still ahead — so a pool that cannot satisfy the caps is refused at the root instead of searched.
 */
export function searchBoard(ordered:readonly Cand[],size:number,cap:number,minRec:number,budget=SEARCH_BUDGET):Found{
 const n=ordered.length,faces=ordered.map(c=>[normFace(c.a),normFace(c.b)] as const)
 const types=[...MEMORY_PAIR_TYPES],sufType=new Map<MemoryPairType,number[]>(),sufRec=new Array<number>(n+1).fill(0)
 for(const t of types)sufType.set(t,new Array<number>(n+1).fill(0))
 for(let i=n-1;i>=0;i-=1){
  sufRec[i]=sufRec[i+1]!+(ordered[i]!.value>=2?1:0)
  for(const t of types)sufType.get(t)![i]=sufType.get(t)![i+1]!+(ordered[i]!.type===t?1:0)
 }
 const used=new Map<MemoryPairType,number>(),seen=new Set<string>(),picked:number[]=[]
 let nodes=0,budgetHit=false
 const room=(at:number)=>{let r=0;for(const t of types)r+=Math.min(cap-(used.get(t)??0),sufType.get(t)![at]!);return r}
 const go=(at:number,recog:number):boolean=>{
  if(picked.length===size)return recog>=minRec
  if(budgetHit)return false
  if(n-at<size-picked.length)return false
  if(picked.length+room(at)<size)return false
  if(recog+sufRec[at]!<minRec)return false
  for(let i=at;i<n;i+=1){
   nodes+=1
   if(nodes>budget){budgetHit=true;return false}
   const c=ordered[i]!,[fa,fb]=faces[i]!
   if(seen.has(fa)||seen.has(fb)||(used.get(c.type)??0)>=cap)continue
   seen.add(fa);seen.add(fb);used.set(c.type,(used.get(c.type)??0)+1);picked.push(i)
   if(go(i+1,recog+(c.value>=2?1:0)))return true
   picked.pop();used.set(c.type,used.get(c.type)!-1);seen.delete(fa);seen.delete(fb)
   if(budgetHit)return false
  }
  return false
 }
 const ok=go(0,0)
 return {deck:ok?picked.map(i=>ordered[i]!):null,nodes,budgetHit}
}

/** the pool in the order a seed gives it: shuffled, then cut into decade blocks spread across kinds (`themedOrder`) */
export function orderPool(pool:readonly Cand[],seed:number,size:number):Cand[]{
 return themedOrder(shuffle(pool,rng(seed)),size)
}

export type Boards={boards:Board[];budgetHit:boolean}
const CACHE=new Map<string,Boards>()
/**
 * Every board one lap of this seed yields, disjoint from each other. Board k prefers a balanced set (≤ cap of a type);
 * only when none exists in what is left does it accept a narrow one, and says so. The lap ends when no valid board is
 * left, so the number of boards is what the pool can REALLY field — not the candidate count divided by six.
 */
export function boardsOf(pool:readonly Cand[],size:MemSize,seed:number,key?:string):Boards{
 const ck=key?`${key}|${size}|${seed}`:null
 if(ck){const hit=CACHE.get(ck);if(hit)return hit}
 let rest=orderPool(pool,seed,size),budgetHit=false
 const boards:Board[]=[],minRec=minRecognisable(size)
 while(rest.length>=size){
  let found=searchBoard(rest,size,typeCap(size),minRec),narrow=false
  budgetHit||=found.budgetHit
  if(!found.deck){found=searchBoard(rest,size,size,minRec);narrow=true;budgetHit||=found.budgetHit}
  if(!found.deck)break
  const report=deckReport(found.deck,size)
  boards.push({pairs:found.deck,narrow:narrow||report.narrow,label:report.label})
  const taken=new Set(found.deck.map(c=>c.pair))
  rest=rest.filter(c=>!taken.has(c.pair))
 }
 const out={boards,budgetHit}
 if(ck){if(CACHE.size>=32)CACHE.delete(CACHE.keys().next().value as string);CACHE.set(ck,out)}
 return out
}

export type Dealt={board:Board;lap:number;index:number;boardsInLap:number;seed:number}
/** board number `cursor` of the walk: laps follow each other, each a fresh shuffle of the same pool */
export function boardAt(pool:readonly Cand[],size:MemSize,seed:number,cursor:number,key?:string):Dealt|null{
 let left=Number.isFinite(cursor)&&cursor>0?Math.floor(cursor):0
 for(let lap=0;lap<MAX_LAPS;lap+=1){
  const s=cycleSeed(seed,lap),{boards}=boardsOf(pool,size,s,key)
  if(boards.length===0)return null
  if(left<boards.length)return {board:boards[left]!,lap,index:left,boardsInLap:boards.length,seed:s}
  left-=boards.length
 }
 const s=cycleSeed(seed,MAX_LAPS),{boards}=boardsOf(pool,size,s,key)
 return boards.length?{board:boards[left%boards.length]!,lap:MAX_LAPS,index:left%boards.length,boardsInLap:boards.length,seed:s}:null
}

/** the pool filtered to one decade theme (`d1990`) — the only way a theme deck is built (ME-R11) */
export const inTheme=(pool:readonly Cand[],theme:string|null|undefined)=>theme?pool.filter(c=>c.theme===theme):[...pool]
export const isTheme=(v:unknown):v is string=>typeof v==='string'&&/^d(1[89]|20)\d0$/.test(v)

/** why this size cannot be dealt from this pool — the first rule that fails, with the numbers behind it */
export function blockerFor(pool:readonly Cand[],size:MemSize,theme?:string|null):MemoryBlocker{
 const base={size,...(theme?{theme}:{})}
 const scope=inTheme(pool,theme)
 if(scope.length<size)return {...base,code:theme?'MEMORY_THEME_SHORT':'MEMORY_POOL_SHORT',need:size,have:scope.length}
 const ordered=orderPool(scope,1,size)
 const loose=searchBoard(ordered,size,size,0)
 if(!loose.deck)return {...base,code:'MEMORY_AMBIGUOUS_FACE',need:size,have:greedyDistinct(ordered),...(loose.budgetHit?{budget:true}:{})}
 // the number that matters is how many well-known relations fit on ONE wall with distinct faces, not how many the pool holds
 const need=minRecognisable(size)
 let have=0
 for(let k=need-1;k>=1;k-=1)if(searchBoard(ordered,size,size,k).deck){have=k;break}
 return {...base,code:'MEMORY_RECOGNISABLE_SHORT',need,have}
}
/** how many pairs a greedy walk keeps — the number the old readiness counted, kept here only to show the difference */
export function greedyDistinct(ordered:readonly Cand[]):number{
 const seen=new Set<string>();let n=0
 for(const c of ordered){const a=normFace(c.a),b=normFace(c.b);if(seen.has(a)||seen.has(b))continue;seen.add(a);seen.add(b);n+=1}
 return n
}

export type SizeMode={size:MemSize;available:boolean;boards:number;blocker?:MemoryBlocker}
export type ThemeMode={theme:string;decade:number;facts:number;maxSize:MemSize|0;boards:number}
/** which sizes this scope (the whole pool, or one decade of it) can open, with the blocker for each one it cannot */
export function sizeModes(pool:readonly Cand[],theme?:string|null,key?:string):SizeMode[]{
 const scope=inTheme(pool,theme),k=key?(theme?`${key}|${theme}`:key):undefined
 return MEM_SIZES.map<SizeMode>(size=>{
  const {boards}=boardsOf(scope,size,1,k)
  return boards.length>0?{size,available:true,boards:boards.length}:{size,available:false,boards:0,blocker:blockerFor(pool,size,theme)}
 })
}
/** which sizes and which decade themes this pool can honestly open; a decade that cannot field even two pairs is not offered */
export function memoryModes(pool:readonly Cand[],stats:PoolStats,key?:string):{sizes:SizeMode[];themes:ThemeMode[];stats:PoolStats}{
 const decades=[...new Set(pool.map(c=>c.theme).filter(t=>t!=='undated'))].sort()
 const themes=decades.map<ThemeMode>(theme=>{
  const open=sizeModes(pool,theme,key).find(m=>m.available)
  return {theme,decade:Number(theme.slice(1)),facts:inTheme(pool,theme).length,maxSize:open?.size??0,boards:open?.boards??0}
 }).filter(t=>t.maxSize>0)
 return {sizes:sizeModes(pool,null,key),themes,stats}
}
