import {beforeEach,describe,expect,it} from 'vitest'
import {memoryStore,useDurableStore} from '@/lib/master/durable'
import {extractCandidates} from '@/lib/goals-auto/extract'
import {primePublishedGoals,publishCandidate,publishedGoalRecords,readPublished,resetPublishedCache,rollbackGoal,savePolicy} from '@/lib/goals-auto/published'
import {DEFAULT_POLICY} from '@/lib/goals-auto/types'
import {dealRun,goalCount} from '@/lib/game/goal'

const body='בדקה 78 שמעון גרשון נגח וכבש. בן לוז כדרר באגף ימין. בן לוז הרים מאחורי ההגנה. שמעון גרשון נגח בנקודת הפנדל.'
const cand=()=>extractCandidates({clubId:'hapoel-tel-aviv',sourceId:'wiki-he',url:'https://example.org/r',body,fetchedAt:'2026-10-11T08:00:00Z',playedOn:'2001-11-20',opponentHe:'לוקומוטיב מוסקבה'})[0]!
const enable=()=>savePolicy(()=>({autoPublish:true,paused:false,sources:{'wiki-he':{sourceId:'wiki-he',enabled:true,certified:true,autoPublish:true}},clubs:{'hapoel-tel-aviv':{autoPublish:true}}}))

beforeEach(()=>{useDurableStore(memoryStore());resetPublishedCache()})

describe('publication adapter',()=>{
 it('refuses by default (policy off) and records the refusal',async()=>{
  const r=await publishCandidate(cand(),'auto');expect(r.ok).toBe(false)
  expect((await readPublished()).events.at(-1)?.kind).toBe('refused');expect(goalCount()).toBe(goalCount())
 })
 it('with every switch on, publishes once, idempotently, and the game then plays it (acceptance 6, 9)',async()=>{
  // memoryStore reports kind "memory": not durable, so even a fully enabled policy must refuse (fail closed)
  await enable();expect((await publishCandidate(cand(),'auto')).ok).toBe(false)
  useDurableStore({...memoryStore(),kind:'vercel-blob'});await enable()
  const before=goalCount()
  const a=await publishCandidate(cand(),'auto'),b=await publishCandidate(cand(),'auto')
  expect(a).toMatchObject({ok:true,already:false});expect(b).toMatchObject({ok:true,already:true})
  expect((await readPublished()).rows.length).toBe(1)
  await primePublishedGoals();expect(publishedGoalRecords('hapoel-tel-aviv').length).toBe(1);expect(publishedGoalRecords('zrinjski-mostar').length).toBe(0)
  expect(goalCount()).toBe(before+1)
  expect(dealRun(42).length).toBeGreaterThan(0)
 })
 it('rolls back and the game forgets it; bundled goals are never touched (acceptance 8, 11)',async()=>{
  useDurableStore({...memoryStore(),kind:'vercel-blob'});await enable();const bundled=goalCount()
  await publishCandidate(cand(),'auto');await primePublishedGoals()
  const id=(await readPublished()).rows[0]!.record.goalId
  expect((await rollbackGoal(id,'admin','test')).ok).toBe(true);resetPublishedCache();await primePublishedGoals()
  expect(goalCount()).toBe(bundled);expect((await rollbackGoal('missing','admin','x')).ok).toBe(false)
 })
 it('a storage outage keeps the game on its bundled goals (acceptance 12)',async()=>{
  useDurableStore({...memoryStore(),kind:'vercel-blob',read:async()=>{throw new Error('down')}})
  resetPublishedCache();await expect(primePublishedGoals()).resolves.toBeUndefined();expect(publishedGoalRecords('hapoel-tel-aviv')).toEqual([])
 })
 it('the default policy is everything off',()=>{expect(DEFAULT_POLICY).toEqual({autoPublish:false,paused:false,sources:{},clubs:{}})})
})

describe('a published goal reaches the archive card and the share links',()=>{
 it('hangs on the match of its day: door on the match card, pin by id, card query',async()=>{
  const {goalIdsOfMatch,matchOfGoal,playableGoalHref,linksForEntity}=await import('@/lib/links')
  const {pinnedGoal}=await import('@/lib/game/goal')
  const {matchIdOnDate}=await import('@/lib/goals-auto/published')
  const matchId=matchIdOnDate('2001-11-20');expect(matchId).toMatch(/^m_/)
  useDurableStore({...memoryStore(),kind:'vercel-blob'});await enable()
  expect(goalIdsOfMatch(matchId)).toEqual([])
  const r=await publishCandidate(cand(),'auto');expect(r.ok).toBe(true);await primePublishedGoals()
  const id=(await readPublished()).rows[0]!.record.goalId
  expect(goalIdsOfMatch(matchId)).toContain(id);expect(matchOfGoal(id)).toBe(matchId)
  expect(playableGoalHref(id)).toBe(`/goal?g=${encodeURIComponent(id)}`);expect(pinnedGoal(id)).toBeTruthy()
  expect(linksForEntity(matchId!).some(l=>l.href.includes(encodeURIComponent(id)))).toBe(true)
  await rollbackGoal(id,'admin','t');resetPublishedCache();await primePublishedGoals()
  expect(goalIdsOfMatch(matchId)).not.toContain(id);expect(pinnedGoal(id)).toBeFalsy()
 },30000)
})
