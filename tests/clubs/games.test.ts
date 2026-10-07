import {describe,it,expect,vi,beforeEach} from 'vitest'
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import golden from '@/tests/fixtures/shared-gates-native-golden.json'
import * as nativeTrivia from '@/lib/game/trivia'
import {buildRound} from '@/lib/game/memory'
import {loadClub,CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {clubTrivia,clubMemory} from '@/lib/clubs/games'
import {gateAvailability,SHARED_GATES} from '@/lib/clubs/gates'
import {clubGoals} from '@/lib/clubs/goal'
import {compilePack} from '@/lib/clubs/compiler'
import {REGISTRY} from '@/lib/master/registry'
import raw from '@/tests/fixtures/olympiacos-core-m1.json'
import {validateXI,searchClubPlayers} from '@/lib/clubs/xi'
import {readActivity,recordActivity,activityKey,xiKey} from '@/lib/clubs/activity'
import en from '@/messages/games/en.json'
import he from '@/messages/games/he.json'
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex')
const registry=REGISTRY.find(c=>c.id==='olympiacos')!
const player={id:'one',name:'Ada Example',positions:['GK'] as ('GK'|'DF'|'MF'|'FW')[],fromYear:2000,toYear:2010,aliases:['Άντα','אדה']}
describe('shared gate integration',()=>{
 it('keeps native trivia deals/public payloads/verdicts identical to the pre-extraction capture',()=>{for(const run of golden.trivia){const plan=nativeTrivia.dealSeededRun(run.spec as nativeTrivia.RunSpec,run.seed,run.cursor);expect(hash({plan,questions:nativeTrivia.publicQuestions(plan.ids,run.seed),grades:plan.ids.map(id=>nativeTrivia.gradeAnswer(id,[]))})).toBe(run.hash)}})
 it('keeps native memory boards identical to the pre-extraction capture',()=>{for(const run of golden.memory)expect(hash(buildRound(run.seed,6,run.cursor))).toBe(run.hash)})
 it.each(CORE_CLUB_IDS)('%s deals and grades club-owned questions without shipping answers',async id=>{const d=(await loadClub(id))!.data,g=clubTrivia(d);expect(d.gates.trivia.playable).toBe(true);for(const seed of [1,42,95]){const ids=g.dealSeededRun(nativeTrivia.MIXED,seed).ids,pub=g.publicQuestions(ids,seed);expect(ids.length).toBeGreaterThanOrEqual(3);expect(JSON.stringify(pub)).not.toMatch(/"answer"|"source"|"key"|"explanation"/);for(const q of pub){const original=d.trivia.questions.find(o=>o.id===q.id)!;expect(g.gradeAnswer(q.id,original.answer)?.correct).toBe(true);expect(g.gradeAnswer(q.id,[])?.correct).toBe(false)}expect(g.gradeAnswer('unregistered-question','true')).toBeNull()}},15000)
 it.each(CORE_CLUB_IDS)('%s fields complete distinct memory pairs through one algorithm',async id=>{const d=(await loadClub(id))!.data,r=clubMemory(d,42);expect(r.pairs.length).toBeGreaterThanOrEqual(2);expect(r.cards.length).toBe(r.pairs.length*2);expect(new Set(r.cards.map(c=>c.id)).size).toBe(r.cards.length);for(const p of r.pairs)expect(r.cards.filter(c=>c.pair===p.id)).toHaveLength(2)})
 it('keeps limited packs honest and reports all thirteen gates',async()=>{const d=(await loadClub('olympiacos'))!.data;expect(SHARED_GATES).toHaveLength(13);expect(d.players!.length).toBeGreaterThanOrEqual(22);expect(d.gates.xi.playable).toBe(true);expect(d.gates.trivia.state).toBe(d.trivia.questions.length>=60?'READY':'PARTIAL');expect(gateAvailability(d,'goal').playable).toBe(clubGoals(d).length>0);expect(gateAvailability(d,'derby').playable).toBe(true);expect(gateAvailability((await loadClub('zrinjski-mostar'))!.data,'derby').playable).toBe(true);expect((await loadClub('hapoel-tel-aviv'))!.data.gates.xi.playable).toBe(true)})
 it('does not promote draft, blocked or low-confidence archive facts into new games',()=>{const p=structuredClone(raw);p.archive[0]!.status='draft';p.archive[1]!.confidence=1;p.sources[0]!.access='blocked';const d=compilePack(p,registry).data;expect(d.trivia.questions).toEqual([]);expect(d.memory).toEqual([]);expect(d.gates.archive.playable).toBe(false)})
 it('keeps shared engines and clients outside legacy data imports',()=>{for(const f of ['lib/game/trivia-engine.ts','lib/game/memory-engine.ts','lib/game/formations.ts','components/clubs/games/TriviaBoard.tsx','components/clubs/games/XIBuilder.tsx','components/clubs/games/MemoryBoard.tsx'])expect(readFileSync(f,'utf8')).not.toMatch(/from ['"].*(?:content\/|club-packs\/|game\/archive|adapters\/hapoel|question-master)/)})
 it('provides matching English and Hebrew UI keys',()=>expect(Object.keys(he).sort()).toEqual(Object.keys(en).sort()))
})
describe('reviewed player packs and XI',()=>{
 const row=()=>({id:'player-one',value:{name:player.name,sport:'football',sensitive:false,positions:['GK'],fromYear:2000,toYear:2010,aliases:['Άντα']},sources:['uefa-results'],confidence:2,status:'approved',researchedAt:'2026-09-30',approvedAt:'2026-09-30',approvedBy:'reviewer:owner',notes:'Reviewed fixture, not shipped historical content.'})
 const pack=(players:unknown)=>compilePack({...structuredClone(raw),players},registry)
 it('accepts eligible canonical player data and locks insufficient rosters',()=>{const d=pack([row()]).data;expect(d.players?.[0]?.value.id).toBe('olympiacos:player-one');expect(d.gates.xi.playable).toBe(false)})
 it('quarantines duplicate identities and rejects invalid/unapproved/unchecked claims',()=>{expect(pack([row(),row()]).data.players).toEqual([]);for(const change of [{status:'review'},{confidence:1},{approvedAt:'2026-02-30'},{sources:['missing']},{approvedBy:'automated:unverified'}])expect(pack([{...row(),...change}]).data.players).toEqual([]);expect(pack([{...row(),value:{...row().value,positions:['CB']}}]).data.players).toEqual([])})
 it('revalidates saved IDs, slots, duplicates and captain against the current club',()=>{expect(validateXI({formation:'constructor',picks:{GK:'one',D1:'foreign-club'}},[player])).toEqual({formation:'4-4-2',picks:{GK:'one'},captain:null});expect(validateXI({formation:'4-4-2',picks:{GK:'one',D1:'one',illegal:'one'},captain:'foreign-club'},[player]).picks).toEqual({GK:'one'});expect(validateXI({formation:'4-4-2',picks:{GK:'one'},captain:'one'},[]).picks).toEqual({})})
 it('searches multilingual aliases without inferring canonical identities',()=>{for(const q of ['ada','Example','αντα','אדה'])expect(searchClubPlayers([player],q)).toEqual([player]);expect(searchClubPlayers([player],'not a player')).toEqual([])})
})
describe('device activity is per club',()=>{
 beforeEach(()=>{const values=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>values.get(k)||null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)})})
 it('records local results once and keeps club progress/lineups independent',()=>{recordActivity('olympiacos','trivia','run-1',500);recordActivity('olympiacos','trivia','run-1',900);recordActivity('zrinjski-mostar','memory','run-1',300);expect(readActivity('olympiacos').trivia).toEqual({completed:1,best:500});expect(readActivity('olympiacos').memory.completed).toBe(0);expect(readActivity('zrinjski-mostar').memory.completed).toBe(1);expect(xiKey('olympiacos')).not.toBe(xiKey('zrinjski-mostar'))})
 it('rejects malformed device state and handles unavailable storage',()=>{localStorage.setItem(activityKey('olympiacos'),JSON.stringify({xi:true,recent:[],trivia:{completed:-1,best:1},memory:{completed:0,best:0}}));expect(readActivity('olympiacos').xi).toBe(false);vi.stubGlobal('localStorage',{getItem:()=>{throw new Error('blocked')},setItem:()=>{throw new Error('blocked')}});expect(recordActivity('olympiacos','xi','save')).toBe(false);expect(readActivity('olympiacos').trivia.completed).toBe(0)})
 it('every game with a finish is on the ticket, a round is never counted twice, and old tickets still read (research 7.10.2026 §4.3)',()=>{
  localStorage.setItem(activityKey('olympiacos'),JSON.stringify({xi:false,recent:['trivia:a'],trivia:{completed:1,best:3},memory:{completed:0,best:0},polls:{completed:0,best:0},'blind-cow':{completed:0,best:0}}))
  expect(readActivity('olympiacos').trivia.completed).toBe(1)
  for(const g of ['lineup','goal','kit-builder','royal-rumble','timeline'] as const){recordActivity('olympiacos',g,`${g}:1`,7);recordActivity('olympiacos',g,`${g}:1`,9);expect(readActivity('olympiacos')[g]).toEqual({completed:1,best:7})}
  recordActivity('olympiacos','trivia','trivia:a',99);expect(readActivity('olympiacos').trivia.completed).toBe(1)
  for(let i=0;i<150;i++)recordActivity('olympiacos','memory',`memory:${i}`)
  recordActivity('olympiacos','memory','memory:0');expect(readActivity('olympiacos').memory.completed).toBe(150)
  const long='royal-rumble:v:1:'+'x'.repeat(400);expect(recordActivity('olympiacos','royal-rumble',long,2)).toBe(true);recordActivity('olympiacos','royal-rumble',long,2)
  const t=readActivity('olympiacos');expect(t['royal-rumble'].completed).toBe(2);expect(t.recent.every(r=>r.length<=150)).toBe(true)
 })
})
