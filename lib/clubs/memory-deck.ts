import 'server-only'
import {createHmac} from 'node:crypto'
import type {ClubData} from '@/lib/clubs/contract'
import {eligibleArchive} from '@/lib/clubs/archive'
import type {MemoryCard} from '@/lib/game/memory'
import {rng,shuffle} from '@/lib/game/random'
import {boardAt,blockerFor,deckReport,inTheme,isTheme,memoryModes,sizeModes,usablePool,type Cand,type MemSize,type MemoryBlocker,type PoolStats} from '@/lib/clubs/memory-solver'
import {parseSize,type MemoryPlan,type PublicDeal,type Reveal} from '@/lib/clubs/memory-model'

/**
 * Gate 6 · the deck, dealt on the server (ME-R01..R04, R11, R12; rulebook §17.4).
 *
 * The browser asks for a wall by (seed, cursor, size, theme); this module solves the board (`memory-solver.ts`), checks
 * it a second time with the same validator the solver uses, and hands over cards that name nothing: a card id is its
 * POSITION (`c3`), a pair id is an opaque key (an HMAC of the archive id under the deploy's secret), and the relation,
 * the archive's own sentence, the entry and the source stay here until `revealOf` is asked about two cards that really
 * are a pair. The faces themselves are on the cards — they have to be: the whole wall is shown face up at the start.
 */

function secret(){return process.env.BLIND_COW_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||'blind-cow-local-development'}
/** an archive id the browser cannot read back, stable per club and pair so the souvenir shelf can keep it once */
export function pairKey(clubId:string,pairId:string):string{
 return createHmac('sha256',`worker-memory-pair|${secret()}`).update(`${clubId}|${pairId}`).digest('hex').slice(0,14)
}

const POOLS=new Map<string,{pool:Cand[];stats:PoolStats;key:string}>()
/** the club's usable memory pool — valid relations only, with a note of what was left out and why */
export function memoryPool(club:Pick<ClubData,'identity'|'version'|'memory'>){
 const key=`${club.identity.id}:${club.version}:${club.memory.length}`
 let hit=POOLS.get(key)
 if(!hit){
  const {pool,stats}=usablePool(club.memory)
  hit={pool,stats,key}
  if(POOLS.size>=8)POOLS.delete(POOLS.keys().next().value as string)
  POOLS.set(key,hit)
 }
 return hit
}

export type DealInput={size:MemSize;theme?:string|null;seed:number;cursor:number}
export type Dealt={deal:PublicDeal;pairs:Cand[]}|{blocked:MemoryBlocker}

/** solve, validate and shuffle one wall; a board that fails its own validator is a blocker, never a quiet substitute */
export function dealMemory(club:Pick<ClubData,'identity'|'version'|'memory'>,input:DealInput):Dealt{
 const {pool,key}=memoryPool(club),theme=isTheme(input.theme)?input.theme:null
 const scope=inTheme(pool,theme)
 const at=boardAt(scope,input.size,input.seed,input.cursor,theme?`${key}|${theme}`:key)
 if(!at)return {blocked:blockerFor(pool,input.size,theme)}
 const report=deckReport(at.board.pairs,input.size)
 if(report.problems.length>0)return {blocked:{code:'MEMORY_AMBIGUOUS_FACE',size:input.size,need:input.size,have:0,...(theme?{theme}:{})}}
 const id=club.identity.id
 const cards=shuffle(at.board.pairs.flatMap((c):MemoryCard[]=>{
  const pair=pairKey(id,c.pair)
  return [
   {id:'',pair,face:c.a,kind:c.kind,object:c.object,side:'memory'},
   {id:'',pair,face:c.b,kind:c.kind,object:c.answer,side:'answer'}
  ]
 }),rng(at.seed*131+at.index*7+input.size)).map((card,i)=>({...card,id:`c${i}`}))
 return {
  pairs:at.board.pairs,
  deal:{
   size:input.size,theme,label:at.board.label,narrow:at.board.narrow,cards,
   pairs:at.board.pairs.map(c=>({id:pairKey(id,c.pair),a:c.a,b:c.b,kind:c.kind,object:c.object})),
   lap:at.lap,index:at.index,boardsInLap:at.boardsInLap,longest:Math.max(...cards.map(c=>c.face.length))
  }
 }
}

