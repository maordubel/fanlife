import {describe,it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {approvedBatchIds,checkDecision,composeStaged,emptyDecisions,ours,rivalCandidates,squadFromUefa,squadMysteries,stagedBatches,staleBatchIds,type StagedInput} from '@/lib/research/staged/model'
import {buildDesk,deskClub,stepText,type ClubInput,type GateInput} from '@/lib/research/desk-model'
import {SHARED_GATES} from '@/lib/clubs/gates'
import {alarms,pushDay,stalled,weekGains,type History} from '@/lib/research/report-model'

// Invented clubs and people only (house rule for fixtures).
const src=(id:string,publisher='Example Data')=>({id,title:id,url:`https://example.org/${id}`,publisher,access:'available',checkedAt:'2026-11-01'})
const eleven=(p:string)=>Array.from({length:11},(_,i)=>`${p} Player${i}`)
const uefa=(on:string,opp:string,lineup:string[],squad?:unknown[])=>({id:`a-m-${on}-${opp}`,value:{name:`Riverside FC 1-0 ${opp}`,on,competition:'UEFA Conference League',score:'1-0',lineup,bench:['Bench Man'],...(squad?{squad}:{})},sources:[`u-${on}`],confidence:2,status:'approved',researchedAt:on,approvedAt:on,approvedBy:'owner'})
const hist=(on:string,home:string,away:string,extra:Record<string,unknown>={})=>({id:`h-${on}`,value:{name:`${home} 2-1 ${away}`,on,home,away,homeGoals:2,awayGoals:1,season:'2024-25',competition:'Example League'},sources:['of-1'],confidence:2,status:'review',researchedAt:'2026-10-20',approvedAt:null,approvedBy:null,...extra})
const input=():StagedInput=>({clubId:'riverside',names:['Riverside'],files:[
 {name:'wave-auto.json',data:{sources:[src('u-2025-08-01','UEFA'),src('u-2026-08-01','UEFA')],matches:[uefa('2025-08-01','Hilltown',eleven('R')),uefa('2026-08-01','Lakeside',eleven('R'),[{name:'R Player0',pos:'GK',born:'1999-04-02',nat:'Exampleland',shirt:1,height:190},{name:'R Player1',pos:'DF',born:null,nat:'Exampleland',shirt:4,height:null}])]}},
 {name:'wave-history-2026-10-20.json',data:{sources:[src('of-1','Open Data Contributors')],matches:[hist('2024-09-01','Riverside Town','Hilltown'),hist('2024-10-01','Hilltown','Riverside Town'),hist('2024-11-01','Riverside Town','Old Port',{conflictFree:false}),hist('2024-12-01','Riverside Town','Hilltown')]}},
]})

describe('the staged line — batches the owner can say yes to',()=>{
 it('a history file is one batch; a record a source marks as a conflict is held, never promoted',()=>{
  const b=stagedBatches(input()),h=b.find(x=>x.kind==='history')!
  expect(h.count).toBe(3);expect(h.held).toBe(1);expect(h.publishers).toEqual(['Open Data Contributors'])
  const s=b.find(x=>x.kind==='squad')!
  expect(s.count).toBe(12)// eleven starters + one substitute, by the exact name UEFA prints
 })
 it('the squad is read from UEFA team sheets: seasons named, positions only where UEFA gave one',()=>{
  const men=squadFromUefa(input()),gk=men.find(m=>m.name==='R Player0')!,x=men.find(m=>m.name==='R Player5')!
  expect([gk.from,gk.to]).toEqual([2025,2026]);expect([...gk.positions]).toEqual(['GK']);expect(x.positions.size).toBe(0)
 })
 it('without a decision the pack holds UEFA ties only (rule 102); history and squad wait for a yes',()=>{
  const merged:Record<string,unknown>[]=[]
  const r=composeStaged(input(),null,(p,w)=>{merged.push(w);return {pack:p,conflicts:[]}})
  expect((r.pack.matches as unknown[]).length).toBe(2);expect(merged).toHaveLength(0);expect(r.pack.players).toEqual([])
 })
 it('a yes promotes exactly the approved content, at confidence 2, in the owner\'s name; conflicts stay in review',()=>{
  const inp=input(),b=stagedBatches(inp),d={...emptyDecisions('riverside'),batches:b.map(x=>({id:x.id,hash:x.hash,at:'2026-11-10T08:00:00Z',by:'Maor'}))}
  let seen:Record<string,unknown>|null=null
  const r=composeStaged(inp,d,(p,w)=>{seen=w;return {pack:p,conflicts:[]}})
  const rows=(seen!.matches as {status:string;confidence:number;approvedBy:string;conflictFree?:boolean}[])
  expect(rows.filter(x=>x.status==='approved')).toHaveLength(3)
  expect(rows.find(x=>x.conflictFree===false)!.status).toBe('review')
  expect(rows.every(x=>x.status!=='approved'||(x.confidence<=2&&x.approvedBy.startsWith('owner')&&x.approvedBy.includes('2026-11-10')))).toBe(true)
  expect((r.pack.players as unknown[]).length).toBe(12)
 })
 it('a decision is pinned to its content: a changed file waits for a new yes',()=>{
  const inp=input(),b=stagedBatches(inp),h=b.find(x=>x.kind==='history')!
  const d={...emptyDecisions('riverside'),batches:[{id:h.id,hash:'old-content',at:'2026-11-01',by:'Maor'}]}
  expect(approvedBatchIds(b,d).has(h.id)).toBe(false);expect(staleBatchIds(b,d).has(h.id)).toBe(true)
  expect(checkDecision(b,{kind:'batch',id:h.id,hash:'old-content'},[])).toMatch(/changed/)
  expect(checkDecision(b,{kind:'batch',id:h.id,hash:h.hash},[])).toBeNull()
 })
 it('the rival is a choice from the clubs met most — never an invented name',()=>{
  const c=rivalCandidates(input())
  expect(c[0]).toMatchObject({name:'Hilltown',meetings:4})// three league meetings + one UEFA tie
  expect(checkDecision([],{kind:'rival',rival:'Nowhere United'},c)).toMatch(/listed/)
  expect(checkDecision([],{kind:'rival',rival:'Hilltown'},c)).toBeNull()
  expect(checkDecision([],{kind:'rival',rival:null},c)).toBeNull()
 })
 it('our side is recognised inside the club\'s own file by its words ("Riverside Town" for "Riverside"); both or neither is skipped',()=>{
  expect(ours(['Riverside'],'Riverside Town')).toBe(true);expect(ours(['Riverside'],'Hilltown')).toBe(false)
 })
 it('Blind Cow from team sheets: five clues stated by UEFA or no mystery; the name is never a clue',()=>{
  const m=squadMysteries(input(),'2026-11-10','Maor')
  expect(m).toHaveLength(1)// R Player1 has four clues (no birth date, no height) and is left out
  const clues=(m[0]!.value as {clues:{label:string;value:string}[]}).clues
  expect(clues.map(c=>c.label)).toEqual(['Nationality','Position','In Europe','Born','Height','Shirt number'])
  expect(clues.every(c=>!c.value.includes('R Player0'))).toBe(true)
 })
})

const gates=(over:Partial<Record<string,Partial<GateInput>>>={}):GateInput[]=>SHARED_GATES.map(g=>({key:g.key,number:g.number,state:'LOCKED',eligible:0,target:10,playable:false,openNow:false,...over[g.key]}))
const club=(o:Partial<ClubInput>={}):ClubInput=>({id:'riverside',name:'Riverside',country:'Exampleland',primary:'',status:'research',version:3,gatesOn:[],staged:true,gates:gates(),after:gates({timeline:{playable:true},trivia:{playable:true}}),batches:[],perBatch:{},decisions:null,rivals:[],opponents:[],uefaMatches:2,historyMatches:4,alarm:null,...o})
describe('the research desk — one club, one question, one button',()=>{
 const b=stagedBatches(input())
 it('the next step is the batch that opens most; then the rival; then open; then nothing to do',()=>{
  const c1=deskClub(club({batches:b,perBatch:{[b[0]!.id]:['timeline','trivia'],[b[1]!.id]:['xi']}}))
  expect(c1.step.kind).toBe('approve');if(c1.step.kind==='approve')expect(c1.step.batch.id).toBe(b[0]!.id)
  expect(stepText(c1)).toMatch(/Approving opens 2 gates: Timeline, Trivia wing/)
  const all={...emptyDecisions('riverside'),batches:b.map(x=>({id:x.id,hash:x.hash,at:'x',by:'Maor'}))}
  const c2=deskClub(club({batches:b,decisions:all,rivals:[{name:'Hilltown',meetings:4,sources:[],lastOn:null}]}))
  expect(c2.step.kind).toBe('rival')
  const c3=deskClub(club({batches:b,decisions:{...all,rival:{name:'Hilltown',aliases:[],at:'x',by:'Maor',sources:[]}},gates:gates({timeline:{playable:true}})}))
  expect(c3.step).toEqual({kind:'open',gates:[13]});expect(stepText(c3)).toMatch(/Open Riverside to fans/)
  const c4=deskClub(club({batches:b,decisions:{...all,rival:{name:'Hilltown',aliases:[],at:'x',by:'Maor',sources:[]}}}))
  expect(c4.step.kind).toBe('collecting')
 })
 it('a yes never claims a gate that already plays',()=>{
  const c=deskClub(club({batches:b,perBatch:{[b[0]!.id]:['timeline','polls']},gates:gates({polls:{playable:true}})}))
  expect(c.step.kind==='approve'&&c.step.opens).toEqual(['timeline'])
 })
 it('the punch card says open / ready / on your yes / needs research',()=>{
  const c=deskClub(club({gates:gates({xi:{playable:true,openNow:true},lineup:{playable:true}})}))
  expect(c.gates.find(g=>g.key==='xi')!.state).toBe('open');expect(c.gates.find(g=>g.key==='lineup')!.state).toBe('ready')
  expect(c.gates.find(g=>g.key==='timeline')!.state).toBe('soon');expect(c.gates.find(g=>g.key==='goal')!.state).toBe('closed')
  expect(c.potential).toBe(4)
 })
 it('the desk orders what waits by what a click opens; open clubs list how to improve, self-growing gates marked',()=>{
  const d=buildDesk([club({id:'a',name:'Alpha',batches:b,perBatch:{[b[0]!.id]:['xi']}}),club({id:'b',name:'Beta',batches:b,perBatch:{[b[0]!.id]:['xi','trivia','timeline']}}),club({id:'c',name:'Gamma',staged:false,status:'live',after:null,gates:gates({xi:{state:'READY',playable:true,openNow:true},'blind-cow':{state:'PARTIAL',eligible:24,target:30,playable:true,openNow:true}})})])
  expect(d.waiting.map(c=>c.id)).toEqual(['b','a']);expect(d.line.map(c=>c.id)).toEqual(['a','b']);expect(d.open.map(c=>c.id)).toEqual(['c'])
  const imp=d.open[0]!.improve;expect(imp[0]).toMatchObject({key:'blind-cow',auto:true});expect(imp.find(g=>g.key==='goal')!.auto).toBe(false)
 })
})

describe('the daily report — what moved, what stopped',()=>{
 const row=(ready:number,records:number,matches=80)=>({ready,playable:ready,matches,records})
 let h:History={}
 for(let i=1;i<=10;i++)h=pushDay(h,`2026-11-${String(i).padStart(2,'0')}`,{stuck:row(4,500),growing:row(4+Math.floor(i/5),500+i*10,80+i)})
 it('gains are counted over seven days; a club with the same records for a week is stalled',()=>{
  expect(weekGains(h,'2026-11-10')).toEqual({stuck:0,growing:2})// day 3 had 4 ready, day 10 has 6
  expect(stalled(h,'2026-11-10')).toEqual(['stuck'])
 })
 it('alarms: what waits for the owner first, then UEFA finding nothing, then stalled clubs',()=>{
  const a=alarms(h,'2026-11-10',{noUefa:['ghost'],waiting:[{club:'riverside',gates:8},{club:'idle',gates:0}],names:{riverside:'Riverside'}})
  expect(a.map(x=>x.code)).toEqual(['waiting-owner','no-uefa','stalled'])
  expect(a[0]!.text).toMatch(/Riverside: 8 gates open on your approval/)
 })
 it('the history keeps 35 days',()=>{let x:History={};for(let i=0;i<50;i++)x=pushDay(x,new Date(Date.UTC(2026,0,1+i)).toISOString().slice(0,10),{a:row(1,1)});expect(Object.keys(x)).toHaveLength(35)})
})

describe('wiring',()=>{
 it('a staged club loads through the desk provider, and publication still needs the owner\'s click',()=>{
  const r=readFileSync('lib/clubs/resolver.ts','utf8')
  expect(r).toContain("import('@/lib/research/staged/pack').then(s=>s.stagedPack(id))")
  const a=readFileSync('lib/research/desk-actions.ts','utf8')
  expect(a).not.toMatch(/status\s*[:=]\s*'live'/)// the desk decides research; only clubs/open-playable publishes
 })
 it('the daily pull grows history and records squads; the report reads the pull\'s log',()=>{
  const w=readFileSync('.github/workflows/research-daily.yml','utf8')
  expect(w).toMatch(/--backfill \d+ --refresh \d+/);expect(w).toContain('research:desk-preview');expect(w).toContain('--wave-log wave.log');expect(w).toContain('research-staging/**/ingest.json')
 })
})

describe('the full opening (scripts/clubs/promote.ts, .github/workflows/club-open.yml)',()=>{
 it('the crest is the current mark in the club\'s country folder whose name carries every word of a club name; a relegated club keeps its last season\'s mark; ambiguity is no crest',async()=>{
  const {findCrest}=await import('@/scripts/clubs/promote')
  const files=['logos/Greece - Super League 1/PAOK Thessaloniki.png','logos/Greece - Super League 1/Aris Thessaloniki.png','logos/Italy - Serie A/Atalanta BC.png',
   'history/2023-24/England - Premier League/Leicester City.png','history/2024-25/England - Premier League/Leicester City.png','logos/Türkiye - Süper Lig/Fenerbahce.png','logos/Germany - Bundesliga/1.FC Union Berlin.png']
  expect(findCrest(files,['PAOK'],'Greece')).toBe('logos/Greece - Super League 1/PAOK Thessaloniki.png')
  expect(findCrest(files,['Atalanta'],'Italy')).toBe('logos/Italy - Serie A/Atalanta BC.png')
  expect(findCrest(files,['Leicester City'],'England')).toBe('history/2024-25/England - Premier League/Leicester City.png')
  expect(findCrest(files,['Fenerbahçe'],'Turkey')).toBe('logos/Türkiye - Süper Lig/Fenerbahce.png')
  expect(findCrest(files,['Union Berlin'],'Germany')).toBe('logos/Germany - Bundesliga/1.FC Union Berlin.png')
  expect(findCrest(files,['Thessaloniki'],'Greece')).toBeNull()// two clubs carry the word: no guess
  expect(findCrest(files,['PAOK'],'Italy')).toBeNull()// wrong country folder: nothing
 })
 it('the workflow checks before it merges, captures the LIFE stills, reports to the desk, and never runs without the scheduler secret',()=>{
  const w=readFileSync('.github/workflows/club-open.yml','utf8')
  for(const s of ['clubs:promote','rumble:prices -- freeze','rumble:names','launch-defaults.ts','capture-shots.mjs','shots-measure.py','tsc --noEmit','npm test -- --maxWorkers=2','clubs:precompile','research/desk/promotion','research/desk-export'])expect(w,s).toContain(s)
  expect(w).toMatch(/if \[ "\$OK" = "true" \]; then\s+gh pr merge/)
  const r=readFileSync('app/api/master/[...action]/route.ts','utf8')
  expect(r).toMatch(/research\/desk\/promotion'\)\{if\(!cronAuthorized\(r\)\)return/)// a browser cookie cannot write the runner's report
 })
 it('the opening writes every place a club is wired by hand — none forgotten',()=>{
  const p=readFileSync('scripts/clubs/promote.ts','utf8')
  for(const f of ['lib/clubs/resolver-ids.ts','lib/clubs/providers.ts','lib/clubs/euro-wave.ts','lib/clubs/life/packs.ts','lib/clubs/spellings.ts','lib/fixtures/teams.ts','lib/marketing/tags.ts','lib/clubs/crest.ts','content/manual/club-crests.json','life/cast.json','life/timeline.json','core.json','wave-auto.json','ingest.json'])expect(p,f).toContain(f)
  // and the markers it writes after are where it expects them
  expect(readFileSync('lib/clubs/providers.ts','utf8')).toContain('// ↓ promoted from the research desk (scripts/clubs/promote.ts) — one line per club')
  expect(readFileSync('lib/clubs/euro-wave.ts','utf8')).toContain('// ↓ promoted wave-auto imports (scripts/clubs/promote.ts)')
  expect(readFileSync('lib/clubs/life/packs.ts','utf8')).toContain('// ↓ promoted LIFE imports (scripts/clubs/promote.ts)')
 })
 it('every staged club already has its LIFE stills, so an opening never waits on a render',()=>{
  const {readdirSync,existsSync}=require('node:fs') as typeof import('node:fs')
  const staged=readdirSync('research-staging').filter(d=>existsSync(`research-staging/${d}/ingest.json`)&&!existsSync(`club-packs/${d}`))
  for(const d of staged)for(const s of ['scarf','ticket','tunnel','stand'])expect(existsSync(`public/life/town/shots/${d}/${s}.webp`),`${d} ${s}`).toBe(true)
 })
})
