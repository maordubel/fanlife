import {afterEach,expect,it,vi} from 'vitest'
vi.mock('server-only',()=>({}))
const model=vi.hoisted(()=>({clock:0,calls:[] as string[]}))
vi.mock('@/lib/research/profiles',async orig=>({...(await orig<object>()),profiledClubs:async()=>['first-club','last-club'],loadClubProfile:async()=>({archive:[{}],sources:[]})}))
vi.mock('@/lib/research/service',()=>({collectClub:async(id:string)=>{model.calls.push(id);model.clock+=51000;return {run:{state:'partial_budget',counts:{requests:1,documentsRead:0}}}}}))
vi.mock('@/lib/master/research',()=>({runResearch:async()=>({ran:false})}))
import {memoryStore,useDurableStore} from '@/lib/master/durable'
import {mutate,readState} from '@/lib/master/store'
import {gateAccess} from '@/lib/clubs/access'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {collectArchive} from '@/lib/research/archive'
import {resetFetcherState,type FetchLike} from '@/lib/research/fetcher'
import {rotateFrom,runPipeline} from '@/lib/master/automation'

/** The owner's audit of 8.10.2026 (A02, A03, A04, A07): its reproductions, inverted to the behaviour we want. */
afterEach(()=>{useDurableStore(undefined as unknown as null);vi.unstubAllEnvs();vi.unstubAllGlobals();vi.restoreAllMocks()})

it('A02: a storage outage never reopens a paused club',async()=>{
 const store=memoryStore();useDurableStore(store)
 const id=(await readState()).clubs[0].id
 await mutate(s=>{s.clubs[0].status='paused';s.clubs[0].gates=[]})
 store.read=async()=>{throw Error('simulated outage')}
 vi.spyOn(console,'error').mockImplementation(()=>{})
 const fallback=(await readState()).clubs.find(c=>c.id===id)!
 expect(fallback.status).toBe('paused')
 expect(gateAccess(fallback,1,false).allowed).toBe(false)
})
it('A02: an outage before any good read serves every club closed',async()=>{
 const g=globalThis as {fanLastGood?:string};delete g.fanLastGood
 const store=memoryStore();store.read=async()=>{throw Error('simulated outage')};useDurableStore(store)
 vi.spyOn(console,'error').mockImplementation(()=>{})
 const s=await readState()
 expect(s.clubs.every(c=>c.status==='paused'&&!c.gates.length)).toBe(true)
})
it('A07: a saved club round reports gate_finish, not only leave',async()=>{
 vi.stubEnv('NEXT_PUBLIC_FAN_LIFE_EVALUATION','true')
 const sent:{events:{name:string}[]}[]=[];const store=new Map<string,string>()
 const storage={getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>void store.set(k,v)}
 vi.stubGlobal('window',{location:{pathname:'/clubs/panathinaikos/trivia'},localStorage:storage,setTimeout:()=>1,clearTimeout:()=>{}})
 vi.stubGlobal('localStorage',storage);vi.stubGlobal('navigator',{})
 vi.stubGlobal('fetch',(_u:string,o:{body:string})=>{sent.push(JSON.parse(o.body));return Promise.resolve(new Response(null,{status:204}))})
 const meter=await import('@/lib/analytics/meter');const {recordActivity}=await import('@/lib/clubs/activity')
 meter.openVisit('/clubs/panathinaikos/trivia','direct');meter.startVisit()
 expect(recordActivity('panathinaikos','trivia','audit-round-2',100)).toBe(true)
 meter.closeVisit(false)
 const names=sent.flatMap(x=>x.events).map(x=>x.name)
 expect(names).toContain('gate_finish')
 expect(names).not.toContain('gate_leave')
})
it('A03: a fetch never runs past the run deadline',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'fanlife-a03-'));vi.stubEnv('RESEARCH_DATA_DIR',dir)
 let clock=39000;vi.spyOn(Date,'now').mockImplementation(()=>clock);resetFetcherState()
 const calls:string[]=[]
 const fetchImpl:FetchLike=async url=>{calls.push(url);clock+=19000;return {status:url.endsWith('/robots.txt')?200:404,headers:{get:()=>null},text:async()=>'',arrayBuffer:async()=>new ArrayBuffer(0)}}
 try{
  await collectArchive('audit-deadline',[{providerId:'audit-site',familyId:'audit-site',publisher:'Audit',reader:'html',origin:'https://audit.example',role:'mixed',locale:'en',seeds:['/a/'],allowedPathPrefixes:['/a/'],parserId:null,budget:{perPage:25,maxRequests:1,minDelayMs:0,timeoutMs:20000,maxResponseBytes:100000},retention:{rawBody:'metadata-only',downloadImages:false},knownLimits:[]}],{maxRequests:1,fetchImpl,deadline:40000,now:()=>new Date(clock)})
  expect(calls.length).toBeLessThanOrEqual(1)
 }finally{resetFetcherState();await rm(dir,{recursive:true,force:true})}
})
it('A04: rotation starts after the last club that got work',()=>{
 expect(rotateFrom(['a','b','c'],null)).toEqual(['a','b','c'])
 expect(rotateFrom(['a','b','c'],'a')).toEqual(['b','c','a'])
 expect(rotateFrom(['a','b','c'],'c')).toEqual(['a','b','c'])
 expect(rotateFrom(['a','b','c'],'gone')).toEqual(['a','b','c'])
})
it('A04: consecutive budget-limited runs give each club a turn',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'fanlife-a04-'));vi.stubEnv('FAN_LIFE_DATA_DIR',dir);model.calls.length=0
 vi.spyOn(Date,'now').mockImplementation(()=>model.clock)
 try{for(let n=0;n<2;n++){model.clock=n*100000;await runPipeline()}
  expect(model.calls).toEqual(['first-club','last-club'])
 }finally{await rm(dir,{recursive:true,force:true})}
})
