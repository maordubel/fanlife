import {describe,expect,it} from 'vitest'
import {HUB_DEGREE,TIERS,TIER_SHAPE,buildView,charge,checkClose,checkMove,closeRoute,edgeRejection,exhausted,failReveal,generateLevel,isBackward,levelIsSound,newLedger,planThread,publicLevel,routeScore,rulesForTier,settle,solve,tierHonest,tryMove,type ThreadGraph,type ThreadLevel} from '@/lib/clubs/thread-engine'
import {syntheticGraph} from '@/lib/clubs/thread-fixture'

const graph=syntheticGraph(1),view=buildView(graph)

/** brute force over every ordered selection from the hand — independent of the solver's search order */
function bruteOptimum(level:ThreadLevel):number|null{
 let best:number|null=null
 const cards=[...level.hand]
 const rec=(path:string[],rest:string[])=>{
  if(best!==null&&path.length>=best)return
  if(checkClose({...level,rules:{...level.rules,exact:false}},path,view).ok){best=path.length;return}
  for(const c of rest){
   if(checkMove({...level,rules:{...level.rules,exact:false}},path,c,view)!=='ok')continue
   rec([...path,c],rest.filter(x=>x!==c))
  }
 }
 rec([],cards)
 return best
}

describe('TH-R01 legal edges only',()=>{
 it('rejects unsourced, unapproved, low-confidence and unknown edges',()=>{
  const known=(id:string)=>id==='a'||id==='b'
  const e={a:'a',b:'b',kind:'played for',sources:['s'],confidence:3 as const,status:'approved' as const}
  expect(edgeRejection(e,known)).toBeNull()
  expect(edgeRejection({...e,sources:[]},known)).toBe('NO_SOURCE')
  expect(edgeRejection({...e,sources:['  ']},known)).toBe('NO_SOURCE')
  expect(edgeRejection({...e,status:'review'},known)).toBe('NOT_APPROVED')
  expect(edgeRejection({...e,confidence:1},known)).toBe('LOW_CONFIDENCE')
  expect(edgeRejection({...e,kind:' '},known)).toBe('UNTYPED')
  expect(edgeRejection({...e,b:'z'},known)).toBe('UNKNOWN_NODE')
  expect(edgeRejection({...e,b:'a'},known)).toBe('SELF_LOOP')
 })
 it('an unsourced edge never connects two nodes',()=>{
  expect(view.edgeOf('p0','p1')).toBeNull()
  expect(view.edgeOf('p2','p3')).toBeNull()
  expect(view.rejected.map(r=>r.reason).sort()).toEqual(['NOT_APPROVED','NO_SOURCE'])
  expect(view.rejected.length).toBeGreaterThanOrEqual(2)
 })
 it('keeps the best edge when two are recorded for a pair',()=>{
  const g:ThreadGraph={nodes:[{id:'a',name:'A',type:'person'},{id:'b',name:'B',type:'team'}],edges:[{a:'a',b:'b',kind:'x',sources:['s'],confidence:2,status:'approved'},{a:'b',b:'a',kind:'y',sources:['s'],confidence:3,status:'approved'}]}
  expect(buildView(g).edgeOf('a','b')?.kind).toBe('y')
 })
})

describe('TH-R02 a frozen level, aliases cannot bypass',()=>{
 const g:ThreadGraph={nodes:[
  {id:'a',name:'A',type:'person'},{id:'b',name:'B',type:'team',aliases:['b-alt']},{id:'c',name:'C',type:'place'},{id:'d',name:'D',type:'season'},{id:'e',name:'E',type:'moment'}],
  edges:[['a','b'],['b','c'],['c','d'],['d','e'],['a','c']].map(([x,y])=>({a:x as string,b:y as string,kind:'rel',sources:['s'],confidence:3 as const,status:'approved' as const}))}
 const v=buildView(g)
 const level:ThreadLevel={id:'t',tier:1,start:'a',end:'e',hand:['b','c','d'],integrity:4,rules:{maxStops:4,time:'free'}}
 it('start and end cannot be intermediate stops',()=>{
  expect(checkMove(level,[],'a',v)).toBe('not-in-hand')
  expect(checkMove({...level,hand:['a','e','b']},[],'a',v)).toBe('used')
  expect(checkMove({...level,hand:['a','e','b']},['b'],'e',v)).toBe('used')
 })
 it('a card can be used once, and its alias is the same card',()=>{
  expect(checkMove(level,['b'],'b',v)).toBe('used')
  expect(checkMove(level,['b'],'b-alt',v)).toBe('used')
  expect(checkMove(level,[],'b-alt',v)).toBe('ok')
 })
 it('an unoffered card is rejected without costing integrity',()=>{
  expect(checkMove(level,[],'zzz',v)).toBe('not-in-hand')
  const l=charge(newLedger(level),[],'zzz','not-in-hand')
  expect(l.integrity).toBe(4)
 })
})

