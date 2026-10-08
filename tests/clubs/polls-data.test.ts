import {describe,it,expect} from 'vitest'
import {loadClub} from '@/lib/clubs/resolver'
import {choicesFor,dealBallot,questionOf} from '@/lib/clubs/polls-model'
import {mysteryReport,clubMystery} from '@/lib/clubs/mystery'
import type {ClubData,ClubPlayer} from '@/lib/clubs/contract'

const club=async(id:string):Promise<ClubData>=>(await loadClub(id))!.data
const roster=(d:ClubData):ClubPlayer[]=>(d.players||[]).map(f=>f.value)

describe('gate 7 · the ballot against the real rosters',()=>{
 it('Hapoel: centre-backs and foreign players are documented, so the native lines stand',async()=>{
  const ps=roster(await club('hapoel-tel-aviv')),b=dealBallot(ps),ids=b.questions.map(q=>q.id)
  expect(ids).toContain('centreback');expect(ids).toContain('foreign')
  const cb=choicesFor(ps,questionOf(b,'centreback')!),fo=choicesFor(ps,questionOf(b,'foreign')!)
  expect(cb.length).toBeGreaterThan(10);expect(fo.length).toBeGreaterThan(10)
  expect(cb.every(p=>p.detail?.centreBack===true)).toBe(true);expect(cb.filter(p=>p.positions.includes('DF')).length).toBeGreaterThan(cb.length*0.9)
  expect(fo.every(p=>p.detail?.foreignSlot==='foreign')).toBe(true)
  expect(b.length).toBe(b.questions.length)
 },60000)
 it('every pack club deals a ballot whose lines all have two documented choices and whose off-list says why',async()=>{
  for(const id of ['olympiacos','zrinjski-mostar','panathinaikos','hapoel-petah-tikva']){
   const ps=roster(await club(id)),b=dealBallot(ps)
   for(const q of b.questions)if(q.kind==='player')expect(choicesFor(ps,q).length,`${id}/${q.id}`).toBeGreaterThanOrEqual(2)
   for(const o of b.off)expect(o.code).toBe('POLL_CHOICES_SHORT')
   expect(b.questions.some(q=>q.id==='number')&&b.questions.some(q=>q.id==='position')).toBe(true)
   expect(b.questions.map(q=>q.id)).not.toContain('cult')
  }
 },60000)
 it('a pack club with no finer position evidence never claims a centre-back line',async()=>{
  const ps=roster(await club('olympiacos')),b=dealBallot(ps)
  if(!ps.some(p=>p.detail?.centreBack))expect(b.questions.map(q=>q.id)).not.toContain('centreback')
 },60000)
})

describe('gate 10 · the admin ladder report',()=>{
 it('reports sizes, modes and every mystery’s evaluation without leaking into the player view',async()=>{
  const d=await club('hapoel-tel-aviv'),r=mysteryReport(d),g=clubMystery(d)
  expect(r.club).toBe('hapoel-tel-aviv');expect(r.sizes.competitive).toBe(g.competitiveSize);expect(r.sizes.approved).toBe(d.mysteries.length)
  expect(r.mysteries).toHaveLength(d.mysteries.length);expect(r.mysteries[0]!.evaluation).toBeTruthy()
  expect(Object.keys(r.modes).sort()).toEqual(['competitive','practice'])
 },60000)
 it('Hapoel clues keep the typed fact fields the adapter attaches',async()=>{
  const d=await club('hapoel-tel-aviv'),clues=d.mysteries.flatMap(f=>f.value.clues)
  expect(clues.length).toBeGreaterThan(0)
  const typed=clues.filter(c=>c.family&&c.facet&&c.factKey);expect(typed.length/clues.length).toBeGreaterThan(0.9)
  expect(d.mysteries.every(f=>Array.isArray(f.value.remaining))).toBe(true)
 },60000)
})
