import 'server-only'
import type {ClubData} from './contract'
import {threadGraphOf} from './gate-extras'
import {buildView,planThread,publicLevel,type Generated,type PublicLevel,type ThreadGraph,type ThreadPlan,type ThreadView,type Tier} from './thread-engine'
import {syntheticGraph} from './thread-fixture'
import type {SourceRef} from './blackfile-deal'

/** Binds the generic Thread engine to a club's reviewed graph. No graph, no levels — never a made-up one. */
export type ThreadBinding={id:string;version:string;graph:ThreadGraph;view:ThreadView;lookup:(id:string)=>SourceRef|null}
export const FIXTURE_CLUB='__fixture'

export async function bindThread(club:ClubData):Promise<ThreadBinding>{
 const graph=await threadGraphOf(club)
 const sources=new Map(club.sources.map(s=>[s.id,s]))
 return {id:club.identity.id,version:club.version,graph,view:buildView(graph),lookup:id=>{const s=sources.get(id);return s?{title:s.title,url:s.url,publisher:s.publisher}:null}}
}

/** the dev-only synthetic graph the QA board plays; only reachable where `qaAllowed()` */
export function bindFixture():ThreadBinding{
 const graph=syntheticGraph(1)
 return {id:FIXTURE_CLUB,version:'fixture',graph,view:buildView(graph),lookup:id=>({title:'Synthetic fixture — not a real source',url:null,publisher:'Fixture'})}
}

const plans=new Map<string,ThreadPlan>()
export function planFor(b:ThreadBinding,seed:number):ThreadPlan{
 const key=`${b.id}:${b.version}:${seed}`
 let plan=plans.get(key)
 if(!plan){
  plan=planThread(b.view,b.graph,seed)
  if(plans.size>64)plans.clear()
  plans.set(key,plan)
 }
 return plan
}

/** a stable reference for one level of one run: the browser sends it back, the server re-derives the level from it */
export const refOf=(seed:number,tier:Tier)=>`th${seed}t${tier}`
export function levelByRef(plan:ThreadPlan,seed:number,ref:string):Generated|null{
 return plan.levels.find(g=>refOf(seed,g.level.tier)===ref)??null
}

/** What the page sends the browser: the levels as cards and rules only, plus the facts the locked/practice screens print. */
export type PublicPlan={levels:PublicLevel[];mode:ThreadPlan['mode'];missingTiers:Tier[];counts:ThreadPlan['counts'];blocker:ThreadPlan['blocker']}
export function publicPlan(b:ThreadBinding,seed:number):PublicPlan{
 const plan=planFor(b,seed)
 const levels=plan.levels.map((g,i)=>publicLevel(g.level,b.view,refOf(seed,g.level.tier),i,plan.levels.length)).filter((l):l is PublicLevel=>l!==null)
 return {levels,mode:levels.length===0?'locked':plan.mode,missingTiers:plan.missingTiers,counts:plan.counts,blocker:levels.length===0?'THREAD_NO_VALID_LEVEL':plan.blocker}
}