describe('TH-R03/R04 rules enforced together',()=>{
 const g:ThreadGraph={nodes:[
  {id:'s',name:'S',type:'person',from:2000,to:2005},
  {id:'early',name:'Early',type:'season',from:1990,to:1991},
  {id:'late',name:'Late',type:'season',from:2003,to:2004},
  {id:'ground',name:'Ground',type:'place'},
  {id:'m1',name:'M1',type:'match',from:2003,to:2003},
  {id:'m2',name:'M2',type:'match',from:2003,to:2003},
  {id:'t',name:'T',type:'moment',from:2010,to:2010}],
  edges:[['s','early'],['s','late'],['early','ground'],['late','ground'],['late','m1'],['m1','m2'],['m2','t'],['ground','t']].map(([x,y])=>({a:x as string,b:y as string,kind:'rel',sources:['s'],confidence:3 as const,status:'approved' as const}))}
 const v=buildView(g)
 const base:ThreadLevel={id:'x',tier:3,start:'s',end:'t',hand:['early','late','ground','m1','m2'],integrity:3,rules:{maxStops:3,time:'forward'}}
 it('forward time: a destination that ends before the source starts is backward',()=>{
  expect(isBackward(v.nodeOf('s'),v.nodeOf('early'))).toBe(true)
  expect(checkMove(base,[],'early',v)).toBe('backward')
  expect(checkMove(base,[],'late',v)).toBe('ok')
  expect(checkMove({...base,rules:{...base.rules,time:'free'}},[],'early',v)).toBe('ok')
 })
 it('overlapping spans are allowed',()=>{
  expect(isBackward({id:'a',name:'a',type:'season',from:2000,to:2004},{id:'b',name:'b',type:'season',from:1998,to:2001})).toBe(false)
 })
 it('a timeless place cannot certify a backward dated transition',()=>{
  // s(2000) -> late(2003) -> ground(timeless) -> early(1990): the place bridges, but early still ends before the last DATED stop starts
  const lv={...base,rules:{...base.rules,maxStops:4}}
  expect(checkMove(lv,['late','ground'],'early',v)).toBe('backward')
  expect(checkMove({...lv,rules:{...lv.rules,time:'free'}},['late','ground'],'early',v)).toBe('ok')
 })
 it('no consecutive match nodes',()=>{
  const lv:ThreadLevel={...base,rules:{maxStops:4,time:'free',noConsecutiveMatches:true}}
  expect(checkMove(lv,['late','m1'],'m2',v)).toBe('consecutive')
  expect(checkMove({...lv,rules:{...lv.rules,noConsecutiveMatches:false}},['late','m1'],'m2',v)).toBe('ok')
 })
 it('the whole route is checked at the close: required type, must-pass, stops',()=>{
  const lv:ThreadLevel={...base,rules:{maxStops:3,time:'free',mustTypes:['match']}}
  expect(checkClose(lv,['late','ground'],v)).toEqual({ok:false,reason:'missing'})
  const pass:ThreadLevel={...base,rules:{maxStops:3,time:'free',mustPass:['late']}}
  expect(checkClose(pass,['early','ground'],v)).toEqual({ok:false,reason:'missing'})
  expect(checkClose(pass,['late','ground'],v).ok).toBe(true)
  expect(checkClose({...base,rules:{maxStops:1,time:'free'}},['late','ground'],v)).toEqual({ok:false,reason:'invalid'})
  expect(checkClose({...base,rules:{maxStops:3,time:'free',exact:true}},['late','ground'],v)).toEqual({ok:false,reason:'stops'})
 })
 it('the last edge to the destination must exist',()=>{
  expect(checkClose({...base,rules:{maxStops:3,time:'free'}},['early'],v)).toEqual({ok:false,reason:'no-edge'})
 })
})