/** what the start card needs: the sizes and themes the pool can open, the deal for the selection, and the blocker for what was asked and cannot be */
export function planMemory(club:Pick<ClubData,'identity'|'version'|'memory'>,input:{seed:number;cursor:number;size?:string;theme?:string;peek?:boolean}):MemoryPlan{
 const {pool,stats,key}=memoryPool(club),modes=memoryModes(pool,stats,key)
 const askedSize=parseSize(input.size),asking=typeof input.theme==='string'&&input.theme!==''
 const themeOpen=asking&&isTheme(input.theme)&&modes.themes.some(t=>t.theme===input.theme)
 const theme=themeOpen?input.theme!:null
 const sizes=theme?sizeModes(pool,theme,key):modes.sizes
 let asked:MemoryPlan['asked']
 if(asking&&!themeOpen){
  const t=isTheme(input.theme)?input.theme:undefined
  asked={theme:input.theme,blocker:{code:'MEMORY_THEME_SHORT',size:2,need:2,have:t?inTheme(pool,t).length:0,...(t?{theme:t}:{})}}
 }
 const open=sizes.find(s=>s.size===askedSize&&s.available)??sizes.find(s=>s.available)
 if(askedSize&&!(open&&open.size===askedSize)){
  const b=sizes.find(s=>s.size===askedSize)?.blocker
  if(b&&!asked)asked={size:askedSize,blocker:b}
 }
 const excluded=stats.excluded.relation+stats.excluded.faceLong+stats.excluded.duplicateId
 const base={sizes,themes:modes.themes.map(t=>({theme:t.theme,decade:t.decade,facts:t.facts,maxSize:t.maxSize,boards:t.boards})),pool:{valid:stats.valid,excluded,dateOnly:stats.dateOnly,recognisable:stats.recognisable},...(asked?{asked}:{})}
 if(!open)return {...base,deal:null,selected:{size:2,theme,peek:input.peek!==false},blocker:blockerFor(pool,2,theme)}
 const dealt=dealMemory(club,{size:open.size,theme,seed:input.seed,cursor:input.cursor})
 if('blocked' in dealt)return {...base,deal:null,selected:{size:open.size,theme,peek:input.peek!==false},blocker:dealt.blocked}
 return {...base,deal:dealt.deal,selected:{size:open.size,theme,peek:input.peek!==false}}
}

/**
 * The relation, the archive's sentence, the entry and the source of a pair — only for two positions of the SAME
 * dealt wall that really are mates (ME-R12). Anything else answers null, so this cannot be used to read a card.
 */
export function revealOf(club:ClubData,input:DealInput&{i:number;j:number;lang:string}):Reveal|null{
 const dealt=dealMemory(club,input)
 if('blocked' in dealt)return null
 const {cards}=dealt.deal,a=cards[input.i],b=cards[input.j]
 if(!a||!b||input.i===input.j||a.pair!==b.pair)return null
 const id=club.identity.id,cand=dealt.pairs.find(c=>pairKey(id,c.pair)===a.pair)
 if(!cand)return null
 const rec=eligibleArchive(club).find(f=>f.id===cand.pair)
 const src=rec?.sources.map(s=>club.sources.find(x=>x.id===s)).find(Boolean)
 return {
  key:a.pair,type:cand.type,kind:cand.kind,fact:cand.fact??null,
  href:rec?`/clubs/${id}/archive?${new URLSearchParams({event:cand.pair,lang:input.lang})}`:null,
  source:src?{title:src.title,publisher:src.publisher,url:src.url}:null
 }
}
