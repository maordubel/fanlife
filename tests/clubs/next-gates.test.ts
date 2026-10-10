import {describe,it,expect} from 'vitest'
import {loadClub,CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {eligibleArchive} from '@/lib/clubs/archive'
import {compilePack} from '@/lib/clubs/compiler'
import {clubMystery} from '@/lib/clubs/mystery'
import {clubPolls,clubPollRound} from '@/lib/clubs/polls'
import {giveUp} from '@/lib/game/blind-cow/solo-engine'
import {debateRound} from '@/lib/polls/debate-engine'
import {debateRound as nativeRound,DEBATES} from '@/lib/polls/debates'
import {REGISTRY} from '@/lib/master/registry'
import pack from '@/tests/fixtures/zrinjski-core-m1.json'
describe('archive projection and researched Zrinjski data',()=>{
 it('shows year-only trophy evidence and player identities without inventing chronology dates',async()=>{
  const data=(await loadClub('zrinjski-mostar'))!.data,archive=eligibleArchive(data),year=archive.find(f=>f.id.endsWith(':league-title-2022'))!
  expect(year.value.on).toBeNull();expect(year.value.year).toBe(2022)
  expect(data.timeline.length).toBeGreaterThanOrEqual(14);expect(archive.length).toBeGreaterThanOrEqual(42)
  expect(archive.some(f=>f.id.endsWith(':legacy-founded-1905'))).toBe(false)
  expect(data.players!.length).toBeGreaterThanOrEqual(27)
  expect(['PARTIAL','READY']).toContain(data.gates.xi.state);expect(data.gates.archive.state).toBe('READY');expect(data.gates.memory.state).toBe('READY')
  // 8.10.2026: forty mysteries whose four clues each agree between UEFA line-ups and Wikimedia open the gate
  // 8.10.2026 (rulebook BC-R04..R08): the forty UEFA mysteries carry four prose clues, so the Blind Cow gate stays honestly LOCKED until each has 5 sourced clues with typed competition keys; the approved pool is still counted.
  // 10.10.2026: the condition that comment named is met — UEFA's line-ups (owner: UEFA is sufficient) add height and a season-scoped shirt number, so each target carries 5+ sourced clues with the competition named; the gate opens.
  expect(data.gates['blind-cow']?.playable).toBe(true);expect(data.mysteries.length).toBeGreaterThanOrEqual(30)
 })
 it('retains same-day and answer-in-title facts in archive while excluding them from chronology',()=>{
  const raw=structuredClone(pack),fact=structuredClone(raw.archive[0]!)
  fact.id='same-day-record';fact.value.name='A documented event in 2023'
  raw.archive.push(fact);const data=compilePack(raw,REGISTRY.find(c=>c.id===raw.clubId)!).data
  expect(data.timeline).toHaveLength(14);expect(eligibleArchive(data).some(f=>f.value.title===fact.value.name)).toBe(true)
  fact.status='review';expect(eligibleArchive(compilePack(raw,REGISTRY.find(c=>c.id===raw.clubId)!).data).some(f=>f.id.endsWith(':same-day-record'))).toBe(false)
 })
 it('recomputes eligibility when an approved source becomes blocked',()=>{
  const raw=structuredClone(pack);raw.sources.find(s=>s.id==='club-cup-2024')!.access='blocked'
  const data=compilePack(raw,REGISTRY.find(c=>c.id===raw.clubId)!).data
  expect(eligibleArchive(data).some(f=>f.id.endsWith(':cup-final-2024'))).toBe(false)
  expect(data.players?.some(f=>f.value.id.endsWith(':goran-karacic'))).toBe(false)
 })
})
describe('shared opinion rotation',()=>{
 it('preserves the original debate deck through the extracted engine',()=>{for(const seed of [1,42,300])for(const cursor of [0,1,4,30])expect(debateRound(seed,cursor,DEBATES)).toEqual(nativeRound(seed,cursor))})
 it.each(CORE_CLUB_IDS)('takes %s options only from its eligible record and player IDs',async id=>{
  const data=(await loadClub(id))!.data,allowed=new Set([...data.timeline.map(f=>f.id),...(data.players||[]).map(f=>f.value.id)]),polls=clubPolls(data,'en')
  expect(polls.length).toBeGreaterThanOrEqual(3);for(const poll of polls){expect(poll.choices.length).toBeGreaterThanOrEqual(2);expect(poll.choices.every(c=>allowed.has(c.id))).toBe(true)}
  expect(clubPollRound(data,'en',42,0)).toEqual(clubPollRound(data,'en',42,0));expect(clubPollRound(data,'he',42,0).map(p=>p.id)).toEqual(clubPollRound(data,'en',42,0).map(p=>p.id))
 },30000)
})
describe('shared solo mystery boundaries',()=>{
 it('keeps target identity and unopened clues server-side, and scores existing transitions',async()=>{
  const data=(await loadClub('hapoel-tel-aviv'))!.data,game=clubMystery(data),run=game.start(1000)!,question=data.mysteries.find(q=>q.id===run.qid)!,initial=game.view(run,1200)!
  expect(initial.clues).toHaveLength(1);expect(initial.result).toBeUndefined();expect(JSON.stringify(initial)).not.toContain(question.value.targetPlayerId)
  const opened=game.reveal(run,1);expect(opened.shown).toBe(2);expect(game.reveal(opened,1)).toBe(opened)
  const foreign=game.guess(opened,'zrinjski-mostar:marko-maric',2000);expect(foreign.correct).toBeNull();expect(foreign.state).toBe(opened)
  const wrong=data.players!.find(p=>p.value.id!==question.value.targetPlayerId)!.value.id,miss=game.guess(opened,wrong,2200).state
  expect(game.guess(miss,wrong,2300).state).toBe(miss)
  const solved=game.guess(miss,question.value.targetPlayerId,3000).state,result=game.view(solved,3100)!.result!
  expect(result.playerId).toBe(question.value.targetPlayerId);expect(result.rawElapsedMs).toBe(2000);expect(result.weightedTimeMs).toBe(22000)
  expect(game.reveal(solved,2)).toBe(solved);expect(giveUp(solved,4000)).toBe(solved)
  expect(game.valid({...run,shown:999})).toBe(false);expect(game.valid({...run,status:'solved',finished:null})).toBe(false)
 },15000)
 it('has no placeholder mystery bank for researched identity-only clubs',async()=>{for(const id of ['zrinjski-mostar','olympiacos']){const m=clubMystery((await loadClub(id))!.data);expect(m.start(1000)===null).toBe(m.poolSize===0)}})
})