describe('TH-R05 solver and grader agree on every generated level',()=>{
 const seeds=Array.from({length:14},(_,i)=>i+1)
 const made=seeds.flatMap(seed=>TIERS.map(tier=>({seed,tier,out:generateLevel(view,tier,seed)})))
 it('generates levels for every tier on the fixture graph',()=>{
  for(const tier of TIERS)expect(made.filter(m=>m.tier===tier&&m.out).length,`tier ${tier}`).toBeGreaterThan(3)
 })
 it('the witness closes under the grader and equals the brute-force optimum',()=>{
  for(const m of made){
   if(!m.out)continue
   const {level,witness,optimum}=m.out
   expect(checkClose(level,witness,view).ok).toBe(true)
   expect(witness.length).toBe(optimum)
   expect(bruteOptimum(level)).toBe(optimum)
   const sound=levelIsSound(level,view)
   expect(sound.ok).toBe(true)
   expect(sound.optimum).toBe(optimum)
  }
 })
 it('every witness stop is a card in the dealt hand',()=>{
  for(const m of made){if(!m.out)continue;for(const id of m.out.witness)expect(m.out.level.hand).toContain(id)}
 })
 it('shapes follow the §15.2 table and never relax what they announce',()=>{
  for(const m of made){
   if(!m.out)continue
   const shape=TIER_SHAPE[m.tier],{level}=m.out
   expect(level.integrity).toBe(shape.integrity)
   expect(level.hand.length).toBeLessThanOrEqual(shape.stops+shape.decoys)
   expect(new Set(level.hand).size).toBe(level.hand.length)
   expect(level.hand).not.toContain(level.start)
   expect(level.hand).not.toContain(level.end)
   expect(tierHonest(m.tier,level.rules)).toBe(true)
   if(m.tier===1)expect(level.rules.time).toBe('free')
   if(m.tier>=3)expect(level.rules.time).toBe('forward')
   if(m.tier>=4)expect(level.rules.noConsecutiveMatches).toBe(true)
   if(m.tier===5){expect(level.rules.exact).toBe(true);expect(level.rules.maxStops).toBe(m.out.optimum)}
   expect(m.out.quality.warning===null).toBe(m.out.quality.decoys>=shape.decoys)
  }
 })
 it('the exact tier rejects a longer legal route',()=>{
  const t5=made.find(m=>m.tier===5&&m.out)?.out
  expect(t5).toBeTruthy()
  if(!t5)return
  const {level}=t5
  const longer={...level,rules:{...level.rules,exact:true,maxStops:t5.optimum+1}}
  expect(checkClose(longer,t5.witness,view)).toEqual({ok:false,reason:'stops'})
 })
 it('is deterministic for a seed',()=>{
  const a=generateLevel(view,2,5),b=generateLevel(view,2,5)
  expect(a?.level).toEqual(b?.level)
  expect(a?.witness).toEqual(b?.witness)
 })
 it('hubs never appear as stops or decoys',()=>{
  for(const m of made){if(!m.out)continue;for(const id of [...m.out.level.hand])expect(view.degreeOf(id)).toBeLessThanOrEqual(HUB_DEGREE)}
 })
})

describe('TH-R07 integrity is charged once',()=>{
 const t1=generateLevel(view,1,3)
 it('exists',()=>expect(t1).toBeTruthy())
 if(!t1)return
 const {level}=t1
 const bad=level.hand.find(c=>{const r=checkMove(level,[],c,view);return r==='no-edge'})
 it('a refused move costs once however many times it is sent',()=>{
  expect(bad).toBeTruthy()
  if(!bad)return
  let l=newLedger(level)
  for(let i=0;i<6;i+=1)l=charge(l,[],bad,checkMove(level,[],bad,view))
  expect(l.integrity).toBe(level.integrity-1)
  expect(settle(level,Array.from({length:5},()=>({path:[],card:bad})),t1.witness,view).integrity).toBe(level.integrity-1)
 })
 it('different refused moves each cost one; integrity never goes below zero',()=>{
  let l=newLedger({...level,integrity:2})
  l=charge(l,[],'a','no-edge');l=charge(l,[],'b','no-edge');l=charge(l,[],'c','backward');l=charge(l,['x'],'c','backward')
  expect(l.integrity).toBe(0)
  expect(exhausted(l)).toBe(true)
 })
 it('full-hand and used-card actions are rejected UI actions, not charges',()=>{
  const l0=newLedger(level)
  expect(charge(l0,[],'x','full')).toBe(l0)
  expect(charge(l0,[],'x','used')).toBe(l0)
  expect(charge(l0,[],'x','not-in-hand')).toBe(l0)
 })
})

describe('TH-R08/R09/R10 close, score, exhaustion',()=>{
 const g=generateLevel(view,2,4)
 it('exists',()=>expect(g).toBeTruthy())
 if(!g)return
 it('a closed route scores by the formula',()=>{
  const r=closeRoute(g.level,g.witness,g.level.integrity,view,g.optimum)
  expect(r.ok).toBe(true)
  if(r.ok){expect(r.score).toBe(routeScore(g.optimum,g.optimum,g.level.integrity));expect(r.edges.length).toBe(g.optimum+1);expect(r.edges.every(e=>e.sources.length>0)).toBe(true)}
 })
 it('score formula: floor 10, 15 per extra stop, 20 per integrity left',()=>{
  expect(routeScore(3,3,4)).toBe(180)
  expect(routeScore(5,3,0)).toBe(70)
  expect(routeScore(20,3,0)).toBe(10)
  expect(routeScore(3,3,2)).toBe(140)
 })
 it('an incomplete close is explained and does not cost integrity',()=>{
  const r=closeRoute(g.level,[],g.level.integrity,view,g.optimum)
  expect(r.ok).toBe(false)
  if(!r.ok)expect(['no-edge','missing','stops'].includes(r.reason)).toBe(true)
 })
 it('exhaustion reveals a sourced valid route',()=>{
  const reveal=failReveal(g.level,view)
  expect(reveal).toBeTruthy()
  expect(reveal?.edges.every(e=>e.sources.length>0&&e.kind!=='')).toBe(true)
  expect(reveal?.route[0]?.id).toBe(g.level.start)
  expect(reveal?.route.at(-1)?.id).toBe(g.level.end)
 })
 it('tryMove reveals an edge only for a legal move',()=>{
  const first=g.witness[0] as string
  const ok=tryMove(g.level,[],first,view)
  expect(ok.ok).toBe(true)
  const bad=g.level.hand.find(c=>checkMove(g.level,[],c,view)==='no-edge')
  if(bad)expect(tryMove(g.level,[],bad,view)).toEqual({ok:false,reason:'no-edge'})
 })
})

describe('TH-R11 public payload carries cards and rules only',()=>{
 it('has no edges, kinds, sources, optimum or witness',()=>{
  const g=generateLevel(view,3,2)
  expect(g).toBeTruthy()
  if(!g)return
  const pub=publicLevel(g.level,view,'ref',0,5)
  expect(pub).toBeTruthy()
  const json=JSON.stringify(pub)
  for(const leak of ['sources','synthetic-fixture','confidence','witness','optimum','played in','played for','scored in','followed','kind','edges'])expect(json,leak).not.toContain(leak)
  expect(pub?.hand.length).toBe(g.level.hand.length)
  expect(Object.keys(pub?.hand[0]??{}).sort()).toEqual(['id','name','type','years'])
 })
})

describe('TH-R12 limited graphs',()=>{
 it('the fixture opens the full five tiers',()=>{
  const plan=planThread(view,graph,1)
  expect(plan.mode).toBe('full')
  expect(plan.levels.map(l=>l.level.tier)).toEqual([1,2,3,4,5])
  expect(plan.blocker).toBeNull()
  expect(plan.counts.rejectedEdges).toBeGreaterThanOrEqual(2)
 })
 it('an empty graph is locked with THREAD_NO_VALID_LEVEL',()=>{
  const empty:ThreadGraph={nodes:[],edges:[]}
  const plan=planThread(buildView(empty),empty,1)
  expect(plan.mode).toBe('locked')
  expect(plan.blocker).toBe('THREAD_NO_VALID_LEVEL')
  expect(plan.missingTiers).toEqual([1,2,3,4,5])
 })
 it('a small graph with one sound level is practice only, and says which tiers are missing',()=>{
  const tiny:ThreadGraph={nodes:'abcde'.split('').map((id,i)=>({id,name:id.toUpperCase(),type:(['person','team','place','season','moment'] as const)[i]!})),edges:[['a','b'],['b','c'],['c','d'],['d','e']].map(([x,y])=>({a:x as string,b:y as string,kind:'rel',sources:['s'],confidence:3 as const,status:'approved' as const}))}
  const plan=planThread(buildView(tiny),tiny,1)
  expect(plan.mode).not.toBe('full')
  if(plan.levels.length>0){expect(plan.mode).toBe('practice');expect(plan.missingTiers.length).toBeGreaterThan(0);for(const l of plan.levels)expect(tierHonest(l.level.tier,l.level.rules)).toBe(true)}
 })
 it('rulesForTier announces what each tier must carry',()=>{
  expect(tierHonest(3,{maxStops:3,time:'free',mustTypes:['person']})).toBe(false)
  expect(tierHonest(5,rulesForTier(5,3,['person']))).toBe(true)
  expect(tierHonest(2,rulesForTier(1,3,['person']))).toBe(false)
 })
 it('solve reports none for an impossible hand',()=>{
  const lv:ThreadLevel={id:'z',tier:1,start:'s0',end:'s9',hand:[],integrity:3,rules:{maxStops:1,time:'free'}}
  expect(solve(lv,view).status).toBe('none')
 })
})
